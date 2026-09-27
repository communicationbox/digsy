/* IL VOLO — i tre secondi fra il proprio mondo e quello di un altro.
 *
 * Entrare in casa di qualcuno era uno STACCO SECCO: premevi accetta e ti ritrovavi altrove,
 * senza che niente dicesse che avevi viaggiato. Un mondo nuovo merita almeno il tempo di
 * arrivarci — ed è anche il momento in cui il gioco adotta il mondo dell'altro, che non è
 * istantaneo: meglio guardare un oblò che uno schermo fermo.
 *
 * Digsy seduto in aereo, il paesaggio che corre fuori dal finestrino. Pochi secondi, e si
 * salta con un tocco: una transizione che non si può interrompere diventa una tassa dalla
 * seconda volta in poi.
 *
 * DUE REGOLE FERREE, tutte e due facili da sbagliare proprio qui (come nel sogno):
 * - la fase dell'animazione viene SOLO dal tempo (regola 1): niente contatori di fotogrammi;
 * - la scala è INTERA (regola 3): la tela è in pixel di gioco e si ingrandisce di un numero
 *   tondo, o i pixel dell'oblò vengono larghi uno e mezzo.
 */
import { tr } from './i18n.js';
import { drawHero } from './sprites.js';

export const W = 160, H = 96;        // pixel di gioco della scenetta
export const DURATA = 3200;          // quanto dura il volo, in millisecondi

let box = null, cv = null, ctx = null, raf = 0;
let da = 0, chi = '', finito = null;

export const VOLO = { on: false };
export function voloAttivo() { return VOLO.on; }

function nodo() {
  if (box) return box;
  box = typeof document !== 'undefined' ? document.getElementById('volo') : null;
  return box;
}

/* ---------- la scenetta ----------
   LA CABINA NELLA VISTA DEL GIOCO (3/4 dall'alto), con le proporzioni di una cabina vera
   rispetto a Digsy: in alto le cappelliere, sotto la parete con una FILA di finestrini
   piccoli, poi le poltrone viste da davanti, strette in file una dietro l'altra, col
   corridoio in mezzo. Digsy è seduto in una, in prima fila, sotto il suo finestrino.
   Prima era un oblò gigante accanto a un divano di profilo — «gli oblò sono molto più
   piccoli, i posti più ravvicinati: non sembra un aereo» — e la reference mandata dà le
   misure: un finestrino è mezza testa, una poltrona è larga quanto chi ci siede. */
/* una poltrona è un po' PIÙ LARGA di chi ci siede, come nella reference: a 17 pixel Digsy
   ci stava sopra invece che dentro */
const SEDILE = 22;
/* colonne: due a sinistra, corridoio, e a destra una fila che continua oltre il bordo —
   la cabina non finisce dove finisce il quadro */
const COLONNE = [3, 27, 71, 95, 119, 143];
const MIO = 3;                                        // Digsy: prima fila, seconda poltrona a destra
/* un finestrino per poltrona, sopra la sua colonna */
const FINESTRE = COLONNE.map(x => ({ x: x + 6, y: 15, w: 10, h: 12 }));

/* IL PAESAGGIO È UNO SOLO, visto da tutti i finestrini: si calcola in coordinate di MONDO (la
   x dello schermo più quanto si è volato), così una nuvola che esce da un finestrino entra
   nel successivo, invece di sette cartoline diverse che scorrono ognuna per conto suo. */
