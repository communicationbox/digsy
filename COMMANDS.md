# Console comandi — Digsy World

Premi **`\`** (backslash) in gioco per aprire la console. Scrivi un comando e premi **Invio**
(esegui) o **Esc** (chiudi). **Tab** completa col primo suggerimento; sotto l'input compaiono i
suggerimenti mentre scrivi (es. `goto=pal` → `goto=palude`).

> ⚠️ I comandi **cheat** (segnati sotto) **non vengono salvati**: al primo cheat il salvataggio
> si congela e viene fatto uno snapshot. Il comando **`vanilla`** rimuove tutti i cheat e
> ripristina il salvataggio normale (monete, museo, DNA, ecc.). Mentre i cheat sono attivi l'HUD
> mostra il tag **🐞 CHEAT**.

## Comandi

Ordinati per **gruppo** (in gioco `help` li elenca tutti). Cheat ✔ = congela il salvataggio
finché non dai `vanilla`.

### Risorse e tempo
| Comando | Cheat | Effetto |
|---|:---:|---|
| `money=40` | ✔ | Imposta le monete (alias `coins`, `monete`) |
| `energy=40` | ✔ | Imposta l'energia, alza il massimo se serve (alias `en`, `energia`) |
| `heal` | ✔ | Energia al massimo |
| `day=10` | ✔ | Imposta il giorno |
| `season=inverno` | ✖ | Cambia stagione (`primavera`/`estate`/`autunno`/`inverno` o `0-3`) |
| `speed=5` | ✔ | Velocità di movimento, da **1 a 20** |
| `weather=pioggia` | ✖ | Forza il meteo (`pioggia`/`sabbia`/`nebbia`/`cenere`/`neve`/`sereno`/`off`; alias `meteo`) |
| `night` | ✔ | Notte fonda **+ missione lucciole** (per provarle; alias `notte`). La missione vera è **rara** e **stagionale** (estate) |
| `dawn` | ✔ | Riporta all'alba (alias `alba`) |

### Sblocca
| Comando | Cheat | Effetto |
|---|:---:|---|
| `godmode` | ✔ | Sblocca e completa **tutto** (`goditem`+`goddna`+cosmetici+museo+libro+risvegli), infinito, ×5, **volo** (alias `god`) |
| `goditem` | ✔ | Ogni pezzo di ogni specie identificato + attrezzi + mezzi + mappe |
| `goddna` | ✔ | DNA infinito per tutte le specie |
| `godletters` | ✔ | Tutte le lettere del nonno, finale compreso (alias `letters`, `lettere`) |
| `achall` | ✖ | Sblocca tutti i traguardi (alias `achievements`, `traguardi`) |

### Compagni
| Comando | Cheat | Effetto |
|---|:---:|---|
| `companion=grotta` | ✔ | Compagno di quel **TIPO** (`terra`/`acqua`/`albero`/`roccia`/`grotta`), rarità opzionale — `companion=terra leggendario` (alias `compagno`, `buddy`) |
| `mount` | ✔ | Compagno di **grotta leggendario** e **su in volo** (in grotta non si vola; alias `cavalca`, `ride`) |
| `chimera` | ✔ | Crea una **chimera** di prova (passeggia nel parco, sceglibile come compagno; alias `chimere`) |

### Vai a
| Comando | Cheat | Effetto |
|---|:---:|---|
| `goto=palude` | ✖ | Bioma indicato (`prati`/`dune`/`boschi`/`terre`/`palude`/`ghiacci`) |
| `goto=grotta` | ✖ | Un imbocco di **grotta** vero (all'uscita ci torni) |
| `goto=city` | ✖ | Città **grande** (col Museo) più vicina |
| `gotosite` | ✖ | Sito di scavo più vicino |
| `gotowreck` | ✖ | Relitto in mare più vicino (attiva la barca) |
| `gotolandmark` | ✖ | Landmark più vicino (alias `goland`) |
| `tour` | ✖ | Prossima cosa speciale **non ancora vista** (landmark/grotta/sito/relitto; alias `explore`, `esplora`) |

### Prova minigiochi e scene
| Comando | Cheat | Effetto |
|---|:---:|---|
| `prep` | ✔ | Tavolo di **preparazione** (`prep=raro\|eccezionale\|leggendario`; alias `minigioco`, `tavolo`) |
| `toss` | ✔ | Minigioco della **fontana** (mira; alias `fontana`, `fountain`) |
| `dupes` | ✔ | 3 **doppioni** da fondere (`dupes=raro\|eccezionale`; alias `doppioni`, `fondi`) |
| `museo` | ✔ | 3 doppioni **già consegnati** + città col Museo (premi «Ritira» per il restauro; alias `museum`) |
| `stress=1..5` | ✔ | Riempie il gioco e **misura gli fps** sul dispositivo |
| `intro` | ✖ | Rivedi il filmato introduttivo (alias `storia`, `story`) |

### Sistema
| Comando | Cheat | Effetto |
|---|:---:|---|
| `fly` | ✔ | **Attraversa gli ostacoli** (noclip, on/off) — diverso da `mount` (che cavalca il compagno) |
| `vanilla` | ✖ | Toglie i cheat e **ripristina il salvataggio** (alias `reset`, `ungod`) |
| `help` | ✖ | Elenco di tutti i comandi |

## Compagni — provare i poteri

Il potere di un compagno dipende dai **tratti**: il **TIPO** (la fonte della specie, o della
specie del cranio per le chimere) decide *che* aiuto dà, la **RARITÀ** *quanto*.

- `companion=terra` · `companion=acqua` · `companion=albero` · `companion=roccia` · `companion=grotta`
  scelgono al volo un compagno di quel tipo. Rarità opzionale: `companion=acqua eccezionale`
  (default **leggendario**, così provi subito i poteri speciali).
- I **leggendari** di terra/acqua/albero/roccia **raccolgono da soli**: vanno a una casella,
  lavorano con animazione e ti portano il fossile (lento, e solo a zaino non pieno).
- Il **leggendario di grotta** è un **fossile volante**: `mount` (o **dallo zaino**, sezione
  Mezzi) lo cavalca e sorvoli la mappa attraversando tutto — **in grotta si scende e si cammina**.
- `chimera` mette una chimera nel parco: comodo per provare il **parco** e la scelta del
  compagno senza `godmode`.

Ogni compagno, a prescindere dal tipo, dà anche **fiuto** (segnala i reperti a terra) e
**bussola** sempre accesa.

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

## `museo` — prova il tavolo nel FLUSSO VERO

`museo` (alias: `museum`, `gotomuseum`)

Prepara tre **doppioni raro/eccezionale/leggendario GIÀ consegnati** (li mette nel lotto in
lavorazione, marcato idoneo al restauro) e ti **teletrasporta alla città col Museo**. Al Museo
premi **«Ritira»**: i doppioni tornano a te e il **Curatore propone il restauro** del migliore
(bottoni **Restaura / Salta**). È il flusso vero: il restauro si offre **al ritiro**, solo se hai
consegnato **≥3 raro+ insieme**, sul **miglior doppione** che ti torna, ed è **saltabile**.

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
