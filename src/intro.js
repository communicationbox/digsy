/* Intro IN-GAME (prima partita): scenetta col motore del gioco — il nonno archeologo e il
   piccolo Digsy davanti a uno scavo, dialoghi in BALOON. Sfondo curato. Skippabile. */
import { ctx, view, fit } from './screen.js';
import { drawHero, applyLook } from './sprites.js';
import { S } from './state.js';
import { tr } from './i18n.js';

let active = false;
export function introActive() { return active; }

const GRANDPA = { hat: '#6e4a2a', shirt: '#7a6a52', pants: '#5c4630', skin: '#e3b98a', hairStyle: 'short', hairColor: '#eae6da', hatStyle: 'explorer', eyeColor: '#33291f' };
function withLook(look, fn) { const saved = S.look; S.look = look; applyLook(); fn(); S.look = saved; applyLook(); }
const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

/* dialoghi: 'G' nonno · 'D' piccolo Digsy · act = beat scenico */
const LINES = [
  { s: 'G', it: 'Vieni, {n}. Guarda cosa nasconde la terra.', en: 'Come, {n}. Look what the earth hides.' },
  { s: 'D', it: 'Nonno… cos\'è quella?', en: 'Grandpa… what is that?' },
  { s: 'G', it: 'Un osso. Di una creatura di tantissimo tempo fa.', en: 'A bone. From a creature of long, long ago.', act: 'point' },
  { s: 'G', it: 'Io fui il primo a scoprirle. Nessuno le ricordava.', en: 'I was the first to find them. No one remembered them.' },
  { s: 'D', it: 'E possiamo… riportarle indietro?', en: 'And can we… bring them back?' },
  { s: 'G', it: 'Con pazienza e un pizzico di magia… sì.', en: 'With patience and a spark of magic… yes.', act: 'dig' },
  { s: 'G', it: 'Tienilo, {n}: un fossile leggendario, il tuo primo tesoro.', en: 'Take it, {n}: a legendary fossil, your first treasure.', act: 'give' },
  /* I PRIMI GIOCATORI NON CAPIVANO DA DOVE ARRIVANO LE PRIME MONETE: giravano senza
     attrezzi perché nessuno diceva che per terra c'è roba da raccogliere e rivendere.
     Il nonno lo spiega qui, che è il primo posto in cui uno ascolta. */
  { s: 'G', it: 'Una cosa ancora: tieni gli occhi bassi. Funghi, spighe, conchiglie…', en: 'One more thing: keep your eyes down. Mushrooms, wheat ears, shells…' },
  { s: 'G', it: 'Roba che luccica per terra. Raccoglila e vendila al Negozio:', en: 'Things glinting on the ground. Pick them up and sell them at the Shop:' },
  { s: 'G', it: 'i tuoi primi attrezzi li pagherai così. La pala prima di tutto.', en: 'that is how you pay for your first tools. The spade before anything else.' },
  { s: 'D', it: 'Lo prometto! Le troverò tutte e le farò rivivere!', en: 'I promise! I\'ll find them all and bring them back!' },
];

function cloud(x, y, s) { px(x, y, Math.round(14 * s), Math.round(4 * s), '#f4eddd'); px(x + Math.round(3 * s), y - Math.round(3 * s), Math.round(9 * s), Math.round(4 * s), '#fbf6ea'); px(x + Math.round(9 * s), y - Math.round(1 * s), Math.round(8 * s), Math.round(4 * s), '#e9ddc6'); }
/* MONTAGNA 8-bit alla reference: picco marrone, lato al sole più chiaro, lato in ombra scuro,
   colate/creste verticali e base larga. baseY = linea dove poggia. */
