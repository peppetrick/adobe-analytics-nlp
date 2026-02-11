const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const nlpService = require('../services/nlp.service');
const adobeService = require('../services/adobe.service');
const configService = require('../services/config.service');

router.post('/config', authMiddleware, async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config || !config.metrics || !config.dimensions) {
      return res.status(400).json({ 
        error: 'Invalid configuration format. Expected {metrics: [], dimensions: []}' 
      });
    }

    configService.setUserConfig(req.userId, config);
    
    res.json({
      success: true,
      metrics: config.metrics?.length || 0,
      dimensions: config.dimensions?.length || 0,
      message: 'Configuration loaded successfully'
    });
  } catch (error) {
    console.error('Config upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/config', authMiddleware, (req, res) => {
  try {
    const config = configService.getUserConfig(req.userId);
    
    if (!config) {
      return res.status(404).json({ error: 'No configuration found' });
    }

    res.json({
      metrics: config.metrics?.length || 0,
      dimensions: config.dimensions?.length || 0,
      hasConfig: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ask', authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const userConfig = configService.getUserConfig(req.userId);
    
    if (!userConfig) {
      return res.status(400).json({ 
        error: 'Configuration not loaded. Please upload your metrics/dimensions configuration first.' 
      });
    }

    console.log('Interpreting query:', query);
    const interpretation = await nlpService.interpretQuery(query, userConfig);
    
    if (!interpretation.metric) {
      return res.json({
        needsClarification: true,
        message: 'Could not identify a valid metric in your query. Please specify which metric you want to analyze.',
        availableMetrics: userConfig.metrics.map(m => m.name)
      });
    }

    // Estrai eventuali filtri di ricerca dalla query
    const lowerQuery = query.toLowerCase();
    let searchTerm = null;
    
    // Cerca direttamente keywords comuni
    if (lowerQuery.includes('ricarica')) {
      searchTerm = 'ricarica';
    } else {
      // Pattern per estrarre termini di ricerca
      const searchPatterns = [
        /conteng[oa]n?o?\s+(?:la\s+)?(?:parola\s+)?(?:keyword\s+)?["']?([^"'\s]+)/i,
        /keyword\s+["']?([^"'\s]+)/i,
        /con\s+la\s+parola\s+["']?([^"'\s]+)/i,
        /parola\s+["']?([^"'\s]+)/i,
        /che\s+hanno\s+["']?([^"'\s]+)/i,
        /includono\s+["']?([^"'\s]+)/i
      ];
      
      for (const pattern of searchPatterns) {
        const match = query.match(pattern);
        if (match) {
          searchTerm = match[1].trim();
          break;
        }
      }
    }

    console.log('Extracted search term:', searchTerm);

    // Genera request per Adobe Analytics
    const reportRequest = {
      rsid: process.env.DEFAULT_RSID,
      globalFilters: [{
        type: 'dateRange',
        dateRange: interpretation.dateRange
      }],
      metricContainer: {
        metrics: [{
          id: interpretation.metric.id
        }]
      },
      dimension: interpretation.dimension 
        ? `variables/${interpretation.dimension.id}` 
        : 'variables/daterangeday',
      settings: {
        limit: 50,
        page: 0
      }
    };

    // Aggiungi search filter se presente
    if (searchTerm && interpretation.dimension) {
      // Formato Adobe Analytics API 2.0 per search
      reportRequest.search = {
        clause: `CONTAINS '${searchTerm}'`
      };
      // Limita molto i risultati per query con filtri
      reportRequest.settings.limit = 10;
      reportRequest.settings.page = 0;
      
      // Log dettagliato per debug
      console.log('Adding search filter:', {
        term: searchTerm,
        dimension: interpretation.dimension.id,
        clause: reportRequest.search.clause
      });
    }

    console.log('Calling Adobe Analytics API with:', JSON.stringify(reportRequest, null, 2));

    const reportData = await adobeService.getReport(
      req.accessToken,
      reportRequest
    );

    console.log('Report data retrieved:', reportData.length, 'rows');

    return res.json({
      success: true,
      interpretation: {
        metric: interpretation.metric.name,
        dimension: interpretation.dimension?.name || 'Date',
        dateRange: interpretation.dateRange
      },
      data: reportData
    });
    
  } catch (error) {
    console.error('Query processing error:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Adobe Analytics authentication failed. Please login again.',
        code: 'AUTH_FAILED'
      });
    }
    
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        error: 'Access denied. Check your Adobe Analytics permissions.',
        code: 'ACCESS_DENIED'
      });
    }

    res.status(500).json({ 
      error: error.message || 'Failed to process query',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/test-adobe', authMiddleware, async (req, res) => {
  try {
    const result = await adobeService.testConnection(req.accessToken);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
