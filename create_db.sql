CREATE DATABASE IF NOT EXISTS health;
USE health;

CREATE TABLE IF NOT EXISTS patients(
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('patient','therapist','admin') NOT NULL,
    nhs_number VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    surname VARCHAR(255),
    dob DATE,
    address VARCHAR(255),
    email VARCHAR(255),
    illness TEXT,
    attended BOOLEAN DEFAULT FALSE,
    exercises_json JSON,
    timing VARCHAR(255),
    progression TEXT
);