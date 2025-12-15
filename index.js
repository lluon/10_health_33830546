require('dotenv').config();
console.log('BCRYPT_PEPPER loaded:', !!process.env.BCRYPT_PEPPER); // Debug

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const emailController = require('./controllers/email');

const app = express();

//______________BASE_PATH setup_________________

const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');
app.locals.BASE_PATH = BASE_PATH // in all ejs as <%= BASE_PATH %>

//_____________App Setup________________________

app.set('view engine', 'ejs');
app.set ('views', path.join(__dirname,'views'));
app.use(express.urlencoded({ extended: true }));

//_____________static file handler______________

app.use(express.static(path.join(__dirname, 'public')));
if (BASE_PATH) {
app.use(BASE_PATH,express.static(path.join(__dirname,'public')));
}

//_____________session and flash________________

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(flash());

//  flash messages and BASE_PATH available in all views
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.messages = req.flash();
    res.locals.BASE_PATH = BASE_PATH;
    next();
});

app.use((req, res, next) => {
    res.locals.escapeHTML = (str) => {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    };
    next();
});

//________________DB pool___________________

const pool = mysql.createPool({
    host: process.env.HEALTH_HOST,
    user: process.env.HEALTH_USER,
    password: process.env.HEALTH_PASSWORD,
    database: process.env.HEALTH_DATABASE
});


//_____________Auth Middleware_____________

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        req.flash('error', 'Please log in to access this page.');
        return res.redirect(`${BASE_PATH || ''}/login`)
    }
    next();
}

function requireRole(allowedRole) {
    return (req, res, next) => {
        if (req.session.role !== allowedRole) {
            req.flash('error', 'Access denied: insufficient privileges.');
            return res.redirect(`${BASE_PATH || ''}/login`);
        }
        next();
    };
}

//____________________ROUTES_____________

//____________________public_____________

app.get('/', (req, res) => res.render('home'));
app.get('/about', (req, res) => res.render('about'));
app.get('/register', (req, res) => res.render('register'));
app.get('/login', (req, res) => res.render('login'))

//______________Registration_____________

app.post('/register', async (req, res) => {
    const { username, password, role, nhs_number, name, surname, dob, address, email } = req.body;

    if (!['patient', 'therapist'].includes(role)) {
        req.flash('error', 'Invalid role.');
        return res.redirect(`${BASE_PATH || ''}/register`);
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
    if (!passwordRegex.test(password)) {
        req.flash('error', 'Password must be 8+ characters with lowercase, uppercase, number, and special char.');
        return res.redirect(`${BASE_PATH || ''}/register`);
    }

    const PEPPER = process.env.BCRYPT_PEPPER || '';
    const hashedPassword = await bcrypt.hash(password + PEPPER, 12);

    try {
        await pool.execute(
            'INSERT INTO patients (username, password, role, nhs_number, name, surname, dob, address, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, role, nhs_number, name, surname, dob, address, email]
        );
        req.flash('success', 'Registered successfully. Please log in.');
        res.redirect(`${BASE_PATH || ''}/login`);
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            req.flash('error', 'Username or NHS number already exists.');
        } else {
            req.flash('error', 'Registration failed. try again.');
        }
        res.redirect(`${BASE_PATH || ''}/register`);
    }
});

//_____________login_logout_________________

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const PEPPER = process.env.BCRYPT_PEPPER || '';

    try {
        const [rows] = await pool.execute(
            'SELECT id, password, role FROM patients WHERE username = ?', 
            [username]
        );

        if (rows.length === 0 || rows[0].role === 'deactivated') {
            req.flash('error', 'Invalid credential  or account deactivated.');
            return res.redirect(`${BASE_PATH || ''}/login`);
        }

        const user = rows[0];
        const match = await bcrypt.compare(password + PEPPER,user.password)

        if (match) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;

            req.flash('success', `Welcome back, ${user.username}!`);
            return res.redirect(`${BASE_PATH || ''}/${user.role}/dashboard`);
        } else {
            req.flash('error', 'Invalid username or password.');
            return res.redirect(`${BASE_PATH || ''}/login`);
        }
    } catch (error) {
        console.error('Login Error Details:', error.message, error.code, error.stack);
        req.flash('error', 'Database error during login - please try again or contact admin.');
        res.redirect(`${BASE_PATH || ''}/login`);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect(`${BASE_PATH || ''}/login`);
    });
});

// ___________Patient Routes___________

app.get('/patient/dashboard', requireLogin, requireRole('patient'), async (req, res) => {
    const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.session.userId]);
    const patient = patientRows[0];

    let exercises = [];
    let treatment = null;

    if (patient.attended) {
        const [treatmentRows] = await pool.execute(
            'SELECT * FROM ongoing_treatment WHERE nhs_number = ? ORDER BY id DESC LIMIT 1', 
            [patient.nhs_number]
        );
        if (treatmentRows.length >0) {
            treatment = treatmentRows[0];
            const [exRows] = await pool.execute(
                'SELECT e.*, te.order_num FROM exercises e JOIN treatment_exercise te ON e.id = te.exercise_id WHERE te.treatment_id = ? ORDER BY te.order_num',
                [treatment.id]
            );
            exercises = exRows;
        }
    }
    res.render('patient_dashboard', { patient, exercises, treatment });
});

app.post('/patient/illness', requireLogin, requireRole('patient'), async (req, res) => {
    const { illness } = req.body;
    await pool.execute('UPDATE patients SET illness = ?, attended = FALSE WHERE id = ?', [illness, req.session.userId]);
    req.flash('success', 'Illness descrition submitted.');
    res.redirect(`${BASE_PATH||''}/patient/dashboard`);
});

