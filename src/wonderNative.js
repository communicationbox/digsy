/* MERAVIGLIE IN NATIVO — modulo puro.

   Le meraviglie erano disegnate sulla vecchia griglia da 16 pixel e il mondo le raddoppiava:
   ogni loro pixel era grande il doppio di quelli di Digsy, delle case e dell'arredo, e accanto
   alle botteghe ridisegnate sembravano un gioco diverso. Qui sono ridisegnate da capo alla
   risoluzione vera (32 px per casella) con lo stesso trattamento del resto: contorno scuro,
   lato in luce e lato in ombra, appoggio al terreno, animazioni con la fase dal tempo.

   Coordinate: (0, 0) è il centro della casella d'ancora, sul bordo in BASSO (dove poggia).
   y negativo sale. Una casella = 32. Gli ingombri solidi restano quelli di WONDER_SOLID.
   Il pennello `g` ha rect/px già convertiti (vedi drawWonder in wonderart.js). */

/* ---------- primitive ---------- */
/* RETTANGOLO TONDO — lo stile del saguaro: angoli smussati, contorno che segue il profilo,
   filo di luce sul lato illuminato e ombra sull'altro. Le meraviglie nascevano a rettangoli
   vivi e accanto al resto del mondo (tondo) sembravano incollate. */
function tondo(g, x, y, w, h, r, fill, light, dark, line = '#241a10') {
  const dentro = (px2, py2) => {
    const dx = Math.min(px2 - x, x + w - 1 - px2), dy = Math.min(py2 - y, y + h - 1 - py2);
    if (dx < 0 || dy < 0) return false;
    return !(dx < r && dy < r && (r - dx) ** 2 + (r - dy) ** 2 > r * r + r);
  };
  for (let py2 = y - 1; py2 <= y + h; py2++) for (let px2 = x - 1; px2 <= x + w; px2++) {
    if (!dentro(px2, py2)) {
      if (dentro(px2 + 1, py2) || dentro(px2 - 1, py2) || dentro(px2, py2 + 1) || dentro(px2, py2 - 1)) g.rect(px2, py2, 1, 1, line);
      continue;
    }
    const bordoL = !dentro(px2 - 1, py2) || !dentro(px2 - 2, py2), bordoR = !dentro(px2 + 1, py2), sopra = !dentro(px2, py2 - 1) || !dentro(px2, py2 - 2);
    g.rect(px2, py2, 1, 1, sopra || bordoL ? light : bordoR ? dark : fill);
  }
  return dentro;
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return '#' + ((1 << 24) | (f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
}
function disc(g, cx, cy, r, col) {
  for (let y = -r; y <= r; y++) {
    const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
    g.rect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1, col);
  }
}
function ellipse(g, cx, cy, rx, ry, col) {
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (w > 0) g.rect(Math.round(cx - w), Math.round(cy + y), w * 2, 1, col);
  }
}
/* ---------- IL PENNELLO DELLE MERAVIGLIE ----------
   Ogni meraviglia è fatta di VOLUMI: rettangoli con gli angoli smussati, ellissi, capsule fra
   due punti. Si compone la sagoma di un pezzo e la si dipinge in un colpo solo: un contorno
   solo tutt'intorno, la luce dove batte il sole (in alto a sinistra), l'ombra dall'altra parte.
   Prima ogni meraviglia era una pila di rettangoli tinti a mano: spigoli vivi, bordi doppi dove
   si toccavano, e nessuna luce coerente da un pezzo all'altro. */
export const R = (x, y, w, h, r = 0) => ({ k: 'r', x, y, w, h, r });
export const E = (cx, cy, rx, ry) => ({ k: 'e', cx, cy, rx, ry });
export const C = (x0, y0, x1, y1, r) => ({ k: 'c', x0, y0, x1, y1, r });   // capsula: tronco, ramo, arco
/* POLIGONO: l'unica forma con gli SPIGOLI. Serve dove la pietra è spaccata e non levigata
   (i menhir): con sole capsule ed ellissi ogni masso veniva una capsula tonda. */
export const P = pts => ({ k: 'p', pts });
function inShape(s, x, y) {
  if (s.k === 'p') {                                   // raycast pari/dispari sul centro del pixel
    const px2 = x + 0.5, py2 = y + 0.5, pts = s.pts; let dentro = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py2) !== (yj > py2) && px2 < (xj - xi) * (py2 - yi) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }
  if (s.k === 'r') {
    const dx = Math.min(x - s.x, s.x + s.w - 1 - x), dy = Math.min(y - s.y, s.y + s.h - 1 - y);
    if (dx < 0 || dy < 0) return false;
    return !(dx < s.r && dy < s.r && (s.r - dx) ** 2 + (s.r - dy) ** 2 > s.r * s.r + s.r);
  }
  if (s.k === 'e') return ((x - s.cx) ** 2) / (s.rx * s.rx + 0.5) + ((y - s.cy) ** 2) / (s.ry * s.ry + 0.5) <= 1;
  const vx = s.x1 - s.x0, vy = s.y1 - s.y0, L2 = vx * vx + vy * vy || 1;
  let u = ((x - s.x0) * vx + (y - s.y0) * vy) / L2; u = Math.max(0, Math.min(1, u));
  const dx = x - (s.x0 + vx * u), dy = y - (s.y0 + vy * u);
  return dx * dx + dy * dy <= s.r * s.r + s.r;
}
/* dipinge una sagoma composta. `tint(x, y, dentro)` può cambiare il colore del corpo (venature,
   anelli, strati); torna la funzione `dentro` così i dettagli si possono ritagliare sul pezzo. */
export function forma(g, shapes, fill, light, dark, line, tint) {
  /* CONTORNO A COLORE: la tinta del pezzo, molto scurita. Il nero fisso attorno a una
     meraviglia alta sei caselle si vede da lontano e la fa sembrare un ritaglio. */
  if (line === undefined) line = g.shade8(fill, 0.4);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const s of shapes) {
    const b = s.k === 'r' ? [s.x, s.y, s.x + s.w, s.y + s.h]
      : s.k === 'p' ? [Math.min(...s.pts.map(p => p[0])), Math.min(...s.pts.map(p => p[1])), Math.max(...s.pts.map(p => p[0])) + 1, Math.max(...s.pts.map(p => p[1])) + 1]
      : s.k === 'e' ? [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx + 1, s.cy + s.ry + 1]
        : [Math.min(s.x0, s.x1) - s.r, Math.min(s.y0, s.y1) - s.r, Math.max(s.x0, s.x1) + s.r + 1, Math.max(s.y0, s.y1) + s.r + 1];
    x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
  }
  const dentro = (x, y) => shapes.some(s => inShape(s, x, y));
  for (let y = Math.round(y0) - 1; y <= Math.round(y1) + 1; y++) for (let x = Math.round(x0) - 1; x <= Math.round(x1) + 1; x++) {
    if (!dentro(x, y)) {
      if (dentro(x + 1, y) || dentro(x - 1, y) || dentro(x, y + 1) || dentro(x, y - 1)) g.rect(x, y, 1, 1, line);
      continue;
    }
    const luce = !dentro(x - 1, y) || !dentro(x, y - 1) || !dentro(x - 2, y);
    const ombra = !dentro(x + 1, y) || !dentro(x, y + 1);
    const c = tint && tint(x, y);
    g.rect(x, y, 1, 1, luce ? light : ombra ? dark : (c || fill));
  }
  return dentro;
}
/* ombra morbida a terra: tre ellissi trasparenti */
function groundShadow(g, rx, ry) {
  ellipse(g, 0, 0, rx, ry, 'rgba(20,16,10,.14)');
  ellipse(g, 0, 0, Math.round(rx * 0.75), Math.round(ry * 0.7), 'rgba(20,16,10,.10)');
}
/* ciuffi d'erba che coprono il bordo dove la struttura tocca terra */
function tufts(g, x0, x1, c1, c2, seed) {
  for (let x = x0; x < x1; x += 5) {
    const j = ((x * 7 + (seed || 0)) % 11 + 11) % 11;
    if (j < 3) continue;
    const h = 3 + (j % 4);
    g.rect(x, -h, 2, h + 1, j % 2 ? c1 : c2);
    g.rect(x + 2, -h + 2, 1, h - 1, j % 2 ? c2 : c1);
  }
}
/* osso/zanna lungo una curva: contorno, corpo, luce sul lato esterno, ombra sul lato interno */
function boneCurve(g, pts, r0, r1, col) {
  const LN = '#5f5642', HI = shade(col, 1.12), SH = shade(col, 0.78);
  const N = pts.length - 1;
  for (const pass of [0, 1, 2, 3]) for (let i = 0; i <= N; i++) {
    const [x, y] = pts[i], r = Math.round(r0 + (r1 - r0) * (i / N));
    if (pass === 0) disc(g, x, y, r + 2, LN);
    else if (pass === 1) disc(g, x, y, r, col);
    else if (pass === 2) disc(g, x + 2, y + 2, Math.max(1, r - 3), SH);
    else disc(g, x - Math.round(r * 0.35), y - Math.round(r * 0.35), Math.max(1, Math.round(r * 0.35)), HI);
  }
}

/* ================= DUNE OSSEE ================= */
function disegna_bonearch(g, t) {
  groundShadow(g, 84, 14);
  /* due zanne che si incrociano in cima: curva a quarto d'ellisse da ogni piede */
  const arc = side => { const p = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI / 2; p.push([side * Math.round(62 * Math.cos(a) + 4 * Math.sin(a * 2)), -Math.round(150 * Math.sin(a)) - 4]); } return p; };
  boneCurve(g, arc(-1), 13, 8, '#e8e0cc');
  boneCurve(g, arc(1), 13, 8, '#e3d9c1');
  /* anelli di crescita lungo le zanne */
  for (const side of [-1, 1]) for (let i = 3; i < 38; i += 5) {
    const a = (i / 40) * Math.PI / 2, x = side * Math.round(62 * Math.cos(a) + 4 * Math.sin(a * 2)), y = -Math.round(150 * Math.sin(a)) - 4;
    g.rect(x - 5, y, 10, 1, '#c9bd9f');
  }
  /* nodo in cima con un piccolo cranio */
  disc(g, 0, -154, 14, '#5f5642'); disc(g, 0, -154, 12, '#efe7d4'); disc(g, -4, -158, 5, '#fbf6ea');
  g.rect(-9, -150, 18, 12, '#5f5642'); g.rect(-8, -150, 16, 10, '#e8e0cc');
  g.rect(-5, -147, 4, 4, '#3a3226'); g.rect(2, -147, 4, 4, '#3a3226'); g.rect(-1, -142, 2, 2, '#3a3226');
  for (let i = -6; i <= 5; i += 3) g.rect(i, -140, 2, 3, '#fbf6ea');
  /* piedi affondati nella sabbia, con cumuli e sassi */
  for (const side of [-1, 1]) {
    const fx = side * 64;
    ellipse(g, fx, -2, 26, 8, '#c9b98f'); ellipse(g, fx, -4, 22, 6, '#d8c9a0'); ellipse(g, fx - 4, -6, 12, 3, '#e8dcb8');
    for (const [dx, dy, r] of [[-22, 2, 3], [18, 1, 2], [26, -1, 2]]) { disc(g, fx + dx, dy, r + 1, '#7a6e58'); disc(g, fx + dx, dy - 1, r, '#b5a982'); }
  }
  /* il passaggio luccica: scintille azzurre che salgono sotto l'arco */
  const ph = (t / 1400) % 1;
  for (let i = 0; i < 7; i++) {
    const k = (ph + i / 7) % 1, x = Math.round(Math.sin(i * 2.3) * 30), y = -10 - Math.round(k * 120);
    const c = k < 0.7 ? '#cdf2fa' : '#8fd0e6';
    g.rect(x, y, 2, 2, c); if (i % 2) { g.rect(x - 2, y, 6, 1, c); g.rect(x + 1, y - 2, 1, 6, c); }
  }
  /* frammenti d'osso sparsi */
  for (const [x, y] of [[-30, 6], [34, 8], [0, 10]]) { g.rect(x - 1, y - 1, 10, 4, '#5f5642'); g.rect(x, y, 8, 2, '#e8e0cc'); }
}