function mountain(cx, baseY, halfW, peakH) {
  const base = '#6a4632', sun = '#8a5c3c', dark = '#4a2f20', ridgeC = '#3a2418';
  for (let yy = 0; yy < peakH; yy++) {
    const w = Math.round((yy / peakH) * halfW * 2) + 2;            // triangolo (largo in basso)
    const x0 = Math.round(cx - w / 2), y = baseY - peakH + yy;
    px(x0, y, w, 1, base);
    px(x0, y, Math.max(1, Math.round(w * 0.42)), 1, sun);          // versante al sole (sinistra)
    px(x0 + Math.round(w * 0.72), y, Math.round(w * 0.28), 1, dark); // versante in ombra (destra)
  }
  // creste/colate verticali che scendono dal picco
  for (const o of [-0.18, 0.1, 0.34]) {
    let x = Math.round(cx + halfW * 2 * o);
    for (let yy = 4; yy < peakH; yy += 1) { const w = Math.round((yy / peakH) * halfW * 2); if (Math.abs(x - cx) < w / 2 - 1) px(x + (yy % 5 === 0 ? 1 : 0), baseY - peakH + yy, 1, 1, ridgeC); }
  }
  px(cx - 1, baseY - peakH, 2, 2, '#9a6a44');                       // cima illuminata
}
/* abete/pino 8-bit (triangoli sovrapposti) */
function pine(x, base, h) {
  const g1 = '#2f5a30', g2 = '#3c6a3a', g3 = '#254c28';
  px(x - 1, base - 2, 2, 4, '#4a3524');                            // tronco
  const tiers = Math.max(2, Math.round(h / 4));
  for (let ti = 0; ti < tiers; ti++) {
    const ty2 = base - 2 - ti * 3, w = 2 + (tiers - ti) * 2;
    px(Math.round(x - w / 2), ty2 - 3, w, 3, ti % 2 ? g2 : g1);
    px(Math.round(x - w / 2), ty2 - 3, Math.max(1, Math.round(w * 0.4)), 3, g3); // ombra a sx
  }
  px(x, base - 2 - tiers * 3 - 1, 1, 2, g2);                       // punta
}
/* zona di scavo con attrezzi: buca, cassa, piccone, secchio, spazzola, mappa */
function digsite(bx, by) {
  px(bx - 11, by - 1, 24, 6, '#6d4f30'); px(bx - 10, by, 22, 4, '#573d24');        // buca
  px(bx - 13, by - 2, 4, 3, '#a97a4c'); px(bx + 10, by - 2, 4, 3, '#a97a4c');       // mucchietti di terra
  px(bx - 18, by - 7, 8, 7, '#8a5f38'); px(bx - 18, by - 7, 8, 1, '#a97a4c'); px(bx - 18, by - 4, 8, 1, '#5c4229'); px(bx - 15, by - 7, 1, 7, '#5c4229'); // cassa
  px(bx - 12, by - 14, 1, 9, '#8a5f38'); px(bx - 14, by - 14, 5, 1, '#9a9285'); px(bx - 14, by - 15, 2, 1, '#b8b0a2'); // piccone
  px(bx + 12, by - 5, 5, 5, '#7a7268'); px(bx + 12, by - 5, 5, 1, '#9a9285'); px(bx + 13, by - 6, 3, 1, '#6a6258'); // secchio
  px(bx + 2, by - 2, 4, 1, '#c9a06a'); px(bx + 2, by - 1, 4, 1, '#e8d29a');          // spazzola
  px(bx - 5, by - 3, 5, 2, '#e8dcc0'); px(bx - 5, by - 3, 1, 2, '#c9a06a'); px(bx - 1, by - 3, 1, 2, '#c9a06a'); // mappa
}
function tree(x, base) { px(x - 1, base - 10, 3, 10, '#6e4a2a'); px(x - 6, base - 22, 14, 12, '#4e8d3f'); px(x - 4, base - 26, 10, 6, '#5fa04e'); px(x - 4, base - 24, 10, 2, '#7ec069'); }

