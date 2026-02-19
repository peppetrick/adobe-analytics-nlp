const axios = require('axios');
const ragService = require('./rag.service');

class NLPService {
  constructor() {
    // Configurazione modello locale
    this.useLocal = process.env.USE_LOCAL_MODEL === 'true';
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1';
    
    // Configurazione Claude (fallback)
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.claudeModel = 'claude-sonnet-4-20250514';
    
    console.log(`🤖 NLP Service initialized:`);
    console.log(`   - Local model: ${this.useLocal ? 'YES' : 'NO'}`);
    if (this.useLocal) {
      console.log(`   - Ollama URL: ${this.ollamaUrl}`);
      console.log(`   - Model: ${this.ollamaModel}`);
    }
  }

  async interpretQuery(query) {
    if (this.useLocal) {
      try {
        return await this.interpretWithOllama(query);
      } catch (error) {
        console.error('Ollama error:', error.message);
        console.log('Falling back to pattern matching...');
        return this.fallbackInterpretation(query);
      }
    } else if (this.apiKey && this.apiKey !== 'your_anthropic_api_key_here') {
      try {
        return await this.interpretWithClaude(query);
      } catch (error) {
        console.error('Claude API error:', error.response?.data || error.message);
        console.log('Falling back to pattern matching...');
        return this.fallbackInterpretation(query);
      }
    }

    // Fallback: pattern matching
    return this.fallbackInterpretation(query);
  }

  async interpretWithOllama(query) {
    const prompt = this.buildPrompt(query);

    console.log('🤖 Calling Ollama...');

    const response = await axios.post(
      `${this.ollamaUrl}/api/generate`,
      {
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      },
      {
        timeout: 30000
      }
    );

    let text = response.data.response;

    // Pulisci la risposta
    text = text.replace(/```json\s*/gi, '');
    text = text.replace(/```\s*/g, '');
    text = text.replace(/`/g, '');
    text = text.trim();

    // Estrai JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    console.log('Ollama response (cleaned):', text);

    const interpretation = JSON.parse(text);
    return this.validateInterpretation(interpretation);
  }

  async interpretWithClaude(query) {
    const prompt = this.buildPrompt(query);

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.claudeModel,
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 10000
      }
    );

    let text = response.data.content[0].text;

    text = text.replace(/```json\s*/gi, '');
    text = text.replace(/```\s*/g, '');
    text = text.replace(/`/g, '');
    text = text.trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    console.log('Claude response (cleaned):', text);

    const interpretation = JSON.parse(text);
    return this.validateInterpretation(interpretation);
  }

  buildPrompt(query) {
    const basePrompt = `You are an Adobe Analytics query interpreter. Analyze the user's natural language query and identify:

1. **metric**: The metric they want to analyze (REQUIRED)
2. **dimension**: The dimension to break down by (OPTIONAL - only if explicitly mentioned)
3. **dateRange**: The time period to analyze

METRICS - Use Adobe Analytics format:
- Standard metrics: "metrics/visits", "metrics/pageviews", "metrics/orders", "metrics/revenue", "metrics/units"
- Custom events: "metrics/event1", "metrics/event2", etc. (check business logic documentation for meaning)

DIMENSIONS - Use Adobe Analytics format:
- Standard dimensions: "variables/page", "variables/product"
- Custom eVars: "variables/evar1", "variables/evar2", "variables/evar126", etc.
- Custom props: "variables/prop1", "variables/prop2", etc.
- Time dimensions: "variables/daterangehour", "variables/daterangeday", "variables/daterangeweek", "variables/daterangemonth"

IMPORTANT: Use the business logic documentation below to map business terms to Adobe Analytics IDs.
Example mappings:
- "registrazioni" → metrics/event1
- "prodotto" → variables/evar1
- "canale marketing" → variables/evar2
- "aggiunta al carrello" → metrics/event10

Valid dateRange values:
- "today", "yesterday"
- "last7days", "last30days", "last90days"
- "lastXdays" where X is any number (e.g., "last2days", "last5days")

User Query: "${query}"

RULES:
1. Use business logic documentation to find the correct metric/dimension IDs
2. Be flexible with Italian language variations (visits = visite, ordini = orders)
3. If no dimension is mentioned, set dimension to null
4. Use "last30days" as default dateRange if not specified
5. For time breakdowns (orario, giornaliero, etc.), use time dimensions

CHART TYPE (OPTIONAL):
- "pie" for pie charts (torta, pizza, cerchio)
- "bar" for bar charts (barre, colonne, istogramma)
- "line" for line charts (linea, andamento, trend)
- "doughnut" for doughnut charts (ciambella)
- If not specified, set to null (will be auto-determined)

LIMIT (OPTIONAL):
- Extract number if user specifies "prime 5", "top 10", "primi 20", "bastano le prime 5", etc.
- If not specified, set to null (default will be used)

CRITICAL: Respond with ONLY the JSON object, NO markdown, NO explanations.
Single metric:  {"metric": {"id": "metrics/...", "name": "..."}, "dimension": {"id": "variables/...", "name": "..."}, "dateRange": "last30days", "chartType": "pie", "limit": 5}
Multiple metrics: {"metric": [{"id": "metrics/event44", "name": "..."}, {"id": "metrics/event48", "name": "..."}], "dimension": null, "dateRange": "last7days", "chartType": "line", "limit": null}`;

    // Arricchisci con documentazione RAG (business logic)
    return ragService.enrichPrompt(basePrompt, query);
  }

