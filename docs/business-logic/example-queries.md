# Esempi di Query Complesse

## Query Business Logic

### login

**Query**: "mostrami le login ok con user e password e le login ko con user e password negli ultimi 6 giorni"
**Interpretazione**:
- metrica1: event44
- metrica2: event48
- Dimensione: data
- Mostra conversion rate per ogni step
-- Date range: last6days

**Query**: "mostrami le login ok e ko  con user e password  negli ultimi 2 giorni con dettaglio orario "
**Interpretazione**:
- metrica1: event43
- metrica2: event47
- Dimensione: data e ora
- Mostra conversion rate per ogni step
-- Date range: last2days


### processo di registrazione
**Query**: "mostrami l'andamento degli step del processo di registrazione negli ultimi 5 giorni"
**Interpretazione**:
- metrica1: pageviews
- Dimensione: data
- Mostra conversion rate per ogni step
-- Date range: last6days



### Taglio di Ricarica per Prodotto

**Query**: "qual è la distribuzione dei tagli di ricarica per il prodotto ricarica?" oppure "quanti acquisti per ogni taglio di ricarica?"
**Interpretazione**:
- Metrica: `metrics/orders` (acquisti completati)
- Dimensione primaria: `variables/evar26` (taglio ricarica) — mostra la distribuzione dei tagli
- filterDimension: `variables/product` — il filtro si applica sul prodotto
- searchFilter: "ricarica" — filtra solo i prodotti che contengono "ricarica"
- Date range: last30days

**Logica backend**: cross-dimension filter (2 step)
1. Step 1: lookup `variables/product` CONTAINS "ricarica" → recupera gli itemId dei prodotti ricarica
2. Step 2: report su `variables/evar26` con metricFilters breakdown per quegli itemId → mostra ordini per taglio

**Esempio JSON Claude output**:
```json
{
  "metric": [{"id": "metrics/orders", "name": "Ordini"}],
  "dimension": {"id": "variables/evar26", "name": "Taglio Ricarica"},
  "dateRange": "last30days",
  "searchFilter": "ricarica",
  "filterDimension": "variables/product",
  "segmentId": null,
  "stepOrder": null
}
```

### Analisi Errori

**Query**: "Quanti sono i principali errori di oggi?"
**Interpretazione**:
- Metrica: event56 (errori)
- Dimensione: eVar56 (tipo errore)
- Date range: today

