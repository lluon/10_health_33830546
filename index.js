// index.js – NHS PhysioHUB (Goldsmiths deployment – solid BASE_PATH)
require('dotenv').config({ path: '.env' });
console.log('BCRYPT_PEPPER loaded:', !!process.env.BCRYPT_PEPPER); // Debug

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const emailController = require('./controllers/email');

const app = express();
const PORT = process.env.PORT || 8000;
const BASE_PATH = '/usr/388'; // <-- SOLID BASE PATH – all redirects use this

// ---------- App Setup ----------
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.use(flash());

// Make flash messages available in views
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.messages = req.flash();
    next();
});

// ---------- DB Pool ----------
const pool = mysql.createPool({
    host: process.env.HEALTH_HOST,
    user: process.env.HEALTH_USER,
    password: process.env.HEALTH_PASSWORD,
    database: process.env.HEALTH_DATABASE
});

// ---------- Helper ----------
const redirectLogin = (res) => res.redirect(`${BASE_PATH}/login`);

// ---------- Auth Middleware ----------
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        req.flash('error', 'Please log in to access this page.');
        return redirectLogin(res);
    }
    next();
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.session.role !== role) {
            req.flash('error', 'Access denied.');
            return redirectLogin(res);
        }
        next();
    };
}

// ---------- Public & Auth Routes ----------
app.get('/', (req, res) => res.render('home'));
app.get('/about', (req, res) => res.render('about'));
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    const { username, password, role, nhs_number, name, surname, dob, address, email } = req.body;
    if (!['patient', 'therapist'].includes(role)) {
        req.flash('error', 'Invalid role selection.');
        return res.redirect('/register');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
    if (!passwordRegex.test(password)) {
        req.flash('error', 'Password must be 8+ characters with lowercase, uppercase, number, and special char.');
        return res.redirect('/register');
    }

    const PEPPER = process.env.BCRYPT_PEPPER || '';
    const hashedPassword = await bcrypt.hash(password + PEPPER, 12);

    try {
        await pool.execute(
            'INSERT INTO patients (username, password, role, nhs_number, name, surname, dob, address, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, role, nhs_number, name, surname, dob, address, email]
        );
        req.flash('success', 'Registered successfully. Please log in.');
        redirectLogin(res);
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            req.flash('error', 'Username or NHS number already exists.');
        } else {
            req.flash('error', 'Error registering user.');
        }
        res.redirect('/register');
    }
});

app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const PEPPER = process.env.BCRYPT_PEPPER || '';

    try {
        const [rows] = await pool.execute('SELECT id, password, role FROM patients WHERE username = ?', [username]);
        if (rows.length === 0) {
            req.flash('error', 'Invalid username or password.');
            return redirectLogin(res);
        }

        const user = rows[0];
        if (user.role === 'deactivated') {
            req.flash('error', 'Account is deactivated. Contact administrator.');
            return redirectLogin(res);
        }

        const match = await bcrypt.compare(password + PEPPER, user.password);
        if (match) {
            req.session.userId = user.id;
            req.session.role = user.role;
            req.session.username = username;
            req.flash('success', `Welcome back, ${username}!`);
            return res.redirect(`/${user.role}/dashboard`);
        } else {
            req.flash('error', 'Invalid username or password.');
            return redirectLogin(res);
        }
    } catch (error) {
        console.error('Login Error:', error);
        req.flash('error', 'An unexpected error occurred during login.');
        return redirectLogin(res);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Logout error:', err);
        redirectLogin(res);
    });
});

// ---------- Patient Routes ----------
app.get('/patient/dashboard', requireLogin, requireRole('patient'), async (req, res) => {
    const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.session.userId]);
    const patient = patientRows[0];
    let exercises = [];
    let treatment = null;

    if (patient.attended) {
        const [treatmentRows] = await pool.execute('SELECT * FROM ongoing_treatment WHERE nhs_number = ? ORDER BY id DESC LIMIT 1', [patient.nhs_number]);
        if (treatmentRows.length) {
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
    req.flash('success', 'Illness submitted, awaiting confirmation from your therapist.');
    res.redirect('/patient/dashboard');
});

app.get('/exercise/:id', requireLogin, requireRole('patient'), async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM exercises WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).send('Exercise not found');
    const exercise = rows[0];
    const viewName = `exercise/${exercise.illustration_sequence}`;
    res.render(viewName, { exercise });
});

// ---------- Therapist Routes ----------
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
        return res.redirect('/therapist/dashboard');
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
        return res.redirect(`/therapist/patient/${patientId}`);
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

            const customDescription = `Perform for a duration/reps of ${duration} in ${reps} sets, for ${perWeek} sessions per week.`;

            const [exResult] = await pool.execute(
                'INSERT INTO exercises (name, description, illustration_sequence, timer, checklist) VALUES (?, ?, ?, ?, ?)',
                [ex.name, customDescription, ex.illustration_sequence, 0, JSON.stringify({ duration, reps, perWeek })]
            );
            const assignedExerciseId = exResult.insertId;

            await pool.execute(
                'INSERT INTO treatment_exercise (treatment_id, exercise_id, order_num) VALUES (?, ?, ?)',
                [treatmentId, assignedExerciseId, i + 1]
            );
        }

        await pool.execute('UPDATE patients SET attended = TRUE WHERE id = ?', [patientId]);
        await emailController.sendConfirmation(patientId);

        req.flash('success', `Successfully assigned ${exercises.length} exercise(s)!`);
        res.redirect('/therapist/dashboard');
    } catch (err) {
        console.error('Assignment Error:', err);
        req.flash('error', `Failed to assign exercises: ${err.message}`);
        res.redirect(`/therapist/patient/${patientId}`);
    }
});

// ---------- Admin Routes ----------
app.get('/admin/dashboard', requireLogin, requireRole('admin'), async (req, res) => {
    const [patients] = await pool.execute('SELECT * FROM patients WHERE role <> "deactivated"');
    res.render('admin_dashboard', { patients });
});

app.get('/admin/edit/:id', requireLogin, requireRole('admin'), async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    const patient = rows[0] || null;
    if (!patient) {
        req.flash('error', 'User not found.');
        return res.redirect('/admin/dashboard');
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
    res.redirect('/admin/dashboard');
});

app.post('/admin/delete/:id', requireLogin, requireRole('admin'), async (req, res) => {
    if (req.params.id == req.session.userId) {
        req.flash('error', 'You cannot deactivate your own account.');
        return res.redirect('/admin/dashboard');
    }
    const [result] = await pool.execute('UPDATE patients SET role = "deactivated" WHERE id = ?', [req.params.id]);
    req.flash(result.affectedRows ? 'success' : 'error', result.affectedRows ? 'User deactivated.' : 'User not found.');
    res.redirect('/admin/dashboard');
});

// ---------- Start Server ----------
app.listen(PORT, '0.0.0.0', () => {
    console.log(`NHS PhysioHUB running at https://www.doc.gold.ac.uk${BASE_PATH}`);
    console.log(`Local access: http://localhost:${PORT}`);
});