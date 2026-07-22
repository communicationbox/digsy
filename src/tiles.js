/* TERRENO — palette stagionali/di bioma e disegno di una singola tile.
   Estratto da render.js (che era un monolite): qui non si sa nulla di entità, camera o HUD,
   si sa solo che aspetto ha il suolo. Le stagioni si fondono con una transizione graduale
   nell'ultimo 30% della stagione, così il mondo non cambia colore di scatto. */
import { vhash } from './noise.js';
import { px, rect, shade8 } from './brush.js';
import { TS, ZONES } from './data.js';
import { DEEP, WATER, SAND, GRASS, FOREST, DIRT, MTN, FLOOR, PARK, ROAD } from './world.js';
import { SEASON_LEN } from './daynight.js';
import { zoneIdxAt } from './regions.js';

/* legno degli interni per bioma: [tono A, tono B, fuga] */
export const INT_WOOD = [
  ['#b98d59', '#c49a63', '#a37a4a'],   // Prati: quercia calda
  ['#d6b478', '#e0c085', '#bd9a5e'],   // Dune: legno sbiancato dal sole
  ['#8a6a48', '#956f4a', '#6e5236'],   // Boschi: legno scuro
  ['#c08052', '#cb8b5c', '#a06840'],   // Terre: legno rossastro
  ['#8e8c62', '#99976c', '#736f4c'],   // Palude: assi verdastre
  ['#a8a094', '#b3aa9e', '#8c857a'],   // Lande: legno grigio di gelo
];
/* `mat` = MATERIALE del tetto per bioma (oltre al colore): lo disegna roofMat in render.js.
   coppi (Prati) · conci di pietra (Dune) · scandole di legno (Boschi) · tegole (Terre) ·
   paglia (Palude) · ardesia (Lande, + neve). */
export const BIOME_BUILD = [
  { roof: '#9c6636', roof2: '#b5784a', base: '#c9b98f', floor: ['#d8c49a', '#d2bd90', '#dfcda6'], road: ['#cfa96e', '#c7a166', '#d7b47a'], snow: false, mat: 'coppi' },   // Prati: coppi caldi
  { roof: '#d8b26a', roof2: '#e8c98a', base: '#e0cd9a', floor: ['#e4d3a6', '#dcc899', '#ecdcb4'], road: ['#e0c48a', '#d8ba7e', '#e8d09a'], snow: false, mat: 'stone' },   // Dune: pietra chiara e sabbia
  { roof: '#4e5f4a', roof2: '#63775c', base: '#6b6a58', floor: ['#c6c0a4', '#bcb69a', '#cec8ac'], road: ['#a99a72', '#a0916a', '#b3a47c'], snow: false, mat: 'shingle' }, // Boschi: assi scure
  { roof: '#a3512e', roof2: '#c06a3a', base: '#a3663f', floor: ['#dcb894', '#d2ac88', '#e4c4a0'], road: ['#c98a58', '#bd7f4e', '#d59a68'], snow: false, mat: 'tile' },    // Terre: tegole rosse
  { roof: '#5c6b46', roof2: '#71805a', base: '#6f7a56', floor: ['#c8c69c', '#bfbd93', '#d1cfa6'], road: ['#a89e6e', '#9d9366', '#b3a97a'], snow: false, mat: 'thatch' },  // Palude: legno umido/paglia
  { roof: '#6d7f92', roof2: '#899bb0', base: '#b9c9d4', floor: ['#dfe7ea', '#d6dee2', '#e9f1f4'], road: ['#cfd8dc', '#c5ced2', '#dae3e7'], snow: true, mat: 'slate' },    // Lande: ardesia e NEVE
];
export function biomeBuild(tx, ty) { return BIOME_BUILD[zoneIdxAt(tx, ty)] || BIOME_BUILD[0]; }

