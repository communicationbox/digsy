/* Ossa voxel: logica PURA (niente Three.js) — generazione pezzi, socket, limiti, assemblaggio.
   Ogni specie ha varianti deterministiche di cranio/arti/coda; gli arti possono essere
   ossa, PINNE o ALI. I pezzi si ricombinano entro i limiti (chimere strane).
   buildVoxels = scheletro · buildFleshVoxels = versione RISVEGLIATA (pelle e colori). */
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
function mixHex(a, b, k) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const m = sh => Math.round(((A >> sh) & 255) * (1 - k) + ((B >> sh) & 255) * k);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
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

/* ---------- RISOLUZIONE DEL MODELLO ----------
   I blueprint (BP) restano scritti in unità DI RICETTA: raggio 2 = corpo medio, zampa lunga
   2, coda corta, e così via. Il modello però si costruisce a risoluzione DOPPIA: ogni unità
   di ricetta vale `R` voxel.
   Serve perché il mondo è disegnato nativamente a 32px, mentre le creature venivano proiettate
   a 2 pixel fisici per voxel: erano l'unica cosa del gioco coi pixel grossi il doppio
   (segnalato con foto). Raddoppiare la griglia non è un ingrandimento — le sezioni tonde
   (corpo, teste, gusci, corni) vengono rasterizzate a raggio doppio, quindi sono davvero più
   tonde, e gli arti possono assottigliarsi verso la punta invece di essere bastoncini da un
   voxel. Chi disegna qui ragiona in voxel fini; chi scrive un blueprint continua a ragionare
   in unità intere. */
export let R = 2;
const U = n => Math.round(n * R);
/* risoluzione per UNA costruzione (opts.res): la cavalcatura si costruisce a 4, così è grande il
   doppio con i pixel della stessa misura del mondo. Tutto il resto resta a 2. */
function atRes(opts, fn) {
  const res = opts && opts.res; if (!res || res === R) return fn();
  const prev = R; R = res;
  try { return fn(); } finally { R = prev; }
}

/* ---------- crani e teste (condivisi) ---------- */
/* mattone del cranio a SEZIONE OVALE: a risoluzione doppia una scatola squadrata si vede
   subito per quello che è, e il muso di un animale non ha spigoli. */
function ovalBlock(P, x0, x1, cy, ry, rz, taper) {
  for (let x = x0; x <= x1; x++) {
    /* si assottiglia verso il MUSO (x0 è la punta). Prima il conto era rovesciato: il muso era
       più grosso in punta che alla nuca, e ogni testa lunga sembrava un martello o un tubo.
       Le ultime due fette in punta si arrotondano, così il muso finisce tondo e non tagliato. */
    const t = taper ? 1 - taper * ((x1 - x) / Math.max(1, x1 - x0)) : 1;
    const tip = x - x0 === 0 ? 0.55 : x - x0 === 1 ? 0.8 : 1;
    const ay = Math.max(0.6, ry * t * tip), az = Math.max(0.6, rz * t * tip);
    for (let y = -Math.ceil(ay); y <= Math.ceil(ay); y++) for (let z = -Math.ceil(az); z <= Math.ceil(az); z++) {
      if ((y * y) / ((ay + 0.4) * (ay + 0.4)) + (z * z) / ((az + 0.4) * (az + 0.4)) > 1) continue;
      const bordo = Math.abs(z) >= az - 0.5 || y <= -ay + 0.5;
      P(x, cy + y, z, bordo ? 'shade' : 'bone');
    }
  }
}
function skullVoxels(sp, horns, nx, ny, nz, out) {
  const i0 = out.length; // per il tag parte: cranio, poi corni
  const pp = partParams(sp), t = pp.skull, sz = pp.size; // il cranio scala con la taglia
  const P = (x, y, z, k) => out.push({ x: nx + x, y: ny + y, z: nz + z, k: k || 'bone' });
  /* occhio = due voxel per lato: a griglia fine un puntino solo sparirebbe */
  const eyes = (ex, ey, ez) => { for (const s of [-1, 1]) for (let dy = 0; dy < R - 1 || dy < 1; dy++) for (let dx = 0; dx < 2; dx++) P(ex + dx, ey + dy, s * ez, 'eye'); };
  const cy = U(1);
  if (t === 0) {                        // tozzo e largo
    const len = U(3 + sz);
    ovalBlock(P, -len, 0, cy, U(1.2 + (sz > 1 ? 0.4 : 0)), U(1.1), 0.25);
    for (let i = 1; i <= R; i++) P(-len - i, cy, 0, i === R ? 'shade' : 'bone');   // punta del muso
    eyes(-U(1.2), cy, U(1.1));
  } else if (t === 1) {                 // muso LUNGO (coccodrillo)
    const len = U(6 + 2 * sz);
    ovalBlock(P, -len, 0, cy, U(1.1), U(1), 0.55);                                 // si affusola davvero
    for (let x = -len; x <= -len + R; x++) P(x, cy + U(0.8), 0, 'dark');           // narici rialzate
    for (let x = -len + R; x <= -R; x += R) P(x, cy + U(0.7), 0, 'shade');         // cresta del muso
    eyes(-U(1.4), cy + U(0.5), U(1));
  } else if (t === 2) {                 // becco appuntito
    ovalBlock(P, -U(1), 0, cy, U(1.1), U(1.1), 0.1);
    const bl = U(3 + sz);
    for (let i = 1; i <= bl; i++) {                                                // becco a cono
      const rr = Math.max(0, Math.round((1 - i / bl) * R * 0.9));
      for (let dy = -rr; dy <= rr; dy++) for (let dz = -rr; dz <= rr; dz++)
        P(-U(1) - i, cy + dy, dz, i > bl - R ? 'dark' : 'shade');
    }
    eyes(-U(0.8), cy + U(0.4), U(1.1));
  } else {                              // cupola con cresta a ventaglio
    ovalBlock(P, -U(3), 0, cy, U(1.3), U(1.2), 0.2);
    const cl = U(2 + sz);
    for (let i = 0; i <= cl; i++) {                                                // cresta: ventaglio, non una fila
      const h = U(1) + Math.min(U(2), i);
      for (let j = 0; j <= h; j++) P(-i, cy + U(1.1) + j, 0, j > h - R ? 'dark' : 'shade');
    }
    eyes(-U(1.4), cy, U(1.2));
  }
  const h0 = out.length; // da qui in poi: corni
  const hz = horns === 2 ? [-U(1), U(1)] : [0];
  const hlen = U(2 + sz);                                     // corni lunghi quanto la taglia
  for (const z of hz) for (let i = 0; i < hlen; i++) {
    const th = i < hlen * 0.5 ? 1 : 0;                         // si assottigliano verso la punta
    for (let d = 0; d <= th; d++) P(-U(0.5) + Math.floor(i / 2), cy + U(1.4) + i, z + d * Math.sign(z || 1), i === hlen - 1 ? 'dark' : 'shade');
  }
  for (let i = i0; i < out.length; i++) out[i].p = i >= h0 ? 'corno' : 'cranio';
}
function fleshHead(sp, horns, nx, ny, nz, out) {
  const pp = partParams(sp), col = spColor[sp.id] || '#c8b078', bp = BP[sp.id] || {};
  const P = (x, y, z, c) => out.push({ x: nx + x, y: ny + y, z: nz + z, col: c || col });
  const cy = U(1);
  /* stessa forma del cranio, ma piena di pelle: la testa dell'animale VIVO deve essere
     riconoscibile come quella del suo scheletro, non un'altra bestia. */
  const skin = (x, y, z, k) => P(x, y, z, k === 'shade' ? shadeHex(col, 0.85) : col);
  const w = pp.skull === 0 ? U(3 + pp.size) : U(3);
  ovalBlock(skin, -w, 0, cy, U(1.3), U(1.2), pp.skull === 1 ? 0.35 : 0.2);
  if (pp.skull === 1) {                                        // muso lungo
    /* muso che si affusola fino a una punta tonda con la narice: lungo il doppio del cranio era un
       tubo ("stecco") uguale per tutte le specie */
    const len = w + U(2 + pp.size * 0.7);
    ovalBlock(skin, -len, -w, cy - 1, U(1.05), U(0.9), 0.55);
    for (let x = -len + R; x <= -w; x++) P(x, cy - U(1), 0, shadeHex(col, 0.62));   // linea della bocca
    P(-len, cy, -1, shadeHex(col, 0.45)); P(-len, cy, 1, shadeHex(col, 0.45));      // narici
  } else if (pp.skull === 2) {                                 // becco giallo, a cono
    const bl = U(3 + pp.size);
    for (let i = 1; i <= bl; i++) {
      const rr = Math.max(0, Math.round((1 - i / bl) * R * 0.9));
      for (let dy = -rr; dy <= rr; dy++) for (let dz = -rr; dz <= rr; dz++) P(-w - i, cy + dy, dz, '#e8c34a');
    }
  } else if (pp.skull === 3) {                                 // cresta
    const cl = U(2 + pp.size);
    for (let i = 0; i <= cl; i++) { const h = U(1) + Math.min(U(2), i); for (let j = 0; j <= h; j++) P(-i, cy + U(1.2) + j, 0, shadeHex(col, 0.7)); }
  }
  /* OCCHI da animale vivo: pieni e scuri con un punto di luce in alto davanti. Il bianco con la
     pupilla di lato dava a tutte le creature lo stesso sguardo spiritato */
  for (const s of [-1, 1]) {
    for (let dy = 0; dy < R; dy++) for (let dx = 0; dx < R; dx++) P(-U(1) + dx, cy + dy, s * U(1.3), '#1b1420');
    P(-U(1), cy + R - 1, s * U(1.3) + s, '#ffffff');
  }
  if (bp.orecchie) orecchie(P, bp.orecchie, cy, col);
  if (bp.ears) {
    /* ORECCHIE lunghe (lepri): due falde del colore della pelle con l'interno rosa, all'indietro */
    for (const z of [-U(0.8), U(0.8)]) for (let i = 0; i < U(3.5); i++) for (let d = 0; d < R; d++)
      P(U(0.5) + Math.floor(i / 3) + d, cy + U(1.2) + i, z, d === 0 && i > R ? mixHex(col, '#f0a8b8', 0.45) : shadeHex(col, 0.92));
    return;
  }
  /* corna SOLO a chi le ha nel blueprint: prima ogni creatura ne aveva almeno una, anche mucche,
     lucertole e pesci */
  const nh = Math.min(horns || 0, bp.horns || 0);
  if (!nh) return;
  const hz = nh === 2 ? [-U(1), U(1)] : [0], hlen = U(2 + pp.size);
  if (bp.corna && bp.corna !== 'dritte') { corna(P, bp.corna, cy, hz, hlen, w, pp); return; }
  for (const z of hz) for (let i = 0; i < hlen; i++) {
    const th = i < hlen * 0.35 ? 2 : i < hlen * 0.7 ? 1 : 0;
    for (let d = 0; d <= th; d++) for (let e = 0; e <= th; e++)
      P(-U(0.5) + Math.floor(i / 2) + e, cy + U(1.4) + i, z + d * Math.sign(z || 1), i >= hlen - 2 ? '#b8ad96' : '#ece4cf');
  }
}
/* LE CORNA HANNO FORME DIVERSE, come in natura: il cervo ha i palchi ramificati, il toro le corna
   ricurve in fuori e in avanti, il muflone le spirali ai lati, il rinoceronte un corno sul muso.
   Prima erano tutte lo stesso cono dritto, e un toro e un cervo erano lo stesso animale. */
