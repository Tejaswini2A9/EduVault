const Certificate = require('../models/certificate');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

/**
 * Certificate Controller
 * Handles certificate-related operations
 */
const certificateController = {
    /**
     * Show certificate upload form
     */
    showUploadForm: async (req, res) => {
        const htno = req.params.htno;

        try {
            const student = await User.getById(htno);

            if (!student) {
                return res.status(404).render('error', {
                    message: 'Student not found',
                    error: { status: 404 }
                });
            }

            res.render('upload', { details: [student] }); // Wrapped in array for compatibility with existing template
        } catch (error) {
            console.error('Error fetching student details for upload:', error);
            res.status(500).render('error', {
                message: 'Error fetching student details',
                error: { status: 500 }
            });
        }
    },

    /**
     * Process certificate upload
     */
    uploadCertificate: async (req, res) => {
        const htno = req.params.htno;

        try {
            if (!req.files || req.files.length === 0) {
                throw new Error('No files uploaded.');
            }

            // Process each uploaded file
            for (const file of req.files) {
                const filePath = file.path;

                try {
                    // Try to create certificate record with file path
                    await Certificate.create({
                        studentId: htno,
                        studentName: req.body.student_name,
                        courseType: req.body.course_type,
                        courseName: req.body.course_name,
                        ppc: req.body.ppc,
                        filePath: filePath, // Store the file path instead of binary data
                        dateOnCertificate: req.body.dateoncertificate,
                        orgAgent: req.body.OrgAgent,
                        weblink: req.body.weblink,
                        fee: req.body.Fee
                    });
                } catch (dbError) {
                    // If error contains "Unknown column 'file_path'", the column doesn't exist
                    if (dbError.message && dbError.message.includes("Unknown column 'file_path'")) {
                        console.error('file_path column not found. Please run "npm run add-file-path" to add it.');
                        throw new Error('Database schema needs to be updated. Please contact the administrator.');
                    }

                    // For other errors, rethrow
                    throw dbError;
                }
            }

            res.redirect(`/${htno}/certificate`);
        } catch (error) {
            console.error('Upload error:', error.message);
            res.status(500).render('error', {
                message: `Upload failed: ${error.message}`,
                error: { status: 500 }
            });
        }
    },

    /**
     * Show certificates for a student
     */
    showCertificates: async (req, res) => {
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

            // Get certificates
            const certificates = await Certificate.getByStudentId(htno);

            res.render('student_certipage', {
                std_data: [student], // Wrapped in array for compatibility with existing template
                files: certificates
            });
        } catch (error) {
            console.error('Error fetching certificates:', error);
            res.status(500).render('error', {
                message: 'Error fetching certificates',
                error: { status: 500 }
            });
        }
    },

    /**
     * Download certificate
     */
    downloadCertificate: async (req, res) => {
        const fileId = req.params.fileId;

        try {
            const certificate = await Certificate.getById(fileId);

            if (!certificate) {
                return res.status(404).render('error', {
                    message: 'Certificate not found',
                    error: { status: 404 }
                });
            }

            // Check if we have file_path in the certificate
            if (certificate.file_path) {
                // Get the file path
                let filePath = certificate.file_path;

                // Check if file exists
                if (!fs.existsSync(filePath)) {
                    // Try to find the file in the uploaded_files directory with the file_id
                    const possibleExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
                    let foundFilePath = null;

                    for (const ext of possibleExtensions) {
                        const testPath = path.join(__dirname, '../public/uploaded_files', `${fileId}${ext}`);
                        if (fs.existsSync(testPath)) {
                            foundFilePath = testPath;
                            break;
                        }
                    }

                    if (!foundFilePath) {
                        return res.status(404).render('error', {
                            message: 'Certificate file not found',
                            error: { status: 404 }
                        });
                    }

                    // Update the file_path in the database for future use
                    try {
                        await db.query(
                            'UPDATE certificate_details SET file_path = ? WHERE file_id = ?',
                            [foundFilePath, fileId]
                        );
                    } catch (updateError) {
                        console.error('Error updating file_path:', updateError);
                        // Continue anyway, we found the file
                    }

                    // Use the found file path
                    filePath = foundFilePath;
                }

                // Set headers for file download
                const fileName = certificate.course_name + path.extname(filePath);
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

                // Determine content type based on file extension
                const ext = path.extname(filePath).toLowerCase();
                let contentType = 'application/octet-stream';

                if (ext === '.pdf') {
                    contentType = 'application/pdf';
                } else if (ext === '.doc') {
                    contentType = 'application/msword';
                } else if (ext === '.docx') {
                    contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                } else if (ext === '.jpg' || ext === '.jpeg') {
                    contentType = 'image/jpeg';
                } else if (ext === '.png') {
                    contentType = 'image/png';
                }

                res.setHeader('Content-Type', contentType);

                // Stream the file
                const fileStream = fs.createReadStream(filePath);
                fileStream.pipe(res);
            }
            // Check if we have file_data in the certificate (old format)
            else if (certificate.file_data) {
                try {
                    // Try to save the file_data to a file to avoid future database issues
                    const fileExt = '.pdf'; // Default to PDF if we don't know the extension
                    const newFilePath = path.join(__dirname, '../public/uploaded_files', `${fileId}${fileExt}`);

                    // Write the file_data to disk
                    await fs.promises.writeFile(newFilePath, certificate.file_data);

                    // Update the database with the file path
                    try {
                        await db.query(
                            'UPDATE certificate_details SET file_path = ? WHERE file_id = ?',
                            [newFilePath, fileId]
                        );
                    } catch (updateError) {
                        console.error('Error updating file_path:', updateError);
                        // Continue anyway, we saved the file
                    }

                    // Set headers for file download
                    res.setHeader('Content-Disposition', `attachment; filename="${certificate.course_name}${fileExt}"`);
                    res.setHeader('Content-Type', 'application/pdf'); // Default to PDF

                    // Stream the file instead of sending binary data
                    const fileStream = fs.createReadStream(newFilePath);
                    fileStream.pipe(res);
                } catch (fileError) {
                    console.error('Error saving file_data to disk:', fileError);

                    // Fallback to sending the binary data directly
                    res.setHeader('Content-Disposition', `attachment; filename="${certificate.course_name}"`);
                    res.setHeader('Content-Type', 'application/octet-stream');
                    res.send(certificate.file_data);
                }
            }
            else {
                // Try to find the file in the uploaded_files directory with the file_id
                const possibleExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
                let foundFilePath = null;

                for (const ext of possibleExtensions) {
                    const testPath = path.join(__dirname, '../public/uploaded_files', `${fileId}${ext}`);
                    if (fs.existsSync(testPath)) {
                        foundFilePath = testPath;
                        break;
                    }
                }

                if (!foundFilePath) {
                    return res.status(404).render('error', {
                        message: 'Certificate file not found - no file path or data available',
                        error: { status: 404 }
                    });
                }

                // Update the file_path in the database for future use
                try {
                    await db.query(
                        'UPDATE certificate_details SET file_path = ? WHERE file_id = ?',
                        [foundFilePath, fileId]
                    );
                } catch (updateError) {
                    console.error('Error updating file_path:', updateError);
                    // Continue anyway, we found the file
                }

                // Set headers for file download
                const fileName = certificate.course_name + path.extname(foundFilePath);
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

                // Determine content type based on file extension
                const ext = path.extname(foundFilePath).toLowerCase();
                let contentType = 'application/octet-stream';

                if (ext === '.pdf') {
                    contentType = 'application/pdf';
                } else if (ext === '.doc') {
                    contentType = 'application/msword';
                } else if (ext === '.docx') {
                    contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                } else if (ext === '.jpg' || ext === '.jpeg') {
                    contentType = 'image/jpeg';
                } else if (ext === '.png') {
                    contentType = 'image/png';
                }

                res.setHeader('Content-Type', contentType);

                // Stream the file
                const fileStream = fs.createReadStream(foundFilePath);
                fileStream.pipe(res);
            }
        } catch (error) {
            console.error('Error downloading certificate:', error);
            res.status(500).render('error', {
                message: 'Error downloading certificate',
                error: { status: 500 }
            });
        }
    },

    /**
     * Delete certificate
     */
    deleteCertificate: async (req, res) => {
        const { htno, fileId } = req.params;

        try {
            await Certificate.delete(fileId, htno);
            res.redirect(`/${htno}/certificate`);
        } catch (error) {
            console.error('Error deleting certificate:', error);
            res.status(500).render('error', {
                message: 'Error deleting certificate',
                error: { status: 500 }
            });
        }
    },

    /**
     * Search certificates
     */
    searchCertificates: async (req, res) => {
        try {
            const criteria = {
                studentId: req.query.studentId || null,
                courseType: req.query.courseType || null,
                courseName: req.query.courseName || null,
                dateFrom: req.query.dateFrom || null,
                dateTo: req.query.dateTo || null
            };

            const certificates = await Certificate.search(criteria);

            // If it's an AJAX request, return JSON
            if (req.xhr) {
                return res.json(certificates);
            }

            // Otherwise render the search results page
            res.render('search_results', { certificates, criteria });
        } catch (error) {
            console.error('Error searching certificates:', error);

            // If it's an AJAX request, return error as JSON
            if (req.xhr) {
                return res.status(500).json({ error: 'Error searching certificates' });
            }

            res.status(500).render('error', {
                message: 'Error searching certificates',
                error: { status: 500 }
            });
        }
    }
};

module.exports = certificateController;
