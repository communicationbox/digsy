/* Musica chiptune procedurale (WebAudio, zero asset) + impostazioni persistenti.
   Lead square + basso triangle, pentatonica minore, tempo rilassato. */
const OKEY = 'digsy_audio';
let opts = { music: true, vol: 0.5, sfx: true, sfxVol: 0.7 };
try { const r = localStorage.getItem(OKEY); if (r) opts = { ...opts, ...JSON.parse(r) }; } catch (e) { /* ok */ }
const persist = () => { try { localStorage.setItem(OKEY, JSON.stringify(opts)); } catch (e) { /* ok */ } };

let actx = null, master = null, musicGain = null, timer = 0, step = 0;

/* MOOD per bioma: STESSO tema, ma tempo/tonalità/timbro diversi.
   shift = semitoni (tonalità/umore), tempo = ms per ottavo (più basso = più rapido).
   REGOLA MUSICALE: il tema è in LA minore pentatonica; ogni shift trasporta l'INTERA musica,
   quindi la "tonalità" del bioma è la minore con radice a `shift` semitoni da LA. Si modula
   SOLO verso tonalità VICINE sul circolo delle quinte (distanza ≤ 2): la minore un semitono
   via è distante 5 quinte = stona. Perciò niente FA# (-3, era palude) né DO# (+4, era ghiacci),
   che stanno a 3-4 quinte: al posto loro MI e RE, che con LA condividono quasi tutte le note.
   keyDistance() sotto misura la distanza; un test tiene ogni mood entro il vicinato. */
export const MOODS = {
  prati:   { tempo: 210, shift: 0,   lead: 'square' },     // LA min · sereno, casa (tonica)
  dune:    { tempo: 198, shift: 2,   lead: 'square' },     // SI min · caldo, brillante (d2)
  boschi:  { tempo: 232, shift: -2,  lead: 'triangle' },   // SOL min · cupo, morbido (d2)
  terre:   { tempo: 254, shift: -5,  lead: 'square' },     // MI min basso · grave e LENTO (d1)
  palude:  { tempo: 236, shift: -7,  lead: 'triangle' },   // RE min basso · torbido (d1)
  ghiacci: { tempo: 176, shift: 7,   lead: 'square' },     // MI min alto · cristallino, RAPIDO (d1)
  grotta:  { tempo: 206, shift: -12, lead: 'square', cave: true }, // LA min sotto · profondo (d0)
};
let curMoodId = 'prati', targetId = 'prati', liveTempo = MOODS.prati.tempo;
let pendId = null, pendN = 0;
function mood() { return MOODS[curMoodId] || MOODS.prati; }
/* cambia bioma SENZA taglio: la stessa musica si TRASFORMA. Il TEMPO glissa continuo (il ritmo
   scivola). La TONALITÀ modula in un colpo solo, ma SUL primo tempo della frase (downbeat) e
   SOLO verso tonalità vicine (garantito dai valori di MOODS): una modulazione a tonalità
   vicina su un tempo forte è consonante — è la regola, niente rampe inventate. Il timbro cambia
   con la tonalità. Nessun drone sostenuto scavalca il cambio (stonerebbe sulla frase nuova).
   DEBOUNCE: si cambia solo se resti nel nuovo bioma per qualche chiamata (non ai bordi di intermezzo). */
export function setBiomeMood(id) {
  if (!MOODS[id]) id = 'prati';
  if (curMoodId == null) { curMoodId = targetId = id; return; }
  if (id === targetId) { pendId = null; pendN = 0; return; }
  if (id === pendId) { if (++pendN >= 3) { targetId = id; pendId = null; pendN = 0; } } // ~1s stabile
  else { pendId = id; pendN = 1; }
}

/* TEMA "Digsy" — La minore pentatonica (A C D E G). Semitoni relativi ad A4 (440).
   4 frasi (hook · risposta · slancio · ritorno) poi la stessa in VARIAZIONE ornata:
   128 ottavi ≈ 27 s, loopabile senza stancare. null = pausa. */
