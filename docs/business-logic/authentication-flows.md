# Processi di Autenticazione con user e password fallita

1. l'utente accede alla pagina di login con pagename "MYTIM:login:login page"
2. l'utente inserisce user e password e clicca su login tracciato con  event14="click su login"
3. se user e password sono errate viene tracciato event47="login KO con user e password" e viene visualizzata la modale di errore con pagename "MYTIM:errorMessage:modale errore" con la modale errore sono popolate le variabili eVar56 ed eVar57
4. l'utente atterra su pagina di login "MYTIM:login:login page"

# Processi di Autenticazione con user e password terminata con successo

1. l'utente accede alla pagina di login con pagename "MYTIM:login:login page"
2. l'utente inserisce user e password e clicca su login tracciato con  event14="click su login"
3. se user e password sono corrette viene tracciato event43="login ok con user e password" e l'utente atterra sulla dashboard con pagename  "MYTIM:dashboard:dashboard"


# Processo di Autenticazione con token  avvenuta con successo

1. l'utente apre l'app e se c'è una token valido, l'autenticazione avviene con successo e viene eseguito il traccimento di event83="login OK con token memorizzato"

# Processo di Autenticazione con token  fallita

1. l'utente apre l'app e se c'è una token e non è valido , l'autenticazione avviene fallisce
2. all'utente viene presentata la modale di errore tracciata con pagename="MYTIM:errorMessage:modale errore" con la modale errore sono popolate le variabili eVar56 ed eVar57
3. l'utente passa sulla pagina di login con pagename="MYTIM:login:login page"

# Processo di Autenticazione con password memorizzata  avvenuta con successo

1. l'utente apre l'app viene e passa sulla pagina di login con pagename="MYTIM:login:login page", se ha la password memorizzata e l'autenticazione avviene con successo  viene eseguito il traccimento di event44="login OK con password memorizzato"

# Processo di Autenticazione con password memorizzata fallita

1. l'utente apre l'app viene e passa sulla pagina di login con pagename="MYTIM:login:login page", se ha la password memorizzata e l'autenticazione fallisce  viene eseguito il traccimento di event48="login OK con password memorizzato"

2.  all'utente viene presentata la modale di errore tracciata con pagename="MYTIM:errorMessage:modale errore" con la modale errore sono popolate le variabili eVar56 ed eVar57

3. l'utente passa sulla pagina di login con pagename="MYTIM:login:login page"



## Processo di Registrazione

### Flow Completo

```
1. registrazione inserimento di user e password, il pagename relativo è "MYTIM:registrazione:crea account:inserimento user e password"
   
2. registrazione inserimento linea, il pagename relativo al form è "MYTIM:registrazione:crea account:inserimento linea" nella pagina vengono valorizzati gli eventi event74 per registrazione fisso e event75 per registrazione mobile
   
3. registrazione inserimento otp, il pagename relativo è "MYTIM:Registrazione:crea account:inserimento codice otp sms"
   
4. registrazione thank you page, il pagename relativo è "MYTIM:registrazione:crea account:account registrato - thank you page"

altri eventi o pagine del processo di registrazione



```

### Tracking Adobe Analytics

#### Step 1: Landing Registrazione
```javascript
s.pageName = "Registrazione";
s.eVar2 = document.referrer.includes('campaign') ? "Email Campaign" : "Direct";
s.prop1 = "Autenticazione";
s.t(); // pageview
```

#### Step 2: Form Submit
```javascript
s.linkTrackVars = "events,eVar2";
s.linkTrackEvents = "event50";
s.events = "event50"; // Form submitted
s.tl(this, 'o', 'Registrazione Form Submit');
```

#### Step 3: Registrazione Completata
```javascript
s.pageName = "Registrazione Completata";
s.events = "event1"; // Registration complete
s.eVar3 = "Nuovo"; // Customer type
s.eVar2 = getCampaignSource(); // Marketing channel
s.t(); // pageview
```

### Validazioni

#### Client-side (JavaScript)
- Email formato valido (regex)
- Password min 8 caratteri
- Password contiene maiuscola, numero, carattere speciale
- Consenso privacy checked

#### Server-side (Node.js/Backend)
- Email non già registrata
- Email non in blacklist
- Password hash con bcrypt
- Token verifica generato (JWT, expire 24h)
- Rate limiting: max 5 tentativi/hour per IP

### Errori Comuni

| Codice | Messaggio | Tracking |
|--------|-----------|----------|
| REG001 | Email già registrata | event53, eVar12="Email duplicata" |
| REG002 | Email formato non valido | event53, eVar12="Email invalida" |
| REG003 | Password troppo debole | event53, eVar12="Password debole" |
| REG004 | Consenso privacy mancante | event53, eVar12="Privacy non accettata" |
| REG005 | Rate limit superato | event53, eVar12="Rate limit" |

### Metriche Chiave
- **Registrazioni iniziate**: pageviews su /registrazione
- **Form inviati**: event50
- **Email verificate**: pageviews su /verifica-email
- **Registrazioni completate**: event1
- **Errori registrazione**: event53

