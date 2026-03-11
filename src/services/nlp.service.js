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
    return this.interpretWithHistory(query, []);
  }

  async interpretWithHistory(query, conversationHistory = [], lastContext = null) {
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
        return await this.interpretWithClaudeMultiTurn(query, conversationHistory, lastContext);
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
    const prompt = this.buildSystemPrompt(query);

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
    return this.interpretWithClaudeMultiTurn(query, []);
  }

  async interpretWithClaudeMultiTurn(query, conversationHistory = [], lastContext = null) {
    const systemPrompt = this.buildSystemPrompt(query, lastContext);

    // Costruisci messages: history pregressa + query corrente
    const messages = [
      ...conversationHistory.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: query }
    ];

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.claudeModel,
        max_tokens: 1000,
        temperature: 0,
        system: systemPrompt,
        messages
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 15000
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

    const result = JSON.parse(text);
    const validated = this.validateInterpretation(result);
    return this.applyDeterministicOverrides(validated, query);
  }

  applyDeterministicOverrides(interpretation, query) {
    if (interpretation.needsClarification || interpretation.type === 'info') return interpretation;

    const timeGranularity = this.detectTimeGranularity(query);
    if (timeGranularity) {
      if (!interpretation.dimension || !['variables/daterangehour','variables/daterangeday','variables/daterangeweek','variables/daterangemonth'].includes(interpretation.dimension?.id)) {
        console.log(`⚡ Deterministic override: dimension → ${timeGranularity.id} (matched in query)`);
        interpretation.dimension = timeGranularity;
      } else if (interpretation.dimension.id !== timeGranularity.id) {
        console.log(`⚡ Deterministic override: dimension ${interpretation.dimension.id} → ${timeGranularity.id} (query keyword wins)`);
        interpretation.dimension = timeGranularity;
      }
    }

    return interpretation;
  }

  buildSystemPrompt(query, lastContext = null) {
    const basePrompt = `You are an Adobe Analytics query interpreter for an Italian telecom company. Your job is to analyze natural language queries and map them to Adobe Analytics metrics and dimensions.

You MUST respond with ONLY a JSON object — no markdown, no explanations.

## Three possible response formats:

### 1. If the query is clear and unambiguous → return interpretation:
Single metric:   {"metric": {"id": "metrics/...", "name": "..."}, "dimension": {"id": "variables/...", "name": "..."} or null, "dateRange": "last30days", "chartType": null, "limit": null, "searchFilter": null, "stepOrder": null}
Multiple metrics: {"metric": [{"id": "metrics/event83", "name": "..."}, {"id": "metrics/event84", "name": "..."}], "dimension": null, "dateRange": "last7days", "chartType": "line", "limit": null, "searchFilter": null, "stepOrder": null}
searchFilter: string or array of strings to filter dimension values. Three modes depending on query type:
- FUNNEL/STEP queries (stepOrder is also set): use FULL pagenames WITH colons as-is, e.g. ["MYTIM:Ricarica:ricarica singola:ricarica singola", "MYTIM:Ricarica:ricarica OK:ricarica OK"]. Do NOT truncate — the backend uses MATCH (regex) which handles colons correctly.
- TIME DIMENSION queries (dimension=daterangehour/day/week/month AND filterDimension is set): use FULL pagenames WITH colons as-is, e.g. "MYTIM:Offerte disponibili:Offerte:Offerte disponibili". The backend uses MATCH (exact regex) for the lookup step and handles colons correctly.
- All other queries (non-temporal dimension, no stepOrder): use only the LAST segment after the last ':' because colons break CONTAINS, e.g. "MYTIM:section:page" → use "page". Set to null if no filter needed.
filterDimension: REQUIRED when dimension is temporal (daterangeday/hour/week/month) AND searchFilter is set. Also REQUIRED when filtering on a different dimension than the primary. Specifies which dimension ID to filter on. Examples: "variables/evar5" for pagename/page filters; "variables/evar56" for error CODE filters (short identifiers like "Generic_Error", "NetworkError" — no spaces, often with underscore); "variables/evar57" for error DESCRIPTION filters (long human-readable messages like "Impossibile completare..."). Set to null when no cross-dimension filter is needed.
stepOrder: REQUIRED when the query asks for "all steps" or "funnel" of a process. Array of strings in the CORRECT sequential order of the funnel steps (same values as searchFilter but ordered). Used to sort results in step order instead of metric value order. Set to null when not a funnel query.
segmentId: Adobe Analytics segment ID to apply globally to the report. Look up the correct ID in the segments.md documentation provided above. Use ONLY IDs listed there — do NOT invent IDs. Set to null if no segment is requested or if the requested segment is not in the list.
previousPageFilter: Use ONLY when user asks which pages come AFTER page X in the navigation flow (e.g. "pagine che seguono", "pagine successive a", "flusso di navigazione dopo", "dopo la pagina"). Set to the EXACT full pagename keeping all colons (e.g. "MYTIM:Ricarica:ricarica singola:ricarica singola"). When previousPageFilter is set: dimension MUST be variables/evar5, searchFilter MUST be null, filterDimension MUST be null. Set to null for any other query type.

### 2. If the query is ambiguous (multiple possible metrics/dimensions match) → ask for clarification:
{"needsClarification": true, "question": "Domanda breve in italiano?", "options": ["Opzione A (eventXX)", "Opzione B (eventYY)", "Opzione C (eventZZ)"]}

### 3. If the query is a question about business logic (NOT a report request) → answer directly:
{"type": "info", "answer": "Risposta chiara e concisa in italiano basata sulla documentazione di business logic"}
Use format 3 for questions like: "cosa misura event47?", "quali pagine fanno parte del processo di registrazione?", "qual è la differenza tra event44 e event48?", "come funziona il processo di login?", "cosa sono le iniziative?", ecc.

## When to ask for clarification:
- The user mentions a business term that maps to 2+ different events (e.g. "login KO" → event47, event48, event84)
- The user mentions a dimension that could be multiple eVars
- NEVER ask if the query is already explicit (e.g. "event83", "login KO con token")

## Adobe Analytics format:
- Metrics: "metrics/visits", "metrics/visitors" (unique visitors), "metrics/pageviews", "metrics/orders", "metrics/revenue", "metrics/event1", etc.
- NOTE: use "metrics/visitors" for unique visitors (NOT "metrics/uniquevisitors")
- Dimensions: "variables/page", "variables/evar1", "variables/daterangeday", "variables/daterangehour", "variables/daterangeweek", "variables/daterangemonth", etc.
- Pagename dimension: variables/evar5 (copia del pagename, usala per "pagename", "pagine", "pages", "schermata")
- Time granularity: CRITICAL — these exact phrases ALWAYS mean hourly regardless of the date range in the query:
  - "orario", "ogni ora", "dettaglio orario", "profilo orario", "breakdown orario", "per ora", "hourly" → variables/daterangehour
  - "giornaliero", "dettaglio giornaliero", "daily", "ogni giorno" → variables/daterangeday
  - "settimanale", "weekly", "ogni settimana" → variables/daterangeweek
  - "mensile", "monthly", "ogni mese" → variables/daterangemonth
  - NOTE: "ultimi 2 giorni con dettaglio orario" means dateRange=last2days + dimension=daterangehour (NOT daterangeday). The date range and time granularity are INDEPENDENT.
- dateRange: "today", "yesterday", "last7days", "last30days", "last90days", "lastXdays"
- chartType: "pie", "bar", "line", "doughnut", or null (auto)
- limit: number or null
- searchFilter: keyword string to filter dimension values with CONTAINS, or null

## Rules:
1. Use the business logic documentation to map Italian terms to Adobe Analytics IDs
2. If the conversation history shows a previous clarification question, use the user's answer to resolve it
3. Default dateRange: "last30days"
4. If no dimension mentioned: dimension = null
5. When the user asks about "pagine/pagename di un processo", use dimension=variables/evar5 and set searchFilter to the SPECIFIC pattern from the business logic docs to avoid matching unrelated pages (es. for registration process use "registrazione:crea account" NOT just "registrazione")
6. FUNNEL RULE (CRITICAL): When the query asks for steps/funnel/processo of a known process (e.g. "step del processo di registrazione", "andamento degli step del processo"), you MUST set BOTH searchFilter AND stepOrder to the specific array from funnels.md — even if the dimension is temporal (daterangeday, etc.). NEVER set searchFilter=null for a funnel/step query. Example for registration: searchFilter=["inserimento user e password","inserimento linea","inserimento codice otp sms","account registrato"], stepOrder=same array
7. DEFAULT METRIC BY DIMENSION: some dimensions have a natural default metric — always use it when no metric is explicitly specified: eVar56 (error code) → metrics/event56; eVar57 (error description) → metrics/event56. Never use metrics/pageviews when the dimension is eVar56 or eVar57.
8. NEXT PAGE FLOW: when user asks which pages follow/come after a specific page in navigation ("pagine che seguono", "pagine successive", "flusso di navigazione dopo", "dopo la pagina X"), set previousPageFilter to the exact full pagename with all colons intact. Do NOT use searchFilter in this case. dimension=variables/evar5, metric=metrics/pageviews (unless specified otherwise).`;

    // Aggiungi contesto follow-up se disponibile
    let prompt = basePrompt;
    if (lastContext) {
      prompt += `

## PREVIOUS QUERY CONTEXT (for follow-up support)
Previous user query: "${lastContext.query}"
Previous interpretation:
${JSON.stringify(lastContext.interpretation, null, 2)}

FOLLOW-UP RULE: If the current query is a refinement or continuation of the previous one (e.g. "e con dettaglio orario", "mostrami solo ieri", "aggiungi anche X", "stesso report ma per l'ultimo mese", "e per gli errori?"), inherit ALL unspecified fields from the previous interpretation above, and only override the fields explicitly changed by the new query. Return a complete valid interpretation JSON.`;
    }

    // Arricchisci con documentazione RAG (business logic)
    return ragService.enrichPrompt(prompt, query);
  }

  validateInterpretation(interpretation) {
    // Passa info e clarification senza validazione
    if (interpretation.needsClarification === true) return interpretation;
    if (interpretation.type === 'info') return interpretation;

    // Valida solo il formato dei dati, non più la configurazione

    // Normalizza metric: accetta sia oggetto singolo che array, anche stringhe bare ("metrics/pageviews")
    if (interpretation.metric) {
      const metrics = Array.isArray(interpretation.metric)
        ? interpretation.metric
        : [interpretation.metric];
      interpretation.metric = metrics
        .map(m => typeof m === 'string' ? { id: m, name: m.split('/').pop() } : m)
        .filter(m => m && m.id);
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

    // Valida stepOrder: deve essere un array di stringhe non vuote
    if (interpretation.stepOrder) {
      if (!Array.isArray(interpretation.stepOrder) || interpretation.stepOrder.length === 0) {
        interpretation.stepOrder = null;
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
        keywords: ['dettaglio orario', 'profilo orario', 'breakdown orario', 'orario', 'oraria', 'hourly', 'ogni ora', 'per ora', 'hour by hour'],
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

    return this.validateInterpretation({ metric, dimension, dateRange, chartType, limit });
  }
}

module.exports = new NLPService();
