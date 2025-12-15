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
app.locals.BASE_PATH = BASE_PATH; // available in all ejs as <%= BASE_PATH %>

//_____________App Setup________________________

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

//_____________static file handler______________

app.use(express.static(path.join(__dirname, 'public')));
if (BASE_PATH) {
    app.use(BASE_PATH, express.static(path.join(__dirname, 'public')));
}

//_____________session and flash________________

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true in production with HTTPS
}));
app.use(flash());

// make flash messages, session and BASE_PATH available in all views
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.messages = req.flash();
    res.locals.BASE_PATH = BASE_PATH;
    next();
});

// custom escapeHTML helper (XSS protection)

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
        return res.redirect(`${BASE_PATH || ''}/login`);
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

//____________________Public Routes______

app.get('/', (req, res) => res.render('home'));
app.get('/about', (req, res) => res.render('about'));
app.get('/register', (req, res) => res.render('register'));
app.get('/login', (req, res) => res.render('login'));

//______________Registration_____________

app.post('/register', async (req, res) => {
    const { username, password, role, nhs_number, name, surname, dob, address, email } = req.body;

    if (!['patient', 'therapist', 'admin'].includes(role)) { // allow admin registration if needed
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
            req.flash('error', 'Registration failed. Please try again.');
        }
        res.redirect(`${BASE_PATH || ''}/register`);
    }
});

//_____________Login / Logout_________________

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const PEPPER = process.env.BCRYPT_PEPPER || '';

    try {
        const [rows] = await pool.execute(
            'SELECT id, password, role FROM patients WHERE username = ? AND role <> "deactivated"',
            [username]
        );

        if (rows.length === 0) {
            req.flash('error', 'Invalid username or password.');
            return res.redirect(`${BASE_PATH || ''}/login`);
        }

        const user = rows[0];
        const match = await bcrypt.compare(password + PEPPER, user.password);

        if (match) {
            req.session.userId = user.id;
            req.session.username = username;
            req.session.role = user.role;
            req.flash('success', `Welcome back, ${username}!`);
            return res.redirect(`${BASE_PATH || ''}/${user.role}/dashboard`);
        } else {
            req.flash('error', 'Invalid username or password.');
            return res.redirect(`${BASE_PATH || ''}/login`);
        }
    } catch (error) {
        console.error('Login Error:', error);
        req.flash('error', 'Database error during login - please try again.');
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

        if (treatmentRows.length > 0) {
            treatment = treatmentRows[0];
            const [exRows] = await pool.execute(
                `SELECT e.*, te.custom_checklist, te.order_num 
                 FROM exercises e 
                 JOIN treatment_exercise te ON e.id = te.exercise_id 
                 WHERE te.treatment_id = ? 
                 ORDER BY te.order_num`,
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
    req.flash('success', 'Illness description submitted.');
    res.redirect(`${BASE_PATH || ''}/patient/dashboard`);
});

// Single reusable exercise page with support for custom prescriptions
app.get('/exercise/:id', requireLogin, requireRole('patient'), async (req, res) => {
    const [assignedRows] = await pool.execute(`
        SELECT e.*, te.custom_checklist 
        FROM exercises e 
        JOIN treatment_exercise te ON e.id = te.exercise_id
        JOIN ongoing_treatment ot ON te.treatment_id = ot.id
        JOIN patients p ON ot.nhs_number = p.nhs_number
        WHERE e.id = ? AND p.id = ? AND p.attended = TRUE
        ORDER BY ot.id DESC LIMIT 1
    `, [req.params.id, req.session.userId]);

    if (assignedRows.length === 0) {
        return res.status(404).send('Exercise not found or not assigned to you');
    }

    const exercise = assignedRows[0];
    res.render('exercise/template', { exercise });
});

//____________Therapist Routes___________

app.get('/therapist/dashboard', requireLogin, requireRole('therapist'), async (req, res) => {
    const query = req.query.search || '';
    const [rows] = await pool.execute(
        `SELECT * FROM patients 
         WHERE role = "patient" 
         AND role <> "deactivated" 
         AND (name LIKE ? OR surname LIKE ? OR nhs_number LIKE ? OR illness LIKE ?)`,
        [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    );
    res.render('therapist_dashboard', { patients: rows });
});

app.get('/therapist/patient/:id', requireLogin, requireRole('therapist'), async (req, res) => {
    const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (patientRows.length === 0) {
        req.flash('error', 'Patient not found.');
        return res.redirect(`${BASE_PATH || ''}/therapist/dashboard`);
    }
    const patient = patientRows[0];

    const [exRows] = await pool.execute('SELECT * FROM exercises ORDER BY name');
    const [treatmentHistory] = await pool.execute(
        'SELECT * FROM ongoing_treatment WHERE nhs_number = ? ORDER BY id DESC',
        [patient.nhs_number]
    );

    res.render('therapist_patient', { patient, exercises: exRows, treatmentHistory });
});

app.post('/therapist/assign/:id', requireLogin, requireRole('therapist'), async (req, res) => {
    const patientId = req.params.id;
    const exercisesObject = req.body.exercises || {};
    const exercises = Object.values(exercisesObject);

    if (exercises.length === 0) {
        req.flash('error', 'Please select at least one exercise to assign.');
        return res.redirect(`${BASE_PATH || ''}/therapist/patient/${patientId}`);
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
            const originalExerciseId = parseInt(ex.id);

            if (isNaN(duration) || isNaN(reps) || isNaN(perWeek) || duration <= 0 || reps <= 0 || perWeek <= 0) {
                throw new Error(`Invalid prescription values for exercise: ${ex.name}`);
            }

            const checklistJson = JSON.stringify({
                duration,
                reps,
                perWeek
            });

            await pool.execute(
                'INSERT INTO treatment_exercise (treatment_id, exercise_id, order_num, custom_checklist) VALUES (?, ?, ?, ?)',
                [treatmentId, originalExerciseId, i + 1, checklistJson]
            );
        }

        await pool.execute('UPDATE patients SET attended = TRUE WHERE id = ?', [patientId]);
        await emailController.sendConfirmation(patientId);

        req.flash('success', `Successfully assigned ${exercises.length} exercise(s)!`);
        res.redirect(`${BASE_PATH || ''}/therapist/dashboard`);
    } catch (err) {
        console.error('Assignment Error:', err);
        req.flash('error', `Failed to assign exercises: ${err.message}`);
        res.redirect(`${BASE_PATH || ''}/therapist/patient/${patientId}`);
    }
});

// _________________Admin Routes_______________

app.get('/admin/dashboard', requireLogin, requireRole('admin'), async (req, res) => {
    const [patients] = await pool.execute('SELECT * FROM patients WHERE role <> "deactivated" ORDER BY role, name');
    res.render('admin_dashboard', { patients });
});

app.get('/admin/edit/:id', requireLogin, requireRole('admin'), async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
        req.flash('error', 'User not found.');
        return res.redirect(`${BASE_PATH || ''}/admin/dashboard`);
    }
    const patient = rows[0];
    res.render('admin_edit', { patient });
});

