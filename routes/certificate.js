const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { validateCertificateUpload } = require('../middleware/validation');

// Certificate list
router.get('/:htno/certificate', isAuthenticated, certificateController.showCertificates);

// Certificate upload form
router.get('/:htno/upload', isAuthenticated, certificateController.showUploadForm);

// Process certificate upload
router.post('/:htno/upload', isAuthenticated, upload.array('files', 5), upload.fileUploadError, validateCertificateUpload, certificateController.uploadCertificate);

// Download certificate
router.get('/download/:fileId', isAuthenticated, certificateController.downloadCertificate);

// Delete certificate
router.get('/:htno/delete-file/:fileId', isAuthenticated, certificateController.deleteCertificate);

// Search certificates
router.get('/certificates/search', isAuthenticated, certificateController.searchCertificates);

module.exports = router;
