# Variabili ed Eventi Custom

## eVar Custom (Variabili di Conversione)

### eVar5 - Pagename
- **Descrizione**: nome della pagina o views della app visitata dall'utente. E' la copia del pagename. 
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Esempi**: "MYTIM:dashboard:dashboard", "MYTIM:widget:widget"

### eVar6 - Section
- **Descrizione**: replica la standard variable SiteSection di adobe
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Esempi**: "dashboard", "offerte per te"

### eVar1 - sottosezione1
- **Descrizione**: è il secondo  livello di navigazione della app nell'albero di navigazione
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "Offerte", "ricarica singola"

### eVar2 - sottosezione2
- **Descrizione**: è il terzo  livello di navigazione della app nell'albero di navigazione
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "Piano tariffario", "ricezione fattura"

### eVar24 - metodo di pagamento
- **Descrizione**: metodo di pagamento, utilizzato nei processi di pagamento come ricariche o carte servizi
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "Carta Di Credito", "timfin","credito residuo"
- **eventi associati**: order

### eVar30 - button name
- **Descrizione**: nome del pulsante o link su cui ha cliccato l'utente
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: 
- **eventi associati**: event32

### eVar56 - error code
- **Descrizione**: codice di errore visualizzato in pagine o modali di errore
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: 
- **eventi associati**: event56

### eVar57 - error description
- **Descrizione**: descrizione di errore visualizzato in pagine o modali di errore
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: 
- **eventi associati**: event56

### eVar34 - tipo di linea
- **Descrizione**: tipo di linea associata alla linea selzionata in dashboard
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "Fisso","Mobile"

### eVar47 - nome iniziativa
- **Descrizione**: identificativo dell'iniziativa, le inizative sono storie visualizzate nella parte alta della home page della APP che ha pagename "MYTIM:dashboard:dashboard" 
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "TELEPASS MM - STORIA","concorso_Sanremo2026_storia"
- **eventi associati**: event32

### eVar52 - nome layer
- **Descrizione**: identificativo del layer. Il layer viene visualizzato al click sulle inizative. La visualizzazione del layer avviene con traccimento di page view con pagename "MYTIM:storie:layer iniziativa"
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "TELEPASS MM - STORIA","concorso_Sanremo2026_storia"
- **eventi associati**: event32

### eVar48  - posizione iniziativa
- **Descrizione**: ### eVar52 - nome layer
- **Descrizione**: rappresenta la posizione del layer e viene popolato nella visualizzazione e click del layer
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "0","1","2","3"
- **eventi associati**: event32

### eVar39 - bannerID
- **Descrizione**: id banner overlay visuallizzato in ome page della APP che ha pagename "MYTIM:dashboard:dashboard" "MYTIM:dashboard:dashboard" 
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: 
- **eventi associati**: event32

### eVar54 - parola chiave
- **Descrizione**: parola chiave utilizzata nel campo di ricerca della app. viene tracciata al click sulla lente del campo di ricerca 
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "giga","fatture","estero"
- **eventi associati**: event32

### eVar73 - tipo keyword
- **Descrizione**: tipo di keyword utilizzata per ottenere i risultati della ricerca: "digitate" per parole chiave interamente digitate, "suggerite" per parole chiave suggerite e "link rapidi" per ricerca da link rapidi 
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "digitate","suggerite","link rapidi"
- **eventi associati**: event32

### eVar73 - numero risultati ricerca
- **Descrizione**: numero di risultati ottenuti a seguito di una keyword di ricerca
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "0","1","2"
- **eventi associati**: event32

### eVar75 - titolo pagina risultati ricerca
- **Descrizione**: nome della pagina sulla quale si atterra a seguito del click su uno dei risutlati di ricerca
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "Offerte per l'estero","Controlla e paga la tua fattura","Ultima fattura"
- **eventi associati**: 

### eVar59 - posizione offerte per te
- **Descrizione**: le offerte per te sono proposte personalizzate per singolo cliente e linea e si possono trovare in dashboard o nell'apposita sezione offerte per te. La posizione definisce appunto in quale area della app viene presentata l'offerta
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "offerte vetrina","offerte dashboard top 3","offerte top","card fittizia vetrina secondo livello","card fittizia vetrina primo livello","card fittizia dashboard","offerta crosselling"
- **eventi associati**: event32

