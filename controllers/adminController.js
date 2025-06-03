const User = require('../models/user');
const Certificate = require('../models/certificate');
const Attendance = require('../models/attendance');
const fs = require('fs').promises;
const path = require('path');

/**
 * Admin Controller
 * Handles admin-specific operations
 */
const adminController = {
    /**
     * Show admin dashboard
     */
    showDashboard: async (req, res) => {
        try {
            // Get all students
            const students = await User.getAllStudents();

            // Get all certificates
            const certificates = await Certificate.getAll();

            // Calculate statistics
            const stats = {
                totalStudents: students.length,
                totalCertificates: certificates.length,
                certificateTypes: {}
            };

            // Count certificates by type
            certificates.forEach(cert => {
                const type = cert.course_type || 'Unknown';
                stats.certificateTypes[type] = (stats.certificateTypes[type] || 0) + 1;
            });

            res.render('admin/dashboard', {
                students,
                certificates,
                stats
            });
        } catch (error) {
            console.error('Error fetching admin dashboard data:', error);
            res.status(500).render('error', {
                message: 'Error fetching dashboard data',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show student management page
     */
    showStudentManagement: async (req, res) => {
        try {
            const students = await User.getAllStudents();
            res.render('admin/students', { students });
        } catch (error) {
            console.error('Error fetching students:', error);
            res.status(500).render('error', {
                message: 'Error fetching students',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show certificate management page
     */
    showCertificateManagement: async (req, res) => {
        try {
            const certificates = await Certificate.getAll();
            res.render('admin/certificates', { certificates });
        } catch (error) {
            console.error('Error fetching certificates:', error);
            res.status(500).render('error', {
                message: 'Error fetching certificates',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show student details
     */
    showStudentDetails: async (req, res) => {
        const studentId = req.params.id;

        try {
            // Get student details
            const student = await User.getById(studentId);

            if (!student) {
                return res.status(404).render('error', {
                    message: 'Student not found',
                    error: { status: 404 }
                });
            }

            // Get certificates
            const certificates = await Certificate.getByStudentId(studentId);

            // Get attendance summary
            const attendanceSummary = await Attendance.getSummary(studentId);

            res.render('admin/student_details', {
                student,
                certificates,
                attendance: attendanceSummary
            });
        } catch (error) {
            console.error('Error fetching student details:', error);
            res.status(500).render('error', {
                message: 'Error fetching student details',
                error: { status: 500 }
            });
        }
    },

    /**
     * Record student attendance
     */
    recordAttendance: async (req, res) => {
        try {
            const { studentId, date, status } = req.body;

            await Attendance.record({
                studentId,
                date,
                status
            });

            // If it's an AJAX request, return success
            if (req.xhr) {
                return res.json({ success: true });
            }

            res.redirect(`/admin/students/${studentId}`);
        } catch (error) {
            console.error('Error recording attendance:', error);

            // If it's an AJAX request, return error
            if (req.xhr) {
                return res.status(500).json({ error: 'Error recording attendance' });
            }

            res.status(500).render('error', {
                message: 'Error recording attendance',
                error: { status: 500 }
            });
        }
    },

    /**
     * Generate reports
     */
    generateReport: async (req, res) => {
        const reportType = req.params.type;

        try {
            let data;
            let title;

            switch (reportType) {
                case 'students':
                    data = await User.getAllStudents();
                    title = 'Student Report';
                    break;
                case 'certificates':
                    data = await Certificate.getAll();
                    title = 'Certificate Report';
                    break;
                default:
                    return res.status(400).render('error', {
                        message: 'Invalid report type',
                        error: { status: 400 }
                    });
            }

            res.render('admin/report', {
                title,
                data,
                reportType
            });
        } catch (error) {
            console.error('Error generating report:', error);
            res.status(500).render('error', {
                message: 'Error generating report',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show user management page with all users
     */
    showUserManagement: async (req, res) => {
        try {
            const users = await User.getAllStudents();
            // Also get admin users from login table
            const adminUsers = await User.getAdminUsers();

            res.render('admin/users', {
                users,
                adminUsers,
                activeTab: 'users'
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).render('error', {
                message: 'Error fetching users',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show edit user form
     */
    showEditUser: async (req, res) => {
        const userId = req.params.id;

        try {
            const user = await User.getById(userId);

            if (!user) {
                return res.status(404).render('error', {
                    message: 'User not found',
                    error: { status: 404 }
                });
            }

            res.render('admin/edit_user', { user });
        } catch (error) {
            console.error('Error fetching user details:', error);
            res.status(500).render('error', {
                message: 'Error fetching user details',
                error: { status: 500 }
            });
        }
    },

    /**
     * Update user details
     */
    updateUser: async (req, res) => {
        const userId = req.params.id;
        const { name, email, mobile } = req.body;

        try {
            console.log('Updating user in controller:', userId, { name, email, mobile });

            // Get the user first to check if it exists
            const user = await User.getById(userId);

            if (!user) {
                req.flash('error', 'User not found');
                return res.redirect('/admin/users');
            }

            await User.update(userId, {
                name,
                email,
                mobile
            });

            req.flash('success', 'User updated successfully');
            res.redirect('/admin/users');
        } catch (error) {
            console.error('Error updating user:', error);
            req.flash('error', 'Error updating user: ' + error.message);
            res.redirect('/admin/users');
        }
    },

    /**
     * Delete user
     */
    deleteUser: async (req, res) => {
        const userId = req.params.id;

        try {
            // Get user certificates to delete files
            const certificates = await Certificate.getByStudentId(userId);

            // Delete each certificate file
            for (const cert of certificates) {
                if (cert.file_path) {
                    try {
                        await fs.unlink(cert.file_path);
                    } catch (fileError) {
                        console.error(`Error deleting certificate file: ${cert.file_path}`, fileError);
                        // Continue even if file deletion fails
                    }
                }
            }

            // Delete user
            await User.delete(userId);

            req.flash('success', 'User deleted successfully');
            res.redirect('/admin/users');
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).render('error', {
                message: 'Error deleting user',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show all certificates from all students
     */
    showAllCertificates: async (req, res) => {
        try {
            const certificates = await Certificate.getAll();

            res.render('admin/all_certificates', {
                certificates,
                activeTab: 'certificates'
            });
        } catch (error) {
            console.error('Error fetching all certificates:', error);
            res.status(500).render('error', {
                message: 'Error fetching certificates',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show certificate details
     */
    showCertificateDetails: async (req, res) => {
        const certificateId = req.params.id;

        try {
            const certificate = await Certificate.getById(certificateId);

            if (!certificate) {
                return res.status(404).render('error', {
                    message: 'Certificate not found',
                    error: { status: 404 }
                });
            }

            // Get student details
            const student = await User.getById(certificate.Stu_id);

            res.render('admin/certificate_details', {
                certificate,
                student
            });
        } catch (error) {
            console.error('Error fetching certificate details:', error);
            res.status(500).render('error', {
                message: 'Error fetching certificate details',
                error: { status: 500 }
            });
        }
    },

    /**
     * Delete certificate
     */
    deleteCertificate: async (req, res) => {
        const certificateId = req.params.id;

        try {
            // Get certificate to get file path
            const certificate = await Certificate.getById(certificateId);

            if (!certificate) {
                return res.status(404).render('error', {
                    message: 'Certificate not found',
                    error: { status: 404 }
                });
            }

            // Delete certificate file if it exists
            if (certificate.file_path) {
                try {
                    await fs.unlink(certificate.file_path);
                } catch (fileError) {
                    console.error(`Error deleting certificate file: ${certificate.file_path}`, fileError);
                    // Continue even if file deletion fails
                }
            }

            // Delete certificate from database
            await Certificate.delete(certificateId);

            req.flash('success', 'Certificate deleted successfully');
            res.redirect('/admin/certificates');
        } catch (error) {
            console.error('Error deleting certificate:', error);
            res.status(500).render('error', {
                message: 'Error deleting certificate',
                error: { status: 500 }
            });
        }
    }
};

module.exports = adminController;
