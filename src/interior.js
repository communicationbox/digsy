/* Interni delle case: stanza camminabile con NPC. Coordinate separate dal mondo (P resta
   sulla porta): salvataggi, bussola e titoli non cambiano. Si entra CAMMINANDO sulla porta,
   si esce ripassando dalla porta in basso (o ESC). */
import { TS } from './data.js';
import { P } from './state.js';
import { goalIsTile, clearGoal, hasGoal, advance, goalTile } from './tapmove.js';
import { townInfo, townForTile, isSolidTile, openArea } from './world.js';
import { MUSEUM_ZONES, zonePools } from './data.js';
import { S, save } from './state.js';
import { tr, zoneName } from './i18n.js';
import { zoneAt } from './regions.js';
import { playSfx } from './audio.js';
import { pendingLetter, giveLetter, letterTitle } from './letters.js';

export const INT = {
  active: false, b: null, town: null,
  w: 10, h: 7,            // stanza in tile
  x: 0, y: 0,             // posizione del player DENTRO (px)
  dir: 'up', anim: 0, moving: false,
  justLeft: false,        // anti-rientro immediato
  room: 'main',           // 'main' | 'gallery' (museo)
  say: null,              // fumetto dell'NPC { text, t }
};
/* fumetto sopra l'NPC (ringraziamenti/spiegazioni). Dura qualche secondo, poi sparisce. */
export function sayNpc(text, sec = 3.4) { if (text) INT.say = { text, t: sec }; }
export function clearSay() { INT.say = null; }
/* museo: GRANDE galleria camminabile (camera che scorre), 6 SALE per bioma disposte a
   griglia 2×3 attorno a un atrio d'ingresso; bancone del Curatore DRITTO davanti alla porta.
   Ogni piedistallo espone i SOLI pezzi consegnati; etichetta interattiva con E. */
export const GAL_W = 60, GAL_H = 62; // tile (4 file di sale: 6 biomi + le grotte)
const RW = 26, RH = 11, GAPX = 4, GAPY = 3, MX = 2, MTOP = 3; // geometria delle sale
export const ROOM_W = RW, ROOM_H = RH;
/* Disposizione delle sale: si entra dal BASSO, quindi la prima zona (Prati) è la sala più
   vicina all'ingresso e le GROTTE sono l'ultima, in fondo alla galleria — da sola e centrata,
   come si conviene all'ala speciale. */
const ROWS_UP = 3;                                  // righe di biomi (2 sale ciascuna)
export function roomOrigin(zi) {
  if (zi >= 6) {                                    // ala GROTTE: in fondo, centrata
    return { rx: MX + Math.round((RW + GAPX) / 2), ry: MTOP };
  }
  const row = Math.floor(zi / 2);                   // 0 = più vicina all'ingresso
  return { rx: MX + (zi % 2) * (RW + GAPX), ry: MTOP + (ROWS_UP - row) * (RH + GAPY) };
}
/* memoizzato: la disposizione è deterministica, ma pedList gira più volte per frame
   (render + collisioni + nearCase) → evitiamo di riallocare 60 oggetti ogni volta */
let _peds = null;
export function pedList() {
  if (_peds) return _peds;
  const out = [];
  MUSEUM_ZONES.forEach((z, zi) => {
    const { rx, ry } = roomOrigin(zi);
    const pool = zonePools[z.id];
    for (let i = 0; i < pool.length; i++) {
      /* 2 file da 5 piedistalli, ben distanziati dentro la sala. Collisione SOLO sulla base:
         la teca svetta e il pg ci passa DIETRO (disegnata dopo, z-order per y) */
      const tx = rx + 4 + (i % 5) * 4, ty = ry + 3 + Math.floor(i / 5) * 5;
      out.push({ sp: pool[i], zi, tx, ty, x0: tx * TS + 2, y0: ty * TS + 4, x1: tx * TS + 14, y1: ty * TS + 15 });
    }
  });
  _peds = out; return _peds;
}
/* bancone CENTRATO davanti all'ingresso (in basso al centro), leggermente più stretto */
export const GAL_DESK = { x0: (GAL_W / 2 - 3) * TS, y0: (GAL_H - 5) * TS, x1: (GAL_W / 2 + 3) * TS, y1: (GAL_H - 4) * TS };
/* MAESTRO SCAVATORE: gira per il museo — dall'atrio sale, aggira il bancone e passeggia
   nel corridoio FRA le due file di teche della sala in basso a sinistra, poi torna indietro.
   Waypoint derivati dalla geometria (mai numeri magici): tutti su tile camminabili. */
