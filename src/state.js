/* Stato di gioco (salvato in localStorage) + player/camera runtime */
import { setSeed } from './noise.js';
import { packExplored, unpackExplored } from './packmap.js';
import { DEFAULT_LOOK } from './data.js';

export const SK = 'ossa_world_pixel_v1';

export let S = null;
export let dugSet = new Set();
export let choppedSet = new Set(); // alberi abbattuti (accetta)
export let minedSet = new Set();   // massi/guglie spaccati (piccone)
export let pickedSet = new Set();  // oggetti di superficie raccolti (E)

export const P = { x: 0, y: 0, dir: 'down', moving: false, anim: 0, speed: 46, digging: null, speedMul: 1, fly: false };
export const cam = { x: 0, y: 0 };

/* SPESA DI ENERGIA — unico punto che tocca S.energy. Prima ogni azione faceva `S.energy--`
   per conto suo: chi ne toglieva DUE (staccare un cristallo in grotta, la roccia è dura)
   partendo da 1 arrivava a **-1**, e l'HUD mostrava "-1/65" a un giocatore. Il controllo
   `energy <= 0` sta a monte, ma non protegge da un costo maggiore di 1.
   Qui il fondo è zero, sempre. */
export function spendEnergy(n) {
  const cost = Math.max(0, n | 0);
  S.energy = Math.max(0, (S.energy || 0) - cost);
  return S.energy;
}

export function fresh() {
  return {
    seed: (Math.random() * 1e9) | 0, coins: 0, energy: 30, maxEnergy: 30, day: 1,
    raw: [], items: [], codex: [], donated: [], dug: [], creatures: [],
    uid: 1, px: 0, py: 0, started: false, lastTown: null, tod: 0.25, book: {}, sites: {}, awakened: [], museum: {},
    look: { ...DEFAULT_LOOK }, lookDone: false, name: '', gift: false, npcSeen: {}, museumIntroSeen: false, mounted: false,
  };
}
/* CHEAT LOCK: segna che dei comandi cheat sono attivi (tag HUD + `vanilla` disponibile). Il save
   NON è più congelato: giocare con i comandi PERSISTE come un gioco normale (così testare non fa
   perdere i progressi al refresh). `vanilla` annulla i cheat ripristinando lo SNAPSHOT pre-cheat,
   che viene PERSISTITO in localStorage → funziona anche dopo un refresh. */