### eVar60 - offerte per te 
- **Descrizione**: le offerte per te sono proposte personalizzate per singolo cliente e linea e si possono trovare in dashboard o nell'apposita sezione offerte per te. La variabile offerta_per_te rappresenta il nome dell'offerta
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "Passa a TIM la tua linea mobile","TIM WiFi Casa","TIMVISION XS"
- **eventi associati**: event32

### eVar61 - codice offerta 
- **Descrizione**: le offerte per te sono proposte personalizzate per singolo cliente e linea e si possono trovare in dashboard o nell'apposita sezione offerte per te. La variabile codice_offerta rappresenta il codice dell'offerta
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "788439-FN062","F4041-MO00001031","ODTRZ-GIGA_WEEK"
- **eventi associati**: event32

### eVar62 - categoria offerte per te 
- **Descrizione**: le offerte per te sono proposte personalizzate per singolo cliente e linea e si possono trovare in dashboard o nell'apposita sezione offerte per te. La variabile categoria_offerteperte  rappresenta un raggruppamento di primo livello dell'offertadell'offerta
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "Giga e Minuti","Offerte e Servizi","Prodotti"
- **eventi associati**: event32


### eVar78 - nome notifica
- **Descrizione**:le notifiche sono messaggi visualizzati all'atterraggio in dashboard e navigabili della sezione centro notifiche della app. il nome notifica è appunto l'identificativo della notifica
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "Giga e Minuti","Offerte e Servizi","Prodotti"
- **eventi associati**: 

### eVar40 - nome campagna push
- **Descrizione**:nome della campagna push. Per le notifiche si misurano le visualizzazioni (impression) solo per Android e i tap (click) sia per iOS che per Android
- **Persistenza**: Visita
- **Allocazione**: Più recente
- **Valori**: "Giga e Minuti","Offerte e Servizi","Prodotti"
- **eventi associati**: 


## Eventi Custom

### event13 - click su registrati ora 
- **Tipo**: Contatore
- **Descrizione**: numero di click sul pulsante di regisgtrazione nella pagina di login
- **Note**: 

### event14 - click su login
- **Tipo**: Contatore
- **Descrizione**: click sul tasto login della pagina di login
- **Note**: 

### event43 - login ok con user e password
- **Tipo**: Contatore
- **Descrizione**: login avvenuta con successo con inserimento di user e password
- **Note**: 

### event47 - login KO con user e password
- **Tipo**: Contatore
- **Descrizione**: login fallita con inserimento di user e password
- **Note**: 

### event44 - login OK con password memorizzata
- **Tipo**: Contatore
- **Descrizione**: login avvenuta con successo utilizzando la password memorizzata
- **Note**: 

### event48 - login KO con password memorizzata
- **Tipo**: Contatore
- **Descrizione**: login fallita utilizzando la password memorizzata
- **Note**:

### event83 - login OK con token memorizzato
- **Tipo**: Contatore
- **Descrizione**: login avvenuta con successo utilizzando il token memorizzato
- **Note**:

### event84 - login KO con token memorizzato
- **Tipo**: Contatore
- **Descrizione**: login fallita utilizzando il token memorizzato
- **Note**:

### event74 - registrazione numero fisso
- **Tipo**: Contatore
- **Descrizione**: nello step "MYTIM:registrazione:crea account:inserimento linea" viene selezionato un numero fisso
- **Note**:

### event74 - registrazione numero mobile 
- **Tipo**: Contatore
- **Descrizione**: nello step "MYTIM:registrazione:crea account:inserimento linea" viene selezionato un numero mobile
- **Note**:


## Props (Variabili di Traffico)

### prop1 - Sezione Sito
- **Descrizione**: Sezione principale del sito
- **Esempi**: "Home", "Ricariche", "Profilo", "Supporto"

### prop2 - Tipo Contenuto
- **Descrizione**: Tipologia di contenuto visualizzato
- **Esempi**: "Articolo", "Video", "Tutorial", "FAQ"

### prop10 - User Agent Type
- **Descrizione**: Tipo di dispositivo
- **Valori**: "Mobile", "Desktop", "Tablet"

## Note di Implementazione

- Tutte le eVar hanno scadenza configurabile
- Gli eventi contatore si sommano nel periodo selezionato
- Le props NON persistono tra pagine, usale solo per analisi real-time
- Gli eventi custom possono essere usati come metriche nelle query
