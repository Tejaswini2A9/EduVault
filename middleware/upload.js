const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const certificatesDir = path.join(__dirname, '../public/uploaded_files');
const imagesDir = path.join(__dirname, '../public/uploaded_images');

if (!fs.existsSync(certificatesDir)) {
    fs.mkdirSync(certificatesDir, { recursive: true });
}

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Check if the file is an image based on mime type
        if (file.mimetype.startsWith('image')) {
            cb(null, imagesDir); // Image directory
        } else {
            cb(null, certificatesDir); // Other files directory
        }
    },
    filename: (req, file, cb) => {
        // Create a unique file name using timestamp and random number
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Accept images and PDFs
    if (file.mimetype.startsWith('image/') ||
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        cb(null, true);
    } else {
        cb(new Error('Unsupported file type. Only images, PDFs, and Word documents are allowed.'), false);
    }
};

// Create multer upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB file size limit - reduced to prevent database issues
    }
});

// Add error handling middleware
upload.fileUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).render('error', {
                message: 'File too large. Maximum file size is 5MB.',
                error: { status: 400 }
            });
        }
    }
    next(err);
};

module.exports = upload;