  validateInterpretation(interpretation) {
    // Valida solo il formato dei dati, non più la configurazione

    // Normalizza metric: accetta sia oggetto singolo che array
    if (interpretation.metric) {
      const metrics = Array.isArray(interpretation.metric)
        ? interpretation.metric
        : [interpretation.metric];
      interpretation.metric = metrics.filter(m => m && m.id);
      if (interpretation.metric.length === 0) interpretation.metric = null;
    }

    // Valida che dimension abbia un ID valido
    if (interpretation.dimension && !interpretation.dimension.id) {
      interpretation.dimension = null;
    }

    // Valida dateRange
    const validRanges = ['today', 'yesterday', 'last7days', 'last30days', 'last90days'];
    const isDynamicRange = /^last\d+days$/.test(interpretation.dateRange);

    if (!validRanges.includes(interpretation.dateRange) && !isDynamicRange) {
      interpretation.dateRange = 'last30days';
    }

    // Valida chartType
    const validChartTypes = ['pie', 'bar', 'line', 'doughnut'];
    if (interpretation.chartType && !validChartTypes.includes(interpretation.chartType)) {
      interpretation.chartType = null;
    }

    // Valida limit
    if (interpretation.limit) {
      const limitNum = parseInt(interpretation.limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        interpretation.limit = null;
      } else {
        interpretation.limit = limitNum;
      }
    }

    // Se non specificato, rileva da fallback
    if (!interpretation.chartType) {
      interpretation.chartType = this.detectChartType(''); // Sarà null
    }
    if (!interpretation.limit) {
      interpretation.limit = this.detectLimit(''); // Sarà null
    }

    return interpretation;
  }

  detectTimeGranularity(query) {
    const lowerQuery = query.toLowerCase();

    // Mappa keywords a dimensioni temporali Adobe Analytics
    // Le keywords sono ordinate per specificità (più specifiche prima)
    const timeKeywords = [
      {
        // Hour - keywords molto specifiche per evitare conflitti
        keywords: ['dettaglio orario', 'breakdown orario', 'orario', 'oraria', 'hourly', 'ogni ora', 'per ora', 'hour by hour'],
        dimension: { id: 'variables/daterangehour', name: 'Hour' }
      },
      {
        // Day - solo keywords contestuali, NON "giorni" generico
        keywords: ['dettaglio giornaliero', 'breakdown giornaliero', 'giornaliero', 'giornaliera', 'daily', 'ogni giorno', 'per giorno', 'day by day'],
        dimension: { id: 'variables/daterangeday', name: 'Day' }
      },
      {
        // Week - keywords specifiche
        keywords: ['dettaglio settimanale', 'breakdown settimanale', 'settimanale', 'weekly', 'ogni settimana', 'per settimana', 'week by week'],
        dimension: { id: 'variables/daterangeweek', name: 'Week' }
      },
      {
        // Month - keywords specifiche
        keywords: ['dettaglio mensile', 'breakdown mensile', 'mensile', 'monthly', 'ogni mese', 'per mese', 'month by month'],
        dimension: { id: 'variables/daterangemonth', name: 'Month' }
      }
    ];

    // Cerca corrispondenze partendo dalle più specifiche
    for (const config of timeKeywords) {
      for (const keyword of config.keywords) {
        if (lowerQuery.includes(keyword)) {
          console.log(`Detected time granularity: ${config.dimension.name} (matched: "${keyword}")`);
          return config.dimension;
        }
      }
    }

    return null;
  }

