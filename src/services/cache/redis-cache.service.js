// ============================================
// src/services/cache/redis-cache.service.js
// ============================================

/**
 * Redis-based cache service
 * Drop-in replacement for NodeCache with identical API
 */
class RedisCacheService {
  /**
   * @param {Object} client - Redis client instance
   * @param {Object} options - Configuration options
   * @param {number} options.ttl - Time to live in seconds (default: 3600)
   */
  constructor(client, options = {}) {
    this.client = client;
    this.ttl = options.ttl || 3600;
    this.keyPrefix = options.keyPrefix || '';
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      const fullKey = this.keyPrefix + key;
      const value = await this.client.get(fullKey);

      if (!value) {
        return null;
      }

      // Parse JSON
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Optional TTL override
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl) {
    try {
      const fullKey = this.keyPrefix + key;
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.ttl;

      await this.client.setEx(fullKey, expiry, serialized);
      return true;
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async has(key) {
    try {
      const fullKey = this.keyPrefix + key;
      const exists = await this.client.exists(fullKey);
      return exists === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error.message);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(key) {
    try {
      const fullKey = this.keyPrefix + key;
      return await this.client.del(fullKey);
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return 0;
    }
  }

  /**
   * Get all keys matching pattern
   * @returns {Promise<Array<string>>} Array of keys (without prefix)
   */
  async keys() {
    try {
      const pattern = this.keyPrefix + '*';
      const allKeys = await this.client.keys(pattern);

      // Remove prefix from keys
      if (this.keyPrefix) {
        return allKeys.map(key => key.substring(this.keyPrefix.length));
      }

      return allKeys;
    } catch (error) {
      console.error('Redis KEYS error:', error.message);
      return [];
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    try {
      const info = await this.client.info('stats');
      const keys = await this.keys();

      return {
        keys: keys.length,
        hits: null, // Not tracked in basic implementation
        misses: null,
        ksize: keys.length,
        vsize: null,
        info: info
      };
    } catch (error) {
      console.error('Redis STATS error:', error.message);
      return {
        keys: 0,
        hits: null,
        misses: null,
        error: error.message
      };
    }
  }

  /**
   * Flush all keys (use with caution!)
   * @returns {Promise<boolean>}
   */
  async flushAll() {
    try {
      const keys = await this.keys();
      if (keys.length === 0) {
        return true;
      }

      // Delete all keys with prefix
      const fullKeys = keys.map(key => this.keyPrefix + key);
      await this.client.del(fullKeys);

      return true;
    } catch (error) {
      console.error('Redis FLUSH error:', error.message);
      return false;
    }
  }

  /**
   * Get cache type identifier
   * @returns {string}
   */
  getType() {
    return 'redis';
  }

  /**
   * Health check
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      await this.client.ping();
      return {
        connected: true,
        type: 'redis'
      };
    } catch (error) {
      return {
        connected: false,
        type: 'redis',
        error: error.message
      };
    }
  }
}

module.exports = RedisCacheService;
