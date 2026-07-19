/* MODELLI VOXEL delle 18 meraviglie — per il Libro delle Meraviglie (vista 3D che ruota).
   Blueprint scritti a mano uno per uno (mai forme generate a caso): ogni meraviglia deve
   riconoscersi al primo colpo d'occhio anche in miniatura. Ogni voxel è {x,y,z,col}. */

/* ---------- mattoncini ---------- */
const out = [];
function box(x0, y0, z0, w, h, d, col) {
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) out.push({ x: x0 + x, y: y0 + y, z: z0 + z, col });
}
/* colonna/pilastro verticale */
function pil(x, z, y0, h, w, col) { box(x - (w >> 1), y0, z - (w >> 1), w, h, w, col); }
/* disco pieno (per chiome, pozze, tappeti) */
function disc(cx, cy, cz, r, h, col) {
  for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
    if (x * x + z * z > r * r) continue;
    for (let y = 0; y < h; y++) out.push({ x: cx + x, y: cy + y, z: cz + z, col });
  }
}
/* arco a mezzaluna nel piano XY (la profondità è d) */
function arch(cx, y0, cz, rx, ry, thick, d, col) {
  for (let a = 0; a <= 48; a++) {
    const t = a / 48 * Math.PI;
    const x = Math.round(cx + Math.cos(t) * rx), y = Math.round(y0 + Math.sin(t) * ry);
    box(x - (thick >> 1), y, cz - (d >> 1), thick, thick, d, col);
  }
}
const C = {
  bone: '#e8e0cc', bone2: '#cbbfa4', wood: '#8a5f38', wood2: '#6e4a2a', leaf: '#4e8d3f', leaf2: '#6cb35a',
  stone: '#9a9285', stone2: '#7f776a', hay: '#d4b13c', hay2: '#c9a227', water: '#3f9ab8', water3: '#6fc0d8',
  red: '#b5623a', red2: '#c9784a', ice: '#9fe0ee', ice2: '#cdf2fa', snow: '#eafcff', ore: '#e08a2c', ore2: '#f4c060',
  moss: '#5a7a4a', mud: '#4e5a3a', shroom: '#d0453a', shroomTop: '#e2604f', pink: '#e08ab0', dark: '#2f2318',
  fur: '#6e5038', glass: '#8fd0e6', gold: '#c9a227', green: '#5fa04e', aur1: '#78dea4', aur2: '#8cb4f0', aur3: '#c88ce6',
};

