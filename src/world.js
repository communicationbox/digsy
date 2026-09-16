/* Mondo procedurale: terreni, decorazioni, città (con parco), collisioni, spawn */
import { TS, GOODS, ZONES, zonePools } from './data.js';
import { vhash, fbm } from './noise.js';
import { zoneIdxAt } from './regions.js';
import { wonderWidth } from './wonders.js';
import { wonderSolidTile } from './wonderart.js';
import { choppedSet, minedSet, pickedSet, S } from './state.js';

/* ---------- terreni ---------- */
export const DEEP = 0, WATER = 1, SAND = 2, GRASS = 3, FOREST = 4, DIRT = 5, MTN = 6, FLOOR = 7, PARK = 8, ROAD = 9;

const terrCache = new Map();
export function baseTerrain(tx, ty) {
  const key = tx + ',' + ty; let c = terrCache.get(key); if (c !== undefined) return c;
  const e = fbm(tx * 0.055, ty * 0.055, 1), m = fbm(tx * 0.05 + 40, ty * 0.05 + 40, 2);
  let t;
  if (e < 0.30) t = DEEP; else if (e < 0.37) t = WATER; else if (e < 0.425) t = SAND;
  else if (e > 0.80) t = MTN;
  else { if (m > 0.62) t = FOREST; else if (m < 0.33 && e > 0.62) t = DIRT; else t = GRASS; }
  terrCache.set(key, t); return t;
}
export function terrBiome(t) { return t === SAND ? 'costa' : t === FOREST ? 'foresta' : t === DIRT ? 'roccia' : t === MTN ? 'roccia' : 'prato'; }
export function walkableGround(t) { return t === SAND || t === GRASS || t === FOREST || t === DIRT || t === FLOOR; }
export function diggable(t) { return t === SAND || t === GRASS || t === FOREST || t === DIRT; }
export const digChance = { 2: 0.46, 3: 0.2, 4: 0.32, 5: 0.4 }; // sabbia/prato/foresta/terra (più basse: scavo non banale)

/* alberi abbattibili con l'accetta, rocce spaccabili col piccone */
export const CHOPPABLE = ['tree', 'deadtree', 'cactus'];
/* LA REGOLA, valida in ogni bioma: i fossili vengono dalla TERRA (si scava), dalle ROCCE (si
   piccona) e dalle PIANTE (si abbatte). Ogni zona ha le SUE tre cose, diverse da quelle delle
   altre, ma sono sempre quelle tre — nelle Dune il saguaro e la guglia d'arenaria, nei Boschi
   l'albero e il masso, nelle Terre l'albero e il camino di fata, e così via. */
export const MINEABLE = ['boulder', 'redspire', 'orecrystal', 'icecrystal', 'sandspire'];
/* decorazioni deterministiche FIRMATE PER ZONA: ogni bioma ha i suoi oggetti.
   Cache per tile (deterministica): decoAt gira ogni frame per ogni tile in vista. */
const decoCache = new Map();
/* decorazione NATURALE della casella, senza sapere nulla di grotte.
   Serve a spezzare una ricorsione vera: decoAt → caveClearingAt → caveEntranceAt →
   caveCompute → siteAt → siteForCell → decoAt → … Ogni anello tocca caselle diverse, quindi
   non è un ciclo infinito ma una catena che si allunga: con la cache fredda (arrivo in una
   zona mai vista, per esempio dopo un teletrasporto) arrivava a esaurire lo stack.
   Chi genera il mondo usa questa; chi disegna usa decoAt. */
/* zona esclusa attorno a casa+cortile+vialetto, con un MARGINE (non solo il recinto stesso):
   un cristallo/masso da raccogliere appena fuori dalla staccionata era comunque troppo vicino
   — ci si azzuffava col recinto per raggiungerlo (segnalato con foto). `margin` in caselle
   oltre il bordo del recinto (il vialetto ha già la sua area, il margine si aggiunge anche lì). */
export const HOUSE_DECO_MARGIN = 2;
export function nearHouseZone(tx, ty, margin) {
  const hf = houseFootprint(), yr = yardRect(); if (!hf && !yr) return false;
  if (hf && tx >= hf.x0 - margin && tx <= hf.x1 + margin && ty >= hf.y0 - margin && ty <= hf.y1 + margin) return true;
  if (yr && tx >= yr.x0 - margin && tx <= yr.x1 + margin && ty >= yr.y0 - margin && ty <= yr.y1 + HOME_PATH_LEN + margin) return true;
  /* il vialetto lungo (fino alla città) è comunque un percorso: niente da raccogliere appena
     a fianco, come per il breve tratto dentro il cortile. `homeRoadGeom` è già memoizzata. */
  const g = homeRoadGeom();
  if (g && (
    (ty >= g.ey - margin && ty <= g.ey + margin && tx >= g.x0 - margin && tx <= g.x1 + margin) ||
    (tx >= g.tx - margin && tx <= g.tx + margin && ty >= g.y0 - margin && ty <= g.y1 + margin)
  )) return true;
  return false;
}
/* invalida le cache di decorazioni/siti/scheletri sepolti sull'area casa+cortile+vialetto
   (+ margine): va chiamata la PRIMA volta che S.home viene fissato. Prima di allora quei tile
   sono terreno selvatico come ogni altro, e se il mondo li aveva già disegnati/esplorati
   (bussola, mappa, un salvataggio vecchio che riceve la casa via migrazione) le cache ci
   avevano già messo un albero, un fungo o un sito d'ossa — che poi restava PER SEMPRE, perché
   nessuna cache scade da sola (segnalato: "parte con una X sotto casa", "gli oggetti qua
   vicini mi triggerano il recinto"). La ricomputazione è deterministica (stesso seme, stesso
   risultato), quindi non cambia nulla per chi aveva già scavato altrove. */