export const GAL_MENTOR = { x: GAL_DESK.x0 - 72, y: GAL_DESK.y1 + 22 };
export const MENTOR_PATH = (() => {
  const { rx, ry } = roomOrigin(0);                      // sala più vicina all'ingresso
  const midY = (ry + 5.5) * TS;                          // fascia libera fra le due file di teche
  const corrX = (GAL_W / 2) * TS;                        // corridoio verticale fra le colonne di sale
  const overDesk = GAL_DESK.y0 - TS;                     // sopra il bancone, sotto le sale
  return [
    [GAL_MENTOR.x, GAL_MENTOR.y],                        // atrio, a sinistra del bancone
    [GAL_MENTOR.x, overDesk],
    [corrX, overDesk],
    [corrX, midY],
    [(rx + 2.5) * TS, midY],                             // in mezzo ai fossili
  ];
})();
/* stato del cammino: ping-pong sul percorso (mai teletrasporti, mai passi all'indietro) */
export const MENTOR = { x: MENTOR_PATH[0][0], y: MENTOR_PATH[0][1], dir: 'up', anim: 0, pi: 1, back: false, wait: 0 };
export function resetMentor() { MENTOR.x = MENTOR_PATH[0][0]; MENTOR.y = MENTOR_PATH[0][1]; MENTOR.pi = 1; MENTOR.back = false; MENTOR.dir = 'up'; MENTOR.anim = 0; MENTOR.wait = 0; }
export function updateMentor(dt) {
  if (MENTOR.wait > 0) { MENTOR.wait -= dt; return; }
  const [tx, ty] = MENTOR_PATH[MENTOR.pi];
  const dx = tx - MENTOR.x, dy = ty - MENTOR.y, l = Math.hypot(dx, dy);
  if (l < 2) {                                           // waypoint raggiunto: prossimo (o inverti)
    MENTOR.x = tx; MENTOR.y = ty;
    const last = MENTOR.back ? 0 : MENTOR_PATH.length - 1;
    if (MENTOR.pi === last) { MENTOR.back = !MENTOR.back; MENTOR.wait = 1.2; }
    MENTOR.pi += MENTOR.back ? -1 : 1;
    MENTOR.pi = Math.max(0, Math.min(MENTOR_PATH.length - 1, MENTOR.pi));
    return;
  }
  const sp = 22, ux = dx / l, uy = dy / l;               // direzione dalla VELOCITÀ (niente moonwalk)
  MENTOR.x += ux * sp * dt; MENTOR.y += uy * sp * dt;
  MENTOR.dir = Math.abs(ux) > Math.abs(uy) ? (ux < 0 ? 'left' : 'right') : (uy < 0 ? 'up' : 'down');
  MENTOR.anim += dt;
}
export function nearMentorInt() {
  if (!INT.active || !INT.b || INT.b.type !== 'museum') return false;
  return Math.abs(INT.x - MENTOR.x) < 26 && Math.abs(INT.y - MENTOR.y) < 26;
}

