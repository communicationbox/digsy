/* Stub DOM/canvas minimale per far girare i moduli di gioco in Node */
export function installStubs() {
  const els = {};
  const ctxStub = new Proxy({ fillStyle: '' }, {
    get: (t, k) => k in t ? t[k] : () => {},
    set: (t, k, v) => { t[k] = v; return true; },
  });
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
