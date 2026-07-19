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
export function packExplored(obj) {
  const rows = new Map();
  for (const k in (obj || {})) {
    const i = k.indexOf(',');
    const cx = +k.slice(0, i), cy = +k.slice(i + 1);
    let r = rows.get(cy); if (!r) { r = []; rows.set(cy, r); }
    r.push(cx);
  }
  const out = {};
  for (const [cy, xs] of rows) {
    xs.sort((a, b) => a - b);
    const parts = [];
    let start = xs[0], prev = xs[0];
    for (let i = 1; i <= xs.length; i++) {
      const v = xs[i];
      if (v === prev + 1) { prev = v; continue; }
      parts.push(start === prev ? b36(start) : b36(start) + '-' + b36(prev));
      start = v; prev = v;
    }
    out[b36(cy)] = parts.join(',');
  }
  return out;
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