function corna(P, tipo, cy, hz, hlen, w, pp) {
  const OSSO = '#ece4cf', PUNTA = '#b8ad96';
  const punto = (x, y, z, th, tip) => { for (let d = 0; d <= th; d++) for (let e = 0; e <= th; e++) P(Math.round(x) + e, Math.round(y), Math.round(z) + d * Math.sign(z || 1), tip ? PUNTA : OSSO); };
  if (tipo === 'nasale') {                                     // un corno sul muso, piegato indietro
    const x0 = -w + U(0.4), n = U(2 + pp.size * 0.6);
    for (let i = 0; i < n; i++) punto(x0 + i * 0.35, cy + U(1) + i, 0, i < n * 0.4 ? 1 : 0, i >= n - 2);
    return;
  }
  for (const z0 of hz) {
    const s = Math.sign(z0) || 1;
    if (tipo === 'ricurve') {                                  // toro: in fuori, poi su e in avanti
      const n = Math.round(hlen * 1.3);
      for (let i = 0; i < n; i++) { const t = i / n;
        punto(-U(0.4) - U(1.6) * t * t, cy + U(1) + U(1.6) * t, s * (U(1) + U(2) * Math.sin(t * Math.PI / 2)), t < 0.45 ? 1 : 0, i >= n - 2); }
    } else if (tipo === 'palchi') {                             // cervo: stanga all'indietro con le punte in avanti
      const n = Math.round(hlen * 1.4);
      for (let i = 0; i < n; i++) {
        const x = U(0.2) + i * 0.45, y = cy + U(1.2) + i, z = s * (U(0.8) + i * 0.3);
        punto(x, y, z, i < n * 0.3 ? 1 : 0, i >= n - 1);
        if (i === Math.round(n * 0.4) || i === Math.round(n * 0.7) || i === n - 1)          // i rami
          for (let j = 1; j <= U(1.2); j++) punto(x - j, y + Math.floor(j / 2), z, 0, j === U(1.2));
      }
    } else if (tipo === 'spirale') {                            // muflone: ricciolo sul fianco della testa
      const rr = U(1.6), cx = U(0.6), cy2 = cy + U(0.4);
      for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + i / 26 * Math.PI * 1.7, k = rr * (1 - i / 40);
        punto(cx + Math.cos(a) * k, cy2 + U(0.9) + Math.sin(-a) * k * 0.9, s * (U(1.3) + i / 26 * U(0.4)), i < 12 ? 1 : 0, i >= 24); }
    }
  }
}
/* ORECCHIE A PUNTA (lupi, linci, volpi) e TONDE (orsi, topi): due forme che da sole cambiano l'animale */
function orecchie(P, tipo, cy, col) {
  const dentro = mixHex(col, '#f0a8b8', 0.35);
  for (const s of [-1, 1]) {
    if (tipo === 'punta') {
      const n = U(1.8);
      for (let i = 0; i < n; i++) { const larg = Math.max(0, Math.round((1 - i / n) * U(0.7)));
        for (let d = -larg; d <= larg; d++) P(U(0.3) + d, cy + U(1.1) + i, s * U(1), d === 0 && i < n - 1 && i > 0 ? dentro : shadeHex(col, 0.92)); }
    } else if (tipo === 'tonde') {
      const rr = U(0.7);
      for (let a = -rr; a <= rr; a++) for (let b = -rr; b <= rr; b++) if (a * a + b * b <= rr * rr + 1)
        P(U(0.4) + a, cy + U(1.2) + rr + b, s * U(1.1), a * a + b * b <= (rr - 1) * (rr - 1) ? dentro : shadeHex(col, 0.9));
    }
  }
}

/* ================= BLUEPRINT per specie: 60 ricette curate, ispirate alla natura =================
   seg: raggi dei segmenti del corpo (1=piccolo,2,3=grande) — formiche/vespe = più segmenti
   legs: [numero, lunghezza 0-2] (0 zampe = striscia/fluttua) · wings: [n, 'm'embrana|'f'piume|'i'nsetto]
   head: 0 tozzo · 1 muso lungo · 2 becco · 3 cupola · 'none' (occhi sul corpo)
   mand/ant/prob: mandibole·antenne·proboscide · tail: none|short|long|club|sting|fin
   extra: sail|spikes|shell|hump · float: fluttua · wave: corpo ondulato · tall: eretto
   piede: zoccolo|zampa|tozza|uccello|salto — solo quando quello scelto da tipoZampa non va */
