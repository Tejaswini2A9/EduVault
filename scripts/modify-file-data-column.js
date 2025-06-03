/**
 * Script to modify the file_data column to allow NULL values
 */

require('dotenv').config();
const mysql = require('mysql');
const util = require('util');

// Create a connection to MySQL
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cms'
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
        
        const tables = await connection.query(checkTableQuery, [process.env.DB_NAME || 'cms']);
        
        if (tables.length === 0) {
            console.log('Table certificate_details does not exist!');
            connection.end();
            return;
        }
        
        // Check if file_data column exists
        const checkColumnQuery = `
            SELECT COLUMN_NAME, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'certificate_details' 
            AND COLUMN_NAME = 'file_data'
        `;
        
        const columns = await connection.query(checkColumnQuery, [process.env.DB_NAME || 'cms']);
        
        if (columns.length === 0) {
            console.log('file_data column does not exist. No modification needed.');
            connection.end();
            return;
        }
        
        // Check if file_data column is already nullable
        if (columns[0].IS_NULLABLE === 'YES') {
            console.log('file_data column is already nullable. No modification needed.');
            connection.end();
            return;
        }
        
        console.log('Modifying file_data column to allow NULL values...');
        
        // Get the current column type
        const getColumnTypeQuery = `
            SELECT COLUMN_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'certificate_details' 
            AND COLUMN_NAME = 'file_data'
        `;
        
        const columnTypeResult = await connection.query(getColumnTypeQuery, [process.env.DB_NAME || 'cms']);
        const columnType = columnTypeResult[0].COLUMN_TYPE;
        
        // Modify the column to allow NULL values
        const modifyColumnQuery = `
            ALTER TABLE certificate_details 
            MODIFY COLUMN file_data ${columnType} NULL
        `;
        
        await connection.query(modifyColumnQuery);
        
        console.log('file_data column modified successfully to allow NULL values.');
        
        // Check if file_path column exists
        const checkFilePathQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'certificate_details' 
            AND COLUMN_NAME = 'file_path'
        `;
        
        const filePathColumns = await connection.query(checkFilePathQuery, [process.env.DB_NAME || 'cms']);
        
        if (filePathColumns.length === 0) {
            console.log('Adding file_path column...');
            
            const addColumnQuery = `
                ALTER TABLE certificate_details 
                ADD COLUMN file_path VARCHAR(255) NULL
            `;
            
            await connection.query(addColumnQuery);
            console.log('file_path column added successfully.');
        }
    } catch (error) {
        console.error('Error modifying column:', error);
    } finally {
        connection.end();
    }
});
