/* MINI TUTORIAL DI APERTURA — due minuti, e si impara FACENDO.
 *
 * Il problema, coi numeri veri: dei primi 49 giocatori 19 hanno chiuso entro cinque minuti e
 * 33 non hanno passato il giorno 1. Misurando la partenza si capisce perché. Si nasce in una
 * città grande con ZERO monete e SENZA pala, e senza pala l'unico verbo del gioco risponde
 * "Serve la pala (Negozio)". La pala costa 15 🪙, e attorno allo spawn non c'è niente da
 * raccogliere: 0 oggetti entro 10 caselle, 6 🪙 di merce entro 15, e i 15 🪙 arrivano solo
 * allargandosi a una trentina di caselle.
 *
 * Il muro resta (è una scelta di bilanciamento, non un difetto): quello che NON può restare è
 * il giocatore che non sa di essere davanti a un muro né da che parte si gira. Quindi qui non
 * si spiega il gioco a parole — si dà un obiettivo alla volta, con la spunta quando è fatto e
 * una FRECCIA che punta la cosa da fare. Un rastrellamento cieco diventa una caccia guidata.
 *
 * I quattro passi SONO il ciclo d'apertura, nell'ordine in cui il gioco lo impone:
 *   raccogli fino a 15 🪙 → vendi e compra la pala → scava → porta il grezzo al Museo.
 * Chi li finisce ha già fatto una partita intera in piccolo. E l'ultimo passo è vicino, perché
 * `findStart()` fa partire dentro una città grande e le città grandi hanno sempre il Museo.
 *
 * Il modulo è PURO in quello che conta: sa dire a che punto sei e dove devi andare. Chi
 * disegna sta in ui.js/render.js. Così i passi si provano senza DOM.
 */
import { S, save } from './state.js';
import { tr, actKey } from './i18n.js';
import { TOOL_COST } from './gameplay.js';
import { townForTile, townForCell, pickupAt, harvestDecoAt, TCELL, hasMuseum } from './world.js';
import { TS } from './data.js';

/* quanto vale adesso quello con cui potresti pagare la pala: monete in tasca + merce da
   vendere. Il primo passo finisce quando basta — non "otto oggetti", che con i valori da 1 a 5
   a seconda del bioma qualche volta non bastavano e il tutorial restava fermo senza dire perché. */
export function tutPurse() {
  const goods = (S.goods || []).reduce((a, g) => a + (g.val || 0), 0);
  return (S.coins || 0) + goods;
}
export function spadeCost() { return TOOL_COST.spade; }

/* i quattro passi, in ordine. `auto` = si spunta da solo guardando lo stato; senza `auto` lo
   spunta un'azione di gioco che chiama `tutBump`. */
export const STEPS = [
  { id: 'pick', auto: () => tutPurse() >= spadeCost(), have: () => Math.min(tutPurse(), spadeCost()), need: () => spadeCost() },
  { id: 'shop', auto: () => !!(S.tools || {}).spade, have: () => ((S.tools || {}).spade ? 1 : 0), need: () => 1 },
  { id: 'dig', need: () => 1 },
  { id: 'museum', need: () => 1 },
];
export const STEP_IDS = STEPS.map(s => s.id);

/* titolo + istruzione. Il tasto NON si concatena da fuori: `actKey()` dentro la stringa
   cambierebbe la chiave del dizionario e la traduzione non si troverebbe più (i18n.js). */
const TEXT = {
  pick: () => [tr('Raccogli roba da terra', 'Gather things off the ground'),
    tr('Funghi, spighe, conchiglie: {act} per raccoglierli. Sono le tue uniche monete finché non hai la pala.', 'Mushrooms, wheat ears, shells: {act} to pick them up. They are your only coins until you own a spade.')],
  shop: () => [tr('Vendi al Negozio e compra la pala', 'Sell at the Shop and buy the spade'),
    tr('Entra nel Negozio, vendi quello che hai raccolto e prendi la pala 🪏. Senza, non si scava.', 'Enter the Shop, sell what you gathered and buy the spade 🪏. Without it you cannot dig.')],
  dig: () => [tr('Scava', 'Dig'),
    tr('Fuori dalla città, {act} per scavare sotto i piedi. In piazza è lastricato e non si può.', 'Outside town, press {act} to dig under your feet. The plaza is paved and cannot be dug.')],
  museum: () => [tr('Porta il reperto al Museo', 'Take your find to the Museum'),
    tr('Un reperto grezzo non si vende: al Museo il Curatore te lo identifica. Hai già quello del nonno.', 'A raw find cannot be sold: at the Museum the Curator identifies it. You already carry Grandpa\'s.')],
};
export function tutTitle(id) { return TEXT[id] ? TEXT[id]()[0] : id; }
export function tutHint(id) { return TEXT[id] ? TEXT[id]()[1].replace(/\{act\}/g, actKey()) : ''; }

/* lo stato vive nel salvataggio: chi chiude a metà tutorial lo ritrova dov'era */
function st() {
  if (!S.tut || typeof S.tut.i !== 'number') S.tut = { i: 0, n: 0, done: false };
  return S.tut;
}
export function tutActive() { return !st().done; }
export function tutStepId() { const t = st(); return t.done ? null : STEPS[Math.min(t.i, STEPS.length - 1)].id; }
export function tutIndex() { return st().i; }
export function tutDone() { return !!st().done; }
export function tutSkipped() { return !!st().skipped; }
/* quanto manca al passo in corso, per la barra: {have, need} */
export function tutProgress() {
  const t = st(); if (t.done || t.i >= STEPS.length) return { have: 0, need: 0 };
  const s = STEPS[t.i];
  return { have: s.have ? s.have() : t.n, need: s.need() };
}
/* i passi già spuntati nella checklist. Saltando, niente si spunta: la lista dice il vero. */
export function tutChecked(i) { return st().skipped ? false : i < st().i; }