export const BP = {
  /* GROTTE (specie esclusive delle caverne) */
  cavernide: { seg: [2, 2], legs: [4, 1], horns: 1, tail: 'short', head: 0 },
  luceverme: { seg: [2, 2, 2, 2], legs: [0, 0], tail: 'short', head: 'none', wave: true, extra: 'spikes' },
  stalattodonte: { seg: [3, 3], legs: [4, 2], horns: 2, tail: 'club', head: 0, extra: 'spikes', tall: true },
  pipistrosso: { seg: [2], legs: [2, 1], wings: [2, 'm'], horns: 1, tail: 'short', head: 0 },
  cristallugo: { seg: [2, 2], legs: [4, 1], horns: 2, tail: 'fin', head: 3, extra: 'spikes' },
  /* il leggendario delle grotte è la CAVALCATURA volante: un drago di cristallo a quattro zampe con le ali a
     membrana, cornetti e cresta di punte (era un tubo a tre segmenti con la vela: "quello rosa è proprio brutto") */
  abissodonte: { seg: [2, 3, 2], legs: [4, 1], wings: [2, 'm'], horns: 2, neck: 1, tail: 'long', head: 0, extra: 'spikes' },
  /* PRATI */
  prato: { seg: [2, 2], legs: [4, 1], horns: 2, tail: 'short', head: 0 },
  lepre: { seg: [1, 2], legs: [2, 1], ears: true, tail: 'short', head: 0, tall: true },
  erbadonte: { seg: [3, 3], legs: [4, 1], horns: 1, tail: 'long', head: 1, neck: 1 },
  rugiadino: { seg: [2, 1], legs: [6, 1], ant: true, tail: 'none', head: 'none' },
  fienotauro: { seg: [3, 2], legs: [4, 1], horns: 2, extra: 'hump', tail: 'short', head: 0 },
  spigacervo: { seg: [2, 2], legs: [4, 2], horns: 2, neck: 2, tail: 'short', head: 0 },
  grillosso: { seg: [1, 2], legs: [6, 2], ant: true, wings: [2, 'i'], tail: 'none', head: 'none' },
  talpaurea: { seg: [2, 3], legs: [4, 0], tail: 'short', head: 1, horns: 0 },
  falcedorso: { seg: [2, 2, 2], legs: [4, 1], extra: 'sail', tail: 'long', head: 2 },
  soleburo: { seg: [3, 3], legs: [2, 2], horns: 2, extra: 'sail', tail: 'long', head: 3, tall: true },
  /* DUNE */
  gastro: { seg: [3], legs: [0], extra: 'shell', ant: true, tail: 'short', head: 'none', wave: true },
  pinna: { seg: [2, 3, 2], legs: [0], tail: 'fin', head: 0, float: true, extra: 'sail' },
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
  radicante: { seg: [2, 1], legs: [8, 2], ant: true, tail: 'none', head: 'none' },
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
  brontorana: { seg: [3], legs: [4, 1], tail: 'none', head: 0, horns: 0, extra: 'hump', piede: 'salto' },
  pantanarca: { seg: [2, 2, 2, 2], legs: [0], wave: true, ant: true, tail: 'sting', head: 1 },
  /* GHIACCI */
  gelodonte: { seg: [3, 3], legs: [4, 1], head: 0, tail: 'short', extra: 'spikes' },
  brinalepre: { seg: [1, 1], legs: [2, 1], ears: true, tail: 'short', head: 0, tall: true },
  nevosauro: { seg: [2, 2, 2], legs: [4, 1], extra: 'sail', tail: 'long', head: 3 },
  slavinotto: { seg: [2], legs: [4, 0], tail: 'short', head: 0, horns: 0 },
  ghiacciolupo: { seg: [2, 2], legs: [4, 2], tail: 'long', head: 1, horns: 0, extra: 'spikes' },
  boreacervo: { seg: [2, 2], legs: [4, 2], horns: 2, neck: 2, tail: 'fan', head: 1 },
  cristalgufo: { seg: [2], legs: [2, 1], wings: [2, 'f'], head: 2, horns: 1, tail: 'fan' },
  permafrosso: { seg: [3], legs: [4, 0], extra: 'shell', tail: 'club', head: 0 },
  auroralce: { seg: [3, 2], legs: [4, 2], horns: 2, extra: 'sail', tail: 'short', head: 1, neck: 1 },
  eternoglacio: { seg: [2, 2, 3], legs: [0], float: true, ant: true, tail: 'fin', head: 3, horns: 2 },
};

/* ================= I TRATTI DI OGNI SPECIE — il secondo passo della varietà =================
   Le ricette qui sopra danno la SAGOMA; questi tratti danno il CARATTERE, e sono scelti a mano
   per separare chi si somigliava (tanti quadrupedi con le corna, «tanti animali si assomigliano»):
   il cervo ha i palchi e le macchie, il toro le corna ricurve e le zampe robuste, il bisonte anche
   la criniera, il lupo le orecchie a punta e il dorso scuro, l'orso le orecchie tonde…
   mantello: dorso · strisce · macchie · ventre · punte (zampe e coda) · anelli (coda) · testa
   col2: il secondo colore (se manca: il colore del corpo scurito) · corna: dritte · ricurve ·
   palchi · spirale · nasale · orecchie: punta · tonde · zampe: sottili · robuste · criniera: true */
const TRATTI = {
  /* GROTTE */
  cavernide: { mantello: 'macchie', col2: '#7fe3e0', corna: 'nasale', orecchie: 'tonde' },
  luceverme: { mantello: 'anelli', col2: '#bff5c9' },
  stalattodonte: { mantello: 'punte', col2: '#3a3348', corna: 'ricurve', zampe: 'robuste' },
  pipistrosso: { orecchie: 'punta', mantello: 'ventre', col2: '#e9d9b8' },
  cristallugo: { mantello: 'macchie', col2: '#b8f0ff' },
  /* PRATI */
  /* la pecora: lana chiara, muso scuro, corna a spirale */
  prato: { corna: 'spirale', mantello: 'testa', col2: '#4a3a34', zampe: 'sottili' },
  lepre: { mantello: ['ventre', 'punte'], col2: '#f4efe4' },
  erbadonte: { corna: 'nasale', zampe: 'robuste', mantello: 'dorso' },
  rugiadino: { mantello: 'strisce', col2: '#3d3a2a' },
  fienotauro: { corna: 'ricurve', criniera: true, zampe: 'robuste', mantello: 'punte', col2: '#4a3424' },
  spigacervo: { corna: 'palchi', orecchie: 'punta', zampe: 'sottili', mantello: 'macchie', col2: '#f6eee0' },
  grillosso: { mantello: 'strisce', col2: '#2f4a28' },
  talpaurea: { orecchie: 'tonde', mantello: 'dorso', col2: '#e8c24a', zampe: 'robuste' },
  falcedorso: { mantello: 'strisce', col2: '#6b3a2a' },
  soleburo: { mantello: 'ventre', col2: '#f2b04a' },
  /* DUNE */
  gastro: { mantello: 'strisce', col2: '#e8d6a0' },
  pinna: { mantello: ['dorso', 'ventre'], col2: '#f6f0dc' },
  sabbiodonte: { mantello: 'macchie', col2: '#6a5236', zampe: 'robuste' },
  conchigliante: { mantello: 'testa', col2: '#b89a5e' },
  dunavespa: { mantello: 'strisce', col2: '#2a2218' },
  scorpisabbia: { mantello: 'anelli', col2: '#5a3f22' },
  miraggiolo: { mantello: 'ventre', col2: '#fff4d8' },
  cactodonte: { mantello: 'punte', col2: '#2f5a34' },
  ossidraco: { corna: 'ricurve', mantello: 'dorso', col2: '#e8dcc4' },
  duneterno: { mantello: 'anelli', col2: '#c89a52' },
  /* BOSCHI */
  alce: { corna: 'palchi', zampe: 'robuste', criniera: true, mantello: 'punte', col2: '#3e2e22' },
  muschio: { mantello: 'anelli', col2: '#9ac27a' },
  corteccino: { mantello: 'strisce', col2: '#5a4430' },
  /* l'orso-fungo: il guscio sul dorso è un cappello rosso a pois */
  fungorso: { orecchie: 'tonde', zampe: 'robuste', mantello: ['dorso', 'macchie'], col2: '#c43c34' },
  gufo: { mantello: 'ventre', col2: '#f0e4c8' },
  cinervo: { corna: 'palchi', orecchie: 'punta', zampe: 'sottili', mantello: 'dorso', col2: '#4a4458' },
  radicante: { mantello: 'anelli', col2: '#4a3020' },
  brumavolpe: { orecchie: 'punta', mantello: ['ventre', 'punte'], col2: '#f5ede0', zampe: 'sottili' },
  ramarrospino: { mantello: 'macchie', col2: '#2e4a2a' },
  cinerarca: { mantello: 'dorso', col2: '#5a5a66' },
  /* TERRE */
  cristallo: { mantello: 'punte', col2: '#f0e6ff' },
  scorpio: { mantello: 'anelli', col2: '#3a1e14' },
  gessolino: { orecchie: 'tonde', mantello: 'ventre', col2: '#fbf6ec' },
  /* la lince ha la coda CORTA: col codone era il lupo delle terre */
  ocralince: { orecchie: 'punta', mantello: 'macchie', col2: '#5a3218', zampe: 'sottili', tail: 'short' },
  magma: { corna: 'nasale', zampe: 'robuste', mantello: 'strisce', col2: '#f2a23a' },
  ferrodonte: { mantello: 'anelli', col2: '#5a5048', zampe: 'robuste' },
  bronzotauro: { corna: 'ricurve', zampe: 'robuste', mantello: 'dorso', col2: '#6a3e1e' },
  lavalupo: { orecchie: 'punta', mantello: 'dorso', col2: '#3a1c14', zampe: 'sottili' },
  vulcanide: { mantello: 'punte', col2: '#f2c43a' },
  magmarex: { mantello: 'strisce', col2: '#4a1a12' },
  /* PALUDE */
  /* l'ippopotamo: testa larga, non il muso lungo della talpa */
  fangodonte: { head: 0, orecchie: 'tonde', zampe: 'robuste', mantello: 'ventre', col2: '#e8b4b0' },
  girinosso: { mantello: 'ventre', col2: '#d8e8c8' },
  limosalta: { mantello: 'macchie', col2: '#2e4a22' },
  salicervo: { corna: 'palchi', mantello: ['dorso', 'macchie'], col2: '#3e5236' },
  ninfeasauro: { mantello: 'macchie', col2: '#e6f0d0' },
  torbalupo: { orecchie: 'punta', criniera: true, mantello: 'punte', col2: '#2a3a26' },
  zanzarone: { mantello: 'strisce', col2: '#2a2a30' },
  /* la LONTRA di palude: corpo lungo, zampe corte e coda piatta — era un'altra lince */
  melmalince: { seg: [2, 2, 1], legs: [4, 0], tail: 'fin', head: 1, orecchie: 'tonde', mantello: 'ventre', col2: '#efe2c4', extra: null },
  brontorana: { mantello: ['ventre', 'macchie'], col2: '#f0e0a0' },
  pantanarca: { mantello: 'anelli', col2: '#3a4a2a' },
  /* GHIACCI */
  /* il MAMMUT: proboscide, zanne ricurve, orecchie tonde e il pelo lungo — era un toro */
  gelodonte: { head: 1, prob: true, horns: 2, corna: 'ricurve', orecchie: 'tonde', criniera: true, zampe: 'robuste', mantello: 'dorso', col2: '#5a3e30', extra: null },
  brinalepre: { mantello: 'punte', col2: '#3a3a44' },
  nevosauro: { mantello: 'strisce', col2: '#e8f4fa' },
  slavinotto: { orecchie: 'tonde', mantello: 'ventre', col2: '#ffffff' },
  ghiacciolupo: { orecchie: 'punta', mantello: ['ventre', 'dorso'], col2: '#f4f8fa', zampe: 'sottili' },
  boreacervo: { corna: 'palchi', criniera: true, mantello: 'ventre', col2: '#f2eee6' },
  /* il gufo delle nevi ha la cresta e sta eretto: col solo colore era il gufo dei boschi imbiancato */
  cristalgufo: { mantello: 'macchie', col2: '#8cb8d8', head: 3, tall: true, seg: [1, 2] },
  permafrosso: { mantello: 'anelli', col2: '#d8e8f0' },
  /* l'orice dell'aurora: corna lunghe e dritte, collo alto e zampe sottili — l'alce resta quello robusto */
  auroralce: { corna: 'dritte', neck: 2, zampe: 'sottili', mantello: 'dorso', col2: '#8a5ac8' },
  eternoglacio: { mantello: 'anelli', col2: '#e8fbff', seg: [1, 2, 3], extra: 'spikes' },
};
for (const [id, t] of Object.entries(TRATTI)) if (BP[id]) Object.assign(BP[id], t);

