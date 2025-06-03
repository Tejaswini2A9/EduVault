/**
 * Script to migrate certificates from binary data to file paths
 * This script extracts binary data from the database and saves it to files
 */

require('dotenv').config();
const mysql = require('mysql');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

// Create a connection to MySQL
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eduvault',
    // Increase the max packet size for this connection
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
        // Check if certificate_details table exists
        const checkTableQuery = `
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'certificate_details'
        `;

        const tables = await connection.query(checkTableQuery, [process.env.DB_NAME || 'eduvault']);

        if (tables.length === 0) {
            console.log('Table certificate_details does not exist!');
            connection.end();
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

        const columns = await connection.query(checkColumnQuery, [process.env.DB_NAME || 'eduvault']);

        if (columns.length === 0) {
            console.log('file_path column does not exist. Adding it...');

            try {
                const addColumnQuery = `
                    ALTER TABLE certificate_details
                    ADD COLUMN file_path VARCHAR(255) NULL
                `;

                await connection.query(addColumnQuery);
                console.log('file_path column added successfully.');
            } catch (alterError) {
                console.error('Error adding file_path column:', alterError);
                connection.end();
                return;
            }
        }

        // Check if file_data column exists
        const checkFileDataQuery = `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'certificate_details'
            AND COLUMN_NAME = 'file_data'
        `;

        const fileDataColumns = await connection.query(checkFileDataQuery, [process.env.DB_NAME || 'eduvault']);

        if (fileDataColumns.length === 0) {
            console.log('file_data column does not exist. No migration needed.');
            connection.end();
            return;
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

        // Ensure the uploads directory exists
        const uploadsDir = path.join(__dirname, '../public/uploaded_files');
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
        } catch (mkdirError) {
            if (mkdirError.code !== 'EEXIST') {
                console.error('Error creating uploads directory:', mkdirError);
                connection.end();
                return;
            }
        }

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
                const updateQuery = `
                    UPDATE certificate_details
                    SET file_path = ?
                    WHERE file_id = ?
                `;

                await connection.query(updateQuery, [filePath, certificate.file_id]);

                console.log(`Migrated certificate ${i + 1}/${certificates.length}: ${certificate.file_id}`);
            } catch (error) {
                console.error(`Error migrating certificate ${certificate.file_id}:`, error);
            }
        }

        console.log('Migration completed.');

        // Optionally, remove the file_data column to save space
        const removeFileDataPrompt = `
            To save database space, you can remove the file_data column with this SQL:
            ALTER TABLE certificate_details DROP COLUMN file_data;

            Only do this after verifying all files were migrated successfully!
        `;

        console.log(removeFileDataPrompt);
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        connection.end();
    }
});
