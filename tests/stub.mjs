/* Stub DOM/canvas minimale per far girare i moduli di gioco in Node */
export function installStubs() {
  const els = {};
  /* La canvas finta di solito butta via tutto. Ma alcuni controlli hanno bisogno dei PIXEL
     VERI — per esempio la regola "se ha il contorno si interagisce, se non ce l'ha è
     paesaggio": senza leggere il disegno si può solo sperare che sia giusto. Qui c'è una
     canvas 2D minima ma onesta: fillRect con la trasparenza, getImageData/putImageData e
     drawImage, così funzionano anche gli sprite che il gioco disegna su una tela a parte e
     poi contorna leggendosi l'alpha. */
  const parseCol = c => {
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
  function makeCtx(owner) {
    const st = { buf: null, w: 0, h: 0, tx: 0, ty: 0, pila: [] };
    const assicura = () => {
      const w = Math.max(1, owner.width | 0), h = Math.max(1, owner.height | 0);
      if (!st.buf || st.w !== w || st.h !== h) { st.w = w; st.h = h; st.buf = new Uint8ClampedArray(w * h * 4); }
      return st;
    };
    const dipingi = (x, y, r, g, b, a) => {
      if (x < 0 || y < 0 || x >= st.w || y >= st.h || a <= 0) return;
      const o = (y * st.w + x) * 4, da = st.buf[o + 3] / 255, na = a + da * (1 - a);
      if (na <= 0) return;
      st.buf[o] = (r * a + st.buf[o] * da * (1 - a)) / na;
      st.buf[o + 1] = (g * a + st.buf[o + 1] * da * (1 - a)) / na;
      st.buf[o + 2] = (b * a + st.buf[o + 2] * da * (1 - a)) / na;
      st.buf[o + 3] = Math.round(na * 255);
    };
    const api = {
      fillStyle: '', strokeStyle: '', font: '', textBaseline: '', globalAlpha: 1, canvas: owner,
      fillRect(x, y, w, h) {
        assicura(); const col = parseCol(this.fillStyle); if (!col) return;
        x = Math.round(x + st.tx); y = Math.round(y + st.ty); w = Math.round(w); h = Math.round(h);
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) dipingi(i, j, col[0], col[1], col[2], col[3]);
      },
      clearRect(x, y, w, h) {
        assicura();
        x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
          if (i < 0 || j < 0 || i >= st.w || j >= st.h) continue;
          const o = (j * st.w + i) * 4; st.buf[o] = st.buf[o + 1] = st.buf[o + 2] = st.buf[o + 3] = 0;
        }
      },
      getImageData(x, y, w, h) {
        assicura(); const out = new Uint8ClampedArray(w * h * 4);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const sxp = x + i, syp = y + j; if (sxp < 0 || syp < 0 || sxp >= st.w || syp >= st.h) continue;
          const a2 = (syp * st.w + sxp) * 4, b2 = (j * w + i) * 4;
          out[b2] = st.buf[a2]; out[b2 + 1] = st.buf[a2 + 1]; out[b2 + 2] = st.buf[a2 + 2]; out[b2 + 3] = st.buf[a2 + 3];
        }
        return { width: w, height: h, data: out };
      },
      putImageData(im, x, y) {
        assicura();
        for (let j = 0; j < im.height; j++) for (let i = 0; i < im.width; i++) {
          const dx = x + i, dy = y + j; if (dx < 0 || dy < 0 || dx >= st.w || dy >= st.h) continue;
          const a2 = (j * im.width + i) * 4, b2 = (dy * st.w + dx) * 4;
          st.buf[b2] = im.data[a2]; st.buf[b2 + 1] = im.data[a2 + 1]; st.buf[b2 + 2] = im.data[a2 + 2]; st.buf[b2 + 3] = im.data[a2 + 3];
        }
      },
      drawImage(src, x = 0, y = 0) {
        assicura(); const sc = src && src.__ctx && src.__ctx.__st; if (!sc || !sc.buf) return;
        x += st.tx; y += st.ty;
        for (let j = 0; j < sc.h; j++) for (let i = 0; i < sc.w; i++) {
          const o = (j * sc.w + i) * 4, a2 = sc.buf[o + 3] / 255;
          if (a2 > 0) dipingi(Math.round(x) + i, Math.round(y) + j, sc.buf[o], sc.buf[o + 1], sc.buf[o + 2], a2);
        }
      },
      /* TRASLAZIONE VERA. Prima era un no-op: ogni sprite che fa `ctx.translate(sx, sy)` e poi
         disegna in coordinate locali finiva tutto sull'origine, e le misure sui pixel (la
         regola del contorno) leggevano un disegno tagliato dal bordo della tela. */
      save() { st.pila.push([st.tx, st.ty]); },
      restore() { const p = st.pila.pop(); if (p) { st.tx = p[0]; st.ty = p[1]; } },
      translate(x, y) { st.tx += x; st.ty += y; },
      setTransform() { st.tx = 0; st.ty = 0; },
      resetTransform() { st.tx = 0; st.ty = 0; },
      measureText: t => ({ width: (t || '').length * 5.4 }),
      __st: st,
    };
    /* i metodi ORIGINALI, per poterli rimettere: un controllo che spia (`ctx.fillRect = spia`)
       e poi fa `delete ctx.fillRect` cancellava il metodo vero, e da quel momento in poi OGNI
       disegno finiva nel nulla — silenziosamente, per tutto il resto della suite. Ci è voluto
       un controllo che leggeva i pixel per accorgersene. */
    const originali = { ...api };
    return new Proxy(api, {
      get: (t, k) => k in t ? t[k] : () => {},
      set: (t, k, v) => { t[k] = v; return true; },
      deleteProperty: (t, k) => { if (k in originali) t[k] = originali[k]; else delete t[k]; return true; },
    });
  }
  /* gli elementi RICORDANO i listener e le classi: senza, i test non potevano simulare un
     tasto o un tocco, e moduli come input.js restavano completamente non provati */
  /* I NODI SCRITTI DENTRO innerHTML ESISTONO DAVVERO (almeno quanto basta).
     Finché `querySelectorAll` rispondeva sempre `[]`, ogni aggancio fatto per SELETTORE — e
     non per id — risultava provato e non lo era: il test chiamava la funzione che disegna, la
     funzione agganciava zero bottoni, e nessuno se ne accorgeva. Qui, quando un elemento
     riceve dell'HTML, si estraggono i tag con un `id` o un `data-…` e se ne fanno elementi
     stub veri, STABILI: il modulo ci scrive sopra `onclick`, il test ritrova lo stesso
     oggetto e lo clicca. Non è un browser — è un elenco di nodi con attributi e contenuto. */
  const nodi = [];            // tutti i nodi vivi, nell'ordine in cui sono stati scritti
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  function scansiona(host, html) {
    for (let i = nodi.length - 1; i >= 0; i--) if (nodi[i].__host === host) nodi.splice(i, 1);
    const re = /<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*?)?)>/g;
    let m;
    while ((m = re.exec(String(html)))) {
      const tag = m[1].toLowerCase(), raw = m[2] || '';
      const attrs = {}; attrRe.lastIndex = 0;
      let a; while ((a = attrRe.exec(raw))) attrs[a[1].toLowerCase()] = a[2];
      if (!attrs.id && !Object.keys(attrs).some(k => k.startsWith('data-'))) continue;
      const n = els[attrs.id] && attrs.id ? els[attrs.id] : el(attrs.id || '');
      if (attrs.id) els[attrs.id] = n;
      n.tagName = tag.toUpperCase();
      n.className = attrs.class || '';
      for (const c of String(attrs.class || '').split(/\s+/)) if (c) n.classList.add(c);
      for (const k of Object.keys(attrs)) if (k.startsWith('data-'))
        n.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = attrs[k];
      /* il contenuto: fino al tag di chiusura corrispondente, o quel che resta */
      const chiudi = String(html).indexOf('</' + tag, re.lastIndex);
      n.innerHTML = String(html).slice(re.lastIndex, chiudi < 0 ? undefined : chiudi);
      n.__host = host;
      nodi.push(n);
    }
  }
  function combacia(n, sel) {
    const s = String(sel).trim();
    if (s.startsWith('#')) return n.id === s.slice(1);
    if (s.startsWith('.')) return n.classList.contains(s.slice(1));
    const at = s.match(/^\[([-a-zA-Z0-9_]+)(?:=["']?([^\]"']*)["']?)?\]$/);
    if (at) {
      const k = at[1].startsWith('data-') ? at[1].slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()) : null;
      if (!k) return false;
      return k in n.dataset && (at[2] === undefined || n.dataset[k] === at[2]);
    }
    return n.tagName === s.toUpperCase();
  }
  const cerca = sel => nodi.filter(n => combacia(n, sel));

  const el = id => {
    const cls = new Set();
    const L = {};
    let html = '';
    const nodo = {
      id, textContent: '', value: '',
      get innerHTML() { return html; },
      set innerHTML(v) { html = String(v); scansiona(nodo, html); },
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
      disabled: false, width: 300, height: 150,
      getContext() { if (!this.__ctx) this.__ctx = makeCtx(this); return this.__ctx; },
      querySelectorAll: sel => cerca(sel),
      querySelector: sel => cerca(sel)[0] || globalThis.document.querySelector(sel),
      focus() {}, blur() {},
    };
    return nodo;
  };
  /* querySelector deve restituire un elemento vero: molti moduli lo usano per prendere
     nodi statici dell'HTML, e con `undefined` esplodevano appena importati */
  const docL = {};
  globalThis.document = {
    getElementById: id => { if (!els[id]) els[id] = el(id); return els[id]; },
    querySelector: sel => { const id = String(sel).replace(/^[#.]/, ''); if (!els[id]) els[id] = el(id); return els[id]; },
    querySelectorAll: sel => cerca(sel), createElement: el, readyState: 'complete',
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
  /* IL REGISTRATORE: punta la canvas VERA del gioco (#cv, quella che screen.js si è preso) e
     la azzera a una misura nota. Serve ai controlli che devono LEGGERE il disegno invece di
     fidarsi — per esempio la regola del contorno. */
  globalThis.__rec = {
    start(w, h) {
      const cv = globalThis.document.getElementById('cv');
      cv.width = w; cv.height = h;
      const c2 = cv.getContext('2d');
      c2.__st.buf = null;                      // rialloca alla misura nuova
      /* AZZERA ANCHE LA TRASLAZIONE: se una prova precedente ha lasciato un translate aperto
         (un save senza restore, o una scena che trasla la camera), tutto finirebbe disegnato
         fuori dalla tela e la misura direbbe «non ha disegnato niente» mentre disegna benissimo. */
      c2.__st.tx = 0; c2.__st.ty = 0; c2.__st.pila.length = 0;
      c2.clearRect(0, 0, w, h);
      return c2;
    },
    stop() {
      const cv = globalThis.document.getElementById('cv');
      const st = cv.getContext('2d').__st;
      return { w: st.w, h: st.h, buf: st.buf };
    },
  };
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
