/* INTRO (prima partita) — rifatta da capo ("da rifare totalmente il video introduttivo con nuove
   grafiche, adesso fa un po' schifo").
   Com'era: un solo quadro fisso con montagne a triangoli e cielo sfumato, i personaggi disegnati a
   scala 0,5 (pixel spaccati, contro le regole) e il testo in una nuvoletta con caratteri da 6 pixel.
   Adesso: UNA INQUADRATURA PER BATTUTA, disegnata a pixel veri a scala intera, con passaggi a
   dissolvenza a gradini, e il testo in un riquadro grande in basso, leggibile.
     1 · tramonto sul campo di scavo: il nonno chiama, il piccolo arriva di corsa
     2 · primo piano sottoterra: strati di terra, il cranio, il pennello che lo libera
     3 · il ricordo: notte di luna, una creatura viva passa sopra il suo scheletro
     4 · il dono: il nonno porge il fossile che brilla
     5 · alba: il piccolo, da solo, alza il piccone
   Regole che restano: si avanza SOLO al clic, con "tocca per continuare" e Salta. */
import { ctx, view, fit } from './screen.js';
import { drawHero, applyLook } from './sprites.js';
import { S } from './state.js';
import { tr } from './i18n.js';
import { treeSprite, TREE_AX, TREE_AY } from './treeArt.js';
import { drawBuriedSkull } from './splashScene.js';

let active = false;
export function introActive() { return active; }

const GRANDPA = { acc: 'grandpa', hat: '#6e4a2a', shirt: '#7a6a52', pants: '#5c4630', skin: '#e3b98a', hairStyle: 'short', hairColor: '#eae6da', hatStyle: 'explorer', eyeColor: '#33291f' };
function withLook(look, fn) { const saved = S.look; S.look = look; applyLook(); try { fn(); } finally { S.look = saved; applyLook(); } }

/* dialoghi: 'G' nonno · 'D' piccolo Digsy · shot = inquadratura
 *
 * CINQUE BATTUTE, NON SEDICI: l'insegnamento sta nel TUTORIAL (tutorial.js), che lo fa fare
 * invece di raccontarlo. Qui resta solo chi era il nonno e perché tocca a te; e lo scopo del gioco
 * detto da chi ha diritto di chiederlo (nessuno le ha mai riviste vive → riportarle indietro). */
const LINES = [
  { s: 'G', it: 'Eccoti, {n}! Vieni qui vicino a me: la terra oggi ha un segreto da mostrarci.', en: 'There you are, {n}! Come close to me: the earth has a secret to show us today.', shot: 1 },
  { s: 'G', it: 'Piano, col pennello… eccolo. È l\'osso di una creatura vissuta tantissimo tempo fa.', en: 'Gently, with the brush… there it is. The bone of a creature that lived a very long time ago.', shot: 2 },
  { s: 'G', it: 'Ho passato la vita a cercarle. E ho sempre sognato di vederne una viva, anche una sola.', en: 'I spent my life looking for them. And I always dreamed of seeing one alive, even just one.', shot: 3 },
  { s: 'G', it: 'Questo è per te, {n}. Io ormai sono stanco… ma tu hai tutta la strada davanti.', en: 'This is for you, {n}. I\'m tired now… but you have the whole road ahead of you.', shot: 4 },
  { s: 'D', it: 'Te lo prometto, nonno: le riporterò a casa. Tutte quante.', en: 'I promise, Grandpa: I\'ll bring them home. Every single one.', shot: 5 },
];

