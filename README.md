REPORT

## CONCEPT

The NHS Physio Hub is a dynamic web application project designed as the core practical case study for the second-year Creative Computing course at Goldsmiths. The primary objective is to master dynamic web application development principles by creating a functional, real-world, and relevant prototype tailored for the health and beauty sector. The application addresses a critical inefficiency within the NHS patient journey.

## RESEARCH QUESTION

The application's necessity and potential impact are framed by this investigative question: What data exists on the frequency and average duration of patient delays in receiving feedback for non-urgent NHS waiting list items, and how often could partial automation (e.g., automated delivery of standardised advice, such as rehabilitation printouts) mitigate this delay? 


# OUTLINE

The NHS Physio Hub is a dynamic web application developed as the core practical case study for the second-year Creative Computing course at Goldsmiths. Its primary objective is to prototype a functional, real-world solution for the health sector, specifically addressing delays in non-urgent NHS physiotherapy waiting lists.

The application serves as a clinic management system with three key roles: Patient (e.g., sandroverrone), Therapist (e.g., dave_rowland), and Admin (e.g., gold). Patients register to submit illness reports, which physiotherapists review and triage. The system enables therapists to prescribe structured exercise plans, stored as JSON objects, which patients access in their personalised dashboards, complete with timers and checklists, effectively automating the delivery of standardised, non-urgent rehabilitation advice.

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

Features are role-based, starting with a home page that includes links to About, Register, Login, and dashboards.
Public Pages:

Home: Service overview and navigation.
About: Physiotherapy support description.

#Registration and Login:

## Register: 

Form collects name, surname, DOB, NHS number, email, address, role (patient/therapist), username, password. Inserts into the patient's table. 
Pre-inserted: 
•	admin ('gold'/'smiths123ABC$'), 
•	physiotherapist ('Physiotherapist!0'/'@43v3rF1t').
•	Login: Validates username/password (hashed); sessions are redirected by role.

## Patient Journey (Registration Required):

Dashboard: Illness description form (updates patients.illness), sets waiting status.
Post-confirmation: Dashboard shows exercises list from exercises_json; view individual (e.g., Exercise 01) with illustration sequence, description, timer, checklist.
Search: Query own exercises by parsing JSON.

## Physiotherapist Journey (After Login as Physiotherapist!0 / @43v3rF1t):

### Dashboard: 
List patients (search by name, surname, NHS number, illness; paginated).
### View new requests: 
Unattended illnesses (attended=false).
### Evaluate, add/assign/update exercise plan: 
Form to create/update exercises_json array (e.g., add objects for exercises), set timing/progression.
Send confirmation email: Simulated (console/email), with HTML button: <a href="/patient/dashboard">Access Dashboard</a>.
### Mark as attended: 
Update attended=true.

## Admin Journey:

Full access: 
View/edit/delete patient rows.
view/audit log




