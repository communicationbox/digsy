/* TOCCA DOVE ANDARE — schema di controllo alternativo al joystick.
   Si tocca (o si clicca) un punto del mondo e Digsy ci cammina. È lo standard dei giochi
   punta-e-vai su telefono: il pollice non deve restare inchiodato in un angolo, e su schermi
   piccoli il cerchio in basso copre proprio la parte di mondo che si vuole guardare.

   Niente ricerca di percorsi: si va in linea retta e si SCIVOLA lungo gli ostacoli (se la x
   è bloccata prova la y, e viceversa) SOLO nell'ultimo tratto: il grosso del cammino lo
   decide un percorso vero (path.js, A* su caselle) che AGGIRA case, alberi e laghi.
   Se la meta è oltre 40 caselle di cammino, il tocco non vale: meglio dirlo che far
   attraversare mezzo mondo per un tocco distratto.

   Modulo PURO nella parte che conta (la decisione di direzione), così è testabile. */
import { P } from './state.js';
import { FOOT_DY, placeOnTile } from './body.js';
import { TS } from './data.js';

export const goal = { on: false, x: 0, y: 0, t: 0, stuck: 0, path: [], step: 0, best: Infinity, redone: false, mark: 0 };
const ARRIVE = 3;          // px: sotto questa distanza si è arrivati (era 10: ci si fermava un passo prima del punto toccato)
const NO_PROGRESS_MS = 900; // fermo O che si struscia senza avvicinarsi: si ricalcola, poi si rinuncia
const LOS_STEP = 6;        // px fra un campione e l'altro nel controllo "la vedo in linea retta"
const LOOK_AHEAD = 6;      // quanti waypoint avanti si prova a tagliare

/* centro camminabile di una casella. È `placeOnTile` di body.js e nient'altro: qui c'era una
   COPIA con i piedi a 13px invece di FOOT_DY (26) — la convenzione che body.js dichiara
   abbandonata proprio perché "depositava il giocatore una casella più in basso". Con quella,
   ogni waypoint puntava 13px troppo in basso e Digsy camminava sul bordo INFERIORE di ogni
   casella del percorso, strusciando contro tutto quello che stava sotto: di qui il cammino a
   scatti, gli incastri e il "non arriva dove gli dico". */
export function tileCenter(tx, ty) { return placeOnTile(tx, ty); }

/* Imposta la meta. Con un percorso (elenco di caselle) Digsy AGGIRA gli ostacoli; senza,
   ci va in linea retta come prima (è il caso degli spazi aperti, dove il percorso non serve).
   `exact` = ci si ferma ESATTAMENTE lì (il punto toccato), non al centro dell'ultima casella:
   il centro casella è quello che faceva sbagliare mira di mezza casella. */
export function setGoal(wx, wy, path, exact = true) {
  goal.on = true; goal.x = wx; goal.y = wy; goal.t = 0; goal.stuck = 0;
  goal.path = Array.isArray(path) ? path.slice() : [];
  goal.step = 0; goal.best = Infinity; goal.redone = false; goal.mark = 0; cutAcc = 1;
  /* senza `exact` la meta finale è il centro dell'ultima casella (serve alle mete decise dal
     gioco: una porta, una statua, il banco di un NPC — lì il punto giusto è il centro) */
  if (!exact && goal.path.length) {
    const last = goal.path[goal.path.length - 1];
    const c = tileCenter(last[0], last[1]);
    goal.x = c.x; goal.y = c.y;
  }
}
export function clearGoal() { goal.on = false; goal.stuck = 0; goal.path = []; goal.step = 0; goal.mark = 0; }
export function hasGoal() { return goal.on; }
export function pathLeft() { return Math.max(0, goal.path.length - goal.step); }
/* quanto tempo è passato da quando la meta è stata data: serve al segno a schermo */
export function goalAge() { return goal.mark; }
/* la meta è QUESTA casella? Serve per entrare da porte e grotte: col "tocca dove andare"
   ci si arriva da qualsiasi lato, quindi la regola "solo camminando verso l'alto" non vale
   più — ma senza una regola si entrerebbe per sbaglio solo passandoci davanti. Qui il
   criterio è l'INTENZIONE: si entra se la porta è proprio dove si è toccato. */
export function goalIsTile(tx, ty) {
  if (!goal.on) return false;
  const g = goalTile();
  return Math.abs(g.tx - tx) <= 1 && Math.abs(g.ty - ty) <= 1;
}
/* la casella su cui il giocatore ha messo il dito (piedi compresi) */
export function goalTile() {
  return { tx: Math.floor(goal.x / TS), ty: Math.floor((goal.y + FOOT_DY) / TS) };
}

/* direzione da tenere per avvicinarsi alla meta (vettore normalizzato), o null se si è
   arrivati. Pura: nessun DOM, nessuna collisione — quelle le sa il chiamante. */
export function stepToward(px, py, gx, gy) {
  const dx = gx - px, dy = gy - py;
  const d = Math.hypot(dx, dy);
  if (d <= ARRIVE) return null;
  return { dx: dx / d, dy: dy / d, dist: d };
}

/* SI VEDE IN LINEA RETTA? Campiona il segmento ogni LOS_STEP pixel col metro del chiamante
   (`freeAt` è la stessa domanda che fa la collisione vera). Serve a TAGLIARE: se la prossima
   curva del percorso si raggiunge dritti, non c'è ragione di passare per il centro di ogni
   casella — è quello che faceva camminare a scalini. */