/* ---------------- pennelli ---------------- */
const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function hash(i, s) { let h = Math.imul(i | 0, 374761393) ^ Math.imul(s | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/* cielo a BANDE nette (niente sfumature morbide): colori dall'alto in basso */
function sky(W, H, cols, h) { const bh = Math.ceil(h / cols.length); cols.forEach((c, i) => px(0, i * bh, W, bh + 1, c)); }
/* colline: sagoma mossa da due seni, riempita fino in fondo */
function hills(W, H, y, amp, f, col, seed, top) {
  for (let x = 0; x < W; x++) {
    const hy = Math.round(y - Math.sin(x * f + seed) * amp - Math.sin(x * f * 2.3 + seed * 2) * amp * 0.35);
    if (top) px(x, hy, 1, 1, top);
    px(x, hy + (top ? 1 : 0), 1, H - hy, col);
  }
}
function sun(x, y, r, col, glow) {
  for (let yy = -r - 3; yy <= r + 3; yy++) { const w = Math.round(Math.sqrt(Math.max(0, (r + 3) ** 2 - yy * yy))); if (glow) px(x - w, y + yy, w * 2, 1, glow); }
  for (let yy = -r; yy <= r; yy++) { const w = Math.round(Math.sqrt(r * r - yy * yy)); px(x - w, y + yy, w * 2, 1, col); }
}
function grass(W, H, y, cols, t) {
  px(0, y, W, H - y, cols[0]); px(0, y, W, 2, cols[1]);
  for (let x = 0; x < W; x += 2) { const sway = Math.round(Math.sin(t / 700 + x * 0.3) * 0.6); px(x + sway, y - 1 - (hash(x, 3) * 3 | 0), 1, 2 + (hash(x, 4) * 2 | 0), cols[2]); }
}
const PRATI = ['#3f7a3a', '#4f8f44', '#62a651', '#7fbf63', '#9fd07a', '#2e5a2c'];
const DUSK_TREE = ['#2e3a3a', '#3a4848', '#465656', '#526464', '#607272', '#222c2c'];
function tree(x, base, v, T, t) {
  const cv = treeSprite('broad', v, T, Math.floor(t / 900 + v) % 2 ? 1 : 0, false);
  if (cv) ctx.drawImage(cv, Math.round(x - TREE_AX), Math.round(base - TREE_AY));
}
/* personaggio a scala 1 (i pixel del gioco): la scena intera è ingrandita a scala intera */
function hero(look, x, y, dir, fr, pose) { if (look) withLook(look, () => drawHero(null, Math.round(x - 16), Math.round(y - 32), dir, fr, false, pose)); else drawHero(null, Math.round(x - 16), Math.round(y - 32), dir, fr, false, pose); }
function shadowAt(x, y, w) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 1), Math.round(w), 2); }
/* alone TONDO a righe di pixel (un rettangolo semitrasparente si leggeva come un vetro) */
function glow(x, y, r, col) { for (let yy = -r; yy <= r; yy++) { const w = Math.round(Math.sqrt(r * r - yy * yy)); px(x - w, y + yy, w * 2, 1, col); } }
function sparkle(x, y, col) { px(x, y - 2, 1, 5, col); px(x - 2, y, 5, 1, col); }