app.get('/exercise/:id', requireLogin, requireRole('patient'), async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).send('Exercise not found');

    const exercise = rows[0];
    const viewName = `exercise/${exercise.illustration_sequence}`;
    res.render(viewName, { exercise });
});

//____________Therapist Routes___________

app.get('/therapist/dashboard', requireLogin, requireRole('therapist'), async (req, res) => {
    const query = req.query.search || '';
    const [rows] = await pool.execute(
        'SELECT * FROM patients WHERE role = "patient" AND role <> "deactivated" AND (name LIKE ? OR surname LIKE ? OR nhs_number = ? OR illness LIKE ?)',
        [`%${query}%`, `%${query}%`, query, `%${query}%`]
    );
    res.render('therapist_dashboard', { patients: rows });
});

app.get('/therapist/patient/:id', requireLogin, requireRole('therapist'), async (req, res) => {
    const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (patientRows.length === 0) {
        req.flash('error', 'Patient not found.');
        return res.redirect(`${BASE_PATH||''}/therapist/dashboard`);
    }
    const patient = patientRows[0];
    const [exRows] = await pool.execute('SELECT * FROM exercises WHERE illustration_sequence IS NOT NULL AND description IS NOT NULL');
    const [treatmentHistory] = await pool.execute('SELECT * FROM ongoing_treatment WHERE nhs_number = ? ORDER BY id DESC', [patient.nhs_number]);
    res.render('therapist_patient', { patient, exercises: exRows, treatmentHistory });
});

app.post('/therapist/assign/:id', requireLogin, requireRole('therapist'), async (req, res) => {
    const patientId = req.params.id;
    const exercisesObject = req.body.exercises || {};
    const exercises = Object.values(exercisesObject);

    if (exercises.length === 0) {
        req.flash('error', 'Please select at least one exercise to assign.');
        return res.redirect(`${BASE_PATH||''}/therapist/patient/${patientId}`);
    }

    try {
        const [patientRows] = await pool.execute('SELECT nhs_number FROM patients WHERE id = ?', [patientId]);
        const nhs_number = patientRows[0].nhs_number;

        const [treatmentResult] = await pool.execute(
            'INSERT INTO ongoing_treatment (nhs_number, timing, progression) VALUES (?, ?, ?)',
            [nhs_number, 'Custom assigned', 'Individual progression']
        );
        const treatmentId = treatmentResult.insertId;

        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            const duration = parseInt(ex.duration);
            const reps = parseInt(ex.reps);
            const perWeek = parseInt(ex.perWeek);
        
            if (isNaN(duration) || isNaN(reps) || isNaN(perWeek) || duration <= 0 || reps <= 0 || perWeek <= 0) {
                throw new Error(`Invalid prescription value for exercise: ${ex.name}`);
            }
        
            const originalExerciseId = parseInt(ex.id);
        
            await pool.execute(
                'INSERT INTO treatment_exercise (treatment_id, exercise_id, order_num) VALUES (?, ?, ?)',
                [treatmentId, originalExerciseId, i + 1]
            );
        }
        await pool.execute('UPDATE patients SET attended = TRUE WHERE id = ?', [patientId]);
        await emailController.sendConfirmation(patientId);

        req.flash('success', `Successfully assigned ${exercises.length} exercise(s)!`);
        res.redirect(`${BASE_PATH||''}/therapist/dashboard`);
    } catch (err) {
        console.error('Assignment Error:', err);
        req.flash('error', `Failed to assign exercises: ${err.message}`);
        res.redirect(`${BASE_PATH||''}/therapist/patient/${patientId}`);
    }
});

// _________________Admin Routes_______________

app.get('/admin/dashboard', requireLogin, requireRole('admin'), async (req, res) => {
    const [patients] = await pool.execute('SELECT * FROM patients WHERE role <> "deactivated"');
    res.render('admin_dashboard', { patients });
});

app.get('/admin/edit/:id', requireLogin, requireRole('admin'), async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    const patient = rows[0] || null;
    if (!patient) {
        req.flash('error', 'User not found.');
        return res.redirect(`${BASE_PATH||''}/admin/dashboard`);
    }
    res.render('admin_edit', { patient });
});

app.post('/admin/edit/:id', requireLogin, requireRole('admin'), async (req, res) => {
    const { name, surname, email, illness } = req.body;
    const [result] = await pool.execute(
        'UPDATE patients SET name = ?, surname = ?, email = ?, illness = ? WHERE id = ?',
        [name, surname, email, illness || null, req.params.id]
    );
    req.flash(result.affectedRows ? 'success' : 'error', result.affectedRows ? 'User updated.' : 'No changes.');
    res.redirect(`${BASE_PATH||''}/admin/dashboard`);
});

app.post('/admin/delete/:id', requireLogin, requireRole('admin'), async (req, res) => {
    if (req.params.id == req.session.userId) {
        req.flash('error', 'You cannot deactivate your own account.');
        return res.redirect(`${BASE_PATH||''}/admin/dashboard`);
    }
    const [result] = await pool.execute('UPDATE patients SET role = "deactivated" WHERE id = ?', [req.params.id]);
    req.flash(result.affectedRows ? 'success' : 'error', result.affectedRows ? 'User deactivated.' : 'User not found.');
    res.redirect(`${BASE_PATH||''}/admin/dashboard`);
});

// ___________Start Server___________

const PORT=8000;

app.listen(PORT, 'localhost', () => {
    console.log(`NHS PhysioHUB running!`);
    console.log(`> external: https://www.doc.gold.ac.uk${BASE_PATH}`);
    console.log(`> local: http://localhost:${PORT}${BASE_PATH}`);
});