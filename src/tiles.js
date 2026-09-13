/* TERRENO — palette stagionali/di bioma e disegno di una singola tile.
   Estratto da render.js (che era un monolite): qui non si sa nulla di entità, camera o HUD,
   si sa solo che aspetto ha il suolo. Le stagioni si fondono con una transizione graduale
   nell'ultimo 30% della stagione, così il mondo non cambia colore di scatto. */
import { vhash, smooth } from './noise.js';
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
  { roof: '#d8b26a', roof2: '#e8c98a', base: '#e0cd9a', floor: ['#e4d3a6', '#dcc899', '#ecdcb4'], road: ['#b8874a', '#aa7a40', '#c49658'], snow: false, mat: 'stone' },   // Dune: pietra chiara e sabbia — strada più scura e satura: sabbia e vialetto erano quasi lo stesso tono (contrasto)
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
/* raggio pieno del NUOVO tile 32px: prima gli accenti stavano tutti nel terzo alto-sx
   (offset pensati per un tile da 16px), lasciando il resto vuoto — fase 2, vero dettaglio:
   posizione su tutto il tile, due accenti invece di uno dove c'è spazio, forme un po' più
   grandi (leggibili alla nuova scala, non 1 pixel perso in un tile 2x più grande). */
function soilMark(tx, ty, sx, sy, kind, pal, seed) {
  const x = sx + 3 + Math.floor(vhash(tx, ty, 62 + seed) * 26);
  const y = sy + 3 + Math.floor(vhash(tx, ty, 63 + seed) * 26);
  const k = Math.floor(vhash(tx, ty, 64 + seed) * 6);
  const [dark, mid, light] = pal;
  if (kind === 'grass') {
    if (k === 0) { rect(x, y, 5, 2, dark); px(x + 2, y + 2, dark); }                     // solco d'erba rasa
    else if (k === 1) { px(x, y, dark); px(x + 3, y + 1, dark); px(x + 1, y + 3, dark); px(x + 4, y + 3, dark); } // terriccio
    else if (k === 2) { rect(x, y, 3, 3, mid); px(x + 3, y + 1, dark); px(x + 1, y - 1, light); }                 // sassolino incastonato
    else if (k === 3) { rect(x, y, 4, 1, light); px(x + 1, y - 1, light); px(x + 2, y - 2, light); }              // filo secco
    else if (k === 4) { rect(x, y, 6, 1, mid); px(x + 6, y + 1, mid); px(x - 1, y + 1, mid); }                    // radice affiorante
    else { rect(x, y, 3, 2, dark); rect(x + 2, y + 2, 3, 2, dark); }                     // zolla rasa
  } else if (kind === 'sand') {
    if (k === 0) { rect(x, y, 7, 1, dark); rect(x + 2, y + 2, 4, 1, dark); }              // ondulazione
    else if (k === 1) { rect(x, y, 5, 1, light); rect(x + 1, y + 1, 5, 1, light); rect(x + 2, y + 2, 3, 1, light); } // duna in miniatura
    else if (k === 2) { rect(x, y, 4, 1, mid); px(x + 1, y + 1, mid); px(x + 5, y, mid); }// ghiaia compatta
    else if (k === 3) { rect(x, y, 8, 1, mid); px(x - 1, y + 1, mid); }                   // scia di vento
    else if (k === 4) { rect(x, y, 3, 1, dark); rect(x + 3, y + 1, 3, 1, dark); }         // impronta
    else { rect(x, y, 3, 3, light); }                                                    // chiazza chiara
  } else if (kind === 'dirt') {
    if (k === 0) { rect(x, y, 7, 1, dark); px(x + 3, y + 1, dark); px(x + 5, y + 2, dark); } // crepa
    else if (k === 1) { rect(x, y, 3, 3, mid); px(x + 3, y + 3, dark); }                  // zolla
    else if (k === 2) { rect(x, y, 3, 1, light); px(x + 3, y + 1, light); }               // sassolini chiari
    else if (k === 3) { rect(x, y, 4, 3, dark); }                                         // buca vecchia
    else if (k === 4) { rect(x, y, 3, 1, mid); rect(x + 3, y + 1, 3, 1, mid); }           // ghiaino
    else { rect(x, y, 1, 4, dark); px(x + 1, y + 4, dark); px(x - 1, y + 2, dark); }      // radice secca
  } else if (kind === 'forest') {
    if (k === 0) { rect(x, y, 4, 1, dark); px(x + 2, y + 1, dark); }                      // aghi caduti
    else if (k === 1) { rect(x, y, 4, 1, mid); px(x + 2, y + 1, mid); }                   // ramoscello
    else if (k === 2) { rect(x, y, 3, 3, light); }                                        // chiazza di luce
    else if (k === 3) { rect(x, y, 3, 1, dark); rect(x + 1, y + 1, 3, 1, dark); }         // foglie secche
    else if (k === 4) { rect(x, y, 6, 1, dark); }                                         // radice affiorante
    else { rect(x, y, 3, 1, mid); rect(x + 3, y + 1, 3, 1, mid); }                        // muschio
  }
}
export function soilDetail(tx, ty, sx, sy, kind, pal) {
  if (vhash(tx, ty, 61) < 0.28) soilMark(tx, ty, sx, sy, kind, pal, 0);   // 1 tile su 4: rumore basso
  if (vhash(tx, ty, 71) < 0.16) soilMark(tx, ty, sx, sy, kind, pal, 10);  // secondo accento più raro: il tile è 2x più grande, ci sta
}
/* ---------- tile di terreno ---------- */
/* CHIAZZE: il tono di un terreno segue un rumore largo qualche casella, diviso in quattro
   quarti di casella. Prima ogni casella tirava a sorte il suo tono e il mondo sembrava una
   scacchiera; così le zone più chiare e più scure si allargano morbide e la griglia sparisce. */
