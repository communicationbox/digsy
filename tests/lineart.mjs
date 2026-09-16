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
const wonder = await import('../src/wonderNative.js');
const furnArt = await import('../src/furnArt.js');
const interiors = await import('../src/interiors.js');
const museumArt = await import('../src/museumArt.js');
const caveArt = await import('../src/caveArt.js');
const mapui = await import('../src/mapui.js');
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
  /* Quanto è scura la linea rispetto a CIÒ CHE HA ACCANTO — non rispetto alla media di tutto
     lo sprite: su un letto bianco con la testiera di legno la media non vuol dire niente, e
     una linea di legno sana risultava "nera". Un contorno che porta la tinta di ciò che
     circonda resta sopra un terzo della sua luce; sotto, l'occhio legge NERO. */
  let linea = 0, somma = 0;
  for (const [lato, arr] of Object.entries(lati)) {
    const [dx, dy] = lato === 'sx' ? [1, 0] : lato === 'dx' ? [-1, 0] : lato === 'su' ? [0, 1] : [0, -1];
    for (const [x, y] of arr) {
      let ix = x + dx, iy = y + dy, k = 0;
      while (k < 3 && solid(ix, iy) && L(ix, iy) <= L(x, y) + 12) { ix += dx; iy += dy; k++; }
      if (!solid(ix, iy)) continue;                    // non c'è un corpo dietro: non è una linea
      const vicino = L(ix, iy);
      if (L(x, y) > vicino - 18) continue;             // non è linea, è corpo
      linea++; somma += L(x, y) / Math.max(1, vicino);
    }
  }
  const chiarezza = linea ? somma / linea : 1;
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
  ['guglia d\'arenaria', true, () => props.drawSandspire(32, 40, 3, 5)],
  // NATURA — si raccoglie (solo la versione MATURA)
  ['fungo maturo', true, () => props.drawMushroom(32, 40, 0, 3, 5, true)],
  ['conchiglia intera', true, () => props.drawShell(32, 40, true)],
  ['fiordaliso', true, () => props.drawFlower(32, 40, 3, 5, true)],
  ['giunco maturo', true, () => props.drawReed(32, 40, 0, 3, 5, true)],
  // PAESAGGIO — non si tocca niente
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
/* certi disegni usano coordinate loro, anche sopra lo zero: si traslano al centro della tela,
   o il bordo li taglia e la misura non vuol dire niente */
const conOrigine = (dx, dy, f) => () => { const c2 = g.ctx; c2.save(); c2.translate(dx, dy); try { f(); } finally { c2.restore(); } };
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
for (const t of ['store', 'inn', 'barber', 'tailor', 'lab', 'museum'])
  SPRITE.push(['bottegaio: ' + t, 'pg', () => interiors.drawNpc(40, 60, t, 0)]);
/* LE MERAVIGLIE: si trovano girando il mondo e danno un dono con {act} */
/* LE MERAVIGLIE sono categoria a sé ('grande'). Sono alte cinque caselle e si riconoscono da
   mezza schermata: non hanno bisogno di una linea chiusa attorno, e per metà sono stagni,
   blocchi di ghiaccio e chiome — roba che un contorno netto lo ucciderebbe. Di loro si
   pretende solo la cosa che conta: che la linea, dove c'è, non sia nera. */
for (const k of Object.keys(wonder.NATIVE_WONDERS))
  SPRITE.push(['meraviglia: ' + k, 'grande', conOrigine(70, 150, () => wonder.drawNativeWonder(g, k, 0))]);
/* L'ARREDO: si prende in mano e si posa, quindi ha la linea. Un pezzo per tema basta a
   sorvegliare la ricetta comune (furnRecipe), che è la stessa per tutti e 252. */
/* TUTTI e 252 i pezzi d'arredo: si prendono in mano e si posano, quindi hanno la linea. Sono
   ricette (furnRecipe), ma ognuna sceglie i suoi colori e una può sbagliare da sola. */
/* L'ARREDO è categoria sua ('arredo'). Sta DENTRO casa, dove tutto è del giocatore e non c'è
   niente da distinguere fra toccabile e paesaggio: la domanda "questo si raccoglie?" lì non
   esiste. Quello che conta è che ogni pezzo si stacchi dal pavimento e che la sua linea non
   sia nera — un mobile è fatto di tre o quattro volumi che si coprono a vicenda, e pretendere
   l'anello chiuso come su un masso vorrebbe dire riscrivere 252 ricette per un problema che
   non c'è. */
