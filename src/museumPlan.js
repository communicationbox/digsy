/* LA PIANTA DEL MUSEO — modulo PURO (niente canvas, niente stato di gioco).
 *
 * Il museo era un unico stanzone 60×62 con delle macchie di parquet a fare da "sale": senza
 * un muro vero non sembrava un museo, sembrava un capannone con dei pannelli, e il pezzo
 * grosso finiva per forza buttato in mezzo al passaggio. Qui c'è invece la pianta di un museo
 * vero, scritta una volta sola e usata sia dal disegno sia dalle collisioni:
 *
 *      ┌──────────── SALA GROTTE (tutta larga, in fondo) ────────────┐
 *      │   sala        │      CORRIDOIO       │        sala          │
 *      │   sala        │       (spina)        │        sala          │
 *      │   sala        │                      │        sala          │
 *      ├───────────────┴───── ROTONDA ────────┴─────────────────────┤
 *      │              (lo scheletro montato, al centro)              │
 *      ├─────────────────────── ATRIO ──────────────────────────────┤
 *      │   bancone del Curatore a SINISTRA, la porta in mezzo        │
 *      └─────────────────────────────────────────────────────────────┘
 *
 * Ogni sala ha i suoi muri e una PORTA ad arco che dà sul corridoio: si entra in una sala per
 * volta, come in un museo, invece di vedere tutto insieme da qualunque punto.
 */

/* LA SCALA È IL VINCOLO: a schermo si vedono circa 11 caselle per 8. Una sala larga 26 era
   lunga tre schermate — da dentro non se ne vedeva mai un muro, ed è per questo che il museo
   risultava "uno stanzone disperso". Qui ogni ambiente sta in una schermata o poco più: si
   entra in una sala e la si VEDE tutta, coi suoi muri. */
export const GAL_W = 41, GAL_H = 63;                  // caselle dell'intero edificio
export const ROOM_W = 16, ROOM_H = 9;                 // interno di una sala di bioma

/* --- le righe/colonne che portano i muri --- */
export const SPINE_X0 = 17, SPINE_X1 = 23;            // muri del corridoio centrale (5 di luce)
export const ROW_Y = [10, 20, 30];                    // muri fra le tre file di sale
export const CAVE_Y0 = 0, CAVE_Y1 = 10;               // ala GROTTE: tutta la larghezza, in cima
export const ROT = { x0: 8, x1: 32, y0: 40, y1: 53 }; // rotonda dello scheletro
export const ATRIO = { y0: 53, y1: 62, x0: 11, x1: 29 };// atrio d'ingresso

/* Le sale di bioma: tre file, due per fila (sinistra/destra del corridoio). L'indice segue
   MUSEUM_ZONES, e la fila 0 è quella più vicina all'ingresso — si sale man mano. */
export function roomOrigin(zi) {
  if (zi >= 6) return { rx: 1, ry: CAVE_Y0 + 1 };                       // ala GROTTE
  const row = Math.floor(zi / 2);                                       // 0 = vicina all'atrio
  return { rx: (zi % 2) ? SPINE_X1 + 1 : 1, ry: ROW_Y[2 - row] + 1 };
}
/* Misura vera di una sala (l'ala grotte è larga quanto il museo) */
export function roomBox(zi) {
  const { rx, ry } = roomOrigin(zi);
  return zi >= 6 ? { rx, ry, rw: GAL_W - 2, rh: CAVE_Y1 - CAVE_Y0 - 1 } : { rx, ry, rw: ROOM_W, rh: ROOM_H };
}
/* La porta di una sala: sulle sale di bioma è nel muro del corridoio (verticale), sull'ala
   grotte è nel muro basso (orizzontale). `n` = quante caselle è larga. */
export function roomDoor(zi) {
  const b = roomBox(zi);
  const cx = Math.floor(GAL_W / 2);
  if (zi >= 6) return { vert: false, x: cx - 1, y: CAVE_Y1, n: 3 };
  return { vert: true, x: (zi % 2) ? SPINE_X1 : SPINE_X0, y: b.ry + 3, n: 3 };
}