let cheatLock = false;
export function isCheatLock() { return cheatLock; }
export function setCheatLock(v) { cheatLock = !!v; }
export const CHEATBAK = SK + '_cheatbak';   // snapshot dello stato PRIMA del primo comando cheat
export function stashCheatSnapshot() { try { if (!localStorage.getItem(CHEATBAK)) localStorage.setItem(CHEATBAK, JSON.stringify(snapshotState())); } catch (e) { /* extra */ } }
export function readCheatSnapshot() { try { const r = localStorage.getItem(CHEATBAK); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
export function clearCheatSnapshot() { try { localStorage.removeItem(CHEATBAK); } catch (e) { /* extra */ } }
export function hasCheatSnapshot() { try { return !!localStorage.getItem(CHEATBAK); } catch (e) { return false; } }
/* Lo stato pronto da SPEDIRE: identico a quello che si scrive in localStorage, mappa
   esplorata COMPRESSA compresa. Prima il salvataggio locale la impacchettava per riga e
   quello per il server no: la stessa partita viaggiava molte volte più grande del necessario
   e, con abbastanza mondo scoperto, andava a sbattere contro il tetto del server.
   `packExplored` è idempotente sul formato vecchio, quindi non si corre il rischio di
   comprimere due volte. */
export function snapshotState() {
  const copia = JSON.parse(JSON.stringify(S));
  copia.explored = packExplored(S.explored);
  copia.v = SAVE_V;
  return copia;
}
export function restoreState(obj) {
  /* in-place: mantiene lo STESSO riferimento S (i binding importati restano validi) */
  for (const k of Object.keys(S)) if (!(k in obj)) delete S[k];
  Object.assign(S, obj);
  dugSet = new Set(S.dug || []);
  choppedSet = new Set(S.chopped || []);
  minedSet = new Set(S.mined || []);
  pickedSet = new Set(S.picked || []);
}
/* Versione dello SCHEMA del salvataggio (non del gioco): si alza solo quando cambia la forma
   dei dati e serve una migrazione. Permette di riconoscere save vecchi e save dal futuro. */
export const SAVE_V = 1;
export const BAK = SK + '_bak';       // copia del salvataggio precedente (rete di sicurezza)
export const BROKEN = SK + '_broken'; // save illeggibile messo da parte, mai buttato

/* STACK degli oggetti di superficie (goods): identici → UNA voce con quantità (max 64), per
   non avere liste infinite di conchiglie. I REPERTI (raw/items) NON si impilano mai, apposta.
   Un good impilato è { uid, id, val, n, good:true } dove `val` = valore TOTALE delle n unità. */
export const GOOD_STACK = 64;
export function compactGoods() {
  if (!Array.isArray(S.goods)) { S.goods = []; return; }
  if (!S.uid) S.uid = 1;
  const by = new Map();                                   // raccogli n e valore totale per id
  for (const g of S.goods) {
    if (!g || !g.id) continue;
    const e = by.get(g.id) || { id: g.id, n: 0, val: 0 };
    e.n += (g.n || 1); e.val += (g.val || 0); by.set(g.id, e);
  }
  const out = [];
  for (const e of by.values()) {
    let left = e.n, valLeft = e.val;
    while (left > 0) {                                     // oltre 64 → pila successiva
      const take = Math.min(GOOD_STACK, left);
      const v = (left === take) ? valLeft : Math.round(e.val * take / e.n); // l'ultima pila assorbe l'arrotondamento
      out.push({ uid: S.uid++, id: e.id, n: take, val: v, good: true });
      valLeft -= v; left -= take;
    }
  }
  S.goods = out;
}

/* Gli elenchi di tile scavate/abbattute crescono a ogni azione: senza dedup arrivano a
   riempire la quota di localStorage in una partita lunga. I Set sono la verità. */
function packSets() {
  if (dugSet.size) S.dug = [...dugSet];
  if (choppedSet.size) S.chopped = [...choppedSet];
  if (minedSet.size) S.mined = [...minedSet];
  if (pickedSet.size) S.picked = [...pickedSet];
}
let saveFail = null;                  // ultimo errore di scrittura (null = tutto bene)
export function saveError() { return saveFail; }
/* onSaveError: la UI si registra qui per avvisare il giocatore (una volta sola) */
let onSaveError = null;
export function setSaveErrorHandler(fn) { onSaveError = fn; }
/* Chi vuole sapere che è appena stato salvato si registra qui — oggi è la sincronia col
   server (account.js). Un gancio invece di una chiamata diretta perché il salvataggio è la
   cosa più in basso di tutto il gioco: se importasse account.js, ogni partita si tirerebbe
   dietro anche la parte di rete, che alla stragrande maggioranza dei giocatori non serve. */
let onSaved = null;
export function setSaveHook(fn) { onSaved = fn; }
export function save() {
  try {
    S.px = P.x; S.py = P.y; S.started = true; S.v = SAVE_V;
    packSets();
    /* la mappa esplorata si salva COMPRESSA (intervalli per riga): senza, una partita
       molto esplorata supera la quota di localStorage e smette di salvarsi — proprio a chi
       ha giocato di più. In RAM resta l'oggetto veloce da consultare. */
    const json = JSON.stringify({ ...S, explored: packExplored(S.explored) });
    /* backup rotante: il save buono di prima resta recuperabile se questo si corrompe */
    try { const prev = localStorage.getItem(SK); if (prev) localStorage.setItem(BAK, prev); } catch (e) { /* il backup è un extra */ }
    localStorage.setItem(SK, json);
    if (saveFail) { saveFail = null; }   // ripreso a funzionare
    /* salvato qui: ora, se c'è un account collegato, la partita va anche sul server.
       Mai lasciar passare un'eccezione: un problema di rete non deve rompere il gioco. */
    if (onSaved) { try { onSaved(); } catch (e) { /* la partita locale è già al sicuro */ } }
    return true;
  } catch (e) {
    const first = !saveFail;
    saveFail = (e && e.name) || 'error';
    if (first && onSaveError) { try { onSaveError(saveFail); } catch (e2) { /* mai bloccare il gioco */ } }
    return false;
  }
}
/* Legge il salvataggio. Se il principale è ILLEGGIBILE non lo si butta: si mette da parte in
   `_broken` e si prova il backup. Così l'autosave non cancella una partita recuperabile. */
export function load() {
  let raw = null;
  try { raw = localStorage.getItem(SK); } catch (e) { return null; }
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {
      try { localStorage.setItem(BROKEN, raw); localStorage.removeItem(SK); } catch (e2) { /* ok */ }
    }
  }
  try { const b = localStorage.getItem(BAK); if (b) return JSON.parse(b); } catch (e) { /* niente backup */ }
  return null;
}

/* ---------- slot di salvataggio manuali (il boot legge sempre SK) ---------- */
export const SLOTS = 3;
function slotKey(n) { return SK + '_slot' + n; }
export function slotInfo(n) {
  try { const r = localStorage.getItem(slotKey(n)); if (!r) return null; return JSON.parse(r); } catch (e) { return null; }
}
/* Anche con i comandi cheat attivi si salva negli slot (tutto persiste; `vanilla` annulla via
   snapshot). */
export function saveToSlot(n) {
  save();
  packSets();
  try {
    localStorage.setItem(slotKey(n), JSON.stringify({ ...S, explored: packExplored(S.explored), v: SAVE_V, savedAt: Date.now() }));
    /* anche gli slot vanno sul server: sono partite a tutti gli effetti, e chi ne salva una
       sul computer si aspetta di ritrovarla sul telefono. Mai bloccare il salvataggio locale
       se la rete non va: quello è già riuscito. */
    if (onSlotSaved) { try { onSlotSaved(n); } catch (e) { /* la copia locale è al sicuro */ } }
    return true;
  } catch (e) { return false; }
}
/* chi vuole sapere che uno slot è stato salvato (la sincronia col server) si registra qui */
let onSlotSaved = null;
export function setSlotSaveHook(fn) { onSlotSaved = fn; }
/* il contenuto grezzo di uno slot, per mandarlo al server senza reinterpretarlo */
export function slotRaw(n) {
  try { return localStorage.getItem(slotKey(n)); } catch (e) { return null; }
}
export function setSlotRaw(n, json) {
  try { localStorage.setItem(slotKey(n), json); return true; } catch (e) { return false; }
}
/* copia lo slot nella chiave principale: al reload il boot riparte da lì */
export function loadFromSlot(n) {
  try {
    const r = localStorage.getItem(slotKey(n)); if (!r) return false;
    localStorage.setItem(SK, r);
    localStorage.removeItem(BAK);      // il backup è della partita PRECEDENTE: non deve tornare
    return true;
  } catch (e) { return false; }
}
/* NUOVA PARTITA: va cancellato ANCHE il backup, altrimenti al riavvio load() ripesca da lì
   la partita appena abbandonata (il backup serve solo contro i save corrotti). */
export function newGame() {
  for (const k of [SK, BAK, BROKEN]) { try { localStorage.removeItem(k); } catch (e) { /* ok */ } }
}

/* Carica (o crea) lo stato, applica default per i save vecchi. Ritorna true se caricato. */
/* RETE DI SICUREZZA: se per qualunque motivo la posizione diventa non valida (NaN/Infinity),
   il gioco diventerebbe ingiocabile — schermo nero, camera impazzita e salvataggio corrotto.
   Qui si ripara invece di propagare il guasto. */
export function sanitizePos() {
  if (Number.isFinite(P.x) && Number.isFinite(P.y)) return false;
  P.x = Number.isFinite(S.px) ? S.px : 0;
  P.y = Number.isFinite(S.py) ? S.py : 0;
  if (!Number.isFinite(P.x) || !Number.isFinite(P.y)) { P.x = 0; P.y = 0; }
  return true;
}

export function initState() {
  const loaded = load(); S = loaded || fresh();
  /* SCHEMA: `v` dice con che forma di dati è stato scritto il save. Se manca è un save
     pre-versionamento (v0), e le migrazioni qui sotto lo portano al presente. Un save dal
     FUTURO (v maggiore) non si tocca: meglio caricarlo com'è che romperlo. */
  const from = S.v || 0;
  S.v = Math.max(from, SAVE_V);
  if (!S.raw) S.raw = []; if (!S.items) S.items = []; if (!S.codex) S.codex = [];
  if (!S.donated) S.donated = []; if (!S.dug) S.dug = []; if (!S.creatures) S.creatures = [];
  if (!S.look) S.look = { ...DEFAULT_LOOK };
  if (S.look.hairStyle === undefined) { S.look.hairStyle = DEFAULT_LOOK.hairStyle; S.look.hairColor = DEFAULT_LOOK.hairColor; }
  /* migrazione: hatOn (bool) → hatStyle ('none' | forma) */
  if (S.look.hatStyle === undefined) S.look.hatStyle = S.look.hatOn === false ? 'none' : 'explorer';
  if (S.look.eyeColor === undefined) S.look.eyeColor = DEFAULT_LOOK.eyeColor;
  if (S.look.shirtStyle === undefined) S.look.shirtStyle = DEFAULT_LOOK.shirtStyle; // forme maglia/pantaloni
  if (S.look.pantsStyle === undefined) S.look.pantsStyle = DEFAULT_LOOK.pantsStyle;
  if (S.tod === undefined) S.tod = 0.25;
  if (!S.book) S.book = {};
  /* la mappa arriva compressa dal disco (o nel vecchio formato: unpack li gestisce entrambi) */
  S.explored = unpackExplored(S.explored);
  if (!S.sites) S.sites = {};
  if (!S.awakened) S.awakened = [];
  if (!S.museum) S.museum = {};
  if (!S.fountains) S.fountains = {}; // lanci nella fontana per città {n, d0}
  if (!S.maps) S.maps = []; // mappe del tesoro attive {x, y, rar, uid}
  if (!S.snacks) S.snacks = 0; // ristori nello zaino
  if (!S.npcSeen) S.npcSeen = {}; // edifici già visitati (tutorial 1-volta)
  if (S.compassOn === undefined) S.compassOn = true; // bussola-oggetto accesa quando la possiedi
  if (S.museumIntroSeen === undefined) S.museumIntroSeen = Object.keys(S.book || {}).length > 0; // spiegone museo 1-volta
  if (S.trackMap === undefined) S.trackMap = null; // mappa seguita dalla bussola
  if (!S.dna) S.dna = {}; // DNA per specie in FIALETTE INTERE
  if (S.vials) { for (const id of S.vials) S.dna[id] = (S.dna[id] || 0) + 1; delete S.vials; } // migrazione vecchia
  /* migrazione mezze→intere: i vecchi save avevano dna in mezze dosi (2 = 1 fialetta) */
  if (!S.dnaV2) { for (const id in S.dna) S.dna[id] = Math.round((S.dna[id] || 0) / 2); S.dnaV2 = true; }
  if (S.museumJob === undefined) S.museumJob = null; // consegna in lavorazione {items, ready}
  if (!S.tools) S.tools = {}; // pala/accetta/piccone/barca (permanenti)
  if (!S.shovel) S.shovel = 0; // cariche della pala fortunata
  /* GATING PALA: le partite NUOVE partono senza pala; i save già avviati la ricevono
     (una tantum, alla prima apertura post-update) per non perdere lo scavo. */
  if (S.spadeGate === undefined) {
    const hadProgress = (S.dug && S.dug.length) || (S.items && S.items.length) || S.coins > 0 || S.day > 1 || (S.codex && S.codex.length);
    if (hadProgress) S.tools.spade = true;
    S.spadeGate = true;
  }
  if (!S.chopped) S.chopped = []; if (!S.mined) S.mined = []; if (!S.picked) S.picked = [];
  if (!S.goods) S.goods = []; // oggetti di superficie da vendere (non fossili)
  compactGoods();             // save vecchi: comprime le liste di goods uguali in stack (max 64)
  if (!S.drops) S.drops = []; // fossili/oggetti lasciati a terra (zaino pieno o scartati)
  /* capacità zaino (fossili); zaini più grandi al Negozio. Le taglie sono state alzate
     (10/18/28 → 14/22/30): chi ha un salvataggio vecchio sale alla taglia corrispondente,
     invece di restare con uno zaino che non esiste più in nessun listino. */
  if (!S.bagCap) S.bagCap = 14;
  else { const OLD = { 10: 14, 18: 22, 28: 30 }; if (OLD[S.bagCap]) S.bagCap = OLD[S.bagCap]; }
  if (S.fireflies == null) S.fireflies = 0; // lucciole raccolte di notte (#5)
  if (!S.wrecks) S.wrecks = {}; // relitti frugati (chiave sito)
  if (!S.level) S.level = 1; if (S.xp === undefined) S.xp = 0; // progressione archeologo
  if (!S.achieved) S.achieved = []; if (S.questTotal === undefined) S.questTotal = 0; // traguardi (S.achieved: legacy)
  if (!S.trophies) S.trophies = {}; if (S.findsTotal === undefined) S.findsTotal = 0; // trofei a livelli + reperti trovati (lifetime)
  if (!S.glitterHats) S.glitterHats = []; // cappelli-trofeo portati al PLATINO: si disegnano con glitter dorato
  if (S.introSeen === undefined) S.introSeen = !!S.started; // i save già avviati non rivedono l'intro
  if (S.gear === undefined) S.gear = null;
  /* i natanti non sono più un "gear attivabile": in acqua si sale da soli (v0.16.5) */
  if (S.gear === 'boat' || S.gear === 'motorboat') S.gear = null;
  delete S.gearOn; // vecchio modello (mezzi indipendenti) rimosso
  if (!S.unlocked) S.unlocked = { hats: [], hairs: [] }; // cosmetici tematici scoperti
  // pulizia cosmetici rimossi dal gioco (es. elmetto): non devono più comparire nei save
  const REMOVED_HATS = ['minerhelm'];
  if (S.unlocked.hats) S.unlocked.hats = S.unlocked.hats.filter(id => !REMOVED_HATS.includes(id));
  if (S.look && REMOVED_HATS.includes(S.look.hatStyle)) S.look.hatStyle = 'explorer';
  setSeed(S.seed || 1);
  dugSet = new Set(S.dug);
  choppedSet = new Set(S.chopped); minedSet = new Set(S.mined); pickedSet = new Set(S.picked);
  return !!loaded;
}
