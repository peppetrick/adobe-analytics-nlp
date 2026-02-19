// ============================================
// src/config/session.config.js
// ============================================
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { getRedisClient } = require('./redis.config');

/**
 * Session middleware configuration
 * Uses Redis for session storage with secure cookie settings
 */
async function createSessionMiddleware() {
  try {
    // Try to get Redis client for session store
    const redisClient = await getRedisClient();

    let store;
    if (redisClient) {
      console.log('✅ Session: Using Redis store');
      store = new RedisStore({
        client: redisClient,
        prefix: 'session:sess:',
        ttl: 86400 // 24 hours
      });
    } else {
      console.warn('⚠️  Session: Redis unavailable, using memory store (not recommended for production)');
      // Memory store is default, but not recommended for production
      store = undefined;
    }

    const sessionMiddleware = session({
      store: store,
      secret: process.env.SESSION_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION',
      name: process.env.SESSION_NAME || 'adobe_analytics_sid',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES !== 'false',
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours
        sameSite: 'strict'
      }
    });

    return sessionMiddleware;

  } catch (error) {
    console.error('❌ Session: Configuration error:', error.message);
    // Fallback to basic session with memory store
    return session({
      secret: process.env.SESSION_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION',
      name: process.env.SESSION_NAME || 'adobe_analytics_sid',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 86400000,
        sameSite: 'strict'
      }
    });
  }
}

module.exports = {
  createSessionMiddleware
};
