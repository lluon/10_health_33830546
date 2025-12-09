REPORT

## CONCEPT

The NHS Physio Hub is a dynamic web application project designed as the core practical case study for the second-year Creative Computing course at Goldsmiths. The primary objective is to master dynamic web application development principles by creating a functional, real-world, and relevant prototype tailored for the health and beauty sector. The application addresses a critical inefficiency within the NHS patient journey.

## RESEARCH QUESTION

The application's necessity and potential impact are framed by this investigative question: What data exists on the frequency and average duration of patient delays in receiving feedback for non-urgent NHS waiting list items, and how often could partial automation (e.g., automated delivery of standardised advice, such as rehabilitation printouts) mitigate this delay? 


# OUTLINE

The NHS PhysioHub is a web application for physiotherapy clinic management, supporting patient registration, illness reporting, exercise prescription, and treatment tracking. Patients register with name, surname, DOB, NHS number, email, address, username, password, and role ('patient'), then log in to submit illness descriptions and view assigned exercises with timers and checklists in their dashboard. Physiotherapists (pre-inserted: username 'Physiotherapist!0', password '@43v3rF1t', role 'therapist') evaluate requests, assign/update exercise plans, mark as attended, and send simulated confirmation emails with a quick-access button to the patient dashboard. Admins (pre-inserted: 'gold'/'smiths123ABC$', role 'admin') oversee content, including deletions. The app includes database searches for patients, role-based access, and MySQL storage in a single simplified table, integrating lab skills for health and fitness.

# ARCHITECTURE

The app employs a two-tier architecture, comprising an application tier for logic and interfaces, and a data tier for storage.
Application tier: Node.js with Express for routing, sessions, forms, and authentication. EJS renders views, such as dashboards and searches.
Data tier: MySQL with a single table for all data, queried via Express controllers.
Diagram: The attached general diagram illustrates flows from NHS PhysioHub home to About, Register (fields: NHS number, name, surname, DOB, address, email, patient or therapist), Login, and role branches. Patients: illness form, waiting/confirmation emails, exercise list (01, 02, 03) with illustrations, descriptions, timers, and checklists. Physiotherapists: new illness descriptions, prescription compiler, ongoing treatments (NHS number, timing, progression). Admins: Supervise and edit all pages.

# DATA MODEL

Data model uses a single table, patients (integrating users, illnesses, treatments, and exercises), based on the diagram's DB structures.


Relationships: None (denormalised single table). Exercises are stored per patient in JSON for assignments; physiotherapists update directly. Pre-inserted rows for admin and therapist.
 
ER Diagram: Below is a Mermaid representation of the single entity:
 


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