function patches(tx, ty, sx, sy, cols, salt, scale) {
  const H = TS >> 1;
  for (let q = 0; q < 4; q++) {
    const qx = q & 1, qy = q >> 1;
    const n = smooth((tx + qx * 0.5) * scale, (ty + qy * 0.5) * scale, salt);
    rect(sx + qx * H, sy + qy * H, H, H, cols[n < 0.36 ? 2 : n < 0.64 ? 0 : 1]);
  }
}
/* ciuffo d'erba: tre fili di altezza diversa, lato in ombra e punta in luce */
function tuft(x, y, dark, light) {
  rect(x, y - 3, 1, 4, dark); rect(x + 2, y - 5, 1, 6, dark); rect(x + 4, y - 2, 1, 3, dark);
  px(x + 2, y - 5, light); px(x, y - 3, light); px(x + 3, y - 1, dark);
}
const isWaterT = t => t === WATER || t === DEEP;
const isLandT = t => t === SAND || t === GRASS || t === FOREST || t === DIRT || t === MTN;
/* BORDI fra terreni (nb = tipi dei vicini [su, destra, giù, sinistra]): riva bagnata e schiuma
   dove la terra tocca l'acqua, erba che sconfina sulla sabbia, ombra al limite del bosco.
   Senza, ogni terreno finiva di netto sul bordo della casella e il mondo era a quadretti. */