export function invalidateHouseDecoCache() {
  const hf = houseFootprint(), yr = yardRect(); if (!hf || !yr) return;
  const M = HOUSE_DECO_MARGIN;
  const x0 = Math.min(hf.x0, yr.x0) - M, x1 = Math.max(hf.x1, yr.x1) + M;
  const y0 = Math.min(hf.y0, yr.y0) - M, y1 = Math.max(hf.y1, yr.y1) + HOME_PATH_LEN + M;
  for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) decoCache.delete(tx + ',' + ty);
  const scx0 = Math.floor(x0 / SCELL), scx1 = Math.floor(x1 / SCELL), scy0 = Math.floor(y0 / SCELL), scy1 = Math.floor(y1 / SCELL);
  for (let cx = scx0; cx <= scx1; cx++) for (let cy = scy0; cy <= scy1; cy++) siteCache.delete(cx + ',' + cy);
  const bcx0 = Math.floor(x0 / BCELL), bcx1 = Math.floor(x1 / BCELL), bcy0 = Math.floor(y0 / BCELL), bcy1 = Math.floor(y1 / BCELL);
  for (let cx = bcx0; cx <= bcx1; cx++) for (let cy = bcy0; cy <= bcy1; cy++) boneSiteCache.delete(cx + ',' + cy);
}
export function decoNatural(tx, ty) {
  const key = tx + ',' + ty;
  if (choppedSet.has(key) || minedSet.has(key)) return null;
  const c = decoCache.get(key); if (c !== undefined) return c;
  const r = decoCompute(tx, ty);
  decoCache.set(key, r); return r;
}
export function decoAt(tx, ty) {
  const key = tx + ',' + ty;
  if (choppedSet.has(key) || minedSet.has(key)) return null; // abbattuto/spaccato (non cacheato)
  if (caveGuardAt(tx, ty)) return 'boulder';                 // masso che sigilla una grotta
  if (caveClearingAt(tx, ty)) return null;                   // spiazzo davanti alla grotta: sgombro
  return decoNatural(tx, ty);
}
function decoCompute(tx, ty) {
  const t = baseTerrain(tx, ty);
  if (townInfo(tx, ty)) return null; // niente decorazioni selvatiche in città
  if (nearHouseZone(tx, ty, HOUSE_DECO_MARGIN)) return null; // né a casa (dentro E nei 2 tile attorno al recinto)
  const zi = zoneIdxAt(tx, ty);
  if (zi === 1) { // DUNE OSSEE: cactus, costole che affiorano, conchiglie
    if (t === SAND || t === GRASS || t === DIRT) {
      if (vhash(tx, ty, 7) < 0.04) return 'cactus';
      if (vhash(tx, ty, 8) < 0.03) return 'sandspire';
      if (vhash(tx, ty, 9) < 0.05) return 'shell';
    }
    if (t === MTN && vhash(tx, ty, 8) < 0.4) return 'boulder';
    return null;
  }
  if (zi === 2) { // BOSCHI CINEREI: alberi cupi, alberi morti, funghi, ceppi
    if (t === FOREST) {
      if (vhash(tx, ty, 7) < 0.19) return 'tree';
      if (vhash(tx, ty, 11) < 0.09) return 'deadtree';
      if (vhash(tx, ty, 12) < 0.06) return 'mushroom';
    }
    if (t === GRASS) {
      if (vhash(tx, ty, 7) < 0.08) return 'deadtree';
      if (vhash(tx, ty, 12) < 0.05) return 'mushroom';
    }
    if ((t === MTN || t === DIRT) && vhash(tx, ty, 8) < 0.22) return 'boulder';
    return null;
  }
  if (zi === 3) { // TERRE ROSSE: guglie di roccia, cristalli, alberi secchi
    if (t === DIRT || t === GRASS) {
      if (vhash(tx, ty, 7) < 0.05) return 'redspire';
      if (vhash(tx, ty, 11) < 0.028) return 'orecrystal';
    }
    if (t === FOREST && vhash(tx, ty, 7) < 0.16) return 'tree';
    if (t === MTN && vhash(tx, ty, 8) < 0.45) return 'boulder';
    return null;
  }
  if (zi === 4) { // PALUDE ANTICA: canneti, alberi contorti
    if (t === GRASS) {
      if (vhash(tx, ty, 7) < 0.11) return 'reed';
      if (vhash(tx, ty, 11) < 0.05) return 'deadtree';
    }
    if (t === FOREST) {
      if (vhash(tx, ty, 7) < 0.22) return 'tree';
      if (vhash(tx, ty, 12) < 0.08) return 'reed';
    }
    if (t === MTN && vhash(tx, ty, 8) < 0.3) return 'boulder';
    return null;
  }
  if (zi === 5) { // LANDE GELIDE: cristalli di ghiaccio, pini innevati
    if (t === GRASS || t === DIRT) {
      if (vhash(tx, ty, 7) < 0.05) return 'icecrystal';
      if (vhash(tx, ty, 11) < 0.03) return 'tree';
    }
    if (t === FOREST && vhash(tx, ty, 7) < 0.22) return 'tree';
    if (t === MTN && vhash(tx, ty, 8) < 0.4) return 'boulder';
    return null;
  }
  // PRATI DORATI: alberi, fiori, balle di fieno
  if (t === FOREST && vhash(tx, ty, 7) < 0.25) return 'tree';
  if (t === GRASS && vhash(tx, ty, 7) < 0.045) return 'tree';
  /* PRATI: la rotoballa non è più l'unica cosa che rompe il prato — con un solo ingombro
     ripetuto ogni pochi passi il mondo sembrava un timbro (segnalato con foto) */
  if (t === DIRT && vhash(tx, ty, 8) < 0.11) return 'boulder';
  if (t === MTN && vhash(tx, ty, 8) < 0.4) return 'boulder';
  if (t === SAND && vhash(tx, ty, 9) < 0.05) return 'shell';
  if (t === GRASS && vhash(tx, ty, 10) < 0.06) return 'flower';
  return null;
}
/* Se una cosa sembra raccoglibile, deve esserlo: funghi, conchiglie, fiori e canne finivano
   per ingannare (il giocatore ci provava e non succedeva niente). Ora si raccolgono con E e
   danno l'oggetto corrispondente del bioma. */
export const HARVEST_DECO = { mushroom: 'funghetto', shell: 'conchiglia', flower: 'fiordaliso', reed: 'giunco' };
/* Solo una MINORANZA è matura e si raccoglie: il resto resta paesaggio (un campo di fiori
   deve restare un campo di fiori). Quelli maturi hanno ombra e stellina, così si riconoscono
   a colpo d'occhio e la promessa "se brilla, si raccoglie" resta vera. */
export const HARVEST_SHARE = 0.16;
export function harvestDecoAt(tx, ty) {
  const d = decoAt(tx, ty);
  if (!d || !HARVEST_DECO[d]) return null;
  return vhash(tx, ty, 71) < HARVEST_SHARE ? HARVEST_DECO[d] : null;
}
/* gli ingombri di SCENARIO fermano il passo come gli altri: sono ostacoli veri, solo che non
   ci si fa niente (niente accetta, niente piccone) e quindi non hanno il contorno */
/* NIENTE INGOMBRI DI SCENARIO, in nessun bioma. Ceppi, rotoballe, tronchi caduti, massi
   muschiati, tumuli: erano cose che fermavano il passo senza dare niente in cambio, e a
   camminarci in mezzo davano solo fastidio. Quello che blocca, adesso, è solo quello con cui
   si fa qualcosa: gli alberi si abbattono, le rocce si spaccano. Il resto del paesaggio —
   fiori, funghi, conchiglie, canne — non ferma nessuno. */
export const SCENERY_SOLID = [];
export function decoSolid(d) {
  /* blocca SOLO quello con cui si può fare qualcosa: alberi (accetta) e rocce (piccone) */
  return d === 'tree' || d === 'boulder' || d === 'cactus' || d === 'sandspire' || d === 'deadtree' ||
    d === 'redspire' || d === 'orecrystal' || d === 'icecrystal';
}

/* ---------- OGGETTI di superficie raccoglibili con E (oggetti VERI del bioma, da vendere) ----------
   sparsi su terreno camminabile, mai in città, mai sopra un ostacolo; deterministici; esaurimento in pickedSet.
   Ritorna l'ID dell'oggetto (es. 'conchiglia'): ciò che vedi è ciò che raccogli. */
const PICKUP_ZONES = ['prati', 'dune', 'boschi', 'terre', 'palude', 'ghiacci'];
/* dentro la fascia di raccolta attorno a un abitato? Si guarda la cella della città (la
   ricerca è già in cache) e la distanza dal suo rettangolo. */
const BAND = 12;
function nearTownBand(tx, ty) {
  const cx = Math.floor(tx / TCELL), cy = Math.floor(ty / TCELL);
  for (let jy = -1; jy <= 1; jy++) for (let jx = -1; jx <= 1; jx++) {
    const t = townForCell(cx + jx, cy + jy); if (!t) continue;
    const dx = Math.max(t.x0 - tx, 0, tx - t.x1), dy = Math.max(t.y0 - ty, 0, ty - t.y1);
    if (Math.max(dx, dy) <= BAND) return true;
  }
  return false;
}
export function pickupAt(tx, ty) {
  if (pickedSet.has(tx + ',' + ty)) return null;
  const t = baseTerrain(tx, ty);
  if (t === FLOOR || !walkableGround(t)) return null; // niente su pavimenti città/parco né acqua
  if (townInfo(tx, ty)) return null;
  if (nearHouseZone(tx, ty, HOUSE_DECO_MARGIN)) return null; // né a casa: STESSA falla di decoAt/siteForCell, sistema diverso (segnalato: "segna ancora delle cose da raccogliere sotto casa")
  const d = decoAt(tx, ty); if (d) return null;        // libero: mai sopra decorazioni/ostacoli
  /* DENSITÀ: la raccolta è il BOOTSTRAP (i primi 15🪙 per la pala), non una rendita che
     compete con lo scavo — quello costa energia e deve restare la fonte principale.
     0.8% dava ~200🪙 in 5 minuti camminando: più dell'intera giornata di scavi. */
  /* PIÙ FITTI ATTORNO AGLI ABITATI. Con lo 0.3% ovunque, attorno al punto di partenza non
     c'era NIENTE entro dieci caselle e i 15🪙 della pala arrivavano solo allargandosi a una
     trentina: il primo obiettivo del gioco era un rastrellamento alla cieca (misurato).
     Vicino a una città la densità sale; lontano resta quella di prima, così la raccolta
     continua a essere il bootstrap dei primi attrezzi e non una rendita che compete con lo
     scavo. E si esaurisce: `pickedSet` è salvato, una casella raccolta non ricresce. */
  if (vhash(tx, ty, 21) >= (nearTownBand(tx, ty) ? 0.04 : 0.003)) return null;
  const list = GOODS[PICKUP_ZONES[zoneIdxAt(tx, ty)] || 'prati'];
  const k = vhash(tx, ty, 22);                          // 60/30/10: comune→raro (per valore)
  const idx = k < 0.6 ? 0 : k < 0.9 ? 1 : 2;
  return list[idx][0];                                  // id dell'oggetto (es. 'spiga','ambra',…)
}