for (const id of Object.keys(data.FURN_BY_ID || {}))
  SPRITE.push(['arredo: ' + id, 'arredo', conOrigine(60, 170, () => furnArt.drawFurnPiece(g, id, 0, 0, 32 * (data.FURN_BY_ID[id].w || 1), 32 * (data.FURN_BY_ID[id].h || 1), 0, 0))]);
/* IL MUSEO: teca, bancone, panca, colonna, insegna, cordone */
SPRITE.push(['museo: teca', true, conOrigine(60, 150, () => { museumArt.drawCaseBack(g, 0, 0, '#d4b13c', true, 0); museumArt.drawCaseFront(g, 0, 0, '#8d6ac8', true, 0, false); })]);
SPRITE.push(['museo: bancone', true, conOrigine(40, 150, () => museumArt.drawDeskArt(g, 0, 0, 120, 32, 0))]);
SPRITE.push(['museo: panca', 'arredo', conOrigine(60, 150, () => museumArt.drawBench(g, 0, 0, '#c9a227'))]);
SPRITE.push(['museo: colonna', 'arredo', conOrigine(80, 200, () => museumArt.drawColumn(g, 0, 0))]);
SPRITE.push(['museo: cordone', 'arredo', conOrigine(60, 150, () => museumArt.drawRope(g, 0, 60, 0, '#8a3f3a'))]);
/* LA GROTTA: parete, pavimento, giacimento */
SPRITE.push(['grotta: giacimento', true, conOrigine(60, 150, () => caveArt.caveCrystal(g, 0, 0, 0, true))]);
/* IL MONDO: X del tesoro, imbocco della grotta, statua del nonno */
/* la X del tesoro e l'imbocco della grotta sono SEGNI, non oggetti posati: una è vernice sul
   terreno, l'altro un buco nella montagna. Un anello attorno non vorrebbe dire niente — come
   per la buca scavata. Resta la regola che conta: la linea non dev'essere nera. */
SPRITE.push(['X del tesoro', 'grande', () => render.drawXmark(40, 60, 0)]);
SPRITE.push(['imbocco della grotta', 'grande', () => render.drawCaveEntrance(40, 60, 0)]);
SPRITE.push(['statua del nonno', true, () => render.drawStatue(40, 80, 0)]);
/* LA GROTTA: parete e pavimento sono architettura, non oggetti — di loro si pretende solo
   che la linea non sia nera (il buio ci sta, il nero piatto attorno no) */
/* `info.solid` dice quali caselle attorno sono roccia: qui si finge una parete con il vuoto
   sotto, cioè il caso che si vede davvero camminando in grotta */
const grotta = { solid: (x, y) => y <= 5, nodeNear: () => false, nearEntrance: () => false };
SPRITE.push(['grotta: parete', 'arredo', () => caveArt.caveWall(g, 3, 5, 40, 60, grotta, 0)]);
SPRITE.push(['grotta: pavimento', 'arredo', () => caveArt.caveFloor(g, 3, 7, 40, 60, grotta, 0)]);
/* CAPELLI E CAPPELLI: ogni taglio e ogni forma, sul personaggio. La loro linea viene dal
   colore scelto, e basta un tono sbagliato perché uno solo dei tagli torni nero. */
