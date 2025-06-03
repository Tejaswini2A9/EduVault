/**
 * Comprehensive script to fix all database and file storage issues
 */

require('dotenv').config();
const mysql = require('mysql');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

// Create a connection to MySQL
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eduvault',
    maxAllowedPacket: 64 * 1024 * 1024 // 64MB
});

// Promisify the connection.query method
connection.query = util.promisify(connection.query).bind(connection);

console.log('Connecting to MySQL...');

// Connect to MySQL
connection.connect(async (err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }

    console.log('Connected to MySQL');

    try {
        // Step 1: Increase max_allowed_packet size
        console.log('Step 1: Increasing max_allowed_packet size...');
        try {
            await connection.query('SET GLOBAL max_allowed_packet=67108864'); // 64MB
            console.log('Successfully increased max_allowed_packet size to 64MB');
        } catch (packetError) {
            console.error('Error setting max_allowed_packet:', packetError);
            console.log('You may need to modify your MySQL configuration file (my.cnf or my.ini) directly.');
        }

        // Step 2: Check if certificate_details table exists
        console.log('\nStep 2: Checking certificate_details table...');
        const checkTableQuery = `
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'certificate_details'
        `;

        const tables = await connection.query(checkTableQuery, [process.env.DB_NAME || 'eduvault']);

        if (tables.length === 0) {
            console.log('Table certificate_details does not exist!');

            // Check if certificates table exists instead
            const checkCertificatesQuery = `
                SELECT TABLE_NAME
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = ?
                AND TABLE_NAME = 'certificates'
            `;

            const certTables = await connection.query(checkCertificatesQuery, [process.env.DB_NAME || 'eduvault']);

            if (certTables.length > 0) {
                console.log('Found certificates table. Renaming to certificate_details...');

                await connection.query('RENAME TABLE certificates TO certificate_details');
                console.log('Table renamed successfully.');
            } else {
                console.log('Creating certificate_details table...');

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
                        file_path VARCHAR(255) NULL,
                        file_data LONGBLOB NULL,
                        Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `;

                await connection.query(createTableQuery);
                console.log('Table created successfully.');
            }
        }

        // Step 3: Check and modify file_data column
        console.log('\nStep 3: Checking file_data column...');
        const checkFileDataQuery = `
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'certificate_details'
            AND COLUMN_NAME = 'file_data'
        `;

        const fileDataColumns = await connection.query(checkFileDataQuery, [process.env.DB_NAME || 'eduvault']);

        if (fileDataColumns.length > 0) {
            if (fileDataColumns[0].IS_NULLABLE === 'NO') {
                console.log('Modifying file_data column to allow NULL values...');

                const columnType = fileDataColumns[0].COLUMN_TYPE;
                await connection.query(`ALTER TABLE certificate_details MODIFY COLUMN file_data ${columnType} NULL`);
                console.log('file_data column modified successfully to allow NULL values.');
            } else {
                console.log('file_data column already allows NULL values.');
            }
        } else {
            console.log('Adding file_data column...');

            await connection.query('ALTER TABLE certificate_details ADD COLUMN file_data LONGBLOB NULL');
            console.log('file_data column added successfully.');
        }

        // Step 4: Check and add file_path column
        console.log('\nStep 4: Checking file_path column...');
        const checkFilePathQuery = `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'certificate_details'
            AND COLUMN_NAME = 'file_path'
        `;

        const filePathColumns = await connection.query(checkFilePathQuery, [process.env.DB_NAME || 'eduvault']);

        if (filePathColumns.length === 0) {
            console.log('Adding file_path column...');

            await connection.query('ALTER TABLE certificate_details ADD COLUMN file_path VARCHAR(255) NULL');
            console.log('file_path column added successfully.');
        } else {
            console.log('file_path column already exists.');
        }

        // Step 5: Migrate certificates from binary data to file paths
        console.log('\nStep 5: Migrating certificates from binary data to file paths...');

        // Ensure the uploads directory exists
        const uploadsDir = path.join(__dirname, '../public/uploaded_files');
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
        } catch (mkdirError) {
            if (mkdirError.code !== 'EEXIST') {
                console.error('Error creating uploads directory:', mkdirError);
            }
        }

        // Get all certificates with file_data but no file_path
        const getCertificatesQuery = `
            SELECT file_id, file_data
            FROM certificate_details
            WHERE file_data IS NOT NULL
            AND (file_path IS NULL OR file_path = '')
        `;

        const certificates = await connection.query(getCertificatesQuery);

        console.log(`Found ${certificates.length} certificates to migrate.`);

        // Migrate each certificate
        for (let i = 0; i < certificates.length; i++) {
            const certificate = certificates[i];

            if (!certificate.file_data) {
                console.log(`Certificate ${certificate.file_id} has no file_data. Skipping...`);
                continue;
            }

            try {
                // Create a file path
                const filePath = path.join(uploadsDir, `${certificate.file_id}.pdf`);

                // Write the file_data to disk
                await fs.writeFile(filePath, certificate.file_data);

                // Update the database with the file path
                await connection.query(
                    'UPDATE certificate_details SET file_path = ? WHERE file_id = ?',
                    [filePath, certificate.file_id]
                );

                console.log(`Migrated certificate ${i + 1}/${certificates.length}: ${certificate.file_id}`);
            } catch (error) {
                console.error(`Error migrating certificate ${certificate.file_id}:`, error);
            }
        }

        console.log('\nAll fixes have been applied successfully!');
        console.log('You can now restart your application and try uploading certificates again.');
    } catch (error) {
        console.error('Error during fix process:', error);
    } finally {
        connection.end();
    }
});
