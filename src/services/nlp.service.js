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

  async interpretQuery(query, userConfig) {
    if (this.useLocal) {
      try {
        return await this.interpretWithOllama(query, userConfig);
      } catch (error) {
        console.error('Ollama error:', error.message);
        console.log('Falling back to pattern matching...');
        return this.fallbackInterpretation(query, userConfig);
      }
    } else if (this.apiKey && this.apiKey !== 'your_anthropic_api_key_here') {
      try {
        return await this.interpretWithClaude(query, userConfig);
      } catch (error) {
        console.error('Claude API error:', error.response?.data || error.message);
        console.log('Falling back to pattern matching...');
        return this.fallbackInterpretation(query, userConfig);
      }
    }
    
    // Fallback: pattern matching
    return this.fallbackInterpretation(query, userConfig);
  }

  async interpretWithOllama(query, userConfig) {
    const prompt = this.buildPrompt(query, userConfig);
    
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
    return this.validateInterpretation(interpretation, userConfig);
  }

  async interpretWithClaude(query, userConfig) {
    const prompt = this.buildPrompt(query, userConfig);
    
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
    return this.validateInterpretation(interpretation, userConfig);
  }

  buildPrompt(query, config) {
    const basePrompt = `You are an Adobe Analytics query interpreter. Analyze the user's natural language query and identify:

1. **metric**: The metric they want to analyze (REQUIRED)
2. **dimension**: The dimension to break down by (OPTIONAL - only if explicitly mentioned)
3. **dateRange**: The time period to analyze

Available Metrics:
${JSON.stringify(config.metrics, null, 2)}

Available Dimensions:
${JSON.stringify(config.dimensions, null, 2)}

Valid dateRange values:
- "today" (oggi, today)
- "yesterday" (ieri, yesterday)
- "last7days" (ultimi 7 giorni, ultima settimana, last week)
- "last30days" (ultimi 30 giorni, ultimo mese, last month, default)
- "last90days" (ultimi 90 giorni, ultimi 3 mesi)

User Query: "${query}"

IMPORTANT RULES:
1. Match based on both "name" and "description" fields
2. Be flexible with Italian language variations (visits = visite, ordini = orders)
3. If no dimension is mentioned, set dimension to null
4. Use "last30days" as default dateRange if not specified

CRITICAL: Respond with ONLY the JSON object, NO markdown, NO explanations.
Format: {"metric": {"id": "metrics/...", "name": "..."}, "dimension": {"id": "evar...", "name": "..."}, "dateRange": "last30days"}`;

    // Arricchisci con documentazione RAG
    return ragService.enrichPrompt(basePrompt, query);
  }

  validateInterpretation(interpretation, config) {
    if (interpretation.metric) {
      const metricExists = config.metrics.some(m => m.id === interpretation.metric.id);
      if (!metricExists) {
        interpretation.metric = null;
      }
    }

    if (interpretation.dimension) {
      const dimensionExists = config.dimensions.some(d => d.id === interpretation.dimension.id);
      if (!dimensionExists) {
        interpretation.dimension = null;
      }
    }

    const validRanges = ['today', 'yesterday', 'last7days', 'last30days', 'last90days'];
    if (!validRanges.includes(interpretation.dateRange)) {
      interpretation.dateRange = 'last30days';
    }

    return interpretation;
  }

  fallbackInterpretation(query, config) {
    const lowerQuery = query.toLowerCase();
    
    let metric = null;
    let dimension = null;
    let dateRange = 'last30days';

    const metricKeywords = {
      'ordini': ['ordini', 'acquisti', 'acquistati', 'comprati', 'venduti', 'vendite', 'transazioni'],
      'ricavi': ['ricavi', 'revenue', 'fatturato', 'guadagno', 'incasso'],
      'visite': ['visite', 'visits', 'sessioni', 'accessi'],
      'visualizzazioni': ['visualizzazioni', 'pageviews', 'page views', 'pagine viste', 'views'],
      'conversioni': ['conversioni', 'conversions', 'lead', 'obiettivi'],
      'rimbalzo': ['rimbalzo', 'bounce', 'bounces']
    };

    for (const m of config.metrics) {
      const nameLower = m.name.toLowerCase();
      const descLower = m.description.toLowerCase();
      
      if (lowerQuery.includes(nameLower)) {
        metric = m;
        break;
      }
      
      for (const [key, keywords] of Object.entries(metricKeywords)) {
        if (keywords.some(kw => lowerQuery.includes(kw))) {
          if (nameLower.includes(key) || descLower.includes(key)) {
            metric = m;
            break;
          }
        }
      }
      
      if (metric) break;
      
      const descWords = descLower.split(' ').filter(w => w.length > 5);
      if (descWords.some(word => lowerQuery.includes(word))) {
        metric = m;
        break;
      }
    }

    const dimensionKeywords = {
      'prodotto': ['prodotto', 'prodotti', 'articolo', 'articoli', 'item'],
      'categoria': ['categoria', 'categorie'],
      'canale': ['canale', 'canali', 'sorgente', 'source'],
      'dispositivo': ['dispositivo', 'device', 'mobile', 'desktop', 'tablet'],
      'pagina': ['pagina', 'page', 'url'],
      'campagna': ['campagna', 'campaign'],
      'città': ['città', 'city', 'citta'],
      'cliente': ['cliente', 'clienti', 'customer', 'utente', 'utenti']
    };

    const dimensionIntent = ['per', 'by', 'diviso', 'breakdown', 'suddiviso', 'raggruppato', 'più', 'piu', 'top'];
    const hasDimensionIntent = dimensionIntent.some(kw => lowerQuery.includes(kw));
    
    if (hasDimensionIntent) {
      for (const d of config.dimensions) {
        const nameLower = d.name.toLowerCase();
        const descLower = d.description.toLowerCase();
        
        if (lowerQuery.includes(nameLower)) {
          dimension = d;
          break;
        }
        
        for (const [key, keywords] of Object.entries(dimensionKeywords)) {
          if (keywords.some(kw => lowerQuery.includes(kw))) {
            if (nameLower.includes(key) || descLower.includes(key)) {
              dimension = d;
              break;
            }
          }
        }
        
        if (dimension) break;
      }
    }

    if (lowerQuery.includes('oggi') || lowerQuery.includes('today')) {
      dateRange = 'today';
    } else if (lowerQuery.includes('ieri') || lowerQuery.includes('yesterday')) {
      dateRange = 'yesterday';
    } else if (lowerQuery.match(/7\s*(giorni|gg|days?)/i) || lowerQuery.includes('settimana') || lowerQuery.includes('week')) {
      dateRange = 'last7days';
    } else if (lowerQuery.match(/90\s*(giorni|gg|days?)/i) || lowerQuery.match(/3\s*mesi/i)) {
      dateRange = 'last90days';
    } else if (lowerQuery.match(/30\s*(giorni|gg|days?)/i) || lowerQuery.includes('mese') || lowerQuery.includes('month')) {
      dateRange = 'last30days';
    }

    console.log('Fallback interpretation:', { 
      metric: metric?.name, 
      dimension: dimension?.name, 
      dateRange 
    });

    return { metric, dimension, dateRange };
  }
}

module.exports = new NLPService();