/* ---------- città ---------- */
export const TCELL = 62;
/* taglie: borgo (2 edifici), paese (4), città (7); footprint edificio 3x2, porta in basso al centro */
export const TOWN_SIZES = [
  { id: 'borgo', w: [-6, 6], h: [-6, 3], defs: [['store', 'Negozio', -5, -5], ['inn', 'Locanda', 3, -5]] },
  {
    /* h[1]=6 (non 4): la fila bassa (dy=1, porta a C.y+2/+3) deve avere 3 tile di piazza
       LIBERE davanti (fin oltre C.y+5), o si esce dall'edificio dritti contro il prato/acqua
       fuori piazza e si resta bloccati (segnalato con foto). */
    id: 'paese', w: [-8, 7], h: [-7, 6], defs: [
      ['store', 'Negozio', -7, -6], ['lab', 'Laboratorio', 3, -6],
      ['inn', 'Locanda', -7, 1], ['barber', 'Barbiere', 3, 1]]
  },
  {
    /* h[1]=6 come il paese: 3 tile di piazza davanti alla fila bassa. Niente più recinto
       cittadino (il parco è sparito: le chimere vivono nel cortile di casa, vedi yardRect). */
    id: 'città', w: [-11, 13], h: [-7, 6], defs: [
      ['store', 'Negozio', -10, -6], ['lab', 'Laboratorio', -1, -6], ['museum', 'Museo', 8, -6],
      /* fila bassa sfalsata: il viale centrale (x=C.x) resta sempre libero */
      ['inn', 'Locanda', -10, 1], ['barber', 'Barbiere', -4, 1], ['tailor', 'Sartoria', 4, 1],
      /* BOTTEGA D'ARREDO: solo in città. In un alimentari non ha senso comprare un letto, e
         andare in città per arredare casa è un piccolo viaggio che vale la pena fare. */
      ['furniture', "Bottega d'arredo", 10, 1]]
  },
];
const TN_A = ['Ossa', 'Terra', 'Cava', 'Selce', 'Creta', 'Ambra', 'Tufo', 'Ghiaia', 'Argilla', 'Fossa', 'Sabbia', 'Rocca'];
const TN_B = ['bruna', 'dolce', 'fonda', 'vecchia', 'lieta', 'chiara', 'rossa', 'verde', 'antica', 'lenta', 'viva', 'muta'];
export function townName(cx, cy) {
  const a = TN_A[Math.floor(vhash(cx, cy, 120) * TN_A.length)];
  const b = TN_B[Math.floor(vhash(cx, cy, 121) * TN_B.length)];
  return /[aeiou]/.test(b[0]) && /[aeiou]$/.test(a) ? a.slice(0, -1) + b : a + b; // evita vocali doppie ("Terrantica")
}

