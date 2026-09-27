/* IL SOGNO — cosa si vede mentre si dorme e si aspetta.
 *
 * In compagnia andare a letto non fa passare la notte da solo (l'orologio è di chi ospita,
 * MULTIPLAYER.md regola 4): chi dorme resta qui, in un sogno, finché la notte passa o finché
 * decide di alzarsi. Senza qualcosa da guardare, "aspetta" è uno schermo fermo con sopra un
 * pulsante — e non si capisce nemmeno se il gioco è vivo.
 *
 * DUE REGOLE FERREE, tutte e due facili da sbagliare proprio qui:
 * - la fase dell'animazione viene SOLO dal tempo (regola 1): niente coordinate, niente
 *   contatori di fotogrammi;
 * - la scala è INTERA (regola 3): la tela è in pixel di gioco e si ingrandisce di un numero
 *   tondo, o le stelle vengono larghe un pixel e mezzo.
 *
 * E il mondo NON si ferma (regola 5): mentre uno sogna, chi è sveglio continua a giocare.
 */
import { tr } from './i18n.js';
import { withIcons } from './icons.js';
import { SONNO, svegli, miSveglio, inCompagnia } from './sonno.js';
import { sonoOspitante } from './mp.js';
import { drawHero } from './sprites.js';
import { drawFurnPiece } from './furnArt.js';
import { makeCanvasBrush } from './brush.js';
import { STARTER_BED_ID } from './data.js';
import { S } from './state.js';

/* 128×96 e non più 112×72: il letto è quello VERO della casa (un letto singolo, 32×64) e ci
   vuole aria attorno — nella tela piccola toccava il bordo in basso («serve un po' di aria
   attorno al letto», con foto) */
const W = 128, H = 96;          // pixel di gioco della scenetta
let box = null, cv = null, ctx = null, raf = 0, fadeFino = 0;

function nodo() {
  if (box) return box;
  box = document.getElementById('dream');
  if (!box) return null;
  cv = document.getElementById('dreamcv');
  if (cv) { cv.width = W; cv.height = H; ctx = cv.getContext('2d'); }
  return box;
}

/* ---------- la scenetta ---------- */

/* le stelle stanno FERME dove sono: un elenco scritto a mano, non un random a ogni apertura —
   un cielo che cambia a ogni sonno non è un cielo, è rumore */
const STELLE = [[8, 8], [23, 5], [39, 11], [52, 6], [67, 9], [81, 4], [95, 10], [104, 17],
  [14, 19], [31, 24], [60, 20], [88, 22], [46, 30], [74, 33], [20, 36], [100, 30],
  [118, 12], [112, 44], [6, 52], [122, 62], [16, 74], [108, 80], [28, 88], [96, 90]];