/* ================= assemblatore: UNA pipeline per scheletro e carne =================
   REGOLA D'ORO: ogni pezzo si RACCORDA — segmenti sovrapposti, giunzioni esplicite per
   collo/zampe/ali/code. Le chimere restano sempre attaccate.
   Tutto qui dentro lavora in VOXEL FINI (vedi `R`): i raggi arrivano già moltiplicati, così
   le sezioni tonde sono rasterizzate grandi il doppio e si vedono tonde davvero. */
function segRing(cx, cy, cz, r, mode, colT, out) {
  if (mode === 'skel') {
    for (let a = -r; a <= r; a++) {
      const rr = Math.round(Math.sqrt(Math.max(0, r * r - a * a)));
      out.push({ x: cx + a, y: cy + rr, z: cz, k: 'bone' });                // dorso
      out.push({ x: cx + a, y: cy - rr, z: cz, k: 'shade' });               // ventre
      /* COSTOLE: una ogni R voxel (cioè lo stesso passo di prima, ma disegnate con abbastanza
         campioni da chiudere il cerchio — a raggio doppio il vecchio passo di 45° lasciava
         buchi grandi come la costola stessa). */
      if (rr > 0 && (a + r) % R === 0) {
        const passi = Math.max(12, rr * 8);
        for (let t = 0; t < passi; t++) {
          const ang = t / passi * Math.PI * 2;
          const y = cy + Math.round(Math.cos(ang) * rr);
          const z = cz + Math.round(Math.sin(ang) * rr);
          out.push({ x: cx + a, y, z, k: 'shade' });
        }
      }
    }
  } else {
    for (let a = -r; a <= r; a++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++)
      if (a * a + dy * dy + dz * dz <= r * r + r)
        out.push({ x: cx + a, y: cy + dy, z: cz + dz, col: colT });   // tinta unica: luce e ventre li fa il disegno (creatureSprite)
  }
}
/* ZAMPA: si assottiglia dall'anca al piede, e il piede appoggia largo. A un voxel di spessore
   (com'era) una zampa a scala doppia sembrerebbe un filo di ferro. */
function legVox(lx, cy, cz, sr, side, len, mode, colT, out, arthro, tuck, grosse = 0, forma = { kind: 'zampa', hind: true }) {
  const P = (x, y, z, k) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: shadeHex(colT, k === 'dark' ? 0.7 : 0.88) });
  const spesso = (x, y, z, k, th) => { for (let d = 0; d < Math.max(1, th); d++) for (let e = 0; e < Math.max(1, th); e++) P(x + d, y, z + e * side, k); };
  /* ZAMPA RACCOLTA, in volo: coscia corta verso il basso, ginocchio, stinco RIPIEGATO
     all'indietro sotto la pancia. Una bestia che vola con le zampe dritte in giù sembra
     appesa a un filo — le tiene raccolte, come un uccello (segnalato con foto). */
  if (tuck) {
    /* SI PIEGA ALL'INDIETRO, verso la coda: il muso sta alle x BASSE (frontX) e la coda alle
       ALTE (backX), quindi lo stinco va verso +x. Piegato in avanti sembrava una zampa rotta
       (segnalato con foto). La punta risale di una casella: il piede si arriccia, non striscia. */
    const attachY = cy - sr, zz = cz + side;
    const th = mode === 'flesh' ? R + 1 : R;
    const n = U(4);
    /* ADERENTE AL CORPO: la zampa raccolta non è un ginocchio che sporge, è un rilievo lungo
       il ventre. Sporge UNA casella sotto la pancia e basta — con la piega staccata sembravano
       due uncini appesi (segnalato con foto). */
    spesso(lx, attachY, cz, 'bone', R);                                  // giunzione al ventre
    for (let d = 0; d <= n; d++) {
      const y = Math.max(0, attachY - (d === 0 || d === n ? 0 : 1));     // si stacca di una sola, e si richiude in coda
      spesso(lx + d, y, zz, d === n ? 'dark' : 'bone', th);
    }
    return;
  }
  /* la zampona ad arco è da RAGNO/insetto: data ai vertebrati dalle gambe lunghe (cervi, alci, rapaci)
     li trasformava in trampoli da un voxel sotto un corpo sospeso */
  if (len >= 2 && arthro) { // ZAMPONA ad arco (ragno/zanzara): esce dal fianco, sale, poi scende
    /* sottile fino in fondo, con il ginocchio scuro e l'unghia: il piede a blocco la chiudeva in un pilastro */
    const th = Math.max(1, Math.round(R / 2));
    let z = cz + side * sr;
    spesso(lx, cy, z, 'bone', th);                                       // anca sul fianco
    for (let j = 1; j <= U(2); j++) { z = cz + side * (sr + j); spesso(lx, cy + j, z, 'bone', th); }
    if (mode !== 'flesh') spesso(lx, cy + U(2), z, 'dark', th);          // il ginocchio in alto
    for (let y = cy + U(2) - 1; y >= 0; y--) {                          // scende e si apre appena verso terra
      const zz = z + (y < U(1) ? side : 0);
      spesso(lx, y, zz, y % U(2) ? 'shade' : 'bone', th);
    }
    P(lx - 1, 0, z + side, 'dark');                                      // l'unghia
    return;
  }
  /* ZAMPETTA D'INSETTO: sottile, a tre pezzi. Esce dal fianco, sale di poco al ginocchio e scende
     aperta fino a terra con un'unghia scura. Era una colonna dritta con una fascia scura: nel
     Libro (risoluzione 4) un pilastro largo quattro voxel sotto un corpo d'insetto. */
  if (arthro) {
    const th = mode === 'flesh' ? Math.max(1, Math.round(R * 0.75)) : Math.max(1, Math.round(R / 2));
    const hipZ = cz + side * Math.max(1, sr - R), kneeZ = hipZ + side * U(1.5), footZ = kneeZ + side * U(1);
    const hipY = Math.max(1, cy - Math.round(sr / 2)), kneeY = hipY + U(0.5);
    const linea = (a, b, k) => {
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
      for (let i = 0; i <= n; i++) { const t = i / n; spesso(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), k, th); }
    };
    linea([lx, hipY, hipZ], [lx, kneeY, kneeZ], 'bone');              // femore: di lato, appena in su
    linea([lx, kneeY, kneeZ], [lx, 0, footZ], 'shade');                // tibia: giù, aperta
    if (mode !== 'flesh') spesso(lx, kneeY, kneeZ, 'dark', th);        // il ginocchio
    P(lx - 1, 0, footZ, 'dark');                                       // l'unghia
    return;
  }
  /* ZAMPA DA VERTEBRATO: ossa con i GIUNTI, non una colonna. Erano pilastri dritti col piede a
     blocco, uguali per tutti («piloni, niente personalità»). Il muso sta alle x basse: la zampa
     di DIETRO piega il ginocchio in avanti e il garretto indietro, quella DAVANTI il gomito
     indietro; il piede dice chi è (tipoZampa). Le proporzioni sono in frazioni dell'altezza
     dell'anca, così la stessa zampa regge a risoluzione 2 (mondo) e 4 (Libro). */
  const H = cy - sr, zz = cz + side;
  const carne = mode === 'flesh';
  const sottile = grosse < 0 ? 1 : 0;
  const osso = carne ? R + 1 + grosse : Math.max(1, R - sottile);          // spessore dello stinco
  const coscia = carne ? R + 2 + grosse : Math.max(1, R - sottile);
  const { kind, hind } = forma;
  /* giunti: [dx in frazioni di H, y in frazioni di H, dz in caselle] dall'anca al piede */
  const J = {
    dietro: [[-0.2, 0.62, 0], [0.2, 0.28, 0], [0.08, 0, 0]],
    davanti: [[0.14, 0.6, 0], [0.02, 0.2, 0], [-0.02, 0, 0]],
    tozza: [[0.15, 0.55, U(1.5)], [-0.1, 0.2, U(1)], [-0.15, 0, U(1)]],
    salto: [[-0.28, 0.66, 0], [0.34, 0.16, 0], [0.3, 0, 0]],
    uccello: [[-0.24, 0.64, 0], [0.18, 0.34, 0], [0.04, 0, 0]],
  }[kind === 'tozza' ? 'tozza' : kind === 'salto' ? (hind ? 'salto' : 'davanti') : kind === 'uccello' ? 'uccello' : (hind ? 'dietro' : 'davanti')];
  const pts = [[lx, H, zz], ...J.map(([dx, fy, dz]) => [lx + Math.round(dx * H), Math.round(fy * H), zz + side * dz])];
  const tratto = (a, b, t0, t1, k) => {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]), 1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      spesso(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), k, Math.round(t0 + (t1 - t0) * t));
    }
  };
  spesso(lx, H, cz, 'bone', coscia);                                      // giunzione al ventre
  tratto(pts[0], pts[1], coscia, osso + (carne ? 1 : 0), 'bone');         // femore / omero
  tratto(pts[1], pts[2], osso + (carne ? 1 : 0), osso, 'bone');           // tibia / radio
  tratto(pts[2], pts[3], osso, osso, 'bone');                             // metatarso
  /* nello scheletro i giunti si vedono: un nodo più scuro, appena più grosso dell'osso */
  if (!carne) for (const g of [pts[1], pts[2]]) spesso(g[0], g[1], g[2], 'shade', osso + (R > 1 ? 1 : 0));
  /* IL PIEDE */
  const [fx, , fz] = pts[3];
  const dita = (n, lung, artiglio) => {
    for (let d = 0; d < n; d++) {
      const z = fz + side * d;
      for (let i = 0; i <= lung; i++) P(fx - i, 0, z, i === lung && artiglio ? 'dark' : 'bone');
    }
  };
  if (kind === 'zoccolo') {
    for (let y = 0; y < Math.max(1, R); y++) for (let d = -1; d < osso; d++) for (let e = 0; e < osso; e++) P(fx + d, y, fz + e * side, 'dark');
  } else if (kind === 'uccello') {
    dita(Math.max(1, osso), U(2.5), true);                                // tre dita lunghe avanti…
    for (let i = 1; i <= U(1); i++) P(fx + osso - 1 + i, 0, fz, i === U(1) ? 'dark' : 'bone');   // …e il pollice dietro
  } else if (kind === 'salto') {
    if (hind) for (let i = 0; i <= U(3); i++) for (let e = 0; e < osso; e++) P(fx - i, 0, fz + e * side, i === U(3) ? 'dark' : 'bone');   // piede lungo e piatto
    else dita(osso, U(1), true);
  } else if (kind === 'tozza') {
    for (let d = -1; d < osso + 1; d++) for (let e = 0; e < osso + 1; e++) P(fx + d, 0, fz + e * side, 'bone');   // pianta larga
    dita(osso + 1, U(1.5), true);                                         // artigli da scavo
  } else {
    dita(osso, U(1.5), true);                                             // zampa con le dita e le unghie
  }
}
/* IL PIEDE DI UNA SPECIE, dalla sua ricetta: zampette e zampone d'insetto restano com'erano
   ('ragno'); le corte sono tozze e da scavo; i bipedi saltano (orecchie lunghe) o camminano
   sulle dita come un uccello; fra i quadrupedi gli erbivori con le corna hanno lo zoccolo. */
