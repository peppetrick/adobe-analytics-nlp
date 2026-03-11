# Variabili Standard Adobe Analytics

Queste sono le dimensioni standard di Adobe Analytics (non custom) disponibili nel report suite.
Usale quando la query si riferisce a queste caratteristiche tecniche/di contesto.

## Tecnologia Mobile / App

| Keyword utente | Dimension ID Adobe | Descrizione | Valori esempio |
|---|---|---|---|
| versione app, app version, versione dell'app, release, build | variables/mobileappid | Versione dell'app mobile (App ID + versione) | "MyTIM 5.2.1", "MyTIM 5.3.0" |
| sistema operativo, OS, operating system | variables/operatingsystem | Sistema operativo del device | "iOS", "Android", "Windows" |
| tipo di device, tipo dispositivo, device type | variables/mobiledevicetype | Categoria del dispositivo | "Mobile Phone", "Tablet", "Other" |
| produttore, marca device, brand | variables/mobilemanufacturer | Produttore del device | "Apple", "Samsung", "Xiaomi" |
| modello device, modello telefono | variables/mobiledevicename | Modello specifico del device | "iPhone 14", "Samsung Galaxy S23" |

## Tecnologia Browser / Web

| Keyword utente | Dimension ID Adobe | Descrizione | Valori esempio |
|---|---|---|---|
| browser | variables/browser | Browser utilizzato | "Chrome", "Safari", "Firefox" |
| tipo browser, browser type | variables/browsertype | Famiglia del browser | "Google Chrome", "Apple Safari" |
| risoluzione schermo, schermo | variables/resolution | Risoluzione display | "1920x1080", "390x844" |

## Prodotti

| Keyword utente | Dimension ID Adobe | Descrizione | Valori esempio |
|---|---|---|---|
| prodotto, prodotti, offerta, piano tariffario | variables/product | Nome del prodotto dalla stringa s.products | "TIM Super 5G", "TIMVISION XS" |
| categoria prodotto | variables/category | Categoria merceologica del prodotto | "Mobile", "Fisso", "TV" |

## Provenienza / Traffico

| Keyword utente | Dimension ID Adobe | Descrizione | Valori esempio |
|---|---|---|---|
| referrer, provenienza, sorgente visita, da dove arrivano | variables/referrer | URL completo di provenienza della visita | "https://www.google.it/..." |
| dominio referrer, dominio provenienza | variables/referrerdomain | Solo il dominio di provenienza | "google.it", "facebook.com" |
| canale marketing, canale acquisizione | variables/marketingchannel | Canale marketing aggregato | "SEO", "Paid Search", "Direct", "Email" |
| paese, country, nazione | variables/geocountry | Paese dell'utente | "Italy", "Germany" |
| città, city | variables/geocity | Città dell'utente | "Rome", "Milan" |

## Regole d'uso

- "versione app" / "versioni dell'app" / "release più usate" → usa SEMPRE `variables/mobileappid`
- "prodotti più visti/acquistati" → usa `variables/product`
- "da dove arrivano gli utenti" / "sorgente traffico" → usa `variables/referrerdomain` (più leggibile di referrer)
- "su quale OS" / "iOS vs Android" → usa `variables/operatingsystem` come dimensione (non come segmento, se non filtri)
- Per FILTRARE per OS usa il segmento (vedi segments.md); per VEDERE la distribuzione usa la dimensione
