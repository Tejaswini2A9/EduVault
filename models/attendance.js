const db = require('../config/database');

class Attendance {
    /**
     * Get attendance data for a student
     * @param {string} studentId - Student ID
     * @returns {Promise<Object>} - Attendance data
     */
    static async getByStudentId(studentId) {
        try {
            // Get month-wise present and absent counts
            const attendanceData = await db.query(`
                SELECT 
                    MONTH(attendance_date) AS month,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count
                FROM attendance
                WHERE htno = ?
                GROUP BY MONTH(attendance_date)
                ORDER BY MONTH(attendance_date)
            `, [studentId]);
            
            // Format the data for the chart
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const presentCounts = Array(12).fill(0);
            const absentCounts = Array(12).fill(0);
            
            attendanceData.forEach(item => {
                const monthIndex = item.month - 1; // Convert 1-based month to 0-based index
                presentCounts[monthIndex] = item.present_count;
                absentCounts[monthIndex] = item.absent_count;
            });
            
            return {
                labels: months,
                presentData: presentCounts,
                absentData: absentCounts,
                raw: attendanceData
            };
        } catch (error) {
            console.error('Error fetching attendance data:', error);
            throw error;
        }
    }

    /**
     * Record attendance for a student
     * @param {Object} attendanceData - Attendance data
     * @returns {Promise<boolean>} - Whether recording was successful
     */
    static async record(attendanceData) {
        try {
            const { studentId, date, status } = attendanceData;
            
            // Check if attendance already exists for this date
            const existing = await db.query(
                'SELECT * FROM attendance WHERE htno = ? AND attendance_date = ?',
                [studentId, date]
            );
            
            if (existing.length > 0) {
                // Update existing record
                await db.query(
                    'UPDATE attendance SET status = ? WHERE htno = ? AND attendance_date = ?',
                    [status, studentId, date]
                );
            } else {
                // Insert new record
                await db.query(
                    'INSERT INTO attendance (htno, attendance_date, status) VALUES (?, ?, ?)',
                    [studentId, date, status]
                );
            }
            
            return true;
        } catch (error) {
            console.error('Error recording attendance:', error);
            throw error;
        }
    }

    /**
     * Get attendance summary for a student
     * @param {string} studentId - Student ID
     * @returns {Promise<Object>} - Attendance summary
     */
    static async getSummary(studentId) {
        try {
            const result = await db.query(`
                SELECT 
                    COUNT(*) AS total_days,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_days,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_days
                FROM attendance
                WHERE htno = ?
            `, [studentId]);
            
            const summary = result[0];
            
            // Calculate attendance percentage
            const attendancePercentage = summary.total_days > 0
                ? ((summary.present_days / summary.total_days) * 100).toFixed(2)
                : 0;
            
            return {
                totalDays: summary.total_days || 0,
                presentDays: summary.present_days || 0,
                absentDays: summary.absent_days || 0,
                attendancePercentage
            };
        } catch (error) {
            console.error('Error fetching attendance summary:', error);
            throw error;
        }
    }
}

module.exports = Attendance;
