/* Casa del giocatore — SCENE SEPARATE VERE (M2, terzo giro: la prima versione allineava le
   stanze in fila ("hai mai visto delle stanze una in fila all'altra?"), la seconda le apriva
   ai lati di UN corridoio grande condiviso — bocciata anche quella: "il corridoio deve essere
   + piccolo, deve sembrare una casa e le stanze non si devono vedere attraverso le porte...
   è una casa, sai come è fatta una casa?". Ispirazione dichiarata: Animal Crossing — un
   piccolo ingresso, una porta per stanza, la stanza non esiste finché non ci entri.
   ARCHITETTURA: un piccolo ATRIO (corridoio) è la SUA scena (INT.houseRoom=null); ogni
   stanza (Sala/Cucina/Bagno/Camera) è un'ALTRA scena, per conto suo, con la SUA griglia
   locale che parte da (0,0) — non più un'unica griglia gigante con l'appartenenza per tile
   (niente più `tileRoom`/`roomOrigin` condivisi: ogni scena è piccola e a sé, come i 6
   interni a mestiere). interior.js tiene lo stato di navigazione (INT.houseRoom) e usa
   queste funzioni pure per collisioni/varchi; interiors.js le disegna. Il DATO resta lo
   stesso (`S.house.rooms[i] = {id, unlocked, furn:[{itemId,gx,gy}]}`, coordinate LOCALI
   alla stanza): piazzamento/arredo non cambia, cambia SOLO come le stanze stanno nel mondo. */
import { TS, ROOM_PRICES, FURN_BY_ID, PEDESTAL_ID } from './data.js';
import { furnIsSolid } from './furnVox.js';
import { S, save } from './state.js';
import { isDebug } from './debug.js';
import { toast, updateHUD } from './ui.js';
import { tr, roomName } from './i18n.js';
import { playSfx } from './audio.js';
import { playerLevel } from './progress.js';

/* taglia di una stanza-scena: STESSA scala dei 6 interni a mestiere (piccola, cozy) */
export const ROOM_TILE_W = 10, ROOM_TILE_H = 7;
export const ROOM_COUNT = ROOM_PRICES.length;
/* atrio: un vero PICCOLO ingresso (non un corridoio istituzionale) — giusto lo spazio per
   la porta d'ingresso in basso e le porte delle stanze sulle altre 3 pareti */
export const CORR_W = 8, CORR_H = 8;
/* dove sta il PORTALE di ritorno (goHome) quando è attivo: in mezzo all'atrio, non fuori nel
   cortile — a richiesta esplicita: "il portale deve essere in mezzo al corridoio NON FUORI".
   Centro della stanza, lontano da tutti e 4 i varchi sulle pareti. */
export const ATRIO_PORTAL = { x: (CORR_W / 2) * TS, y: (CORR_H / 2) * TS };

/* dove si apre, sulla parete dell'atrio, la porta di ogni stanza: 'top'/'left'/'right' +
   posizione (tile) lungo quella parete. La Sala (0) è sempre sbloccata: la sua porta non ha
   mai il lucchetto, ma sta sull'atrio come le altre — è una stanza vera, non un fondo cieco. */
const HOUSE_DOOR = {
  0: { wall: 'top', at: Math.round(CORR_W * 0.28) },   // Sala
  1: { wall: 'top', at: Math.round(CORR_W * 0.72) },   // Cucina
  2: { wall: 'left', at: Math.round(CORR_H * 0.55) },  // Bagno
  3: { wall: 'right', at: Math.round(CORR_H * 0.55) }, // Camera
};
const DOOR_HALF = 1; // apertura larga 2 caselle
/* varco (px, coordinate ATRIO) della porta della stanza `id`: rettangolo sulla parete */
export function corrDoorRect(id) {
  const d = HOUSE_DOOR[id];
  if (d.wall === 'top') return { id, wall: 'top', x0: (d.at - DOOR_HALF) * TS, x1: (d.at + DOOR_HALF) * TS, cx: d.at * TS, cy: 0 };
  if (d.wall === 'left') return { id, wall: 'left', y0: (d.at - DOOR_HALF) * TS, y1: (d.at + DOOR_HALF) * TS, cx: 0, cy: d.at * TS };
  return { id, wall: 'right', y0: (d.at - DOOR_HALF) * TS, y1: (d.at + DOOR_HALF) * TS, cx: CORR_W * TS, cy: d.at * TS };
}
/* tutti i varchi dell'atrio, con lo stato sbloccato — per disegnarli (etichetta + lucchetto) */
export function houseGates() {
  return [0, 1, 2, 3].map(id => ({ ...corrDoorRect(id), unlocked: roomUnlocked(id) }));
}