const townCache = new Map();
export function townForCell(cx, cy) {
  const key = cx + ',' + cy; if (townCache.has(key)) return townCache.get(key);
  let town = null;
  if (vhash(cx, cy, 111) < 0.32) {
    const roll = vhash(cx, cy, 115);
    const size = TOWN_SIZES[roll < 0.4 ? 0 : roll < 0.75 ? 1 : 2];
    /* jitter dentro la cella con margini che contengono l'intera città (e il parco in basso) */
    const mx = Math.max(-size.w[0], size.w[1]) + 1;
    const jx = mx + Math.floor(vhash(cx, cy, 112) * (TCELL - 2 * mx));
    const jy = 8 + Math.floor(vhash(cx, cy, 113) * (TCELL - 25)); // città (e parco GRANDE) sempre dentro la cella
    const C = { x: cx * TCELL + jx, y: cy * TCELL + jy };
    const bt = baseTerrain(C.x, C.y); // serve terra al centro
    if (bt !== DEEP && bt !== WATER && bt !== MTN) {
      const B = [];
      size.defs.forEach(([type, name, dx, dy], i) => {
        /* jitter ±1 per edificio: case meno in riga; fila bassa solo verso l'alto (porte mai sul recinto) */
        const jbx = Math.floor(vhash(cx, cy, 130 + i) * 3) - 1;
        /* fila alta: jitter ±1. Fila bassa: solo 0/+1 (VERSO IL BASSO), così la piazza centrale
           (dove sta la fontana con l'anello) resta libera in alto e le case non invadono l'anello. */
        const jby = dy < 0 ? Math.floor(vhash(cx, cy, 140 + i) * 3) - 1 : Math.floor(vhash(cx, cy, 140 + i) * 2);
        const bw = type === 'museum' ? 5 : 3; // il museo è GRANDE anche fuori
        let x0 = C.x + dx + jbx; const y0 = C.y + dy + jby;
        /* La fontana centrale (paese/città) occupa C.x-1..C.x: se la porta di un edificio della
           fila ALTA cadrebbe proprio sopra la vasca — capita al Laboratorio, che è al centro —
           davanti alla porta si esce contro l'acqua. Si sposta l'edificio sul bordo DESTRO
           dell'anello (porta a C.x+1), dove i 3 tile davanti sono strada. Vale solo per chi
           finisce sulle colonne della vasca; gli altri (Negozio/Museo, lontani) non si toccano. */
        if (size.id !== 'borgo' && dy < 0) { const dcx = x0 + (bw >> 1); if (dcx === C.x - 1 || dcx === C.x) x0 += (C.x + 1 - dcx); }
        B.push({ type, name, x0, y0, x1: x0 + bw - 1, y1: y0 + 1, doorx: x0 + (bw >> 1), doory: y0 + 1 });
      });
      town = {
        C, buildings: B, name: townName(cx, cy), size: size.id, key,
        x0: C.x + size.w[0], y0: C.y + size.h[0], x1: C.x + size.w[1], y1: C.y + size.h[1],
      };
      /* PIAZZA a FONTANA CENTRALE (paese/città): la fontana al centro, un ANELLO di strada che le
         gira attorno, e da lì le strade raggiungono le porte (fila alta e bassa). Il BORGO
         (2 case) resta semplice. Niente più recinto del parco: le chimere vivono nel cortile
         di casa (yardRect), non più in un recinto per città. */
      const roads = new Set();
      const rd = (x, y) => roads.add(x + ',' + y);
      const topB = B.filter(b => b.y0 < C.y), botB = B.filter(b => b.y0 >= C.y);
      let fx = null, fy = null, rL, rR, rT, rB;
      if (size.id === 'borgo') {
        const topRoad = C.y - 2; const xs = topB.map(b => b.doorx);
        for (let x = Math.min(...xs); x <= Math.max(...xs); x++) rd(x, topRoad);
        for (const b of topB) for (let y = b.doory + 1; y <= topRoad; y++) rd(b.doorx, y);
      } else {
        fx = C.x - 1; fy = C.y - 2;                                    // fontana 2×2 al CENTRO
        rL = C.x - 2; rR = C.x + 1; rT = C.y - 3; rB = C.y;            // ANELLO attorno alla fontana
        for (let x = rL; x <= rR; x++) { rd(x, rT); rd(x, rB); }
        for (let y = rT; y <= rB; y++) { rd(rL, y); rd(rR, y); }
        if (topB.length) { const xs = topB.map(b => b.doorx); for (let x = Math.min(rL, ...xs); x <= Math.max(rR, ...xs); x++) rd(x, rT); for (const b of topB) for (let y = b.doory + 1; y < rT; y++) rd(b.doorx, y); }
        const botRoad = C.y + 4;                                       // sotto la fila bassa (che ora può scendere a C.y+3)
        if (botB.length) { const xs = botB.map(b => b.doorx); for (let x = Math.min(...xs); x <= Math.max(...xs); x++) rd(x, botRoad); for (const b of botB) for (let y = b.doory + 1; y <= botRoad; y++) rd(b.doorx, y); }
        for (let y = rB; y <= botRoad; y++) rd(C.x, y);              // viale dall'anello a sud, fino a sotto la fila bassa
      }
      town.roads = roads;
      /* arredo urbano: mai su edifici, davanti alle porte, sulle strade o fuori piazza */
      /* ROOF_BAND: l'edificio non sta solo nelle sue caselle — il tetto sfora verso l'ALTO di
         un paio di caselle, e quello che finiva lì sopra veniva coperto dal tetto e sembrava
         buttato dietro la casa (segnalato con foto: una panchina mezza dentro il tetto del
         barbiere). L'arredo urbano deve vedersi tutto: quelle righe sono vietate. */
      const ROOF_BAND = 2;
      const forb = (x, y) => {
        for (const b of B) { if (x >= b.x0 && x <= b.x1 && y >= b.y0 - ROOF_BAND && y <= b.y1) return true; if (x === b.doorx && y >= b.doory + 1 && y <= b.doory + 3) return true; }
        if (roads.has(x + ',' + y)) return true;
        return x < town.x0 || x > town.x1 || y < town.y0 || y > town.y1;
      };
      const decos = [];
      if (fx !== null) decos.push({ type: 'fountain', x: fx, y: fy });  // fontana CENTRALE (il centro è sempre libero: le case sono lontane in y)
      const occupiedByDeco = (x, y) => decos.some(d =>
        (d.type === 'fountain' && x >= d.x && x <= d.x + 1 && y >= d.y && y <= d.y + 1) || (d.x === x && d.y === y));
      /* LAMPIONI accanto alle case (accesi di notte): uno a fianco di ogni edificio */
      if (size.id !== 'borgo') for (const b of B) {
        for (const [x, y] of [[b.x1 + 1, b.y1], [b.x0 - 1, b.y1]]) if (!forb(x, y) && !occupiedByDeco(x, y)) { decos.push({ type: 'lamp', x, y }); break; }
      }
      /* PANCHINE attorno alla fontana (guardano la piazza) o, nel borgo, davanti alle case */
      const benchSpots = size.id === 'borgo'
        ? [[C.x - 3, C.y - 1], [C.x + 3, C.y - 1], [C.x, C.y - 1]]
        : [[C.x - 3, C.y - 3], [C.x + 2, C.y - 3], [C.x - 3, C.y], [C.x + 2, C.y], [C.x - 3, C.y - 1], [C.x + 2, C.y - 1]];
      let nb = 0; const want = size.id === 'borgo' ? 1 : size.id === 'paese' ? 3 : 4;
      for (let i = 0; i < benchSpots.length && nb < want; i++) {
        if (vhash(cx, cy, 152 + i) < 0.25) continue;                   // varietà: qualche panchina salta
        const [x, y] = benchSpots[i];
        if (forb(x, y) || occupiedByDeco(x, y)) continue;
        decos.push({ type: 'bench', x, y }); nb++;
      }
      for (const [bx, by] of [[size.w[0] + 1, size.h[1]], [size.w[1] - 1, size.h[1]]]) { // cespugli agli angoli bassi
        const x = C.x + bx, y = C.y + by;
        if (vhash(cx, cy, 160 + bx) < 0.55 && !forb(x, y) && !occupiedByDeco(x, y)) decos.push({ type: 'bush', x, y });
      }
      /* CARTELLO delle missioni: LONTANO dalla fontana (ora centrale) → verso i BORDI della piazza. */
      const fnt = decos.find(d => d.type === 'fountain');
      const farFromFnt = (x, y) => !fnt || Math.max(Math.abs(x - (fnt.x + 0.5)), Math.abs(y - (fnt.y + 0.5))) >= 4;
      let board = null;
      for (const [x, y] of [[C.x + 5, C.y - 1], [C.x - 5, C.y - 1], [C.x + 6, C.y], [C.x - 6, C.y], [C.x + 5, C.y - 2], [C.x - 5, C.y - 2], [C.x + 4, C.y], [C.x - 4, C.y], [C.x + 3, C.y - 1], [C.x - 3, C.y - 1],
        /* ripieghi più in basso: con la fascia del tetto vietata, nelle piazze strette le
           posizioni alte possono essere tutte occupate e il cartello non deve mai mancare */
        [C.x + 5, C.y + 1], [C.x - 5, C.y + 1], [C.x + 6, C.y + 1], [C.x - 6, C.y + 1],
        [C.x + 4, C.y + 2], [C.x - 4, C.y + 2], [C.x + 7, C.y], [C.x - 7, C.y]]) {
        if (!forb(x, y) && !occupiedByDeco(x, y) && farFromFnt(x, y)) { board = { x, y }; break; }
      }
      /* STATUA DEL NONNO: solo nelle CITTÀ, IN MEZZO ALLA PIAZZA e lontana dagli edifici.
         Stava addossata al fianco del Museo e lì si leggeva come parte della facciata — un
         ornamento, non una cosa con cui parlare (segnalato). In mezzo allo spiazzo, da sola,
         è evidente che ci si può andare: è la stessa regola della fontana e della bacheca. */
      if (size.id === 'città') {
        const fnt2 = decos.find(d => d.type === 'fountain');
        const lontano = (x, y) => (!fnt2 || Math.max(Math.abs(x - (fnt2.x + 0.5)), Math.abs(y - (fnt2.y + 0.5))) >= 3)
          && B.every(b => Math.max(b.x0 - x, 0, x - b.x1) + Math.max(b.y0 - 2 - y, 0, y - b.y1) >= 3);
        /* si cerca a cerchi dal centro della piazza: il primo posto libero e lontano da tutto */
        let messa = false;
        for (let r = 3; r <= 9 && !messa; r++) {
          for (let dy = -r; dy <= r && !messa; dy++) for (let dx = -r; dx <= r && !messa; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const x = C.x + dx, y = C.y + dy;
            if (forb(x, y) || occupiedByDeco(x, y) || !lontano(x, y)) continue;
            town.statue = { x, y }; decos.push({ type: 'statue', x, y }); messa = true;
          }
        }
      }
      town.board = board;
      if (board) decos.push({ type: 'board', x: board.x, y: board.y });
      /* CASSETTA DELLA POSTA: solo nelle città SENZA Museo (borghi e paesi) — per spedire i
         reperti grezzi al Museo senza il viaggio. Prima tile libera vicino alla piazza. */
      if (size.id !== 'città') {
        for (const [bx, by] of [[2, -1], [-2, -1], [3, 0], [-3, 0], [2, 1], [-2, 1], [1, 1], [-1, 1]]) {
          const x = C.x + bx, y = C.y + by;
          if (!forb(x, y) && !occupiedByDeco(x, y)) { decos.push({ type: 'mailbox', x, y }); break; }
        }
      }
      town.decos = decos;
    }
  }
  townCache.set(key, town); return town;
}
export function townForTile(tx, ty) { return townForCell(Math.floor(tx / TCELL), Math.floor(ty / TCELL)); }

/* ritorna {solid|door|floor|fence|park|building} o null */
/* cache per tile: townInfo gira 2+ volte per tile per frame (render, collisioni, decorazioni)
   e ogni chiamata scandisce edifici, arredi e strade della città. */
const tiCache = new Map();
/* la città ha il Museo? È l'unico posto dove si identificano i reperti, si riempiono le teche
   e si comprano le fialette: sapere quali città ce l'hanno vale un segno a parte sulla mappa.
   Si guardano gli edifici veri, non la taglia: se un domani il museo comparisse altrove, la
   mappa lo segnala da sola. */
export function hasMuseum(town) {
  return !!town && (town.buildings || []).some(b => b.type === 'museum');
}
export function townInfo(tx, ty) {
  const k = tx + ',' + ty; const c = tiCache.get(k);
  if (c !== undefined) return c;
  const r = townInfoCompute(tx, ty);
  if (tiCache.size > 60000) tiCache.clear();     // tetto: partite lunghissime non gonfiano la RAM
  tiCache.set(k, r); return r;
}
function townInfoCompute(tx, ty) {
  const t = townForTile(tx, ty); if (!t) return null;
  for (const b of t.buildings) {
    if (tx >= b.x0 && tx <= b.x1 && ty >= b.y0 && ty <= b.y1) {
      if (tx === b.doorx && ty === b.doory) return { door: b, floor: true };
      return { solid: true, building: b };
    }
  }
  /* arredo urbano: solido, disegnato come entità (anchor = tile in alto a sinistra) */
  if (t.decos) for (const d of t.decos) {
    if (d.type === 'fountain') {
      if (tx >= d.x && tx <= d.x + 1 && ty >= d.y && ty <= d.y + 1) return { solid: true, deco: d, anchor: tx === d.x && ty === d.y };
    } else if (tx === d.x && ty === d.y) return { solid: true, deco: d, anchor: true };
  }
  /* strade sterrate: camminabili, disegnate come tile dedicata */
  if (t.roads && t.roads.has(tx + ',' + ty)) return { floor: true, road: true };
  if (tx >= t.x0 && tx <= t.x1 && ty >= t.y0 && ty <= t.y1) return { floor: true }; // piazza
  return null;
}
/* ARREDO del PARCO recintato (deterministico): stagno in un angolo, alberi agli altri angoli,
   siepe/sassi sull'anello interno, aiuole sparse al centro. Puro e testabile: pen={x0,y0,x1,y1},
   cx = colonna centrale (il cancello, sempre libero). Ritorna {kind[,px,py]} o null. Sta tutto
   sull'ANELLO interno + angoli, così il centro resta alle creature. */
