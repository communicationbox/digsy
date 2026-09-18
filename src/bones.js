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
  for (const z of hz) for (let i = 0; i < hlen; i++) {
    const th = i < hlen * 0.35 ? 2 : i < hlen * 0.7 ? 1 : 0;
    for (let d = 0; d <= th; d++) for (let e = 0; e <= th; e++)
      P(-U(0.5) + Math.floor(i / 2) + e, cy + U(1.4) + i, z + d * Math.sign(z || 1), i >= hlen - 2 ? '#b8ad96' : '#ece4cf');
  }
}

/* ================= BLUEPRINT per specie: 60 ricette curate, ispirate alla natura =================
   seg: raggi dei segmenti del corpo (1=piccolo,2,3=grande) — formiche/vespe = più segmenti
   legs: [numero, lunghezza 0-2] (0 zampe = striscia/fluttua) · wings: [n, 'm'embrana|'f'piume|'i'nsetto]
   head: 0 tozzo · 1 muso lungo · 2 becco · 3 cupola · 'none' (occhi sul corpo)
   mand/ant/prob: mandibole·antenne·proboscide · tail: none|short|long|club|sting|fin
   extra: sail|spikes|shell|hump · float: fluttua · wave: corpo ondulato · tall: eretto */
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
  brontorana: { seg: [3], legs: [4, 1], tail: 'none', head: 0, horns: 0, extra: 'hump' },
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
function legVox(lx, cy, cz, sr, side, len, mode, colT, out, arthro, tuck) {
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
    let z = cz + side * sr;
    spesso(lx, cy, z, 'bone', R);                                        // anca sul fianco
    for (let j = 1; j <= U(2); j++) { z = cz + side * (sr + j); spesso(lx, cy + j, z, 'bone', R - (j > U(1) ? 1 : 0)); }
    P(lx, cy + U(2), z, 'dark');
    for (let y = cy + U(1); y >= 0; y--) spesso(lx, y, z, y % R ? 'shade' : 'bone', y < U(1) ? R : 1);   // scende e poggia largo
  } else {
    const attachY = cy - sr, zz = cz + side;
    spesso(lx, attachY, cz, 'bone', R);                                  // giunzione al ventre
    for (let y = attachY; y >= 0; y--) {
      /* nella carne la coscia è piena e si assottiglia verso la caviglia; lo scheletro resta osso */
      const th = mode === 'flesh' ? (y > attachY * 0.55 ? R + 2 : R + 1) : R;   // gambe piene: con un voxel e mezzo erano stecchi
      spesso(lx - (mode === 'flesh' && y > attachY * 0.55 ? 1 : 0), y, zz, y === Math.floor(attachY / 2) && mode !== 'flesh' ? 'dark' : 'bone', th);
    }
    for (let d = -1; d < R + 2; d++) for (let e = 0; e < R; e++) P(lx + d, 0, zz + e * side, mode === 'flesh' ? 'dark' : 'shade');   // piede largo
  }
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
      const lx = segsX[si] - U(1) + (i % 2) * U(2);
      /* i BIPEDI hanno le due gambe una avanti e una indietro: nella stessa colonna, di profilo se ne
         vedeva una sola, un trampolo */
      const stag = pairs === 1 ? U(1.2) : 0;
      for (const side of [-1, 1]) legVox(lx + side * stag, segCys[si], segCzs[si], segs[si], side, legLen, mode, colT, out, !!(r.ant || r.head === 'none' || legDef[0] >= 6), !!(opts && opts.tuckLegs));
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
  const seen = new Set(), ded = [];
  for (const v of out) { const k = v.x + ',' + v.y + ',' + v.z; if (!seen.has(k)) { seen.add(k); ded.push(v); } }
  return ded;
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

/* montaggio museale: SOLO i pezzi consegnati, disposti in posa anatomica */
const EX_OFF = { torace: [0, 0], cranio: [-U(7), U(3)], zampa: [U(3), -U(5)], coda: [U(8), U(1)], corno: [-U(7), U(9)] };
export function composedPartsVox(spId, parts) {
  const vox = [];
  for (const p of parts) {
    const o = EX_OFF[p] || [0, 0];
    for (const v of partVoxels(spId, p)) vox.push({ x: v.x + o[0], y: v.y + o[1], z: v.z, k: v.k });
  }
  return vox;
}

export function buildVoxels(rawSpec, opts) { return atRes(opts, () => buildFromRecipe(clampSpec(rawSpec), 'skel', opts)); }
export function buildFleshVoxels(rawSpec, opts) { return atRes(opts, () => buildFromRecipe(clampSpec(rawSpec), 'flesh', opts)); }