const P1 = [7, null, 10, null, 12, null, 10, 7, 5, null, 7, null, 10, null, 7, null];        // hook: E G A G E…
const P2 = [5, null, 7, null, 10, null, 12, 15, 12, null, 10, null, 7, null, 5, null];        // risposta sale a C'
const P3 = [12, null, 15, null, 17, null, 15, 12, 10, null, 12, null, 15, null, 12, null];    // slancio in alto
const P4 = [10, null, 7, null, 5, null, 7, 10, 12, null, 10, null, 7, null, 0, null];         // ritorno, chiude su A
const V1 = [7, null, 10, 12, 10, null, 7, 5, 5, null, 7, null, 10, 12, 7, null];              // hook ornato
const V2 = [5, null, 7, null, 10, 12, 10, 15, 12, null, 10, 7, 5, null, 7, null];
const V3 = [12, null, 15, 17, 19, null, 17, 15, 12, null, 15, null, 17, 19, 12, null];        // tocca l'E alto (19)
const V4 = [10, null, 12, null, 10, 7, 5, 7, 10, 12, 10, null, 7, null, 0, null];
const LEAD = [...P1, ...P2, ...P3, ...P4, ...V1, ...V2, ...V3, ...V4];
/* basso: una radice per battuta (8 step). Progressione Am Am F G · Am C F E, poi Em al posto di C */
const BASS = [-12, -12, -16, -14, -12, -9, -16, -17, -12, -12, -16, -14, -12, -17, -16, -17];

export function audioOpts() { return { ...opts }; }
export function setVolume(v) {
  opts.vol = Math.max(0, Math.min(1, v)); persist();
  if (master) master.gain.value = opts.vol * 0.5;
}
export function setMusicOn(onv) {
  opts.music = !!onv; persist();
  if (opts.music) startAudio(); else stopAudio();
}
export function setSfxOn(onv) { opts.sfx = !!onv; persist(); }
export function setSfxVolume(v) { opts.sfxVol = Math.max(0, Math.min(1, v)); persist(); }
/* effetti sonori 8-bit: [freq, durata, forma, freqFinale?] — piccolo glissato = più carino */
const SFX = {
  click: [820, 0.04, 'square', 820],
  dig: [190, 0.10, 'square', 95],        // tonfo di terra
  chop: [150, 0.09, 'square', 110],      // legno
  mine: [230, 0.10, 'square', 300],      // roccia
  coin: [880, 0.10, 'square', 1600],     // moneta brillante che sale
  found: [660, 0.16, 'triangle', 990],   // ritrovamento: terza allegra
  fish: [320, 0.14, 'triangle', 560],    // pesca
  /* i tre suoni che mancavano: il traguardo, l'errore e il tocco dell'interfaccia */
  fanfare: [523, 0.22, 'triangle', 1046], // evento GRANDE (chimera, risveglio, traguardo, lettera)
  nope: [200, 0.14, 'square', 90],        // rifiuto: soldi/energia/zaino
  ui: [640, 0.03, 'square', 700],         // tocco leggero di interfaccia
};
export function playSfx(name) {
  if (!opts.sfx || !actx || !master) return;
  const d = SFX[name] || SFX.click, t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = d[2]; o.frequency.setValueAtTime(d[0], t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, d[3] || d[0]), t + d[1]);
  g.gain.setValueAtTime(opts.sfxVol * 0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d[1]);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + d[1]);
  if (name === 'fanfare') {                 // arpeggio di 3 note: si sente che è successo qualcosa
    [1.25, 1.5, 2].forEach((mul, i) => {
      const o3 = actx.createOscillator(), g3 = actx.createGain(), tt = t + 0.10 + i * 0.10;
      o3.type = 'triangle'; o3.frequency.setValueAtTime(d[0] * mul, tt);
      g3.gain.setValueAtTime(opts.sfxVol * 0.20, tt);
      g3.gain.exponentialRampToValueAtTime(0.001, tt + 0.22);
      o3.connect(g3); g3.connect(actx.destination);
      o3.start(tt); o3.stop(tt + 0.22);
    });
  }
  if (name === 'coin' || name === 'found') { // seconda nota per un blip più "premio"
    const o2 = actx.createOscillator(), g2 = actx.createGain();
    o2.type = 'square'; o2.frequency.setValueAtTime((d[3] || d[0]) * (name === 'coin' ? 1.5 : 1.25), t + d[1] * 0.5);
    g2.gain.setValueAtTime(opts.sfxVol * 0.16, t + d[1] * 0.5);
    g2.gain.exponentialRampToValueAtTime(0.001, t + d[1] * 1.4);
    o2.connect(g2); g2.connect(actx.destination);
    o2.start(t + d[1] * 0.5); o2.stop(t + d[1] * 1.4);
  }
}
/* la musica riparte al PRIMO gesto dopo un refresh (l'AudioContext nasce sospeso) */
export function armAudioResume() {
  if (typeof window === 'undefined') return;
  const go = () => { if (opts.music) startAudio(); else if (actx && actx.state === 'suspended') actx.resume(); };
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, go);
}
function note(semi, dur, type, vol) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = 440 * Math.pow(2, semi / 12);
  /* ATTACCO MORBIDO: prima la gain saltava a piena su un fronte netto = "click" a ogni nota.
     Piccola rampa d'attacco (~1/3 della nota, max 28ms) e coda lunga: niente ticchettii. */
  const t = actx.currentTime, atk = Math.min(0.028, dur * 0.35);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0004, vol), t + atk);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(musicGain || master);
  o.start(t); o.stop(t + dur + 0.02);
}
/* DISTANZA sul CIRCOLO DELLE QUINTE fra due tonalità (in semitoni). Pura e testabile.
   Moltiplicare per 7 (l'inverso della quinta, 7·7≡1 mod 12) manda i semitoni sulle quinte;
   il risultato 0..6 dice quante quinte separano le due tonalità: 1 = vicinissime (dominante/
   sottodominante, quasi tutte le note in comune), 6 = tritono (lontanissime, dissonanti). */