export function tipoZampa(bp, pairs) {
  const r = bp || {}, legs = r.legs || [4, 1];
  if (r.ant || r.head === 'none' || legs[0] >= 6) return 'ragno';
  if (r.piede) return r.piede;                                    // la specie lo dice lei (la rana salta)
  if (!legs[1]) return 'tozza';
  if (pairs === 1) return r.ears ? 'salto' : 'uccello';
  return r.horns && !r.mand ? 'zoccolo' : 'zampa';
}
/* `flap` (opzionale, 0..3: su, metà, giù, metà) alza o abbassa le punte delle ali a membrana: la
   cavalcatura in volo le batte costruendo quattro pose dello STESSO modello */
const FLAP_LIFT = [3, 1, -2, 1];
function wingVox(x0, topY, n, type, mode, colT, out, flap) {
  const P = (x, y, z, k, cmul) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: shadeHex(colT, cmul || 1.12), wing: 1 });
  const pairs = Math.max(1, Math.round(n / 2));
  for (let w = 0; w < pairs; w++) for (const dir of [-1, 1]) {
    const wx = x0 + w * U(3), span = type === 'm' ? U(10 - w * 3) : U(5 - w);   // la membrana è un'ala VERA: più larga del corpo
    for (let d = 0; d < R; d++) P(wx + d, topY, dir, 'bone', 1);          // radice dell'ala sul dorso
    for (let i = 1; i <= span; i++) {
      const y = topY + Math.min(U(3), Math.round(i / 2));
      if (type === 'i') {                                                 // ala da insetto: ovale sottile
        P(wx, topY + 1, dir * i, i > span - R ? 'dark' : 'shade', 1.3);
        if (i > R && i < span) for (let d = 1; d <= R; d++) P(wx + d, topY + 1, dir * i, 'shade', 1.3);
      } else if (type === 'f') {                                          // piume: penne di lunghezze diverse
        const pen = U(1) + (i % (R * 2) === 0 ? U(1) : 0);
        for (let j = 0; j <= pen; j++) P(wx + j, y - Math.floor(j / 2), dir * i, j ? 'shade' : 'bone', j % 2 ? 0.9 : 1.12);
      } else {
        /* MEMBRANA da drago/pipistrello: il braccio sale verso la punta (le ali si vedono anche di
           profilo, sopra il dorso), la membrana è larga alla radice e si stringe, e il bordo
           d'uscita rientra fra un dito e l'altro. Era una striscia larga due voxel con le dita:
           "le ali sono dei triangoli buttati lì a caso". */
        const k = i / span, lift = flap == null ? 1 : FLAP_LIFT[((flap % 4) + 4) % 4];
        const yb = topY + Math.round(k * U(3) + k * k * U(lift * 2));
        const dita = i % U(3) === 0 || i === span;
        const chord = Math.max(R, Math.round(U(5) * (1 - k * 0.6)) - (dita ? 0 : R));
        P(wx, yb, dir * i, 'bone', 0.62);
        /* la membrana scende all'indietro (si vede anche di fronte, non solo di taglio) ed è più chiara del
           corpo con le dita scure: sopra la schiena dello stesso colore non si distingueva */
        for (let j = 1; j <= chord; j++) P(wx + j, yb - Math.round(j * 0.7), dir * i, dita && j < chord ? 'bone' : 'shade', dita && j < chord ? 0.62 : 1.38);
      }
    }
  }
}
function tailVox(x0, y0, kind, mode, colT, out) {
  const P = (x, y, z, k) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: k === 'dark' ? shadeHex(colT, 0.6) : colT });
  const spesso = (x, y, k, th) => { for (let d = 0; d < Math.max(1, th); d++) for (let e = 0; e < Math.max(1, th); e++) P(x, y + d, e - Math.floor(Math.max(1, th) / 2), k); };
  if (kind === 'none') return;
  if (kind === 'fin') {                                                   // pinna caudale, raggi visibili
    spesso(x0, y0, 'bone', R);
    for (let j = -U(3); j <= U(3); j++) for (let i = 1; i <= U(2); i++)
      P(x0 + i, y0 + j, 0, Math.abs(j) > U(1) ? 'dark' : (j % R === 0 ? 'bone' : 'shade'));
    return;
  }
  if (kind === 'fan') {                                                   // ventaglio: raggi che si aprono
    spesso(x0, y0, 'bone', R);
    for (let j = -U(2); j <= U(2); j++) for (let i = 1; i <= U(2); i++)
      P(x0 + i, y0 + Math.round(j * i / U(2)), 0, i > U(1) ? 'shade' : 'bone');
    return;
  }
  if (kind === 'sting') {                                                 // pungiglione: si arriccia in ALTO
    const pts = [];
    for (let i = 0; i <= U(3); i++) pts.push([i, i]);
    for (let i = 1; i <= U(2); i++) pts.push([U(3) - Math.floor(i / 2), U(3) + i]);
    pts.forEach(([dx, dy]) => { P(x0 + dx, y0 + dy, 0, 'bone'); if (dy < U(3)) P(x0 + dx, y0 + dy, 1, 'shade'); });
    P(x0 + U(1), y0 + U(5), 0, 'dark'); P(x0 + U(1), y0 + U(6), 0, 'dark');
    return;
  }
  const len = kind === 'short' ? U(3) : U(6);
  for (let i = 0; i < len; i++) {
    /* la carne parte grossa quanto il fondo schiena e finisce a punta; l'osso resta sottile */
    const th = mode === 'flesh' ? Math.max(1, Math.round((R + 1.5) * (1 - i / len))) : (i < len / 2 ? R : Math.max(1, R - 1));
    spesso(x0 + i, y0 - Math.floor(i / 2), i > len - R ? 'shade' : 'bone', th);
  }
  if (kind === 'club') {                                                  // mazza chiodata
    const bx = x0 + len - 1, by = y0 - Math.floor((len - 1) / 2), rr = U(1.2);
    for (let dx = 0; dx <= rr * 2; dx++) for (let dy = -rr; dy <= rr; dy++) for (let dz = -rr; dz <= rr; dz++) {
      if ((dx - rr) * (dx - rr) + dy * dy + dz * dz > rr * rr + 1) continue;
      P(bx + dx, by + dy, dz, 'shade');
    }
    P(bx + rr, by + rr + 1, 0, 'dark'); P(bx + rr * 2 + 1, by, 0, 'dark'); P(bx + rr, by - rr - 1, 0, 'dark');
  }
}
function extraVox(r, segsX, topYs, kind, mode, colT, out) {
  const P = (x, y, z, k) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: k === 'dark' ? shadeHex(colT, 0.6) : shadeHex(colT, 0.75) });
  if (kind === 'sail') segsX.forEach((sx, i) => {                          // vela: profilo curvo, non un muro
    const h = U(2) + (i === Math.floor(segsX.length / 2) ? U(1) : 0);
    for (let dx = -1; dx <= 1; dx++) for (let y = 0; y <= h - Math.abs(dx); y++) P(sx + dx, topYs[i] + y, 0, y > h - R ? 'dark' : 'shade');
  });
  else if (kind === 'spikes') segsX.forEach((sx, i) => {                    // spuntoni a triangolo
    for (let y = 0; y <= U(1.5); y++) { const w = Math.max(0, Math.round((1 - y / U(1.5)) * (R - 1))); for (let dx = -w; dx <= w; dx++) P(sx + dx, topYs[i] + y, 0, y > U(1) ? 'dark' : 'shade'); }
    P(sx - U(1), topYs[i], 1, 'dark'); P(sx + U(1), topYs[i], -1, 'dark');
  });
  else if (kind === 'hump') {                                              // gobba: calotta piena
    const sx = segsX[0], rr = U(1.5);
    for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) for (let y = 0; y <= rr; y++) {
      if (dx * dx + dz * dz + y * y > rr * rr + 1) continue;
      P(sx + dx, topYs[0] + y, dz, y > rr - R ? 'shade' : 'shade');
    }
  }
  else if (kind === 'shell') { // guscio a cupola, appoggiato sul dorso
    const R2 = r + U(1), sx = segsX[0];
    for (let a = 0; a <= R2; a++) {
      const rr = Math.round(Math.sqrt(Math.max(0, R2 * R2 - a * a)));
      const passi = Math.max(16, rr * 8);
      for (let t = 0; t < passi; t++) {
        const ang = t / passi * Math.PI * 2;
        const x = sx + Math.round(Math.cos(ang) * rr), z = Math.round(Math.sin(ang) * rr);
        if (mode === 'skel') out.push({ x, y: topYs[0] - U(1) + a, z, k: a % R ? 'shade' : 'bone' });
      }
      if (mode !== 'skel') for (let fx = -rr; fx <= rr; fx++) for (let fz = -rr; fz <= rr; fz++) {
        if (fx * fx + fz * fz <= rr * rr) out.push({ x: sx + fx, y: topYs[0] - U(1) + a, z: fz, col: (fx + fz) % (R * 3) === 0 ? shadeHex(colT, 0.7) : shadeHex(colT, 0.85) });
      }
    }
  }
}
function headExtras(r, hx, hy, mode, colT, out) {
  const P = (x, y, z, k) => mode === 'skel' ? out.push({ x, y, z, k }) : out.push({ x, y, z, col: k === 'dark' ? shadeHex(colT, 0.6) : colT });
  /* mandibole, antenne e proboscide restano SOTTILI anche a griglia doppia: è lì che si vede
     la differenza fra un insetto e un mattoncino con le corna. */
  if (r.mand) for (const dz of [-1, 1]) {
    for (let i = 1; i <= U(2); i++) P(hx - i, hy, dz * U(2), i === U(2) ? 'dark' : 'bone');
    for (let i = U(2); i <= U(3); i++) P(hx - i, hy, dz * U(1), 'dark');
    P(hx - 1, hy, dz * U(1), 'bone');
  }
  if (r.ant) for (const dz of [-1, 1]) {
    for (let i = 1; i <= U(3); i++) P(hx - i, hy + U(1.5) + i, dz * Math.min(U(1), i), i > U(2) ? 'dark' : 'shade');
  }
  if (r.prob) for (let i = 1; i <= U(5); i++) P(hx - i, hy - Math.floor(i / 2), 0, i > U(4) ? 'dark' : 'shade');
}

