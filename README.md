# Adobe Analytics NLP Query System

Sistema di query in linguaggio naturale per Adobe Analytics con autenticazione OAuth sicura e cache persistente Redis.

## 🎯 Caratteristiche

- **Query in linguaggio naturale** per Adobe Analytics
- **Autenticazione sicura** con sessioni server-side (OAuth 2.0)
- **Cache persistente Redis** con fallback automatico a memoria
- **Interpretazione AI** tramite Claude o Ollama
- **RAG-enhanced** con documentazione contestuale
- **CSRF Protection** su tutti gli endpoint critici
- **Frontend responsive** con visualizzazione chart

## ✅ Miglioramenti Implementati

### Fase 1: Redis Cache Infrastructure ✅
- Cache persistente con Redis (sostituisce NodeCache volatile)
- Fallback automatico a memory cache se Redis non disponibile
- Health check endpoint per monitoraggio cache

### Fase 2: Secure Session Management ✅
- **Token OAuth in sessioni server-side** (non più in localStorage)
- **Cookie HttpOnly, Secure, SameSite=Strict**
- **CSRF protection** su endpoint di mutazione
- **Validazione token** e gestione scadenza
- Nuovi endpoint: `/api/auth/session`, `/api/auth/csrf-token`, `/api/auth/logout`

## 🛠️ Prerequisiti

- **Node.js** 18+
- **Redis** 7+ (locale o managed)
- **Adobe Analytics** account con API access
- **Claude API key** o **Ollama** installato (per NLP)

## 🚀 Installazione

### 1. Clone e dipendenze

```bash
git clone <repository-url>
cd adobe-analytics-nlp
npm install
```

### 2. Avvia Redis

```bash
# Docker (raccomandato per sviluppo)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Oppure installa Redis localmente
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt install redis-server && sudo systemctl start redis
```

### 3. Configura variabili d'ambiente

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi valori:

```bash
# Adobe OAuth (ottieni da Adobe Developer Console)
ADOBE_CLIENT_ID=your_client_id
ADOBE_CLIENT_SECRET=your_client_secret
ADOBE_REDIRECT_URI=https://localhost:8011/api/auth/callback
ADOBE_COMPANY_ID=your_company_id
DEFAULT_RSID=your_report_suite_id

# Claude API (per NLP)
ANTHROPIC_API_KEY=your_key_here

# Session Secret (IMPORTANTE: genera un segreto casuale di almeno 32 caratteri)
SESSION_SECRET=$(openssl rand -base64 32)
```

### 4. Avvia il server

```bash
npm start

# Oppure in modalità development con auto-reload
npm run dev
```

Server disponibile su: `https://localhost:8011`

## 📖 Utilizzo

### 1. Login

- Apri `https://localhost:8011`
- Click su "Login con Adobe"
- Completa il flusso OAuth
- Sessione creata automaticamente (cookie HttpOnly)

### 2. Carica configurazione

Carica un file JSON con metriche e dimensioni:

```json
{
  "metrics": [
    {
      "id": "metrics/visits",
      "name": "Visite",
      "description": "Numero totale di sessioni"
    }
  ],
  "dimensions": [
    {
      "id": "evar1",
      "name": "Prodotto",
      "description": "Nome del prodotto"
    }
  ]
}
```

### 3. Esegui query

Esempi di query in linguaggio naturale:

- "Quante visite negli ultimi 7 giorni?"
- "Mostrami gli ordini di oggi"
- "Top 10 prodotti per ricavi ultimo mese"
- "Pagine che contengono 'ricarica' negli ultimi 30 giorni"

## 🔒 Sicurezza

### Implementazioni di sicurezza

✅ **Token OAuth** memorizzati solo server-side (sessioni Redis)
✅ **Cookie HttpOnly** (non accessibili da JavaScript)
✅ **Cookie Secure** (solo HTTPS in produzione)
✅ **SameSite=Strict** (protezione CSRF aggiuntiva)
✅ **CSRF Tokens** su tutti i POST/PUT/DELETE
✅ **Validazione token** con controllo scadenza
✅ **CORS configurato** con whitelist domini

### Checklist pre-produzione

- [ ] `SESSION_SECRET` impostato a valore casuale (min 32 char)
- [ ] `SECURE_COOKIES=true` in produzione
- [ ] Redis con password (`REDIS_PASSWORD`)
- [ ] HTTPS attivo (no HTTP)
- [ ] `CORS_ORIGIN` configurato con domini autorizzati
- [ ] Rate limiting implementato (raccomandato)

