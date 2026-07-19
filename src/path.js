/* PERCORSO — A* su griglia di caselle, per il comando "tocca dove andare".
   Prima si andava in linea retta scivolando sui muri: contro un albero funziona, contro una
   casa o un lago no, e il giocatore restava fermo senza capire perché.

   Tre limiti di proposito, perché questo gira dentro un frame:
   - MAX_LEN caselle di lunghezza del percorso: oltre, si rifiuta invece di far attraversare
     mezzo mondo con un tocco distratto;
   - MAX_NODES caselle esaminate: è il tetto di lavoro per singola ricerca;
   - diagonali ammesse solo se ENTRAMBE le caselle laterali sono libere (niente passaggi
     attraverso gli spigoli, che a schermo sembrano attraversare il muro).

   Modulo PURO: la mappa dei muri arriva come funzione `blocked(tx, ty)`. Così è testabile
   senza mondo, e il gioco decide cosa è solido. */

/* Una casella è percorribile solo se il personaggio ci STA: è largo ~10 px, quindi provare
   il solo punto centrale non basta. Con il test al centro il percorso passava rasente al
   bancone del Curatore, poi la collisione vera lo fermava e non si usciva più dal museo.
   Qui si prova il centro e i due fianchi: quello che il percorso promette, il movimento
   lo mantiene. */
export function fits(tx, ty, TS, collide) {
  const cy = ty * TS + TS / 2 - 13;
  return !collide(tx * TS + TS / 2, cy)
    && !collide(tx * TS + TS / 2 - 4, cy)
    && !collide(tx * TS + TS / 2 + 4, cy);
}

export const MAX_LEN = 40;        // caselle: oltre questa distanza il tocco non vale
export const MAX_NODES = 900;    // tetto di lavoro: oltre, si rinuncia invece di far scattare il gioco

const KEY = (x, y) => x + ',' + y;
/* costo diagonale 1.414 come nella realtà: senza, l'A* fa scalette innaturali */
const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
];

/* distanza ottagonale: ammette le diagonali, quindi non sovrastima mai (A* resta ottimale) */
function h(ax, ay, bx, by) {
  const dx = Math.abs(ax - bx), dy = Math.abs(ay - by);
  return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
}

/* Ritorna l'elenco di caselle da attraversare (esclusa quella di partenza), oppure null.
   `null` significa: non ci si arriva, o è troppo lontano — chi chiama lo dice al giocatore. */
export function findPath(sx, sy, gx, gy, blockedFn, maxLen = MAX_LEN) {
  /* la stessa casella viene interrogata da tutti i suoi vicini: senza memoria si paga
     più volte una domanda cara (collisioni, città, decorazioni, meraviglie). Con la cache
     locale il caso peggiore misurato sul mondo vero scende da ~200 ms a pochi ms. */
  const memo = new Map();
  const blocked = (x, y) => {
    const k = KEY(x, y);
    let v = memo.get(k);
    if (v === undefined) { v = !!blockedFn(x, y); memo.set(k, v); }
    return v;
  };
  if (sx === gx && sy === gy) return [];
  if (blocked(gx, gy)) {
    /* la meta è dentro un muro (si è toccato un albero o una casa): si punta alla casella
       libera adiacente più vicina, così il tocco fa comunque qualcosa di sensato */
    const alt = nearestFree(gx, gy, blocked);
    if (!alt) return null;
    gx = alt[0]; gy = alt[1];
    if (sx === gx && sy === gy) return [];
  }
  /* scarto subito ciò che è palesemente fuori portata: niente ricerca inutile */
  if (h(sx, sy, gx, gy) > maxLen) return null;

  const open = new Heap();
  open.push({ x: sx, y: sy, g: 0, f: h(sx, sy, gx, gy) });
  const came = new Map(), gScore = new Map([[KEY(sx, sy), 0]]);
  let nodes = 0;
  while (open.size) {
    const cur = open.pop();
    if (cur.x === gx && cur.y === gy) return rebuild(came, cur, sx, sy);
    if (++nodes > MAX_NODES) return null;
    for (const [dx, dy, cost] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (blocked(nx, ny)) continue;
      /* niente tagli attraverso gli spigoli */
      if (dx && dy && (blocked(cur.x + dx, cur.y) || blocked(cur.x, cur.y + dy))) continue;
      const ng = cur.g + cost;
      if (ng > maxLen) continue;                       // percorso troppo lungo: si scarta il ramo
      const k = KEY(nx, ny);
      if (gScore.has(k) && gScore.get(k) <= ng) continue;
      gScore.set(k, ng);
      came.set(k, cur);
      open.push({ x: nx, y: ny, g: ng, f: ng + h(nx, ny, gx, gy) });
    }
  }
  return null;
}
/* CODA DI PRIORITÀ (heap binario). Con la scansione lineare la ricerca era O(n²): quando
   non esiste un percorso l'A* esplora tutti i nodi consentiti e il caso peggiore misurato
   sul mondo vero arrivava a 244 ms — quindici frame persi su un tocco. Con l'heap resta
   sotto il millisecondo. */
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(n) {
    const a = this.a; a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

function rebuild(came, node, sx, sy) {
  const out = [];
  let n = node;
  while (n && !(n.x === sx && n.y === sy)) { out.push([n.x, n.y]); n = came.get(KEY(n.x, n.y)); }
  return out.reverse();
}
/* casella libera più vicina a (x, y), cercata a cerchi crescenti */
export function nearestFree(x, y, blocked, r = 3) {
  for (let d = 1; d <= r; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      if (!blocked(x + dx, y + dy)) return [x + dx, y + dy];
    }
  }
  return null;
}
