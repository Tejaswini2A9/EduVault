/**
 * Script to increase MySQL max_allowed_packet size for the current session
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

    // Set max_allowed_packet for the current session
    const setMaxPacketQuery = 'SET GLOBAL max_allowed_packet=67108864'; // 64MB

    connection.query(setMaxPacketQuery, (err, results) => {
        if (err) {
            console.error('Error setting max_allowed_packet:', err);
            console.log('You may need to modify your MySQL configuration file (my.cnf or my.ini) directly.');
            console.log('Add the following line under the [mysqld] section:');
            console.log('max_allowed_packet=64M');
        } else {
            console.log('Successfully increased max_allowed_packet size to 64MB');
        }

        // Close the connection
        connection.end();
    });
});