export function keyDistance(a, b) {
  const d = ((((b - a) * 7) % 12) + 12) % 12;
  return Math.min(d, 12 - d);
}
function tick() {
  if (!actx || !opts.music) return;
  const i = step % LEAD.length, bnd = i % 16;
  const pending = curMoodId !== targetId;
  const tgt = MOODS[targetId];
  /* TEMPO: glissa CONTINUO verso il target (il ritmo cambia scivolando, non a scatti) */
  if (Math.abs(liveTempo - tgt.tempo) > 0.6) {
    liveTempo += (tgt.tempo - liveTempo) * 0.08;
    if (timer) { clearInterval(timer); timer = setInterval(tick, Math.round(liveTempo)); }
  }
  /* TONALITÀ + timbro: modulano insieme SUL downbeat (1° tempo della frase). Le tonalità di
     MOODS sono già tutte vicine, quindi la modulazione cade consonante senza altri accorgimenti. */
  if (bnd === 0 && pending) curMoodId = targetId;
  const m = mood(), sh = m.shift;
  const l = LEAD[i];
  if (l !== null) note(l - 12 + sh, 0.22, m.lead, 0.07);             // lead (timbro/tonalità del bioma)
  const bar = Math.floor(i / 8) % BASS.length, root = BASS[bar] + sh;
  if (i % 4 === 0) note(root, 0.5, 'triangle', 0.15);                 // basso, 2 volte per battuta
  if (i % 8 === 6) note(root + 7, 0.28, 'triangle', 0.11);           // quinta di passaggio
  /* nessun drone LUNGO deve scavalcare il downbeat del cambio: la sua coda resterebbe nella
     vecchia tonalità sopra la frase nuova. Nella 2ª metà della frase, se c'è un cambio in
     attesa, si saltano i sostenuti; tornano dalla frase nuova. */
  const longPad = !(pending && bnd >= 8);
  if (i % 8 === 0 && longPad) { note(root + 7, 1.7, 'triangle', 0.05); note(root + 12, 1.7, 'triangle', 0.04); } // pad drone (quinta+ottava)
  if (m.cave && i % 8 === 4 && longPad) note(root - 12, 1.0, 'triangle', 0.06); // grotta: drone profondo (avventuroso)
  if (i % 2 === 1) note(31, 0.03, 'triangle', 0.012);                // shaker leggero sull'off
  step++;
}
/* va chiamata da un gesto utente (click sulla splash) */
export function startAudio() {
  if (!opts.music) return;
  if (typeof window === 'undefined') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!actx) {
    actx = new AC();
    master = actx.createGain(); master.gain.value = opts.vol * 0.5; master.connect(actx.destination);
    musicGain = actx.createGain(); musicGain.gain.value = 1; musicGain.connect(master);
  }
  if (curMoodId == null) curMoodId = targetId = 'prati';
  liveTempo = MOODS[targetId].tempo;
  if (actx.state === 'suspended') actx.resume();
  if (!timer) timer = setInterval(tick, Math.round(liveTempo));
}
export function stopAudio() { if (timer) { clearInterval(timer); timer = 0; } }
