/* COMPRESSIONE DELLA MAPPA ESPLORATA — modulo puro, senza dipendenze (lo importa anche
   state.js, che non può dipendere da map.js senza creare un ciclo all'avvio).
   `S.explored` è un oggetto {"cx,cy": 1}: comodo da leggere, pessimo da salvare — circa 14
   byte per blocco. Lo stress test dice che a 10 milioni di caselle scoperte il salvataggio
   arriva a 18 MB, ben oltre i ~5 MB che un browser concede: la partita smetterebbe di
   salvarsi proprio a chi ha giocato di più.

   Qui i blocchi si impacchettano per RIGA, con gli intervalli contigui scritti una volta
   sola ("da 12 a 47"). Camminare produce blocchi adiacenti, quindi gli intervalli sono
   lunghi e il risparmio è enorme. Numeri in base 36 per accorciare ancora.
   Formato: { "<cy in b36>": "a-b,c,d-e" }. */
/* IMPACCHETTATO UNA VOLTA, POI SOLO LE RIGHE TOCCATE. L'autosave gira ogni 5 secondi e rifaceva
   tutto da capo: con stress=5 (un milione di blocchi e un milione di scavi) erano 300 ms di fermo
   ogni 5 secondi ("ogni tanto tira una laggata"). Si tiene l'indice per riga dell'insieme già visto
   e chi aggiunge lo dice (`noteExplored` da map.js, `noteDug` dallo scavo): al salvataggio si
   riscrivono solo le righe cambiate. Un insieme diverso (caricamento, vanilla) si rifà da capo da
   solo; chi riempie lo STESSO insieme a mano chiama il reset (vedi il comando stress). */
function rowPacker() {
  let pack = null;   // { obj, rows: Map y → Set x, out: { b36(y): "a-b,…" }, dirty: Set y }
  const add = (rows, key) => {
    const i = key.indexOf(',');
    const x = +key.slice(0, i), y = +key.slice(i + 1);
    let r = rows.get(y); if (!r) { r = new Set(); rows.set(y, r); }
    r.add(x);
    return y;
  };
  return {
    mark(obj, key) { if (pack && pack.obj === obj) pack.dirty.add(add(pack.rows, key)); },
    reset() { pack = null; },
    pack(obj, source) {
      if (pack && pack.obj === obj) {
        for (const y of pack.dirty) pack.out[b36(y)] = packRow(pack.rows.get(y));
        pack.dirty.clear();
        return { ...pack.out };
      }
      const rows = new Map();
      for (const k of source()) add(rows, k);
      const out = {};
      for (const [y, xs] of rows) out[b36(y)] = packRow(xs);
      pack = { obj, rows, out, dirty: new Set() };
      return { ...out };
    },
  };
}
function packRow(set) {
  const xs = [...set].sort((a, b) => a - b), parts = [];
  let start = xs[0], prev = xs[0];
  for (let i = 1; i <= xs.length; i++) {
    const v = xs[i];
    if (v === prev + 1) { prev = v; continue; }
    parts.push(start === prev ? b36(start) : b36(start) + '-' + b36(prev));
    start = v; prev = v;
  }
  return parts.join(',');
}
const EXPLORED = rowPacker(), DUG = rowPacker();
export function noteExplored(obj, cx, cy) { EXPLORED.mark(obj, cx + ',' + cy); }
export function resetExploredPack() { EXPLORED.reset(); }
export function packExplored(obj) {
  obj = obj || {};
  return EXPLORED.pack(obj, () => Object.keys(obj));   // le chiavi solo se va rifatto: un milione costano 130 ms
}
/* le CASELLE SCAVATE, stesso formato per riga: erano un array di stringhe "x,y" ed erano il 97% del
   salvataggio (10 MB su 10,4 con un milione di scavi) */
export function noteDug(set, key) { DUG.mark(set, key); }
export function resetDugPack() { DUG.reset(); }
export function packDug(set) { return DUG.pack(set, () => set); }
export function unpackDug(packed) {
  if (Array.isArray(packed)) return packed;                 // formato vecchio
  const o = unpackExplored(packed);
  return Object.keys(o);
}
export function unpackExplored(packed) {
  const out = {};
  if (!packed) return out;
  /* il vecchio formato {"cx,cy":1} resta leggibile: i salvataggi già in giro non si rompono */
  for (const k in packed) {
    if (k.includes(',')) { out[k] = 1; continue; }
    const cy = p36(k);
    for (const part of String(packed[k]).split(',')) {
      if (!part) continue;
      const dash = part.indexOf('-', 1);
      if (dash < 0) { out[p36(part) + ',' + cy] = 1; continue; }
      const a = p36(part.slice(0, dash)), b = p36(part.slice(dash + 1));
      for (let x = a; x <= b; x++) out[x + ',' + cy] = 1;
    }
  }
  return out;
}
function b36(n) { return n < 0 ? '-' + (-n).toString(36) : n.toString(36); }
function p36(s) { return s[0] === '-' ? -parseInt(s.slice(1), 36) : parseInt(s, 36); }
