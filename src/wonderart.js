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
  /* DISEGNO RIFINITO A MANO, se esiste. Il controllo stava solo nel render del mondo:
     nel Libro delle Meraviglie e nelle pagine di prova si continuava a vedere la versione
     generata a codice, cioè proprio quella che il disegno a mano doveva sostituire.
     Stando qui vale per chiunque chiami drawWonder, e non c'è più un posto da ricordarsi. */
  if (hasSprite('wonder:' + type)) {
    const d = spriteDef('wonder:' + type);
    if (g.shadow) g.shadow(sx + 8, sy + 16, Math.min(15, Math.round(d.w / 3)));  // ombra ≤ 1 tile
    drawSprite(g, 'wonder:' + type, sx + 8, sy + 16);
    return;
  }
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
  const { rect, px, shadow } = g;
  const cx = sx + 8, base = sy + 16;
  /* CONTATTO COL TERRENO (la causa n.1 dell'effetto "adesivo"):
     1. occlusione — il terreno subito attorno alla base si scurisce di poco;
     2. ciuffi/detriti che si SOVRAPPONGONO ai primi pixel della struttura;
     3. nessuna linea scura sul bordo che tocca terra.
     Il ritmo è irregolare (spaziature diverse) per non creare banding. */
  const foot = (halfW, col1, col2) => {
    ctxFill('rgba(30,26,18,.20)', cx - halfW, base - 1, halfW * 2, 3);      // occlusione
    for (let i = -halfW; i <= halfW; i += 3) {
      const j = ((i + halfW) * 7) % 5;                                       // spaziature irregolari
      const h = 1 + (j % 3 === 0 ? 1 : 0);
      rect(cx + i + (j % 2), base - h - (j === 4 ? 1 : 0), 2, h + 1, j % 2 ? col1 : col2);
    }
  };
  const ctxFill = (col, x, y, w, h) => { g.ctx.fillStyle = col; g.ctx.fillRect(x, y, w, h); };
  switch (type) {

    /* ============ PRATI DORATI ============ */
    case 'gianttree': {                      // YGGDRASIL: corteccia a placche, radici, luci
      shadow(cx, base, 15);
      const th = 104, TW = 15;
      rect(cx - 7, base - th, TW, th, '#6e4a2a');
      rect(cx - 7, base - th, 5, th, '#805a36');                            // lato in luce
      rect(cx + 4, base - th, 3, th, '#563820');                            // lato in ombra
      for (let k = 0; k < 13; k++) {                                        // placche di corteccia
        const y = base - 6 - k * 8, w = 3 + (k % 3);
        rect(cx - 6 + ((k * 5) % 9), y, w, 3, '#5c3d22'); px(cx - 6 + ((k * 5) % 9), y, '#7d5735');
      }
      rect(cx - 4, base - Math.round(th * 0.62), 9, 6, '#2f2318');          // cavità nel tronco
      rect(cx - 3, base - Math.round(th * 0.62) + 1, 7, 4, '#1d150e');
      for (const [ox, w, h] of [[-18, 11, 5], [-9, 6, 4], [5, 6, 4], [10, 11, 5]]) {  // radici
        rect(cx + ox, base - h, w, h, '#5c3d22'); rect(cx + ox, base - h, w, 2, '#6e4a2a'); rect(cx + ox, base - 1, w, 1, '#3f2a17');
      }
      for (const [ox, oy, w] of [[-26, 0.60, 19], [8, 0.68, 19], [-22, 0.78, 14], [10, 0.82, 12]]) {
        rect(cx + ox, base - Math.round(th * oy), w, 4, '#5c3d22');         // rami bassi
        rect(cx + ox, base - Math.round(th * oy), w, 2, '#6e4a2a');
      }
      const cyb = base - th;
      const tiers = [[34, 2, '#2f5e26'], [31, -10, '#3f7d33'], [27, -22, '#4e8d3f'], [22, -33, '#5fa04e'], [16, -43, '#6cb35a'], [9, -52, '#7ec069']];
      for (const [w, oy, col] of tiers) {
        rect(cx - w, cyb - 5 + oy, w * 2 + 1, 10, g.shade8(col, 0.72));     // massa in ombra sotto
        rect(cx - w, cyb - 8 + oy, w * 2 + 1, 14, col);
        rect(cx - w, cyb - 8 + oy, w * 2 + 1, 3, g.shade8(col, 1.18));      // luce sopra
        for (let i = 0; i < 6; i++) px(cx - w + 4 + i * Math.round(w / 3), cyb + oy + 4, g.shade8(col, 0.8)); // sotto-ombra
      }
      const gl = Math.floor(time / 420) % 3;                                 // luci fra le fronde
      for (let i = 0; i < 18; i++) px(cx - 30 + i * 4, cyb - 12 - ((i + gl) % 5) * 6, i % 2 ? '#a8e87a' : '#d8f5a0');
      foot(30, '#4e8d3f', '#5fa04e');
      break;
    }
    case 'menhir': {                          // pietre scheggiate: ombre bluastre, luci calde
      shadow(cx, base, 15);
      const ring = [[-34, -8, 26, 9], [-19, -12, 32, 10], [0, -14, 37, 11], [19, -12, 32, 10], [34, -8, 26, 9], [-25, 6, 28, 9], [25, 6, 28, 9], [0, 10, 33, 10]];
      for (let i = 0; i < ring.length; i++) {
        const [ox, oy, h, w] = ring[i], bx = cx + ox, by = base + oy;
        const lean = (i % 3) - 1;                                  // qualcuna pende: niente file perfette
        for (let k = 0; k < h; k++) {
          const t2 = k / h, xoff = Math.round(lean * t2 * 2);
          const ww = w - (t2 > 0.75 ? 2 : 0) - (i % 2 && t2 > 0.55 ? 1 : 0);  // cima scheggiata
          const y = by - k - 1;
          rect(bx - (ww >> 1) + xoff, y, ww, 1, '#8b8a86');        // base
          rect(bx - (ww >> 1) + xoff, y, 3, 1, '#c6c2ae');         // luce calda a sinistra
          rect(bx + (ww >> 1) + xoff - 2, y, 2, 1, '#5f6376');     // ombra BLU a destra
        }
        rect(bx - (w >> 1) - 1, by - h - 2, w + 2, 2, '#a8a696');  // cappello
        px(bx - (w >> 1), by - h - 2, '#d6d2bc');
        for (let k = 1; k < 4; k++) px(bx - 1 + (k % 2), by - Math.round(h * k / 4), '#6e7183'); // incisioni
        if (i % 2) { rect(bx - (w >> 1) + 1, by - 5, 4, 4, '#5f7a4a'); px(bx - (w >> 1) + 5, by - 4, '#7d9a5c'); }
        rect(bx - (w >> 1) - 2, by - 1, w + 4, 2, '#6f6a5c');       // interrata
      }
      const pu = Math.floor(time / 520) % 3;
      for (let i = 0; i < 3; i++) px(cx - 14 + i * 14, base - 14 + ((i + pu) % 3), '#f2e3a8');
      foot(28, '#5fa04e', '#4e8d3f');
      break;
    }
    case 'haygiant': {                        // covoni legati, forcone, cappello, uccellino
      shadow(cx, base, 15);
      const bale = (x, y, w, h, c1, c2) => {
        rect(x, y, w, h, c1); rect(x, y, w, 3, c2);
        for (let k = 4; k < h; k += 4) rect(x, y + k, w, 1, '#a8842a');       // fasce di paglia
        for (let i = 0; i < w; i += 5) px(x + i + (i % 3), y + 2 + (i % 5), '#f0d070');
      };
      bale(cx - 15, base - 18, 30, 18, '#c9a227', '#e8c860');
      bale(cx - 12, base - 34, 24, 16, '#d4b13c', '#e8c860');
      bale(cx - 8, base - 48, 16, 14, '#dcbe4c', '#f0d070');
      rect(cx - 16, base - 20, 32, 2, '#8a6a1a'); rect(cx - 13, base - 36, 26, 2, '#8a6a1a'); // corde
      px(cx - 4, base - 42, '#8a1f18'); px(cx - 3, base - 42, '#c94f4a'); px(cx - 3, base - 43, '#e2604f');  // mele-occhi
      px(cx + 3, base - 42, '#8a1f18'); px(cx + 4, base - 42, '#c94f4a'); px(cx + 4, base - 43, '#e2604f');
      rect(cx - 3, base - 38, 7, 2, '#8a6a1a'); px(cx - 4, base - 39, '#8a6a1a'); px(cx + 4, base - 39, '#8a6a1a'); // bocca
      const sw = Math.round(Math.sin(time / 900));
      rect(cx - 24, base - 33 + sw, 12, 4, '#c9a227'); rect(cx - 24, base - 33 + sw, 12, 2, '#e8c860');
      rect(cx + 12, base - 33 - sw, 12, 4, '#c9a227'); rect(cx + 12, base - 33 - sw, 12, 2, '#e8c860');
      rect(cx + 22, base - 44 - sw, 2, 12, '#8a5f38'); rect(cx + 19, base - 46 - sw, 8, 2, '#8a5f38'); // forcone
      for (const fx of [19, 22, 25]) rect(cx + fx, base - 50 - sw, 1, 4, '#a97a4c');
      rect(cx - 11, base - 52, 22, 4, '#a8842a'); rect(cx - 7, base - 56, 14, 4, '#c9a227');  // cappello di paglia
      rect(cx - 11, base - 52, 22, 1, '#dcbe4c');
      const bb = Math.floor(time / 700) % 2;                                   // fili di paglia che svolazzano
      px(cx + 7, base - 57 - bb, '#f0d070'); px(cx + 9, base - 59 + bb, '#dcbe4c');
      foot(18, '#c9a227', '#5fa04e');
      break;
    }

    /* ============ DUNE OSSEE ============ */
    case 'ribcage': {   // SCHELETRO DI DRAGO (un figlio di Neladan) mezzo sepolto nella sabbia
      const HI = '#f8f2e2', LT = '#e6ddc7', MD = '#c3b79a', SH = '#9c917a', LN = '#5f5642'; // ossa + contorno scuro (stacca dalla sabbia chiara)
      const S1 = '#d8c9a0', S2 = '#c9b98f';
      shadow(cx, base + 1, 17);
      /* osso ORIENTABILE con contorno scuro su entrambi i lati (stacca da ogni sfondo) */
      const seg = (ax, ay, bx, by, t) => {
        const dx = bx - ax, dy = by - ay, n = Math.max(1, Math.round(Math.hypot(dx, dy)));
        const nn = Math.hypot(-dy, dx) || 1, ux = -dy / nn, uy = dx / nn;
        for (let i = 0; i <= n; i++) {
          const x = ax + dx * i / n, y = ay + dy * i / n;
          for (let w = -t - 1; w <= t + 1; w++) {
            const col = (w <= -t - 1 || w >= t + 1) ? LN : w === -t ? HI : (t >= 1 && w === t) ? SH : LT;
            px(Math.round(x + ux * w), Math.round(y + uy * w), col);
          }
        }
      };
      const knob = (x, y) => { rect(x - 1, y - 1, 3, 3, LT); px(x, y - 1, HI); rect(x - 1, y - 1, 3, 1, LN); px(x - 1, y + 1, LN); px(x + 1, y + 1, LN); };
      /* SPINA dorsale ad arco, dalle spalle alla groppa */
      const sh = [cx - 15, base - 8], hp = [cx + 15, base - 6];
      seg(sh[0], sh[1], cx - 4, base - 12, 2); seg(cx - 4, base - 12, cx + 6, base - 12, 2); seg(cx + 6, base - 12, hp[0], hp[1], 2);
      for (let i = -12; i <= 12; i += 6) knob(cx + i, base - 12 + Math.round(Math.abs(i) * 0.28));
      /* COLLO che sale ad arco verso la testa alzata (sinistra) */
      seg(sh[0], sh[1], cx - 24, base - 16, 2); seg(cx - 24, base - 16, cx - 32, base - 22, 2);
      knob(cx - 20, base - 12); knob(cx - 28, base - 19);
      /* CRANIO di drago rialzato: muso lungo, occhiaia, mascella coi denti, corna all'indietro */
      const hx = cx - 40, hy = base - 26;
      rect(hx, hy, 10, 6, LT); rect(hx, hy, 10, 1, HI); rect(hx, hy + 5, 10, 1, SH); rect(hx - 1, hy, 1, 6, LN); // teschio
      rect(hx - 7, hy + 2, 8, 3, LT); rect(hx - 7, hy + 2, 8, 1, HI); px(hx - 8, hy + 3, LN);                    // muso lungo
      rect(hx - 6, hy + 6, 9, 1, MD); for (let d = 0; d < 5; d++) px(hx - 5 + d * 2, hy + 7, LT);                 // mascella + denti
      rect(hx + 4, hy + 2, 2, 2, LN);                                                                            // occhiaia
      seg(hx + 8, hy, hx + 16, hy - 5, 1); seg(hx + 16, hy - 5, hx + 22, hy - 4, 1);                             // corno grande all'indietro
      seg(hx + 6, hy, hx + 12, hy - 6, 1);                                                                        // corno piccolo
      /* ALA ripiegata: omero su, poi dita ossee spazzate ALL'INDIETRO (verso la coda) + membrana accennata */
      const el = [cx - 2, base - 30];                                                                            // gomito in alto
      seg(cx - 12, base - 12, el[0], el[1], 2); knob(el[0], el[1]);                                              // omero
      const fingers = [[cx + 4, base - 20], [cx + 12, base - 13], [cx + 20, base - 8], [cx + 27, base - 4]];
      for (const f of fingers) seg(el[0], el[1], f[0], f[1], 1);
      for (let i = 0; i < fingers.length - 1; i++) { const a = fingers[i], c2 = fingers[i + 1]; px(Math.round((a[0] + c2[0]) / 2), Math.round((a[1] + c2[1]) / 2), SH); } // accenno di membrana
      /* GABBIA TORACICA: costole spesse dalla spina, curvano giù e RIENTRANO (volume del petto) */
      for (let i = 0; i < 6; i++) {
        const rx = cx - 12 + i * 5, ry = base - 12 + Math.round(Math.abs(cx - 12 + i * 5 - cx) * 0.28), len = 13 - Math.abs(i - 2);
        let px0 = rx, py0 = ry;
        for (let k = 1; k <= len; k++) {
          const t = k / len, nx = rx + Math.round(Math.sin(t * 1.9) * 3), ny = ry + k; // curva fuori poi rientra
          seg(px0, py0, nx, ny, k > len - 3 ? 0 : 1); px0 = nx; py0 = ny;
        }
      }
      /* CODA spessa alla base che rastrema e si arriccia in su a destra */
      let tx = hp[0], ty = hp[1];
      for (let i = 0; i < 9; i++) { const nx = tx + 4, ny = ty - Math.round(Math.sin(i / 8 * 1.9) * 5) + 1; seg(tx, ty, nx, ny, i < 3 ? 2 : i < 6 ? 1 : 0); if (i < 6) knob(nx, ny); tx = nx; ty = ny; }
      /* ZAMPE artigliate (in parte nella sabbia) */
      seg(cx - 10, base - 6, cx - 14, base + 2, 2); seg(cx - 14, base + 2, cx - 11, base + 6, 1); px(cx - 13, base + 6, LN); px(cx - 10, base + 6, LN);
      seg(cx + 10, base - 5, cx + 15, base + 2, 2); seg(cx + 15, base + 2, cx + 18, base + 6, 1); px(cx + 17, base + 6, LN); px(cx + 20, base + 6, LN);
      /* SABBIA che seppellisce la base */
      rect(cx - 36, base + 1, 76, 3, S1); rect(cx - 32, base + 2, 68, 2, S2);
      foot(34, S1, S2);
      break;
    }

    /* ============ BOSCHI CINEREI ============ */
    case 'hollowstump': {                     // legno spaccato, anelli, funghi, lucciole
      shadow(cx, base, 15);
      rect(cx - 18, base - 34, 36, 34, '#9a6b40');
      rect(cx - 18, base - 34, 9, 34, '#c08b56');                                   // lato in luce
      rect(cx + 11, base - 34, 7, 34, '#6e4a2a');                                   // lato in ombra
      rect(cx - 18, base - 36, 36, 3, '#c08b56');                                   // bordo superiore illuminato
      for (const ox of [-15, -8, 2, 9, 15]) { rect(cx + ox, base - 30, 2, 28, '#6e4a2a'); px(cx + ox, base - 30, '#a97a4c'); }
      rect(cx - 13, base - 31, 26, 31, '#140c06');                                  // cavità nerissima
      rect(cx - 10, base - 25, 20, 4, '#3a2a18');
      for (let k = 0; k < 3; k++) rect(cx - 12 + k, base - 24 + k * 7, 24 - k * 2, 1, '#3a2a18'); // anelli interni
      rect(cx - 22, base - 7, 44, 7, '#6e4a2a'); rect(cx - 22, base - 7, 44, 2, '#8a5f38'); rect(cx - 22, base - 2, 44, 2, '#4a3018');
      for (const [ox, oy] of [[-20, -8], [16, -9], [-15, -3]]) {                    // funghetti sulle radici
        rect(cx + ox, base + oy, 4, 3, '#d0453a'); px(cx + ox + 1, base + oy, '#f6efdd'); rect(cx + ox + 1, base + oy + 3, 2, 2, '#e8dcc0');
      }
      rect(cx - 8, base - 22, 6, 4, '#5a7a4a'); rect(cx + 4, base - 14, 5, 3, '#4e6a3f');  // muschio dentro
      const fi = Math.floor(time / 420) % 3;                                          // lucciole
      for (let i = 0; i < 3; i++) px(cx - 6 + i * 6, base - 20 + ((i + fi) % 3) * 4, '#f2e07a');
      foot(22, '#4e6a3f', '#5a7a4a');
      break;
    }
    /* le altre tredici sono disegnate in nativo (wonderNative.js) */
    default: rect(cx - 4, base - 8, 8, 8, '#9a9285');
  }
}
