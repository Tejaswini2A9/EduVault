const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');

// User homepage
router.get('/:username/homepage', isAuthenticated, userController.showHomepage);

// User settings
router.get('/:htno/settings', isAuthenticated, userController.showSettings);

// Update profile
router.post('/:htno/update_details', isAuthenticated, upload.single('profile_pic'), userController.updateProfile);

// Academic results
router.get('/:htno/academic', isAuthenticated, userController.showAcademicResults);

// Attendance
router.get('/:htno/attendance', isAuthenticated, userController.showAttendance);

module.exports = router;
