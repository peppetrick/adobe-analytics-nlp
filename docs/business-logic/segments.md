# Segmenti Adobe Analytics

Questa è la lista autoritativa dei segmenti da usare nelle query.
Quando l'utente menziona un segmento, cerca qui la voce corrispondente e restituisci il campo `segmentId` indicato.
NON inventare segmentId — se il segmento non è in questa lista, restituisci segmentId: null.

## Segmenti user-defined (ID diretto)
Segmenti creati nell'account Adobe Analytics. Usa il campo `segmentId` direttamente.

| Keyword utente | segmentId | Descrizione |
|---|---|---|
| loggato, autenticato, logged in, utenti registrati | REPLACE_WITH_REAL_ID | Sessioni di utenti autenticati |
| non loggato, anonimo, guest | REPLACE_WITH_REAL_ID | Sessioni di utenti anonimi |

> Per recuperare gli ID reali: GET https://localhost:8011/api/query/segments?name=<keyword>
> Sostituire i valori REPLACE_WITH_REAL_ID con gli ID reali (formato: `s300005487_xxxxxxxx`)

## Segmenti dispositivo/OS (basati su dimensione)
Per questi segmenti il backend costruisce automaticamente il filtro tramite la dimensione `operatingsystem` o `mobiledevicetype`.
Restituisci `segmentId` con il valore speciale indicato — il backend lo riconoscerà e creerà il filtro corretto.

| Keyword utente | segmentId da usare | Logica applicata |
|---|---|---|
| iOS, apple, iphone, ipad | __dim__operatingsystem__CONTAINS__iOS | operatingsystem CONTAINS "iOS" |
| Android | __dim__operatingsystem__CONTAINS__Android | operatingsystem CONTAINS "Android" |
| mobile, smartphone | __dim__mobiledevicetype__CONTAINS__Mobile Phone | mobiledevicetype CONTAINS "Mobile Phone" |
| tablet | __dim__mobiledevicetype__CONTAINS__Tablet | mobiledevicetype CONTAINS "Tablet" |
| desktop, pc, computer | __dim__mobiledevicetype__eq__Other | mobiledevicetype = "Other" (non-mobile) |
| Windows | __dim__operatingsystem__CONTAINS__Windows | operatingsystem CONTAINS "Windows" |