function drawScene(t) {
  ctx.setTransform(view.K, 0, 0, view.K, 0, 0);
  const W = view.W, H = view.H, gy = Math.round(H * 0.68), DY = Math.round(H * 0.05);
  /* ZOOM INTERO 2× (mai frazionario: lo scaling frazionario spacca i pixel in
     "quadratini staccati"). Centrato sull'azione; il baloon si disegna FUORI dallo zoom. */
  const Z = 2, ZCX = Math.round(W / 2), ZCY = Math.round(H * 0.72);
  ctx.translate(ZCX, ZCY); ctx.scale(Z, Z); ctx.translate(-ZCX, -ZCY);
  /* CIELO arancione al tramonto (8-bit) */
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#cf4f36'); g.addColorStop(0.4, '#ea7a3a'); g.addColorStop(0.72, '#f29a48'); g.addColorStop(1, '#f6ba5c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  /* SOLE */
  const ssx = Math.round(W * 0.5), ssy = Math.round(H * 0.30);
  ctx.fillStyle = 'rgba(255,235,170,.26)'; ctx.fillRect(ssx - 14, ssy - 14, 28, 28);
  px(ssx - 8, ssy - 8, 16, 16, '#ffe6a0'); px(ssx - 6, ssy - 10, 12, 20, '#ffe6a0'); px(ssx - 10, ssy - 6, 20, 12, '#ffe6a0');
  /* NUVOLE bianche */
  cloud((20 + t / 90) % (W + 40) - 20, H * 0.15, 1); cloud((W * 0.5 + t / 130) % (W + 40) - 20, H * 0.09, 0.9); cloud((W * 0.82 + t / 70) % (W + 40) - 20, H * 0.22, 1.1);
  /* MONTAGNE marroni grandi (reference): la base ARRIVA fino al terreno (niente stacco) */
  const mby = gy + 2;
  mountain(Math.round(W * 0.18), mby, 20, 30); mountain(Math.round(W * 0.82), mby, 20, 30);
  mountain(Math.round(W * 0.34), mby, 16, 24); mountain(Math.round(W * 0.66), mby, 18, 26);
  mountain(Math.round(W * 0.5), mby, 30, 46);
  /* FASCIA DI PINI scuri alla base */
  for (let x = 2; x < W; x += 7) pine(x + ((x * 13) % 3), gy + 1, 7 + ((x * 7) % 6));
  /* PRATO ricco: 3 toni, chiazze, ciuffi d'erba e FIORI colorati (mondo più vivo) */
  px(0, gy, W, H - gy, '#57a83f'); px(0, gy, W, 4, '#7ec861');                 // base + bordo chiaro
  for (let x = 0; x < W; x += 9) px(x, gy + 6 + ((x * 7) % 3), 8, 2, '#4f9a37'); // chiazze scure
  for (let x = 5; x < W; x += 13) px(x, gy + 12 + ((x * 3) % 4), 6, 2, '#69bd4e'); // chiazze chiare
  for (let x = 0; x < W; x += 3) px(x, gy + 3, 1, 3 + ((x * 5) % 3), (x % 2) ? '#3f8a34' : '#4f9a3c'); // ciuffi
  const FCOL = ['#f2d24a', '#f6f0d0', '#e0607a', '#d98ab0', '#8a6fd0', '#ef8a3a'];
  for (let x = 4; x < W; x += 10) {
    const r = (x * 2654435761) >>> 0, fy = gy + 7 + (r % Math.max(1, (H - gy - 12))), col = FCOL[(r >> 5) % FCOL.length];
    px(x, fy + 2, 1, 3, '#3f8a34');                                            // stelo
    px(x - 1, fy, 3, 1, col); px(x, fy - 1, 1, 3, col); px(x, fy, 1, 1, '#fff2b8'); // petali + cuore
  }
  /* STRISCIA DI TERRA in basso */
  const ddy = H - 12; px(0, ddy, W, H - ddy, '#b57a3a'); px(0, ddy, W, 2, '#8a5a2a');
  for (let x = 0; x < W; x += 6) px(x + (x % 12 ? 0 : 3), ddy + 4, 2, 2, '#9a6630');
  /* UCCELLI */
  for (let b = 0; b < 3; b++) { const bx = ((t / 40) + b * 46) % (W + 20) - 10, by = H * 0.15 + b * 6 + Math.sin(t / 300 + b) * 2; px(Math.round(bx - 1), Math.round(by), 1, 1, '#3a2f28'); px(Math.round(bx), Math.round(by - 1), 1, 1, '#3a2f28'); px(Math.round(bx + 1), Math.round(by), 1, 1, '#3a2f28'); }
  /* ZONA SCAVATA con attrezzi (a metà strada fra bordo sinistro e nonno) + fossile centrale */
  const fx = Math.round(W / 2), fy = gy + 2 + DY;
  digsite(Math.round((W * 0.14 + W / 2 - 30) / 2), gy + 2 + DY);
  px(fx - 13, fy, 28, 7, '#a97a4c'); px(fx - 12, fy - 1, 26, 2, '#c49a63');   // tavolo (centro = fx+1)
  const boneC = '#efe6c8', boneD = '#cbbfa4', bx = fx - 5;                    // ossa CENTRATE sul tavolo
  px(bx - 3, fy - 2, 20, 2, boneC);                                  // colonna
  for (let i = 0; i < 4; i++) { px(bx - 1 + i * 5, fy - 6 - i, 1, 6 + i, boneC); px(bx + i * 5, fy - 6 - i, 1, 6 + i, boneD); } // costole
  px(bx + 13, fy - 8, 8, 6, boneC); px(bx + 14, fy - 6, 2, 2, '#3a3128'); px(bx + 17, fy - 6, 2, 2, '#3a3128'); // cranio
  px(bx - 6, fy - 1, 7, 1, boneC);                                   // osso zampa
  /* luccichio del fossile quando il nonno scava/dona */
  const line = LINES[Math.min(cur, LINES.length - 1)] || LINES[0]; // durante la pausa di fine, resta sull'ultima frase (il baloon non "salta" al nonno)
  if (line.act === 'dig' || line.act === 'give') { const a = (Math.sin(t / 160) + 1) / 2; ctx.fillStyle = `rgba(255,246,190,${(0.3 + a * 0.5).toFixed(2)})`; ctx.fillRect(bx + 12, fy - 12, 10, 12); for (let k = 0; k < 3; k++) { const aa = t / 200 + k * 2; if ((Math.sin(aa) + 1) / 2 > 0.6) px(Math.round(bx + 16 + Math.cos(aa) * 6), Math.round(fy - 6 + Math.sin(aa) * 6), 1, 1, '#fff6c8'); } }
  /* NONNO (sinistra) con barba + bastone + CONTORNO VERDE */
  const fr = Math.floor(t / 400) % 2, gpx = fx - 30, gpy = gy - 6 + DY;
  ctx.fillStyle = 'rgba(24,44,22,.28)'; ctx.fillRect(gpx - 6, gy - 1 + DY, 14, 2); // ombra a terra
  ctx.save(); ctx.translate(gpx, gpy); // scala 1 (interi): lo zoom 2× rende crisp, niente pixel staccati
  const dgi = line.act === 'dig' && Math.floor(t / 180) % 2, gfr = dgi ? 1 : (fr ? -1 : 0);
  withLook(GRANDPA, () => drawHero(null, -8, gfr, 'right', fr));
  px(-3, gfr + 6, 6, 3, '#eae6da'); px(-3, gfr + 9, 4, 1, '#d8d2c4'); // barba
  ctx.restore();
  px(gpx + 7, gpy - 2, 1, 11, '#5c4630'); px(gpx + 6, gpy - 3, 3, 1, '#6e4a2a');   // bastone
  if (line.act === 'point') { px(gpx + 9, gpy - 1, 4, 1, '#5c4630'); px(gpx + 12, gpy - 2, 1, 1, '#5c4630'); } // indica
  /* PICCOLO DIGSY (destra) più piccolo, saltella quando parla + CONTORNO VERDE */
  const dpx = fx + 24, dpy = gy - 3 + DY, jump = line.s === 'D' ? Math.round(Math.abs(Math.sin(t / 190)) * -3) : 0, cfr = fr ? -1 : 0;
  ctx.fillStyle = 'rgba(24,44,22,.28)'; ctx.fillRect(dpx - 5, gy - 1 + DY, 11, 2); // ombra a terra
  ctx.save(); ctx.translate(dpx, dpy + jump); // scala 1 (interi)
  drawHero(null, -8, cfr, 'left', fr);
  ctx.restore();
  /* vignetta calda */
  ctx.fillStyle = 'rgba(90,50,20,.12)'; ctx.fillRect(0, 0, W, 3); ctx.fillRect(0, H - 3, W, 3);
  /* BALOON sopra chi parla — disegnato FUORI dallo zoom (dimensione piena, mai tagliato):
     converto la posizione dello speaker da coord-zoom a coord-schermo. */
  const spX = line.s === 'G' ? gpx : dpx, spY = (line.s === 'G' ? gpy : dpy) - 14;
  const scrX = ZCX + (spX - ZCX) * Z, scrY = ZCY + (spY - ZCY) * Z;
  ctx.setTransform(view.K, 0, 0, view.K, 0, 0); // esci dallo zoom
  drawBalloon(scrX, scrY, textFull, typedStr());
}