/* ---------- IL MANTELLO: il secondo colore di una specie ----------
   Ogni specie era di UN colore solo, e le sagome simili (i tanti quadrupedi con le corna) si
   distinguevano solo per la tinta: «tanti animali si assomigliano». Un mantello — dorso scuro,
   strisce, macchie, pancia di un altro colore, zampe e coda scure, anelli — è la prima cosa che
   distingue un animale da un altro a colpo d'occhio, ed è scritto a mano nella ricetta.
   Si ricolorano i voxel della carne che hanno il colore del corpo (o una sua sfumatura: le zampe
   sono al 0.88, le dita al 0.7…) mantenendo la sfumatura: la luce la fa comunque il disegno. */
function mantello(out, r, colT) {
  const col2 = r.col2 || shadeHex(mixHex(colT, '#2b2230', 0.4), 0.85);
  const fam = new Map([[colT, 1]]);
  for (const k of [0.6, 0.62, 0.7, 0.85, 0.88, 1.12]) fam.set(shadeHex(colT, k), k);
  const tipi = Array.isArray(r.mantello) ? r.mantello : [r.mantello];
  /* la forma del corpo, colonna per colonna: dove sta il dorso e dove la pancia */
  const top = new Map(), bot = new Map();
  let yMax = -1e9, xMin = 1e9, xMax = -1e9;
  for (const v of out) if (v.p === 'torace' && fam.has(v.col)) {
    top.set(v.x, Math.max(top.get(v.x) ?? -1e9, v.y)); bot.set(v.x, Math.min(bot.get(v.x) ?? 1e9, v.y));
    if (v.x < xMin) xMin = v.x; if (v.x > xMax) xMax = v.x;
  }
  for (const v of out) if (v.p === 'zampa' && v.y > yMax) yMax = v.y;
  let tx0 = 1e9, tx1 = -1e9;
  for (const v of out) if (v.p === 'coda') { if (v.x < tx0) tx0 = v.x; if (v.x > tx1) tx1 = v.x; }
  const nz = (x, y, z) => { const a = Math.sin(x * 0.61 + z * 1.7) + Math.sin(y * 0.83 - x * 0.37) + Math.sin(z * 0.97 + y * 0.53); return a / 3; };
  for (const v of out) {
    const k = fam.get(v.col); if (k === undefined || v.wing) continue;
    let due = false;
    const t = top.get(v.x), b = bot.get(v.x), h = (t ?? 0) - (b ?? 0);
    for (const tipo of tipi) {
      if (tipo === 'dorso' && (v.p === 'torace') && t !== undefined && v.y >= t - Math.max(R, Math.round(h * 0.28))) due = true;
      if (tipo === 'strisce' && v.p === 'torace' && t !== undefined && v.y > b + h * 0.35 && (Math.floor((v.x - xMin) / R) % 3) === 0) due = true;
      if (tipo === 'macchie' && (v.p === 'torace' || v.p === 'coda') && nz(v.x * 1.6 / R, v.y * 1.6 / R, v.z * 1.6 / R) > 0.3) due = true;
      if (tipo === 'ventre' && v.p === 'torace' && b !== undefined && v.y <= b + Math.max(R, Math.round(h * 0.36))) due = true;
      if (tipo === 'punte' && ((v.p === 'zampa' && v.y <= Math.max(R, yMax * 0.5)) || (v.p === 'coda' && v.x >= tx0 + (tx1 - tx0) * 0.6))) due = true;
      if (tipo === 'anelli' && v.p === 'coda' && (Math.floor((v.x - tx0) / R) % 2) === 1) due = true;
      if (tipo === 'testa' && v.p === 'cranio') due = true;
    }
    if (due) v.col = shadeHex(col2, k);
  }
}
/* CRINIERA: ciuffi sul collo e sulla spalla, del secondo colore — il leone, il cavallo, il bisonte */
function criniera(segsX, segs, segCys, frontX, neck, r, colT, out) {
  const col2 = r.col2 || shadeHex(mixHex(colT, '#2b2230', 0.4), 0.85);
  const x0 = frontX - neck * R, x1 = segsX[0] + Math.round(segs[0] * 0.3);
  for (let x = x0; x <= x1; x++) {
    /* la cima del corpo o del collo in quella colonna, poi due o tre voxel di pelo a ciuffi */
    let yTop = -1e9; for (const v of out) if (v.x === x && Math.abs(v.z) <= 1 && v.col && v.y > yTop) yTop = v.y;
    if (yTop < -1e8) continue;
    const alto = 1 + ((x * 7) % 3 === 0 ? 2 : 1) + (R > 2 ? 1 : 0);
    for (let d = 1; d <= alto; d++) for (let z = -1; z <= 1; z++) out.push({ x, y: yTop + d, z, col: shadeHex(col2, d === alto ? 0.8 : 1) });
  }
}

