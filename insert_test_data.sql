USE health;

-- Delete any existing test data 
-- NOTE: Foreign key constraints mean you must delete from child tables first.
DELETE FROM treatment_exercise;
DELETE FROM ongoing_treatment;
DELETE FROM exercises;
DELETE FROM patients;

-- Insert admin user 
-- The table has 12 columns. We list 9 and let the remaining (illness, attended) default to NULL/FALSE.
INSERT INTO patients (username, password, role, name, surname, email, nhs_number, dob, address) 
VALUES (
    'gold', 
    '$2b$12$/HeLfgkQbxjGDJN5HepP7eY3Mb5YbnGk/Fw35Hs9j.VTozlE.2iUu', -- Hashed 'adminpass'
    'admin',
    'gold',
    'smiths',
    'lluon001@gold.ac.uk',
    '0000000001', 
    '1980-01-01',
    '1 Admin Way'
);

-- Insert therapist user
INSERT INTO patients (username, password, role, name, surname, email, nhs_number, dob, address) 
VALUES (
    'dave_rowland',
    '$2b$12$7vYelaQQk3DISwd54yLmveuluiUQktr3.c21G8rkOTvq7KPm3XiXW', -- Hashed 'therapass'
    'therapist',
    'Dave',
    'Rowland',
    'lluon001@gold.ac.uk',
    '1111111112',
    '1985-05-15',
    '2 Therapy Lane'
);

-- Insert patient user 
-- This user is provided an initial illness, so we must list the 'illness' column.
INSERT INTO patients (username, password, role, name, surname, email, nhs_number, dob, address, illness) 
VALUES (
    'sandroverrone',
    '$2b$12$72t8LaarC/EKCNWIrEaHjuVwjZlOER.uP92mA14GsIa7cfv9KoJE.', -- Hashed 'patientpass'
    'patient',
    'Sandro',
    'Verrone',
    'lluon001@gold.ac.uk',
    '1234567890', 
    '1995-10-20', 
    '3 Patient St',
    'lower left leg pain'
);

-- Insert all six specific exercises
-- NOTE: The 'checklist' column is used here to store the default prescription data
INSERT INTO exercises (name, description, illustration_sequence, timer, checklist) 
VALUES 
('Lunges sliding back and forwards', 'Position yourself standing. Practice sliding back and forwards with your unaffected leg.', '0001', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Calf raise', 'Position yourself standing on a step with your heels off the edge. Lift your body weight up onto your toes.', '0002', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Jump off a block with visual cues', 'Jump forward off the block onto the floor, taking off and landing with your knees bent.', '0003', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Wall squat', 'Position yourself standing facing a wall with one foot resting on a high block. Place your hands on the wall and lunge forwards to bend your knee.', '0004', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Step up with high knee and high arm', 'Position yourself with one foot on a block in front of you. Step forward and up, lifting your other knee to hip height and raising your opposite arm.', '0005', 0, '{"duration": 5, "reps": 10, "perWeek": 3}'),
('Bound off a block with visual cues', 'Position yourself standing on a block with a marker. Bound forward over the marker and land on one leg.', '0006', 0, '{"duration": 5, "reps": 10, "perWeek": 3}');