/**
 * Authentication middleware
 * Checks if user is logged in and redirects to login page if not
 */
function isAuthenticated(req, res, next) {
    if (req.session && req.session.username) {
        return next();
    }
    // Store the requested URL to redirect after login
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
}

/**
 * Admin authentication middleware
 * Checks if user is an admin and redirects to homepage if not
 */
function isAdmin(req, res, next) {
    if (req.session && (req.session.username === 'Admin' || req.session.role === 'admin')) {
        return next();
    }
    res.status(403).render('error', {
        message: 'Access denied. You need administrator privileges to access this page.',
        error: { status: 403 }
    });
}

/**
 * Guest middleware
 * Redirects logged in users to their homepage
 */
function isGuest(req, res, next) {
    if (req.session && req.session.username) {
        return res.redirect(`/${req.session.username}/homepage`);
    }
    next();
}

module.exports = {
    isAuthenticated,
    isAdmin,
    isGuest
};
