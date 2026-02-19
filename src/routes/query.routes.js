const express = require('express');
const router = express.Router();
const sessionAuth = require('../middleware/session-auth.middleware');
const nlpService = require('../services/nlp.service');
const adobeService = require('../services/adobe.service');

router.post('/ask', sessionAuth, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('Interpreting query:', query);
    const interpretation = await nlpService.interpretQuery(query);

    if (!interpretation.metric || interpretation.metric.length === 0) {
      return res.json({
        needsClarification: true,
        message: 'Could not identify a valid metric in your query. Please specify which metric you want to analyze (visite, ordini, registrazioni, etc.).'
      });
    }

    // Determina il limite di risultati
    const resultLimit = interpretation.limit || 50;

    // Determina il tipo di grafico (se non specificato, auto-detect)
    let chartType = interpretation.chartType;
    if (!chartType) {
      // Auto-determina: time series → line, altre dimensioni → bar
      const isTimeDimension = interpretation.dimension?.id?.includes('daterange');
      chartType = isTimeDimension ? 'line' : 'bar';
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
        metrics: interpretation.metric.map(m => ({ id: m.id }))
      },
      dimension: interpretation.dimension
        ? (interpretation.dimension.id.startsWith('variables/')
            ? interpretation.dimension.id
            : `variables/${interpretation.dimension.id}`)
        : 'variables/daterangeday',
      settings: {
        limit: resultLimit,
        page: 0
      }
    };

    // Aggiungi search filter se presente
    if (searchTerm && interpretation.dimension) {
      // Formato Adobe Analytics API 2.0 per search
      reportRequest.search = {
        clause: `CONTAINS '${searchTerm}'`
      };
      // Se c'è un filtro di ricerca e non è stato specificato un limite, usa 10
      if (!interpretation.limit) {
        reportRequest.settings.limit = 10;
      }
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
        metric: interpretation.metric.map(m => m.name).join(' + '),
        metricIds: interpretation.metric.map(m => m.id),
        dimension: interpretation.dimension?.name || 'Date',
        dateRange: interpretation.dateRange,
        chartType: chartType,
        limit: resultLimit
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

router.get('/test-adobe', sessionAuth, async (req, res) => {
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
