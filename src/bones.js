/* Ossa voxel: logica PURA (niente Three.js) — generazione pezzi, socket, limiti, assemblaggio.
   Ogni specie ha varianti deterministiche di cranio/arti/coda; gli arti possono essere
   ossa, PINNE o ALI. I pezzi si ricombinano entro i limiti (chimere strane).
   buildVoxels = scheletro · buildFleshVoxels = versione RIANIMATA (pelle e colori). */
import { spColor } from './data.js';

export const LIMITS = { heads: 3, chest: 1, arms: 6, legs: 4, tails: 3, hornsPerHead: 2 };

/* schiarisci/scurisci un hex (clampato) */
export function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/* varianti per specie: hash intero dell'indice → parametri ben sparpagliati (niente collisioni seriali) */
function ph(n, salt) {
  let x = Math.imul(n + salt * 373, 2654435761); x ^= x >>> 13; x = Math.imul(x, 1597334677); x ^= x >>> 16;
  return x >>> 0;
}
export function partParams(sp) {
  const r = BP[sp.id] || {};
  const size = Math.max(0, Math.min(2, Math.max(...(r.seg || [2])) - 1));
  return {
    plan: 0,
    skull: typeof r.head === 'number' ? r.head : 0,
    limb: r.wings ? 2 : (r.tail === 'fin' ? 1 : 0),
    tail: (r.tail === 'sting' || r.tail === 'club') ? 2 : (r.tail === 'fin' ? 1 : 0),
    size,
    horns: r.horns === undefined ? 1 : Math.min(2, r.horns),
    posture: r.tall ? 1 : ((r.legs && r.legs[0] === 0) || r.float ? 2 : 0),
    neck: r.neck || 0,
    dorsal: r.extra === 'sail' ? 3 : r.extra === 'spikes' ? 1 : 0,
    v1: 0, v2: 0, v3: 0,
  };
}

/* animale base: 1 testa (1-2 corni), 1 petto, 2 braccia, 2 gambe, 1 coda */
export function baseSpec(sp) {
  return { heads: [{ sp, horns: partParams(sp).horns }], chest: sp, arms: [sp, sp], legs: [sp, sp], tails: [sp] };
}

/* applica i limiti: max 3 teste, 1 petto, 6 braccia, 4 gambe, 3 code, 1-2 corni per testa */
export function clampSpec(spec) {
  return {
    heads: (spec.heads || []).slice(0, LIMITS.heads).map(h => ({ sp: h.sp, horns: Math.max(1, Math.min(LIMITS.hornsPerHead, h.horns || 1)) })),
    chest: spec.chest,
    arms: (spec.arms || []).slice(0, LIMITS.arms),
    legs: (spec.legs || []).slice(0, LIMITS.legs),
    tails: (spec.tails || []).slice(0, LIMITS.tails),
  };
}

