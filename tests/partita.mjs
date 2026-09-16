/* LA PRIMA PARTITA, GIOCATA DAVVERO — `npm run partita`
 *
 * I test di `run.mjs` provano i pezzi uno per uno: che il passo esista, che la funzione torni
 * true. Nessuno però giocava il gioco. Qui si fa il giro del tutorial dall'inizio alla fine
 * usando SOLO quello che ha a disposizione un giocatore nuovo — il letto di casa, la porta, gli
 * oggetti da terra, il Negozio, la pala, uno scavo, il Curatore, il proprio letto — e a ogni
 * passo si controllano le due cose che contano davvero:
 *   1. il gioco lascia fare quel gesto (niente porte chiuse, niente soldi che non bastano);
 *   2. quello che c'è scritto a schermo dice cosa fare e a cosa serve.
 * Se un giorno il primo quarto d'ora si rompe, questo file lo dice in una riga.
 */
import { installStubs } from './stub.mjs';
installStubs();

let ok = 0, fail = 0;
const check = (nome, cond, extra = '') => {
  if (cond) { ok++; console.log('  ok  ' + nome); }
  else { fail++; console.log('  FAIL ' + nome + (extra ? ' → ' + extra : '')); }
};
const titolo = t => console.log('\n' + t);

const state = await import('../src/state.js');
const data = await import('../src/data.js');
const world = await import('../src/world.js');
const house = await import('../src/house.js');
const gameplay = await import('../src/gameplay.js');
const interior = await import('../src/interior.js');
const tut = await import('../src/tutorial.js');
const ui = await import('../src/ui.js');
const { TS } = data;

state.initState();          // S nasce qui: si prende DOPO (state.S è `let`)
const S = state.S, P = state.P;
house.ensureHouseState();
S.tut = null; S.coins = 0; S.goods = []; S.tools = {}; S.raw = []; S.items = []; S.museumJob = null;
S.energy = S.maxEnergy;

/* la partita comincia dentro casa: è lì che main.js porta il giocatore dopo l'intro */
titolo('1 · in casa, davanti al letto');
const letto = (S.house.rooms[0].furn || []).find(f => f.itemId === data.STARTER_BED_ID);
check('la Sala ha già un letto, senza comprarlo', !!letto);
check('il tutorial parte dal letto', tut.tutStepId() === 'bed');
check('e dice cosa farci', /dorm/i.test(tut.tutHint('bed')) && /energia|⚡/.test(tut.tutHint('bed')), tut.tutHint('bed'));
/* il tasto azione SUL letto deve aprire il pannello del letto, non prenderlo in mano: con
   l'arredo trascinabile il primo passo del tutorial restava fermo lì (segnalato) */
const dataBed = data.FURN_BY_ID[data.STARTER_BED_ID] || {};
check('il letto è riconosciuto come letto, non come soprammobile', dataBed.slot === 'letto');
ui.openBed(0, letto.gx, letto.gy);
check('provato il letto, il passo dopo è arredare', tut.tutStepId() === 'furn');
check('e dice cosa ci si guadagna', /dorm/i.test(tut.tutHint('furn')), tut.tutHint('furn'));
ui.closeModal(true);
/* la poltrona è già nel vassoio dalla prima partita: si posa in una casella libera */
check('la poltrona di partenza è nel vassoio', S.furnOwned.includes(data.STARTER_FURN_ID));
house.tryPlaceFurniture(0, 6, 4, data.STARTER_FURN_ID);
check('posata in Sala, il passo dopo è uscire', tut.tutTick() === 'step' && tut.tutStepId() === 'out');
check('e spiega dov\'è la porta', /porta/i.test(tut.tutHint('out')), tut.tutHint('out'));

titolo('2 · fuori, a raccogliere le prime monete');
interior.INT.b = { type: 'house' }; interior.exitInterior();
check('uscendo di casa il tutorial passa alla raccolta', tut.tutStepId() === 'pick');
check('dice quante monete servono', tut.tutHint('pick').includes(String(gameplay.TOOL_COST.spade)), tut.tutHint('pick'));
check('e indica dove andare', !!tut.tutTarget(P.x, P.y));
/* raccogliere davvero: la roba a terra del mondo vale poco, quindi si fa quello che farebbe un
   giocatore — si gira finché la borsa non paga la pala */