export function roomPrice(id) { return ROOM_PRICES[id] || 0; }
/* stato di default: stanza 0 sempre sbloccata, le altre no (mirror di `if (!S.x) S.x = ...`
   in state.js). Se in futuro ROOM_PRICES cresce, si AGGIUNGONO le stanze mancanti (chiuse):
   azzerare tutto butterebbe via le stanze già comprate. */
export function ensureHouseState() {
  if (!S.house || !Array.isArray(S.house.rooms)) {
    S.house = { rooms: ROOM_PRICES.map((_, i) => ({ id: i, unlocked: i === 0, furn: [] })), yard: [] };
  } else {
    for (let i = S.house.rooms.length; i < ROOM_COUNT; i++) S.house.rooms.push({ id: i, unlocked: false, furn: [] });
  }
  for (const r of S.house.rooms) if (!Array.isArray(r.furn)) r.furn = [];
  if (!Array.isArray(S.house.yard)) S.house.yard = [];
  if (!S.furnOwned) S.furnOwned = [];
  /* pulizia UNA TANTUM: partite salvate prima che la cella d'ingresso diventasse
     non piazzabile potevano avere un mobile ESATTAMENTE lì — bloccava il rientro nella
     stanza (segnalato) e faceva rimbalzare la navigazione atrio↔stanza. Si toglie e torna
     nel vassoio, come una rimozione normale. */
  const e = roomEntryPoint(), egx = Math.floor(e.x / TS), egy = Math.floor(e.y / TS);
  for (const r of S.house.rooms) {
    const i = r.furn.findIndex(f => f.gx === egx && f.gy === egy);
    if (i >= 0) r.furn.splice(i, 1);
  }
}
export function roomUnlocked(id) {
  ensureHouseState();
  const r = S.house.rooms[id]; return !!r && r.unlocked;
}
/* varco a lucchetto più vicino nell'ATRIO, in coordinate LOCALI dell'atrio: {id,price} o
   null. Per il prompt/acquisto — chiamata solo mentre si è nell'atrio (interior.js lo garantisce). */
export function nearbyGate(ix, iy) {
  for (let id = 1; id < ROOM_COUNT; id++) { // la Sala (0) non ha mai il lucchetto
    if (roomUnlocked(id)) continue;
    const g = corrDoorRect(id);
    if (g.wall === 'top' && Math.abs(ix - g.cx) < 18 && iy < 26) return id;
    if (g.wall === 'left' && Math.abs(iy - g.cy) < 18 && ix < 26) return id;
    if (g.wall === 'right' && Math.abs(iy - g.cy) < 18 && ix > CORR_W * TS - 26) return id;
  }
  return null;
}
/* l'ATRIO è solido ovunque tranne: la porta d'ingresso in basso (gestita come i 6 interni a
   mestiere, stesso trucco onDoor()+bypass in interior.js) e le porte di stanza SBLOCCATE
   sulle pareti laterali/alta (varco vero: nessun trucco di bypass, ci si passa dritti). */
export function corridorSolid(x, y) {
  const w = CORR_W * TS, h = CORR_H * TS, M = 8;
  /* parete bassa: SOLIDA come negli interni a mestiere — l'apertura per la porta d'ingresso
     (verso il mondo) è il trucco onDoor()+bypass di updateInterior, non un buco vero qui */
  if (y > h - 4) return true;
  if (x < M) { const g = corrDoorRect(2); return !(roomUnlocked(2) && y >= g.y0 && y <= g.y1); }
  if (x > w - M) { const g = corrDoorRect(3); return !(roomUnlocked(3) && y >= g.y0 && y <= g.y1); }
  if (y < M) {
    for (const id of [0, 1]) { const g = corrDoorRect(id); if (roomUnlocked(id) && x >= g.x0 && x <= g.x1) return false; }
    return true;
  }
  return false;
}
/* la stanza `id` è stata raggiunta uscendo dall'atrio da uno dei suoi varchi laterali/alti?
   (la porta bassa dell'atrio, verso il MONDO, resta gestita a parte, come i 6 interni). */