/* IL PARCO CRESCE COL TRAGUARDO. `n` = quante specie sono tornate in vita (goal.js).
   Lo scopo del gioco è riportarle indietro, e un numero che sale in un pannello non lo fa
   sentire: il posto dove vivono deve CAMBIARE. A recinto vuoto il parco è prato nudo — un
   recinto che aspetta — e a ogni soglia diventa più un posto: il primo albero, lo stagno, i
   cespugli, le aiuole. Il progresso lo si cammina invece di leggerlo.
   `n` non passato = tutto acceso: la funzione resta compatibile con chi non conosce il
   traguardo, e i test possono fissare le due letture separatamente.
   NB: qui NON si decide niente di solido — parkDeco la usa solo il disegno (render.js), mai
   la collisione. È il motivo per cui il parco può cambiare a partita in corso senza il rischio
   di far comparire un albero addosso a chi ci sta dentro. */
export function parkDeco(pen, cx, tx, ty, n) {
  if (!pen) return null;
  const N = (n === undefined || n === null) ? Infinity : n;
  const { x0, y0, x1, y1 } = pen;
  if (tx <= x0 || tx >= x1 || ty <= y0 || ty >= y1) return null;      // il bordo è la staccionata
  if (tx === cx - 1 || tx === cx) return null;                         // colonna del cancello: libera
  const px = x0 + 1, py = y0 + 1;                                      // stagno 3×2 nell'angolo alto-sinistra
  if (N >= 3 && tx >= px && tx <= px + 2 && ty >= py && ty <= py + 1) return { kind: 'pond', px: tx - px, py: ty - py };
  const corner = (tx === x0 + 1 || tx === x1 - 1) && (ty === y0 + 1 || ty === y1 - 1);
  /* il PRIMO albero arriva con la prima creatura: è il segno che qualcuno ci abita davvero.
     Gli altri angoli si riempiono a metà strada.
     LE SOGLIE SONO DIMEZZATE da quando il cortile è grande il doppio: con i vecchi numeri lo
     stesso arredo si spargeva su quattro volte il prato e il giardino restava spoglio a lungo
     ("è tutto troppo compresso" era il problema opposto, ma il rimedio non deve creare un
     campo vuoto). */
  if (corner) {
    const primo = tx === x1 - 1 && ty === y1 - 1;                      // angolo in basso a destra
    if (N >= 24 || (primo && N >= 1)) return { kind: 'tree' };
    return null;
  }
  const ring = tx === x0 + 1 || tx === x1 - 1 || ty === y0 + 1 || ty === y1 - 1;
  if (ring) { if (N < 8) return null; const h = vhash(tx, ty, 61); if (h < 0.5) return { kind: h < 0.32 ? 'bush' : 'rock' }; }
  else if (N >= 16 && vhash(tx, ty, 62) < 0.1) return { kind: 'flowerbed' }; // aiuole SPARSE (piatte) al centro
  return null;
}
/* ingressi delle grotte: su una MONTAGNA con terra camminabile SOTTO (ci si avvicina da sud).
   Deterministico e raro; l'imbocco è CAMMINABILE (come una porta).
   REGOLA: ogni grotta ha uno SPIAZZO 3×3 sgombro davanti e un UNICO MASSO che la sigilla
   (caveGuardAt): serve il piccone per aprirla. Lo spiazzo non SELEZIONA le grotte (le
   renderebbe rarissime): le decorazioni lì dentro vengono semplicemente RIMOSSE da decoAt
   (caveClearingAt) — il terreno però deve essere camminabile, quello sì è un requisito. */
const caveCache = new Map();
export function caveEntranceAt(tx, ty) {
  const key = tx + ',' + ty;
  const c = caveCache.get(key); if (c !== undefined) return c;
  const r = caveCompute(tx, ty);
  caveCache.set(key, r); return r;
}
function caveCompute(tx, ty) {
  if (baseTerrain(tx, ty) !== MTN) return null;
  if (townInfo(tx, ty)) return null;
  if (!walkableGround(baseTerrain(tx, ty + 1)) || townInfo(tx, ty + 1)) return null;
  if (vhash(tx, ty, 77) >= 0.05) return null;
  /* spiazzo 3×3 davanti all'imbocco: il TERRENO dev'essere camminabile e fuori città */
  for (let dy = 1; dy <= 3; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = tx + dx, y = ty + dy;
    if (!walkableGround(baseTerrain(x, y))) return null;
    if (townInfo(x, y)) return null;
    if (siteAt(x, y)) return null;
  }
  return { tx, ty };
}
/* il MASSO che sigilla la grotta: una sola tile, subito davanti all'imbocco.
   È un 'boulder' normale → si spacca col piccone (tryMine) e sparisce per sempre (minedSet). */
export function caveGuardAt(tx, ty) { return !!caveEntranceAt(tx, ty - 1); }
/* le altre 8 tile dello spiazzo: niente decorazioni, così la grotta è sempre raggiungibile */
export function caveClearingAt(tx, ty) {
  for (let dy = 1; dy <= 3; dy++) for (let dx = -1; dx <= 1; dx++) if (caveEntranceAt(tx - dx, ty - dy)) return true;
  return false;
}
export function isSolidTile(tx, ty) {
  const ti = townInfo(tx, ty); if (ti) { if (ti.solid) return true; if (ti.floor) return false; }
  /* le MERAVIGLIE massicce (blocco di ghiaccio, piloni, tronchi) non si attraversano;
     sotto gli archi invece ci si passa: la maschera è in wonderart.js */
  { const lm = landmarkNear(tx, ty, 2); if (lm && wonderSolidTile(lm.type, lm.x, lm.y, tx, ty)) return true; }
  if (caveEntranceAt(tx, ty)) return false; // imbocco grotta: si cammina
  /* CASA del giocatore: fuori dal sistema città, solida tranne la porta */
  if (houseFootprint()) {
    const hf = houseFootprint();
    if (tx >= hf.x0 && tx <= hf.x1 && ty >= hf.y0 && ty <= hf.y1) return !(tx === hf.doorx && ty === hf.doory);
  }
  /* CORTILE della casa: staccionata solida, cancello e prato interno camminabili */
  { const yd = yardInfo(tx, ty); if (yd) { if (yd.solid) return true; if (yd.floor) return false; } }
  const t = baseTerrain(tx, ty);
  if (t === DEEP || t === WATER || t === MTN) return true;
  const d = decoAt(tx, ty); if (d && decoSolid(d)) return true;
  if (siteAt(tx, ty)) return true; // affioramento d'ossa
  if (boneSiteAt(tx, ty)) return true; // scheletro sepolto: monticello, si aggira
  return false;
}
export function solidPx(px, py) { return isSolidTile(Math.floor(px / TS), Math.floor(py / TS)); }

/* ---------- CASA del giocatore: un solo edificio, fuori dal sistema città ----------
   S.home = {x,y} è la PORTA (tile), calcolata una volta vicino allo spawn (findHomeSpot).
   Il resto della casa (3×2, porta al centro della fila bassa) si deriva da lì, come per gli
   edifici delle città (footprint fisso, solido tranne la porta): non è nella cache di
   townForCell perché non appartiene a nessuna città e cambia solo con S.home. */
export function houseFootprint() {
  const h = S && S.home; if (!h) return null;
  return { x0: h.x - 1, y0: h.y - 1, x1: h.x + 1, y1: h.y, doorx: h.x, doory: h.y };
}
export function houseDoorAt(tx, ty) {
  const h = S && S.home; return !!h && tx === h.x && ty === h.y;
}
/* ---------- CORTILE della casa (M5, riprogettato): sostituisce il parco recintato per-città ----------
   Un solo rettangolo recintato, fisso rispetto alla porta di casa: la staccionata GIRA
   TUTTO ATTORNO alla casa (prato su tutti e 4 i lati, non più solo a sud), con un cancello
   sul lato lontano dalla porta (a sud, dove il prato è più largo) e un breve VIALETTO che
   esce dal cancello verso il mondo aperto — così il recinto non finisce a metà di un campo. */