/* palette stagionali: erba [3 toni]+dettagli, foresta [2 toni]+dettaglio */
const SEASON_TILES = [
  { g: ['#79bb63', '#7ec069', '#74b55e'], gd: '#5fa04e', gh: '#6cb35a', f: ['#5b9e54', '#63a659'], fd: '#4c8c47' },
  { g: ['#88c05f', '#8ec565', '#82ba59'], gd: '#6aa84e', gh: '#79b75c', f: ['#699e50', '#71a656'], fd: '#578c45' },
  { g: ['#b7a355', '#bda95d', '#af9c4f'], gd: '#96813c', gh: '#c7b36a', f: ['#8f8a48', '#97914e'], fd: '#7a7440' },
  { g: ['#dfe5ea', '#e6ecf0', '#d7dee3'], gd: '#b9c4cc', gh: '#f2f6f8', f: ['#9fb3ab', '#a7bbb2'], fd: '#8aa096' },
];
/* palette TERRENO per zona (0 prati usa le stagioni): erba[3]+dettagli, foresta[2]+dettaglio, dirt[2] */
/* ZONE_TILES è indicizzata come ZONES di data.js: l'ordine contava e non lo diceva nessuno.
   Qui si dichiara, così chi cerca per id non deve indovinare la posizione. */
export const ZONE_IDS = ZONES.map(z => z.id);
export const ZONE_TILES = [
  null, // prati → stagionale
  { g: ['#d8c48c', '#dcc994', '#d2bd82'], gd: '#b9a468', gh: '#e8dcae', f: ['#c2ae76', '#c8b47c'], fd: '#a89460', dirt: ['#d2b078', '#c2a068'] },
  { g: ['#6f7f62', '#75856a', '#69795c'], gd: '#57644c', gh: '#83937a', f: ['#4c5c48', '#525f4c'], fd: '#3d4a3a', dirt: ['#8a8272', '#7a7264'] },
  { g: ['#b98a5a', '#bf9060', '#b28454'], gd: '#9a7044', gh: '#cc9c6c', f: ['#8a6a48', '#907050'], fd: '#755838', dirt: ['#c06a48', '#a85a3c'] },
  { g: ['#5f7a52', '#657f58', '#59744c'], gd: '#4a6340', gh: '#6f8a62', f: ['#465c3e', '#4c6244'], fd: '#39492f', dirt: ['#7a7050', '#6a6044'] },
  { g: ['#dfe5ea', '#e6ecf0', '#d7dee3'], gd: '#b9c4cc', gh: '#f2f6f8', f: ['#9fb3ab', '#a7bbb2'], fd: '#8aa096', dirt: ['#b8c2c8', '#a6b2ba'] },
];
/* I TRE TONI D'ERBA DI UNA ZONA, per chi disegna anteprime fuori dal mondo (il Libro delle
   Meraviglie, la pagina /wonders). Prima quelle schede si portavano dietro una tabella di
   colori scritta a mano, che aveva smesso di combaciare con questa: nel Libro le dune erano
   #e0cd9a e nel mondo #d8c48c, i prati #7fc46a contro #79bb63. Le meraviglie si guardavano
   posate su un'erba che nel gioco non esiste.
   `season` serve solo ai Prati Dorati, che seguono le stagioni. */
export function groundPalette(zoneId, season = 0) {
  const i = ZONE_IDS.indexOf(zoneId);
  const zp = i >= 0 ? ZONE_TILES[i] : null;
  if (zp) return zp.g.slice();
  const st = SEASON_TILES[season % SEASON_TILES.length] || SEASON_TILES[0];
  return st.g.slice();
}

/* chiome degli alberi per zona (null → stagionale) */
const ZONE_TREE = [null, null,
  ['#4c5c48', '#556653', '#5e7059', '#66785f', '#7a8c70', '#39492f'],   // boschi cinerei
  ['#a5622f', '#b96f33', '#c97e3a', '#d18d45', '#e5aa62', '#7f4a22'],   // terre: secchi
  ['#3f5c40', '#46644a', '#4e6c50', '#567456', '#6a8868', '#2f4530'],   // palude: cupi
  ['#dfe8ee', '#e8eff3', '#f1f6f8', '#f8fbfc', '#ffffff', '#b9c7d0'],   // ghiacci: innevati
];

