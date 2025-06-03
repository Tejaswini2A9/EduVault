/**
 * Database initialization script
 * Run this script to create the database and tables
 */

require('dotenv').config();
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Create a connection to MySQL server (without database)
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // Allow multiple SQL statements
});

// Read the SQL file
const sqlFilePath = path.join(__dirname, '..', 'database.sql');
const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

console.log('Initializing database...');

// Connect to MySQL server
connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL server:', err);
        process.exit(1);
    }
    
    console.log('Connected to MySQL server');
    
    // Execute the SQL script
    connection.query(sqlScript, (err, results) => {
        if (err) {
            console.error('Error executing SQL script:', err);
            connection.end();
            process.exit(1);
        }
        
        console.log('Database and tables created successfully');
        
        // Hash the admin password
        const saltRounds = 10;
        bcrypt.hash('admin123', saltRounds, (err, hash) => {
            if (err) {
                console.error('Error hashing admin password:', err);
                connection.end();
                process.exit(1);
            }
            
            // Update the admin password with the hashed version
            const updateAdminQuery = `
                UPDATE login 
                SET password = ? 
                WHERE username = 'Admin' AND password = 'admin123'
            `;
            
            connection.query(updateAdminQuery, [hash], (err, results) => {
                if (err) {
                    console.error('Error updating admin password:', err);
                } else if (results.affectedRows > 0) {
                    console.log('Admin password hashed successfully');
                } else {
                    console.log('Admin password already hashed');
                }
                
                // Close the connection
                connection.end();
                console.log('Database initialization completed');
            });
        });
    });
});
