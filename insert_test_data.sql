USE health;

-- Delete any existing test data to ensure a clean start
DELETE FROM treatment_exercise;
DELETE FROM ongoing_treatment;
DELETE FROM exercises;
DELETE FROM patients;

-- Insert admin user 'gold' with hashed password for 'smiths'
INSERT INTO patients (username, password, role, name, surname, email) 
VALUES ('gold', '$2b$12$eze1FkZvjnyi7pBuZVuYMOgBkiE7laSItxY.PO3PBRco54Wk4pzy.', 'admin', 'Gold', 'Smith', 'gold@smiths.com');

-- Insert sample therapist
INSERT INTO patients (username, password, role, name, surname, email) 
VALUES ('Physioterapist!0', '$2b$12$eze1FkZvjnyi7pBuZVuYMOgBkiE7laSItxY.PO3PBRco54Wk4pzy.', 'therapist', 'Therapy', 'Pro', 'therapy@nhs.com');

-- Insert sample patient (for demonstration)
INSERT INTO patients (username, password, role, nhs_number, name, surname, dob, address, email, illness, attended) 
VALUES ('patient1', '$2b$12$eze1FkZvjnyi7pBuZVuYMOgBkiE7laSItxY.PO3PBRco54Wk4pzy.', 'patient', '1234567890', 'John', 'Doe', '1990-01-01', '123 Main St', 'john@doe.com', 'Knee Pain', FALSE);

-- Insert all six specific exercises (IDs will be 1 through 6 if table was empty)
INSERT INTO exercises (name, description, illustration_sequence, timer, checklist) 
VALUES 
('Lunges sliding back and forwards', 'Position yourself standing. Practice sliding back and forwards with your unaffected leg.', '0001', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Calf raise', 'Position yourself standing on a step with your heels off the edge. Lift your body weight up onto your toes.', '0002', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Jump off a block with visual cues', 'Jump forward off the block onto the floor, taking off and landing with your knees bent.', '0003', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Wall squat', 'Position yourself standing facing a wall with one foot resting on a high block. Place your hands on the wall and lunge forwards to bend your knee.', '0004', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Step up with high knee and high arm', 'Position yourself with one foot on a block in front of you. Step forward and up, lifting your other knee to hip height and raising your opposite arm.', '0005', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Bound off a block with visual cues', 'Position yourself standing on a block with a marker. Bound forward over the marker and land on one leg.', '0006', 0, '{"duration": 5, "reps": 10, "perWeek": 3}');