## 🏗️ Architettura

```
┌─────────────┐
│   Browser   │
│  (Session)  │
└──────┬──────┘
       │ HTTPS + Cookie
┌──────▼────────────────┐
│   Express Server     │
│ - Session Middleware │
│ - CSRF Protection    │
│ - Auth Routes        │
│ - Query Routes       │
└──────┬────────────────┘
       │
  ┌────▼────┐  ┌─────────────┐
  │  Redis  │  │ Adobe API   │
  │ (Cache) │  │ (Analytics) │
  └─────────┘  └─────────────┘
```

## 📚 API Documentation

### Authentication Endpoints

#### `GET /api/auth/login`
Restituisce URL per OAuth flow Adobe

#### `GET /api/auth/callback`
Callback OAuth - crea sessione server-side

#### `GET /api/auth/session`
Verifica stato sessione corrente
```json
{
  "authenticated": true,
  "userId": "user_xxx",
  "expiresAt": 1234567890
}
```

#### `GET /api/auth/csrf-token`
Ottieni CSRF token per richieste successive
```json
{
  "csrfToken": "xxx-xxx-xxx"
}
```

#### `POST /api/auth/logout`
Distrugge sessione e logout

### Query Endpoints

Tutti gli endpoint richiedono autenticazione (sessione valida).

#### `POST /api/query/config`
Carica configurazione metriche/dimensioni

#### `GET /api/query/config`
Recupera configurazione caricata

#### `POST /api/query/ask`
Esegui query in linguaggio naturale

### Health Check

#### `GET /api/health`
Stato del server e cache
```json
{
  "status": "ok",
  "timestamp": "2024-02-16T10:00:00.000Z",
  "cache": {
    "type": "redis",
    "connected": true,
    "keys": 42
  }
}
```

## 🧪 Testing

```bash
# TODO: Fase 3 - Test suite completa
npm test              # Run all tests
npm run test:coverage # Coverage report
npm run test:watch    # Watch mode
```

## 📦 Deployment

### Docker

```bash
# TODO: Creare Dockerfile
docker build -t adobe-analytics-nlp .
docker run -p 8011:8011 --env-file .env adobe-analytics-nlp
```

### Produzione

1. Usa managed Redis (AWS ElastiCache, Redis Cloud, etc.)
2. Configura HTTPS con certificati validi
3. Imposta `NODE_ENV=production`
4. Usa process manager (PM2, systemd)
5. Configura monitoring e logging

## ⚠️ Note Importanti

### Frontend Migration Required

Il frontend (`public/app.js`) deve essere aggiornato per:
1. ❌ **Rimuovere** tutti i riferimenti a `localStorage` per i token
2. ✅ **Usare** `/api/auth/session` per verificare autenticazione
3. ✅ **Includere** CSRF token in tutte le richieste POST/PUT/DELETE
4. ✅ **Aggiungere** `credentials: 'include'` a tutte le fetch

Esempio:
```javascript
// Vecchio codice (INSICURO) - DA RIMUOVERE
localStorage.setItem('adobe_access_token', token);

// Nuovo codice (SICURO)
const csrf = await fetch('/api/auth/csrf-token').then(r => r.json());
fetch('/api/query/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrf.csrfToken
  },
  credentials: 'include', // IMPORTANTE
  body: JSON.stringify({ query })
});
```

### CSRF Library Deprecation

⚠️ `csurf` è deprecated. Per produzione long-term, considera:
- **csrf-csrf** (alternative moderna)
- **Implementazione custom** con double-submit cookie
- **SameSite=Strict** cookies (già implementato)

## 🤝 Contribuire

1. Fork repository
2. Crea branch feature (`git checkout -b feature/nome`)
3. Commit modifiche (`git commit -m 'Add feature'`)
4. Push al branch (`git push origin feature/nome`)
5. Apri Pull Request

## 📄 Licenza

[Specificare licenza]

## 🆘 Supporto

Per problemi o domande:
- Controlla [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (TODO)
- Apri issue su GitHub
- Contatta il team

## 🗺️ Roadmap

### Completato ✅
- [x] Fase 1: Redis Cache Infrastructure
- [x] Fase 2: Secure Session Management

### In Corso 🚧
- [ ] Frontend migration (rimuovere localStorage)
- [ ] Fase 3: Test Suite completa
- [ ] Fase 4: Documentazione completa

### Futuro 🔮
- [ ] Rate limiting
- [ ] Admin dashboard
- [ ] Job queue per query pesanti
- [ ] APM monitoring
- [ ] Docker/CI-CD completo
