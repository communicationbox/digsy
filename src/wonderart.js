/* DISEGNO DELLE MERAVIGLIE — modulo puro, senza dipendenze dal render del gioco.
   Riceve un "pennello" g = { rect, px, shadow, shade8, ctx } e disegna la meraviglia ancorata
   alla sua tile (cx = centro, base = terreno). Lo usano sia il gioco sia la pagina /wonders,
   dove si guardano tutte insieme mentre si lavora ai dettagli.

   Regole di stile: ogni materiale ha 3-4 toni (luce / base / ombra / contorno scuro), i volumi
   hanno sempre un lato illuminato e uno in ombra, e alla base c'è appoggio (erba, sassi, brina)
   perché nulla sembri incollato sopra il terreno. Animazioni: fase SOLO dal tempo. */
import { hasSprite, spriteDef, drawSprite } from './spritebank.js';

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
    case 'bonearch': {                        // ARCO: una vera arcata di zanne, ci passi sotto
      shadow(cx, base, 15);
      const RX = 30, RY = 48;
      /* la curva è una semiellisse: per ogni colonna si calcola il punto e lo SPESSORE
         (grosso alla base, sottile in cima), così l'arco è continuo e slanciato */
      for (let x = -RX; x <= RX; x++) {
        const k = x / RX, y = Math.round(Math.sqrt(Math.max(0, 1 - k * k)) * RY);
        const th = Math.round(5 + Math.abs(k) * 6);              // 5 px in cima, 11 ai piedi
        const topY = base - 4 - y;
        rect(cx + x, topY, 1, th, '#e8e0cc');                     // corpo dell'osso
        px(cx + x, topY, '#f8f3e4');                              // filo di luce sul dorso
        px(cx + x, topY + th - 1, '#b9ad91');                     // ombra sul lato interno
        if (((x % 7) + 7) % 7 === 0) px(cx + x, topY + 2, '#cfc3a6');   // anelli di crescita
      }
      /* piedi piantati nella sabbia, con la duna che li avvolge */
      for (const dir of [-1, 1]) {
        const fx = cx + dir * RX;
        rect(fx - 6, base - 8, 13, 9, '#e8e0cc'); rect(fx - 6, base - 8, 13, 2, '#f8f3e4');
        rect(fx - 6, base - 2, 13, 3, '#b9ad91');
        rect(fx - 10, base - 3, 21, 4, '#d8c9a0'); rect(fx - 8, base - 1, 17, 2, '#c9b98f');
      }
      /* in cima, dove le due zanne si incontrano: nodo d'osso e un piccolo cranio */
      rect(cx - 7, base - 4 - RY - 2, 15, 7, '#f2ead8'); rect(cx - 7, base - 4 - RY - 2, 15, 2, '#ffffff');
      rect(cx - 5, base - 4 - RY + 4, 11, 6, '#e8e0cc');
      px(cx - 2, base - 4 - RY + 6, '#8a8070'); px(cx + 3, base - 4 - RY + 6, '#8a8070');
      const sp = Math.floor(time / 320) % 4;                      // il passaggio scintilla
      for (let i = 0; i < 4; i++) px(cx - 9 + i * 6, base - 20 - ((i + sp) % 4) * 6, i % 2 ? '#8fd0e6' : '#cdf2fa');
      foot(30, '#d8c9a0', '#c9b98f');
      break;
    }
    case 'oasis': {                           // pozza ELLITTICA, palme con fronde ricurve
      shadow(cx, base, 15);
      /* specchio d'acqua: righe di larghezza variabile → ellisse, mai un rettangolo */
      const PW = 27, PH = 9;
      const ell = (dy) => Math.round(PW * Math.sqrt(Math.max(0, 1 - (dy / PH) ** 2)));
      for (let dy = -PH; dy <= PH; dy++) {
        const w = ell(dy); if (w <= 0) continue;
        const y = base - 1 + Math.round(dy * 0.62);                 // schiacciata: vista 3/4
        rect(cx - w - 2, y, w * 2 + 4, 1, '#c9b98f');               // sponda sabbiosa
        rect(cx - w, y, w * 2, 1, dy < -PH * 0.55 ? '#1b3c5e' : dy < 0 ? '#2e7e9c' : '#49a8c2');
        if (dy > PH * 0.2) rect(cx - w + 2, y, w * 2 - 4, 1, '#7fd0dc');   // fondale chiaro davanti
      }
      const wv = Math.floor(time / 420) % 3;                         // increspature
      for (let i = 0; i < 4; i++) rect(cx - 16 + i * 9 + wv, base - 3 + (i % 2) * 4, 5, 1, '#bfeef4');
      px(cx - 6, base + 1, '#f2f8d8'); px(cx + 9, base - 2, '#f2f8d8');
      /* PALME: tronco che si assottiglia e si piega, fronde ricurve a raggiera */
      for (const [ox, h, lean] of [[-20, 46, -1], [-8, 34, 1], [13, 40, 1]]) {
        const topX = cx + ox + Math.round(lean * 5), topY = base - 8 - h;
        for (let k = 0; k < h; k++) {                                // tronco: 4px in basso, 2 in cima
          const t2 = k / h, bx = cx + ox + Math.round(lean * t2 * t2 * 5);
          const tw = t2 > 0.7 ? 2 : t2 > 0.35 ? 3 : 4;
          rect(bx, base - 8 - k, tw, 1, k % 4 === 0 ? '#6e4a2a' : '#8a5f38');
          if (k % 4 === 2) px(bx + tw - 1, base - 8 - k, '#a97a4c');
        }
        rect(cx + ox - 2, base - 9, 7, 3, '#8a5f38');                 // base allargata
        for (const [dx0, dy0] of [[-1, -0.55], [-1, 0.1], [1, -0.55], [1, 0.1], [0, -1]]) {
          /* ogni fronda: parabola che parte dritta e ricade, con nervatura chiara */
          const len = dy0 === -1 ? 9 : 15;
          for (let k = 0; k <= len; k++) {
            const t2 = k / len;
            const fx = topX + Math.round(dx0 * t2 * len);
            const fy = topY + Math.round(dy0 * 4 * t2 + t2 * t2 * 9);   // sale, poi ricade
            rect(fx, fy, 2, 2, '#3f7d33');
            px(fx, fy, '#5fa04e');
            if (k > 2 && k % 3 === 0) { px(fx, fy + 2, '#2f5e26'); px(fx + (dx0 || 1), fy - 1, '#6cb35a'); }
          }
        }
        rect(topX - 2, topY + 1, 5, 3, '#a8842a'); px(topX, topY + 2, '#c9a227');   // datteri
      }
      /* sponda viva: canne alte e sassi levigati */
      for (const [rx2, rh] of [[20, 14], [24, 19], [28, 11], [31, 16], [35, 9]]) {
        for (let k = 0; k < rh; k++) {
          const bend = Math.round(Math.sin(k / rh * 1.4) * 2);
          px(cx + rx2 + bend, base - 4 - k, k > rh - 4 ? '#c9c06a' : '#7f9a4a');
        }
        px(cx + rx2 + 2, base - 4 - rh, '#e2dc8a');
      }
      for (const [sx2, sw2, sh2] of [[-32, 7, 4], [26, 5, 3], [33, 8, 5]]) {
        rect(cx + sx2, base - sh2, sw2, sh2, '#b5a982'); rect(cx + sx2, base - sh2, sw2, 1, '#d2c69c');
        rect(cx + sx2, base - 1, sw2, 1, '#8f8468');
      }
      break;
    }
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
    case 'mushring': {                        // funghi con lamelle e puntini, muschio, spore
      shadow(cx, base, 15);
      rect(cx - 26, base - 3, 52, 5, '#3f5a34'); rect(cx - 24, base - 2, 48, 3, '#4e6a3f');  // anello di muschio
      const ring = [[-27, 2, 1], [-19, -6, 0], [-8, -11, 1], [4, -11, 0], [16, -6, 1], [25, 2, 0], [-14, 8, 0], [11, 8, 1], [0, 11, 0]];
      ring.forEach(([ox, oy, big], i) => {
        const mx = cx + ox, my = base + oy, w = big ? 15 : 10, h = big ? 8 : 5;
        rect(mx - 1, my - h, 3, h + 2, '#e8dcc0'); px(mx - 1, my - h, '#f6efdd');
        for (let k = 0; k < 3; k++) px(mx - 1 + k, my + 1, '#b8ac90');            // lamelle
        rect(mx - (w >> 1), my - h - 5, w, 5, '#d0453a');
        rect(mx - (w >> 1), my - h - 5, w, 2, '#e2604f');
        rect(mx - (w >> 1) + 1, my - h - 6, w - 2, 1, '#f0806a');
        for (let d = 0; d < (big ? 4 : 2); d++) px(mx - (w >> 1) + 2 + d * 3, my - h - 4 + (d % 2), '#f6efdd');
        if ((i + Math.floor(time / 500)) % 4 === 0) { px(mx, my - h - 9, '#8fd06a'); px(mx - 3, my - h - 8, '#a8e87a'); px(mx + 3, my - h - 7, '#6cb35a'); }
      });
      for (let i = 0; i < 8; i++) px(cx - 20 + i * 6, base + 2 + (i % 3), '#5a7a4a');
      foot(26, '#4e6a3f', '#5a7a4a');
      break;
    }
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
    case 'totem': {                           // quattro musi scolpiti, ali, occhi che brillano
      shadow(cx, base, 15);
      rect(cx - 8, base - 53, 17, 53, '#8a5f38'); rect(cx - 8, base - 53, 5, 53, '#a97a4c');
      const faces = [['#c94f4a', 48, 'becco'], ['#4e8d7c', 36, 'zanne'], ['#d8973c', 24, 'corna'], ['#6f5a94', 12, 'occhi']];
      for (const [col, oy, kind] of faces) {
        rect(cx - 7, base - oy + 6, 15, 4, g.shade8(col, 0.7));                       // ombra sotto il muso
        rect(cx - 7, base - oy - 2, 15, 11, col); rect(cx - 7, base - oy - 2, 15, 3, g.shade8(col, 1.3));
        rect(cx - 5, base - oy + 2, 4, 3, '#f6efdd'); rect(cx + 2, base - oy + 2, 4, 3, '#f6efdd');  // occhi
        px(cx - 4, base - oy + 3, '#201a14'); px(cx + 3, base - oy + 3, '#201a14');
        if (kind === 'becco') { rect(cx - 2, base - oy + 6, 5, 4, '#f2c53d'); px(cx - 1, base - oy + 9, '#c9a227'); }
        if (kind === 'zanne') { rect(cx - 4, base - oy + 6, 9, 2, '#241a10'); px(cx - 4, base - oy + 8, '#f6efdd'); px(cx + 4, base - oy + 8, '#f6efdd'); }
        if (kind === 'corna') { rect(cx - 8, base - oy - 5, 3, 4, '#e8e0cc'); rect(cx + 6, base - oy - 5, 3, 4, '#e8e0cc'); }
        if (kind === 'occhi') { rect(cx - 3, base - oy + 6, 7, 2, '#241a10'); }
      }
      for (const [ox, w] of [[-19, 11], [9, 11]]) {                                    // ali laterali
        rect(cx + ox, base - 52, w, 5, '#6e4a2a'); rect(cx + ox, base - 52, w, 2, '#a97a4c');
        for (let i = 0; i < 3; i++) px(cx + ox + 1 + i * 3, base - 48, '#4a3018');
      }
      rect(cx - 11, base - 60, 23, 6, '#a97a4c'); rect(cx - 11, base - 60, 23, 2, '#c79a66');
      rect(cx - 3, base - 64, 7, 4, '#c9a227'); px(cx, base - 65, '#f2c53d');
      const bl = Math.floor(time / 600) % 4 === 0;                                      // occhi che lampeggiano
      if (bl) { px(cx - 4, base - 46, '#f2e07a'); px(cx + 3, base - 46, '#f2e07a'); }
      foot(14, '#6e8f5a', '#5a7a4a');
      break;
    }

    /* ============ TERRE ROSSE ============ */
    case 'geyser': {                          // cratere stratificato, getto pulsante, vapore
      shadow(cx, base, 15);
      rect(cx - 20, base - 3, 40, 4, '#5c2a18');                                        // cratere in ombra
      rect(cx - 19, base - 6, 38, 7, '#8a4326'); rect(cx - 19, base - 6, 38, 2, '#b5623a');
      rect(cx - 13, base - 4, 26, 4, '#3a1a10');                                         // bocca scura
      for (let i = 0; i < 6; i++) px(cx - 15 + i * 6, base - 5, '#c9784a');
      const ph = (time / 2200) % 1;
      const hgt = ph < 0.5 ? Math.round(14 + ph * 180) : Math.round(10 + (1 - ph) * 60);
      for (let k = 0; k < hgt; k++) {                                                    // colonna d'acqua
        const w = Math.max(5, 15 - Math.round(k / 10));
        const wob = Math.round(Math.sin(time / 200 + k / 6) * 1);
        rect(cx - (w >> 1) + wob, base - 4 - k, w, 1, k % 7 === 0 ? '#ffffff' : '#e6f4fa');
        if (k % 9 === 0) px(cx - (w >> 1) + wob - 2, base - 4 - k, '#bfe4f0');
      }
      const cl = Math.floor(time / 260) % 3;                                              // nuvola in cima
      rect(cx - 11, base - 8 - hgt, 23, 7, 'rgba(220,236,242,.55)');
      rect(cx - 7 + cl, base - 12 - hgt, 15, 6, 'rgba(240,250,252,.5)');
      rect(cx - 14 - cl, base - 5 - hgt, 10, 5, 'rgba(220,236,242,.4)');
      for (let i = 0; i < 4; i++) px(cx - 16 + i * 10, base - 10 - ((i + cl) % 3) * 6, '#f2fafc'); // schizzi
      foot(22, '#a85a34', '#8a4326');
      break;
    }
    case 'redarch': {                         // roccia stratificata, erosione, cielo nel vuoto
      shadow(cx, base, 15);
      const layer = (x, y, w, h) => {
        rect(x, y, w, h, '#b5623a'); rect(x, y, 4, h, '#c9784a'); rect(x + w - 3, y, 3, h, '#8a4326');
        for (let k = 3; k < h; k += 6) { rect(x, y + k, w, 1, '#9a4a26'); px(x + 2, y + k, '#d89060'); }
      };
      layer(cx - 27, base - 42, 13, 42); layer(cx + 14, base - 42, 13, 42);
      layer(cx - 27, base - 54, 54, 12);
      rect(cx - 25, base - 41, 8, 3, '#8a4326'); rect(cx + 18, base - 41, 8, 3, '#8a4326'); // erosione sotto l'arcata
      rect(cx - 22, base - 46, 6, 4, '#9a4a26'); rect(cx + 16, base - 48, 5, 4, '#9a4a26');
      rect(cx - 30, base - 5, 18, 5, '#8a4326'); rect(cx + 12, base - 5, 18, 5, '#8a4326'); // detriti alla base
      rect(cx - 28, base - 2, 14, 3, '#a85a34'); rect(cx + 14, base - 2, 14, 3, '#a85a34');
      for (const [ox, oy] of [[-24, -30], [-21, -18], [19, -34], [22, -22], [-8, -50]]) px(cx + ox, base + oy, '#6b2f18');
      /* sotto l'arcata: polvere che sale col vento (niente sagome volanti, sembravano macchie) */
      const dw = Math.floor(time / 420) % 4;
      for (let i = 0; i < 3; i++) px(cx - 8 + i * 8 + dw, base - 8 - ((i + dw) % 4) * 3, '#d09a6a');
      foot(30, '#a85a34', '#8a4326');
      break;
    }
    case 'orevein': {                         // cristalli sfaccettati che brillano
      shadow(cx, base, 15);
      rect(cx - 21, base - 7, 42, 7, '#8a4326'); rect(cx - 21, base - 2, 42, 2, '#5c2a18');
      rect(cx - 21, base - 7, 42, 2, '#a85a34');
      const cr = [[-15, 28, 7], [-6, 38, 8], [4, 30, 7], [13, 22, 6], [19, 14, 5]];
      for (const [ox, h, w] of cr) {
        rect(cx + ox, base - h, w, h, '#e08a2c');
        rect(cx + ox, base - h, 2, h, '#f4c060');                                            // faccia in luce
        rect(cx + ox + w - 2, base - h, 2, h, '#c96e1a');                                    // faccia in ombra
        rect(cx + ox + 1, base - h - 3, w - 2, 3, '#f4c060');                                // punta
        px(cx + ox + 1, base - h - 4, '#ffe9a8');
        for (let k = 6; k < h; k += 7) rect(cx + ox, base - k, w, 1, '#c96e1a');             // sfaccettature
      }
      const gl = Math.floor(time / 340) % 3;
      for (let i = 0; i < 4; i++) px(cx - 14 + i * 9, base - 34 - ((i + gl) % 3) * 4, '#ffe9a8');
      rect(cx - 24, base - 2, 48, 3, '#a85a34');
      foot(22, '#a85a34', '#8a4326');
      break;
    }

    /* ============ PALUDE ANTICA ============ */
    case 'willow': {                          // chioma a ciocche CALDA con contorno netto: sul verde palude si vede
      shadow(cx, base, 15);
      rect(cx - 22, base - 2, 44, 6, '#1e2f22'); rect(cx - 19, base - 1, 38, 4, '#3f6a52');   // pozza scura sotto
      rect(cx - 8, base - 35, 17, 35, '#5c4630'); rect(cx - 8, base - 35, 6, 35, '#7a5c3e');
      rect(cx + 5, base - 35, 4, 35, '#3d2c1c');
      for (let k = 0; k < 7; k++) { rect(cx - 7, base - 32 + k * 5, 4, 2, '#3d2c1c'); px(cx + 3, base - 30 + k * 5, '#3d2c1c'); }
      rect(cx - 16, base - 6, 33, 6, '#3d2c1c'); rect(cx - 15, base - 5, 31, 3, '#5c4630');   // radici
      rect(cx - 34, base - 40, 68, 10, '#2f4a1e');                                            // massa in ombra sotto la chioma
      rect(cx - 34, base - 58, 68, 26, '#4e7a34');                                            // verde caldo (non palude)
      rect(cx - 30, base - 63, 60, 8, '#6b9a42');
      rect(cx - 24, base - 67, 48, 5, '#86b552');
      for (let i = 0; i < 10; i++) rect(cx - 32 + i * 7, base - 54, 6, 4, '#3d6128');         // volumi interni
      for (let i = 0; i < 7; i++) px(cx - 26 + i * 8, base - 64, '#a8cf6a');                  // luci in cima
      const sw = Math.round(Math.sin(time / 1100) * 2), sw2 = Math.round(Math.sin(time / 1100 + 1) * 2);
      for (let i = 0; i < 15; i++) {                                                          // ciocche a due toni
        const ox = -32 + i * 4.6 | 0, len = 16 + ((i * 7) % 16), off = i % 2 ? sw : sw2;
        for (let k = 0; k < len; k++) {
          const wob = Math.round(off * (k / len));
          px(cx + ox + wob - 1, base - 32 + k, '#2f4a1e');                                    // lato in ombra della ciocca
          px(cx + ox + wob, base - 32 + k, k > len - 5 ? '#86b552' : '#4e7a34');
        }
      }
      const fl = Math.floor(time / 500) % 2;
      px(cx - 14, base - 22 - fl, '#e8e07a'); px(cx + 16, base - 28 + fl, '#e8e07a');
      foot(22, '#4e6a3f', '#3f6a52');
      break;
    }
    case 'lilypad': {                         // foglie con venature, fiore, rane, riflessi
      shadow(cx, base, 15);
      rect(cx - 28, base - 10, 56, 20, '#16220f');                                             // acqua nera
      rect(cx - 26, base - 8, 52, 16, '#22301f');
      const pads = [[-19, -3, 14], [-2, -6, 17], [15, 0, 13], [-11, 6, 12], [9, 7, 11]];
      pads.forEach(([ox, oy, r], i) => {
        const bob = Math.round(Math.sin(time / 800 + i * 1.7));
        const x0 = cx + ox - r, y0 = base + oy + bob - 4;
        rect(x0, y0, r * 2, 7, '#4e8d5a');
        rect(x0 + 2, y0, r * 2 - 4, 2, '#63a86c');                                             // luce sopra
        rect(x0 + 1, y0 + 6, r * 2 - 2, 1, '#3a6a44');                                         // ombra sotto
        for (let v = 1; v < 4; v++) px(cx + ox - r + v * Math.round(r / 2), y0 + 3, '#3a6a44'); // venature
        rect(cx + ox - 1, y0, 3, 7, '#22301f');                                                // spacco
      });
      const fx2 = cx - 2, fy = base - 14;                                                       // fiore
      rect(fx2 - 6, fy, 13, 8, '#a85a80'); rect(fx2 - 5, fy + 1, 11, 6, '#e08ab0');
      rect(fx2 - 3, fy - 3, 7, 4, '#f6d0e0'); px(fx2, fy - 4, '#ffe8f2');
      rect(fx2 - 1, fy + 3, 3, 2, '#f2d24a');
      break;
    }
    case 'bubblepool': {                      // pozza SCURA con bordo di fango chiaro: stacca dal prato
      shadow(cx, base, 15);
      rect(cx - 26, base - 12, 52, 24, '#6b5a34');                                            // argine di fango chiaro
      rect(cx - 24, base - 10, 48, 20, '#8a7440');
      rect(cx - 22, base - 9, 44, 18, '#1a2412');                                             // acqua quasi nera
      rect(cx - 20, base - 7, 40, 14, '#25341a');
      rect(cx - 17, base - 5, 34, 9, '#33481f');
      for (let i = 0; i < 7; i++) px(cx - 15 + i * 5, base - 3 + (i % 3), '#4a6626');         // riflessi
      const bs = [[-12, 1000, 4], [-3, 1400, 5], [7, 1150, 4], [14, 1600, 3], [-8, 1800, 3]];
      for (const [ox, per, r] of bs) {
        const t2 = ((time % per) / per), by = base + 5 - Math.round(t2 * 22);
        if (t2 < 0.86) {
          rect(cx + ox - r, by - r, r * 2, r * 2, '#9ab86a');
          rect(cx + ox - r + 1, by - r, r * 2 - 2, 1, '#d6e8a8');
          px(cx + ox - r + 1, by - r + 1, '#f0f8d0');
        } else {
          for (let k = 0; k < 5; k++) px(cx + ox - r - 1 + k * Math.max(1, Math.round(r / 2)), by - r - 1, '#d6e8a8');
        }
      }
      const st2 = Math.floor(time / 700) % 3;
      for (let i = 0; i < 3; i++) rect(cx - 8 + i * 8, base - 16 - ((i + st2) % 3) * 4, 5, 2, 'rgba(225,235,190,.45)');
      foot(24, '#5c6a44', '#4e5a3a');
      break;
    }
    /* ============ LANDE GELIDE ============ */
    case 'icespire': {                        // ghiaccio trasparente a facce, schegge, brina
      shadow(cx, base, 15);
      const spire = (ox, w, h, c1, c2, c3) => {
        rect(cx + ox, base - h, w, h, c1);
        rect(cx + ox, base - h, Math.max(2, w >> 1), h, c2);                                      // faccia in luce
        rect(cx + ox + w - 2, base - h, 2, h, c3);                                                // faccia in ombra
        for (let k = 6; k < h; k += 9) { rect(cx + ox, base - k, w, 1, '#7ec0d8'); px(cx + ox + 1, base - k, '#eafcff'); }
        rect(cx + ox + 1, base - h - 4, w - 2, 4, c2); px(cx + ox + (w >> 1), base - h - 6, '#ffffff');
      };
      spire(-16, 8, 34, '#8fd0e6', '#b6e6f4', '#5a9ab0');
      spire(9, 8, 44, '#8fd0e6', '#b6e6f4', '#5a9ab0');
      spire(-7, 15, 70, '#9fe0ee', '#cdf2fa', '#6aa8c0');
      rect(cx - 24, base - 6, 48, 7, '#cfe9f2'); rect(cx - 22, base - 5, 44, 4, '#eafcff');       // neve alla base
      for (let i = 0; i < 7; i++) px(cx - 20 + i * 6, base - 6, '#ffffff');
      const sh = Math.floor(time / 500) % 4;                                                       // scintillii
      for (let i = 0; i < 4; i++) px(cx - 6 + i * 5, base - 20 - ((i + sh) % 4) * 12, '#ffffff');
      foot(24, '#dff3fa', '#cfe9f2');
      break;
    }
    case 'frozenbeast': {                     // BLOCCO massiccio con dentro un mammut riconoscibile
      shadow(cx, base, 15);
      const X0 = cx - 32, Y0 = base - 58, W = 64, H = 58;
      rect(X0 - 7, base - 7, W + 14, 9, '#b9d9e6'); rect(X0 - 5, base - 6, W + 10, 6, '#eafcff');   // neve alla base
      g.ctx.fillStyle = 'rgba(168,220,242,.70)'; g.ctx.fillRect(X0, Y0, W, H);
      g.ctx.fillStyle = 'rgba(206,240,252,.65)'; g.ctx.fillRect(X0, Y0, W, 14);                     // faccia superiore
      g.ctx.fillStyle = 'rgba(110,170,200,.50)'; g.ctx.fillRect(X0 + W - 13, Y0, 13, H);            // faccia in ombra
      /* MAMMUT: sagoma scura con contorno, pelo a ciocche, zanne bianche ricurve, occhio */
      const bx = cx - 6, by = base - 20;
      const dark = '#2e2013', fur = '#8a6440', fur2 = '#a67c52', fur3 = '#6b4a2e';
      rect(bx - 22, by - 22, 40, 24, fur);
      rect(bx - 22, by - 22, 40, 6, fur2);                                                           // gobba in luce
      for (let i = 0; i < 10; i++) { rect(bx - 21 + i * 4, by - 14, 2, 15, fur3); px(bx - 21 + i * 4, by + 1, dark); } // ciocche
      rect(bx + 14, by - 30, 17, 21, fur2); rect(bx + 14, by - 30, 17, 5, '#bf9366');
      rect(bx + 24, by - 24, 6, 5, '#f6efdd'); px(bx + 26, by - 23, '#201a14'); px(bx + 27, by - 23, '#201a14'); // occhio
      rect(bx + 17, by - 9, 8, 14, fur); rect(bx + 17, by - 9, 3, 14, fur2);                         // proboscide
      rect(bx + 17, by + 4, 11, 4, fur); rect(bx + 24, by + 4, 5, 3, fur3);
      for (const zy of [-16, -10]) {                                                                  // zanne
        rect(bx + 30, by + zy, 11, 3, '#f6efdd'); rect(bx + 30, by + zy + 2, 11, 1, '#cfc4a8');
        rect(bx + 39, by + zy + 2, 4, 3, '#e8e0cc'); px(bx + 42, by + zy + 4, '#cfc4a8');
      }
      for (const ox of [-19, -10, 2, 11]) { rect(bx + ox, by + 2, 7, 17, fur3); rect(bx + ox, by + 2, 2, 17, fur); rect(bx + ox, by + 17, 7, 2, '#4a3524'); }
      rect(bx - 29, by - 17, 8, 4, fur3); px(bx - 30, by - 15, fur3);                                 // coda
      /* riflessi e crepe SOPRA il ghiaccio */
      g.ctx.fillStyle = 'rgba(240,252,255,.34)'; g.ctx.fillRect(X0 + 3, Y0 + 3, 15, H - 9);
      g.ctx.fillStyle = 'rgba(240,252,255,.20)'; g.ctx.fillRect(X0 + 26, Y0 + 7, 8, H - 16);
      const cr = Math.floor(time / 800) % 3;
      for (let i = 0; i < 5; i++) {
        const ccx = X0 + 9 + i * 12, ccy = Y0 + 7 + ((i + cr) % 3) * 15;
        px(ccx, ccy, '#ffffff'); px(ccx + 1, ccy + 2, '#dff3fa'); px(ccx - 1, ccy + 3, '#dff3fa'); px(ccx + 2, ccy + 5, '#ffffff');
      }
      rect(X0, Y0, W, 3, '#f4fdff'); rect(X0, base - 5, W, 4, '#8ec8dc');
      foot(32, '#dff3fa', '#cfe9f2');
      break;
    }
    case 'aurora': {                          // nastri alti che ondeggiano + neve che riflette
      rect(cx - 26, base - 5, 52, 7, '#cfe9f2'); rect(cx - 24, base - 4, 48, 4, '#eafcff');
      for (let i = 0; i < 6; i++) px(cx - 20 + i * 8, base - 5, '#ffffff');
      for (let b = 0; b < 6; b++) {
        const col = ['rgba(90,235,170,.58)', 'rgba(130,250,200,.50)', 'rgba(120,180,250,.48)', 'rgba(205,130,240,.42)', 'rgba(90,235,170,.38)', 'rgba(150,200,255,.34)'][b];
        g.ctx.fillStyle = col;
        for (let k = 0; k < 20; k++) {
          const yy = base - 10 - k * 5;
          const wob = Math.round(Math.sin(time / 1000 + b * 0.8 + k / 3.2) * 9);
          const w = 8 - Math.round(k / 8);
          g.ctx.fillRect(cx - 24 + b * 9 + wob, yy, w, 5);
        }
      }
      const st3 = Math.floor(time / 450) % 5;                                                        // stelle
      for (let i = 0; i < 8; i++) px(cx - 24 + i * 7, base - 40 - ((i + st3) % 5) * 11, i % 2 ? '#ffffff' : '#dff3fa');
      /* riflesso verde sulla neve */
      g.ctx.fillStyle = 'rgba(120,222,180,.14)'; g.ctx.fillRect(cx - 24, base - 4, 48, 4);
      break;
    }
    default: rect(cx - 4, base - 8, 8, 8, '#9a9285');
  }
}