function disegna_oasis(g, t) {
  groundShadow(g, 90, 18);
  /* sponda: sabbia bagnata più scura attorno all'acqua */
  ellipse(g, -6, 2, 70, 26, '#c4b184'); ellipse(g, -6, 2, 64, 23, '#a8966a');
  /* acqua: dal blu profondo al turchese del bordo */
  ellipse(g, -6, 2, 60, 21, '#2e7e9c'); ellipse(g, -6, 0, 50, 16, '#236a88'); ellipse(g, -6, -2, 34, 10, '#1b566e');
  ellipse(g, -6, 12, 50, 8, '#49a8c2'); ellipse(g, -6, 16, 40, 4, '#7fd0dc');
  /* riflessi delle palme e increspature che si allargano */
  for (const [x, w] of [[-36, 3], [-20, 2], [18, 3]]) g.rect(x, -8, w, 20, 'rgba(15,40,30,.35)');
  const r = (t / 1600) % 1;
  for (const [ox, oy, d] of [[-20, 0, 0], [16, 6, 0.5]]) {
    const k = (r + d) % 1, rx = 4 + Math.round(k * 16), ry = 1 + Math.round(k * 5);
    const a = (0.55 * (1 - k)).toFixed(2);
    for (let i = 0; i < 24; i++) { const ang = (i / 24) * Math.PI * 2; g.rect(ox + Math.round(Math.cos(ang) * rx), oy + Math.round(Math.sin(ang) * ry), 2, 1, 'rgba(220,248,252,' + a + ')'); }
  }
  /* GRANDE CRANIO sul lato destro: il riparo che dà l'ombra (è la parte solida) */
  const sx = 62, sy = -18;
  ellipse(g, sx, sy + 20, 36, 8, 'rgba(20,16,10,.25)');
  /* il cranio è UN volume: calotta tonda e muso smussato, un contorno solo */
  const dentroS = forma(g, [E(sx, sy - 14, 30, 28), R(sx - 25, sy - 8, 50, 26, 10)], '#e3d9c1', '#f3ecda', '#b9ad91', '#5f5642');
  for (let y = sy + 6; y < sy + 16; y++) for (let x = sx - 26; x <= sx + 26; x++) if (dentroS(x, y) && dentroS(x - 1, y) && dentroS(x + 1, y)) g.rect(x, y, 1, 1, '#c9bda4');
  ellipse(g, sx - 11, sy - 8, 8, 7, '#2e2618'); ellipse(g, sx + 11, sy - 8, 8, 7, '#2e2618');       // orbite
  ellipse(g, sx - 11, sy - 6, 5, 4, '#15100a'); ellipse(g, sx + 11, sy - 6, 5, 4, '#15100a');
  g.rect(sx - 2, sy + 2, 5, 6, '#2e2618');
  for (let i = -18; i <= 14; i += 6) { g.rect(sx + i, sy + 14, 4, 6, '#5f5642'); g.rect(sx + i + 1, sy + 14, 2, 5, '#f3ecda'); }
  g.rect(sx - 20, sy - 30, 4, 12, '#c9bd9f'); g.rect(sx + 14, sy - 34, 3, 9, '#c9bd9f');           // crepe
  /* PALME: tronco ad anelli che si piega, fronde a raggiera con foglioline */
  const palm = (bx, h, lean, sw) => {
    /* il TRONCO è una curva continua, non una scaletta di mattoncini: capsule che si
       inseguono, una sagoma sola, e gli anelli incisi sopra */
    const nodi = [];
    for (let k = 0; k <= h; k += 6) { const tt = k / h; nodi.push([bx + Math.round(lean * tt * tt * 26), -k]); }
    const pezzi = [];
    for (let i = 0; i < nodi.length - 1; i++) {
      const tt = i / (nodi.length - 1), r = Math.round(6 - tt * 2.5);
      pezzi.push(C(nodi[i][0], nodi[i][1], nodi[i + 1][0], nodi[i + 1][1], r));
    }
    pezzi.push(E(bx, -2, 9, 4));                                   // il piede allargato
    const dentroT = forma(g, pezzi, '#a97a4c', '#c49a63', '#7a5230', '#3f2a17');
    for (let k = 4; k < h; k += 7) { const tt = k / h, xx = bx + Math.round(lean * tt * tt * 26);
      for (let d = -7; d <= 7; d++) if (dentroT(xx + d, -k)) g.rect(xx + d, -k, 1, 1, '#8a5f38'); }
    const [tx, ty] = [nodi[nodi.length - 1][0], nodi[nodi.length - 1][1] - 2];
    const swy = Math.round(Math.sin(t / 900 + sw) * 2);
    for (const [dx, up, len] of [[-1, 0.7, 34], [-1, 0.1, 30], [1, 0.7, 34], [1, 0.1, 30], [-0.4, 1.2, 22], [0.5, 1.1, 24]]) {
      for (let k = 0; k <= len; k++) {
        const u = k / len, fx = tx + Math.round(dx * u * len), fy = ty + Math.round(-up * 10 * u + u * u * 22) + Math.round(swy * u);
        g.rect(fx - 1, fy - 1, 4, 4, '#1f3d1a');
        g.rect(fx, fy, 3, 2, '#3f7d33');
        if (k % 3 === 0 && k > 3) { g.rect(fx, fy + 2, 1, 4 + (k % 2), '#3f7d33'); g.rect(fx + 2, fy + 2, 1, 3, '#5fa04e'); }
        if (k % 4 === 0) g.px(fx, fy, '#7ec069');
      }
    }
    for (const [cx2, cy2] of [[-3, 3], [3, 4], [0, 6]]) { disc(g, tx + cx2, ty + cy2, 3, '#4a3018'); disc(g, tx + cx2 - 1, ty + cy2 - 1, 1, '#8a6a3a'); }
  };
  palm(-58, 92, 1, 0); palm(-34, 70, -0.6, 1.3); palm(8, 80, 0.5, 2.1);
  /* canne e sassi sulla sponda */
  for (const [x, h] of [[-78, 22], [-74, 30], [-70, 18], [30, 20], [34, 26]]) {
    for (let k = 0; k < h; k++) g.rect(x + Math.round(Math.sin(k / h * 1.4 + t / 1300) * 2), -k, 2, 1, k > h - 6 ? '#c9b35a' : '#6f8a3a');
  }
  for (const [x, y, r] of [[-86, 4, 5], [-66, 12, 3], [24, 14, 4]]) { disc(g, x, y, r + 1, '#6e6250'); disc(g, x, y - 1, r, '#b5a982'); g.rect(x - r + 1, y - r, r, 1, '#d2c69c'); }
}

/* ================= BOSCHI CINEREI ================= */
function disegna_mushring(g, t) {
  groundShadow(g, 70, 16);
  /* anello di muschio con erbette */
  ellipse(g, 0, 0, 68, 25, '#34502c'); ellipse(g, 0, 0, 64, 22, '#4e6a3f'); ellipse(g, 0, 0, 50, 15, '#6f8f5a'); ellipse(g, 0, -1, 44, 12, '#5b7a4c');
  for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; g.rect(Math.round(Math.cos(a) * 54), Math.round(Math.sin(a) * 18) - 2, 2, 3, i % 2 ? '#6f8f5a' : '#86a86c'); }
  /* funghi: dietro prima, davanti dopo */
  const ring = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; ring.push([Math.round(Math.cos(a) * 58), Math.round(Math.sin(a) * 20), 0.62 + ((i * 5) % 4) * 0.15, i]); }
  ring.sort((a, b) => a[1] - b[1]);
  for (const [mx, my, s, i] of ring) {
    const stemH = Math.round(14 * s), capW = Math.round(15 * s), capH = Math.round(9 * s);
    ellipse(g, mx, my + 1, capW - 2, 3, 'rgba(15,20,10,.35)');
    g.rect(mx - 4, my - stemH, 8, stemH + 1, '#6e5f48');
    g.rect(mx - 3, my - stemH, 6, stemH, '#efe4c8'); g.rect(mx - 3, my - stemH, 2, stemH, '#fbf5e4'); g.rect(mx + 2, my - stemH, 1, stemH, '#c9bd9f');
    g.rect(mx - 5, my - Math.round(stemH * 0.55), 10, 2, '#e0d2b0');                              // gonnellino
    const cy = my - stemH;
    ellipse(g, mx, cy + 1, capW + 1, 3, '#7a2a22');
    for (let r = 0; r <= capH; r++) { const w = Math.round(capW * Math.sqrt(1 - (r / (capH + 1)) ** 2)); g.rect(mx - w, cy - r, w * 2 + 1, 1, r === capH ? '#7a2a22' : r > capH - 3 ? '#e2604f' : '#c9443a'); }
    g.rect(mx - capW + 2, cy - 1, capW * 2 - 3, 2, '#9c3a30');
    for (let d = 0; d < 4; d++) { const dx = Math.round((d - 1.5) * capW * 0.45), dy = -Math.round(capH * (0.35 + (d % 2) * 0.3)); g.rect(mx + dx, cy + dy, 3, 2, '#f6efdd'); }
    g.px(mx - Math.round(capW * 0.4), cy - capH + 2, '#f6a090');
    /* spore che salgono, a turno */
    const k = ((t / 1800) + i * 0.37) % 1;
    if (k < 0.6) g.rect(mx + Math.round(Math.sin(k * 9 + i) * 4), cy - capH - Math.round(k * 26), 2, 2, k < 0.3 ? '#b8f08a' : '#86d06a');
  }
}

