const db = require('../config/database');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs');

class Certificate {
    /**
     * Generate a unique file ID
     * @param {string} studentId - Student ID
     * @returns {Promise<string>} - Unique file ID
     */
    static async generateUniqueFileId(studentId) {
        const timestamp = Date.now().toString();
        const rawString = `${studentId}_${timestamp}`;
        const hash = crypto.createHash('sha256').update(rawString).digest('hex');
        return `${studentId}_${hash.substring(0, 10)}`;
    }

    /**
     * Get all certificates for a student
     * @param {string} studentId - Student ID
     * @returns {Promise<Array>} - Array of certificates
     */
    static async getByStudentId(studentId) {
        try {
            return await db.query('SELECT * FROM certificate_details WHERE Stu_id = ?', [studentId]);
        } catch (error) {
            console.error('Error fetching certificates:', error);
            throw error;
        }
    }

    /**
     * Get certificate by ID
     * @param {string} fileId - Certificate file ID
     * @returns {Promise<Object>} - Certificate object
     */
    static async getById(fileId) {
        try {
            const result = await db.query('SELECT * FROM certificate_details WHERE file_id = ?', [fileId]);
            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('Error fetching certificate by ID:', error);
            throw error;
        }
    }

    /**
     * Create a new certificate
     * @param {Object} certificateData - Certificate data
     * @returns {Promise<string>} - Created certificate ID
     */
    static async create(certificateData) {
        try {
            const {
                studentId,
                studentName,
                courseType,
                courseName,
                ppc,
                filePath,
                dateOnCertificate,
                orgAgent,
                weblink,
                fee
            } = certificateData;

            const fileId = await this.generateUniqueFileId(studentId);

            // Check if the certificate_details table has the file_path column
            try {
                // First, check if the table has the file_path column
                const checkColumnQuery = `
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = ?
                    AND TABLE_NAME = 'certificate_details'
                    AND COLUMN_NAME = 'file_path'
                `;

                const columns = await db.query(checkColumnQuery, [process.env.DB_NAME || 'cms']);

                if (columns.length === 0) {
                    // file_path column doesn't exist, add it
                    console.log('file_path column not found. Adding it...');

                    try {
                        const addColumnQuery = `
                            ALTER TABLE certificate_details
                            ADD COLUMN file_path VARCHAR(255) NULL
                        `;

                        await db.query(addColumnQuery);
                        console.log('file_path column added successfully.');
                    } catch (alterError) {
                        console.error('Error adding file_path column:', alterError);
                        // Continue anyway, we'll try to insert without file_data
                    }
                }

                // Read the file data as a fallback for NOT NULL constraint
                const fileData = await fs.readFile(filePath);

                // Try to insert with both file_path and file_data
                await db.query(
                    'INSERT INTO certificate_details (Stu_id, student_name, course_type, course_name, ppc, file_id, dateoncertificate, file_path, OrgAgent, weblink, Fee, file_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [studentId, studentName, courseType, courseName, ppc, fileId, dateOnCertificate, filePath, orgAgent, weblink, fee, fileData]
                );
            } catch (dbError) {
                // If error contains "Unknown column 'file_data'", try without file_data
                if (dbError.message && dbError.message.includes("Unknown column 'file_data'")) {
                    console.log('file_data column not found. Inserting without file_data...');

                    // Insert with just file_path
                    await db.query(
                        'INSERT INTO certificate_details (Stu_id, student_name, course_type, course_name, ppc, file_id, dateoncertificate, file_path, OrgAgent, weblink, Fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [studentId, studentName, courseType, courseName, ppc, fileId, dateOnCertificate, filePath, orgAgent, weblink, fee]
                    );
                } else if (dbError.message && dbError.message.includes("Unknown column 'file_path'")) {
                    // If file_path column doesn't exist and we couldn't add it, create a new file path
                    // and save the file there instead of storing in the database
                    console.error('Could not add file_path column. Creating alternative file storage...');

                    // Create a new file path in the uploads directory
                    const fileExt = path.extname(filePath);
                    const newFilePath = path.join(__dirname, '../public/uploaded_files', `${fileId}${fileExt}`);

                    // Copy the file to the new location
                    await fs.copyFile(filePath, newFilePath);

                    // Insert with just the basic info, no binary data
                    await db.query(
                        'INSERT INTO certificate_details (Stu_id, student_name, course_type, course_name, ppc, file_id, dateoncertificate, OrgAgent, weblink, Fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [studentId, studentName, courseType, courseName, ppc, fileId, dateOnCertificate, orgAgent, weblink, fee]
                    );

                    console.log(`File saved to ${newFilePath} instead of database.`);
                } else {
                    // For other errors, rethrow
                    throw dbError;
                }
            }

            return fileId;
        } catch (error) {
            console.error('Error creating certificate:', error);
            throw error;
        }
    }

    /**
     * Delete a certificate
     * @param {string} fileId - Certificate file ID
     * @param {string} [studentId] - Student ID (for verification, optional for admin)
     * @returns {Promise<boolean>} - Whether deletion was successful
     */
    static async delete(fileId, studentId = null) {
        try {
            // First, get the certificate to check ownership and get file path
            const certificate = await this.getById(fileId);

            if (!certificate) {
                throw new Error('Certificate not found');
            }

            // Verify ownership if studentId is provided (not admin)
            if (studentId && certificate.Stu_id !== studentId) {
                throw new Error('Unauthorized to delete this certificate');
            }

            // Delete from database
            await db.query('DELETE FROM certificate_details WHERE file_id = ?', [fileId]);

            // Try to delete the physical file if it exists
            try {
                // Check if we have a file path stored in the database
                if (certificate.file_path) {
                    const filePath = path.join(__dirname, '..', certificate.file_path);
                    if (await fs.access(filePath).then(() => true).catch(() => false)) {
                        await fs.unlink(filePath);
                    }
                } else {
                    // Fallback to the old method of trying to find the file by course name
                    const filePath = path.join(__dirname, '../public/uploaded_files', certificate.course_name);
                    if (await fs.access(filePath).then(() => true).catch(() => false)) {
                        await fs.unlink(filePath);
                    }
                }
            } catch (fileError) {
                console.error('Error deleting physical file:', fileError);
                // Continue even if physical file deletion fails
            }

            return true;
        } catch (error) {
            console.error('Error deleting certificate:', error);
            throw error;
        }
    }

    /**
     * Get all certificates (admin function)
     * @returns {Promise<Array>} - Array of all certificates
     */
    static async getAll() {
        try {
            return await db.query('SELECT * FROM certificate_details');
        } catch (error) {
            console.error('Error fetching all certificates:', error);
            throw error;
        }
    }

    /**
     * Search certificates by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Array>} - Array of matching certificates
     */
    static async search(criteria) {
        try {
            let query = 'SELECT * FROM certificate_details WHERE 1=1';
            const params = [];

            if (criteria.studentId) {
                query += ' AND Stu_id = ?';
                params.push(criteria.studentId);
            }

            if (criteria.courseType) {
                query += ' AND course_type = ?';
                params.push(criteria.courseType);
            }

            if (criteria.courseName) {
                query += ' AND course_name LIKE ?';
                params.push(`%${criteria.courseName}%`);
            }

            if (criteria.dateFrom) {
                query += ' AND dateoncertificate >= ?';
                params.push(criteria.dateFrom);
            }

            if (criteria.dateTo) {
                query += ' AND dateoncertificate <= ?';
                params.push(criteria.dateTo);
            }

            return await db.query(query, params);
        } catch (error) {
            console.error('Error searching certificates:', error);
            throw error;
        }
    }
}

module.exports = Certificate;
