const NodeCache = require('node-cache');

class ConfigService {
  constructor() {
    // Cache in memoria per MVP
    // In produzione: usa Redis o database
    this.cache = new NodeCache({ 
      stdTTL: 3600, // 1 ora
      checkperiod: 120 // Controlla ogni 2 minuti
    });

    console.log('ConfigService initialized with in-memory cache');
    
    // Carica RAG service solo quando necessario (lazy loading)
    this.ragService = null;
  }

  /**
   * Carica il servizio RAG se disponibile
   */
  loadRagService() {
    if (this.ragService) return this.ragService;
    
    try {
      this.ragService = require('./rag.service');
      return this.ragService;
    } catch (error) {
      console.warn('⚠️  RAG service not available:', error.message);
      return null;
    }
  }

  /**
   * Salva la configurazione per un utente
   * @param {string} userId - ID utente
   * @param {object} config - Configurazione {metrics: [], dimensions: []}
   */
  setUserConfig(userId, config) {
    const key = this.getKey(userId);
    
    // Valida la configurazione
    if (!this.validateConfig(config)) {
      throw new Error('Invalid configuration format');
    }

    this.cache.set(key, config);
    
    // Alimenta automaticamente RAG con la configurazione (se disponibile)
    const rag = this.loadRagService();
    if (rag && typeof rag.addUserConfiguration === 'function') {
      try {
        rag.addUserConfiguration(config);
      } catch (error) {
        console.warn('⚠️  Could not sync config to RAG:', error.message);
      }
    }
    
    console.log(`Config saved for user ${userId}: ${config.metrics?.length} metrics, ${config.dimensions?.length} dimensions`);
  }

  /**
   * Recupera la configurazione di un utente
   * @param {string} userId - ID utente
   * @returns {object|null} Configurazione o null se non trovata
   */
  getUserConfig(userId) {
    const key = this.getKey(userId);
    const config = this.cache.get(key);
    
    if (!config) {
      console.log(`No config found for user ${userId}`);
      return null;
    }

    return config;
  }

  /**
   * Cancella la configurazione di un utente
   * @param {string} userId - ID utente
   * @returns {boolean} True se cancellata con successo
   */
  clearUserConfig(userId) {
    const key = this.getKey(userId);
    const deleted = this.cache.del(key);
    
    if (deleted) {
      console.log(`Config cleared for user ${userId}`);
    }
    
    return deleted > 0;
  }

  /**
   * Verifica se un utente ha una configurazione
   * @param {string} userId - ID utente
   * @returns {boolean}
   */
  hasUserConfig(userId) {
    const key = this.getKey(userId);
    return this.cache.has(key);
  }

  /**
   * Ottiene statistiche sulla cache
   * @returns {object}
   */
  getStats() {
    return {
      keys: this.cache.keys().length,
      stats: this.cache.getStats()
    };
  }

  /**
   * Valida il formato della configurazione
   * @param {object} config
   * @returns {boolean}
   */
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      console.error('Invalid config: not an object');
      return false;
    }

    // Verifica che esistano metriche e dimensioni
    if (!Array.isArray(config.metrics) || !Array.isArray(config.dimensions)) {
      console.error('Invalid config: metrics or dimensions not arrays');
      return false;
    }

    // Verifica formato metriche
    for (const metric of config.metrics) {
      if (!metric.id || !metric.name) {
        console.error('Invalid metric format (missing id or name):', metric);
        return false;
      }
      // description è opzionale, può essere vuota
      if (metric.description === undefined || metric.description === null) {
        console.warn('Metric missing description, setting to empty string:', metric.name);
        metric.description = '';
      }
    }

    // Verifica formato dimensioni
    for (const dimension of config.dimensions) {
      if (!dimension.id || !dimension.name) {
        console.error('Invalid dimension format (missing id or name):', dimension);
        return false;
      }
      // description è opzionale, può essere vuota
      if (dimension.description === undefined || dimension.description === null) {
        console.warn('Dimension missing description, setting to empty string:', dimension.name);
        dimension.description = '';
      }
    }

    return true;
  }

  /**
   * Genera la chiave cache per un utente
   * @param {string} userId
   * @returns {string}
   */
  getKey(userId) {
    return `config_${userId}`;
  }

  /**
   * Cerca metriche per nome o descrizione
   * @param {string} userId
   * @param {string} searchTerm
   * @returns {Array}
   */
  searchMetrics(userId, searchTerm) {
    const config = this.getUserConfig(userId);
    if (!config) return [];

    const term = searchTerm.toLowerCase();
    return config.metrics.filter(m => 
      m.name.toLowerCase().includes(term) ||
      m.description.toLowerCase().includes(term)
    );
  }

  /**
   * Cerca dimensioni per nome o descrizione
   * @param {string} userId
   * @param {string} searchTerm
   * @returns {Array}
   */
  searchDimensions(userId, searchTerm) {
    const config = this.getUserConfig(userId);
    if (!config) return [];

    const term = searchTerm.toLowerCase();
    return config.dimensions.filter(d => 
      d.name.toLowerCase().includes(term) ||
      d.description.toLowerCase().includes(term)
    );
  }

  /**
   * Ottiene una metrica per ID
   * @param {string} userId
   * @param {string} metricId
   * @returns {object|null}
   */
  getMetricById(userId, metricId) {
    const config = this.getUserConfig(userId);
    if (!config) return null;

    return config.metrics.find(m => m.id === metricId) || null;
  }

  /**
   * Ottiene una dimensione per ID
   * @param {string} userId
   * @param {string} dimensionId
   * @returns {object|null}
   */
  getDimensionById(userId, dimensionId) {
    const config = this.getUserConfig(userId);
    if (!config) return null;

    return config.dimensions.find(d => d.id === dimensionId) || null;
  }
}

module.exports = new ConfigService();
