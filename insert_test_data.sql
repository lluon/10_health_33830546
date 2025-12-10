USE health;

-- Insert admin user 'gold' with hashed password for 'smiths' (generated with bcrypt)
INSERT INTO patients (username, password, role, name, surname, email) 
VALUES ('gold', '$2b$12$eze1FkZvjnyi7pBuZVuYMOgBkiE7laSItxY.PO3PBRco54Wk4pzy.', 'admin', 'Gold', 'Smith', 'gold@smiths.com');

-- Insert sample therapist
INSERT INTO patients (username, password, role, name, surname, email) 
VALUES ('Physioterapist!0', '$2b$12$eze1FkZvjnyi7pBuZVuYMOgBkiE7laSItxY.PO3PBRco54Wk4pzy.', 'therapist', 'Therapy', 'Pro', 'therapy@nhs.com');

-- Insert sample patient
INSERT INTO patients (username, password, role, nhs_number, name, surname, dob, address, email, illness) 
VALUES ('patient1', '$2b$12$eze1FkZvjnyi7pBuZVuYMOgBkiE7laSItxY.PO3PBRco54Wk4pzy.', 'patient', '1234567890', 'John', 'Doe', '1990-01-01', '123 Main St', 'john@doe.com', 'Back pain');

-- Insert sample exercises
INSERT INTO exercises (name, description, illustration_sequence, timer, checklist) 
VALUES ('Stretch', 'Basic stretch', 'seq1', 5, 'Check posture');