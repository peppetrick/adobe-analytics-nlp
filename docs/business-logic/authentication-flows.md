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



# Processo di Registrazione
Nota: tutti i pagename degli step PRINCIPALI del processo di registrazione contengono la stringa "crea account", ma in produzione esistono anche altri pagename con "crea account" non documentati (es. inserimento otp rec-pass, faceId, touchid, ecc.).
**IMPORTANTE**: NON usare "crea account" come searchFilter generico. Per query funnel/processo usare SEMPRE l'array specifico degli step documentati (vedere funnels.md). Per query aggregate su dimension=evar5, il searchFilter "crea account" restituisce TUTTE le pagine reali incluse quelle non documentate.




1. primo step. registrazione inserimento di user e password: all'utente è richiesto di inserire user e password.  il pagename relativo è "MYTIM:registrazione:crea account:inserimento user e password"
   
2. secondo step. registrazione inserimento linea: si richiede l'inserimento del numero di telefono (linea utente).Il pagename relativo al form è "MYTIM:registrazione:crea account:inserimento linea". Se la linea è fissa viene valorizzato event74 se mobile event75
   
3. terzo step. registrazione inserimento otp, all'utente si chiede di inserire OTP per completare la registrazione. il pagename relativo è "MYTIM:Registrazione:crea account:inserimento codice otp sms"
   
4. quarto e ultimo step registrazione thank you page: all'utente viene presentata la thank you page.  il pagename relativo è "MYTIM:registrazione:crea account:account registrato - thank you page"

## altri eventi o pagine del processo di registrazione

* nel caso di errore in un qualunque step, compare la modale di errore che ha pagename="MYTIM:errorMessage:modale errore" e in corrispondenza sono valorizzate le variabili eVar56 ed eVar57 rispettivamente per il codice di errore e il messaggio di errore e l'evento event56

* nel caso di numero già registrato viene visualizzata la modale con pagename="MYTIM:Registrazione:Modale numero già registrato"