app.post('/admin/edit/:id', requireLogin, requireRole('admin'), async (req, res) => {
    const { name, surname, email, illness } = req.body;
    const [result] = await pool.execute(
        'UPDATE patients SET name = ?, surname = ?, email = ?, illness = ? WHERE id = ?',
        [name, surname, email, illness || null, req.params.id]
    );

    if (result.affectedRows > 0) {
        req.flash('success', 'User updated successfully.');
    } else {
        req.flash('error', 'No changes made or user not found.');
    }
    res.redirect(`${BASE_PATH || ''}/admin/dashboard`);
});

app.post('/admin/delete/:id', requireLogin, requireRole('admin'), async (req, res) => {
    if (req.params.id == req.session.userId) {
        req.flash('error', 'You cannot deactivate your own account.');
        return res.redirect(`${BASE_PATH || ''}/admin/dashboard`);
    }

    const [result] = await pool.execute('UPDATE patients SET role = "deactivated" WHERE id = ?', [req.params.id]);

    if (result.affectedRows > 0) {
        req.flash('success', 'User deactivated.');
    } else {
        req.flash('error', 'User not found.');
    }
    res.redirect(`${BASE_PATH || ''}/admin/dashboard`);
});

// ___________Start Server___________

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => { //avaliable everywhere
    console.log(`NHS PhysioHUB running!`);
    console.log(`> Local: http://localhost:${PORT}${BASE_PATH}`);
    console.log(`> External: https://www.doc.gold.ac.uk${BASE_PATH}`);
});