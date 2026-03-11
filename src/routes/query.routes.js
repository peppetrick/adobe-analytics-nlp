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

    // Leggi e aggiorna la history conversazionale dalla sessione
    const conversationHistory = req.session.conversationHistory || [];
    const lastQueryContext = req.session.lastQueryContext || null;

    console.log('Interpreting query:', query, `(history: ${conversationHistory.length} turns, lastCtx: ${lastQueryContext ? 'yes' : 'no'})`);
    const interpretation = await nlpService.interpretWithHistory(query, conversationHistory, lastQueryContext);

    // Claude risponde con info sulla business logic (nessuna chiamata Adobe)
    if (interpretation.type === 'info') {
      req.session.conversationHistory = [
        ...conversationHistory,
        { role: 'user', content: query },
        { role: 'assistant', content: interpretation.answer }
      ].slice(-10);

      return res.json({
        type: 'info',
        answer: interpretation.answer
      });
    }

    // Claude chiede chiarimento
    if (interpretation.needsClarification) {
      req.session.conversationHistory = [
        ...conversationHistory,
        { role: 'user', content: query },
        { role: 'assistant', content: interpretation.question }
      ].slice(-10); // max 10 messaggi in sessione

      return res.json({
        needsClarification: true,
        message: interpretation.question,
        options: interpretation.options || []
      });
    }

    if (!interpretation.metric || interpretation.metric.length === 0) {
      return res.json({
        needsClarification: true,
        message: 'Could not identify a valid metric in your query. Please specify which metric you want to analyze (visite, ordini, registrazioni, etc.).',
        options: []
      });
    }

    // Interpretazione completa: salva contesto per follow-up, pulisci history clarification
    req.session.lastQueryContext = {
      query,
      interpretation: {
        metric: interpretation.metric,
        dimension: interpretation.dimension,
        dateRange: interpretation.dateRange,
        searchFilter: interpretation.searchFilter,
        filterDimension: interpretation.filterDimension,
        stepOrder: interpretation.stepOrder
      }
    };
    req.session.conversationHistory = [];

    // Determina il tipo di grafico (se non specificato, auto-detect)
    const isTimeDimension = interpretation.dimension?.id?.includes('daterange');
    let chartType = interpretation.chartType;
    if (!chartType) {
      chartType = isTimeDimension ? 'line' : 'bar';
    }

    // Determina il limite di risultati
    // Per dimensioni temporali usa un limite alto per non troncare la serie
    let resultLimit = interpretation.limit;
    if (!resultLimit) {
      if (isTimeDimension) {
        // Calcola il numero di punti stimato in base al dateRange e granularità
        const dateRange = interpretation.dateRange;
        const days = parseInt(dateRange.match(/\d+/)?.[0] || '30');
        const dimId = interpretation.dimension.id;
        if (dimId.includes('hour'))  resultLimit = days * 24;
        else if (dimId.includes('week'))  resultLimit = Math.ceil(days / 7) + 1;
        else if (dimId.includes('month')) resultLimit = Math.ceil(days / 30) + 1;
        else resultLimit = days + 1; // day
      } else {
        resultLimit = 50;
      }
    }

    // Determina il search filter: prima usa quello di Claude, poi fallback su regex
    let searchTerm = interpretation.searchFilter || null;

    if (!searchTerm) {
      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('ricarica')) {
        searchTerm = 'ricarica';
      } else {
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
    }

    console.log('Search term (Claude/fallback):', searchTerm);

    // Segmento: Claude restituisce l'ID da segments.md.
    // Se è un ID speciale __dim__<dim>__<op>__<val>, crea un segmento temporaneo al volo.
    // Altrimenti lo usa direttamente come segmentId Adobe.
    let resolvedSegmentId = null;
    const rawSegmentId = interpretation.segmentId || null;
    if (rawSegmentId) {
      const dimMatch = rawSegmentId.match(/^__dim__(\w+)__(CONTAINS|eq)__(.+)$/);
      if (dimMatch) {
        const [, dimName, op, val] = dimMatch;
        const dimVar = `variables/${dimName}`;
        const pred = op === 'eq'
          ? { func: 'streq', val: { func: 'attr', name: dimVar }, str: val }
          : { func: 'contains', val: { func: 'attr', name: dimVar }, str: val };
        const segDef = {
          func: 'segment', version: [1, 0, 0],
          container: { func: 'container', context: 'hits', pred }
        };
        try {
          resolvedSegmentId = await adobeService.createTempSegment(
            req.accessToken, process.env.DEFAULT_RSID,
            `NLP tmp: ${dimName} ${op} ${val}`, segDef
          );
          console.log('Created dim-based temp segment:', resolvedSegmentId, `(${dimName} ${op} ${val})`);
        } catch (err) {
          console.error('Failed to create dim-based segment:', err.message);
          console.error('Segment API error body:', JSON.stringify(err.response?.data, null, 2));
        }
      } else {
        resolvedSegmentId = rawSegmentId;
        console.log('Applying predefined segment:', resolvedSegmentId);
      }
    }

    // Genera request per Adobe Analytics
    const reportRequest = {
      rsid: process.env.DEFAULT_RSID,
      globalFilters: [
        { type: 'dateRange', dateRange: interpretation.dateRange },
        ...(resolvedSegmentId ? [{ type: 'segment', segmentId: resolvedSegmentId }] : [])
      ],
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

    // Rimuovi eventuali due punti dai valori (coloni causano problemi nella clausola Adobe)
    const sanitize = (val) => val.includes(':') ? val.split(':').pop().trim() : val;

    // NEXT PAGE FLOW: crea segmento temporaneo tramite Adobe Segments API,
    // poi usalo nel report, poi cancellalo.
    // Il container visits con sequence-prefix è il livello corretto per sequenze.
    if (interpretation.previousPageFilter) {
      const prevPage = interpretation.previousPageFilter;
      console.log('Next-page flow analysis for page:', prevPage);

      // Azzera searchTerm per non entrare nel blocco search standard
      searchTerm = null;

      // Segmento: visite che hanno contenuto la pagina X.
      // Riportando evar5 con NOT CONTAINS su questa pagina otteniamo
      // le pagine più frequenti nelle sessioni che includono pagina X
      // (miglior approssimazione di "next page" con l'API reports standard).
      const segmentDefinition = {
        func: 'segment',
        version: [1, 0, 0],
        container: {
          func: 'container',
          context: 'visits',
          pred: {
            func: 'streq',
            val: { func: 'attr', name: 'variables/evar5' },
            str: prevPage
          }
        }
      };

      let tempSegmentId = null;
      try {
        tempSegmentId = await adobeService.createTempSegment(
          req.accessToken,
          process.env.DEFAULT_RSID,
          `NLP tmp: next page after ${sanitize(prevPage)}`,
          segmentDefinition
        );
        reportRequest.globalFilters.push({ type: 'segment', segmentId: tempSegmentId });
        reportRequest._tempSegmentId = tempSegmentId; // per cleanup post-report
      } catch (segErr) {
        console.error('Failed to create temp segment for next-page flow:', segErr.message);
        console.error('Segment API error body:', JSON.stringify(segErr.response?.data, null, 2));
        // Continua senza il filtro sequenziale (fallback graceful)
      }

      // Escludi la pagina stessa dai risultati
      reportRequest.search = {
        clause: `NOT CONTAINS '${sanitize(prevPage)}'`
      };
    }

    // Aggiungi search filter se presente
    if (searchTerm && interpretation.dimension) {
      // Costruisce la clause: MATCH per valori con ':' (pagename completi, regex-safe),
      // CONTAINS per valori senza ':' (last-segment, CONTAINS funziona).
      const buildClause = (v) => v.includes(':')
        ? `MATCH '${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`
        : `CONTAINS '${sanitize(v)}'`;
      const clause = Array.isArray(searchTerm)
        ? searchTerm.map(buildClause).join(' OR ')
        : buildClause(searchTerm);

      if (isTimeDimension) {
        // DIMENSIONE TEMPORALE + SEARCH FILTER:
        // Adobe `search` si applica solo alla dimensione attiva (i valori delle date),
        // non ai pagename. Soluzione: recupera prima gli itemId delle pagine corrispondenti
        // (step 1) e poi usa metricFilters con type:breakdown (step 2).
        // Usa filterDimension se Claude l'ha specificato, altrimenti default a evar5 (pagename)
        const filterDim = interpretation.filterDimension || 'variables/evar5';
        console.log('Time dimension + searchFilter: using 2-step metricFilters approach');
        console.log('Step 1: lookup itemIds on', filterDim, 'with clause:', clause);

        const lookupRequest = {
          rsid: process.env.DEFAULT_RSID,
          globalFilters: [{ type: 'dateRange', dateRange: interpretation.dateRange }],
          metricContainer: { metrics: [{ id: interpretation.metric[0].id }] },
          dimension: filterDim,
          search: { clause },
          settings: { limit: 50, page: 0 }
        };

        let pages = [];
        try {
          const lookupData = await adobeService.getRawReport(req.accessToken, lookupRequest);
          pages = (lookupData.rows || []).slice(0, 20);
        } catch (err) {
          console.error('Failed to lookup pagename itemIds:', err.message);
        }

        if (pages.length === 0) {
          console.log('No matching pages found for filter:', searchTerm);
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
            data: []
          });
        }

        console.log('Step 1 found', pages.length, 'pages:', pages.map(p => p.value));

        // Step 2: metricFilters – un filtro breakdown per item trovato
        const metricFilters = pages.map((page, idx) => ({
          id: String(idx),
          type: 'breakdown',
          dimension: filterDim,
          itemId: page.itemId
        }));

        // Per ogni metrica originale crea N varianti (una per pagina)
        // Ordine: [m1_p1, m1_p2, ..., m2_p1, m2_p2, ...]
        const filteredMetrics = [];
        interpretation.metric.forEach(userMetric => {
          pages.forEach((_, idx) => {
            filteredMetrics.push({ id: userMetric.id, filters: [String(idx)] });
          });
        });

        // Costruisci i nomi delle serie per la visualizzazione multi-line
        // Se c'è solo 1 metrica utente, usa il nome breve della pagina come label
        // Se ci sono più metriche, prefissa con il nome della metrica
        const pagedMetricNames = [];
        interpretation.metric.forEach(userMetric => {
          pages.forEach(page => {
            const shortName = sanitize(page.value);
            pagedMetricNames.push(
              interpretation.metric.length === 1
                ? shortName
                : `${userMetric.name}: ${shortName}`
            );
          });
        });

        reportRequest.metricContainer = { metrics: filteredMetrics, metricFilters };
        reportRequest._pagedMetricNames = pagedMetricNames; // usato dopo per la risposta
        // Nessun `search` nel request principale: il filtro è nei metricFilters
        console.log('Step 2: built metricFilters for', pages.length, 'pages,', filteredMetrics.length, 'metric entries');

      } else if (interpretation.filterDimension && interpretation.filterDimension !== interpretation.dimension?.id) {
        // FILTRO SU DIMENSIONE DIVERSA DALLA PRINCIPALE (es. dimension=evar5, filterDimension=evar57):
        // search.clause filtra solo la dimensione primaria, quindi serve lo stesso approccio
        // 2-step metricFilters ma senza _pagedMetricNames (è un breakdown normale, non time-series).
        const filterDim = interpretation.filterDimension;
        console.log('Cross-dimension filter: using 2-step metricFilters approach');
        console.log('Step 1: lookup itemIds on', filterDim, 'with clause:', clause);

        const lookupRequest = {
          rsid: process.env.DEFAULT_RSID,
          globalFilters: [{ type: 'dateRange', dateRange: interpretation.dateRange }],
          metricContainer: { metrics: [{ id: interpretation.metric[0].id }] },
          dimension: filterDim,
          search: { clause },
          settings: { limit: 50, page: 0 }
        };

        let items = [];
        try {
          const lookupData = await adobeService.getRawReport(req.accessToken, lookupRequest);
          items = (lookupData.rows || []).slice(0, 20);
        } catch (err) {
          console.error('Failed to lookup filterDimension itemIds:', err.message);
        }

        if (items.length === 0) {
          console.log('No matching items found for cross-dimension filter:', searchTerm);
          return res.json({
            success: true,
            interpretation: {
              metric: interpretation.metric.map(m => m.name).join(' + '),
              metricIds: interpretation.metric.map(m => m.id),
              dimension: interpretation.dimension?.name || 'Pagename',
              dateRange: interpretation.dateRange,
              chartType: chartType,
              limit: resultLimit
            },
            data: []
          });
        }

        console.log('Step 1 found', items.length, 'items:', items.map(i => i.value));

        const metricFilters = items.map((item, idx) => ({
          id: String(idx),
          type: 'breakdown',
          dimension: filterDim,
          itemId: item.itemId
        }));

        const filteredMetrics = [];
        interpretation.metric.forEach(userMetric => {
          items.forEach((_, idx) => {
            filteredMetrics.push({ id: userMetric.id, filters: [String(idx)] });
          });
        });

        reportRequest.metricContainer = { metrics: filteredMetrics, metricFilters };
        // Usa _pagedMetricNames per avere intestazioni corrette per ogni variante trovata
        // (stesso meccanismo del trend multi-pagina, funziona anche per dimensioni non temporali)
        const crossDimNames = [];
        interpretation.metric.forEach(userMetric => {
          items.forEach(item => {
            const shortName = sanitize(item.value);
            crossDimNames.push(
              interpretation.metric.length === 1
                ? shortName
                : `${userMetric.name}: ${shortName}`
            );
          });
        });
        reportRequest._pagedMetricNames = crossDimNames;
        console.log('Step 2: cross-dim metricFilters,', filteredMetrics.length, 'metric entries, names:', crossDimNames);

      } else {
        // DIMENSIONE NON TEMPORALE: usa search normale
        reportRequest.search = { clause };
        if (!interpretation.limit) {
          reportRequest.settings.limit = 10;
        }
        reportRequest.settings.page = 0;
        console.log('Adding search filter:', {
          term: searchTerm,
          dimension: interpretation.dimension.id,
          clause
        });
      }
    }

    console.log('Calling Adobe Analytics API with:', JSON.stringify(reportRequest, null, 2));

    let reportData = await adobeService.getReport(
      req.accessToken,
      reportRequest
    );

    // Cleanup segmenti temporanei in background — non bloccare la risposta
    if (reportRequest._tempSegmentId) {
      adobeService.deleteSegment(req.accessToken, reportRequest._tempSegmentId);
    }
    // Cleanup segmento device/OS creato al volo
    const dimSegmentId = rawSegmentId?.startsWith('__dim__') ? resolvedSegmentId : null;
    if (dimSegmentId) {
      adobeService.deleteSegment(req.accessToken, dimSegmentId);
    }

    console.log('Report data retrieved:', reportData.length, 'rows');

    // Funnel step ordering: se Claude ha restituito stepOrder, riordina i risultati
    // nell'ordine corretto degli step (Adobe restituisce ordinato per valore metrica DESC)
    if (interpretation.stepOrder && Array.isArray(interpretation.stepOrder) && interpretation.stepOrder.length > 0) {
      const stepOrder = interpretation.stepOrder.map(s => s.toLowerCase());
      reportData.sort((a, b) => {
        const dimA = (a.dimension || '').toLowerCase();
        const dimB = (b.dimension || '').toLowerCase();
        const idxA = stepOrder.findIndex(s => dimA.includes(s));
        const idxB = stepOrder.findIndex(s => dimB.includes(s));
        // Step non trovato va in fondo
        const posA = idxA === -1 ? stepOrder.length : idxA;
        const posB = idxB === -1 ? stepOrder.length : idxB;
        return posA - posB;
      });
      console.log('Funnel step order applied:', stepOrder);
    }

    // Multi-page: le colonne restano separate (una per pagina × metrica) — NON sommare
    const pagedMetricNames = reportRequest._pagedMetricNames || null;
    if (pagedMetricNames) {
      // Assicura che row.metric punti al primo valore (backward compat con chart singolo)
      reportData.forEach(row => {
        row.metric = row.metrics[0] ?? row.metric;
      });
      console.log('Multi-page mode: keeping', pagedMetricNames.length, 'separate series');
    }

    // Se multi-page/multi-series (pagedMetricNames), usa i nomi come label delle serie
    const baseMetricName = interpretation.metric.map(m => m.name).join(' + ');
    const finalMetricDisplay = pagedMetricNames
      ? pagedMetricNames.join(' + ')
      : baseMetricName;
    const finalMetricIds = pagedMetricNames
      ? pagedMetricNames.map(() => interpretation.metric[0]?.id || 'metrics/pageviews')
      : interpretation.metric.map(m => m.id);

    // Rimuovi i campi interni prima di includere nel debug
    // eslint-disable-next-line no-unused-vars
    const { _pagedMetricNames, _tempSegmentId, ...cleanRequest } = reportRequest;

    return res.json({
      success: true,
      interpretation: {
        metric: finalMetricDisplay,
        metricIds: finalMetricIds,
        dimension: interpretation.dimension?.name || 'Date',
        dateRange: interpretation.dateRange,
        chartType: chartType,
        limit: resultLimit
      },
      data: reportData,
      _debug: {
        claudeInterpretation: interpretation,
        adobeRequest: cleanRequest
      }
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

// Endpoint di diagnostica: elenca i segmenti disponibili (filtrabile per nome)
router.get('/segments', sessionAuth, async (req, res) => {
  try {
    const name = req.query.name || '';
    const segments = await adobeService.searchSegments(
      req.accessToken,
      name,
      process.env.DEFAULT_RSID
    );
    res.json({ success: true, count: segments.length, segments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
