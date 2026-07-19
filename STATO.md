# Digsy World — stato del progetto (v0.16.4)

> Analisi fatta leggendo il codice, non il brief. Ogni affermazione ha un riferimento `file:riga`.
> Documento di lavoro: si aggiorna, non è un archivio.

## 0. Il quadro in breve

7.162 righe in 32 moduli, 303 test verdi + 9 e2e, zero dipendenze runtime (Three.js lazy).
La base tecnica è solida: mondo procedurale deterministico, 60+6 specie con blueprint unici,
6 biomi, interni camminabili, museo-galleria, grotte, meteo, stagioni, i18n, cheat console.

**Il gioco è costruito bene ma non è ancora un gioco finito**: il loop centrale
(scava → museo → DNA → risveglia) funziona, tutto ciò che sta *dopo* non premia, e la
prima ora è molto più dura di quanto sembri. I rischi veri non sono il gameplay: sono
**perdita di salvataggi** e **mobile inusabile in punti precisi**.

---

## 1. Criticità P0 — da fare prima di mostrarlo a chiunque

### 1.1 Il salvataggio può sparire, in silenzio
- `state.js:41` — `save()` inghiotte l'eccezione di quota: in Safari privato **non salva mai**
  e il giocatore non lo sa. `S.dug`/`S.chopped`/`S.mined`/`S.picked` crescono **senza limite**
  (`gameplay.js:99`), quindi la quota si esaurisce davvero in una partita lunga.
- `state.js:44` — save corrotto → `load()` torna `null` → `initState()` crea un `fresh()` →
  l'autosave a 5s (`main.js:108`) lo **sovrascrive entro 5 secondi**. Recupero impossibile.
- `state.js:54` — `saveToSlot()` scrive `{...S}` **anche sotto cheatLock**: la promessa
  "i cheat non sono distruttivi" è falsa se passi dal menu Salva.
- Nessun `version` nello schema (`state.js:16`): impossibile distinguere save vecchi da nuovi,
  impossibile rollback. Le 40 migrazioni di `initState()` non hanno **nessun test**.
- Due schede aperte = l'ultima vince, l'altra partita è persa.

**Soluzione**: `S.v = N` nello schema + backup rotante (`SK_bak` prima di ogni sovrascrittura) +
`save()` che ritorna esito e mostra un avviso se fallisce + dedup di `S.dug` (Set → array solo
al salvataggio) + `saveToSlot` che rifiuta sotto cheatLock + un test che carica 3 save legacy.
Mezza giornata, elimina l'intera classe di bug "ho perso tutto".

### 1.2 Su mobile metà interfaccia non scorre
`style.css:3` — `body{touch-action:none}` (serve al gioco) si eredita su **ogni** contenitore
scrollabile: `.sheet`, `.bag-scroll`, `.bkpage`, `.sp-hall`, `.sp-log`, `#sp-slots`, `#cmdout`.
Col dito non si scorre: negozio, zaino, trofei, changelog ed editor sono **tagliati sotto la piega**.

**Soluzione**: `touch-action:pan-y` su quei 7 selettori. Dieci minuti, sblocca mezza UI mobile.

### 1.3 Lo swipe nello zaino butta via i reperti
`ui.js:723` + `:728` — qualunque `pointerup` fuori dal riquadro scarta l'oggetto. Con lo scroll
bloccato (1.2) il giocatore *prova a scorrere* e **perde un fossile**, senza conferma.

**Soluzione**: richiedere una soglia di trascinamento (>40px) + conferma per rari e superiori,
oppure sostituire il drag con un pulsante "lascia a terra" nella riga.

### 1.4 L'editor personaggio si chiude per sbaglio e salta il regalo
`ui.js:124` — il click sullo sfondo chiude la modale anche in modalità `opaque`. Se succede
nell'editor iniziale, `onDone` non parte mai: niente intro, niente `grantStarterGift()`
(`main.js:104`). Il giocatore inizia senza il fossile del nonno.

**Soluzione**: nell'editor disabilitare chiusura da sfondo e ✕; bottone "Inizia" sticky in basso.

---

## 2. Economia — i numeri veri