/* ---------- crani e teste (condivisi) ---------- */
function skullVoxels(sp, horns, nx, ny, nz, out) {
  const pp = partParams(sp), t = pp.skull, sz = pp.size; // il cranio scala con la taglia
  const P = (x, y, z, k) => out.push({ x: nx + x, y: ny + y, z: nz + z, k: k || 'bone' });
  if (t === 0) {        // tozzo e largo
    const w = 3 + sz;
    for (let x = -w; x <= 0; x++) for (let y = 0; y <= 2 + (sz > 1 ? 1 : 0); y++) for (let z = -1; z <= 1; z++) P(x, y, z);
    P(-w - 1, 0, 0); P(-w - 2, 0, 0, 'shade');
    P(-2, 1, -1, 'eye'); P(-2, 1, 1, 'eye');
  } else if (t === 1) { // muso LUNGO (coccodrillo)
    const len = 6 + 2 * sz;
    for (let x = -len; x <= 0; x++) for (let z = -1; z <= 0; z++) { P(x, 0, z); P(x, 1, z, x > -3 ? 'bone' : 'shade'); }
    for (let x = -len; x <= -len + 2; x++) P(x, 2, 0, 'dark'); // narici rialzate
    P(-2, 1, -1, 'eye'); P(-2, 1, 1, 'eye');
  } else if (t === 2) { // becco appuntito
    for (let x = -1; x <= 0; x++) for (let z = -1; z <= 1; z++) { P(x, 0, z); P(x, 1, z); P(x, 2, z, 'shade'); }
    for (let i = 2; i <= 3 + sz; i++) P(-i, i > 3 ? 0 : 1, 0, i > 3 ? 'dark' : 'shade');
    P(-1, 2, -1, 'eye'); P(-1, 2, 1, 'eye');
  } else {              // cupola con cresta a ventaglio
    for (let x = -3; x <= 0; x++) for (let y = 0; y <= 2; y++) for (let z = -1; z <= 1; z++) P(x, y, z);
    for (let i = 0; i <= 2 + sz; i++) P(-i, 3 + Math.min(i, 2), 0, 'shade'); // cresta
    P(-2, 1, -1, 'eye'); P(-2, 1, 1, 'eye');
  }
  const hz = horns === 2 ? [-1, 1] : [0];
  const hlen = 2 + sz;                                        // corni lunghi quanto la taglia
  for (const z of hz) for (let i = 0; i < hlen; i++) P(-1 + Math.floor(i / 2), 3 + i, z, i === hlen - 1 ? 'dark' : 'shade');
}
function fleshHead(sp, horns, nx, ny, nz, out) {
  const pp = partParams(sp), col = spColor[sp.id] || '#c8b078';
  const P = (x, y, z, c) => out.push({ x: nx + x, y: ny + y, z: nz + z, col: c || col });
  const w = pp.skull === 0 ? 3 + pp.size : 3;
  for (let x = -w; x <= 0; x++) for (let y = 0; y <= 2; y++) for (let z = -1; z <= 1; z++) P(x, y, z, y === 2 ? shadeHex(col, 0.85) : col);
  if (pp.skull === 1) { const len = 6 + 2 * pp.size; for (let x = -len; x <= -w; x++) for (let z = -1; z <= 0; z++) { P(x, 0, z); P(x, 1, z, shadeHex(col, 0.9)); } }
  else if (pp.skull === 2) { for (let i = 1; i <= 3 + pp.size; i++) P(-w - i, i > 2 ? 0 : 1, 0, '#e8c34a'); }        // becco
  else if (pp.skull === 3) { for (let i = 0; i <= 2 + pp.size; i++) P(-i, 3 + Math.min(i, 2), 0, shadeHex(col, 0.7)); } // cresta
  P(-1, 1, -2, '#f6f2e4'); P(-1, 1, 2, '#f6f2e4'); P(-2, 1, -2, '#33291f'); P(-2, 1, 2, '#33291f');                  // occhi
  const hz = horns === 2 ? [-1, 1] : [0], hlen = 2 + pp.size;
  for (const z of hz) for (let i = 0; i < hlen; i++) P(-1 + Math.floor(i / 2), 3 + i, z, '#e8e2d0');                 // corni ossei
}

/* ================= BLUEPRINT per specie: 60 ricette curate, ispirate alla natura =================
   seg: raggi dei segmenti del corpo (1=piccolo,2,3=grande) — formiche/vespe = più segmenti
   legs: [numero, lunghezza 0-2] (0 zampe = striscia/fluttua) · wings: [n, 'm'embrana|'f'piume|'i'nsetto]
   head: 0 tozzo · 1 muso lungo · 2 becco · 3 cupola · 'none' (occhi sul corpo)
   mand/ant/prob: mandibole·antenne·proboscide · tail: none|short|long|club|sting|fin
   extra: sail|spikes|shell|hump · float: fluttua · wave: corpo ondulato · tall: eretto */
