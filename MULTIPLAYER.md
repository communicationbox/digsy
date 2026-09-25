# Multiplayer — le regole decise, e come si costruisce

> Ramo `multiplayer`. Questo file è il verbale: le decisioni di gioco sono state prese una per
> una prima di scrivere una riga di rete, perché quasi tutte le scelte tecniche dipendono da
> loro. Se una decisione cambia, si cambia **qui** e poi nel codice.

## In una riga

Si gioca in due (o pochi) nel mondo di chi invita, in tempo reale, con la chat. Non c'è un
mondo pubblico, non c'è matchmaking, non ci sono sconosciuti: **si entra solo su invito di un
amico**, e solo mentre lui sta giocando.

## Le regole

**Il mondo è dell'ospitante. Quello che porti addosso è tuo.**
È la regola madre: da lì discende quasi tutto il resto.

1. **Mondo e orologio sono di chi ospita.** L'ospite riceve il seme e vede il cielo, il giorno
   e la stagione del padrone di casa. Non calcola il tempo: lo riceve.
2. **L'ospite gioca davvero.** Scava, taglia, pesca, raccoglie — e quello che consuma **resta
   consumato** nel mondo dell'ospitante. Per questo si invita solo chi si conosce.
3. **Casa e cortile si visitano, non si toccano.** Dentro `houseFootprint()` e `yardRect()`
   l'ospite entra e guarda: niente arredo spostato, niente dormire nel letto altrui. Sono due
   dei tre posti che il gioco ti fa costruire perché vengano visti; il terzo è il Museo.
4. **La notte passa quando l'ospitante lo decide.** Chi dorme sogna e aspetta. Se dormono
   tutti, alba diretta. Se dorme solo l'ospitante, compare il sogno e un pulsante *Svegliati*
   con due scelte — *al mattino* (la notte passa per tutti) o *di notte* (non è successo
   niente). L'ospite ha solo *Svegliati*: l'orologio non è suo. **L'energia la recupera solo
   chi stava dormendo**, e nell'istante in cui la notte passa — non quando ci si corica, o si
   andrebbe a letto e ci si rialzerebbe a ripetizione. Da soli: alba subito, come oggi.
5. **Niente pausa quando c'è gente.** Il tempo non si ferma mai per nessuno, nemmeno a menu
   aperto. I comandi restano bloccati come oggi: con lo zaino aperto non si cammina, ma il
   mondo va avanti. Da soli la pausa resta com'è.
6. **La mappa è dell'ospitante e si vede in due, 1:1.** Quello che l'ospite scopre riempie la
   carta del padrone di casa. La propria resta com'era.
7. **Al Museo si può consegnare**: i pezzi nuovi restano nelle teche dell'ospitante (è un
   regalo), i doppioni tornano a chi li ha consegnati.
8. **La roba caduta a terra la raccoglie chiunque.**
9. **La fontana: dieci lanci a testa.** I tentativi sono della persona, non della città —
   quindi la chiave in `S.fountains` deve portarsi dietro il **seme del mondo**, o i lanci
   fatti in casa d'altri esaurirebbero la fontana di casa propria (stessa cella, mondi diversi).
10. **Si torna dove si è partiti.** La posizione al momento dell'invito è quella del rientro.
11. **La visita non paga l'idle.** Stavi giocando, non eri via.

### Chi con chi

12. **Solo account Google.** L'identità è l'account, non il nome del personaggio (che si ripete).
13. **Amicizia con richiesta e accettazione**, tramite **codice amico o email**. Cercare per
    email non deve mai rivelare se un indirizzo è iscritto: la richiesta parte comunque e in
    silenzio.
14. **Pallino verde** nella lista amici, con l'opzione **«segnami offline»** — che vive sul
    **server**, perché è il server a rispondere alla domanda "è online?".
15. **Si invitano solo gli amici.** L'ospitante deve essere in gioco.
16. **Centro notifiche a schermo**, separato dalle lettere del nonno: quelle sono racconto, e
    una richiesta di amicizia accanto sgonfierebbe il momento in cui arriva una lettera.
    Le **richieste di amicizia aspettano**; gli **inviti a giocare scadono** in un paio di
    minuti, perché dall'altra parte c'è qualcuno fermo che aspetta.
17. **L'ospitante può mandare via** chi ha invitato: è casa sua.

### Chat

18. **Nuvoletta sopra la testa** (come parlano già gli NPC) **+ taccuino per persona**, dove la
    conversazione resta e si rilegge quando si vuole.
