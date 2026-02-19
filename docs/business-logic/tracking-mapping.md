# Tracking Mapping - Eventi e Variabili

## Mapping Variabili Custom → eVar/Props

Questo documento mappa i nomi "business" delle variabili ai corrispettivi tecnici Adobe Analytics.

### Variabili eVar

| Nome Business | eVar Tecnico | Tipo | Descrizione | Esempi di Valori |
|---------------|--------------|------|-------------|------------------|
| tipo_utente | eVar3 | Conversion | Tipo di cliente | "Nuovo", "Ricorrente", "VIP" |
| canale_marketing | eVar2 | Conversion | Canale di acquisizione | "Email", "Social", "Ricerca Organica" |
| prodotto | eVar1 | Conversion | Nome prodotto | "Ricarica 10€", "Ricarica 20€" |
| categoria_prodotto | eVar126 | Conversion | Categoria merceologica | "Ricariche", "Abbonamenti" |
| metodo_pagamento | eVar5 | Conversion | Metodo di pagamento | "Carta di Credito", "PayPal", "Bonifico" |
| tipo_errore_pagamento | eVar20 | Conversion | Tipo di errore transazione | "Carta scaduta", "Fondi insufficienti" |
| metodo_login | eVar10 | Conversion | Metodo autenticazione | "Standard", "Google", "Facebook" |
| tipo_errore_login | eVar11 | Conversion | Tipo errore login | "Password errata", "Email non trovata" |

### Variabili Props

| Nome Business | Prop Tecnico | Tipo | Descrizione | Esempi di Valori |
|---------------|--------------|------|-------------|------------------|
| sezione_sito | prop1 | Traffic | Sezione principale | "Home", "Ricariche", "Profilo", "Supporto" |
| tipo_contenuto | prop2 | Traffic | Tipologia contenuto | "Articolo", "Video", "Tutorial", "FAQ" |
| user_agent_type | prop10 | Traffic | Tipo dispositivo | "Mobile", "Desktop", "Tablet" |

---

## Mapping PageViews (stateName popolato)

Le visualizzazioni di pagina usano il campo `stateName` come `pageName` in Adobe Analytics.

### Funnel Acquisto - PageViews

| stateName | pageName Adobe | Descrizione | URL Esempio |
|-----------|----------------|-------------|-------------|
| home | Home | Homepage | / |
| product_view | Prodotto: [nome] | Visualizzazione prodotto | /prodotti/ricarica-10 |
| cart_add | Carrello: Aggiunta | Aggiunta al carrello | /carrello/add |
| cart_view | Carrello: Riepilogo | Visualizzazione carrello | /carrello |
| checkout_start | Checkout: Step 1 | Inizio checkout | /checkout/step1 |
| checkout_data | Checkout: Step 2 - Dati | Inserimento dati | /checkout/step2 |
| checkout_payment | Checkout: Step 3 - Pagamento | Selezione pagamento | /checkout/step3 |
| order_confirmed | Ordine Confermato | Conferma ordine | /ordine-confermato |

### Funnel Registrazione - PageViews

| stateName | pageName Adobe | Descrizione | URL Esempio |
|-----------|----------------|-------------|-------------|
| signup_landing | Registrazione: Form | Landing registrazione | /registrazione |
| signup_confirm | Registrazione: Conferma Invio | Form inviato | /registrazione/conferma |
| signup_email_sent | Registrazione: Verifica Email | Email inviata | /registrazione/verifica |
| signup_email_verified | Registrazione: Email Verificata | Email verificata | /verifica-email |
| signup_complete | Registrazione: Completata | Registrazione completata | /benvenuto |

### Funnel Login - PageViews

| stateName | pageName Adobe | Descrizione | URL Esempio |
|-----------|----------------|-------------|-------------|
| login_form | Login: Form | Pagina login | /login |
| login_success | Dashboard | Login riuscito | /dashboard |
| login_error | Login: Error | Login fallito | /login?error=true |

### Altre Pagine

| stateName | pageName Adobe | Descrizione | URL Esempio |
|-----------|----------------|-------------|-------------|
| profile | Profilo: Home | Pagina profilo | /profilo |
| profile_settings | Profilo: Impostazioni | Impostazioni account | /profilo/impostazioni |
| support | Supporto | Centro assistenza | /supporto |
| support_faq | Supporto: FAQ | Domande frequenti | /supporto/faq |

---

## Mapping Eventi Custom (actionName popolato)

Gli eventi custom usano il campo `actionName` e sono mappati a eventi Adobe Analytics specifici.

### Eventi Registrazione/Login

