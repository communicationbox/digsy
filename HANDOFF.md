# Digsy World — Handoff (ripartenza)

> Stato al termine dell'ultima sessione. Leggi anche `CLAUDE.md` (brief completo del progetto).

## Versione & deploy
- **Live: v0.15.7** — `src/version.js` (mostrata in fondo alla splash). **Bump a ogni build.**
- Deploy = **PhpStorm auto-upload di `dist/`** su https://digsy.dev-box.it/ (a volte va in ritardo di qualche minuto quando l'utente è via, poi recupera).
- Verifica live vs build:
  ```bash
  curl -s https://digsy.dev-box.it/ | grep -o 'index-[^"]*\.js'   # confronta con dist/assets/index-*.js
  ```

## Comandi
```bash
npm run dev        # http://localhost:5173
npm run build      # -> dist/
npm test           # suite Node (stub DOM), tenere VERDE (280 ok)
npm run e2e        # E2E VISIVI con Chrome headless: verifica HUD (line-height, menu, righe). NON regredire.
```
Ciclo tipico: edita → `npm test` → bump `version.js` → `npm run build` → `npm run e2e` → poll deploy.

## Cosa è stato fatto in questa sessione (novità principali)
- **Editor personaggio** (`/editor`): + nome (random di default, editabile) + "Personaggio casuale".
- **Intro** rifatta: zoom INTERO 2× (crisp, niente pixel staccati), prato con fiori, baloon FUORI dallo zoom, "▶ tocca per continuare", fadeout finale lento "Qualche anno dopo…". Sfondo editor nero.
- **Dono del nonno = fossile leggendario GREZZO** (non identificato) → si consegna al Museo per imparare il riconoscimento.
- **Museo — video tutorial 1ª volta**: inquadratura a 3/4, HUD/A/joystick spariti (mini-video), Curatore spiega Libro + DNA + "porta i grezzi", Digsy ringrazia. **Dialoghi AL CLICK** + "clicca per continuare" + Salta (regola cutscene, vedi sotto).
- **HUD mobile RIFATTO** (era il tormentone "scritte sovrapposte"): la causa era `#frame{line-height:0}` che collassava i testi a capo → fix `line-height:1.3` sugli overlay. HUD = barra flex; toggle 📊 sx, menu ☰ dx; coin/energia/📖/🎒 sempre visibili, stessa altezza, distribuiti; libro accessibile anche desktop. **Verificato con screenshot headless.**
- **Baloon (drawSayBalloon) rifatti**: ora in **coordinate schermo** (reset transform) → mai tagliati, mai sotto la HUD, larghi non alti. Bug era: clamp su `view.W` dentro un contesto traslato (stanza/camera). **Verificato con screenshot mobile+desktop.**
- **Menu splash**: "Nuova partita" (non "Continua"); riga di 4 icone quasi-quadrate (Trofei/Novità/Comandi/Credits). "Comandi" = **scorciatoie tastiera** (niente cheat), **nascosto su mobile**. **Credits = solo "Digsy World — di Marco Giacobazzi"**.
- **Zaino**: schede ridotte a **Reperti / Oggetti / DNA** (Oggetti = attrezzi+mezzi+torcia+cianfrusaglie+mappe, lista piatta). **Editor pixel zaino** su `/bag-editor`.
- **Bussola** = oggetto comprabile al Negozio, **attivabile** dallo zaino; il cursore città NON compare più di default. **Pergamena di ritorno** → città **col Museo** più vicina (funziona anche da dentro strutture/grotta).
- **Maestro Scavatore**: NPC esploratore **dentro il Museo** (`MENTOR`/`MENTOR_PATH` in `interior.js`): gira dall'atrio alla sala in basso a sinistra passando fra le due file di teche, ping-pong sui waypoint, verso dalla VELOCITÀ (niente moonwalk), nessun glifo sopra la testa. **E** → pannello con **barra XP** che spiega i livelli.
- **Scavo**: lento all'inizio (×1.5), sempre più veloce coi livelli (fino a ×0.5 al Lv11).
- **Yggdrasil**: landmark albero-mondo torreggiante, **super raro** (~5% dei landmark di prato). `gotolandmark` cicla su tutti.
- Meteo/stagioni graduali. Coppe UNICHE (`trophy.js`) nella Sala Trofei. Tasto destro + scorciatoie devtools disabilitati. Comando `achall` (completa traguardi). `achievement` assegnati SOLO in-game (mai dal menu).

## Regole/preferenze da rispettare (memoria)
- **Autore = solo Marco Giacobazzi** nei credit. MAI Claude/librerie (si è arrabbiato). Commit senza `Co-Authored-By`.
- **Cutscene**: fra un dialogo e l'altro si avanza **solo al click**, con **"clicca per continuare"** sotto + Salta in alto. Sempre bande nere + baloon + interazioni umane.
- Pixel-art: scale **INTERE** (le frazionarie spaccano i pixel = "quadratini staccati").
- Rispondere in italiano, stile cozy SNES, zero dipendenze runtime (Three.js lazy).
- Ogni feature nuova → check in `tests/run.mjs` (e/o `tests/e2e.mjs`) e tenerli verdi.

## Gotcha
- `#frame{line-height:0}` (per il canvas): ogni testo overlay DEVE avere `line-height` esplicito o le righe a capo si sovrappongono (bug storico mobile).
- I baloon canvas vanno disegnati in coord SCHERMO (reset `setTransform(view.K)`), non dentro traslazioni di scena.
- Deploy può ritardare: non farsi ingannare, ripollare.
- Test stub: `document.getElementById` può restituire nodi senza `classList.contains` → guardare i tipi.

## In coda (aperto)
- **#52 — Centrare lo scheletro sul tavolo**: serve la scelta di Marco su QUALE (anteprima Lab / vetrina Museo / pagina Libro). Non ancora fatto.
- Idee future già in `CLAUDE.md` (missioni museo avanzate, foto alle chimere, ecc.).

## Editor & tool
- `/editor` — pixel editor cappelli (esporta codice per `HATS` in `sprites.js`).
- `/bag-editor` — pixel editor zaino (griglia 24×28, palette, export codice/PNG, autosave localStorage `digsy_bag`).
- Console in gioco: tasto `` ` `` — cheat per test (`money`, `godmode`, `goto=`, `tour`, `weather=`, `season=`, `intro`, `achall`, `vanilla`, `help`…). Doc in `COMMANDS.md`.