---

## Processo di Login

### Flow Standard (Email/Password)

```
1. Landing /login
   ↓
2. User inserisce email + password
   ↓
3. Click "Accedi" → Validazione client-side
   ↓
4. POST /api/login → Verifica credenziali
   ↓
5a. Successo → Genera JWT token
   ↓
6a. Set token in HttpOnly cookie
   ↓
7a. Redirect a /dashboard
   ↓
8a. event2 (Login Standard) tracciato

   OR

5b. Errore → Incrementa failed_attempts counter
   ↓
6b. Se attempts >= 5 → Blocca account (15 min)
   ↓
7b. event52 (Login Error) tracciato
   ↓
8b. Mostra errore con tipo (password/email/blocked)
```

### Flow Social Login (Google/Facebook)

```
1. Landing /login
   ↓
2. Click "Accedi con Google" (o Facebook)
   ↓
3. Redirect a OAuth provider (popup o redirect)
   ↓
4. User autorizza app
   ↓
5. Callback con authorization code
   ↓
6. Exchange code per access token
   ↓
7. Fetch user profile da provider
   ↓
8. Verifica se email già registrata
   ↓
9a. Esistente → Login automatico
9b. Nuovo → Crea account + auto-login
   ↓
10. Set JWT in cookie
   ↓
11. Redirect a /dashboard
   ↓
12. event3 (Login Social) + eVar10="Google"
```

### Tracking Adobe Analytics

#### Landing Login
```javascript
s.pageName = "Login";
s.prop1 = "Autenticazione";
s.t(); // pageview
```

#### Tentativo Login
```javascript
s.linkTrackVars = "events";
s.linkTrackEvents = "event51";
s.events = "event51"; // Login attempt
s.tl(this, 'o', 'Login Attempt');
```

#### Login Riuscito (Standard)
```javascript
s.pageName = "Dashboard";
s.events = "event2"; // Login standard success
s.eVar10 = "Standard"; // Login method
s.eVar3 = userType; // "Nuovo" o "Ricorrente"
s.t(); // pageview
```

#### Login Riuscito (Social)
```javascript
s.pageName = "Dashboard";
s.events = "event3"; // Login social success
s.eVar10 = "Google"; // or "Facebook"
s.eVar3 = userType;
s.t(); // pageview
```

#### Errore Login
```javascript
s.linkTrackVars = "events,eVar11";
s.linkTrackEvents = "event52";
s.events = "event52"; // Login error
s.eVar11 = errorType; // "Password errata", "Email non trovata", "Account bloccato"
s.tl(this, 'o', 'Login Error');
```

### Gestione Sessioni

#### JWT Token
- **Contenuto**: { userId, email, role, exp }
- **Scadenza**: 24 ore (86400 seconds)
- **Storage**: HttpOnly cookie (non accessibile JavaScript)
- **Refresh**: Auto-refresh a 23h se utente attivo

#### Session Persistence (Redis)
- **Key**: `session:${userId}`
- **Value**: { userId, email, loginTime, lastActivity, device }
- **TTL**: 24 ore
- **Refresh**: Ad ogni richiesta API

#### Logout
```javascript
// Client
POST /api/logout
→ Clear cookie
→ Redirect a /login

// Server
→ Invalidate JWT in blacklist
→ Delete Redis session
→ Return 200 OK

// Analytics
s.events = "event54"; // Logout
s.tl(this, 'o', 'Logout');
```

### Security Features

#### Rate Limiting
- **Login attempts**: Max 5 tentativi / 15 minuti per IP
- **Registration**: Max 3 registrazioni / ora per IP
- **Password reset**: Max 3 richieste / ora per email

#### Account Protection
- **Failed login**: Dopo 5 tentativi, blocco temporaneo 15 min
- **Suspicious activity**: Login da nuovo device → Email notifica
- **Password policy**: Min 8 char, upper+lower+number+special

#### Token Security
- **JWT**: Signed con secret key (HS256)
- **Refresh token**: Rotazione ogni 7 giorni
- **Revocation**: Blacklist per token invalidati pre-expire

### Metriche Chiave
- **Login attempts**: event51
- **Successful logins**: event2 + event3
- **Failed logins**: event52
- **Social login %**: event3 / (event2 + event3)
- **Login success rate**: (event2 + event3) / event51

---

## Query Comuni

### Analisi Registrazioni
- "Quante registrazioni completate oggi?"
- "Qual è il tasso di verifica email negli ultimi 7 giorni?"
- "Quanti errori di registrazione per tipo di errore?"
- "Da quali canali arrivano più registrazioni?"

### Analisi Login
- "Quanti login negli ultimi 7 giorni?"
- "Qual è il tasso di successo dei login?"
- "Quanti login social vs standard?"
- "Quanti errori di login per tipo?"

### Analisi Funnel
- "Qual è il conversion rate del funnel di registrazione?"
- "Quanti utenti abbandonano dopo la compilazione del form?"
- "Quanto tempo passa tra registrazione e prima login?"
