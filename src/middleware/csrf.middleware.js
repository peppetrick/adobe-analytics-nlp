// ============================================
// src/middleware/csrf.middleware.js
// ============================================
const csurf = require('csurf');

/**
 * CSRF protection middleware
 * Protects against Cross-Site Request Forgery attacks
 *
 * NOTE: csurf is deprecated. Consider migrating to csrf-csrf or custom implementation
 */
const csrfProtection = csurf({
  cookie: false, // Use session instead of cookies for CSRF token
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

/**
 * CSRF middleware with route exclusions
 * Excludes OAuth callback from CSRF check
 */
function csrfMiddleware(req, res, next) {
  // Exempt OAuth callback from CSRF (external redirect)
  if (req.path === '/api/auth/callback') {
    return next();
  }

  // Apply CSRF protection to other routes
  csrfProtection(req, res, next);
}

/**
 * Error handler for CSRF errors
 */
function csrfErrorHandler(err, req, res, next) {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_INVALID'
    });
  }
  next(err);
}

module.exports = {
  csrfMiddleware,
  csrfProtection,
  csrfErrorHandler
};
