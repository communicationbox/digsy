/* MOBILI IN VOXEL — forme piccole disegnate a mano per l'arredo della casa (M4): una per
   ogni pezzo (o per "famiglia" quando la sagoma è la stessa, colorata dal `col` del pezzo
   in data.js). Stesso spirito delle meraviglie/blueprint delle specie: forme CURATE, non un
   cubo generico per tutto. Usate sia per la miniatura 2D (projectVox) sia per la vista 3D
   (mountFurniture3D in bookui.js, stesso motore Three dello scheletro). */
import { FURN_BY_ID, PEDESTAL_ID } from './data.js';
import { shadeHex } from './bones.js';
import { packVoxelsForCategory } from './furnPack.js';

function box(out, x0, y0, z0, w, d, h, col) {
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) for (let z = 0; z < h; z++) out.push({ x: x0 + x, y: y0 + y, z: z0 + z, col });
}

/* tappeto: lastra larga e sottile, con bordo + trama (non un rettangolo di colore piatto) */
function rugVox(col) {
  const out = []; box(out, 0, 0, 0, 7, 5, 1, shadeHex(col, 0.85));
  box(out, 1, 1, 1, 5, 3, 1, col);
  box(out, 2, 2, 1, 1, 1, 1, shadeHex(col, 1.3));                  // fiocco centrale
  return out;
}
/* letto: base + testiera + cuscino + risvolto della coperta */
function bedVox(col) {
  const out = [];
  box(out, 0, 0, 0, 6, 4, 1, col);
  box(out, 0, 0, 1, 6, 1, 1, shadeHex(col, 0.8));                  // risvolto in fondo, tono più scuro
  box(out, 0, 3, 1, 6, 1, 2, shadeHex(col, 0.75));                 // testiera
  box(out, 1, 0, 1, 2, 2, 1, shadeHex(col, 1.3));                  // cuscino
  return out;
}
/* tavolo: 4 gambe + piano, con bordo del piano rifinito */
function tableVox(col) {
  const out = [], leg = shadeHex(col, 0.65);
  box(out, 0, 0, 0, 1, 1, 2, leg); box(out, 4, 0, 0, 1, 1, 2, leg);
  box(out, 0, 3, 0, 1, 1, 2, leg); box(out, 4, 3, 0, 1, 1, 2, leg);
  box(out, 0, 0, 2, 5, 4, 1, col);
  box(out, 0, 0, 3, 5, 4, 1, shadeHex(col, 1.2));                  // filo di luce sul bordo del piano
  return out;
}
/* baule/scrigno */
function chestVox(col) { const out = []; box(out, 0, 0, 0, 4, 3, 3, col); box(out, 0, 0, 3, 4, 3, 1, shadeHex(col, 1.25)); return out; }
/* cactus/pianta: tronco + due bracci */
function cactusVox(col) {
  const out = [];
  box(out, 1, 1, 0, 2, 2, 5, col);
  box(out, 0, 1, 2, 1, 2, 2, shadeHex(col, 1.1)); box(out, 3, 1, 3, 1, 2, 2, shadeHex(col, 1.1));
  return out;
}
/* sedia/trono/poltrona: seduta + schienale alto + BRACCIOLI — solo seduta+schienale (un
   parallelepipedo piatto e uno alto dietro) proiettato in scorcio si leggeva come una
   cassapanca scura, non una poltrona (segnalato: "questa è una poltrona... a me non
   sembra"). I braccioli sui due lati sono quello che la fa riconoscere a colpo d'occhio. */
function chairVox(col) {
  /* la proiezione a scorcio di projectFurnIso appiattisce x/z sullo stesso asse verticale:
     braccioli allo stesso ingombro orizzontale di seduta/schienale (il tentativo precedente)
     restavano DENTRO lo stesso rettangolo e sparivano nella sagoma — sembrava sempre una
     cassapanca. Qui seduta+schienale stanno SOLO nelle 2 colonne centrali (più STRETTI dei
     braccioli): i braccioli, più bassi ma più LARGHI ai lati, spuntano fuori e si vedono. */
  /* legno scuro per struttura/braccioli, CUSCINO chiaro per la seduta — a questa scala le
     tinte vicine (0.75/0.85 dello stesso colore) si fondevano in un'unica massa: serve un
     salto di tono vero, come legno+stoffa in un mobile reale, non solo ombra/luce. */
  const out = [], wood = shadeHex(col, 0.6), cushion = shadeHex(col, 2.1);
  box(out, 1, 0, 0, 2, 4, 1, cushion);        // cuscino della seduta, colonne centrali, CHIARO
  box(out, 1, 3, 1, 2, 1, 3, wood);           // schienale alto, sopra la seduta
  box(out, 0, 0, 0, 1, 4, 2, wood);           // bracciolo sinistro: fuori dalla seduta, basso
  box(out, 3, 0, 0, 1, 4, 2, wood);           // bracciolo destro
  return out;
}
/* vaso con fiore/ninfea */
function vaseVox(col) { const out = []; box(out, 1, 1, 0, 2, 2, 3, col); box(out, 0, 0, 3, 4, 4, 1, '#7fbf6a'); return out; }
/* lampada/braciere/cristallo ornamentale: piedistallo + cima che risalta */
function lampVox(col) { const out = []; box(out, 1, 1, 0, 1, 1, 4, shadeHex(col, 0.7)); box(out, 0, 0, 4, 3, 3, 1, shadeHex(col, 1.3)); return out; }
/* piedistallo museale: base larga, colonna, ripiano */
function pedestalVox(col) {
  const out = [];
  box(out, 0, 0, 0, 4, 4, 1, shadeHex(col, 0.7));
  box(out, 1, 1, 1, 2, 2, 3, col);
  box(out, 0, 0, 4, 4, 4, 1, shadeHex(col, 1.3));
  return out;
}
function boxVox(col) { const out = []; box(out, 0, 0, 0, 4, 4, 2, col); box(out, 0, 0, 2, 4, 4, 1, shadeHex(col, 1.2)); return out; }