S.goods = [{ id: 'spiga', val: gameplay.TOOL_COST.spade, n: 1, good: true }];
check('con la merce in mano il passo avanza da solo', tut.tutTick() === 'step' && tut.tutStepId() === 'shop');

titolo('3 · al Negozio, a comprare la pala');
S.coins = gameplay.TOOL_COST.spade; S.goods = [];
ui.openBuilding({ type: 'store', name: 'Negozio' });
const negozio = document.getElementById('m-body').innerHTML;
check('la pala si vede nel Negozio', /data-tool="spade"/.test(negozio));
check('e il prezzo è quello che il tutorial ha chiesto di mettere da parte', negozio.includes(String(gameplay.TOOL_COST.spade)));
ui.closeModal(true);
check('comprata la pala', gameplay.buyTool('spade') !== false && !!S.tools.spade);
check('il tutorial manda a scavare', tut.tutTick() === 'step' && tut.tutStepId() === 'dig');
check('e dice quanto costa uno scavo', /1 ⚡/.test(tut.tutHint('dig')), tut.tutHint('dig'));

titolo('4 · il primo scavo');
let tx = 0, ty = 0;
for (let r = 3; r < 400 && !tx; r++) {
  const cx = Math.round(P.x / TS) + r, cy = Math.round(P.y / TS);
  if (world.diggable(world.baseTerrain(cx, cy)) && !world.townInfo(cx, cy)) { tx = cx; ty = cy; }
}
check('c\'è terra scavabile appena fuori città', !!tx);
P.x = tx * TS + 8; P.y = ty * TS + 2; P.dir = 'down'; P.digging = null;
const energiaPrima = S.energy;
gameplay.tryDig();
for (let i = 0; i < 80 && P.digging; i++) gameplay.stepDig(0.05);
check('lo scavo dà un reperto grezzo', S.raw.length === 1, S.raw.length + ' grezzi');
check('e costa 1 di energia', S.energy === energiaPrima - 1, energiaPrima + ' → ' + S.energy);
check('il tutorial manda al Museo', tut.tutStepId() === 'museum');

titolo('5 · al Museo, dal Curatore');
check('il Museo ora è aperto', tut.museumOpen() === true);
const grezzi = S.raw.length;
check('consegnati i reperti', gameplay.museumDeposit() === true && S.raw.length === 0 && S.museumJob.items.length === grezzi);
check('il tutorial manda a ritirarli', tut.tutStepId() === 'collect');
check('sono pronti subito, come dice il testo', gameplay.museumJobReady() === true && /subito|momento/i.test(tut.tutHint('museum')), tut.tutHint('museum'));
const ritirati = gameplay.museumCollect();
check('ritirati', !!ritirati);
check('e ora hanno un nome nel Libro', S.codex.length > 0, S.codex.length + ' specie');
check('il tutorial manda a dormire a casa', tut.tutStepId() === 'sleep');

titolo('6 · a casa, a dormire');
S.energy = 3; S.sleepBlockHalf = null;
const giorno = S.day;
check('si può dormire nel proprio letto', gameplay.sleepAtHome(0) === true);
check('l\'energia è tornata piena', S.energy === S.maxEnergy, S.energy + '/' + S.maxEnergy);
check('e il tempo è passato', S.day > giorno || S.tod > 0.5, 'giorno ' + giorno + ' → ' + S.day);
check('il tutorial è finito', tut.tutDone() && !tut.tutActive());

titolo('7 · e da qui si gioca da soli');
check('il giocatore ha una pala, un reperto identificato e un letto dove dormire',
  !!S.tools.spade && S.codex.length > 0 && !!letto);
check('la Guida resta lì per rileggere le spiegazioni', tut.tutSkipped() === false);

console.log(`\nprima partita: ${ok} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
