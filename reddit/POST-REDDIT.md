# Digsy World su Reddit — piano, clip e post pronti

Compagno di `itch/itch-description.html`. Qui c'è tutto quello che serve per pubblicare
su Reddit senza farsi rimuovere il post.

Link ufficiali:
- Gioco: <https://digsy.dev-box.it/>
- itch.io: <https://giacomarco.itch.io/digsy-world>

---

## 0. Prima di tutto: le regole le verifichi TU

Le regole dei subreddit cambiano e i bot rimuovono in silenzio. Prima di ogni post,
apri `reddit.com/r/<sub>/about/rules` e controlla tre cose:

1. **Autopromozione**: permessa sempre, solo in un giorno dedicato, o solo nel megathread?
2. **Flair obbligatorio**: molti sub rimuovono automaticamente i post senza flair.
3. **Formato del titolo**: r/playmygame pretende un prefisso preciso, altri no.

Regola non scritta valida ovunque: **non postare lo stesso giorno su più sub**. Il filtro
antispam di Reddit guarda la cadenza, non il contenuto. E **rispondi a ogni commento**
nelle prime due ore: l'engagement precoce decide se il post sale o muore.

---

## 1. Calendario (2 settimane, non 2 giorni)

| Giorno | Sub | Angolo | Formato |
|---|---|---|---|
| 1 | r/WebGames | "gira nel browser, gratis" | Link + clip |
| 3 | r/playmygame | "provalo e dimmi dove si inceppa" | Post con template loro |
| 6 | r/IndieGaming | visivo puro | **Video nativo**, link nel primo commento |
| 9 | r/CozyGamers | tono e community | Testo + immagini, link solo se ammesso |
| 12 | r/IndieDev | dietro le quinte tecnico | Testo lungo + GIF |

Posta di **martedì–giovedì, 13:00–16:00 ora italiana** (= mattina USA East, il picco).
Weekend e sera europea sono i buchi peggiori.

---

## 2. La clip — è la cosa che conta più di tutte

Screenshot statici su Reddit rendono 5-10× meno di un video. Non saltarla.

### Cosa registrare (20-25 secondi, niente di più)

| Tempo | Inquadratura | Perché |
|---|---|---|
| 0:00-0:04 | Digsy cammina in un prato, si ferma, **scava** → esce il reperto | Il verbo del gioco nei primi 3 secondi. Chi scrolla decide qui. |
| 0:04-0:09 | Taglio secco su un **bioma diverso** (Dune Ossee o Lande Gelide), altro scavo | Dice "mondo grande" senza scriverlo |
| 0:09-0:15 | Museo → Libro dei Fossili → **scheletro voxel 3D che ruota** | Il momento "oh". È la cosa che nessun altro gioco cozy ha. |
| 0:15-0:20 | Parco: le chimere che camminano | La ricompensa finale, chiude il ciclo |
| 0:20-0:25 | Opzionale: mappa a pergamena o volo sul fossile | Solo se scorre bene, altrimenti taglia |

Regole di ripresa:
- **Niente HUD di debug, niente console.** Partita pulita.
- **Tagli secchi**, zero dissolvenze. Il pixel-art in dissolvenza diventa fango.
- Finestra del browser a **1280×720 o 1600×900**, fullscreen del gioco.
- Musica **accesa**: il tema chiptune è un valore, e Reddit riproduce l'audio.
- Il primo fotogramma è la copertina del post: che sia una schermata bella, non un menu.

### Da registrazione a file per Reddit

```bash
# MP4 per Reddit (upload nativo — qualità migliore di una GIF, audio incluso)
ffmpeg -i clip.mov \
  -vf "fps=30,scale=1080:-2:flags=neighbor" \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 128k digsy-reddit.mp4

# GIF per i commenti e per i sub che non prendono video
ffmpeg -i clip.mov \
  -vf "fps=15,scale=720:-1:flags=neighbor,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=none" \
  -loop 0 digsy-reddit.gif
```

`flags=neighbor` e `dither=none` non sono opzionali: qualunque altro scaling o dithering
**sfoca i pixel** e il gioco sembra un JPEG salvato tre volte.

Controlla che la GIF stia **sotto i 20 MB**: sopra, molti client la mostrano come immagine
ferma. Se sfora, abbassa a `fps=12` o `scale=560`.

---

## 3. I post