19. **Si tocca e si scrive**: la tastiera di sistema si apre, i comandi si spengono finché si
    scrive, il personaggio resta fermo (il mondo no, vedi regola 5).
20. **Nessuna moderazione**: è tutto su invito fra amici.
21. **La lingua è di chi scrive.** L'interfaccia resta tradotta, i messaggi no.
22. **Il taccuino sta sul dispositivo**, in una chiave sua — **non nel salvataggio**, che va
    anche in cloud e ha un tetto di dimensione contro cui il gioco ha già sbattuto una volta.
    Funziona perché la chat avviene solo mentre si è insieme: non esistono messaggi da
    recapitare a chi non c'è, quindi il server non ha niente da custodire.

## Cosa NON è

- Non è un mondo condiviso permanente: il tuo mondo resta tuo e nessuno ci entra se non lo inviti.
- Non è matchmaking: non si incontrano sconosciuti.
- Non è un server di gioco.

## L'architettura, in una frase

**Il centralino non è un server di gioco.** Il processo sulla VPS sa chi è online, recapita gli
inviti e inoltra i messaggi fra i presenti di una stanza. Non simula niente, non conosce le
regole, non tiene il mondo. L'autorità è il **client di chi ospita** — "il gioco è del server,
cioè di chi invita". Conseguenze: nessuna partita da far girare sul server, nessun movimento da
riscrivere, e se l'ospitante esce la stanza finisce e gli ospiti tornano a casa con quello che
hanno in tasca.

Il mondo **non si trasmette**: è deterministico dal seme. L'ospite riceve seme + diff (caselle
scavate, alberi tagliati, massi rotti, siti esauriti) e se lo rigenera identico. Durante la
partita passano solo le singole mutazioni, che sono coordinate: una manciata di byte. Il grosso
del traffico sono le posizioni.

Il server è una **VPS Ubuntu 24.04 con Node 22, systemd e Apache** già in ascolto su 443 — non
hosting condiviso. Quindi WebSocket vero (`ws` dietro `mod_proxy_wstunnel`), non polling.

## Le fette

Una per volta, ognuna provabile da sola.

1. ~~**Vedersi camminare.**~~ **FATTA** lato gioco e lato centralino (il centralino gira sulla
   VPS e due client veri si sono visti). Manca solo il passaggio su Apache, che vuole root:
   vedi `server/relay/INSTALLAZIONE.md`.
2. ~~**Il mondo dell'ospitante.**~~ **FATTA.** `CAMPI_MONDO` in state.js divide il salvataggio
   in due; `visita.js` mette da parte il proprio mondo, adotta quello ricevuto e al ritorno lo
   rimette identico. Tre cose vanno insieme o non funziona niente: il **seme** al generatore, le
   **cache del mondo buttate** (`resetWorldCaches`: sono indicizzate per coordinata, non per
   seme, e senza pulirle si vede un mondo cucito coi pezzi di due mondi diversi) e il
   **salvataggio spento** — `save()` stessa si rifiuta mentre sei ospite, o l'autosave ogni
   cinque secondi scriverebbe il mondo di un altro nel tuo.
   Il mondo **non viaggia**: viaggiano il seme e quello che è stato consumato. Le mutazioni
   (scavato/tagliato/spaccato/raccolto) partono dal punto in cui il gioco consuma e valgono per
   tutti. L'orologio lo manda l'ospitante ogni due secondi.
   Per ora l'ospite **non dorme** in casa d'altri e **non tocca** l'arredo: il sonno in
   compagnia col sogno è nella fetta 5.
3. **Amici e inviti.** Account, richieste, codice amico, pallino verde, centro notifiche.
   *Per intanto* si entra con un **codice di stanza** da dirsi a voce (menu → Amici): chi
   apre per primo è il padrone di casa. Serve a poter provare tutto il resto senza aspettare
   gli account, e sparirà quando ci saranno gli inviti veri.
4. ~~**Chat.**~~ **FATTA**, taccuino a schermo compreso (menu → Amici → Taccuino: l'elenco
   di chi si è sentito, dal più recente, e la conversazione con l'ora di ogni riga). Nuvolette sopra la testa con lo stesso fumetto degli NPC (sa già andare a capo e
   restare sotto la barra), taccuino in `localStorage` **fuori dal salvataggio**, riga di testo
   che si apre con **T** e col pulsante, e i comandi che si spengono mentre si scrive — quella
   regola c'era già (`isTyping`), la chat non ne ha avuta bisogno di una nuova.
   L'ora di ogni riga è **monotòna**: tre messaggi nello stesso millisecondo rendevano casuale
   l'ordine del taccuino, e "con chi ho parlato per ultimo" è il modo in cui si cerca una
   conversazione.
   Il nome della persona **lo sceglie qualcun altro**: non entra grezzo nel markup, e nel
   bottone dell'elenco non fa nemmeno da chiave — ripulito dei caratteri scomodi non
   combacerebbe più con la pagina salvata, e si aprirebbe una conversazione vuota. Va l'indice.
