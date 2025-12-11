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
//   PUBLIC & AUTH ROUTES   
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

        // admin critical check
        if (user.role === 'deactivated') {
                req.flash('error', 'Account is deactivated. Please contact the administrator.');
                return res.redirect('/login');
        }        
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
//   PATIENT ROUTES   
//_____________________________________

app.get('/patient/dashboard', requireLogin, requireRole('patient'), async (req, res) => {
    const [patientRows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [req.session.userId]);
    const patient = patientRows[0];
    let exercises = [];
    let treatment = null;
    if (patient.attended) {
        const [treatmentRows] = await pool.execute('SELECT * FROM ongoing_treatment WHERE nhs_number = ? ORDER BY id DESC', [patient.nhs_number]);
        if (treatmentRows.length) {
            // Get the *latest* treatment record
            treatment = treatmentRows[0]; // Get the LATEST by ordering DESC
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
//   THERAPIST ROUTES   
//_____________________________________

app.get('/therapist/dashboard', requireLogin, requireRole('therapist'), async (req, res) => {
    const query = req.query.search || '';
    const [rows] = await pool.execute(
        // FIX: Added AND role <> "deactivated" to exclude inactive patients
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

    // Fetch *all* available base exercises for the therapist's dropdown
    const [exRows] = await pool.execute('SELECT * FROM exercises WHERE illustration_sequence IS NOT NULL AND description IS NOT NULL');
    
    // Fetch historical treatments for this patient
    const [treatmentHistory] = await pool.execute('SELECT * FROM ongoing_treatment WHERE nhs_number = ? ORDER BY id DESC', [patient.nhs_number]);

    res.render('therapist_patient', { 
        patient: patient, 
        exercises: exRows, 
        treatmentHistory: treatmentHistory 
    });
});

//_____________________________________
//   ASSIGNMENT POST ROUTE  
//_____________________________________

app.post('/therapist/assign/:id', requireLogin, requireRole('therapist'), async (req, res) => {
    const patientId = req.params.id;
    
    // Filter out the empty exercises object if nothing was selected
    const exercisesObject = req.body.exercises || {};
    const exercises = Object.values(exercisesObject);
    
    // 1. Validation Check: Ensure at least one exercise or clear existing assignment
    if (exercises.length === 0) {
        // show an error if they submit an empty form.
       req.flash('error', 'Please select at least one exercise to assign.');
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
            
            // --- INPUT VALIDATION AGAINST 'SALT AND PEPPER ASHING' ---
            const duration = parseInt(ex.duration);
            const reps = parseInt(ex.reps);
            const perWeek = parseInt(ex.perWeek);
            
            if (isNaN(duration) || isNaN(reps) || isNaN(perWeek) || duration <= 0 || reps <= 0 || perWeek <= 0) {
                // If any input is invalid, throw an error that the catch block handles
                throw new Error(`Invalid prescription value for exercise: ${ex.name}. All values must be positive numbers.`);
            }

            // --- END VALIDATION ---
        
            // Create a clear, descriptive description for the patient dashboard
            const customDescription = `Perform for a duration/reps of ${duration} in ${reps} sets, for ${perWeek} sessions per week.`;
            
            // 1. Insert a new custom-detailed exercise record
            const [exResult] = await pool.execute(
             'INSERT INTO exercises (name, description, illustration_sequence, timer, checklist) VALUES (?, ?, ?, ?, ?)',
             [
               ex.name,
               customDescription,
               ex.illustration_sequence, 
               0, 
               JSON.stringify({ duration: duration, reps: reps, perWeek: perWeek }) // Storing assignment data
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
        await emailController.sendConfirmation(patientId); 
        
        req.flash('success', `Successfully assigned ${exercises.length} exercise(s)!`);
        res.redirect('/therapist/dashboard');
    } catch (err) {
        console.error('Assignment Error:', err);
        // The error message now contains the specific reason from the validation block
        req.flash('error', `Failed to assign exercises: ${err.message}`); 
        res.redirect(`/therapist/patient/${patientId}`);
    }
});


//_____________________________________
//   ADMIN ROUTES   
//_____________________________________

app.get('/admin/dashboard', requireLogin, requireRole('admin'), async (req, res) => {
    const [patients] = await pool.execute('SELECT * FROM patients WHERE role <> ?', ['deactivated']);
    res.render('admin_dashboard', { patients });
});


// --- NEW: GET /admin/edit/:id (Fixes Cannot GET /admin/edit/13) ---
app.get('/admin/edit/:id', requireLogin, requireRole('admin'), async (req, res) => {
    const patientId = req.params.id;
    
    try {
        const [rows] = await pool.execute('SELECT * FROM patients WHERE id = ?', [patientId]);
        const patient = rows[0];

        if (!patient) {
            req.flash('error', `User with ID ${patientId} not found.`);
            return res.redirect('/admin/dashboard');
        }

        res.render('admin_edit', { patient: patient });

    }
    catch (error) {
        console.error('Error loading admin edit page:', error);
        req.flash('error', 'Error loading user data for editing.');
        res.redirect('/admin/dashboard');
    }
});

// --- ADMIN EDIT /admin/edit/:id  ---
app.post('/admin/edit/:id', requireLogin, requireRole('admin'), async (req, res) => {
    const { name, surname, email, illness } = req.body;
    const patientId = req.params.id;

    try {
        const [result] = await pool.execute(
            'UPDATE patients SET name = ?, surname = ?, email = ?, illness = ? WHERE id = ?',
            [name, surname, email, illness, patientId]
        );
        
        if (result.affectedRows === 0) {
            req.flash('error', 'User not found or no changes made.');
            return res.redirect('/admin/edit/' + patientId);
        }
        
        req.flash('success', `User ID ${patientId} updated successfully.`);
        res.redirect('/admin/dashboard');

    } catch (error) {
        console.error('Error updating user:', error);
        req.flash('error', `Failed to update user: ${error.message}`);
        res.redirect('/admin/edit/' + patientId);
    }
});


// ADMIN DELETE (SOFT DELETE / DEACTIVATION) 
app.post('/admin/delete/:id', requireLogin, requireRole('admin'), async (req, res) => {
    const patientId = req.params.id;

    console.log(`ATTEMPTING DEACTIVATION for User ID: ${patientId}`);
    
    // Safety check: Prevent admin from deactivating themselves
    if (patientId == req.session.userId) {
        req.flash('error', 'You cannot deactivate your own account.');
        return res.redirect('/admin/dashboard');
    }
    
    try {
        // Soft delete: Set the role to 'deactivated' instead of permanent deletion.
        const [result] = await pool.execute(
            'UPDATE patients SET role = ? WHERE id = ?', 
            ['deactivated', patientId]
        );
        
        console.log("DB UPDATE RESULT", result);

        if (result.affectedRows === 0) {
             req.flash('error', `User ID ${patientId} not found.`);
        } else {
             req.flash('success', `User ID ${patientId} successfully set to INACTIVE (role set to 'deactivated').`);
        }
        res.redirect('/admin/dashboard');

    } catch (error) {
        console.error('Error deactivating user:', error);
        req.flash('error', `Failed to set user ID ${patientId} to inactive: ${error.message}`);
        res.redirect('/admin/dashboard');
    }
});

//_____________________________________
//   SERVER STARTUP   
//_____________________________________

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});