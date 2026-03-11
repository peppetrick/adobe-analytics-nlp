# Processi di ricarica semplice

L'utente inserisce il taglio da ricaricare e il metodo di pagamento, se l'operazione va a buon fine viene presentata la pagina di ricarica avvenuta con successo (thank you page ricarica). Se il metodo di pagamento non è stato definito, l'utente viene diretto sulle pagine per inserire il metodo di pagamento e successivamente torna sulla pagina della ricarica singola per confermare la ricarica.

1. l'utente atterra sulla pagina di ricarica con pagename "MYTIM:Ricarica:ricarica singola:ricarica singola". Seleziona il taglio di ricarica e il metodo di pagamento

2. se la ricarica avviene con successo si atterra sulla pagina "MYTIM:Ricarica:ricarica OK:ricarica OK" e vengono popolate le variabili taglio di ricarica (evar26) e il metodo di pagamento (evar24)


in caso di errore si atterra sulla modale di errore "MYTIM:errorMessage:modale errore" e in corrispondenza sono valorizzate le variabili eVar56 ed eVar57 rispettivamente per il codice di errore e il messaggio di errore e l'evento event56

## Step del processo (per query funnel/trend)

IMPORTANTE: usare SEMPRE i pagename completi come step, non abbreviazioni.

```json
{
  "searchFilter": ["MYTIM:Ricarica:ricarica singola:ricarica singola", "MYTIM:Ricarica:ricarica OK:ricarica OK"],
  "stepOrder": ["MYTIM:Ricarica:ricarica singola:ricarica singola", "MYTIM:Ricarica:ricarica OK:ricarica OK"]
}
```

# processo di ricarica automatica 
- ricarica automatica. l'utente puo' scegliere di ricaricare automaticamente al raggiungimento di una determinate condizioni. 


