/* DISEGNO DELLE MERAVIGLIE — modulo puro, senza dipendenze dal render del gioco.
   Riceve un "pennello" g = { rect, px, shadow, shade8, ctx } e disegna la meraviglia ancorata
   alla sua tile (cx = centro, base = terreno). Lo usano sia il gioco sia la pagina /wonders,
   dove si guardano tutte insieme mentre si lavora ai dettagli.

   Regole di stile: ogni materiale ha 3-4 toni (luce / base / ombra / contorno scuro), i volumi
   hanno sempre un lato illuminato e uno in ombra, e alla base c'è appoggio (erba, sassi, brina)
   perché nulla sembri incollato sopra il terreno. Animazioni: fase SOLO dal tempo. */
import { hasSprite, spriteDef, drawSprite } from './spritebank.js';
import { hasNativeWonder, drawNativeWonder } from './wonderNative.js';

/* ---------- ingombro SOLIDO (in tile, relativo all'ancora) ----------
   Le parti massicce non si attraversano: il ghiaccio, la roccia, i tronchi. Sotto gli archi
   invece ci si passa (solo i piedi sono solidi) e le pozze restano calpestabili sul bordo. */
export const WONDER_SOLID = {
  gianttree: [[-1, -1, 2, 1]],                         // tronco
  /* menhir: ricavata dal disegno RIFINITO A MANO (sette pietre che poggiano a quote diverse
     per dare la prospettiva del cerchio). Con la vecchia maschera si attraversavano pietre
     ben visibili e si sbatteva dove non c'era niente. */
  menhir: [[-2, -1, 1, 1], [-1, 0, 1, 1], [-1, -2, 1, 1], [0, 0, 1, 1], [1, -2, 1, 1], [2, 0, 1, 1], [2, -1, 1, 1]],
  haygiant: [[-1, -1, 3, 2]],                          // le balle di fieno
  bonearch: [[-2, 0, 1, 1], [2, 0, 1, 1]],             // solo i piedi: sotto ci passi
  oasis: [[1, -1, 2, 1]],                              // il cranio-riparo
  ribcage: [[-2, 0, 5, 1]],                            // la spina dorsale a terra
  mushring: [],                                        // funghi: si calpestano
  hollowstump: [[-1, -1, 3, 2]],
  totem: [[0, -1, 1, 2]],
  geyser: [[-1, 0, 3, 1]],                             // il cratere
  redarch: [[-2, -2, 1, 3], [1, -2, 1, 3]],            // i due piloni
  orevein: [[-1, 0, 3, 1]],
  willow: [[0, -1, 1, 1]],                             // tronco
  lilypad: [],                                         // foglie: ci si cammina sopra
  bubblepool: [[-1, 0, 3, 1]],
  icespire: [[0, -2, 1, 3], [-1, -1, 1, 1], [1, -1, 1, 1]],
  frozenbeast: [[-2, -2, 5, 3]],                       // BLOCCO DI GHIACCIO: massiccio
  aurora: [],                                          // luce in cielo
};
/* la tile (tx,ty) cade dentro la parte solida di una meraviglia ancorata in (ax,ay)? */
export function wonderSolidTile(type, ax, ay, tx, ty) {
  const parts = WONDER_SOLID[type]; if (!parts) return false;
  const dx = tx - ax, dy = ty - ay;
  for (const [x0, y0, w, h] of parts) if (dx >= x0 && dx < x0 + w && dy >= y0 && dy < y0 + h) return true;
  return false;
}

/* ---------- disegno ---------- */
export function drawWonder(g, type, sx, sy, time) {
  /* DISEGNO NATIVO (wonderNative.js): pensato a 32 px per casella. Chi chiama drawWonder lavora
     ancora sulla vecchia griglia da 16 (il mondo la raddoppia): il pennello qui sotto dimezza le
     coordinate, così nel mondo ogni tratto cade esattamente su un pixel vero. */
  if (hasNativeWonder(type)) {
    const ax = sx + 8, ay = sy + 16;
    const h = {
      rect: (x, y, w, hh, c) => g.rect(ax + x / 2, ay + y / 2, w / 2, hh / 2, c),
      px: (x, y, c) => g.rect(ax + x / 2, ay + y / 2, 0.5, 0.5, c),
      shade8: g.shade8,
    };
    drawNativeWonder(h, type, time);
    return;
  }
  /* DISEGNO DELLO SPRITE STUDIO, per un tipo che non avesse ancora il nativo. Oggi tutte e 18
     sono native: la banca resta come riserva e come archivio dei disegni fatti a mano. */
  if (hasSprite('wonder:' + type)) {
    const d = spriteDef('wonder:' + type);
    if (g.shadow) g.shadow(sx + 8, sy + 16, Math.min(15, Math.round(d.w / 3)));  // ombra ≤ 1 tile
    drawSprite(g, 'wonder:' + type, sx + 8, sy + 16);
    return;
  }
  /* niente disegno per un tipo sconosciuto: un sasso, così almeno si vede che lì c'è qualcosa */
  g.rect(sx + 4, sy + 8, 8, 8, '#9a9285');
}
