const User = require('../models/user');
const Certificate = require('../models/certificate');
const Attendance = require('../models/attendance');
const Academic = require('../models/academic');

/**
 * User Controller
 * Handles user-related operations
 */
const userController = {
    /**
     * Show user homepage
     */
    showHomepage: async (req, res) => {
        const htno = req.params.username;
        
        try {
            if (htno === "Admin") {
                // Admin homepage
                const students = await User.getAllStudents();
                res.render('Admin_homepage', { result: students });
            } else {
                // Student homepage
                const student = await User.getById(htno);
                
                if (!student) {
                    return res.status(404).render('error', { 
                        message: 'Student not found',
                        error: { status: 404 }
                    });
                }
                
                // Get attendance data
                const attendanceData = await Attendance.getByStudentId(htno);
                
                // Render student homepage with data
                res.render('student_homepage', {
                    std_data: [student], // Wrapped in array for compatibility with existing template
                    att_results: JSON.stringify(attendanceData)
                });
            }
        } catch (error) {
            console.error('Error fetching homepage data:', error);
            res.status(500).render('error', { 
                message: 'Error fetching data. Please try again later.',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show user settings page
     */
    showSettings: async (req, res) => {
        const htno = req.params.htno;
        
        try {
            const user = await User.getById(htno);
            
            if (!user) {
                return res.status(404).render('error', { 
                    message: 'Student not found',
                    error: { status: 404 }
                });
            }
            
            res.render('settings', { result: [user] }); // Wrapped in array for compatibility with existing template
        } catch (error) {
            console.error('Error fetching user settings:', error);
            res.status(500).render('error', { 
                message: 'Error fetching user settings',
                error: { status: 500 }
            });
        }
    },

    /**
     * Update user profile
     */
    updateProfile: async (req, res) => {
        const htno = req.params.htno;
        
        try {
            // Get profile picture path if uploaded
            const profilePic = req.file ? req.file.filename : null;
            
            // Update user profile
            await User.update(htno, {
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.mobile,
                profilePic
            });
            
            res.redirect(`/${htno}/homepage`);
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).render('error', { 
                message: 'Error updating profile',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show academic results
     */
    showAcademicResults: async (req, res) => {
        const htno = req.params.htno;
        
        try {
            // Get student details
            const student = await User.getById(htno);
            
            if (!student) {
                return res.status(404).render('error', { 
                    message: 'Student not found',
                    error: { status: 404 }
                });
            }
            
            // Fetch academic results
            const results = await Academic.getResults(htno);
            
            res.render('academic_results', {
                student,
                results,
                error: results.error
            });
        } catch (error) {
            console.error('Error fetching academic results:', error);
            res.status(500).render('error', { 
                message: 'Error fetching academic results',
                error: { status: 500 }
            });
        }
    },

    /**
     * Show attendance summary
     */
    showAttendance: async (req, res) => {
        const htno = req.params.htno;
        
        try {
            // Get student details
            const student = await User.getById(htno);
            
            if (!student) {
                return res.status(404).render('error', { 
                    message: 'Student not found',
                    error: { status: 404 }
                });
            }
            
            // Get attendance data
            const attendanceData = await Attendance.getByStudentId(htno);
            const attendanceSummary = await Attendance.getSummary(htno);
            
            res.render('attendance', {
                student,
                attendanceData,
                summary: attendanceSummary
            });
        } catch (error) {
            console.error('Error fetching attendance data:', error);
            res.status(500).render('error', { 
                message: 'Error fetching attendance data',
                error: { status: 500 }
            });
        }
    }
};

module.exports = userController;
