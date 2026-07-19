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
import { TS } from './data.js';

export const goal = { on: false, x: 0, y: 0, t: 0, stuck: 0, path: [], step: 0 };
const ARRIVE = 5;          // px: sotto questa distanza si è arrivati
const NODE_NEAR = 3;       // px: si considera raggiunta la casella intermedia
const STUCK_MS = 700;      // fermo per più di così con la meta attiva → si rinuncia

/* centro camminabile di una casella: il giocatore sta con i PIEDI nella casella, quindi
   il punto da raggiungere non è il centro geometrico ma qualche pixel più su */
export function tileCenter(tx, ty) { return { x: tx * TS + TS / 2, y: ty * TS + TS / 2 - 13 }; }

/* Imposta la meta. Con un percorso (elenco di caselle) Digsy AGGIRA gli ostacoli; senza,
   ci va in linea retta come prima (è il caso degli spazi aperti, dove il percorso non serve). */
export function setGoal(wx, wy, path) {
  goal.on = true; goal.x = wx; goal.y = wy; goal.t = 0; goal.stuck = 0;
  goal.path = Array.isArray(path) ? path.slice() : [];
  goal.step = 0;
  /* la meta finale coincide col centro dell'ultima casella: così ci si ferma dove si è toccato */
  if (goal.path.length) {
    const last = goal.path[goal.path.length - 1];
    const c = tileCenter(last[0], last[1]);
    goal.x = c.x; goal.y = c.y;
  }
}
export function clearGoal() { goal.on = false; goal.stuck = 0; goal.path = []; goal.step = 0; }
export function hasGoal() { return goal.on; }
export function pathLeft() { return Math.max(0, goal.path.length - goal.step); }
/* la meta è QUESTA casella? Serve per entrare da porte e grotte: col "tocca dove andare"
   ci si arriva da qualsiasi lato, quindi la regola "solo camminando verso l'alto" non vale
   più — ma senza una regola si entrerebbe per sbaglio solo passandoci davanti. Qui il
   criterio è l'INTENZIONE: si entra se la porta è proprio dove si è toccato. */
export function goalIsTile(tx, ty) {
  if (!goal.on) return false;
  const gx = Math.floor(goal.x / TS), gy = Math.floor((goal.y + 13) / TS);
  return Math.abs(gx - tx) <= 1 && Math.abs(gy - ty) <= 1;
}
/* la casella su cui il giocatore ha messo il dito (piedi compresi) */
export function goalTile() {
  return { tx: Math.floor(goal.x / TS), ty: Math.floor((goal.y + 13) / TS) };
}

/* direzione da tenere per avvicinarsi alla meta (vettore normalizzato), o null se si è
   arrivati. Pura: nessun DOM, nessuna collisione — quelle le sa il chiamante. */
export function stepToward(px, py, gx, gy) {
  const dx = gx - px, dy = gy - py;
  const d = Math.hypot(dx, dy);
  if (d <= ARRIVE) return null;
  return { dx: dx / d, dy: dy / d, dist: d };
}

/* Avanza verso la meta. `moveTry(nx, ny)` deve provare a spostare il giocatore e tornare
   true se ci è riuscito: così lo scivolamento lungo i muri lo decide il gioco, non questo
   modulo. Ritorna true se si è mossi. */
/* `who` è chi si muove: di serie il giocatore nel mondo aperto, ma dentro gli edifici e
   nelle grotte le coordinate sono un'altra cosa (INT, CAVE) — la logica del cammino è la
   stessa, cambia solo di chi sono le coordinate. */
export function advance(dt, spd, moveTry, who = P) {
  if (!goal.on) return false;
  /* si punta alla prossima casella del percorso; l'ultima è la meta vera */
  let tx = goal.x, ty = goal.y, isNode = false;
  if (goal.step < goal.path.length) {
    const n = goal.path[goal.step];
    const c = tileCenter(n[0], n[1]);
    tx = c.x; ty = c.y; isNode = goal.step < goal.path.length - 1;
  }
  if (isNode && Math.hypot(tx - who.x, ty - who.y) <= NODE_NEAR) { goal.step++; return true; }
  const st = stepToward(who.x, who.y, tx, ty);
  if (!st) {
    if (goal.step < goal.path.length - 1) { goal.step++; return true; }
    clearGoal(); return false;
  }
  const step = spd * dt;
  const nx = who.x + st.dx * step, ny = who.y + st.dy * step;
  /* prima in diagonale; se non passa, si prova un asse per volta (scivolamento sui muri) */
  let moved = moveTry(nx, ny);
  if (!moved && Math.abs(st.dx) > 0.01) moved = moveTry(nx, who.y);
  if (!moved && Math.abs(st.dy) > 0.01) moved = moveTry(who.x, ny);
  if (moved) {
    goal.stuck = 0;
    P.dir = Math.abs(st.dx) > Math.abs(st.dy) ? (st.dx < 0 ? 'left' : 'right') : (st.dy < 0 ? 'up' : 'down');
  } else {
    goal.stuck += dt * 1000;
    /* bloccati su una casella intermedia: si prova la successiva prima di arrendersi
       (il mondo cambia: un albero abbattuto, una creatura di passaggio) */
    if (goal.stuck > STUCK_MS / 2 && goal.step < goal.path.length - 1) { goal.step++; goal.stuck = 0; }
    else if (goal.stuck > STUCK_MS) clearGoal();
  }
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
