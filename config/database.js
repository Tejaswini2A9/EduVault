const mysql = require('mysql');
const util = require('util');

// Create a connection pool
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'eduvault',
    connectTimeout: 60000,
    maxAllowedPacket: 164 * 1024 * 1024,
});

// Check database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.');
        }
    } else {
        console.log('Successfully connected to the database.');
        connection.release();
    }
});

// Promisify for Node.js async/await
pool.query = util.promisify(pool.query).bind(pool);

module.exports = pool;