/* ---------------- le cinque inquadrature (tu = tempo dall'inizio dell'inquadratura) ---------------- */
function shotSite(W, H, t, tu) {
  sky(W, H, ['#4a3a6e', '#7a4a78', '#b55a6a', '#e07a52', '#f2a55a', '#f7c878'], Math.round(H * 0.5));
  sun(Math.round(W * 0.7), Math.round(H * 0.44), 14, '#ffe09a', 'rgba(255,226,150,.25)');
  for (let i = 0; i < 4; i++) { const cx = ((i * 97 + t / 120) % (W + 60)) - 30; px(cx, 12 + i * 9, 26, 3, '#f6b08a'); px(cx + 6, 10 + i * 9, 14, 2, '#f8c8a2'); }
  /* il terreno sta ALTO: sotto c'è il riquadro del testo, che copriva i personaggi */
  hills(W, H, Math.round(H * 0.46), 6, 0.035, '#6a4a7a', 1.3, '#7e5a8c');
  hills(W, H, Math.round(H * 0.54), 5, 0.05, '#3e4a5a', 4.1, '#4c5a6a');
  const gy = Math.round(H * 0.62);
  /* la base del tronco SULL'ERBA (gy): prima stava a 0,6 e gli alberi galleggiavano sopra il prato */
  for (const [fx, v] of [[0.08, 1], [0.86, 4], [0.95, 2]]) tree(W * fx, gy + 2, v, DUSK_TREE, t);   // pochi alberi, ai lati: niente muro
  grass(W, H, gy, ['#4a6a3a', '#6a8a4a', '#3a5a2e'], t);
  /* il campo: tenda, cassa, lanterna accesa, cumulo */
  const tx = Math.round(W * 0.18);
  for (let y = 0; y < 24; y++) { const w = Math.round(y * 0.9); px(tx - w, gy - 24 + y, w * 2, 1, y < 2 ? '#e8d6a8' : '#c9b07a'); px(tx - w, gy - 24 + y, 2, 1, '#8a7048'); }
  px(tx - 3, gy - 14, 6, 14, '#3a2a1a');
  px(tx + 26, gy - 8, 12, 8, '#8a5f38'); px(tx + 26, gy - 8, 12, 2, '#b07c4a'); px(tx + 31, gy - 8, 2, 8, '#5c4229');
  const fl = Math.floor(t / 200) % 2;
  /* la lanterna è APPESA a un palo piantato accanto alla cassa: prima c'erano solo il vetro e
     l'alone, sospesi a mezz'aria sopra il prato */
  const lx = tx + 46;
  px(lx, gy - 26, 2, 26, '#5c4229'); px(lx + 2, gy - 26, 1, 26, '#3e2c1c');         // palo
  px(lx, gy - 26, 9, 2, '#5c4229'); px(lx + 7, gy - 24, 1, 2, '#2a1f14');            // braccio e gancio
  /* la luce si vede dove CADE: una chiazza calda sull'erba sotto la lanterna (un alone tondo a
     mezz'aria, sopra le colline viola, diventava un disco grigio) */
  px(lx + 1, gy, 15, 1, '#8a9a52'); px(lx + 3, gy + 1, 11, 1, '#7a8a4a');
  px(lx + 5, gy - 22, 6, 1, '#2a1f14'); px(lx + 5, gy - 21, 6, 6, '#2a1f14'); px(lx + 5, gy - 15, 6, 1, '#2a1f14');
  px(lx + 6, gy - 20, 4, 4, fl ? '#ffd27a' : '#ffe9a8'); px(lx + 7, gy - 19, 2, 2, '#fff6d8');
  for (let x = 0; x < 50; x++) { const h = Math.round(Math.sin(x / 50 * Math.PI) * 9); px(W * 0.5 + x, gy - h, 1, h, x % 7 ? '#8a6440' : '#6b4a2e'); }
  /* il nonno aspetta vicino al cumulo; il piccolo arriva di corsa da destra */
  const gx = Math.round(W * 0.46);
  shadowAt(gx, gy, 14); hero(GRANDPA, gx, gy, 'right', Math.floor(t / 600) % 2 ? 0 : 0);
  const arrive = Math.min(1, tu / 1800), dx = Math.round(W + 20 - (W + 20 - W * 0.62) * (1 - (1 - arrive) ** 2));
  shadowAt(dx, gy, 12); hero(null, dx, gy - (arrive < 1 ? Math.abs(Math.sin(t / 90)) * 2 : 0), 'left', arrive < 1 ? Math.floor(t / 120) % 2 : 0);
}
function shotBone(W, H, t) {
  /* SEZIONE DEL TERRENO: in cima l'erba, sotto gli strati e dentro il cranio */
  sky(W, H, ['#f2a55a', '#f7c878'], Math.round(H * 0.18));
  const gy = Math.round(H * 0.2);
  grass(W, H, gy, ['#5a8a44', '#7aaa5a', '#4a7a3a'], t);
  const layers = ['#8a6440', '#7a5634', '#6b4a2e', '#5a3c24', '#4a3120'];
  layers.forEach((c, i) => { const y0 = gy + 6 + i * Math.round((H - gy) / 5); for (let x = 0; x < W; x++) px(x, y0 + Math.round(Math.sin(x * 0.07 + i) * 2), 1, H, c); });
  for (let i = 0; i < 40; i++) { const x = hash(i, 5) * W, y = gy + 12 + hash(i, 6) * (H - gy); px(x, y, 2 + (hash(i, 7) * 3 | 0), 2, i % 3 ? '#9a9285' : '#3a2a1a'); }
  /* il cranio al centro, luce che scende */
  const sx = Math.round(W / 2 - 55), sy = Math.round(H * 0.58 - 45);
  /* LA BUCA: dall'erba si scende fino al cranio, pareti in ombra e fondo di terra smossa. La luce
     del tramonto entra da lì — prima era una colonna chiara in mezzo alla terra piena, cioè una
     luce che non veniva da nessuna parte */
  const pitTop = gy + 2, pitBot = sy + 30;
  for (let y = pitTop; y <= pitBot; y++) {
    const k = (y - pitTop) / (pitBot - pitTop), x0 = Math.round(sx + 6 + k * 14), x1 = Math.round(sx + 110 - k * 10);
    px(x0, y, x1 - x0, 1, '#a57e52');
    px(x0 - 2, y, 2, 1, '#4a3120'); px(x1, y, 2, 1, '#3a2616');
  }
  px(sx + 4, pitTop - 1, 108, 2, '#6b4a2e');
  ctx.fillStyle = 'rgba(255,230,160,.12)';
  for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(sx + 26 + i * 8), pitTop, 40 - i * 10, pitBot - pitTop);
  drawBuriedSkull(ctx, t, sx, sy);
  /* il PENNELLO del nonno, col manico che risale fuori dalla buca fino alla sua mano */
  const bx = Math.round(W / 2 + 10 + Math.sin(t / 180) * 14), by = sy + 22;
  px(bx - 1, pitTop - 8, 3, by - pitTop + 6, '#6e4a2a'); px(bx - 3, by - 3, 7, 5, '#e8d29a'); px(bx - 3, by + 1, 7, 2, '#c9a06a');
  px(bx - 3, pitTop - 12, 7, 5, '#e3b98a'); px(bx - 4, pitTop - 16, 9, 4, '#7a6a52');     // mano e manica
  for (let i = 0; i < 8; i++) { const a = (t / 400 + i / 8) % 1; px(bx - 10 + hash(i, 1) * 20 + Math.sin(t / 180) * 6 * a, by + 2 - a * 16, 1, 1, `rgba(236,220,180,${(1 - a).toFixed(2)})`); }
  if (Math.floor(t / 500) % 3 === 0) sparkle(sx + 48, sy + 40, '#fff6c8');
}
function shotMemory(W, H, t, tu, creature) {
  /* IL RICORDO: notte di luna, tinta viola; una creatura VIVA passa sopra il suo scheletro */
  sky(W, H, ['#120f24', '#1a1634', '#241e44', '#2e2652'], Math.round(H * 0.75));
  for (let i = 0; i < 60; i++) { const x = hash(i, 11) * W, y = hash(i, 12) * H * 0.6; if (Math.floor(t / 400 + i) % 5) px(x, y, 1, 1, i % 4 ? '#cfc8ff' : '#fff6c8'); }
  sun(Math.round(W * 0.22), Math.round(H * 0.24), 12, '#efe6c8', 'rgba(239,230,200,.12)');
  px(Math.round(W * 0.22) + 3, Math.round(H * 0.24) - 5, 4, 3, '#d6cba8');
  hills(W, H, Math.round(H * 0.7), 5, 0.04, '#231c3e', 2.2, '#302852');
  const gy = Math.round(H * 0.82);
  px(0, gy, W, H - gy, '#1a1530'); px(0, gy, W, 1, '#3a3266');
  /* lo scheletro a terra, fantasma */
  ctx.globalAlpha = 0.55; drawBuriedSkull(ctx, t, Math.round(W * 0.5 - 55), gy - 62); ctx.globalAlpha = 1;
  /* la creatura: sagoma viva col bordo di luna, cammina lenta da sinistra a destra */
  if (creature) {
    const k = Math.min(1, tu / 9000), cx = Math.round(-creature.width + (W + creature.width) * k * 0.9 + W * 0.05);
    const cy = gy - creature.height + 4 + Math.round(Math.abs(Math.sin(t / 320)) * 1.5);
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.translate(cx + creature.width, cy); ctx.scale(-1, 1); ctx.drawImage(creature, 0, 0);
    ctx.restore();
    ctx.fillStyle = 'rgba(40,30,80,.45)'; ctx.fillRect(cx, cy, creature.width, creature.height);   // velo notturno
  }
  /* il nonno giovane, piccolo in controluce, guarda */
  const gx = Math.round(W * 0.84);
  hero(GRANDPA, gx, gy, 'left', 0);
  ctx.fillStyle = 'rgba(30,20,70,.35)'; ctx.fillRect(0, 0, W, H);
}
function shotGive(W, H, t, tu) {
  sky(W, H, ['#6a3a5e', '#a24a5a', '#d8664a', '#f0904a', '#f6b45a'], Math.round(H * 0.56));
  sun(Math.round(W * 0.5), Math.round(H * 0.47), 18, '#ffd48a', 'rgba(255,212,138,.2)');   // il sole fra i due, sopra le colline
  hills(W, H, Math.round(H * 0.54), 4, 0.05, '#4a3a5a', 0.7, '#5a4a6a');
  const gy = Math.round(H * 0.64);
  grass(W, H, gy, ['#4a5a3a', '#6a7a4a', '#3a4a2e'], t);
  /* vicini abbastanza da passarsi il fossile: a 0,4 e 0,6 volava nel vuoto fra i due */
  const gx = Math.round(W / 2 - 21), dx = Math.round(W / 2 + 21);
  shadowAt(gx, gy, 14); hero(GRANDPA, gx, gy, 'right', 0, 'strike');
  shadowAt(dx, gy, 12); hero(null, dx, gy, 'left', 0, tu > 1400 ? 'strike' : undefined);
  /* il fossile che passa di mano e brilla */
  const k = Math.min(1, tu / 1600), fx = Math.round(gx + 11 + (dx - gx - 22) * k), fy = gy - 14 - Math.round(Math.sin(k * Math.PI) * 3);
  px(fx - 4, fy - 1, 9, 3, '#2a1f14'); px(fx - 3, fy, 7, 1, '#f1e8d2'); px(fx - 5, fy - 2, 3, 5, '#2a1f14'); px(fx - 4, fy - 1, 1, 3, '#f1e8d2'); px(fx + 3, fy - 2, 3, 5, '#2a1f14'); px(fx + 4, fy - 1, 1, 3, '#f1e8d2');
  for (let i = 0; i < 5; i++) { const a = (t / 900 + i / 5) % 1; if (a < 0.8) sparkle(fx - 8 + hash(i, 2) * 16, fy - 2 - a * 18, i % 2 ? '#fff6c8' : '#ffe27a'); }
}
function shotDawn(W, H, t, tu) {
  sky(W, H, ['#3a5a8a', '#6a8ab0', '#a8b8c8', '#f0c89a', '#f7dcaa'], Math.round(H * 0.56));
  const sxn = Math.round(W / 2), syn = Math.round(H * 0.56) - Math.min(10, Math.round(tu / 300));
  /* raggi del sole che sorge: spicchi alternati */
  for (let i = 0; i < 10; i++) {
    if (i % 2) continue;
    const a0 = Math.PI + i / 10 * Math.PI, a1 = a0 + Math.PI / 10;
    ctx.fillStyle = 'rgba(255,236,190,.18)'; ctx.beginPath(); ctx.moveTo(sxn, syn); ctx.lineTo(sxn + Math.cos(a0) * W, syn + Math.sin(a0) * W); ctx.lineTo(sxn + Math.cos(a1) * W, syn + Math.sin(a1) * W); ctx.closePath(); ctx.fill();
  }
  sun(sxn, syn, 16, '#fff0b8', 'rgba(255,240,184,.3)');
  hills(W, H, Math.round(H * 0.54), 5, 0.04, '#5a7a8a', 3.3, '#6a8a9a');
  const gy = Math.round(H * 0.64);
  for (const [fx, v] of [[0.1, 3], [0.2, 5], [0.88, 6]]) tree(W * fx, gy + 2, v, PRATI, t);
  grass(W, H, gy, ['#4f8f44', '#7fbf63', '#3f7a3a'], t);
  for (let b = 0; b < 3; b++) { const bx = ((t / 30) + b * 60) % (W + 20) - 10, by = H * 0.2 + b * 7 + Math.sin(t / 250 + b) * 2; px(bx - 1, by, 1, 1, '#2a2a3a'); px(bx, by - 1, 1, 1, '#2a2a3a'); px(bx + 1, by, 1, 1, '#2a2a3a'); }
  /* il piccolo, da solo, alza il piccone verso il sole */
  const dx = Math.round(W / 2), raise = tu > 700;
  shadowAt(dx, gy, 14); hero(null, dx, gy, 'right', 0, raise ? 'lift' : undefined);
  if (raise) { const hx = dx - 16 + 23, hy = gy - 32 + 16; px(hx, hy - 16, 2, 16, '#8a5f38'); px(hx - 6, hy - 18, 14, 3, '#c9c2b2'); px(hx - 7, hy - 17, 2, 2, '#7f776a'); px(hx + 7, hy - 17, 2, 2, '#7f776a'); if (Math.floor(t / 300) % 2) sparkle(hx + 9, hy - 20, '#fff6c8'); }
}

