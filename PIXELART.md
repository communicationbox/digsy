# Regole di disegno — pixel art top-down 3/4

> Ricavate da fonti vere (soprattutto Slynyrd/Pixelblog, che lavora sulla stessa griglia 16×16,
> più Derek Yu, AndroidArts e la guida di stile di Stardew). Servono a non ripetere gli errori
> che hanno fatto sembrare le meraviglie "adesivi appiccicati sullo sfondo".
> Prima di dire che un disegno è finito: aprirlo in `/wonders` o `/sprites` e passare questa lista.

## Le 10 regole

1. **Ingombro sulla griglia.** Multipli di 16px. Un landmark non supera ~104px di altezza (metà
   schermo), tranne l'albero-mondo che è l'eccezione voluta. Verificare sempre contro il
   personaggio (22px).
2. **Budget colore: 6-8 per oggetto, 4-5 per materiale.** Se ne servono di più, si stanno
   aggiungendo toni troppo simili fra loro.
3. **Rampa con hue shift, non solo luminosità.** ~20° di spostamento di tinta per gradino;
   saturazione massima a metà rampa, più bassa sulle luci; **ombre verso il freddo/blu, luci
   verso il giallo**. Mai schiarire/scurire aggiungendo bianco o nero.
4. **Una sola luce per tutta la mappa** (alto-sinistra). Unica eccezione consapevole: gli oggetti
   che emettono luce (funghi, cristalli), che sono sorgenti proprie.
5. **Ombra di contatto: ellisse ≤ 1 tile (16px), centrata, UGUALE per tutti** — a prescindere
   dall'altezza dell'oggetto. È controintuitivo ma è ciò che tiene insieme la scena.
6. **Nessuna linea scura sul bordo che tocca terra.** Il contorno si interrompe alla base.
   Poi: 1-2px di terreno scurito attorno all'appoggio (occlusione) e 2-4px di erba/sabbia/sassi
   che **si sovrappongono** allo sprite. È la causa numero uno dell'effetto "sticker".
7. **Tinta accordata al bioma.** Roccia, osso e legno prendono la tinta della terra circostante:
   rampe diverse per Prati / Dune / Terre Rosse / Lande Gelide. Mai un grigio neutro universale.
8. **Il volume nasce dal raggruppamento, non dal singolo elemento.** Ciuffi, ciocche, costole,
   faccette: se ne disegna **uno**, se ne fa la variante ±1 tacca sulla rampa, e si stratifica.
   Non ombreggiare su 3 valori un elemento largo 3-5px: è pillow shading.
9. **Rompere il ritmo regolare.** Spaziature ±2px, altezze ±4px, terminazioni scaglionate.
   Elementi paralleli identici ed equidistanti = banding, e appiattiscono tutto.
   Mai protuberanze spesse 1px (rami, arti): non c'è spazio per scolpirle.
10. **Dithering solo dove serve.** Solido per ombra portata e lati interi in ombra; dithering
    su curve, ombreggiature parziali e sfumature dei bagliori — e solo se rappresenta *anche*
    una texture plausibile.

## Errori con un nome (da riconoscere a colpo d'occhio)

- **Pillow shading** — ombreggiare dal contorno verso l'interno, come se la luce fosse
  l'osservatore. Rende tutto sfocato e senza volume.
- **Banding** — bande di colore parallele della stessa lunghezza: rinforzano la griglia.
- **Orphan pixel** — pixel isolati che non appartengono a nessun gruppo: sono rumore.
- **Naive coloring** — verde puro per le foglie, grigio puro per la roccia: ignora la luce riflessa.
- **Cardboard design** — forme piatte allineate alla griglia, senza spessore.

## Materiali: cosa li rende riconoscibili

| Materiale | Firma |
|---|---|
| **Ghiaccio** | facce piane a tinta unita (mai gradienti), riflessi diagonali di 1-2px tutti allo stesso angolo, crepe **più chiare** (il ghiaccio riflette, non assorbe) |
| **Osso** | superficie liscia, segmentata; estremità bulbose più larghe del fusto; rampa da grigio-viola freddo a crema |
| **Roccia** | facce piane con stacchi netti, highlight a pixel singoli, tinta che vira dal verde-scuro al blu sulle luci |
| **Fogliame** | unità 2×2px raggruppate; ombra a mezzaluna in basso a sinistra, luce a cerchio in alto a destra |
| **Acqua** | 2 frame di pattern; riflesso = immagine specchiata e accorciata; increspature da linee di 1px |
| **Legno** | venature più larghe al centro e strette ai lati (è ciò che dà la curvatura del cilindro) |

## Fonti
Slynyrd — Pixelblog [1 (palette)](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes) ·
[6 (luce)](https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow) ·
[10 (acqua)](https://www.slynyrd.com/blog/2018/10/12/pixelblog-10-water-in-motion) ·
[13 (rocce)](https://www.slynyrd.com/blog/2019/1/22/pixelblog-13-rocks) ·
[20-21 (tile e oggetti top-down)](https://www.slynyrd.com/blog/2019/9/18/pixelblog-21-top-down-objects) ·
[43](https://www.slynyrd.com/blog/2023/3/26/pixelblog-43-top-down-tiles-part-2) ·
[44 (alberi)](https://www.slynyrd.com/blog/2023/5/22/pixelblog-44-top-down-trees) ·
[Derek Yu — errori comuni](https://www.derekyu.com/makegames/pixelart2.html) ·
[AndroidArts](https://androidarts.com/pixtut/pixelart.htm) · guida di stile Sundrop (Stardew).

Non esistono tutorial affidabili su menhir, archi d'ossa, gabbie toraciche, geyser, mammut nel
ghiaccio, ninfee e totem: per quelli le indicazioni sono derivate dai principi qui sopra e vanno
**validate a occhio** sulla pagina di prova.