export function yardRectFor(hx, hy) {
  /* casa: colonne hx-1..hx+1, righe hy-1..hy (porta a hy). Il cortile è un quadrato attorno
     a lei, RADDOPPIATO: con margine 4 la casa occupava quasi tutto il recinto e fra muro e
     staccionata restavano due passi — con le creature dentro sembrava un pollaio ("è tutto
     troppo compresso"). A margine 8 il prato è un giardino: ci si cammina attorno, le
     chimere si sparpagliano e c'è spazio per arredarlo. */
  return { x0: hx - 8, y0: hy - 8, x1: hx + 8, y1: hy + 8, cx: hx };
}
export function yardRect() {
  const h = S && S.home; return h ? yardRectFor(h.x, h.y) : null;
}
export const HOME_PATH_LEN = 3; // tile di vialetto oltre il cancello, verso il mondo aperto
/* {solid,fence,fv,fh} sulla staccionata, {floor:true} dentro (buca fuori la casa: quella
   la disegna il suo footprint), {floor:true,gate:true,gateSide,gateOpen} sul varco a sud,
   {floor:true,path:true} sul vialetto oltre il cancello, null fuori — stessa forma del vecchio
   blocco `t.pen`, agganciata alla casa.
   `gateOpen` è SEMPRE true per ora (nessuna meccanica di chiusura): si porta comunque il campo
   per non doverlo reinventare quando arriverà — è il render (drawGate) a doversi accorgere
   della differenza, non lo schema dati. */
export function yardInfo(tx, ty) {
  const p = yardRect(); if (!p) return null;
  if (tx >= p.x0 && tx <= p.x1 && ty >= p.y0 && ty <= p.y1) {
    const hf = houseFootprint();
    if (hf && tx >= hf.x0 && tx <= hf.x1 && ty >= hf.y0 && ty <= hf.y1) return null; // qui c'è la casa
    const gate = ty === p.y1 && (tx === p.cx - 1 || tx === p.cx); // cancello a SUD, lontano dalla porta
    if (gate) {
      const locked = !!(S && S.gateLocked); // teletrasportarsi lo chiude a chiave DAVVERO (non solo l'aspetto)
      /* VOLUTO: si blocca in ENTRAMBI i versi, anche da dentro (vedi tests/run.mjs, "il
         cancello bloccato è SOLIDO"). Se si potesse uscire a piedi appena teletrasportati,
         il cancello "chiuso dall'esterno" non costerebbe nulla — si resta dentro finché non
         si usa il portale di ritorno o lo si sblocca da fuori più tardi. */
      return { floor: !locked, solid: locked, gate: true, gateSide: tx === p.cx - 1 ? 'l' : 'r', gateOpen: !locked };
    }
    const fv = tx === p.x0 || tx === p.x1;
    const fh = ty === p.y0 || ty === p.y1;
    if (fv || fh) return { solid: true, fence: true, fv, fh };
    return { floor: true };
  }
  // vialetto: poche tile a sud del cancello, fuori dal recinto, verso terreno qualunque
  if ((tx === p.cx - 1 || tx === p.cx) && ty > p.y1 && ty <= p.y1 + HOME_PATH_LEN) return { floor: true, path: true };
  // prosecuzione: dal fondo del vialetto fino alla città vicina (vedi homeRoadAt)
  if (homeRoadAt(tx, ty)) return { floor: true, path: true };
  return null;
}
/* Cerca un posto per la porta di casa vicino a una città: fuori dal suo ingombro (con un
   margine, non appena fuori il muro — "un pelo più lontana"), su terreno camminabile, con
   spazio aperto davanti e col futuro recinto+vialetto (yardRectFor) tutto su terreno
   camminabile e fuori città — la stessa area serve a costruirci sopra casa e cortile senza
   sovrapposizioni. */
export const HOME_TOWN_GAP = 6; // tile di distacco dal bordo della città: "un pelo più lontano", non attaccata
export function findHomeSpot(town) {
  if (!town) return null;
  const cx = town.C.x, cy = town.C.y;
  const clearOfTown = (x, y) => {
    if (x >= town.x0 - HOME_TOWN_GAP && x <= town.x1 + HOME_TOWN_GAP && y >= town.y0 - HOME_TOWN_GAP && y <= town.y1 + HOME_TOWN_GAP) return false;
    return true;
  };
  const okDoor = (x, y) => {
    if (!clearOfTown(x, y) || townInfo(x, y)) return false;
    if (!walkableGround(baseTerrain(x, y)) || baseTerrain(x, y) === FLOOR) return false;
    for (let fy = -1; fy <= 0; fy++) for (let fx = -1; fx <= 1; fx++) { // footprint 3×2 sopra la porta
      const hx = x + fx, hy = y + fy;
      if (!clearOfTown(hx, hy) || townInfo(hx, hy)) return false;
      if (!walkableGround(baseTerrain(hx, hy))) return false;
    }
    if (!walkableGround(baseTerrain(x, y + 1)) || townInfo(x, y + 1)) return false; // spazio davanti alla porta
    if (!openArea(x, y + 1)) return false;
    const yr = yardRectFor(x, y);
    for (let yy = yr.y0; yy <= yr.y1; yy++) for (let xx = yr.x0; xx <= yr.x1; xx++) {
      if (!clearOfTown(xx, yy) || townInfo(xx, yy)) return false;
      if (!walkableGround(baseTerrain(xx, yy))) return false;
    }
    for (let py = yr.y1 + 1; py <= yr.y1 + HOME_PATH_LEN; py++) for (const px of [yr.cx - 1, yr.cx]) { // vialetto
      if (!clearOfTown(px, py) || townInfo(px, py)) return false;
      if (!walkableGround(baseTerrain(px, py))) return false;
    }
    return true;
  };
  /* il cancello del cortile sta SEMPRE a sud (yardInfo): una casa a NORD della città lo fa
     guardare dritto verso di lei, e il vialetto lungo (homeRoadAt) può proseguire quasi
     dritto invece di dover girare subito attorno alla staccionata per tornare indietro.
     Prima passata: SOLO a nord (dy<0); solo se non si trova nessun posto valido lì (mondo
     stretto, acqua, un'altra città in mezzo) si ripiega su qualunque direzione. */
  for (let r = 6; r < 50; r++) {
    for (let dy = -r; dy < 0; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy;
      if (okDoor(x, y)) return { x, y };
    }
  }
  for (let r = 6; r < 50; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy;
      if (okDoor(x, y)) return { x, y };
    }
  }
  return null;
}
/* la città vicino a cui S.home è stato piazzato: NON si salva (S.home è solo {x,y}), si
   ritrova con un ring-scan di celle come `nearestTown` in compass.js — casa e città sono
   sempre vicine (findHomeSpot cerca entro 50 tile dal centro città), quindi bastano poche
   celle. MEMOIZZATA per valore di S.home: yardInfo/isSolidTile la interrogano ad ogni tile,
   ad ogni frame — un ring-scan lì dentro sarebbe una tempesta di townForCell. */
let homeTownKey = null, homeTownCache = null;
export function homeTown() {
  const h = S && S.home;
  if (!h) { homeTownKey = null; homeTownCache = null; return null; }
  const key = h.x + ',' + h.y;
  if (key === homeTownKey) return homeTownCache;
  const ccx = Math.floor(h.x / TCELL), ccy = Math.floor(h.y / TCELL);
  let best = null, bd = Infinity, extra = 0;
  for (let r = 0; r <= 4; r++) {
    for (let cy = ccy - r; cy <= ccy + r; cy++) for (let cx = ccx - r; cx <= ccx + r; cx++) {
      if (Math.max(Math.abs(cx - ccx), Math.abs(cy - ccy)) !== r) continue;
      const t = townForCell(cx, cy); if (!t || t.size !== 'città') continue;
      const d = Math.hypot(t.C.x - h.x, t.C.y - h.y);
      if (d < bd) { bd = d; best = t; }
    }
    if (best && ++extra >= 2) break; // un anello extra come nearestTown: il jitter può nascondere la vera più vicina
  }
  homeTownKey = key; homeTownCache = best;
  return best;
}
/* geometria del VIALETTO LUNGO che prosegue oltre i 3 tile del cortile fino a toccare il
   territorio della città vicina: memoizzata come homeTown perché interrogata tile per
   tile. Si ferma al bordo del rettangolo della città (t.x0..t.x1/t.y0..t.y1): non deve
   incastrarsi fra gli edifici, basta che si veda arrivare.
   Il cancello sta SEMPRE a sud del recinto (yardInfo). findHomeSpot preferisce case a NORD
   della città apposta (il cancello guarda già verso di lei): in quel caso — il più comune —
   ty è a sud di ey, e la colonna del cortile (ex) resta libera per tutta la discesa (il
   recinto sta tutto a NORD di ey), quindi basta una L pulita: giù dritti dal cancello, poi
   di lato. Quando invece la città finisce comunque a nord (ripiego di findHomeSpot su un
   mondo stretto), una L diritta taglierebbe in verticale proprio in mezzo al recinto — la
   staccionata la blocca a metà, perché lì non c'è nessun cancello (bug osservato: il
   vialetto "finiva" al bordo del recinto). Lì servono fino a 3 tratti a U: uno in riga
   (sempre appena a sud del recinto, quindi sempre libero), uno in colonna SPINTO fuori dalla
   fascia di colonne del recinto, poi l'ultimo in riga fino alla città. */
