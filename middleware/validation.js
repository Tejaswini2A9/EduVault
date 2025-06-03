/**
 * Input validation middleware
 */

// Validate registration input
function validateRegistration(req, res, next) {
    const { fullname, email, username, password, mobileno } = req.body;
    const errors = [];

    // Validate fullname
    if (!fullname || fullname.trim() === '') {
        errors.push('Full name is required');
    }

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push('Valid email is required');
    }

    // Validate username (student ID)
    if (!username || username.trim() === '') {
        errors.push('Student ID is required');
    }

    // Validate password
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    // Validate mobile number
    if (!mobileno || !mobileno.match(/^\d{10}$/)) {
        errors.push('Valid 10-digit mobile number is required');
    }

    // If there are validation errors, render the registration page with errors
    if (errors.length > 0) {
        return res.render('registration', {
            errors,
            input: { fullname, email, username, mobileno }
        });
    }

    next();
}

// Validate login input
function validateLogin(req, res, next) {
    const { un, pass } = req.body;
    const errors = [];

    if (!un || un.trim() === '') {
        errors.push('Username is required');
    }

    if (!pass || pass.trim() === '') {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        return res.render('login', { errors });
    }

    next();
}

// Validate certificate upload
function validateCertificateUpload(req, res, next) {
    const { course_type, course_name, ppc, dateoncertificate, OrgAgent } = req.body;
    const errors = [];

    if (!course_type || course_type.trim() === '') {
        errors.push('Course type is required');
    }

    if (!course_name || course_name.trim() === '') {
        errors.push('Course name is required');
    }

    if (!ppc || ppc.trim() === '') {
        errors.push('Participation/completion status is required');
    }

    if (!dateoncertificate) {
        errors.push('Date of certificate is required');
    }

    if (!OrgAgent || OrgAgent.trim() === '') {
        errors.push('Organizing agent is required');
    }

    if (!req.files || req.files.length === 0) {
        errors.push('Certificate file is required');
    } else {
        // Check file sizes
        for (const file of req.files) {
            if (file.size > 5 * 1024 * 1024) { // 5MB
                errors.push(`File ${file.originalname} is too large. Maximum file size is 5MB.`);
            }
        }
    }

    if (errors.length > 0) {
        // Get student details to re-render the upload form
        const htno = req.params.htno;
        const db = require('../config/database');

        db.query('SELECT * FROM stu_details WHERE Student_id = ?', [htno])
            .then(student => {
                res.render('upload', {
                    errors,
                    details: student,
                    input: req.body
                });
            })
            .catch(err => {
                console.error('Database error:', err);
                res.status(500).render('error', {
                    message: 'Error fetching student details',
                    error: { status: 500 }
                });
            });
        return;
    }

    next();
}

module.exports = {
    validateRegistration,
    validateLogin,
    validateCertificateUpload
};
