-- EduVault Database Schema
CREATE DATABASE IF NOT EXISTS eduvault;
USE eduvault;
-- Drop existing tables if they exist
DROP TABLE IF EXISTS `certificate_details`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `login`;
DROP TABLE IF EXISTS `stu_details`;

-- Create stu_details table
CREATE TABLE `stu_details` (
  `Student_id` varchar(20) NOT NULL,
  `student_name` varchar(100) NOT NULL,
  `Email` varchar(100) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `Phone_number` varchar(15) NOT NULL,
  `pp` varchar(255) DEFAULT 'default_profile.jpg',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`Student_id`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create login table
CREATE TABLE `login` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','student') NOT NULL DEFAULT 'student',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create certificate_details table
CREATE TABLE `certificate_details` (
  `file_id` varchar(50) NOT NULL,
  `Stu_id` varchar(20) NOT NULL,
  `student_name` varchar(100) NOT NULL,
  `course_type` varchar(100) NOT NULL,
  `course_name` varchar(255) NOT NULL,
  `ppc` varchar(50) NOT NULL,
  `dateoncertificate` date NOT NULL,
  `OrgAgent` varchar(255) NOT NULL,
  `weblink` varchar(255) DEFAULT NULL,
  `Fee` varchar(50) DEFAULT NULL,
  `file_data` longblob NOT NULL,
  `Date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`),
  KEY `Stu_id` (`Stu_id`),
  CONSTRAINT `certificate_details_ibfk_1` FOREIGN KEY (`Stu_id`) REFERENCES `stu_details` (`Student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create attendance table
CREATE TABLE `attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `htno` varchar(20) NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('present','absent') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `htno_date` (`htno`,`attendance_date`),
  KEY `htno` (`htno`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`htno`) REFERENCES `stu_details` (`Student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert admin user
INSERT INTO `login` (`username`, `password`, `role`) VALUES
('Admin', 'admin123', 'admin');

-- Insert sample student data
INSERT INTO `stu_details` (`Student_id`, `student_name`, `Email`, `Password`, `Phone_number`) VALUES
('20BD1A0501', 'John Doe', 'john.doe@example.com', '$2b$10$XdR1yXUJG9UQfe3QQ9LYEOBckwKrYEEzFXQP.bI9yR7ffVOBvZpPS', '9876543210'),
('20BD1A0502', 'Jane Smith', 'jane.smith@example.com', '$2b$10$XdR1yXUJG9UQfe3QQ9LYEOBckwKrYEEzFXQP.bI9yR7ffVOBvZpPS', '9876543211'),
('20BD1A0503', 'Robert Johnson', 'robert.johnson@example.com', '$2b$10$XdR1yXUJG9UQfe3QQ9LYEOBckwKrYEEzFXQP.bI9yR7ffVOBvZpPS', '9876543212');

-- Insert sample attendance data
INSERT INTO `attendance` (`htno`, `attendance_date`, `status`) VALUES
('20BD1A0501', '2023-01-05', 'present'),
('20BD1A0501', '2023-01-06', 'present'),
('20BD1A0501', '2023-01-07', 'absent'),
('20BD1A0501', '2023-02-05', 'present'),
('20BD1A0501', '2023-02-06', 'present'),
('20BD1A0501', '2023-03-07', 'present'),
('20BD1A0502', '2023-01-05', 'present'),
('20BD1A0502', '2023-01-06', 'absent'),
('20BD1A0502', '2023-01-07', 'present'),
('20BD1A0503', '2023-01-05', 'present'),
('20BD1A0503', '2023-01-06', 'present'),
('20BD1A0503', '2023-01-07', 'present');

-- Note: The passwords for the sample students are hashed versions of 'password123'
-- You can generate new hashed passwords using bcrypt
