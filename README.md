NHS Physio Hub

---

## Table of Contents
- [CONCEPT](#concept)
- [RESEARCH QUESTION](#research-question)
- [OVERVIEW](#overview)
- [Project Structure](#project-structure)
- [ARCHITECTURE](#architecture)
- [DATA MODEL](#data-model)
  - [Data Model Schema: `patients` Table](#data-model-schema-patients-table)
- [USER FUNCTIONALLITY](#user-functionallity)
  - [1. Public Access and Registration](#1-public-access-and-registration)
  - [Pre-installed User Accounts for Testing](#pre-installed-user-accounts-for-testing)
  - [2. Patient Journey (User Type: patient)](#2-patient-journey-user-type-patient)
  - [3. Physiotherapist Journey (User Type: therapist)](#3-physiotherapist-journey-user-type-therapist)
  - [4. Admin Journey (User Type: admin)](#4-admin-journey-user-type-admin)
- [Advanced Techniques](#advanced-techniques)
  - [1. Role-Based Access Control (RBAC) Middleware](#1-role-based-access-control-rbac-middleware)
  - [2. Secure Hashing with Salt and Pepper](#2-secure-hashing-with-salt-and-pepper)
  - [3. Handling Complex Data with MySQL JSON](#3-handling-complex-data-with-mysql-json)
  - [4. Role-Based Access Control (RBAC) in NHS Physio Hub](#4-role-based-access-control-rbac-in-nhs-physio-hub)
- [AI DECLARATION](#ai-declaration)

---

# outline

## CONCEPT

The NHS Physio Hub is a dynamic web application project designed as the core practical case study for the second-year Creative Computing course at Goldsmiths. The primary objective is to master dynamic web application development principles by creating a functional, real-world, and relevant prototype tailored for the health and beauty sector. The application addresses a critical inefficiency within the NHS patient journey.

## RESEARCH QUESTION

The application's necessity and potential impact are framed by this investigative question: What data exists on the frequency and average duration of patient delays in receiving feedback for non-urgent NHS waiting list items, and how often could partial automation (e.g., automated delivery of standardised advice, such as rehabilitation printouts) mitigate this delay? 

## OVERVIEW

The NHS Physio Hub is a dynamic web application developed as the core practical case study for the second-year Creative Computing course at Goldsmiths. Its primary objective is to prototype a functional, real-world solution for the health sector, specifically addressing delays in non-urgent NHS physiotherapy waiting lists.

The application serves as a clinic management system with three key roles: Patient (e.g., sandroverrone), Therapist (e.g., dave_rowland), and Admin (e.g., gold). Patients register to submit illness reports, which physiotherapists review and triage. The system enables therapists to prescribe structured exercise plans, stored as JSON objects, which patients access in their personalised dashboards, complete with timers and checklists, effectively automating the delivery of standardised, non-urgent rehabilitation advice.

##  Project Structure

| File/Folder | Status | Description (Max 30 chars) |
| :--- | :--- | :--- |
| **.env** |  | Environment Variables (Secrets) |
| **index.js** |  | Main Server Entrypoint |
| **package.json** |  | Project Dependencies |
| **public/** |  | Static Assets (CSS/JS/IMG) |
| **public/js/timer.js** | | Client-Side Stopwatch Logic |
| **src/controllers/** | | Business Logic Functions |
| **src/controllers/email.js** |  | Simulated Email Sender |
| **src/models/patient.js** | | Patient/User DB Functions |
| **src/routes/patient.js** | Placeholder | Patient Routes Defined |
| **views/exercise/** | Done | Individual Exercise Pages |
| **views/admin\_*** | Done | Admin Templates |
| **views/therapist\_*** | Done | Therapist Templates |
| **views/patient\_*** | Done | Patient Templates |

10_health_33830546/<br>
├── .env<br>
├── index.js<br>
├── package.json<br>
├── package-lock.json<br>
├── controllers/<br>
│   └── email.js<br>
├── models/<br>
│   └── patient.js<br>
├── routes/<br>
│   └── patient.js<br>
└── views/<br>
        ├── exercise/<br>
        │   ├── 0001.ejs<br>
        │   ├── 0002.ejs<br>
        │   ├── 0003.ejs<br>
        │   ├── 0004.ejs<br>
        │   ├── 0005.ejs<br>
        │   └── 0006.ejs<br>
        ├── _exercise_assignment_partial.ejs<br>
        ├── about.ejs<br>
        ├── admin_dashboard.ejs<br>
        ├── admin_edit.ejs_<br>
        ├── home.ejs<br>
        ├── login.ejs<br>
        ├── patient_dashboard.ejs<br>
        ├── register.ejs<br>
        ├── therapist_dashboard.ejs<br>
        └── therapist_patient.ejs<br>


# ARCHITECTURE

The application uses a robust two-tier architecture:

Application Tier: Built on Node.js and Express.js for routing, session management, and handling all application logic. EJS is used as the templating engine for rendering dynamic views. This tier features custom Role-Based Access Control (RBAC) middleware to secure routes.

Data Tier: Utilizes a MySQL database. The entire application data is stored within a single, highly denormalized table to simplify the prototype’s data layer.

The accompanying diagram illustrates the flow from the home page through registration, login, and subsequent role-branching to the respective patient, therapist, and admin dashboards.


The application employs a single, denormalized table called patients. This table integrates all necessary data fields, including user credentials, personal information (PII), illness reports, and treatment plans.

The key fields are: id (PK), username, password_hash, user type (crucial for RBAC), illness (TEXT), attended (TINYINT for waiting status), and the critical exercises_json (JSON type). exercises_json stores the therapist’s assigned treatment as an array of structured exercise objects, eliminating the need for separate exercise and treatment tables in this simplified prototype.




# DATA MODEL

The application employs a single, denormalized table called patients. This table integrates all necessary data fields, including user credentials, personal information (PII), illness reports, and treatment plans.

The key fields are: id (PK), username, password_hash, user type (crucial for RBAC), illness (TEXT), attended (TINYINT for waiting status), and the critical exercises_json (JSON type). exercises_json stores the therapist’s assigned treatment as an array of structured exercise objects, eliminating the need for separate exercise and treatment tables in this simplified prototype.

er Diagram

## Data Model Schema: `patients` Table

| Field | Data Type | Role/Description | Notes |
| :--- | :--- | :--- | :--- |
| **`id`** | `INT` | Primary Key (PK) | Auto-incrementing |
| **`username`** | `VARCHAR` | Unique username for login. | |
| **`password_hash`** | `VARCHAR` | Encrypted password (hash). | Uses bcrypt |
| **`user_type`** | `VARCHAR` | User's role: `patient`, `therapist`, or `admin`. | Crucial for RBAC |
| **`nhs_number`** | `VARCHAR` | Patient's NHS number. | |
| **`name`** | `VARCHAR` | First name. | |
| **`surname`** | `VARCHAR` | Last name. | |
| **`dob`** | `DATE` | Date of Birth. | |
| **`email`** | `VARCHAR` | Email address. | |
| **`address`** | `VARCHAR` | Residential address. | |
| **`illness`** | `TEXT` | Patient's self-reported illness description. | |
| **`attended`** | `TINYINT` | Request status: `0` (Waiting) or `1` (Assigned/Attended). | |
| **`exercises_json`** | `JSON` | Assigned exercise plan (structured JSON array). | Contains the treatment plan |

# USER FUNCTIONALLITY

The application's features are strictly role-based, accessible after successful login.

### 1. Public Access and Registration
The public interface includes the / (Home) page, /about page, and the primary access points: /register and /login.

Registration (/register): This form allows any new user to create an account by submitting PII (Name, NHS number, DOB, etc.), a unique username, and a password. Critically, the form includes a selection for the user_type:

New users can choose to register as a patient (the default and most common choice).

New users can also choose to register as a therapist.

Upon submission, the user's data is inserted into the patients table, and the password is hashed (password_hash).

Pre-installed Users for Testing: The following three accounts are pre-inserted into the database for immediate testing convenience, demonstrating each role's initial state:

## Pre-installed User Accounts for Testing

These accounts are pre-inserted into the `patients` table for immediate demonstration and testing of each role's functionality.

| Username | Name | Password | User Type | NHS Number |
| :--- | :--- | :--- | :--- | :--- |
| `sandroverrone` | Sandro Verrone | `L00k@tth@t` | `patient` | 1234567890 |
| `dave_rowland` | Dave Rowland | `am@R0n3_VP` | `therapist` | 1111111112 |
| `gold` | gold smiths | `smiths123ABC$` | `admin` | 0000000001 |

### 2. Patient Journey (User Type: patient)
Upon login (either a newly registered patient or sandroverrone), the patient is taken to the /patient/dashboard.

Initial Visit: They submit an illness description via a form, which updates their illness field and sets attended=0 (waiting).

Post-Assignment: Once a therapist has reviewed and assigned treatment, the dashboard dynamically displays their personalised Exercise List, parsed from the exercises_json column.

Treatment View: Patients can navigate to specific exercise pages (/exercise/:id) where they view the description, an illustration sequence (placeholder), and interact with a Client-Side Timer and checklist to track their progress.

### 3. Physiotherapist Journey (User Type: therapist)
Login Example: A newly registered therapist or dave_rowland.

Dashboard (/therapist/dashboard): Lists all patients, featuring pagination and robust search/filter functionality by Name, NHS Number, and Illness. A quick filter for New Requests (attended=0) is prioritised.

Evaluation and Assignment: The therapist views a patient's full details (/therapist/patient/:id) and uses the dedicated form to compile and assign a treatment plan.

Treatment Update: Posting the form to /therapist/assign/:id performs a critical update: it populates the patient’s exercises_json field and sets attended=1. This action simultaneously triggers a Simulated Confirmation Email (logged to console) with an HTML quick-access button to the patient’s dashboard.

### 4. Admin Journey (User Type: admin)
Login Example: gold / smiths123ABC$

Admins have full oversight and management capabilities, including the ability to view, edit, and audit all patient rows. They can perform Soft Deletion by changing a user’s user_type to 'deactivated', preventing future logins while retaining historical data.

# Advanced Techniques
The development of the NHS Physio Hub incorporated several advanced techniques to ensure security, maintainability, and efficient handling of complex, health-related data within the simplified single-table architecture. These techniques demonstrate proficiency in secure full-stack development.

## 1. Role-Based Access Control (RBAC) Middleware
To enforce secure access, a custom Express middleware function, requireRole(), was implemented. This middleware runs before any protected route and checks the user's req.session.user_type against the required permission, preventing unauthorized users from accessing dashboards or privileged APIs (vertical privilege escalation).

This is crucial in a health application where data separation between patients, therapists, and admins is mandatory.

Code Snippet (File: src/middleware/auth.js)

// Middleware to ensure the user has the required role
function requireRole(allowedRole) {
    return (req, res, next) => {
        if (!req.session.user_type || req.session.user_type !== allowedRole) {
            console.warn(`403 Access denied for role: ${req.session.user_type || 'Guest'}`);
            return res.status(403).render('error', { message: 'Access Denied.' });
        }
        next(); // Permission granted
    };
}
// Usage Example in router:
// router.get('/therapist/dashboard', requireRole('therapist'), therapistController.getDashboard);

## 2. Secure Hashing with Salt and Pepper
Standard password hashing uses a salt to secure passwords. For an application handling sensitive PII, an extra layer of defense was added using a Pepper. The pepper is a secret, hardcoded key stored in the environment variables, which is combined with the user's password and the unique salt before hashing with bcrypt.

This defends against scenarios where an attacker compromises both the database (obtaining hashes and salts) and the source code, as the pepper key is kept external in the .env file, which is excluded from version control.

Code Snippet (File: src/utils/security.js)

const bcrypt = require('bcrypt');
const PEPPER = process.env.PEPPER_SECRET; // Stored securely in .env

async function hashPassword(password) {
    const saltRounds = 10;
    const saltedPassword = password + PEPPER; // Apply the pepper
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(saltedPassword, salt); // Hash with salt
}

// Verification function reverses the process
async function comparePassword(inputPassword, storedHash) {
    const saltedPassword = inputPassword + PEPPER;
    return bcrypt.compare(saltedPassword, storedHash);
}

## 3. Handling Complex Data with MySQL JSON
Instead of creating separate tables (e.g., treatments, exercises, treatment_exercises), the application uses the MySQL JSON data type in the exercises_json column.

This allows the therapist to prescribe a full, structured array of exercises (each with repetition, duration, and session details) within a single database field. The application layer then parses this JSON object to render the dynamic exercise list on the patient's dashboard, demonstrating a hybrid data modeling approach suitable for the prototype's constraints.

Example Data Structure Stored in exercises_json:

[
  {
    "id": 1,
    "name": "Shoulder Blade Squeeze",
    "reps": 10,
    "sets": 3,
    "duration": "N/A",
    "notes": "Hold squeeze for 5 seconds."
  },
  {
    "id": 2,
    "name": "Knee Extension",
    "reps": 15,
    "sets": 3,
    "duration": "N/A",
    "notes": "Slow and controlled movement."
  }
]
## 4. Role-Based Access Control (RBAC) in NHS Physio Hub

RBAC is the mechanism that ensures users can only access the resources (pages, forms, API endpoints) that are appropriate for their designated user_type (patient, therapist, or admin). This prevents security breaches like a patient accidentally or maliciously accessing a therapist's patient lists, or a therapist viewing the admin's user deletion controls.

How my RBAC Middleware Works
my application uses a custom Express middleware function, requireRole(), to enforce access rules on a per-route basis.

Authentication and Session Check: When a user successfully logs in, my server checks their credentials against the patients table. Upon success, the user's user_type is stored securely in the session object (e.g., req.session.user_type = 'therapist').

Middleware Execution: On every protected route, Express executes the requireRole() function before allowing the request to proceed to the main controller logic.

Permission Validation: The requireRole() function checks two things:

Is the user logged in? (req.session.user_type exists).

Does the user's current role match the required role for that route? (e.g., Is 'therapist' equal to 'therapist'?).

Outcome:

If the roles match, the middleware calls next(), and the user is granted access to the page/resource.

If the roles do not match, the middleware terminates the request, logs the access attempt, and sends a 403 Access Denied error to the user.

Conceptual Diagram of RBAC Flow
This diagram illustrates the process:

Request: A user attempts to access a specific URL (e.g., /therapist/assign/:id).

RBAC Check (auth.js): The middleware intercepts the request and checks the session's user_type.

Decision: Only if the user_type is 'therapist' is the request allowed to proceed to the main Express route handler to process the assignment. All other roles are blocked.

Key Code Snippet (Re-emphasizing the Logic)
The following code is the core of my security model, ensuring that only the correct actors can perform sensitive operations:

File: src/middleware/auth.js

JavaScript

// Middleware to ensure the user has the required role
function requireRole(allowedRole) {
    return (req, res, next) => {
        // Check if session exists AND if the user's role matches the allowed role
        if (!req.session.user_type || req.session.user_type !== allowedRole) {
            console.warn(`403 Access denied for role: ${req.session.user_type || 'Guest'}`);
            return res.status(403).render('error', { message: 'Access Denied.' });
        }
        next(); // Permission granted, proceed to the route controller
    };
}
// Usage: router.get('/therapist/dashboard', requireRole('therapist'), ...);

This method makes my application highly secure because access permissions are managed centrally and are explicitly defined for every single protected endpoint.

# AI DECLARATION

AI tools were used in this assignment primarily for:
correcting the report, refining the research question, and generating boilerplate code for standard features (e.g., Express routing structure). AI tools were also used to generate the correct formatting for the Markdown tables and the Mermaid ER Diagram.

The critical, custom-developed components—including the security implementation (RBAC middleware, Salt and Pepper logic), the database schema design (single normalised table with JSON usage), and the specific logic for patient triage and assignment—were designed, coded, and tested independently by me. AI is used as a sophisticated debugging and documentation assistant, rather than a confused core code generator.

## Author & Declaration

Educational project created by Lucio Luongo (338305446) for the Dynamic Web Applications module in Creative Computing. © 2025 – Goldsmiths, University of London