const NUVOLE = [[10, 0, 8], [44, 2, 6], [83, 0, 10], [120, 1, 7], [165, 0, 9]];
function tinta(wx, ry, s) {
  const ORIZ = 7;                                     // righe di cielo, dentro il finestrino
  if (ry < ORIZ) {
    for (const [nx, ny, nw] of NUVOLE) {
      const x = (((wx + s * 30 - nx) % 200) + 200) % 200;
      const bordo = ry === ny || ry === ny + 2 ? 1 : 0;
      if (ry >= ny && ry <= ny + 2 && x >= bordo && x < nw - bordo) return ry === ny ? '#ffffff' : '#eef5fd';
    }
    return ry < 3 ? '#5a98d6' : ry < 5 ? '#76b0e4' : '#98c8f0';
  }
  /* colline lontane: quasi ferme */
  if (ry === ORIZ) {
    const x = (((wx + s * 6) % 30) + 30) % 30;
    return x < 14 ? '#86a09a' : '#98c8f0';
  }
  /* campi: corrono più piano delle nuvole — è la parallasse a dire «sto volando alto» */
  const c = Math.floor((wx + s * 18) / 4);
  const k = ((c * 7 + ry * 3) % 5 + 5) % 5;
  return ['#77955f', '#8fae76', '#5f7e4d', '#c2b06e', '#6d8d59'][k];
}

function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
/* quanto si stringe una riga agli angoli: un rettangolo con gli spigoli smussati a gradini */
function smusso(r, h) { return r === 0 || r === h - 1 ? 2 : (r === 1 || r === h - 2 ? 1 : 0); }

/* UNA POLTRONA vista da davanti: schienale alto col poggiatesta chiaro, seduta sotto, due
   braccioli ai lati. `davanti` la divide in due: lo schienale va DIETRO a chi siede, i
   braccioli e il bordo della seduta DAVANTI. */
function poltrona(x, y, parte) {
  if (parte !== 'davanti') {
    rect(x + 1, y, SEDILE - 2, 3, '#cbb89a');                   // poggiatesta
    rect(x, y + 3, SEDILE, 15, '#3e4a73');                      // schienale
    rect(x + 2, y + 4, SEDILE - 4, 2, '#56638f');               // luce sulla stoffa
    rect(x + 1, y + 17, SEDILE - 2, 7, '#34406a');              // seduta
  }
  if (parte !== 'dietro') {
    rect(x + 1, y + 23, SEDILE - 2, 2, '#29335a');              // bordo della seduta
    rect(x - 1, y + 13, 2, 10, '#2a3152'); rect(x + SEDILE - 1, y + 13, 2, 10, '#2a3152');   // braccioli
    rect(x - 1, y + 13, 2, 1, '#4a557f'); rect(x + SEDILE - 1, y + 13, 2, 1, '#4a557f');
  }
}

