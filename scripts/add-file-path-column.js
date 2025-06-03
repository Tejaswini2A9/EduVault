/**
 * Script to add the file_path column to the certificate_details table
 */

require('dotenv').config();
const mysql = require('mysql');

// Create a connection to MySQL
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cms'
});

console.log('Connecting to MySQL...');

// Connect to MySQL
connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    
    console.log('Connected to MySQL');
    
    // Check if certificate_details table exists
    const checkTableQuery = `
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'certificate_details'
    `;
    
    connection.query(checkTableQuery, [process.env.DB_NAME || 'cms'], (err, tables) => {
        if (err) {
            console.error('Error checking table existence:', err);
            connection.end();
            process.exit(1);
        }
        
        if (tables.length === 0) {
            console.log('Table certificate_details does not exist!');
            
            // Check if certificates table exists instead
            const checkCertificatesQuery = `
                SELECT TABLE_NAME 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = 'certificates'
            `;
            
            connection.query(checkCertificatesQuery, [process.env.DB_NAME || 'cms'], (err, certTables) => {
                if (err) {
                    console.error('Error checking certificates table:', err);
                    connection.end();
                    process.exit(1);
                }
                
                if (certTables.length > 0) {
                    console.log('Found certificates table. Renaming to certificate_details...');
                    
                    const renameTableQuery = 'RENAME TABLE certificates TO certificate_details';
                    
                    connection.query(renameTableQuery, (err) => {
                        if (err) {
                            console.error('Error renaming table:', err);
                            connection.end();
                            process.exit(1);
                        }
                        
                        console.log('Table renamed successfully. Now adding file_path column...');
                        addFilePathColumn();
                    });
                } else {
                    console.log('No certificate table found. Creating new certificate_details table...');
                    
                    const createTableQuery = `
                        CREATE TABLE certificate_details (
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
                            Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    `;
                    
                    connection.query(createTableQuery, (err) => {
                        if (err) {
                            console.error('Error creating table:', err);
                            connection.end();
                            process.exit(1);
                        }
                        
                        console.log('Table created successfully with file_path column.');
                        connection.end();
                    });
                }
            });
            
            return;
        }
        
        // Check if file_path column exists
        const checkColumnQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'certificate_details' 
            AND COLUMN_NAME = 'file_path'
        `;
        
        connection.query(checkColumnQuery, [process.env.DB_NAME || 'cms'], (err, columns) => {
            if (err) {
                console.error('Error checking column existence:', err);
                connection.end();
                process.exit(1);
            }
            
            if (columns.length === 0) {
                console.log('file_path column does not exist. Adding it...');
                addFilePathColumn();
            } else {
                console.log('file_path column already exists.');
                connection.end();
            }
        });
    });
    
    function addFilePathColumn() {
        const addColumnQuery = `
            ALTER TABLE certificate_details 
            ADD COLUMN file_path VARCHAR(255) NULL
        `;
        
        connection.query(addColumnQuery, (err) => {
            if (err) {
                console.error('Error adding file_path column:', err);
                connection.end();
                process.exit(1);
            }
            
            console.log('file_path column added successfully.');
            connection.end();
        });
    }
});
