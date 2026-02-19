# Formato File Excel per Conversione RAG

## File 1: Eventi Tracciati (`tracking-events.xlsx`)

### Struttura Colonne

| Colonna | Tipo | Obbligatorio | Descrizione | Esempio |
|---------|------|--------------|-------------|---------|
| `statename` o `stateName` | string | Se pageview | Nome stato per pageview | "product_view" |
| `actionname` o `actionName` | string | Se evento | Nome azione per eventi custom | "add_to_cart" |
| `pagename` o `pageName` | string | No | pageName Adobe (se diverso da statename) | "Prodotto: Ricarica 10€" |
| `descrizione` o `description` | string | No | Descrizione dell'evento/pagina | "Visualizzazione prodotto" |
| `url` | string | No | URL della pagina | "/prodotti/ricarica-10" |
| `var_[nome]` | string | No | Variabili custom popolate | "var_prodotto", "var_canale" |

### Esempio Righe

#### PageView (stateName popolato)

| statename | pagename | descrizione | url | var_prodotto | var_canale |
|-----------|----------|-------------|-----|--------------|------------|
| product_view | Prodotto: Ricarica 10€ | Visualizzazione prodotto | /prodotti/ricarica-10 | Ricarica 10€ | Email |
| cart_view | Carrello: Riepilogo | Visualizzazione carrello | /carrello | - | - |
| checkout_start | Checkout: Step 1 | Inizio checkout | /checkout/step1 | - | - |

#### Eventi Custom (actionName popolato)

| actionname | descrizione | var_prodotto | var_metodo_pagamento |
|------------|-------------|--------------|---------------------|
| add_to_cart | Aggiunta al carrello | Ricarica 10€ | - |
| checkout_start | Inizio checkout | - | - |
| payment_complete | Pagamento completato | Ricarica 10€ | Carta di Credito |
| login_success_standard | Login standard | - | - |

---

## File 2: Decodifica Mapping (`decode-mapping.xlsx`)

### Sheet 1: Variabili (eVar/Props)

| Colonna | Tipo | Obbligatorio | Descrizione | Esempio |
|---------|------|--------------|-------------|---------|
| `nome_business` | string | Sì | Nome "parlante" variabile | "prodotto" |
| `evar_prop` | string | Sì | eVar o prop tecnico | "eVar1" |
| `tipo` | string | No | Tipo variabile | "Conversion", "Traffic" |
| `descrizione` | string | No | Descrizione variabile | "Nome prodotto acquistato" |
| `esempi` | string | No | Valori di esempio | "Ricarica 10€", "Ricarica 20€" |

#### Esempio Righe

| nome_business | evar_prop | tipo | descrizione | esempi |
|---------------|-----------|------|-------------|--------|
| prodotto | eVar1 | Conversion | Nome prodotto | "Ricarica 10€", "Ricarica 20€" |
| canale | eVar2 | Conversion | Canale marketing | "Email", "Social", "Direct" |
| tipo_utente | eVar3 | Conversion | Tipo cliente | "Nuovo", "Ricorrente", "VIP" |
| sezione_sito | prop1 | Traffic | Sezione sito | "Home", "Ricariche", "Supporto" |

### Sheet 2: Eventi (Eventi Custom)

| Colonna | Tipo | Obbligatorio | Descrizione | Esempio |
|---------|------|--------------|-------------|---------|
| `actionName` | string | Sì | Nome azione da File 1 | "add_to_cart" |
| `evento_adobe` | string | Sì | Evento Adobe Analytics | "event10" |
| `nome_evento` | string | No | Nome leggibile | "Aggiunta Carrello" |
| `descrizione` | string | No | Descrizione evento | "Prodotto aggiunto al carrello" |
| `variabili_associate` | string | No | Variabili (comma-separated) | "prodotto,canale" |

#### Esempio Righe

| actionName | evento_adobe | nome_evento | descrizione | variabili_associate |
|------------|--------------|-------------|-------------|---------------------|
| add_to_cart | event10 | Aggiunta Carrello | Prodotto aggiunto | prodotto,categoria |
| checkout_start | event12 | Checkout Iniziato | Inizio checkout | - |
| payment_complete | event13 | Pagamento Completato | Transazione completata | prodotto,metodo_pagamento |
| signup_complete | event1 | Registrazione Completata | Account attivato | canale,tipo_utente |
| login_success_standard | event2 | Login Standard | Login email/password | tipo_utente,metodo_login |