function visible(ax, ay, bx, by, freeAt) {
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(d / LOS_STEP));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!freeAt(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}
/* il waypoint PIÙ AVANTI che si raggiunge dritti: si guarda dall'ultimo indietro, così si
   taglia il più possibile in un colpo solo. Costa al massimo LOOK_AHEAD controlli. */
let cutAcc = 0;
function shortcut(who, freeAt, dt) {
  if (!freeAt) return;
  /* NON a ogni fotogramma: il percorso non cambia in 16 ms, e ogni tentativo costa una
     manciata di collisioni vere. A 12 volte al secondo il taglio è già istantaneo per chi
     guarda, e il costo misurato scende da 18 a 2 collisioni per fotogramma. */
  cutAcc += dt;
  if (cutAcc < 0.08) return;
  cutAcc = 0;
  /* se si vede la META VERA, i waypoint non servono più: si va dritti. Senza questo, arrivati
     all'ultima casella si faceva un gomito per passare dal suo centro prima del punto toccato. */
  if (visible(who.x, who.y, goal.x, goal.y, freeAt)) { goal.step = goal.path.length; return; }
  const last = Math.min(goal.path.length - 1, goal.step + LOOK_AHEAD);
  for (let i = last; i > goal.step; i--) {
    const c = tileCenter(goal.path[i][0], goal.path[i][1]);
    if (visible(who.x, who.y, c.x, c.y, freeAt)) { goal.step = i; return; }
  }
}

/* Avanza verso la meta. `moveTry(nx, ny)` deve provare a spostare il giocatore e tornare
   true se ci è riuscito: così lo scivolamento lungo i muri lo decide il gioco, non questo
   modulo. `freeAt(x, y)` (facoltativa) è "questo punto è libero?": serve a tagliare gli
   angoli. Ritorna true se si è mossi. */
/* `who` è chi si muove: di serie il giocatore nel mondo aperto, ma dentro gli edifici e
   nelle grotte le coordinate sono un'altra cosa (INT, CAVE) — la logica del cammino è la
   stessa, cambia solo di chi sono le coordinate. */
export function advance(dt, spd, moveTry, who = P, freeAt = null) {
  if (!goal.on) return false;
  goal.mark += dt;
  shortcut(who, freeAt, dt);
  /* si punta alla prossima casella del percorso; dopo l'ultima c'è la meta vera */
  let tx = goal.x, ty = goal.y, isNode = false;
  if (goal.step < goal.path.length) {
    const n = goal.path[goal.step];
    const c = tileCenter(n[0], n[1]);
    tx = c.x; ty = c.y; isNode = true;
  }
  const st = stepToward(who.x, who.y, tx, ty);
  if (!st) {
    if (isNode) { goal.step++; return true; }
    clearGoal(); return false;
  }
  /* ULTIMO PASSO LIMITATO alla distanza che resta: senza, con passi da 2-3 px si superava il
     bersaglio e si tornava indietro all'infinito attorno al punto toccato */
  const step = Math.min(spd * dt, st.dist);
  const nx = who.x + st.dx * step, ny = who.y + st.dy * step;
  /* prima in diagonale; se non passa, si prova un asse per volta (scivolamento sui muri) */
  let moved = moveTry(nx, ny);
  if (!moved && Math.abs(st.dx) > 0.01) moved = moveTry(nx, who.y);
  if (!moved && Math.abs(st.dy) > 0.01) moved = moveTry(who.x, ny);
  /* SI STA AVVICINANDO DAVVERO? Non basta "si è mosso": strusciando lungo un muro ci si muove
     a ogni frame senza guadagnare un pixel verso la meta, e così non si rinunciava mai.
     Si guarda la distanza dalla META VERA, non dal waypoint. */
  const dist = Math.hypot(goal.x - who.x, goal.y - who.y);
  if (dist < goal.best - 0.5) { goal.best = dist; goal.stuck = 0; }
  else goal.stuck += dt * 1000;
  if (goal.stuck > NO_PROGRESS_MS) {
    /* una seconda possibilità: si prova il waypoint successivo (il mondo cambia — un albero
       abbattuto, una creatura di passaggio); alla seconda si lascia perdere invece di
       restare a spingere contro un muro. */
    if (!goal.redone && goal.step < goal.path.length - 1) { goal.step++; goal.redone = true; goal.stuck = 0; goal.best = Infinity; }
    else clearGoal();
  }
  if (moved) P.dir = Math.abs(st.dx) > Math.abs(st.dy) ? (st.dx < 0 ? 'left' : 'right') : (st.dy < 0 ? 'up' : 'down');
  return moved;
}

/* schermo → mondo: la camera è già agganciata alla griglia dei pixel fisici */
export function screenToWorld(clientX, clientY, rect, view, cam) {
  const sx = (clientX - rect.left) / rect.width * view.W;
  const sy = (clientY - rect.top) / rect.height * view.H;
  return { x: cam.x + sx, y: cam.y + sy };
}
/* la meta è "sensata"? Fuori dallo schermo non si tocca, ma un tocco a bordo canvas sì */
export function inReach(wx, wy) { return Math.hypot(wx - P.x, wy - P.y) < TS * 40; }
