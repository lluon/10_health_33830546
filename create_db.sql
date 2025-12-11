CREATE DATABASE IF NOT EXISTS health;
USE health;

CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    nhs_number VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    surname VARCHAR(255),
    dob DATE,
    address VARCHAR(255),
    email VARCHAR(255),
    illness TEXT,
    attended BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    illustration_sequence TEXT,
    timer INT,
    checklist TEXT
);

CREATE TABLE IF NOT EXISTS ongoing_treatment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nhs_number VARCHAR(255) NOT NULL,
    timing VARCHAR(255),
    progression TEXT,
    FOREIGN KEY (nhs_number) REFERENCES patients(nhs_number)
);

CREATE TABLE IF NOT EXISTS treatment_exercise (
    id INT AUTO_INCREMENT PRIMARY KEY,
    treatment_id INT,
    exercise_id INT,
    order_num INT,
    FOREIGN KEY (treatment_id) REFERENCES ongoing_treatment(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);