---

## Come Usare

### 1. Prepara i File Excel

Assicurati che i tuoi file Excel seguano il formato sopra. Puoi avere nomi colonne diversi ma devono mappare a quelli attesi.

### 2. Installa Dipendenze

```bash
npm install xlsx --save-dev
```

### 3. Converti Excel → Markdown

```bash
# Converti i file Excel in documentazione RAG
node scripts/convert-excel-to-rag.js \
  --events=path/to/tracking-events.xlsx \
  --decode=path/to/decode-mapping.xlsx \
  --output=docs/business-logic/tracking-mapping-generated.md
```

### 4. Riavvia Server

```bash
# Il server ricaricherà automaticamente il nuovo file
node src/server.js
```

### 5. Testa Query

Ora puoi fare query usando nomi "business":
- "Quanti prodotti sono stati aggiunti al carrello oggi?"
- "Mostrami le visualizzazioni della pagina checkout"
- "Qual è il tasso di completamento registrazione?"

---

## Personalizzazione Script

Se i tuoi file Excel hanno nomi colonne diversi, modifica lo script `convert-excel-to-rag.js`:

### Mapping Colonne Custom

```javascript
// Alla riga ~80, modifica la funzione buildMappings
function buildMappings(decodeData) {
  const mappings = {
    variables: {},
    events: {}
  };

  decodeData.forEach(row => {
    // ⬇️ Cambia questi nomi per matchare le tue colonne
    if (row.NOME_TUA_COLONNA && row.EVAR_TUA_COLONNA) {
      mappings.variables[row.NOME_TUA_COLONNA] = {
        technical: row.EVAR_TUA_COLONNA,
        type: row.TIPO_TUA_COLONNA || 'unknown',
        // ...
      };
    }
  });

  return mappings;
}
```

### Variabili con Prefisso Custom

Se le variabili nei tuoi Excel NON usano prefisso `var_`:

```javascript
// Alla riga ~130, modifica extractVariables
function extractVariables(row, mappings) {
  const variables = [];

  Object.keys(row).forEach(key => {
    // ⬇️ Cambia il prefisso qui
    if (key.startsWith('IL_TUO_PREFISSO_') && row[key]) {
      const varName = key.replace('IL_TUO_PREFISSO_', '');
      // ...
    }
  });

  return variables;
}
```

---

## Troubleshooting

### Errore: "Cannot find module 'xlsx'"

```bash
npm install xlsx
```

### Errore: "Sheet not found"

Verifica che lo sheet si chiami "Sheet1" o specifica il nome:

```javascript
// Nel file convert-excel-to-rag.js, linea 35
const data = XLSX.utils.sheet_to_json(workbook.Sheets['NOME_TUO_SHEET']);
```

### Colonne non trovate

Aggiungi logging per debug:

```javascript
// Aggiungi dopo readExcel()
console.log('Colonne trovate:', Object.keys(eventsData[0]));
```

### File generato vuoto

Controlla che:
1. File Excel abbiano dati (non solo header)
2. Nomi colonne matchino quelli attesi
3. Almeno una riga abbia `statename` o `actionname` popolato

---

## Esempi Pratici

### Scenario 1: File Excel Semplice

**tracking-events.xlsx**:
- 50 righe di pageviews (statename popolato)
- 20 righe di eventi (actionname popolato)
- 5 variabili custom (var_*)

**decode-mapping.xlsx**:
- 10 mapping variabili → eVar/props
- 20 mapping eventi → event1-50

**Output**: 1 file Markdown con tutte le informazioni strutturate, pronto per RAG.

### Scenario 2: File Excel Complesso

**tracking-events.xlsx**:
- Multiple sheets per funnel diversi
- 100+ righe totali
- 15+ variabili custom

**Soluzione**: Esegui script per ogni sheet separatamente, poi merge manualmente o crea script custom.

---

## Manutenzione

### Update Automatico

Crea script npm per semplificare:

```json
// package.json
{
  "scripts": {
    "convert-tracking": "node scripts/convert-excel-to-rag.js --events=data/events.xlsx --decode=data/decode.xlsx",
    "reload-rag": "npm run convert-tracking && node src/server.js"
  }
}
```

Poi:
```bash
npm run reload-rag
```

### Version Control

Committa i file Excel nel repo per tracciare modifiche:

```bash
git add data/*.xlsx docs/business-logic/tracking-mapping-generated.md
git commit -m "Update tracking mapping"
```