### 2.1 La prima ora è la parte peggiore
Si parte con **0 monete e senza pala** (`state.js:18,95`). L'unica fonte iniziale sono gli oggetti
di superficie, densità **0,8%** (`world.js:121`), valore medio 2,8🪙: servono ~6 raccolte,
**~750 tile perlustrate**, per comprare la pala da 15🪙. E il "dono del nonno" — un **leggendario**
— al museo viene esposto **senza compenso** (`gameplay.js:563`): il tesoro della storia non
sblocca nulla.

**Soluzione**: pala di partenza (o 20🪙 iniziali), e il primo pezzo consegnato paga un premio
"prima scoperta". Il tutorial narrativo e il tutorial economico devono coincidere.

### 2.2 L'energia è un muro che si compra
30⚡ = 30 scavi ≈ 60-90 secondi di gioco attivo. Poi: dormire (gratis ma solo ogni mezza
giornata = **600 s reali**, `gameplay.js:577`) o ristori a 15🪙. Rapporto gioco/attesa a Lv1 ≈ **1:7**.
Ma il ristoro costa **1🪙 per energia fisso** mentre la resa per energia va da 2,0 (prato) a
**42 (grotta)**: appena hai il piccone il limite sparisce.

**Soluzione**: rigenerazione lenta col tempo (1⚡ ogni ~30s) così l'attesa non è mai un muro secco,
e prezzo del ristoro scalato col livello. Oppure: l'energia non blocca lo scavo ma lo rallenta.

### 2.3 Numeri fuori scala (tabella)

| Cosa | Realtà nel codice | Problema |
|---|---|---|
| Fontana | 1🪙 → EV **5,8🪙**, **0 energia**, ignora il limite zaino, dà pezzi **già identificati** (`gameplay.js:307-330`) | Stampante di monete che scavalca il museo |
| Grotta | **42🪙/energia**, 12× lo scavo (`cave.js:59-65`) | Gate a soli 130🪙; rompe la scala |
| Mappe tesoro | ritorno **0,49× / 0,36× / 0,24×** (`gameplay.js:332`) | Sempre in perdita, e peggiorano col prezzo |
| Rarità dichiarate 58/27/12/3 | reali **84,7 / 9,9 / 4,4 / 1,1** (`gameplay.js:39`) | I pesi sono per specie, non per rarità |
| Teca leggendaria 5/5 | ~2.960 scavi ≈ **8-15 ore** | Grinding cieco senza tappe intermedie |
| Roccia col piccone | **eccezionale garantito**, sempre la **stessa specie** (`data.js:38-40`) | Redditizio e noioso insieme |
| Missioni | **0 XP** (`quests.js:75`), ma il Maestro dice il contrario (`ui.js:245`) | Bug + bugia nell'UI |
| Missione "pezzo" | prende il **primo** item, anche un cranio leggendario da 95🪙 per 66🪙 (`quests.js:80`) | Punisce chi colleziona |
| Locanda | gratis (`gameplay.js:581`) | Nessun sink; il ristoro diventa inutile |
| Identificazione museo | `ready: S.day` → **istantanea** (`gameplay.js:550`) | Il ramo "torna domani" è codice morto |

**Soluzione mappe** (la più elegante): la mappa non garantisce una *rarità* ma **un pezzo che ti
manca** per completare una teca. Diventa lo strumento anti-grinding del tardo gioco e giustifica
i 480🪙.

---

## 3. Il gioco finisce nel vuoto

Il loop `scava → museo → DNA → risveglia` è l'unico chiuso. Tutto il resto è a fondo cieco:

- **Chimere** (`gameplay.js:617`): costano 3 pezzi + 40🪙 + fialette. Danno **0 XP, 0🪙, 0 statistiche**
  — solo una passeggiata nel parco.
- **Specie risvegliate**: +25 XP e uno sprite nel Libro. È il sink più profondo col premio più sottile.
- **Cappelli premium**: **950🪙 totali, nessun effetto**.
- **12 traguardi**: nessuna ricompensa.
- **Stagioni**: zero effetti meccanici. E in 5 zone su 6 non si vedono nemmeno (`ZONE_TILES`
  sovrascrive la palette, `render.js:29`); in inverno i Prati sono identici alle Lande Gelide.