function disegna_totem(g, t) {
  /* TOTEM: un TRONCO, quindi un cilindro — non una pila di casse. Il palo è una capsula sola
     con la luce a sinistra e l'ombra a destra; i quattro volti sono fasce di colore ritagliate
     dentro la stessa sagoma, separate da un anello inciso. */
  groundShadow(g, 30, 8);
  ellipse(g, 0, -2, 24, 7, '#4a3a28'); ellipse(g, 0, -3, 20, 5, '#6b5238');
  for (const [x, r] of [[-20, 5], [18, 4], [-8, 3]]) { disc(g, x, -2, r + 1, '#3a342c'); disc(g, x, -3, r, '#8a8378'); g.px(x - 1, -r - 2, '#aaa294'); }
  const faces = [
    { col: '#6f5a94', kind: 'occhi' }, { col: '#d8973c', kind: 'corna' }, { col: '#4e8d7c', kind: 'zanne' }, { col: '#c94f4a', kind: 'becco' },
  ];
  const H = 30, top = -6 - 4 * H;
  /* le ALI stanno dietro al palo: piume tonde che si aprono a ventaglio */
  for (const side of [-1, 1]) for (let k = 4; k >= 0; k--) {
    const x = side * (15 + k * 7), y = top + 3 + k * 3, len = 22 - k * 3;
    forma(g, [C(x, y, x + side * 3, y + len, 4)], k % 2 ? '#a97a4c' : '#8a5f38', '#d8973c', '#6e4a2e');
  }
  /* IL PALO, tutto in un pezzo */
  const dentro = forma(g, [R(-16, top, 32, -6 - top, 12), E(0, -6, 17, 7)], '#8a5f38', '#b08a58', '#5c3d22');
  /* dipinge DENTRO il palo lasciando intatto il pixel di bordo: il filo di luce e l'ombra del
     cilindro devono sopravvivere alle fasce colorate */
  const dipingi = (x0, y0, w, h, c) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++)
      if (dentro(x, y) && dentro(x - 1, y) && dentro(x + 1, y)) g.rect(x, y, 1, 1, c);
  };
  faces.forEach((f, i) => {
    const y0 = -6 - (i + 1) * H, c = f.col, d = shade(c, 0.62), l = shade(c, 1.24);
    dipingi(-16, y0 + 2, 32, H - 3, c);                       // fascia colorata del volto
    dipingi(-16, y0 + 2, 6, H - 3, l); dipingi(10, y0 + 2, 6, H - 3, d);   // cilindro: luce e ombra
    dipingi(-16, y0, 32, 2, shade(c, 0.34)); dipingi(-16, y0 + 2, 32, 1, shade(c, 1.4));   // anello inciso fra un volto e l'altro
    for (const ex of [-9, 4]) { disc(g, ex + 2, y0 + 11, 5, g.shade8('#f6efdd', 0.34)); disc(g, ex + 2, y0 + 11, 4, '#f6efdd'); disc(g, ex + 2, y0 + 11, 2, '#201a14'); }   // occhi tondi
    dipingi(-12, y0 + 5, 9, 2, d); dipingi(3, y0 + 5, 9, 2, d);                        // sopracciglia
    if (f.kind === 'becco') forma(g, [C(0, y0 + 16, 0, y0 + 25, 5), E(0, y0 + 17, 6, 4)], '#f2c53d', '#ffe08a', '#c9a227', '#2a1e14');
    if (f.kind === 'zanne') { forma(g, [E(0, y0 + 20, 10, 4)], '#5a2a22', '#7a4436', '#3f1c18', g.shade8('#f6efdd', 0.34)); for (const zx of [-7, 5]) forma(g, [C(zx, y0 + 19, zx + 1, y0 + 26, 2)], '#f6efdd', '#ffffff', '#c9bda4', '#2a1e14'); }
    if (f.kind === 'corna') { forma(g, [E(0, y0 + 20, 8, 3)], '#2a1e14', '#4a3524', '#201a14', g.shade8('#e8dcb8', 0.34)); for (const hx of [-14, 14]) forma(g, [C(hx, y0 + 8, hx + (hx < 0 ? -8 : 8), y0 - 8, 4), E(hx, y0 + 8, 5, 4)], '#e8dcb8', '#ffffff', '#b8a882', '#2a1e14'); }
    if (f.kind === 'occhi') { forma(g, [E(0, y0 + 21, 9, 4)], '#2a1e14', '#4a3524', '#201a14', g.shade8('#f6efdd', 0.34)); for (let k = -6; k < 8; k += 4) g.rect(k, y0 + 19, 2, 3, '#f6efdd'); }
  });
  /* UCCELLO DEL TUONO in cima: testa tonda, cresta, becco */
  forma(g, [E(0, top - 9, 15, 11), E(0, top - 20, 6, 6)], '#c9a227', '#f0d470', '#9a7a18', '#2a1e14');
  forma(g, [E(0, top - 26, 5, 5)], '#c65a54', '#e07a70', '#9a3f3a', '#2a1e14');       // ciuffo
  for (const ex of [-6, 6]) { disc(g, ex, top - 11, 4, g.shade8('#f6efdd', 0.34)); disc(g, ex, top - 11, 3, '#f6efdd'); disc(g, ex, top - 11, 1, '#201a14'); }
  forma(g, [C(0, top - 5, 0, top + 2, 4)], '#e0873a', '#f2a55a', '#b06a28', '#2a1e14');
  if (Math.floor(t / 700) % 4 === 0) for (const ex of [-6, 6]) disc(g, ex, top - 11, 2, '#fff3a0');   // gli occhi si accendono
  tufts(g, -26, 26, '#6e8f5a', '#5a7a4a', 3);
}

/* ================= TERRE ROSSE ================= */
function disegna_geyser(g, t) {
  groundShadow(g, 62, 14);
  /* terrazze di sinter: anelli di minerale color crema, ocra e ruggine */
  const rings = [[56, 18, '#7a3a20'], [50, 15, '#b5623a'], [44, 13, '#d09060'], [36, 10, '#e8c890'], [28, 8, '#c9784a'], [20, 6, '#f0dcb0']];
  rings.forEach(([rx, ry, c], i) => { ellipse(g, 0, -2 - i * 3, rx, ry, shade(c, 0.7)); ellipse(g, 0, -3 - i * 3, rx - 2, ry - 1, c); });
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.rect(Math.round(Math.cos(a) * 46), -8 + Math.round(Math.sin(a) * 13), 3, 2, '#5ec4b4'); } // pozzette turchesi
  ellipse(g, 0, -20, 12, 4, '#2a140a'); ellipse(g, 0, -20, 8, 2, '#140a05');                            // bocca
  /* getto pulsante */
  const ph = (t / 2400) % 1;
  const hgt = ph < 0.55 ? Math.round(30 + Math.sin(ph / 0.55 * Math.PI) * 150) : Math.round(18 + Math.sin(((ph - 0.55) / 0.45) * Math.PI) * 20);
  for (let k = 0; k < hgt; k++) {
    const w = Math.max(6, 22 - Math.round(k / 8)), wob = Math.round(Math.sin(t / 180 + k / 9) * 2);
    const y = -20 - k;
    g.rect(-(w >> 1) + wob - 1, y, w + 2, 1, '#9fd0e0');
    g.rect(-(w >> 1) + wob, y, w, 1, k % 11 < 2 ? '#ffffff' : '#e6f4fa');
    g.rect(-(w >> 1) + wob, y, 3, 1, '#ffffff');
  }
  /* gocce che ricadono ai lati */
  for (let i = 0; i < 10; i++) {
    const k = ((t / 900) + i / 10) % 1, side = i % 2 ? 1 : -1;
    const x = side * Math.round(8 + k * 40), y = -20 - hgt + Math.round(k * k * (hgt + 10));
    if (y < -24) g.rect(x, y, 2, 3, '#cfeaf4');
  }
  /* nuvola di vapore in cima */
  const cl = t / 1000;
  for (const [ox, oy, r, a] of [[-10, -8, 14, 0.55], [10, -14, 16, 0.5], [0, -26, 12, 0.45], [-20, -22, 9, 0.35], [22, -2, 10, 0.4]]) {
    disc(g, Math.round(ox + Math.sin(cl + ox) * 3), -20 - hgt + oy, r, 'rgba(236,246,250,' + a + ')');
  }
  /* cristalli di zolfo e pozza calda */
  for (const [x, h] of [[-48, 8], [-42, 12], [46, 10]]) { g.rect(x - 1, -h - 1, 6, h + 1, '#6b5a10'); g.rect(x, -h, 4, h, '#e8d040'); g.rect(x, -h, 1, h, '#fff090'); }
  ellipse(g, 38, 10, 14, 4, '#5a2a18'); ellipse(g, 38, 9, 12, 3, '#5ec4b4'); g.rect(32, 8, 5, 1, '#bff0e8');
}

function disegna_redarch(g, t) {
  /* ARCO ROSSO: un arco naturale del deserto, di quelli scolpiti dal vento. Due gambe di
     arenaria che poggiano sulle caselle solide (colonne -2 e +1), si assottigliano salendo, e un
     ponte di roccia sottile e curvo che le unisce. La prima versione nativa era un muro alto
     cinque caselle con un buco e le macchie scure ("troppo grande e non mi piace"). */
  groundShadow(g, 80, 12);
  ellipse(g, 0, -2, 64, 7, 'rgba(60,24,10,.18)');
  const noise = (x, y) => Math.sin(x * 0.35 + y * 0.21) * 0.6 + Math.sin(y * 0.13 - x * 0.1) * 0.8;
  const SC = 0.85;                                    // taglia: l'arco sale circa tre caselle e mezzo
  const inside = (x0, y0) => {
    const x = x0 / SC, y = y0 / SC;
    if (y > 0) return false;
    /* gambe: poggiano a ±50 e si piegano verso il centro salendo, come un arco vero */
    for (const side of [-1, 1]) {
      const h = -y, c = side * (50 - h * h * 0.0016);
      const hw = 12 + (y > -16 ? (y + 16) * 0.55 : 0) + noise(x, y) * 0.5;
      if (y > -90 && Math.abs(x - c) <= hw) return true;
    }
    /* volta: un anello d'arco (tra due semiellissi) che unisce le cime delle gambe */
    const rIn = (x * x) / (25 * 25) + ((y + 80) * (y + 80)) / (30 * 30), rOut = (x * x) / (49 * 49) + ((y + 80) * (y + 80)) / (48 * 48);
    if (y <= -76 && rOut <= 1 + noise(x, y) * 0.02 && rIn >= 1) return true;
    return false;
  };
  const band = ['#c0683e', '#cf7c4c', '#b35c34', '#d88c5a', '#bd6a40'];
  for (let y = -116; y <= 0; y++) {
    let runX = null, runC = null;
    const flush = xEnd => { if (runX !== null) g.rect(runX, y, xEnd - runX, 1, runC); runX = null; };
    for (let x = -80; x <= 80; x++) {
      if (!inside(x, y)) { flush(x); continue; }
      let c;
      if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || (y < 0 && !inside(x, y + 1))) c = '#4a2010';
      else {
        const b = band[((Math.floor((y + Math.round(noise(x, y) * 1.5) + 200) / 6)) % band.length)];
        if (!inside(x, y - 2)) c = '#f0b080';                                        // cima in luce
        else if (!inside(x - 3, y)) c = shade(b, 1.18);                              // lato sinistro in luce
        else if (!inside(x + 4, y)) c = shade(b, 0.66);                              // lato destro in ombra
        else if (y > -68 && Math.abs(x) < 38 && !inside(x + (x < 0 ? 4 : -4), y)) c = shade(b, 0.8);   // bordo interno delle gambe
        else if (!inside(x, y + 3) && y < -6) c = shade(b, 0.62);                    // sotto il ponte, in ombra
        else c = b;
      }
      if (c !== runC) { flush(x); runX = x; runC = c; }
    }
    flush(81);
  }
  /* sassi caduti ai piedi e un cespuglio del deserto */
  for (const [x, y, r] of [[-70, 2, 5], [-26, 6, 3], [70, 3, 5], [28, 7, 3], [4, 9, 2]]) { disc(g, x, y, r + 1, '#4a2010'); disc(g, x, y - 1, r, '#b5623a'); g.rect(x - r + 2, y - r, r, 1, '#d8905a'); }
  for (const x of [-86, 82]) { g.rect(x, -16, 4, 16, '#2f4a2a'); g.rect(x + 1, -15, 2, 14, '#6f9a52'); g.rect(x - 4, -11, 4, 2, '#6f9a52'); g.rect(x + 4, -8, 4, 2, '#6f9a52'); g.rect(x - 4, -14, 2, 4, '#6f9a52'); g.rect(x + 6, -11, 2, 4, '#6f9a52'); }
  /* un filo di sabbia che il vento fa passare sotto l'arco */
  for (let i = 0; i < 5; i++) {
    const k = ((t / 2400) + i / 5) % 1, x = -30 + Math.round(k * 60), y = -8 - ((i * 11) % 30);
    g.rect(x, y, 3, 1, 'rgba(245,200,150,' + (0.7 * (1 - Math.abs(k - 0.5) * 2)).toFixed(2) + ')');
  }
}

