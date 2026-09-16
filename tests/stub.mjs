/* Stub DOM/canvas minimale per far girare i moduli di gioco in Node */
export function installStubs() {
  const els = {};
  /* La canvas finta di solito butta via tutto. Ma alcuni controlli hanno bisogno dei PIXEL
     VERI — per esempio la regola "se ha il contorno si interagisce, se non ce l'ha è
     paesaggio": senza leggere il disegno si può solo sperare che sia giusto. Con REC acceso
     fillRect dipinge davvero dentro un buffer RGBA, con tanto di trasparenza. */
  const REC = { on: false, w: 0, h: 0, buf: null };
  const parse = c => {
    if (typeof c !== 'string') return null;
    if (c[0] === '#') {
      const h = c.length === 4 ? c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.slice(1, 7);
      const n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const v = m[1].split(',').map(Number);
    return [v[0] | 0, v[1] | 0, v[2] | 0, v.length > 3 ? v[3] : 1];
  };
  const ctxStub = new Proxy({
    fillStyle: '',
    fillRect(x, y, w, h) {
      if (!REC.on) return;
      const col = parse(this.fillStyle); if (!col) return;
      const [r, g, b, a] = col;
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
        if (i < 0 || j < 0 || i >= REC.w || j >= REC.h) continue;
        const o = (j * REC.w + i) * 4, da = REC.buf[o + 3] / 255;
        const na = a + da * (1 - a);                       // sopra il fondo, come sulla canvas vera
        if (na <= 0) continue;
        REC.buf[o] = (r * a + REC.buf[o] * da * (1 - a)) / na;
        REC.buf[o + 1] = (g * a + REC.buf[o + 1] * da * (1 - a)) / na;
        REC.buf[o + 2] = (b * a + REC.buf[o + 2] * da * (1 - a)) / na;
        REC.buf[o + 3] = Math.round(na * 255);
      }
    },
  }, {
    get: (t, k) => k in t ? t[k] : () => {},
    set: (t, k, v) => { t[k] = v; return true; },
  });
  globalThis.__rec = {
    start(w, h) { REC.on = true; REC.w = w; REC.h = h; REC.buf = new Uint8ClampedArray(w * h * 4); },
    stop() { REC.on = false; return { w: REC.w, h: REC.h, buf: REC.buf }; },
  };
  /* gli elementi RICORDANO i listener e le classi: senza, i test non potevano simulare un
     tasto o un tocco, e moduli come input.js restavano completamente non provati */
  const el = id => {
    const cls = new Set();
    const L = {};
    return {
      id, textContent: '', innerHTML: '', value: '',
      style: { setProperty() {}, removeProperty() {}, getPropertyValue: () => '' },
      classList: {
        add: (...c) => c.forEach(x => cls.add(x)),
        remove: (...c) => c.forEach(x => cls.delete(x)),
        toggle: (c, on) => (on === undefined ? (cls.has(c) ? cls.delete(c) : cls.add(c)) : (on ? cls.add(c) : cls.delete(c))),
        contains: c => cls.has(c),
      },
      addEventListener: (t, fn) => { (L[t] = L[t] || []).push(fn); },
      removeEventListener: (t, fn) => { L[t] = (L[t] || []).filter(f => f !== fn); },
      dispatchEvent: ev => { (L[ev.type] || []).forEach(fn => fn(ev)); return true; },
      listeners: L,
      dataset: {}, onclick: null, remove() {},
      /* attaccando un nodo lo si REGISTRA per id: così i test possono ritrovare (e cliccare)
         quello che i moduli creano al volo, come il riquadro dell'intro */
      appendChild(child) { if (child && child.id) els[child.id] = child; return child; },
      setPointerCapture() {}, releasePointerCapture() {}, isConnected: true,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }),
      disabled: false, getContext: () => ctxStub, querySelectorAll: () => [],
      querySelector: sel => globalThis.document.querySelector(sel),
      focus() {}, blur() {},
    };
  };
  /* querySelector deve restituire un elemento vero: molti moduli lo usano per prendere
     nodi statici dell'HTML, e con `undefined` esplodevano appena importati */
  const docL = {};
  globalThis.document = {
    getElementById: id => { if (!els[id]) els[id] = el(id); return els[id]; },
    querySelector: sel => { const id = String(sel).replace(/^[#.]/, ''); if (!els[id]) els[id] = el(id); return els[id]; },
    querySelectorAll: () => [], createElement: el, readyState: 'complete',
    addEventListener: (t, fn) => { (docL[t] = docL[t] || []).push(fn); },
    removeEventListener: (t, fn) => { docL[t] = (docL[t] || []).filter(f => f !== fn); },
    dispatchEvent: ev => { (docL[ev.type] || []).forEach(fn => fn(ev)); return true; },
    get body() { return globalThis.document.getElementById('body'); },
    get documentElement() { return globalThis.document.getElementById('html'); },
  };
  /* eventi di finestra: i test possono emetterli (tastiera, resize) */
  const winL = {};
  globalThis.addEventListener = (t, fn) => { (winL[t] = winL[t] || []).push(fn); };
  globalThis.removeEventListener = (t, fn) => { winL[t] = (winL[t] || []).filter(f => f !== fn); };
  globalThis.dispatchEvent = ev => { (winL[ev.type] || []).forEach(fn => fn(ev)); return true; };
  globalThis.__fireKey = (type, key, target) => {
    const ev = { type, key, target: target || { tagName: 'BODY' }, preventDefault() {}, stopPropagation() {} };
    (winL[type] || []).forEach(fn => fn(ev));
    return ev;
  };
  const store = new Map(); // localStorage funzionale per testare gli slot
  store.set('digsy_lang', 'it'); // i test verificano le stringhe italiane
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  globalThis.innerWidth = 1440; globalThis.innerHeight = 900;
  globalThis.location = { href: 'http://localhost/', origin: 'http://localhost', search: '?nosplash', reload() {}, replace() {} };
  /* `window` esiste anche nei test: così si prova anche il codice che il gioco esegue solo
     nel browser (la sonda __digsy, il loop, gli agganci di boot) invece di saltarlo */
  globalThis.window = globalThis;
  globalThis.sessionStorage = globalThis.localStorage;
  globalThis.matchMedia = globalThis.matchMedia || (q => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  globalThis.cancelAnimationFrame = () => {};
  globalThis.clearInterval = () => {};
  globalThis.setTimeout = globalThis.setTimeout || ((fn) => { fn(); return 0; });
  globalThis.requestAnimationFrame = () => {};
  globalThis.setInterval = () => {};
  return els;
}

/* mini harness */
let pass = 0, fail = 0;
export function check(name, cond, detail) {
  if (cond) { pass++; console.log('  OK ', name); }
  else { fail++; console.log('  FAIL', name, detail ? '→ ' + detail : ''); }
}
export function summary(suite) {
  console.log(`${suite}: ${pass} ok, ${fail} fail\n`);
  const f = fail; pass = 0; fail = 0;
  return f;
}
