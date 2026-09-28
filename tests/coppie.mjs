/* LE COPPIE PIÙ SIMILI, affiancate e ingrandite: node tests/coppie.mjs [quante] → .shots/coppie.png */
import { installStubs } from './stub.mjs';
installStubs();
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
const st = await import('../src/state.js'); st.initState();
const r = await import('../src/render.js');
const d = await import('../src/data.js');
const { firma, somiglianza } = await import('../src/somiglia.js');
const N = +(process.argv[2] || 12), SC = 4, CW = 80, CH = 60;
const sp = d.ALL_SPECIES, cvs = sp.map(s => r.creatureSprite({ c: { skull: s.id, torso: s.id, leg: s.id, q: 'raro' } }, 'side'));
const F = cvs.map(firma), coppie = [];
for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) coppie.push([somiglianza(F[i], F[j]), i, j]);
coppie.sort((a, b) => b[0] - a[0]);
const W = CW * 2 * SC, H = CH * N * SC, img = new Uint8Array(W * H * 4).fill(0);
for (let i = 0; i < W * H; i++) { img[i * 4] = 0x8f; img[i * 4 + 1] = 0xbf; img[i * 4 + 2] = 0x6a; img[i * 4 + 3] = 255; }
coppie.slice(0, N).forEach(([v, i, j], row) => [i, j].forEach((k, col) => {
  const cv = cvs[k], dd = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const o = (y * cv.width + x) * 4; if (dd[o + 3] < 128) continue;
    const X = col * CW + 4 + x, Y = row * CH + 4 + y; if (X >= (col + 1) * CW || Y >= (row + 1) * CH) continue;
    for (let b = 0; b < SC; b++) for (let a = 0; a < SC; a++) { const p = ((Y * SC + b) * W + X * SC + a) * 4; img[p] = dd[o]; img[p + 1] = dd[o + 1]; img[p + 2] = dd[o + 2]; }
  }
}));
console.log(coppie.slice(0, N).map(c => c[0].toFixed(3) + ' ' + sp[c[1]].id + ' ~ ' + sp[c[2]].id).join('\n'));
const crcT = new Int32Array(256).map((_, n2) => { let c = n2; for (let k2 = 0; k2 < 8; k2++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(t, 4); data.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + data.length)), 8 + data.length); return b; };
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(img.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
writeFileSync(new URL('../.shots/coppie.png', import.meta.url).pathname, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