function disegna_orevein(g, t) {
  groundShadow(g, 60, 14);
  /* spuntone di roccia rossa */
  const rock = [[-48, 0], [-44, -22], [-30, -34], [-8, -40], [16, -36], [34, -26], [48, -10], [50, 0]];
  for (let x = -50; x <= 50; x++) {
    let top = 0;
    for (let i = 0; i < rock.length - 1; i++) { const [x0, y0] = rock[i], [x1, y1] = rock[i + 1]; if (x >= x0 && x <= x1) top = Math.round(y0 + (y1 - y0) * ((x - x0) / Math.max(1, x1 - x0))); }
    g.rect(x, top - 1, 1, -top + 2, '#3a1a0c');
    g.rect(x, top, 1, -top, x < -10 ? '#a85a34' : x < 20 ? '#8a4326' : '#6e3420');
    if (x % 9 === 0) g.rect(x, top + 6, 1, 8, '#5c2a18');
  }
  for (const [x, y] of [[-30, -18], [-12, -26], [22, -16], [36, -8], [-38, -6]]) { g.rect(x, y, 3, 2, '#e8c34a'); g.px(x, y, '#fff3a0'); }   // pagliuzze d'oro
  /* cristalli d'ambra sfaccettati */
  const crys = [[-26, -30, 10, 44, -0.2], [-8, -36, 13, 62, 0.05], [10, -32, 11, 50, 0.25], [26, -24, 9, 34, 0.45], [38, -14, 7, 22, 0.6], [-40, -16, 7, 22, -0.5]];
  crys.sort((a, b) => a[3] - b[3]);
  for (const [x, y, w, h, lean] of crys) {
    for (let k = 0; k < h; k++) {
      const u = k / h, xx = x + Math.round(lean * k), ww = u > 0.82 ? Math.max(1, Math.round(w * (1 - u) / 0.18)) : w;
      g.rect(xx - (ww >> 1) - 1, y - k, ww + 2, 1, '#6a3408');
      g.rect(xx - (ww >> 1), y - k, ww, 1, '#e08a2c');
      g.rect(xx - (ww >> 1), y - k, Math.max(1, ww >> 2), 1, '#f8cf70');
      g.rect(xx + (ww >> 1) - Math.max(1, ww >> 3), y - k, Math.max(1, ww >> 3), 1, '#b05a14');
    }
    g.rect(x + Math.round(lean * h * 0.4) - 1, y - Math.round(h * 0.4), 2, Math.round(h * 0.3), 'rgba(255,245,210,.55)');
  }
  /* bagliori che passano da un cristallo all'altro */
  const gi = Math.floor(t / 380) % crys.length, [gx, gy, , gh, gl] = crys[gi];
  const sx = gx + Math.round(gl * gh * 0.8), sy = gy - Math.round(gh * 0.8);
  g.rect(sx - 4, sy, 9, 1, '#ffffff'); g.rect(sx, sy - 4, 1, 9, '#ffffff'); g.rect(sx - 1, sy - 1, 3, 3, '#fff3c8');
  for (const [x, r] of [[-56, 5], [54, 4]]) { disc(g, x, -2, r + 1, '#3a1a0c'); disc(g, x, -3, r, '#8a4326'); }
}

/* ================= PALUDE ANTICA ================= */
function disegna_willow(g, t) {
  groundShadow(g, 80, 16);
  ellipse(g, 0, 2, 58, 12, '#16261a'); ellipse(g, 0, 1, 52, 9, '#2c4a36'); g.rect(-30, -2, 22, 1, '#6a9a7a');   // pozza scura
  /* tronco nodoso con radici */
  for (let k = 0; k < 74; k++) {
    const w = k < 10 ? 26 - k : k > 60 ? 14 + (k - 60) : 16, wob = Math.round(Math.sin(k / 9) * 3);
    g.rect(-(w >> 1) + wob - 1, -k, w + 2, 1, '#241a10');
    g.rect(-(w >> 1) + wob, -k, w, 1, '#5c4630');
    g.rect(-(w >> 1) + wob, -k, 4, 1, '#7a5c3e'); g.rect((w >> 1) + wob - 4, -k, 4, 1, '#3d2c1c');
    if (k % 7 === 3) g.rect(-3 + wob, -k, 6, 1, '#3d2c1c');
  }
  disc(g, 3, -40, 4, '#241a10'); disc(g, 3, -40, 3, '#1a120a');                                            // nodo cavo
  for (const [x, dx] of [[-12, -18], [10, 20], [-4, -10]]) for (let k = 0; k < 8; k++) g.rect(x + Math.round(dx * k / 8), -8 + k, 5, 2, k % 2 ? '#3d2c1c' : '#5c4630');
  /* chioma a cupola, a ciuffi */
  const clumps = [[-54, -86, 22], [-30, -104, 26], [0, -112, 28], [30, -104, 26], [54, -86, 22], [-40, -80, 20], [40, -80, 20], [0, -90, 26]];
  for (const [x, y, r] of clumps) ellipse(g, x, y + 3, r + 6, Math.round(r * 0.62) + 2, '#1f3318');
  for (const [x, y, r] of clumps) { ellipse(g, x, y, r + 4, Math.round(r * 0.62), '#3d6128'); ellipse(g, x - 4, y - 4, Math.round(r * 0.8), Math.round(r * 0.4), '#4e7a34'); ellipse(g, x - 8, y - 7, Math.round(r * 0.45), Math.round(r * 0.2), '#6b9a42'); }
  for (let i = 0; i < 14; i++) g.rect(-54 + i * 8, -120 + ((i * 7) % 18), 3, 2, '#a8cf6a');
  /* ciocche che pendono fino all'acqua e ondeggiano col vento */
  for (let i = 0; i < 26; i++) {
    const x0 = -70 + i * 5.6, len = 40 + ((i * 11) % 34), ph = Math.sin(t / 1300 + i * 0.5) * 4;
    const y0 = -86 + Math.round(Math.abs(x0) * 0.25);
    for (let k = 0; k < len; k += 2) {
      const x = Math.round(x0 + ph * (k / len));
      g.rect(x, y0 + k, 3, 2, '#1f3318');
      g.rect(x, y0 + k, 2, 2, k > len - 8 ? '#86b552' : (k + i) % 6 < 3 ? '#4e7a34' : '#5f8a3c');
    }
  }
  /* lucciole */
  for (let i = 0; i < 5; i++) { const k = (t / 2000 + i / 5) % 1, x = Math.round(-40 + i * 20 + Math.sin(k * 6.28) * 8), y = -30 - Math.round(Math.cos(k * 6.28 + i) * 10) - i * 6; if (Math.floor(t / 300 + i) % 3) { g.rect(x - 1, y - 1, 4, 4, 'rgba(240,230,120,.3)'); g.rect(x, y, 2, 2, '#f2e07a'); } }
}

function disegna_lilypad(g, t) {
  groundShadow(g, 70, 16);
  ellipse(g, 0, 0, 64, 24, '#3a4a2a'); ellipse(g, 0, 0, 60, 21, '#16220f'); ellipse(g, 0, -2, 50, 16, '#1e2e1a'); ellipse(g, -14, -6, 24, 6, '#2a3e26');
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; g.rect(Math.round(Math.cos(a) * 60), Math.round(Math.sin(a) * 21), 3, 2, i % 3 ? '#4e6a3f' : '#6f8f5a'); }
  /* increspature */
  const r = (t / 2000) % 1;
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, rx = 6 + r * 20, ry = 2 + r * 6; g.rect(22 + Math.round(Math.cos(a) * rx), 8 + Math.round(Math.sin(a) * ry), 2, 1, 'rgba(200,230,200,' + (0.5 * (1 - r)).toFixed(2) + ')'); }
  /* foglie con lo spacco e le venature, che galleggiano */
  const pads = [[-34, -4, 17], [-4, -10, 20], [28, -2, 15], [-18, 10, 14], [14, 12, 13]];
  pads.forEach(([ox, oy, rr], i) => {
    const bob = Math.round(Math.sin(t / 900 + i * 1.7));
    const cy = oy + bob;
    ellipse(g, ox + 1, cy + 2, rr, Math.round(rr * 0.42), 'rgba(0,0,0,.35)');
    ellipse(g, ox, cy, rr + 1, Math.round(rr * 0.42) + 1, '#1f3d22');
    ellipse(g, ox, cy, rr, Math.round(rr * 0.42), '#4e8d5a');
    ellipse(g, ox - 2, cy - 1, Math.round(rr * 0.7), Math.round(rr * 0.25), '#63a86c');
    for (let v = 0; v < 5; v++) { const a = -0.3 + v * 0.7; for (let k = 2; k < rr - 2; k += 2) g.px(ox + Math.round(Math.cos(a) * k), cy + Math.round(Math.sin(a) * k * 0.42), '#3a6a44'); }
    for (let k = 0; k < rr; k++) g.rect(ox + k, cy - Math.round(k * 0.12), 1, 2, '#16220f');       // spacco
  });
  /* fiori di loto */
  const lotus = (x, y, s) => {
    for (const [dx, dy, w, h, c] of [[-10, 0, 8, 6, '#a85a80'], [3, 0, 8, 6, '#a85a80'], [-7, -5, 6, 8, '#e08ab0'], [2, -5, 6, 8, '#e08ab0'], [-3, -9, 7, 10, '#f6d0e0']]) {
      g.rect(x + Math.round(dx * s) - 1, y + Math.round(dy * s) - 1, Math.round(w * s) + 2, Math.round(h * s) + 2, '#6a2a48');
      g.rect(x + Math.round(dx * s), y + Math.round(dy * s), Math.round(w * s), Math.round(h * s), c);
    }
    g.rect(x - 1, y - 2, 3, 3, '#f2d24a');
  };
  lotus(-4, -14, 1); lotus(28, -8, 0.7);
  /* rana su una foglia: gonfia la gola e sbatte le palpebre */
  const fx = -34, fy = -12, gola = Math.floor(t / 600) % 3 === 0;
  ellipse(g, fx, fy, 9, 6, '#1f3d22'); ellipse(g, fx, fy, 8, 5, '#6ab04c'); ellipse(g, fx - 2, fy - 2, 4, 2, '#8fd06a');
  disc(g, fx - 5, fy - 6, 3, '#1f3d22'); disc(g, fx + 5, fy - 6, 3, '#1f3d22'); disc(g, fx - 5, fy - 6, 2, '#e8e070'); disc(g, fx + 5, fy - 6, 2, '#e8e070');
  if (Math.floor(t / 2400) % 5 !== 0) { g.rect(fx - 5, fy - 6, 1, 2, '#201a14'); g.rect(fx + 5, fy - 6, 1, 2, '#201a14'); }
  if (gola) ellipse(g, fx, fy + 3, 4, 2, '#e8e0a0');
  /* libellula che si ferma e riparte */
  const k = (t / 3000) % 1, dx = Math.round(Math.sin(k * 6.28) * 30), dy = -34 - Math.round(Math.cos(k * 12.56) * 6);
  g.rect(dx - 5, dy, 11, 2, '#2a6a8a'); g.rect(dx + 5, dy, 2, 2, '#4ab0d0');
  const ali = Math.floor(t / 60) % 2 ? '#dff3fa' : 'rgba(223,243,250,.5)';
  g.rect(dx - 3, dy - 4, 3, 4, ali); g.rect(dx + 1, dy - 4, 3, 4, ali); g.rect(dx - 3, dy + 2, 3, 3, ali); g.rect(dx + 1, dy + 2, 3, 3, ali);
  for (const [x, h] of [[-58, 26], [-54, 34], [52, 22], [56, 30]]) for (let q = 0; q < h; q++) g.rect(x + Math.round(Math.sin(q / h * 1.3 + t / 1500) * 2), -q, 2, 1, q > h - 8 ? '#7a5a2a' : '#5f7a3a');
}