- **Meteo**: solo `rain ×1,1` (`weather.js:41`); 4 tipi su 6 sono decorativi. E il tempo dipende
  **solo dal giorno**, non dalla zona (`weather.js:16`): piove ovunque contemporaneamente.
- **18 landmark**: nessun loot, nessuna interazione. Yggdrasil ha ~1,7% di probabilità e non dà nulla.
- **Le 6 specie di grotta** — le più rare del gioco — non hanno piedistallo, non sono nel Libro,
  non sono risvegliabili, ma entrano in `S.codex`: il contatore può mostrare **66/60** (`ui.js:525`).
- **Narrativa**: prologo col nonno, sei cutscene al museo, poi **niente**. Nessun handler su
  `codex.length === 60` o `awakened.length === 60`. La promessa dell'intro ("le farò rivivere tutte")
  è compibile e **non produce alcun evento**.

**Soluzioni, in ordine di resa:**
1. **Settima sala del museo per le grotte** — sistema già scritto, basta collegarlo: le specie di
   grotta entrano in `SPECIES` con `zi:6` gestito, hanno piedistalli, Libro e risveglio. Sistema
   anche il 66/60.
2. **Chiusura narrativa**: quando completi una zona (10/10 esposte), il Curatore ti consegna una
   **lettera del nonno** su quella zona — 6 lettere, una per bioma. Alla sesta: il finale.
   Riusa la cutscene già esistente, costo bassissimo, dà un arco al gioco.
3. **Le chimere servono a qualcosa**: ogni chimera nel parco dà un piccolo bonus passivo
   (una +5% drop, una +1 slot zaino…), visibile nel pannello del parco. Il sink più costoso
   deve avere il ritorno più visibile.
4. **Traguardi con premio**: monete, un cappello esclusivo, uno slot zaino. Sono già 12.
5. **Meteo per zona + effetti**: nebbia riduce la vista (già hai il sistema notte), sabbia rallenta,
   neve lascia impronte, pioggia +drop. Serve solo passare `zoneId` all'hash (`weather.js:16`).

---

## 4. Varietà: il mondo è vasto, gli edifici sono fotocopie

| Elemento | Stato |
|---|---|
| Terreno, zone, decori, siti, relitti, landmark, grotte | procedurali ✔ |
| **Città** | **3 layout fissi**, stessi 6 edifici nello stesso ordine, ±1 tile di jitter (`world.js:194`). Non guardano mai la zona: un borgo nelle Lande Gelide è identico a uno nelle Dune |
| **Interni** | stanza 10×7 fissa, NPC sempre al centro, 2 mobili per mestiere. Locanda, negozio e sartoria hanno **pavimento identico** |
| **Museo** | **identico ovunque**: geometria, 6 sale, ordine costante |
| **Grotta** | un solo layout 64×48, varia il seed |
| Decorazioni | 5 tipi nei prati, **3** nei ghiacci; `boulder` uguale in tutte e 6 le zone |

**Soluzione a basso costo**: far dipendere dalla zona i *materiali*, non i layout — palette di muri
e tetti, materiale della strada, insegne, e 1 arredo urbano tematico per bioma (`world.js:229`).
Stessa pianta, città che sembrano diverse. Lo stesso per gli interni: pavimento e parete per zona.

---

## 5. Onboarding: due toast e poi arrangiati

Tutto l'insegnamento non narrativo sta in **2 toast da 2,6 secondi** nei primi 5 secondi
(`ui.js:103-110`) — e su mobile ne resta **uno solo** perché il secondo sfratta il primo (`ui.js:28`).
Non sono più rileggibili: la guida HUD esiste (`ui.js:216`) ma l'unico indizio che sia
cliccabile è `cursor:help`, invisibile al tocco.