**Query**: "per l'errore <codice errore> visualizzare le pagine in cui si è verificato negli ultimi 2 giorni"
**Interpretazione**:
- Metrica: event56 (errori)
- Dimensione: eVar5 (pagename) — per mostrare le pagine in cui si è verificato l'errore
- searchFilter: "<codice errore>" (valore testuale dell'errore)
- filterDimension: variables/evar56 — il filtro si applica su eVar56 
- Date range: last2days
**Esempio JSON**:
```json
{
  "rsid": "YOUR_REPORT_SUITE_ID",
  "globalFilters": [
    {
      "type": "dateRange",
      "dateRange": "last2days"
    }
  ],
  "metricContainer": {
    "metrics": [
      {
        "id": "metrics/event56"
      }
    ],
    "metricFilters": [
      {
        "id": "filter_evar56",
        "type": "breakdown",
        "dimension": "variables/evar56",
        "itemId": "<codice errore> "
      }
    ]
  },
  "dimension": "variables/evar5",
  "settings": {
    "limit": 1000,
    "page": 0
  }
}
```


esempi, non utilizzare la parte che segue nella business logic

-------------------------------------------------------------------

**Query**: "Quali sono i principali errori di login negli ultimi 7 giorni?"
**Interpretazione**:
- Metrica: event52 (errori login)
- Dimensione: eVar11 (tipo errore)
- Date range: last7days
- Top 5 per frequenza

### Analisi Comportamentali

**Query**: "Quanti nuovi clienti vs ricorrenti hanno fatto acquisti questa settimana?"
**Interpretazione**:
- Metrica: orders
- Dimensione: eVar3 (tipo cliente)
- Date range: last7days
- Segmenta per "Nuovo" vs "Ricorrente"

**Query**: "Da quali sezioni del sito provengono più ordini?"
**Interpretazione**:
- Metrica: orders
- Dimensione: prop1 (sezione sito)
- Date range: last30days
- Mostra conversion rate per sezione

**Query**: "Quante visualizzazioni di prodotto ci sono state prima di ogni acquisto in media?"
**Interpretazione**:
- Metrica: pageviews su /prodotti/*
- Metrica: orders
- Formula: pageviews / orders
- Interpretazione: "Path to purchase"

## Query Multi-Step con Context

**Query**: "Mostrami il percorso completo dalla registrazione al primo acquisto"
**Interpretazione complessa**:
1. Registrazioni: event1
2. Prime login: event2 o event3 (dopo registrazione)
3. Visualizzazioni prodotto: pageviews su /prodotti
4. Aggiunte carrello: event10
5. Primi ordini: orders (filtra solo first-time buyers)

**Metriche da mostrare**:
- Tempo medio registrazione → primo acquisto
- % registrati che acquistano entro 7 giorni
- Conversion rate per canale di acquisizione

**Query**: "Analizza il comportamento degli utenti che abbandonano il carrello"
**Interpretazione complessa**:
1. Identifica utenti con event10 > 0 MA orders = 0
2. Analizza ultime pagine visitate prima dell'uscita
3. Controlla se ci sono stati errori (event20)
4. Segmenta per device (prop10)
5. Calcola tempo medio sul sito

**Insights da cercare**:
- Pagina di uscita più comune
- Errori tecnici durante checkout
- Differenze mobile vs desktop

**Query**: "Qual è l'impatto delle campagne email sulle registrazioni e vendite?"
**Interpretazione complessa**:
1. Filtra traffico dove eVar2 = "Email Campaign"
2. Metriche:
   - Visite totali
   - Registrazioni (event1)
   - Ordini (orders)
   - Ricavi (revenue)
3. Calcola ROI se disponibile costo campagna
4. Confronta con altri canali

## Query con Calcoli Avanzati

**Query**: "Calcola l'Average Order Value per tipo di cliente"
**Interpretazione**:
- Formula: revenue / orders
- Dimensione: eVar3 (tipo cliente)
- Segmenta: Nuovo, Ricorrente, VIP
- Confronta valori

**Query**: "Mostrami il tasso di conversione dall'aggiunta al carrello all'acquisto per categoria"
**Interpretazione**:
- Formula: (orders / event10) * 100
- Dimensione: eVar126 (categoria prodotto)
- Date range: last30days
- Identifica categorie con conversion rate basso

**Query**: "Quanti utenti completano il checkout in meno di 5 minuti?"
**Nota**: Richiede tracking tempo personalizzato
**Interpretazione**:
- Calcola: event12 (checkout start) to orders
- Usa Analytics segments con time constraints
- Benchmark: <5min è ottimale

## Note per l'AI

### Quando usare event vs metric standard
- **event1-99**: Eventi custom business-specific
- **orders, revenue**: Metriche standard e-commerce
- **pageviews, visits**: Metriche traffico standard

### Identificare intent complesso
- Keywords "funnel", "percorso", "journey" → Analisi multi-step
- Keywords "tasso", "rate", "percentuale" → Calcoli ratio
- Keywords "top", "migliori", "peggiori" → Ranking con limit
- Keywords "confronta", "vs" → Multiple metrics/segments

### Mappatura query → variabili
- "registrazioni" → event1
- "login" → event2 (standard) o event3 (social)
- "carrello" → event10 (aggiunte), event11 (rimozioni)
- "checkout" → event12
- "acquisti" / "ordini" → orders metric
- "ricavi" / "fatturato" → revenue metric
- "prodotto" → eVar1
- "canale" / "sorgente" → eVar2
- "tipo cliente" → eVar3
- "categoria" → eVar126


### Analisi Pagename per Processo

**Query**: "pageviews dei pagename del processo di registrazione"
**Interpretazione**:
- Metrica: pageviews
- Dimensione: eVar5 (pagename) → variables/evar5
- searchFilter: "crea account"
- Date range: last30days
- Nota: usare "crea account" per includere esattamente gli step del processo (tutti i 4 step hanno "crea account" nel pagename)





### Registrazione e Login

**Query**: "Quante registrazioni completate negli ultimi 7 giorni per canale di acquisizione?"
**Interpretazione**:
- Metrica: event1 (registrazioni completate)
- Dimensione: eVar2 (canale marketing)
- Date range: last7days
- Ordina per count DESC

**Query**: "Qual è il tasso di verifica email nel funnel di registrazione di oggi?"
**Interpretazione**:
- Step 1: event50 (form inviati)
- Step 2: event1 (registrazioni completate)
- Formula: (event1 / event50) * 100
- Date range: today

**Query**: "Quanti login social vs standard negli ultimi 30 giorni?"
**Interpretazione**:
- Metrica 1: event2 (login standard)
- Metrica 2: event3 (login social)
- Breakdown per eVar10 (metodo login)
- Mostra percentuali

**Query**: "Qual è il tasso di successo dei login oggi?"
**Interpretazione**:
- Tentativi: event51
- Successi: event2 + event3
- Formula: ((event2 + event3) / event51) * 100
- Date range: today