> ⚠️ Nei testi sotto, `[DURATA]` va riempito da te. **Non inventare il tempo di sviluppo**:
> se qualcuno controlla e non torna, il post si ribalta contro. Se non vuoi dirlo, togli
> la frase — funziona uguale.

---

### 3.1 — r/WebGames (giorno 1)

**Titolo:**
```
Digsy World — a cozy game about digging up fossils of creatures that never existed. Free, in-browser, no sign-up.
```

**Corpo:**
```
https://digsy.dev-box.it/

You're a small archaeologist with a shovel. Dig anywhere in an endless procedural world —
golden meadows, bone deserts, ashen woods, red lands, ancient marshes, frozen wastes — pull
up raw fossils, and carry them to a Museum to get them identified. Every species you complete
lights up its own rotating 3D voxel skeleton in your Fossil Book.

Then you mix skulls, bodies and legs into chimeras with names of their own, gather a species'
DNA to awaken it, and watch your creations wander the town park.

No combat, no game over, no timers. 6 biomes, 60+ species, day/night and seasons, boats,
caves with their own creatures.

Controls: WASD/arrows to move, E to dig and interact, L for the Fossil Book, I for the bag.
Works on phones too (on-screen joystick), installs as an app, and plays offline — the world
is procedural and the save lives on your device.

Still in active development. If you give it a go, I'd love to know where you got stuck or
bored — that's the feedback I can actually act on.
```

---

### 3.2 — r/playmygame (giorno 3)

Questo sub ha un **template obbligatorio**: apri le regole e copia il loro formato esatto,
il bot rimuove i post che non lo seguono. Di solito vuole il titolo con il nome fra parentesi
quadre e questi campi nel corpo.

**Titolo:**
```
[Digsy World] Cozy fossil-digging in an endless procedural world — browser, free
```

**Corpo:**
```
**Game title:** Digsy World
**Playable link:** https://digsy.dev-box.it/ (also on itch: https://giacomarco.itch.io/digsy-world)
**Platform:** Browser (desktop + mobile), installable as a PWA, works offline
**Price:** Free
**Description:** You play a small archaeologist digging up fossils of extinct creatures that
never existed. Identify them at the Museum, complete their 3D voxel skeletons in your Fossil
Book, then assemble chimeras and bring them back to life in the town park. No combat, no
game over.

**Free to play?** Yes, entirely. No account needed.

**Feedback I'm looking for:**
Most players who try it stop within the first five minutes, and I can't tell why. So:
- What did you do in your first two minutes, and did anything feel unclear?
- Did you find a town? Did you understand what to do with the raw fossils you were carrying?
- Anything that made you close the tab — say it plainly, that's the useful part.
```

> Perché questa formulazione: chiedere feedback generico non porta risposte. Chiedere di un
> momento preciso — i primi due minuti — porta risposte usabili. E i numeri di telemetria
> dicono che è esattamente lì che si perde la gente (19 su 49 entro 5 minuti).

---

### 3.3 — r/IndieGaming (giorno 6)

Sub visivo. **Carica il video come post nativo**, non un link. Il link va nel primo commento
(scritto da te, subito dopo aver postato).

**Titolo (scegline uno):**
```
Every fossil you dig up completes a 3D voxel skeleton — then you can mix them into your own creature
```
```
My cozy game has no combat and no game over: you just dig up bones and build animals that never existed
```

**Primo commento (da scrivere subito dopo il post):**
```
It's called Digsy World, it's free and runs in the browser: https://digsy.dev-box.it/
Also on itch: https://giacomarco.itch.io/digsy-world

Endless procedural world, 6 biomes, 60+ species, each with a hand-authored voxel skeleton.
Still in active development — happy to answer anything about how it's built.
```

---

### 3.4 — r/CozyGamers (giorno 9)

**Il sub più a rischio rimozione.** Controlla se l'autopromozione è ammessa solo in un giorno
o thread dedicato. Qui il tono conta più del contenuto: la community odia i post che sanno
di comunicato stampa. Niente elenchi puntati di feature, niente emoji a raffica.

**Titolo:**
```
I made a cozy game where you dig up fossils of animals that never existed, and slowly rebuild their skeletons
```

