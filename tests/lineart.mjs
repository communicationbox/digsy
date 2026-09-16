/* LA REGOLA DEL CONTORNO — `npm run lineart` (gira anche dentro `npm test`)
 *
 * Regola di design del gioco, detta dal giocatore e ripetuta più volte davanti alle foto:
 *
 *     quello che ha una LINEART si può toccare · quello che non ce l'ha è paesaggio
 *
 * Non è una questione di gusto: il giocatore prova {act} su quello che sembra toccabile, e
 * se non succede niente impara a diffidare di TUTTO. È già successo coi funghi marroni e con
 * le rotoballe ("sembra proprio che si possano raccogliere").
 *
 * La lineart NON deve essere nera: può essere un tono molto più scuro — o più chiaro — dello
 * stesso colore. Quello che conta è che sia una linea CHIUSA attorno alla sagoma. Ed è
 * esattamente ciò che si misura qui: si disegna lo sprite su una canvas vera (il recorder di
 * stub.mjs), si prende la sagoma e per ognuno dei quattro lati si guarda quanta parte del
 * bordo stacca dal corpo. Il punteggio è il MINIMO fra i quattro lati, perché una semplice
 * ombreggiatura stacca su un lato solo e un contorno su tutti.
 */
import { installStubs } from './stub.mjs';
installStubs();

let ok = 0, fail = 0;
const check = (nome, cond, extra = '') => {
  if (cond) { ok++; console.log('  ok  ' + nome); }
  else { fail++; console.log('  FAIL ' + nome + (extra ? ' → ' + extra : '')); }
};

const props = await import('../src/props.js');
const deco = await import('../src/decoArt.js');
const brush = await import('../src/brush.js');
const render = await import('../src/render.js');
const g = brush.BRUSH;

const W = 96, H = 96;
const luma = (r, gg, b) => 0.299 * r + 0.587 * gg + 0.114 * b;
/* disegna lo sprite e ne misura il contorno */
function misura(fn) {
  globalThis.__rec.start(W, H);
  try { fn(); } catch (e) { globalThis.__rec.stop(); throw e; }
  const { buf } = globalThis.__rec.stop();
  const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : buf[(y * W + x) * 4 + 3];
  const L = (x, y) => luma(buf[(y * W + x) * 4], buf[(y * W + x) * 4 + 1], buf[(y * W + x) * 4 + 2]);
  const solid = (x, y) => A(x, y) >= 128;              // l'ombra di contatto è trasparente: non è sagoma
  const lati = { sx: [], dx: [], su: [], giu: [] }, dentroL = [];
  let area = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!solid(x, y)) continue;
    area++;
    /* i pezzetti sottili (fili di paglia, ciuffi d'erba, steli) non sono contorno: si contano
       solo i pixel sul bordo di un CORPO, con abbastanza sagoma attorno */
    let vicini = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && solid(x + i, y + j)) vicini++;
    if (vicini < 4) continue;
    let bordo = false;
    if (!solid(x - 1, y)) { lati.sx.push([x, y]); bordo = true; }
    if (!solid(x + 1, y)) { lati.dx.push([x, y]); bordo = true; }
    if (!solid(x, y - 1)) { lati.su.push([x, y]); bordo = true; }
    if (!solid(x, y + 1)) { lati.giu.push([x, y]); bordo = true; }
    if (!bordo) dentroL.push(L(x, y));
  }
  dentroL.sort((a, b) => a - b);
  const med = dentroL.length ? dentroL[dentroL.length >> 1] : 0;
  const quota = arr => arr.length < 8 ? null : arr.filter(([x, y]) => Math.abs(L(x, y) - med) >= 26).length / arr.length;
  const quote = Object.values(lati).map(quota).filter(q => q !== null);
  /* sprite SOTTILI (un fiore, degli steli): non hanno un "dentro" da confrontare. Per loro la
     domanda diventa più semplice: c'è o no un tono molto più scuro del corpo, cioè una linea? */
  let scuri = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y) && L(x, y) <= med - 40) scuri++;
  return { cop: quote.length ? Math.min(...quote) : 0, corpo: dentroL.length, area, scuri };
}

