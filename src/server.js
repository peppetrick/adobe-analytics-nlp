// ============================================
// src/server.js
// ============================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { createSessionMiddleware } = require('./config/session.config');
const { csrfMiddleware, csrfErrorHandler } = require('./middleware/csrf.middleware');
const authRoutes = require('./routes/auth.routes');
const queryRoutes = require('./routes/query.routes');
const configService = require('./services/config.service');

const app = express();
const PORT = process.env.PORT || 8011;

// Initialize session middleware (async)
let sessionMiddleware;
createSessionMiddleware().then(middleware => {
  sessionMiddleware = middleware;
  console.log('✅ Session middleware initialized');
}).catch(err => {
  console.error('❌ Session middleware initialization failed:', err);
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://localhost:8011',
  credentials: true // Important for cookies
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser());

// Session middleware (will be set after async initialization)
app.use((req, res, next) => {
  if (sessionMiddleware) {
    sessionMiddleware(req, res, next);
  } else {
    // Session not ready yet, skip for health check
    if (req.path === '/api/health') {
      return next();
    }
    res.status(503).json({ error: 'Session not initialized yet' });
  }
});

// CSRF protection (after session)
app.use(csrfMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/query', queryRoutes);

// CSRF error handler
app.use(csrfErrorHandler);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const cacheHealth = await configService.getCacheHealth();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: {
        type: cacheHealth.type,
        connected: cacheHealth.connected,
        keys: cacheHealth.keys
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on https://localhost:${PORT}`);
  console.log(`📊 Adobe Analytics NLU ready`);
});