function disegna_bubblepool(g, t) {
  groundShadow(g, 64, 16);
  /* argine di fango crepato */
  ellipse(g, 0, 0, 58, 22, '#4a3a22'); ellipse(g, 0, -1, 55, 20, '#8a7440'); ellipse(g, 0, -1, 50, 17, '#6b5a34');
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; g.rect(Math.round(Math.cos(a) * 52), Math.round(Math.sin(a) * 18) - 1, 4, 1, '#4a3a22'); }
  /* pece verde scura con un vortice lento */
  ellipse(g, 0, -1, 44, 14, '#1a2412'); ellipse(g, 0, -2, 38, 11, '#25341a'); ellipse(g, -6, -3, 22, 6, '#33481f');
  const sw = t / 3000;
  for (let i = 0; i < 16; i++) { const a = sw + i * 0.6, rr = 6 + i * 2; g.rect(Math.round(Math.cos(a) * rr), -2 + Math.round(Math.sin(a) * rr * 0.32), 3, 1, 'rgba(110,150,60,.45)'); }
  /* ossa che affiorano: una costola e un femore */
  for (let k = 0; k < 14; k++) { const x = -26 + k, y = -4 - Math.round(Math.sin(k / 13 * 3.1) * 12); g.rect(x - 1, y - 1, 4, 4, '#3a3226'); g.rect(x, y, 2, 2, '#e3d9c1'); }
  g.rect(14, -8, 22, 6, '#3a3226'); g.rect(15, -7, 20, 4, '#e3d9c1'); disc(g, 14, -5, 4, '#3a3226'); disc(g, 14, -5, 3, '#efe7d4'); disc(g, 36, -5, 4, '#3a3226'); disc(g, 36, -5, 3, '#efe7d4');
  /* bolle: salgono, si gonfiano e scoppiano */
  const bs = [[-16, 1300, 6], [-2, 1700, 8], [10, 1500, 5], [22, 2100, 4], [-30, 1900, 5]];
  for (const [ox, per, rr] of bs) {
    const u = (t % per) / per, y = -2 - Math.round(u * 4), r2 = Math.round(rr * Math.min(1, u * 1.6));
    if (u < 0.8) {
      if (r2 < 1) continue;
      disc(g, ox, y - r2, r2 + 1, '#2a3a18'); disc(g, ox, y - r2, r2, '#6e8a3a'); disc(g, ox - Math.round(r2 * 0.35), y - Math.round(r2 * 1.35), Math.max(1, r2 >> 2), '#d6e8a8');
    } else {
      const s = Math.round((u - 0.8) * 60);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.rect(ox + Math.round(Math.cos(a) * (rr + s)), y - rr - Math.round(Math.sin(a) * (rr + s) * 0.6), 2, 2, '#b8d080'); }
    }
  }
  /* vapore */
  for (let i = 0; i < 3; i++) { const k = ((t / 2600) + i / 3) % 1; disc(g, -12 + i * 14 + Math.round(Math.sin(k * 5) * 4), -10 - Math.round(k * 40), 4 + Math.round(k * 6), 'rgba(210,225,180,' + (0.35 * (1 - k)).toFixed(2) + ')'); }
  for (const [x, h] of [[-56, 24], [-50, 16], [50, 20], [54, 28]]) for (let q = 0; q < h; q++) g.rect(x, -q, 2, 1, q > h - 7 ? '#6a4a2a' : '#5c6a44');
}

/* ================= LANDE GELIDE ================= */
function disegna_icespire(g, t) {
  groundShadow(g, 56, 12);
  /* guglia di ghiaccio: faccia in luce, faccia in ombra, spigolo netto e riflessi interni */
  const spire = (x, w, h, lean) => {
    for (let k = 0; k < h; k++) {
      const u = k / h, ww = u > 0.78 ? Math.max(1, Math.round(w * (1 - u) / 0.22)) : w, xx = x + Math.round(lean * u * u * 10);
      const half = ww >> 1;
      g.rect(xx - half - 1, -k, ww + 2, 1, '#2f6a82');
      g.rect(xx - half, -k, half, 1, '#cdf2fa');
      g.rect(xx, -k, ww - half, 1, '#7ec0d8');
      g.rect(xx - half, -k, 1, 1, '#ffffff');
      g.rect(xx, -k, 1, 1, '#eafcff');
      if (k % 13 === 5) g.rect(xx - half + 2, -k, Math.max(1, ww - 4), 1, 'rgba(255,255,255,.55)');
    }
  };
  spire(-26, 16, 64, -1); spire(22, 16, 84, 1); spire(-2, 26, 148, 0); spire(-40, 10, 34, -1); spire(38, 10, 42, 1);
  /* schegge a terra */
  for (const [x, h] of [[-52, 12], [50, 14], [-14, 10], [12, 8]]) spire(x, 6, h, 0);
  /* cumulo di neve con brina */
  ellipse(g, 0, -2, 58, 10, '#9cc8d8'); ellipse(g, 0, -4, 56, 8, '#dff3fa'); ellipse(g, -10, -6, 34, 4, '#ffffff');
  for (let i = 0; i < 12; i++) g.px(-50 + i * 9, -8 + (i % 3), '#b8e0ee');
  /* scintillii che corrono lungo la guglia */
  for (let i = 0; i < 4; i++) {
    const k = ((t / 1600) + i / 4) % 1, y = -20 - Math.round(k * 120), x = Math.round(Math.sin(i * 1.9) * 6);
    if (Math.floor(t / 150 + i) % 3) { g.rect(x - 3, y, 7, 1, '#ffffff'); g.rect(x, y - 3, 1, 7, '#ffffff'); }
  }
}

function disegna_frozenbeast(g, t) {
  /* FOSSILE NEL GHIACCIO: lo scheletro intero di una bestia dai denti a sciabola, rannicchiato
     dentro un blocco di ghiaccio, con un'ammonite incastrata accanto. Prima c'era un mammut col
     pelo ("non mi piace, metterei un fossile"): le ossa dicono subito che cosa si libera qui,
     un pezzo per volta. Il blocco resta quello solido (5×3 caselle). */
  groundShadow(g, 96, 16);
  const X0 = -78, Y0 = -100, W = 156, H = 96;
  /* fondo del ghiaccio: più scuro dentro, così le ossa chiare staccano */
  /* il blocco ha gli spigoli smussati, come tutto il resto: un rettangolo netto in mezzo al
     prato sembrava un acquario appoggiato lì */
  const dentroIce = tondo(g, X0, Y0, W, H, 12, '#4f90ac', '#6aa8c0', '#3f7c9a', '#24506a');
  for (let y = Y0 + 20; y < Y0 + H - 12; y++) for (let x = X0 + 8; x < X0 + W - 8; x++) if (dentroIce(x, y)) g.rect(x, y, 1, 1, '#5a9cb6');
  for (let i = 0; i < 9; i++) g.rect(X0 + 8 + i * 17, Y0 + 20 + ((i * 23) % 50), 10, 2, 'rgba(160,215,235,.35)');   // venature interne
  /* SCHELETRO: stesso stile delle ossa del Drago (contorno scuro, corpo chiaro, filo di luce) */
  const LN = '#2a3440', LT = '#eee6d2', HI = '#fffaf0', SH = '#b9ad91';
  const bone = (ax, ay, bx, by, r) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 2));
    for (const pass of [0, 1, 2]) for (let i = 0; i <= n; i++) {
      const x = Math.round(ax + (bx - ax) * i / n), y = Math.round(ay + (by - ay) * i / n);
      if (pass === 0) disc(g, x, y, r + 1, LN); else if (pass === 1) disc(g, x, y, r, LT); else if (r >= 2) g.rect(x - r + 1, y - r + 1, r, 1, HI);
    }
  };
  const knuckle = (x, y, r) => { disc(g, x, y, r + 1, LN); disc(g, x, y, r, LT); g.px(x - 1, y - 1, HI); };
  /* spina rannicchiata ad arco, dalla testa (destra) alla coda (sinistra) */
  const sp = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (0.08 + i * 0.052); sp.push([Math.round(-6 + Math.cos(a) * 44), Math.round(-50 - Math.sin(a) * 26)]); }
  for (let i = 0; i < sp.length - 1; i++) bone(sp[i][0], sp[i][1], sp[i + 1][0], sp[i + 1][1], 3);
  for (let i = 1; i < sp.length; i += 2) { const [x, y] = sp[i]; g.rect(x - 1, y - 8, 3, 6, LN); g.rect(x, y - 7, 1, 5, HI); }
  /* costole che scendono dalla spina */
  for (let i = 3; i < 12; i++) {
    const [x, y] = sp[i], len = 22 - Math.abs(i - 7) * 2;
    let px0 = x, py0 = y;
    for (let k = 3; k <= len; k += 3) { const u = k / len, nx = x + Math.round(Math.sin(u * 2.4) * 7) + 2, ny = y + k; bone(px0, py0, nx, ny, u > 0.8 ? 1 : 2); px0 = nx; py0 = ny; }
  }
  /* bacino e zampe ripiegate */
  const [hx, hy] = sp[13];
  ellipse(g, hx, hy + 4, 9, 6, LN); ellipse(g, hx, hy + 4, 7, 4, LT);
  bone(hx, hy + 6, hx + 12, hy + 22, 2); knuckle(hx + 12, hy + 22, 3); bone(hx + 12, hy + 22, hx - 2, hy + 32, 2); bone(hx - 2, hy + 32, hx + 8, hy + 36, 1);
  const [sx, sy] = sp[3];
  bone(sx, sy + 4, sx - 6, sy + 24, 2); knuckle(sx - 6, sy + 24, 3); bone(sx - 6, sy + 24, sx + 8, sy + 36, 2); bone(sx + 8, sy + 36, sx + 16, sy + 38, 1);
  /* coda che si arriccia */
  let tx = sp[16][0], ty = sp[16][1];
  for (let i = 0; i < 10; i++) { const a = i * 0.34, nx = tx - 4 + Math.round(Math.sin(a) * 2), ny = ty + 3 + Math.round(Math.cos(a) * 1); bone(tx, ty, nx, ny, i < 4 ? 2 : 1); tx = nx; ty = ny; }
  /* CRANIO coi denti a sciabola, a destra: calotta tonda, orbita grande, zigomo, e le due
     sciabole lunghe che scendono oltre la mandibola */
  const cx = 42, cy = -60;
  ellipse(g, cx, cy, 15, 11, LN); ellipse(g, cx, cy, 14, 10, LT); ellipse(g, cx - 3, cy - 5, 8, 3, HI);
  g.rect(cx + 8, cy - 4, 18, 11, LN); g.rect(cx + 9, cy - 3, 16, 9, LT); g.rect(cx + 9, cy - 3, 16, 2, HI);   // muso
  ellipse(g, cx + 3, cy - 1, 5, 5, '#1a222c'); g.px(cx + 1, cy - 3, '#4a5a6a');                             // orbita
  g.rect(cx - 6, cy + 4, 12, 2, SH); g.rect(cx + 22, cy - 1, 2, 2, '#1a222c');                               // zigomo e narice
  for (let d = 0; d < 3; d++) g.rect(cx + 11 + d * 4, cy + 5, 2, 3, '#fffaf0');                               // dentini
  for (const [zx, len] of [[cx + 12, 22], [cx + 19, 18]]) {                                                  // SCIABOLE
    for (let k = 0; k < len; k++) { const w = k > len - 5 ? 1 : 2, xx = zx - Math.round((k / len) * (k / len) * 3); g.rect(xx - 1, cy + 6 + k, w + 2, 1, LN); g.rect(xx, cy + 6 + k, w, 1, k < 3 ? SH : '#fffaf0'); }
  }
  bone(cx - 8, cy + 10, cx + 10, cy + 16, 2);                                                                // mandibola aperta
  /* AMMONITE incastrata nell'angolo in basso: spirale netta con le costole a raggiera */
  const ax = -52, ay = -24;
  disc(g, ax, ay, 14, '#4a3418'); disc(g, ax, ay, 13, '#d8b27a');
  let prev = null;
  for (let q = 0; q <= 120; q++) {
    const a2 = q * 0.105, r = 13 * Math.exp(-a2 / 7.5);
    const x = ax + Math.round(Math.cos(a2) * r), y = ay + Math.round(Math.sin(a2) * r);
    g.rect(x, y, 2, 2, '#6a4a22');
    if (q % 8 === 0 && r > 3) { const r2 = r * 0.72; g.rect(ax + Math.round(Math.cos(a2) * r2), ay + Math.round(Math.sin(a2) * r2), 1, 1, '#8a6a3a'); }
    prev = [x, y];
  }
  disc(g, ax - 5, ay - 6, 2, '#f4e0b8'); g.rect(ax + 4, ay + 8, 4, 1, '#a88450');
  /* bollicine d'aria intrappolate */
  for (const [x, y, r] of [[-20, -84, 2], [-10, -78, 1], [60, -30, 2], [66, -40, 1], [-66, -60, 1], [14, -18, 2]]) { disc(g, x, y, r, 'rgba(230,248,255,.7)'); g.px(x - r + 1, y - r + 1, '#ffffff'); }
  /* il GHIACCIO sopra: velo chiaro, faccia superiore, lato in ombra, spigoli e crepe */
  g.rect(X0, Y0, W, H, 'rgba(190,235,250,.22)');
  g.rect(X0, Y0, W, 14, 'rgba(225,248,255,.78)');
  g.rect(X0 + W - 22, Y0 + 14, 22, H - 14, 'rgba(40,90,120,.30)');
  g.rect(X0 + 4, Y0 + 18, 12, H - 26, 'rgba(255,255,255,.18)'); g.rect(X0 + 22, Y0 + 20, 5, H - 34, 'rgba(255,255,255,.12)');
  g.rect(X0 - 2, Y0 - 1, W + 4, 1, '#2f6a82'); g.rect(X0 - 2, Y0 + H, W + 4, 2, '#2f6a82'); g.rect(X0 - 2, Y0, 2, H, '#2f6a82'); g.rect(X0 + W, Y0, 2, H, '#2f6a82');
  g.rect(X0, Y0, W, 1, '#ffffff'); g.rect(X0, Y0 + 14, W - 22, 1, 'rgba(255,255,255,.85)'); g.rect(X0 + W - 22, Y0 + 1, 1, H - 1, 'rgba(255,255,255,.55)');
  for (const [x, y, dx, dy, n] of [[26, 22, 3, 2, 12], [118, 40, -2, 3, 11], [70, 74, 3, -1, 10]]) for (let k = 0; k < n; k++) g.px(X0 + x + dx * k + (k % 2), Y0 + y + dy * k, 'rgba(255,255,255,.9)');
  /* neve sopra e alla base, ghiaccioli */
  ellipse(g, 0, Y0 - 2, 82, 8, '#b9d9e6'); ellipse(g, -6, Y0 - 4, 76, 6, '#eafcff');
  for (let x = X0 + 8; x < X0 + W - 8; x += 14) { const h = 6 + ((x * 3 + 200) % 9); for (let k = 0; k < h; k++) g.rect(x + (k >> 3), Y0 + 15 + k, Math.max(1, 3 - (k >> 2)), 1, k < 2 ? '#ffffff' : '#b6e6f4'); }
  ellipse(g, 0, -2, 96, 10, '#9cc8d8'); ellipse(g, 0, -4, 92, 8, '#dff3fa'); ellipse(g, -20, -6, 50, 4, '#ffffff');
  /* un luccichio che corre sul ghiaccio */
  const k = (t / 2600) % 1, lx = X0 + Math.round(k * W);
  for (let i = 0; i < 6; i++) g.rect(lx + i, Y0 + 16 + i * 2, 2, 2, 'rgba(255,255,255,' + (0.5 * (1 - i / 6)).toFixed(2) + ')');
}