/* UNA azione fatta. Conta solo se è quella del passo in corso: scavare durante il passo della
   raccolta non deve sbloccare niente, o la catena si slega e la spunta mente. */
export function tutBump(id, k = 1) {
  if (!tutActive() || tutStepId() !== id) return false;
  const t = st();
  t.n += k;
  const s = STEPS[t.i];
  if (t.n < s.need()) { save(); return true; }
  return advance();
}
function advance() {
  const t = st();
  t.i++; t.n = 0;
  if (t.i >= STEPS.length) { t.done = true; t.i = STEPS.length; }
  save();
  return 'step';                       // chi chiama sa che è ora di annunciare il passo dopo
}
/* i passi che si spuntano da soli: li batte il game loop. Torna 'step' quando ne chiude uno,
   così l'interfaccia può annunciarlo una volta sola invece che a ogni fotogramma. */
export function tutTick() {
  const t = st(); if (t.done || t.i >= STEPS.length) return false;
  const s = STEPS[t.i];
  if (s.auto && s.auto()) return advance();
  return false;
}

/* le targhe sopra gli edifici: accese quando servono davvero — cioè quando il passo è ENTRARE
   in una casa (Negozio, poi Museo). Sempre accese sarebbero rumore sopra la piazza; accese un
   istante non si farebbe in tempo a leggerle. */
export function tutShowLabels() {
  const id = tutStepId();
  return id === 'shop' || id === 'museum';
}

/* DOVE DEVI ANDARE, in caselle, o null se il passo non ha un posto (scavare si fa dovunque).
   È la parte che rende il muro della pala attraversabile invece che frustrante: senza freccia,
   "raccogli roba da terra" con zero oggetti entro dieci caselle è un rastrellamento cieco. */
export function tutTarget(px, py) {
  const id = tutStepId(); if (!id) return null;
  const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
  if (id === 'pick') return nearestPickup(tx, ty);
  if (id === 'shop') return buildingDoor(tx, ty, 'store');
  if (id === 'museum') return buildingDoor(tx, ty, 'museum');
  return null;                                   // 'dig': si scava dove capita, fuori città
}
/* la cosa raccoglibile più vicina. Anelli concentrici: si ferma al primo colpo, così di solito
   guarda poche decine di caselle invece del quadrato intero. */
function nearestPickup(tx, ty, max = 40) {
  for (let r = 1; r <= max; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;   // solo il bordo dell'anello
      const x = tx + dx, y = ty + dy;
      if (pickupAt(x, y) || harvestDecoAt(x, y)) return { x, y };
    }
  }
  return null;
}
/* la porta dell'edificio chiesto: prima nella città in cui sei, poi nelle celle vicine */
function buildingDoor(tx, ty, type) {
  const here = townForTile(tx, ty);
  const hit = t => {
    if (!t) return null;
    if (type === 'museum' && !hasMuseum(t)) return null;
    const b = (t.buildings || []).find(x => x.type === type);
    return b ? { x: b.doorx, y: b.doory } : null;
  };
  const mine = hit(here); if (mine) return mine;
  const cx = Math.floor(tx / TCELL), cy = Math.floor(ty / TCELL);
  let best = null, bd = Infinity;
  for (let r = 0; r <= 2; r++) {
    for (let jy = -r; jy <= r; jy++) for (let jx = -r; jx <= r; jx++) {
      if (Math.max(Math.abs(jx), Math.abs(jy)) !== r) continue;
      const d = hit(townForCell(cx + jx, cy + jy));
      if (!d) continue;
      const dist = Math.hypot(d.x - tx, d.y - ty);
      if (dist < bd) { bd = dist; best = d; }
    }
    if (best) return best;                        // il primo anello che ne ha uno vince
  }
  return best;
}

/* A COSA SERVE ogni casa, in tre parole. Le insegne sopra le porte sono icone (moneta, fiala,
   osso, luna, palo, maglietta) e a un giocatore nuovo non dicono niente: sa che sono sei case
   diverse, non quale gli serve adesso. Con la targa, la piazza si legge in un colpo d'occhio.
   Stanno su DUE righe e in due parole: la prima versione le scriveva su una riga sola
   ("Sartoria · vestiti e cappelli") e in gioco erano targhe larghe cinque caselle che si
   accavallavano fra loro e uscivano dallo schermo — un muro di testo sopra la piazza, cioè
   il difetto che stiamo togliendo all'intro. */
const PURPOSE = {
  store: () => tr('vendi e compri', 'sell and buy'),
  lab: () => tr('chimere', 'chimeras'),
  museum: () => tr('identifica', 'identifies'),
  inn: () => tr('dormi', 'sleep'),
  barber: () => tr('capelli', 'hair'),
  tailor: () => tr('vestiti', 'clothes'),
};
export function bldPurpose(type) { return PURPOSE[type] ? PURPOSE[type]() : ''; }

export function tutSkip() { const t = st(); t.done = true; t.skipped = true; save(); return true; }
/* rifacibile dalla Guida: chi salta per sbaglio non perde l'insegnamento per sempre */
export function tutRestart() { S.tut = { i: 0, n: 0, done: false }; save(); return true; }
