// ============================================
// src/utils/token.utils.js
// ============================================

/**
 * Validate Adobe OAuth token format
 * Performs basic structure validation (not cryptographic verification)
 *
 * @param {string} token - Access token to validate
 * @returns {boolean} True if token format is valid
 */
function validateAdobeToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Basic validation: token should be a reasonable length
  if (token.length < 10) {
    return false;
  }

  // Adobe tokens are typically long alphanumeric strings
  // This is a basic check - not cryptographic validation
  const tokenPattern = /^[A-Za-z0-9._-]+$/;
  return tokenPattern.test(token);
}

/**
 * Check if token has expired
 *
 * @param {number} expiresAt - Expiry timestamp in milliseconds
 * @returns {boolean} True if token has expired
 */
function isTokenExpired(expiresAt) {
  if (!expiresAt || typeof expiresAt !== 'number') {
    return true; // Treat invalid expiry as expired
  }

  const now = Date.now();
  // Add 5 minute buffer before actual expiry
  const buffer = 5 * 60 * 1000;

  return now >= (expiresAt - buffer);
}

/**
 * Generate a random session ID
 * @returns {string} Random session ID
 */
function generateSessionId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

module.exports = {
  validateAdobeToken,
  isTokenExpired,
  generateSessionId
};