/* forma per SLOT/parola chiave nell'id: coprono tutti e 24 i pezzi + il piedistallo.
   Dove esiste un pezzo VERO nel pacchetto importato (MariaIsMe, furnPack.js) si usa quello —
   modellato a mano con texture propria, non un parallelepipedo colorato. La variante si
   sceglie dall'id (deterministico: lo stesso mobile mostra sempre lo stesso pezzo). Nessun
   pezzo del pacchetto per tappeto/cassa/lampada/cristallo: lì resta la forma procedurale. */
/* ruota una forma voxel di 90°×rot attorno all'asse verticale (z invariato): usata per
   orientare un mobile piazzato senza bisogno di 4 modelli disegnati a mano. */
export function rotateFurnVoxels(vox, rot) {
  rot = ((rot % 4) + 4) % 4;
  let out = vox;
  for (let i = 0; i < rot; i++) {
    let mx = 0; for (const v of out) if (v.x > mx) mx = v.x;
    out = out.map(v => ({ x: v.y, y: mx - v.x, z: v.z, col: v.col }));
  }
  return out;
}
/* categoria di un mobile dall'id/slot — UNA sola funzione: `furnVoxels` e `furnPxScale`
   devono concordare su cos'è cosa, o la forma disegnata e la scala scelta per lei divergono
   in silenzio (è già successo: uno derivava la scala dalla forma, l'altro la ridisegnava). */
export function furnCategory(id) {
  const it = FURN_BY_ID[id]; if (!it) return 'box';
  if (it.slot === 'pedestal' || id === PEDESTAL_ID) return 'pedestal';
  if (it.slot === 'tappeto') return 'rug';
  if (it.slot === 'letto') return 'bed';
  if (it.slot === 'tavolo') return 'table';
  if (id.includes('chest')) return 'chest';
  if (id.includes('cactus') || id.includes('vase')) return 'plant';
  if (id.includes('chair') || id.includes('throne')) return 'chair';
  if (id.includes('lamp') || id.includes('crystal') || id.includes('hearth')) return 'lamp';
  return 'box';
}
export function furnVoxels(id) {
  const it = FURN_BY_ID[id]; if (!it) return [];
  const col = it.col || '#c8b078';
  const cat = furnCategory(id);
  if (cat === 'pedestal') return pedestalVox(col);
  if (cat === 'rug') return rugVox(col);
  if (cat === 'bed') return packVoxelsForCategory('bed', id) || bedVox(col);
  if (cat === 'table') return packVoxelsForCategory('table', id) || tableVox(col);
  if (cat === 'chest') return chestVox(col);
  if (cat === 'plant') return packVoxelsForCategory('plant', id) || (id.includes('vase') ? vaseVox(col) : cactusVox(col));
  if (cat === 'chair') return packVoxelsForCategory('chair', id) || chairVox(col);
  if (cat === 'lamp') return lampVox(col);
  return boxVox(col);
}
/* SCALA IN PIXEL, CURATA PER CATEGORIA — non un rapporto col volume del modello né con la
   casella: un piedistallo (4×4 voxel) e una sedia del pacchetto importato (fino a 16×16×16,
   ma il vero contenuto è più snello) hanno proporzioni troppo diverse perché UNA formula li
   accontenti entrambi. Prima si è provato con un passo unico (la sedia comune diventava
   enorme rispetto al letto), poi con un bersaglio min/max legato a TS (il piedistallo
   spariva sotto la soglia) — sempre la stessa idea sbagliata: dedurre la scala dai voxel.
   Qui ogni famiglia ha il SUO numero, scelto guardando il risultato (come i blueprint delle
   specie in bones.js), scalabile da sola senza spostare le altre. `tw` è la larghezza in
   pixel di UN voxel nella losanga isometrica (vedi projectFurnIso in interiors.js).
   Le sedie del pacchetto hanno gambe di 1 SOLO voxel: sotto ~1,6px di passo restano un filo
   invisibile — segnalato in foto ("la sedia non ha le gambe"), non erano sparite dal
   modello, erano più sottili di un pixel su schermo. */
export const FURN_PX = {
  pedestal: 2.2, rug: 1.7, bed: 1.0, table: 1.3,
  chest: 1.9, plant: 1.9, chair: 1.8, lamp: 2.0, box: 1.8,
};
export function furnPxScale(id) { return FURN_PX[furnCategory(id)] ?? 1.4; }
/* SOLIDO vs DECORO: un tappeto o una pianta piccola non bloccano il passo — un oggetto più
   piccolo di una casella che però la occupa TUTTA come un mobile vero si segnalava da solo
   ("se metto oggetti più piccoli di una casella non ci cammino attorno"). Il piedistallo
   resta solido: è un mobile vero (espone uno scheletro), non un decoro a terra. */
const FURN_DECOR = new Set(['rug', 'plant']);
export function furnIsSolid(id) { return !FURN_DECOR.has(furnCategory(id)); }