let homeRoadKey = null, homeRoadGeomC = null;
function homeRoadGeom() {
  const h = S && S.home; if (!h) return null;
  const key = h.x + ',' + h.y;
  if (key === homeRoadKey) return homeRoadGeomC;
  const t = homeTown();
  let g = null;
  if (t) {
    const yr = yardRectFor(h.x, h.y);
    const ex = yr.cx, ey = yr.y1 + HOME_PATH_LEN;        // dove finisce il breve vialetto del cortile
    const tx = ex < t.x0 ? t.x0 : ex > t.x1 ? t.x1 : ex;  // colonna di arrivo (bordo città più vicino)
    const ty = ey < t.y0 ? t.y0 : ey > t.y1 ? t.y1 : ey;  // riga di arrivo
    if (ty >= ey) {
      // caso comune: si scende SOLO ad allontanarsi dal recinto, mai a riattraversarlo — L pulita, verticale prima
      g = {
        a: { y: ty, x0: ex, x1: ex },                                    // collassa: nessuna riga iniziale
        b: { x: ex, y0: ey, y1: ty },                                    // dritti fuori dal cancello
        c: { y: ty, x0: Math.min(ex, tx), x1: Math.max(ex, tx) },        // di lato, fino alla città
      };
    } else {
      // ripiego: la città è comunque a nord del cancello, la verticale dovrebbe riattraversare il recinto
      const crossesYard = Math.min(ey, ty) <= yr.y1 && Math.max(ey, ty) >= yr.y0;
      const ecx = (crossesYard && tx >= yr.x0 && tx <= yr.x1) ? (tx <= yr.cx ? yr.x0 - 1 : yr.x1 + 1) : tx;
      g = {
        a: { y: ey, x0: Math.min(ex, ecx), x1: Math.max(ex, ecx) },     // riga, appena a sud del recinto
        b: { x: ecx, y0: Math.min(ey, ty), y1: Math.max(ey, ty) },      // colonna, fuori dal recinto
        c: { y: ty, x0: Math.min(ecx, tx), x1: Math.max(ecx, tx) },     // riga, fino alla città
      };
    }
  }
  homeRoadKey = key; homeRoadGeomC = g;
  return g;
}
/* test O(1): un punto sta sulla spezzata se cade su uno dei tre tratti — niente ricerca. */
export function homeRoadAt(tx, ty) {
  const g = homeRoadGeom(); if (!g) return false;
  if (ty === g.a.y && tx >= g.a.x0 && tx <= g.a.x1) return true;
  if (tx === g.b.x && ty >= g.b.y0 && ty <= g.b.y1) return true;
  if (ty === g.c.y && tx >= g.c.x0 && tx <= g.c.x1) return true;
  return false;
}

/* ---------- siti di scavo speciali: affioramenti d'ossa rari, 3-5 scavi pregiati ---------- */
export const SCELL = 30;
const siteCache = new Map();
export function siteForCell(cx, cy) {
  const key = cx + ',' + cy; if (siteCache.has(key)) return siteCache.get(key);
  let site = null;
  if (vhash(cx, cy, 171) < 0.22) {
    const x = cx * SCELL + 4 + Math.floor(vhash(cx, cy, 172) * (SCELL - 8));
    const y = cy * SCELL + 4 + Math.floor(vhash(cx, cy, 173) * (SCELL - 8));
    if (diggable(baseTerrain(x, y)) && !townInfo(x, y) && !nearHouseZone(x, y, HOUSE_DECO_MARGIN) && !decoNatural(x, y)) {
      site = { x, y, charges: 3 + Math.floor(vhash(cx, cy, 174) * 3), key }; // 3-5 scavi
    }
  }
  siteCache.set(key, site); return site;
}
export function siteAt(tx, ty) {
  const s = siteForCell(Math.floor(tx / SCELL), Math.floor(ty / SCELL));
  return s && s.x === tx && s.y === ty ? s : null;
}

/* ---------- SCHELETRO SEPOLTO: uno scheletro INTERO sotto 5 caselle vicine ----------
   Un evento, non un incontro (celle grandi come i landmark): 5 caselle in una piccola croce
   attorno a un'ancora, ognuna la casa di UNA parte precisa (corno/cranio/torace/zampa/coda)
   della STESSA specie, scelta per la zona. Scavando tutte e 5 (anche in visite diverse: sta
   in S.boneSites come i siti normali) si esce con il set COMPLETO garantito di quella specie —
   l'unico modo nel gioco di chiudere una teca con UN evento invece che con la fortuna sparsa
   di decine di scavi a caso. La specie NON dipende dai progressi del giocatore (come tutto il
   resto del mondo procedurale): è una funzione del seme e del posto, non del salvataggio. */
export const BCELL = 90;
const BONE_OFFS = { corno: [0, -2], cranio: [0, -1], torace: [0, 0], zampa: [-1, 1], coda: [1, 1] };
const boneSiteCache = new Map();
export function boneSiteForCell(cx, cy) {
  const key = cx + ',' + cy; if (boneSiteCache.has(key)) return boneSiteCache.get(key);
  let site = null;
  if (vhash(cx, cy, 231) < 0.16) {
    const x0 = cx * BCELL + 8 + Math.floor(vhash(cx, cy, 232) * (BCELL - 16));
    const y0 = cy * BCELL + 8 + Math.floor(vhash(cx, cy, 233) * (BCELL - 16));
    const okSpot = (x, y) => diggable(baseTerrain(x, y)) && !townInfo(x, y) && !nearHouseZone(x, y, HOUSE_DECO_MARGIN) && !decoNatural(x, y) && !siteAt(x, y);
    let allOk = okSpot(x0, y0);
    const parts = {};
    for (const id in BONE_OFFS) {
      const [dx, dy] = BONE_OFFS[id], x = x0 + dx, y = y0 + dy;
      if (!okSpot(x, y)) { allOk = false; break; }
      parts[id] = { x, y };
    }
    if (allOk) {
      const zone = ZONES[zoneIdxAt(x0, y0)] || ZONES[0];
      const pool = zonePools[zone.id] || [];
      if (pool.length) {
        const sp = pool[Math.floor(vhash(cx, cy, 234) * pool.length)];
        site = { x: x0, y: y0, sp: sp.id, parts, key };
      }
    }
  }
  boneSiteCache.set(key, site); return site;
}
/* la casella (tx,ty) fa parte di uno scheletro sepolto? torna {site, part} o null.
   Guarda anche la cella VICINA (offset fino a 2): l'ancora può stare in una cella diversa
   da quella della parte più lontana (corno/coda), come i confini dei siti normali. */
export function boneSiteAt(tx, ty) {
  const bcx = Math.floor(tx / BCELL), bcy = Math.floor(ty / BCELL);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const s = boneSiteForCell(bcx + dx, bcy + dy); if (!s) continue;
    for (const part in s.parts) { const p = s.parts[part]; if (p.x === tx && p.y === ty) return { site: s, part }; }
  }
  return null;
}
/* il RIQUADRO DI SCAVO (terra smossa + paletti e corda, come un vero scavo archeologico):
   il bounding-box delle 5 parti, coi margini per i paletti d'angolo. Deve essere UN riquadro
   solo (non 5 monticelli sparsi) perché SI VEDA da lontano che lì c'è qualcosa di grosso. */
const BONE_BOX = { x0: -1, x1: 1, y0: -2, y1: 1 };
export function boneSitePitAt(tx, ty) {
  const bcx = Math.floor(tx / BCELL), bcy = Math.floor(ty / BCELL);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const s = boneSiteForCell(bcx + dx, bcy + dy); if (!s) continue;
    if (tx >= s.x + BONE_BOX.x0 && tx <= s.x + BONE_BOX.x1 && ty >= s.y + BONE_BOX.y0 && ty <= s.y + BONE_BOX.y1) return s;
  }
  return null;
}
/* ---------- LANDMARK endemici: strutture rare e UNICHE per bioma (rompono l'omogeneità) ----------
   deterministici, sparsi (~1 ogni 3 celle 46×46), su terreno camminabile fuori città. 3 per bioma. */
