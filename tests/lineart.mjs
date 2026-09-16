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
const sprites = await import('../src/sprites.js');
const shopArt = await import('../src/shopArt.js');
const data = await import('../src/data.js');
const state = await import('../src/state.js');
const noise = await import('../src/noise.js');
state.initState();                                   // Digsy ha bisogno del suo aspetto per esistere
/* SEME FISSO: le decorazioni scelgono la loro sagoma con vhash, che dipende dal seme del
   mondo — e initState ne tira uno a caso. Senza fissarlo, due giri dello stesso controllo
   misuravano due disegni diversi e il verde/rosso diventava una lotteria. */
noise.setSeed(12345);
sprites.applyLook();                                 // la palette del personaggio si costruisce da S.look
const g = brush.BRUSH;

const W = 260, H = 300;   // ci deve stare anche il museo (5 caselle + gronda), o il taglio falsa la misura
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
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y) && L(x, y) <= med - 30) scuri++;
  /* DI CHE COLORE È IL CONTORNO? Si guardano i pixel del bordo che sono davvero più scuri del
     corpo (quelli che fanno da linea) e si conta quanti sono NERI NEUTRI: scurissimi e senza
     tinta. La regola del gioco dice che la lineart deve portare il colore dell'oggetto — il
     nero piatto attorno a tutto fa sembrare ogni cosa un adesivo ritagliato. */
  let linea = 0, somma = 0;
  for (const arr of Object.values(lati)) for (const [x, y] of arr) {
    if (L(x, y) > med - 18) continue;                  // non è linea, è corpo
    linea++; somma += L(x, y);
  }
  /* quanto è scura la linea RISPETTO al corpo. Un contorno che porta la tinta dell'oggetto
     resta sopra un terzo della sua luce; sotto quella soglia, qualunque sia la sfumatura,
     l'occhio legge NERO — ed è esattamente la cosa che nel gioco non si vuole. */
  const chiarezza = linea ? (somma / linea) / Math.max(1, med) : 1;
  return { cop: quote.length ? Math.min(...quote) : 0, corpo: dentroL.length, area, scuri,
           chiarezza, linea };
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
  ['tronco caduto', false, () => props.drawLogfall(32, 40, 3, 5, false)],
  ['tronco nella palude', false, () => props.drawLogfall(32, 40, 4, 7, true)],
  ['masso muschiato', false, () => props.drawMossrock(32, 40, 3, 5)],
  ['mucchio d\'ossa', false, () => props.drawBonepile(32, 40, 3, 5)],
  ['tumulo d\'argilla', false, () => props.drawClaymound(32, 40, 3, 5)],
  ['tumulo di torba', false, () => props.drawPeatmound(32, 40, 3, 5)],
  ['cumulo di neve', false, () => props.drawSnowmound(32, 40, 3, 5)],
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
/* gli OGGETTI A TERRA da raccogliere: uno per zona, tutti raccoglibili con {act} */
for (const zona of Object.keys(data.GOODS)) for (const g2 of data.GOODS[zona])
  SPRITE.push(['a terra: ' + g2[1], true, () => props.drawPickup(g2[0], 24, 32, 0, 3, 5)]);
/* IL PERSONAGGIO e gli NPC: sono vivi e ci si parla — devono staccare dal fondo sempre,
   in tutti e quattro i versi (su un prato scuro o sulla neve il contorno è l'unica cosa
   che tiene insieme la sagoma) */
/* Digsy e gli NPC: la loro linea segue il MATERIALE (pelle, maglia, pantaloni, capelli,
   cappello, cuoio), quindi in certi punti è chiara quanto il corpo per forza — un contorno
   di pelle su una faccia di pelle non può staccare come uno nero. Il traguardo per un
   personaggio è più basso di quello di un oggetto: deve tenere il profilo, non gridare. */
for (const dir of ['down', 'up', 'left', 'right'])
  SPRITE.push(['Digsy verso ' + dir, 'pg', () => sprites.drawHero(null, 32, 32, dir, 0)]);
/* gli ANIMALETTI delle botteghe: stessa regola, e il contorno prende il colore del pelo */
SPRITE.push(['tartaruga del Museo', 'pg', () => shopArt.drawMuseumPet(g, 40, 60, 0, null)]);
/* LE CASE: si entra camminando sulla porta, quindi sono a tutti gli effetti cose con cui si
   interagisce — e sono anche la sagoma più grande del paesaggio urbano. Devono staccare dal
   lastricato su tutti e quattro i lati, tetto compreso. */
for (const tipo of ['store', 'inn', 'lab', 'barber', 'tailor', 'furniture', 'museum'])
  SPRITE.push(['bottega: ' + tipo, true, () => render.drawBuilding({ type: tipo, x0: 0, y0: 0, x1: tipo === 'museum' ? 4 : 2, y1: 1 }, 26, 190)]);
SPRITE.push(['casa di Digsy', true, () => render.drawHouse({ x0: 0, y0: 0, x1: 2, y1: 1 }, 26, 190)]);

console.log('\ncontorno = si tocca · niente contorno = paesaggio');
const neriTrovati = [];
for (const [nome, tocca, fn] of SPRITE) {
  const m = misura(fn);
  const sottile = m.corpo < 60;                        // niente "dentro": si giudica dalla linea scura
  const voto = sottile ? m.scuri / Math.max(1, m.area) : m.cop;
  const soglia = sottile ? (tocca ? 0.08 : 0.03) : tocca === 'pg' ? 0.5 : tocca ? 0.7 : 0.35;
  const passa = tocca ? voto >= soglia : voto <= soglia;
  if (m.linea >= 20) neriTrovati.push([nome, Math.round(m.chiarezza * 100)]);
  check((tocca === 'pg' ? 'personaggio ' : tocca ? 'SI TOCCA  ' : 'paesaggio ') + nome, passa,
    (sottile ? 'linea scura ' : 'contorno ') + Math.round(voto * 100) + '% · serve ' + (tocca ? '≥' : '≤') + Math.round(soglia * 100) + '% · corpo ' + m.corpo + ' area ' + m.area);
}

/* ---- LA LINEART NON DEVE ESSERE NERA ----
   Il contorno può essere più scuro o più chiaro, ma deve portare la TINTA dell'oggetto. Il
   nero neutro attorno a tutto appiattisce il mondo. Questo controllo lo trova da solo, in
   ogni sprite dell'elenco: prima lo si inseguiva a memoria, file per file. */
{
  const colpevoli = neriTrovati.filter(([, q]) => q < 30);
  check('nessuno sprite ha la lineart NERA (il contorno porta la tinta dell\'oggetto)',
    colpevoli.length === 0, colpevoli.map(([n, q]) => n + ' al ' + q + '% della luce del corpo').join(' · '));
}

console.log(`\ncontorno: ${ok} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