function disegna_aurora(g, t) {
  /* cumulo di neve e un ometto di pietre con la lanterna: la meraviglia ha un posto a terra */
  groundShadow(g, 50, 10);
  ellipse(g, 0, -2, 54, 10, '#9cc8d8'); ellipse(g, 0, -4, 50, 8, '#dff3fa'); ellipse(g, -10, -6, 28, 4, '#ffffff');
  /* OMETTO DI PIETRE: sassi tondi impilati, ognuno col suo contorno e la luce da sinistra */
  for (const [y, w, c] of [[-10, 18, '#6e7680'], [-20, 14, '#8a929a'], [-28, 10, '#7a828a'], [-35, 7, '#9aa2aa']])
    forma(g, [E(0, y + 3, w / 2, 5)], c, shade(c, 1.3), shade(c, 0.7), '#2a3038');
  g.rect(-4, -48, 9, 11, g.shade8('#f2c53d', 0.34)); const lf = Math.floor(t / 250) % 2; g.rect(-3, -46, 7, 8, lf ? '#f2c53d' : '#e8862e'); g.rect(-2, -45, 2, 6, '#fff3c8');
  disc(g, 0, -42, 14, 'rgba(255,220,140,.12)');
  /* CORTINE di luce: bande verticali che ondeggiano, raggi più chiari in alto */
  const cols = [[90, 235, 170], [130, 250, 200], [120, 180, 250], [205, 130, 240]];
  for (let b = 0; b < 4; b++) {
    const [r, gg, bb] = cols[b];
    for (let x = -64; x <= 64; x += 2) {
      const wave = Math.sin(t / 1400 + b * 1.1 + x / 22) * 16 + Math.sin(t / 900 + x / 9) * 4;
      const topY = -210 + b * 18 + Math.round(wave), len = 70 + Math.round(Math.sin(x / 13 + b) * 18);
      const a0 = 0.5 - b * 0.08;
      for (let k = 0; k < len; k += 3) {
        const a = a0 * (1 - k / len) * (0.6 + 0.4 * Math.sin(x / 5 + t / 600 + b));
        if (a <= 0.03) continue;
        g.rect(x, topY + k, 2, 3, 'rgba(' + r + ',' + gg + ',' + bb + ',' + a.toFixed(2) + ')');
      }
    }
  }
  /* stelle */
  for (let i = 0; i < 12; i++) { const x = -60 + ((i * 37) % 120), y = -230 + ((i * 53) % 90); if ((Math.floor(t / 500) + i) % 4) g.rect(x, y, i % 3 ? 1 : 2, i % 3 ? 1 : 2, '#ffffff'); }
  /* riflesso verde sulla neve */
  ellipse(g, 0, -4, 46, 6, 'rgba(120,222,180,.18)');
}

/* ================= PRATI DORATI ================= */
function disegna_gianttree(g, t) {
  /* YGGDRASIL: l'albero più alto del mondo. Tronco dove si urta (caselle -1..0 della riga
     sopra l'ancora), radici larghe, chioma a piani sovrapposti come nel disegno dello Studio. */
  groundShadow(g, 110, 20);
  const TX = -16;
  /* RADICI E TRONCO in un volume solo: capsule che si inseguono dalla base alla cima, con la
     base allargata. Prima il tronco era una pila di righe da un pixel: bordi seghettati e
     nessuna forma, e le radici erano trattini staccati. */
  const nodi = [[TX, 6], [TX, -30], [TX + 2, -70], [TX - 2, -110], [TX + 1, -150], [TX, -176]];
  const pezzi = [];
  for (let i = 0; i < nodi.length - 1; i++) pezzi.push(C(nodi[i][0], nodi[i][1], nodi[i + 1][0], nodi[i + 1][1], Math.round(24 - i * 3)));
  for (const [dx, len, dir] of [[-20, 46, -1], [-8, 30, -1], [10, 40, 1], [22, 56, 1], [0, 24, 1]]) {
    /* ogni radice si assottiglia: tre capsule sempre più magre, non un tubo dritto */
    for (let k = 0; k < 3; k++) {
      const a = k / 3, b = (k + 1) / 3;
      pezzi.push(C(TX + dx + dir * len * a, -14 + Math.round(len * 0.42 * a),
        TX + dx + dir * len * b, -14 + Math.round(len * 0.42 * b), Math.round(7 - k * 2)));
    }
  }
  pezzi.push(E(TX, -8, 34, 11));
  const dentroT = forma(g, pezzi, '#6e4a2a', '#9a7048', '#563820');   // contorno: la corteccia scurita, non il nero
  for (let y = -170; y < 6; y += 9) for (let x = TX - 44; x <= TX + 44; x++)        // placche di corteccia
    if (dentroT(x, y) && dentroT(x - 1, y) && dentroT(x + 1, y) && ((x + y) % 23) < 12) g.rect(x, y, 1, 2, '#5c3d22');
  /* cavità con una lucina dentro */
  ellipse(g, TX + 4, -92, 9, 13, '#1d150e'); ellipse(g, TX + 4, -91, 7, 11, '#0e0a06');
  if (Math.floor(t / 900) % 3) { g.rect(TX + 3, -94, 3, 3, '#f2e07a'); g.rect(TX + 1, -96, 7, 7, 'rgba(242,224,122,.25)'); }
  /* rami che escono dalla chioma */
  for (const [x, y, len, dir] of [[TX - 18, -150, 34, -1], [TX + 16, -140, 30, 1], [TX - 14, -120, 22, -1], [TX + 14, -112, 20, 1]]) {
    for (let k = 0; k < len; k++) { const xx = x + dir * k, yy = y - Math.round(k * 0.5); g.rect(xx, yy - 3, 2, 7, g.shade8('#6e4a2a', 0.42)); g.rect(xx, yy - 2, 2, 5, '#6e4a2a'); g.rect(xx, yy - 2, 2, 1, '#8a6440'); }
  }
  /* CHIOMA a piani, fatta di CIUFFI: ogni piano è una fila di masse tonde di misure diverse,
     con l'ombra sotto e la luce in alto a sinistra — non una fascia liscia, che sembrava una
     pila di frittelle */
  const tiers = [[92, -170, '#2f5e26'], [84, -198, '#3f7d33'], [74, -224, '#4e8d3f'], [62, -248, '#5fa04e'], [48, -270, '#6cb35a'], [32, -290, '#7ec069'], [16, -306, '#94e27b']];
  tiers.forEach(([w, y, c], ti) => {
    const n = Math.max(2, Math.round(w / 16));
    const blobs = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = TX - w + Math.round(u * w * 2), r = Math.round(14 + ((i * 7 + ti * 3) % 5) * 2 + (1 - Math.abs(u - 0.5) * 2) * 6);
      blobs.push([x, y + Math.round(Math.abs(u - 0.5) * 10) + ((i + ti) % 2) * 3, r]);
    }
    for (const [x, yy, r] of blobs) disc(g, x, yy + 5, r + 2, '#1f3d1a');
    for (const [x, yy, r] of blobs) { disc(g, x, yy + 3, r, shade(c, 0.74)); disc(g, x - 2, yy, r - 2, c); disc(g, x - Math.round(r * 0.35), yy - Math.round(r * 0.4), Math.round(r * 0.42), shade(c, 1.22)); }
    for (const [x, yy, r] of blobs) { g.rect(x - 3, yy - r + 3, 3, 2, shade(c, 1.4)); g.rect(x + Math.round(r * 0.4), yy + Math.round(r * 0.5), 3, 2, shade(c, 0.6)); }
  });
  /* lucciole dorate che girano fra i rami */
  for (let i = 0; i < 12; i++) {
    const k = (t / 4000 + i / 12) % 1, ang = k * Math.PI * 2 + i;
    const x = TX + Math.round(Math.cos(ang) * (40 + (i % 3) * 22)), y = -200 - i * 8 + Math.round(Math.sin(ang * 2) * 10);
    if ((Math.floor(t / 250) + i) % 4) { g.rect(x - 1, y - 1, 4, 4, 'rgba(216,245,160,.25)'); g.rect(x, y, 2, 2, i % 2 ? '#d8f5a0' : '#fff3a0'); }
  }
  tufts(g, TX - 70, TX + 80, '#4e8d3f', '#5fa04e', 7);
}

