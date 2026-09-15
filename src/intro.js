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
  { s: 'G', it: 'Piano con la pala… eccolo. È l\'osso di una creatura vissuta tantissimo tempo fa.', en: 'Gently with the spade… there it is. The bone of a creature that lived a very long time ago.', shot: 2 },
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
const NIGHT_TREE = ['#1a2230', '#222c3c', '#2a3648', '#324054', '#3a4a60', '#141a26'];
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
/* LO SFONDO DEL CAMPO — cielo, colline, alberi, prato e la tenda col baule e la lanterna.
   Lo usano la PRIMA e la SECONDA inquadratura: è lo stesso posto, visto da più vicino. Prima la
   seconda scena aveva un fondo tutto suo e sembrava un altro mondo (segnalato). */
function campBack(W, H, t, gy, night) {
  if (night) {
    sky(W, H, ['#0e0f28', '#151a3c', '#1e2650', '#28325e', '#333d6a'], gy);
    for (let i = 0; i < 70; i++) { const x = hash(i, 11) * W, y = hash(i, 12) * gy * 0.92; if (Math.floor(t / 500 + i) % 6) px(x, y, 1, 1, i % 4 ? '#cfc8ff' : '#fff6c8'); }
    sun(Math.round(W * 0.74), Math.round(gy * 0.36), 12, '#efe6c8', 'rgba(239,230,200,.10)');
    px(Math.round(W * 0.74) + 3, Math.round(gy * 0.36) - 5, 4, 3, '#d6cba8');
  } else {
    sky(W, H, ['#4a3a6e', '#7a4a78', '#b55a6a', '#e07a52', '#f2a55a', '#f7c878'], gy);   // il cielo arriva fino al prato: niente striscia nera
    sun(Math.round(W * 0.7), Math.round(gy * 0.72), 14, '#ffe09a', 'rgba(255,226,150,.25)');
    for (let i = 0; i < 4; i++) { const cx = ((i * 97 + t / 120) % (W + 60)) - 30; px(cx, 12 + i * 9, 26, 3, '#f6b08a'); px(cx + 6, 10 + i * 9, 14, 2, '#f8c8a2'); }
  }
  hills(W, H, Math.round(gy - 26), 6, 0.035, night ? '#241e44' : '#6a4a7a', 1.3, night ? '#302852' : '#7e5a8c');
  hills(W, H, Math.round(gy - 13), 5, 0.05, night ? '#1b2038' : '#3e4a5a', 4.1, night ? '#262c4c' : '#4c5a6a');
  for (const [fx, v] of [[0.08, 1], [0.86, 4], [0.95, 2]]) tree(W * fx, gy + 2, v, night ? NIGHT_TREE : DUSK_TREE, t);
  grass(W, H, gy, night ? ['#24352a', '#2e4434', '#1c2a22'] : ['#4a6a3a', '#6a8a4a', '#3a5a2e'], t);
  const tx = Math.round(W * 0.18);
  for (let y = 0; y < 24; y++) { const w = Math.round(y * 0.9); px(tx - w, gy - 24 + y, w * 2, 1, y < 2 ? '#e8d6a8' : '#c9b07a'); px(tx - w, gy - 24 + y, 2, 1, '#8a7048'); }
  px(tx - 3, gy - 14, 6, 14, '#3a2a1a');
  px(tx + 26, gy - 8, 12, 8, '#8a5f38'); px(tx + 26, gy - 8, 12, 2, '#b07c4a'); px(tx + 31, gy - 8, 2, 8, '#5c4229');
  const fl = Math.floor(t / 200) % 2, lx = tx + 46;
  px(lx, gy - 26, 2, 26, '#5c4229'); px(lx + 2, gy - 26, 1, 26, '#3e2c1c');
  px(lx, gy - 26, 9, 2, '#5c4229'); px(lx + 7, gy - 24, 1, 2, '#2a1f14');
  px(lx + 1, gy, 15, 1, '#8a9a52'); px(lx + 3, gy + 1, 11, 1, '#7a8a4a');
  px(lx + 5, gy - 22, 6, 1, '#2a1f14'); px(lx + 5, gy - 21, 6, 6, '#2a1f14'); px(lx + 5, gy - 15, 6, 1, '#2a1f14');
  px(lx + 6, gy - 20, 4, 4, fl ? '#ffd27a' : '#ffe9a8'); px(lx + 7, gy - 19, 2, 2, '#fff6d8');
}
function shotSite(W, H, t, tu) {
  const gy = Math.round(H * 0.62);
  campBack(W, H, t, gy);
  for (let x = 0; x < 50; x++) { const h = Math.round(Math.sin(x / 50 * Math.PI) * 9); px(W * 0.5 + x, gy - h, 1, h, x % 7 ? '#8a6440' : '#6b4a2e'); }   // cumulo di terra
  const gx = Math.round(W * 0.46);
  shadowAt(gx, gy, 14); hero(GRANDPA, gx, gy, 'right', 0);
  const arrive = Math.min(1, tu / 1800), dx = Math.round(W + 20 - (W + 20 - W * 0.62) * (1 - (1 - arrive) ** 2));
  shadowAt(dx, gy, 12); hero(null, dx, gy - (arrive < 1 ? Math.abs(Math.sin(t / 90)) * 2 : 0), 'left', arrive < 1 ? Math.floor(t / 120) % 2 : 0);
}
/* SECONDA INQUADRATURA — lo STESSO campo della prima, visto da vicino: i due chinati su una buca
   scavata nel prato, e dentro il cranio. La buca ha il bordo di zolla erbosa e una forma
   irregolare: uno scavo non è un ovale perfetto. */
