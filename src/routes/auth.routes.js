// ============================================
// src/routes/auth.routes.js - Secure Session-Based Auth
// ============================================
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { validateAdobeToken, generateSessionId } = require('../utils/token.utils');

/**
 * GET /api/auth/login
 * Returns Adobe OAuth authorization URL
 */
router.get('/login', (req, res) => {
  const authUrl = `https://ims-na1.adobelogin.com/ims/authorize/v2?` +
    `client_id=${process.env.ADOBE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.ADOBE_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(process.env.ADOBE_SCOPES)}&` +
    `response_type=code`;

  res.json({ authUrl });
});

/**
 * GET /api/auth/callback
 * OAuth callback - exchanges code for token and creates session
 * SECURITY: Tokens stored server-side only, not exposed to client
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('<h1>Error</h1><p>Authorization code missing</p><a href="/">Back to home</a>');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://ims-na1.adobelogin.com/ims/token/v3',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ADOBE_CLIENT_ID,
        client_secret: process.env.ADOBE_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.ADOBE_REDIRECT_URI
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, expires_in, refresh_token } = tokenResponse.data;

    // Validate token format
    if (!validateAdobeToken(access_token)) {
      throw new Error('Invalid token format received from Adobe');
    }

    // Store tokens in SERVER-SIDE session (not exposed to client)
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;
    req.session.tokenExpiresAt = Date.now() + (expires_in * 1000);
    req.session.userId = generateSessionId();

    console.log(`✅ Session created for user: ${req.session.userId}`);

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).send('<h1>Error</h1><p>Session creation failed</p>');
      }

      // Redirect to home WITHOUT exposing tokens
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Complete</title>
          <meta http-equiv="refresh" content="0;url=/">
        </head>
        <body>
          <p>Authentication successful, redirecting...</p>
        </body>
        </html>
      `);
    });

  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Error</title>
      </head>
      <body>
        <h1>Authentication Failed</h1>
        <p>${error.message}</p>
        <a href="/">Return to home</a>
      </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/session
 * Check current session status
 */
router.get('/session', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      userId: req.session.userId,
      expiresAt: req.session.tokenExpiresAt
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

/**
 * GET /api/auth/csrf-token
 * Get CSRF token for subsequent requests
 */
router.get('/csrf-token', (req, res) => {
  res.json({
    csrfToken: req.csrfToken()
  });
});

/**
 * POST /api/auth/logout
 * Destroy session and logout
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }

      res.clearCookie(process.env.SESSION_NAME || 'adobe_analytics_sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } else {
    res.json({ success: true, message: 'No session to destroy' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  if (!req.session || !req.session.refreshToken) {
    return res.status(401).json({ error: 'No refresh token available' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://ims-na1.adobelogin.com/ims/token/v3',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ADOBE_CLIENT_ID,
        client_secret: process.env.ADOBE_CLIENT_SECRET,
        refresh_token: req.session.refreshToken
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, expires_in } = tokenResponse.data;

    // Update session with new token
    req.session.accessToken = access_token;
    req.session.tokenExpiresAt = Date.now() + (expires_in * 1000);

    res.json({
      success: true,
      expiresAt: req.session.tokenExpiresAt
    });

  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

module.exports = router;
