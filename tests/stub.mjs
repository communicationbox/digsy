/* Stub DOM/canvas minimale per far girare i moduli di gioco in Node */
export function installStubs() {
  const els = {};
  const ctxStub = new Proxy({ fillStyle: '' }, {
    get: (t, k) => k in t ? t[k] : () => {},
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const el = id => ({
    id, textContent: '', innerHTML: '', value: '', style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, dataset: {}, onclick: null, appendChild() {}, remove() {},
    disabled: false, getContext: () => ctxStub, querySelectorAll: () => [],
  });
  globalThis.document = {
    getElementById: id => { if (!els[id]) els[id] = el(id); return els[id]; },
    querySelectorAll: () => [], createElement: el, readyState: 'complete', addEventListener() {},
  };
  globalThis.addEventListener = () => {};
  const store = new Map(); // localStorage funzionale per testare gli slot
  store.set('digsy_lang', 'it'); // i test verificano le stringhe italiane
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  globalThis.innerWidth = 1440; globalThis.innerHeight = 900;
  globalThis.requestAnimationFrame = () => {};
  globalThis.setInterval = () => {};
  return els;
}

/* mini harness */
let pass = 0, fail = 0;
export function check(name, cond) {
  if (cond) { pass++; console.log('  OK ', name); }
  else { fail++; console.log('  FAIL', name); }
}
export function summary(suite) {
  console.log(`${suite}: ${pass} ok, ${fail} fail\n`);
  const f = fail; pass = 0; fail = 0;
  return f;
}
