const db = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    /**
     * Get user by ID
     * @param {string} id - Student ID
     * @returns {Promise} - User object
     */
    static async getById(id) {
        try {
            const result = await db.query('SELECT * FROM stu_details WHERE Student_id = ?', [id]);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw error;
        }
    }

    /**
     * Get user by login credentials
     * @param {string} username - Username
     * @returns {Promise} - User object
     */
    static async getByUsername(username) {
        try {
            // First try the login table
            let result = await db.query('SELECT * FROM login WHERE username = ?', [username]);

            // If not found in login table, try stu_details table
            if (result.length === 0) {
                result = await db.query('SELECT * FROM stu_details WHERE Student_id = ?', [username]);

                // If found in stu_details, format it to match login table structure
                if (result.length > 0) {
                    const user = result[0];
                    return {
                        username: user.Student_id,
                        password: user.Password,
                        role: 'student'
                    };
                }
                return null;
            }

            return result[0];
        } catch (error) {
            console.error('Error fetching user by username:', error);
            throw error;
        }
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Promise} - Created user ID
     */
    static async create(userData) {
        try {
            const { username, fullname, email, password, mobileno } = userData;

            // Hash the password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Insert into stu_details table
            await db.query(
                'INSERT INTO stu_details (Student_id, student_name, Email, Password, Phone_number) VALUES (?, ?, ?, ?, ?)',
                [username, fullname, email, hashedPassword, mobileno]
            );

            return username;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     * @param {string} id - Student ID
     * @param {Object} userData - User data to update
     * @returns {Promise} - Updated user
     */
    static async update(id, userData) {
        try {
            const { name, email, mobile, profilePic } = userData;

            console.log('Updating user:', id, userData);

            // Build the query based on whether profile pic is included
            let query = 'UPDATE stu_details SET student_name = ?, Email = ?, Phone_number = ?';
            let params = [name, email, mobile];

            if (profilePic) {
                query += ', pp = ?';
                params.push(profilePic);
            }

            query += ' WHERE Student_id = ?';
            params.push(id);

            console.log('SQL Query:', query);
            console.log('SQL Params:', params);

            const result = await db.query(query, params);
            console.log('Update result:', result);

            // Return the updated user
            return this.getById(id);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    /**
     * Verify user password
     * @param {string} password - Plain text password
     * @param {string} hashedPassword - Hashed password from database
     * @returns {Promise<boolean>} - Whether password matches
     */
    static async verifyPassword(password, hashedPassword) {
        try {
            // For backward compatibility, check plain text first
            if (password === hashedPassword) {
                // If this is a plain text password match, we should upgrade it to a hashed version
                console.log('Warning: Plain text password detected. Consider upgrading to hashed passwords.');
                return true;
            }

            // Check if the password is already hashed (starts with $2b$)
            if (hashedPassword.startsWith('$2b$')) {
                // Use bcrypt to compare
                return await bcrypt.compare(password, hashedPassword);
            } else {
                // For any other format, do a direct comparison (legacy support)
                return password === hashedPassword;
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            return false;
        }
    }

    /**
     * Get all students (admin function)
     * @returns {Promise} - Array of all students
     */
    static async getAllStudents() {
        try {
            return await db.query('SELECT * FROM stu_details');
        } catch (error) {
            console.error('Error fetching all students:', error);
            throw error;
        }
    }

    /**
     * Get all admin users
     * @returns {Promise} - Array of admin users
     */
    static async getAdminUsers() {
        try {
            return await db.query('SELECT * FROM login WHERE role = ?', ['admin']);
        } catch (error) {
            console.error('Error fetching admin users:', error);
            throw error;
        }
    }

    /**
     * Delete a user
     * @param {string} id - Student ID
     * @returns {Promise<boolean>} - Whether deletion was successful
     */
    static async delete(id) {
        try {
            // Delete from stu_details table
            const result = await db.query('DELETE FROM stu_details WHERE Student_id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
}

module.exports = User;
