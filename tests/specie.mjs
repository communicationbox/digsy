/* IL FOGLIO DELLE SPECIE — tutte le creature disegnate come nel gioco, ingrandite, in un PNG.
   Serve a guardare la varietà e la resa delle 60 (+6 di grotta) senza aprire il gioco:
     node tests/specie.mjs [vista] [scala] [file]
   vista: side (di serie) · front · back · tutte · passo (le 4 pose del cammino di profilo, in fila) · passofronte (le stesse di fronte) · volo (le 4 del battito, solo le alate);
   scala: 4 di serie. Esce in .shots/specie.png */
import { installStubs } from './stub.mjs';
installStubs();
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
const st = await import('../src/state.js'); st.initState();
const r = await import('../src/render.js');
const d = await import('../src/data.js');
const vista = process.argv[2] || 'side', SC = +(process.argv[3] || 4);
const out = process.argv[4] || new URL('../.shots/specie.png', import.meta.url).pathname;
const viste = vista === 'tutte' ? ['side', 'front', 'back'] : vista === 'passo' || vista === 'passofronte' ? [0, 1, 2, 3] : vista === 'volo' ? ['f0', 'f1', 'f2', 'f3'] : [vista];
const bo = await import('../src/bones.js');
const specie = vista === 'volo' ? (d.ALL_SPECIES || d.SPECIES).filter(s => (bo.BP[s.id] || {}).wings) : (d.ALL_SPECIES || d.SPECIES);
const CELL = 72, COLS = vista === 'tutte' ? 6 : vista === 'passo' || vista === 'passofronte' || vista === 'volo' ? 8 : 10;
const n = specie.length * viste.length;
const Wp = COLS * CELL, Hp = Math.ceil(n / COLS) * CELL;
const W = Wp * SC, H = Hp * SC;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { img[i * 4] = 0x8f; img[i * 4 + 1] = 0xbf; img[i * 4 + 2] = 0x6a; img[i * 4 + 3] = 255; }
let k = 0;
for (const s of specie) for (const v of viste) {
  const cv = typeof v === 'string' && v[0] === 'f' ? r.creatureSprite({ c: { skull: s.id, torso: s.id, leg: s.id, q: 'raro' } }, 'side', { tuckLegs: true, wingFlap: +v[1] })
    : typeof v === 'number' ? r.creatureSprite({ c: { skull: s.id, torso: s.id, leg: s.id, q: 'raro' } }, vista === 'passofronte' ? 'front' : 'side', vista === 'passofronte' ? { gait: v, gaitFB: true } : { gait: v })
    : r.creatureSprite({ c: { skull: s.id, torso: s.id, leg: s.id, q: 'raro' } }, v);
  const x0 = (k % COLS) * CELL + 4, y0 = Math.floor(k / COLS) * CELL + 4; k++;
  if (!cv) continue;
  const dd = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  const oy = Math.max(0, CELL - 12 - cv.height);
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const o = (y * cv.width + x) * 4, a = dd[o + 3] / 255; if (!a) continue;
    const X = x0 + x, Y = y0 + oy + y; if (X >= Wp || Y >= Hp) continue;
    for (let j = 0; j < SC; j++) for (let i = 0; i < SC; i++) {
      const p = ((Y * SC + j) * W + X * SC + i) * 4;
      img[p] = dd[o] * a + img[p] * (1 - a); img[p + 1] = dd[o + 1] * a + img[p + 1] * (1 - a); img[p + 2] = dd[o + 2] * a + img[p + 2] * (1 - a);
    }
  }
}
/* PNG minimo: IHDR + IDAT (zlib) + IEND */
const crcT = new Int32Array(256).map((_, n2) => { let c = n2; for (let k2 = 0; k2 < 8; k2++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(t, 4); data.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(img.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
mkdirSync(new URL('../.shots', import.meta.url).pathname, { recursive: true });
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('specie:', n, 'disegni in', out, W + '×' + H);