export const BP = {
  /* PRATI */
  prato: { seg: [2, 2], legs: [4, 1], horns: 2, tail: 'short', head: 0 },
  lepre: { seg: [1, 2], legs: [2, 2], horns: 2, tail: 'short', head: 0, tall: true },
  erbadonte: { seg: [3, 3], legs: [4, 1], horns: 1, tail: 'long', head: 1, neck: 1 },
  rugiadino: { seg: [1], legs: [6, 1], ant: true, tail: 'none', head: 'none' },
  fienotauro: { seg: [3, 2], legs: [4, 1], horns: 2, extra: 'hump', tail: 'short', head: 0 },
  spigacervo: { seg: [2, 2], legs: [4, 2], horns: 2, neck: 2, tail: 'short', head: 0 },
  grillosso: { seg: [1, 2], legs: [6, 2], ant: true, wings: [2, 'i'], tail: 'none', head: 'none' },
  talpaurea: { seg: [2, 3], legs: [4, 0], tail: 'short', head: 1, horns: 0 },
  falcedorso: { seg: [2, 2, 2], legs: [4, 1], extra: 'sail', tail: 'long', head: 2 },
  soleburo: { seg: [3, 3], legs: [2, 2], horns: 2, extra: 'sail', tail: 'long', head: 3, tall: true },
  /* DUNE */
  gastro: { seg: [3], legs: [0], extra: 'shell', ant: true, tail: 'short', head: 'none', wave: true },
  pinna: { seg: [2, 2], legs: [0], tail: 'fin', head: 1, float: true },
  sabbiodonte: { seg: [3, 2], legs: [4, 1], head: 1, tail: 'long', horns: 0 },
  conchigliante: { seg: [3], legs: [4, 0], extra: 'shell', tail: 'short', head: 0, neck: 1 },
  dunavespa: { seg: [1, 1, 2], legs: [6, 1], wings: [4, 'i'], ant: true, tail: 'sting', head: 'none' },
  scorpisabbia: { seg: [2, 2], legs: [8, 1], mand: true, tail: 'sting', head: 'none' },
  miraggiolo: { seg: [2], legs: [0], float: true, tail: 'long', head: 3, horns: 0 },
  cactodonte: { seg: [2, 3], legs: [4, 0], extra: 'spikes', tail: 'club', head: 0 },
  ossidraco: { seg: [2, 2, 2], legs: [2, 1], wings: [2, 'm'], horns: 2, tail: 'long', head: 1, neck: 1 },
  duneterno: { seg: [2, 2, 2, 2, 2], legs: [0], wave: true, extra: 'sail', tail: 'long', head: 1 },
  /* BOSCHI */
  alce: { seg: [3, 2], legs: [4, 2], horns: 2, tail: 'short', head: 1, neck: 1 },
  muschio: { seg: [1, 1, 1, 1], legs: [10, 0], ant: true, wave: true, tail: 'none', head: 'none' },
  corteccino: { seg: [1, 1], legs: [2, 2], ant: true, tail: 'none', head: 3, tall: true },
  fungorso: { seg: [3, 2], legs: [4, 0], extra: 'shell', tail: 'short', head: 0 },
  gufo: { seg: [2], legs: [2, 1], wings: [2, 'f'], head: 2, horns: 2, tail: 'fan' },
  cinervo: { seg: [2, 2], legs: [4, 2], neck: 1, horns: 2, tail: 'long', head: 1, extra: 'spikes' },
  radicante: { seg: [1], legs: [8, 2], ant: true, tail: 'none', head: 'none' },
  brumavolpe: { seg: [2, 1], legs: [4, 1], tail: 'long', head: 1, horns: 0 },
  ramarrospino: { seg: [2, 2, 1], legs: [4, 0], extra: 'spikes', tail: 'long', head: 1 },
  cinerarca: { seg: [2, 3], legs: [2, 2], wings: [4, 'f'], head: 2, tall: true, tail: 'fan' },
  /* TERRE */
  cristallo: { seg: [2, 2], legs: [4, 0], extra: 'spikes', tail: 'long', head: 3 },
  scorpio: { seg: [2, 2], legs: [8, 1], mand: true, tail: 'club', head: 'none' },
  gessolino: { seg: [1], legs: [2, 1], tail: 'short', head: 0, horns: 0 },
  ocralince: { seg: [2, 1], legs: [4, 2], tail: 'long', head: 0 },
  magma: { seg: [3, 3], legs: [4, 1], head: 1, tail: 'club', horns: 1 },
  ferrodonte: { seg: [3, 2], legs: [4, 0], extra: 'shell', tail: 'club', head: 0 },
  bronzotauro: { seg: [3, 3], legs: [4, 1], horns: 2, extra: 'hump', tail: 'short', head: 0 },
  lavalupo: { seg: [2, 2], legs: [4, 2], tail: 'long', head: 1, horns: 0 },
  vulcanide: { seg: [1, 2], legs: [2, 1], wings: [2, 'm'], tail: 'sting', head: 3, tall: true },
  magmarex: { seg: [3, 3], legs: [2, 2], horns: 1, tail: 'long', head: 1, tall: true, mand: true },
  /* PALUDE */
  fangodonte: { seg: [3, 3], legs: [4, 0], head: 1, tail: 'short', horns: 0 },
  girinosso: { seg: [2], legs: [0], tail: 'fin', head: 'none', float: true },
  limosalta: { seg: [2], legs: [4, 2], tail: 'none', head: 0, horns: 0 },
  salicervo: { seg: [2, 2], legs: [4, 1], horns: 2, neck: 1, tail: 'long', head: 3, extra: 'hump' },
  ninfeasauro: { seg: [2, 3], legs: [0], neck: 2, tail: 'fin', head: 1, float: true },
  torbalupo: { seg: [2, 2], legs: [4, 1], tail: 'long', head: 1, extra: 'hump' },
  zanzarone: { seg: [1, 1], legs: [6, 2], wings: [2, 'i'], prob: true, tail: 'none', head: 'none' },
  melmalince: { seg: [2, 1], legs: [4, 2], tail: 'short', head: 0, extra: 'spikes' },
  brontorana: { seg: [3], legs: [4, 1], tail: 'none', head: 0, horns: 0, extra: 'hump' },
  pantanarca: { seg: [2, 2, 2, 2], legs: [0], wave: true, ant: true, tail: 'sting', head: 1 },
  /* GHIACCI */
  gelodonte: { seg: [3, 3], legs: [4, 1], head: 0, tail: 'short', extra: 'spikes' },
  brinalepre: { seg: [1, 1], legs: [2, 2], horns: 2, tail: 'short', head: 0, tall: true },
  nevosauro: { seg: [2, 2, 2], legs: [4, 1], extra: 'sail', tail: 'long', head: 3 },
  slavinotto: { seg: [2], legs: [4, 0], tail: 'short', head: 0, horns: 0 },
  ghiacciolupo: { seg: [2, 2], legs: [4, 2], tail: 'long', head: 1, horns: 0, extra: 'spikes' },
  boreacervo: { seg: [2, 2], legs: [4, 2], horns: 2, neck: 2, tail: 'fan', head: 1 },
  cristalgufo: { seg: [2], legs: [2, 1], wings: [2, 'f'], head: 2, horns: 1, tail: 'fan' },
  permafrosso: { seg: [3], legs: [4, 0], extra: 'shell', tail: 'club', head: 0 },
  auroralce: { seg: [3, 2], legs: [4, 2], horns: 2, extra: 'sail', tail: 'short', head: 1, neck: 1 },
  eternoglacio: { seg: [2, 2, 3], legs: [0], float: true, ant: true, tail: 'fin', head: 3, horns: 2 },
};

