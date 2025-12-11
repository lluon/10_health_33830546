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
app.use(express.static(path.join(__dirname, 'public'))); 

// Define the PEPPER (Secret Key)
const PEPPER = process.env.BCRYPT_PEPPER;
if (!PEPPER) {
    console.error("FATAL ERROR: BCRYPT_PEPPER environment variable is not set. Application is insecure/will fail.");
    // In a real app, you might crash the server here
}

const pool = mysql.createPool({
  host: process.env.HEALTH_HOST,
  user: process.env.HEALTH_USER,
  password: process.env.HEALTH_PASSWORD,
  database: process.env.HEALTH_DATABASE
});

// Middleware
function requireLogin(req, res, next) {
  if (!req.session.userId) {
     req.flash('error', 'Please log in to access this page.');
     return res.redirect('/login');
  }
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (req.session.role !== role) {
        req.flash('error', 'Access denied.');
        return res.redirect('/login');
    }
    next();
  };
}

// Middleware to expose session/flash messages to all views
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.messages = req.flash();
    next();
});

//_____________________________________
//   PUBLIC & AUTH ROUTES   
//_____________________________________

app.get('/', (req, res) => res.render('home'));
app.get('/about', (req, res) => res.render('about'));
app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
  const { username, password, role, nhs_number, name, surname, dob, address, email } = req.body;
  if (!['patient', 'therapist'].includes(role)) {
    req.flash('error', 'Invalid role selection.');
    return res.redirect('/register');
  }

  // Password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
  if (!passwordRegex.test(password)) {
    req.flash('error', 'Password must be 8+ characters with 1 lowercase, 1 uppercase, 1 number, 1 special char.');
    return res.redirect('/register');
  }

  // 1. Apply PEPPER before hashing
  const pepperedPassword = password + PEPPER;
  // Use salt rounds from your test data logic (12 is common and secure)
  const hashedPassword = await bcrypt.hash(pepperedPassword, 12); 
 
  try {
    await pool.execute(
      'INSERT INTO patients (username, password, role, nhs_number, name, surname, dob, address, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, role, nhs_number, name, surname, dob, address, email]
    );
    req.flash('success', 'Registered successfully. Please log in.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
        req.flash('error', 'Registration failed: Username or NHS number already exists.');
    } else {
        req.flash('error', 'Error registering user. Please try again.');
    }
    res.redirect('/register');
  }
});

app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
        const [rows] = await pool.execute('SELECT id, password, role FROM patients WHERE username = ?', [username]);

        if (rows.length === 0) {
            req.flash('error', 'Invalid username or password.');
            return res.redirect('/login');
        }

        const user = rows[0];
        const storedHash = user.password;
        
        // 1. Apply PEPPER to the submitted password
        const pepperedPasswordInput = password + PEPPER;

        // 2. Compare the peppered input against the stored hash
        const match = await bcrypt.compare(pepperedPasswordInput, storedHash);
        
        if (match) {
            req.session.userId = user.id;
            req.session.role = user.role;
            req.session.username = username;
            req.flash('success', `Welcome back, ${username}!`);
            return res.redirect(`/${req.session.role}/dashboard`);
        } else {
            req.flash('error', 'Invalid username or password.');
            return res.redirect('/login');
        }
    } catch (error) {
        console.error('Login Error:', error);
        req.flash('error', 'An unexpected error occurred during login.');
        return res.redirect('/login');
    }
});


app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Logout error:', err);
        res.redirect('/');
    });
});


//_____________________________________
//   PATIENT ROUTES   
//_____________________________________

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
  res.render('patient_dashboard', { patient, exercises, treatment });
});

app.post('/patient/illness', requireLogin, requireRole('patient'), async (req, res) => {
  const { illness } = req.body;
  // Resetting attended to FALSE means they are back on the waiting list
  await pool.execute('UPDATE patients SET illness = ?, attended = FALSE WHERE id = ?', [illness, req.session.userId]); 
  req.flash('success', 'Illness submitted, awaiting confirmation from your therapist.');
  res.redirect('/patient/dashboard');
});

// individual exercise 
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


//_____________________________________
//   THERAPIST ROUTES   
//_____________________________________

app.get('/therapist/dashboard', requireLogin, requireRole('therapist'), async (req, res) => {
  const query = req.query.search || '';
  const [rows] = await pool.execute(
    'SELECT * FROM patients WHERE role = "patient" AND (name LIKE ? OR surname LIKE ? OR nhs_number = ? OR illness LIKE ?)',
    [`%${query}%`, `%${query}%`, query, `%${query}%`]
  );
  res.render('therapist_dashboard', { patients: rows });
});

app.get('/therapist/patient/:id', requireLogin, requireRole('therapist'), async (req, res) => {
  const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.params.id]);
  // Fetch *all* available base exercises for the therapist's dropdown
  const [exRows] = await pool.execute('SELECT * FROM exercises WHERE illustration_sequence IS NOT NULL'); // Fetches base exercises
  
  // Fetch historical treatments for this patient
  const [treatmentHistory] = await pool.execute('SELECT * FROM ongoing_treatment WHERE nhs_number = ? ORDER BY id DESC', [patientRows[0].nhs_number]);

  res.render('therapist_patient', { 
    patient: patientRows[0], 
    exercises: exRows, 
    treatmentHistory: treatmentHistory 
  });
});

//_____________________________________
//   ASSIGNMENT POST ROUTE  
//_____________________________________

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
   // emailController.sendConfirmation(patientId); // Uncomment if email functionality is ready
  
   req.flash('success', `Successfully assigned ${exercises.length} exercise(s)!`);
   res.redirect('/therapist/dashboard');
  } catch (err) {
   console.error(err);
   req.flash('error', 'Failed to assign exercises');
   res.redirect(`/therapist/patient/${patientId}`);
  }
});

//_____________________________________
//   ADMIN ROUTES    
//_____________________________________

app.get('/admin/dashboard', requireLogin, requireRole('admin'), async (req, res) => {
  const [patients] = await pool.execute('SELECT * FROM patients');
  res.render('admin_dashboard', { patients });
});

//_____________________________________
//   SERVER STARTUP   
//_____________________________________

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});