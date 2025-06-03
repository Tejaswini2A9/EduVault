const express = require('express');
const mysql = require('mysql');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const app = express();

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 } // Limit: 1GB per file (adjustable)
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// MySQL connection pool configuration
const pool = mysql.createPool({
    connectionLimit: 10, 
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'cms',
    connectTimeout: 60000,
    maxAllowedPacket: 164 * 1024 * 1024,
});

// Database connection check
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to the database');
        connection.release(); 
    }
});

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.username) {
        return next();
    }
    res.redirect('/login');
}

// Routes
app.get('/', (req, res) => res.render('landpage'));

app.get('/login', (req, res) => res.render('login'));

app.get('/register', (req, res) => res.render('registration'));

app.post('/login', (req, res) => {
    const { un, pass } = req.body;
    pool.query('SELECT * FROM login WHERE username = ? AND password = ?', [un, pass], (err, result) => {
        if (err) return res.status(500).send('An error occurred.');
        if (result.length > 0) {
            req.session.username = un;
            res.redirect(`/${un}/homepage`);
        } else {
            res.render('login', { message: 'Incorrect details' });
        }
    });
});

// Homepage route for authenticated users
app.get('/:username/homepage', isAuthenticated, (req, res) => {
    const htno = req.params.username;
    if (htno === "Admin") {
        pool.query('SELECT * FROM stu_details', (err, students) => {
            if (err) return res.status(500).send('Error fetching stu_details.');
            pool.query('SELECT * FROM certificate_details', (err, files) => {
                if (err) {
                    console.log('Error fetching certificate details:', err);
                    files = []; // If error occurs, treat files as an empty array
                }
                res.render('result', { students, files });
            });
        });
    } else {
        pool.query('SELECT * FROM stu_details WHERE student_id = ?', [htno], (err, result) => {
            if (err) return res.status(500).send('Error fetching student data.');
            pool.query('SELECT * FROM certificate_details WHERE stu_id = ?', [htno], (err, files) => {
                if (err) {
                    console.log('Error fetching files:', err);
                    files = []; // If error occurs, treat files as an empty array
                }
                res.render('student_homepage', { results : result, files : files});
            });
        });
    }
});

// Update profile route
app.get('/:htno/settings', isAuthenticated, (req, res) => {
    const htno = req.params.htno;
    pool.query('SELECT * FROM stu_details WHERE student_id = ?', [htno], (err, result) => {
        if (err) return res.status(500).send('Error fetching student details.');
        res.render('settings', { result: result });
    });
});

// Update profile processing route
app.post('/:htno/settings', isAuthenticated, (req, res) => {
    const htno = req.params.htno;
    const { name, email, mobile } = req.body;

    // Update the profile details in the database
    pool.query('UPDATE stu_details SET name = ?, email = ?, mobile = ? WHERE student_id = ?', [name, email, mobile, htno], (err, result) => {
        if (err) return res.status(500).send('Error updating profile.');
        res.redirect(`/${htno}/homepage`);
    });
});

// File upload route
app.get('/:htno/upload', isAuthenticated, (req, res) => {
    const htno = req.params.htno;
    res.render('upload', { details: htno });
});

// File upload processing
app.post('/:htno/upload', upload.array('files', 10), (req, res) => {
    const htno = req.params.htno;

    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    console.log(`Received ${req.files.length} files for HTNO: ${htno}`);

    req.files.forEach((file) => {
        const fileName = sanitizeFileName(file.originalname);
        const fileData = file.buffer;

        console.log(`Inserting file: ${fileName}, HTNO: ${htno}`);

        insertFileWithRetry(fileName, htno, fileData, res);
    });
});


app.post('/:htno/upload-profile', upload.single('profile_pic'), (req, res) => {
    console.log(req.params); // Log the entire params object
    const htno = req.params.htno; // Correctly extract htno from params
    console.log('HTNO:', htno); // Check if htno is logged correctly

    if (!htno) {
        return res.status(400).send('Student ID is missing.');
    }

    let profilePicPath = req.file.originalname;
    console.log('Profile picture path:', profilePicPath);

    const query = `
        UPDATE stu_details 
        SET pp = ? 
        WHERE Student_id = ?
    `;

    pool.query(query, [profilePicPath, htno], (err) => {
        if (err) {
            console.error('Error uploading profile picture:', err);
            return res.status(500).send('Failed to upload profile picture.');
        }

        res.redirect(`/${htno}/homepage`);
    });
});



app.post('/update-details', (req, res) => {
    const { htno, name, email, mobile } = req.body;

    const query = `
        UPDATE students 
        SET name = ?, email = ?, mobile = ? 
        WHERE htno = ?
    `;

    db.query(query, [name, email, mobile, htno], (err) => {
        if (err) {
            console.error('Error updating details:', err);
            return res.status(500).send('Failed to update details.');
        }

        res.redirect(`/${htno}/homepage`);
    });
});

// Sanitize file name (replace special characters with safe characters)
function sanitizeFileName(fileName) {
    return fileName.replace(/[^\w\s.-]/g, '_');
}

// Retry logic for file insertion
function insertFileWithRetry(fileName, htno, fileData, res, retries = 3) {
    pool.query('INSERT INTO certificate_details (stu_id, certificate, file_data) VALUES (?, ?, ?)', [htno, fileName, fileData], (err) => {
        if (err && retries > 0) {
            console.log(`Retrying file insertion for ${fileName}...`);
            insertFileWithRetry(fileName, htno, fileData, res, retries - 1);
        } else if (err) {
            console.error(`Failed to insert file ${fileName} after retries.`);
            res.render('upload', { message: 'Failed to upload file. Please try again.', htno: htno });
        } else {
            console.log(`File ${fileName} successfully inserted for HTNO ${htno}`);
            res.redirect(`/${htno}/homepage`);
        }
    });
}

app.post('/registerdata', (req, res) => {
    var fullname = req.body.fullname;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    var confirmPassword = req.body.confirmPassword;

    if (password !== confirmPassword) {
        return res.send('Passwords do not match.');
    }

    const query = 'INSERT INTO login (fullname, email, username, password) VALUES (?, ?, ?, ?)';
    db.query(query, [fullname, email, username, password], (err, result) => {
        if (err) {
            console.error('Error inserting user into database:', err);
            return res.send('An error occurred during registration.');
        }

        res.send('User registered successfully! Please <a href="/login">Login</a>.');
    });
});

// File download route
app.get('/download/:htno', (req, res) => {
    pool.query('SELECT file_name, file_data FROM files WHERE htno = ?', [req.params.htno], (err, result) => {
        if (err || result.length === 0) return res.status(404).send('File not found.');
        const file = result[0];
        res.setHeader('Content-Disposition', `attachment; filename=${file.file_name}`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.send(file.file_data);
    });
});

// Start the server
app.listen(81, () => {
    console.log('Server is running on port 81');
});