/* il PROFILO di un menhir: una lastra spaccata, non una capsula. I lati sono spezzate quasi
   verticali con qualche scheggia, la cima è uno spigolo inclinato. Con le capsule ogni pietra
   veniva un ovale ("sembrano dei savoiardi"): la pietra alzata dall'uomo è tagliata, non
   levigata dal mare. */
function lastra(bx, by, h, w, lean, seed) {
  const j = k => (((seed * 37 + k * 101) % 5) + 5) % 5 - 2;     // scheggia -2..2, deterministica
  const base = Math.round(w * 0.58), cima = Math.round(w * 0.38), N = 3;
  const sx = [], dx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, y = Math.round(by - u * h);
    const hw = Math.round(base + (cima - base) * u), cx = bx + Math.round(lean * 4 * u);
    /* la base NON si sfrangia: una pietra piantata a terra ha il piede largo e fermo, e con
       lo spigolo scheggiato anche lì sembrava appoggiata sulla punta. */
    const s2 = i === 0 ? 0 : j(i), d2 = i === 0 ? 0 : j(i + 5);
    sx.push([cx - hw + s2, y]); dx.push([cx + hw + d2, y]);
  }
  /* CIMA: un taglio inclinato fra i due lati, mai più largo della pietra (sporgendo diventava
     un uncino). Il verso della pendenza cambia da pietra a pietra. */
  const tx = bx + Math.round(lean * 4), verso = seed % 2 ? 1 : -1;
  sx[N] = [tx - cima, by - h + (verso > 0 ? 5 : 0)];
  dx[N] = [tx + cima, by - h + (verso > 0 ? 0 : 5)];
  return [...sx, ...dx.reverse()];
}

function disegna_menhir(g, t) {
  /* CERCHIO DI PIETRE: sette menhir, ognuno una lastra spaccata con la cima inclinata e una
     faccia in ombra. Prima erano capsule: tonde, tutte uguali, senza spigoli. */
  ellipse(g, 0, -28, 100, 34, 'rgba(20,16,10,.14)'); ellipse(g, 0, -28, 75, 24, 'rgba(20,16,10,.10)');
  ellipse(g, 0, -28, 88, 36, 'rgba(60,90,40,.25)'); ellipse(g, 0, -28, 60, 22, 'rgba(210,200,140,.18)');
  const stones = [[-1, -2, 70, 26, 1], [1, -2, 64, 24, -1], [-2, -1, 58, 24, -1], [2, -1, 62, 25, 1], [-1, 0, 52, 22, 1], [0, 0, 80, 30, 0], [2, 0, 48, 22, -1]];
  stones.sort((a, b) => a[1] - b[1]);
  stones.forEach(([dx, dy, h, w, lean], i) => {
    const bx = dx * 32, by = dy * 32 - 6;
    ellipse(g, bx + 4, by + 2, w - 2, 6, 'rgba(20,20,10,.28)');
    /* la LASTRA: profilo spezzato più lo zoccolo di terra smossa alla base */
    const pol = lastra(bx, by, h, w, lean, i + 1);
    const dentro = forma(g, [
      P(pol),
      R(bx - Math.round(w * 0.55), by - 8, Math.round(w * 1.1), 8, 3),
    ], '#8b8a86', '#b6b2a2', '#5f6376', '#3a3c48');
    /* SPIGOLO: la lastra ha due facce. La riga scura corre dalla cima al piede e a destra la
       pietra è tutta in ombra: senza, una sagoma piatta resta una sagoma piatta. */
    for (let k = 2; k < h; k++) {
      const u = Math.min(1, k / h), sp = bx + Math.round(lean * 4 * u) + Math.round(w * (0.18 - u * 0.06));
      const y2 = by - k;
      if (dentro(sp, y2)) g.rect(sp, y2, 1, 1, '#6a6d7a');
      for (let x = sp + 1; x <= bx + w; x++) if (dentro(x, y2) && dentro(x + 1, y2)) g.rect(x, y2, 1, 1, '#767880');
    }
    /* CREPE: tratti corti e sghembi, non righe da un bordo all'altro. Le righe piene a passo
       fisso facevano sembrare la pietra una scala a pioli. */
    for (let k = 6; k < h - 6; k += 7) {
      const q = (i * 31 + k * 17) % 13, x0 = bx - Math.round(w * 0.4) + q, lw = 4 + (q % 5), dyy = q % 3 ? 0 : 1;
      for (let x = 0; x < lw; x++) { const px2 = x0 + x, py2 = by - k - (x > lw / 2 ? dyy : 0);
        if (dentro(px2, py2) && dentro(px2, py2 - 2)) g.rect(px2, py2, 1, 1, '#71737a'); }
    }
    for (const [lx, lq, lw] of [[-6, 0.3, 7], [4, 0.6, 5], [-2, 0.12, 9]]) {
      for (let x = 0; x < lw; x++) for (let y = 0; y < 3; y++) { const px2 = bx + lx + x, py2 = by - Math.round(h * lq) + y; if (dentro(px2, py2)) g.rect(px2, py2, 1, 1, y ? '#6f8a52' : '#7d9a5c'); }
    }
    if (dx === 0 && dy === 0) {                      // la spirale incisa, che si accende piano
      const glow = Math.floor(t / 600) % 4 === 0 ? '#f2e3a8' : '#5e606c';
      for (let a = 0; a < 26; a++) { const ang = a * 0.5, r = 1 + a * 0.36, px2 = bx + Math.round(Math.cos(ang) * r), py2 = by - 44 + Math.round(Math.sin(ang) * r); if (dentro(px2, py2)) g.px(px2, py2, glow); }
    }
  });
  for (const [dx, dy] of stones.map(s2 => [s2[0], s2[1]])) tufts(g, dx * 32 - 18, dx * 32 + 18, '#5fa04e', '#4e8d3f', dx * 5 + dy);
  for (const [x, y, c] of [[-60, -8, '#f2e3a8'], [44, -40, '#e8a0b8'], [-30, -70, '#f2e3a8'], [70, -16, '#ffffff']]) { g.rect(x, y, 3, 3, c); g.px(x + 1, y + 3, '#4e8d3f'); }
}

function disegna_haygiant(g, t) {
  /* GIGANTE DI FIENO, rifatto per intero coi volumi: le balle sono capsule tonde legate dalle
     corde, le braccia sono bracci veri (spalla, avambraccio, mano di paglia), la testa è una
     balla con le mele al posto degli occhi. Prima era una pila di rettangoli col cappello
     disegnato sopra. */
  groundShadow(g, 70, 14);
  const PAGLIA = ['#dcbe4c', '#f0d070', '#b8922a', '#6b4f14'];
  /* una BALLA: capsula tonda, steli verticali e due corde che la stringono */
  const balla = (cx, cy, w, h) => {
    const r = Math.round(Math.min(w, h) / 2);
    const dentro = forma(g, [C(cx, cy - h / 2 + r, cx, cy + h / 2 - r, r), E(cx, cy, w / 2, h / 2)], ...PAGLIA);
    for (let x = cx - w / 2; x <= cx + w / 2; x += 3) for (let y = cy - h / 2; y <= cy + h / 2; y++)
      if (dentro(x, y) && dentro(x - 1, y) && dentro(x + 1, y)) g.rect(x, y, 1, 1, ((x | 0) % 2) ? '#c9a227' : '#e8c860');
    for (const q of [-0.22, 0.22]) { const yy = Math.round(cy + h * q);
      for (let x = cx - w; x <= cx + w; x++) if (dentro(x, yy)) { g.rect(x, yy, 1, 3, '#8a6a1a'); g.rect(x, yy, 1, 1, '#a78723'); } }
    for (let x = cx - w / 2 + 4; x < cx + w / 2 - 4; x += 7) g.px(x, cy - h / 2 - 1 - (x % 3), '#e8c860');   // paglia che spunta
    return dentro;
  };
  /* gambe, corpo, testa */
  balla(-21, -22, 26, 44); balla(21, -22, 26, 44);
  balla(0, -73, 88, 62);
  /* BRACCIA: spalla e avambraccio, con la mano di paglia in fondo */
  for (const side of [-1, 1]) {
    forma(g, [C(side * 40, -88, side * 66, -80, 7), C(side * 66, -80, side * 84, -96, 6)], '#a97a4c', '#c49a63', '#7a5230', '#3f2a17');
    forma(g, [E(side * 86, -100, 9, 8)], '#e8c860', '#f8e090', '#c9a227', '#6b4f14');
    for (let k = 0; k < 5; k++) g.rect(side * (84 + k * 2) - (side > 0 ? 0 : 5), -104 + k * 3, 5, 1, '#e8c860');   // fili di paglia nella mano
  }
  const dentroTesta = balla(0, -125, 52, 42);
  for (const ex of [-14, 12]) {                                   // mele al posto degli occhi
    forma(g, [E(ex, -128, 7, 7)], '#c94f4a', '#e8756a', '#8a1f18', '#4a1410');
    g.rect(ex, -136, 2, 4, '#5c3d22'); g.rect(ex + 2, -137, 4, 2, '#5fa04e');
  }
  for (let x = -12; x <= 12; x++) if (dentroTesta(x, -112)) g.rect(x, -112, 1, 2, '#6b4f14');                  // bocca cucita
  for (let i = -10; i < 12; i += 4) g.rect(i, -116, 1, 7, '#6b4f14');
  /* CAPPELLO di paglia: cupola tonda e tesa larga, con la fascia rossa */
  forma(g, [E(0, -148, 46, 9)], '#e8c860', '#f8e090', '#c9a227', '#6b4f14');
  const dentroCap = forma(g, [E(0, -158, 21, 17), R(-20, -170, 40, 24, 9)], '#dcbe4c', '#f0d070', '#b8922a', '#6b4f14');
  for (let y = -156; y < -150; y++) for (let x = -22; x <= 22; x++) if (dentroCap(x, y) && dentroCap(x - 1, y) && dentroCap(x + 1, y)) g.rect(x, y, 1, 1, y < -154 ? '#e2604f' : '#8a1f18');
  /* FORCONE: manico tondo e tre rebbi */
  forma(g, [C(80, -150, 80, 2, 3)], '#a97a4c', '#c49a63', '#7a5230', '#3f2a17');
  forma(g, [R(69, -166, 23, 5, 2)], '#8f9aa3', '#c9ced3', '#6b727a', '#3f2a17');
  for (const x of [71, 80, 89]) forma(g, [C(x, -184, x, -164, 2)], '#c9ced3', '#ffffff', '#8f9aa3', '#3f2a17');
  /* CORVO sulla spalla: saltella */
  const hop = Math.floor(t / 700) % 4 === 0 ? -3 : 0, cy = -106 + hop;
  forma(g, [E(-40, cy - 6, 10, 7), E(-48, cy - 12, 5, 5), C(-32, cy - 7, -24, cy - 5, 3)], '#2a2a3a', '#46465c', '#18180f', '#0f0f14');
  g.rect(-57, cy - 12, 6, 2, '#e8c34a'); g.px(-49, cy - 13, '#ffffff');
  for (let i = 0; i < 14; i++) g.rect(-60 + ((i * 37) % 120), 2 + (i % 4), 5, 1, i % 2 ? '#e8c860' : '#c9a227');   // paglia a terra
  tufts(g, -56, 60, '#5fa04e', '#4e8d3f', 2);
}