function buildFromRecipe(spec, mode, opts) {
  const out = [];
  const noLegs = !!(opts && opts.noLegs);   // cavalcatura in volo: corpo SENZA zampe (raccolte a parte)
  /* tag della parte (cranio/torace/zampa/coda/corno) sui voxel aggiunti da `i0` in poi:
     serve al Libro per "accendere" solo i pezzi consegnati al museo */
  const tagFrom = (i0, p) => { for (let i = i0; i < out.length; i++) if (!out[i].p) out[i].p = p; };
  const chest = spec.chest;
  const r = BP[chest.id] || { seg: [2, 2], legs: [4, 1], tail: 'short', head: 0 };
  const colT = spColor[chest.id] || '#c8b078';
  /* i raggi del blueprint sono in unità di ricetta: qui diventano voxel fini */
  const segs = (r.seg || [2]).map(v => U(v));
  const maxR = Math.max(...segs);
  const legDef = r.legs || [4, 1];
  const isBase = spec.heads.length === 1 && spec.heads[0].sp.id === chest.id &&
    spec.legs.every(l => l.id === chest.id) && spec.arms.every(a => a.id === chest.id) &&
    spec.tails.length === 1 && spec.tails[0].id === chest.id;
  const nLegs = noLegs ? 0 : (isBase ? legDef[0] : (legDef[0] === 0 ? 0 : Math.max(2, spec.legs.length * 2)));
  const legLen = legDef[1] || 0;
  const baseY = r.float ? U(6) : (noLegs ? U(3) : (nLegs > 0 ? (legLen >= 2 ? U(5) : U(2 + legLen * 2)) : U(1)));
  /* segmenti SOVRAPPOSTI → corpo sempre connesso; onda opzionale */
  const segsX = [], segCys = [], segCzs = [], topYs = [];
  const tSeg = out.length;
  let prevCx = null, prevR = 0;
  segs.forEach((sr, i) => {
    const cx = prevCx === null ? sr : prevCx + prevR + sr - R;
    const cz = r.wave ? Math.round(Math.sin(i * 1.4) * U(2)) : 0;
    const cy = baseY + maxR + (r.tall ? Math.round((segs.length - 1 - i) * U(1.5)) : 0);
    segRing(cx, cy, cz, sr, mode, colT, out);
    if (i > 0 && (r.wave || r.tall)) { // giunzione esplicita tra segmenti spostati
      const px2 = prevCx + prevR;
      for (let d = 0; d < R; d++) {
        const jy = Math.round((segCys[i - 1] + cy) / 2), jz = Math.round((segCzs[i - 1] + cz) / 2);
        out.push(mode === 'skel' ? { x: px2 + d, y: jy, z: jz, k: 'bone' } : { x: px2 + d, y: jy, z: jz, col: colT });
      }
    }
    segsX.push(cx); segCys.push(cy); segCzs.push(cz); topYs.push(cy + sr);
    prevCx = cx; prevR = sr;
  });
  /* carne: raccordo PIENO fra un segmento e l'altro, così il corpo è uno e non un bruco di palline */
  if (mode === 'flesh') for (let i = 1; i < segsX.length; i++) {
    const x0 = segsX[i - 1], x1 = segsX[i], rr = Math.round(Math.min(segs[i - 1], segs[i]) * 0.92);
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / Math.max(1, x1 - x0);
      const cy = Math.round(segCys[i - 1] * (1 - t) + segCys[i] * t), cz = Math.round(segCzs[i - 1] * (1 - t) + segCzs[i] * t);
      for (let dy = -rr; dy <= rr; dy++) for (let dz = -rr; dz <= rr; dz++) if (dy * dy + dz * dz <= rr * rr + rr)
        out.push({ x, y: cy + dy, z: cz + dz, col: colT });
    }
  }
  tagFrom(tSeg, 'torace');
  const frontX = segsX[0] - segs[0], backX = segsX[segsX.length - 1] + segs[segs.length - 1];
  /* zampe distribuite sotto i segmenti (con giunzione all'anca) */
  const tLeg = out.length;
  if (nLegs > 0) {
    const pairs = Math.round(nLegs / 2);
    for (let i = 0; i < pairs; i++) {
      const si = Math.min(segs.length - 1, Math.floor(i * segs.length / pairs));
      /* un corpo di un solo segmento: davanti sotto il petto, dietro sotto i fianchi. A due voxel
         l'una dall'altra le zampe si sovrapponevano in un blocco solo */
      const lx = segs.length === 1 && pairs > 1 ? segsX[0] + Math.round((i / (pairs - 1) - 0.5) * segs[0] * 1.2) : segsX[si] - U(1) + (i % 2) * U(2);
      /* i BIPEDI hanno le due gambe una avanti e una indietro: nella stessa colonna, di profilo se ne
         vedeva una sola, un trampolo */
      const stag = pairs === 1 ? U(1.2) : 0;
      /* davanti o dietro: il primo paio sta sotto il petto; i bipedi hanno solo le zampe di dietro */
      /* LO STILE DELLA ZAMPA è della specie delle ZAMPE: una chimera col torace d'insetto e le zampe
         di un cervo cammina sugli zoccoli. Prendendolo dal torace aveva le zampette d'insetto, che nel
         Libro erano pilastri. L'altezza resta quella del torace: è lui che decide dove sta la pancia. */
      const legSp = isBase ? chest : (spec.legs[i] || spec.legs[spec.legs.length - 1] || chest);
      const lr = BP[legSp.id] || r, ld = lr.legs || [4, 1];
      const arthro = !!(lr.ant || lr.head === 'none' || ld[0] >= 6);
      const forma = { kind: tipoZampa(lr, isBase ? pairs : Math.max(1, Math.round(ld[0] / 2))), hind: pairs === 1 || i >= pairs / 2 };
      for (const side of [-1, 1]) legVox(lx + side * stag, segCys[si], segCzs[si], segs[si], side, legLen, mode, colT, out, arthro, !!(opts && opts.tuckLegs), lr.zampe === 'robuste' ? 1 : lr.zampe === 'sottili' ? -1 : 0, forma);
    }
  } else if (!r.float && !noLegs) { // striscia: spuntoni ventrali attaccati al ventre
    segsX.forEach((sx, i) => { for (let d = 0; d < R; d++) {
      const vy = Math.max(0, segCys[i] - segs[i]);
      out.push(mode === 'skel' ? { x: sx + d, y: vy, z: segCzs[i], k: 'shade' } : { x: sx + d, y: vy, z: segCzs[i], col: shadeHex(colT, 0.8) });
    } });
    tagFrom(tLeg, 'torace');
  }
  tagFrom(tLeg, 'zampa');
  /* ali (dal blueprint o, per chimere, dalle braccia alate) */
  let wings = isBase ? r.wings : null;
  if (!isBase) {
    const wsp = spec.arms.find(a => (BP[a.id] || {}).wings);
    if (wsp) wings = [Math.min(4, Math.max(2, spec.arms.length)), BP[wsp.id].wings[1]];
  }
  const tWing = out.length;
  if (!wings && opts && opts.addWings) wings = opts.addWings;          // cavalcatura: vola anche se la chimera non ha braccia alate
  /* le ali a membrana nascono a METÀ del corpo (dove siede il pilota e dove sta il baricentro), non sul
     primo segmento: attaccate davanti, l'ala vicina copriva la faccia di chi cavalca */
  const wi = wings && wings[1] === 'm' && segsX.length > 1 ? Math.floor(segsX.length / 2) : 0;
  if (wings) { wingVox(segsX[wi], topYs[wi], wings[0], wings[1], mode, colT, out, opts && opts.wingFlap); tagFrom(tWing, 'zampa'); }
  /* collo + teste (ogni testa con lo stile della SUA specie), raccordati */
  const tNeck = out.length;
  const neck = r.neck || 0;
  let nx = frontX, ny = segCys[0];
  for (let i = 1; i <= neck * U(2); i++) {
    nx = frontX - Math.ceil(i / 2); ny = segCys[0] + i;
    /* il collo è una colonna, non un filo: a griglia doppia un voxel solo sarebbe un capello */
    if (mode === 'flesh') {                                   // collo pieno: largo alla base, più sottile verso la testa
      const rr = Math.max(1, Math.round(R * (1.3 - 0.4 * i / (neck * U(2)))));
      for (let dz = -rr; dz <= rr; dz++) for (let d = -rr; d <= rr; d++) if (dz * dz + d * d <= rr * rr + 1) out.push({ x: nx + d, y: ny, z: dz, col: colT });
    } else for (let d = 0; d < R - 1 || d < 1; d++) out.push({ x: nx + d, y: ny, z: 0, k: 'bone' });
  }
  tagFrom(tNeck, 'torace'); // il collo appartiene al torace
  const tHead = out.length;
  if (r.head === 'none' && isBase) { // occhi sul davanti del corpo
    const push = (x, y, z) => out.push(mode === 'skel' ? { x, y, z, k: 'eye' } : { x, y, z, col: '#33291f' });
    for (const s of [-1, 1]) for (let d = 0; d < R; d++) for (let e = 0; e < R; e++) push(frontX + 1 + d, segCys[0] + U(0.5) + e, s * U(1));
    headExtras(r, frontX + U(1), segCys[0], mode, colT, out);
  } else {
    /* la NUCA tocca il corpo: il cranio parte con la sua faccia posteriore su `hx`, quindi
       hx dev'essere UNA casella prima del collo, non una unità di ricetta (a griglia doppia
       due voxel lasciavano un vuoto e la testa si staccava — flood-fill al 43%). */
    const hx = nx - 1, hy = Math.max(1, ny);
    const hz = spec.heads.length === 1 ? [0] : spec.heads.length === 2 ? [-U(2), U(2)] : [-U(3), 0, U(3)];
    spec.heads.forEach((h, i) => {
      if (mode === 'skel') skullVoxels(h.sp, h.horns, hx, hy, hz[i], out);
      else fleshHead(h.sp, h.horns, hx, hy, hz[i], out);
      if (hz[i]) for (let d = 0; d < R; d++) {                        // giunzione teste laterali
        const jz = hz[i] > 0 ? hz[i] - U(1) + d : hz[i] + U(1) - d;
        out.push(mode === 'skel' ? { x: hx, y: hy, z: jz, k: 'bone' } : { x: hx, y: hy, z: jz, col: colT });
      }
    });
    headExtras(r, hx, hy, mode, colT, out);
  }
  tagFrom(tHead, 'cranio'); // (i corni sono già taggati dentro skullVoxels)
  /* code: parte DENTRO la superficie posteriore → sempre raccordate */
  const tTail = out.length;
  const tls = isBase ? [chest] : spec.tails;
  const tzs = tls.length === 1 ? [0] : tls.length === 2 ? [-U(1), U(1)] : [-U(2), 0, U(2)];
  tls.forEach((tsp, i) => {
    const kind0 = (BP[tsp.id] || {}).tail || r.tail || 'short';
    const kind = (kind0 === 'none' && !isBase) ? 'short' : kind0;
    const colX = spColor[tsp.id] || colT;
    const before = out.length;
    tailVox(backX - U(1), segCys[segCys.length - 1], kind, mode, colX, out);
    if (tzs[i]) for (let k2 = before; k2 < out.length; k2++) out[k2].z += tzs[i];
  });
  tagFrom(tTail, 'coda');
  const tExtra = out.length;
  if (r.extra) { extraVox(maxR, segsX, topYs, r.extra, mode, colT, out); tagFrom(tExtra, 'torace'); }
  if (mode === 'flesh' && r.criniera) { const t0 = out.length; criniera(segsX, segs, segCys, frontX, neck, r, colT, out); tagFrom(t0, 'torace'); }
  if (mode === 'flesh' && r.mantello) mantello(out, r, colT);
  const seen = new Set(), ded = [];
  for (const v of out) { const k = v.x + ',' + v.y + ',' + v.z; if (!seen.has(k)) { seen.add(k); ded.push(v); } }
  return saldaPezzi(ded);
}