**Corpo:**
```
I've been working on a small game called Digsy World for [DURATA], and it's finally at a
point where it's nice to just wander around in.

You're a tiny archaeologist. You dig — anywhere, in meadows, deserts, marshes, frozen wastes —
and you pull up broken fossils. You carry them to a town Museum, the experts take a day to
identify them, and each piece you hand over lights up one more part of a little 3D skeleton
in your book. Five pieces and the creature is whole. Get its DNA and you can wake it up, and
then it just... lives in the park, walking around, while you go back out to dig.

There's no combat, nothing chasing you, no way to lose, and no timers on anything. Day turns
to night, seasons change, and the only pressure is your energy bar, which a nap at the inn
fixes.

The bit I'm most fond of is that you can take a skull from one species, a body from another
and legs from a third, and the game builds you an actual creature out of them, with a name of
its own, that then wanders the park with everyone else.

It's free and plays in the browser, on phones too. If anyone tries it I'd genuinely love to
hear whether it's relaxing or just aimless — that's the line I'm trying to walk and I can't
judge it from the inside anymore.
```

> Il link **va messo solo se il sub lo permette** nel corpo. Se le regole lo vietano, non
> metterlo: qualcuno lo chiederà nei commenti e lo dai lì. Un post rimosso vale zero.

---

### 3.5 — r/IndieDev (giorno 12)

Qui non si vende il gioco: si racconta un problema tecnico risolto. È il post con la resa
migliore a lungo termine, perché lo leggono altri sviluppatori che poi lo condividono.

**Titolo:**
```
I generated 60 creature skeletons procedurally and they all looked like the same animal. Hand-writing 60 recipes fixed it.
```

**Corpo:**
```
My game has 60 extinct species, each with its own 3D voxel skeleton you rebuild piece by piece.
The obvious way to make 60 skeletons is to derive them from a hash of the species ID: pick a
skull scale, a limb type, a tail shape, a posture, and let the parameters do the work.

I did that. It gave me 60 skeletons that were all measurably different and all felt identical.
Every one was a quadruped with a slightly different snout. The variation was real in the data
and invisible on screen, because parameters interpolate — they give you the average of your
design space, over and over, and never the interesting corners.

What fixed it was writing 60 blueprints by hand. Each is a small recipe:

  { seg: 3, legs: [6, 'short'], wings: [2, 'insect'], head: 1, mand: true, tail: 'sting' }

Then a single assembler turns any recipe into voxels, guaranteeing the joints connect
(overlapping segments at hips, neck, wings, tail). So the shapes are authored, but the
construction is shared — I still only maintain one assembler, not 60 models.

Two things made this safe to do:

1. A test asserts all 60 recipes are distinct. Uniqueness you don't test for silently decays
   the moment you add number 61.
2. A flood-fill test asserts every assembled body is at least 90% connected. Hand-authored
   recipes are exactly where you get a leg floating three voxels off the hip, and you will
   not notice by eye across 60 creatures.

The chimera system then inherits from the same recipes: take a skull from one species and
legs from another and the assembler joins them, so player-made creatures come out as coherent
as the authored ones.

The lesson I keep re-learning: when you need N things that all feel different, parameters
give you N things that feel the same. Author them, and use the code to guarantee the joints,
not the taste.

Game is Digsy World, cozy fossil-digging, free in the browser if you want to see the results:
https://digsy.dev-box.it/
```

---

## 4. Nei commenti (vale per tutti i post)

- **Rispondi a tutti**, anche a "cool". Reddit pesa i commenti nel ranking.
- Se qualcuno segnala un bug: ringrazia, **sistemalo, e torna a dirglielo**. Vale più di
  dieci upvote.
- Non difendere il gioco dalle critiche. "Buon punto, me lo segno" chiude bene ogni volta.
- Domanda buona da rilanciare nei commenti: *"in quale bioma sei finito per primo?"* —
  fa parlare la gente e ti dice come si distribuiscono gli spawn.

## 5. Misurare cosa ha funzionato

Ora non c'è modo di distinguere un giocatore arrivato da r/WebGames da uno arrivato da itch:
il battito (`src/beat.js`) manda solo minuti, giorno, livello, specie, versione.

Aggiungerlo costa poco e resta anonimo: leggere `?r=webgames` dall'URL al primo caricamento,
salvarlo in `localStorage`, spedirlo come campo `da`. Nessun IP, nessun referrer del browser,
solo un'etichetta che ti sei scritto da solo. Se lo vuoi, chiedimelo e lo faccio prima del
giorno 1 — dopo il primo post non serve più a niente.
