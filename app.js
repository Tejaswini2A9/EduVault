// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const hbs = require('hbs');
const fs = require('fs');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const certificateRoutes = require('./routes/certificate');
const adminRoutes = require('./routes/admin');

// Create Express app
const app = express();

// View engine setup
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Register Handlebars helpers
hbs.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

hbs.registerHelper('eq', function(a, b) {
    return a === b;
});

hbs.registerHelper('formatDate', function(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
});

hbs.registerHelper('ternary', function(condition, yes, no) {
    return condition ? yes : no;
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Security headers
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Request logging
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Flash messages middleware
app.use(flash());

// Make user data and flash messages available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.username;
    res.locals.isAdmin = req.session.username === 'Admin';
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Routes
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', certificateRoutes);
app.use('/', adminRoutes);

// Home page
app.get('/', (req, res) => {
    res.render('landpage');
});

// Error handling
app.use((req, res, next) => {
    res.status(404).render('error', {
        message: 'Page not found',
        error: { status: 404 }
    });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).render('error', {
        message: err.message || 'Something went wrong',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Export the app for server.js
// (Server start moved to server.js)

module.exports = app;
