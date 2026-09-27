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
   L'oblò è un OVALE, e si disegna una riga per volta: un cerchio "vero" con arc() avrebbe il
   bordo sfumato, e qui ogni pixel è un pixel. Il paesaggio è ritagliato dentro quell'ovale. */
const OB = { cx: 108, cy: 40, rx: 27, ry: 31 };
function larghezzaRiga(dy) {
  const k = 1 - (dy * dy) / (OB.ry * OB.ry);
  return k <= 0 ? -1 : Math.round(OB.rx * Math.sqrt(k));
}
/* le nuvole stanno in un elenco scritto a mano e scorrono tutte insieme: un random a ogni
   fotogramma sarebbe neve, non nuvole */
const NUVOLE = [[10, 14, 20, 6], [44, 26, 26, 7], [86, 10, 22, 6], [124, 30, 18, 5],
  [160, 18, 24, 7], [198, 33, 20, 6], [232, 12, 26, 7], [270, 24, 18, 5],
  [64, 38, 16, 4], [186, 40, 14, 4]];

function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

export function disegnaVolo(t) {
  if (!ctx) return false;
  const s = t / 1000;
  /* il beccheggio: tutta la cabina sale e scende di un pixel, lentamente. Un pixel e non due:
     è un aereo in crociera, non una barca in tempesta. */
  const bob = Math.round(Math.sin(s * 1.6) * 1);

  ctx.save();
  ctx.translate(0, bob);

  /* PARETE della cabina: tre fasce dure, dal crema al verde salvia */
  rect(0, -2, W, 34, '#e8e0cc');
  rect(0, 32, W, 34, '#d9d0b8');
  rect(0, 66, W, H - 60, '#b9ad91');
  rect(0, 30, W, 2, '#c6bca2');                       // filo di giunzione dei pannelli
  rect(0, 64, W, 2, '#a99d82');

  /* CAPPELLIERA in alto, con le ante e le maniglie */
  rect(0, -4, W, 14, '#cfc6ad'); rect(0, 9, W, 3, '#a99d82');
  for (let x = 4; x < W; x += 26) { rect(x, 1, 22, 7, '#ddd4bb'); rect(x + 8, 5, 6, 2, '#8d826a'); }

  /* ---------- il PAESAGGIO dentro l'oblò ---------- */
  /* si disegna riga per riga, così il ritaglio è l'ovale stesso: niente maschere, niente
     bordi sfumati. Le fasce del cielo e il terreno scorrono a velocità DIVERSE — è la
     parallasse che dice «sto volando alto», più di qualsiasi velocità assoluta. */
  /* l'orizzonte sta un po' sopra la metà dell'oblò: sotto ci deve stare abbastanza terra da
     vederla CORRERE — con la terra ridotta a una striscia non si capisce che si sta volando */
  const orizzonte = 6;
  for (let dy = -OB.ry; dy <= OB.ry; dy++) {
    const hw = larghezzaRiga(dy);
    if (hw < 0) continue;
    const y = OB.cy + dy;
    const cielo = dy < orizzonte;
    rect(OB.cx - hw, y, hw * 2, 1, cielo
      ? (dy < -14 ? '#4f8fd0' : dy < 0 ? '#6ba8e0' : '#8dc2ef')
      : (dy < orizzonte + 6 ? '#9db98a' : dy < orizzonte + 14 ? '#7d9a68' : '#658453'));
  }
  /* NUVOLE: scorrono in fretta, a due velocità (quelle più in alto sono più lontane) */
  for (let i = 0; i < NUVOLE.length; i++) {
    const [nx, ny, nw, nh] = NUVOLE[i];
    const vel = ny < 22 ? 26 : 44;
    const x = OB.cx - OB.rx + ((nx - s * vel) % 300 + 300) % 300 - 40;
    for (let k = 0; k < nh; k++) {
      const yy = ny - OB.ry + k + OB.cy - 12;
      const hw = larghezzaRiga(yy - OB.cy);
      if (hw < 0) continue;
      const stretto = k === 0 || k === nh - 1 ? 3 : 0;
      const x0 = Math.max(OB.cx - hw, x + stretto), x1 = Math.min(OB.cx + hw, x + nw - stretto);
      if (x1 > x0) rect(x0, yy, x1 - x0, 1, k === 0 ? '#ffffff' : k === nh - 1 ? '#d8e6f4' : '#f4f9ff');
    }
  }
  /* COLLINE all'orizzonte: passano PIANO, perché sono lontane. Sono la cosa che dà la scala:
     senza, il verde sotto è un tappeto e potrebbe essere alto un metro. */
  for (let i = 0; i < 6; i++) {
    const x = OB.cx - OB.rx + ((i * 52 - s * 16) % 320 + 320) % 320 - 50;
    const h = 4 + (i % 3) * 2;
    for (let k = 0; k < h; k++) {
      const dy = orizzonte - h + k + 1, hw = larghezzaRiga(dy);
      if (hw < 0) continue;
      const stretto = Math.round((h - k) * 1.6);
      const x0 = Math.max(OB.cx - hw, x + stretto), x1 = Math.min(OB.cx + hw, x + 26 - stretto);
      if (x1 > x0) rect(x0, OB.cy + dy, x1 - x0, 1, k === 0 ? '#8fa7a0' : '#7d9690');
    }
  }
  /* CAMPI sotto: riquadri che corrono più in fretta delle colline e più piano del cielo. È la
     parallasse a dire «sto volando alto», più di qualsiasi velocità assoluta. */
  for (let i = 0; i < 22; i++) {
    const x = OB.cx - OB.rx + ((i * 19 - s * 66) % 420 + 420) % 420 - 70;
    const y0 = orizzonte + 2 + (i % 4) * 7;
    for (let dy = y0; dy <= Math.min(OB.ry, y0 + 6); dy++) {
      const hw = larghezzaRiga(dy);
      if (hw < 0) continue;
      const x0 = Math.max(OB.cx - hw, x), x1 = Math.min(OB.cx + hw, x + 13);
      if (x1 > x0) rect(x0, OB.cy + dy, x1 - x0, 1,
        i % 5 === 0 ? '#c2b06e' : i % 4 === 0 ? '#4e6b41' : i % 3 === 0 ? '#8fae76' : '#6d8d59');
    }
  }
  /* un FIUME che taglia i campi: si vede passare una volta ogni giro, e basta a dire che
     là sotto c'è un mondo e non una texture */
  {
    const x = OB.cx - OB.rx + ((-s * 66) % 420 + 420) % 420 - 20;
    for (let dy = orizzonte + 1; dy <= OB.ry; dy++) {
      const hw = larghezzaRiga(dy);
      if (hw < 0) continue;
      const xx = x + Math.round(Math.sin(dy * 0.4) * 3);
      const x0 = Math.max(OB.cx - hw, xx), x1 = Math.min(OB.cx + hw, xx + 5);
      if (x1 > x0) rect(x0, OB.cy + dy, x1 - x0, 1, '#4f86b8');
    }
  }

  /* CORNICE dell'oblò: due anelli, uno scuro fuori e uno chiaro dentro, più il riflesso */
  for (let dy = -OB.ry - 3; dy <= OB.ry + 3; dy++) {
    const hw = larghezzaRiga(dy), y = OB.cy + dy;
    const hwOut = (() => { const k = 1 - (dy * dy) / ((OB.ry + 3) * (OB.ry + 3)); return k <= 0 ? -1 : Math.round((OB.rx + 3) * Math.sqrt(k)); })();
    if (hwOut < 0) continue;
    if (hw < 0) { rect(OB.cx - hwOut, y, hwOut * 2, 1, '#9a917a'); continue; }
    rect(OB.cx - hwOut, y, hwOut - hw, 1, '#9a917a');
    rect(OB.cx + hw, y, hwOut - hw, 1, '#8b8270');
  }
  /* riflesso sul vetro: una banda chiara in diagonale, ferma — è vetro, non un lampo */
  for (let dy = -14; dy <= 2; dy++) {
    const hw = larghezzaRiga(dy);
    if (hw < 0) continue;
    const x = OB.cx - hw + 4 - dy;
    rect(Math.max(OB.cx - hw, x), OB.cy + dy, 3, 1, 'rgba(255,255,255,.34)');
  }

  /* ---------- il SEDILE e Digsy ---------- */
  /* poltrona di profilo: schienale a destra, seduta, bracciolo. Digsy ci sta sopra seduto e
     guarda fuori — cioè verso destra, dov'è l'oblò. */
  /* POLTRONA di profilo, vista da sinistra: schienale a sinistra, seduta che va verso il
     finestrino, due gambe. NIENTE bracciolo: di profilo passerebbe davanti al bacino e da
     lontano sembra un tavolo appoggiato addosso al passeggero (provato: peggiorava). */
  /* LA POLTRONA È A MISURA DI DIGSY, non di cabina: lo schienale arriva alle spalle (la testa
     spunta sopra, come su un sedile vero) e la seduta finisce alle ginocchia. Era larga il
     doppio e alta quanto lui — «la sedia è troppo grande», con foto: sembrava un bambino
     su un divano. */
  rect(23, 48, 10, 24, '#6a5f7e');                    // schienale, dietro la schiena
  rect(22, 46, 12, 3, '#7d7192');                     // bordo in alto
  rect(24, 50, 8, 2, 'rgba(255,255,255,.16)');        // luce sul velluto
  rect(24, 60, 8, 1, '#584e6b');                      // cucitura
  rect(23, 68, 30, 5, '#5b5170');                     // seduta, fino alle ginocchia
  rect(23, 68, 30, 1, '#6a5f7e');
  rect(25, 73, 4, 9, '#3f3852'); rect(47, 73, 4, 9, '#3f3852');     // gambe

  /* DIGSY: il suo aspetto vero, seduto (la posa `ride` è quella delle gambe piegate) e di
     profilo verso il finestrino. Si disegna sulla tela della scenetta, non su quella del
     gioco: `drawHero` accetta un contesto suo apposta per casi come questo. */
  try { drawHero(ctx, 26, 40, 'right', 0, false, 'ride'); } catch (e) { /* stub dei test */ }

  /* il tavolinetto davanti, col reperto appoggiato sopra */
  rect(76, 62, 20, 3, '#c6bca2'); rect(84, 65, 4, 13, '#a99d82');
  rect(80, 57, 9, 5, '#e8e0cc'); rect(81, 58, 7, 2, '#cdbd8e'); rect(83, 55, 3, 2, '#cdbd8e');

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