| actionName | Evento Adobe | Nome Evento | Descrizione | Variabili Associate |
|------------|--------------|-------------|-------------|---------------------|
| signup_form_submit | event50 | Form Registrazione Inviato | Form compilato e inviato | eVar2 (canale) |
| signup_complete | event1 | Registrazione Completata | Account attivato | eVar2 (canale), eVar3 (tipo_utente) |
| login_attempt | event51 | Tentativo Login | Click su "Accedi" | - |
| login_success_standard | event2 | Login Standard Riuscito | Login con email/password | eVar10 (metodo_login), eVar3 (tipo_utente) |
| login_success_social | event3 | Login Social Riuscito | Login con Google/FB | eVar10 (metodo_login), eVar3 (tipo_utente) |
| login_error | event52 | Errore Login | Credenziali errate | eVar11 (tipo_errore_login) |
| logout | event54 | Logout | Logout utente | - |

### Eventi Carrello/Acquisto

| actionName | Evento Adobe | Nome Evento | Descrizione | Variabili Associate |
|------------|--------------|-------------|-------------|---------------------|
| add_to_cart | event10 | Aggiunta Carrello | Prodotto aggiunto | eVar1 (prodotto), eVar126 (categoria) |
| remove_from_cart | event11 | Rimozione Carrello | Prodotto rimosso | eVar1 (prodotto) |
| checkout_start | event12 | Checkout Iniziato | Inizio processo checkout | - |
| payment_complete | event13 | Pagamento Completato | Transazione completata | eVar1 (prodotto), eVar5 (metodo_pagamento) |
| payment_error | event20 | Errore Pagamento | Errore transazione | eVar20 (tipo_errore_pagamento) |
| purchase | purchase | Acquisto | Evento standard acquisto | s.products, s.purchaseID |

### Altri Eventi

| actionName | Evento Adobe | Nome Evento | Descrizione | Variabili Associate |
|------------|--------------|-------------|-------------|---------------------|
| video_play | event30 | Video Avviato | Inizio riproduzione video | - |
| video_complete | event31 | Video Completato | Video visto interamente | - |
| download_file | event40 | Download File | File scaricato | - |
| form_error | event53 | Errore Form | Errore validazione form | eVar11 (tipo_errore) |

---

## Regole di Mapping

### PageView vs Event

- **PageView (stateName popolato)**:
  - Traccia cambio di pagina/stato
  - Usa `s.t()` per tracking
  - Popola `s.pageName` con valore di stateName

- **Event Custom (actionName popolato)**:
  - Traccia azioni senza cambio pagina
  - Usa `s.tl()` per tracking
  - Popola `s.events` con evento corrispondente
  - Popola `s.linkTrackEvents` con eventi da tracciare

### Esempio Implementazione

```javascript
// PageView - stateName popolato
if (stateName) {
  s.pageName = mapStateName(stateName); // "product_view" → "Prodotto: Ricarica 10€"
  s.eVar1 = productName; // Se applicabile
  s.t(); // pageview
}

// Event Custom - actionName popolato
if (actionName && !stateName) {
  const eventMapping = {
    'add_to_cart': 'event10',
    'checkout_start': 'event12',
    'signup_complete': 'event1'
  };

  s.linkTrackVars = "events,eVar1,eVar126";
  s.linkTrackEvents = eventMapping[actionName];
  s.events = eventMapping[actionName];
  s.eVar1 = productName; // Se applicabile
  s.tl(this, 'o', actionName);
}
```

---

## Query Utili con Nomi Business

Grazie ai mapping sopra, puoi fare query usando nomi "business":

### Esempi Query
- "Quanti prodotti sono stati aggiunti al carrello?" → Usa event10 (add_to_cart)
- "Qual è il tasso di completamento registrazione?" → event1 / pageviews con stateName="signup_landing"
- "Quanti errori di pagamento ci sono stati?" → Usa event20 (payment_error)
- "Mostrami i login per metodo" → event2 + event3, breakdown per eVar10
- "Qual è il prodotto più venduto?" → orders breakdown per eVar1

### Come il Sistema Interpreta

Quando chiedi "Quanti prodotti sono stati aggiunti al carrello oggi?", il sistema:
1. Riconosce "aggiunti al carrello" dal RAG
2. Mappa a event10 o pageName = "Carrello: Aggiunta"
3. Estrae prodotto da eVar1
4. Costruisce query Adobe Analytics corretta

---

## Note Implementazione

### Priority Mapping
1. Se query menziona nome business → usa mapping per trovare eVar/event
2. Se query menziona pageName specifico → usa stateName mapping
3. Se query menziona evento specifico → usa actionName mapping

### Manutenzione
- Questo file deve essere aggiornato quando aggiungi nuovi eventi o variabili
- Mantieni sincronizzato con i file Excel sorgente
- Testa le query dopo ogni modifica per verificare mapping corretto
