const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.HEALTH_HOST,
  user: process.env.HEALTH_USER,
  password: process.env.HEALTH_PASSWORD,
  database: process.env.HEALTH_DATABASE
});

// Middleware
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.session.role !== role) return res.redirect('/login');
    next();
  };
}

// Routes
//__________________________

app.get('/', (req, res) => res.render('home'));

app.get('/about', (req, res) => res.render('about'));

app.get('/register', (req, res) => res.render('register', { messages: req.flash() }));

app.post('/register', async (req, res) => {
  const { username, password, role, nhs_number, name, surname, dob, address, email } = req.body;
  if (!['patient', 'therapist'].includes(role)) return res.status(400).send('Invalid role');
  try {
    await pool.execute(
      'INSERT INTO patients (username, password, role, nhs_number, name, surname, dob, address, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, password, role, nhs_number, name, surname, dob, address, email]
    );
    req.flash('success', 'Registered successfully');
    res.redirect('/login');
  } catch (err) {
    req.flash('error', 'Error registering');
    res.redirect('/register');
  }
});

app.get('/login', (req, res) => res.render('login', { messages: req.flash() }));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.execute('SELECT * FROM patients WHERE username = ? AND password = ?', [username, password]);
  if (rows.length) {
    req.session.userId = rows[0].id;
    req.session.role = rows[0].role;
    res.redirect(`/${req.session.role}/dashboard`);
  } else {
    req.flash('error', 'Invalid credentials');
    res.redirect('/login');
  }
});

app.get('/patient/dashboard', requireLogin, requireRole('patient'), async (req, res) => {
  const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.session.userId]);
  const patient = patientRows[0];
  let exercises = [];
  if (patient.attended) {
    const [treatmentRows] = await pool.execute('SELECT * FROM ongoing_treatments WHERE nhs_number = ?', [patient.nhs_number]);
    if (treatmentRows.length) {
      const treatmentId = treatmentRows[0].id;
      const [exRows] = await pool.execute(
        'SELECT e.*, te.order_num FROM exercises e JOIN treatment_exercises te ON e.id = te.exercise_id WHERE te.treatment_id = ? ORDER BY te.order_num',
        [treatmentId]
      );
      exercises = exRows;
    }
  }
  res.render('patient_dashboard', { patient, exercises, treatment: patient.attended ? treatmentRows[0] : null, messages: req.flash() });
});

app.post('/patient/illness', requireLogin, requireRole('patient'), async (req, res) => {
  const { illness } = req.body;
  await pool.execute('UPDATE patients SET illness = ?, attended = FALSE WHERE id = ?', [illness, req.session.userId]);
  req.flash('success', 'Illness submitted, awaiting confirmation');
  res.redirect('/patient/dashboard');
});

app.get('/therapist/dashboard', requireLogin, requireRole('therapist'), async (req, res) => {
  const query = req.query.search || '';
  const [rows] = await pool.execute(
    'SELECT * FROM patients WHERE role = "patient" AND (name LIKE ? OR surname LIKE ? OR nhs_number = ? OR illness LIKE ?)',
    [`%${query}%`, `%${query}%`, query, `%${query}%`]
  );
  res.render('therapist_dashboard', { patients: rows, messages: req.flash() });
});

app.get('/therapist/patient/:id', requireLogin, requireRole('therapist'), async (req, res) => {
  const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  const [exRows] = await pool.execute('SELECT * FROM exercises');
  res.render('therapist_patient', { patient: patientRows[0], exercises: exRows, messages: req.flash() });
});

app.post('/therapist/assign/:id', requireLogin, requireRole('therapist'), async (req, res) => {
  const { timing, progression, exercise_ids, order_nums } = req.body;  // exercise_ids and order_nums as arrays from form
  const [patientRows] = await pool.execute('SELECT nhs_number FROM patients WHERE id = ?', [req.params.id]);
  const nhs_number = patientRows[0].nhs_number;
  const [treatmentInsert] = await pool.execute(
    'INSERT INTO ongoing_treatments (nhs_number, timing, progression) VALUES (?, ?, ?)',
    [nhs_number, timing, progression]
  );
  const treatmentId = treatmentInsert.insertId;
  for (let i = 0; i < exercise_ids.length; i++) {
    await pool.execute(
      'INSERT INTO treatment_exercises (treatment_id, exercise_id, order_num) VALUES (?, ?, ?)',
      [treatmentId, exercise_ids[i], order_nums[i]]
    );
  }
  await pool.execute('UPDATE patients SET attended = TRUE WHERE id = ?', [req.params.id]);
  // Simulate confirmation email with button
  const content = `Confirmation: Your treatment is ready. <a href="${process.env.HEALTH_BASE_PATH}/patient/dashboard"><button>Access Dashboard</button></a>`;
  console.log(`Simulated email for patient ${req.params.id}: ${content}`);
  req.flash('success', 'Exercises assigned, email simulated, request marked as attended');
  res.redirect('/therapist/dashboard');
});

app.get('/admin/dashboard', requireLogin, requireRole('admin'), async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM patients');
  res.render('admin_dashboard', { patients: rows, messages: req.flash() });
});

app.get('/admin/edit/:id', requireLogin, requireRole('admin'), async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  res.render('admin_edit', { patient: rows[0], messages: req.flash() });
});

app.post('/admin/edit/:id', requireLogin, requireRole('admin'), async (req, res) => {
  const { name, surname, email, illness } = req.body;  // Edit selected fields
  await pool.execute(
    'UPDATE patients SET name = ?, surname = ?, email = ?, illness = ? WHERE id = ?',
    [name, surname, email, illness, req.params.id]
  );
  req.flash('success', 'Patient updated');
  res.redirect('/admin/dashboard');
});

app.post('/admin/delete/:id', requireLogin, requireRole('admin'), async (req, res) => {
  await pool.execute('DELETE FROM patients WHERE id = ?', [req.params.id]);
  req.flash('success', 'Patient deleted');
  res.redirect('/admin/dashboard');
});

app.listen(8000, () => console.log('App running on port 8000'));