/* ---------------- regia ---------------- */
let cur = 0, typed = 0, tStart = 0, shotStart = 0, lastShot = 0, fadeT = -1e9;
let memCreature = null;
function drawIntro(t) {
  /* scala INTERA scelta perché la scena sia larga circa 400 pixel di gioco: a 240 alberi e personaggi
     riempivano mezzo schermo */
  const Z = Math.max(1, Math.round(Math.min(view.W / 400, view.H / 225)));
  ctx.setTransform(view.PX * Z, 0, 0, view.PX * Z, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const W = Math.ceil(view.W / Z), H = Math.ceil(view.H / Z);
  const line = LINES[Math.min(cur, LINES.length - 1)];
  if (line.shot !== lastShot) { lastShot = line.shot; shotStart = t; fadeT = t; }
  const tu = t - shotStart;
  if (line.shot === 1) shotSite(W, H, t, tu);
  else if (line.shot === 2) shotBone(W, H, t);
  else if (line.shot === 3) shotMemory(W, H, t, tu, memCreature);
  else if (line.shot === 4) shotGive(W, H, t, tu);
  else shotDawn(W, H, t, tu);
  /* PASSAGGIO a gradini: dal nero si apre a scacchiera che si dirada (niente dissolvenza morbida) */
  const f = (t - fadeT) / 420;
  if (f < 1) {
    const step = Math.floor(f * 4);
    ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const d = ((x >> 1) + (y >> 1) * 2) % 4;
      if (d >= step) ctx.fillRect(x, y, 2, 2);
    }
  }
}