  detectChartType(query) {
    const lowerQuery = query.toLowerCase();

    // Mappa keywords a tipi di grafico Chart.js
    const chartKeywords = [
      { keywords: ['torta', 'pie', 'pizza', 'cerchio'], type: 'pie' },
      { keywords: ['barre', 'bar', 'colonne', 'istogramma'], type: 'bar' },
      { keywords: ['linea', 'line', 'andamento', 'trend'], type: 'line' },
      { keywords: ['doughnut', 'ciambella'], type: 'doughnut' }
    ];

    for (const config of chartKeywords) {
      for (const keyword of config.keywords) {
        if (lowerQuery.includes(keyword)) {
          console.log(`Detected chart type: ${config.type} (matched: "${keyword}")`);
          return config.type;
        }
      }
    }

    // Default: usa line per time series, bar per altre dimensioni
    return null; // Sarà determinato in base alla dimensione
  }

  detectLimit(query) {
    const lowerQuery = query.toLowerCase();

    // Pattern per estrarre il limite di risultati
    const limitPatterns = [
      /prim[aei]\s+(\d+)/i,          // "prime 5", "primi 10"
      /top\s+(\d+)/i,                 // "top 5", "top 10"
      /solo\s+(\d+)/i,                // "solo 5"
      /limit[oa]?\s+a\s+(\d+)/i,     // "limita a 10"
      /bastano?\s+(?:i\s+)?prim[aei]\s+(\d+)/i, // "bastano le prime 5"
      /ultim[aei]\s+(\d+)(?!\s*giorni)/i  // "ultimi 5" (ma NON "ultimi 5 giorni")
    ];

    for (const pattern of limitPatterns) {
      const match = query.match(pattern);
      if (match) {
        const limit = parseInt(match[1]);
        console.log(`Detected limit: ${limit} (matched pattern)`);
        return limit;
      }
    }

    return null; // Nessun limite specificato, usa default
  }

