const fs = require('fs');
const path = require('path');

/**
 * Servizio RAG per includere documentazione Adobe nel prompt
 */
class RAGService {
  constructor() {
    this.docsPath = path.join(__dirname, '../../docs/adobe-analytics');
    this.businessLogicPath = path.join(__dirname, '../../docs/business-logic');
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
    let totalFilesLoaded = 0;

    // Carica documentazione Adobe Analytics
    if (fs.existsSync(this.docsPath)) {
      try {
        const files = fs.readdirSync(this.docsPath);
        files.forEach(file => {
          if (file.endsWith('.txt') || file.endsWith('.md')) {
            const content = fs.readFileSync(
              path.join(this.docsPath, file),
              'utf-8'
            );
            const key = `adobe_${file.replace(/\.(txt|md)$/, '')}`;
            kb[key] = content;
            totalFilesLoaded++;
          }
        });
      } catch (err) {
        console.warn('   ⚠️  Could not load Adobe docs:', err.message);
      }
    }

    // Carica logica di business
    console.log('   🔍 Checking business logic path:', this.businessLogicPath);
    if (fs.existsSync(this.businessLogicPath)) {
      try {
        const files = fs.readdirSync(this.businessLogicPath);
        const mdFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));

        mdFiles.forEach(file => {
          const content = fs.readFileSync(
            path.join(this.businessLogicPath, file),
            'utf-8'
          );
          const key = `business_${file.replace(/\.(txt|md)$/, '')}`;
          kb[key] = content;
          totalFilesLoaded++;
        });

        if (mdFiles.length > 0) {
          console.log('   💼 Loaded', mdFiles.length, 'business logic files');
        }
      } catch (err) {
        console.warn('   ⚠️  Could not load business logic docs:', err.message);
      }
    } else {
      console.warn('   ⚠️  Business logic path does not exist:', this.businessLogicPath);
    }

    if (totalFilesLoaded > 0) {
      console.log('   📄 Total external files loaded:', totalFilesLoaded);
    }

    return kb;
  }

  /**
   * Cerca documentazione rilevante per una query
   * @param {string} query - Query dell'utente
   * @returns {string} - Documentazione rilevante
   */
  getRelevantDocs(query) {
    const relevantDocs = [];

    // SEMPRE includi i mapping principali (essenziali per interpretare le query)
    if (this.knowledgeBase['business_custom-variables']) {
      relevantDocs.push(this.knowledgeBase['business_custom-variables']);
    }
    if (this.knowledgeBase['business_tracking-mapping']) {
      relevantDocs.push(this.knowledgeBase['business_tracking-mapping']);
    }
    if (this.knowledgeBase['business_segments']) {
      relevantDocs.push(this.knowledgeBase['business_segments']);
    }
    if (this.knowledgeBase['business_standard-variables']) {
      relevantDocs.push(this.knowledgeBase['business_standard-variables']);
    }

    // Keywords per business logic aggiuntivo
    const needsFunnelInfo = /funnel|percorso|journey|abbandono|drop-off|conversion rate|tasso di conversione|tutti gli step|step del|passo del|processo di|fasi del/i.test(query);
    const needsAuthInfo = /registra|login|accedi|autenticaz|sign.?up|sign.?in|verifica email/i.test(query);
    const needsPurchaseInfo = /ricarica|pagamento|acquist|checkout|carrello|ordine|rautomatica|ricarica automatica|ricarica singola/i.test(query);
    const needsExamples = /esempio|example|come faccio|how do i|query per/i.test(query);

    if (needsFunnelInfo && this.knowledgeBase['business_funnels']) {
      relevantDocs.push(this.knowledgeBase['business_funnels']);
    }

    if (needsAuthInfo && this.knowledgeBase['business_authentication-flows']) {
      relevantDocs.push(this.knowledgeBase['business_authentication-flows']);
    }

    if (needsPurchaseInfo && this.knowledgeBase['business_purchase-processes']) {
      relevantDocs.push(this.knowledgeBase['business_purchase-processes']);
    }

    if (needsExamples && this.knowledgeBase['business_example-queries']) {
      relevantDocs.push(this.knowledgeBase['business_example-queries']);
    }

    // Adobe standard documentation (opzionale)
    const needsPerformance = /lento|slow|performance|timeout|troppo/i.test(query);
    if (needsPerformance && this.knowledgeBase['best_practices']) {
      relevantDocs.push(this.knowledgeBase['best_practices']);
    }

    // Limita a 30000 caratteri per includere tutti i file di business logic senza troncature
    return relevantDocs.join('\n\n---\n\n').substring(0, 30000);
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
