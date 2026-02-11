const fs = require('fs');
const path = require('path');

/**
 * Servizio RAG per includere documentazione Adobe nel prompt
 */
class RAGService {
  constructor() {
    this.docsPath = path.join(__dirname, '../../docs/adobe-analytics');
    this.knowledgeBase = this.loadKnowledgeBase();
    console.log('📚 RAG Service initialized with', Object.keys(this.knowledgeBase).length, 'documents');
  }

  /**
   * Carica la knowledge base dalla cartella docs
   */
  loadKnowledgeBase() {
    const kb = {};
    
    // Knowledge base hardcoded di base
    kb['metrics'] = `
Adobe Analytics Metrics:

- visits: Numero totale di sessioni. Una visita termina dopo 30 minuti di inattività.
- pageviews: Numero totale di pagine visualizzate, include reload.
- orders: Numero di transazioni completate con purchase event.
- revenue: Valore monetario totale delle transazioni.
- units: Quantità di prodotti venduti.
`;

    kb['dimensions'] = `
Adobe Analytics Dimensions:

- page: URL o nome della pagina (dimensione standard, molto performante).
- evarN: eVar custom (1-250), persistono tra pagine secondo configurazione.
- propN: Prop custom (1-75), non persistono, solo per pagina corrente.
- product: Nome del prodotto dalla stringa s.products.

eVar vs Prop:
- eVar: Persistono tra pagine, usale per attribution (es. canale marketing).
- Prop: Solo pagina corrente, usale per dati non persistenti (es. tipo contenuto).
`;

    kb['best_practices'] = `
Adobe Analytics Best Practices:

Performance:
- Usa dimensioni standard (page, product) invece di eVar quando possibile
- Limita i risultati con settings.limit per query veloci
- Evita search su dimensioni con alta cardinalità (es. visitor_id)
- Usa date range brevi per query con filtri complessi

Dimensioni ad Alta Cardinalità:
- page/URL: Può avere milioni di valori, usa sempre search filter
- visitor_id: Mai usare per breakdown, solo per segmenti
`;

    // Carica file esterni se esistono
    if (fs.existsSync(this.docsPath)) {
      try {
        const files = fs.readdirSync(this.docsPath);
        files.forEach(file => {
          if (file.endsWith('.txt') || file.endsWith('.md')) {
            const content = fs.readFileSync(
              path.join(this.docsPath, file), 
              'utf-8'
            );
            const key = file.replace(/\.(txt|md)$/, '');
            kb[key] = content;
          }
        });
        console.log('   📄 Loaded', files.length, 'external documentation files');
      } catch (err) {
        console.warn('   ⚠️  Could not load external docs:', err.message);
      }
    }

    return kb;
  }

  /**
   * Genera documentazione RAG automaticamente dalla configurazione utente
   * @param {object} config - Configurazione JSON con metrics e dimensions
   */
  addUserConfiguration(config) {
    if (!config || !config.metrics || !config.dimensions) {
      return;
    }

    // Genera doc per metriche custom
    const customMetrics = config.metrics
      .map(m => `- ${m.name} (${m.id}): ${m.description}`)
      .join('\n');

    this.knowledgeBase['user_metrics'] = `
USER CUSTOM METRICS:
${customMetrics}
`;

    // Genera doc per dimensioni custom
    const customDimensions = config.dimensions
      .map(d => `- ${d.name} (${d.id}): ${d.description}`)
      .join('\n');

    this.knowledgeBase['user_dimensions'] = `
USER CUSTOM DIMENSIONS:
${customDimensions}
`;

    console.log('   ✅ RAG enriched with user configuration:', 
      config.metrics.length, 'metrics,', 
      config.dimensions.length, 'dimensions'
    );
  }

  /**
   * Cerca documentazione rilevante per una query
   * @param {string} query - Query dell'utente
   * @returns {string} - Documentazione rilevante
   */
  getRelevantDocs(query) {
    const lowerQuery = query.toLowerCase();
    const relevantDocs = [];

    // Cerca keywords che indicano bisogno di documentazione
    const needsMetricInfo = /metrica|metric|visits|pageviews|orders|revenue/i.test(query);
    const needsDimensionInfo = /dimension|evar|prop|pagina|page|prodotto|product/i.test(query);
    const needsPerformance = /lento|slow|performance|timeout|troppo/i.test(query);

    // Aggiungi sempre le custom metrics/dimensions dell'utente se disponibili
    if (this.knowledgeBase['user_metrics']) {
      relevantDocs.push(this.knowledgeBase['user_metrics']);
    }
    if (this.knowledgeBase['user_dimensions']) {
      relevantDocs.push(this.knowledgeBase['user_dimensions']);
    }

    if (needsMetricInfo) {
      relevantDocs.push(this.knowledgeBase['metrics']);
    }

    if (needsDimensionInfo) {
      relevantDocs.push(this.knowledgeBase['dimensions']);
    }

    if (needsPerformance) {
      relevantDocs.push(this.knowledgeBase['best_practices']);
    }

    // Se nessuna keyword specifica, dai le best practices
    if (relevantDocs.length === 0) {
      relevantDocs.push(this.knowledgeBase['best_practices']);
    }

    return relevantDocs.join('\n\n---\n\n').substring(0, 2000); // Limita a 2000 caratteri
  }

  /**
   * Arricchisce il prompt con documentazione rilevante
   * @param {string} basePrompt - Prompt base
   * @param {string} query - Query utente
   * @returns {string} - Prompt arricchito
   */
  enrichPrompt(basePrompt, query) {
    const relevantDocs = this.getRelevantDocs(query);
    
    if (!relevantDocs) {
      return basePrompt;
    }

    return `${basePrompt}

---
ADOBE ANALYTICS DOCUMENTATION (for context):
${relevantDocs}
---

Use this documentation as reference when interpreting the query.`;
  }
}

module.exports = new RAGService();