export function corridorExitAt(x, y) {
  const w = CORR_W * TS;
  if (y < -2) for (const id of [0, 1]) { const g = corrDoorRect(id); if (roomUnlocked(id) && x >= g.x0 && x <= g.x1) return id; }
  if (x < -2) { const g = corrDoorRect(2); if (roomUnlocked(2) && y >= g.y0 && y <= g.y1) return 2; }
  if (x > w + 2) { const g = corrDoorRect(3); if (roomUnlocked(3) && y >= g.y0 && y <= g.y1) return 3; }
  return null;
}
/* punto (coordinate LOCALI dell'atrio) in cui si compare tornando da una stanza: appena
   dentro l'atrio, davanti alla porta usata per entrarci */
export function corridorEntryFor(id) {
  const g = corrDoorRect(id);
  if (g.wall === 'top') return { x: g.cx, y: 12 };
  if (g.wall === 'left') return { x: 12, y: g.cy };
  return { x: CORR_W * TS - 12, y: g.cy };
}
/* pareti di una STANZA (scena propria, sempre ROOM_TILE_W×ROOM_TILE_H): un rettangolo con
   un solo varco, in basso, verso l'atrio — la stessa forma di un interno a mestiere, senza
   bancone né NPC (in casa non ce ne sono). */
export function roomPerimeterSolid(x, y) {
  const w = ROOM_TILE_W * TS, h = ROOM_TILE_H * TS;
  if (x < 8 || x > w - 8) return true;
  if (y < 1.3 * TS) return true;
  if (y > h - 4) return true;
  return false;
}
/* punto (coordinate LOCALI della stanza) in cui si compare entrandoci dall'atrio: davanti
   alla propria porta, in basso — come in un interno a mestiere */
export function roomEntryPoint() { return { x: (ROOM_TILE_W / 2) * TS, y: (ROOM_TILE_H - 1.3) * TS }; }

/* acquisto: stesso schema di buyTool/shipToMuseum (toast di esito compreso qui). */
export function tryUnlockRoom(i) {
  ensureHouseState();
  const r = S.house.rooms[i]; if (!r || r.unlocked) return false;
  const price = roomPrice(i);
  if (S.coins < price && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + price); return false; }
  if (!isDebug()) S.coins -= price;
  r.unlocked = true;
  playSfx('coin'); toast('🔓 ' + tr('Sbloccato: ', 'Unlocked: ') + roomName(i) + '!');
  save(); updateHUD();
  return true;
}

/* ---------- ARREDO: acquisto (M3) ---------- */
/* livello ancora mancante per un pezzo NON posseduto, o null se già ok/posseduto/debug
   (mirror esatto di `hatLevelLock` in ui.js) */
export function furnLevelLock(id) {
  if (isDebug() || (S.furnOwned || []).includes(id)) return null;
  const it = FURN_BY_ID[id];
  return (it && playerLevel() < it.lvl) ? it.lvl : null;
}
/* acquisto: coin-check-then-push, stesso schema di unlockCosmetic (gameplay.js) */
export function buyFurniture(id) {
  ensureHouseState();
  const it = FURN_BY_ID[id]; if (!it) return false;
  if (S.furnOwned.includes(id)) return false; // già tuo
  if (!isDebug() && playerLevel() < it.lvl) { toast('🔒 Lv' + it.lvl); return false; }
  if (S.coins < it.cost && !isDebug()) { toast(tr('Servono 🪙 ', 'You need 🪙 ') + it.cost); return false; }
  if (!isDebug()) S.coins -= it.cost;
  S.furnOwned.push(id);
  playSfx('coin'); toast('🎨 ' + tr('Comprato! È nel vassoio: piazzalo in casa', 'Bought! It\'s in your tray: place it at home'));
  save(); updateHUD();
  return true;
}

