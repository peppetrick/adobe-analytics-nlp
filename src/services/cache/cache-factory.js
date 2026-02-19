// ============================================
// src/services/cache/cache-factory.js
// ============================================
const { getRedisClient } = require('../../config/redis.config');
const RedisCacheService = require('./redis-cache.service');
const MemoryCacheService = require('./memory-cache.service');

/**
 * Cache factory with automatic fallback
 * Tries to create Redis cache, falls back to memory cache if Redis unavailable
 */
class CacheFactory {
  /**
   * Create cache instance
   * @param {Object} options - Configuration options
   * @param {number} options.ttl - Time to live in seconds (default: 3600)
   * @param {string} options.keyPrefix - Optional key prefix for Redis
   * @returns {Promise<Object>} Cache service instance
   */
  static async createCache(options = {}) {
    const ttl = options.ttl || 3600;
    const keyPrefix = options.keyPrefix || '';

    // Try to connect to Redis
    try {
      console.log('🔄 Cache Factory: Attempting to connect to Redis...');

      const redisClient = await getRedisClient();

      if (redisClient) {
        console.log('✅ Cache Factory: Using Redis cache');
        return new RedisCacheService(redisClient, { ttl, keyPrefix });
      } else {
        throw new Error('Redis client unavailable');
      }

    } catch (error) {
      console.warn('⚠️  Cache Factory: Redis connection failed:', error.message);
      console.log('💾 Cache Factory: Falling back to memory cache');
      return new MemoryCacheService({ ttl });
    }
  }

  /**
   * Create cache instance synchronously with async initialization
   * Returns memory cache immediately, upgrades to Redis in background
   * @param {Object} options - Configuration options
   * @returns {Object} Cache service proxy
   */
  static createCacheSync(options = {}) {
    const ttl = options.ttl || 3600;

    // Start with memory cache
    let cache = new MemoryCacheService({ ttl });
    let isUpgrading = false;

    // Try to upgrade to Redis in background
    this.createCache(options)
      .then(redisCache => {
        if (redisCache.getType() === 'redis' && !isUpgrading) {
          console.log('✨ Cache Factory: Upgraded to Redis cache');
          cache = redisCache;
        }
      })
      .catch(err => {
        console.warn('⚠️  Cache Factory: Redis upgrade failed:', err.message);
      });

    // Return proxy that delegates to current cache
    return new Proxy(cache, {
      get(target, prop) {
        // Always use the current cache instance
        return cache[prop];
      }
    });
  }
}

/**
 * Create cache instance (async factory method)
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Cache service instance
 */
async function createCache(options) {
  return await CacheFactory.createCache(options);
}

/**
 * Create cache instance synchronously
 * @param {Object} options - Configuration options
 * @returns {Object} Cache service proxy
 */
function createCacheSync(options) {
  return CacheFactory.createCacheSync(options);
}

module.exports = {
  createCache,
  createCacheSync,
  CacheFactory
};