/* NPC per mestiere: look (usato con drawHero) e nome */
export const NPCS = {
  lab: { name: ['Prof. Ossidiana', 'Prof. Obsidian'], look: { hat: '#6e7bb2', hatStyle: 'none', shirt: '#6e7bb2', pants: '#3a3f52', skin: '#e3b98a', hairStyle: 'curly', hairColor: '#9a9a9a' } },
  store: { name: ['Bottegaia Ambra', 'Shopkeeper Amber'], look: { hat: '#d8973c', hatStyle: 'none', shirt: '#c98a2e', pants: '#6b5137', skin: '#c9995f', hairStyle: 'long', hairColor: '#6e4a2a' } },
  museum: { name: ['Curatore Basalto', 'Curator Basalt'], look: { hat: '#6f5a94', hatStyle: 'none', shirt: '#6f5a94', pants: '#3d5f4a', skin: '#f3cfa0', hairStyle: 'receding', hairColor: '#9a9a9a' } },
  inn: { name: ['Locandiera Papavera', 'Innkeeper Poppy'], look: { hat: '#c65a54', hatStyle: 'none', shirt: '#c65a54', pants: '#8a5f38', skin: '#e3b98a', hairStyle: 'long', hairColor: '#b5622e' } },
  barber: { name: ['Barbiere Figaro', 'Barber Figaro'], look: { hat: '#5a86c8', hatStyle: 'none', shirt: '#5a86c8', pants: '#33291f', skin: '#a3744a', hairStyle: 'punk', hairColor: '#33291f' } },
  tailor: { name: ['Sarta Ortensia', 'Tailor Hortense'], look: { hat: '#e08aa8', hatStyle: 'none', shirt: '#e08aa8', pants: '#5a6a8a', skin: '#f3cfa0', hairStyle: 'curly', hairColor: '#caa25a' } },
};
export function npcName(type) { const n = (NPCS[type] || NPCS.store).name; return tr(n[0], n[1]); }

/* mobili solidi per mestiere (px, stanza 160×112) — corridoio centrale sempre libero */
const FURN = {
  lab: [
    { x0: 12, y0: 46, x1: 48, y1: 68 },    // postazione alambicco
    { x0: 112, y0: 46, x1: 148, y1: 68 },  // banco da lavoro
  ],
  store: [
    { x0: 12, y0: 46, x1: 46, y1: 68 },    // casse e sacchi
    { x0: 114, y0: 46, x1: 148, y1: 68 },  // botti
  ],
  museum: [
    { x0: 18, y0: 46, x1: 52, y1: 70 },    // teca sinistra
    { x0: 108, y0: 46, x1: 142, y1: 70 },  // teca destra
  ],
  inn: [
    { x0: 14, y0: 48, x1: 48, y1: 68 },    // tavolo sinistro
    { x0: 112, y0: 48, x1: 146, y1: 68 },  // tavolo destro
  ],
  barber: [
    { x0: 14, y0: 46, x1: 44, y1: 68 },    // poltrona
    { x0: 114, y0: 50, x1: 148, y1: 66 },  // panca d'attesa
  ],
  tailor: [
    { x0: 16, y0: 48, x1: 42, y1: 66 },    // manichino
    { x0: 110, y0: 46, x1: 148, y1: 68 },  // tavolo da cucito
  ],
};
/* cutscene: al primo museo di un bioma NUOVO il Curatore ti viene incontro
   e ti consegna le pagine aggiornate del Libro. Player bloccato finché non finisce.
   Cammina LUNGO waypoint (mai sopra la scrivania). */