/* --- IL MURO: una casella è muro sì o no. Una sola funzione, usata da disegno e collisioni,
   così non possono divergere (il muro disegnato e il muro che ferma devono essere lo stesso). */
let grid = null;
function build() {
  const g = new Uint8Array(GAL_W * GAL_H);
  const set = (x, y, v = 1) => { if (x >= 0 && x < GAL_W && y >= 0 && y < GAL_H) g[y * GAL_W + x] = v; };
  for (let x = 0; x < GAL_W; x++) { set(x, 0); set(x, GAL_H - 1); }      // perimetro
  for (let y = 0; y < GAL_H; y++) { set(0, y); set(GAL_W - 1, y); }
  /* i muri fra le file di sale si fermano al corridoio: la spina deve restare passante da
     un capo all'altro del museo */
  for (const y of ROW_Y) for (let x = 0; x < GAL_W; x++) if (x <= SPINE_X0 || x >= SPINE_X1) set(x, y);
  for (let x = 0; x < GAL_W; x++) { set(x, CAVE_Y1); set(x, ROT.y0); set(x, ROT.y1); }
  for (let y = CAVE_Y1; y <= ROT.y0; y++) { set(SPINE_X0, y); set(SPINE_X1, y); }   // corridoio
  /* ROTONDA e ATRIO: muri propri, e blocchi pieni ai lati (il museo non è un rettangolo vuoto) */
  for (const A of [ROT, ATRIO]) {
    for (let y = A.y0; y <= A.y1; y++) { set(A.x0, y); set(A.x1, y); }
    for (let y = A.y0 + 1; y < A.y1; y++) for (let x = 1; x < A.x0; x++) { set(x, y); set(GAL_W - 1 - x, y); }
  }
  /* --- i VARCHI, scavati dopo: un arco è l'assenza di muro --- */
  const gap = (x0, y0, n, vert) => { for (let i = 0; i < n; i++) vert ? set(x0, y0 + i, 0) : set(x0 + i, y0, 0); };
  const cx = Math.floor(GAL_W / 2);
  gap(cx - 1, ATRIO.y1, 3, false);                                      // porta d'ingresso
  gap(cx - 2, ROT.y1, 5, false);                                        // atrio → rotonda
  gap(cx - 2, ROT.y0, 5, false);                                        // rotonda → corridoio
  for (let zi = 0; zi < 7; zi++) { const d = roomDoor(zi); gap(d.x, d.y, d.n, d.vert); }
  return g;
}
export function isWall(tx, ty) {
  if (!grid) grid = build();
  if (tx < 0 || ty < 0 || tx >= GAL_W || ty >= GAL_H) return true;
  return grid[ty * GAL_W + tx] === 1;
}
/* In che ambiente sta una casella: serve al pavimento (ogni sala il suo) e alle luci. */
export function areaAt(tx, ty) {
  if (isWall(tx, ty)) return 'muro';
  if (ty > ROT.y1) return 'atrio';
  if (ty > ROT.y0) return 'rotonda';
  if (ty < CAVE_Y1) return 'grotte';
  if (tx > SPINE_X0 && tx < SPINE_X1) return 'corridoio';
  for (let zi = 0; zi < 6; zi++) { const b = roomBox(zi); if (tx >= b.rx && tx < b.rx + b.rw && ty >= b.ry && ty < b.ry + b.rh) return 'sala' + zi; }
  return 'corridoio';
}
/* I PIEDISTALLI di una sala: due file addossate ai muri lungo/corto, mai in mezzo al
   passaggio — in un museo si cammina in mezzo e si guarda ai lati. */
export function roomPedTiles(zi, n) {
  const b = roomBox(zi), out = [];
  if (zi >= 6) { for (let i = 0; i < n; i++) out.push([b.rx + 4 + i * 6, b.ry + 2]); return out; }
  const per = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const fila = i < per ? 0 : 1, k = i - fila * per;
    out.push([b.rx + 1 + k * 3, b.ry + (fila ? b.rh - 2 : 1)]);
  }
  return out;
}
