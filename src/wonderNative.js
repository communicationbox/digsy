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
  disc(g, sx, sy - 14, 30, '#5f5642'); disc(g, sx, sy - 14, 28, '#e3d9c1'); disc(g, sx - 8, sy - 24, 14, '#f3ecda');
  g.rect(sx - 26, sy - 6, 52, 24, '#5f5642'); g.rect(sx - 24, sy - 6, 48, 22, '#d8ccb0');
  g.rect(sx - 24, sy + 10, 48, 6, '#b9ad91');
  ellipse(g, sx - 11, sy - 8, 8, 7, '#2e2618'); ellipse(g, sx + 11, sy - 8, 8, 7, '#2e2618');       // orbite
  ellipse(g, sx - 11, sy - 6, 5, 4, '#15100a'); ellipse(g, sx + 11, sy - 6, 5, 4, '#15100a');
  g.rect(sx - 2, sy + 2, 5, 6, '#2e2618');
  for (let i = -18; i <= 14; i += 6) { g.rect(sx + i, sy + 14, 4, 6, '#5f5642'); g.rect(sx + i + 1, sy + 14, 2, 5, '#f3ecda'); }
  g.rect(sx - 20, sy - 30, 4, 12, '#c9bd9f'); g.rect(sx + 14, sy - 34, 3, 9, '#c9bd9f');           // crepe
  /* PALME: tronco ad anelli che si piega, fronde a raggiera con foglioline */
  const palm = (bx, h, lean, sw) => {
    let x = bx, y = 0;
    const top = [];
    for (let k = 0; k <= h; k += 2) {
      const tt = k / h, xx = bx + Math.round(lean * tt * tt * 26), w = tt > 0.7 ? 7 : tt > 0.35 ? 9 : 11;
      g.rect(xx - (w >> 1) - 1, -k - 2, w + 2, 3, '#3f2a17');
      g.rect(xx - (w >> 1), -k - 2, w, 2, k % 6 < 2 ? '#8a5f38' : '#a97a4c');
      g.rect(xx - (w >> 1), -k - 2, 2, 2, '#c49a63');
      x = xx; y = -k;
    }
    top.push(x, y - 2);
    const [tx, ty] = top;
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
  groundShadow(g, 30, 8);
  /* sassi e terra smossa alla base */
  ellipse(g, 0, -2, 24, 7, '#4a3a28'); ellipse(g, 0, -3, 20, 5, '#6b5238');
  for (const [x, r] of [[-20, 5], [18, 4], [-8, 3]]) { disc(g, x, -2, r + 1, '#3a342c'); disc(g, x, -3, r, '#8a8378'); g.px(x - 1, -r - 2, '#aaa294'); }
  const faces = [
    { col: '#6f5a94', kind: 'occhi' }, { col: '#d8973c', kind: 'corna' }, { col: '#4e8d7c', kind: 'zanne' }, { col: '#c94f4a', kind: 'becco' },
  ];
  const H = 30;
  faces.forEach((f, i) => {
    const y0 = -6 - (i + 1) * H, c = f.col, d = shade(c, 0.6), l = shade(c, 1.25);
    g.rect(-16, y0, 32, H, '#2a1e14');
    g.rect(-15, y0 + 1, 30, H - 2, c);
    g.rect(-15, y0 + 1, 8, H - 2, l); g.rect(9, y0 + 1, 6, H - 2, d);                              // volume del palo
    g.rect(-15, y0 + H - 5, 30, 4, d); g.rect(-15, y0 + 1, 30, 2, l);
    for (let k = 4; k < H - 4; k += 6) g.rect(-12, y0 + k, 1, 3, shade(c, 0.8));                   // venature del legno
    /* occhi scolpiti: incavo scuro, bulbo chiaro, pupilla */
    for (const ex of [-10, 3]) { g.rect(ex, y0 + 7, 8, 7, '#2a1e14'); g.rect(ex + 1, y0 + 8, 6, 5, '#f6efdd'); g.rect(ex + 3, y0 + 9, 3, 3, '#201a14'); }
    g.rect(-12, y0 + 5, 10, 2, d); g.rect(2, y0 + 5, 10, 2, d);                                    // sopracciglia
    if (f.kind === 'becco') { g.rect(-5, y0 + 15, 11, 10, '#2a1e14'); g.rect(-4, y0 + 15, 9, 7, '#f2c53d'); g.rect(-2, y0 + 22, 5, 3, '#c9a227'); g.rect(-4, y0 + 15, 3, 7, '#f8dc70'); }
    if (f.kind === 'zanne') { g.rect(-9, y0 + 17, 19, 6, '#2a1e14'); g.rect(-8, y0 + 18, 17, 4, '#5a2a22'); g.rect(-8, y0 + 18, 3, 8, '#f6efdd'); g.rect(6, y0 + 18, 3, 8, '#f6efdd'); }
    if (f.kind === 'corna') { g.rect(-6, y0 + 18, 13, 3, '#2a1e14'); for (const hx of [-22, 16]) { g.rect(hx, y0 - 4, 7, 12, '#2a1e14'); g.rect(hx + 1, y0 - 3, 5, 10, '#e8e0cc'); g.rect(hx + 1, y0 - 3, 2, 10, '#fbf6ea'); } }
    if (f.kind === 'occhi') { g.rect(-8, y0 + 18, 17, 5, '#2a1e14'); for (let k = -7; k < 8; k += 4) g.rect(k, y0 + 19, 2, 3, '#f6efdd'); }
  });
  /* ali spiegate in cima, piuma per piuma */
  const top = -6 - 4 * H;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const x = side * (16 + k * 7), y = top + 2 + k * 2, len = 22 - k * 3;
      g.rect(side < 0 ? x - 7 : x, y, 8, len + 2, '#2a1e14');
      g.rect(side < 0 ? x - 6 : x + 1, y + 1, 6, len, k % 2 ? '#a97a4c' : '#8a5f38');
      g.rect(side < 0 ? x - 6 : x + 1, y + 1, 6, 3, '#d8973c');
      g.rect(side < 0 ? x - 3 : x + 3, y + 4, 1, len - 4, '#6e4a2e');
    }
  }
  /* uccello del tuono in cima */
  g.rect(-14, top - 20, 28, 22, '#2a1e14'); g.rect(-13, top - 19, 26, 20, '#c9a227'); g.rect(-13, top - 19, 26, 4, '#f0d470');
  g.rect(-8, top - 12, 5, 5, '#2a1e14'); g.rect(4, top - 12, 5, 5, '#2a1e14');
  g.rect(-3, top - 6, 7, 8, '#2a1e14'); g.rect(-2, top - 6, 5, 6, '#e0873a');
  g.rect(-4, top - 28, 9, 9, '#2a1e14'); g.rect(-3, top - 27, 7, 7, '#c65a54');
  /* gli occhi si accendono ogni tanto */
  if (Math.floor(t / 700) % 4 === 0) { g.rect(-7, top - 11, 3, 3, '#fff3a0'); g.rect(5, top - 11, 3, 3, '#fff3a0'); }
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
  groundShadow(g, 88, 14);
  /* un ARCO NATURALE scavato dal vento: una sola massa di arenaria a strati, con il foro
     tondeggiante in mezzo e i bordi rosicchiati. Prima erano due pilastri e una trave:
     sembrava uno stipite, non roccia. */
  const band = ['#b5623a', '#c9784a', '#a85530', '#d08a5a', '#b86840', '#9a4a26'];
  const TOP = -160;
  for (let y = TOP; y < 0; y++) {
    const u = (y - TOP) / -TOP;                                           // 0 in cima, 1 a terra
    const jag = Math.round(Math.sin(y * 0.37) * 2 + Math.sin(y * 0.11) * 3);
    const outer = Math.round(64 + (u < 0.18 ? -(0.18 - u) * 90 : 0) + u * u * 14) + jag;   // spalle arrotondate, base più larga
    const hole = y > -122 ? Math.round(34 * Math.sqrt(Math.max(0, 1 - ((y + 30) / 92) ** 2))) + (y > -30 ? 4 : 0) : 0;
    const c = band[(Math.floor((y + 400) / 7) % band.length)];
    const seg = (x0, x1, lit) => {
      if (x1 <= x0) return;
      g.rect(x0 - 1, y, x1 - x0 + 2, 1, '#4a2010');
      g.rect(x0, y, x1 - x0, 1, c);
      g.rect(x0, y, Math.min(5, x1 - x0), 1, lit ? shade(c, 1.2) : shade(c, 0.85));
      g.rect(x1 - Math.min(6, x1 - x0), y, Math.min(6, x1 - x0), 1, lit ? shade(c, 0.85) : shade(c, 0.66));
    };
    if (hole) { seg(-outer, -hole, true); seg(hole, outer, false); }
    else seg(-outer, outer, true);
    if ((Math.floor((y + 400) / 7) * 7 - 400) === y) {                  // filo di luce fra gli strati, mai dentro il foro
      if (hole) { g.rect(-outer, y, outer - hole, 1, shade(c, 1.12)); g.rect(hole, y, outer - hole, 1, shade(c, 1.12)); } else g.rect(-outer, y, outer * 2, 1, shade(c, 1.12));
    }
  }
  /* bordo in ombra dentro il foro e cavità erose */
  for (let y = -122; y < 0; y++) { const hole = Math.round(34 * Math.sqrt(Math.max(0, 1 - ((y + 30) / 92) ** 2))) + (y > -30 ? 4 : 0); if (hole > 2) { g.rect(-hole, y, 3, 1, 'rgba(40,14,6,.45)'); g.rect(hole - 3, y, 3, 1, 'rgba(255,210,170,.25)'); } }
  for (let x = -40; x <= 40; x += 2) { const d = Math.round(Math.sqrt(Math.max(0, 1 - (x / 40) ** 2)) * 6); g.rect(x, -124, 2, d, 'rgba(40,14,6,.4)'); }
  for (const [x, y, rr] of [[-50, -96, 4], [52, -70, 5], [-18, -144, 3], [46, -30, 4], [-56, -40, 5], [8, -150, 2]]) { disc(g, x, y, rr, '#5c2a18'); g.rect(x - rr + 1, y + rr - 1, rr * 2 - 2, 1, '#d89a6a'); }
  /* detriti e piante del deserto */
  for (const [x, y, r] of [[-84, 2, 7], [-44, 6, 4], [78, 3, 6], [44, 8, 3], [-6, 10, 3]]) { disc(g, x, y, r + 1, '#4a2010'); disc(g, x, y - 1, r, '#a85a34'); g.rect(x - r + 2, y - r, r, 2, '#c9784a'); }
  for (const x of [-96, 92]) { g.rect(x, -20, 5, 20, '#2f4a2a'); g.rect(x + 1, -19, 3, 18, '#5f8a4a'); g.rect(x - 5, -14, 5, 3, '#5f8a4a'); g.rect(x + 5, -10, 5, 3, '#5f8a4a'); g.rect(x - 5, -18, 2, 5, '#5f8a4a'); g.rect(x + 8, -14, 2, 5, '#5f8a4a'); }
  /* polvere che il vento spinge dentro l'arco */
  for (let i = 0; i < 6; i++) {
    const k = ((t / 2200) + i / 6) % 1, x = -34 + Math.round(k * 68), y = -12 - ((i * 13) % 50) - Math.round(Math.sin(k * 6) * 4);
    g.rect(x, y, 3, 1, 'rgba(240,190,140,' + (0.7 * (1 - Math.abs(k - 0.5) * 2)).toFixed(2) + ')');
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
  groundShadow(g, 96, 16);
  const X0 = -76, Y0 = -104, W = 152, H = 100;
  /* il MAMMUT dentro, disegnato prima del ghiaccio che lo vela */
  const bx = -8, by = -26;
  ellipse(g, bx - 6, by - 26, 46, 30, '#2e2013');
  ellipse(g, bx - 6, by - 26, 44, 28, '#8a6440');
  ellipse(g, bx - 10, by - 40, 34, 14, '#a67c52');
  for (let i = 0; i < 20; i++) { const x = bx - 46 + i * 4.6, len = 12 + ((i * 7) % 8); g.rect(Math.round(x), by - 14, 3, len, '#6b4a2e'); g.rect(Math.round(x), by - 14 + len, 3, 2, '#2e2013'); }
  for (const lx of [-40, -22, 6, 22]) { g.rect(bx + lx - 1, by - 4, 14, 26, '#2e2013'); g.rect(bx + lx, by - 4, 12, 24, '#6b4a2e'); g.rect(bx + lx, by - 4, 4, 24, '#8a6440'); g.rect(bx + lx, by + 16, 12, 4, '#4a3524'); }
  disc(g, bx + 40, by - 44, 22, '#2e2013'); disc(g, bx + 40, by - 44, 20, '#a67c52'); disc(g, bx + 34, by - 52, 10, '#bf9366');
  g.rect(bx + 44, by - 50, 8, 7, '#2e2013'); g.rect(bx + 45, by - 49, 6, 5, '#f6efdd'); g.rect(bx + 48, by - 48, 2, 3, '#201a14');
  for (let k = 0; k < 34; k++) { const x = bx + 52 + Math.round(Math.sin(k / 34 * 2.6) * 6), y = by - 36 + k; g.rect(x - 1, y, 10, 1, '#2e2013'); g.rect(x, y, 8, 1, k % 5 ? '#8a6440' : '#6b4a2e'); }
  for (const zy of [-30, -22]) for (let k = 0; k < 30; k++) { const x = bx + 56 + k, y = by + zy + Math.round(Math.sin(k / 30 * 2.4) * 10); g.rect(x, y - 1, 1, 6, '#6e6450'); g.rect(x, y, 1, 4, '#f6efdd'); g.px(x, y, '#ffffff'); }
  g.rect(bx - 56, by - 34, 10, 5, '#6b4a2e');
  /* il BLOCCO di ghiaccio: facce trasparenti, spigoli chiari, crepe */
  g.rect(X0 - 2, Y0 - 2, W + 4, 2, '#3f7890'); g.rect(X0 - 2, Y0 + H, W + 4, 2, '#3f7890'); g.rect(X0 - 2, Y0, 2, H, '#3f7890'); g.rect(X0 + W, Y0, 2, H, '#3f7890');
  g.rect(X0, Y0, W, H, 'rgba(168,220,242,.30)');
  g.rect(X0, Y0, W, 18, 'rgba(220,246,255,.70)');
  g.rect(X0 + W - 26, Y0 + 18, 26, H - 18, 'rgba(100,160,196,.35)');
  g.rect(X0, Y0, W, 2, '#f4fdff'); g.rect(X0, Y0 + 18, W, 1, 'rgba(255,255,255,.8)'); g.rect(X0 + W - 26, Y0, 1, H, 'rgba(255,255,255,.6)');
  g.rect(X0 + 6, Y0 + 24, 20, H - 34, 'rgba(240,252,255,.30)'); g.rect(X0 + 34, Y0 + 28, 8, H - 44, 'rgba(240,252,255,.2)');
  for (const [x, y, dx, dy, n] of [[30, 30, 3, 2, 12], [110, 50, -2, 3, 10], [60, 70, 3, -1, 9]]) for (let k = 0; k < n; k++) g.px(X0 + x + dx * k + (k % 2), Y0 + y + dy * k, 'rgba(255,255,255,.85)');
  /* neve sopra e alla base, ghiaccioli */
  ellipse(g, 0, Y0 - 2, 80, 8, '#b9d9e6'); ellipse(g, -6, Y0 - 4, 74, 6, '#eafcff');
  for (let x = X0 + 8; x < X0 + W - 8; x += 14) { const h = 6 + ((x * 3) % 9); for (let k = 0; k < h; k++) g.rect(x + (k >> 3), Y0 + 2 + k, Math.max(1, 3 - (k >> 2)), 1, k < 2 ? '#ffffff' : '#b6e6f4'); }
  ellipse(g, 0, -2, 96, 10, '#9cc8d8'); ellipse(g, 0, -4, 92, 8, '#dff3fa'); ellipse(g, -20, -6, 50, 4, '#ffffff');
  const sp = Math.floor(t / 500) % 5;
  for (let i = 0; i < 5; i++) if (i === sp) { const x = X0 + 16 + i * 28, y = Y0 + 10 + ((i * 17) % 60); g.rect(x - 3, y, 7, 1, '#ffffff'); g.rect(x, y - 3, 1, 7, '#ffffff'); }
}

