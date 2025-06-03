const User = require('../models/user');
const bcrypt = require('bcrypt');

/**
 * Auth Controller
 * Handles user authentication and registration
 */
const authController = {
    /**
     * Render login page
     */
    showLogin: (req, res) => {
        // Check if there's a logout message in the query parameters
        const message = req.query.message || null;
        res.render('login', { message });
    },

    /**
     * Process login
     */
    login: async (req, res) => {
        const { un, pass } = req.body;

        try {
            // Get user by username
            const user = await User.getByUsername(un);

            if (!user) {
                return res.render('login', { message: 'User not found' });
            }

            if (!user.password) {
                return res.render('login', { message: 'Password not found' });
            }

            // Verify password
            const isMatch = await User.verifyPassword(pass, user.password);

            if (isMatch) {
                // Set session
                req.session.username = un;
                req.session.role = user.role || 'student';

                // Redirect to homepage or requested URL
                const redirectUrl = req.session.returnTo || `/${un}/homepage`;
                delete req.session.returnTo;

                res.redirect(redirectUrl);
            } else {
                res.render('login', { message: 'Incorrect password' });
            }
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).render('error', {
                message: 'An error occurred while logging in',
                error: { status: 500 }
            });
        }
    },

    /**
     * Render registration page
     */
    showRegister: (req, res) => {
        res.render('registration');
    },

    /**
     * Process registration
     */
    register: async (req, res) => {
        const { username, fullname, email, password, mobileno } = req.body;

        try {
            // Check if user already exists
            const existingUser = await User.getByUsername(username);

            if (existingUser) {
                return res.render('registration', {
                    message: 'User already exists',
                    input: { fullname, email, mobileno }
                });
            }

            // Create new user
            await User.create({
                username,
                fullname,
                email,
                password,
                mobileno
            });

            // Redirect to login page with success message
            res.render('login', { success: 'Registration successful. Please login.' });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).render('registration', {
                message: 'An error occurred during registration',
                input: { fullname, email, username, mobileno }
            });
        }
    },

    /**
     * Logout user
     */
    logout: (req, res) => {
        // Clear the session
        req.session.destroy(err => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).render('error', {
                    message: 'Error logging out',
                    error: { status: 500 }
                });
            }

            // Redirect to login page with a success message
            // We can't use render with a message here because the session is destroyed
            // So we'll use a query parameter
            res.redirect('/login?message=Successfully logged out');
        });
    }
};

module.exports = authController;