/* NIENTE PEZZI VOLANTI. Le forme si disegnano ognuna per conto suo e gli arrotondamenti lasciano
   buchi: corna a un voxel dal cranio, costole staccate dalla spina, la metà dietro di un corpo a
   più segmenti sospesa accanto a quella davanti («alcuni pezzi sono staccati e volanti, tipo le
   corna»). Dal pezzo più grande si salda ogni volta il pezzo più VICINO, con un ponte di voxel
   uguali al suo punto più vicino: così le due metà di un corpo si ritrovano prima, e le costole si
   attaccano alla metà giusta invece di tirare un filo lungo. Vicini = anche in diagonale. */
export function saldaPezzi(vox) {
  if (vox.length < 2) return vox;
  const K = (x, y, z) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  const at = new Map(); for (const v of vox) at.set(K(v.x, v.y, v.z), v);
  const comp = new Map(), pezzi = [];
  for (const v of vox) {
    const k0 = K(v.x, v.y, v.z); if (comp.has(k0)) continue;
    const id = pezzi.length, lista = [v], st = [v]; comp.set(k0, id);
    while (st.length) {
      const p = st.pop();
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let e = -1; e <= 1; e++) {
        const k = K(p.x + a, p.y + b, p.z + e), q = at.get(k);
        if (q && !comp.has(k)) { comp.set(k, id); lista.push(q); st.push(q); }
      }
    }
    pezzi.push(lista);
  }
  if (pezzi.length === 1) return vox;
  pezzi.sort((a, b) => b.length - a.length);
  const corpo = pezzi[0].slice(), resto = pezzi.slice(1), ponti = [];
  while (resto.length) {
    /* 2 è la distanza minima fra due pezzi separati, ed è quella di quasi tutti: trovata, si smette */
    let best = null;
    cerca: for (let i = 0; i < resto.length; i++) for (const p of resto[i]) for (const q of corpo) {
      const d = Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.z - q.z));
      if (!best || d < best.d) { best = { d, i, p, q }; if (d <= 2) break cerca; }
    }
    const { i, p, q, d } = best;
    for (let t = 1; t < d; t++) {
      const x = p.x + Math.round((q.x - p.x) * t / d), y = p.y + Math.round((q.y - p.y) * t / d), z = p.z + Math.round((q.z - p.z) * t / d);
      if (!at.has(K(x, y, z))) { const v = { ...p, x, y, z }; at.set(K(x, y, z), v); ponti.push(v); corpo.push(v); }
    }
    corpo.push(...resto[i]); resto.splice(i, 1);
  }
  return vox.concat(ponti);
}

/* voxel del SINGOLO pezzo (zaino/negozio/museo): stesso modello del 3D, isolato.
   Anche qui tutto in voxel fini, così un cranio nello zaino e lo stesso cranio nello
   scheletro montato sono lo stesso disegno alla stessa scala. */
export function partVoxels(spId, part) {
  const out = [];
  const r = BP[spId] || { seg: [2, 2], legs: [4, 1], tail: 'short' };
  const colT = spColor[spId] || '#c8b078';
  if (part === 'cranio') skullVoxels({ id: spId }, Math.min(2, r.horns === undefined ? 1 : r.horns), U(6), U(2), 0, out);
  else if (part === 'torace') {
    const segs = (r.seg || [2]).map(v => U(v)); let prevCx = null, prevR = 0;
    segs.forEach(sr => {
      const cx = prevCx === null ? sr : prevCx + prevR + sr - R;
      segRing(cx, Math.max(...segs), 0, sr, 'skel', colT, out);
      prevCx = cx; prevR = sr;
    });
  } else if (part === 'zampa') legVox(U(2), U(6), 0, U(2), 1, Math.max(1, (r.legs || [4, 1])[1] || 1), 'skel', colT, out);
  else if (part === 'coda') tailVox(0, U(3), (r.tail && r.tail !== 'none') ? r.tail : 'short', 'skel', colT, out);
  else { // corno: spuntone curvo che si assottiglia, più lungo per le specie cornute
    const hlen = U(4 + (r.horns ? 2 : 0));
    for (let i = 0; i < hlen; i++) {
      const th = i < hlen * 0.5 ? R : 1;
      for (let d = 0; d < th; d++) out.push({ x: Math.floor(i / 2), y: i, z: d, k: i >= hlen - R ? 'shade' : 'bone' });
    }
  }
  return out;
}

/* IL PIEDISTALLO mostra lo SCHELETRO VERO della specie (lo stesso del Libro, già saldato) coi soli
   pezzi consegnati. Rimontarli a mano con spostamenti fissi uguali per tutti lasciava il cranio per
   aria sulle specie dal collo lungo (Ninfeasauro, segnalato con foto). Con tutti i pezzi è lo
   scheletro intero; con alcuni, ognuno sta al suo posto anatomico. */
export function composedPartsVox(spId, parts) {
  const full = buildFromRecipe(clampSpec(baseSpec({ id: spId })), 'skel');
  const want = new Set(parts);
  return full.filter(v => want.has(v.p)).map(v => ({ x: v.x, y: v.y, z: v.z, k: v.k, p: v.p }));
}

export function buildVoxels(rawSpec, opts) { return atRes(opts, () => buildFromRecipe(clampSpec(rawSpec), 'skel', opts)); }
export function buildFleshVoxels(rawSpec, opts) { return atRes(opts, () => buildFromRecipe(clampSpec(rawSpec), 'flesh', opts)); }
