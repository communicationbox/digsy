# Karma dai commenti — cosa scrivere

r/CozyGamers blocca gli account con 0 karma **dai commenti**. Non serve un altro post: servono
commenti. Servono anche a te, non solo al contatore — un account che ha solo postato il proprio
gioco lo riconoscono a occhio e lo trattano come pubblicità.

## Come funziona davvero

Il karma arriva da **risposte utili a domande**, non da complimenti. Un "nice game!" prende zero
e ti fa sembrare un bot. Una risposta tecnica precisa in un thread di gamedev prende 5-30 punti,
perché lì la gente chiede e quasi nessuno sa rispondere. Tu hai scritto un gioco intero: sei
esattamente la persona che quei thread stanno aspettando.

**Obiettivo realistico:** 10-15 commenti in 3-4 giorni. Bastano e avanzano.

**Regole:**
- Mai nominare Digsy nei primi commenti. Se lo fai in ogni risposta diventi quello che spamma.
  Dopo una settimana, e solo se c'entra davvero, puoi dire "l'ho risolto così nel mio gioco".
- Rispondi a post **recenti** (meno di 6 ore). Su un thread di tre giorni fa non ti legge nessuno.
- Uno o due commenti per sub al giorno, non venti di fila.

## Dove

| Sub | Cosa cercare |
|---|---|
| r/gamedev | domande su procedurale, salvataggi, prestazioni, "how do I start" |
| r/roguelikedev · r/proceduralgeneration | generazione di mondi, noise, biomi |
| r/webdev · r/javascript | canvas, PWA, offline, prestazioni sul browser |
| r/PixelArt · r/pixelart | qualcuno chiede consigli sui suoi sprite |
| r/CozyGamers | thread "cosa sto giocando", raccomandazioni — **solo se il gioco l'hai giocato davvero** |
| r/IndieDev | thread settimanali di feedback reciproco |

---

## Commenti pronti

> Le parti fra `[ ]` sono le tue: senza, il commento è vuoto e si vede. Sono cose che sai già,
> non devi inventarti niente.

### 1 — "How do I make an infinite procedural world?"

```
Value noise with a saved seed is enough for a lot more than people expect. You don't store the
world, you store the seed — the world is a pure function of (x, y, seed), so any tile can be
recomputed on demand and it's identical every time.

Two things that bit me:
- Cache per tile, not per frame. I was calling the noise function 2-3 times for the same tile
  in one frame (terrain pass, collision pass, decoration pass) before I noticed.
- Anything the player CHANGES has to be stored separately, as a set of coordinates. The world
  stays a function; the diffs are the save file. Mine is a Set of "x,y" strings for dug tiles
  and it's a few KB after hours of play.
```

### 2 — "My procedurally generated [creatures/levels] all look the same"

```
Had exactly this. I generated 60 creature skeletons from a hash of the species id — skull
scale, limb type, tail shape, posture — and got 60 things that were measurably different and
felt identical. Every one was a quadruped with a slightly different snout.

Parameters interpolate. They hand you the AVERAGE of your design space over and over and never
the interesting corners. What fixed it was writing the 60 recipes by hand and keeping ONE
assembler that turns any recipe into geometry. The shapes are authored, the construction is
shared, so I still maintain one system and not 60 models.

Two tests make it safe: one asserts all recipes are distinct (uniqueness silently decays the
moment you add number 61), one flood-fills each assembled body to check it's actually connected
— hand-written recipes are exactly where you get a leg floating three units off the hip.
```

### 3 — "Is it worth making a game in plain JS / without an engine?"

```
Depends what you're making, but for a 2D tile game it's been fine. [Mio caso: nessuna
dipendenza a runtime a parte una libreria 3D caricata solo quando serve, build con Vite.]

What you get: it loads in a second, it runs on any phone, no install, and you own every line so
nothing is a black box when it breaks.

What you pay: everything is yours to write. Camera, collision, save migrations, input on touch
AND keyboard, audio. None of it is hard, all of it is time. If your game needs physics or 3D or
a level editor, use an engine — you'd just be rewriting it worse.
```

### 4 — "How do you handle save data / breaking changes to the save format?"

```
Put a version number in the save from day one, even if it's just `v: 1`. When you load, look at
it and run the migrations forward to the current version. Never assume a field exists.

The one that actually hurt me was CONTENT changes, not schema changes: I moved buildings around
in the town layout and old saves put the player inside a wall. Now the boot check tests whether
the saved position is solid and, if it is, walks outward to the nearest free tile. It costs
about ten lines and it's saved me twice.

Also: a save from a NEWER version than the code should be loaded as-is, not "fixed". Better a
slightly wrong load than a corrupted file.
```

### 5 — "How do I make a browser game work offline / installable?"

```
Service worker plus a manifest gets you installable on Android, desktop and iOS ("Add to Home
Screen"), with its own icon and no browser chrome.

The rule that matters, and that everyone gets wrong once: NOBODY should be stuck on an old
version. Fetch index.html and the service worker itself from the network every time — the
cached copy is only a fallback for when there's no connection. Hashed assets you can cache
forever, that's what the hash is for.

Gotcha on Apache: when several <FilesMatch> blocks match the same file, the LAST one wins. My
"cache .js for a year" rule was below the service worker rule and silently cancelled it, so
people kept the old worker for months. My deploy script checks the order now.
```

### 6 — "Pixel art keeps looking blurry / wrong when scaled"

```
Three things, in order of how often they're the cause:

1. `image-rendering: pixelated` in CSS is not enough — the canvas CONTEXT has its own setting,
   and `ctx.imageSmoothingEnabled = false` is what actually stops interpolation when you draw.
2. Only integer scales. ×2, ×3, ×4. A ×2.5 splits pixels and there's no way to make that look
   right.
3. Snap everything you draw to the physical pixel grid. If your camera scrolls by fractions of
   a pixel, static objects visibly vibrate while you walk — it reads as "cheap" and it takes
   forever to work out why.
```

### 7 — "How do you know if people actually play your game?"

```
I send one line every five minutes: minutes played, day reached, version. No IP, no account,
the id is random and lives on the device, and it's a switch in the settings. That's enough to
answer the only two questions that matter early: how long do people last, and where do they
stop.

Mine says most people who bounce do it in the first five minutes. That single number changed
what I worked on more than any amount of feedback — you can't fix an ending nobody reaches.

Read the numbers as hints, not facts. With a handful of testers one long session might just be
a tab left open.
```

### 8 — In un thread cozy dove qualcuno chiede consigli

> Questo scrivilo SOLO su un gioco che hai giocato davvero. Se non ne hai, salta questa e usa
> le altre: mentire su Reddit lo scoprono e non vale il karma che daresti via.

```
[Nome del gioco] if you haven't. [Una cosa concreta che ti è piaciuta — un momento, non un
aggettivo: "the first time it rains and the shop owner comes out to close the shutters"
funziona, "it's relaxing" no.]

[Se c'è: e una cosa che non ti ha convinto. I commenti solo entusiasti si leggono come
pubblicità; quelli con una riserva si leggono come una persona.]
```

---

## Quando ripresentarti su r/CozyGamers

Dopo 10-15 commenti fatti così, riprova. Se il messaggio c'è ancora, aspetta qualche giorno:
alcuni sub guardano anche l'ETÀ dell'account, non solo il karma, e non c'è modo di accelerarla.

Nel frattempo r/WebGames, r/playmygame e r/IndieDev di solito non hanno questa soglia: il piano
in `POST-REDDIT.md` partiva da lì apposta. Postare là ti fa anche karma, che è quello che ti
serve per entrare qui.