const HIT = 1000;
/* raggio della buca a un dato angolo: un ovale sgualcito, sempre uguale (niente random a ogni
   fotogramma, o la buca tremerebbe) */
function pitR(ang, rx, ry) {
  const w = 1 + Math.sin(ang * 3 + 0.7) * 0.09 + Math.sin(ang * 5 + 2.1) * 0.06 + Math.sin(ang * 2 - 1.2) * 0.05;
  return { x: rx * w, y: ry * w };
}
function pitFill(cx, cy, rx, ry, col) {
  for (let y = -ry - 4; y <= ry + 4; y++) for (let x = -rx - 6; x <= rx + 6; x++) {
    const ang = Math.atan2(y, x), r = pitR(ang, rx, ry);
    if ((x * x) / (r.x * r.x) + (y * y) / (r.y * r.y) > 1) continue;
    px(cx + x, cy + y, 1, 1, typeof col === 'function' ? col(x, y) : col);
  }
}
/* IL FOSSILE nella buca, in piccolo (46 × 16). Il cranio della schermata del titolo è largo
   110 px: dentro la buca riempiva tutto e sembrava un pesce in una vasca. */
function miniSkull(x, y) {
  const OUTC = '#3a2f20', B1 = '#efe4c8', B2 = '#d9c9a4', B3 = '#b7a682';
  const dot = (dx, dy, c) => px(x + dx, y + dy, 1, 1, c);
  for (let dy = 0; dy < 16; dy++) for (let dx = 0; dx < 46; dx++) {
    const cran = ((dx - 13) / 14) ** 2 + ((dy - 8) / 7.5) ** 2 <= 1;
    const snout = dx >= 22 && dx <= 44 && dy >= 5 + (dx - 22) * 0.12 && dy <= 13 - (dx - 22) * 0.06;
    if (!cran && !snout) continue;
    const top = dy <= 3, bot = dy >= 12;
    dot(dx, dy, top ? B1 : bot ? B3 : B2);
  }
  for (let dy = -1; dy < 17; dy++) for (let dx = -1; dx < 47; dx++) {   // contorno
    const inside = (ddx, ddy) => {
      const cran = ((ddx - 13) / 14) ** 2 + ((ddy - 8) / 7.5) ** 2 <= 1;
      const snout = ddx >= 22 && ddx <= 44 && ddy >= 5 + (ddx - 22) * 0.12 && ddy <= 13 - (ddx - 22) * 0.06;
      return cran || snout;
    };
    if (inside(dx, dy)) continue;
    if (inside(dx + 1, dy) || inside(dx - 1, dy) || inside(dx, dy + 1) || inside(dx, dy - 1)) dot(dx, dy, OUTC);
  }
  for (let dy = 4; dy <= 9; dy++) for (let dx = 7; dx <= 13; dx++) if (((dx - 10) / 3.2) ** 2 + ((dy - 6.5) / 2.8) ** 2 <= 1) dot(dx, dy, '#2a2118');   // occhiaia
  dot(30, 8, '#2a2118'); dot(31, 8, '#2a2118');                                    // narice
  for (let i = 0; i < 6; i++) { px(x + 24 + i * 3, y + 12, 2, 3, B1); px(x + 24 + i * 3, y + 14, 2, 1, OUTC); }   // denti
}
function shotBone(W, H, t, tu) {
  const gy = Math.round(H * 0.42);
  campBack(W, H, t, gy);
  const cx = Math.round(W / 2), cy = Math.round(H * 0.56), rx = 64, ry = 22;   // più larga del cranio: il fondo scuro si vede tutt'intorno
  /* due mucchietti di terra buttata fuori, ai lati della buca */
  for (const mx of [cx - rx - 12, cx + rx + 10]) for (let x = -14; x <= 14; x++) { const h = Math.round(Math.cos(x / 14 * 1.5) * 8); if (h > 0) px(mx + x, cy - ry - h + 4, 1, h + 3, (x + h) % 5 ? '#7a5634' : '#8a6440'); }
  pitFill(cx, cy, rx + 3, ry + 3, (x, y) => (y < -1 ? '#3a5a2e' : '#4a6a3a'));            // zolla erbosa del bordo
  pitFill(cx, cy, rx, ry, (x, y) => {
    const k = (y + ry) / (2 * ry);
    return k < 0.22 ? '#2e1e12' : k < 0.5 ? '#4a3120' : k < 0.8 ? '#6b4a2e' : '#8a6440';
  });
  for (let i = 0; i < 14; i++) px(cx - rx + hash(i, 5) * rx * 2, cy - ry + 2 + hash(i, 6) * ry, 2, 1, '#3a2616');
  const sx = cx - 23, sy = cy - 4, hit = tu >= HIT, scoperto = hit ? 15 : 6;   // quanto ne emerge dalla terra
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 2, sy - 1, 50, scoperto); ctx.clip();
  miniSkull(sx, sy);
  ctx.restore();
  for (let x = -26; x <= 26; x += 2) px(cx + x, sy + scoperto - 1, 2, 2, (x % 6) ? '#6b4a2e' : '#5a3c24');   // la terra che ancora lo copre
  if (hit) {
    const a2 = Math.min(1, (tu - HIT) / 900);
    for (let i = 0; i < 10; i++) {
      const dir = i % 2 ? 1 : -1, sp = 14 + hash(i, 13) * 26;
      const zx = cx + dir * sp * a2 * 1.6, zy = sy - 24 * a2 + 56 * a2 * a2;
      if (zy < cy + ry) px(zx, zy, 3 - (i % 2), 3 - (i % 2), i % 3 ? '#6b4a2e' : '#8a6440');
    }
    for (let i = 0; i < 12; i++) { const d = (a2 * 1.3 + i / 12) % 1; px(cx - 30 + hash(i, 14) * 60, sy - d * 16, 1, 1, `rgba(214,190,150,${(1 - d).toFixed(2)})`); }
    if (a2 < 0.35) sparkle(cx + 4, sy + 2, '#fff6c8');
  }
  const gx = cx - rx + 2, dx = cx + rx - 2, hy = cy - ry - 3;
  shadowAt(gx, hy, 14); shadowAt(dx, hy, 12);
  hero(GRANDPA, gx, hy, 'right', 0, 'strike');            // il nonno indica e guida
  hero(null, dx, hy, 'left', 0, 'strike');                // il piccolo scava: la pala è SUA
  /* LA PALA NELLE MANI DEL PICCOLO — è lui che scava (il nonno gli dice "piano con la pala").
     Lunghezza FISSA: due pose, alzata e affondata nella terra; niente manico interpolato che si
     allunga mentre scende. */
  const hxk = dx - 11, hyk = hy - 13;   // la mano del piccolo nella posa 'strike'
  const ang = hit ? 2.5 : 2.2;                             // radianti: 0 = a destra, cresce in giù
  const L = 36, ex = Math.round(hxk + Math.cos(ang) * L), ey = Math.round(hyk + Math.sin(ang) * L);
  for (let i = 0; i <= L; i++) {                           // manico
    const mx = Math.round(hxk + Math.cos(ang) * i), my = Math.round(hyk + Math.sin(ang) * i);
    px(mx, my, 3, 3, '#6e4a2a'); px(mx, my, 2, 2, '#8a5f38');
  }
  px(ex - 8, ey - 2, 16, 11, '#2a2b2e');                   // lama col contorno
  px(ex - 7, ey - 1, 14, 9, '#b9c2c9'); px(ex - 6, ey, 4, 6, '#d8dee3'); px(ex + 3, ey - 1, 3, 9, '#8f9aa3');
  if (hit) { px(ex - 7, ey + 6, 14, 4, '#6b4a2e'); px(ex - 5, ey + 7, 9, 2, '#8a6440'); }   // terra sulla lama
}
/* TERZA INQUADRATURA — "ho sempre sognato di vederne una viva". Lo STESSO campo, di notte: il
   nonno sta in piedi accanto al fuoco col fossile appena trovato ai suoi piedi, e nel cielo passa
   la creatura che sogna, trasparente come un pensiero. Prima c'era uno scheletro gigante a terra
   e la creatura fuori dall'inquadratura: non si capiva cosa fosse (segnalato). */