/* ---------- ARREDO: piazzamento (M3) ---------- */
/* pavimento calpestabile di una stanza, in coordinate LOCALI (gx/gy, tile) alla SUA scena:
   esclude il muro perimetrale, la parete alta e la parete bassa/porta — E la casella
   d'ingresso (davanti al varco): un mobile lì diventa solido ed è ESATTAMENTE dove si
   ricompare rientrando nella stanza, quindi ci si incastra da soli (segnalato). */
export function isFloorCell(gx, gy) {
  if (gx >= 1 && gx <= ROOM_TILE_W - 2 && gy >= 2 && gy <= ROOM_TILE_H - 2) {
    const e = roomEntryPoint(), egx = Math.floor(e.x / TS), egy = Math.floor(e.y / TS);
    return gx !== egx || gy !== egy;
  }
  return false;
}
/* punto (px, coordinate LOCALI della stanza `room`) → {room, gx, gy}, o null se non è
   pavimento calpestabile valido (per piazzare/raccogliere) */
export function floorCellAt(room, x, y) {
  const gx = Math.floor(x / TS), gy = Math.floor(y / TS);
  return isFloorCell(gx, gy) ? { room, gx, gy } : null;
}
/* una CELLA porta fino a DUE pezzi indipendenti: uno SOLIDO (mobile vero, blocca il passo)
   e uno di DECORO (tappeto/pianta, non solido) — "tappeto sotto la sedia" è proprio questo:
   due strati sulla stessa casella, non uno sopra l'altro in senso fisico. `furnAt` (senza
   `cat`) resta per la compatibilità con chi vuole "cosa c'è qui interagibile": preferisce il
   SOLIDO (quello che si vede/tocca per primo), il decoro solo se non c'è nient'altro. */
function findFurnIndex(room, gx, gy, cat) {
  ensureHouseState();
  const r = S.house.rooms[room]; if (!r) return -1;
  if (cat) return r.furn.findIndex(f => f.gx === gx && f.gy === gy && (furnIsSolid(f.itemId) ? 'solid' : 'decor') === cat);
  const solidI = r.furn.findIndex(f => f.gx === gx && f.gy === gy && furnIsSolid(f.itemId));
  if (solidI >= 0) return solidI;
  return r.furn.findIndex(f => f.gx === gx && f.gy === gy);
}
export function furnAt(room, gx, gy) {
  ensureHouseState();
  const r = S.house.rooms[room]; if (!r) return null;
  const i = findFurnIndex(room, gx, gy);
  return i >= 0 ? r.furn[i] : null;
}
/* SOLO lo strato di decoro (tappeto/pianta) sulla cella, o null: serve a disegnarlo SOTTO il
   mobile e a validare il piazzamento/raccolta di quello strato specifico. */
export function decorAt(room, gx, gy) {
  ensureHouseState();
  const r = S.house.rooms[room]; if (!r) return null;
  const i = findFurnIndex(room, gx, gy, 'decor');
  return i >= 0 ? r.furn[i] : null;
}
export function solidAt(room, gx, gy) {
  ensureHouseState();
  const r = S.house.rooms[room]; if (!r) return null;
  const i = findFurnIndex(room, gx, gy, 'solid');
  return i >= 0 ? r.furn[i] : null;
}
/* id di tutti i pezzi già piazzati, in qualunque stanza (un pezzo comprato è uno solo: o è
   nel vassoio, o è piazzato da qualche parte, mai le due cose insieme) */
