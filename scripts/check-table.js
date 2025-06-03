/**
 * Script to check the structure of the certificate_details table
 */

require('dotenv').config();
const mysql = require('mysql');

// Create a connection to MySQL
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eduvault'
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

    connection.query(checkTableQuery, [process.env.DB_NAME || 'eduvault'], (err, tables) => {
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

            connection.query(checkCertificatesQuery, [process.env.DB_NAME || 'eduvault'], (err, certTables) => {
                if (err) {
                    console.error('Error checking certificates table:', err);
                    connection.end();
                    process.exit(1);
                }

                if (certTables.length > 0) {
                    console.log('Found certificates table instead. You need to rename it to certificate_details.');
                }

                connection.end();
            });

            return;
        }

        // Get table structure
        const describeQuery = 'DESCRIBE certificate_details';

        connection.query(describeQuery, (err, columns) => {
            if (err) {
                console.error('Error describing table:', err);
                connection.end();
                process.exit(1);
            }

            console.log('Table structure:');
            columns.forEach(column => {
                console.log(`${column.Field} - ${column.Type} - ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });

            // Check if file_path column exists
            const filePathColumn = columns.find(col => col.Field === 'file_path');
            if (!filePathColumn) {
                console.log('\nThe file_path column is missing. You need to add it to the table.');
            } else {
                console.log('\nThe file_path column exists.');
            }

            // Check if file_data column exists
            const fileDataColumn = columns.find(col => col.Field === 'file_data');
            if (fileDataColumn) {
                console.log('The file_data column exists. You may want to migrate data from file_data to file_path.');
            }

            connection.end();
        });
    });
});