export const LCELL = 84;   // celle GRANDI: una meraviglia dev'essere un evento, non un incontro
export const LANDMARKS = [
  ['gianttree', 'menhir', 'haygiant'],     // Prati Dorati
  ['bonearch', 'oasis', 'ribcage'],        // Dune Ossee
  ['mushring', 'hollowstump', 'totem'],    // Boschi Cinerei
  ['geyser', 'redarch', 'orevein'],        // Terre Rosse
  ['willow', 'lilypad', 'bubblepool'],     // Palude Antica
  ['icespire', 'frozenbeast', 'aurora'],   // Lande Gelide
];
const ARCH_TYPES = ['bonearch', 'redarch'];
const landmarkCache = new Map();
/* ogni meraviglia vuole il SUO terreno: le ninfee stanno sull'acqua, non sul prato */
export function wonderTerrainOk(type, x, y) {
  if (townInfo(x, y)) return false;
  const t = baseTerrain(x, y);
  if (type === 'lilypad') {                       // specchio d'acqua vero: 3×3 tutto acqua
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t2 = baseTerrain(x + dx, y + dy);
      if (t2 !== WATER && t2 !== DEEP) return false;
    }
    return true;
  }
  return walkableGround(t) && t !== FLOOR;
}
function computeLandmark(cx, cy) {
  if (vhash(cx, cy, 191) >= 0.20) return null;   // e non tutte le celle ne hanno una
  const x0 = cx * LCELL + 6 + Math.floor(vhash(cx, cy, 192) * (LCELL - 12));
  const y0 = cy * LCELL + 6 + Math.floor(vhash(cx, cy, 193) * (LCELL - 12));
  const types = LANDMARKS[zoneIdxAt(x0, y0)] || LANDMARKS[0];
  let type = types[Math.floor(vhash(cx, cy, 194) * types.length)];
  /* GIANT TREE (Yggdrasil): il più raro di tutti, ma TROVABILE. Con il secondo tiro al 5% ne
     usciva uno ogni sessanta celle e nel Libro restava un "?" per sempre (segnalato con foto):
     una meraviglia che di fatto non esiste non è rara, è un buco. */
  if (type === 'gianttree' && vhash(cx, cy, 195) >= 0.3) type = 'menhir';
  /* se il punto non è adatto a QUESTA meraviglia, la si cerca lì attorno (le ninfee vogliono
     l'acqua, le altre la terra ferma): spirale corta dentro la cella, poi si rinuncia */
  /* DISTANZE MINIME: due meraviglie non devono mai capitare a due passi (e due ARCHI vicini
     renderebbero inutile il viaggio rapido). Si guardano solo le celle con indice MINORE:
     l'ordine è fisso, quindi niente ricorsione e il mondo resta deterministico. */
  const tooClose = (x, y) => {
    for (const [dx, dy] of [[-1, 0], [0, -1], [-1, -1], [1, -1], [-2, 0], [0, -2]]) {
      const other = landmarkForCell(cx + dx, cy + dy);
      if (!other) continue;
      const d = Math.hypot(other.x - x, other.y - y);
      if (d < 90) return true;                                   // mai due meraviglie ravvicinate
      if (ARCH_TYPES.includes(type) && ARCH_TYPES.includes(other.type) && d < 320) return true; // archi ben distanti
    }
    return false;
  };
  if (!wonderTerrainOk(type, x0, y0) || tooClose(x0, y0)) {
    for (let r = 1; r <= 9; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = x0 + dx, y = y0 + dy;
        if (x < cx * LCELL + 3 || x > (cx + 1) * LCELL - 4 || y < cy * LCELL + 3 || y > (cy + 1) * LCELL - 4) continue;
        if (wonderTerrainOk(type, x, y) && !tooClose(x, y)) return { x, y, type };
      }
    }
    return null;
  }
  return { x: x0, y: y0, type };
}
export function landmarkForCell(cx, cy) {
  const key = cx + ',' + cy;
  let lm = landmarkCache.get(key);
  if (lm === undefined) { lm = computeLandmark(cx, cy); landmarkCache.set(key, lm); }
  return lm;
}
export function landmarkAt(tx, ty) {
  const lm = landmarkForCell(Math.floor(tx / LCELL), Math.floor(ty / LCELL));
  return (lm && lm.x === tx && lm.y === ty) ? lm.type : null;
}
/* Le MERAVIGLIE sono grandi (5-9 tile): questa dice se la tile cade nel loro ingombro,
   e restituisce il landmark con la sua ancora — serve per scoperta, prompt e interazione. */
export function landmarkNear(tx, ty, extra = 0) {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const lm = landmarkForCell(Math.floor(tx / LCELL) + dx, Math.floor(ty / LCELL) + dy);
    if (!lm) continue;
    const r = Math.floor(wonderWidth(lm.type) / 2) + extra;
    if (Math.abs(tx - lm.x) <= r && Math.abs(ty - lm.y) <= r + 1) return lm;
  }
  return null;
}
/* ---------- RELITTI in mare: come i siti ma solo in MARE ABBASTANZA GRANDE ---------- */
export const WCELL = 34;
const wreckCache = new Map();
export function wreckForCell(cx, cy) {
  const key = 'w' + cx + ',' + cy; if (wreckCache.has(key)) return wreckCache.get(key);
  let wr = null;
  if (vhash(cx, cy, 181) < 0.22) {
    const x = cx * WCELL + 5 + Math.floor(vhash(cx, cy, 182) * (WCELL - 10));
    const y = cy * WCELL + 5 + Math.floor(vhash(cx, cy, 183) * (WCELL - 10));
    let big = true; // mare grande: tutte le tile in un raggio 2 sono acqua
    for (let dy = -2; dy <= 2 && big; dy++) for (let dx = -2; dx <= 2 && big; dx++) {
      const t = baseTerrain(x + dx, y + dy);
      if (!(t === DEEP || t === WATER) || townInfo(x + dx, y + dy)) big = false;
    }
    if (big) wr = { x, y, charges: 3 + Math.floor(vhash(cx, cy, 184) * 3), key };
  }
  wreckCache.set(key, wr); return wr;
}
export function wreckAt(tx, ty) {
  const w = wreckForCell(Math.floor(tx / WCELL), Math.floor(ty / WCELL));
  return w && w.x === tx && w.y === ty ? w : null;
}
/* vero se da (tx,ty) si raggiungono almeno `need` caselle libere: mai spawn in una "prigione" di alberi */
export function openArea(tx, ty, need = 8) {
  if (isSolidTile(tx, ty)) return false;
  const seen = new Set([tx + ',' + ty]); const q = [[tx, ty]];
  let n = 0;
  while (q.length && n < need) {
    const [x, y] = q.shift(); n++;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k)) continue; seen.add(k);
      if (!isSolidTile(nx, ny)) q.push([nx, ny]);
    }
  }
  return n >= need;
}
export function findStart() {
  /* si parte SEMPRE in una città GRANDE (taglia "città", quella col Museo): piazza prima,
     l'area sotto (dove un tempo c'era il parco) come ripiego. NON dipende più da `t.pen`
     (rimosso col parco cittadino) — solo dalla taglia della città. */
  for (let r = 0; r < 16; r++) {
    for (let cy = -r; cy <= r; cy++) for (let cx = -r; cx <= r; cx++) {
      if (Math.max(Math.abs(cx), Math.abs(cy)) !== r) continue;
      const t = townForCell(cx, cy);
      if (t && t.size === 'città') {
        const sx = t.C.x;
        for (let yy = t.C.y + 3; yy >= t.C.y; yy--) { const ti = townInfo(sx, yy); if (ti && ti.floor && openArea(sx, yy)) return { x: sx * TS + TS / 2, y: yy * TS + 4, town: t }; }
        for (let yy = t.C.y + 5; yy < t.C.y + 10; yy++) { if (openArea(sx, yy)) return { x: sx * TS + TS / 2, y: yy * TS + 4, town: t }; }
      }
    }
  }
  for (let r = 0; r < 60; r++) for (let d = -r; d <= r; d++) {
    const cand = [[d, -r], [d, r], [-r, d], [r, d]];
    for (const [tx, ty] of cand) { if (walkableGround(baseTerrain(tx, ty)) && openArea(tx, ty)) return { x: tx * TS + TS / 2, y: ty * TS + 4 }; }
  }
  return { x: 8, y: 8 };
}