/* chiome degli alberi per stagione: [base, mid, alto, cima, luce, ombra] */
const SEASON_TREE = [
  ['#3f8a4c', '#4a9a55', '#54ab5f', '#5fb768', '#7cd07f', '#2f6b3b'],
  ['#42904e', '#4da058', '#57b162', '#63bd6c', '#83d584', '#337340'],
  ['#a5622f', '#b96f33', '#c97e3a', '#d18d45', '#e5aa62', '#7f4a22'],
  ['#dfe8ee', '#e8eff3', '#f1f6f8', '#f8fbfc', '#ffffff', '#b9c7d0'],
];
/* palette stagionali FUSE (transizione graduale nell'ultima parte della stagione) */
let SEA_TILE = SEASON_TILES[0], SEA_TREE = SEASON_TREE[0];
function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function lerpArr(A, B, t) { return A.map((c, i) => lerpHex(c, B[i], t)); }
function lerpTile(A, B, t) { return { g: lerpArr(A.g, B.g, t), gd: lerpHex(A.gd, B.gd, t), gh: lerpHex(A.gh, B.gh, t), f: lerpArr(A.f, B.f, t), fd: lerpHex(A.fd, B.fd, t) }; }
/* fase continua (giorno+tod); l'ultimo 30% della stagione sfuma nella successiva */
function seasonBlend(day, tod) {
  const sf = ((day || 1) - 1 + (tod || 0)) / SEASON_LEN;
  const cur = ((Math.floor(sf) % 4) + 4) % 4, next = (cur + 1) % 4;
  const fr = sf - Math.floor(sf), b = fr > 0.7 ? (fr - 0.7) / 0.3 : 0;
  return { cur, next, b };
}


/* STATO AMBIENTALE DEL FRAME — oscurità (0..1) e stagione corrente. Stavano dentro render.js
   come variabili locali: quando gli interni sono diventati un modulo a parte hanno smesso di
   vederle e il gioco crashava entrando in una stanza. Stanno qui perché chiunque disegni può
   averne bisogno (finestre accese, vetri, palette). */
let NIGHT = 0, SEASON_NOW = 0;
export function night() { return NIGHT; }
export function setNight(v) { NIGHT = v; }
export function season() { return SEASON_NOW; }
export function setSeason(v) { SEASON_NOW = v; }

/* palette correnti (fuse): le legge chi disegna alberi e terreno */
export function seaTile() { return SEA_TILE; }
export function seaTree() { return SEA_TREE; }
export function zoneTree(zi) { return ZONE_TREE[zi] || SEA_TREE; }
/* da chiamare una volta per frame, prima di disegnare */
export function updateSeasonPalette(day, tod) {
  const sb = seasonBlend(day || 1, tod || 0);
  SEA_TILE = sb.b > 0 ? lerpTile(SEASON_TILES[sb.cur], SEASON_TILES[sb.next], sb.b) : SEASON_TILES[sb.cur];
  SEA_TREE = sb.b > 0 ? lerpArr(SEASON_TREE[sb.cur], SEASON_TREE[sb.next], sb.b) : SEASON_TREE[sb.cur];
  return sb.cur;
}

/* DETTAGLI DEL TERRENO — texture, non oggetti.
   Regola: stanno "dentro" il suolo (stessa palette, 1-2 toni di scarto), sono piatti, non
   hanno ombra né stellina. Così arricchiscono il mondo senza far credere che si raccolgano:
   ciò che si raccoglie ha SEMPRE ombra + stellina. */