/* ================= assemblatore: UNA pipeline per scheletro e carne =================
   REGOLA D'ORO: ogni pezzo si RACCORDA — segmenti sovrapposti di 1, giunzioni esplicite
   per collo/zampe/ali/code. Le chimere restano sempre attaccate. */
function segRing(cx, cy, cz, r, mode, colT, out) {
  if (mode === 'skel') {
    for (let a = -r; a <= r; a++) {
      const rr = Math.round(Math.sqrt(Math.max(0, r * r - a * a)));
      out.push({ x: cx + a, y: cy + rr, z: cz, k: 'bone' });                // dorso
      out.push({ x: cx + a, y: cy - rr, z: cz, k: 'shade' });               // ventre
      if (rr > 0 && (a + r) % 2 === 0) for (let t = 45; t < 360; t += 45) { // costole ogni 2
        const y = cy + Math.round(Math.cos(t * Math.PI / 180) * rr);
        const z = cz + Math.round(Math.sin(t * Math.PI / 180) * rr);
        out.push({ x: cx + a, y, z, k: 'shade' });
      }
    }
  } else {
    for (let a = -r; a <= r; a++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++)
      if (a * a + dy * dy + dz * dz <= r * r + 1)
        out.push({ x: cx + a, y: cy + dy, z: cz + dz, col: dy === r ? shadeHex(colT, 0.8) : dy === -r ? shadeHex(colT, 1.18) : colT });
  }
}
function legVox(lx, cy, cz, sr, side, len, mode, colT, out) {
  const P = (x, y, z, k) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: shadeHex(colT, k === 'dark' ? 0.7 : 0.88) });
  if (len >= 2) { // ZAMPONA ad arco (ragno/zanzara): esce dal fianco, sale, poi scende
    let z = cz + side * sr;
    P(lx, cy, z, 'bone'); // anca sul fianco
    for (let j = 1; j <= 2; j++) { z = cz + side * (sr + j); P(lx, cy + j, z, 'bone'); }
    P(lx, cy + 2, z, 'dark');
    for (let y = cy + 1; y >= 0; y--) P(lx, y, z, y % 2 ? 'shade' : 'bone');
  } else {
    const attachY = cy - sr, zz = cz + side;
    P(lx, attachY, cz, 'bone'); // giunzione al ventre
    for (let y = attachY; y >= 0; y--) { P(lx, y, zz, y === Math.floor(attachY / 2) ? 'dark' : 'bone'); if (mode === 'flesh') P(lx + 1, y, zz, 'shade'); }
    P(lx + 1, 0, zz, 'shade');
  }
}
function wingVox(x0, topY, n, type, mode, colT, out) {
  const P = (x, y, z, k, cmul) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: shadeHex(colT, cmul || 1.12) });
  const pairs = Math.max(1, Math.round(n / 2));
  for (let w = 0; w < pairs; w++) for (const dir of [-1, 1]) {
    const wx = x0 + w * 3, span = 5 - w;
    P(wx, topY, dir, 'bone', 1);                    // radice dell'ala sul dorso
    for (let i = 1; i <= span; i++) {
      const y = topY + Math.min(3, i);
      if (type === 'i') { // ala da insetto: ovale sottile
        P(wx, topY + 1, dir * i, i === span ? 'dark' : 'shade', 1.3);
        if (i > 1 && i < span) P(wx + 1, topY + 1, dir * i, 'shade', 1.3);
      } else if (type === 'f') { // piume
        for (let j = 0; j <= 1 + (i % 2); j++) P(wx + j, y - j, dir * i, j ? 'shade' : 'bone', j % 2 ? 0.9 : 1.12);
      } else { // membrana
        P(wx, y, dir * i, 'bone', 1);
        for (let j = 1; j <= 2; j++) P(wx + j, y - Math.floor(j / 2), dir * i, 'shade', 1.12);
      }
    }
  }
}
function tailVox(x0, y0, kind, mode, colT, out) {
  const P = (x, y, z, k) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: k === 'dark' ? shadeHex(colT, 0.6) : colT });
  if (kind === 'none') return;
  if (kind === 'fin') { P(x0, y0, 0, 'bone'); for (let j = -3; j <= 3; j++) { P(x0 + 1, y0 + j, 0, 'bone'); P(x0 + 2, y0 + j, 0, Math.abs(j) > 1 ? 'dark' : 'shade'); } return; }
  if (kind === 'fan') { P(x0, y0, 0, 'bone'); for (let j = -2; j <= 2; j++) for (let i = 1; i <= 2; i++) P(x0 + i, y0 + Math.round(j * i / 2), 0, i === 2 ? 'shade' : 'bone'); return; }
  if (kind === 'sting') { // pungiglione da scorpione: si arriccia in ALTO
    const pts = [[0, 0], [1, 1], [2, 2], [3, 3], [3, 4], [2, 5]];
    pts.forEach(([dx, dy]) => P(x0 + dx, y0 + dy, 0, 'bone'));
    P(x0 + 1, y0 + 5, 0, 'dark'); P(x0 + 1, y0 + 6, 0, 'dark');
    return;
  }
  const len = kind === 'short' ? 3 : 6;
  for (let i = 0; i < len; i++) P(x0 + i, y0 - Math.floor(i / 2), 0, i > len - 2 ? 'shade' : 'bone');
  if (kind === 'club') { // mazza chiodata
    const bx = x0 + len - 1, by = y0 - Math.floor((len - 1) / 2);
    for (let dx = 0; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) P(bx + dx, by + dy, 0, 'shade');
    P(bx + 1, by + 2, 0, 'dark'); P(bx + 3, by, 0, 'dark'); P(bx + 1, by - 2, 0, 'dark');
  }
}
function extraVox(r, segsX, topYs, kind, mode, colT, out) {
  const P = (x, y, z, k) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: k === 'dark' ? shadeHex(colT, 0.6) : shadeHex(colT, 0.75) });
  if (kind === 'sail') segsX.forEach((sx, i) => { for (let y = 0; y <= 2 + (i === Math.floor(segsX.length / 2) ? 1 : 0); y++) P(sx, topYs[i] + y, 0, y > 1 ? 'dark' : 'shade'); });
  else if (kind === 'spikes') segsX.forEach((sx, i) => { P(sx, topYs[i], 0, 'shade'); P(sx, topYs[i] + 1, 0, 'dark'); P(sx - 1, topYs[i], 1, 'dark'); P(sx + 1, topYs[i], -1, 'dark'); });
  else if (kind === 'hump') { const sx = segsX[0]; for (let dx = -1; dx <= 1; dx++) P(sx + dx, topYs[0], 0, 'shade'); P(sx, topYs[0] + 1, 0, 'shade'); }
  else if (kind === 'shell') { // guscio a cupola, appoggiato sul dorso
    const R = r + 1, sx = segsX[0];
    for (let a = 0; a <= R; a++) {
      const rr = Math.round(Math.sqrt(Math.max(0, R * R - a * a)));
      for (let t = 0; t < 360; t += 30) {
        const x = sx + Math.round(Math.cos(t * Math.PI / 180) * rr), z = Math.round(Math.sin(t * Math.PI / 180) * rr);
        if (mode === 'skel') out.push({ x, y: topYs[0] - 1 + a, z, k: a % 2 ? 'shade' : 'bone' });
        else for (let fx = -rr; fx <= rr; fx++) for (let fz = -rr; fz <= rr; fz++) { if (fx * fx + fz * fz <= rr * rr) out.push({ x: sx + fx, y: topYs[0] - 1 + a, z: fz, col: (fx + fz) % 3 === 0 ? shadeHex(colT, 0.7) : shadeHex(colT, 0.85) }); }
      }
    }
  }
}
function headExtras(r, hx, hy, mode, colT, out) {
  const P = (x, y, z, k) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: k === 'dark' ? shadeHex(colT, 0.6) : colT });
  if (r.mand) { for (const dz of [-1, 1]) { P(hx - 1, hy, dz * 2, 'bone'); P(hx - 2, hy, dz * 2, 'bone'); P(hx - 3, hy, dz, 'dark'); P(hx - 1, hy, dz, 'bone'); } }
  if (r.ant) { for (const dz of [-1, 1]) { P(hx - 1, hy + 3, dz, 'shade'); P(hx - 2, hy + 4, dz, 'shade'); P(hx - 3, hy + 5, dz, 'dark'); } }
  if (r.prob) { for (let i = 1; i <= 5; i++) P(hx - i, hy - Math.floor(i / 2), 0, i === 5 ? 'dark' : 'shade'); }
}