/* ---------- i 18 blueprint ---------- */
const BP = {
  gianttree() {                                    // albero-mondo: tronco grosso, chioma a strati
    pil(0, 0, 0, 26, 6, C.wood2);
    for (const [ox, oz] of [[-5, 0], [5, 0], [0, -5], [0, 5]]) box(ox, 0, oz, 3, 3, 3, C.wood2);
    disc(0, 24, 0, 11, 4, C.leaf); disc(0, 28, 0, 9, 4, C.leaf2); disc(0, 32, 0, 6, 4, C.leaf);
    disc(0, 36, 0, 3, 3, C.leaf2);
  },
  menhir() {                                       // cerchio di pietre
    const R = 9;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, x = Math.round(Math.cos(a) * R), z = Math.round(Math.sin(a) * R);
      pil(x, z, 0, 12 + (i % 3) * 3, 3, i % 2 ? C.stone : C.stone2);
    }
    disc(0, 0, 0, 5, 1, C.stone2);
  },
  haygiant() {                                     // tre balle + testa + braccia
    disc(0, 0, 0, 7, 7, C.hay); disc(0, 7, 0, 5, 6, C.hay2); disc(0, 13, 0, 4, 5, C.hay);
    box(-8, 12, -1, 5, 2, 2, C.hay2); box(4, 12, -1, 5, 2, 2, C.hay2);
    box(-2, 16, -4, 2, 2, 1, '#c94f4a'); box(1, 16, -4, 2, 2, 1, '#c94f4a');
    disc(0, 18, 0, 5, 1, C.hay2);
  },
  bonearch() {                                     // due zanne incrociate: si passa sotto
    arch(0, 0, 0, 10, 20, 3, 4, C.bone);
    box(-12, 0, -2, 4, 3, 4, C.bone2); box(9, 0, -2, 4, 3, 4, C.bone2);
    box(-2, 19, -2, 5, 3, 4, C.bone);
  },
  oasis() {                                        // pozza + due palme + cranio
    disc(0, 0, 0, 8, 1, C.water); disc(0, 1, 0, 6, 1, C.water3);
    for (const [x, z, h] of [[-6, -4, 14], [5, 3, 11]]) {
      pil(x, z, 0, h, 2, C.wood);
      for (const [dx, dz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) box(x + dx, h - 1, z + dz, 3, 1, 3, C.green);
    }
    box(6, 0, -6, 5, 4, 5, C.bone); box(7, 1, -7, 1, 1, 1, C.dark); box(9, 1, -7, 1, 1, 1, C.dark);
  },
  ribcage() {                                      // spina + costole ad arco
    box(-11, 0, -1, 23, 2, 3, C.bone2);
    for (let i = 0; i < 6; i++) arch(-9 + i * 4, 2, 0, 5, 9 - Math.abs(i - 2), 2, 2, C.bone);
  },
  mushring() {                                     // anello di funghi
    const R = 8;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, x = Math.round(Math.cos(a) * R), z = Math.round(Math.sin(a) * R);
      pil(x, z, 0, 4 + (i % 2) * 2, 2, '#e8dcc0');
      disc(x, 5 + (i % 2) * 2, z, 3, 2, C.shroom); disc(x, 7 + (i % 2) * 2, z, 2, 1, C.shroomTop);
    }
    disc(0, 0, 0, 4, 1, C.moss);
  },
  hollowstump() {                                  // ceppo cavo: anello di legno
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) {
      const d2 = x * x + z * z;
      if (d2 > 36 || d2 < 16) continue;
      box(x, 0, z, 1, 11, 1, (x + z) % 2 ? C.wood : C.wood2);
    }
    disc(0, 0, 0, 6, 1, C.dark); disc(0, 10, 0, 3, 1, C.moss);
  },
  totem() {                                        // palo con quattro musi + ali
    for (let i = 0; i < 4; i++) box(-3, i * 6, -3, 7, 6, 7, ['#c94f4a', '#4e8d7c', '#d8973c', '#6f5a94'][i]);
    box(-8, 20, -1, 5, 3, 3, C.wood); box(4, 20, -1, 5, 3, 3, C.wood);
    box(-4, 24, -4, 9, 2, 9, C.wood2);
  },
  geyser() {                                       // cratere + colonna di vapore
    disc(0, 0, 0, 7, 2, C.red); disc(0, 2, 0, 4, 1, '#5c2a18');
    pil(0, 0, 3, 22, 4, '#e6f4fa'); disc(0, 24, 0, 4, 3, '#dcecf2');
  },
  redarch() {                                      // porta di roccia
    box(-11, 0, -3, 5, 18, 6, C.red); box(6, 0, -3, 5, 18, 6, C.red);
    box(-11, 18, -3, 22, 5, 6, C.red2);
  },
  orevein() {                                      // cristalli che spuntano dalla roccia
    disc(0, 0, 0, 7, 2, C.red);
    for (const [x, z, h] of [[-4, -2, 12], [0, 1, 16], [4, -1, 10], [1, -5, 8]]) {
      pil(x, z, 2, h, 3, C.ore); box(x - 1, h + 2, z - 1, 2, 2, 2, C.ore2);
    }
  },
  willow() {                                       // salice: tronco + chioma larga + rami penduli
    pil(0, 0, 0, 12, 5, '#5c4630');
    disc(0, 12, 0, 12, 5, C.moss); disc(0, 17, 0, 8, 3, '#6e8f5a');
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, x = Math.round(Math.cos(a) * 10), z = Math.round(Math.sin(a) * 10);
      box(x, 5, z, 1, 8, 1, '#4e6a3f');
    }
  },
  lilypad() {                                      // acqua nera + foglie tonde + fiore
    disc(0, 0, 0, 11, 1, '#22301f');
    for (const [x, z, r] of [[-5, -3, 4], [3, 2, 5], [6, -5, 3], [-4, 5, 3]]) disc(x, 1, z, r, 1, '#4e8d5a');
    disc(3, 2, 2, 2, 2, C.pink); box(3, 4, 2, 1, 1, 1, '#f2d24a');
  },
  bubblepool() {                                   // pozza + bolle sospese
    disc(0, 0, 0, 8, 2, C.mud); disc(0, 2, 0, 6, 1, '#5c6a44');
    for (const [x, y, z, r] of [[-3, 4, 1, 2], [2, 7, -2, 2], [0, 11, 2, 1], [4, 9, 3, 1]]) disc(x, y, z, r, r, '#9aaa6a');
  },
  icespire() {                                     // guglia + schegge
    pil(0, 0, 0, 30, 5, C.ice); pil(0, 0, 30, 4, 3, C.ice2);
    pil(-6, -2, 0, 14, 3, C.glass); pil(5, 3, 0, 18, 3, C.glass);
    disc(0, 0, 0, 8, 1, C.snow);
  },
  frozenbeast() {                                  // blocco di ghiaccio con dentro la bestia
    /* guscio di ghiaccio a scacchi: si intravede la creatura dentro */
    for (let x = -9; x <= 9; x++) for (let y = 0; y <= 15; y++) for (let z = -6; z <= 6; z++) {
      const edge = x === -9 || x === 9 || y === 0 || y === 15 || z === -6 || z === 6;
      if (edge && (x + y + z) % 2 === 0) out.push({ x, y, z, col: C.ice });
    }
    box(-6, 3, -3, 11, 6, 6, C.fur);               // corpo
    box(-9, 6, -2, 4, 4, 4, '#7a5a40');            // testa
    box(-10, 7, -1, 1, 1, 1, C.bone);              // zanna
    for (const x of [-5, -1, 3]) box(x, 0, -2, 2, 3, 2, C.fur);
    box(5, 6, -1, 5, 2, 2, '#7a5a40');             // coda
  },
  aurora() {                                       // neve + nastri di luce ondeggianti
    disc(0, 0, 0, 10, 1, C.snow);
    for (let b = 0; b < 4; b++) {
      const col = [C.aur1, C.aur2, C.aur3, C.aur1][b];
      for (let k = 0; k < 14; k++) {
        const x = Math.round(-6 + b * 4 + Math.sin(k / 3 + b) * 3);
        box(x, 4 + k * 2, Math.round(Math.cos(k / 4 + b) * 3), 2, 2, 2, col);
      }
    }
  },
};

/* voxel di una meraviglia (lista nuova a ogni chiamata: il consumatore può mutarla) */
export function wonderVoxels(type) {
  out.length = 0;
  const fn = BP[type] || BP.menhir;
  fn();
  return out.map(v => ({ ...v }));
}
export function hasWonderModel(type) { return !!BP[type]; }
