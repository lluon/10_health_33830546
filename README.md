NHS Physio Hub

---

## Table of Contents

- [CONCEPT](#concept)
- [RESEARCH QUESTION](#research-question)
- [OVERVIEW](#overview)
- [Project Structure](#project-structure)
- [ARCHITECTURE](#architecture)
- [DATA MODEL](#data-model)
  - [ER Diagram (Conceptual Model)](#er-diagram-conceptual-model)
- [USER FUNCTIONALLITY](#user-functionallity)
  - [Key User Roles](#key-user-roles)
  - [Functional Features by Role](#functional-features-by-role)
    - [Patient Features](#patient-features)
    - [Therapist Features](#therapist-features)
    - [Admin Features](#admin-features)
    - [Common Functionality](#common-functionality)
  - [1. Public Access and Registration](#1-public-access-and-registration)
    - [Overview](#overview)
    - [Public Features](#public-features)
    - [Registration Process (Patient Only)](#registration-process-patient-only)
    - [Self-Registration Rules](#self-registration-rules)
    - [Login for All Users](#login-for-all-users)
  - [Pre-installed User Accounts for Testing](#pre-installed-user-accounts-for-testing)
  - [Therapist Journey](#therapist-journey)
  - [Admin Journey](#admin-journey)
- [Advanced Techniques](#advanced-techniques)
  - [1. Role-Based Access Control (RBAC) Middleware](#1-role-based-access-control-rbac-middleware)
  - [2. Secure Password Hashing with Pepper](#2-secure-password-hashing-with-pepper)
  - [3. Hybrid Relational + JSON Data Modelling](#3-hybrid-relational--json-data-modelling)
  - [4. Dynamic Client-Side Exercise Assignment UI](#4-dynamic-client-side-exercise-assignment-ui)
  - [5. Client-Side Timer Widget](#5-client-side-timer-widget)
- [AI DECLARATION](#ai-declaration)
- [Author & Declaration](#author--declaration)

---

# outline

## CONCEPT

The NHS Physio Hub is a dynamic web application project designed as the core practical case study for the second-year Creative Computing course at Goldsmiths. The primary objective is to master dynamic web application development principles by creating a functional, real-world, and relevant prototype tailored for the health and beauty sector. The application addresses a critical inefficiency within the NHS patient journey.

## RESEARCH QUESTION

The application's necessity and potential impact are framed by this investigative question: What data exists on the frequency and average duration of patient delays in receiving feedback for non-urgent NHS waiting list items, and how often could partial automation (e.g., automated delivery of standardised advice, such as rehabilitation printouts) mitigate this delay? 

## OVERVIEW

The NHS PhysioHUB is a web application prototype developed for the Dynamic Web Applications module at Goldsmiths, University of London. It simulates a physiotherapy clinic management system aimed at reducing delays in non-urgent NHS physiotherapy referrals. Patients register, submit illness descriptions, and receive personalised exercise plans prescribed by therapists. Therapists review patient reports, assign customised exercises, and trigger confirmation notifications. Admins manage user accounts. The app uses role-based access, secure authentication, and a relational MySQL database with JSON for flexible prescriptions. It demonstrates full-stack Node.js/Express development with EJS templating. 

##  Project Structure

| File/Folder | Status | Description (Max 30 chars) |
| :--- | :--- | :--- |
| **.env** |  | Environment Variables (Secrets) |
| **index.js** |  | Main Server Entrypoint |
| **package.json** |  | Project Dependencies |
| **public/** |  | Static Assets (CSS/JS/IMG) |
| **public/js/timer.js** | | Client-Side Stopwatch Logic |
| **controllers/email.js** |  | Simulated Email Sender |
| **model/patient.js** | | Patient/User DB Functions |
| **views/exercise/template.ejs** | | template Exercise Pages |
| **about.ejs** |  | brief description of the service |
| **views/admin_dashboard** |  | admin assign board |
| **views/admin_edit.ejs** |  | Admin Templates |
| **views/home.ejs*** |  | home landing page |
| **views/login.ejs*** |  | login page |
| **views/patient_dashboard.ejs*** |  | patient dashboard |
| **views/register.ejs*** |  | register page |
| **views/therapist_dashboard** |  | Therapist dashboard |
| **views/therapist_patient** |  | Therapist assign board |


10_health_33830546/<br>
├── .env<br>
├── index.js<br>
├── package.json<br>
├── package-lock.json<br>
├── controllers/<br>
│   └── email.js<br>
├── routes/<br>
│   └── patient.js<br>
└── views/<br>
        ├── exercise/<br>
        │   └── template.ejs<br>
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

The application follows a classic two-tier architecture:

Application Tier: Node.js with Express.js handles routing, session management, middleware, and business logic. EJS is used for server-side templating to render dynamic views. Custom middleware enforces role-based access control (RBAC). Static assets (CSS, JS, images) are served from the /public directory.
Data Tier: MySQL database (health) accessed via mysql2/promise connection pool. Data operations use asynchronous queries.

The flow starts at the home page, branches through registration/login, and directs users to role-specific dashboards (patient, therapist, admin). All routes are defined in index.js. The app supports deployment with configurable BASE_PATH for subdirectories.
(98 words)
Data Model
The database uses a normalised relational schema with four tables to manage users, exercises, treatments, and assignments:

patients: Stores user credentials, personal details, role, and illness report.
exercises: Pre-defined exercises with name, description, illustration, and default checklist (JSON).
ongoing_treatment: Records treatment metadata (timing, progression) linked by patient's NHS number.
treatment_exercise: Junction table linking treatments to exercises, with order and custom_checklist (JSON) for personalised reps/duration/perWeek.

This hybrid approach ensures referential integrity while allowing flexible custom prescriptions via JSON.




# DATA MODEL

The application employs a single, denormalized table called patients. This table integrates all necessary data fields, including user credentials, personal information (PII), illness reports, and treatment plans.

The key fields are: id (PK), username, password_hash, user type (crucial for RBAC), illness (TEXT), attended (TINYINT for waiting status), and the critical exercises_json (JSON type). exercises_json stores the therapist’s assigned treatment as an array of structured exercise objects, eliminating the need for separate exercise and treatment tables in this simplified prototype.



# ER Diagram (Conceptual Model)
type: mermaid

### Entities and Attributes

#### textpatients
| Field              | Type         | Constraints/Notes                  |
|--------------------|--------------|------------------------------------|
| **id**             | INT          | PK, Auto-increment                 |
| username           | VARCHAR      | Unique                             |
| password           | VARCHAR      | Hashed                             |
| role               | VARCHAR      | e.g., patient, therapist, admin    |
| **nhs_number**     | VARCHAR      | Unique, FK to ongoing_treatment    |
| name               | VARCHAR      |                                    |
| surname            | VARCHAR      |                                    |
| dob                | DATE         | Date of birth                      |
| address            | VARCHAR      |                                    |
| email              | VARCHAR      |                                    |
| illness            | TEXT         | Patient-reported illness           |
| attended           | BOOLEAN      | 0 = waiting, 1 = attended          |

#### ongoing_treatment
| Field              | Type         | Constraints/Notes                  |
|--------------------|--------------|------------------------------------|
| **id**             | INT          | PK, Auto-increment                 |
| nhs_number         | VARCHAR      | FK → textpatients.nhs_number       |
| timing             | DATETIME     | Treatment schedule                 |
| progression        | TEXT         | Progress notes                     |

#### treatment_exercise (Junction Table)
| Field              | Type         | Constraints/Notes                  |
|--------------------|--------------|------------------------------------|
| **id**             | INT          | PK, Auto-increment                 |
| treatment_id       | INT          | FK → ongoing_treatment.id          |
| exercise_id        | INT          | FK → exercises.id                  |
| order_num          | INT          | Sequence in treatment plan         |
| custom_checklist   | JSON         | Custom checklist items             |

#### exercises
| Field                    | Type         | Constraints/Notes                  |
|--------------------------|--------------|------------------------------------|
| **id**                   | INT          | PK, Auto-increment                 |
| name                     | VARCHAR      | Exercise title                     |
| description              | TEXT         | Full instructions                  |
| illustration_sequence    | VARCHAR      | Image/video references             |
| checklist                | JSON         | Default checklist items            |

### Relationships
textpatients (1) ─────(nhs_number)─────▶ (0..) ongoing_treatment
│
│ (1)
▼
(0..) treatment_exercise (0..)
│
│ (many-to-many)
▼
exercises (0..)
text**Relationship Summary:**

- One **patient** (`textpatients`) can have **zero or many** ongoing treatments (`ongoing_treatment`).
- One **ongoing_treatment** belongs to exactly one patient.
- One **ongoing_treatment** can include **many** treatment exercises.
- Each **treatment_exercise** links one treatment to one exercise (many-to-many between `ongoing_treatment` and `exercises`).
- Exercises can be reused across multiple treatments.



# USER FUNCTIONALLITY

### Key User Roles
- **Patient**: Registers, logs in, views assigned treatment plan, marks exercises as completed, views progress.
- **Therapist**: Logs in, views list of assigned patients, creates/modifies ongoing treatments, assigns exercises, monitors patient progress.
- **Admin**: Manages users (approve/reject registrations, assign therapists to patients), oversees system.

### Functional Features by Role

#### Patient Features
| Feature                          | Description                                                                 | Notes                          |
|----------------------------------|-----------------------------------------------------------------------------|--------------------------------|
| Register / Login                 | Create account with NHS number and personal details; secure login           | NHS number validated as unique |
| View Profile                     | See personal information, illness description                                | Can edit non-sensitive fields  |
| View Assigned Treatment          | Display current ongoing treatment with timing and progression               | Read-only for patients         |
| View Exercise Plan               | List of assigned exercises in order, with descriptions, illustrations, checklists | Ordered by `order_num`         |
| Complete Exercise                | Mark checklist items as done, add notes; update custom_checklist            | Progress saved automatically   |
| View Progress                    | Summary of completed exercises and overall progression                      | Visual indicators encouraged   |
| Request Help / Contact Therapist | Send message or flag issues (future extension)                              |                                |

#### Therapist Features
| Feature                          | Description                                                                 | Notes                          |
|----------------------------------|-----------------------------------------------------------------------------|--------------------------------|
| Login                            | Secure login with role-based access                                         |                                |
| View Patient List                | See all patients assigned to them (based on ongoing_treatment)              | Filter/search by name/NHS      |
| View Patient Details             | Access full patient profile and illness description                         | Read-only personal data        |
| Create/Edit Ongoing Treatment    | Add or update treatment for a patient (timing, progression notes)           | Linked via nhs_number          |
| Assign Exercises                 | Select exercises from library, set order, customize checklist if needed     | Creates entries in treatment_exercise |
| Reorder / Remove Exercises       | Modify the sequence or remove exercises from a treatment plan               | Updates order_num              |
| Monitor Progress                 | View patient-completed checklists and progression updates                   | Real-time or on refresh        |
| Update Progression Notes         | Add professional notes to ongoing_treatment.progression                     |                                |

#### Admin Features
| Feature                          | Description                                                                 | Notes                          |
|----------------------------------|-----------------------------------------------------------------------------|--------------------------------|
| Login                            | Secure login with highest privileges                                        |                                |
| Manage Users                     | View all users, approve/reject new registrations, edit roles                | Patients start as "waiting"    |
| Assign Therapist to Patient      | Link a therapist to a patient's ongoing treatment (or set attended=1)       | Triggers patient access        |
| View System Overview             | Statistics on users, active treatments, etc.                                |                                |
| Manage Exercise Library          | Add/edit/remove exercises (name, description, illustrations, checklist)     | Global for all therapists      |

### Common Functionality
| Feature              | Description                                             | Available To          |
|----------------------|---------------------------------------------------------|-----------------------|
| Secure Authentication| Password hashing, session management                     | All users             |
| Role-Based Access    | Pages and actions restricted by `role` field             | All users             |
| Responsive UI        | Mobile-friendly views for patients completing exercises | All users             |
| Notifications        | Reminders for upcoming timings or incomplete exercises  | Patients (optional)   |


The application's features are strictly role-based, accessible after successful login.

### 1. Public Access and Registration
### 1. Public Access and Registration

#### Overview
This section describes the functionality available to unauthenticated (public) users and the patient registration process.

#### Public Features
| Feature                  | Description                                                                 | Notes                              |
|--------------------------|-----------------------------------------------------------------------------|------------------------------------|
| View Landing Page        | Home page with system overview, benefits, and login/registration links     | No authentication required         |
| View About/Information   | Static pages explaining the platform, privacy policy, terms of service     | Publicly accessible                |
| View FAQ / Help          | Common questions and guides for patients and therapists                     |                                    |
| Therapist Directory      | Optional: Public list of available therapists (names/specialties only)      | No patient data exposed            |

#### Registration Process (Patient Only)
| Step                     | Action                                                                      | Details / Validation               |
|--------------------------|-----------------------------------------------------------------------------|------------------------------------|
| Access Registration Form | Click "Register" on landing page or login screen                             | Public access                      |
| Enter Personal Details   | Fill in: name, surname, dob, address, email, nhs_number, illness description| NHS number must be unique          |
| Choose Username/Password | Set unique username and secure password                                      | Password strength enforced         |
| Submit Registration      | Form submission creates new record in `textpatients`                        | role = 'patient', attended = 0 (waiting) |
| Await Approval           | Patient account created but access restricted until admin approval           | Cannot login fully yet             |
| Admin Review             | Admin views pending registrations (attended=0), verifies NHS number/details| Manual or semi-automated check     |
| Approval / Assignment    | Admin sets attended=1 and optionally assigns a therapist                    | Patient can now login fully        |
| Notification             | Email or in-system notification sent to patient upon approval               | Welcomes them and prompts login    |
| Rejection (Optional)     | Admin rejects invalid registrations (deletes or flags)                      | Notification sent if possible      |

#### Self-Registration Rules
- Only **patients** can self-register (therapists and admins are created manually by admin).
- **NHS number** is mandatory and must be unique (prevents duplicate accounts).
- Upon registration, patient is in "waiting" state (`attended = 0`).
- Full access (viewing treatment, exercises) is granted only after admin approval (`attended = 1`).

#### Login for All Users
| Feature                  | Description                                                                 | Notes                              |
|--------------------------|-----------------------------------------------------------------------------|------------------------------------|
| Unified Login Page       | Single entry point for patients, therapists, and admins                     | Username + password                |
| Role-Based Redirection   | After login, redirect to role-specific dashboard                             | Based on `role` field              |
| Forgotten Password       | Basic password reset via email (future enhancement)                         |                                    |
| Session Management       | Secure sessions with timeout and logout                                     |                                    |

## Pre-installed User Accounts for Testing

These accounts are pre-inserted into the `patients` table for immediate demonstration and testing of each role's functionality.

| Username | Name | Password | User Type | NHS Number |
| :--- | :--- | :--- | :--- | :--- |
| `sandroverrone` | Sandro Verrone | `L00k@tth@t` | `patient` | 1234567890 |
| `dave_rowland` | Dave Rowland | `am@R0n3_VP` | `therapist` | 1111111112 |
| `gold` | gold smiths | `smiths123ABC$` | `admin` | 0000000001 |

Dashboard (/patient/dashboard): Submit illness if none recorded. Once assigned, view prescribed exercises with images, instructions, and custom parameters.
Exercise page (/exercise/:id): Detailed view with illustration, aim, description, prescription details, and client-side timer for recording duration.

## Therapist Journey

Dashboard (/therapist/dashboard): Table of patients with search by name/surname/NHS number/illness.
Patient view (/therapist/patient/:id): See illness, dynamically add/remove exercises with custom duration/reps/perWeek. Submit assigns treatment, sets attended=TRUE, and sends simulated confirmation email (console log).

## Admin Journey

Dashboard (/admin/dashboard): Table of all non-deactivated users with Edit and Deactivate actions.
Edit (/admin/edit/:id): Update name, surname, email, illness.

All pages include navigation (Home/Logout) and flash messages for feedback.


# Advanced Techniques
## 1. Role-Based Access Control (RBAC) Middleware
Custom middleware protects routes by role, preventing unauthorised access.
Code (index.js):
JavaScriptfunction requireRole(allowedRole) {
    return (req, res, next) => {
        if (req.session.role !== allowedRole) {
            req.flash('error', 'Access denied: insufficient privileges.');
            return res.redirect(`${BASE_PATH || ''}/login`);
        }
        next();
    };
}
// Usage example:
app.get('/patient/dashboard', requireLogin, requireRole('patient'), ...);

## 2. Secure Password Hashing with Pepper
Passwords are hashed with bcrypt (12 rounds) after appending a secret pepper from .env.
Code (index.js registration/login):
JavaScriptconst PEPPER = process.env.BCRYPT_PEPPER || '';
const hashedPassword = await bcrypt.hash(password + PEPPER, 12);
// Login:
const match = await bcrypt.compare(password + PEPPER, user.password);

## 3. Hybrid Relational + JSON Data Modelling
Pre-defined exercises use default checklist JSON. Assignments override with custom_checklist JSON in junction table, parsed dynamically in views.
Code (patient dashboard EJS):
ejslet params = {};
try {
    if (ex.custom_checklist) {
        params = JSON.parse(ex.custom_checklist);
    } else {
        params = JSON.parse(ex.checklist || '{"duration": "N/A", "reps": "N/A", "perWeek": "N/A"}');
    }
} catch (e) { ... }

## 4. Dynamic Client-Side Exercise Assignment UI
Therapist page uses JavaScript to add/remove exercises client-side before form submission, rendering partials with inline templating.
Code (views/therapist_patient.ejs script):
JavaScriptfunction renderExercisePartial(exerciseData) { return `...EJS-like HTML string...`; }
addBtn.addEventListener('click', handleAddExercise);
prescribedContainer.addEventListener('click', handleRemoveExercise);

## 5. Client-Side Timer Widget
Stopwatch-style timer on exercise pages for patients to record achieved duration (no persistence in prototype).
Code (public/js/timer.js).

# AI DECLARATION

AI tools were used in this assignment primarily for:
correcting the report, refining the research question, and generating boilerplate code for standard features (e.g., Express routing structure). AI tools were also used to generate the correct formatting for the Markdown tables and the Mermaid ER Diagram.

The critical, custom-developed components—including the security implementation (RBAC middleware, Salt and Pepper logic), the database schema design (single normalised table with JSON usage), and the specific logic for patient triage and assignment—were designed, coded, and tested independently by me. AI is used as a sophisticated debugging and documentation assistant, rather than a confused core code generator.

## Author & Declaration

Educational project created by Lucio Luongo (338305446) for the Dynamic Web Applications module in Creative Computing. © 2025 – Goldsmiths, University of London

