# Console comandi — Digsy World

**`\`** apre la console (solo in sviluppo). **Invio** esegue, **Esc** chiude, **Tab** completa,
**↑/↓** cronologia. `help` elenca tutto nella lingua del gioco.

Nomi in **inglese corto**; i **valori** si scrivono in inglese o in italiano (`weather=rain` =
`weather=pioggia`). I cheat (✔) accendono il tag 🐞 e si annullano con **`vanilla`**, che rimette
la partita com'era prima del primo cheat.

| Comando | Cheat | Cosa fa |
|---|:---:|---|
| `money=500` | ✔ | monete |
| `energy=60` | ✔ | energia (alza il massimo se serve) |
| `heal` | ✔ | energia piena |
| `day=10` | ✔ | giorno |
| `speed=5` | ✔ | velocità 1-20 |
| `season=spring\|summer\|autumn\|winter` | | stagione (anche 0-3) |
| `time=night\|dawn\|day` | ✔ | ora del giorno; `night` attiva anche le lucciole |
| `weather=rain\|sandstorm\|fog\|ash\|snow\|clear\|off` | | meteo |
| `market=low\|normal\|high\|record\|off` | | prezzi del Negozio |
| `god` | ✔ | sblocca e completa **tutto** (volo compreso) |
| `god=items\|dna\|amber\|letters\|furniture\|trophies` | ✔ | sblocca solo quella parte |
| `go=city\|park\|site\|water\|wreck\|wonder\|bones\|cave\|next` | | teletrasporto; `next` = prossima cosa speciale non vista |
| `go=<bioma>` | | `prati dune boschi terre palude ghiacci` |
| `play=prep [rarità]` | ✔ | tavolo di preparazione |
| `play=restore` | ✔ | doppioni al Museo pronti per il restauro |
| `play=toss` | ✔ | fontana |
| `play=skeleton` | ✔ | montaggio dello scheletro |
| `play=egg` / `play=hatch` | ✔ | uovo nel cortile / schiudilo |
| `play=fuse [rarità]` | ✔ | 3 doppioni da fondere al Lab |
| `anim=hatch\|awaken\|banner\|letter` | ✔ | rivedi una **scena** senza aspettarla (alias `scena`, `animazione`) |
| `buddy=earth\|water\|tree\|rock\|cave [rarità]` | ✔ | compagno di quel tipo (leggendario di base) |
| `mount` | ✔ | drago di cristallo, in volo |
| `chimera` | ✔ | una chimera di prova nel cortile |
| `fly` | ✔ | attraversa gli ostacoli (on/off) |
| `stress=1-5` | ✔ | riempie il gioco e misura i frame |
| `info` | | stato del compagno (debug) |
| `intro` | | rivedi il filmato iniziale |
| `vanilla` | | toglie i cheat |

Rarità: `common rare epic legendary` (o `comune raro eccezionale leggendario`).

## Nomi vecchi
Funzionano ancora ma non compaiono in `help`: `godmode goditem goddna godamber godletters godfurn
achall goto gotopark gotosite gotowater gotowreck gotolandmark gotobone tour museo prep toss skfit
dupes playcomp layegg hatchegg night dawn companion compinfo` e gli alias italiani (`monete`,
`meteo`, `mercato`, `lettere`, `notte`, `alba`…). Stanno in `LEGACY` (src/commands.js), riscritti
nel comando nuovo.