export const CUT = { on: false, letter: null, x: 0, y: 0, phase: null, t: 0, zone: null, path: [], pi: 0, line: null, thanks: null, queue: [], qi: 0, thanksLine: null };
/* bande cinema + overlay cutscene (tap per avanzare, Salta in alto, "clicca per continuare" in basso) */
function cutBars(on) {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('cutscene', !!on);
  let fx = document.getElementById('cutfx');
  if (on) {
    if (!fx) {
      fx = document.createElement('div'); fx.id = 'cutfx';
      fx.innerHTML = `<div id="cuttap"></div><button id="cutskip">${tr('Salta ⏭', 'Skip ⏭')}</button><div id="cuthint">▶ ${tr('clicca per continuare', 'click to continue')}</div>`;
      document.body.appendChild(fx);
      const tap = fx.querySelector('#cuttap'); if (tap) tap.onclick = () => cutAdvance();
      const sk = fx.querySelector('#cutskip'); if (sk) sk.onclick = e => { e.stopPropagation(); cutSkip(); };
    }
    fx.style.display = 'block';
  } else if (fx) fx.remove();
}
function cutHint(show) { if (typeof document === 'undefined') return; const h = document.getElementById('cuthint'); if (h) h.style.display = show ? 'block' : 'none'; }
/* avanza al CLICK (mai a timer): passa alla battuta successiva, o al ritorno se finite */
export function cutAdvance() {
  if (!CUT.on || CUT.phase !== 'give') return;
  CUT.qi++;
  if (CUT.qi >= CUT.queue.length) { cutStartBack(); return; }
  CUT.line = CUT.queue[CUT.qi];
}
export function cutSkip() { if (CUT.on && CUT.phase !== 'back') cutStartBack(); }
function cutStartBack() {
  CUT.phase = 'back'; CUT.pi = 0; CUT.line = null; CUT.thanks = null; cutHint(false);
  CUT.path = [[GAL_DESK.x1 + 26, GAL_DESK.y1 + 14], [GAL_DESK.x1 + 26, GAL_DESK.y0 - 6], [(GAL_DESK.x0 + GAL_DESK.x1) / 2, GAL_DESK.y0 - 6]];
}
export function enterInterior(b, town) {
  INT.fromX = P.x; INT.fromY = P.y;      // da dove si è entrati: via di ritorno sicura
  clearGoal();                            // dentro non si cammina più verso la meta di fuori
  INT.active = true; INT.b = b; INT.town = town;
  const mus = b.type === 'museum';
  INT.w = mus ? GAL_W : 10; INT.h = mus ? GAL_H : 7; // il museo è una galleria GRANDE
  INT.x = (INT.w / 2) * TS; INT.y = (INT.h - 1.3) * TS;
  INT.dir = 'up'; INT.moving = false; INT.say = null; INT.greeted = false;
  INT.room = mus ? 'gallery' : 'main';
  if (mus) resetMentor();                            // il Maestro riparte dall'atrio
  /* museo: bancone + piedistalli + i vasi (collisione SOLO sul vaso: le fronde stanno sopra, ci si passa dietro) */
  const plants = mus ? [GAL_DESK.x0 - 16, GAL_DESK.x1 + 6].map(pxo => ({ x0: pxo, y0: GAL_DESK.y1 + 1, x1: pxo + 10, y1: GAL_DESK.y1 + 9 })) : [];
  INT.solids = mus ? [GAL_DESK, ...pedList(), ...plants] : (FURN[b.type] || []);
  if (mus) {
    const z = zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
    const letter = pendingLetter();               // sala riempita → il nonno ha lasciato una lettera
    if ((z && !S.book[z.id]) || letter) {
      CUT.on = true; CUT.phase = 'walk'; CUT.t = 0; CUT.zone = z; CUT.pi = 0; CUT.thanks = null;
      CUT.letter = (z && !S.book[z.id]) ? null : letter;   // il Libro ha la precedenza
      CUT.line = CUT.letter
        ? tr('Fermo lì! Devo darti una cosa che custodivo da anni.', 'Hold on! I must give you something I have kept for years.')
        : tr('Aspetta! Ho qualcosa per te.', 'Wait! I have something for you.');
      /* parte a DESTRA del banco e DELLA PIANTA (mai sopra), poi scende verso il player */
      CUT.x = GAL_DESK.x1 + 26; CUT.y = GAL_DESK.y0 - 6;
      CUT.path = [[GAL_DESK.x1 + 26, GAL_DESK.y1 + 14], [INT.x, INT.y - 22]];
      cutBars(true);
    }
  }
}
function follow(dt) { // segue i waypoint; true quando il percorso è finito
  const t2 = CUT.path[CUT.pi]; if (!t2) return true;
  const speed = 46 * dt;
  const dx = t2[0] - CUT.x, dy = t2[1] - CUT.y, l = Math.hypot(dx, dy);
  if (l < 2.5) { CUT.pi++; return CUT.pi >= CUT.path.length; }
  CUT.x += dx / l * speed; CUT.y += dy / l * speed;
  return false;
}
function stepCut(dt) {
  if (CUT.phase === 'walk') {
    if (follow(dt)) {
      CUT.phase = 'give'; CUT.t = 0; CUT.qi = 0; CUT.thanks = null;
      if (CUT.letter) {                       // CONSEGNA DELLA LETTERA DEL NONNO
        const fin = CUT.letter === 'finale';
        CUT.queue = [CUT.line];               // la frase detta camminando resta finché non clicchi
        CUT.queue = CUT.queue.concat(fin
          ? [tr('Hai riempito ogni sala del mio museo. Ogni singola sala.', 'You filled every room of my museum. Every single one.'),
             tr('Tuo nonno mi lasciò un\'ultima busta, da aprire solo a quel punto.', 'Your grandparent left me one last envelope, to be opened only then.'),
             tr('Credo sia arrivato il momento. Siediti: leggila con calma.', 'I believe the moment has come. Sit down: read it slowly.')]
          : [tr('Questa la lasciò tuo nonno, anni fa. Disse: "dagliela quando avrà riempito la sala".', 'Your grandparent left this years ago. They said: "give it to them once the room is full".'),
             tr('Io ho solo mantenuto la promessa. Il resto è scritto lì dentro.', 'I only kept the promise. The rest is written in there.')]);
        CUT.thanksLine = fin ? tr('…grazie, nonno.', '…thank you, Grandpa.') : tr('La leggo subito!', 'I\'ll read it right away!');
        CUT.line = CUT.queue[0];
        giveLetter(CUT.letter); save(); playSfx('fanfare');
        if (typeof document !== 'undefined') import('./ui.js').then(u => {
          u.showBanner('✉ ' + tr('LETTERA DEL NONNO', 'A LETTER FROM GRANDPA') + '<br><span style="font-size:.8em">' + letterTitle(CUT.letter) + '</span>', 3200);
        });
        return;
      }
      const first = !S.museumIntroSeen;
      /* la battuta detta mentre camminava ("Aspetta! Ho qualcosa per te") resta in testa alla
         coda: si passa alla successiva SOLO col click (i bambini leggono piano). */
      CUT.queue = [CUT.line, tr('Ecco le pagine del Libro di ', 'Here are the Book pages of ') + zoneName(CUT.zone.id) + tr('. Custodiscile bene.', '. Keep them safe.')];
      if (first) { // SPIEGONE solo al primissimo museo: DNA + porta i grezzi
        CUT.queue.push(tr('Studio i fossili interi e ne ricavo il DNA: così le creature tornano a vivere.', 'I study whole fossils and extract their DNA: that is how creatures come back to life.'));
        CUT.queue.push(tr('Se trovi un reperto che non riconosci, portamelo al bancone: lo identifico io.', 'If you find something you can\'t recognize, bring it to my desk: I\'ll identify it.'));
        CUT.thanksLine = tr('Ne ho già uno nello zaino: arrivo!', "I've got one in my bag already: coming!");
        S.museumIntroSeen = true;
        if (!S.npcSeen) S.npcSeen = {}; S.npcSeen.museum = true; // evita il doppio tutorial al bancone
      } else {
        CUT.thanksLine = tr('Grazie! Le riempirò tutte.', "Thank you! I'll fill them all.");
      }
      CUT.line = CUT.queue[0];
      S.book[CUT.zone.id] = true; save();
      if (typeof document !== 'undefined') import('./ui.js').then(u => {
        u.showBanner('📖 ' + tr('NUOVO LIBRO CONSEGNATO', 'NEW BOOK DELIVERED') + '<br><span style="font-size:.8em">' + tr('Pagine di ', 'Pages of ') + zoneName(CUT.zone.id) + '</span>');
      });
    }
  } else if (CUT.phase === 'give') {
    CUT.t += dt; // solo per l'animazione del libro: si AVANZA AL CLICK (cutAdvance), mai a timer
    if (CUT.qi >= CUT.queue.length - 1 && !CUT.thanks) CUT.thanks = CUT.thanksLine; // Digsy ringrazia sull'ultima battuta
  } else if (follow(dt)) {
    const wasLetter = CUT.letter;
    CUT.on = false; CUT.phase = null; CUT.line = null; CUT.thanks = null; CUT.letter = null; cutBars(false);
    /* il Curatore è tornato al banco: ora si legge la lettera */
    if (wasLetter && typeof document !== 'undefined') import('./ui.js').then(u => u.openLetter(wasLetter, false)); // consegna: si chiude e basta
  }
  cutHint(CUT.on && CUT.phase === 'give'); // "clicca per continuare" solo mentre parla
}
export function exitInterior() {
  INT.active = false; INT.justLeft = true;
  if (CUT.on) { CUT.on = false; CUT.phase = null; CUT.line = null; CUT.thanks = null; } cutBars(false);
  if (!INT.b) return;
  /* la porta DEVE avere coordinate valide: senza, P finirebbe a NaN e il gioco diventerebbe
     ingiocabile (schermo nero) con un salvataggio già corrotto. Meglio tornare da dove si è
     entrati che uscire nel nulla. */
  if (!Number.isFinite(INT.b.doorx) || !Number.isFinite(INT.b.doory)) {
    if (Number.isFinite(INT.fromX) && Number.isFinite(INT.fromY)) { P.x = INT.fromX; P.y = INT.fromY; }
    return;
  }
  /* tile davanti alla porta con SPAZIO APERTO attorno: il pg non resta mai bloccato */
  const cands = [[0, 1], [0, 2], [-1, 1], [1, 1], [-1, 2], [1, 2], [0, 3], [-1, 3], [1, 3], [-2, 1], [2, 1]];
  for (const [dx, dy] of cands) { // 1° passaggio: libera E non intrappolata
    const tx = INT.b.doorx + dx, ty = INT.b.doory + dy;
    if (!isSolidTile(tx, ty) && openArea(tx, ty, 5)) { P.x = tx * TS + 8; P.y = ty * TS + 10; return; }
  }
  for (const [dx, dy] of cands) { // 2° passaggio: almeno libera
    const tx = INT.b.doorx + dx, ty = INT.b.doory + dy;
    if (!isSolidTile(tx, ty)) { P.x = tx * TS + 8; P.y = ty * TS + 10; return; }
  }
  P.x = INT.b.doorx * TS + 8; P.y = (INT.b.doory + 1) * TS + 10; // ripiego (non dovrebbe servire)
}
/* pareti + bancone: il player vive tra y=2.4 tile e la parete bassa */
export function interiorSolid(x, y) {
  const w = INT.w * TS, h = INT.h * TS;
  if (x < 8 || x > w - 8) return true;
  if (INT.room === 'main') { if (y < 2.9 * TS) return true; }            // parete + bancone
  else if (y < 2 * TS) return true;                                       // galleria: parete alta
  if (y > h - 4) return true;                            // parete bassa (la porta è un varco)
  for (const f of INT.solids || []) if (x >= f.x0 && x <= f.x1 && y >= f.y0 && y <= f.y1) return true;
  return false;
}
export function nearNpc() {
  if (!INT.active) return false;
  if (INT.b && INT.b.type === 'museum') { // Curatore al banco, DAVANTI all'ingresso
    return INT.x >= GAL_DESK.x0 - 10 && INT.x <= GAL_DESK.x1 + 10 && INT.y > GAL_DESK.y1 && INT.y < GAL_DESK.y1 + 48;
  }
  return Math.abs(INT.x - (INT.w / 2) * TS) < 30 && INT.y < 3.6 * TS;
}
/* piedistallo più vicino nella galleria: {sp, n} per etichetta/prompt */
export function nearCase() {
  if (!INT.active || !INT.b || INT.b.type !== 'museum') return null;
  for (const pd of pedList()) {
    const cx = (pd.x0 + pd.x1) / 2;
    /* si legge da SUD: il pg si ferma appena sotto la base (teca solida sopra) */
    if (Math.abs(INT.x - cx) < 16 && INT.y > pd.y1 - 12 && INT.y < pd.y1 + 30) {
      return { sp: pd.sp, n: (S.museum[pd.sp.id] || []).length };
    }
  }
  return null;
}
export function onDoor() {
  return INT.y > (INT.h - 1.15) * TS && Math.abs(INT.x - (INT.w / 2) * TS) < 14;
}
/* La meta toccata è l'USCIO? Zona generosa di proposito: nella galleria del museo (60×62
   caselle) la camera si ferma al bordo, quindi la porta finisce sull'ultima riga di pixel
   dello schermo e col mouse non è materialmente cliccabile. Cliccando poco sopra la porta,
   o una casella di lato, si esce lo stesso. */
