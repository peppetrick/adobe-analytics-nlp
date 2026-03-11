# Funnel e Processi - Steps Ordinati

## Come usare per query "tutti gli step del processo X"

Esistono due varianti principali:

**A) Query aggregata** (totale per step, nessuna dimensione temporale):
- `dimension`: `variables/evar5` (pagename)
- `searchFilter`: array specifico degli step
- `stepOrder`: stesso array in ordine sequenziale
- `chartType`: "bar"

**B) Query trend** (andamento nel tempo degli step — es. "andamento giornaliero degli step"):
- `dimension`: variabile temporale (`variables/daterangeday`, `variables/daterangehour`, ecc.)
- `searchFilter`: **STESSO array specifico degli step** — OBBLIGATORIO anche per query trend
- `stepOrder`: stesso array in ordine sequenziale
- `chartType`: "line"
- Il sistema usa i valori di searchFilter per filtrare i dati solo per gli step documentati

**REGOLA CRITICA**: In entrambi i casi `searchFilter` DEVE SEMPRE essere un **array specifico** degli step del funnel, mai una stringa generica come `"crea account"`. NON impostare searchFilter=null per query trend sugli step di un processo.

**REGOLA CRITICA**: Per query funnel, `searchFilter` DEVE SEMPRE essere un **array specifico** degli step del funnel, mai una stringa generica come `"crea account"`. Una stringa generica con CONTAINS restituisce TUTTE le pagine che la contengono (anche step non documentati), mentre l'array specifico restituisce esattamente gli step definiti.

---

## Processo di Registrazione

**Keywords**: "processo di registrazione", "funnel registrazione", "step del processo di registrazione", "crea account"

4 step, tutti con pagename che contiene "crea account".

| Step | Pagename reale | searchFilter da usare |
|------|---------------|----------------------|
| 1 | MYTIM:registrazione:crea account:inserimento user e password | "inserimento user e password" |
| 2 | MYTIM:registrazione:crea account:inserimento linea | "inserimento linea" |
| 3 | MYTIM:Registrazione:crea account:inserimento codice otp sms | "inserimento codice otp sms" |
| 4 | MYTIM:registrazione:crea account:account registrato - thank you page | "account registrato" |

**Esempio JSON per "unique visitor per tutti gli step del processo di registrazione":**
```json
{
  "metric": [{"id": "metrics/visitors", "name": "Unique Visitors"}],
  "dimension": {"id": "variables/evar5", "name": "Pagename"},
  "searchFilter": ["inserimento user e password", "inserimento linea", "inserimento codice otp sms", "account registrato"],
  "stepOrder": ["inserimento user e password", "inserimento linea", "inserimento codice otp sms", "account registrato"],
  "dateRange": "last30days",
  "chartType": "bar",
  "limit": null
}
```

**Esempio JSON per "pageviews per tutti gli step del processo di registrazione negli ultimi 7 giorni":**
```json
{
  "metric": [{"id": "metrics/pageviews", "name": "Page Views"}],
  "dimension": {"id": "variables/evar5", "name": "Pagename"},
  "searchFilter": ["inserimento user e password", "inserimento linea", "inserimento codice otp sms", "account registrato"],
  "stepOrder": ["inserimento user e password", "inserimento linea", "inserimento codice otp sms", "account registrato"],
  "dateRange": "last7days",
  "chartType": "bar",
  "limit": null
}
```

**Esempio JSON per "andamento giornaliero negli ultimi 5 giorni degli step del processo di registrazione con metrica unique visitor":**
```json
{
  "metric": [{"id": "metrics/visitors", "name": "Unique Visitors"}],
  "dimension": {"id": "variables/daterangeday", "name": "Day"},
  "searchFilter": ["inserimento user e password", "inserimento linea", "inserimento codice otp sms", "account registrato"],
  "stepOrder": ["inserimento user e password", "inserimento linea", "inserimento codice otp sms", "account registrato"],
  "dateRange": "last5days",
  "chartType": "line",
  "limit": null
}
```
Nota: con dimensione temporale e searchFilter array, il sistema crea automaticamente una serie separata per ogni step (multi-line chart).

---

## Processo di Login (user e password)

**Keywords**: "processo di login", "funnel login", "step del login"

Il processo di login usa principalmente **eventi** (non pagename) per misurare i KPI:
- event14 = click su login
- event43 = login OK con user e password
- event47 = login KO con user e password
- event44 = login OK con password memorizzata
- event48 = login KO con password memorizzata
- event83 = login OK con token memorizzato

Per analizzare il funnel di login come **sequence di eventi** (non pagename), usa metriche multiple:
```json
{
  "metric": [
    {"id": "metrics/event14", "name": "Click Login"},
    {"id": "metrics/event43", "name": "Login OK user/pass"},
    {"id": "metrics/event47", "name": "Login KO user/pass"}
  ],
  "dimension": null,
  "dateRange": "last7days",
  "chartType": "bar"
}
```

Per analisi pagename del login, la pagina di login è: `MYTIM:login:login page` → searchFilter: "login page"

---

## Processo di ricarica singola

**Keywords**: "processo di ricarica", "funnel ricarica", "step del processo di ricarica", "ricarica semplice", "ricarica singola"

2 step, tutti con pagename che contiene 

| Step | Pagename reale | searchFilter da usare |
|------|---------------|----------------------|
| 1 | MYTIM:Ricarica:ricarica singola:ricarica singola | "ricarica singola" |
| 2 | MYTIM:Ricarica:ricarica OK:ricarica OK | "ricarica OK" |

---

## Regole Generali per Funnel

1. Il campo `stepOrder` è OBBLIGATORIO quando si restituisce un funnel (array di searchFilter ordinato)
2. I valori in `stepOrder` devono essere i segmenti finali (ultimo segmento dopo `:`) dei pagename reali
3. Non usare coloni nei valori di searchFilter/stepOrder (es. NON "crea account:inserimento linea", MA "inserimento linea")
4. `chartType`: "bar" per query aggregata (dimension=evar5), "line" per query trend (dimension temporale)
5. Per un funnel non specificare `limit` (null) — mostra tutti gli step
