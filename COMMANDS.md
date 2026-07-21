# Console comandi — Digsy World

Premi **`\`** (backslash) in gioco per aprire la console. Scrivi un comando e premi **Invio**
(esegui) o **Esc** (chiudi). **Tab** completa col primo suggerimento; sotto l'input compaiono i
suggerimenti mentre scrivi (es. `goto=pal` → `goto=palude`).

> ⚠️ I comandi **cheat** (segnati sotto) **non vengono salvati**: al primo cheat il salvataggio
> si congela e viene fatto uno snapshot. Il comando **`vanilla`** rimuove tutti i cheat e
> ripristina il salvataggio normale (monete, museo, DNA, ecc.). Mentre i cheat sono attivi l'HUD
> mostra il tag **🐞 CHEAT**.

## Comandi 

| Comando | Cheat | Effetto |
|---|:---:|---|
| `money=40` | ✔ | Imposta le monete (alias: `coins`, `monete`) |
| `energy=40` | ✔ | Imposta l'energia (alza il massimo se serve; alias `en`, `energia`) |
| `day=10` | ✔ | Imposta il giorno di gioco |
| `speed=5` | ✔ | Velocità di movimento, da **1 a 20** |
| `heal` | ✔ | Energia al massimo |
| `night` | ✔ | Notte fonda **+ missione lucciole attiva** — per provare le **lucciole** (esci all'aperto; alias `notte`). La missione vera è **stagionale** (estate) |
| `dawn` | ✔ | Riporta all'alba (alias `alba`) |
| `toss` | ✔ | Apre il **minigioco della fontana** (mira) ovunque (alias `fontana`) |
| `godmode` | ✔ | Sblocca e completa **tutto**, infinito, velocità ×5, **volo** (alias `god`). Comprende `goditem` (fossili + attrezzi + barca + mezzi + mappe) e `goddna`, più: cosmetici sbloccati, museo completo, libro completo, specie risvegliate, e `fly` attivo |
| `goddna` | ✔ | DNA infinito per tutte le specie |
| `goditem` | ✔ | Ogni pezzo di ogni specie, già identificato, nello zaino |
| `goto=palude` | ✖ | Teletrasporto al bioma indicato (`prati`, `dune`, `boschi`, `terre`, `palude`, `ghiacci`) |
| `goto=city` | ✖ | Teletrasporto alla città grande più vicina |
| `vanilla` | ✖ | Toglie i cheat e **ripristina il salvataggio** (alias `reset`, `ungod`) |
| `help` | ✖ | Elenco dei comandi |

## Aggiungere un comando

Modifica `src/commands.js`: aggiungi una voce a `COMMANDS` con `type` (`num` \| `str` \| `action`),
`help`, eventuale `cheat: true`, opzionale `suggest(partial)` e la funzione `run(val)` che ritorna
il messaggio da mostrare.

## Lettere

`godletters` (alias `lettere`, `letters`) — sblocca tutte le lettere del nonno, finale
compreso. Si rileggono dallo **zaino → scheda Lettere**.

## Cronologia

Nella console i tasti **↑ / ↓** ripescano i comandi già dati, come in un terminale:
↑ risale, ↓ ridiscende fino a restituire quello che stavi scrivendo. Le ultime 60 righe
restano anche dopo un refresh (niente doppioni consecutivi).

## `dupes` — tre doppioni pronti da fondere

`dupes` · `dupes=raro` · `dupes=eccezionale` (alias: `doppioni`, `fondi`)

Mette nello zaino **3 pezzi identici** (stessa specie, stessa parte) di una specie della zona
in cui ti trovi, così la fusione si può provare subito invece di scavare per mezz'ora.
Poi: Laboratorio → **Fondi i doppioni** → «Fondi 3».

Con `dupes=eccezionale` si prova il salto a **leggendario**, che è il caso più interessante.

## `prep` — apre il minigioco (tavolo di preparazione)

`prep` · `prep=raro` · `prep=eccezionale` · `prep=leggendario` (alias: `minigioco`, `tavolo`)

Apre subito il **tavolo di preparazione** senza dover cercare un museo e avere il pezzo giusto.
Se non hai un reperto adatto te ne mette uno in mano; il bonus di valore finisce su quello.
Si spazzola trascinando il dito (o il mouse) sul fossile.

In partita normale il tavolo si apre **al Museo**, su **un pezzo per consegna** e solo da
**raro in su**: sui comuni sarebbe una catena di montaggio.

## `stress=1..5` — carica il gioco per davvero (beta)

Riempie la partita e misura i **frame veri sul dispositivo che hai in mano**. Serve a provare
i limiti su un telefono, non su una macchina da sviluppo.

| livello | creature | blocchi di mappa | scavi | salvataggio |
|---|---|---|---|---|
| 1 | 50 | 2.000 | 2.000 | 0,02 MB |
| 2 | 200 | 20.000 | 20.000 | 0,19 MB |
| 3 | 600 | 100.000 | 100.000 | 0,95 MB |
| 4 | 1.500 | 400.000 | 400.000 | ~4 MB |
| 5 | 4.000 | 1.000.000 | 1.000.000 | ~10 MB (oltre la quota del browser) |

Dopo il comando vai in un **parco di città**: è lì che le creature si vedono tutte insieme.
Il numero di fps compare in un avviso dopo due secondi di misura.

`vanilla` rimette tutto com'era (è un cheat: il salvataggio resta congelato finché non lo dai).