/* ================= DUNE OSSEE ================= */
function disegna_ribcage(g, t) {
  /* SCHELETRO DI DRAGO: un figlio di Neladan, sdraiato nella sabbia con le ali spiegate un'ultima volta */
  groundShadow(g, 120, 16);
  const LN = '#524a38', HI = '#f8f2e2', LT = '#e6ddc7', SH = '#b3a684';
  const bone = (ax, ay, bx, by, r) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 2));
    for (const pass of [0, 1, 2]) for (let i = 0; i <= n; i++) {
      const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
      if (pass === 0) disc(g, Math.round(x), Math.round(y), r + 1, LN);
      else if (pass === 1) disc(g, Math.round(x), Math.round(y), r, LT);
      else if (r >= 2) g.rect(Math.round(x) - r + 1, Math.round(y) - r + 1, r, 1, HI);
    }
  };
  /* ALI spiegate dietro: dita ossee con brandelli di membrana */
  for (const [ex, ey, fingers] of [[-6, -86, [[-70, -60], [-48, -40], [-24, -22]]], [18, -80, [[88, -58], [66, -34], [42, -18]]]]) {
    bone(ex > 0 ? 20 : -2, -30, ex, ey, 3);
    fingers.forEach(([fx, fy], i) => {
      bone(ex, ey, fx, fy, 2);
      if (i < 2) { const [nx, ny] = fingers[i + 1]; for (let k = 0; k < 10; k++) { const u = k / 10; g.rect(Math.round(fx + (nx - fx) * u), Math.round(fy + (ny - fy) * u) + 2 + (k % 3), 2, 4 + (k % 4), 'rgba(160,120,90,.35)'); } }
    });
  }
  /* SPINA dorsale e vertebre del collo */
  const spine = []; for (let i = 0; i <= 24; i++) { const x = -60 + i * 6; spine.push([x, -22 - Math.round(Math.sin((i / 24) * Math.PI) * 14)]); }
  for (let i = 0; i < spine.length - 1; i++) bone(spine[i][0], spine[i][1], spine[i + 1][0], spine[i + 1][1], 4);
  for (let i = 2; i < spine.length; i += 2) { const [x, y] = spine[i]; g.rect(x - 2, y - 10, 5, 8, LN); g.rect(x - 1, y - 9, 3, 6, HI); }
  /* COSTOLE che scendono ad arco nella sabbia */
  for (let i = 0; i < 9; i++) {
    const [sx, sy] = spine[5 + i * 1.5 | 0], len = 34 - Math.abs(i - 4) * 3;
    let px0 = sx, py0 = sy;
    for (let k = 1; k <= len; k += 3) { const u = k / len, nx = sx + Math.round(Math.sin(u * 2.2) * 12) - 4, ny = sy + k; bone(px0, py0, nx, ny, u > 0.8 ? 1 : 2); px0 = nx; py0 = ny; }
  }
  /* COLLO che si alza verso il cranio, a sinistra */
  const neck = [[-60, -22], [-74, -32], [-86, -46], [-94, -60]];
  for (let i = 0; i < neck.length - 1; i++) bone(neck[i][0], neck[i][1], neck[i + 1][0], neck[i + 1][1], 4);
  /* CRANIO: muso lungo, orbita, denti, corna all'indietro */
  const hx = -112, hy = -68;
  g.rect(hx - 1, hy - 1, 30, 18, LN); g.rect(hx, hy, 28, 16, LT); g.rect(hx, hy, 28, 3, HI); g.rect(hx, hy + 12, 28, 4, SH);
  g.rect(hx - 21, hy + 5, 22, 10, LN); g.rect(hx - 20, hy + 6, 21, 8, LT); g.rect(hx - 20, hy + 6, 21, 2, HI);
  for (let d = 0; d < 6; d++) { g.rect(hx - 18 + d * 4, hy + 14, 2, 4, LN); g.px(hx - 18 + d * 4, hy + 14, HI); }
  ellipse(g, hx + 16, hy + 7, 5, 4, '#2a2418'); g.rect(hx - 16, hy + 7, 3, 2, '#2a2418');
  bone(hx + 24, hy, hx + 44, hy - 16, 2); bone(hx + 44, hy - 16, hx + 58, hy - 14, 1); bone(hx + 18, hy - 1, hx + 30, hy - 18, 1);
  /* CODA che si arriccia a destra */
  let tx = 84, ty = -22;
  for (let i = 0; i < 12; i++) { const nx = tx + 5, ny = ty + Math.round(Math.sin(i / 13 * 2.6) * 4) - (i > 9 ? 3 : 0); bone(tx, ty, nx, ny, Math.max(1, 4 - (i >> 3))); tx = nx; ty = ny; }
  /* ZAMPE artigliate mezze sepolte */
  for (const [x, dir] of [[-40, -1], [50, 1]]) { bone(x, -18, x + dir * 8, 0, 3); for (let c = -1; c <= 1; c++) bone(x + dir * 8, 0, x + dir * 8 + c * 5 + dir * 4, 6, 1); }
  /* dune che le seppelliscono */
  ellipse(g, -30, 6, 60, 8, '#c9b98f'); ellipse(g, -30, 4, 54, 6, '#d8c9a0'); ellipse(g, 60, 6, 50, 7, '#c9b98f'); ellipse(g, 60, 4, 44, 5, '#d8c9a0');
  for (let i = 0; i < 16; i++) g.px(-80 + i * 12, 2 + (i % 3), '#e8dcb8');
  /* sabbia che il vento fa scorrere fra le costole */
  for (let i = 0; i < 5; i++) { const k = ((t / 2600) + i / 5) % 1; g.rect(-60 + Math.round(k * 140), -6 - (i * 5) % 20, 4, 1, 'rgba(240,226,190,' + (0.7 * (1 - Math.abs(k - 0.5) * 2)).toFixed(2) + ')'); }
}

/* ================= BOSCHI CINEREI ================= */
function disegna_hollowstump(g, t) {
  /* CEPPO CAVO: il moncone di un albero enorme, spezzato in cima, dentro ci stai in piedi */
  groundShadow(g, 72, 14);
  /* radici */
  for (const [x, dir, len] of [[-40, -1, 26], [-20, -1, 16], [26, 1, 18], [42, 1, 28]]) for (let k = 0; k < len; k++) {
    const w = Math.max(3, 12 - (k >> 2)), xx = x + dir * k, yy = -8 + (k >> 2);
    g.rect(xx - 1, yy - (w >> 1) - 1, 3, w + 2, g.shade8('#6e4a2a', 0.34)); g.rect(xx, yy - (w >> 1), 2, w, k % 8 < 4 ? '#6e4a2a' : '#5c3d22');
  }
  /* corpo del ceppo con la cima spezzata a denti */
  const top = x => -112 + Math.round(Math.abs(Math.sin(x / 9.3)) * 16 + Math.abs(Math.sin(x / 4.1)) * 6 + (x > 20 ? 14 : 0));
  for (let x = -48; x <= 48; x++) {
    const y0 = top(x), shadeK = x < -30 ? 1.22 : x > 30 ? 0.72 : 1;
    g.rect(x, y0 - 1, 1, -y0 + 1, '#241a10');
    g.rect(x, y0, 1, -y0 - 2, shade('#9a6b40', shadeK));
    if (((x + 60) % 9) < 2) g.rect(x, y0 + 4, 1, -y0 - 10, shade('#6e4a2a', shadeK));             // solchi della corteccia
    if (((x + 60) % 9) === 2) g.rect(x, y0 + 4, 1, -y0 - 10, shade('#c08b56', shadeK));
  }
  for (let x = -48; x <= 48; x += 2) g.rect(x, top(x), 2, 2, '#e0b07a');
  /* APERTURA: il cavo scuro, con gli anelli del legno sul bordo */
  for (let y = -84; y < 0; y++) {
    const u = (y + 84) / 84, w = Math.round(19 * Math.sqrt(Math.max(0, 1 - ((1 - u) * 1.1) ** 2)) + u * 3);
    if (w <= 0) continue;
    g.rect(-w - 4, y, w * 2 + 8, 1, '#5c3d22'); g.rect(-w - 2, y, w * 2 + 4, 1, '#c08b56');
    g.rect(-w, y, w * 2, 1, u < 0.2 ? '#2a1a0c' : '#140c06');
    g.rect(-w, y, 4, 1, '#3a2a18');
  }
  /* dentro: muschio e una lucciola che esce ogni tanto */
  ellipse(g, -8, -6, 16, 4, '#3f5a34'); ellipse(g, 6, -4, 10, 3, '#5a7a4a');
  for (let i = 0; i < 4; i++) {
    const k = ((t / 3000) + i / 4) % 1, x = Math.round(Math.sin(k * 7 + i) * 14), y = -12 - Math.round(k * 110);
    if (k < 0.9 && (Math.floor(t / 200) + i) % 3) { g.rect(x - 1, y - 1, 4, 4, 'rgba(242,224,122,.25)'); g.rect(x, y, 2, 2, '#f2e07a'); }
  }
  /* muschio sulla corteccia e funghetti sulle radici */
  for (const [x, y, w] of [[-44, -60, 8], [34, -40, 10], [-40, -24, 6], [40, -90, 6]]) { g.rect(x, y, w, 4, '#4e6a3f'); g.rect(x + 1, y, w - 2, 1, '#6f8f5a'); }
  for (const [x, y, r] of [[-54, -10, 5], [-46, -4, 3], [52, -12, 4], [58, -4, 3]]) {
    g.rect(x - 1, y, 3, r + 3, '#e8dcc0');
    for (let q = 0; q <= r; q++) { const w = Math.round(r * Math.sqrt(1 - (q / (r + 1)) ** 2)); g.rect(x - w, y - q, w * 2 + 1, 1, q === r ? '#8a2a22' : '#d0453a'); }
    g.px(x - 1, y - r + 1, '#f6efdd');
  }
  tufts(g, -60, 62, '#4e6a3f', '#5a7a4a', 9);
}

export const NATIVE_WONDERS = {
  gianttree: disegna_gianttree,
  menhir: disegna_menhir,
  haygiant: disegna_haygiant,
  ribcage: disegna_ribcage,
  hollowstump: disegna_hollowstump,
  bonearch: disegna_bonearch,
  oasis: disegna_oasis,
  mushring: disegna_mushring,
  totem: disegna_totem,
  geyser: disegna_geyser,
  redarch: disegna_redarch,
  orevein: disegna_orevein,
  willow: disegna_willow,
  lilypad: disegna_lilypad,
  bubblepool: disegna_bubblepool,
  icespire: disegna_icespire,
  frozenbeast: disegna_frozenbeast,
  aurora: disegna_aurora,
};
export function hasNativeWonder(type) { return !!NATIVE_WONDERS[type]; }
export function drawNativeWonder(g, type, time) { const f = NATIVE_WONDERS[type]; if (f) f(g, time || 0); return !!f; }