Mai spiegati: **lo scavo** (la meccanica primaria non ha prompt, `ui.js:94`), mappe del tesoro,
bussola, DNA, chimere, compagno e le sue abilità, meteo, stagioni, energia, zaino pieno, grotte.
La console comandi è raggiungibile **solo col tasto `\`**: su mobile non esiste, e il menu che la
documenta è `display:none` su touch (`style.css:414`).

**Soluzioni**: (a) un **diario/aiuto** riapribile dal menu con le stesse righe dei toast;
(b) prompt contestuali one-shot al primo incontro con ogni sistema (prima volta che vedi acqua,
prima volta che lo zaino è pieno, prima volta a energia < 5); (c) il **Maestro Scavatore** — che
oggi è un NPC muto con un pannello XP — diventa il tutor: chiedigli "come funziona X".

## 5-bis. Feedback: le azioni più importanti sono mute
`playSfx` esiste con 7 suoni ma **assemblare una chimera, risvegliare una specie, sbloccare un
traguardo, ricevere il Libro** non fanno alcun suono (`gameplay.js:617,656`, `ui.js:53`).
Nessun suono di errore (soldi insufficienti, energia finita, zaino pieno). L'intera UI è muta.
Il chip ⚡ non cambia aspetto a energia bassa, il chip 🎒 non segnala lo zaino pieno.

**Soluzione**: 3 suoni nuovi (successo lungo, errore, click UI) + banner per chimera/risveglio +
chip che pulsa in rosso sotto 5⚡. Due ore, cambia radicalmente la sensazione.

---

## 6. Tecnica: dove si spezzerà se non intervieni

- **Concentrazione**: `render.js` 1.667 righe, `ui.js` 1.146, `gameplay.js` 695 = **49% del codice**.
  `openBag()` 151 righe, `drawMuseumGallery()` 150, `render()` 134.
- **`ui.js` è il controller travestito da view**: importa **45 simboli** da gameplay (`ui.js:13`).
  5 cicli di import confermati; reggono solo perché tutto è `function` hoisted. Il giorno che
  qualcuno scrive `export const f = () => …` in un modulo del ciclo, si rompe al caricamento.
- **Allocazioni per frame** (`render.js:1503`): ~600 oggetti + 600 closure per frame, più `sort()`,
  più `townForTile` ricalcolato nel secondo passaggio notturno, più il "fiuto" del compagno che fa
  **225 `pickupAt()` per frame** per disegnare 4 pixel (`render.js:1581`).
- **`townInfo()` non è cachata per tile** (`world.js:249`) ed è chiamata ≥2 volte per tile per frame.
- **`caveNodeDone()`** fa `Array.includes` lineare per ogni tile in vista (`cave.js:36`).
- **10 cache `Map` senza eviction**: crescono con l'area esplorata, mai liberate.
- **Test**: un solo `S` condiviso da 30 sezioni, ordine-dipendenti per ammissione dei commenti;
  `tests/run.mjs:1064` è tautologico (`check(..., true)`); `e2e.mjs` testa una **copia a mano**
  del DOM già divergente da `index.html`, ed **esce verde** se Chrome o `dist/` mancano.
  Zero copertura su `main.js`, `intro.js`, `skeleton3d.js` e su tutto il percorso inglese.
- **6 export morti**, ~28 export che dovrebbero essere privati.

**Soluzioni**: cache per tile su `townInfo`; `Set` per `caveDug`; "fiuto" ricalcolato ogni 200ms
invece che per frame; spezzare `render.js` in `render/terrain|entities|interiors|cave`;
e2e che carica `index.html` vero invece della copia.

---

## 7. Piano proposto

**Fase 1 — sicurezza (mezza giornata)**
Versioning + backup del save, avviso quota, `saveToSlot` sotto lock, dedup `S.dug`,
`touch-action:pan-y`, drag-to-discard con soglia, editor non chiudibile per sbaglio.

**Fase 2 — la prima ora (1 giorno)**
Pala iniziale, premio alla prima consegna, rigenerazione energia, guida riapribile, prompt one-shot,
3 suoni + banner, chip energia/zaino che avvisano.

**Fase 3 — dare un fine (1-2 giorni)**
Grotte nel museo/Libro (fix 66/60), lettere del nonno per zona + finale, traguardi con premio,
chimere con bonus passivo, mappe che completano le teche.

**Fase 4 — mondo vivo (2-3 giorni)**
Materiali di città e interni per bioma, meteo per zona con effetti reali, stagioni visibili in tutte
le zone, landmark che danno qualcosa.

**Fase 5 — manutenzione**
Spezzare `render.js`/`ui.js`, cache mancanti, e2e sul DOM vero, test delle migrazioni,
pulizia degli export morti.
