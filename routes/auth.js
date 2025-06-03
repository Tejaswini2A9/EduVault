const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin, validateRegistration } = require('../middleware/validation');
const { isGuest } = require('../middleware/auth');

// Login routes
router.get('/login', isGuest, authController.showLogin);
router.post('/login', validateLogin, authController.login);

// Registration routes
router.get('/register', isGuest, authController.showRegister);
router.post('/register', validateRegistration, authController.register);

// Logout route
router.get('/logout', authController.logout);

module.exports = router;
