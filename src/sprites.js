/* Sprite dell'eroe a layer: corpo (testa nuda) + capelli + cappello; palette pilotata da S.look */
import { ctx } from './screen.js';
import { S } from './state.js';
import { buildHat, hatCrown, HAT_IDS } from './hatArt.js';
import { buildHair, HAIR_IDS } from './hairArt.js';
import { accLayer } from './npcArt.js';
import { buildBody, buildPoses, outlineRows, SLEEVE } from './bodyArt.js';

/* H/S/P/F (+ombre h/s/p/f) e A/a (capelli) vengono aggiornati da applyLook() */
export const PAL = {
  '.': null, 'K': '#33291f', 'F': '#f3cfa0', 'f': '#d7a377', 'H': '#d06b43', 'h': '#a04a2c',
  'S': '#57a58f', 's': '#3d7a68', 'P': '#c88a44', 'p': '#96622e', 'W': '#f2ead8', 'E': '#33291f',
  'B': '#8a5f38', 'b': '#6e4a2a', 'A': '#6e4a2a', 'a': '#523620',
  /* terzo tono: LUCE (non solo base+ombra). N pelle · T maglia · U pantaloni · L cappello · M capelli —
     shading vero a 3 bande invece del blocco piatto di prima (vedi CLAUDE.md, feedback sull'HD fasullo) */
  'N': '#f9dfb8', 'T': '#6ebba3', 'U': '#d9a05c', 'L': '#e0865c', 'M': '#8a6248',
  /* ORO fisso per i CAPPELLI-TROFEO (non seguono il colore scelto): G oro · g ombra · Y luce ·
     R gemma rossa · D ciano platino · Q verde alloro */
  'G': '#e8b93c', 'g': '#a8842a', 'Y': '#f8dd82', 'R': '#c65a54', 'D': '#8fe7dd', 'Q': '#5fa04e',
  /* contorni e ombre dei cappelli nativi: J contorno del colore scelto (applyLook), j contorno
     dell'oro, V/v ombra e contorno del bianco, q/r/d ombre di alloro, gemma e vetro */
  /* CONTORNI del corpo, uno per materiale (bodyArt.BORDO): x pelle · y maglia · z pantaloni.
     Con un contorno nero solo per tutto, il viso sembrava cerchiato a pennarello. */
  'x': '#a86a44', 'y': '#2f5a4c', 'z': '#6b4a24', 'w': '#33230f',   // w = contorno del cuoio (scarpe, zaino): di RETRO è quasi tutto zaino
  'J': '#4a2416', 'I': '#3a2616', 'X': '#2e2219', 'c': '#e89a8a', 'j': '#6b4a14', 'V': '#cdc3b0', 'v': '#6e665a', 'q': '#3e7234', 'r': '#8c3a35', 'd': '#4a9c96',
};
/* schiarisce/scurisce un hex, CLAMPATO (k>1 senza clamp sfora il byte e il colore vira, es.
   arancio→verde: bug reale trovato e corretto qui, non solo nell'esperimento HD abbandonato) */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const cl = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl(((n >> 16) & 255) * k), g = cl(((n >> 8) & 255) * k), b = cl((n & 255) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function mix(a, b, k) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = sh => Math.round(((A >> sh) & 255) * (1 - k) + ((B >> sh) & 255) * k);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
export function applyLook() {
  const L = S.look;
  PAL.H = L.hat; PAL.h = shade(L.hat, 0.65); PAL.L = shade(L.hat, 1.45); PAL.J = shade(L.hat, 0.28);   // contorno del cappello: di RETRO il corpo è già scuro (zaino, capelli) e a 0.38 la linea non staccava più — Digsy perdeva il profilo sopra la testa
  PAL.S = L.shirt; PAL.s = shade(L.shirt, 0.65); PAL.T = shade(L.shirt, 1.42);
  PAL.P = L.pants; PAL.p = shade(L.pants, 0.68); PAL.U = shade(L.pants, 1.4);
  PAL.F = L.skin; PAL.f = shade(L.skin, 0.78); PAL.N = shade(L.skin, 1.18); PAL.c = mix(L.skin, '#e0605a', 0.38);
  /* i contorni seguono il materiale: scuri quanto basta a tenere la sagoma, mai nero */
  PAL.x = shade(L.skin, 0.40); PAL.y = shade(L.shirt, 0.32); PAL.z = shade(L.pants, 0.30);
  PAL.A = L.hairColor; PAL.a = shade(L.hairColor, 0.68); PAL.M = shade(L.hairColor, 1.48); PAL.I = shade(L.hairColor, 0.3);
  PAL.E = L.eyeColor || '#33291f';
}

/* ---------- corpo a testa nuda (il cappello è un overlay) ---------- */
/* corpo disegnato in nativo da bodyArt.js (testa 0-17, busto 18-25, gambe 26-31, due passi) */
export const SPR = buildBody();
/* pose con le braccia che tengono qualcosa (attrezzi, manubrio): drawHero(…, pose) */
export const POSES = buildPoses();
/* le MAGLIE sono disegnate col corpo (maniche, colletto, cappuccio cambiano la sagoma): un corpo per
   forma, e `styleLook` riconosce le righe di base e le scambia con quelle della maglia scelta */
const BASE_ROWS = new Map();
const BY_SHIRT = {};
for (const sh of Object.keys(SLEEVE)) {
  const b = sh === 'tshirt' ? { spr: SPR, poses: POSES } : { spr: buildBody(sh), poses: buildPoses(sh) };
  BY_SHIRT[sh] = b;
}
for (const v of ['down', 'up', 'side']) for (const fr of [0, 1]) {
  BASE_ROWS.set(SPR[v][fr], sh => BY_SHIRT[sh].spr[v][fr]);
  for (const p of Object.keys(POSES)) BASE_ROWS.set(POSES[p][v][fr], sh => BY_SHIRT[sh].poses[p][v][fr]);
}

/* ---------- cappelli: disegnati in nativo da hatArt.js (forme, luce, un solo contorno) ---------- */
export const HATS = Object.fromEntries(HAT_IDS.map(id => [id, buildHat(id)]));
/* ultima riga di "corona" per forma: col cappello indossato i capelli NON si disegnano
   su queste righe (niente compenetrazioni); sotto restano frangia/lati/lunghezze */
export const HAT_CROWN = Object.fromEntries(HAT_IDS.map(id => [id, hatCrown(id, HATS[id])]));

/* ---------- capelli: disegnati in nativo da hairArt.js (massa, attaccatura, ciocche) ---------- */
export const HAIRS = Object.fromEntries(HAIR_IDS.map(id => [id, buildHair(id)]));

/* ---------- blit ---------- */
/* larghezza NON più fissa a 16: dal raddoppio geometrico il corpo è 32 colonne, ma
   blit/blitPairs restano generiche (usate anche da anteprime più piccole nello Sprite
   Studio) — la larghezza si legge dalla riga stessa, non si assume mai un numero fisso. */
export function blit(rows, px, py, flip, tctx) {
  const c = tctx || ctx;
  for (let y = 0; y < rows.length; y++) {
    const r = rows[y]; const w = r.length;
    for (let x = 0; x < w; x++) {
      const col = PAL[r[x]]; if (!col) continue;
      c.fillStyle = col; c.fillRect(px + (flip ? w - 1 - x : x), py + y, 1, 1);
    }
  }
}
export function blitPairs(pairs, px, py, flip, tctx) {
  const c = tctx || ctx;
  for (const [y, r] of pairs) {
    const w = r.length;
    for (let x = 0; x < w; x++) {
      const col = PAL[r[x]]; if (!col) continue;
      c.fillStyle = col; c.fillRect(px + (flip ? w - 1 - x : x), py + y, 1, 1);
    }
  }
}
/* FORME di maglia/pantaloni: trasformano le righe del CORPO (torso = righe con S, gambe = righe con
   P). Dinamico → si adatta a ogni vista e frame senza griglie separate. Lettere: S/s maglia,
   P/p pantaloni, F pelle, K scuro, W chiaro. */
function setAt(r, i, ch) { return i < 0 || i >= r.length ? r : r.slice(0, i) + ch + r.slice(i + 1); }
export function styleLook(rows, shirtStyle, pantsStyle) {
  const swap = BY_SHIRT[shirtStyle] && BASE_ROWS.get(rows);
  rows = (swap ? swap(shirtStyle) : rows).slice();
  const torso = [], legs = [], span = {};
  for (let y = 0; y < rows.length; y++) {
    if (rows[y].includes('S')) { torso.push(y); span[y] = [rows[y].indexOf('S'), rows[y].lastIndexOf('S')]; }
    if (rows[y].includes('P')) legs.push(y);
  }
  /* `span` è la larghezza del torso PRIMA di toccare la maglia, e va misurata qui.
     Le forme si applicano in fila — prima la maglia, poi i pantaloni — e la salopette cercava
     la maglia per appoggiarci le bretelle. Con la CANOTTIERA, però, di spalle le spalle
     diventano pelle e nella riga non resta una sola 'S': `indexOf` tornava -1, la bretella
     finiva a -1+1 = 0 e comparivano quattro pixel staccati in colonna 0, sul bordo sinistro
     dello sprite (segnalato con foto). La guardia di `setAt` ferma i negativi, non lo zero.
     Agganciandole al corpo invece che a quel che resta della maglia, le bretelle stanno al
     posto giusto anche sopra la pelle nuda — che è poi come si porta una salopette. */
  /* ---- MAGLIE: disegnate col corpo in bodyArt.js (vedi BY_SHIRT) ---- */
  /* ---- PANTALONI ---- */
  if (pantsStyle === 'shorts' && legs.length >= 2) {     // pantaloncini: stinco scoperto (ultima riga di pantalone → pelle)
    const shin = legs[legs.length - 1]; rows[shin] = rows[shin].replace(/[Pp]/g, 'F');
    if (legs.length >= 3) { const cuff = legs[legs.length - 2], cf = rows[cuff].indexOf('P'), cl = rows[cuff].lastIndexOf('P');
      if (cf >= 0) rows[cuff] = setAt(rows[cuff], cf, 'p'); if (cl >= 0) rows[cuff] = setAt(rows[cuff], cl, 'p'); } // orlo: ombra dove il tessuto finisce
  } else if (pantsStyle === 'skirt' && legs.length) {    // gonna: svasata sulla prima riga, gambe scoperte sotto
    const top = legs[0]; const f = rows[top].indexOf('P'), l = rows[top].lastIndexOf('P');
    const wMax = rows[top].length - 1;
    let s = rows[top].split(''); for (let x = Math.max(0, f - 1); x <= Math.min(wMax, l + 1); x++) s[x] = 'P'; s[Math.max(0, f - 1)] = 'p'; s[Math.min(wMax, l + 1)] = 'p';
    for (let x = f; x <= l; x += 2) if (s[x] === 'P') s[x] = 'p';   // pieghe: scacchiera verticale, non un blocco piatto
    rows[top] = s.join('');
    for (let i = 1; i < legs.length; i++) rows[legs[i]] = rows[legs[i]].replace(/P/g, 'F');
  } else if (pantsStyle === 'overall' && torso.length && legs.length) { // salopette: bretelle di pantalone sul torso
    for (const y of torso) {
      const [f, l] = span[y]; const a = f + 1, b = l - 1;
      if (a > b) continue;                       // torso troppo stretto: non ci sta una bretella
      rows[y] = setAt(setAt(rows[y], a, 'P'), b, 'P');
    }
    const topO = torso[0], [fo, lo] = span[topO] || [-1, -1];
    if (fo >= 0 && fo + 1 <= lo - 1) { rows[topO] = setAt(rows[topO], fo + 1, 'U'); rows[topO] = setAt(rows[topO], lo - 1, 'U'); } // fibbia: luce sulla bretella
  }
  return rows;
}
/* VESTITI RIFINITI A MANO. `styleLook` qui sopra ricava maglie e pantaloni trasformando le
   righe del corpo: si adatta a tutto da solo, ma è una regola, non un disegno — e certe forme
   (la felpa col cappuccio, la gonna svasata) una regola non le fa belle.
   Queste due tabelle sono la via d'uscita, con lo stesso patto della banca degli sprite:
   ADDITIVE. Finché una casella è vuota si vede il procedurale di sempre; appena la disegni
   nello Sprite Studio (scheda Vestiti) prende il posto SOLO di quel capo, e l'altro resta
   procedurale — maglia e pantaloni restano mescolabili a piacere.
   Formato identico a HAIRS/HATS: vista → [[riga, "mappa di 16 caratteri"], …].

   I PANTALONI HANNO UNA CHIAVE PER PASSO ('skirt:0', 'skirt:1'), le maglie no. Non è una
   stranezza: fra i due fotogrammi di camminata il TORSO è identico in tutte e tre le viste,
   le GAMBE no (una riga di fronte e di dietro, due di profilo). Un pantalone disegnato una
   volta sola si incollerebbe alla gamba e la camminata si spegnerebbe. */
export const SHIRTS = {};   // stile → { down:[…], side:[…], up:[…] }
export const PANTS = {};    // stile:passo → { down:[…], side:[…], up:[…] }
export function shirtOverlay(style, view) {
  const d = SHIRTS[style]; const r = d && d[view];
  return (r && r.length) ? r : null;
}
export function pantsOverlay(style, view, frame) {
  const d = PANTS[style + ':' + (frame ? 1 : 0)]; const r = d && d[view];
  return (r && r.length) ? r : null;
}
/* COSA INDOSSA il personaggio in questo fotogramma: quale forma dare al corpo procedurale e
   quali overlay disegnarci sopra. Sta fuori da drawHero perché è la parte che si può sbagliare
   in silenzio — un capo a mano che si somma alla regola invece di sostituirla si vede solo
   guardando il pixel giusto, mentre qui un test lo misura.
   La regola: se il capo è disegnato a mano, il corpo sotto va disegnato NEUTRO. Altrimenti
   l'overlay finirebbe sopra una silhouette già trasformata — la gonna a mano sopra le gambe
   che la gonna procedurale aveva già scoperto. */
export function heroClothes(look, view, frame) {
  const L = look || {};
  const shirt = L.shirtStyle || 'tshirt', pants = L.pantsStyle || 'long';
  const shOv = shirtOverlay(shirt, view), ptOv = pantsOverlay(pants, view, frame);
  return { shOv, ptOv, shirt: shOv ? 'tshirt' : shirt, pants: ptOv ? 'long' : pants };
}

/* capelli sotto il cappello: si tolgono le righe della corona e, dove i capelli restano FUORI dal
   cappello (un riccio più largo di una cuffia), il bordo tagliato prende il contorno — senza,
   sporgeva una fetta piatta senza bordo. Calcolato una volta per combinazione. */
const UNDER_HAT = new Map();
const BODY_RIM = new Map();
function hairUnderHat(hairId, hatId, view, hair, hat, crown) {
  const k = hairId + '|' + hatId + '|' + view;
  let out = UNDER_HAT.get(k);
  if (out) return out;
  const covered = new Set();
  for (const [yy, r] of hat) for (let i = 0; i < r.length; i++) if (r[i] !== '.') covered.add(i + ',' + yy);
  out = hair.filter(p => p[0] > crown).map(([yy, r]) => {
    const above = hair.find(p => p[0] === yy - 1);
    if (!above || above[0] > crown) return [yy, r];
    let t = '';
    for (let i = 0; i < r.length; i++) t += (r[i] !== '.' && r[i] !== 'I' && above[1][i] !== '.' && !covered.has(i + ',' + (yy - 1)) && !covered.has(i + ',' + yy)) ? 'I' : r[i];
    return [yy, t];
  });
  UNDER_HAT.set(k, out);
  return out;
}

/* eroe completo: corpo → capelli → cappello (se indossato); noHat per l'anteprima dal barbiere */
export function drawHero(tctx, x, y, dir, frame, noHat, pose) {
  /* niente più ctx.scale(2,2) qui: il corpo è ORA disegnato nativamente a 32×26,
     non più 16×13 raddoppiato meccanicamente — vero dettaglio, non blocchi 2×2. */
  const key = (dir === 'left' || dir === 'right') ? 'side' : dir;
  const flip = dir === 'left';
  const c = heroClothes(S.look, key, frame);
  const src = (pose && POSES[pose]) ? POSES[pose][key][frame ? 1 : 0] : SPR[key][frame];
  const bodyRows = styleLook(src, c.shirt, c.pants);
  const ok = key + frame + c.shirt + c.pants + (pose || '');
  let rim = BODY_RIM.get(ok); if (!rim) { rim = outlineRows(bodyRows); BODY_RIM.set(ok, rim); }
  blitPairs(rim, x, y, flip, tctx);                        // contorno: segue la sagoma già vestita
  blit(bodyRows, x, y, flip, tctx);
  if (c.shOv) blitPairs(c.shOv, x, y, flip, tctx);
  if (c.ptOv) blitPairs(c.ptOv, x, y, flip, tctx);
  /* segno di mestiere (solo i personaggi che lo hanno nel look): sul corpo sotto i capelli, sul viso sopra */
  const acc = S.look.acc, accBody = acc && accLayer(acc, 'body', key), accFace = acc && accLayer(acc, 'face', key);
  if (accBody) blitPairs(accBody, x, y, flip, tctx);
  const hs = HAIRS[S.look.hairStyle] || HAIRS.none;
  const hat = !noHat ? HATS[S.look.hatStyle] : null;
  const crown = hat ? HAT_CROWN[S.look.hatStyle] : -1;
  blitPairs(hat ? hairUnderHat(S.look.hairStyle, S.look.hatStyle, key, hs[key], hat[key], crown) : hs[key], x, y, flip, tctx);
  if (accFace) blitPairs(accFace, x, y, flip, tctx);
  if (hat) blitPairs(hat[key], x, y, flip, tctx);
  /* GLITTER del cappello PLATINO: qualche scintilla brillante sulla forma (twinkle dal tempo). */
  if (hat && S.glitterHats && S.glitterHats.indexOf(S.look.hatStyle) >= 0) {
    const g = tctx || ctx, t = Math.floor(heroTime / 260) % 3;
    const sp = [[10, -2], [20, 0], [14, 2], [8, 2], [18, -2]];
    for (let i = 0; i < sp.length; i++) { if ((i + t) % 3 !== 0) continue; const [sx, sy] = sp[i]; g.fillStyle = (i % 2 ? '#ffffff' : '#f8dd82'); g.fillRect(x + (flip ? 31 - sx : sx), y + sy, 1, 1); }
  }
}
/* tempo per il twinkle del glitter (aggiornato da render); default 0 per test/anteprime statiche */
let heroTime = 0;
export function setHeroTime(t) { heroTime = t || 0; }
