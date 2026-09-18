/* BARBA, BAFFI e OCCHIALI disegnati in NATIVO (modulo puro, stesso pennello di hatArt/hairArt).

   Digsy aveva capelli, cappello e vestiti, ma il viso era sempre lo stesso: due occhi e due
   guance. È la parte che si guarda per tutto il gioco, ed era l'unica che non si poteva
   scegliere. Qui stanno i due pezzi che la cambiano davvero.

   Due strati, perché stanno a quote diverse (vedi drawHero in sprites.js):
     barba   → sotto i capelli, così una frangia lunga o un basettone la copre come deve;
     occhiali → sopra i capelli, sotto il cappello: la montatura si vede anche sotto la frangia.

   OGNUNO HA IL SUO COLORE: 'Z' la barba (luce n, base Z, ombra m), 'O' la montatura (l/O/o),
   scelti al Barbiere e in Sartoria. Di serie la barba nasce del colore dei capelli e lo segue
   finché non la si cambia apposta, così non ci si ritrova un barbone rosso su capelli neri
   senza averlo voluto (il collegamento sta in wireLook, ui.js).
   Né 'Z' né 'O' stanno in OUTLINE_ORDER: niente contorno automatico. Su una montatura di due
   pixel diventerebbe una maschera da sub, e su un baffo alto uno una bocca a pennarello. Per
   questo i colori delle montature sono tutti scuri (GLASSES_COLORS): il contrasto sulla pelle
   lo deve dare il colore, visto che non c'è un bordo a darlo.

   Geometria della testa (colonne 0..31, dal corpo in bodyArt.js):
     FRONTE  righe 4-12 colonne 6..25 · riga 13: 7..24 · 14: 8..23 · 15: 10..21 (mento)
             · 16: 12..19 · 17: 13..18 (collo). Occhi righe 8-11, colonne 11-12 e 19-20.
     PROFILO (guarda a destra) righe 7-12: 8..25 · 13: 9..24 · 14: 10..23 · 15: 12..21
             · 16: 14..19 · 17: 14..18. Occhio colonne 20-21, naso (26,10), orecchio 13-14.
   DI SPALLE la barba non c'è: la testa la nasconde tutta. Degli occhiali resta l'ASTINA, due
   pixel per lato all'altezza degli occhi — senza, girandosi il personaggio cambia identità. */
import { grid, finish } from './hatArt.js';

/* MONTATURA TONDA attorno a un occhio: cerchio di raggio 3, l'occhio (4×4) resta dentro senza
   toccarlo. La montatura degli NPC in npcArt è un anello 5×6 tarato sul Professore: addosso a
   Digsy l'occhio andava a sbattere contro il bordo destro e la lente sembrava storta. */
/* cx,cy = angolo alto-sinistro della coppia di pixel dell'occhio (11,10 di fronte): il rim va
   da -3 a +2, quindi il cerchio esce 6×6 centrato su (cx+0.5, cy-0.5) — il centro dell'occhio */
function ring(g, cx, cy, m = 'O') {
  const rim = [[0, -3], [1, -3], [-1, -2], [2, -2], [-2, -1], [3, -1], [-2, 0], [3, 0], [-1, 1], [2, 1], [0, 2], [1, 2]];
  for (const [dx, dy] of rim) g.set(cx + dx, cy + dy, m, 1);
}
/* cornice rettangolare vuota (lente aperta): solo il bordo */
function frame(g, x0, y0, x1, y1, m = 'O') {
  for (let x = x0; x <= x1; x++) { g.set(x, y0, m, 1); g.set(x, y1, m, 1); }
  for (let y = y0 + 1; y <= y1 - 1; y++) { g.set(x0, y, m, 1); g.set(x1, y, m, 1); }
}
/* lente PIENA col riflesso in diagonale: è il riflesso che la fa leggere come vetro scuro
   invece che come una benda */