for (const h of data.HAIR_STYLES) SPRITE.push(['capelli: ' + h.id, 'pg', () => {
  const vecchio = state.S.look.hairStyle; state.S.look.hairStyle = h.id; sprites.applyLook();
  try { sprites.drawHero(null, 32, 32, 'down', 0); } finally { state.S.look.hairStyle = vecchio; sprites.applyLook(); }
}]);
for (const c of data.HAT_STYLES.concat([{ id: 'none' }])) SPRITE.push(['cappello: ' + c.id, 'pg', () => {
  const vecchio = state.S.look.hatStyle; state.S.look.hatStyle = c.id; sprites.applyLook();
  try { sprites.drawHero(null, 32, 32, 'down', 0); } finally { state.S.look.hatStyle = vecchio; sprites.applyLook(); }
}]);
/* LE CREATURE DEL CORTILE: il contorno se lo ricavano dal colore della specie */
for (const vista of ['side', 'front', 'back']) SPRITE.push(['creatura di ' + vista, 'pg', () => {
  const sp = data.ALL_SPECIES[3], a = { c: { skull: sp.id, torso: sp.id, leg: sp.id } };
  const cv = render.creatureSprite(a, vista, {});
  if (cv) { try { g.ctx.drawImage(cv, 20, 20); } catch (e) { /* stub */ } }
}]);
/* I SEGNI DELLA MAPPA: sono il modo in cui si legge dove andare */
for (const k of Object.keys(mapui.MAP_SIGNS)) SPRITE.push(['mappa: ' + k, 'arredo', () => mapui.drawSign(g.ctx, k, 40, 40, 2)]);
/* I MEZZI: barca, motoscafo, bici, pattini, cavalcatura */
for (const k of ['boat', 'motorboat', 'bike', 'skates', 'mount'])
  for (const d of ['down', 'side'])
    SPRITE.push(['mezzo: ' + k + ' ' + d, 'pg', conOrigine(60, 150, () => render.drawVehiclePreview(k, 0, 0, d))]);
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
  /* QUATTRO REGOLE, non una sola:
       true       oggetto del mondo · anello chiuso + niente nero  (è la promessa "si tocca")
       false      paesaggio         · NESSUN anello               (la promessa al contrario)
       'pg'       chi è vivo        · anello più morbido: la sua linea segue il materiale
       'arredo'   roba da interni   · solo "niente nero": un mobile in 3/4 è fatto di volumi
       'grande'   meraviglie, segni ·   che si coprono, e l'anello chiuso non vuol dir nulla */
  const soglia = sottile ? (tocca ? 0.08 : 0.03) : tocca === 'pg' ? 0.5 : tocca ? 0.7 : 0.35;
  const senzaAnello = tocca === 'grande' || tocca === 'arredo';
  /* UNO SPRITE CHE NON DISEGNA NIENTE NON PASSA. Senza questa riga bastava sbagliare gli
     argomenti di una funzione per avere una tela vuota — e una tela vuota supera qualunque
     soglia «paesaggio» a occhi chiusi. */
  /* un fiore di prato sono quattro petali: venti pixel bastano. Sotto quella soglia, invece,
     la tela è vuota davvero. */
  const vuoto = m.area < 18;
  const passa = vuoto ? false : senzaAnello ? true : tocca ? voto >= soglia : voto <= soglia;
  if (m.linea >= 20) neriTrovati.push([nome, Math.round(m.chiarezza * 100)]);
  check((tocca === 'grande' ? 'in grande ' : tocca === 'pg' ? 'personaggio ' : tocca === 'arredo' ? 'arredo    ' : tocca ? 'SI TOCCA  ' : 'paesaggio ') + nome, passa,
    (vuoto ? 'non ha disegnato niente (area ' + m.area + ') · ' : '') + (sottile ? 'linea scura ' : 'contorno ') + Math.round(voto * 100) + '% · serve ' + (tocca ? '≥' : '≤') + Math.round(soglia * 100) + '% · corpo ' + m.corpo + ' area ' + m.area);
}

/* ---- NIENTE SPRITE MOZZATO DAL BORDO DEL RIQUADRO ----
   Le decorazioni si dipingono su una maschera grande quanto la casella (32×32): quello che
   sborda sopra non viene sfumato, viene TRONCATO, e il braccio del cactus finisce piatto come
   segato (segnalato con foto due volte, su due piante diverse). Qui ogni decorazione si disegna
   in TUTTE le sue varianti e si guarda la riga in cima: se ci si appoggia della sagoma, la
   sagoma è tagliata. */
{
  const varianti = {
    cactus: (tx, ty) => props.drawCactus(0, 0, tx, ty),
    sandspire: (tx, ty) => props.drawSandspire(0, 0, tx, ty),
    deadtree: (tx, ty) => props.drawDeadtree(0, 0, tx, ty),
    redspire: (tx, ty) => props.drawRedspire(0, 0, tx, ty),
    orecrystal: (tx, ty) => props.drawOrecrystal(0, 0, tx, ty),
    icecrystal: (tx, ty) => props.drawIcecrystal(0, 0, tx, ty),
    boulder: (tx, ty) => props.drawBoulder(0, 0, tx, ty),
    mushroom: (tx, ty) => props.drawMushroom(0, 0, 0, tx, ty, false),
    reed: (tx, ty) => props.drawReed(0, 0, 0, tx, ty, false),
  };
  for (const [nome, f] of Object.entries(varianti)) {
    let peggio = 0, dove = '';
    for (let ty = 0; ty < 12; ty++) for (let tx = 0; tx < 12; tx++) {
      globalThis.__rec.start(32, 32);
      try { f(tx, ty); } catch (e) { globalThis.__rec.stop(); throw e; }
      const { buf } = globalThis.__rec.stop();
      let n = 0; for (let x = 0; x < 32; x++) if (buf[x * 4 + 3] > 40) n++;
      if (n > peggio) { peggio = n; dove = tx + ',' + ty; }
    }
    check('non tocca il bordo alto  ' + nome, peggio <= 1, peggio + ' pixel sulla prima riga (casella ' + dove + '): la sagoma esce dal riquadro e viene troncata');
  }
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