export function soilDetail(tx, ty, sx, sy, kind, pal) {
  const v = vhash(tx, ty, 61);
  if (v >= 0.28) return;                                 // 1 tile su 4: rumore basso, niente pixel sparsi ovunque
  const x = sx + 2 + Math.floor(vhash(tx, ty, 62) * 11);
  const y = sy + 2 + Math.floor(vhash(tx, ty, 63) * 11);
  const k = Math.floor(vhash(tx, ty, 64) * 6);
  const [dark, mid, light] = pal;
  if (kind === 'grass') {
    if (k === 0) { rect(x, y, 3, 1, dark); px(x + 1, y + 1, dark); }                    // solco d'erba rasa
    else if (k === 1) { px(x, y, dark); px(x + 2, y + 1, dark); px(x + 1, y + 2, dark); } // terriccio
    else if (k === 2) { rect(x, y, 2, 2, mid); px(x + 2, y + 1, dark); }                 // sassolino incastonato
    else if (k === 3) { rect(x, y, 3, 1, light); px(x + 1, y - 1, light); }              // filo secco
    else if (k === 4) { rect(x, y, 4, 1, mid); px(x + 4, y + 1, mid); }                  // radice affiorante
    else { rect(x, y, 2, 1, dark); rect(x + 1, y + 1, 2, 1, dark); }                     // zolla rasa
  } else if (kind === 'sand') {
    if (k === 0) { rect(x, y, 4, 1, dark); }                                             // ondulazione
    else if (k === 1) { rect(x, y, 3, 1, light); rect(x + 1, y + 1, 3, 1, light); }       // duna in miniatura
    else if (k === 2) { rect(x, y, 3, 1, mid); px(x + 1, y + 1, mid); }                   // ghiaia compatta
    else if (k === 3) { rect(x, y, 5, 1, mid); px(x - 1, y + 1, mid); }                   // scia di vento
    else if (k === 4) { rect(x, y, 2, 1, dark); rect(x + 2, y + 1, 2, 1, dark); }         // impronta
    else { rect(x, y, 2, 2, light); }                                                    // chiazza chiara
  } else if (kind === 'dirt') {
    if (k === 0) { rect(x, y, 5, 1, dark); px(x + 2, y + 1, dark); }                      // crepa
    else if (k === 1) { rect(x, y, 2, 2, mid); px(x + 2, y + 2, dark); }                  // zolla
    else if (k === 2) { rect(x, y, 2, 1, light); px(x + 2, y + 1, light); }               // sassolini chiari
    else if (k === 3) { rect(x, y, 3, 2, dark); }                                         // buca vecchia
    else if (k === 4) { rect(x, y, 2, 1, mid); rect(x + 2, y + 1, 2, 1, mid); }           // ghiaino
    else { rect(x, y, 1, 3, dark); px(x + 1, y + 3, dark); }                              // radice secca
  } else if (kind === 'forest') {
    if (k === 0) { rect(x, y, 3, 1, dark); px(x + 1, y + 1, dark); }                      // aghi caduti
    else if (k === 1) { rect(x, y, 3, 1, mid); px(x + 1, y + 1, mid); }                   // ramoscello
    else if (k === 2) { rect(x, y, 2, 2, light); }                                        // chiazza di luce
    else if (k === 3) { rect(x, y, 2, 1, dark); rect(x + 1, y + 1, 2, 1, dark); }          // foglie secche
    else if (k === 4) { rect(x, y, 4, 1, dark); }                                         // radice affiorante
    else { rect(x, y, 2, 1, mid); rect(x + 2, y + 1, 2, 1, mid); }                        // muschio
  }
}
/* ---------- tile di terreno ---------- */
export function groundTile(t, tx, ty, sx, sy, time, zi) {
  const ZP = ZONE_TILES[zi] || null;
  switch (t) {
    case DEEP: {
      if (zi === 5) { // mare gelato profondo: acqua bluastra con onde chiare (chiaramente liquido)
        rect(sx, sy, TS, TS, '#6f9ec0'); const wg = Math.floor(Math.sin((tx + ty) * 0.8 + time / 500) * 2);
        rect(sx, sy + 6 + wg, TS, 2, '#a6ccdf'); rect(sx, sy + 11 - wg, TS, 1, '#5686a8'); break;
      }
      if (zi === 4) { // acque di palude profonde: verde-bluastro con riflessi (non erba)
        rect(sx, sy, TS, TS, '#2f5148'); const wp = Math.floor(Math.sin((tx + ty) * 0.8 + time / 560) * 2);
        rect(sx, sy + 6 + wp, TS, 2, '#3f7a66'); px(sx + ((Math.floor(time / 300) + tx) % 14) + 1, sy + 4, '#8fd0b8'); break;
      }
      rect(sx, sy, TS, TS, '#3f7fa6'); const wd = Math.floor(Math.sin((tx + ty) * 0.8 + time / 450) * 2);
      rect(sx, sy + 6 + wd, TS, 2, '#5b9dc4'); rect(sx, sy + 11 - wd, TS, 1, '#316787'); break;
    }
    case WATER: {
      if (zi === 5) { // acqua gelida a riva: azzurra con onde + lastre di ghiaccio galleggianti
        rect(sx, sy, TS, TS, '#8fbdd8'); const wi = Math.floor(Math.sin((tx + ty) * 0.8 + time / 520) * 1);
        rect(sx, sy + 7 + wi, TS, 2, '#bfe0ef');
        if (vhash(tx, ty, 51) < 0.35) { rect(sx + 4, sy + 4, 6, 4, '#e6f2f8'); rect(sx + 4, sy + 4, 6, 1, '#ffffff'); } // lastra di ghiaccio
        break;
      }
      if (zi === 4) { // acqua di palude: torbida MA chiaramente liquida (riflessi + ninfee)
        rect(sx, sy, TS, TS, '#3a6154');
        const w2 = Math.floor(Math.sin((tx + ty) * 0.8 + time / 500) * 1);
        rect(sx, sy + 6 + w2, TS, 2, '#4f8a72'); px(sx + ((Math.floor(time / 260) + ty) % 12) + 2, sy + 4, '#9fd8c0'); // riflesso che scorre
        if (vhash(tx, ty, 52) < 0.18) { rect(sx + 5, sy + 6, 5, 3, '#3f9a58'); px(sx + 7, sy + 5, '#e08aa8'); } // ninfea + fiore
        break;
      }
      rect(sx, sy, TS, TS, '#5cb6d6'); const w = Math.floor(Math.sin((tx + ty) * 0.8 + time / 400) * 2); rect(sx, sy + 6 + w, TS, 2, '#83cfe6'); rect(sx, sy + 11 - w, TS, 1, '#49a4c6'); break;
    }
    case SAND: {
      if (zi === 1) { rect(sx, sy, TS, TS, '#e9d9a8'); px(sx + 4, sy + 5, '#f4ecd4'); px(sx + 11, sy + 9, '#d6c48e'); px(sx + 7, sy + 12, '#f4ecd4');
        soilDetail(tx, ty, sx, sy, 'sand', ['#cbb684', '#dccb9a', '#f6efd8']); break; } // sabbia d'ossa
      if (zi === 5) { rect(sx, sy, TS, TS, '#d7dee3'); px(sx + 5, sy + 6, '#eef3f6'); px(sx + 10, sy + 10, '#b9c4cc'); break; }                                  // riva gelata
      rect(sx, sy, TS, TS, '#e6cf96'); px(sx + 4, sy + 5, '#d6bd82'); px(sx + 11, sy + 9, '#d6bd82'); px(sx + 7, sy + 12, '#d6bd82');
      soilDetail(tx, ty, sx, sy, 'sand', ['#c9ac72', '#d6bd82', '#f2e4bc']); break;
    }
    case GRASS: { // zona 0: stagioni · altrove: palette del bioma
      const SP = ZP || SEA_TILE;
      const v = vhash(tx, ty, 21);
      rect(sx, sy, TS, TS, v < 0.4 ? SP.g[0] : v < 0.8 ? SP.g[1] : SP.g[2]);
      const d = vhash(tx, ty, 22);
      const gx = sx + 3 + Math.floor(vhash(tx, ty, 23) * 9), gy = sy + 3 + Math.floor(vhash(tx, ty, 24) * 9);
      if (d < 0.26) { px(gx, gy, SP.gd); px(gx + 1, gy, SP.gd); px(gx, gy - 1, SP.gh); px(gx + 2, gy - 1, SP.gh); }
      else if (d < 0.33) { px(gx, gy, vhash(tx, ty, 26) < 0.5 ? '#f2dd7a' : '#f3ece0'); px(gx, gy + 1, SP.gd); }
      else if (d < 0.38) { px(gx, gy, '#a8ad92'); px(gx + 1, gy, '#8f947c'); }
      soilDetail(tx, ty, sx, sy, 'grass', [SP.gd, '#a8ad92', SP.gh]);
      break;
    }
    case FOREST: { const SP = ZP || SEA_TILE; rect(sx, sy, TS, TS, ((tx + ty) & 1) ? SP.f[0] : SP.f[1]); px(sx + 5, sy + 6, SP.fd); px(sx + 10, sy + 11, SP.fd);
      soilDetail(tx, ty, sx, sy, 'forest', [SP.fd, SP.f[0], SP.fh || SP.f[1]]); break; }
    case DIRT: {
      const d0 = ZP ? ZP.dirt[0] : '#c9a06a', d1 = ZP ? ZP.dirt[1] : '#b98d59';
      rect(sx, sy, TS, TS, d0); px(sx + 4, sy + 4, d1); px(sx + 10, sy + 8, d1); px(sx + 7, sy + 12, d1);
      if (zi === 3 && vhash(tx, ty, 53) < 0.15) { px(sx + 6, sy + 6, '#8a3f2e'); px(sx + 7, sy + 6, '#8a3f2e'); px(sx + 8, sy + 7, '#8a3f2e'); } // crepe
      soilDetail(tx, ty, sx, sy, 'dirt', [shade8(d1, 0.82), d1, shade8(d0, 1.12)]);
      break;
    }
    case MTN: { rect(sx, sy, TS, TS, '#9a9285'); rect(sx, sy, TS, 3, '#aaa294'); px(sx + 5, sy + 8, '#7f776a'); px(sx + 11, sy + 11, '#7f776a');
      soilDetail(tx, ty, sx, sy, 'dirt', ['#7f776a', '#8f887c', '#b5ada0']); break; }
    case FLOOR: { // lastricato: toni variabili, fughe a mattoni sfalsati, crepe rare
      const v = vhash(tx, ty, 25), FB = biomeBuild(tx, ty).floor;
      rect(sx, sy, TS, TS, v < 0.5 ? FB[0] : v < 0.8 ? FB[1] : FB[2]);
      /* fughe/crepe DERIVATE dalla pietra del bioma (prima erano gialle ovunque: ardesia e
         tegola rossa avevano lo stesso giunto color sabbia) */
      const fj = shade8(FB[1], 0.86), fj2 = shade8(FB[1], 0.92);
      rect(sx, sy, TS, 1, fj); rect(sx, sy, 1, TS, fj);
      if (ty & 1) rect(sx + 8, sy, 1, TS, fj2); // giunto sfalsato a file alterne
      if (vhash(tx, ty, 26) < 0.08) { const cr = shade8(FB[1], 0.8); px(sx + 5, sy + 6, cr); px(sx + 6, sy + 7, cr); px(sx + 7, sy + 8, cr); }
      else if (vhash(tx, ty, 27) < 0.3) px(sx + 3 + Math.floor(vhash(tx, ty, 28) * 10), sy + 4 + Math.floor(vhash(tx, ty, 29) * 9), shade8(FB[2], 1.05));
      break;
    }
    case ROAD: { // strada sterrata: terra battuta chiara, orme e sassolini
      const v = vhash(tx, ty, 34), RB = biomeBuild(tx, ty).road;
      rect(sx, sy, TS, TS, v < 0.45 ? RB[0] : v < 0.85 ? RB[1] : RB[2]);
      const rd = shade8(RB[1], 0.85), rl = shade8(RB[2], 1.06), rs = shade8(RB[0], 0.74);
      px(sx + 3 + Math.floor(vhash(tx, ty, 35) * 10), sy + 3 + Math.floor(vhash(tx, ty, 36) * 10), rd);
      if (vhash(tx, ty, 37) < 0.3) px(sx + 2 + Math.floor(vhash(tx, ty, 38) * 12), sy + 2 + Math.floor(vhash(tx, ty, 39) * 12), rl);
      if (vhash(tx, ty, 40) < 0.12) { px(sx + 6, sy + 9, rs); px(sx + 7, sy + 9, rs); px(sx + 6, sy + 8, shade8(RB[0], 0.85)); } // sasso
      break;
    }
    case PARK: { // prato curato a STRISCE falciate orizzontali (continue tra i tile: niente scacchiera dura)
      const band = ty & 1;
      rect(sx, sy, TS, TS, band ? '#87c56d' : '#92d078');
      rect(sx, sy + TS - 1, TS, 1, band ? '#7cba62' : '#87c56d');   // riga di falciatura fra le bande
      const d = vhash(tx, ty, 31);
      const gx = sx + 2 + Math.floor(vhash(tx, ty, 32) * 11), gy = sy + 3 + Math.floor(vhash(tx, ty, 33) * 10);
      if (d < 0.13) {                                                // ciuffo d'erba
        px(gx, gy, '#6faf58'); px(gx + 1, gy, '#6faf58'); px(gx, gy - 1, '#a9e28f'); px(gx + 2, gy - 1, '#a9e28f');
      } else if (d < 0.21) {                                         // margherita
        px(gx, gy - 1, '#f6f2e4'); px(gx - 1, gy, '#f6f2e4'); px(gx + 1, gy, '#f6f2e4'); px(gx, gy + 1, '#f6f2e4'); px(gx, gy, '#f2dd7a');
      } else if (d < 0.28) {                                         // fiorellino colorato
        const cols = ['#e08a8a', '#b79be6', '#8fc9e6'][Math.floor(vhash(tx, ty, 34) * 3)];
        px(gx, gy - 1, cols); px(gx - 1, gy, cols); px(gx + 1, gy, cols); px(gx, gy, '#f2dd7a');
      } else if (d < 0.31) {                                         // trifoglio
        px(gx, gy, '#5fa04e'); px(gx + 1, gy - 1, '#5fa04e'); px(gx - 1, gy - 1, '#5fa04e'); px(gx, gy - 1, '#6faf58');
      }
      break;
    }
  }
}

/* ---------- decorazioni ---------- */
/* solo ~1 albero su 3 ondeggia (vhash sul tile): movimento senza appesantire */
