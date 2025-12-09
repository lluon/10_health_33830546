USE health;

-- Pre-inserted admin
INSERT INTO patients (username, password, role) VALUES ('gold', 'smiths123ABC$', 'admin');

-- Pre-inserted physiotherapist
INSERT INTO patients (username, password, role) VALUES ('Physiotherapist!0', '@43v3rF1t', 'therapist');

-- Sample exercises for prescription compiler
INSERT INTO exercises (name, description, illustration_sequence, timer, checklist) VALUES 
('Exercise 01', 'Description of exercise 01', 'Illustration sequence 01', 10, 'Checklist for 01'),
('Exercise 02', 'Description of exercise 02', 'Illustration sequence 02', 15, 'Checklist for 02'),
('Exercise 03', 'Description of exercise 03', 'Illustration sequence 03', 20, 'Checklist for 03');