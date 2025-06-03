const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Admin dashboard
router.get('/admin/dashboard', isAuthenticated, isAdmin, adminController.showDashboard);

// User management
router.get('/admin/users', isAuthenticated, isAdmin, adminController.showUserManagement);
router.get('/admin/users/:id/edit', isAuthenticated, isAdmin, adminController.showEditUser);
router.post('/admin/users/:id/update', isAuthenticated, isAdmin, adminController.updateUser);
router.post('/admin/users/:id/delete', isAuthenticated, isAdmin, adminController.deleteUser);

// Student management (legacy routes)
router.get('/admin/students', isAuthenticated, isAdmin, adminController.showStudentManagement);
router.get('/admin/students/:id', isAuthenticated, isAdmin, adminController.showStudentDetails);

// Certificate management
router.get('/admin/certificates', isAuthenticated, isAdmin, adminController.showAllCertificates);
router.get('/admin/certificates/:id', isAuthenticated, isAdmin, adminController.showCertificateDetails);
router.post('/admin/certificates/:id/delete', isAuthenticated, isAdmin, adminController.deleteCertificate);

// Record attendance
router.post('/admin/attendance', isAuthenticated, isAdmin, adminController.recordAttendance);

// Generate reports
router.get('/admin/reports/:type', isAuthenticated, isAdmin, adminController.generateReport);

module.exports = router;