export function disegnaSogno(t) {
  if (!ctx) return false;
  const s = t / 1000;
  /* cielo a fasce dure, senza sfumature: è pixel art, non un gradiente */
  const bande = ['#1b1b3a', '#232349', '#2c2c59', '#363a6b'];
  for (let i = 0; i < bande.length; i++) {
    ctx.fillStyle = bande[i];
    ctx.fillRect(0, Math.floor(H * i / bande.length), W, Math.ceil(H / bande.length) + 1);
  }
  /* stelle che battono le palpebre: la fase è il TEMPO più un numero fisso per stella */
  for (let i = 0; i < STELLE.length; i++) {
    const [x, y] = STELLE[i];
    const on = (Math.sin(s * 1.7 + i * 1.3) + 1) / 2;
    if (on < 0.35) continue;
    ctx.fillStyle = on > 0.8 ? '#fdf6d8' : '#cfc8a6';
    ctx.fillRect(x, y, 1, 1);
    if (on > 0.9) { ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
  }
  /* LA LUNA È UNA FALCE, non un disco con sopra un morso del colore del cielo: il cielo qui è
     a fasce, e la luna sta a cavallo di due — il morso dipinto di un colore solo lasciava un
     quadrato scuro appiccicato di fianco. Si dipingono solo i pixel che sono DENTRO il disco e
     FUORI da quello che lo mangia: così sotto resta il cielo, qualunque fascia sia. */
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
    if (x * x + y * y > 36) continue;
    if ((x - 4) * (x - 4) + (y - 2) * (y - 2) <= 30) continue;
    ctx.fillStyle = (x * x + y * y > 28) ? '#d8c072' : '#f6e18a';   // un bordo più spento: volume
    ctx.fillRect(110 + x, 16 + y, 1, 1);
  }

  /* IL LETTO è quello VERO della casa — il letto singolo del catalogo, con la sua ricetta di
     disegno: testiera, struttura, lenzuolo, trapunta, cuscino, ombre. Prima era un mucchio di
     rettangoli fatti apposta, senza spigoli smussati né ombre («la grafica del letto è
     pessima», con foto). Stessa funzione della stanza da letto: se il letto migliora là,
     migliora anche qui.
     E dentro DIGSY — il personaggio vero, col suo aspetto, non una testina disegnata a parte
     («perché non usare il personaggio??»): dritto sul cuscino come in tutto il resto del
     gioco (3/4 dall'alto), senza cappello e con gli occhi chiusi. */
  const bx = 48, by = 16;                              // il letto in mezzo, con aria attorno
  const resp = Math.sin(s * 1.6) > 0 ? 0 : 1;          // il respiro: SOLO dal tempo (regola 1)
  try { drawFurnPiece(makeCanvasBrush(ctx), STARTER_BED_ID, bx, by, 32, 64, t, 0); } catch (e) { /* stub dei test */ }

  /* Digsy si ritaglia sotto il mento: il resto del corpo è sotto le coperte */
  const hx = bx, hy = by - 1;
  ctx.save();
  ctx.beginPath(); ctx.rect(bx, by - 12, 32, 32); ctx.clip();
  try {
    drawHero(ctx, hx, hy, 'down', 0, true);
    const L = S.look || {};
    if (!L.glassesStyle || L.glassesStyle === 'none') {
      /* nello sprite gli occhi stanno alle colonne 11-12 e 19-20, righe 8-11 (bodyArt.js) */
      ctx.fillStyle = L.skin || '#e8b88a';
      ctx.fillRect(hx + 11, hy + 8, 2, 4); ctx.fillRect(hx + 19, hy + 8, 2, 4);
      ctx.fillStyle = '#2b2118';
      ctx.fillRect(hx + 11, hy + 10, 2, 1); ctx.fillRect(hx + 19, hy + 10, 2, 1);
    }
  } catch (e) { /* stub dei test */ }
  ctx.restore();
  /* la coperta tirata fino al collo, col risvolto del lenzuolo: sale e scende col respiro.
     Stessi colori della trapunta del letto (il blu del letto singolo), così continua lei. */
  const cy = by + 19 - resp;
  ctx.fillStyle = '#5a86c8'; ctx.fillRect(bx + 5, cy, 22, by + 26 - cy);
  ctx.fillStyle = '#f4ecd6'; ctx.fillRect(bx + 5, cy, 22, 3);
  ctx.fillStyle = '#ded3b4'; ctx.fillRect(bx + 5, cy + 3, 22, 1);

  /* le Z che salgono: tre, sfasate, ognuna sale e sfuma. Tutto dal tempo. */
  for (let i = 0; i < 3; i++) {
    const k = ((s * 0.45) + i / 3) % 1;
    const zx = bx + 26 + Math.round(k * 18), zy = by + 2 - Math.round(k * 16);
    const g = 2 + Math.round(k * 2);
    ctx.fillStyle = k > 0.75 ? '#8e8ab0' : '#f1e7cf';
    ctx.fillRect(zx, zy, g * 2, 1);
    ctx.fillRect(zx, zy + g * 2 - 1, g * 2, 1);
    for (let j = 1; j < g * 2 - 1; j++) ctx.fillRect(zx + (g * 2 - 1 - j), zy + j, 1, 1);
  }
  return true;
}

/* ---------- l'overlay ---------- */

function testi() {
  const notte = SONNO.notte;
  const quando = notte ? tr('al mattino', 'in the morning') : tr('di notte', 'at night');
  const attesa = svegli();
  return { quando, attesa };
}

