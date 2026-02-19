// ============================================
// src/services/cache/memory-cache.service.js
// ============================================
const NodeCache = require('node-cache');

/**
 * Memory-based cache service (NodeCache wrapper)
 * Same interface as RedisCacheService for fallback compatibility
 */
class MemoryCacheService {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.ttl - Time to live in seconds (default: 3600)
   */
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 3600,
      checkperiod: 120,
      useClones: false
    });
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      const value = this.cache.get(key);
      return value === undefined ? null : value;
    } catch (error) {
      console.error('Memory cache GET error:', error.message);
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
      const success = this.cache.set(key, value, ttl);
      return success;
    } catch (error) {
      console.error('Memory cache SET error:', error.message);
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
      return this.cache.has(key);
    } catch (error) {
      console.error('Memory cache HAS error:', error.message);
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
      return this.cache.del(key);
    } catch (error) {
      console.error('Memory cache DEL error:', error.message);
      return 0;
    }
  }

  /**
   * Get all keys
   * @returns {Promise<Array<string>>} Array of keys
   */
  async keys() {
    try {
      return this.cache.keys();
    } catch (error) {
      console.error('Memory cache KEYS error:', error.message);
      return [];
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    try {
      return this.cache.getStats();
    } catch (error) {
      console.error('Memory cache STATS error:', error.message);
      return {
        keys: 0,
        hits: 0,
        misses: 0,
        error: error.message
      };
    }
  }

  /**
   * Flush all keys
   * @returns {Promise<boolean>}
   */
  async flushAll() {
    try {
      this.cache.flushAll();
      return true;
    } catch (error) {
      console.error('Memory cache FLUSH error:', error.message);
      return false;
    }
  }

  /**
   * Get cache type identifier
   * @returns {string}
   */
  getType() {
    return 'memory';
  }

  /**
   * Health check
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    return {
      connected: true,
      type: 'memory'
    };
  }
}

module.exports = MemoryCacheService;