function tileEdges(t, tx, ty, sx, sy, time, nb, ZP) {
  if (!nb) return;
  const side = (i, band, col) => {
    if (i === 0) rect(sx, sy, TS, band, col); else if (i === 1) rect(sx + TS - band, sy, band, TS, col);
    else if (i === 2) rect(sx, sy + TS - band, TS, band, col); else rect(sx, sy, band, TS, col);
  };
  if (isWaterT(t)) {
    for (let i = 0; i < 4; i++) if (isLandT(nb[i])) {
      side(i, 7, 'rgba(190,235,240,.22)'); side(i, 3, 'rgba(230,250,250,.35)');
      /* schiuma che va e viene: puntini sul bordo, fase dal tempo e dalla casella */
      for (let k = 0; k < 5; k++) {
        const u = 3 + ((k * 7 + tx * 3 + ty * 5) % 26), on = Math.sin(time / 520 + k * 1.7 + tx + ty) > -0.2;
        if (!on) continue;
        if (i === 0) rect(sx + u, sy + 1, 3, 1, '#f4fbfc'); else if (i === 2) rect(sx + u, sy + TS - 2, 3, 1, '#f4fbfc');
        else if (i === 1) rect(sx + TS - 2, sy + u, 1, 3, '#f4fbfc'); else rect(sx + 1, sy + u, 1, 3, '#f4fbfc');
      }
    }
    return;
  }
  if (!isLandT(t)) return;
  for (let i = 0; i < 4; i++) if (isWaterT(nb[i])) { side(i, 4, 'rgba(40,30,20,.16)'); side(i, 1, 'rgba(30,24,16,.30)'); }   // riva bagnata
  if (t === SAND) {
    const SP = ZP || SEA_TILE;
    for (let i = 0; i < 4; i++) if (nb[i] === GRASS || nb[i] === FOREST) {
      for (let k = 0; k < TS; k += 4) {
        const d = 1 + Math.floor(vhash(tx * 4 + k, ty * 4 + i, 91) * 5);
        const c = nb[i] === FOREST ? SP.f[0] : SP.g[0];
        if (i === 0) rect(sx + k, sy, 4, d, c); else if (i === 2) rect(sx + k, sy + TS - d, 4, d, c);
        else if (i === 1) rect(sx + TS - d, sy + k, d, 4, c); else rect(sx, sy + k, d, 4, c);
      }
    }
  } else if (t === GRASS) {
    for (let i = 0; i < 4; i++) if (nb[i] === FOREST) side(i, 3, 'rgba(20,40,20,.18)');
  }
}
export function groundTile(t, tx, ty, sx, sy, time, zi, nb) {
  const ZP = ZONE_TILES[zi] || null;
  groundBase(t, tx, ty, sx, sy, time, zi, ZP);
  tileEdges(t, tx, ty, sx, sy, time, nb, ZP);
}
/* increspature sull'acqua: pochi archetti chiari per casella, che si accendono e si spengono */
function ripples(tx, ty, sx, sy, time, light) {
  for (let k = 0; k < 2; k++) {
    const x = sx + 3 + Math.floor(vhash(tx, ty, 140 + k) * 22), y = sy + 5 + Math.floor(vhash(tx, ty, 150 + k) * 20);
    const ph = Math.sin(time / 900 + vhash(tx, ty, 160 + k) * 6.28);
    if (ph < 0.1) continue;
    rect(x, y, 5, 1, light); px(x - 1, y + 1, light); px(x + 5, y + 1, light);
    if (ph > 0.8) px(x + 2, y - 1, '#ffffff');
  }
}
function groundBase(t, tx, ty, sx, sy, time, zi, ZP) {
  switch (t) {
    case DEEP: {
      if (zi === 5) { // mare gelato profondo: acqua bluastra con onde chiare (chiaramente liquido)
        patches(tx, ty, sx, sy, ['#6a9abd', '#6493b5', '#74a5c6'], 133, 0.18);
        ripples(tx, ty, sx, sy, time, '#b0d4e6'); break;
      }
      if (zi === 4) { // acque di palude profonde: verde-bluastro con riflessi (non erba)
        patches(tx, ty, sx, sy, ['#2f5148', '#2a4a41', '#355a50'], 135, 0.18);
        ripples(tx, ty, sx, sy, time, '#5f9a82'); break;
      }
      patches(tx, ty, sx, sy, ['#3a7aa2', '#357297', '#3f84ad'], 131, 0.18);
      ripples(tx, ty, sx, sy, time, '#6aa9cf'); break;
    }
    case WATER: {
      if (zi === 5) { // acqua gelida a riva: azzurra con onde + lastre di ghiaccio galleggianti
        patches(tx, ty, sx, sy, ['#8abad6', '#84b3cf', '#95c4de'], 134, 0.2);
        ripples(tx, ty, sx, sy, time, '#d2ecf6');
        if (vhash(tx, ty, 51) < 0.35) { rect(sx + 4, sy + 4, 6, 4, '#e6f2f8'); rect(sx + 4, sy + 4, 6, 1, '#ffffff'); } // lastra di ghiaccio
        break;
      }
      if (zi === 4) { // acqua di palude: torbida MA chiaramente liquida (riflessi + ninfee)
        patches(tx, ty, sx, sy, ['#3a6154', '#35594d', '#42695b'], 136, 0.2);
        ripples(tx, ty, sx, sy, time, '#7fb8a0');
        if (vhash(tx, ty, 52) < 0.18) { rect(sx + 5, sy + 6, 5, 3, '#3f9a58'); px(sx + 7, sy + 5, '#e08aa8'); } // ninfea + fiore
        break;
      }
      patches(tx, ty, sx, sy, ['#56b0d2', '#4fa7ca', '#62bddb'], 132, 0.2);
      ripples(tx, ty, sx, sy, time, '#9ad9ec'); break;
    }
    case SAND: {
      if (zi === 1) { patches(tx, ty, sx, sy, ['#e9d9a8', '#e2d09c', '#efe1b6'], 137, 0.22);
        soilDetail(tx, ty, sx, sy, 'sand', ['#cbb684', '#dccb9a', '#f6efd8']); break; } // sabbia d'ossa
      if (zi === 5) { patches(tx, ty, sx, sy, ['#d7dee3', '#cfd7dd', '#e2e8ec'], 138, 0.22); px(sx + 5, sy + 6, '#eef3f6'); px(sx + 10, sy + 10, '#b9c4cc'); break; }                                  // riva gelata
      patches(tx, ty, sx, sy, ['#e6cf96', '#dfc68b', '#ecd8a4'], 139, 0.22);
      soilDetail(tx, ty, sx, sy, 'sand', ['#c9ac72', '#d6bd82', '#f2e4bc']); break;
    }
    case GRASS: { // zona 0: stagioni · altrove: palette del bioma
      const SP = ZP || SEA_TILE;
      const v = vhash(tx, ty, 21);
      patches(tx, ty, sx, sy, SP.g, 21, 0.21);
      /* ciuffi: due o tre per casella, sparsi su tutta la casella */
      for (let k = 0; k < 3; k++) if (vhash(tx, ty, 180 + k) < 0.55) tuft(sx + 2 + Math.floor(vhash(tx, ty, 190 + k) * 25), sy + 6 + Math.floor(vhash(tx, ty, 200 + k) * 24), SP.gd, SP.gh);
      const d = vhash(tx, ty, 22);
      const gx = sx + 3 + Math.floor(vhash(tx, ty, 23) * 24), gy = sy + 3 + Math.floor(vhash(tx, ty, 24) * 24);
      if (d < 0.26) { rect(gx, gy, 2, 2, SP.gd); px(gx + 2, gy, SP.gd); px(gx, gy - 2, SP.gh); rect(gx + 3, gy - 2, 2, 2, SP.gh); } // ciuffo d'erba: due colonne, non un puntino
      else if (d < 0.33) { const fc = vhash(tx, ty, 26) < 0.5 ? '#f2dd7a' : '#f3ece0'; px(gx, gy, fc); px(gx + 1, gy, fc); px(gx, gy + 1, SP.gd); } // fiorellino
      else if (d < 0.38) { rect(gx, gy, 2, 1, '#a8ad92'); rect(gx + 2, gy + 1, 2, 1, '#8f947c'); } // sassolino
      soilDetail(tx, ty, sx, sy, 'grass', [SP.gd, '#a8ad92', SP.gh]);
      break;
    }
    case FOREST: { const SP = ZP || SEA_TILE; patches(tx, ty, sx, sy, [SP.f[0], SP.f[1], shade8(SP.f[0], 0.92)], 22, 0.21);
      const fx1 = sx + 3 + Math.floor(vhash(tx, ty, 65) * 11), fy1 = sy + 3 + Math.floor(vhash(tx, ty, 66) * 11);
      const fx2 = sx + 16 + Math.floor(vhash(tx, ty, 67) * 13), fy2 = sy + 16 + Math.floor(vhash(tx, ty, 68) * 13);
      rect(fx1, fy1, 2, 2, SP.fd); rect(fx2, fy2, 2, 2, SP.fd);
      if (vhash(tx, ty, 69) < 0.4) rect(fx2 - 2, fy2 - 2, 2, 2, SP.fh || SP.f[1]); // sprazzo di luce accanto all'ombra, non ripetuto ovunque
      soilDetail(tx, ty, sx, sy, 'forest', [SP.fd, SP.f[0], SP.fh || SP.f[1]]); break; }
    case DIRT: {
      const d0 = ZP ? ZP.dirt[0] : '#c9a06a', d1 = ZP ? ZP.dirt[1] : '#b98d59';
      patches(tx, ty, sx, sy, [d0, shade8(d0, 0.95), shade8(d0, 1.05)], 23, 0.22);
      const dx1 = sx + 3 + Math.floor(vhash(tx, ty, 70) * 12), dy1 = sy + 3 + Math.floor(vhash(tx, ty, 71) * 12);
      const dx2 = sx + 15 + Math.floor(vhash(tx, ty, 72) * 12), dy2 = sy + 12 + Math.floor(vhash(tx, ty, 73) * 12);
      const dx3 = sx + 9 + Math.floor(vhash(tx, ty, 74) * 14), dy3 = sy + 20 + Math.floor(vhash(tx, ty, 75) * 9);
      rect(dx1, dy1, 2, 2, d1); rect(dx2, dy2, 2, 2, d1); rect(dx3, dy3, 2, 2, d1);
      if (zi === 3 && vhash(tx, ty, 53) < 0.15) { const cx3 = sx + 10 + Math.floor(vhash(tx, ty, 54) * 12), cy3 = sy + 10 + Math.floor(vhash(tx, ty, 55) * 12); rect(cx3, cy3, 2, 1, '#8a3f2e'); rect(cx3 + 2, cy3, 1, 1, '#8a3f2e'); rect(cx3 + 3, cy3 + 1, 2, 1, '#8a3f2e'); } // crepe
      soilDetail(tx, ty, sx, sy, 'dirt', [shade8(d1, 0.82), d1, shade8(d0, 1.12)]);
      break;
    }
    case MTN: { rect(sx, sy, TS, TS, '#9a9285'); rect(sx, sy, TS, 3, '#aaa294');
      const mx1 = sx + 3 + Math.floor(vhash(tx, ty, 76) * 13), my1 = sy + 6 + Math.floor(vhash(tx, ty, 77) * 13);
      const mx2 = sx + 15 + Math.floor(vhash(tx, ty, 78) * 14), my2 = sy + 16 + Math.floor(vhash(tx, ty, 79) * 13);
      rect(mx1, my1, 2, 2, '#7f776a'); rect(mx2, my2, 2, 2, '#7f776a');
      if (vhash(tx, ty, 80) < 0.35) rect(mx1 + 2, my1 - 2, 2, 2, '#c9c2b2'); // scaglia di roccia che coglie la luce
      soilDetail(tx, ty, sx, sy, 'dirt', ['#7f776a', '#8f887c', '#b5ada0']); break; }
    case FLOOR: { // lastricato: toni variabili, fughe a mattoni sfalsati, crepe rare
      const v = vhash(tx, ty, 25), FB = biomeBuild(tx, ty).floor;
      rect(sx, sy, TS, TS, v < 0.5 ? FB[0] : v < 0.8 ? FB[1] : FB[2]);
      /* fughe/crepe DERIVATE dalla pietra del bioma (prima erano gialle ovunque: ardesia e
         tegola rossa avevano lo stesso giunto color sabbia) */
      const fj = shade8(FB[1], 0.86), fj2 = shade8(FB[1], 0.92);
      rect(sx, sy, TS, 1, fj); rect(sx, sy, 1, TS, fj);
      if (ty & 1) rect(sx + 16, sy, 1, TS, fj2); // giunto sfalsato a file alterne (metà del tile 32px)
      if (vhash(tx, ty, 26) < 0.08) { const cr = shade8(FB[1], 0.8), ccx = sx + 8 + Math.floor(vhash(tx, ty, 30) * 14), ccy = sy + 8 + Math.floor(vhash(tx, ty, 31) * 14); px(ccx, ccy, cr); px(ccx + 1, ccy + 1, cr); px(ccx + 2, ccy + 2, cr); }
      else if (vhash(tx, ty, 27) < 0.3) { const gx2 = sx + 4 + Math.floor(vhash(tx, ty, 28) * 22), gy2 = sy + 4 + Math.floor(vhash(tx, ty, 29) * 22); rect(gx2, gy2, 2, 2, shade8(FB[2], 1.05)); }
      break;
    }
    case ROAD: { // strada sterrata: terra battuta chiara, orme e sassolini
      const v = vhash(tx, ty, 34), RB = biomeBuild(tx, ty).road;
      rect(sx, sy, TS, TS, v < 0.45 ? RB[0] : v < 0.85 ? RB[1] : RB[2]);
      const rd = shade8(RB[1], 0.85), rl = shade8(RB[2], 1.06), rs = shade8(RB[0], 0.74);
      rect(sx + 4 + Math.floor(vhash(tx, ty, 35) * 24), sy + 4 + Math.floor(vhash(tx, ty, 36) * 24), 2, 1, rd);
      if (vhash(tx, ty, 37) < 0.3) { const rlx = sx + 3 + Math.floor(vhash(tx, ty, 38) * 26), rly = sy + 3 + Math.floor(vhash(tx, ty, 39) * 26); rect(rlx, rly, 2, 1, rl); }
      if (vhash(tx, ty, 40) < 0.12) { const sox = sx + 8 + Math.floor(vhash(tx, ty, 41) * 16), soy = sy + 8 + Math.floor(vhash(tx, ty, 42) * 16); rect(sox, soy, 2, 2, rs); px(sox, soy - 1, shade8(RB[0], 0.85)); } // sasso
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