/* --- L'ELENCO. `tocca` = ci si può fare qualcosa con {act} (raccogliere, spaccare,
   abbattere, aprire un pannello). Se si aggiunge una decorazione al mondo, va aggiunta qui:
   è la lista che tiene la promessa. --- */
const SPRITE = [
  // NATURA — si abbatte con l'accetta
  ['albero', true, () => props.drawTree(32, 40, 0, 3, 5)],
  ['albero secco', true, () => props.drawDeadtree(32, 40, 3, 5)],
  ['cactus', true, () => props.drawCactus(32, 40, 3, 5)],
  // NATURA — si spacca col piccone
  ['masso', true, () => props.drawBoulder(32, 40, 3, 5)],
  ['guglia rossa', true, () => props.drawRedspire(32, 40, 3, 5)],
  ['cristallo di minerale', true, () => props.drawOrecrystal(32, 40, 3, 5)],
  ['cristallo di ghiaccio', true, () => props.drawIcecrystal(32, 40, 3, 5)],
  ['costole nella sabbia', true, () => props.drawBonespire(32, 40, 3, 5)],
  // NATURA — si raccoglie (solo la versione MATURA)
  ['fungo maturo', true, () => props.drawMushroom(32, 40, 0, 3, 5, true)],
  ['conchiglia intera', true, () => props.drawShell(32, 40, true)],
  ['fiordaliso', true, () => props.drawFlower(32, 40, 3, 5, true)],
  ['giunco maturo', true, () => props.drawReed(32, 40, 0, 3, 5, true)],
  // PAESAGGIO — non si tocca niente
  ['ceppo', false, () => props.drawStump(32, 40, 3, 5)],
  ['rotoballa', false, () => props.drawHay(32, 40, 3, 5)],
  ['fungo marrone', false, () => props.drawMushroom(32, 40, 0, 3, 5, false)],
  ['conchiglia rotta', false, () => props.drawShell(32, 40, false)],
  ['fiore di prato', false, () => props.drawFlower(32, 40, 3, 5, false)],
  ['canne', false, () => props.drawReed(32, 40, 0, 3, 5, false)],
  /* la BUCA non è in elenco di proposito: non è un oggetto posato sul terreno ma un incavo
     NEL terreno — è scura tutta, e il "contorno" non vuol dire niente. */
  // CITTÀ — pannello con {act}
  ['fontana', true, () => deco.fountainArt(g, 0)],
  ['bacheca', true, () => deco.boardArt(g, 0)],
  ['statua', true, () => deco.statueArt(g, 0, true)],
  ['cassetta della posta', true, () => deco.mailboxArt(g)],
  ['affioramento d\'ossa', true, () => deco.siteArt(g, 3, 0, 0)],
  // CITTÀ — solo arredo
  ['panchina', false, () => deco.benchArt(g)],
  ['cespuglio', false, () => deco.bushArt(g)],
  ['lampione', false, () => deco.lampArt(g, 0)],
  ['staccionata', false, () => render.drawFence(32, 40, false, true)],
];

console.log('\ncontorno = si tocca · niente contorno = paesaggio');
for (const [nome, tocca, fn] of SPRITE) {
  const m = misura(fn);
  const sottile = m.corpo < 60;                        // niente "dentro": si giudica dalla linea scura
  const voto = sottile ? m.scuri / Math.max(1, m.area) : m.cop;
  const soglia = sottile ? (tocca ? 0.08 : 0.03) : (tocca ? 0.7 : 0.35);
  const passa = tocca ? voto >= soglia : voto <= soglia;
  check((tocca ? 'SI TOCCA  ' : 'paesaggio ') + nome, passa,
    (sottile ? 'linea scura ' : 'contorno ') + Math.round(voto * 100) + '% · serve ' + (tocca ? '≥' : '≤') + Math.round(soglia * 100) + '%');
}

console.log(`\ncontorno: ${ok} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
