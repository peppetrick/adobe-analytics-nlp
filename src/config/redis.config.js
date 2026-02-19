// ============================================
// src/config/redis.config.js
// ============================================
const redis = require('redis');

/**
 * Redis client singleton
 * Provides connection pooling and graceful failure handling
 */
class RedisConfig {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  /**
   * Get or create Redis client
   * @returns {Promise<Object>} Redis client or null if connection fails
   */
  async getRedisClient() {
    if (this.client && this.connected) {
      return this.client;
    }

    try {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      const password = process.env.REDIS_PASSWORD || undefined;
      const tls = process.env.REDIS_TLS === 'true';

      this.client = redis.createClient({
        url: url,
        password: password,
        socket: {
          tls: tls,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis: Max reconnection attempts reached');
              return false; // Stop reconnecting
            }
            const delay = Math.min(retries * 50, 500);
            console.log(`🔄 Redis: Reconnecting (attempt ${retries})...`);
            return delay;
          },
          connectTimeout: 10000
        },
        maxRetriesPerRequest: 3
      });

      // Error handling
      this.client.on('error', (err) => {
        console.error('❌ Redis Client Error:', err.message);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('🔌 Redis: Connecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis: Connected and ready');
        this.connected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis: Reconnecting...');
        this.connected = false;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis: Connection closed');
        this.connected = false;
      });

      // Connect
      await this.client.connect();

      return this.client;

    } catch (error) {
      console.error('❌ Redis: Connection failed:', error.message);
      console.warn('⚠️  Redis: Will fall back to memory cache');
      this.connected = false;
      return null;
    }
  }

  /**
   * Health check for Redis connection
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      if (!this.client || !this.connected) {
        return {
          connected: false,
          message: 'Not connected'
        };
      }

      await this.client.ping();

      return {
        connected: true,
        message: 'OK'
      };
    } catch (error) {
      return {
        connected: false,
        message: error.message
      };
    }
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }
}

// Export singleton instance
const redisConfig = new RedisConfig();

module.exports = {
  getRedisClient: () => redisConfig.getRedisClient(),
  healthCheck: () => redisConfig.healthCheck(),
  close: () => redisConfig.close()
};