/* baloon a fumetto (game px): riquadro chiaro, testo scuro, codina verso chi parla */
function drawBalloon(cx, cy, full, shown) {
  if (!full) return;
  ctx.font = '600 6px ui-monospace, Menlo, monospace'; ctx.textBaseline = 'top';
  const meas = s => { const m = ctx.measureText && ctx.measureText(s); return (m && m.width) || s.length * 3.6; };
  const maxW = Math.min(120, view.W - 16), words = full.split(' '), lines = []; let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (line && meas(test) > maxW) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line);
  let mw = 0; for (const l of lines) mw = Math.max(mw, meas(l));
  const padX = 7, padY = 4, lh = 7, bw = Math.ceil(mw) + padX * 2, bh = lines.length * lh + padY * 2;
  let bx = Math.round(cx - bw / 2); bx = Math.max(8, Math.min(view.W - bw - 8, bx)); // margine schermo più ampio
  const by = Math.max(2, Math.round(cy - bh));
  const tcx = Math.max(bx + 4, Math.min(bx + bw - 4, Math.round(cx))); // codina sempre dentro il baloon
  ctx.fillStyle = '#241a10'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = '#f8f1df'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#241a10'; ctx.fillRect(tcx - 2, by + bh, 4, 3); ctx.fillStyle = '#f8f1df'; ctx.fillRect(tcx - 1, by + bh, 2, 2);
  ctx.fillStyle = '#2a2016';
  /* testo troncato all'effetto macchina da scrivere */
  let acc = 0; const shownN = shown.length;
  for (let li = 0; li < lines.length; li++) {
    const l = lines[li]; let out = '';
    for (let ci = 0; ci < l.length; ci++) { if (acc < shownN) { out += l[ci]; acc++; } }
    ctx.fillText(out, bx + padX, by + padY + li * lh);
    acc++; // lo spazio tra righe conta un carattere
  }
}

