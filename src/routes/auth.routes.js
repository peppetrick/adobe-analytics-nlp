const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/login', (req, res) => {
  const authUrl = `https://ims-na1.adobelogin.com/ims/authorize/v2?` +
    `client_id=${process.env.ADOBE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.ADOBE_REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(process.env.ADOBE_SCOPES)}&` +
    `response_type=code`;
  
  res.json({ authUrl });
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
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

    // Invece di restituire JSON, redirect alla home con il token
    // Il frontend lo salverà in localStorage
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Autenticazione completata</title>
      </head>
      <body>
        <script>
          // Salva il token in localStorage
          localStorage.setItem('adobe_access_token', '${access_token}');
          localStorage.setItem('adobe_token_expires', '${Date.now() + expires_in * 1000}');
          ${refresh_token ? `localStorage.setItem('adobe_refresh_token', '${refresh_token}');` : ''}
          
          // Redirect alla home
          window.location.href = '/';
        </script>
        <p>Autenticazione completata, reindirizzamento in corso...</p>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Errore Autenticazione</title>
      </head>
      <body>
        <h1>Errore durante l'autenticazione</h1>
        <p>${error.response?.data?.error_description || error.message}</p>
        <a href="/">Torna alla home</a>
      </body>
      </html>
    `);
  }
});

router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh token' });
  }

  try {
    const tokenResponse = await axios.post(
      'https://ims-na1.adobelogin.com/ims/token/v3',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ADOBE_CLIENT_ID,
        client_secret: process.env.ADOBE_CLIENT_SECRET,
        refresh_token: refresh_token
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    res.json({
      access_token: tokenResponse.data.access_token,
      expires_in: tokenResponse.data.expires_in
    });
    
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

module.exports = router;