export function goalIsExit() {
  if (!hasGoal()) return false;
  const g = goalTile();
  /* vale anche la STRADA disegnata oltre la porta (ty >= INT.h): è lì che si clicca per
     uscire, ed è l'unico punto in cui il gesto è naturale */
  return g.ty >= INT.h - 4 && Math.abs(g.tx - (INT.w >> 1)) <= 3;
}
/* si è vicini all'uscita? (per il suggerimento a schermo) */
export function nearExit() {
  if (!INT.active) return false;
  const tx = Math.floor(INT.x / TS), ty = Math.floor((INT.y + 13) / TS);
  return ty >= INT.h - 5 && Math.abs(tx - (INT.w >> 1)) <= 2;
}
/* hitbox dei piedi (4 punti): lo sprite non compenetra i mobili */
export function intCollide(x, y) {
  if (P.fly) return false;
  return interiorSolid(x - 5, y) || interiorSolid(x + 5, y) || interiorSolid(x - 5, y + 5) || interiorSolid(x + 5, y + 5);
}
export function updateInterior(dt, keys, speed) {
  if (INT.say) { INT.say.t -= dt; if (INT.say.t <= 0) INT.say = null; } // scade il fumetto
  if (CUT.on) { INT.moving = false; stepCut(dt); return; } // cutscene: input bloccato (Maestro fermo)
  if (INT.b && INT.b.type === 'museum') updateMentor(dt); // il Maestro fa il suo giro
  let dx = 0, dy = 0;
  if (keys.up) dy--; if (keys.down) dy++; if (keys.left) dx--; if (keys.right) dx++;
  if (dx || dy) {
    clearGoal();                                     // il comando diretto batte la meta
    const l = Math.hypot(dx, dy); dx /= l; dy /= l;
    if (Math.abs(dx) > Math.abs(dy)) INT.dir = dx < 0 ? 'left' : 'right'; else INT.dir = dy < 0 ? 'up' : 'down';
    const nx = INT.x + dx * speed * dt, ny = INT.y + dy * speed * dt;
    if (!intCollide(nx, INT.y)) INT.x = nx;
    if (!intCollide(INT.x, ny) || (dy > 0 && onDoor())) INT.y = ny; // verso la porta si passa
    INT.anim += dt; INT.moving = true;
  } else if (hasGoal()) {
    /* "tocca dove andare" anche dentro: stesso percorso a caselle del mondo aperto, ma con
       le collisioni della stanza (bancone, mobili, pareti) */
    const toExit = goalIsExit();
    const moved = advance(dt, speed, (nx, ny) => {
      if (intCollide(nx, ny) && !(ny > INT.y && onDoor())) return false;
      INT.x = nx; INT.y = ny; return true;
    }, INT);
    if (moved) { INT.anim += dt; INT.moving = true; INT.dir = P.dir; } else INT.moving = false;
    /* Toccando l'USCIO si deve uscire. Il punto da raggiungere sta OLTRE l'ultima casella
       camminabile, quindi il percorso non potrebbe mai arrivarci: quando si è sulla soglia
       (o il cammino è finito lì) si esce, invece di restare fermi contro la porta. */
    if (toExit && !hasGoal() && Math.abs(INT.x - (INT.w / 2) * TS) < 18) { clearGoal(); exitInterior(); return; }
  } else INT.moving = false;
  if (onDoor() && INT.y > (INT.h - 0.9) * TS) { clearGoal(); exitInterior(); } // vale anche per la galleria
}
/* chiamato dal loop: si entra solo CAMMINANDO DENTRO la porta (verso l'alto),
   non passandoci davanti in orizzontale */
export function checkDoorEnter() {
  if (INT.active) return;
  /* si entra coi PIEDI sulla porta (P.y è l'ancora alta: i piedi stanno +13),
     non un blocco prima */
  const tx = Math.floor(P.x / TS), ty = Math.floor((P.y + 13) / TS);
  const ti = townInfo(tx, ty);
  if (ti && ti.door) {
    if (INT.justLeft) return;                        // appena usciti: serve allontanarsi
    /* a piedi si entra salendo (così non si entra passando davanti alle porte);
       col "tocca dove andare" si arriva da qualsiasi lato, e allora vale l'intenzione:
       si entra se la porta è proprio dove si è toccato */
    if (!(P.moving && P.dir === 'up') && !goalIsTile(tx, ty)) return;
    enterInterior(ti.door, townForTile(tx, ty));
  } else INT.justLeft = false;
}