function buildFromRecipe(spec, mode) {
  const out = [];
  const chest = spec.chest;
  const r = BP[chest.id] || { seg: [2, 2], legs: [4, 1], tail: 'short', head: 0 };
  const colT = spColor[chest.id] || '#c8b078';
  const segs = r.seg || [2];
  const maxR = Math.max(...segs);
  const legDef = r.legs || [4, 1];
  const isBase = spec.heads.length === 1 && spec.heads[0].sp.id === chest.id &&
    spec.legs.every(l => l.id === chest.id) && spec.arms.every(a => a.id === chest.id) &&
    spec.tails.length === 1 && spec.tails[0].id === chest.id;
  const nLegs = isBase ? legDef[0] : (legDef[0] === 0 ? 0 : Math.max(2, spec.legs.length * 2));
  const legLen = legDef[1] || 0;
  const baseY = r.float ? 6 : (nLegs > 0 ? (legLen >= 2 ? 5 : 2 + legLen * 2) : 1);
  /* segmenti SOVRAPPOSTI di 1 → corpo sempre connesso; onda opzionale */
  const segsX = [], segCys = [], segCzs = [], topYs = [];
  let prevCx = null, prevR = 0;
  segs.forEach((sr, i) => {
    const cx = prevCx === null ? sr : prevCx + prevR + sr - 1;
    const cz = r.wave ? Math.round(Math.sin(i * 1.4) * 2) : 0;
    const cy = baseY + maxR + (r.tall ? Math.round((segs.length - 1 - i) * 1.5) : 0);
    segRing(cx, cy, cz, sr, mode, colT, out);
    if (i > 0 && (r.wave || r.tall)) { // giunzione esplicita tra segmenti spostati
      const px2 = prevCx + prevR;
      out.push(mode === 'skel' ? { x: px2, y: (segCys[i - 1] + cy) >> 1, z: (segCzs[i - 1] + cz) >> 1, k: 'bone' }
        : { x: px2, y: (segCys[i - 1] + cy) >> 1, z: (segCzs[i - 1] + cz) >> 1, col: colT });
    }
    segsX.push(cx); segCys.push(cy); segCzs.push(cz); topYs.push(cy + sr);
    prevCx = cx; prevR = sr;
  });
  const frontX = segsX[0] - segs[0], backX = segsX[segsX.length - 1] + segs[segs.length - 1];
  /* zampe distribuite sotto i segmenti (con giunzione all'anca) */
  if (nLegs > 0) {
    const pairs = Math.round(nLegs / 2);
    for (let i = 0; i < pairs; i++) {
      const si = Math.min(segs.length - 1, Math.floor(i * segs.length / pairs));
      const lx = segsX[si] - 1 + (i % 2) * 2;
      for (const side of [-1, 1]) legVox(lx, segCys[si], segCzs[si], segs[si], side, legLen, mode, colT, out);
    }
  } else if (!r.float) { // striscia: spuntoni ventrali attaccati al ventre
    segsX.forEach((sx, i) => out.push(mode === 'skel' ? { x: sx, y: Math.max(0, segCys[i] - segs[i]), z: segCzs[i], k: 'shade' } : { x: sx, y: Math.max(0, segCys[i] - segs[i]), z: segCzs[i], col: shadeHex(colT, 0.8) }));
  }
  /* ali (dal blueprint o, per chimere, dalle braccia alate) */
  let wings = isBase ? r.wings : null;
  if (!isBase) {
    const wsp = spec.arms.find(a => (BP[a.id] || {}).wings);
    if (wsp) wings = [Math.min(4, Math.max(2, spec.arms.length)), BP[wsp.id].wings[1]];
  }
  if (wings) wingVox(segsX[0], topYs[0], wings[0], wings[1], mode, colT, out);
  /* collo + teste (ogni testa con lo stile della SUA specie), raccordati */
  const neck = r.neck || 0;
  let nx = frontX, ny = segCys[0];
  for (let i = 1; i <= neck * 2; i++) {
    nx = frontX - Math.ceil(i / 2); ny = segCys[0] + i;
    out.push(mode === 'skel' ? { x: nx, y: ny, z: 0, k: 'bone' } : { x: nx, y: ny, z: 0, col: colT });
    if (mode === 'flesh') for (const dz of [-1, 1]) out.push({ x: nx, y: ny, z: dz, col: colT });
  }
  if (r.head === 'none' && isBase) { // occhi sul davanti del corpo
    const push = (x, y, z) => out.push(mode === 'skel' ? { x, y, z, k: 'eye' } : { x, y, z, col: '#33291f' });
    push(frontX + 1, segCys[0] + 1, -1); push(frontX + 1, segCys[0] + 1, 1);
    headExtras(r, frontX + 1, segCys[0], mode, colT, out);
  } else {
    const hx = nx - 1, hy = Math.max(1, ny);
    const hz = spec.heads.length === 1 ? [0] : spec.heads.length === 2 ? [-2, 2] : [-3, 0, 3];
    spec.heads.forEach((h, i) => {
      if (mode === 'skel') skullVoxels(h.sp, h.horns, hx, hy, hz[i], out);
      else fleshHead(h.sp, h.horns, hx, hy, hz[i], out);
      if (hz[i]) out.push(mode === 'skel' ? { x: hx, y: hy, z: hz[i] > 0 ? hz[i] - 1 : hz[i] + 1, k: 'bone' } : { x: hx, y: hy, z: hz[i] > 0 ? hz[i] - 1 : hz[i] + 1, col: colT }); // giunzione teste laterali
    });
    headExtras(r, hx, hy, mode, colT, out);
  }
  /* code: parte DENTRO la superficie posteriore (x0=backX-1) → sempre raccordate */
  const tls = isBase ? [chest] : spec.tails;
  const tzs = tls.length === 1 ? [0] : tls.length === 2 ? [-1, 1] : [-2, 0, 2];
  tls.forEach((tsp, i) => {
    const kind0 = (BP[tsp.id] || {}).tail || r.tail || 'short';
    const kind = (kind0 === 'none' && !isBase) ? 'short' : kind0;
    const colX = spColor[tsp.id] || colT;
    const before = out.length;
    tailVox(backX - 1, segCys[segCys.length - 1], kind, mode, colX, out);
    if (tzs[i]) for (let k2 = before; k2 < out.length; k2++) out[k2].z += tzs[i];
  });
  if (r.extra) extraVox(maxR, segsX, topYs, r.extra, mode, colT, out);
  const seen = new Set(), ded = [];
  for (const v of out) { const k = v.x + ',' + v.y + ',' + v.z; if (!seen.has(k)) { seen.add(k); ded.push(v); } }
  return ded;
}

export function buildVoxels(rawSpec) { return buildFromRecipe(clampSpec(rawSpec), 'skel'); }
export function buildFleshVoxels(rawSpec) { return buildFromRecipe(clampSpec(rawSpec), 'flesh'); }