  fallbackInterpretation(query) {
    const lowerQuery = query.toLowerCase();

    let metric = null;
    let dimension = null;
    let dateRange = 'last30days';
    let chartType = this.detectChartType(query);
    let limit = this.detectLimit(query);

    // Mapping fisso basato su business logic files
    const metricMappings = [
      // Standard metrics
      { keywords: ['visite', 'visits', 'sessioni', 'accessi'], id: 'metrics/visits', name: 'Visite' },
      { keywords: ['visualizzazioni', 'pageviews', 'page views', 'pagine viste'], id: 'metrics/pageviews', name: 'Visualizzazioni Pagina' },
      { keywords: ['ordini', 'orders', 'transazioni', 'acquisti'], id: 'metrics/orders', name: 'Ordini' },
      { keywords: ['ricavi', 'revenue', 'fatturato'], id: 'metrics/revenue', name: 'Ricavi' },
      { keywords: ['unità', 'units', 'quantità'], id: 'metrics/units', name: 'Unità' },

      // Custom events (da custom-variables.md)
      { keywords: ['registrazioni', 'registrazione completata', 'signup'], id: 'metrics/event1', name: 'Registrazioni Completate' },
      { keywords: ['login standard', 'login effettuati'], id: 'metrics/event2', name: 'Login Standard' },
      { keywords: ['login social', 'social login'], id: 'metrics/event3', name: 'Login Social' },
      { keywords: ['aggiunt al carrello', 'carrello', 'add to cart'], id: 'metrics/event10', name: 'Aggiunte al Carrello' },
      { keywords: ['rimozioni carrello', 'rimozione carrello'], id: 'metrics/event11', name: 'Rimozioni dal Carrello' },
      { keywords: ['checkout iniziati', 'checkout'], id: 'metrics/event12', name: 'Checkout Iniziati' },
      { keywords: ['pagamenti completati', 'pagamento completato'], id: 'metrics/event13', name: 'Pagamenti Completati' },
      { keywords: ['errori pagamento', 'errore pagamento'], id: 'metrics/event20', name: 'Errori Pagamento' },
    ];

    // Trova metrica
    for (const mapping of metricMappings) {
      if (mapping.keywords.some(kw => lowerQuery.includes(kw))) {
        metric = { id: mapping.id, name: mapping.name };
        break;
      }
    }

    // Mapping dimensioni (da business logic files)
    const dimensionMappings = [
      // Standard dimensions
      { keywords: ['pagina', 'page', 'url'], id: 'variables/page', name: 'Pagina' },

      // Custom eVars
      { keywords: ['prodotto', 'prodotti'], id: 'variables/evar1', name: 'Prodotto' },
      { keywords: ['canale marketing', 'canale', 'sorgente'], id: 'variables/evar2', name: 'Canale Marketing' },
      { keywords: ['tipo cliente', 'tipo utente', 'cliente'], id: 'variables/evar3', name: 'Tipo Cliente' },
      { keywords: ['categoria prodotto', 'categoria'], id: 'variables/evar126', name: 'Categoria Prodotto' },
      { keywords: ['metodo pagamento'], id: 'variables/evar5', name: 'Metodo Pagamento' },
      { keywords: ['metodo login'], id: 'variables/evar10', name: 'Metodo Login' },

      // Props
      { keywords: ['sezione sito', 'sezione'], id: 'variables/prop1', name: 'Sezione Sito' },
      { keywords: ['tipo contenuto', 'contenuto'], id: 'variables/prop2', name: 'Tipo Contenuto' },
      { keywords: ['dispositivo', 'device'], id: 'variables/prop10', name: 'Tipo Dispositivo' },
    ];

    // Prima controlla se vuole una dimensione temporale
    const timeGranularity = this.detectTimeGranularity(lowerQuery);
    if (timeGranularity) {
      dimension = {
        id: timeGranularity.id,
        name: timeGranularity.name
      };
    }

    const dimensionIntent = ['per', 'by', 'diviso', 'breakdown', 'suddiviso', 'raggruppato', 'più', 'piu', 'top', 'con', 'dettaglio'];
    const hasDimensionIntent = dimensionIntent.some(kw => lowerQuery.includes(kw));

    if (hasDimensionIntent && !dimension) {
      for (const mapping of dimensionMappings) {
        if (mapping.keywords.some(kw => lowerQuery.includes(kw))) {
          dimension = { id: mapping.id, name: mapping.name };
          break;
        }
      }
    }

    // Parsing del date range
    if (lowerQuery.includes('oggi') || lowerQuery.includes('today')) {
      dateRange = 'today';
    } else if (lowerQuery.includes('ieri') || lowerQuery.includes('yesterday')) {
      dateRange = 'yesterday';
    } else {
      // Prova a estrarre un numero specifico di giorni (es: "ultimi 2 giorni", "last 5 days")
      const daysMatch = lowerQuery.match(/ultim[aeio]\s+(\d+)\s*(giorni|gg)/i) ||
                        lowerQuery.match(/last\s+(\d+)\s*days?/i);

      if (daysMatch) {
        const numDays = parseInt(daysMatch[1]);
        dateRange = `last${numDays}days`;
      } else if (lowerQuery.match(/7\s*(giorni|gg|days?)/i) || lowerQuery.includes('settimana') || lowerQuery.includes('week')) {
        dateRange = 'last7days';
      } else if (lowerQuery.match(/90\s*(giorni|gg|days?)/i) || lowerQuery.match(/3\s*mesi/i)) {
        dateRange = 'last90days';
      } else if (lowerQuery.match(/30\s*(giorni|gg|days?)/i) || lowerQuery.includes('mese') || lowerQuery.includes('month')) {
        dateRange = 'last30days';
      }
    }

    console.log('Fallback interpretation:', {
      metric: metric?.name,
      dimension: dimension?.name,
      dateRange,
      chartType,
      limit
    });

    return { metric, dimension, dateRange, chartType, limit };
  }
}

module.exports = new NLPService();