function lens(g, x0, y0, x1, y1) {
  g.fillBlock(x0, y0, x1, y1, 'O', 1);
  g.set(x0 + 1, y0 + 2, 'W', 1); g.set(x0 + 2, y0 + 1, 'W', 1);
}
/* IL PONTE STA UNA RIGA PIÙ IN BASSO DEL BORDO ALTO DELLE LENTI, e le astine pure. Messi alla
   stessa quota, lenti + ponte + astine si saldavano in UNA barra scura larga quindici pixel:
   non due occhiali, una visiera. Sfalsati di una riga si leggono i tre pezzi. */
function bridge(g) { g.span(9, 15, 16, 'O', { t: 1 }); g.set(7, 9, 'O', 1); g.set(8, 9, 'O', 1); g.set(23, 9, 'O', 1); g.set(24, 9, 'O', 1); }
/* DI PROFILO LA LENTE ARRIVA AL FRONTE DEL VISO (colonna 25, il bordo della sagoma), e
   l'astina va da lì all'orecchio (colonne 13-14). Centrata sull'occhio e basta, restava una
   striscia di guancia scoperta davanti: sembrava un monocolo appoggiato sullo zigomo
   (segnalato con foto). */
function bridgeSide(g) { g.span(9, 14, 18, 'O', { t: 1 }); }
/* astine viste di spalle: due pixel per lato, all'altezza degli occhi */
function templesUp(g) { g.span(9, 6, 7, 'O', { t: 1 }); g.span(9, 24, 25, 'O', { t: 1 }); }

/* ---------------- BARBA E BAFFI ---------------- */
/* NIENTE CONTORNO SULLA BARBA (noOutline). `finish` gira un bordo scuro attorno a tutta la
   sagoma: su una massa grande — i capelli, un cappello — è quello che la stacca dalla testa,
   ma su un baffo alto UN pixel raddoppia l'altezza e il risultato è una bocca sorridente
   disegnata a pennarello. Il volume qui se lo fa da sé la barba: riga chiara sopra, riga
   d'ombra sotto (tono 2), che è anche quello che la tiene leggibile sui capelli bianchi. */
/* baffo: riga piena + riga d'ombra sotto, punte incluse. Di fronte il naso non si disegna,
   quindi i baffi stanno alla riga 13 — sotto le guance, sopra il mento. */
function stacheFront(g, x0, x1) {
  g.span(13, x0, x1, 'Z', { lit: 0.22, dark: 0.82 });
  g.span(14, x0 + 1, x1 - 1, 'Z', { t: 2 });
}