/* una battuta disegnata a comando, per la foto (`npm run shot -- intro … "battuta=3"`): in headless
   requestAnimationFrame non avanza, quindi l'intro vera resterebbe al primo fotogramma */
export function drawIntroLine(i, t) { cur = Math.max(0, Math.min(LINES.length - 1, i)); lastShot = LINES[cur].shot; shotStart = 0; fadeT = -1e9; drawIntro(t); }

export function playIntro(onDone) {
  const finish = () => { active = false; try { removeEventListener('resize', fit); box.remove(); document.body.classList.remove('introing'); } catch (e) { /* ok */ } if (onDone) onDone(); };
  if (typeof document === 'undefined' || !document.createElement) { if (onDone) onDone(); return; }
  active = true; fit(); document.body.classList.add('introing');
  const box = document.createElement('div'); box.id = 'introbox';
  box.innerHTML = `<div class="introbar top"></div><div class="introbar bot"></div>
    <div id="introtap"></div>
    <div id="introdlg"><div id="introname"></div><div id="introtext"></div></div>
    <div id="introhint">▶ ${tr('tocca per continuare', 'tap to continue')}</div>
    <button id="introskip">${tr('Salta ⏭', 'Skip ⏭')}</button>`;
  document.body.appendChild(box);
  const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  cur = 0; lastShot = 0; let ending = false;
  /* la creatura del ricordo: una leggendaria VIVA, costruita a risoluzione 4 (grande, pixel del mondo) */
  import('./render.js').then(r => {
    try { memCreature = r.creatureSprite({ c: { skull: 'abissodonte', torso: 'abissodonte', leg: 'abissodonte', q: 'leggendario' } }, 'side', { res: 4 }); } catch (e) { memCreature = null; }
  }).catch(() => { memCreature = null; });
  const nm = () => (S.name || tr('piccolo', 'little one'));
  const nameEl = box.querySelector('#introname'), textEl = box.querySelector('#introtext');
  let textFull = '';
  function showLine() {
    const l = LINES[cur]; textFull = tr(l.it, l.en).replace(/\{n\}/g, nm()); typed = 0; tStart = now();
    if (nameEl) { nameEl.textContent = l.s === 'G' ? tr('Nonno', 'Grandpa') : (S.name || 'Digsy'); nameEl.style.color = l.s === 'G' ? '#f0c674' : '#8fd0c0'; }
    if (textEl) textEl.textContent = '';
  }
  function endThen() {
    if (ending) return; ending = true;
    for (const id of ['#introtap', '#introskip', '#introhint', '#introdlg']) { const el = box.querySelector(id); if (el) el.style.display = 'none'; }
    setTimeout(() => {
      const end = document.createElement('div'); end.id = 'introend';
      end.innerHTML = `<div class="et">${tr('Qualche anno dopo…', 'A few years later…')}</div>`;
      box.appendChild(end);
      requestAnimationFrame(() => requestAnimationFrame(() => end.classList.add('show')));
      setTimeout(finish, 3200);
    }, 600);
  }
  function next() { if (ending) return; if (typed < textFull.length) { typed = textFull.length; if (textEl) textEl.textContent = textFull; return; } cur++; if (cur >= LINES.length) endThen(); else showLine(); }
  function frame(ts) {
    if (!active) return;
    const t = ts || now();
    if (typed < textFull.length) { typed = Math.min(textFull.length, Math.floor((t - tStart) / 22)); if (textEl) textEl.textContent = textFull.slice(0, typed); }
    drawIntro(t);
    requestAnimationFrame(frame);
  }
  showLine(); requestAnimationFrame(frame);
  box.querySelector('#introtap').onclick = () => next();
  const dlg = box.querySelector('#introdlg'); if (dlg) dlg.onclick = () => next();
  box.querySelector('#introskip').onclick = e => { e.stopPropagation(); finish(); };
}