function dipingi() {
  const b = nodo(); if (!b) return;
  const { quando, attesa } = testi();
  const ospito = sonoOspitante();
  let h = `<div class="dr-box"><canvas id="dreamcv" class="dr-cv"></canvas>`;
  h += `<div class="dr-t">${tr('Stai dormendo', "You're asleep")}</div>`;
  h += `<div class="dr-n">${attesa.length
    ? tr('Aspetti che si corichi ', 'Waiting for ') + attesa.join(', ')
    : tr('Dormite tutti: la notte sta passando', 'Everyone is asleep: the night is passing')}</div>`;
  if (ospito) {
    /* CHI OSPITA DECIDE: il mondo è suo. Le due voci dicono cosa fanno davvero (regola 7),
       perché "svegliati" da solo non lascia capire che una delle due muove il tempo di tutti. */
    h += `<button class="sp-btn primary" id="dr-passa">${tr('Svegliati ', 'Wake up ') + quando}</button>`;
    h += `<div class="dr-n">${tr('Il tempo passa per tutti. Chi non ha dormito non recupera energia.', 'Time passes for everyone. Whoever did not sleep gets no energy back.')}</div>`;
    h += `<button class="sp-btn small" id="dr-su">${tr('Alzati: non è successo niente', "Get up: nothing happened")}</button>`;
  } else {
    h += `<button class="sp-btn small" id="dr-su">${tr('Svegliati', 'Wake up')}</button>`;
    h += `<div class="dr-n">${tr('Qui il tempo è di chi ospita: la notte passa quando lo decide lui.', 'Time here belongs to your host: the night passes when they say so.')}</div>`;
  }
  h += `</div>`;
  b.innerHTML = withIcons(h);
  cv = document.getElementById('dreamcv');
  if (cv) { cv.width = W; cv.height = H; ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; }
  const p = document.getElementById('dr-passa');
  if (p) p.onclick = () => { if (prova) { chiudiSogno(false); return; } if (miSveglio(true)) chiudiSogno(true); else chiudiSogno(false); };
  const u = document.getElementById('dr-su');
  if (u) u.onclick = () => { if (!prova) miSveglio(false); chiudiSogno(false); };
}

let alSveglio = null;
/* cosa fare quando ci si sveglia: lo registra il gioco (main.js), perché qui non si decide
   niente — questo modulo disegna e raccoglie un clic. */
export function setAlSveglio(fn) { alSveglio = fn; }

/* LA PROVA DALLA CONSOLE (`anim=sogno`). Il sogno si guarda da solo a ogni fotogramma se si
   sta ancora dormendo in compagnia, e si chiude se no — giusto nel gioco, perché la stanza può
   finire mentre si dorme. Ma dalla console non si dorme con nessuno: la risposta era sempre
   no, e il sogno si apriva e si richiudeva nello stesso fotogramma («anim=sogno non fa
   comparire nessuna animazione»). In prova quel controllo si salta, e i pulsanti chiudono e
   basta: non c'è nessuna notte da far passare né nessuno da svegliare. */
let prova = false;
export function apriSogno(opz) {
  const b = nodo(); if (!b) return false;
  prova = !!(opz && opz.prova);
  dipingi();
  b.classList.add('on');
  gira();
  return true;
}
export function chiudiSogno(passata) {
  const b = nodo(); if (b) { b.classList.remove('on'); b.classList.remove('fade'); }
  if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
  raf = 0;
  /* in prova non si è mai dormito: niente da raccontare a chi aspetta il risveglio */
  const eraProva = prova; prova = false;
  if (alSveglio && !eraProva) alSveglio(!!passata);
  return true;
}
export function sognoAperto() { const b = nodo(); return !!b && b.classList.contains('on'); }

/* LA DISSOLVENZA di chi NON stava dormendo: il tempo è passato lo stesso (l'ha fatto passare
   chi ospita) e lo si deve vedere, ma non è un sogno e non ha pulsanti — un secondo di buio e
   si torna a giocare. */
export function fadeNotte(now) {
  const b = nodo(); if (!b) return false;
  b.innerHTML = '';
  b.classList.add('fade'); b.classList.add('on');
  fadeFino = (now || adesso()) + 900;
  gira();
  return true;
}

function adesso() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

/* IL CICLO VIVE FINCHÉ SERVE e muore da sé: un rAF lasciato acceso dietro un overlay chiuso è
   una batteria che si scarica per niente (stessa regola dell'anteprima del personaggio). */
function gira() {
  if (typeof requestAnimationFrame !== 'function') return;
  const passo = (t) => {
    const b = nodo();
    if (!b || !b.classList.contains('on')) { raf = 0; return; }
    if (b.classList.contains('fade')) {
      if (t >= fadeFino) { b.classList.remove('on'); b.classList.remove('fade'); raf = 0; return; }
    } else {
      /* LA STANZA PUÒ FINIRE MENTRE SI DORME: l'ospitante esce, cade la linea, o si viene
         mandati via. Il sogno si accorge da sé che non c'è più nessuno e si chiude, invece di
         lasciare uno schermo di stelle sopra un gioco tornato a casa. */
      if (!prova && !staSognando()) { chiudiSogno(false); return; }
      disegnaSogno(t);
    }
    raf = requestAnimationFrame(passo);
  };
  raf = requestAnimationFrame(passo);
}

/* usato dal gioco: si sta dormendo in compagnia in questo momento? */
export function staSognando() { return SONNO.dormo && inCompagnia(); }
