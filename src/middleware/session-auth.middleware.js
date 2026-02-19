// ============================================
// src/middleware/session-auth.middleware.js
// ============================================
const { isTokenExpired } = require('../utils/token.utils');

/**
 * Session-based authentication middleware
 * Validates session and token expiry
 * Replaces the old Bearer token auth middleware
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function requireAuth(req, res, next) {
  // Check if session exists
  if (!req.session) {
    return res.status(401).json({
      error: 'No session found',
      code: 'NO_SESSION'
    });
  }

  // Check if user is authenticated
  if (!req.session.userId) {
    return res.status(401).json({
      error: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
  }

  // Check if access token exists
  if (!req.session.accessToken) {
    return res.status(401).json({
      error: 'No access token in session',
      code: 'NO_TOKEN'
    });
  }

  // Check token expiry
  if (req.session.tokenExpiresAt && isTokenExpired(req.session.tokenExpiresAt)) {
    // Token expired - user needs to re-authenticate
    // TODO: Implement automatic token refresh if refresh_token exists
    return res.status(401).json({
      error: 'Access token expired. Please login again.',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Attach to request for downstream use
  req.accessToken = req.session.accessToken;
  req.userId = req.session.userId;

  next();
}

/**
 * Optional auth middleware
 * Attaches user info if session exists, but doesn't require it
 */
function optionalAuth(req, res, next) {
  if (req.session && req.session.userId && req.session.accessToken) {
    req.accessToken = req.session.accessToken;
    req.userId = req.session.userId;
  }
  next();
}

module.exports = requireAuth;
module.exports.optionalAuth = optionalAuth;
