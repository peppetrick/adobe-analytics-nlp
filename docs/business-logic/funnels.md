# Funnel e Processi

## Funnel di Acquisto (Purchase Funnel)

**Nota**: Gli step del funnel sono identificati principalmente tramite `pageName` distinti per ogni fase.

### Step 1: Visualizzazione Prodotto
- **pageName**: `"Prodotto: [Nome Prodotto]"` o `"Dettaglio Prodotto"`
- **Trigger**: Pagina prodotto caricata
- **URL**: /prodotti/* o /dettaglio-prodotto
- **Metrica**: pageviews con pageName contiene "Prodotto"
- **eVar1**: Nome prodotto visualizzato
- **Query**: "Mostrami le visualizzazioni prodotto degli ultimi 7 giorni"

### Step 2: Aggiunta al Carrello
- **pageName**: `"Carrello: Aggiunta"` o `"Add to Cart"`
- **Trigger**: Click su "Aggiungi al Carrello"
- **Evento**: event10 (opzionale, usato come conferma)
- **Metrica**: pageviews con pageName = "Carrello: Aggiunta"
- **eVar1**: Prodotto aggiunto
- **Drop-off tipico**: 40-60%
- **Query**: "Quanti prodotti sono stati aggiunti al carrello oggi?"

### Step 3: Visualizzazione Carrello
- **pageName**: `"Carrello: Riepilogo"` o `"Carrello"`
- **Trigger**: Accesso a pagina riepilogo carrello
- **URL**: /carrello
- **Metrica**: pageviews con pageName = "Carrello: Riepilogo"
- **Note**: Alcuni utenti aggiungono multipli prodotti prima di visualizzare il carrello
- **Query**: "Quanti utenti hanno visualizzato il carrello?"

### Step 4: Inizio Checkout
- **pageName**: `"Checkout: Step 1"` o `"Checkout Iniziato"`
- **Trigger**: Click "Procedi al Checkout"
- **URL**: /checkout o /checkout/step1
- **Metrica**: pageviews con pageName contiene "Checkout"
- **eVar5**: Metodo di pagamento selezionato (popolato negli step successivi)
- **Drop-off tipico**: 20-30%
- **Query**: "Quanti checkout sono stati iniziati questa settimana?"

### Step 4b: Checkout - Dati Utente (Opzionale)
- **pageName**: `"Checkout: Step 2 - Dati"`
- **Trigger**: Compilazione dati personali
- **URL**: /checkout/step2
- **Metrica**: pageviews con pageName = "Checkout: Step 2 - Dati"

### Step 4c: Checkout - Pagamento (Opzionale)
- **pageName**: `"Checkout: Step 3 - Pagamento"`
- **Trigger**: Selezione metodo pagamento
- **URL**: /checkout/step3
- **Metrica**: pageviews con pageName = "Checkout: Step 3 - Pagamento"
- **eVar5**: Metodo pagamento (es. "Carta di Credito", "PayPal")

### Step 5: Pagamento Completato
- **pageName**: `"Ordine Confermato"` o `"Thank You Page"`
- **Trigger**: Conferma pagamento riuscito
- **URL**: /ordine-confermato o /thank-you
- **Evento**: purchase (standard Adobe)
- **Metrica**: pageviews con pageName = "Ordine Confermato" + orders
- **Revenue**: Valore transazione
- **eVar1**: Prodotti acquistati
- **Drop-off tipico**: 10-15%
- **Query**: "Quanti ordini sono stati completati oggi?"

### KPI Funnel Acquisto
- **Conversion Rate (CR)**: (pageName = "Ordine Confermato") / (pageName contiene "Prodotto")
- **Cart Abandonment Rate**: 1 - (orders / pageviews con pageName = "Carrello: Aggiunta")
- **Checkout Abandonment**: 1 - (orders / pageviews con pageName contiene "Checkout")
- **Average Order Value (AOV)**: revenue / orders
- **Checkout Completion Rate**: (pageName = "Ordine Confermato") / (pageName = "Checkout: Step 1")

## Funnel di Registrazione (Sign-up Funnel)

**Nota**: Gli step del funnel sono identificati principalmente tramite `pageName` distinti per ogni fase.

### Step 1: Landing Registrazione
- **pageName**: `"Registrazione: Form"` o `"Sign Up"`
- **Trigger**: Pagina registrazione caricata
- **URL**: /registrazione o /signup
- **Metrica**: pageviews con pageName = "Registrazione: Form"
- **eVar2**: Canale acquisizione (es. "Email Campaign", "Google Ads", "Direct")
- **Query**: "Quanti utenti hanno visualizzato la pagina di registrazione oggi?"

### Step 2: Form Inviato
- **pageName**: `"Registrazione: Conferma Invio"` o `"Sign Up Submitted"`
- **Trigger**: Click "Registrati" con form valido (POST success)
- **URL**: /registrazione/conferma (pagina intermedia)
- **Metrica**: pageviews con pageName = "Registrazione: Conferma Invio"
- **Evento**: event50 (opzionale, custom: form_submitted)
- **Validazioni**: Email, password, consenso privacy
- **Drop-off tipico**: 30-40%
- **Query**: "Quanti form di registrazione sono stati inviati questa settimana?"

### Step 3: Email Inviata
- **pageName**: `"Registrazione: Verifica Email"`
- **Trigger**: Sistema invia email verifica (pagina informativa)
- **URL**: /registrazione/verifica-email-inviata
- **Metrica**: pageviews con pageName = "Registrazione: Verifica Email"
- **Note**: Mostra messaggio "Controlla la tua email per verificare l'account"
- **Query**: "Quanti utenti hanno ricevuto email di verifica?"

### Step 4: Email Cliccata
- **pageName**: `"Registrazione: Email Verificata"` o `"Email Confirmed"`
- **Trigger**: Click su link in email, token validato
- **URL**: /verifica-email?token=* o /email-verified
- **Metrica**: pageviews con pageName = "Registrazione: Email Verificata"
- **Drop-off tipico**: 20-30%
- **Query**: "Quanti utenti hanno cliccato il link di verifica email?"

### Step 5: Registrazione Completata
- **pageName**: `"Registrazione: Completata"` o `"Welcome"`
- **Trigger**: Token validato, account attivo, auto-login
- **URL**: /benvenuto o /registrazione/completata
- **Evento**: event1 (Registrazione completata)
- **Metrica**: pageviews con pageName = "Registrazione: Completata"
- **eVar3**: Tipo cliente = "Nuovo"
- **eVar2**: Canale acquisizione (persiste)
- **Query**: "Quante registrazioni sono state completate oggi?"

### KPI Funnel Registrazione
- **Sign-up Rate**: (pageName = "Registrazione: Completata") / (pageName = "Registrazione: Form")
- **Form Submission Rate**: (pageName = "Registrazione: Conferma Invio") / (pageName = "Registrazione: Form")
- **Email Verification Rate**: (pageName = "Registrazione: Email Verificata") / (pageName = "Registrazione: Conferma Invio")
- **Completion Rate after Email**: (pageName = "Registrazione: Completata") / (pageName = "Registrazione: Email Verificata")
- **Drop-off at Form**: 1 - (Form submission / Landing views)
- **Drop-off at Email**: 1 - (Email verified / Forms submitted)

## Funnel di Login (Sign-in Funnel)

**Nota**: Gli step del funnel sono identificati principalmente tramite `pageName` distinti per ogni fase.

### Step 1: Landing Login
- **pageName**: `"Login: Form"` o `"Sign In"`
- **Trigger**: Pagina login caricata
- **URL**: /login o /signin
- **Metrica**: pageviews con pageName = "Login: Form"
- **Query**: "Quanti utenti hanno visualizzato la pagina di login oggi?"

### Step 2: Login Riuscito - Standard
- **pageName**: `"Login: Success"` o `"Dashboard"` (dopo login)
- **Trigger**: Autenticazione valida con email/password, redirect a dashboard
- **URL**: /dashboard o /home
- **Evento**: event2 (login standard success)
- **Metrica**: pageviews con pageName = "Dashboard" + event2
- **eVar10**: Metodo login = "Standard"
- **eVar3**: Tipo utente ("Nuovo", "Ricorrente")
- **Query**: "Quanti login standard sono stati effettuati oggi?"

### Step 3: Login Riuscito - Social
- **pageName**: `"Login: Success Social"` o `"Dashboard"` (dopo social login)
- **Trigger**: Autenticazione valida tramite Google/Facebook, redirect a dashboard
- **URL**: /dashboard o /home
- **Evento**: event3 (login social success)
- **Metrica**: pageviews con pageName = "Dashboard" + event3
- **eVar10**: Metodo login ("Google", "Facebook", "Apple")
- **eVar3**: Tipo utente
- **Query**: "Quanti login social sono stati effettuati questa settimana?"

### Step 4: Login Fallito
- **pageName**: `"Login: Error"` o `"Login: Form"` (rimane sulla stessa pagina)
- **Trigger**: Credenziali errate, pagina ricaricata con errore
- **URL**: /login?error=true
- **Evento**: event52 (login error)
- **Metrica**: pageviews con pageName = "Login: Error" o event52
- **eVar11**: Tipo errore ("Password errata", "Email non trovata", "Account bloccato", "Troppi tentativi")
- **Query**: "Quanti errori di login ci sono stati oggi?"

### KPI Funnel Login
- **Login Success Rate**: (pageName = "Dashboard" con event2 o event3) / (pageName = "Login: Form")
- **Standard Login Success**: (pageName = "Dashboard" con event2) / (pageName = "Login: Form")
- **Social Login Success**: (pageName = "Dashboard" con event3) / (pageName = "Login: Form")
- **Error Rate**: event52 / (pageName = "Login: Form")
- **Social Login %**: event3 / (event2 + event3)
- **Conversion to Dashboard**: (pageName = "Dashboard") / (pageName = "Login: Form")

## Note di Analisi

### Best Practices per Analisi Funnel
1. **Usa segmenti sequenziali** per analisi accurate step-by-step
2. **Confronta periodi** per identificare trend (WoW, MoM)
3. **Segmenta per device** (mobile vs desktop) - mobile ha drop-off più alto
4. **Analizza per canale** - social ha CR diverso da email
5. **Monitora tempi** - funnel troppo lento aumenta abbandono

### Drop-off Critici da Monitorare
- Carrello → Checkout: Se >40%, problema UX o prezzi
- Checkout → Pagamento: Se >20%, problema form o fiducia
- Form Registrazione → Email Verifica: Se >40%, email in spam o UX confusa

### Query Utili con pageName

#### Analisi Funnel Acquisto
- "Quanti utenti hanno visualizzato prodotti negli ultimi 7 giorni?" → pageName contiene "Prodotto"
- "Quanti prodotti sono stati aggiunti al carrello oggi?" → pageName = "Carrello: Aggiunta"
- "Quanti checkout sono stati iniziati questa settimana?" → pageName = "Checkout: Step 1"
- "Quanti ordini sono stati completati oggi?" → pageName = "Ordine Confermato"
- "Qual è il tasso di abbandono del carrello?" → 1 - (Ordine Confermato / Carrello: Aggiunta)
- "Mostrami il funnel completo di acquisto degli ultimi 30 giorni" → Sequenza: Prodotto → Carrello → Checkout → Ordine

#### Analisi Funnel Registrazione
- "Quanti utenti hanno iniziato la registrazione?" → pageName = "Registrazione: Form"
- "Quanti form di registrazione sono stati inviati?" → pageName = "Registrazione: Conferma Invio"
- "Quanti utenti hanno verificato l'email?" → pageName = "Registrazione: Email Verificata"
- "Quante registrazioni sono state completate oggi?" → pageName = "Registrazione: Completata"
- "Qual è il tasso di verifica email?" → (Email Verificata / Conferma Invio)
- "Mostrami il conversion rate per canale di acquisizione" → eVar2 con pageName = "Registrazione: Completata"

#### Analisi Funnel Login
- "Quanti login sono stati tentati oggi?" → pageName = "Login: Form"
- "Quanti login sono andati a buon fine?" → pageName = "Dashboard" con event2 o event3
- "Quanti errori di login ci sono stati?" → pageName = "Login: Error" o event52
- "Qual è il tasso di successo dei login?" → (Dashboard con login events / Login: Form)
- "Mostrami i login social vs standard" → Confronta event2 vs event3

#### Analisi Multi-Step
- "Mostrami il percorso completo dalla registrazione al primo acquisto"
- "Qual è il tempo medio tra ogni step del checkout?"
- "Quanti utenti abbandonano tra checkout step 2 e step 3?"
- "Quali sono i pageName più visitati prima di un ordine?"

### Tracking pageName - Best Practices

#### Convenzioni Naming
- **Formato consigliato**: `"Sezione: Azione"` o `"Sezione: Step N"`
- **Esempi**:
  - ✅ "Checkout: Step 1", "Checkout: Step 2", "Checkout: Step 3"
  - ✅ "Registrazione: Form", "Registrazione: Conferma Invio"
  - ✅ "Prodotto: Ricarica 10€", "Prodotto: Abbonamento Base"
  - ❌ Evita: "Page1", "Step2" (troppo generico)
  - ❌ Evita: URL completi come pageName (usa s.page per URL)

#### Implementazione JavaScript
```javascript
// Esempio tracking con pageName
s.pageName = "Checkout: Step 2 - Dati";
s.eVar5 = ""; // Metodo pagamento (non ancora selezionato)
s.t(); // pageview

// Step successivo
s.pageName = "Checkout: Step 3 - Pagamento";
s.eVar5 = "Carta di Credito"; // Ora popolato
s.t(); // pageview

// Conferma ordine
s.pageName = "Ordine Confermato";
s.events = "purchase";
s.products = ";Ricarica 10€;;;event13=1";
s.purchaseID = "ORD123456";
s.t(); // pageview con purchase
```

#### Segmentazione con pageName
- Crea segmenti per analizzare comportamenti specifici
- Segmento "Utenti che abbandonano al checkout": Ha pageName = "Checkout: Step 1" MA NON ha pageName = "Ordine Confermato"
- Segmento "Registrazioni incomplete": Ha pageName = "Registrazione: Form" MA NON ha pageName = "Registrazione: Completata"
