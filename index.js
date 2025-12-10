const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const emailController = require('./controllers/email');
require('dotenv').config();

const app = express();
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(flash());
// IMPORTANT: Assumes public is the static directory containing /exercise/img/
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

// ------------------------------------
// --- PUBLIC & AUTH ROUTES ---
// ------------------------------------
app.get('/', (req, res) => res.render('home'));
app.get('/about', (req, res) => res.render('about'));
app.get('/register', (req, res) => res.render('register', { messages: req.flash() }));

app.post('/register', async (req, res) => {
  const { username, password, role, nhs_number, name, surname, dob, address, email } = req.body;
  if (!['patient', 'therapist'].includes(role)) return res.status(400).send('Invalid role');

  // Password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
  if (!passwordRegex.test(password)) {
    req.flash('error', 'Password must be 8+ characters with 1 lowercase, 1 uppercase, 1 number, 1 special char.');
    return res.redirect('/register');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await pool.execute(
      'INSERT INTO patients (username, password, role, nhs_number, name, surname, dob, address, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, role, nhs_number, name, surname, dob, address, email]
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
  const [rows] = await pool.execute('SELECT * FROM patients WHERE username = ?', [username]);
  if (rows.length && await bcrypt.compare(password, rows[0].password)) {
    req.session.userId = rows[0].id;
    req.session.role = rows[0].role;
    res.redirect(`/${req.session.role}/dashboard`);
  } else {
    req.flash('error', 'Invalid credentials');
    res.redirect('/login');
  }
});


// ------------------------------------
// --- PATIENT ROUTES ---
// ------------------------------------
app.get('/patient/dashboard', requireLogin, requireRole('patient'), async (req, res) => {
  const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.session.userId]);
  const patient = patientRows[0];
  let exercises = [];
  let treatment = null;
  if (patient.attended) {
    const [treatmentRows] = await pool.execute('SELECT * FROM ongoing_treatment WHERE nhs_number = ?', [patient.nhs_number]);
    if (treatmentRows.length) {
      // Get the *latest* treatment record
      treatment = treatmentRows[treatmentRows.length - 1]; 
      // Select the assigned exercises linked to the treatment
      const [exRows] = await pool.execute(
        'SELECT e.*, te.order_num FROM exercises e JOIN treatment_exercise te ON e.id = te.exercise_id WHERE te.treatment_id = ? ORDER BY te.order_num',
        [treatment.id]
      );
      exercises = exRows;
    }
  }
  res.render('patient_dashboard', { patient, exercises, treatment, messages: req.flash() });
});

app.post('/patient/illness', requireLogin, requireRole('patient'), async (req, res) => {
  const { illness } = req.body;
  // Resetting attended to FALSE means they are back on the waiting list
  await pool.execute('UPDATE patients SET illness = ?, attended = FALSE WHERE id = ?', [illness, req.session.userId]); 
  req.flash('success', 'Illness submitted, awaiting confirmation');
  res.redirect('/patient/dashboard');
});

// --- NEW/FIXED ROUTE: INDIVIDUAL EXERCISE PAGE WITH TIMER ---
app.get('/exercise/:id', requireLogin, requireRole('patient'), async (req, res) => {
    const exerciseId = req.params.id;
    try {
        // 1. Fetch the specific exercise record using the unique ID
        const [rows] = await pool.execute('SELECT * FROM exercises WHERE id = ?', [exerciseId]);
        
        if (rows.length === 0) {
            return res.status(404).send('Exercise not found');
        }
        
        const exercise = rows[0];
        
        // 2. Construct the view name using the illustration_sequence (e.g., 'exercise/0001')
        const viewName = `exercise/${exercise.illustration_sequence}`; 
        
        // 3. Render the correct EJS file, passing the exercise data
        res.render(viewName, { exercise }); 

    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading exercise page');
    }
});


// ------------------------------------
// --- THERAPIST ROUTES ---
// ------------------------------------
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
  // Fetch *all* available base exercises for the therapist's dropdown
  const [exRows] = await pool.execute('SELECT * FROM exercises WHERE id < 100'); // Assuming base exercises have small IDs
  res.render('therapist_patient', { patient: patientRows[0], exercises: exRows, messages: req.flash() });
});

// --- ASSIGNMENT POST ROUTE ---
app.post('/therapist/assign/:id', requireLogin, requireRole('therapist'), async (req, res) => {
  const patientId = req.params.id;
  
  const exercisesObject = req.body.exercises || {};
  const exercises = Object.values(exercisesObject);
  
  if (exercises.length === 0) {
   req.flash('error', 'Please select at least one exercise');
   return res.redirect(`/therapist/patient/${patientId}`);
  }
 
  try {
   const [patientRows] = await pool.execute('SELECT nhs_number FROM patients WHERE id = ?', [patientId]);
   const nhs_number = patientRows[0].nhs_number;
  
   // Create new treatment record, setting fixed timing and progression
   const [treatmentResult] = await pool.execute(
    'INSERT INTO ongoing_treatment (nhs_number, timing, progression) VALUES (?, ?, ?)',
    [nhs_number, 'Custom assigned', 'Individual progression']
   );
   const treatmentId = treatmentResult.insertId;
  
   // Insert each exercise
   for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    
    // Create a clear, descriptive description for the patient dashboard
    const customDescription = `Perform for a duration/reps of ${ex.duration} in ${ex.reps} sets, for ${ex.perWeek} sessions per week.`;
    
    // 1. Insert a new custom-detailed exercise record
    const [exResult] = await pool.execute(
     'INSERT INTO exercises (name, description, illustration_sequence, timer, checklist) VALUES (?, ?, ?, ?, ?)',
     [
      ex.name,
      customDescription,
      ex.illustration_sequence, 
      0, 
      JSON.stringify({ duration: ex.duration, reps: ex.reps, perWeek: ex.perWeek }) // Storing assignment data
     ]
    );
    const assignedExerciseId = exResult.insertId;
   
    // 2. Link the new exercise record to the ongoing treatment
    await pool.execute(
     'INSERT INTO treatment_exercise (treatment_id, exercise_id, order_num) VALUES (?, ?, ?)',
     [treatmentId, assignedExerciseId, i + 1]
    );
   }
  
   // Set attended to TRUE after assignment and email confirmation
   await pool.execute('UPDATE patients SET attended = TRUE WHERE id = ?', [patientId]);
   emailController.sendConfirmation(patientId);
  
   req.flash('success', `Successfully assigned ${exercises.length} exercise(s)!`);
   res.redirect('/therapist/dashboard');
  } catch (err) {
   console.error(err);
   req.flash('error', 'Failed to assign exercises');
   res.redirect(`/therapist/patient/${patientId}`);
  }
});

// ------------------------------------
// --- ADMIN ROUTES (simple examples) ---
// ------------------------------------
app.get('/admin/dashboard', requireLogin, requireRole('admin'), async (req, res) => {
  const [patients] = await pool.execute('SELECT * FROM patients');
  res.render('admin_dashboard', { patients, messages: req.flash() });
});

// ------------------------------------
// --- SERVER STARTUP ---
// ------------------------------------
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});