function disegna_aurora(g, t) {
  /* cumulo di neve e un ometto di pietre con la lanterna: la meraviglia ha un posto a terra */
  groundShadow(g, 50, 10);
  ellipse(g, 0, -2, 54, 10, '#9cc8d8'); ellipse(g, 0, -4, 50, 8, '#dff3fa'); ellipse(g, -10, -6, 28, 4, '#ffffff');
  for (const [y, w, c] of [[-10, 18, '#6e7680'], [-20, 14, '#8a929a'], [-28, 10, '#7a828a'], [-35, 7, '#9aa2aa']]) { g.rect(-(w >> 1) - 1, y - 1, w + 2, 9, '#2a3038'); g.rect(-(w >> 1), y, w, 7, c); g.rect(-(w >> 1), y, w, 2, shade(c, 1.2)); }
  g.rect(-4, -48, 9, 11, '#2a2016'); const lf = Math.floor(t / 250) % 2; g.rect(-3, -46, 7, 8, lf ? '#f2c53d' : '#e8862e'); g.rect(-2, -45, 2, 6, '#fff3c8');
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
  /* radici che si allargano sul prato */
  for (const [dx, len, dir] of [[-20, 46, -1], [-8, 30, -1], [10, 40, 1], [22, 56, 1], [0, 24, 1]]) {
    for (let k = 0; k < len; k++) {
      const x = TX + dx + dir * k, y = -18 + Math.round(k * 0.42) + Math.round(Math.sin(k / 6) * 2), w = Math.max(3, 12 - Math.round(k / 5));
      g.rect(x - 1, y - (w >> 1) - 1, 3, w + 2, '#2f2318'); g.rect(x, y - (w >> 1), 2, w, k % 9 < 5 ? '#6e4a2a' : '#5c3d22'); g.rect(x, y - (w >> 1), 2, 2, '#8a6440');
    }
  }
  /* tronco: si allarga alla base, corteccia a placche verticali */
  for (let y = 8; y > -170; y--) {
    const u = (8 - y) / 178, w = Math.round(44 - u * 14 + (u < 0.14 ? (0.14 - u) * 120 : 0)), wob = Math.round(Math.sin(y / 23) * 2);
    const x0 = TX - (w >> 1) + wob;
    g.rect(x0 - 2, y, w + 4, 1, '#1d150e');
    g.rect(x0, y, w, 1, '#6e4a2a');
    g.rect(x0, y, Math.round(w * 0.3), 1, '#805a36'); g.rect(x0, y, 3, 1, '#9a7048');
    g.rect(x0 + w - Math.round(w * 0.25), y, Math.round(w * 0.25), 1, '#563820');
    for (let f = 0; f < 5; f++) { const fx = x0 + 5 + f * Math.round(w / 5) + ((Math.floor((y + f * 13) / 17)) % 3); if (((y + f * 31) % 40 + 40) % 40 < 30) g.px(fx, y, '#3f2a17'); }
  }
  /* cavità con una lucina dentro */
  ellipse(g, TX + 4, -92, 9, 13, '#1d150e'); ellipse(g, TX + 4, -91, 7, 11, '#0e0a06');
  if (Math.floor(t / 900) % 3) { g.rect(TX + 3, -94, 3, 3, '#f2e07a'); g.rect(TX + 1, -96, 7, 7, 'rgba(242,224,122,.25)'); }
  /* rami che escono dalla chioma */
  for (const [x, y, len, dir] of [[TX - 18, -150, 34, -1], [TX + 16, -140, 30, 1], [TX - 14, -120, 22, -1], [TX + 14, -112, 20, 1]]) {
    for (let k = 0; k < len; k++) { const xx = x + dir * k, yy = y - Math.round(k * 0.5); g.rect(xx, yy - 3, 2, 7, '#2f2318'); g.rect(xx, yy - 2, 2, 5, '#6e4a2a'); g.rect(xx, yy - 2, 2, 1, '#8a6440'); }
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

function disegna_menhir(g, t) {
  ellipse(g, 0, -28, 100, 34, 'rgba(20,16,10,.14)'); ellipse(g, 0, -28, 75, 24, 'rgba(20,16,10,.10)');
  /* un cerchio di erba calpestata dentro l'anello */
  ellipse(g, 0, -28, 88, 36, 'rgba(60,90,40,.25)'); ellipse(g, 0, -28, 60, 22, 'rgba(210,200,140,.18)');
  /* le sette pietre sulle loro caselle solide (dx, dy), da dietro in avanti */
  const stones = [[-1, -2, 70, 26, 1], [1, -2, 64, 24, -1], [-2, -1, 58, 24, -1], [2, -1, 62, 25, 1], [-1, 0, 52, 22, 1], [0, 0, 80, 30, 0], [2, 0, 48, 22, -1]];
  stones.sort((a, b) => a[1] - b[1]);
  stones.forEach(([dx, dy, h, w, lean], i) => {
    const bx = dx * 32, by = dy * 32 - 6;
    ellipse(g, bx + 4, by + 2, w - 2, 6, 'rgba(20,20,10,.28)');
    for (let k = 0; k < h; k++) {
      const u = k / h, xo = Math.round(lean * u * 5);
      const ww = Math.round(w * (u > 0.82 ? 1 - (u - 0.82) * 2.4 : 1 - u * 0.12)) - ((i + k) % 11 === 0 ? 2 : 0);
      const x0 = bx - (ww >> 1) + xo, y = by - k;
      g.rect(x0 - 1, y, ww + 2, 1, '#3a3c48');
      g.rect(x0, y, ww, 1, '#8b8a86');
      g.rect(x0, y, Math.round(ww * 0.35), 1, '#a8a696'); g.rect(x0, y, 2, 1, '#c6c2ae');
      g.rect(x0 + ww - Math.round(ww * 0.28), y, Math.round(ww * 0.28), 1, '#5f6376');
    }
    g.rect(bx - (w >> 1) + 3 + Math.round(lean * 4), by - h, w - 8, 2, '#d6d2bc');                      // cima in luce
    /* licheni e muschio */
    for (const [lx, ly, lw] of [[-6, 0.3, 6], [4, 0.6, 4], [-2, 0.12, 8]]) { g.rect(bx + lx, by - Math.round(h * ly), lw, 3, '#7d9a5c'); g.px(bx + lx + 1, by - Math.round(h * ly), '#a8c07a'); }
    /* spirale incisa sulla pietra centrale, che si accende piano */
    if (dx === 0 && dy === 0) {
      const glow = Math.floor(t / 600) % 4 === 0 ? '#f2e3a8' : '#5e606c';
      const cx = bx, cy = by - 44;
      for (let a = 0; a < 26; a++) { const ang = a * 0.5, r = 1 + a * 0.36; g.px(cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), glow); }
    }
  });
  /* erba alta attorno alle basi e fiori */
  for (const [dx, dy] of stones.map(s2 => [s2[0], s2[1]])) tufts(g, dx * 32 - 18, dx * 32 + 18, '#5fa04e', '#4e8d3f', dx * 5 + dy);
  for (const [x, y, c] of [[-60, -8, '#f2e3a8'], [44, -40, '#e8a0b8'], [-30, -70, '#f2e3a8'], [70, -16, '#ffffff']]) { g.rect(x, y, 3, 3, c); g.px(x + 1, y + 3, '#4e8d3f'); }
}

function disegna_haygiant(g, t) {
  /* GIGANTE DI FIENO: covoni legati con la corda, mele al posto degli occhi, cappello di
     paglia, forcone, e un corvo che non ha paura di lui */
  groundShadow(g, 70, 14);
  const bale = (x, y, w, h) => {
    g.rect(x - 1, y - 1, w + 2, h + 2, '#6b4f14');
    g.rect(x, y, w, h, '#dcbe4c');
    g.rect(x, y, w, 3, '#f0d070'); g.rect(x, y + h - 4, w, 4, '#c9a227'); g.rect(x + w - 4, y, 4, h, '#b8922a');
    for (let i = 2; i < w - 2; i += 3) g.rect(x + i, y + 4 + ((i * 7) % 5), 1, h - 10, (i % 2) ? '#c9a227' : '#e8c860');   // steli
    for (const ry of [0.3, 0.7]) { g.rect(x, y + Math.round(h * ry), w, 3, '#8a6a1a'); g.rect(x, y + Math.round(h * ry), w, 1, '#a78723'); }
    for (let i = 0; i < w; i += 7) g.px(x + i, y - 2 - (i % 3), '#e8c860');                              // paglia che spunta
  };
  /* gambe */
  bale(-34, -44, 26, 44); bale(8, -44, 26, 44);
  /* corpo */
  bale(-44, -104, 88, 62);
  /* braccia: bastone con i covoncini e la paglia delle mani */
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -84 : 44;
    g.rect(x0, -94, 40, 6, '#3f2a17'); g.rect(x0 + 1, -93, 38, 4, '#a97a4c'); g.rect(x0 + 1, -93, 38, 1, '#c49a63');
    bale(side < 0 ? -80 : 52, -100, 24, 18);
    for (let k = 0; k < 6; k++) g.rect(side < 0 ? -88 - k : 84 + k, -96 + k * 2, 6, 1, '#e8c860');
  }
  /* testa */
  bale(-26, -146, 52, 42);
  for (const ex of [-14, 12]) { disc(g, ex, -128, 7, '#8a1f18'); disc(g, ex, -128, 6, '#c94f4a'); disc(g, ex - 2, -130, 2, '#f08a80'); g.rect(ex, -136, 2, 3, '#5c3d22'); g.rect(ex + 2, -137, 3, 2, '#5fa04e'); }
  g.rect(-12, -116, 24, 2, '#6b4f14'); for (let i = -10; i < 12; i += 4) g.rect(i, -118, 1, 6, '#6b4f14');           // bocca cucita
  /* cappello di paglia a tesa larga, con la fascia rossa */
  ellipse(g, 0, -146, 46, 8, '#6b4f14'); ellipse(g, 0, -147, 44, 6, '#e8c860'); ellipse(g, -8, -149, 26, 2, '#f8e090');
  g.rect(-22, -172, 44, 26, '#6b4f14'); g.rect(-20, -170, 40, 24, '#dcbe4c'); g.rect(-20, -170, 40, 4, '#f0d070');
  g.rect(-20, -154, 40, 6, '#8a1f18'); g.rect(-20, -154, 40, 2, '#e2604f');
  /* forcone nella mano destra */
  g.rect(84, -150, 5, 150, '#3f2a17'); g.rect(85, -150, 3, 150, '#a97a4c');
  g.rect(74, -166, 25, 5, '#3f2a17'); g.rect(75, -165, 23, 3, '#8f9aa3');
  for (const x of [75, 85, 95]) { g.rect(x - 1, -186, 5, 22, '#3f2a17'); g.rect(x, -185, 3, 20, '#c9ced3'); g.px(x, -185, '#ffffff'); }
  /* corvo sulla spalla: saltella */
  const hop = Math.floor(t / 700) % 4 === 0 ? -3 : 0, cy = -106 + hop;
  ellipse(g, -40, cy - 6, 10, 7, '#18180f'); ellipse(g, -40, cy - 6, 9, 6, '#2a2a3a'); disc(g, -48, cy - 12, 5, '#18180f'); disc(g, -48, cy - 12, 4, '#2a2a3a');
  g.rect(-57, cy - 12, 6, 2, '#e8c34a'); g.px(-49, cy - 13, '#ffffff'); g.rect(-32, cy - 8, 8, 3, '#18180f');
  /* paglia sparsa a terra */
  for (let i = 0; i < 14; i++) g.rect(-60 + ((i * 37) % 120), 2 + (i % 4), 5, 1, i % 2 ? '#e8c860' : '#c9a227');
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
    g.rect(xx - 1, yy - (w >> 1) - 1, 3, w + 2, '#241a10'); g.rect(xx, yy - (w >> 1), 2, w, k % 8 < 4 ? '#6e4a2a' : '#5c3d22');
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
