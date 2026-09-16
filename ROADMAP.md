# Roadmap — FREEZE DELLE FEATURE (SCIOLTO)

> Stato: congelato dal 19/07/2026, **sciolto** — i quattro lavori sono chiusi e almeno tre
> persone che non sono l'autore hanno giocato 20+ minuti senza essere guidate.
> Questo file resta per la storia; nuove feature si possono di nuovo proporre e valutare.

## Perché

Il gioco ha 25 moduli e 66 specie, ma un solo verbo (`E`) e un loop che non chiede niente al
giocatore: scava → museo → esponi → ripeti, senza che nessuna scelta possa andare male.
L'ampiezza ha superato la profondità. Il 26° sistema non migliora il gioco: lo diluisce.

Quindi: **nessun sistema nuovo** finché i quattro lavori qui sotto non sono chiusi.

## Cosa NON è una feature nuova (si può fare sempre)

- correzioni di bug e regressioni
- rifinitura dell'arte esistente (Sprite Studio)
- bilanciamento dei numeri già in gioco
- leggibilità, testi, accessibilità, mobile
- test e refactor a comportamento invariato

## Cosa è congelato

Qualsiasi cosa introduca un nuovo sistema, una nuova schermata, una nuova valuta, un nuovo
tipo di collezionabile o un nuovo NPC con funzioni proprie. Se il dubbio esiste, è congelata.

## I quattro lavori per uscire dal freeze

1. ✅ **Un motivo per tornare domani**
   - Commissione del Museo a 3 giorni (`commission.js`): una alla volta, ricompensa grossa
     (monete + XP + una fialetta INTERA di DNA), scade senza penalità.
   - Specie notturne e stagionali (`when` in data.js): il raro d'acqua si pesca **solo di
     notte**, l'eccezionale di roccia si stacca **solo in una stagione**. Le finestre stanno
     di proposito su specie che hanno già una fonte dedicata, così scavando la terra ogni
     rarità resta raggiungibile a qualsiasi ora e il pity timer non resta mai a secco.
2. ✅ **Attrito sull'energia** — ristori a prezzo crescente (20 · 32 · 44 · 56) e **4 al giorno**.
3. ✅ **Un secondo verbo** — tavolo di preparazione al Museo (`prepare.js` + `prepui.js`):
   si spazzola la crosta, fino a ×1,5 di valore e XP. **UN pezzo per consegna**, e solo da
   raro in su: farlo su ogni reperto sarebbe una catena di montaggio, non un momento.
4. ✅ **Dieci sprite finiti a mano** — 5 rifiniti a mano nello Sprite Studio (haygiant,
   hollowstump, menhir, gianttree, ribcage); i restanti generati a codice giudicati a posto
   così come sono.

## Criterio di uscita — SODDISFATTO

I quattro lavori sono tutti in gioco e almeno tre persone che non sono l'autore hanno giocato
20 minuti ciascuna senza essere guidate (dati in `npm run tester`). Freeze sciolto.

## Fatto oltre la lista (perché i tester l'hanno chiesto)

- **fusione dei doppioni** (`fuse.js`): 3 pezzi uguali → 1 di rarità superiore. Nasce da un
  conto: tutto il comprabile costa ~2.720 monete, un pezzo ne vale ~15, quindi dopo ~180
  doppioni le monete non servono più mentre i doppioni continuano ad arrivare.
- **tre schemi di controllo** per dispositivo (leva fissa · leva sotto il dito · tocco;
  clic · segui il puntatore · sola tastiera) + mancini, con le opzioni che spariscono dove
  non hanno senso.
- **impostazioni** fuori dal salvataggio (`prefs.js`), suggerimenti disattivabili.
- **russo al 99%** (918 stringhe) con test su spazi, tag HTML e voci orfane.

## Fatte dopo (erano parcheggiate)

- **tetti a tema bioma**: `BIOME_BUILD` non è più inutilizzato — `roof()` in townArt.js ne
  usa colori e materiale (coppi · pietra · scandole · tegole · paglia · ardesia, più la neve
  nelle Lande) e `render.js` lo prende da `biomeBuild(x, y)`. Si vede in `npm run shot -- edifici`.

## Parcheggiate (buone idee, non ora)

- DNA con scadenza (rischia di essere punitivo in un gioco senza game over — da valutare dopo i playtest)
- foto alle chimere
- mercato con prezzi variabili
- multigiocatore asincrono / scambio reperti
- pesca come minigioco a sé
- **idle bounded legato al parco** (chiesto da un tester): parco che rende gocce di
  monete/DNA con tetto giornaliero + riepilogo "bentornato" al rientro con delta orario
  cappato (~8–12h). MAI auto-dig (svuota il verbo `E`), mai rendita che scala, mai
  decadimento. Da valutare col ripensamento di poteri chimere / risvegli.