let cur = 0, textFull = '', typed = 0, tStart = 0;
function typedStr() { return textFull.slice(0, typed); }

export function playIntro(onDone) {
  const finish = () => { active = false; try { removeEventListener('resize', fit); box.remove(); document.body.classList.remove('introing'); } catch (e) { /* ok */ } if (onDone) onDone(); };
  if (typeof document === 'undefined' || !document.createElement) { if (onDone) onDone(); return; }
  active = true; fit(); document.body.classList.add('introing');
  const box = document.createElement('div'); box.id = 'introbox';
  box.innerHTML = `<div class="introbar top"></div><div class="introbar bot"></div>
    <div id="introtap"></div>
    <div id="introhint">▶ ${tr('tocca per continuare', 'tap to continue')}</div>
    <button id="introskip">${tr('Salta ⏭', 'Skip ⏭')}</button>`;
  document.body.appendChild(box);
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0; }
  cur = 0; let ending = false;
  const nm = () => (S.name || tr('piccolo', 'little one'));
  function showLine() { const l = LINES[cur]; textFull = tr(l.it, l.en).replace(/\{n\}/g, nm()); typed = 0; tStart = now(); }
  function endThen() { // fadeout 8-bit al nero + "Qualche anno dopo…" → gioco (lento, non accavalla l'ultima frase)
    if (ending) return; ending = true;
    const tap = box.querySelector('#introtap'); if (tap) tap.style.display = 'none';
    const sk = box.querySelector('#introskip'); if (sk) sk.style.display = 'none';
    const hint = box.querySelector('#introhint'); if (hint) hint.style.display = 'none';
    setTimeout(() => {
      const end = document.createElement('div'); end.id = 'introend';
      end.innerHTML = `<div class="et">${tr('Qualche anno dopo…', 'A few years later…')}</div>`;
      box.appendChild(end);
      requestAnimationFrame(() => requestAnimationFrame(() => end.classList.add('show')));
      setTimeout(finish, 4600); // 2.2s fade nero + testo + attesa
    }, 800); // pausa per leggere l'ultima frase prima del fade
  }
  function next() { if (ending) return; if (typed < textFull.length) { typed = textFull.length; return; } cur++; if (cur >= LINES.length) endThen(); else showLine(); }
  function frame(ts) {
    if (!active) return;
    const t = ts || now();
    if (typed < textFull.length) typed = Math.min(textFull.length, Math.floor((t - tStart) / 24));
    drawScene(t);
    requestAnimationFrame(frame);
  }
  showLine(); requestAnimationFrame(frame);
  box.querySelector('#introtap').onclick = () => next();
  box.querySelector('#introskip').onclick = e => { e.stopPropagation(); finish(); };
}
