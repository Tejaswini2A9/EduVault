-- Create database if not exists
CREATE DATABASE IF NOT EXISTS eduvault;
USE eduvault;

-- Create stu_details table
CREATE TABLE IF NOT EXISTS stu_details (
    Student_id VARCHAR(20) PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Phone_number VARCHAR(15) NOT NULL,
    pp VARCHAR(255) DEFAULT NULL
);

-- Create login table for admin and other users
CREATE TABLE IF NOT EXISTS login (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student', 'faculty') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user if not exists
INSERT INTO login (username, password, role)
SELECT 'Admin', 'admin123', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM login WHERE username = 'Admin');

-- Create certificate_details table
CREATE TABLE IF NOT EXISTS certificate_details (
    file_id VARCHAR(50) PRIMARY KEY,
    Stu_id VARCHAR(20) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    course_type VARCHAR(100) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    ppc VARCHAR(50) NOT NULL,
    dateoncertificate DATE NOT NULL,
    OrgAgent VARCHAR(100) NOT NULL,
    Fee VARCHAR(50) DEFAULT 'FREE',
    weblink VARCHAR(255) DEFAULT NULL,
    file_path VARCHAR(255) NOT NULL,
    Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Stu_id) REFERENCES stu_details(Student_id) ON DELETE CASCADE
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent', 'late') NOT NULL DEFAULT 'present',
    subject_code VARCHAR(20) NOT NULL,
    FOREIGN KEY (student_id) REFERENCES stu_details(Student_id) ON DELETE CASCADE,
    UNIQUE KEY (student_id, date, subject_code)
);

-- Create academic_results table
CREATE TABLE IF NOT EXISTS academic_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    semester INT NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    credits DECIMAL(3,1) NOT NULL,
    grade VARCHAR(2) NOT NULL,
    FOREIGN KEY (student_id) REFERENCES stu_details(Student_id) ON DELETE CASCADE,
    UNIQUE KEY (student_id, semester, subject_code)
);