export function disegnaVolo(t) {
  if (!ctx) return false;
  const s = t / 1000;
  /* il beccheggio: tutta la cabina sale e scende di un pixel, lentamente. Un pixel e non due:
     è un aereo in crociera, non una barca in tempesta. */
  const bob = Math.round(Math.sin(s * 1.6) * 1);

  ctx.save();
  ctx.translate(0, bob);

  /* CAPPELLIERE in alto, una ogni due file */
  rect(0, -2, W, 12, '#cfc6ad'); rect(0, 9, W, 2, '#a99d82');
  for (let x = 2; x < W; x += 38) { rect(x, 1, 35, 7, '#ddd4bb'); rect(x + 15, 5, 6, 1, '#8d826a'); }
  /* PARETE con la fila di finestrini */
  rect(0, 11, W, 22, '#e8dcc3');
  rect(0, 31, W, 2, '#cfc3a8');                                  // zoccolo della parete
  for (const f of FINESTRE) {
    /* cornice di plastica, poi il vetro col paesaggio, poi il riflesso */
    for (let r = -1; r <= f.h; r++) {
      const hh = f.h + 2, rr = r + 1, i = smusso(rr, hh);
      rect(f.x - 1 + i, f.y + r, f.w + 2 - i * 2, 1, '#b9ae95');
    }
    for (let r = 0; r < f.h; r++) {
      const i = smusso(r, f.h);
      let x0 = f.x + i, col = tinta(x0, r, s);
      for (let x = x0 + 1; x <= f.x + f.w - i; x++) {
        const c2 = x < f.x + f.w - i ? tinta(x, r, s) : null;
        if (c2 !== col) { rect(x0, f.y + r, x - x0, 1, col); x0 = x; col = c2; }
      }
    }
    rect(f.x + 2, f.y + 2, 1, 3, 'rgba(255,255,255,.5)');       // riflesso fermo: è vetro
  }
  /* PAVIMENTO: legno ai lati, moquette nel corridoio */
  rect(0, 33, W, H - 30, '#6b4d33');
  for (let y = 36; y < H; y += 5) rect(0, y, W, 1, '#5e432c');
  rect(50, 33, 20, H - 30, '#3b3f55');                           // corridoio
  rect(50, 33, 1, H - 30, '#2e3145'); rect(69, 33, 1, H - 30, '#2e3145');

  /* ---------- le POLTRONE, due file strette una dietro l'altra ---------- */
  const FILA1 = 36, FILA2 = 64;
  for (let c = 0; c < COLONNE.length; c++) poltrona(COLONNE[c], FILA1, c === MIO ? 'dietro' : 'tutta');

  /* DIGSY: il suo aspetto vero, seduto e rivolto verso di noi (la posa `ride` è quella da
     seduto: gambe piegate, mani appoggiate — qui sui braccioli). Va FRA lo schienale e i
     braccioli, come chi siede davvero in poltrona. Si disegna sulla tela della scenetta:
     `drawHero` accetta un contesto suo apposta per casi come questo. */
  try { drawHero(ctx, COLONNE[MIO] + SEDILE / 2 - 16, FILA1 - 4, 'down', 0, false, 'ride'); } catch (e) { /* stub dei test */ }
  poltrona(COLONNE[MIO], FILA1, 'davanti');

  /* la fila DAVANTI copre le gambe di chi siede dietro: è quello che fa sembrare i posti
     stretti come su un aereo vero */
  for (let c = 0; c < COLONNE.length; c++) poltrona(COLONNE[c], FILA2, 'tutta');

  ctx.restore();
  return true;
}

/* ---------- apertura e chiusura ---------- */

export function partiVolo(nome, quando) {
  const n = nodo();
  if (!n) return false;
  chi = String(nome || '').slice(0, 20);
  da = quando || (typeof performance !== 'undefined' && performance.now ? performance.now() : 0);
  VOLO.on = true;
  n.innerHTML = `<div class="vl-box">
      <canvas class="vl-cv" id="volocv" width="${W}" height="${H}"></canvas>
      <div class="vl-t">${chi ? tr('In volo verso il mondo di ', 'Flying to ') + esc(chi) + tr('', "'s world") : tr('In volo', 'In flight')}</div>
      <div class="vl-n">${tr('Tocca per saltare', 'Tap to skip')}</div>
    </div>`;
  n.classList.add('on');
  cv = document.getElementById('volocv');
  ctx = cv && cv.getContext ? cv.getContext('2d') : null;
  if (ctx) ctx.imageSmoothingEnabled = false;
  n.onclick = () => chiudiVolo();
  gira();
  return true;
}
function esc(s) { return String(s).replace(/[<>&"]/g, ''); }

function gira() {
  if (typeof requestAnimationFrame !== 'function') return;
  const passo = (t) => {
    if (!VOLO.on) return;
    disegnaVolo(t);
    /* il volo finisce da solo: è una transizione, non una schermata in cui si resta */
    if (t - da >= DURATA) { chiudiVolo(); return; }
    raf = requestAnimationFrame(passo);
  };
  raf = requestAnimationFrame(passo);
}

export function chiudiVolo() {
  if (!VOLO.on) return false;
  VOLO.on = false;
  if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
  raf = 0;
  const n = nodo();
  if (n) { n.classList.remove('on'); n.innerHTML = ''; n.onclick = null; }
  cv = null; ctx = null;
  if (finito) { const f = finito; finito = null; f(); }
  return true;
}
/* qualcosa da fare quando il volo è atterrato (il benvenuto nel mondo di chi ospita) */
export function alloAtterraggio(fn) { finito = fn || null; }