function shotMemory(W, H, t, tu, creature) {
  const gy = Math.round(H * 0.62);
  campBack(W, H, t, gy, true);
  /* IL SOGNO nel cielo: la creatura viva, trasparente, attraversa lenta sopra le colline */
  if (creature) {
    const k = ((tu / 11000) % 1), cx = Math.round(-creature.width + (W + creature.width * 2) * k);
    const cy = Math.round(gy * 0.3 + Math.sin(t / 900) * 4);
    ctx.save(); ctx.globalAlpha = 0.34;
    ctx.translate(cx + creature.width, cy); ctx.scale(-1, 1); ctx.drawImage(creature, 0, 0);
    ctx.restore();
    for (let i = 0; i < 6; i++) { const sx2 = cx + (i * 37) % creature.width, sy2 = cy + (i * 23) % creature.height; if (Math.floor(t / 300 + i) % 3 === 0) sparkle(sx2, sy2, '#cfd6ff'); }
  }
  /* il fuoco del campo */
  const fx = Math.round(W * 0.42), fl = Math.floor(t / 160) % 2;
  /* la luce del fuoco si vede DOVE CADE, sull'erba: un alone tondo semitrasparente sul buio
     diventa un disco grigio */
  for (let i = 0; i < 3; i++) px(fx - 18 + i * 2, gy + i, 36 - i * 4, 1, i ? '#3c4a30' : '#4a5a36');
  for (let i = 0; i < 5; i++) px(fx - 6 + i * 3, gy - 2, 3, 3, i % 2 ? '#5c4229' : '#3e2c1c');          // legna
  px(fx - 2, gy - 8, 5, 6, '#e8873a'); px(fx - 1, gy - 10 - fl, 3, 8, '#f6b34a'); px(fx, gy - 11 - fl, 1, 5, '#ffe9a8');
  for (let i = 0; i < 4; i++) { const a2 = (t / 700 + i / 4) % 1; px(fx + Math.sin(t / 300 + i) * 3, gy - 12 - a2 * 18, 1, 1, `rgba(255,190,120,${(1 - a2).toFixed(2)})`); }
  /* il fossile appena trovato, posato accanto al fuoco */
  miniSkull(fx + 22, gy - 14);
  /* il nonno, in piedi, guarda in alto: dal fossile al cielo */
  const gx = Math.round(W * 0.34);
  shadowAt(gx, gy, 14); hero(GRANDPA, gx, gy, 'right', 0, 'lift');
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
  else if (line.shot === 2) shotBone(W, H, t, tu);
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
let frozen = false, frozenT = 0;
export function drawIntroLine(i, t) { frozen = true; frozenT = t; cur = Math.max(0, Math.min(LINES.length - 1, i)); lastShot = LINES[cur].shot; shotStart = 0; fadeT = -1e9; drawIntro(t); }

export function playIntro(onDone) {
  const finish = () => { active = false; try { removeEventListener('resize', fit); box.remove(); document.body.classList.remove('introing'); } catch (e) { /* ok */ } if (onDone) onDone(); };
  if (typeof document === 'undefined' || !document.createElement) { if (onDone) onDone(); return; }
  active = true; frozen = false; fit(); document.body.classList.add('introing');
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
    drawIntro(frozen ? frozenT : t);   // foto: drawIntroLine congela il quadro sul momento chiesto
    requestAnimationFrame(frame);
  }
  showLine(); requestAnimationFrame(frame);
  box.querySelector('#introtap').onclick = () => next();
  const dlg = box.querySelector('#introdlg'); if (dlg) dlg.onclick = () => next();
  box.querySelector('#introskip').onclick = e => { e.stopPropagation(); finish(); };
}