const BEARD = {
  /* baffi sottili: due righe e basta. Alla terza diventano un manubrio */
  stache: {
    noOutline: true,
    down(g) { stacheFront(g, 11, 20); },
    up() {},
    side(g) { g.span(13, 20, 24, 'Z', { lit: 0.2, dark: 0.85 }); g.span(14, 21, 23, 'Z', { t: 2 }); },
  },
  /* pizzetto: baffi staccati + ciuffo stretto sul mento, e in mezzo LA BOCCA (riga 15 libera).
     Attaccati, baffi e ciuffo diventano una macchia sola e il pizzetto non si riconosce più.
     Di fronte il mento è largo 8 pixel (righe 16-17), quindi il ciuffo sta in sei colonne. */
  goatee: {
    noOutline: true,
    down(g) {
      stacheFront(g, 12, 19);
      g.span(16, 13, 18, 'Z', { lit: 0.25, dark: 0.78 });
      g.span(17, 14, 17, 'Z', { t: 2 });
      g.span(18, 15, 16, 'Z', { t: 2 });
    },
    up() {},
    side(g) {
      g.span(13, 20, 24, 'Z', { lit: 0.2, dark: 0.85 }); g.span(14, 21, 23, 'Z', { t: 2 });
      g.span(16, 15, 19, 'Z', { lit: 0.2, dark: 0.8 });
      g.span(17, 15, 18, 'Z', { t: 2 });
      g.span(18, 16, 17, 'Z', { t: 2 });
    },
  },
  /* barba piena: incornicia la mascella e sale a basette fino ai capelli. Senza le basette
     resta una toppa appiccicata al mento, staccata dalla testa. Niente contorno neanche qui:
     col bordo scuro, di profilo, la riga sopra la barba tagliava la guancia come una cicatrice. */
  full: {
    noOutline: true,
    down(g) {
      for (let y = 11; y <= 12; y++) { g.set(6, y, 'Z', 1); g.set(7, y, 'Z', 1); g.set(24, y, 'Z', 2); g.set(25, y, 'Z', 2); }
      g.span(13, 7, 24, 'Z', { lit: 0.22, dark: 0.8 });                                  // baffi + mascella
      g.span(14, 8, 13, 'Z', { lit: 0.3, dark: 0.85 }); g.span(14, 18, 23, 'Z', { t: 2 }); // LA BOCCA: 14..17 resta scoperta
      g.span(15, 10, 13, 'Z', { lit: 0.3, dark: 0.85 }); g.span(15, 18, 21, 'Z', { t: 2 });
      g.span(16, 12, 19, 'Z', { lit: 0.22, dark: 0.78 });                                 // sotto il labbro la barba si richiude
      g.span(17, 13, 18, 'Z', { t: 2 });
      g.span(18, 14, 17, 'Z', { t: 2 });
    },
    up() {},
    side(g) {
      for (let y = 10; y <= 12; y++) { g.set(14, y, 'Z', 1); g.set(15, y, 'Z', 1); }   // basetta DAVANTI all'orecchio (colonne 13-14), non dietro
      g.span(13, 12, 24, 'Z', { lit: 0.25, dark: 0.85 });
      g.span(14, 11, 20, 'Z', { lit: 0.22, dark: 0.85 });   // di profilo la bocca sta DAVANTI (21..23)
      g.span(15, 12, 19, 'Z', { lit: 0.22, dark: 0.85 });
      g.span(16, 13, 19, 'Z', { lit: 0.22, dark: 0.78 });
      g.span(17, 14, 18, 'Z', { t: 2 });
      g.span(18, 15, 17, 'Z', { t: 2 });
    },
  },
};

/* ---------------- OCCHIALI ---------------- */
/* Gli occhi stanno alle colonne 11-12 e 19-20 (di profilo 20-21), righe 8-11: le lenti sono
   centrate LÌ (11.5 e 19.5), non sul mezzo della faccia, o si guarda fuori dalla montatura. */
const GLASS = {
  /* tondi da studioso: l'anello lascia vedere l'occhio, il ponte lega le due lenti */
  round: {
    down(g) { ring(g, 11, 10); ring(g, 19, 10); bridge(g); },
    up(g) { templesUp(g); },
    side(g) { ring(g, 21, 10); bridgeSide(g); },
  },
  /* rettangolari: più larghi che alti, angoli netti. Alti quanto i tondi diventano due
     finestre e mangiano mezza faccia */
  square: {
    down(g) { frame(g, 9, 8, 14, 11); frame(g, 17, 8, 22, 11); bridge(g); },
    up(g) { templesUp(g); },
    side(g) { frame(g, 19, 8, 25, 11); bridgeSide(g); },
  },
  /* da sole: lenti piene. Sono gli unici che si leggono a colpo d'occhio anche di lato */
  sun: {
    down(g) { lens(g, 9, 8, 14, 11); lens(g, 17, 8, 22, 11); bridge(g); },
    up(g) { templesUp(g); },
    side(g) { lens(g, 19, 8, 25, 11); bridgeSide(g); },
  },
};

function build(tab, id) {
  const d = tab[id]; if (!d) return null;
  const out = {};
  for (const v of ['down', 'side', 'up']) { const g = grid(); d[v](g); out[v] = finish(g, { noOutline: !!d.noOutline }); }
  return out;
}
export const BEARD_IDS = Object.keys(BEARD);
export const GLASSES_IDS = Object.keys(GLASS);
export function buildBeard(id) { return build(BEARD, id); }
export function buildGlasses(id) { return build(GLASS, id); }