export function placedItemIds() {
  ensureHouseState();
  return S.house.rooms.flatMap(r => r.furn.map(f => f.itemId));
}
/* pezzi posseduti ma non ancora piazzati: il "vassoio" (tray) del negozio arredo */
export function ownedUnplaced() {
  ensureHouseState();
  const placed = placedItemIds();
  return S.furnOwned.filter(id => !placed.includes(id));
}
export function tryPlaceFurniture(room, gx, gy, itemId, rot = 0) {
  ensureHouseState();
  if (!roomUnlocked(room)) return false;
  if (!isFloorCell(gx, gy)) return false;
  if (!S.furnOwned.includes(itemId)) return false;
  if (placedItemIds().includes(itemId)) return false; // già piazzato altrove
  /* occupata SOLO nel proprio strato: un tappeto non impedisce una sedia sopra, e viceversa —
     è la richiesta esplicita ("vaso su tavolino, tappeto sotto"). Due decori o due mobili
     sulla stessa cella restano vietati: quello sì è un doppione, non un arredamento. */
  const occupied = furnIsSolid(itemId) ? solidAt(room, gx, gy) : decorAt(room, gx, gy);
  if (occupied) return false;
  S.house.rooms[room].furn.push({ itemId, gx, gy, rot: ((rot % 4) + 4) % 4 });
  save(); updateHUD();
  return true;
}
/* ---------- ARREDO: "in mano" (raccogli e ripiazza, M4) ---------- */
/* un pezzo già piazzato, appena raccolto: transiente (NON salvato, come il vassoio del
   negozio) — si perde solo ricaricando a metà gesto, come qualunque overlay aperto.
   Una mano sola alla volta: raccoglierne un secondo prima di ripiazzare il primo non ha senso. */
let hold = null; // {itemId, rot}
export function isHolding() { return !!hold; }
export function holdItem() { return hold; }
export function cancelHold() { hold = null; }
export function rotateHold() { if (hold) hold.rot = (hold.rot + 1) % 4; }
export function pickUpFurniture(room, gx, gy, cat) {
  ensureHouseState();
  if (hold) return false;
  const r = S.house.rooms[room]; if (!r) return false;
  const i = findFurnIndex(room, gx, gy, cat);
  if (i < 0) return false;
  const [f] = r.furn.splice(i, 1);
  hold = { itemId: f.itemId, rot: f.rot || 0 };
  save(); updateHUD();
  return true;
}
export function placeHold(room, gx, gy) {
  if (!hold) return false;
  const ok = tryPlaceFurniture(room, gx, gy, hold.itemId, hold.rot);
  if (ok) hold = null;
  return ok;
}
/* rimuove il pezzo piazzato in quella cella: torna nel vassoio (resta tuo, solo spiazzato) */
export function removeFurnitureAt(room, gx, gy, cat) {
  ensureHouseState();
  const r = S.house.rooms[room]; if (!r) return false;
  const i = findFurnIndex(room, gx, gy, cat);
  if (i < 0) return false;
  r.furn.splice(i, 1);
  save(); updateHUD();
  return true;
}
/* una cella piazzata è SOLIDA (come un mobile) SOLO se il pezzo del suo strato solido lo è:
   un tappeto o una pianta non bloccano mai il passo, si cammina sopra come sull'erba
   (richiesto esplicitamente: "se metto oggetti più piccoli di una casella non ci devo
   restare incastrato attorno"). Coordinate LOCALI px della stanza `room`. */
export function houseFurnSolid(room, x, y) {
  if (room == null) return false;
  const gx = Math.floor(x / TS), gy = Math.floor(y / TS);
  return !!solidAt(room, gx, gy);
}

/* ---------- PIEDISTALLO: esposizione di uno scheletro consegnato al Museo (M4) ---------- */
/* specie assegnabili: almeno un pezzo consegnato (stessa fonte dei piedistalli del Museo,
   `S.museum[spId]`) */
export function pedestalCandidates() {
  return Object.keys(S.museum || {}).filter(id => (S.museum[id] || []).length > 0);
}
/* assegna (o toglie, spId=null) la specie esposta su un piedistallo già piazzato; rifiuta
   una specie senza nessun pezzo consegnato (non c'è nulla da mostrare) */
export function assignPedestal(room, gx, gy, spId) {
  ensureHouseState();
  const f = furnAt(room, gx, gy);
  if (!f || f.itemId !== PEDESTAL_ID) return false;
  if (spId && !((S.museum[spId] || []).length)) return false;
  f.spId = spId || null;
  save(); updateHUD();
  return true;
}
