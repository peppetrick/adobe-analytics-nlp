# Esempi di Query Complesse

## Query Business Logic

### Funnel di Acquisto

**Query**: "mostrami le login ok con user e password e le login ko con user e password negli ultimi 6 giorni"
**Interpretazione**:
- metrica1: event44
- metrica2: event48
- Dimensione: data
- Mostra conversion rate per ogni step
-- Date range: last6days

**Query**: "Qual è il tasso di abbandono del carrello questa settimana?"
**Interpretazione**:
- Metrica: event10 (aggiunte carrello) vs orders
- Formula: 1 - (orders / event10) * 100
- Date range: last7days

**Query**: "Quanti utenti hanno completato un acquisto dopo aver aggiunto un prodotto al carrello?"
**Interpretazione**:
- Metrica primaria: orders
- Filtro: utenti con event10 > 0
- Mostra anche average order value

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

### Analisi Prodotti

**Query**: "Quali sono i top 10 prodotti più acquistati questo mese?"
**Interpretazione**:
- Metrica: orders
- Dimensione: eVar1 (prodotto)
- Date range: last30days
- Limit: 10
- Ordina per orders DESC

**Query**: "Mostrami i ricavi per categoria di prodotto negli ultimi 7 giorni"
**Interpretazione**:
- Metrica: revenue
- Dimensione: eVar126 (categoria prodotto)
- Date range: last7days
- Ordina per revenue DESC

**Query**: "Quante ricariche da 10€ sono state vendute oggi?"
**Interpretazione**:
- Metrica: orders
- Dimensione: eVar1 (prodotto)
- Filtro search: "Ricarica 10€"
- Date range: today

### Analisi Errori

**Query**: "Quanti errori di pagamento ci sono stati oggi e di che tipo?"
**Interpretazione**:
- Metrica: event20 (errori pagamento)
- Dimensione: eVar20 (tipo errore)
- Date range: today
- Mostra breakdown per tipo

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
