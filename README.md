# EduVault

A comprehensive system for managing student certificates, academic records, and attendance information for educational institutions.

## Features

- **User Authentication**: Secure login and registration system
- **Certificate Management**: Upload, view, download, and delete certificates
- **Academic Results**: Integration with JNTUH results API
- **Attendance Tracking**: Monitor and visualize student attendance
- **Profile Management**: Update personal information and profile pictures
- **Admin Dashboard**: Comprehensive overview for administrators
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Frontend**: Handlebars (HBS), Bootstrap 5, Chart.js
- **Authentication**: Session-based with bcrypt password hashing
- **File Handling**: Multer for file uploads

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/eduvault.git
   cd eduvault
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and configure your environment variables.

4. Set up the database:

   - Create a MySQL database named `eduvault`
   - Import the database schema from `eduvault.sql`

5. Start the application:

   ```
   npm start
   ```

6. For development with auto-restart:
   ```
   npm run dev
   ```

## Project Structure

```
eduvault/
├── config/             # Configuration files
├── controllers/        # Route controllers
├── middleware/         # Custom middleware
├── models/             # Database models
├── public/             # Static assets
│   ├── css/            # CSS files
│   ├── js/             # JavaScript files
│   ├── uploaded_files/ # Uploaded certificates
│   └── uploaded_images/# Uploaded profile pictures
├── routes/             # Route definitions
├── views/              # Handlebars templates
├── .env                # Environment variables
├── .env.example        # Example environment variables
├── app.js              # Express application setup
├── server.js           # Application entry point
├── eduvault.sql        # Database schema
└── package.json        # Project dependencies
```

## Usage

### Student Features

- Register and login with student credentials
- Upload and manage certificates
- View academic results and attendance
- Update profile information

### Admin Features

- View all student records
- Access all certificates in the system
- Generate reports
- Manage student attendance

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### MySQL max_allowed_packet Error

If you encounter the error `ER_NET_PACKET_TOO_LARGE: Got a packet bigger than 'max_allowed_packet' bytes` when uploading certificates, follow these steps:

1. Run the MySQL configuration script to increase the packet size:

   ```
   mysql -u root -p < mysql-config.sql
   ```

2. Or manually set the max_allowed_packet size in your MySQL client:

   ```sql
   SET GLOBAL max_allowed_packet=67108864; -- 64MB
   ```

3. For a permanent solution, edit your MySQL configuration file (my.cnf or my.ini):

   ```
   [mysqld]
   max_allowed_packet=64M
   ```

4. Alternatively, use the provided script:

   ```
   npm run increase-packet-size
   ```

5. Restart MySQL after making configuration changes.

### File Upload Size Limits

- The maximum file size for certificate uploads is 5MB
- If you need to upload larger files, modify the `limits.fileSize` value in `middleware/upload.js`

## Acknowledgments

- Sphoorthy Engineering College for the project requirements
- JNTUH Results API for academic data integration