5. ~~**Le regole fini.**~~ **FATTE** (lato gioco):
   - **Il sonno in compagnia** (`sonno.js` decide, `dream.js` disegna, `main.js` li cuce: è
     l'unico posto che vede sia la rete sia il gioco). Chi va a letto **sogna e aspetta**: se
     dormono tutti la notte passa da sé, se dorme solo chi ospita è lui a scegliere fra
     *svegliati al mattino* (il tempo passa per tutti) e *alzati: non è successo niente*.
     L'ospite ha solo *svegliati*, perché l'orologio non è suo.
     L'**energia si rifà a chi ha dormito e nell'istante in cui la notte passa**: non al
     momento di coricarsi, o si andrebbe a letto e ci si rialzerebbe a ripetizione. Chi è
     rimasto sveglio vede passare il tempo con una dissolvenza e **resta stanco** — senza
     quella differenza basterebbe non dormire mai e aspettare che dorma qualcun altro, e il
     gioco glielo DICE invece di lasciarglielo scoprire.
     Il «ben riposato» del proprio letto si mette da parte e si riscuote col mattino, per la
     stessa ragione. E il sogno si chiude da sé se la stanza finisce mentre si dorme.
   - **Casa e cortile non si toccano davvero.** Scavare era già vietato a chiunque dalle regole
     di sempre (`yardInfo`, e la casa è solida), ma raccogliere e abbattere no: un ospite
     poteva ripulire il giardino di un altro mentre lui guardava. La domanda si fa in un punto
     solo (`casaAltrui` in gameplay.js, che chiama `puoToccare`), non sparsa per mezzo gioco.
     La roba **caduta a terra** resta di chi la raccoglie (regola 8): quella non è casa.
   - **La fontana porta il seme nella chiave** (`fountainKey`) solo quando si è ospiti: i dieci
     lanci sono della persona, ma la chiave è la cella della città, e due mondi diversi hanno
     città nella stessa cella. A casa propria la chiave resta nuda, o i salvataggi di oggi
     perderebbero il conto dei lanci già fatti.
   - **Manda via** (menu → Amici): lo può solo chi ospita, perché è casa sua. Non si stacca
     nessuna socket dal centralino — il centralino non conosce le regole e non deve impararle:
     si dice a voce alta nella stanza (`T.KICK`, mittente scritto dal centralino e non dal
     client) e il gioco di chi è mandato via torna a casa da solo.
   - **Plausibilità della velocità** (`MAX_VEL` in net.js): a piedi sono 92 px/s e il mezzo più
     veloce triplica; sopra 700 px/s non c'è margine di dubbio. Un salto **non è un'accusa** —
     fra amici invitati non esiste un anti-cheat vero — quindi non succede niente in
     automatico: si smette di far scivolare il personaggio attraverso mezza mappa (la storia si
     azzera: ricompare dov'è) e se ne tiene il conto, che l'ospitante vede accanto al nome.
     Cambiare scena non conta: una porta è un salto legittimo.

## Debito già noto, da non dimenticare

- **`window.__digsy` è nel bundle di produzione** e offre `cmd()` e `state()`. Non si può
  togliere: è la sonda da cui dipendono foto, e2e e prova su telefono, che girano tutti contro
  la build di produzione. Fra amici invitati non vale un anti-cheat vero; bastano il «manda
  via» e un controllo di velocità.
- **`public/privacy.html`**: aggiornata per quello che esiste OGGI — il centralino che inoltra
  nome, aspetto, posizione, mutazioni, orologio e chat fra i presenti di una stanza senza
  conservare niente, e il taccuino che resta sul dispositivo. **Va ripresa con la fetta 3**:
  la lista di amici e lo stato "sto giocando" visibile ad altri sono dati nuovi, e quelli sì
  che il server dovrà tenerli.
- **Su itch il gioco gira in un iframe su un'altra origine**: l'accesso Google coi cookie di
  terze parti è un problema noto. Probabile che il multiplayer semplicemente non esista nella
  versione itch.
- **Il deploy non copre `server/`**: il servizio del centralino va rilasciato a mano, e serve
  una via per farlo.
