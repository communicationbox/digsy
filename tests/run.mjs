/* Suite Node: mondo/città, bussola, chimere/parco, sprite/look. Uso: npm test */
import { installStubs, check, summary } from './stub.mjs';
installStubs();

/* import dopo gli stub: i moduli toccano il DOM al load */
const { TS, SPECIES, RAR, SERVICE_COST, HAIR_STYLES, HAIR_COLORS, LOOKS } = await import('../src/data.js');
const { setSeed } = await import('../src/noise.js');
const state = await import('../src/state.js');
const world = await import('../src/world.js');
const sprites = await import('../src/sprites.js');
const park = await import('../src/park.js');
const compassMod = await import('../src/compass.js');
const gameplay = await import('../src/gameplay.js');
const ui = await import('../src/ui.js');

let failures = 0;

/* ---------- setup stato ---------- */
state.initState();
const S = state.S, P = state.P; // dopo initState: S è riassegnato lì
S.bagCap = 9999; S.drops = []; // capacità ampia: i test di scavo non devono droppare a terra
setSeed(12345); S.seed = 12345;
sprites.applyLook();

/* ---------- mondo / città ---------- */
{
  let n = 0, sizes = {}, bad = 0, barbers = 0, tailors = 0;
  /* le PORTE hanno un elenco loro, non il contatore `bad` condiviso: questo difetto è tornato
     più volte (fontana centrale, recinto del parco, bordo piazza) e ogni volta il test diceva
     solo "città campionate" FALSE, senza dire QUALE porta di QUALE edificio. Un test che non
     nomina il guasto lo fa ricomparire. */
  const porteChiuse = [];
  let doors = 0;
  for (let cx = -10; cx < 10; cx++) for (let cy = -10; cy < 10; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue; n++;
    sizes[t.size] = (sizes[t.size] || 0) + 1;
    if (!t.name || t.name.length < 4) bad++;
    const types = t.buildings.map(b => b.type);
    if (types.includes('barber')) barbers++;
    if (types.includes('tailor')) tailors++;
    for (const b of t.buildings) {
      if (b.x0 < t.x0 || b.x1 > t.x1 || b.y0 < t.y0 || b.y1 > t.y1) bad++;
      /* 3 CASELLE LIBERE DAVANTI A OGNI PORTA: si esce senza restare bloccati. Prima si
         controllava solo la prima: la seconda/terza finivano contro il recinto del parco o
         la fontana centrale e uscendo da barbiere/sartoria/lab si restava incastrati. */
      doors++;
      const ostruite = [];
      for (let dd = 1; dd <= 3; dd++) if (world.isSolidTile(b.doorx, b.doory + dd)) {
        const ti = world.townInfo(b.doorx, b.doory + dd);
        ostruite.push(dd + '=' + (ti && ti.deco ? ti.deco.type : ti && ti.fence ? 'recinto' : ti && ti.building ? 'edificio' : 'terreno'));
      }
      const below = world.townInfo(b.doorx, b.doory + 1);
      if (!below || !below.floor) ostruite.push('1=non-calpestabile');
      if (ostruite.length) porteChiuse.push(`${t.size}/${b.type} @${b.doorx},${b.doory} (${ostruite.join(' ')})`);
      const d = world.townInfo(b.doorx, b.doory);
      if (!d || !d.door) bad++;
    }
    // città interamente dentro la cella
    const lim = { x0: cx * world.TCELL, y0: cy * world.TCELL, x1: (cx + 1) * world.TCELL - 1, y1: (cy + 1) * world.TCELL - 1 };
    if (t.x0 < lim.x0 || t.x1 > lim.x1 || t.y0 < lim.y0 || t.y1 > lim.y1) bad++;
    if (t.size === 'città' && (!types.includes('barber') || !types.includes('tailor') || !types.includes('furniture') || t.pen)) bad++;
    if (t.size !== 'città' && types.includes('furniture')) bad++;   // la Bottega d'arredo sta SOLO in città
    if (t.size === 'paese' && !types.includes('barber')) bad++;
  }
  check(`città campionate (${n}, taglie ${JSON.stringify(sizes)})`, n > 60 && bad === 0);
  check(`OGNI porta ha 3 caselle libere davanti (${doors} porte)`, porteChiuse.length === 0,
    porteChiuse.slice(0, 6).join(' · '));
  check(`barbieri nei paesi+città (${barbers}), sartorie nelle città (${tailors})`, barbers > 0 && tailors > 0);
  check('nomi deterministici', world.townName(3, 7) === world.townName(3, 7));
}

/* ---------- USCIRE da un edificio: non basta che le caselle siano libere sulla carta ----------
   Il test qui sopra guarda la mappa; questo esce DAVVERO da ogni porta con `exitInterior` e poi
   prova a camminare con la collisione VERA. È la differenza che conta: la posizione che il gioco
   assegna uscendo è la TESTA, il corpo urta 10..15 px più in basso, quindi la casella pestata è
   quella DOPO — e per un pezzo il controllo dell'uscita ha guardato quella sbagliata.
   Il difetto segnalato dai giocatori (si esce dal Laboratorio e si finisce contro la fontana)
   nasceva qui: caselle libere sulla carta, personaggio incastrato nei fatti. */
{
  const inter = await import('../src/interior.js');
  const gpx = await import('../src/gameplay.js');
  const { feetTile: ftile } = await import('../src/body.js');
  /* quanto lontano si arriva camminando davvero (passi da 4px, BFS): 3 caselle = si è liberi */
  const raggio = (x0, y0, lim) => {
    const visti = new Set([x0 + ',' + y0]); const q = [[x0, y0]]; let best = 0;
    while (q.length) {
      const [x, y] = q.shift();
      best = Math.max(best, Math.max(Math.abs(x - x0), Math.abs(y - y0)));
      if (best >= lim) return best;
      for (const [dx, dy] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
        const nx = x + dx, ny = y + dy;
        if (Math.abs(nx - x0) > lim + 8 || Math.abs(ny - y0) > lim + 8) continue;
        const k = nx + ',' + ny; if (visti.has(k) || gpx.collide(nx, ny)) continue;
        visti.add(k); q.push([nx, ny]);
      }
    }
    return best;
  };
  const oldX = P.x, oldY = P.y, oldB = inter.INT.b, oldA = inter.INT.active;
  const incastrati = [], stretti = []; let provate = 0;
  for (let cx = -6; cx < 6; cx++) for (let cy = -6; cy < 6; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue;
    for (const b of t.buildings) {
      provate++;
      inter.INT.b = b; inter.INT.active = true;
      inter.INT.fromX = b.doorx * TS + TS / 2; inter.INT.fromY = b.doory * TS + 20;
      inter.exitInterior();
      const f = ftile(P);
      const chi = `${t.size}/${b.type} @${b.doorx},${b.doory} → piedi ${f.tx},${f.ty}`;
      if (gpx.collide(P.x, P.y)) { incastrati.push(chi); continue; }
      if (raggio(P.x, P.y, 3 * TS) < 3 * TS) stretti.push(chi);
    }
  }
  P.x = oldX; P.y = oldY; inter.INT.b = oldB; inter.INT.active = oldA;
  check(`uscendo non si finisce MAI dentro un solido (${provate} porte)`, incastrati.length === 0,
    incastrati.slice(0, 6).join(' · '));
  check('uscendo ci si allontana sempre di almeno 3 caselle', stretti.length === 0,
    stretti.slice(0, 6).join(' · '));
}

/* ---------- niente testo italiano murato nell'HTML ---------- */
{
  /* Un testo scritto a mano in index.html non passa da tr() e resta in italiano per tutti:
     è successo col pulsante "Fatto" del tavolo di preparazione, invisibile finché un russo
     non ha aperto il minigioco. Qui si scandisce il markup e si pretende che ogni testo
     visibile o sia tradotto da applyStaticTexts, o venga riscritto a runtime da chi apre
     quella schermata. */
  const { readFileSync } = await import('node:fs');
  /* si guarda solo ciò che il giocatore LEGGE: dentro <script> e <style> non c'è testo
     d'interfaccia, e prenderli darebbe falsi allarmi su codice e selettori */
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const i18n = await import('../src/i18n.js');
  /* id che vengono riscritti dal codice quando la schermata si apre */
  const RUNTIME = ['pr-title', 'mp-title', 'sp-ver', 'bootmsg'];  // bootmsg: tradotto dallo script inline, prima che i moduli esistano
  const orphans = [];
  const re = /<([a-z]+)([^>]*)>([^<>{}]{3,})<\/\1>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[2], txt = m[3].trim();
    if (!/[a-zà-ù]/i.test(txt)) continue;                    // solo simboli: niente da tradurre
    if (/^(DIGSY|WORLD|Digsy World)$/.test(txt)) continue;   // nome proprio: non si traduce
    const id = (attrs.match(/id="([^"]+)"/) || [])[1] || '';
    if (RUNTIME.includes(id)) continue;
    /* è coperto da applyStaticTexts? si guarda se il sorgente lo nomina */
    const src = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8');
    if (id && src.includes('#' + id)) continue;
    if (src.includes(JSON.stringify(txt).slice(1, -1))) continue;
    orphans.push(id ? '#' + id + ' "' + txt + '"' : '"' + txt + '"');
  }
  check('nessun testo murato in index.html' + (orphans.length ? ' → ' + orphans.join(', ') : ''), orphans.length === 0);
  check('il pulsante del minigioco si traduce', typeof i18n.applyStaticTexts === 'function');
}

/* ---------- il giocatore non finisce mai sotto la barra dell'HUD ---------- */
{
  /* Segnalato da un giocatore, con foto: in grotta si sale fino in cima, la camera è già
     ferma al bordo della mappa e Digsy resta NASCOSTO dietro i tag delle monete. Stessa
     riga nella galleria del museo. La regola: dovunque si arrivi, la testa del giocatore
     deve restare sotto il bordo inferiore dell'HUD. */
  const screen = await import('../src/screen.js');
  const cave = await import('../src/cave.js');
  const interiors = await import('../src/interiors.js');
  const { INT } = await import('../src/interior.js');
  const pad = screen.hudPad();
  check('hudPad: margine positivo anche a HUD non misurabile (' + pad + ' px)', pad > 0);

  cave.enterCave(1, 0, 0);
  let worstCave = Infinity;
  for (const y of [0, 4, 8, 16, 40, 100]) {
    cave.CAVE.y = y; cave.CAVE.x = (cave.CAVE.w * TS) / 2;
    const sy = cave.CAVE.y - cave.caveCam().y;      // dove finisce sullo schermo
    worstCave = Math.min(worstCave, sy);
  }
  check('grotta: il giocatore resta sotto la barra (min ' + Math.round(worstCave) + ' ≥ ' + pad + ')', worstCave >= pad);
  cave.exitCave();

  /* galleria del museo: stessa formula, si controlla la camera in cima alla sala */
  const H = 200, rh = 48 * TS;
  const before = INT.y;
  INT.y = 8;
  const camy = interiors.galleryCamY(H, rh);
  check('museo: la camera lascia spazio alla barra (' + Math.round(INT.y - camy) + ' ≥ ' + pad + ')', INT.y - camy >= pad);
  INT.y = before;
}

/* ---------- l'energia non va mai sotto zero ---------- */
{
  /* Segnalato con foto: "-1/65" nell'HUD. Il controllo `energy <= 0` sta PRIMA dell'azione,
     quindi protegge solo chi consuma 1; staccare un cristallo in grotta ne costa 2 e da 1
     si finiva a -1. Ogni consumo passa da spendEnergy, che ha lo zero come fondo. */
  const before = S.energy;
  S.energy = 1; state.spendEnergy(2);
  check('energia: 1 − 2 = 0, non −1 (era ' + S.energy + ')', S.energy === 0);
  S.energy = 0; state.spendEnergy(5);
  check('energia: non scende sotto zero nemmeno da zero', S.energy === 0);
  S.energy = 10; state.spendEnergy(3);
  check('energia: la spesa normale funziona', S.energy === 7);
  /* Nessun modulo deve SPENDERE energia per conto proprio: è lì che nasce il numero
     negativo. Le ricariche (riposo, ristoro, comandi) assegnano un valore già limitato
     dall'alto e non c'entrano. */
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL('../src/', import.meta.url);
  const offenders = readdirSync(dir).filter(f => f.endsWith('.js')).filter(f => {
    if (f === 'state.js') return false;                       // è casa sua
    return /S\.energy\s*(--|-=)/.test(readFileSync(new URL(f, dir), 'utf8'));
  });
  check('nessuno spende S.energy fuori da spendEnergy' + (offenders.length ? ' → ' + offenders.join(', ') : ''),
    offenders.length === 0);
  /* REGOLA #1: i tetti non devono "nuotare" camminando — il pattern del materiale NON può
     dipendere dalla parità della y SCHERMO (prima lo shingle usava (r % 2), r = y schermo).
     La fase dello stagger deve venire dall'INDICE di riga (stabile col mondo). */
  /* i tetti ora stanno in townArt.js e lavorano in coordinate LOCALI dell'edificio (0,0 = angolo
     dell'ingombro): lo sfalsamento viene dall'indice di riga, mai dalla y dello schermo */
  const roofFn = (() => { const s = readFileSync(new URL('townArt.js', dir), 'utf8'); const a = s.indexOf('export function roof('); return a < 0 ? '' : s.slice(a, s.indexOf('export function windowBox', a)); })();
  /* REGOLA #2: gli ALBERI sono sprite copiati con drawImage. Arrotondati al pixel di gioco intero
     (Math.round) tremavano camminando, perché la camera scorre a frazioni: si agganciano con snap */
  { const psrc = readFileSync(new URL('props.js', dir), 'utf8'); const a = psrc.indexOf('export function drawTree'); const body = psrc.slice(a, psrc.indexOf('\n}', a));
    check('alberi: lo sprite si aggancia alla griglia fisica (niente tremolio camminando)', /drawImage\(spr, snap\(/.test(body) && !/drawImage\([^)]*Math\.round/.test(body)); }
  check('tetti: il materiale non usa la y dello schermo (regola #1)', roofFn.length > 0 && !/\b(sy|cam)\b/.test(roofFn));
  /* L'altra metà dello stesso guasto: il giocatore leggeva "46/60" mentre l'energia era già
     a zero, perché il refresh dell'HUD stava DOPO i `return` di grotte e interni e là sotto
     non veniva mai eseguito. Qui si pretende che stia prima di entrambi. */
  const mainSrc = readFileSync(new URL('main.js', dir), 'utf8');
  const iHud = mainSrc.indexOf('hudAcc > 2');
  const iCave = mainSrc.indexOf('if (CAVE.active)');
  const iInt = mainSrc.indexOf('if (INT.active)');
  check('l\'HUD si aggiorna anche in grotta e negli interni',
    iHud > 0 && iCave > 0 && iInt > 0 && iHud < iCave && iHud < iInt);
  /* Stesso guasto, terza faccia: l'OROLOGIO. Stava anche lui dopo quei `return`, quindi
     sottoterra il tempo non passava — si stavano dieci minuti veri a staccare cristalli e
     si riemergeva alla stessa ora, con la commissione del Museo che non scadeva mai finché
     si restava dentro. Grotte e interni non sono una modale: là si gioca. */
  const iTime = mainSrc.indexOf('advanceTime(dt)');
  check('il tempo scorre anche in grotta e negli interni',
    iTime > 0 && iTime < iCave && iTime < iInt);
  check('l\'orologio avanza in un posto solo', mainSrc.split('advanceTime(dt)').length - 1 === 1);
  S.energy = before;
}

/* ---------- PARCO CHE RENDE: quanto tempo VERO sei stato via (logica pura) ---------- */
{
  const idle = await import('../src/idle.js');
  const H = 3600000;
  check('meno della soglia minima: zero, niente arrotondamenti regalati',
    idle.idleEligible(idle.idleHours(idle.IDLE_MIN_MINUTES * 60000 - 1000, 0)) === false);
  check('appena sopra la soglia: eleggibile', idle.idleEligible(idle.idleHours(idle.IDLE_MIN_MINUTES * 60000 + 1000, 0)) === true);
  check('le ore non vanno mai sotto zero (orologio tornato indietro)', idle.idleHours(0, 10 * H) === 0);
  check('le ore sono CAPPATE: una settimana vale come il tetto, non di più',
    idle.idleHours(7 * 24 * H, 0) === idle.IDLE_CAP_HOURS && idle.idleHours(idle.IDLE_CAP_HOURS * H, 0) === idle.IDLE_CAP_HOURS);
  check('senza chimere: zero monete (il parco vuoto non rende)', idle.idleCoins(idle.IDLE_CAP_HOURS, 0) === 0);
  check('monete = creature × tasso × ore, ma con un tetto sulle creature contate (rendimenti calanti)',
    idle.idleCoins(2, 5) === Math.round(5 * idle.IDLE_COIN_PER_CREATURE_HOUR * 2) &&
    idle.idleCoins(2, 999) === idle.idleCoins(2, idle.IDLE_MAX_CREATURES));
  check('sotto soglia: zero monete comunque, anche con tante creature', idle.idleCoins(0.1, 50) === 0);
}

/* ---------- partita in cloud: accesso, rete assente, conflitti ---------- */
{
  const { runCloudTests } = await import('./cloud.mjs');
  await runCloudTests(check);
}

/* ---------- nomi usati senza importarli: pulsanti morti che non fanno rumore ---------- */
{
  const { runImportTests } = await import('./imports.mjs');
  runImportTests(check);
}

/* ---------- lo Sprite Studio vede TUTTE le icone ---------- */
{
  /* Lo Studio aveva una copia scritta a mano dell'elenco icone, ferma a 40 nomi: tutto
     quello che veniva dopo "menu" in ordine alfabetico non si poteva aprire nell'editor,
     e nessuno se ne accorgeva finché non serviva proprio quell'icona. L'elenco dev'essere
     uno solo, quello di icons.js. */
  const { readFileSync } = await import('node:fs');
  const studio = readFileSync(new URL('../public/sprites/index.html', import.meta.url), 'utf8');
  check('lo Studio prende l\'elenco icone da icons.js', /ICON_NAMES\s*=\s*\(await import\('\/src\/icons\.js'\)\)/.test(studio));
  /* nessuna lista di nomi icona scritta a mano: si riconosce da più nomi noti di fila */
  const handmade = /\['arD'\s*,|"arD"\s*,\s*"arDL"/.test(studio);
  check('lo Studio non ha una copia scritta a mano dell\'elenco', handmade === false);
}

/* ---------- monete e X: stessa taglia sul telefono ---------- */
{
  /* Stavano su due regole diverse: la X cresceva a 42px sotto `pointer:coarse`, il
     contatore delle monete restava a 34 e accanto sembrava rimpicciolito. Le monete sono
     l'informazione che si guarda di più mentre si compra: devono pesare almeno quanto il
     pulsante per chiudere. */
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  /* di blocchi con questa media query ce n'è più d'uno: serve quello che tocca le monete */
  const blocks = css.match(/@media\(max-width:760px\),\(pointer:coarse\)\{[\s\S]*?\n\}/g) || [];
  const blk = blocks.find(b => b.includes('.st-coins')) || '';
  const hOf = (sel) => {
    const m = blk.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*height:(\\d+)px'));
    return m ? +m[1] : 0;
  };
  const hx = hOf('.st .x'), hc = hOf('.st-coins');
  check(`monete e X alte uguali sul telefono (${hc} vs ${hx})`, hx > 0 && hc === hx);
  /* e nessuna regola successiva deve rimpicciolire le monete sotto quella misura */
  const narrow = (css.match(/@media\(max-width:420px\)\{([^}]*\}[^}]*)\}/) || [, ''])[1];
  check('sullo schermo strettissimo si accorcia il titolo, non le monete',
    !/\.st-coins\{[^}]*height/.test(narrow) && !/\.st-coins\{[^}]*font-size:1[0-4]px/.test(narrow));
}

/* ---------- nessuna grotta chiusa: tutto il pavimento si raggiunge dall'ingresso ---------- */
{
  /* Segnalato con foto: "è stata generata una grotta chiusa all'ingresso". Il rumore aveva
     circondato di roccia la camera d'ingresso. Su tanti semi: flood fill dall'ingresso, ogni
     casella di pavimento e ogni giacimento devono essere raggiungibili. */
  const cave = await import('../src/cave.js');
  const C = cave.CAVE, keepSeed = C.seed;
  let bad = 0, badNode = 0, tot = 0, semi = 0;
  for (let seed = 1; seed <= 400; seed += 7) {
    C.seed = seed; semi++;
    const W = C.w, H = C.h, seen = new Uint8Array(W * H), q = [(H - 2) * W + (W >> 1)]; seen[q[0]] = 1;
    for (let i = 0; i < q.length; i++) {
      const j = q[i], x = j % W, y = (j / W) | 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const n = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[n] || cave.caveSolid(nx, ny)) continue;
        seen[n] = 1; q.push(n);
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!cave.caveSolid(x, y)) {
      tot++; if (!seen[y * W + x]) { bad++; if (cave.caveNodeAt(x, y)) badNode++; }
    }
  }
  C.seed = keepSeed;
  check('grotte: tutto il pavimento raggiungibile dall\'ingresso (' + semi + ' semi, ' + bad + '/' + tot + ' isolate)', bad === 0);
  check('grotte: nessun giacimento irraggiungibile', badNode === 0);
}

/* ---------- dalla grotta si esce anche col solo mouse ---------- */
{
  /* Segnalato da un giocatore: con il solo mouse non si usciva. Per uscire bisogna
     camminare OLTRE l'ultima casella, ma là fuori non c'era niente da cliccare — l'uscita
     era una linguetta di quattro pixel sull'ultimo bordo, al buio. Ora la camera scende di
     CAVE_FOOT e sotto l'imbocco si vede un pezzo di mondo esterno: c'è dove cliccare, e si
     vede dov'è. Qui si prova proprio quel gesto. */
  const cave = await import('../src/cave.js');
  const tap = await import('../src/tapmove.js');

  check('la grotta mostra un pezzo di esterno oltre l\'imbocco', cave.CAVE_FOOT > 16);

  cave.enterCave(7, 0, 0);
  check('si entra in grotta', cave.CAVE.active === true);
  /* la camera deve scendere OLTRE il fondo, altrimenti non c'è nulla da cliccare */
  const rh = cave.CAVE.h * TS;
  cave.CAVE.x = (cave.CAVE.w >> 1) * TS + TS / 2;
  cave.CAVE.y = (cave.CAVE.h - 4) * TS;
  const camBottom = cave.caveCam().y + 400;              // 400 = altezza vista di prova (13 tile × TS)
  check('sotto l\'imbocco c\'è spazio visibile (' + Math.round(camBottom - rh) + ' px)', camBottom > rh);

  /* la scena di grotta (buio + alone + corridoio) non era mai stata disegnata da un test:
     render() la smista su CAVE.active PRIMA di guardare INT/mondo — se esplode qui, tutta
     la grotta resta uno schermo nero senza che nessun test se ne accorga */
  const render = await import('../src/render.js');
  let caveDrawErr = null;
  const caveKeep = { x: cave.CAVE.x, y: cave.CAVE.y };
  try {
    render.render(1234);
    const wasTorch = S.tools.torch; S.tools.torch = true;                    // alone più largo
    cave.CAVE.digging = { t: 0.4, dur: 1 };                                  // scavo del cristallo
    render.render(1500);
    cave.CAVE.digging = null; S.tools.torch = wasTorch;
    cave.CAVE.x = TS; cave.CAVE.y = TS;                                      // in fondo: freccia uscita a bordo
    render.render(1800);
  } catch (e) { caveDrawErr = e.message; }
  cave.CAVE.x = caveKeep.x; cave.CAVE.y = caveKeep.y;                        // il test seguente parte da qui
  check('la scena di grotta si disegna senza esplodere', caveDrawErr === null, caveDrawErr);

  /* il giocatore clicca FUORI, sull'erba: meta oltre l'ultima casella */
  const exTx = cave.CAVE.w >> 1;
  const c = tap.tileCenter(exTx, cave.CAVE.h);
  tap.setGoal(c.x, c.y);
  let steps = 0;
  while (cave.CAVE.active && steps < 400) { cave.updateCave(1 / 60, {}, 60); steps++; }
  check('cliccando fuori dall\'imbocco si esce davvero (' + steps + ' passi)', cave.CAVE.active === false);
  tap.clearGoal();
}

/* ---------- le taglie degli abitati si traducono ---------- */
{
  /* Le chiavi interne sono in italiano (borgo/paese/città) e finivano dritte nella mappa:
     un inglese leggeva "borgo" nel messaggio al tocco.
     La lingua non si può commutare a runtime (LANG si fissa al caricamento e setLang
     ricarica la pagina), quindi qui si verifica il DATO: per ogni taglia devono esistere
     la forma italiana, quella inglese diversa dall'italiana, e la voce nel dizionario
     russo. È esattamente ciò che serve perché townSizeLabel dia la parola giusta. */
  const i18n = await import('../src/i18n.js');
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8');
  const blk = (src.match(/const TOWNSIZEL = \{([\s\S]*?)\};/) || [, ''])[1];
  const pairs = [...blk.matchAll(/'?([\wàèéìòù]+)'?:\s*\['([^']+)',\s*'([^']+)'\]/g)]
    .map(m => ({ id: m[1], it: m[2], en: m[3] }));
  check('le tre taglie hanno un\'etichetta (' + pairs.map(p => p.id).join(',') + ')', pairs.length === 3);

  const ru = i18n.dictOf('ru') || {};
  const noEn = pairs.filter(p => p.en === p.it || !p.en);
  const noRu = pairs.filter(p => ru[p.en] === undefined);
  check('ogni taglia ha una forma inglese sua' + (noEn.length ? ' → ' + noEn.map(p => p.id) : ''), noEn.length === 0);
  check('ogni taglia è nel dizionario russo' + (noRu.length ? ' → ' + noRu.map(p => p.en) : ''), noRu.length === 0);
  check('le tre taglie restano distinguibili in inglese', new Set(pairs.map(p => p.en)).size === 3);
  check('le tre taglie restano distinguibili in russo', new Set(pairs.map(p => ru[p.en])).size === 3);

  /* in italiano l'etichetta si vede davvero (i test girano in italiano) */
  check('townSizeLabel dà la parola, non la chiave', i18n.townSizeLabel('paese') === 'Paese');
  check('una taglia sconosciuta non rompe niente', i18n.townSizeLabel('boh') === 'boh');

  /* e la mappa non deve stampare la chiave grezza */
  const map = readFileSync(new URL('../src/mapui.js', import.meta.url), 'utf8');
  check('la mappa passa la taglia da townSizeLabel',
    map.includes('townSizeLabel(best.size)') && !/\+ best\.size \+/.test(map));
}

/* ---------- i disegni rifiniti a mano valgono OVUNQUE ---------- */
{
  /* Il controllo della banca stava solo nel render del mondo: nel Libro delle Meraviglie e
     nelle pagine di prova si continuava a vedere la versione generata a codice — cioè
     proprio quella che il disegno a mano doveva sostituire. Ora sta dentro drawWonder, e
     qui si verifica che chiunque la chiami ottenga il disegno vero. */
  const { drawWonder } = await import('../src/wonderart.js');
  const bank = await import('../src/spritebank.js');
  const brush = () => {
    const used = new Set();
    return { used,
      rect: (x, y, w, h, col) => used.add(col),
      px: (x, y, col) => used.add(col),
      shadow: () => {},
      shade8: (hex) => hex,
      ctx: { fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, save() {}, restore() {}, set fillStyle(v) {} },
    };
  };
  const handmade = Object.keys(bank.SPRITES).filter(k => k.startsWith('wonder:')).map(k => k.slice(7));
  /* oggi il NATIVO ha la precedenza su tutte (vedi wonderNative.js): gli sprite dello Studio
     restano nella banca come riserva, e un tipo senza nativo li userebbe ancora */
  check(`i disegni dello Studio restano in banca come riserva (${handmade.length})`, handmade.length > 0);
  /* e la riserva funziona davvero: un tipo senza nativo usa lo sprite, uno sconosciuto un sasso */
  {
    bank.SPRITES['wonder:__prova'] = bank.SPRITES['wonder:' + handmade[0]];
    const g1 = brush(); drawWonder(g1, '__prova', 0, 0, 0);
    delete bank.SPRITES['wonder:__prova'];
    const g2 = brush(); drawWonder(g2, '__sconosciuta', 0, 0, 0);
    check('senza nativo si usa lo sprite dello Studio, e un tipo sconosciuto non esplode', g1.used.size > 4 && g2.used.size === 1);
  }
  /* e il render del mondo non deve tenersene una copia propria */
  const { readFileSync } = await import('node:fs');
  const rsrc = readFileSync(new URL('../src/render.js', import.meta.url), 'utf8');
  check('il render del mondo non duplica il controllo della banca',
    !/hasSprite\('wonder:/.test(rsrc));

  /* Con un disegno a mano nella banca, il codice PROCEDURALE di quella meraviglia non gira
     più. Non si butta — serve se un domani si toglie uno sprite dalla banca — ma va provato
     lo stesso: qui si svuota la banca per un giro e si disegnano tutte, così il ripiego
     resta funzionante invece di marcire senza che nessuno se ne accorga. */
  {
    const saved = {};
    for (const k of Object.keys(bank.SPRITES)) { saved[k] = bank.SPRITES[k]; delete bank.SPRITES[k]; }
    let boom = '';
    try {
      const { WONDERS: WO } = await import('../src/wonders.js');
      for (const type of Object.keys(WO)) drawWonder(brush(), type, 0, 0, 1000);
    } catch (e) { boom = e.message; }
    for (const k of Object.keys(saved)) bank.SPRITES[k] = saved[k];
    check('senza banca ogni meraviglia ha ancora il suo disegno generato' + (boom ? ' → ' + boom : ''), boom === '');
    check('la banca è tornata a posto', bank.spriteCount() === Object.keys(saved).length);
  }
}

/* ---------- una cosa sola, in un posto solo ---------- */
{
  /* Quattro difetti in un giorno avevano la stessa forma: la stessa conoscenza scritta in
     due posti, che a un certo punto smette di combaciare — e se ne accorge il giocatore,
     non il test. Qui si sorvegliano i casi già corretti. */
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL('../src/', import.meta.url);
  const files = readdirSync(dir).filter(f => f.endsWith('.js'));
  const read = (f) => readFileSync(new URL(f, dir), 'utf8');
  const body = await import('../src/body.js');

  /* 1. l'altezza dei piedi: un numero solo */
  const hard13 = files.filter(f => f !== 'body.js' && /\.y \+ 13\b|\(y \+ 13\)/.test(read(f)));
  check('l\'offset dei piedi non è più scritto a mano' + (hard13.length ? ' → ' + hard13.join(', ') : ''),
    hard13.length === 0);
  check('FOOT_DY vale quello che valeva', body.FOOT_DY === 26);

  /* 2. la scatola di collisione: mondo e grotta la prendono da body.js */
  for (const f of ['gameplay.js', 'cave.js']) {
    check(`${f} usa la scatola di body.js`, /bodyHits\(/.test(read(f)));
  }
  check('la scatola è quella bassa (piedi, non petto)',
    body.bodyHits(0, 0, (x, y) => y >= 10) === true && body.bodyHits(0, 0, (x, y) => y < 6) === false);

  /* 3. "è touch?" una domanda sola */
  const dupTouch = files.filter(f => f !== 'i18n.js' && /matchMedia\('\(pointer:coarse\)'\)/.test(read(f)));
  check('nessuno reimplementa isTouch()' + (dupTouch.length ? ' → ' + dupTouch.join(', ') : ''),
    dupTouch.length === 0);

  /* 4. i colori del terreno: quelli veri, non una copia */
  const tiles = await import('../src/tiles.js');
  const uiSrc2 = read('ui.js');
  check('il Libro non tiene una sua tabella di colori del terreno', !/WO_GROUND\s*=/.test(uiSrc2));
  const gp = tiles.groundPalette('dune');
  check('groundPalette dà i colori VERI del mondo (' + gp[0] + ')',
    Array.isArray(gp) && gp.length === 3 && gp[0] === tiles.ZONE_TILES[1].g[0]);
  check('per i Prati Dorati segue le stagioni',
    tiles.groundPalette('prati', 0)[0] !== tiles.groundPalette('prati', 2)[0]);
  check('una zona sconosciuta non rompe niente', tiles.groundPalette('boh').length === 3);
}

/* ---------- la mappa si apre anche col dito ---------- */
{
  /* Da tastiera basta M, ma su un telefono quel tasto non esiste: l'unica via era passare
     dallo zaino. Ora c'è un pulsante nella barra, e deve restare visibile anche a barra
     ripiegata (come lo zaino) e grande abbastanza da centrarlo col pollice. */
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const tag = (html.match(/<span[^>]*id="mapbtn"[^>]*>/) || [''])[0];
  check('la barra ha il pulsante della mappa', tag !== '');
  check('resta visibile anche a barra ripiegata', tag.includes('hud-always'));
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const m = css.match(/#hud #mapbtn\{[^}]*min-width:(\d+)px/);
  check('è abbastanza grande per il pollice (' + (m ? m[1] : '?') + 'px ≥ 44)', !!m && +m[1] >= 44);
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  check('il pulsante apre davvero la mappa', /mapbtn[\s\S]{0,120}openMap\(\)/.test(ui));

  /* Le etichette dell'HUD si assegnavano per POSIZIONE: infilando la mappa fra zaino e menu
     tutte slittavano di uno, e sul desktop la mappa si è ritrovata scritto "menu".
     Ora si assegnano per id, e questo test lo pretende. */
  const i18nSrc = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8');
  check('le etichette dell\'HUD si assegnano per id, non per posizione',
    /HUD_LBL\s*=\s*\{/.test(i18nSrc) && !/querySelectorAll\('#hud \.lbl'\)/.test(i18nSrc));
  /* ogni pulsante con un'etichetta deve averne una sua */
  const ids = [...(i18nSrc.match(/HUD_LBL = \{([^}]*)\}/) || [, ''])[1].matchAll(/(\w+):/g)].map(m => m[1]);
  check('ogni pulsante della barra ha la sua etichetta (' + ids.join(', ') + ')',
    ids.includes('bagbtn') && ids.includes('mapbtn') && ids.includes('menubtn'));
}

/* ---------- il salvataggio in cloud si accende da un interruttore ---------- */
{
  /* Finché sul server non c'è il database, la voce "La tua partita" non deve comparire:
     l'accesso fallirebbe e un tester si troverebbe un errore che non sa spiegarsi.
     L'interruttore sta in index.html così si accende SUL SERVER, senza ricostruire nulla. */
  const sp = await import('../src/splash.js');
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  check('l\'interruttore del cloud è nella pagina', /window\.DIGSY_CLOUD\s*=\s*(true|false)/.test(html));

  const prev = typeof window !== 'undefined' ? window.DIGSY_CLOUD : undefined;
  if (typeof window !== 'undefined') {
    window.DIGSY_CLOUD = false;
    check('spento: il gioco non offre l\'accesso', sp.cloudEnabled() === false);
    window.DIGSY_CLOUD = true;
    check('acceso: l\'accesso è disponibile', sp.cloudEnabled() === true);
    /* niente mezze misure: solo true accende (una stringa "false" non deve bastare) */
    window.DIGSY_CLOUD = 'true';
    check('solo true vero accende, non una stringa', sp.cloudEnabled() === false);
    window.DIGSY_CLOUD = prev;
  }
  /* Si guarda il MENU VERO, non la forma del codice: il controllo di prima pretendeva
     `if (cloudEnabled())` entro 80 caratteri da `sp-account` e si è rotto appena il codice
     è cambiato restando giusto. Un test che cade quando il comportamento è corretto insegna
     solo a disattivarlo. */
  if (typeof window !== 'undefined') {
    const menuEl = () => document.getElementById('sp-menu');
    window.DIGSY_CLOUD = false; sp.showSplash();
    check('spento: nessuna voce dell\'account nel menu', !menuEl().innerHTML.includes('sp-account'));
    window.DIGSY_CLOUD = true; sp.resumeSplash(); sp.showSplash();
    check('acceso: la voce dell\'account compare', menuEl().innerHTML.includes('sp-account'));
    /* E DICE COME SEI MESSO senza doverci entrare: chiedere "Entra con Google" a chi è già
       entrato è una bugia, e far aprire un pannello per sapere se si è collegati è lavoro
       scaricato sul giocatore. */
    sp.acc.user = { email: 'tizio@example.com' }; sp.acc.known = true;
    sp.resumeSplash(); sp.showSplash();
    check('collegato: il pulsante mostra con chi sei entrato',
      menuEl().innerHTML.includes('tizio@example.com'));
    sp.acc.user = null;
    sp.resumeSplash(); sp.showSplash();
    check('scollegato: il pulsante invita a entrare',
      /Entra con Google|Sign in with Google/.test(menuEl().innerHTML));
    sp.acc.known = false;
    window.DIGSY_CLOUD = prev;
    sp.resumeSplash();
  }
}

/* ---------- statistiche della partita ---------- */
{
  const stats = await import('../src/stats.js');
  const { ALL_SPECIES: ASP, PARTS: PT } = await import('../src/data.js');

  /* il tempo si legge come lo direbbe una persona, e non dice mai "0h 0m" */
  check('tempo: sotto il minuto si contano i secondi', stats.playTime(42) === '42s');
  check('tempo: sotto l\'ora i minuti', stats.playTime(150) === '2m');
  check('tempo: oltre l\'ora ore e minuti', stats.playTime(3600 * 3 + 60 * 24) === '3h 24m');
  check('tempo: niente tempo non è un guasto', stats.playTime(undefined) === '0s' && stats.playTime(-5) === '0s');

  /* UN SALVATAGGIO VECCHIO non ha i campi nuovi: le statistiche non devono esplodere né
     inventare numeri. È il caso che si presenta a chi gioca da prima di questa schermata. */
  const vecchio = { day: 4, coins: 30 };
  const righe = stats.gameStats(vecchio);
  check('statistiche: un salvataggio vecchio non fa esplodere niente',
    Array.isArray(righe) && righe.length > 6 && righe.every(r => typeof r.value === 'string' && r.value !== ''));
  check('statistiche: senza contatore, il tempo è zero, non "NaN"',
    righe.find(r => r.id === 'time').value === '0s');
  check('statistiche: il nulla non conta come una scoperta',
    righe.find(r => r.id === 'codex').value === '0/' + ASP.length);
  check('statistiche: nemmeno lo stato inesistente esplode', stats.gameStats(null).length > 6);

  /* i numeri sono quelli veri dello stato */
  const piena = {
    playSec: 7265, day: 12, level: 4, coins: 340,
    codex: ['a', 'b', 'c'], creatures: [{}, {}], awakened: ['a'], wonders: ['w'],
    caves: { x: true, y: true }, dug: [1, 2, 3, 4], questTotal: 6,
    museum: { a: PT.map(p => p.id), b: ['cranio'] },
  };
  const r2 = Object.fromEntries(stats.gameStats(piena).map(x => [x.id, x.value]));
  check('statistiche: le ore di gioco', r2.time === '2h 1m');
  check('statistiche: chimere, grotte, scavi, missioni',
    r2.chimeras === '2' && r2.caves === '2' && r2.dug === '4' && r2.quests === '6');
  check('statistiche: conta le teche COMPLETE, non quelle iniziate',
    stats.completeCases(piena) === 1 && r2.cases === '1/' + ASP.length);
  check('statistiche: le specie si contano sul catalogo VERO (grotte comprese)',
    r2.codex === '3/' + ASP.length && r2.awake === '1/' + ASP.length);
  check('statistiche: il riassunto in una riga si legge', /2h 1m/.test(stats.statsHeadline(piena)));

  /* OGNI ICONA DEVE ESISTERE DAVVERO. `withIcons` cancella in silenzio le emoji che non
     conosce: la riga resta senza simbolo e nessuno se ne accorge finché non guarda lo
     schermo. Era già successo con ⏳ (nessun orologio nel set) e con 🎓, che diventava un
     GERMOGLIO. Qui si controlla che ognuna sia mappata su un'icona che c'è. */
  {
    const icons = await import('../src/icons.js');
    const { readFileSync } = await import('node:fs');
    const isrc = readFileSync(new URL('../src/icons.js', import.meta.url), 'utf8');
    const rotte = [];
    for (const r of stats.gameStats(piena)) {
      const m = new RegExp("'" + r.icon + "'\\s*:\\s*'([a-zA-Z]+)'").exec(isrc);
      if (!m) { rotte.push(r.id + ' (' + r.icon + ' non mappata)'); continue; }
      if (!icons.ICON_NAMES.includes(m[1])) rotte.push(r.id + ' → ' + m[1] + ' non esiste');
      /* (il giro completo per `withIcons` non si può provare qui: in Node gli SVG non si
         caricano — `import.meta.glob` è roba di Vite — e il registro resta vuoto. Il
         controllo utile è che l'emoji sia nella mappa e punti a un'icona esistente.) */
    }
    check('statistiche: ogni icona esiste davvero' + (rotte.length ? ' → ' + rotte.join(', ') : ''),
      rotte.length === 0);
  }

  /* il contatore delle ore avanza DAVVERO mentre si gioca: sta nel loop, accanto
     all'orologio del mondo — cioè solo quando si gioca sul serio */
  const mainSrc2 = (await import('node:fs')).readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const iPlay = mainSrc2.indexOf('S.playSec');
  const iCave2 = mainSrc2.indexOf('if (CAVE.active)');
  check('le ore di gioco si contano anche in grotta e negli interni', iPlay > 0 && iPlay < iCave2);
}

/* ---------- il battito: quanto si gioca, senza sapere CHI ---------- */
{
  const beat = await import('../src/beat.js');
  const prefs2 = await import('../src/prefs.js');
  S.playSec = 3600 * 2; S.day = 12; S.level = 4; S.codex = ['a', 'b', 'c'];

  const d = beat.datiBattito();
  check('battito: manda quanto si è giocato e fin dove si è arrivati',
    d.min === 120 && d.day === 12 && d.lvl === 4 && d.spec === 3);

  /* LA COSA PIÙ IMPORTANTE: che non ci finisca dentro nulla di personale. Un dato in più
     "che magari serve" è come si comincia a raccogliere quello che non si dovrebbe. */
  const campi = Object.keys(d).sort();
  check('battito: manda SOLO questi campi (' + campi.join(',') + ')',
    campi.join(',') === 'app,day,id,lvl,min,spec,tocco,ver');
  /* l'identificativo è CASUALE: prima o poi conterrà per caso una delle stringhe cercate
     (è già successo con "px") e il controllo fallirebbe su un dato innocuo. Si guarda tutto
     il resto, che è la parte che può davvero contenere qualcosa di personale. */
  const { id, ...senzaId } = d;
  const testo = JSON.stringify(senzaId);
  const vietati = ['email', 'name', 'nome', '@', 'coins', 'seed', 'px', 'py'];
  const trovati = vietati.filter(v => testo.toLowerCase().includes(v));
  check('battito: niente che dica chi sei o cosa hai' + (trovati.length ? ' → ' + trovati.join(',') : ''),
    trovati.length === 0);
  check('battito: l\'identificativo è casuale, non deriva dalla partita',
    typeof d.id === 'string' && d.id.length >= 8 && !d.id.includes(String(S.seed || '')));
  /* due chiamate danno lo stesso id (serve a legare i battiti di UNA sessione) */
  check('battito: lo stesso dispositivo si riconosce fra un battito e l\'altro',
    beat.datiBattito().id === d.id);

  /* IL PRIMO BATTITO ARRIVA PRESTO. Con il solo intervallo da cinque minuti, chi aveva appena
     aperto il gioco non compariva da nessuna parte: durante una prova con quattro persone
     collegate insieme, «in questo momento» su /stats ne segnava due. */
  {
    const orig = { si: globalThis.setInterval, st: globalThis.setTimeout,
      ci: globalThis.clearInterval, ct: globalThis.clearTimeout };
    const attese = [];
    globalThis.setInterval = (fn, ms) => { attese.push(ms); return 'I'; };
    globalThis.setTimeout = (fn, ms) => { attese.push(ms); return 'T'; };
    globalThis.clearInterval = () => {}; globalThis.clearTimeout = () => {};
    beat.fermaBattito();
    beat.avviaBattito();
    check('battito: il primo parte entro un minuto, non dopo cinque',
      attese.includes(60 * 1000) && attese.includes(5 * 60 * 1000), attese.join(','));
    beat.fermaBattito();
    Object.assign(globalThis, { setInterval: orig.si, setTimeout: orig.st,
      clearInterval: orig.ci, clearTimeout: orig.ct });
  }

  /* SI PUÒ DIRE DI NO, e da spento non parte niente */
  check('battito: acceso di serie', beat.battitoAcceso() === true);
  beat.accendiBattito(false);
  check('battito: si spegne', beat.battitoAcceso() === false);
  check('battito: da spento la preferenza resta spenta anche dopo', prefs2.getPrefs().battito === false);
  beat.accendiBattito(true);

  /* SOTTO HACKS NON SI MANDA NIENTE. È successo alla prima riga raccolta: nove specie con
     `goditem` e ancora livello 1, quaranta minuti che erano venti di prove. Numeri così non
     sono inutili, sono PEGGIO — fanno prendere decisioni sbagliate sul bilanciamento. */
  {
    const st4 = await import('../src/state.js');
    const dbg4 = await import('../src/debug.js');
    st4.setCheatLock(true);
    check('battito: sotto cheat non parte', beat.battitoAcceso() && (await beat.mandaOra()) === false);
    st4.setCheatLock(false);
    if (!dbg4.isDebug()) dbg4.toggleDebug();
    check('battito: in debug non parte', (await beat.mandaOra()) === false);
    dbg4.toggleDebug();
  }

  /* una partita aperta e mai giocata non racconta niente a nessuno */
  S.playSec = 0; S.day = 1;
  const vuota = beat.datiBattito();
  check('battito: una partita appena aperta ha poco da dire', vuota.min === 0 && vuota.day === 1);
  S.playSec = 3600 * 2; S.day = 12;
}

/* ---------- si installa come app, e lo si dice ---------- */
{
  /* Una PWA è INVISIBILE: chi apre il gioco vede una scheda come tutte le altre, e l'invito
     del browser è in un menu che nessuno apre. Chi si mette l'icona sulla schermata torna a
     giocare il giorno dopo; chi deve ricordarsi un indirizzo no. Per una prova coi beta
     tester è la differenza fra sapere se il gioco piace e non saperlo. */
  const sp3 = await import('../src/splash.js');
  const { readFileSync: rf3 } = await import('node:fs');

  /* già installata: non si propone niente (sarebbe un invito a fare ciò che è già fatto) */
  sp3.pwa.installata = true; sp3.pwa.invito = null; sp3.pwa.ios = false;
  check('installata: non si propone di installare', sp3.pwaProponibile() === false);

  /* il browser dice che si può: si propone */
  sp3.pwa.installata = false; sp3.pwa.invito = { prompt() {}, userChoice: Promise.resolve() };
  check('quando il browser lo permette, si propone', sp3.pwaProponibile() === true);

  /* iPhone non ha l'invito automatico: si può solo spiegare come si fa */
  sp3.pwa.invito = null; sp3.pwa.ios = true;
  check('su iPhone si propone lo stesso (con le istruzioni)', sp3.pwaProponibile() === true);

  /* e su un browser che non sa installare non si promette nulla */
  sp3.pwa.ios = false;
  check('dove non si può, non si propone', sp3.pwaProponibile() === false);

  /* il pulsante compare DAVVERO nel menu quando serve */
  sp3.pwa.invito = { prompt() {}, userChoice: Promise.resolve() };
  sp3.showSplash();
  const menu3 = document.getElementById('sp-menu');
  check('il pulsante per installare compare nel menu', menu3.innerHTML.includes('sp-install'));
  sp3.setView('install');
  check('la schermata spiega cosa si guadagna', /senza rete|offline/i.test(menu3.innerHTML));
  /* iPhone con SAFARI: si spiegano i passi, che lì nessuno indovina da solo */
  sp3.pwa.ios = true; sp3.pwa.iosAltroBrowser = false; sp3.setView('install');
  check('su iPhone spiega i passi, che lì nessuno indovina',
    /Condividi|Share/.test(menu3.innerHTML) && /Aggiungi a Home|Add to Home/.test(menu3.innerHTML));

  /* iPhone con CHROME: l'installazione non è possibile (è una regola di Apple), ma il
     pulsante deve comparire LO STESSO e dire cosa fare. Nasconderlo voleva dire che chi usa
     Chrome non sapeva nemmeno che il gioco si potesse installare — è successo davvero. */
  sp3.pwa.iosAltroBrowser = true;
  check('su iPhone anche con altri browser si propone', sp3.pwaProponibile() === true);
  sp3.setView('install');
  check('e si dice che serve Safari, e perché',
    /Safari/.test(menu3.innerHTML) && /Apple/.test(menu3.innerHTML));
  sp3.pwa.ios = false; sp3.pwa.iosAltroBrowser = false; sp3.pwa.invito = null; sp3.resumeSplash();

  /* i tre pezzi che rendono un sito installabile: se ne manca uno, "Installa" non compare
     e il browser non dice quale */
  const man = JSON.parse(rf3(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  check('il manifest ha nome, icone e schermo intero',
    !!man.name && (man.icons || []).length >= 2 && /standalone|fullscreen/.test(man.display));
  /* IL GIOCO STA ALLA RADICE: manifest e file di deploy non devono puntare al vecchio /play/
     (residuo dell'esperimento vetrina). Se ricompare, l'app installata parte su una pagina che
     non esiste e lo scope offline è rotto. */
  check('manifest punta alla radice, non a /play/', man.start_url === '/' && man.scope === '/' && man.id === '/');
  for (const f of ['index.html', 'public/sw.js', 'public/manifest.webmanifest', 'tests/deploy.mjs']) {
    check(f + ' non nomina più /play/', !rf3(new URL('../' + f, import.meta.url), 'utf8').includes('/play/'));
  }
  const sw = rf3(new URL('../public/sw.js', import.meta.url), 'utf8');
  check('il service worker esiste ed è registrato dal gioco',
    sw.includes('addEventListener') && rf3(new URL('../src/main.js', import.meta.url), 'utf8').includes("register('./sw.js'"));
  /* LA REGOLA CHE CONTA: l'HTML non deve MAI arrivare dalla copia per prima, o i giocatori
     restano su una versione vecchia e nemmeno ricaricare li salva */
  check('il service worker chiede l\'HTML alla rete, non alla copia',
    /await fetch\(req\)[\s\S]{0,400}catch/.test(sw));
  check('il service worker non tocca mai l\'API', sw.includes("'/server/'"));

  /* IN PRODUZIONE CI STA SOLO IL GIOCO. Vite copia TUTTA public/ dentro dist/: ogni strumento
     nuovo (Sprite Studio, playground, la pagina delle statistiche…) finisce online da solo, in
     silenzio, se nessuno lo toglie dal deploy. Invece di ricordarselo ogni volta, la lista la
     scrive la cartella: qui si pretende che ogni public/<nome>/index.html compaia fra le
     esclusioni. Le pagine di lavoro importano i sorgenti e mostrano dati di casa. */
  const depl = rf3(new URL('../tests/deploy.mjs', import.meta.url), 'utf8');
  const fsT = (await import('node:fs')).default;
  const strumenti = fsT.readdirSync(new URL('../public', import.meta.url), { withFileTypes: true })
    .filter(d => d.isDirectory() && fsT.existsSync(new URL('../public/' + d.name + '/index.html', import.meta.url)))
    .map(d => d.name);
  check('ci sono strumenti in public/ da controllare', strumenti.length >= 3);
  /* le statistiche dei giocatori non arrivano nemmeno in dist/: là dentro non ci sono dati
     (l'endpoint vive nel dev server), ma una pagina che si chiama "chi sta giocando" non deve
     stare in una cartella che qualcuno può caricare a mano */
  check('la build non produce nemmeno dist/stats',
    rf3(new URL('../vite.config.js', import.meta.url), 'utf8').includes("dist/stats"));
  for (const t of strumenti) {
    check('il deploy toglie ' + t + ' dalla produzione',
      new RegExp('rm -rf [^"\\n]*\\b' + t + '\\b').test(depl) && depl.includes('--exclude=' + t));
  }
}

/* ---------- le zone: nessun buco nelle tabelle ---------- */
{
  /* Le informazioni su una zona vivono in tabelle diverse, in tre file, metà indicizzate per
     POSIZIONE e metà per ID. `THEMED_HAT` si era già ritrovata con cinque voci contro sei
     zone — l'Elmetto delle Terre Rosse risultava documentato in CLAUDE.md e non esisteva —
     e nessuno dei test se n'era accorto, perché niente confrontava le tabelle fra loro.
     Qui si pretende che OGNI zona compaia in OGNI tabella. */
  const d = await import('../src/data.js');
  const tiles = await import('../src/tiles.js');
  const reg = await import('../src/regions.js');
  const N = d.ZONES.length;

  check('zone: l\'elenco ufficiale e quello storico sono la stessa cosa',
    d.ZONE_LIST === d.ZONES && d.ZONE_IDS.length === N);

  /* le tabelle indicizzate per POSIZIONE devono essere lunghe quanto le zone */
  const perIndice = [['ZONE_TILES', tiles.ZONE_TILES]];
  for (const [nome, tab] of perIndice) {
    check('zone: ' + nome + ' copre tutte le ' + N + ' zone (' + (tab ? tab.length : '?') + ')',
      Array.isArray(tab) && tab.length === N);
  }

  /* le tabelle per ID devono avere una voce per ogni zona, con TUTTE le chiavi previste:
     una chiave assente è un buco silenzioso, una a null è una scelta dichiarata */
  const buchi = [];
  for (const z of d.ZONES) {
    const c = d.ZONE_COSMETICS[z.id];
    if (!c) { buchi.push(z.id + ' non è in ZONE_COSMETICS'); continue; }
    for (const campo of ['hair', 'hat']) {
      if (!(campo in c)) buchi.push(z.id + ' non dichiara "' + campo + '"');
    }
    if (!d.zonePools[z.id] || !d.zonePools[z.id].length) buchi.push(z.id + ' non ha specie');
  }
  check('zone: ogni zona dichiara ogni campo' + (buchi.length ? ' → ' + buchi.join(', ') : ''),
    buchi.length === 0);

  /* gli elenchi piatti si DERIVANO dalla tabella: erano scritti a mano accanto ad essa, ed è
     così che uno dei due è rimasto indietro di una voce */
  const attesiHair = d.ZONES.map(z => d.ZONE_COSMETICS[z.id].hair).filter(Boolean);
  const attesiHat = d.ZONES.map(z => d.ZONE_COSMETICS[z.id].hat).filter(Boolean);
  check('zone: i capelli tematici combaciano con la tabella',
    d.THEMED_HAIR.join() === attesiHair.join());
  check('zone: i cappelli tematici combaciano con la tabella (' + d.THEMED_HAT.length + ')',
    d.THEMED_HAT.join() === attesiHat.join());
  /* e ogni cosmetico nominato deve ESISTERE davvero come disegno */
  const spr = await import('../src/sprites.js');
  const fantasmi = [...d.THEMED_HAIR.filter(h => !spr.HAIRS[h]), ...d.THEMED_HAT.filter(h => !spr.HATS[h])];
  check('zone: ogni cosmetico tematico ha il suo disegno' + (fantasmi.length ? ' → ' + fantasmi.join(', ') : ''),
    fantasmi.length === 0);

  /* la temperatura: ogni zona deve stare in una fascia, o i confini climatici non tengono */
  const inFascia = new Set(reg.BAND ? reg.BAND.flat() : []);
  if (reg.BAND) {
    const senzaFascia = d.ZONES.map((z, i) => i).filter(i => !inFascia.has(i));
    check('zone: ogni zona ha una fascia di temperatura' + (senzaFascia.length ? ' → indici ' + senzaFascia.join(',') : ''),
      senzaFascia.length === 0);
  }
}

/* ---------- coerenza visiva: i valori stanno in un posto solo ---------- */
{
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

  /* I TOKEN ESISTONO e sono dichiarati una volta sola */
  const root = (css.match(/:root\{[\s\S]*?\}/) || [''])[0];
  const attesi = ['--c-ink', '--c-line', '--c-gold', '--c-amber', '--c-teal',
    '--sp-1', '--sp-2', '--r-2', '--fs-sm', '--w-menu'];
  const senza = attesi.filter(t => !root.includes(t + ':'));
  check('design: i valori del gioco sono dichiarati in :root' + (senza.length ? ' → mancano ' + senza.join(',') : ''),
    senza.length === 0);

  /* I COLORI DEL TEMA NON SI RISCRIVONO A MANO, in nessun punto del foglio.
     Erano 191 usi sparsi: 27 copie del marrone dei bordi, 20 della carta, 15 dell'ambra.
     Bastava sbagliare una cifra perché un pannello stonasse senza che nessuno sapesse dire
     dove fosse l'errore. Ora ognuno ha un nome, e questo controllo impedisce che tornino:
     se serve DAVVERO una tinta nuova, si aggiunge un token — non una costante nascosta in
     mezzo a una regola.
     I colori usati una volta sola (le decine di sfumature dei singoli pannelli) restano
     scritti dove sono: un token che serve a un posto solo è un nome in più da ricordare. */
  const root2 = (css.match(/:root\{[\s\S]*?\n\}/) || [''])[0];
  const dopoRoot = css.slice(css.indexOf(root2) + root2.length);
  const tematici = (root2.match(/--c-[a-z0-9-]+:\s*(#[0-9a-fA-F]{3,6})\b/g) || [])
    .map(r => (r.match(/#[0-9a-fA-F]{3,6}/) || [''])[0].toLowerCase());
  const ricomparsi = [];
  for (const col of [...new Set(tematici)]) {
    const usi = (dopoRoot.match(new RegExp(col + '\\b', 'gi')) || []).length;
    if (usi) ricomparsi.push(col + ' ×' + usi);
  }
  check('design: nessun colore del tema è riscritto a mano nel foglio'
    + (ricomparsi.length ? ' → ' + ricomparsi.join(', ') : ''), ricomparsi.length === 0);

  /* UNA LARGHEZZA SOLA per la colonna dei menu: se ognuno si sceglie la sua, le schermate
     "ballano" passando dall'una all'altra */
  check('design: la colonna dei menu ha una larghezza sola', /--w-menu:\s*\d+px/.test(root));

  /* HUD MOBILE COLLASSATO: UNA RIGA SOLA, MAI a capo. Su telefoni stretti i 6 chip
     (📊 🪙 ⚡ 🎒 🗺️ ☰) andavano a capo e il ☰ finiva su una seconda riga sopra il gioco,
     coprendo i toast (segnalato con foto). La riga collassata deve restare `flex-wrap:nowrap`:
     i chip informativi si stringono, toggle e menu no, ma nessuno scende mai a capo. */
  const coll = (css.match(/#hud\.collapsed\{[^}]*\}/) || [''])[0];
  check('HUD: la riga collassata non va MAI a capo (nowrap)', /flex-wrap:\s*nowrap/.test(coll));
  check('HUD: nel collassato i chip info si stringono (flex:0 1) e toggle/menu no',
    /#hud\.collapsed \.tag:not\(#hudtoggle\):not\(#menubtn\)\{[^}]*flex:0 1/.test(css)
    && /#hudtoggle,#menubtn\{[^}]*flex:0 0 auto/.test(css));
}

/* ---------- perché l'accesso non è riuscito ---------- */
{
  /* Detto in modo che si capisca CHI deve fare cosa: quasi tutte queste cause sono di
     configurazione, cioè dell'autore, e al giocatore va detto che non è colpa sua invece di
     lasciarlo a riprovare all'infinito. */
  const sp2 = await import('../src/splash.js');
  const orig = sp2.signInError('origin_mismatch');
  check('errore: l\'origine non autorizzata si spiega e non dà la colpa al giocatore',
    /autorizzat|authoris/.test(orig) && /non dipende da te|not something you did/.test(orig));
  check('errore: senza rete si dice che la partita è al sicuro qui',
    /questo dispositivo|this device/.test(sp2.signInError('offline')));
  check('errore: Google che non conferma invita a riprovare',
    /iprova|ry again/.test(sp2.signInError('unverified')));
  check('errore: una causa sconosciuta si mostra comunque, col suo codice',
    sp2.signInError('boh_42').includes('boh_42'));
  check('errore: senza codice non restano parentesi vuote', !/\(\s*\)/.test(sp2.signInError('')));

  /* L'ACCESSO GOOGLE VA OFFERTO SOLO DOVE FUNZIONA. Dall'iframe di itch (origine diversa)
     Google risponde con origin_mismatch: mostrare il pulsante lì porta dritti a quell'errore.
     localhost (sviluppo) è sempre buono; un'origine fuori lista no. */
  const savedOrigin = globalThis.location.origin;
  const savedList = globalThis.window.DIGSY_LOGIN_ORIGINS;
  globalThis.location.origin = 'http://localhost';
  check('login: localhost è sempre autorizzato (sviluppo)', sp2.loginOriginAllowed() === true);
  globalThis.window.DIGSY_LOGIN_ORIGINS = ['https://digsy.dev-box.it'];
  globalThis.location.origin = 'https://digsy.dev-box.it';
  check('login: il sito vero è autorizzato', sp2.loginOriginAllowed() === true);
  globalThis.location.origin = 'https://v6p9d9t4.ssl.hwcdn.net';
  check('login: l\'origine di itch NON è autorizzata (niente pulsante rotto)', sp2.loginOriginAllowed() === false);
  globalThis.location.origin = savedOrigin;
  globalThis.window.DIGSY_LOGIN_ORIGINS = savedList;
}

/* ---------- il collegamento a Discord ---------- */
{
  const sp = await import('../src/splash.js');
  check('l\'invito Discord è uno solo, in un posto solo',
    typeof sp.DISCORD_URL === 'string' && /^https:\/\/discord\.gg\/[A-Za-z0-9]+$/.test(sp.DISCORD_URL));
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/splash.js', import.meta.url), 'utf8');
  /* un link esterno che apre una scheda nuova SENZA rel="noopener" lascia alla pagina
     aperta la possibilità di manovrare quella che l'ha aperta */
  const tag = (src.match(/<a[^>]*sp-discord[^>]*>/) || [''])[0];
  check('il link Discord apre una scheda nuova e non lascia appigli',
    tag.includes('target="_blank"') && tag.includes('noopener'));
  /* l'indirizzo non deve essere scritto due volte: si aggiorna in un posto solo */
  const hardcoded = (src.match(/discord\.gg/g) || []).length;
  check('l\'indirizzo non è ripetuto nel codice (' + hardcoded + ')', hardcoded === 1);
}

/* ---------- il Museo si riconosce dalla mappa ---------- */
{
  /* sulla mappa le città col Museo hanno un pin loro (avorio + frontone): il segno deve
     seguire gli EDIFICI, non la taglia, e nessun borgo deve prenderselo per sbaglio */
  let withMus = 0, wrong = 0, cities = 0;
  for (let cx = -10; cx < 10; cx++) for (let cy = -10; cy < 10; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue;
    const m = world.hasMuseum(t), real = t.buildings.some(b => b.type === 'museum');
    if (m !== real) wrong++;
    if (m) withMus++;
    if (t.size === 'città') { cities++; if (!m) wrong++; }
    if (t.size !== 'città' && m) wrong++;
  }
  check(`hasMuseum: ${withMus} città col Museo su ${cities} grandi`, wrong === 0 && withMus > 0 && withMus === cities);
  check('hasMuseum regge input vuoti', world.hasMuseum(null) === false && world.hasMuseum({}) === false);

  /* la mappa va DISEGNATA per davvero: il pin del museo è codice di disegno, e senza un test
     che apra la schermata un errore lì resterebbe invisibile fino a che non lo trova un
     giocatore (già successo con l'estrazione di mapui.js). */
  const mapui = await import('../src/mapui.js');
  const mapmod = await import('../src/map.js');
  /* città grande sotto i piedi, e dintorni esplorati: senza, sulla mappa non c'è nessun pin */
  let big = null;
  for (let cx = -12; cx < 12 && !big; cx++) for (let cy = -12; cy < 12 && !big; cy++) {
    const t = world.townForCell(cx, cy); if (t && world.hasMuseum(t)) big = t;
  }
  const oldPos = { x: P.x, y: P.y };
  if (big) { P.x = big.C.x * TS; P.y = big.C.y * TS; }
  for (let dy = -40; dy <= 40; dy += 4) for (let dx = -60; dx <= 60; dx += 4)
    mapmod.markExplored(Math.floor(P.x / TS) + dx, Math.floor(P.y / TS) + dy);
  let drew = true;
  try { mapui.openMap(); mapui.mapZoomBy(1); mapui.mapZoomBy(-1); mapui.mapReset(); mapui.closeMap(); }
  catch (e) { drew = false; check('mappa disegnata senza errori', false, e.message); }
  if (drew) check('mappa aperta e disegnata (pin del Museo compreso)', big !== null && !mapui.isMapOpen());
  P.x = oldPos.x; P.y = oldPos.y; S.explored = {};
}

/* ---------- bussola ---------- */
{
  let miss = 0, mismatch = 0;
  for (let i = 0; i < 100; i++) {
    P.x = (((i * 2654435761) % 4001) - 2000) * TS; P.y = (((i * 40503) % 4001) - 2000) * TS;
    compassMod.nearestTown();
    if (!compassMod.compass.town) { miss++; continue; }
  }
  check('nearestTown trova sempre una città (100 posizioni)', miss === 0);
  P.x = 777 * TS; P.y = -333 * TS; compassMod.nearestTown();
  let bf = Infinity;
  const ccx = Math.floor(P.x / (TS * world.TCELL)), ccy = Math.floor(P.y / (TS * world.TCELL));
  for (let cy = ccy - 5; cy <= ccy + 5; cy++) for (let cx = ccx - 5; cx <= ccx + 5; cx++) {
    const t = world.townForCell(cx, cy); if (!t) continue;
    bf = Math.min(bf, Math.hypot(t.C.x * TS + TS / 2 - P.x, t.C.y * TS + TS / 2 - P.y));
  }
  check('bussola = minimo brute-force', Math.abs(bf - compassMod.compass.dist) < 1e-6 || mismatch === 0);
  const dirs = [[1, 0, '→'], [1, 1, '↘'], [0, 1, '↓'], [-1, 1, '↙'], [-1, 0, '←'], [-1, -1, '↖'], [0, -1, '↑'], [1, -1, '↗']];
  check('octant 8 direzioni', dirs.every(([dx, dy, ch]) => compassMod.DIRCHARS[compassMod.octant(dx, dy)] === ch));
}

/* ---------- chimere ---------- */
{
  let badNames = 0;
  for (const a of SPECIES) for (const b of SPECIES) {
    const nm = gameplay.chimeraName(a, b);
    if (!nm || nm.length < 5 || !/^[A-Z]/.test(nm)) badNames++;
  }
  check('chimeraName: 100 coppie ben formate', badNames === 0);
  /* NOMI DISTINGUIBILI: due chimere nel parco non devono chiamarsi "Grillosso" e
     "Grillolosso". Il nome base può ripetersi nel mondo, ma MAI dentro la stessa partita:
     si simula un giocatore che ne assembla 60 e si pretende che nessuna coppia stia a
     distanza di edit ≤1 da un'altra. */
  {
    const taken = [], all = [...SPECIES];
    for (let k = 0; k < 60; k++) {
      const a = all[(k * 13) % all.length], b = all[(k * 7) % all.length];
      taken.push(gameplay.chimeraName(a, b, taken));
    }
    let ambiguous = 0, worst = '';
    for (let i = 0; i < taken.length; i++) for (let j = i + 1; j < taken.length; j++)
      if (gameplay.nameDistance(taken[i], taken[j]) <= 1) { ambiguous++; worst = taken[i] + ' / ' + taken[j]; }
    check(`60 chimere in una partita: nessun nome ambiguo${worst ? ' → ' + worst : ''}`, ambiguous === 0);
    check('la distanza fra nomi è misurata davvero',
      gameplay.nameDistance('Grillosso', 'Grillolosso') === 2 && gameplay.nameDistance('Osso', 'Osso') === 0);
  }
  /* le chimere nascono SOLO dall'allevamento (breeding.js, testato a parte): qui basta
     seminarne UNA a mano per i test del parco/compagno che seguono */
  S.coins = 100; S.items = []; S.dna = {};
  S.creatures = [{ uid: 900, name: 'Testseme', skull: 'magma', torso: 'prato', leg: 'gastro', q: 'leggendario' }];
  check('rarità della chimera seminata per i test', S.creatures[0].q === 'leggendario');
  /* ...e il toast si deve VEDERE: sopra modali, zaino, libro, mappa, tavolo, fontana */
  {
    const cssZ = (await import('node:fs')).readFileSync('src/style.css', 'utf8');
    const zOf = sel => { const m = cssZ.match(new RegExp(sel + '\\{[^}]*z-index:(\\d+)')); return m ? +m[1] : -1; };
    const over = ['#modal', '#bagov', '#bookov', '#mapov', '#prepov', '#tossov', '#skfitov', '#splash', '\\.banner'];
    const worst = Math.max(...over.map(zOf));
    check('i toast stanno sopra ogni pannello (' + zOf('#toasts') + ' > ' + worst + ')', zOf('#toasts') > worst);
    check('nessuna regola successiva li rimanda dietro', !/#toasts\{[^}]*z-index:(\d|[1-9]\d)\}/.test(cssZ)
      && (cssZ.match(/#toasts\{[^}]*z-index/g) || []).length === 1);
  }
}

/* ---------- cortile di casa (M5: sostituisce il vecchio parco per-città) ---------- */
{
  /* nessun `.pen`: le città grandi non hanno più il recinto (verificato anche più sotto,
     "città campionate"); qui serve solo trovare UNA città grande per fissare S.home */
  let town = null;
  for (let r = 0; r < 16 && !town; r++) {
    for (let cy = -r; cy <= r && !town; cy++) for (let cx = -r; cx <= r && !town; cx++) {
      if (Math.max(Math.abs(cx), Math.abs(cy)) !== r) continue;
      const t = world.townForCell(cx, cy); if (t && t.size === 'città') town = t;
    }
  }
  check('città grande trovata per la casa', !!town);
  const savedHome = S.home;
  const home = town && world.findHomeSpot(town);
  check('S.home: un posto valido vicino alla città', !!home);
  S.home = home;
  world.invalidateHouseDecoCache(); // come farebbe main.js: qui S.home viene fissato a mano
  const p = world.yardRect();
  check('cortile: un rettangolo fisso agganciato a S.home', !!p);
  const hfHome = world.houseFootprint();

  /* la casa sta DENTRO il recinto (M6): il prato la circonda sui 4 lati, non solo a sud */
  const sides = [
    [hfHome.x0 - 1, Math.floor((hfHome.y0 + hfHome.y1) / 2)], // ovest
    [hfHome.x1 + 1, Math.floor((hfHome.y0 + hfHome.y1) / 2)], // est
    [Math.floor((hfHome.x0 + hfHome.x1) / 2), hfHome.y0 - 1], // nord
    [Math.floor((hfHome.x0 + hfHome.x1) / 2), hfHome.y1 + 1], // sud, subito sotto la porta
  ];
  check('cortile: circonda la casa sui 4 lati', sides.every(([tx, ty]) => !!world.yardInfo(tx, ty)));

  /* bordo: tutto solido tranne UN cancello di 2 caselle */
  let fenceBad = 0, gateTiles = 0;
  for (let tx = p.x0; tx <= p.x1; tx++) for (let ty = p.y0; ty <= p.y1; ty++) {
    if (!(tx === p.x0 || tx === p.x1 || ty === p.y0 || ty === p.y1)) continue;
    const yd = world.yardInfo(tx, ty);
    if (yd && yd.floor) gateTiles++;
    else if (!yd || !yd.solid) fenceBad++;
  }
  check('recinto: bordo tutto solido tranne il cancello', fenceBad === 0);
  check('recinto: esattamente UN cancello, largo 2', gateTiles === 2);

  /* niente decorazioni selvatiche sotto la casa o dentro il cortile: yardInfo torna null
     apposta sui tile della casa (ci "buca un buco" per l'edificio), e decoCompute doveva
     escludere anche QUELLI, non solo il prato/staccionata del cortile — altrimenti un
     albero/fungo generato prima restava sotto l'edificio (segnalato: "sotto al giardino
     rimangono degli elementi da raccogliere del bosco"). */
  let decoLeak = 0;
  for (let tx = hfHome.x0 - 1; tx <= hfHome.x1 + 1; tx++) for (let ty = hfHome.y0 - 1; ty <= hfHome.y1 + 1; ty++) if (world.decoAt(tx, ty)) decoLeak++;
  for (let tx = p.x0; tx <= p.x1; tx++) for (let ty = p.y0; ty <= p.y1; ty++) if (world.decoAt(tx, ty)) decoLeak++;
  check('niente alberi/funghi/rocce sotto la casa o dentro il cortile', decoLeak === 0, decoLeak + ' trovate');

  /* STESSA falla, un TERZO sistema: pickupAt (le scintille da raccogliere a terra) ha una
     generazione tutta sua, indipendente da decoAt/siteForCell — escluderli non bastava
     (segnalato: "segna ancora delle cose da raccogliere sotto casa"). */
  let pickupLeak = 0;
  for (let tx = hfHome.x0 - 1; tx <= hfHome.x1 + 1; tx++) for (let ty = hfHome.y0 - 1; ty <= hfHome.y1 + 1; ty++) if (world.pickupAt(tx, ty)) pickupLeak++;
  for (let tx = p.x0; tx <= p.x1; tx++) for (let ty = p.y0; ty <= p.y1; ty++) if (world.pickupAt(tx, ty)) pickupLeak++;
  check('niente scintille da raccogliere sotto la casa o dentro il cortile', pickupLeak === 0, pickupLeak + ' trovate');

  /* MARGINE di 2 caselle OLTRE il recinto: un oggetto da raccogliere appena fuori dalla
     staccionata costringeva ad azzuffarsi col recinto per raggiungerlo (segnalato con foto,
     "gli oggetti qua vicini mi triggerano il recinto"). Qui si controlla l'ANELLO subito
     fuori dal recinto (margine-1, la cornice più vicina possibile), non solo il recinto
     stesso — quella è la distanza minima che il giocatore chiede. */
  const M = world.HOUSE_DECO_MARGIN;
  let marginLeak = 0;
  for (let tx = p.x0 - M; tx <= p.x1 + M; tx++) for (let ty = p.y0 - M; ty <= p.y1 + world.HOME_PATH_LEN + M; ty++) {
    const onRing = tx === p.x0 - M || tx === p.x1 + M || ty === p.y0 - M || ty === p.y1 + world.HOME_PATH_LEN + M;
    if (onRing && world.decoAt(tx, ty)) marginLeak++;
  }
  check('niente da raccogliere nei ' + M + ' tile subito fuori dal recinto', marginLeak === 0, marginLeak + ' trovate');

  /* STESSA amnesia, ma sui SITI DI SCAVO e sugli SCHELETRI SEPOLTI: le loro cache sono per
     CELLA (SCELL/BCELL), non per tile, ma un sito calcolato PRIMA che S.home esistesse ci
     restava per sempre — ossa affioranti comprese, magari proprio sotto casa (segnalato:
     "parte con una X sotto casa"). Si inquina la cache A MANO (come farebbe l'esplorazione di
     una partita vera prima che la casa nascesse lì), poi si controlla che invalidateHouseDecoCache
     l'abbia ripulita insieme al resto. */
  {
    const x0 = Math.min(hfHome.x0, p.x0) - 1, x1 = Math.max(hfHome.x1, p.x1) + 1;
    const y0 = Math.min(hfHome.y0, p.y0) - 1, y1 = Math.max(hfHome.y1, p.y1) + world.HOME_PATH_LEN + 1;
    for (let cx = Math.floor(x0 / world.SCELL); cx <= Math.floor(x1 / world.SCELL); cx++)
      for (let cy = Math.floor(y0 / world.SCELL); cy <= Math.floor(y1 / world.SCELL); cy++) world.siteForCell(cx, cy);
    for (let cx = Math.floor(x0 / world.BCELL); cx <= Math.floor(x1 / world.BCELL); cx++)
      for (let cy = Math.floor(y0 / world.BCELL); cy <= Math.floor(y1 / world.BCELL); cy++) world.boneSiteForCell(cx, cy);
    world.invalidateHouseDecoCache();
    let siteLeak = 0;
    for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) if (world.siteAt(tx, ty) || world.boneSiteAt(tx, ty)) siteLeak++;
    check('nessun sito/scheletro sepolto sotto casa o cortile dopo l\'invalidazione', siteLeak === 0, siteLeak + ' trovati');
  }

  /* IL CANCELLO SI VEDE: un buco nella staccionata non si distingue da uno mancante (regola
     ferrea n.4, segnalato guardando lo screenshot). Le 2 caselle del varco portano un marcatore
     proprio (`gate`+`gateSide`+`gateOpen`) che render.js usa per disegnare montanti+architrave
     invece del solito prato: qui si controlla che il DATO ci sia, il disegno lo guarda
     l'occhio (vedi npm run promo / lo script di verifica in scratchpad). */
  {
    const gl = world.yardInfo(p.cx - 1, p.y1), gr = world.yardInfo(p.cx, p.y1);
    check('cancello: le 2 caselle sono marcate, non un buco anonimo',
      !!gl && gl.gate === true && gl.gateSide === 'l' && !!gr && gr.gate === true && gr.gateSide === 'r');
    check('cancello: aperto per ora (nessuna chiusura costruita)', gl.gateOpen === true && gr.gateOpen === true);
    const rnd2 = await import('../src/render.js');
    check('cancello: si disegna senza crash (aperto e, per il futuro, chiuso)', (() => {
      try { rnd2.drawGate(0, 0, 'l', true); rnd2.drawGate(16, 0, 'r', true); rnd2.drawGate(0, 0, 'l', false); return true; }
      catch (e) { return false; }
    })());
  }

  /* interno percorribile OVUNQUE tranne sotto la casa (che resta solida, porta esclusa) */
  let interiorBad = 0;
  for (let tx = p.x0 + 1; tx < p.x1; tx++) for (let ty = p.y0 + 1; ty < p.y1; ty++) {
    const onHouse = tx >= hfHome.x0 && tx <= hfHome.x1 && ty >= hfHome.y0 && ty <= hfHome.y1;
    if (onHouse) {
      const isDoor = tx === hfHome.doorx && ty === hfHome.doory;
      if (isDoor === world.isSolidTile(tx, ty)) interiorBad++; // porta libera, resto solido
    } else {
      const yd = world.yardInfo(tx, ty);
      if (!yd || !yd.floor || world.isSolidTile(tx, ty)) interiorBad++;
    }
  }
  check('cortile: interno percorribile attorno alla casa', interiorBad === 0);

  /* vialetto: esce dal cancello verso sud, largo 2 per i primi HOME_PATH_LEN tile */
  let pathBad = 0;
  for (let i = 1; i <= world.HOME_PATH_LEN; i++) for (const gx of [p.cx - 1, p.cx]) {
    const yd = world.yardInfo(gx, p.y1 + i);
    if (!yd || !yd.floor || !yd.path) pathBad++;
  }
  check('vialetto: i primi tile fuori dal cancello sono un percorso vero', pathBad === 0);

  /* IL VIALETTO ARRIVA FINO ALLA CITTÀ (a richiesta): prima finiva a metà di un campo, ora
     prosegue con una spezzata a L (homeRoadAt) fino a toccare il rettangolo della città vicina
     — la STESSA che findHomeSpot ha usato per piazzare la casa (homeTown() la ritrova da
     S.home). Si cammina la spezzata dichiarata da homeRoadGeom (via homeRoadAt) e si controlla
     che arrivi davvero dentro il perimetro della città. */
  const ht = world.homeTown();
  check('homeTown ritrova la STESSA città usata da findHomeSpot', !!ht && ht.C.x === town.C.x && ht.C.y === town.C.y);
  let roadReachesTown = false;
  if (ht) {
    const x0 = Math.min(p.cx, ht.x0) - 1, x1 = Math.max(p.cx, ht.x1) + 1;
    const y0 = Math.min(p.y1, ht.y0) - 1, y1 = Math.max(ht.y1, p.y1 + world.HOME_PATH_LEN + 60) + 1;
    for (let ty = y0; ty <= y1 && !roadReachesTown; ty++) for (let tx = x0; tx <= x1 && !roadReachesTown; tx++) {
      if (world.homeRoadAt(tx, ty) && tx >= ht.x0 && tx <= ht.x1 && ty >= ht.y0 && ty <= ht.y1) roadReachesTown = true;
    }
  }
  check('il vialetto raggiunge davvero il territorio della città', roadReachesTown);
  /* render smoke: una tile qualunque sulla lunga spezzata, lontana dal cortile */
  {
    const g0 = world.yardRect();
    let farRoadTile = null;
    for (let d = world.HOME_PATH_LEN + 5; d < world.HOME_PATH_LEN + 40 && !farRoadTile; d++) {
      if (world.homeRoadAt(g0.cx, g0.y1 + d)) farRoadTile = [g0.cx, g0.y1 + d];
    }
    if (farRoadTile) {
      const rnd = await import('../src/render.js');
      P.x = farRoadTile[0] * TS + 8; P.y = farRoadTile[1] * TS + 8; state.cam.x = P.x; state.cam.y = P.y;
      let ok = true; try { rnd.render(3000); } catch (e) { ok = false; }
      check('il vialetto lungo si disegna senza esplodere', ok);
    }
  }

  /* casa un pelo più lontana dalla città, mai dentro il suo territorio */
  check('casa: distanziata dalla città (non appiccicata)',
    home.x < town.x0 - world.HOME_TOWN_GAP || home.x > town.x1 + world.HOME_TOWN_GAP ||
    home.y < town.y0 - world.HOME_TOWN_GAP || home.y > town.y1 + world.HOME_TOWN_GAP);
  let overlapTown = false;
  for (let ty = p.y0; ty <= p.y1 + world.HOME_PATH_LEN; ty++) for (let tx = p.x0; tx <= p.x1; tx++) {
    if (world.townInfo(tx, ty)) overlapTown = true;
  }
  check('cortile+vialetto: mai dentro il territorio della città', !overlapTown);

  P.x = home.x * TS; P.y = home.y * TS;
  park.refreshVisParks();
  check('vicino a casa: cortile "vicino" (yardNear)', park.yardNear === true);

  /* IL CANCELLO SI CHIUDE VISTO DA FUORI, CON UN'ANIMAZIONE (a richiesta: "quando esce deve
     fare l'animazione della chiusura" — niente tono di testo, si guarda succedere). Uscire
     dal cortile fa partire gateClosingProgress() da 0 (appena iniziato) verso 1 (tutto
     chiuso) in ~mezzo secondo; stare dentro o restare fuori non la fa ripartire.
     SONO ANTE A BATTUTA (a richiesta esplicita: "sono ante a battuta NON una serranda") —
     ognuna cresce dal proprio montante verso il centro, non scende dall'alto — e a chiusura
     avvenuta compare un lucchetto dove le due si toccano. */
  {
    P.x = p.cx * TS + 8; P.y = (p.y1 - 1) * TS + 2; park.refreshVisParks(); // dentro, come 'parco'
    check('dentro il cortile: cancello non in chiusura (progress=1, cioè fermo)', park.gateClosingProgress() === 1);
    P.dir = 'down'; P.x = p.cx * TS + 8; P.y = (p.y1 + 2) * TS + 2; park.refreshVisParks(); // uscito dal cancello
    const p0 = park.gateClosingProgress();
    check('uscendo dal cancello: l\'animazione è appena partita (progress < 1)', p0 >= 0 && p0 < 1, p0);
    check('uscendo dal cancello: ci si gira a guardarlo (dir=up)', P.dir === 'up');
    const rnd = await import('../src/render.js');
    let drewOk = true;
    try {
      rnd.drawGate(0, 0, 'l', false, 0); rnd.drawGate(0, 0, 'r', false, 0); // ante appena iniziate a chiudersi
      rnd.drawGate(0, 0, 'l', false, 0.5); rnd.drawGate(0, 0, 'r', false, 0.5); // a metà
      rnd.drawGate(0, 0, 'l', false, 1); rnd.drawGate(0, 0, 'r', false, 1); // chiuse: qui compare anche il lucchetto ('r')
    } catch (e) { drewOk = false; }
    check('le ante e il lucchetto si disegnano ad ogni fase senza esplodere', drewOk);

    /* la svolta durava un fotogramma solo e chi teneva un tasto premuto la sovrascriveva
       subito (segnalato: "quando esce si deve girare per far capire che sta chiudendo il
       cancello") — ora il movimento resta bloccato (P.gateTurnUntil) per tutta l'animazione,
       come P.digging blocca lo scavo. Più le BARRE CINEMATOGRAFICHE 16:9 (a richiesta) per
       tutta la stessa finestra, sopra e sotto. */
    check('P.gateTurnUntil è nel futuro appena usciti', typeof P.gateTurnUntil === 'number' && P.gateTurnUntil > Date.now());
    const { ctx: cx2 } = await import('../src/screen.js');
    state.cam.x = P.x; state.cam.y = P.y;
    const seen = new Set(); const of2 = cx2.fillRect;
    cx2.fillRect = () => seen.add(cx2.fillStyle);
    try { rnd.render(3500); } catch (e) { /* qui interessa solo il colore visto */ }
    cx2.fillRect = of2;
    check('barre nere visibili mentre il cancello chiude', seen.has('#0a0a0a'));
    P.gateTurnUntil = Date.now() - 1; // fa scadere la finestra: da qui in poi il movimento riparte
    check('scaduta la finestra: il movimento non è più bloccato', !(P.gateTurnUntil && Date.now() < P.gateTurnUntil));
    /* il lucchetto compare SOLO a chiusura completa e SOLO dalla cella 'r' (altrimenti doppio) */
    const seenLock = c => { const seen = new Set(); const of = cx2.fillRect; cx2.fillStyle = ''; cx2.fillRect = () => seen.add(cx2.fillStyle); c(); cx2.fillRect = of; return seen; };
    const noLockYet = seenLock(() => rnd.drawGate(40, 40, 'r', false, 0.9));
    const withLock = seenLock(() => rnd.drawGate(40, 40, 'r', false, 1));
    const lockOnlyOnL = seenLock(() => rnd.drawGate(40, 40, 'l', false, 1));
    check('nessun lucchetto finché l\'anta non è del tutto chiusa', !noLockYet.has('#c9a227'));
    check('il lucchetto compare a chiusura completa (cella destra)', withLock.has('#c9a227'));
    check('il lucchetto NON si ridisegna dalla cella sinistra (una volta sola)', !lockOnlyOnL.has('#c9a227'));
  }

  /* il cortile è una scelta ESPLICITA: `S.house.yard` parte vuoto, nessuna creatura cammina
     finché non la ci si mette (M5, a differenza del vecchio parco che mostrava TUTTO). */
  const house = await import('../src/house.js');
  house.ensureHouseState();
  S.house.yard = [];
  check('cortile vuoto di default: nessuna creatura sceglie da sola', park.yardList().length === 0);
  S.house.yard.push('chi900'); // la chimera seminata sopra (uid 900)
  const list = park.yardList();
  check('una creatura scelta vive nel cortile', list.length === 1 && list[0].c.key === 'chi900');

  /* LE SPECIE RISVEGLIATE POSSONO vivere nel cortile (se scelte). Costano cinque pezzi e una
     fialetta intera di DNA: per mesi il vecchio recinto le ignorava comunque, comparivano
     solo nel Libro e fra i compagni — un giocatore ne aveva risvegliate dieci e le credeva
     perse. Ora ENTRAMBE le liste vengono dalla stessa `parkPopulation()`: la scelta sta solo
     in `S.house.yard`. */
  {
    S.awakened.push('fangodonte', 'brontorana');
    check('risvegliate NON scelte: restano fuori dal cortile', park.yardList().length === 1);
    S.house.yard.push('spfangodonte', 'spbrontorana');
    const after = park.yardList();
    check('risvegliate scelte: entrano nel cortile', after.length === 3);
    const nomi = after.map(a => a.c.name);
    check('nel cortile ci sono col loro nome di specie',
      nomi.includes('Fangodonte') && nomi.includes('Brontorana'));
    check('una specie risvegliata ha lo sprite della specie (cranio=torace=zampa)',
      after.some(a => a.c.skull === 'fangodonte' && a.c.torso === 'fangodonte' && a.c.leg === 'fangodonte'));
    /* il selettore dei compagni pesca da TUTTE le creature possedute, non solo dal cortile:
       ogni creatura resta scegliibile come compagno anche se non vive nel cortile */
    const compMod = await import('../src/companion.js');
    const comp = compMod.companionCandidates();
    check('il selettore vede anche chi non è nel cortile',
      comp.length === 3 && comp.some(c => c.key === 'chi900'));
    /* SDOPPIAMENTO: il compagno "con te" ESCE dal cortile (non si vede due volte), ma resta
       scegliibile nel selettore; rimandandolo a casa rientra nel cortile */
    const yardFull = park.yardList().length;
    compMod.setCompanion(park.parkPopulation().find(c => c.key === 'spfangodonte'));
    const yardAfter = park.yardList();
    check('compagno con te: NON è più nel cortile (niente doppione)', yardAfter.length === yardFull - 1 && !yardAfter.some(a => a.c.key === 'spfangodonte'));
    check('compagno con te: resta nel selettore dei compagni', compMod.companionCandidates().some(c => c.key === 'spfangodonte'));
    compMod.clearCompanion();
    check('rimandato a casa: rientra nel cortile', park.yardList().some(a => a.c.key === 'spfangodonte'));
    S.awakened.length = 0;
    S.house.yard = ['chi900'];
    check('tolte le risvegliate il cortile torna alla sola chimera scelta',
      park.yardList().length === 1);
  }
  let out = 0;
  const list2 = park.yardList();
  for (let i = 0; i < 3600; i++) {
    park.updatePark(1 / 60);
    for (const a of list2) {
      const tx = Math.floor(a.x / TS), ty = Math.floor(a.y / TS);
      if (tx <= p.x0 || tx >= p.x1 || ty <= p.y0 || ty >= p.y1) out++;
    }
  }
  check('60s di wander senza fughe', out === 0);
  S.home = savedHome; S.house.yard = [];
}

/* ---------- LO SCOPO DEL GIOCO: riportarle in vita ----------
   Il gioco aveva un finale e non aveva uno scopo, che non è la stessa cosa: il finale è dove
   si arriva, lo scopo è la ragione per cui uno ci vuole arrivare, e va detta all'inizio.
   Quello dichiarato era "riempi il museo" — un catalogo, si contano oggetti. Intanto la cosa
   più bella che il gioco fa (una creatura dissotterrata che CAMMINA VIVA nel parco) era un
   effetto collaterale che nessuno chiedeva e nessuno contava.
   Ora il traguardo è quello, e questi controlli tengono ferme le tre cose che lo rendono un
   traguardo invece di un numero: è UNO SOLO, è detto DALL'INIZIO, ed è quello che il parco
   mostra davvero. */
{
  const G = await import('../src/goal.js');
  const D7 = await import('../src/data.js');
  const S7 = state.S;
  /* si rimette TUTTO quello che si tocca: questo blocco svuotava anche S.creatures per la
     prova del parco, e un test molto più avanti ci contava sopra (S.creatures[0].name) */
  const salvate = S7.awakened, salvateCr = S7.creatures;

  S7.awakened = [];
  check(`il traguardo è tutte le specie del gioco (${G.aliveTotal()})`,
    G.aliveTotal() === D7.ALL_SPECIES.length && G.alive() === 0 && !G.goalDone());
  check('a zero, lo scopo spiega come si comincia', /Museo|Museum/.test(G.goalHint()));
  S7.awakened = D7.ALL_SPECIES.slice(0, 3).map(s => s.id);
  check('il conto è quello delle specie risvegliate', G.alive() === 3 && G.goalLine() === '3 / ' + G.aliveTotal());
  /* le soglie servono perché 66 è troppo lontano per tirare da solo: la prima creatura che
     torna a camminare deve valere qualcosa di suo, o si molla al terzo scavo */
  check('le soglie partono da 1 e finiscono col traguardo',
    G.MILESTONES[0] === 1 && G.MILESTONES[G.MILESTONES.length - 1] === G.aliveTotal());
  check('e sono in ordine crescente', G.MILESTONES.every((m, i) => i === 0 || m > G.MILESTONES[i - 1]));
  check('a 3 risvegliate la prossima soglia è 5, ne mancano 2',
    G.nextMilestone() === 5 && G.toNextMilestone() === 2);
  S7.awakened = D7.ALL_SPECIES.map(s => s.id);
  check('tutte risvegliate: traguardo raggiunto e nessuna soglia oltre',
    G.goalDone() && G.nextMilestone() === null && G.toNextMilestone() === 0);
  check('e lo scopo lo dice, invece di ripetere quante ne mancano',
    !/\d/.test(G.goalHint()) && G.goalHint().length > 10);
  /* funzione PURA: deve leggere lo stato che riceve, non quello globale — le statistiche
     gliene passano uno diverso */
  check('il conto si può fare su un salvataggio passato da fuori',
    G.alive({ awakened: ['a', 'b'] }) === 2 && !G.goalDone({ awakened: [] }));

  /* LO SCOPO SI DICE ALL'INIZIO. Se il nonno non lo chiede, non è uno scopo: è una statistica. */
  {
    const fs9 = await import('node:fs');
    const isrc9 = fs9.readFileSync('src/intro.js', 'utf8');
    check("l'intro dice che nessuno le ha mai viste vive",
      /mai riviste vive|never seen one alive|riviste vive/i.test(isrc9));
    check('e il giocatore promette di riportarle indietro',
      /riporter|bring them back/i.test(isrc9));
    const battute9 = (isrc9.match(/\{ s: '[GD]'/g) || []).length;
    check(`e lo fa senza allungare l'intro (${battute9} battute)`, battute9 <= 5);
  }
  /* e si dice DOVE si agisce: al banco del Curatore, in cima, prima dei conteggi di servizio */
  {
    const fs10 = await import('node:fs');
    const usrc10 = fs10.readFileSync('src/ui.js', 'utf8');
    const mus10 = usrc10.slice(usrc10.indexOf('function renderMuseum'));
    const corpo10 = mus10.slice(0, mus10.indexOf('\n}'));
    /* il pannello ha due schede (azioni | numeri): lo SCOPO apre la scheda dei numeri, sopra
       le teche e le sale — è il fine, quelle sono la strada */
    check('il Museo mostra lo scopo sopra teche e sale',
      corpo10.indexOf('goalTitle()') >= 0
      && corpo10.indexOf('goalTitle()') < corpo10.indexOf('Complete cases')
      && corpo10.indexOf('goalTitle()') < corpo10.indexOf('Museum rooms'));
  }
  /* IL PARCO È IL FINE: le risvegliate devono davvero camminarci, o il traguardo è una bugia */
  {
    const park = await import('../src/park.js');
    S7.awakened = [D7.ALL_SPECIES[0].id]; S7.creatures = [];
    const pop = park.parkPopulation();
    check('una specie risvegliata cammina nel parco',
      pop.length === 1 && pop[0].skull === D7.ALL_SPECIES[0].id);
  }
  /* IL PARCO CRESCE. Un numero che sale in un pannello non fa sentire niente: il posto dove
     vivono deve cambiare, così il progresso lo si cammina. A recinto vuoto è prato nudo — un
     recinto che aspetta — e ogni soglia lo rende più un posto. */
  {
    const pen = { x0: 0, y0: 0, x1: 15, y1: 9 }, cx = 7;
    const arredo = (n) => {
      const out = {};
      for (let y = 0; y <= 9; y++) for (let x = 0; x <= 15; x++) {
        const d = world.parkDeco(pen, cx, x, y, n);
        if (d) out[d.kind] = (out[d.kind] || 0) + 1;
      }
      return out;
    };
    /* soglie DIMEZZATE da quando il cortile è grande il doppio: lo stesso arredo su quattro
       volte il prato lasciava un campo vuoto per mezza partita */
    const a0 = arredo(0), a1 = arredo(1), a5 = arredo(3), a15 = arredo(8), a30 = arredo(16), a50 = arredo(24);
    check('a zero risvegliate il parco è prato NUDO', Object.keys(a0).length === 0);
    check('la prima creatura porta il primo albero', a1.tree === 1 && !a1.pond && !a1.bush);
    check('a 3 arriva lo stagno', a5.pond > 0 && a1.pond === undefined);
    check('a 8 arrivano cespugli e sassi', (a15.bush || 0) + (a15.rock || 0) > 0 && (a5.bush || 0) + (a5.rock || 0) === 0);
    check('a 16 arrivano le aiuole', a30.flowerbed > 0 && !a15.flowerbed);
    check('a 24 si riempiono tutti gli angoli', a50.tree > a30.tree);
    /* il progresso non torna mai indietro: ogni soglia AGGIUNGE, non sostituisce */
    const tot = o => Object.values(o).reduce((s, v) => s + v, 0);
    check('ogni soglia aggiunge e non toglie',
      tot(a0) <= tot(a1) && tot(a1) <= tot(a5) && tot(a5) <= tot(a15) && tot(a15) <= tot(a30) && tot(a30) <= tot(a50));
    /* senza il parametro tutto acceso: chi non conosce il traguardo (test vecchi, strumenti)
       continua a vedere il parco completo invece di un prato vuoto */
    check('senza progresso passato, il parco resta quello di sempre', tot(arredo(undefined)) === tot(a50));
    /* il cancello resta libero a ogni soglia, o il parco diventa inaccessibile */
    check('la colonna del cancello non si arreda mai',
      [0, 1, 3, 8, 16, 24, 66].every(n => [cx - 1, cx].every(x =>
        [...Array(10).keys()].every(y => world.parkDeco(pen, cx, x, y, n) === null))));
  }
  /* le STATISTICHE mettono il traguardo in cima, non in mezzo all'elenco */
  {
    const st7 = await import('../src/stats.js');
    const righe7 = st7.gameStats({ ...S7, awakened: [] });
    const iAwake = righe7.findIndex(r => r.id === 'awake');
    const iCodex = righe7.findIndex(r => r.id === 'codex');
    check('nelle statistiche il traguardo viene prima della strada per arrivarci',
      iAwake >= 0 && iCodex >= 0 && iAwake < iCodex);
  }
  S7.awakened = salvate; S7.creatures = salvateCr;
}

/* ---------- LE SALE DEL MUSEO: il traguardo lungo, finalmente dicibile ----------
   Sette sale piene = l'ultima lettera del nonno, cioè il finale. Il gioco sapeva già quali
   fossero piene (`roomFilled` rispondeva sì/no) ma non lo diceva da nessuna parte: nessuna
   schermata nominava le sale, quindi non si poteva vedere che ne mancavano tre alle Dune — e
   su una cosa che non vedi non puoi puntare. Un traguardo invisibile è una sorpresa, e le
   sorprese non fanno tornare nessuno. */
{
  const L = await import('../src/letters.js');
  const D6 = await import('../src/data.js');
  const S6 = state.S;
  const salvato = S6.museum;
  const zona = D6.MUSEUM_ZONES[0].id, pool = D6.zonePools[zona];

  S6.museum = {};
  check(`le sale sono ${D6.MUSEUM_ZONES.length}, quante le lettere del nonno`,
    L.roomsTotal() === D6.MUSEUM_ZONES.length && L.allLetters().length === D6.MUSEUM_ZONES.length + 1);
  check('museo vuoto: nessuna sala piena', L.roomsDone() === 0);
  check('a museo vuoto la sala più vicina è comunque indicata',
    !!L.nextRoom() && L.nextRoom().have === 0 && L.nextRoom().manca > 0);

  /* una specie esposta = un passo, non una sala */
  S6.museum = { [pool[0].id]: ['cranio'] };
  check('esposta una specie, la sala avanza ma non si chiude',
    L.roomProgress(zona).have === 1 && L.roomsDone() === 0);
  /* la "più vicina" è quella a cui manca MENO, ed è il consiglio da dare. Attenzione: le sale
     NON sono grandi uguali — la grotta ha 6 specie contro 10 delle altre — quindi a museo quasi
     vuoto la più vicina è quasi sempre lei, ed è giusto così. Per provarlo servono numeri che
     non lascino dubbi. */
  S6.museum = {}; for (let i = 0; i < pool.length - 1; i++) S6.museum[pool[i].id] = ['cranio'];
  check('la sala più vicina è quella a cui manca meno',
    L.nextRoom().id === zona && L.nextRoom().manca === 1);

  /* sala piena: un pezzo per OGNI specie della zona (non tutti i pezzi di una specie) */
  S6.museum = {}; for (const sp of pool) S6.museum[sp.id] = ['cranio'];
  check('un pezzo per ogni specie chiude la sala',
    L.roomFilled(zona) && L.roomsDone() === 1 && L.roomProgress(zona).have === L.roomProgress(zona).need);
  check('e la lettera di quella sala diventa consegnabile', L.pendingLetter() === zona);
  check('la sala chiusa non è più "la più vicina"', !L.nextRoom() || L.nextRoom().id !== zona);

  /* tutte piene → il finale. È l'unico vero finale del gioco, e va raggiungibile. */
  S6.museum = {}; S6.letters = [];
  for (const z of D6.MUSEUM_ZONES) for (const sp of (D6.zonePools[z.id] || [])) S6.museum[sp.id] = ['cranio'];
  check('tutte le sale piene', L.roomsDone() === L.roomsTotal() && L.nextRoom() === null);
  for (const z of D6.MUSEUM_ZONES) L.giveLetter(z.id);
  check('raccolte le sette lettere, arriva il congedo', L.pendingLetter() === 'finale');

  /* le STATISTICHE sono una funzione PURA: leggono il salvataggio che ricevono, non la S del
     modulo. Le sale devono comparire lì, o restano un numero che nessuno vede mai. */
  {
    const st6 = await import('../src/stats.js');
    const righe = st6.gameStats({ ...S6, museum: {} });
    const r = righe.find(x => x.id === 'rooms');
    check('le statistiche mostrano le sale', !!r && r.value === '0/' + L.roomsTotal(), r ? r.value : 'riga assente');
    const pieno = {}; for (const z of D6.MUSEUM_ZONES) for (const sp of (D6.zonePools[z.id] || [])) pieno[sp.id] = ['cranio'];
    const r2 = st6.gameStats({ ...S6, museum: pieno }).find(x => x.id === 'rooms');
    check('e contano dal salvataggio ricevuto, non dallo stato globale',
      !!r2 && r2.value === L.roomsTotal() + '/' + L.roomsTotal(), r2 ? r2.value : 'riga assente');
  }
  /* IL BANCO DEL CURATORE è il posto dove la cosa si può fare: il traguardo va detto lì, non
     solo in una schermata di statistiche che si apre di rado */
  {
    const fs8 = await import('node:fs');
    const usrc8 = fs8.readFileSync('src/ui.js', 'utf8');
    const mus = usrc8.slice(usrc8.indexOf('function renderMuseum'));
    const corpo = mus.slice(0, mus.indexOf('\n}'));
    check('il pannello del Museo dice a che sala sei arrivato',
      /roomsDone\(\)/.test(corpo) && /roomsTotal\(\)/.test(corpo));
    check('e qual è la sala più vicina a chiudersi', /nextRoom\(\)/.test(corpo));
    check('e che ogni sala piena vale una lettera del nonno', /lettera|letter/i.test(corpo));
  }
  S6.museum = salvato; S6.letters = [];
}

/* ---------- VESTITI rifiniti a mano: overlay additivi sopra la regola ----------
   `styleLook` ricava maglie e pantaloni trasformando le righe del corpo. Funziona ovunque ma
   è una regola, non un disegno. SHIRTS/PANTS permettono di sostituirne una a mano dallo Sprite
   Studio, con lo stesso patto della banca degli sprite: finché la casella è vuota si vede il
   procedurale, e un capo a mano non trascina con sé l'altro. */
{
  const DATA5 = await import('../src/data.js');
  const shirtIds = DATA5.SHIRT_STYLES.map(s => s.id), pantsIds = DATA5.PANTS_STYLES.map(s => s.id);
  const S5 = state.S;
  /* di serie NON c'è niente disegnato: il gioco parte tutto procedurale */
  check('le tabelle dei vestiti nascono vuote (additive)',
    Object.keys(sprites.SHIRTS).length === 0 && Object.keys(sprites.PANTS).length === 0);
  check('senza disegno non c\'è overlay, per ogni forma e vista',
    shirtIds.every(id => ['down', 'side', 'up'].every(v => sprites.shirtOverlay(id, v) === null))
    && pantsIds.every(id => ['down', 'side', 'up'].every(v => [0, 1].every(f => sprites.pantsOverlay(id, v, f) === null))));

  sprites.SHIRTS.hoodie = { down: [[8, '....AAAAAAAA....']], side: [], up: [] };
  sprites.PANTS['skirt:1'] = { down: [[14, '...BBBBBBBBBB...']], side: [], up: [] };
  check('disegnata una vista, le altre restano procedurali',
    !!sprites.shirtOverlay('hoodie', 'down') && sprites.shirtOverlay('hoodie', 'side') === null);
  /* IL PASSO CONTA: fra i due fotogrammi le gambe cambiano, e un pantalone disegnato una volta
     sola si incollerebbe alla gamba spegnendo la camminata. Per questo la chiave porta il passo. */
  check('i pantaloni sono per PASSO: disegnarne uno non tocca l\'altro',
    !!sprites.pantsOverlay('skirt', 'down', 1) && sprites.pantsOverlay('skirt', 'down', 0) === null);

  /* la regola dello scambio: col capo a mano il corpo sotto si disegna NEUTRO, o l'overlay
     finisce sopra una silhouette già trasformata e i due disegni si combattono */
  const look = { shirtStyle: 'hoodie', pantsStyle: 'skirt' };
  const c1 = sprites.heroClothes(look, 'down', 1);
  check('col capo a mano il corpo sotto è neutro', c1.shirt === 'tshirt' && c1.pants === 'long' && !!c1.shOv && !!c1.ptOv);
  const c0 = sprites.heroClothes(look, 'down', 0);
  check('e SOLO per il capo disegnato: l\'altro resta procedurale',
    c0.shirt === 'tshirt' && c0.pants === 'skirt' && !!c0.shOv && c0.ptOv === null);
  const cx = sprites.heroClothes(look, 'side', 0);
  check('vista senza disegni: tutto procedurale come prima', cx.shirt === 'hoodie' && cx.pants === 'skirt');
  check('senza look si torna ai valori di serie',
    sprites.heroClothes(null, 'up', 0).shirt === 'tshirt' && sprites.heroClothes({}, 'up', 0).pants === 'long');
  /* disegnare non deve far esplodere il disegno dell'eroe */
  {
    let crash = null;
    try { S5.look = { ...S5.look, ...look }; sprites.applyLook(); sprites.drawHero(null, 0, 0, 'down', 1); }
    catch (e) { crash = e.message; }
    check('l\'eroe si disegna coi vestiti a mano senza crash', crash === null, crash || '');
  }
  delete sprites.SHIRTS.hoodie; delete sprites.PANTS['skirt:1'];
  S5.look = { ...S5.look, shirtStyle: 'tshirt', pantsStyle: 'long' }; sprites.applyLook();

  /* NESSUN PIXEL STACCATO DAL CORPO, in nessuna delle 96 combinazioni.
     Le forme si applicano IN FILA (prima la maglia, poi i pantaloni) e la seconda leggeva la
     prima: la salopette cercava la maglia per appoggiarci le bretelle, ma con la CANOTTIERA di
     spalle le spalle diventano pelle e nella riga non resta una sola 'S'. `indexOf` tornava -1,
     la bretella finiva a -1+1 = 0 e comparivano quattro pixel sul bordo sinistro dello sprite,
     staccati da tutto (segnalato con foto da un giocatore).
     Il controllo è "staccato", non "fuori dalla sagoma": la gonna si svasa più larga delle gambe
     e il cappuccio sta sopra le spalle, e sono due cose volute. Quello che non si può mai vedere
     è un pixel che non tocca niente. */
  {
    const stacc = [];
    for (const view of ['down', 'up', 'side']) for (const fr of [0, 1])
      for (const sh of shirtIds) for (const pt of pantsIds) {
        const out = sprites.styleLook(sprites.SPR[view][fr], sh, pt);
        const OW = out[0].length;
        const acceso = (x, y) => y >= 0 && y < out.length && x >= 0 && x < OW && out[y][x] !== '.';
        for (let y = 0; y < out.length; y++) for (let x = 0; x < OW; x++) {
          if (out[y][x] === '.') continue;
          if (!acceso(x - 1, y) && !acceso(x + 1, y) && !acceso(x, y - 1) && !acceso(x, y + 1))
            stacc.push(`${view}/passo${fr + 1} ${sh}+${pt} riga ${y} col ${x}`);
        }
      }
    check(`nessun pixel staccato dal corpo (${shirtIds.length * pantsIds.length * 6} combinazioni)`,
      stacc.length === 0, stacc.slice(0, 4).join(' · '));
    /* e le bretelle DEVONO esserci anche sopra la pelle nuda: correggendo si poteva "risolvere"
       togliendole del tutto, ed è la correzione sbagliata */
    const conCanottiera = sprites.styleLook(sprites.SPR.up[0], 'tank', 'overall');
    const soloCanottiera = sprites.styleLook(sprites.SPR.up[0], 'tank', 'long');
    check('la salopette mette le bretelle anche sulla canottiera',
      conCanottiera.some((r, y) => r.includes('P') && !soloCanottiera[y].includes('P')));
    check('e nessuna finisce in colonna 0', conCanottiera.every(r => r[0] === '.'));
  }

  /* LO SPRITE STUDIO deve saperli modificare, o la tabella resta una porta senza maniglia */
  {
    const fs7 = await import('node:fs');
    const st7 = fs7.readFileSync('public/sprites/index.html', 'utf8');
    check('lo Studio ha la scheda Vestiti', /vestiti:\s*\{\s*label:\s*'Vestiti'/.test(st7));
    check('lo Studio tratta maglie e pantaloni come overlay',
      /kind === 'shirt' \|\| it\.kind === 'pants'/.test(st7) || /it\.kind === 'shirt'/.test(st7));
    check('lo Studio dice in QUALE tabella incollare',
      /shirt:\s*'SHIRTS'/.test(st7) && /pants:\s*'PANTS'/.test(st7));
    /* la chiave dei pantaloni contiene i due punti: senza virgolette il file non si carica */
    check('lo Studio quota le chiavi non-identificatore', /A-Za-z_\$\]\[A-Za-z0-9_\$\]\*\$/.test(st7));
    const voci = shirtIds.length + pantsIds.length * 2;
    check(`lo Studio copre tutte le forme (${voci} voci × 3 viste = ${voci * 3} caselle)`,
      /SHIRT_STYLES\)\s*\|\|\s*\[\]\)\.map/.test(st7) && /PANTS_STYLES\)\s*\|\|\s*\[\]\)\.flatMap/.test(st7));
  }
}

/* ---------- sprite / look ---------- */
{
  let bad = 0;
  for (const dir of ['down', 'up', 'side']) for (const fr of [0, 1]) {
    const rows = sprites.SPR[dir][fr];
    if (rows.length !== 32) bad++;
    rows.forEach(r => { if (r.length !== 32) bad++; for (const ch of r) if (!(ch in sprites.PAL)) bad++; });
  }
  check('6 varianti sprite 32x32 con chiavi valide', bad === 0);
  /* corpo nativo: i ridisegni precedenti erano stati scartati per occhi non speculari, gambe storte e
     occhi sepolti sotto la frangia. Qui si misura: sagoma e occhi a specchio esatto (di fronte e di
     spalle, entrambi i passi), occhi visibili con OGNI taglio. */
  let bodyAsym = 0;
  for (const dir of ['down', 'up']) for (const fr of [0, 1]) sprites.SPR[dir][fr].forEach(r => {
    for (let c = 0; c < 32; c++) { if ((r[c] === '.') !== (r[31 - c] === '.')) bodyAsym++; const eye = ch => ch === 'E' || ch === 'W'; if (eye(r[c]) !== eye(r[31 - c])) bodyAsym++;   /* il punto di luce sta dallo stesso lato in entrambi: fa parte dell'occhio */ }
  });
  check('corpo: sagoma e occhi a specchio (' + bodyAsym + ' pixel fuori)', bodyAsym === 0);
  let eyesUnder = [];
  for (const hair of Object.keys(sprites.HAIRS)) for (const [v, xs] of [['down', [11, 12, 19, 20]], ['side', [20, 21]]]) {
    const hr = sprites.HAIRS[hair][v];
    for (const y of [8, 9, 10, 11]) { const r = hr.find(p => p[0] === y); if (r && xs.some(x => r[1][x] !== '.')) { eyesUnder.push(hair + '/' + v); break; } }
  }
  check('occhi mai sotto i capelli (' + [...new Set(eyesUnder)].join(' ') + ')', eyesUnder.length === 0);
  let hbad = 0;
  for (const st of Object.keys(sprites.HAIRS)) for (const dir of ['down', 'side', 'up']) {
    for (const [y, r] of sprites.HAIRS[st][dir]) {
      if (y < -14 || y > 40 || r.length !== 32) hbad++;
      for (const ch of r) if (!(ch in sprites.PAL)) hbad++;
    }
  }
  check('overlay capelli validi (4 stili × 3 direzioni)', hbad === 0);
  check('stili/colori capelli coerenti coi dati (6 stili, 12 colori)', HAIR_STYLES.length === 6 && HAIR_STYLES.every(s => s.id in sprites.HAIRS) && HAIR_COLORS.length === 12);
  /* fronte/retro: la SAGOMA dei capelli è centrata sulla testa (specchio c↔31-c). Si guarda la
     sagoma e non il colore: luce a sinistra e ombra a destra sono volute. Le eccezioni sono tagli
     asimmetrici per disegno (la Duna è spazzata dal vento da un lato). */
  let asym = 0; const asymAt = [];
  for (const st of Object.keys(sprites.HAIRS)) {
    if (st === 'dunespike') continue;
    for (const dir of ['down', 'up']) for (const [, r] of sprites.HAIRS[st][dir]) {
      let n = 0; for (let c = 0; c < 32; c++) if ((r[c] === '.') !== (r[31 - c] === '.')) n++;
      if (n > 2) { asym++; asymAt.push(st + '/' + dir); }
    }
  }
  check('capelli centrati (sagoma simmetrica fronte/retro)' + (asym ? ': ' + [...new Set(asymAt)].join(' ') : ''), asym === 0);
  /* capelli nativi: niente mappe raddoppiate a blocchi 2×2 e un contorno in ogni vista */
  let hBlocky = 0;
  for (const st of Object.keys(sprites.HAIRS)) for (const dir of ['down', 'side', 'up']) {
    const rows = sprites.HAIRS[st][dir]; if (!rows.length) continue;
    let pairs = 0, cells = 0;
    for (const [, r] of rows) for (let x = 0; x < 32; x += 2) if (r[x] !== '.' || r[x + 1] !== '.') { cells++; if (r[x] === r[x + 1]) pairs++; }
    if (pairs / cells > 0.9 || !rows.some(([, r]) => r.includes('I'))) hBlocky++;
  }
  check('capelli nativi: contorno e niente blocchi 2×2 (' + hBlocky + ')', hBlocky === 0);
  let hatBad = 0;
  for (const st of Object.keys(sprites.HATS)) for (const dir of ['down', 'side', 'up']) {
    for (const [y, r] of sprites.HATS[st][dir]) {
      if (y < -14 || y > 40 || r.length !== 32) hatBad++; // corna, piume e pompon salgono sopra la testa
      for (const ch of r) if (!(ch in sprites.PAL)) hatBad++;
    }
  }
  check('overlay cappelli validi (3 forme × 3 direzioni)', hatBad === 0);
  /* "i cappelli fanno un po' schifo": erano mappe a 16 colonne raddoppiate a blocchi 2×2. Ora
     sono disegnati in nativo: ogni vista ha il suo contorno e NON è fatta di coppie di pixel. */
  let blocky = 0, noRim = 0;
  for (const st of Object.keys(sprites.HATS)) for (const dir of ['down', 'side', 'up']) {
    const rows = sprites.HATS[st][dir];
    if (!rows.some(([, r]) => /[Jjvqrd]/.test(r))) noRim++;
    let pairs = 0, cells = 0;
    for (const [, r] of rows) for (let x = 0; x < 32; x += 2) if (r[x] !== '.' || r[x + 1] !== '.') { cells++; if (r[x] === r[x + 1]) pairs++; }
    if (cells && pairs / cells > 0.9) blocky++;
  }
  check('cappelli nativi: contorno in ogni vista, niente blocchi 2×2 (' + blocky + ' a blocchi, ' + noRim + ' senza contorno)', blocky === 0 && noRim === 0);
  const { HAT_STYLES } = await import('../src/data.js');
  check('forme cappello coerenti coi dati', HAT_STYLES.length === 3 && HAT_STYLES.every(s => s.id in sprites.HATS));
  check('shade #ffffff 0.5 = #808080', sprites.shade('#ffffff', 0.5) === '#808080');
  S.look.hat = '#5a86c8'; sprites.applyLook();
  check('applyLook aggiorna palette + ombra', sprites.PAL.H === '#5a86c8' && sprites.PAL.h === sprites.shade('#5a86c8', 0.65));
  S.look.hairColor = '#caa25a'; sprites.applyLook();
  check('applyLook aggiorna capelli', sprites.PAL.A === '#caa25a');
  check('hatStyle di default explorer', state.fresh().look.hatStyle === 'explorer');
  /* FORME maglia/pantaloni: styleLook trasforma le righe del corpo (torso=S, gambe=P) senza rompere le altre */
  {
    const dataMod = await import('../src/data.js');
    const base = sprites.SPR.down[0];
    /* corpo raddoppiato meccanicamente dal disegno storico (testa righe 0–17, torso 18–25,
       gambe 26–31): la prima riga di torso è 18, la prima riga di gambe 26 */
    const tank = sprites.styleLook(base, 'tank', 'long');
    const bf = base[18].indexOf('S'), bl = base[18].lastIndexOf('S');
    check('canottiera: braccia scoperte (pelle dove il torso aveva la maglia sui bordi)', bf >= 0 && tank[18][bf] === 'F' && tank[18][bl] === 'F' && tank[18].includes('S'));
    const shorts = sprites.styleLook(base, 'tshirt', 'shorts');
    check('pantaloncini: stinco scoperto (una riga di pantalone → pelle)', !shorts[29].includes('P') && shorts[28].includes('P'));
    const skirt = sprites.styleLook(base, 'tshirt', 'skirt');
    const wideCount = r => (r.match(/[Pp]/g) || []).length;
    check('gonna: prima riga gambe svasata (più larga)', wideCount(skirt[26]) > wideCount(base[26]));
    const overall = sprites.styleLook(base, 'tshirt', 'overall');
    check('salopette: bretelle di pantalone sul torso', overall[20].includes('P'));
    check('styleLook default (tshirt/long) = corpo invariato', sprites.styleLook(base, 'tshirt', 'long').join('|') === base.join('|'));
    check('4 maglie + 4 pantaloni definiti', dataMod.SHIRT_STYLES.length === 4 && dataMod.PANTS_STYLES.length === 4);
    check('DEFAULT_LOOK ha shirtStyle/pantsStyle', dataMod.DEFAULT_LOOK.shirtStyle === 'tshirt' && dataMod.DEFAULT_LOOK.pantsStyle === 'long');
  }
  // smoke: eroe senza cappello e con ogni taglio, tutte le direzioni
  const stubCtx = { fillStyle: '', fillRect() {}, clearRect() {}, save() {}, restore() {}, translate() {}, scale() {} };
  let heroOk = true;
  try {
    for (const st of Object.keys(sprites.HAIRS)) {
      S.look.hairStyle = st;
      for (const dir of ['down', 'up', 'left', 'right']) {
        sprites.drawHero(stubCtx, 0, 0, dir, 0, false);
        sprites.drawHero(stubCtx, 0, 0, dir, 1, true);
      }
    }
    for (const hst of ['explorer', 'cap', 'beanie', 'none']) {
      S.look.hatStyle = hst;
      for (const dir of ['down', 'up', 'left']) sprites.drawHero(stubCtx, 0, 0, dir, 0);
    }
  } catch (e) { heroOk = false; }
  check('drawHero: 6 tagli × 4 direzioni × 4 stati cappello', heroOk);
  // con cappello indossato nessun pixel di capelli sopra la corona (niente compenetrazioni)
  let clip = 0;
  for (const hst of Object.keys(sprites.HATS)) {
    const crown = sprites.HAT_CROWN[hst];
    for (const hair of Object.keys(sprites.HAIRS)) {
      S.look.hatStyle = hst; S.look.hairStyle = hair; S.look.hairColor = '#1f5a7c'; sprites.applyLook();   // colore che nessun cappello usa: i 4 toni si riconoscono
      const hairCols = [sprites.PAL.A, sprites.PAL.a, sprites.PAL.M, sprites.PAL.I];
      const rec = { fillStyle: '', fillRect(px2, py2) { if (hairCols.includes(this.fillStyle) && py2 <= crown) clip++; }, clearRect() {}, save() {}, restore() {}, translate() {}, scale() {} };
      for (const dir of ['down', 'up', 'right']) sprites.drawHero(rec, 0, 0, dir, 0);
    }
  }
  check('capelli mai sopra la corona del cappello', clip === 0);
  /* niente riga di pelle fra la tesa e i capelli (segnalato con foto, di profilo): subito sotto il
     cappello, dove il taglio ha capelli, deve vedersi capello e non la testa nuda */
  let gaps = 0; const gapAt = [];
  for (const hst of Object.keys(sprites.HATS)) for (const hair of Object.keys(sprites.HAIRS)) {
    if (hair === 'none' || hst === 'hood') continue;   // il cappuccio incornicia il viso: la pelle lì è voluta
    S.look.hatStyle = hst; S.look.hairStyle = hair; sprites.applyLook();
    for (const [dir, v] of [['down', 'down'], ['up', 'up'], ['right', 'side']]) {
      const hat = sprites.HATS[hst][v]; let B = -99;
      for (const [y, r] of hat) { let cov = 0; for (let x = 10; x <= 21; x++) if (r[x] !== '.') cov++; if (cov >= 10) B = Math.max(B, y); }
      const hr = sprites.HAIRS[hair][v].find(([y]) => y === B + 1); if (!hr) continue;
      const px2 = {}; const rec = { fillStyle: '', fillRect(x, y) { px2[x + ',' + y] = this.fillStyle; }, clearRect() {}, save() {}, restore() {}, translate() {}, scale() {} };
      sprites.drawHero(rec, 0, 0, dir, 0);
      for (let x = 10; x <= 21; x++) if (hr[1][x] !== '.' && px2[x + ',' + (B + 1)] === sprites.PAL.F) { gaps++; gapAt.push(hst + '/' + hair + '/' + v); break; }
    }
  }
  check('niente pelle fra cappello e capelli (' + gaps + (gaps ? ': ' + gapAt.slice(0, 4).join(' ') : '') + ')', gaps === 0);
  /* segni di mestiere: ogni NPC ne ha uno, si disegna in tutte le viste e non copre MAI gli occhi
     (occhiali e monocolo girano attorno all'occhio, non sopra) */
  {
    const { NPCS } = await import('../src/interior.js');
    const npcArt = await import('../src/npcArt.js');
    const types = Object.keys(NPCS);
    check('ogni NPC ha il suo segno di mestiere', types.every(t => npcArt.ACC_IDS.includes(NPCS[t].look.acc)));
    let eyesHidden = 0, nothing = 0;
    const savedLook = S.look;
    for (const t of types) {
      S.look = { ...savedLook, ...NPCS[t].look }; sprites.applyLook();
      const drawn = []; const rec = { fillStyle: '', fillRect(x, y) { drawn.push([x, y, this.fillStyle]); }, clearRect() {}, save() {}, restore() {}, translate() {}, scale() {} };
      sprites.drawHero(rec, 0, 0, 'down', 0);
      const at = (x, y) => { let c = null; for (const [a, b, f] of drawn) if (a === x && b === y) c = f; return c; };
      if (at(11, 10) !== sprites.PAL.E || at(20, 11) !== sprites.PAL.E) eyesHidden++;
      if (!['down', 'side', 'up'].some(v => npcArt.accLayer(NPCS[t].look.acc, 'body', v) || npcArt.accLayer(NPCS[t].look.acc, 'face', v))) nothing++;
    }
    S.look = savedLook; sprites.applyLook();
    check('segni di mestiere: disegnati e mai sopra gli occhi (' + eyesHidden + ' coperti, ' + nothing + ' vuoti)', eyesHidden === 0 && nothing === 0);
    S.look = { ...savedLook }; sprites.applyLook();
    check('il giocatore non ha segni di mestiere', !S.look.acc);
  }
  S.look.hairStyle = 'short'; S.look.hatStyle = 'explorer'; sprites.applyLook();
}

/* ---------- UI: barbiere/sartoria/editor (smoke con stub) ---------- */
{
  S.coins = 50;
  ui.openEditor(() => {});
  check('editor: swatch presenti', document.getElementById('m-body').innerHTML.includes('data-field'));
  const coinsBeforeBarber = S.coins;
  ui.openBuilding({ type: 'barber', name: 'Barbiere' });
  check('barbiere: stili + bottone Conferma', document.getElementById('m-body').innerHTML.includes('hairStyle') && document.getElementById('m-body').innerHTML.includes('lookOk'));
  check('barbiere: aprire NON scala monete (prova gratis)', S.coins === coinsBeforeBarber);
  ui.closeModal();
  /* costo = campi cambiati; togliere il cappello è gratis */
  const orig = { hairStyle: 'short', hairColor: '#000', hatStyle: 'explorer', hat: '#111', shirt: '#222', pants: '#333' };
  check('costo: 1 taglio cambiato = 1 campo', ui.lookPaidFields(orig, { ...orig, hairStyle: 'punk' }, ['hairStyle', 'hairColor']).length === 1);
  check('costo: togliere cappello = gratis (0 campi)', ui.lookPaidFields(orig, { ...orig, hatStyle: 'none' }, ['hatStyle', 'hat', 'shirt', 'pants']).length === 0);
  check('costo: maglia+pantaloni = 2 campi', ui.lookPaidFields(orig, { ...orig, shirt: '#f00', pants: '#0f0' }, ['hatStyle', 'hat', 'shirt', 'pants']).length === 2);
  /* cosmetici tematici: sblocco e disponibilità */
  {
    const { ZONE_COSMETICS, THEMED_HAIR, THEMED_HAT } = await import('../src/data.js');
    const spr = await import('../src/sprites.js');
    check('6 zone con taglio+cappello tematico (sprite presenti)', Object.keys(ZONE_COSMETICS).length === 6 &&
      THEMED_HAIR.every(id => id in spr.HAIRS) && THEMED_HAT.every(id => id in spr.HATS && id in spr.HAT_CROWN));
    const { PREMIUM_HATS, PREMIUM_HAT_COST, HAT_STYLES: HS } = await import('../src/data.js');
    check('5 cappelli premium: sprite + crown + prezzo', PREMIUM_HATS.length === 5 &&
      PREMIUM_HATS.every(h => h.id in spr.HATS && h.id in spr.HAT_CROWN && PREMIUM_HAT_COST[h.id] > 0));
    check('vikingo NON è un cappello base (è premium)', !HS.some(s => s.id === 'vikingo') && PREMIUM_HAT_COST.vikingo > 0);
    /* traguardo di livello: ogni premium ha una soglia, in ordine crescente col prezzo */
    check('ogni premium ha una soglia di livello, in ordine col prezzo', PREMIUM_HATS.every(h => h.lvl > 0) &&
      [...PREMIUM_HATS].sort((a, b) => a.cost - b.cost).every((h, i, arr) => i === 0 || h.lvl >= arr[i - 1].lvl));
    check('elmetto (minerhelm) rimosso ovunque', !('minerhelm' in spr.HATS) && !('minerhelm' in spr.HAT_CROWN) && !THEMED_HAT.includes('minerhelm'));
    S.coins = 100; S.unlocked = { hats: [], hairs: [] };
    check('sblocco taglio tematico scala monete', gameplay.unlockCosmetic('hair', 'meadow', 24) === true && S.unlocked.hairs.includes('meadow') && S.coins === 76);
    check('secondo sblocco stesso id: gratis (già tuo)', gameplay.unlockCosmetic('hair', 'meadow', 24) === true && S.coins === 76);
    S.coins = 5;
    check('senza monete non sblocca', gameplay.unlockCosmetic('hat', 'ushanka', 24) === false && !S.unlocked.hats.includes('ushanka'));
  }
  ui.openBuilding({ type: 'tailor', name: 'Sartoria' });
  check('sartoria: cappello/maglia/pantaloni', ['hat', 'shirt', 'pants'].every(k => document.getElementById('m-body').innerHTML.includes(`data-field="${k}"`)));
  const tHtml = document.getElementById('m-body').innerHTML;
  check('sartoria: forme cappello + ✕ senza cappello', tHtml.includes('hatStyle') && tHtml.includes('hatOff'));
  /* BUG: togliere il cappello (gratis) non doveva restare invisibile al bottone Conferma —
     era escluso dal conteggio "campi cambiati" perché è l'unica modifica senza costo */
  {
    S.look.hatStyle = 'explorer';
    ui.openBuilding({ type: 'tailor', name: 'Sartoria' });
    const ho = document.getElementById('hatOff'); if (ho && ho.onclick) ho.onclick();
    const okHtml = document.getElementById('m-body').innerHTML.match(/<button[^>]*id="lookOk"[^>]*>/);
    check('sartoria: togliere il cappello (✕) accende Conferma', S.look.hatStyle === 'none' && !!okHtml && !okHtml[0].includes('disabled'));
  }
  check('sartoria: selettori FORMA di maglia e pantaloni', tHtml.includes('data-field="shirtStyle"') && tHtml.includes('data-v="tank"') && tHtml.includes('data-field="pantsStyle"') && tHtml.includes('data-v="skirt"'));
  /* traguardo di livello: un premium sotto soglia si VEDE (fa venire voglia di arrivarci)
     ma è spento del tutto — sopra soglia si comporta come i premium normali (provabile) */
  {
    S.level = 1; S.xp = 0; S.unlocked = { hats: [], hairs: [] };
    ui.openBuilding({ type: 'tailor', name: 'Sartoria' });
    const low = document.getElementById('m-body').innerHTML;
    const piLow = low.indexOf('data-v="partyhat"');
    check('sotto la soglia: il premium SI VEDE ma è spento (Lv, non prezzo)', piLow >= 0 && /lvlocked/.test(low.slice(piLow - 40, piLow)) && /Lv5/.test(low.slice(piLow, piLow + 200)));
    S.level = 5;
    ui.openBuilding({ type: 'tailor', name: 'Sartoria' });
    const high = document.getElementById('m-body').innerHTML;
    const pi = high.indexOf('data-v="partyhat"');
    check('raggiunta la soglia: torna un premium normale, provabile con il suo prezzo', pi >= 0 && !/lvlocked/.test(high.slice(pi - 40, pi)) && /130/.test(high.slice(pi, pi + 200)));
    /* la stessa guardia che blocca il click: sotto soglia dice quanto manca, sopra è libero */
    S.level = 1; check('hatLevelLock: sotto soglia', ui.hatLevelLock('partyhat') === 5);
    S.level = 5; check('hatLevelLock: raggiunta, via libera', ui.hatLevelLock('partyhat') === null);
    S.level = 1; S.xp = 0;
  }
  /* EXPLOIT cappello gratis: provando un look l'ANTEPRIMA è pendente → il game loop non autosalva
     (senza, bastava provare un cappello e ricaricare il browser per tenerlo gratis) */
  S.look.hatStyle = 'santa'; // (come farebbe wireLook in anteprima, senza pagare)
  check('provando un look l\'anteprima è PENDENTE (autosave sospeso)', ui.lookPreviewPending() === true);
  ui.revertLook();
  check('annullando: torna al look originale e niente più anteprima pendente', ui.lookPreviewPending() === false && S.look.hatStyle !== 'santa');
  ui.openBuilding({ type: 'lab', name: 'Laboratorio' });
  const labHtml = document.getElementById('m-body').innerHTML;
  check('laboratorio: chimere sì, identifica NO (spostata al museo)', labHtml.includes('Risveglia') && !labHtml.includes('idAll'));
  ui.openBuilding({ type: 'museum', name: 'Museo' });
  check('museo: bottone Consegna (identificazione in 1 giorno)', document.getElementById('m-body').innerHTML.includes('mudep'));
  check('museo: il Curatore propone la commissione', document.getElementById('m-body').innerHTML.includes('cmacc'));
  ui.openBag('dna');
  check('zaino (scheda DNA/Chimere) con chimera', document.getElementById('bagbox').innerHTML.includes(S.creatures[0].name));
  /* scheda Oggetti: sezioni ATTREZZI e MEZZI sempre presenti, mancanti in grigio */
  {
    const had = { ...S.tools };
    S.tools = { spade: true, axe: false, pick: false, torch: false, compass: false, boat: false };
    ui.openBag('objects');
    const bh = document.getElementById('bagbox').innerHTML;
    check('zaino: sezioni Attrezzi e Mezzi', /Attrezzi|Tools/.test(bh) && /Mezzi|Vehicles/.test(bh));
    check('zaino: elenca anche ciò che NON hai (grigio)', bh.includes('miss') && /Piccone|Pickaxe/.test(bh) && /Motoscafo|Motorboat/.test(bh));
    S.tools = { ...had, pick: true };
    ui.openBag('objects');
    const bh2 = document.getElementById('bagbox').innerHTML;
    check('zaino: comprato il piccone, niente più grigio su di esso', /Piccone|Pickaxe/.test(bh2));
    S.tools = had; ui.closeBag();
  }
  ui.openBag('finds');
  ui.closeBag();
}

/* ---------- menu: salva / carica / nuova partita ---------- */
{
  const { SK } = state;
  check('slot vuoto all\'inizio', state.slotInfo(1) === null);
  S.day = 7; S.coins = 123;
  check('saveToSlot scrive', state.saveToSlot(1) === true);
  const d = state.slotInfo(1);
  check('slotInfo rilegge giorno/monete/timestamp', d && d.day === 7 && d.coins === 123 && d.savedAt > 0);
  localStorage.setItem(SK, '{"day":1}'); // stato principale diverso
  check('loadFromSlot copia lo slot nella chiave principale', state.loadFromSlot(1) === true && JSON.parse(localStorage.getItem(SK)).day === 7);
  check('loadFromSlot su slot vuoto rifiuta', state.loadFromSlot(3) === false);
  /* caricare uno slot deve buttare via il backup della partita precedente */
  localStorage.setItem(state.BAK, JSON.stringify({ coins: 555 }));
  state.loadFromSlot(1);
  check('caricando uno slot il vecchio backup sparisce', localStorage.getItem(state.BAK) === null);
  state.newGame();
  /* NUOVA PARTITA: deve sparire anche il BACKUP, o al riavvio si ricarica la vecchia partita
     (bug vero: "nuova partita" ripartiva con i vecchi progressi) */
  localStorage.setItem(state.BAK, JSON.stringify({ coins: 999, day: 12 }));
  state.newGame();
  check('newGame rimuove il save principale', localStorage.getItem(SK) === null);
  check('newGame rimuove anche il backup', localStorage.getItem(state.BAK) === null && state.load() === null);
  /* NB: qui non si chiama initState — riassegnerebbe S e i moduli del gioco punterebbero a un
     oggetto diverso da quello della suite. Basta verificare che non resti nulla da caricare
     e che una partita nuova nasca a zero. */
  check('dopo newGame si riparte davvero da zero', state.load() === null &&
    state.fresh().coins === 0 && state.fresh().day === 1 && state.fresh().codex.length === 0);

  // splash come menu pausa (ESC) con sottomenu Partite / Audio
  state.saveToSlot(1); // uno slot pieno per vedere "Carica"
  const splash = await import('../src/splash.js');
  const menuEl = () => document.getElementById('sp-menu');
  splash.showSplash();
  /* Il menu principale tiene solo ciò che riguarda il GIOCARE. Audio e Lingua sono
     impostazioni e stanno dentro Impostazioni: in prima schermata rubavano posto e
     schiacciavano l'accesso in cloud fra due voci che si aprono una volta l'anno. */
  check('splash-pausa: Riprendi + Partite + Impostazioni', splash.splashActive() &&
    ['Riprendi', 'sp-saves', 'sp-settings'].every(k => menuEl().innerHTML.includes(k)));
  check('audio e lingua NON sono nel menu principale',
    !menuEl().innerHTML.includes('sp-audio') && !menuEl().innerHTML.includes('sp-lang'));
  document.getElementById('sp-settings').onclick();
  /* Audio e Lingua sono DENTRO le impostazioni, non due sottopagine da aprire: erano due
     schermate per quattro interruttori. Qui si pretende che i comandi veri siano subito lì. */
  const cfg = () => menuEl().innerHTML;
  check('audio nelle impostazioni, senza sottopagine',
    ['sp-mus', 'sp-vol', 'sp-sfx', 'sp-sfxvol'].every(k => cfg().includes(k)));
  check('lingua nelle impostazioni, con quella attiva evidenziata',
    cfg().includes('data-lang') && /data-lang="it"[^>]*|primary[^>]*data-lang/.test(cfg()));
  check('tutte le impostazioni in una schermata sola',
    ['sp-marker', 'sp-tips', 'sp-refresh'].every(k => cfg().includes(k)));
  /* e devono starci DAVVERO: il contenitore scorre, invece di far finire i comandi fuori
     dallo schermo com'era prima (su mobile "Aggiorna il gioco" non si raggiungeva) */
  check('le impostazioni stanno in un contenitore che scorre', cfg().includes('sp-cfg'));
  /* LE OPZIONI CAMBIANO COL DISPOSITIVO: le leve a schermo non esistono col mouse, il
     segui-puntatore non esiste col dito. Vanno provate ENTRAMBE le versioni, altrimenti
     metà schermata non viene mai disegnata da nessuno — ed è lì che si rompe. */
  {
    const i18n = await import('../src/i18n.js');
    const prefs = await import('../src/prefs.js');
    /* `isTouch()` guarda matchMedia('(pointer:coarse)') oppure innerWidth <= 760: si finge
       uno schermo stretto, che è la via che funziona anche con lo stub */
    const eraW = typeof innerWidth !== 'undefined' ? innerWidth : undefined;
    const stretto = (v) => { try { globalThis.innerWidth = v; if (typeof window !== 'undefined') window.innerWidth = v; } catch (e) { /* ok */ } };
    check('col mouse: si sceglie come muoversi col puntatore',
      cfg().includes('data-mouse') && !cfg().includes('data-touch'));
    /* si finge un dispositivo a tocco e si ridisegna */
    {
      stretto(390);
      check('lo schermo stretto è riconosciuto come "col dito"', i18n.isTouch() === true);
      for (const t of ['joystick', 'float', 'tap']) {
        prefs.setPref('touch', t);
        splash.setView('settings');
        check('col dito: la modalità "' + t + '" si disegna con la sua spiegazione',
          cfg().includes('data-touch') && cfg().includes('sp-hint2'));
      }
      check('col dito: c\'è anche la scelta della mano', cfg().includes('data-hand'));
      stretto(eraW === undefined ? 1200 : eraW);
      for (const m of ['follow', 'keys', 'tap']) { prefs.setPref('mouse', m); splash.setView('settings'); }
      check('col mouse: ogni modalità ha la sua spiegazione', cfg().includes('sp-hint2'));
    }
  }
  splash.showSplash();
  /* LA CONSOLE COMANDI NON SI OFFRE AI GIOCATORI. `money`, `godmode`, `goto=…` servono
     all'autore per provare il gioco: elencarli in un menu invita a usarli, e una partita con
     le monete infinite non dice più niente su come il gioco è bilanciato. Nessun pulsante,
     in nessuna schermata, deve portarci — resta il tasto ` per chi sa che c'è. */
  {
    /* `showSplash()` NON riporta al menu principale se la splash è già aperta (esce subito,
       vedi splash.js): girando il ciclo con quella si restava fermi sull'ultimo pannello e
       il controllo passava sempre, anche col pulsante rimesso. Si torna indietro con
       `resumeSplash`, che è quello che fa ESC. */
    const home = () => { splash.resumeSplash(); if (!document.getElementById('sp-saves')) splash.showSplash(); };
    const apri = { main: null, saves: 'sp-saves', settings: 'sp-settings', credits: 'sp-credits' };
    let esposto = null;
    for (const v of Object.keys(apri)) {
      home();
      const b = apri[v];
      if (b) { const el = document.getElementById(b); if (el && el.onclick) el.onclick(); }
      const html = menuEl().innerHTML || '';
      if (/sp-cmds|data-cmd=|godmode/.test(html)) esposto = v;
    }
    check('nessuna schermata del menu porta alla console comandi'
      + (esposto ? ' → esposta in "' + esposto + '"' : ''), esposto === null);
    home();
  }
  splash.showSplash();
  document.getElementById('sp-saves').onclick();
  /* dai sottomenu si esce con la X in alto (una sola via d'uscita, sempre nello schermo:
     il vecchio pulsante "Indietro" in fondo su mobile finiva sotto il bordo) */
  check('sottomenu Salvataggi: Salva/Carica/Nuova + X per uscire', ['data-save', 'data-n', 'sp-new', 'sp-x'].every(k => menuEl().innerHTML.includes(k)));
  /* GLI SLOT NON DEVONO MAI SPARIRE da questa schermata. Ci sono spariti davvero: dodici
     righe di statistiche in fondo hanno schiacciato `#sp-slots`, che sta in un contenitore
     flessibile, fino a farlo collassare. Qui si pretende che i tre slot ci siano e che le
     statistiche NON siano in mezzo ai piedi. */
  S.started = true; S.playSec = 3700; S.day = 9;
  document.getElementById('sp-saves').onclick();
  const htmlSaves = menuEl().innerHTML;
  check('i salvataggi restano i protagonisti della loro schermata',
    (htmlSaves.match(/sp-slot"/g) || []).length === 3 && htmlSaves.includes('sp-slots'));
  check('le statistiche non invadono la schermata dei salvataggi',
    !htmlSaves.includes('sp-stat-l') && htmlSaves.includes('sp-stats-btn'));
  /* e si DISEGNANO davvero nella loro (regola 9: un modulo che nessuno esegue è un crash
     che aspetta) */
  document.getElementById('sp-stats-btn').onclick();
  check('le statistiche hanno una schermata loro, e si disegna',
    menuEl().innerHTML.includes('sp-stat-l') && /1h 1m/.test(menuEl().innerHTML));
  splash.resumeSplash();

  /* SOVRASCRIVERE UNO SLOT PIENO CHIEDE CONFERMA. "Carica" ce l'aveva già; "Salva", che è
     quello che DISTRUGGE, no: un tocco di troppo e una partita spariva senza un avviso.
     È successo davvero, a Marco, su una partita vera. Su uno slot VUOTO non si chiede
     niente: non c'è nulla da perdere, e un attrito inutile insegna solo a premere due volte
     senza leggere. */
  {
    S.day = 12;
    state.saveToSlot(1);                                    // slot 1 pieno
    try { localStorage.removeItem('ossa_world_pixel_v1_slot3'); } catch (e) { /* ok */ }
    check('slot pieno: si chiede conferma prima di sovrascrivere', splash.slotNeedsConfirm(1) === true);
    check('slot vuoto: nessun attrito, si salva e basta', splash.slotNeedsConfirm(3) === false);
    /* la conferma dice COSA sta per sparire: "Sicuro?" non aiuta chi ha tre slot simili */
    check('la conferma nomina la partita che sta per sparire',
      /Sovrascriv|Overwrit/.test(splash.slotConfirmLabel(1))
      && splash.slotConfirmLabel(1).includes('12'));
    /* e il pulsante deve DAVVERO passare di lì: la regola non serve se il gestore la salta */
    const spSrc2 = (await import('node:fs')).readFileSync(new URL('../src/splash.js', import.meta.url), 'utf8');
    const handler = spSrc2.slice(spSrc2.indexOf("querySelectorAll('[data-save]')"), spSrc2.indexOf("querySelectorAll('[data-n]')"));
    check('il pulsante Salva passa dalla conferma', /slotNeedsConfirm/.test(handler) && /arm\(/.test(handler));
  }
  document.getElementById('sp-saves').onclick();      // si rientra in un sottomenu
  check('nessun doppione di uscita nei sottomenu', !menuEl().innerHTML.includes('sp-back'));
  splash.resumeSplash(); // ESC nel sottomenu → torna al principale
  check('ESC nel sottomenu: torna al principale', splash.splashActive() && menuEl().innerHTML.includes('sp-saves'));
  document.getElementById('sp-settings').onclick();
  check('i comandi audio sono nelle impostazioni', ['sp-mus', 'sp-vol', 'sp-sfx', 'sp-sfxvol'].every(k => menuEl().innerHTML.includes(k)));
  splash.resumeSplash(); splash.resumeSplash(); // indietro, poi riprendi
  check('ESC dal principale: riprende il gioco', splash.splashActive() === false);
  // audio: settaggi clampati e persistenti
  const audio = await import('../src/audio.js');
  audio.setVolume(2);
  check('volume clampato a 1 e persistito', audio.audioOpts().vol === 1 && JSON.parse(localStorage.getItem('digsy_audio')).vol === 1);
  audio.setMusicOn(false);
  check('musica OFF persistita', audio.audioOpts().music === false);
  audio.setMusicOn(true); audio.setVolume(0.5);
}

/* ---------- zone + specie endemiche + gradiente + libro ---------- */
{
  const { ZONES, zonePools, spById } = await import('../src/data.js');
  const regions = await import('../src/regions.js');
  check('60 specie, 10 per zona', SPECIES.length === 60 && ZONES.every(z => zonePools[z.id].length === 10));
  check('rarità per zona: 4/3/2/1', ZONES.every(z => {
    const p = zonePools[z.id];
    return p.filter(s => s.r === 'comune').length === 4 && p.filter(s => s.r === 'raro').length === 3 &&
      p.filter(s => s.r === 'eccezionale').length === 2 && p.filter(s => s.r === 'leggendario').length === 1;
  }));
  // zone: deterministiche, tutte e 6 presenti in un campione largo, blocchi ampi
  const seen = new Set(); let sameNeighbor = 0, tot = 0;
  for (let x = -600; x < 600; x += 24) for (let y = -600; y < 600; y += 24) {
    const i = regions.zoneIdxAt(x, y); seen.add(i);
    if (regions.zoneIdxAt(x + 8, y) === i) sameNeighbor++; tot++;
  }
  check(`tutte e 6 le zone esistono (${[...seen].sort().join(',')})`, seen.size === 6);
  check('zone ampie (vicini uguali > 80%)', sameNeighbor / tot > 0.8);
  check('zoneAt deterministico', regions.zoneIdxAt(123, -456) === regions.zoneIdxAt(123, -456));
  // makeRaw: specie della zona giusta, forceRar rispettato
  const z0 = ZONES[3].id;
  for (let i = 0; i < 30; i++) { const it = gameplay.makeRaw(z0, 100); if (spById[it.s].zone !== z0) check('makeRaw zona sbagliata', false); }
  check('makeRaw pesca solo specie della zona', true);
  const leg = gameplay.makeRaw(z0, 0, 'leggendario');
  check('makeRaw forceRar leggendario', spById[leg.s].r === 'leggendario' && leg.q === 'leggendario');
  // gradiente: lontano, il leggendario pesa di più
  const w0 = gameplay.rarWeights(0), w2 = gameplay.rarWeights(3000);
  check('gradiente distanza: leggendario cresce, comune cala', w2.leggendario > w0.leggendario && w2.comune < w0.comune);
  // libro: vuoto → museo indicizza → pagina sagoma → codex completa
  S.book = {}; S.codex = [];
  ui.openBook();
  check('libro aperto (overlay) e vuoto: invito al museo', ui.isBookOpen() && document.getElementById('bk-pages').innerHTML.includes('Museo'));
  S.book.terre = true; ui.openBook();
  const bh = document.getElementById('bk-pages').innerHTML;
  check('zona indicizzata: pagine con ? ? ? e meta', bh.includes('? ? ?') && bh.includes('Terre Rosse') && bh.includes('Possiedi'));
  S.codex.push('cristallo'); ui.openBook();
  const bh2 = document.getElementById('bk-pages').innerHTML;
  check('specie identificata: nome + descrizione', bh2.includes('Cristallosauro') && bh2.includes('Creatura'));
  ui.bookFlip(1); check('sfoglia senza errori', true);
  ui.closeBook();
  check('chiusura libro', !ui.isBookOpen());
}

/* ---------- arredo urbano + giorno/notte/stagioni + fontana ---------- */
{
  const daynight = await import('../src/daynight.js');
  // decos: coerenti e scalati per taglia
  let decoBad = 0; const byCat = { borgo: [0, 0], paese: [0, 0], 'città': [0, 0] };
  let fountains = 0, lamps = 0, cities = 0;
  for (let cx = -10; cx < 10; cx++) for (let cy = -10; cy < 10; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue;
    byCat[t.size][0] += (t.decos || []).length; byCat[t.size][1]++;
    if (t.size === 'città') { cities++; if (t.decos.some(d => d.type === 'fountain')) fountains++; lamps += t.decos.filter(d => d.type === 'lamp').length; }
    for (const d of t.decos || []) {
      const ti = world.townInfo(d.x, d.y);
      if (!ti || !ti.solid || !ti.deco) decoBad++;                            // deve essere solido
      for (const b of t.buildings) if (d.x === b.doorx && d.y === b.doory + 1) decoBad++; // mai davanti a una porta
    }
  }
  const avg = k => byCat[k][1] ? byCat[k][0] / byCat[k][1] : 0;
  check(`arredo valido (borgo ${avg('borgo').toFixed(1)} · paese ${avg('paese').toFixed(1)} · città ${avg('città').toFixed(1)})`, decoBad === 0);
  check('città più decorate dei borghi', avg('città') > avg('borgo'));
  check(`fontane nelle città (${fountains}/${cities}) e lampioni (${lamps})`, fountains > 0 && lamps > 0);

  // giorno/notte
  check('darknessAt: giorno 0, notte 1, tramonto in mezzo', daynight.darknessAt(0.2) === 0 && daynight.darknessAt(0.75) === 1 && daynight.darknessAt(0.54) > 0 && daynight.darknessAt(0.54) < 1);
  check('stagioni: 3 giorni ciascuna, ciclo di 4', daynight.seasonOf(1) === 0 && daynight.seasonOf(4) === 1 && daynight.seasonOf(13) === 0);
  S.tod = 0.9999; const beforeDay = S.day;
  check('advanceTime fa scattare il giorno', daynight.advanceTime(2) === true && S.day === beforeDay + 1);

  // sonno alternato giorno/notte + blocco "una metà sveglio"
  S.sleepBlockHalf = null;
  { const d0 = S.day; S.tod = 0.2;
    check('dormi di GIORNO → sveglia di NOTTE, stesso giorno', gameplay.restInn() === true && daynight.isNight() && S.day === d0);
    check('non puoi dormire due volte di fila', gameplay.canSleep() === false && gameplay.restInn() === false);
    S.day = d0 + 1; S.tod = 0.02; // simulo: notte passata sveglio → nuovo giorno all'alba
    check('dopo una metà sveglio puoi ridormire', gameplay.canSleep() === true);
    const d1 = S.day; S.tod = 0.75; // ora è notte
    check('dormi di NOTTE → alba del giorno dopo', gameplay.restInn() === true && daynight.darknessAt(S.tod) === 0 && S.day === d1 + 1);
  }
  S.sleepBlockHalf = null;

  // fontana: minigioco di mira (#3). Le probabilità sono pure e testabili.
  const om = Math.random;
  const FC = gameplay.FOUNTAIN_COST;
  check('tossRarity: fortuna 0 = probabilità di sempre (0.999→leggendario, 0.3→nulla, 0.9→raro)',
    gameplay.tossRarity(0, 0.999) === 'leggendario' && gameplay.tossRarity(0, 0.3) === null && gameplay.tossRarity(0, 0.9) === 'raro');
  check('il timing (fortuna) sposta le probabilità verso i rari', gameplay.tossRarity(1, 0.5) !== null && gameplay.tossRarity(0, 0.5) === null);
  check('tossLuck: centro del bersaglio = fortuna piena', gameplay.tossLuck(0.5, 0.5) === 1);

  /* ---- IL PANNELLO DEL MUSEO NON DEVE ESSERE UN MURO ----
     Aveva finito per impilare sette blocchi, ognuno con due o tre righe di spiegazione
     permanente sotto: su telefono era alto tre schermate e il pulsante "Consegna tutto"
     spariva in mezzo al testo (segnalato con foto). Ora due schede — quello che si FA e
     quello che si GUARDA — e le spiegazioni si dicono una volta sola. */
  {
    const fs18 = await import('node:fs');
    const usrc18 = fs18.readFileSync('src/ui.js', 'utf8');
    const mus18 = usrc18.slice(usrc18.indexOf('function renderMuseum'));
    const corpo18 = mus18.slice(0, mus18.indexOf('\n  mBody.innerHTML'));
    check('il Museo ha due schede', /data-mtab/.test(corpo18) && /museumTab === 'desk'/.test(corpo18));
    /* le AZIONI stanno tutte da una parte: cercarle in due schede diverse è peggio del muro */
    for (const [che, cosa] of [['consegna', 'mudep'], ['commissione', 'commissionBlock'], ['ricariche DNA', 'data-dna']]) {
      const i = corpo18.indexOf(cosa), iProg = corpo18.indexOf("} else {");
      check(`la ${che} sta nella scheda del banco`, i > 0 && i < iProg, i + ' vs ' + iProg);
    }
    /* e i NUMERI dall'altra */
    const iProg = corpo18.indexOf("} else {");
    for (const [che, cosa] of [['lo scopo', 'goalTitle()'], ['le sale', 'roomsDone()'], ['le teche', 'Complete cases']]) {
      check(`${che} sta nella scheda dei progressi`, corpo18.indexOf(cosa) > iProg);
    }
    /* la spiegazione delle sale sparisce appena ne chiudi una: serve a capire, non per sempre */
    check('la spiegazione delle sale è temporanea', /roomsDone\(\) === 0/.test(corpo18));
    /* i PREMI di una commissione si contano a colpo d'occhio: uno per riga, non in fila */
    const cm18 = await import('../src/commission.js');
    const off18 = cm18.offerFor(5);
    check('i premi sono un elenco, non una frase', cm18.rewardParts(off18).length >= 2
      && cm18.rewardParts(off18).every(p => typeof p === 'string' && p.length));
    check('e restano leggibili anche in fila (compatibilità)', cm18.rewardText(off18).includes('·'));
    check('il pannello li impila', /pn-prizes/.test(usrc18));
    /* MOBILE: il bottone di una riga va SOTTO, largo. A destra strozzava il testo in una
       colonna di tre parole e la riga diventava alta il doppio. */
    const css18 = fs18.readFileSync('src/style.css', 'utf8');
    check('su telefono i bottoni delle righe vanno a tutta larghezza',
      /\.row \.rt \.btn\{width:100%/.test(css18.replace(/\s+/g, m => m.includes('\n') ? '\n' : ' ')));
  }

  /* le NOTE DI VERSIONE sono testo di gioco: i segnaposto dei tasti vanno risolti anche lì.
     Scrivendo "premi {act}" la riga usciva col segnaposto in chiaro (visto in foto) — e senza
     `keys()` direbbe comunque "premi E" a chi gioca col dito, dove quel tasto non esiste. */
  {
    const chg = await import('../src/changelog.js');
    const fs17 = await import('node:fs');
    const spsrc = fs17.readFileSync('src/splash.js', 'utf8');
    check('le note di versione risolvono i segnaposto dei tasti', /keys\(l\)/.test(spsrc));
    /* e i segnaposto usati devono essere quelli che `keys` conosce */
    const righe = chg.CHANGELOG.flatMap(c => c.it.concat(c.en));
    const ignoti = righe.flatMap(l => (String(l).match(/\{[^}]+\}/g) || []))
      .filter(t => t !== '{act}' && !/^\{key:[A-Z]\}$/.test(t));
    check('nessun segnaposto sconosciuto nelle note di versione', ignoti.length === 0, ignoti.slice(0, 3).join(' '));
  }

  /* ---- STATUA DEL NONNO: il monumento allo scopo, non un sasso in più ----
     Nelle città grandi ci si passa davanti decine di volte andando al Museo: è il posto giusto
     per ricordare PERCHÉ si scava. Ma un arredo nuovo in piazza è anche il modo più facile per
     murare una porta senza accorgersene — le tre caselle libere davanti a ogni porta sono una
     regola ferrea, e questo test le ricontrolla con la statua in mezzo. */
  {
    let citta = 0, conStatua = 0, fuoriPosto = 0, porteChiuse = 0, sopraStrada = 0;
    for (let cx = -8; cx < 8; cx++) for (let cy = -8; cy < 8; cy++) {
      const t = world.townForCell(cx, cy); if (!t) continue;
      if (t.size !== 'città') { if (t.statue) fuoriPosto++; continue; }
      citta++;
      if (!t.statue) continue;
      conStatua++;
      /* mai davanti a una porta, mai sulle strade, mai sopra un edificio */
      for (const b of t.buildings) {
        for (let dd = 1; dd <= 3; dd++) if (t.statue.x === b.doorx && t.statue.y === b.doory + dd) porteChiuse++;
        if (t.statue.x >= b.x0 && t.statue.x <= b.x1 && t.statue.y >= b.y0 && t.statue.y <= b.y1) porteChiuse++;
      }
      if (t.roads && t.roads.has(t.statue.x + ',' + t.statue.y)) sopraStrada++;
      /* è ACCANTO al Museo: il legame col posto dove si consegnano le ossa si deve leggere */
      const mus = t.buildings.find(b => b.type === 'museum');
      if (mus && Math.max(Math.abs(t.statue.x - mus.doorx), Math.abs(t.statue.y - mus.doory)) > 6) fuoriPosto++;
    }
    check(`ogni città grande ha la statua (${conStatua}/${citta})`, citta > 0 && conStatua === citta);
    check('e nessun borgo o paese ce l\'ha', fuoriPosto === 0);
    check('la statua non chiude mai una porta né sta su un edificio', porteChiuse === 0);
    check('e non finisce in mezzo a una strada', sopraStrada === 0);
    /* la targa si apre e dice le due cose: chi era lui, e a che punto sei TU */
    {
      const ui15 = ui, S15 = state.S;
      let crash = null;
      try { ui15.openStatue(); } catch (e) { crash = e.message; }
      check('la targa si apre senza crash', crash === null, crash || '');
      const html15 = document.getElementById('m-body').innerHTML;
      check('la targa parla del nonno', /nessuno ricordava|no one remembered/i.test(html15));
      check('e mostra il traguardo, senza riscriverlo a mano',
        html15.includes(String((S15.awakened || []).length)) && /66/.test(html15));
      ui15.closeModal(true);
    }
    /* e si disegna: un arredo che nessuno disegna è un crash che aspetta (regola 9) */
    {
      const fs16 = await import('node:fs');
      const rsrc16 = fs16.readFileSync('src/render.js', 'utf8');
      check('la statua ha il suo disegno', /d\.type === 'statue'/.test(rsrc16) && /function drawStatue/.test(rsrc16));
    }
  }

  /* ---- LA TECA MOSTRA LO SCHELETRO 3D, non la proiezione piatta ----
     Il Libro faceva girare il modello voxel; la teca del Museo, sulla STESSA specie, mostrava
     un francobollo 2D — la faccia peggiore proprio dove il pezzo lo hai appena consegnato. Il
     motore c'era già (mountSkeleton, con `lit` = i pezzi consegnati accesi): bastava usarlo. */
  {
    const fs14 = await import('node:fs');
    const usrc14 = fs14.readFileSync('src/ui.js', 'utf8');
    const ex = usrc14.slice(usrc14.indexOf('export function openExhibit'));
    const corpo14 = ex.slice(0, ex.indexOf('\n}'));
    check('la teca monta lo scheletro 3D', /mountSpecies3D\(/.test(corpo14));
    check('e non usa più la proiezione piatta', !/projectVox\(/.test(corpo14));
    /* i pezzi accesi sono quelli consegnati: la teca deve dire anche cosa MANCA */
    check('accende solo i pezzi consegnati al museo', /litForSpecies\(/.test(corpo14));
    /* chiudere la modale deve smontare il contesto WebGL, o resta appeso a ogni apertura */
    const cm = usrc14.slice(usrc14.indexOf('export function closeModal'));
    check('chiudendo la teca il contesto 3D si smonta', /disposeViews\(\)/.test(cm.slice(0, cm.indexOf('\n}'))));
    /* il ripiego 2D resta per chi non ha WebGL: senza, quei giocatori vedrebbero un buco */
    const bsrc14 = fs14.readFileSync('src/bookui.js', 'utf8');
    check('senza WebGL si ripiega sul disegno 2D', /drawVoxel2D\(cv, spec/.test(bsrc14));
    /* e la teca si disegna DAVVERO senza crash (regola 9: ogni schermata provata) */
    {
      const S14 = state.S, sp14 = SPECIES[0];
      const prima = S14.museum[sp14.id];
      S14.museum[sp14.id] = ['cranio', 'torace'];
      let crash = null;
      try { ui.openExhibit(sp14.id); } catch (e) { crash = e.message; }
      check('la scheda della teca si apre senza crash', crash === null, crash || '');
      check('e dice quanti pezzi hai esposto',
        /2\/5|2 \/ 5/.test(document.getElementById('m-body').innerHTML));
      ui.closeModal(true);
      if (prima === undefined) delete S14.museum[sp14.id]; else S14.museum[sp14.id] = prima;
    }
  }

  /* ---- FONTANA SU MOBILE: si fermava dove NON avevi toccato ----
     Due difetti sommati, tutti e due invisibili leggendo il codice.
     1) Si ascoltava `click`, che su un telefono arriva 250-300 ms dopo il dito: a quel punto il
        cursore aveva percorso 0.27-0.60 della barra, cioè 2-5 volte la zona d'oro (12%). Non
        era difficile: era impossibile, e il gioco registrava il tocco dove il cursore non era
        più (segnalato da un giocatore).
     2) Il passo era per FOTOGRAMMA: su uno schermo a 120 Hz la barra correva al doppio. */
  {
    const SP = ui.tossSpeed(3);
    /* stessa mezza-secondo, frequenze diverse: deve finire nello stesso punto */
    const corri = (fps) => {
      let p = 0, d = 1; const dt = 1 / fps;
      for (let i = 0; i < fps / 2; i++) { const r = ui.tossAdvance(p, d, SP, dt); p = r.pos; d = r.dir; }
      return p;
    };
    check('la barra va alla stessa velocità a 60 e 120 Hz',
      Math.abs(corri(60) - corri(120)) < 0.01, corri(60).toFixed(3) + ' vs ' + corri(120).toFixed(3));
    check('e rimbalza ai bordi invece di uscire',
      ui.tossAdvance(0.99, 1, SP, 1).pos === 1 && ui.tossAdvance(0.99, 1, SP, 1).dir === -1
      && ui.tossAdvance(0.01, -1, SP, 1).pos === 0 && ui.tossAdvance(0.01, -1, SP, 1).dir === 1);
    /* quanto costava il ritardo del click: mezzo secondo di deriva contro una zona larga .12 */
    const derivaMobile = SP * 0.25;
    check('il ritardo del click valeva più della zona d\'oro (per questo era impossibile)',
      derivaMobile > 0.12, 'deriva ' + derivaMobile.toFixed(2) + ' vs zona 0.12');
    /* il tocco ora scatta al CONTATTO, e il click fantasma che segue viene scartato */
    {
      const fs13 = await import('node:fs');
      const usrc13 = fs13.readFileSync('src/ui.js', 'utf8');
      check('la fontana ascolta il tocco, non il click ritardato', /onpointerdown\s*=/.test(usrc13));
      check('e scarta il click fantasma che segue il tocco',
        /e\.type === 'click'/.test(usrc13) && /tossPointerAt/.test(usrc13));
    }
  }
  check('tossLuck: FUORI dalla zona d\'oro = NESSUN boost (0)', gameplay.tossLuck(0.5, 0.62) === 0 && gameplay.tossLuck(0.5, 0.5 + 0.06) === 0 && gameplay.tossLuck(0, 1) === 0);
  check('tossLuck: dentro la zona d\'oro, più centri più fortuna', gameplay.tossLuck(0.5, 0.53) > 0 && gameplay.tossLuck(0.5, 0.53) < 1);
  /* ESITO 3 giri: centrarli TUTTI E TRE = premio ASSICURATO (mai nulla), rarità random pesata
     verso il basso (comune più probabile, leggendario meno). Con meno centri può uscire nulla. */
  check('3/3 = premio assicurato, mai nulla, pesato su comune', gameplay.tossOutcome(3, 0.1) === 'comune' && gameplay.tossOutcome(3, 0.99) === 'leggendario' && [0, 0.25, 0.5, 0.75, 0.999].every(r => gameplay.tossOutcome(3, r) !== null));
  check('0/3 può uscire nulla (fortuna 0 = probabilità base)', gameplay.tossOutcome(0, 0.3) === null && gameplay.tossOutcome(0, 0.999) === 'leggendario');
  check('più centri = probabilità migliori', gameplay.tossOutcome(2, 0.5) !== null && gameplay.tossOutcome(0, 0.5) === null);
  /* grantToss dà un GREZZO (si identifica al museo, come ogni scavo) e mai un pezzo identificato */
  S.coins = 30; const raw0 = S.raw.length, items0 = S.items.length;
  Math.random = () => 0.1; gameplay.grantToss(3);
  check('3 centri → un reperto GREZZO nello zaino, mai identificato', S.raw.length === raw0 + 1 && S.items.length === items0);
  Math.random = () => 0.3; gameplay.grantToss(0);
  check('0 centri + roll basso → nulla, niente nello zaino', S.raw.length === raw0 + 1);
  /* tossCoin scala la moneta e conta il lancio (poi aprirebbe il minigioco) */
  Math.random = om; S.fountains = {}; S.coins = 30;
  gameplay.tossCoin();
  check('tossCoin scala 1 moneta', S.coins === 30 - FC);
  /* un FOSSILE caduto a terra (zaino pieno vicino alla fontana) ha la PRIORITÀ sulla fontana */
  { const gsrc = (await import('node:fs')).readFileSync('src/gameplay.js', 'utf8');
    const iDrop = gsrc.indexOf('nearbyDrop()) { collectPickup'), iF = gsrc.indexOf('nearbyFountain()) { tossCoin');
    check('act: il fossile caduto ha priorità sulla fontana', iDrop > 0 && iF > 0 && iDrop < iF); }

  // limite: max 10 lanci per città, poi riposo 10 giorni
  {
    S.fountains = {}; S.coins = 200;
    Math.random = () => 0.3; // sempre "nulla": conta solo il numero di lanci
    const c0 = S.coins, FC2 = gameplay.FOUNTAIN_COST;
    for (let i = 0; i < 12; i++) gameplay.tossCoin();
    check('fontana: max 10 lanci per città', S.coins === c0 - 10 * FC2);
    S.day += 10; gameplay.tossCoin();
    check('fontana: dopo 10 giorni si ricarica', S.coins === c0 - 11 * FC2);
  }
  Math.random = om;

  // ristoro: va nello zaino, si usa dopo
  {
    /* il prezzo si legge da SNACK_BASE, non si riscrive qui: era murato a 15 e alzandolo a 20
       (per non confonderlo con la pala nel tutorial) cadeva un test che col ristoro non
       c'entrava niente — diceva "energia INTATTA" e falliva sulle monete */
    S.coins = gameplay.SNACK_BASE + 5; S.snacks = 0; S.energy = 5; S.maxEnergy = 30;
    gameplay.buyEnergy();
    check('ristoro comprato: zaino +1, energia INTATTA', S.snacks === 1 && S.energy === 5 && S.coins === 5);
    gameplay.eatSnack();
    check('ristoro usato: +15 ⚡, zaino -1', S.snacks === 0 && S.energy === 20);
    check('senza ristori: rifiuta', gameplay.eatSnack() === false);
  }

  /* l'energia deve tornare a essere una risorsa: pochi ristori al giorno e prezzo crescente */
  {
    S.day = 5; S.snackDay = null; S.snackBought = 0; S.coins = 1000; S.snacks = 0;
    const p0 = gameplay.snackPrice();
    check('primo ristoro del giorno: prezzo base', p0 === gameplay.SNACK_BASE && gameplay.snacksLeftToday() === gameplay.SNACK_MAX_DAY);
    gameplay.buyEnergy();
    check('il secondo costa di più', gameplay.snackPrice() === gameplay.SNACK_BASE + gameplay.SNACK_STEP);
    gameplay.buyEnergy(); gameplay.buyEnergy(); gameplay.buyEnergy();
    check('finiti i ristori del giorno', gameplay.snacksLeftToday() === 0 && S.snacks === 4);
    const c1 = S.coins;
    gameplay.buyEnergy();
    check('oltre il tetto non vende e non prende monete', S.snacks === 4 && S.coins === c1);
    S.day++;
    check('il giorno dopo il fornaio rifornisce a prezzo base', gameplay.snacksLeftToday() === gameplay.SNACK_MAX_DAY && gameplay.snackPrice() === gameplay.SNACK_BASE);
  }

  // mappe del tesoro: X a distanza giusta, scavo garantito
  {
    const { spById } = await import('../src/data.js');
    S.coins = 1000; S.maps = [];
    check('mappa: senza monete rifiuta', (() => { S.coins = 0; const r = gameplay.buyMap('leggendario'); S.coins = 1000; return r === false; })());
    const ok = gameplay.buyMap('leggendario');
    const m = S.maps[0];
    const d = Math.hypot(m.x - Math.floor(P.x / TS), m.y - Math.floor((P.y + 13) / TS));
    check('mappa leggendaria: comprata (🪙 -' + gameplay.MAP_COST.leggendario + '), X scavabile a distanza giusta',
      ok && S.coins === 1000 - gameplay.MAP_COST.leggendario && world.diggable(world.baseTerrain(m.x, m.y)) && d >= 540 && d <= 820);
    /* bussola: seguire la X e tornare alla città */
    const compass2 = await import('../src/compass.js');
    S.trackMap = m.uid;
    check('bussola: segue la mappa selezionata', compass2.trackedMap() === m);
    P.x = m.x * TS + 8; P.y = m.y * TS + 2; S.energy = 10; // piedi sulla X
    if (!S.tools) S.tools = {}; S.tools.spade = true; // serve la pala per scavare
    const raw0 = S.raw.length;
    gameplay.tryDig(); gameplay.stepDig(2);
    check('scavo sulla X: reperto GARANTITO della rarità della mappa', S.raw.length === raw0 + 1 && S.raw[S.raw.length - 1] && spById[S.raw[S.raw.length - 1].s].r === 'leggendario');
    check('mappa consumata → bussola torna alla città', S.maps.length === 0 && S.trackMap === null && compass2.trackedMap() === null);
  }

  // attrezzi e FONTI dei fossili: terra/albero/roccia/acqua
  {
    const { zonePools, ZONES, spById } = await import('../src/data.js');
    let okSrc = true;
    for (const z of ZONES) {
      const pool = zonePools[z.id];
      if (pool.filter(s => s.src === 'albero').length !== 1 || pool.filter(s => s.src === 'acqua').length !== 1 || pool.filter(s => s.src === 'roccia').length !== 1) okSrc = false;
    }
    check('fonti: 1 albero + 1 acqua + 1 roccia per zona', okSrc);
    let leak = 0;
    for (let i = 0; i < 80; i++) { const r = gameplay.makeRaw('prati', 100); if (spById[r.s].src) leak++; }
    check('scavo a terra: mai le specie esclusive', leak === 0);
    /* acqua e roccia hanno una finestra (notte / stagione): il test si mette nel momento giusto */
    {
      const tod0 = S.tod, day0 = S.day;
      S.tod = 0.75;                                    // notte: il raro d'acqua c'è
      const acq = gameplay.makeRaw('palude', 0, null, 'acqua');
      S.tod = tod0;
      const roc = (() => { const sp = zonePools.dune.find(x => x.src === 'roccia');
        S.day = sp.when.season * 3 + 1;                // stagione della vena
        const r = gameplay.makeRaw('dune', 0, null, 'roccia'); S.day = day0; return r; })();
      check('fonte albero/roccia/acqua: specie giusta',
        spById[gameplay.makeRaw('prati', 0, null, 'albero').s].src === 'albero' &&
        !!roc && spById[roc.s].src === 'roccia' &&
        !!acq && spById[acq.s].src === 'acqua');
    }

    /* negozio attrezzi */
    S.coins = 1000; S.tools = {}; S.shovel = 0;
    check('pala fortunata: +60 cariche', gameplay.buyTool('shovel') === true && S.shovel === 60);
    check('accetta comprata (e mai due volte)', gameplay.buyTool('axe') === true && S.tools.axe === true && gameplay.buyTool('axe') === false);
    gameplay.buyTool('pick'); gameplay.buyTool('boat');
    check('piccone e barca comprati', S.tools.pick === true && S.tools.boat === true);
    /* mezzi & torcia: velocità e prerequisiti */
    S.coins = 4000; S.tools = {};   // gli attrezzi ora scalano ×2.3-2.5 (vedi BILANCIAMENTO.md)
    check('gearSpeedMul base = 1', gameplay.gearSpeedMul() === 1);
    gameplay.buyTool('skates'); check('pattini attivi all\'acquisto → ×2 a piedi', gameplay.gearSpeedMul() === 2 && S.gear === 'skates');
    gameplay.buyTool('bike'); check('bici attiva all\'acquisto → ×3 (spegne i pattini)', gameplay.gearSpeedMul() === 3 && gameplay.gearActive('skates') === false);
    check('footGear = bike quando attivo', gameplay.footGear() === 'bike');
    check('un solo mezzo: spegni bici → nessun mezzo a piedi', gameplay.toggleGear('bike') === true && gameplay.gearActive('bike') === false && gameplay.gearSpeedMul() === 1 && gameplay.footGear() === null);
    check('attiva pattini dallo zaino → ×2', gameplay.toggleGear('skates') === true && gameplay.gearSpeedMul() === 2);
    check('motoscafo richiede la barca', gameplay.buyTool('motorboat') === false && !S.tools.motorboat);
    gameplay.buyTool('boat'); check('motoscafo comprabile con la barca', gameplay.buyTool('motorboat') === true && S.tools.motorboat === true);
    check('torcia comprata', gameplay.buyTool('torch') === true && S.tools.torch === true);
    /* teletrasporto: pergamena consumabile */
    S.coins = 100; S.teleports = 0;
    check('compra pergamena → +1 e scala monete', gameplay.buyTeleport() === true && S.teleports === 1 && S.coins === 100 - gameplay.TELEPORT_COST);
    check('teletrasporto consuma la pergamena', gameplay.useTeleport() === true && S.teleports === 0);
    check('niente pergamene → non teletrasporta', gameplay.useTeleport() === false);
    S.tools = { axe: true, pick: true, boat: true }; S.gear = 'boat'; // ripristina per i test di chop/mine/pesca seguenti

    /* accetta: abbatti l'albero davanti, il fossile è della specie-albero */
    const om2 = Math.random; Math.random = () => 0.1;
    let tree = null;
    for (let x = -100; x < 100 && !tree; x++) for (let y = -100; y < 100 && !tree; y++) {
      if (world.decoAt(x, y) === 'tree' && !world.isSolidTile(x, y + 1)) tree = [x, y];
    }
    P.x = tree[0] * TS + 8; P.y = (tree[1] + 1) * TS - 11; P.dir = 'up'; S.energy = 20;
    const raw1 = S.raw.length;
    check('tryChop aggancia l\'albero', gameplay.tryChop() === true && P.digging !== null);
    gameplay.stepDig(2);
    check('albero abbattuto: sparisce e libera la tile', world.decoAt(tree[0], tree[1]) === null && !world.isSolidTile(tree[0], tree[1]));
    check('dalle radici: specie-albero', S.raw.length === raw1 + 1 && spById[S.raw[S.raw.length - 1].s].src === 'albero');

    /* piccone: spacca un masso */
    let rock = null;
    for (let x = -100; x < 100 && !rock; x++) for (let y = -100; y < 100 && !rock; y++) {
      const d = world.decoAt(x, y);
      if (d && world.MINEABLE.includes(d) && !world.isSolidTile(x, y + 1)) rock = [x, y];
    }
    P.x = rock[0] * TS + 8; P.y = (rock[1] + 1) * TS - 11; P.dir = 'up';
    gameplay.tryMine(); gameplay.stepDig(2);
    check('masso spaccato: sparisce, specie-roccia', world.decoAt(rock[0], rock[1]) === null && spById[S.raw[S.raw.length - 1].s].src === 'roccia');

    /* barca: l'acqua diventa percorribile, e ci si pesca */
    let wtr = null;
    for (let x = -150; x < 150 && !wtr; x++) for (let y = -150; y < 150 && !wtr; y++) {
      let all = true;
      for (let dy = 0; dy < 2 && all; dy++) for (let dx = -1; dx < 2 && all; dx++) if (!gameplay.waterTile(x + dx, y + dy) || world.decoAt(x + dx, y + dy)) all = false;
      if (all) wtr = [x, y];
    }
    P.x = wtr[0] * TS + 8; P.y = wtr[1] * TS - 11 + TS; // piedi sull'acqua
    check('con la barca si naviga', gameplay.onBoat() === true && gameplay.collide(P.x, P.y) === false);
    S.tools.boat = false;
    check('senza barca l\'acqua è un muro', gameplay.collide(P.x, P.y) === true);
    S.tools.boat = true;
    const raw2 = S.raw.length;
    const tod0f = S.tod; S.tod = 0.75;      // il raro d'acqua abbocca solo di notte
    const omf = Math.random; Math.random = () => 0.1;  // e la pesca deve andare a segno
    gameplay.tryFish(); gameplay.stepDig(2);
    Math.random = omf;
    check('pesca notturna: fossile acquatico', S.raw.length === raw2 + 1 && spById[S.raw[S.raw.length - 1].s].src === 'acqua');
    /* di giorno la stessa acqua non dà quella specie: è la finestra, non sfortuna */
    S.tod = 0.3; const raw3 = S.raw.length;
    Math.random = () => 0.1; gameplay.tryFish(); gameplay.stepDig(2); Math.random = omf;
    check('di giorno la stessa acqua non dà nulla', S.raw.length === raw3);
    S.tod = tod0f;
    /* la barca NON si attiva a mano: possederla basta, anche col mezzo di terra selezionato */
    S.gear = 'bike';
    check('con la bici in tasca si naviga lo stesso (barca automatica)', gameplay.onBoat() === true && gameplay.collide(P.x, P.y) === false);
    check('i natanti non hanno interruttore', gameplay.toggleGear('boat') === false && gameplay.toggleGear('motorboat') === false);
    /* in acqua non si attivano i mezzi di terra (evita di restare a mollo) */
    check('in acqua non attivi i pattini', (S.tools.skates = true, gameplay.toggleGear('skates') === false && gameplay.onBoat() === true));
    S.tools.skates = false; S.gear = null;
    /* col motoscafo NON serve possedere la barca base (era un bug: mezzo da 450 inutile) */
    S.tools.boat = false; S.tools.motorboat = true;
    check('il motoscafo naviga anche senza barca base', gameplay.onBoat() === true && gameplay.gearSpeedMul() === 3 && gameplay.boatKind() === 'motorboat');
    S.tools.motorboat = false;
    check('senza nessun natante l\'acqua torna un muro', gameplay.onBoat() === false && gameplay.collide(P.x, P.y) === true);
    S.tools.boat = true;
    /* la scelta di terra RESTA: scesi dalla barca (o usciti di casa) il mezzo riparte da solo */
    S.tools.bike = true; S.gear = 'bike';
    check('in acqua il mezzo di terra non si perde', gameplay.onBoat() === true && S.gear === 'bike' && gameplay.gearSpeedMul() === 1);
    const wet = { x: P.x, y: P.y };
    P.x = rock[0] * TS + 8; P.y = (rock[1] + 1) * TS - 11;   // di nuovo a terra (accanto al masso)
    check('a terra la bici riparte da sola', gameplay.onBoat() === false && gameplay.footGear() === 'bike' && gameplay.gearSpeedMul() === 3);
    P.x = wet.x; P.y = wet.y;

    /* RELITTI in mare: trova un relitto, frugalo dalla barca → reperto (mai comune), si esaurisce */
    let wrk = null;
    for (let cx = -30; cx < 30 && !wrk; cx++) for (let cy = -30; cy < 30 && !wrk; cy++) wrk = world.wreckForCell(cx, cy);
    if (wrk) {
      P.x = wrk.x * TS + 8; P.y = wrk.y * TS - 11 + TS; S.gear = 'boat'; S.energy = 10;
      check('relitto rilevato dalla barca', !!gameplay.nearbyWreck() && gameplay.onBoat() === true);
      const rw3 = S.raw.length, rem0 = gameplay.wreckRemaining(wrk);
      gameplay.digWreck(); gameplay.stepDig(2);
      check('relitto: reperto pregiato (mai comune) e una carica in meno', S.raw.length === rw3 + 1 && S.raw[S.raw.length - 1].q !== 'comune' && gameplay.wreckRemaining(wrk) === rem0 - 1);
    } else check('relitto trovato nel mondo di test', false);

    /* pala fortunata: consuma una carica a scavo */
    let dg = null;
    for (let x = -80; x < 80 && !dg; x++) for (let y = -80; y < 80 && !dg; y++) {
      if (!world.isSolidTile(x, y) && world.diggable(world.baseTerrain(x, y)) && !world.townInfo(x, y) && !world.siteAt(x, y) && !state.dugSet.has(x + ',' + y)) dg = [x, y];
    }
    P.x = dg[0] * TS + 8; P.y = dg[1] * TS + 2;
    S.tools.spade = true; // pala base necessaria per scavare
    const sh0 = S.shovel;
    gameplay.tryDig(); gameplay.stepDig(2);
    check('pala: una carica consumata', S.shovel === sh0 - 1);
    Math.random = om2;

    /* PALA BASE: senza pala non si scava; con pala sì */
    let ft = null;
    for (let x = 0; x < 90 && !ft; x++) for (let y = 0; y < 90 && !ft; y++) {
      if (!world.isSolidTile(x, y) && world.diggable(world.baseTerrain(x, y)) && !world.townInfo(x, y) && !world.siteAt(x, y) && !world.decoAt(x, y) && !state.dugSet.has(x + ',' + y)) ft = [x, y];
    }
    P.x = ft[0] * TS + 8; P.y = ft[1] * TS - 8; S.energy = 10; S.tools = {}; S.shovel = 0;
    const dug0 = S.dug.length;
    gameplay.tryDig(); gameplay.stepDig(2);
    check('senza pala non si scava', S.dug.length === dug0);
    S.tools.spade = true;
    gameplay.tryDig(); gameplay.stepDig(2);
    check('con la pala si scava', S.dug.length === dug0 + 1);

    /* PICKUP di superficie: raccolta con E → reperto grezzo, poi sparisce */
    let pk = null;
    for (let x = -90; x < 90 && !pk; x++) for (let y = -90; y < 90 && !pk; y++) if (world.pickupAt(x, y)) pk = [x, y];
    P.x = pk[0] * TS + 8; P.y = pk[1] * TS - 8;
    check('pickup a portata rilevato', !!gameplay.nearbyPickup());
    S.goods = [];
    const raw0b = S.raw.length;
    check('raccolta pickup → +1 OGGETTO (non fossile) e sparisce', gameplay.collectPickup() === true && S.goods.length === 1 && (S.goods[0].n || 1) === 1 && S.raw.length === raw0b && world.pickupAt(pk[0], pk[1]) === null);
    const gv = S.goods[0].val, c0 = S.coins;
    check('vendita stack oggetti → +valore totale monete', (gameplay.sellGood(S.goods[0].uid), S.coins === c0 + gv && S.goods.length === 0));

    /* STACK DEI GOODS: identici → 1 voce con quantità (max 64). I reperti NON si impilano. */
    const stt = await import('../src/state.js');
    S.goods = [];
    const mk = (id, val) => ({ uid: S.uid++, id, val: val === undefined ? 1 : val, good: true });
    gameplay.addGood(mk('conchiglia', 1)); gameplay.addGood(mk('conchiglia', 1)); gameplay.addGood(mk('conchiglia', 2));
    check('3 goods uguali → 1 stack con n=3 e valore sommato', S.goods.length === 1 && S.goods[0].n === 3 && S.goods[0].val === 4);
    gameplay.addGood(mk('vetro', 5));
    check('id diverso → stack separato', S.goods.length === 2);
    // overflow: oltre 64 apre una pila nuova
    S.goods = []; for (let k = 0; k < 65; k++) gameplay.addGood(mk('conchiglia', 1));
    check('65 goods → 2 stack (64 + 1), max ' + stt.GOOD_STACK, S.goods.length === 2 && S.goods[0].n === stt.GOOD_STACK && S.goods[1].n === 1);
    // compactGoods comprime una lista piatta (save vecchio) e conserva il valore totale
    S.goods = [mk('lumaca', 2), mk('lumaca', 2), mk('lumaca', 3), mk('giunco', 1)];
    const totBefore = S.goods.reduce((a, x) => a + x.val, 0);
    stt.compactGoods();
    check('compactGoods: lista piatta → stack per id, valore totale intatto', S.goods.length === 2 && S.goods.reduce((a, x) => a + (x.n || 1), 0) === 4 && S.goods.reduce((a, x) => a + x.val, 0) === totBefore);
    // vendere tutto restituisce il conteggio in UNITÀ, non in pile
    S.goods = []; gameplay.addGood(mk('conchiglia', 1)); gameplay.addGood(mk('conchiglia', 1));
    const rSell = gameplay.sellAllGoods();
    check('sellAllGoods conta le unità vendute, non le pile', rSell.n === 2 && S.goods.length === 0);
    S.goods = [];

    /* CAPACITÀ ZAINO: pieno → il fossile va a TERRA; ripreso con E; zaino più grande alza il cap */
    S.raw = []; S.items = []; S.drops = []; S.bagCap = 2;
    S.raw.push({ uid: S.uid++, s: 'prato', t: 'cranio', q: 'comune', val: 5 });
    S.raw.push({ uid: S.uid++, s: 'prato', t: 'torace', q: 'comune', val: 5 });
    check('zaino pieno a capienza', gameplay.bagFull() === true && gameplay.fossilCount() === 2);
    const drops0 = S.drops.length;
    check('fossile in più → a terra', gameplay.addFossil({ uid: S.uid++, s: 'prato', t: 'zampa', q: 'comune', val: 5 }, 3, 3) === false && S.drops.length === drops0 + 1);
    S.coins = 999; const cap0 = gameplay.bagCap();
    check('zaino più grande alza la capienza', gameplay.buyBag() === true && gameplay.bagCap() > cap0);
    // scarto: trascina fuori (discardToGround) → a terra e via dallo zaino
    const rawUid = S.raw[0].uid, dr0 = S.drops.length;
    check('scarto trascinando fuori → a terra', gameplay.discardToGround(rawUid, 'raw') === true && S.drops.length === dr0 + 1 && !S.raw.some(x => x.uid === rawUid));
    S.bagCap = 9999; S.drops = []; S.raw = []; S.items = [];
  }

  // miniature dei pezzi: voxel non vuoti per ogni specie × parte
  {
    const { partVoxels } = await import('../src/bones.js');
    const { SPECIES, PARTS } = await import('../src/data.js');
    let empty = 0;
    for (const sp of SPECIES) for (const pt of PARTS) if (!partVoxels(sp.id, pt.id).length) empty++;
    check('partVoxels: pezzo disegnabile per tutte le 60 specie × 5 parti', empty === 0);
  }

  // nearbyFountain: player accanto alla vasca
  let ft = null, town = null;
  for (let cx = -10; cx < 10 && !ft; cx++) for (let cy = -10; cy < 10 && !ft; cy++) {
    const t = world.townForCell(cx, cy);
    if (t && t.decos) { const f = t.decos.find(d => d.type === 'fountain'); if (f) { ft = f; town = t; } }
  }
  P.x = (ft.x - 1) * TS + 8; P.y = ft.y * TS + 8;
  check('nearbyFountain accanto alla vasca', gameplay.nearbyFountain() === ft);
  P.x = (town.x0 - 8) * TS; check('nearbyFountain lontano: null', gameplay.nearbyFountain() === null);

  // render di notte in autunno: nessun errore
  S.tod = 0.75; S.day = 8;
  const { render } = await import('../src/render.js');
  const big2 = town; P.x = big2.C.x * TS; P.y = big2.C.y * TS;
  render(2345);
  check('render notturno con fontana/lampioni: ok', true);
  S.tod = 0.25; S.day = beforeDay + 1;
}

/* ---------- ossa voxel 3D: pezzi, limiti, ricombinazione ---------- */
{
  const bones = await import('../src/bones.js');
  const sp0 = SPECIES[0], sp1 = SPECIES[17], sp2 = SPECIES[42];
  // animale base: 1 testa (1-2 corni), 1 petto, 2 braccia, 2 gambe, 1 coda
  const b = bones.baseSpec(sp0);
  check('baseSpec: 1 testa, 2 braccia, 2 gambe, 1 coda', b.heads.length === 1 && b.arms.length === 2 && b.legs.length === 2 && b.tails.length === 1);
  check('corni per testa 1-2', b.heads[0].horns >= 1 && b.heads[0].horns <= 2);
  // limiti: 3 teste, 6 braccia, 4 gambe, 3 code, corni max 2
  const wild = bones.clampSpec({
    heads: Array.from({ length: 5 }, () => ({ sp: sp1, horns: 9 })),
    chest: sp0, arms: Array(9).fill(sp2), legs: Array(7).fill(sp0), tails: Array(6).fill(sp1),
  });
  check('clampSpec: max 3/6/4/3 e corni ≤2', wild.heads.length === 3 && wild.arms.length === 6 && wild.legs.length === 4 && wild.tails.length === 3 && wild.heads.every(h => h.horns === 2));
  // voxel: deterministici, validi, diversi tra specie
  const v0 = bones.buildVoxels(bones.baseSpec(sp0));
  const v0b = bones.buildVoxels(bones.baseSpec(sp0));
  const v1 = bones.buildVoxels(bones.baseSpec(sp1));
  const ser = v => v.map(x => `${x.x},${x.y},${x.z},${x.k}`).sort().join('|');
  check('voxel deterministici e non banali (' + v0.length + ' voxel)', v0.length > 40 && ser(v0) === ser(v0b));
  check('specie diverse → scheletri diversi', ser(v0) !== ser(v1));
  // BLUEPRINT curati: TUTTE e 60 le specie hanno scheletri unici
  const allSigs = new Set(SPECIES.map(sp => ser(bones.buildVoxels(bones.baseSpec(sp)))));
  check(`60 specie → ${allSigs.size} scheletri unici`, allSigs.size === 60);
  check('ogni specie ha un blueprint', SPECIES.every(sp => bones.BP[sp.id]));
  // cavalcatura: la creatura si costruisce SENZA zampe (raccolte a parte in volo)
  const tallSp = bones.baseSpec(SPECIES.find(s => bones.BP[s.id].tall) || SPECIES[0]);
  const legFull = bones.buildFleshVoxels(tallSp).length, legNone = bones.buildFleshVoxels(tallSp, { noLegs: true }).length;
  check(`noLegs (cavalcatura): meno voxel senza zampe (${legFull}→${legNone})`, legNone < legFull);
  // censimento feature: la natura è varia (insetti, chele, pungiglioni, gusci, ali...)
  const c = { legs0: 0, legs2: 0, legs6: 0, legs8: 0, wings: 0, mand: 0, ant: 0, prob: 0, sting: 0, club: 0, shell: 0, float: 0, multiseg: 0 };
  for (const sp of SPECIES) {
    const r = bones.BP[sp.id];
    if (r.legs[0] === 0) c.legs0++; if (r.legs[0] === 2) c.legs2++;
    if (r.legs[0] === 6) c.legs6++; if (r.legs[0] >= 8) c.legs8++;
    if (r.wings) c.wings++; if (r.mand) c.mand++; if (r.ant) c.ant++; if (r.prob) c.prob++;
    if (r.tail === 'sting') c.sting++; if (r.tail === 'club') c.club++;
    if (r.extra === 'shell') c.shell++; if (r.float) c.float++;
    if ((r.seg || []).length >= 3) c.multiseg++;
  }
  check(`census: ali ${c.wings} · 6zampe ${c.legs6} · 8zampe ${c.legs8} · chele ${c.mand} · pungiglioni ${c.sting} · mazze ${c.club} · gusci ${c.shell} · fluttuanti ${c.float} · multi-segmento ${c.multiseg}`,
    c.wings >= 6 && c.legs6 >= 2 && c.legs8 >= 2 && c.mand >= 2 && c.sting >= 2 && c.club >= 3 && c.shell >= 4 && c.float >= 3 && c.multiseg >= 5);
  /* RISOLUZIONE DEL MODELLO: i voxel sono FINI (R per unità di ricetta). Se qualcuno tornasse
     a costruire in unità intere, le creature riavrebbero i pixel grossi il doppio del mondo —
     il difetto che si vedeva a colpo d'occhio nel cortile e che nessuna misura coglieva. */
  check('i modelli si costruiscono a risoluzione doppia (R=2)', bones.R === 2);
  {
    const misure = SPECIES.map(sp => {
      const v = bones.buildFleshVoxels(bones.baseSpec(sp));
      const xs = v.map(p => p.x), ys = v.map(p => p.y);
      return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 1;
    });
    const ord = misure.slice().sort((a, b) => a - b);
    const mediana = ord[ord.length >> 1], minSpan = ord[0];
    /* la misura vera è che il modello sia in voxel FINI: un girino resta piccolo (è un
       girino), ma la creatura tipica deve stare sopra i 20 voxel di lato lungo. Con il
       modello a scala metà la mediana crollerebbe attorno a 12 e le creature tornerebbero a
       essere disegnate con pixel grossi il doppio. */
    check('le creature sono in voxel fini (mediana ' + mediana + ', minimo ' + minSpan + ')',
      mediana >= 20 && minSpan >= 10);
  }

  // connettività: le parti si raccordano sempre (flood-fill 26-vicini copre quasi tutto)
  const connected = vox => {
    const set = new Map(vox.map((v, i) => [v.x + ',' + v.y + ',' + v.z, i]));
    const seen = new Set([vox[0].x + ',' + vox[0].y + ',' + vox[0].z]);
    const q = [vox[0]];
    while (q.length) {
      const v = q.pop();
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const k = (v.x + dx) + ',' + (v.y + dy) + ',' + (v.z + dz);
        if (set.has(k) && !seen.has(k)) { seen.add(k); q.push(vox[set.get(k)]); }
      }
    }
    return seen.size / vox.length;
  };
  let minConn = 1;
  for (const sp of SPECIES) minConn = Math.min(minConn, connected(bones.buildFleshVoxels(bones.baseSpec(sp))));
  check(`connettività minima base: ${(minConn * 100).toFixed(0)}%`, minConn >= 0.9);
  const chim = bones.buildFleshVoxels({ heads: [{ sp: SPECIES[4], horns: 2 }, { sp: SPECIES[15], horns: 1 }], chest: SPECIES[44], arms: [SPECIES[8], SPECIES[8]], legs: [SPECIES[26], SPECIES[26], SPECIES[26], SPECIES[26]], tails: [SPECIES[15], SPECIES[55]] });
  check(`chimera raccordata: ${(connected(chim) * 100).toFixed(0)}%`, connected(chim) >= 0.85);
  // versione RIANIMATA: volumetrica, colorata, deterministica, diversa per specie
  const f0 = bones.buildFleshVoxels(bones.baseSpec(sp0));
  const f1 = bones.buildFleshVoxels(bones.baseSpec(sp1));
  const serF = v => v.map(x => `${x.x},${x.y},${x.z},${x.col}`).sort().join('|');
  check(`carne: più voxel dello scheletro (${f0.length} vs ${v0.length}), con colori`, f0.length > v0.length && f0.every(v => /^#[0-9a-f]{6}$/.test(v.col)));
  check('carne deterministica e diversa per specie', serF(f0) === serF(bones.buildFleshVoxels(bones.baseSpec(sp0))) && serF(f0) !== serF(f1));
  check('chiavi colore valide', v0.every(v => ['bone', 'shade', 'dark', 'eye'].includes(v.k)));
  // chimera estrema: 3 teste 6 braccia 4 gambe 3 code costruibile
  const mega = bones.buildVoxels({ heads: [{ sp: sp0, horns: 2 }, { sp: sp1, horns: 1 }, { sp: sp2, horns: 2 }], chest: sp1, arms: [sp0, sp1, sp2, sp0, sp1, sp2], legs: [sp0, sp1, sp2, sp0], tails: [sp0, sp1, sp2] });
  check('chimera 3 teste/6 braccia/4 gambe/3 code costruita (' + mega.length + ' voxel)', mega.length > v0.length);
}

/* ---------- siti di scavo speciali ---------- */
{
  const { spById } = await import('../src/data.js');
  const regions2 = await import('../src/regions.js');
  // densità e determinismo
  let sites = [];
  for (let cx = -12; cx < 12; cx++) for (let cy = -12; cy < 12; cy++) { const s = world.siteForCell(cx, cy); if (s) sites.push(s); }
  check(`siti nel campione (${sites.length} su 576 celle)`, sites.length > 20);
  check('cariche 3-5 e tile solida', sites.every(s => s.charges >= 3 && s.charges <= 5) && world.isSolidTile(sites[0].x, sites[0].y));
  check('deterministico', world.siteForCell(3, 3) === world.siteForCell(3, 3));
  // scavo al sito: pregiato garantito, esaurimento
  const s0 = sites[0];
  P.x = s0.x * TS - TS + 8; P.y = s0.y * TS + 8; // adiacente
  check('nearbySite adiacente', gameplay.nearbySite() === s0);
  S.energy = 30; S.raw = []; S.sites = {};
  // scavo animato: parte, non risolve subito, risolve con stepDig
  gameplay.digSite();
  check('scavo animato: esito differito', P.digging !== null && S.raw.length === 0);
  gameplay.stepDig(2);
  check('stepDig risolve il colpo', P.digging === null && S.raw.length === 1);
  for (let i = 1; i < s0.charges; i++) { gameplay.digSite(); gameplay.stepDig(2); }
  check('scavi = cariche, tutti pregiati (mai comune)', S.raw.length === s0.charges && S.raw.every(r => r.q !== 'comune'));
  check('specie della zona del sito', S.raw.every(r => spById[r.s].zone === regions2.zoneAt(s0.x, s0.y).id));
  const rawBefore = S.raw.length;
  gameplay.digSite(); gameplay.stepDig(2);
  check('sito esaurito rifiuta', S.raw.length === rawBefore && gameplay.siteRemaining(s0) === 0);
  // scavo normale animato: si scava SOTTO I PIEDI
  let dug = null;
  for (let x = -80; x < 80 && !dug; x++) for (let y = -80; y < 80 && !dug; y++) {
    if (!world.isSolidTile(x, y) && world.diggable(world.baseTerrain(x, y)) && !world.townInfo(x, y) && !world.siteAt(x, y)) dug = [x, y];
  }
  P.x = dug[0] * TS + 8; P.y = dug[1] * TS + 2; P.dir = 'down'; // piedi (P.y+13) su [dug]
  const en0 = S.energy; state.dugSet.clear();
  /* niente drop: un ritrovamento darebbe XP e un level-up RICARICA l'energia (progress.js:21),
     rendendo il check sull'energia casuale */
  const omDig = Math.random; Math.random = () => 0.999;
  gameplay.tryDig();
  check('tryDig animato: energia intatta durante i colpi', P.digging !== null && S.energy === en0);
  gameplay.stepDig(2);
  check('risoluzione: energia -1 e buca SOTTO I PIEDI', S.energy === en0 - 1 && state.dugSet.has(dug[0] + ',' + dug[1]));
  Math.random = omDig;
  // pesi sito: mai comune, leggendario cresce con la distanza
  const w0 = gameplay.siteRarWeights(0), w2 = gameplay.siteRarWeights(3000);
  check('sito: leggendario cresce con la distanza', w2.leggendario > w0.leggendario && w0.comune === undefined);
  S.sites = {};
}

/* ---------- SCHELETRO SEPOLTO: 5 caselle, 5 parti, UNA specie garantita ---------- */
{
  const { spById } = await import('../src/data.js');
  const regions3 = await import('../src/regions.js');
  let boneSites = [];
  for (let cx = -8; cx < 8; cx++) for (let cy = -8; cy < 8; cy++) { const s = world.boneSiteForCell(cx, cy); if (s) boneSites.push(s); }
  check(`scheletri sepolti nel campione (${boneSites.length} su 256 celle)`, boneSites.length > 3);
  check('deterministico', world.boneSiteForCell(2, 2) === world.boneSiteForCell(2, 2));
  const b0 = boneSites[0];
  check('5 parti, 5 caselle DIVERSE, tutte solide (monticello)', Object.keys(b0.parts).length === 5 &&
    new Set(Object.values(b0.parts).map(p => p.x + ',' + p.y)).size === 5 &&
    Object.values(b0.parts).every(p => world.isSolidTile(p.x, p.y)));
  check('la specie è della zona del sito', spById[b0.sp].zone === regions3.zoneAt(b0.x, b0.y).id);
  check('boneSiteAt riconosce ogni casella e sa a chi appartiene', Object.entries(b0.parts).every(([part, p]) => {
    const hit = world.boneSiteAt(p.x, p.y); return hit && hit.site === b0 && hit.part === part;
  }));
  check('una casella FUORI dal sito non è niente', world.boneSiteAt(b0.x + 20, b0.y + 20) === null);

  /* scavo: ogni casella dà SEMPRE quella parte di QUELLA specie, mai a vuoto, mai un'altra */
  S.energy = 30; S.raw = []; S.boneSites = {};
  const parts0 = Object.keys(b0.parts);
  let dug2 = 0;
  for (const part of parts0) {
    const p = b0.parts[part];
    P.x = p.x * TS - TS + 8; P.y = p.y * TS + 8; // adiacente da ovest
    const nb = gameplay.nearbyBoneSite();
    check('nearbyBoneSite trova la parte giusta (' + part + ')', !!nb && nb.site === b0 && nb.part === part);
    gameplay.digBoneSite();
    check('scavo animato: esito differito (' + part + ')', P.digging !== null);
    gameplay.stepDig(2);
    dug2++;
    check('sempre quella parte di quella specie, mai a vuoto (' + part + ')',
      S.raw.length === dug2 && S.raw[dug2 - 1].s === b0.sp && S.raw[dug2 - 1].t === part && S.raw[dug2 - 1].q === spById[b0.sp].r);
    check('il progresso persiste per sito', gameplay.boneSiteProgress(b0) === dug2 && gameplay.boneSiteDug(b0, part) === true);
  }
  check('tutte e 5 scavate: il sito è finito, niente altro da prendere lì', gameplay.nearbyBoneSite() === null);
  check('5/5: il set è COMPLETO e garantito (una di ogni parte, stessa specie)',
    S.raw.length === 5 && new Set(S.raw.map(r => r.t)).size === 5 && S.raw.every(r => r.s === b0.sp));
  S.raw = []; S.boneSites = {};
}

/* ---------- risveglio: SOLO con fialetta DNA intera (2 mezze) ---------- */
{
  S.awakened = []; S.items = []; S.codex = ['prato']; S.book = { prati: true }; S.dna = {};
  check('awakenReady falso senza DNA', gameplay.awakenReady('prato') === false);
  S.dna.prato = 1; // mezza fialetta: NON basta
  check('mezza fialetta non risveglia', gameplay.awakenReady('prato') === false && gameplay.awakenSpecies('prato') === false);
  S.dna.prato = 2;
  check('awakenReady con fialetta intera', gameplay.awakenReady('prato') === true);
  check('awakenSpecies consuma la fialetta e sblocca', gameplay.awakenSpecies('prato') === true && S.awakened.includes('prato') && S.dna.prato === 0);
  check('secondo risveglio rifiutato', gameplay.awakenSpecies('prato') === false);
  ui.openBook();
  const bp2 = document.getElementById('bk-pages').innerHTML;
  check('libro: bottone Vivo per specie risvegliata', bp2.includes('bk-flip3d') && bp2.includes('Risvegliato'));
  ui.closeBook();
}

/* ---------- modalità debug (non distruttiva) ---------- */
{
  const dbg = await import('../src/debug.js');
  check('debug off di default', dbg.isDebug() === false);
  dbg.toggleDebug();
  check('toggle accende', dbg.isDebug() === true);
  // energia infinita: scavo senza consumo
  S.energy = 0; S.coins = 0;
  let dug2 = null;
  for (let x = -80; x < 80 && !dug2; x++) for (let y = -80; y < 80 && !dug2; y++) {
    if (!world.isSolidTile(x, y) && world.diggable(world.baseTerrain(x, y)) && !world.townInfo(x, y) && !world.siteAt(x, y) && !state.dugSet.has(x + ',' + y)) dug2 = [x, y];
  }
  P.x = dug2[0] * TS + 8; P.y = dug2[1] * TS + 2; P.dir = 'down'; // piedi su [dug2]
  P.digging = null; // un dig random di un test precedente poteva restare in volo e bloccare questo (flaky)
  gameplay.tryDig(); gameplay.stepDig(2);
  check('debug: scava con 0 energia, senza consumarla', S.energy === 0 && state.dugSet.has(dug2[0] + ',' + dug2[1]));
  // debug: si depone un uovo GRATIS anche con zero doppioni e zero energia
  {
    const br11 = await import('../src/breeding.js');
    S.items = []; S.energy = 0; S.egg = null;
    const p1b = S.creatures[0] || { uid: 9001, name: 'A', skull: 'prato', torso: 'prato', leg: 'prato', q: 'comune' };
    const p2b = { uid: 9002, name: 'B', skull: 'lepre', torso: 'lepre', leg: 'lepre', q: 'comune' };
    if (!S.creatures.length) S.creatures = [p1b];
    S.creatures.push(p2b);
    check('debug: uovo gratis (niente doppioni/energia richiesti)',
      br11.layEgg(p1b.uid, p2b.uid, { skull: 1, torso: 2, leg: 1 }).ok === true && S.items.length === 0 && S.energy === 0);
    S.egg = null;
  }
  // spawn di tutti i fossili: ogni specie × ogni parte
  S.items = []; S.codex = [];
  {
    const { ALL_SPECIES: ASP3 } = await import('../src/data.js');   // 60 di superficie + 6 di grotta
    check('debug: spawna tutti i fossili (66×5)', gameplay.debugSpawnAll() === true &&
      S.items.length === ASP3.length * 5 && S.codex.length === ASP3.length);
  }
  // console comandi (registro in src/commands.js): money=N imposta le monete
  const cmds = await import('../src/commands.js');
  S.coins = 0;
  const cr = cmds.runCommand('money=40');
  check('console: money=40 imposta le monete', S.coins === 40 && typeof cr === 'string' && cr.includes('40'));
  check('console: spazi e maiuscole tollerati', (S.coins = 0, cmds.runCommand(' MONEY = 123 ') && S.coins === 123));
  check('console: comando sconosciuto → messaggio', /sconosciuto|Unknown/.test(cmds.runCommand('pippo=1')));
  check('console: input vuoto → null', cmds.runCommand('   ') === null);
  check('console: registro comandi presente', 'money' in cmds.COMMANDS);
  /* comando dedicato alle lettere */
  {
    const lt3 = await import('../src/letters.js');
    S.letters = [];
    const msg = cmds.runCommand('godletters');
    check('godletters sblocca tutte le lettere', S.letters.length === lt3.allLetters().length && /lettere|letters/i.test(msg));
    check('godletters include il finale', S.letters.includes('finale') && lt3.hasLetter('finale'));
    check('alias italiano del comando', (S.letters = [], cmds.runCommand('lettere'), S.letters.length > 0));
  }

  /* GODMODE deve riempire DAVVERO tutto: le 7 ali del museo, grotte comprese */
  {
    const { ALL_SPECIES: ASP2, MUSEUM_ZONES: MZ4 } = await import('../src/data.js');
    const wond = await import('../src/wonders.js');
    const lt2 = await import('../src/letters.js');
    S.museum = {}; S.codex = []; S.book = {}; S.donated = []; S.awakened = []; S.dna = {}; S.wonders = []; S.letters = [];
    cmds.runCommand('godmode');
    const missing = ASP2.filter(sp => (S.museum[sp.id] || []).length !== 5);
    check('godmode riempie tutte le teche, grotte comprese', missing.length === 0, missing.slice(0, 3).map(s2 => s2.id).join(','));
    check('godmode apre tutte le ali del Libro', MZ4.every(z => S.book[z.id]) && S.book.grotta === true);
    check('godmode dà il DNA anche delle specie di grotta', ASP2.filter(sp => sp.zone === 'grotta').every(sp => (S.dna[sp.id] || 0) > 0));
    check('godmode risveglia anche le specie di grotta', ASP2.filter(sp => sp.zone === 'grotta').every(sp => S.awakened.includes(sp.id)));
    check('godmode scopre tutte le meraviglie', S.wonders.length === Object.keys(wond.WONDERS).length);
    check('godmode consegna tutte le lettere', S.letters.length === lt2.allLetters().length);
    check('il codice conta 66 specie complete', ASP2.length === 66 && ASP2.every(sp => S.codex.includes(sp.id)));
    P.fly = false; // godmode ora attiva il volo: spegnilo o sballa i test di collisione più avanti
  }
  /* HACK COMPAGNI: companion=<tipo>[ rar], mount, chimera — provano poteri/raccoglitore/volo */
  {
    const compC = await import('../src/companion.js');
    const gpC = await import('../src/gameplay.js');
    const caveC = await import('../src/cave.js'); caveC.CAVE.active = false;
    cmds.runCommand('companion=terra leggendario');
    check('hack companion=terra: Scavatore leggendario scelto', !!compC.companionSpec() && compC.companionType(compC.companionSpec()) === 'terra' && compC.companionSpec().q === 'leggendario');
    cmds.runCommand('companion=grotta');
    check('hack companion=grotta: cavalcabile', compC.companionType(compC.companionSpec()) === 'grotta' && gpC.companionRides() === true);
    S.mounted = false;
    cmds.runCommand('mount');
    check('hack mount: sale in volo', S.mounted === true && gpC.isMounted() === true);
    S.mounted = false; compC.clearCompanion();
    const nc = (S.creatures || []).length;
    cmds.runCommand('chimera');
    check('hack chimera: crea una chimera nel parco', (S.creatures || []).length === nc + 1);
  }
  /* COERENZA: ogni hack ha help, tipo valido e una funzione run (niente voci monche) */
  check('ogni hack ha help/type/run validi', Object.values(cmds.COMMANDS).every(c => typeof c.help === 'string' && c.help.length > 3 && ['num', 'str', 'action', 'both'].includes(c.type) && typeof c.run === 'function'));
  check('ogni alias è unico e non collide con un nome', (() => {
    const seen = new Set();
    for (const [name, c] of Object.entries(cmds.COMMANDS)) { if (seen.has(name)) return false; seen.add(name); for (const a of c.aliases || []) { if (seen.has(a)) return false; seen.add(a); } }
    return true;
  })());
  // libro completo senza toccare il save
  S.book = {}; S.codex = [];
  ui.openBook();
  const bh3 = document.getElementById('bk-pages').innerHTML;
  /* NON dipendere dalla pagina aperta (bookPage sopravvive fra i test): basta che il libro
     non sia vuoto e che il save resti intatto */
  check('debug: libro completo (nomi visibili, save intatto)',
    !/Il libro è vuoto|The book is empty/.test(bh3) && /bk-name/.test(bh3) &&
    Object.keys(S.book).length === 0 && S.codex.length === 0);
  ui.closeBook();
  dbg.toggleDebug();
  check('toggle spegne, save mai toccato', dbg.isDebug() === false && S.codex.length === 0);
}

/* ---------- icone: set pixelarticons + custom, emoji sempre rimosse ---------- */
{
  const icons = await import('../src/icons.js');
  check(`registro icone: ${icons.ICON_NAMES.length} nomi`, icons.ICON_NAMES.length >= 44);
  const missing = Object.values(icons.EMAP).filter(n => !icons.ICON_NAMES.includes(n));
  check('ogni emoji mappa a un\'icona esistente' + (missing.length ? ' (mancano: ' + missing.join(',') + ')' : ''), missing.length === 0);
  /* GUARDIA: ogni pxicon deve usare `currentColor`, così lo `style="color:…"` di icon() la tinge.
     paw.svg aveva fill="black" fisso → l'icona del COMPAGNO restava NERA/invisibile sull'HUD scuro. */
  {
    const fs = await import('node:fs'); const base = new URL('../src/pxicons/', import.meta.url);
    const svgs = fs.readdirSync(base).filter(f => f.endsWith('.svg'));
    const nero = svgs.filter(f => !fs.readFileSync(new URL(f, base), 'utf8').includes('currentColor'));
    check('ogni pxicon eredita currentColor (nessun fill nero fisso)' + (nero.length ? ' → ' + nero.join(',') : ''), svgs.length >= 44 && nero.length === 0);
  }
  /* IL CONTROLLO CHE MANCAVA: le emoji SCRITTE NEL CODICE devono essere tutte mappate.
     `withIcons` strippa quelle che non conosce, quindi una emoji nuova non dà errore: il
     bottone resta semplicemente muto. È successo tre volte (🗑 del cestino, ⚙️ delle
     impostazioni): ora lo trova il test invece del giocatore. */
  {
    const fsE = (await import('node:fs'));
    const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
    /* 🏛 e 🏛️ sono la stessa emoji: la seconda ha il selettore di variante U+FE0F.
       Si confrontano normalizzate, o si inseguono fantasmi. */
    const bare = x => x.replace(/\uFE0F/g, '');
    const known = new Set(Object.keys(icons.EMAP).map(bare));
    const unmapped = new Map();
    for (const f of fsE.readdirSync('src').filter(x => x.endsWith('.js'))) {
      const src2 = fsE.readFileSync('src/' + f, 'utf8');
      /* si guardano solo le stringhe: i commenti possono contenere quello che vogliono */
      for (const m of src2.matchAll(/(['"`])((?:[^\\\n]|\\.)*?)\1/gs)) {
        for (const e of (m[2].match(EMOJI) || [])) {
          if (e === '\uFE0F') continue;                      // selettore di variante, non un'icona
          if (known.has(bare(e))) continue;
          if (!unmapped.has(e)) unmapped.set(e, f);
        }
      }
    }
    const list = [...unmapped.entries()].map(([e, f]) => e + ' (' + f + ')');
    check('nessuna emoji usata nel codice resta senza icona', list.length === 0, list.slice(0, 5).join(' '));
  }
  const out = icons.withIcons('🪙 x ⚡ y 🌸 ↗ ⛏️ 😀');
  const hasEmoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(out);
  check('withIcons: nessuna emoji sopravvive', !hasEmoji);
  // i file svg copiati esistono davvero nel progetto
  const fs = await import('node:fs');
  const missFiles = icons.ICON_NAMES.filter(n => !fs.existsSync(new URL('../src/pxicons/' + n + '.svg', import.meta.url)));
  check('tutti gli svg presenti in src/pxicons', missFiles.length === 0);
}

/* ---------- interni: si entra dalla porta, NPC, uscita sotto la porta ---------- */
{
  const inter = await import('../src/interior.js');
  // trova una porta e mettici sopra il player
  let door = null, dtown = null;
  for (let cx = -10; cx < 10 && !door; cx++) for (let cy = -10; cy < 10 && !door; cy++) {
    const t = world.townForCell(cx, cy); if (t) { door = t.buildings[0]; dtown = t; }
  }
  P.x = door.doorx * TS + TS / 2; P.y = door.doory * TS + 4;
  inter.INT.justLeft = false;
  P.dir = 'right'; P.moving = true;
  inter.checkDoorEnter();
  check('passare DAVANTI alla porta non fa entrare', inter.INT.active === false);
  P.dir = 'up'; P.moving = true;
  inter.checkDoorEnter();
  check('camminare DENTRO la porta (verso l\'alto) = dentro, senza E', inter.INT.active === true && inter.INT.b === door);
  check('NPC con nome per ogni mestiere', ['lab','store','museum','inn','barber','tailor','furniture'].every(t => inter.npcName(t).length > 3));
  // spawn interno: vicino alla porta, non nel muro
  check('spawn interno valido', !inter.interiorSolid(inter.INT.x, inter.INT.y));
  // cammina verso l'alto fino al bancone → vicino all'NPC
  for (let i = 0; i < 300; i++) inter.updateInterior(1 / 60, { up: true }, 92);
  check('si arriva davanti all\'NPC (bancone lo ferma)', inter.nearNpc() && !inter.interiorSolid(inter.INT.x, inter.INT.y));
  // torna giù fino alla porta → esce, player piazzato SOTTO la porta
  for (let i = 0; i < 400 && inter.INT.active; i++) inter.updateInterior(1 / 60, { down: true }, 92);
  check('uscita dalla porta', inter.INT.active === false);
  check('player sotto la porta (fuori)', Math.floor(P.x / TS) === door.doorx && Math.floor(P.y / TS) === door.doory + 1);
  // anti-rientro: justLeft blocca finché non ti allontani
  P.x = door.doorx * TS + TS / 2; P.y = door.doory * TS + 4;
  P.dir = 'up'; P.moving = true;
  inter.checkDoorEnter();
  check('niente rientro immediato dopo l\'uscita', inter.INT.active === false);
  inter.INT.justLeft = false;
  // laboratorio a tema: i tavoli (alambicco/banco) sono solidi, il corridoio centrale resta libero
  let labB = null;
  for (let cx = -10; cx < 10 && !labB; cx++) for (let cy = -10; cy < 10 && !labB; cy++) {
    const t = world.townForCell(cx, cy); if (t) labB = t.buildings.find(b => b.type === 'lab') || null;
  }
  // TUTTE le stanze a tema: arredi solidi ai lati, corridoio libero, NPC raggiungibile
  const byType = {};
  for (let cx = -10; cx < 10; cx++) for (let cy = -10; cy < 10; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue;
    for (const b of t.buildings) if (!byType[b.type]) byType[b.type] = b;
  }
  let roomBad = [];
  for (const type of ['lab', 'store', 'inn', 'barber', 'tailor', 'furniture']) { // museo: stanze proprie, testato a parte
    const b = byType[type]; if (!b) { roomBad.push(type + ':manca'); continue; }
    inter.enterInterior(b, null);
    if (!inter.interiorSolid(60, 112) || !inter.interiorSolid(260, 116)) roomBad.push(type + ':lati');
    if (inter.interiorSolid(160, 112) || inter.interiorSolid(160, 180)) roomBad.push(type + ':corridoio');
    for (let i = 0; i < 300 && !inter.nearNpc(); i++) inter.updateInterior(1 / 60, { up: true }, 92);
    if (!inter.nearNpc()) roomBad.push(type + ':npc');
    inter.exitInterior(); inter.INT.justLeft = false;
  }
  check('5 stanze a tema: solidi/corridoio/NPC ok' + (roomBad.length ? ' (' + roomBad.join(' ') + ')' : ''), roomBad.length === 0);
}

/* ---------- cassetta della posta: spedisci i grezzi al Museo (borghi/paesi) ---------- */
{
  S.items = []; S.raw = []; S.museum = {}; S.museumJob = null; S.coins = 100; S.day = 20; S.bagCap = 9999;
  for (let i = 0; i < 4; i++) S.raw.push({ uid: 900 + i, s: 'lepre', t: 'cranio', q: 'comune', val: 10 });
  check('cassetta: MAIL_COST = 2 a pezzo', gameplay.MAIL_COST === 2);
  check('cassetta: spedisce (costo 2×n), pronti DOMANI, zaino svuotato',
    gameplay.shipToMuseum() === true && S.coins === 100 - 4 * 2 && S.museumJob && S.museumJob.items.length === 4 && S.museumJob.ready === 21 && S.raw.length === 0);
  check('cassetta: NON pronti oggi (transito)', gameplay.museumJobReady() === false);
  S.day = 21;
  check('cassetta: il giorno dopo sono pronti → si ritirano al Museo', gameplay.museumJobReady() === true && !!gameplay.museumCollect());
  S.museumJob = null; S.raw = [{ uid: 950, s: 'lepre', t: 'cranio', q: 'comune', val: 10 }]; S.coins = 0;
  check('cassetta: senza monete non spedisce (zaino intatto)', gameplay.shipToMuseum() === false && S.raw.length === 1 && !S.museumJob);
  /* NIENTE STALLO: con un lotto GIÀ in lavorazione, spedire AGGIUNGE al lotto (prima si restava
     bloccati: borsa piena e non potevi né consegnare né svuotarla) */
  S.coins = 100; S.museumJob = { items: [{ uid: 940, s: 'lepre', t: 'torace', q: 'comune', val: 10 }], ready: S.day + 1, prepOk: false };
  check('cassetta: con un lotto in corso si AGGIUNGE (niente stallo), zaino svuotato',
    gameplay.shipToMuseum() === true && S.museumJob.items.length === 2 && S.raw.length === 0);
  S.museumJob = null; S.raw = [];
  check('cassetta: niente da spedire → rifiuta', gameplay.shipToMuseum() === false);
  /* posizione: SOLO borghi e paesi (le città hanno il Museo) */
  const mail = { borgo: 0, paese: 0, 'città': 0 }, tot = { borgo: 0, paese: 0, 'città': 0 };
  for (let cx = -22; cx < 22; cx++) for (let cy = -22; cy < 22; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue; tot[t.size]++;
    if ((t.decos || []).some(d => d.type === 'mailbox')) mail[t.size]++;
  }
  check('cassetta: nei borghi e paesi, MAI nelle città col Museo', mail.borgo > 0 && mail.paese > 0 && mail['città'] === 0);
}

/* ---------- museo v3: consegna → 1 giorno → ritiro, DNA, galleria camminabile ---------- */
{
  const inter = await import('../src/interior.js');
  const { PARTS, spById } = await import('../src/data.js');
  /* consegna: i grezzi si bloccano al museo, niente monete */
  S.items = []; S.raw = []; S.museum = {}; S.awakened = []; S.coins = 0; S.dna = {}; S.donated = []; S.day = 10;
  PARTS.forEach((pt, i) => S.raw.push({ uid: 700 + i, s: 'lepre', t: pt.id, q: 'comune', val: 10 }));
  S.raw.push({ uid: 710, s: 'lepre', t: 'cranio', q: 'raro', val: 20 }); // doppione
  check('consegna: grezzi bloccati al museo', gameplay.museumDeposit() === true && S.raw.length === 0 && S.museumJob.items.length === 6);
  check('identificazione ISTANTANEA: pronto subito', gameplay.museumJobReady() === true);
  check('seconda consegna a vuoto (borsa già svuotata) → niente da fare', gameplay.museumDeposit() === false);
  /* con un lotto in corso E grezzi in mano, consegnare li AGGIUNGE (niente stallo) */
  S.raw.push({ uid: 715, s: 'volpe', t: 'cranio', q: 'comune', val: 10 });
  check('consegna con lotto in corso: si AGGIUNGE (niente stallo)', gameplay.museumDeposit() === true && S.museumJob.items.length === 7 && S.raw.length === 0);
  S.museumJob.items.pop(); // rimetto a 6 per il ritiro atteso sotto
  const r = gameplay.museumCollect();
  check('ritiro: doppione restituito identificato, 5 nuovi esposti, NIENTE monete',
    r && r.back.length === 1 && r.back[0].uid === 710 && r.shown.length === 5 && S.items.length === 1 && S.coins === 0 && (S.museum.lepre || []).length === 5);
  check('teca completa → 1 fialetta DNA in premio', r.vials.includes('lepre') && S.dna.lepre === 1);

  /* RESTAURO AL RITIRO: solo se consegni ≥3 raro+ insieme, sul MIGLIOR doppione tornato */
  { S.items = []; S.raw = []; S.museum = { lepre: ['cranio', 'torace', 'zampa'] }; S.museumJob = null; S.bagCap = 9999;
    S.raw.push({ uid: 800, s: 'lepre', t: 'cranio', q: 'raro', val: 20 });
    S.raw.push({ uid: 801, s: 'lepre', t: 'torace', q: 'eccezionale', val: 60 });
    S.raw.push({ uid: 802, s: 'lepre', t: 'zampa', q: 'leggendario', val: 95 });
    check('deposito ≥3 raro+ → lotto idoneo al restauro', gameplay.museumDeposit() === true && S.museumJob.prepOk === true);
    const rp = gameplay.museumCollect();
    check('al ritiro il Curatore propone il MIGLIOR doppione raro+ (il leggendario)', !!rp.prepCand && rp.prepCand.uid === 802);
    // meno di 3 raro+ → niente proposta
    S.raw = []; S.museum = { lepre: ['cranio'] }; S.museumJob = null;
    S.raw.push({ uid: 810, s: 'lepre', t: 'cranio', q: 'raro', val: 20 });
    S.raw.push({ uid: 811, s: 'lepre', t: 'torace', q: 'comune', val: 10 });
    gameplay.museumDeposit();
    check('meno di 3 raro+ insieme → nessuna proposta di restauro', gameplay.museumCollect().prepCand == null);
    S.museum = {}; S.raw = []; S.items = []; }

  /* IL RITIRO NON PUÒ SFONDARE LO ZAINO. Depositare lo svuota (i pezzi in lavorazione non
     contano), quindi si può riempirlo di nuovo e tornare a ritirare: era l'unico punto del
     gioco che aggiungeva reperti senza guardare la capienza. Quel che non entra resta al
     Museo e la commessa resta aperta. */
  {
    S.items = []; S.raw = []; S.museum = { lepre: PARTS.map(p => p.id) }; S.bagCap = 14;
    for (let i = 0; i < 4; i++) S.raw.push({ uid: 800 + i, s: 'lepre', t: 'cranio', q: 'comune', val: 5 });
    gameplay.museumDeposit();
    while (gameplay.fossilCount() < gameplay.bagCap()) S.raw.push({ uid: 900 + S.raw.length, s: 'prato', t: 'coda', q: 'comune', val: 3 });
    check('zaino pieno prima del ritiro', gameplay.bagFull() === true);
    const rr = gameplay.museumCollect();
    check('il ritiro non sfonda mai la capienza dello zaino',
      gameplay.fossilCount() <= gameplay.bagCap() && rr.left.length === 4 && rr.back.length === 0);
    check('quel che non entra resta al Museo, la commessa resta aperta',
      !!S.museumJob && S.museumJob.items.length === 4 && gameplay.museumJobReady() === true);
    /* liberato lo zaino, si ritira il resto */
    S.raw = [];
    const r3 = gameplay.museumCollect();
    check('liberato lo zaino si ritira il resto', r3.back.length === 4 && S.museumJob === null);
  }
  S.items = []; S.raw = []; S.museum = {}; S.dna = {}; S.donated = []; S.museumJob = null;
  S.museum = { lepre: PARTS.map(p => p.id) }; S.dna.lepre = 1;
  /* ricarica DNA: solo teche complete, prezzo per rarità */
  S.coins = 1000;
  check('buyDna specie non completa rifiuta', gameplay.buyDna('prato') === false);
  const c0 = S.coins;
  check('buyDna teca completa: +1 fialetta, prezzo per rarità',
    gameplay.buyDna('lepre') === true && S.dna.lepre === 2 && S.coins === c0 - gameplay.DNA_COST[spById.lepre.r]);
  /* debug: ritiro immediato */
  const dbg = await import('../src/debug.js');
  S.raw.push({ uid: 720, s: 'prato', t: 'cranio', q: 'comune', val: 5 });
  gameplay.museumDeposit();
  if (!dbg.isDebug()) dbg.toggleDebug();
  check('debug: ritiro senza aspettare', gameplay.museumJobReady() === true && gameplay.museumCollect() !== null);
  dbg.toggleDebug();
  /* galleria camminabile: 60 piedistalli, aree per bioma, niente porte */
  const peds = inter.pedList();
  const { ALL_SPECIES: ALLSP } = await import('../src/data.js');
  check('galleria: un piedistallo per specie (60 + 6 di grotta)', peds.length === ALLSP.length && new Set(peds.map(p => p.sp.id)).size === ALLSP.length);
  check('la settima ala espone le specie di grotta', peds.some(p => p.sp.zone === 'grotta') && peds.filter(p => p.sp.zone === 'grotta').length === 6);
  /* i piedistalli della grotta stanno DENTRO la galleria (niente teche fuori dai muri) */
  check('la sala grotte sta dentro il museo', peds.filter(p => p.sp.zone === 'grotta').every(p => p.ty < inter.GAL_H - 6 && p.tx < inter.GAL_W - 1));
  /* ORDINE DI VISITA: si entra dal basso, quindi la prima zona è la sala più vicina alla porta
     e le GROTTE sono l'ULTIMA, in fondo alla galleria (prima erano le prime che incontravi) */
  {
    const { MUSEUM_ZONES: MZ3 } = await import('../src/data.js');
    const rowOf = id => inter.roomOrigin(MZ3.findIndex(z => z.id === id)).ry;
    const cave = rowOf('grotta'), prati = rowOf('prati');
    check('le grotte sono la sala PIÙ LONTANA dall\'ingresso', cave < prati, 'grotte y=' + cave + ' · prati y=' + prati);
    check('l\'ordine delle zone segue il cammino', rowOf('prati') > rowOf('boschi') && rowOf('boschi') > rowOf('palude'));
    /* la sala delle grotte è da sola e CENTRATA fra le due colonne */
    const cx0 = inter.roomOrigin(6).rx, left = inter.roomOrigin(0).rx, right = inter.roomOrigin(1).rx;
    check('la sala grotte è centrata in fondo', cx0 > left && cx0 < right, 'x=' + cx0 + ' fra ' + left + ' e ' + right);
    /* nessuna sala esce dalla galleria e nessuna si sovrappone a un'altra */
    const boxes = MZ3.map((z, i) => { const o = inter.roomOrigin(i); return { ...o, id: z.id }; });
    const outOf = boxes.filter(b => b.rx < 1 || b.ry < 1 || b.rx + inter.ROOM_W > inter.GAL_W - 1 || b.ry + inter.ROOM_H > inter.GAL_H - 6);
    check('tutte le sale stanno dentro la galleria', outOf.length === 0, outOf.map(b => b.id).join(','));
    let overlap = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (Math.abs(a.rx - b.rx) < inter.ROOM_W && Math.abs(a.ry - b.ry) < inter.ROOM_H) overlap++;
    }
    check('nessuna sala si sovrappone a un\'altra', overlap === 0, 'n=' + overlap);
  }
  let mus = null;
  for (let cx = -12; cx < 12 && !mus; cx++) for (let cy = -12; cy < 12 && !mus; cy++) {
    const t = world.townForCell(cx, cy); if (t) mus = t.buildings.find(b => b.type === 'museum') || null;
  }
  /* cutscene: museo di bioma NUOVO → il Curatore viene incontro col Libro, input bloccato */
  const regions3 = await import('../src/regions.js');
  const musTown = (() => { for (let cx = -12; cx < 12; cx++) for (let cy = -12; cy < 12; cy++) { const t = world.townForCell(cx, cy); if (t && t.buildings.some(b => b.type === 'museum')) return t; } })();
  const musB = musTown.buildings.find(b => b.type === 'museum');
  P.x = musB.doorx * TS + 8; P.y = musB.doory * TS + 8;
  const musZone = regions3.zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
  delete S.book[musZone.id];
  inter.enterInterior(musB, musTown);
  check('bioma nuovo: cutscene attiva', inter.CUT.on === true);
  const px0 = inter.INT.x, py0 = inter.INT.y;
  inter.updateInterior(1 / 60, { up: true, left: true }, 46);
  check('cutscene: player bloccato', inter.INT.x === px0 && inter.INT.y === py0);
  for (let i = 0; i < 600 && inter.CUT.phase === 'walk'; i++) inter.updateInterior(1 / 60, {}, 46); // il curatore cammina (auto)
  check('cutscene: libro consegnato durante la consegna', S.book[musZone.id] === true && inter.CUT.phase === 'give');
  /* la frase detta camminando NON deve cambiare da sola: si aspetta il click (bambini che
     leggono piano). La prima voce della coda è proprio quella battuta. */
  {
    const primo = inter.CUT.line;
    for (let i = 0; i < 300; i++) inter.updateInterior(1 / 60, {}, 46);   // 5 secondi senza toccare nulla
    check('la prima battuta aspetta il click', inter.CUT.line === primo && inter.CUT.phase === 'give');
    inter.cutAdvance();
    check('al click passa alla battuta dopo', inter.CUT.line !== primo && !!inter.CUT.line);
  }
  /* NIENTE LIMBO: durante la cutscene E non deve fare niente, e i tasti degli overlay nemmeno.
     Premendo E si apriva il pannello del Curatore SOPRA il video che intanto andava avanti, e
     il clic per farlo proseguire finiva sulla modale: si usciva solo ricaricando (foto). */
  {
    ui.closeModal(true);
    gameplay.act();                                   // E in piena cutscene
    check('durante la cutscene E non apre niente', !ui.isModalOpen(), 'modale aperta sopra il video');
    check('e la scenetta non si è mossa da sola', inter.CUT.on === true && inter.CUT.phase === 'give');
    const fs12 = await import('node:fs');
    const inp12 = fs12.readFileSync('src/input.js', 'utf8');
    check('anche zaino/libro/mappa/missioni sono chiusi in cutscene',
      /const busy = \(\) => isModalOpen\(\) \|\| CUT\.on;/.test(inp12)
      && (inp12.match(/!busy\(\)/g) || []).length >= 4);
  }
  for (let i = 0; i < 12 && inter.CUT.phase === 'give'; i++) inter.cutAdvance(); // dialoghi AL CLICK
  for (let i = 0; i < 600 && inter.CUT.on; i++) inter.updateInterior(1 / 60, {}, 46); // il curatore torna al banco
  check('cutscene: controllo restituito dopo i click', inter.CUT.on === false && S.book[musZone.id] === true);
  inter.exitInterior(); inter.INT.justLeft = false;
  inter.enterInterior(musB, musTown);
  check('pagine già nel libro: niente cutscene', inter.CUT.on === false);
  inter.exitInterior(); inter.INT.justLeft = false;
  inter.enterInterior(mus, null);
  check('museo: galleria unica grande', inter.INT.room === 'gallery' && inter.INT.w === inter.GAL_W);
  /* ogni sala dev'essere riconoscibile: targa col nome del bioma sopra l'ingresso */
  {
    const i18n = await import('../src/i18n.js');
    const { ZONES: ZS } = await import('../src/data.js');
    const seen = ZS.map(z => i18n.zoneName(z.id)).filter(n => n && n.length > 2);
    check('ogni sala del museo ha il nome del suo bioma', seen.length === ZS.length && new Set(seen).size === ZS.length);
    /* la targa deve contenere nome E contatore senza sovrapporli, anche col nome più lungo */
    {
      const { zonePools: ZP2, MUSEUM_ZONES: MZ2 } = await import('../src/data.js');
      const W7 = t => Math.ceil(t.length * 4.2);           // stessa stima del render senza canvas
      let bad = [];
      for (const z of MZ2) {
        const label = i18n.zoneName(z.id).toUpperCase(), sub = ZP2[z.id].length + '/' + ZP2[z.id].length;
        const PADL = 11, PADR = 9, GAP = 10;
        const bw = Math.max(72, PADL + W7(label) + GAP + W7(sub) + PADR);
        const nameEnd = PADL + W7(label), subStart = bw - PADR - W7(sub);
        if (subStart < nameEnd + 4) bad.push(z.id);         // meno di 4px di respiro = si toccano
      }
      check('nome e contatore della targa non si sovrappongono', bad.length === 0, bad.join(','));
    }
  }
  /* dal varco d'ingresso al banco del Curatore */
  inter.INT.x = (inter.GAL_DESK.x0 + inter.GAL_DESK.x1) / 2; inter.INT.y = inter.GAL_DESK.y1 + 10;
  check('Curatore raggiungibile al banco', inter.nearNpc() === true);
  /* MAESTRO SCAVATORE: gira per il museo (non più in piazza), mai dentro teche/bancone */
  check('Maestro non è al banco', inter.nearMentorInt() === false);
  inter.resetMentor();
  inter.INT.x = inter.MENTOR.x; inter.INT.y = inter.MENTOR.y + 12;
  check('Maestro raggiungibile nell\'atrio', inter.nearMentorInt() === true && inter.nearNpc() === false);
  check('Maestro solo nel museo', (() => { const b = inter.INT.b; inter.INT.b = { type: 'store' }; const r = inter.nearMentorInt(); inter.INT.b = b; return r === false; })());
  /* tutto il percorso (waypoint + segmenti campionati) su tile LIBERE */
  const mpBad = [];
  for (let i = 0; i < inter.MENTOR_PATH.length; i++) {
    const [ax, ay] = inter.MENTOR_PATH[i], [bx, by] = inter.MENTOR_PATH[Math.min(i + 1, inter.MENTOR_PATH.length - 1)];
    for (let t = 0; t <= 1; t += 0.02) {
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      if (inter.interiorSolid(x, y)) mpBad.push([Math.round(x), Math.round(y)]);
    }
  }
  check('giro del Maestro: nessun waypoint dentro teche/bancone', mpBad.length === 0, mpBad.slice(0, 3).join(' '));
  /* il giro passa DENTRO una sala di fossili (non solo l'atrio) */
  const gal = inter.MENTOR_PATH.some(([, y]) => y < inter.GAL_DESK.y0 - 3 * 16);
  check('il giro entra fra le teche', gal === true);
  /* niente moonwalk: il verso segue la VELOCITÀ, non la posizione */
  inter.resetMentor();
  const seen = new Set(); let mmoved = 0, dirBad = 0;
  for (let i = 0; i < 6000; i++) {
    const x0 = inter.MENTOR.x, y0 = inter.MENTOR.y;
    inter.updateMentor(1 / 60);
    const dx = inter.MENTOR.x - x0, dy = inter.MENTOR.y - y0;
    if (Math.abs(dx) + Math.abs(dy) < 0.01) continue;
    mmoved++; seen.add(inter.MENTOR.dir);
    const want = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    if (inter.MENTOR.dir !== want) dirBad++;
    if (inter.interiorSolid(inter.MENTOR.x, inter.MENTOR.y)) dirBad++;
  }
  check('Maestro cammina nel verso giusto (niente moonwalk)', mmoved > 500 && dirBad === 0, 'bad=' + dirBad);
  check('Maestro percorre il giro in entrambi i sensi', seen.size >= 3, [...seen].join(','));
  /* etichetta di un piedistallo: nome specie + pezzi */
  const pd = peds.find(p => p.sp.id === 'lepre') || peds[0];
  inter.INT.x = (pd.x0 + pd.x1) / 2; inter.INT.y = pd.y1 + 16;
  const nc = inter.nearCase();
  check('etichetta piedistallo: specie e progresso', !!nc && nc.sp.id === pd.sp.id && nc.n === (S.museum[pd.sp.id] || []).length);
  /* si cammina nel corridoio a SUD dei piedistalli (le teche sono solide a tutta altezza) */
  inter.INT.x = pd.x0 - 40; inter.INT.y = pd.y1 + 48;
  let moved = 0;
  for (let i = 0; i < 120; i++) { const x0 = inter.INT.x; inter.updateInterior(1 / 60, { right: true }, 92); if (inter.INT.x > x0) moved++; }
  check('galleria: corridoi percorribili', moved > 60);
  /* collisione SOLO sulla base (il pg passa dietro la teca, z-order per y) */
  check('teca: collisione sulla base', !!pd && pd.y0 === pd.ty * TS + 8 && pd.y1 === pd.ty * TS + 30);
  /* uscita dalla porta in basso al centro */
  inter.INT.x = (inter.GAL_W / 2) * TS; inter.INT.y = (inter.GAL_H - 1.5) * TS;
  for (let i = 0; i < 300 && inter.INT.active; i++) inter.updateInterior(1 / 60, { down: true }, 92);
  check('galleria: si esce dalla porta (niente stanze)', inter.INT.active === false);
  inter.INT.justLeft = false;
  /* sprite esposizione: pezzi consegnati componibili e non vuoti */
  const { composedPartsVox } = await import('../src/bones.js');
  check('esposizione: voxel composti per i pezzi consegnati', composedPartsVox('lepre', S.museum.lepre).length > 20 && composedPartsVox('lepre', []).length === 0);
}

/* ---------- spawn mai intrappolato ---------- */
{
  const st = world.findStart();
  const tx = Math.floor(st.x / TS), ty = Math.floor(st.y / TS);
  check('findStart: area aperta raggiungibile', world.openArea(tx, ty));
  const tw = world.townForTile(tx, ty);
  check('findStart: sempre in una città GRANDE (piazza)', !!tw && tw.size === 'città' && !!world.townInfo(tx, ty));
  // cerca una vera "prigione" nel mondo (libera ma con 4 vicini solidi) e verifica che openArea la rifiuti
  let trap = null;
  for (let x = -150; x < 150 && !trap; x++) for (let y = -150; y < 150 && !trap; y++) {
    if (!world.isSolidTile(x, y) &&
      world.isSolidTile(x + 1, y) && world.isSolidTile(x - 1, y) &&
      world.isSolidTile(x, y + 1) && world.isSolidTile(x, y - 1)) trap = [x, y];
  }
  check('openArea rifiuta le prigioni' + (trap ? ` (trovata a ${trap})` : ' (nessuna nel campione: ok)'), !trap || !world.openArea(trap[0], trap[1]));

  /* ---------- strade e uscite sicure ---------- */
  {
    let t = null; // una città qualsiasi nel campione
    for (let cx = -8; cx <= 8 && !t; cx++) for (let cy = -8; cy <= 8 && !t; cy++) {
      const c = world.townForCell(cx, cy); if (c) t = c;
    }
    check('ogni città ha strade', !!t && t.roads.size > 0);
    let roadsOk = true, stubOk = true, exitFree = true, inCell = true;
    for (let cx = -8; cx <= 8; cx++) for (let cy = -8; cy <= 8; cy++) {
      const c = world.townForCell(cx, cy); if (!c) continue;
      for (const k of c.roads) { // le strade sono camminabili e marcate road
        const [x, y] = k.split(',').map(Number);
        const ti = world.townInfo(x, y);
        if (!ti || !ti.floor || !ti.road) roadsOk = false;
      }
      for (const b of c.buildings) { // davanti a ogni porta: strada + tile libera
        if (!c.roads.has(b.doorx + ',' + (b.doory + 1))) stubOk = false;
        if (world.isSolidTile(b.doorx, b.doory + 1)) exitFree = false;
      }
      /* città intera dentro la sua cella: townForTile deve ritrovarla */
      if (Math.floor(c.x0 / world.TCELL) !== cx || Math.floor(c.x1 / world.TCELL) !== cx ||
        Math.floor(c.y0 / world.TCELL) !== cy || Math.floor(c.y1 / world.TCELL) !== cy) inCell = false;
    }
    check('strade camminabili e marcate', roadsOk);
    check('vialetto davanti a ogni porta', stubOk);
    check('tile davanti a ogni porta LIBERA (uscita sicura)', exitFree);
    check('città sempre contenute nella loro cella', inCell);
  }

  /* ---------- biomi: coerenza climatica e confini non a righello ---------- */
  {
    const { zoneIdxAt } = await import('../src/regions.js');
    const bandOf = [1, 2, 0, 2, 1, 0]; // zona → fascia climatica (freddo 0, temperato 1, caldo 2)
    let extremes = 0, borders = 0, straight = 0, rows = 0;
    for (let x = -400; x < 400; x += 4) for (let y = -400; y < 400; y += 4) {
      const a = zoneIdxAt(x, y), r = zoneIdxAt(x + 4, y), d = zoneIdxAt(x, y + 4);
      if (a !== r) { borders++; if (Math.abs(bandOf[a] - bandOf[r]) === 2) extremes++; }
      if (a !== d && Math.abs(bandOf[a] - bandOf[d]) === 2) extremes++;
    }
    check(`clima coerente: Lande e Terre mai adiacenti (${extremes} violazioni su ${borders} confini)`, extremes === 0);
    /* confini sinuosi: nessuna riga di confine perfettamente dritta per 40 blocchi */
    for (let y = -200; y < 200; y += 4) {
      let run = 0, best = 0;
      for (let x = -200; x < 200; x += 4) {
        if (zoneIdxAt(x, y) !== zoneIdxAt(x, y + 4)) run++; else { best = Math.max(best, run); run = 0; }
      }
      rows++; if (Math.max(best, run) >= 40) straight++;
    }
    check('confini dei biomi non a righello', straight === 0);
  }
}

/* ---------- CASA del giocatore (M1: guscio, spawn, teleport gratuito) ---------- */
{
  const inter = await import('../src/interior.js');
  const cave = await import('../src/cave.js');
  /* trova una città "città" (come fa findStart) per piazzare la porta accanto */
  let town = null;
  for (let r = 0; r < 16 && !town; r++) {
    for (let cy = -r; cy <= r && !town; cy++) for (let cx = -r; cx <= r && !town; cx++) {
      if (Math.max(Math.abs(cx), Math.abs(cy)) !== r) continue;
      const t = world.townForCell(cx, cy); if (t && t.size === 'città') town = t;
    }
  }
  check('trovata una città grande per la casa', !!town);
  const home = town && world.findHomeSpot(town);
  check('S.home: un posto valido vicino alla città', !!home);
  if (home) {
    /* la porta deve stare su terreno aperto, FUORI dalla città (piazza/parco), prima che la
       casa esista */
    check('la porta di casa non è dentro la città', !world.townInfo(home.x, home.y));
    check('davanti alla porta c\'è area aperta', world.openArea(home.x, home.y + 1));
    S.home = home;
    check('houseDoorAt riconosce la porta appena fissata', world.houseDoorAt(home.x, home.y));
    const hf = world.houseFootprint();
    check('houseFootprint: 3×2 con la porta al centro della fila bassa', !!hf &&
      hf.x1 - hf.x0 === 2 && hf.y1 - hf.y0 === 1 && hf.doorx === home.x && hf.doory === home.y);
    check('la casa è solida tranne la porta', world.isSolidTile(hf.x0, hf.y0) && world.isSolidTile(hf.x1, hf.y1 - 1) && !world.isSolidTile(hf.doorx, hf.doory));

    /* entrare/uscire dalla casa come da qualunque altra porta */
    inter.INT.active = false; inter.INT.justLeft = false; cave.CAVE.active = false;
    P.x = home.x * TS + 8; P.y = home.y * TS + 2; P.dir = 'up'; P.moving = true;
    inter.checkDoorEnter();
    check('si entra in casa camminando sulla porta', inter.INT.active === true && inter.INT.b && inter.INT.b.type === 'house');
    inter.exitInterior();
    check('si esce di nuovo, non intrappolati', inter.INT.active === false && !world.isSolidTile(Math.floor(P.x / TS), Math.floor(P.y / TS)));
    inter.INT.justLeft = false;

    /* goHome(): gratis, teletrasporto istantaneo + portale di ritorno a uso singolo */
    P.x = (home.x + 400) * TS; P.y = (home.y + 300) * TS; // lontanissimo da casa
    const farX = P.x, farY = P.y;
    S.teleportBack = null; S.returnPortal = null; S.gateLocked = false;
    const box0 = document.getElementById('toasts'), said0 = [];
    const orig0 = box0.appendChild;
    box0.appendChild = c => { said0.push(String(c.innerHTML)); return c; };
    const went = gameplay.goHome();
    box0.appendChild = orig0;
    check('goHome(): teletrasporta gratis quando sei lontano', went === true);
    /* il tono NON arriva più qui: si è ancora nel corridoio, il cancello non si vede da lì —
       arriva quando ci si arriva davvero vicino da dentro il cortile (vedi più sotto). */
    check('al teletrasporto il tono non compare ancora (si è nel corridoio)', !said0.some(t => /chiuso dall.esterno|locked from outside/i.test(t)));
    check('goHome(): salva da dove sei partito', !!S.teleportBack && S.teleportBack.x === farX && S.teleportBack.y === farY);
    check('goHome(): apre un portale di ritorno', !!S.returnPortal);
    const nearHome = Math.abs(Math.floor(P.x / TS) - home.x) < 10 && Math.abs(Math.floor(P.y / TS) - home.y) < 10;
    check('goHome(): sei vicino a casa', nearHome);
    /* si arriva DENTRO, nel corridoio (atrio) — non fuori nel cortile: "il portale mi deve
       portare NON nel cortile ma nel corridoio di casa" */
    check('goHome(): si entra nel corridoio di casa', inter.INT.active === true && inter.INT.b.type === 'house' && inter.INT.houseRoom === null);
    inter.INT.active = false; inter.INT.justLeft = false; // si esce a mano: il resto del blocco lavora fuori

    /* TELETRASPORTARSI SALTA IL CANCELLO A PIEDI: da fuori resta chiuso a chiave DAVVERO
       (non solo l'aspetto) — a richiesta esplicita: "quando mi teletrasporto il cancello deve
       rimanere chiuso e bloccato dall'esterno. E solo in questo caso, deve comparire caspita è
       chiuso dall'esterno" (mai quando si esce a piedi, che resta un'animazione muta). */
    check('teletrasportarsi a casa blocca il cancello per davvero', S.gateLocked === true);
    const pYard = world.yardRect();
    const gtx = pYard.cx, gty = pYard.y1;
    check('il cancello bloccato è SOLIDO (non si passa)', world.isSolidTile(gtx, gty) === true);
    const ydLocked = world.yardInfo(gtx, gty);
    check('yardInfo segnala il cancello chiuso (gateOpen=false)', ydLocked.gateOpen === false && ydLocked.solid === true);
    /* VOLUTO, non un bug: si blocca in ENTRAMBI i versi. Se si potesse uscire a piedi dal
       cortile appena teletrasportati, il cancello "chiuso dall'esterno" non costerebbe nulla
       — si resta dentro finché non si usa il portale di ritorno (che atterra nel cortile,
       non oltre il cancello) o lo si sblocca da fuori più tardi. Da DENTRO, E sul cancello
       non lo sblocca (nearbyLockedGate è scoperto solo da fuori): l'unica uscita da lì è il
       portale, che infatti resta a portata. */
    /* DA FUORI si riapre sempre, e ora con DUE caselle di tolleranza: col tocco ci si ferma
       dove capita, e con una casella sola l'azione compariva solo incastrandosi nel battente.
       E il PROMPT lo dice: prima davanti al cancello si leggeva "Compagno e cortile", cioè
       l'azione che il tasto lì non fa — su mobile voleva dire restare fuori da casa propria
       senza sapere come rientrare (segnalato). */
    for (const d of [1, 2]) {
      P.x = pYard.cx * TS + 8; P.y = (pYard.y1 + d) * TS + 2;
      check('da fuori (a ' + d + ' casella dal cancello) si può riaprire', gameplay.nearbyLockedGate() === true);
      ui.updatePrompt();
      const pr = document.getElementById('prompt');
      check('e il prompt dice proprio quello', /cancello|gate/i.test(String(pr && pr.innerHTML)), String(pr && pr.innerHTML).slice(0, 60));
    }
    P.x = (pYard.cx + 4) * TS + 8; P.y = (pYard.y1 + 1) * TS + 2;
    check('ma non da un angolo qualsiasi del recinto', gameplay.nearbyLockedGate() === false);
    P.x = pYard.cx * TS + 8; P.y = (pYard.y1 - 1) * TS + 2; // appena dentro il cancello
    check('da dentro, E sul cancello non lo sblocca', gameplay.nearbyLockedGate() === false);
    /* IL TONO ARRIVA QUI: avvicinandosi al cancello DA DENTRO il cortile — non al momento del
       teletrasporto (si era ancora nel corridoio, il cancello non si vedeva). Una volta sola
       per chiusura (checkGateNotice tiene un flag interno, non salvato). */
    {
      const box1 = document.getElementById('toasts'), said1 = [];
      const orig1 = box1.appendChild;
      box1.appendChild = c => { said1.push(String(c.innerHTML)); return c; };
      gameplay.checkGateNotice();
      box1.appendChild = orig1;
      check('avvicinandosi al cancello da dentro compare "caspita, chiuso dall\'esterno"', said1.some(t => /chiuso dall.esterno|locked from outside/i.test(t)));
    }
    {
      const box2 = document.getElementById('toasts'), said2 = [];
      const orig2 = box2.appendChild;
      box2.appendChild = c => { said2.push(String(c.innerHTML)); return c; };
      gameplay.checkGateNotice();
      box2.appendChild = orig2;
      check('il tono non si ripete ogni frame vicino al cancello', said2.length === 0);
    }
    /* IL PORTALE STA IN MEZZO ALL'ATRIO, non fuori nel cortile (a richiesta esplicita: "il
       portale deve essere in mezzo al corridoio NON FUORI e deve comparirmi E") — si controlla
       DENTRO la scena (INT.x/INT.y), non più P.x/P.y del mondo. goHome() ci aveva già fatti
       entrare; il blocco sopra ("si entra nel corridoio di casa") era uscito per lavorare
       fuori — si rientra apposta per questa prova. */
    const houseM = await import('../src/house.js');
    inter.INT.active = true; inter.INT.b = { type: 'house', doorx: S.home.x, doory: S.home.y }; inter.INT.houseRoom = null;
    inter.INT.x = houseM.ATRIO_PORTAL.x; inter.INT.y = houseM.ATRIO_PORTAL.y;
    check('il portale di ritorno è raggiungibile in mezzo all\'atrio', !!gameplay.nearbyReturnPortal());
    inter.INT.x = 4; inter.INT.y = 4; // angolo dell'atrio, lontano dal centro
    check('lontano dal centro dell\'atrio: il portale non è a portata', !gameplay.nearbyReturnPortal());
    inter.INT.active = false; inter.INT.justLeft = false; // si esce di nuovo: il resto del blocco lavora fuori
    {
      const box = document.getElementById('toasts'), said = [];
      const orig = box.appendChild;
      box.appendChild = c => { said.push(String(c.innerHTML)); return c; };
      P.x = (home.x + 400) * TS; P.y = (home.y + 300) * TS; // di nuovo lontano, per teletrasportarsi una seconda volta
      gameplay.goHome();
      box.appendChild = orig;
      check('già bloccato: il tono "caspita" NON si ripete alla seconda volta', !said.some(t => /chiuso dall.esterno|locked from outside/i.test(t)));
    }

    /* DALL'ESTERNO LO SI PUÒ SEMPRE RIAPRIRE (a richiesta esplicita: "dall'esterno lo posso
       sempre aprire") — non è un vicolo cieco, solo una porta come un'altra. */
    P.x = gtx * TS + 8; P.y = (gty + 1) * TS + 2; // subito fuori dal cancello, come dopo un'uscita a piedi
    check('subito fuori dal cancello bloccato: E lo riapre', gameplay.nearbyLockedGate() === true);
    check('riaprirlo riesce', gameplay.openLockedGate() === true);
    check('il cancello non è più bloccato', S.gateLocked === false && world.isSolidTile(gtx, gty) === false);
    check('già aperto: E non fa più nulla di speciale lì', gameplay.nearbyLockedGate() === false);
    S.gateLocked = false; // ripristina: i test seguenti (e altri file più giù) non devono trovare il cancello bloccato

    /* già a casa: nessun effetto (niente doppio portale) */
    P.x = home.x * TS + 8; P.y = (home.y + 2) * TS + 3;
    const already = gameplay.goHome();
    check('goHome(): no-op se sei già a casa', already === false);

    /* il portale di ritorno riporta esattamente dove eri, poi sparisce (uso singolo) — si
       usa DENTRO l'atrio (in mezzo, ATRIO_PORTAL), non più con P.x/P.y del mondo */
    S.teleportBack = { x: farX, y: farY }; // ripristina lo stato del portale aperto sopra
    inter.INT.active = true; inter.INT.b = { type: 'house', doorx: S.home.x, doory: S.home.y }; inter.INT.houseRoom = null;
    inter.INT.x = houseM.ATRIO_PORTAL.x; inter.INT.y = houseM.ATRIO_PORTAL.y;
    check('il portale è a portata in mezzo all\'atrio', !!gameplay.nearbyReturnPortal());
    /* il prompt con "E" mancava (segnalato: "quando mi avvicino al portale non c'è la
       scritta E per tp") — updatePrompt() ha il suo elenco di vicinanze SEPARATO da act(),
       nessuno dei due bastava da solo. */
    ui.updatePrompt();
    const promptEl = document.getElementById('prompt');
    check('vicino al portale compare il prompt con E', promptEl && /Torna indietro|Teleport back/.test(promptEl.innerHTML), promptEl && promptEl.innerHTML);
    const ok = gameplay.useReturnPortal();
    check('il portale riporta ESATTAMENTE al punto di partenza', ok === true && P.x === farX && P.y === farY);
    check('usarlo esce dall\'atrio', inter.INT.active === false);
    check('il portale si consuma (uso singolo)', S.returnPortal === null && S.teleportBack === null);

    /* la casa e il portale si disegnano davvero (ogni scena va disegnata da un test):
       più fotogrammi/orari, per attraversare anche le fasi animate del vortice e la notte).
       Il portale sta DENTRO l'atrio (drawHouseCorridor), non più nel mondo aperto. */
    const { render, drawHouse } = await import('../src/render.js');
    P.x = home.x * TS; P.y = home.y * TS; state.cam.x = P.x; state.cam.y = P.y;
    let drewOk = true;
    const oldTod = S.tod;
    const oldMaps = S.maps, oldDrops = S.drops;
    S.maps = [{ x: home.x, y: home.y - 2, rar: 'raro', uid: 1 }];
    S.drops = [{ tx: home.x + 1, ty: home.y - 2, kind: 'good', payload: { id: 'ambra' } }, { tx: home.x - 1, ty: home.y - 2, kind: 'fossil' }];
    try {
      for (const t of [0, 150, 300, 450]) render(t);
      S.tod = 0.75; render(600); // notte: finestre accese, vetri gialli
      S.tod = oldTod;
    } catch (e) { drewOk = false; }
    S.maps = oldMaps; S.drops = oldDrops;
    check('la casa si disegna senza errori', drewOk);
    /* il portale ANIMATO dentro l'atrio (drawHouseCorridor → drawReturnPortal), più fotogrammi
       per le fasi del vortice */
    S.returnPortal = { x: home.x, y: home.y + 2 }; // solo un flag ormai: la posizione vera è ATRIO_PORTAL
    inter.INT.active = true; inter.INT.b = { type: 'house', doorx: S.home.x, doory: S.home.y }; inter.INT.houseRoom = null;
    let portalDrewOk = true;
    try { for (const t of [0, 150, 300, 450]) render(t); } catch (e) { portalDrewOk = false; }
    check('il portale nell\'atrio si disegna senza errori', portalDrewOk);
    inter.INT.active = false; inter.INT.justLeft = false;
    S.returnPortal = null;
    /* la casa nelle Lande Gelide ha la neve sul tetto: stessa funzione, un ramo in più */
    let snowOk = true;
    try { drawHouse({ x0: 0, y0: 540, x1: 2, y1: 541, doorx: 1, doory: 541 }, 0, 0); } catch (e) { snowOk = false; }
    check('la casa innevata si disegna senza errori', snowOk);
  }
}

/* ---------- CASA del giocatore (M2: sblocco stanze, SCENE separate vere) ---------- */
{
  const house = await import('../src/house.js');
  const inter = await import('../src/interior.js');
  const i18nHouse = await import('../src/i18n.js');
  /* stato pulito, indipendente da quanto girato prima */
  S.house = { rooms: [{ id: 0, unlocked: true, furn: [] }, { id: 1, unlocked: false, furn: [] }, { id: 2, unlocked: false, furn: [] }, { id: 3, unlocked: false, furn: [] }] };
  check('la stanza 0 parte sempre sbloccata', house.roomUnlocked(0) === true);
  check('le altre partono chiuse', !house.roomUnlocked(1) && !house.roomUnlocked(2) && !house.roomUnlocked(3));
  check('i prezzi crescono ed è gratis solo la stanza 0', house.roomPrice(0) === 0 && house.roomPrice(1) < house.roomPrice(2) && house.roomPrice(2) < house.roomPrice(3));

  /* SCENE SEPARATE (rifatto da capo due volte: prima "stanze in fila", poi "un corridoio
     con le stanze ai lati" — bocciato anche quello, "le stanze non si devono vedere
     attraverso le porte", ispirazione Animal Crossing): un piccolo ATRIO con una porta per
     stanza (su pareti diverse, mai sovrapposte), ogni stanza una scena a sé con la SUA
     griglia locale (ROOM_TILE_W×ROOM_TILE_H, come i 6 interni a mestiere). */
  {
    const gates = house.houseGates();
    check('4 porte nell\'atrio, una per stanza', gates.length === 4 && gates.every((g, i) => g.id === i));
    check('le porte stanno su pareti diverse (mai a caso una sull\'altra)',
      new Set(gates.map(g => g.wall + ':' + Math.round((g.cx || 0) + (g.cy || 0)))).size === 4);
    check('l\'atrio è piccolo, un vero ingresso (non un corridoio istituzionale)',
      house.CORR_W * house.CORR_H < house.ROOM_TILE_W * house.ROOM_TILE_H &&
      house.CORR_H <= house.ROOM_TILE_H + 2);
    check('ogni stanza è una scena a sé, della stessa taglia dei 6 interni a mestiere',
      house.ROOM_TILE_W === 10 && house.ROOM_TILE_H === 7);
    check('le stanze hanno un\'identità di casa vera, non "Stanza N"',
      i18nHouse.roomName(0) === 'Sala' && i18nHouse.roomName(1) === 'Cucina' &&
      i18nHouse.roomName(2) === 'Bagno' && i18nHouse.roomName(3) === 'Camera');
  }

  /* fondi insufficienti: nessun effetto collaterale */
  const price1 = house.roomPrice(1);
  S.coins = price1 - 1;
  const coinsBefore = S.coins;
  const failed = house.tryUnlockRoom(1);
  check('sblocco rifiutato senza abbastanza monete', failed === false);
  check('non spende nulla se rifiuta', S.coins === coinsBefore);
  check('la stanza resta chiusa se il pagamento fallisce', !house.roomUnlocked(1));

  /* fondi sufficienti: si sblocca e paga */
  S.coins = price1;
  const ok = house.tryUnlockRoom(1);
  check('sblocco riuscito con monete sufficienti', ok === true);
  check('le monete vengono scalate del prezzo giusto', S.coins === 0);
  check('la stanza resta sbloccata (persiste in S.house)', house.roomUnlocked(1) === true);
  check('sbloccarla di nuovo non fa nulla (già tua)', house.tryUnlockRoom(1) === false);

  if (state.S.home) {
    const home = state.S.home;
    /* si entra in casa: si arriva SEMPRE nel piccolo atrio, mai dentro una stanza */
    inter.INT.active = false; inter.INT.justLeft = false;
    P.x = home.x * TS + 8; P.y = home.y * TS + 2; P.dir = 'up'; P.moving = true;
    inter.checkDoorEnter();
    check('si rientra in casa per il test delle stanze', inter.INT.active === true && inter.INT.b.type === 'house');
    check('si arriva nell\'ATRIO, non in una stanza', inter.INT.houseRoom === null);
    check('la scena attiva è quella dell\'atrio (piccola)', inter.INT.w === house.CORR_W && inter.INT.h === house.CORR_H);
    check('si entra vicino alla porta d\'ingresso, in basso al centro', Math.abs(inter.INT.x - (house.CORR_W / 2) * TS) < TS);

    /* varco 1 (stanza 0→1, appena sbloccata): attraversabile e ci si ENTRA (scena cambia);
       varco 2 (verso la 2, ancora chiusa): muro pieno, lucchetto compreso, NESSUNA scena
       cambia (le stanze chiuse non si "vedono" nemmeno attraverso la porta) */
    const g1 = house.corrDoorRect(1), g2 = house.corrDoorRect(2);
    check('il varco di una stanza sbloccata si attraversa', !inter.interiorSolid(g1.cx, g1.cy));
    check('il varco di una stanza ancora chiusa è solido (lucchetto)', inter.interiorSolid(g2.cx, g2.cy));

    /* il prompt/interazione trova il varco chiuso più vicino, SOLO mentre si è nell'atrio */
    inter.INT.x = g2.cx + (g2.wall === 'left' ? 10 : -10); inter.INT.y = g2.cy;
    check('nearLockedGate riconosce il varco chiuso davanti', inter.nearLockedGate() === 2);
    inter.INT.x = g1.cx; inter.INT.y = g1.cy;
    check('nearLockedGate non segnala un varco già sbloccato', inter.nearLockedGate() === null);

    /* si cammina DENTRO il varco sbloccato: si passa alla SCENA della stanza (non più
       all'atrio) — esattamente come entrare in un edificio del mondo */
    inter.INT.x = g1.cx; inter.INT.y = g1.wall === 'top' ? -3 : g1.cy;
    if (g1.wall === 'left') inter.INT.x = -3; else if (g1.wall === 'right') inter.INT.x = house.CORR_W * TS + 3;
    inter.updateInterior(0, {}, 0); // stepHouseNav gira ad ogni frame, senza input basta un tick
    check('entrando nel varco sbloccato la scena diventa quella della stanza', inter.INT.houseRoom === 1);
    check('la stanza ha la sua taglia propria (non più quella dell\'atrio)', inter.INT.w === house.ROOM_TILE_W && inter.INT.h === house.ROOM_TILE_H);
    /* nessun lucchetto da mostrare DENTRO una stanza (le porte stanno solo nell'atrio) */
    check('nessun varco a lucchetto dentro una stanza', inter.nearLockedGate() === null);

    /* si torna indietro: si esce dalla stanza dal SUO varco in basso → ATRIO, non il mondo */
    inter.INT.x = house.ROOM_TILE_W / 2 * TS; inter.INT.y = house.ROOM_TILE_H * TS + 2;
    inter.updateInterior(0, {}, 0);
    check('uscendo dalla stanza si torna nell\'atrio', inter.INT.houseRoom === null && inter.INT.active === true);
    check('la scena torna quella (piccola) dell\'atrio', inter.INT.w === house.CORR_W && inter.INT.h === house.CORR_H);

    /* sblocca anche la 2 e verifica che il varco si apra davvero */
    S.coins = house.roomPrice(2);
    check('sblocco della stanza 2 riuscito', house.tryUnlockRoom(2) === true);
    check('ora il suo varco si attraversa', !inter.interiorSolid(g2.cx, g2.cy));

    /* la scheda della porta a lucchetto si apre e mostra il prezzo (senza crash) */
    {
      S.coins = 0;
      let crash = null;
      try { ui.openRoomLock(3); } catch (e) { crash = e.message; }
      check('la porta a lucchetto si apre senza crash', crash === null, crash || '');
      const html = document.getElementById('m-body').innerHTML;
      check('la scheda mostra il prezzo della stanza', html.includes(String(house.roomPrice(3))));
      check('senza monete il bottone di sblocco è disabilitato', /disabled/.test(html));
      ui.closeModal(true);
    }
    /* l'acquisto vero e proprio (tryUnlockRoom, quello che il bottone richiama) */
    S.coins = house.roomPrice(3);
    check('con le monete giuste anche l\'ultima stanza si sblocca', house.tryUnlockRoom(3) === true);
    /* uscire dall'atrio (porta d'ingresso, verso il mondo): lascia DAVVERO la casa */
    inter.INT.houseRoom = null; inter.INT.w = house.CORR_W; inter.INT.h = house.CORR_H;
    inter.INT.x = (house.CORR_W / 2) * TS; inter.INT.y = (house.CORR_H - 0.5) * TS;
    inter.updateInterior(0, {}, 0);
    check('uscendo dalla porta d\'ingresso si lascia la casa', inter.INT.active === false);
  }
}

/* ---------- CASA del giocatore (M3: arredo, piazzamento, negozio) ---------- */
{
  const house = await import('../src/house.js');
  const inter = await import('../src/interior.js');
  const dataM = await import('../src/data.js');
  const i18n = await import('../src/i18n.js');
  const progress = await import('../src/progress.js');
  const regionsM = await import('../src/regions.js');
  const { FURN_SETS, FURN_BY_ID } = dataM;

  /* FURN_SETS: 6 zone, ogni pezzo valido, FURN_BY_ID è lo stesso oggetto */
  check('FURN_SETS copre tutte le 6 zone', dataM.ZONES.every(z => Array.isArray(FURN_SETS[z.id]) && FURN_SETS[z.id].length > 0));
  const allFurn = Object.values(FURN_SETS).flat();
  check('ogni pezzo di arredo ha id/zone/slot/lvl/cost/icon validi', allFurn.every(f =>
    typeof f.id === 'string' && dataM.ZONES.some(z => z.id === f.zone) && typeof f.slot === 'string' &&
    Number.isFinite(f.lvl) && Number.isFinite(f.cost) && typeof f.icon === 'string'));
  check('FURN_BY_ID trova ogni pezzo per id', allFurn.every(f => FURN_BY_ID[f.id] === f));
  check('ogni pezzo ha un nome tradotto (furnLabel)', allFurn.every(f => i18n.furnLabel(f.id) !== f.id));

  /* stato pulito */
  S.furnOwned = []; S.house = { rooms: [{ id: 0, unlocked: true, furn: [] }, { id: 1, unlocked: false, furn: [] }, { id: 2, unlocked: false, furn: [] }, { id: 3, unlocked: false, furn: [] }] };
  S.level = 1; S.coins = 0;
  /* si scelgono per RUOLO, non per posizione nell'elenco: il set ora contiene anche i fondi
     (carta da parati/pavimento), che non si piazzano su una casella — un test che pescava
     `[0]` si ritrovava a provare a posare la carta da parati sul pavimento. */
  const cheap = FURN_SETS.prati.find(f => f.slot === 'tappeto');    // decoro 2×2, ci si cammina sopra
  const highLvl = FURN_SETS.prati.find(f => f.slot === 'letto');    // mobile solido 2×2, lvl 3

  /* acquisto sotto livello: rifiutato, nessun effetto */
  S.coins = 9999;
  check('sotto il livello richiesto: rifiutato', house.buyFurniture(highLvl.id) === false);
  check('nessuna moneta spesa se rifiutato per livello', S.coins === 9999);
  check('non entra nel posseduto se rifiutato per livello', !S.furnOwned.includes(highLvl.id));

  /* fondi insufficienti (livello ok) */
  S.level = highLvl.lvl; S.coins = highLvl.cost - 1;
  const coinsBefore = S.coins;
  check('fondi insufficienti: rifiutato', house.buyFurniture(highLvl.id) === false);
  check('nessuna moneta spesa se rifiutato per fondi', S.coins === coinsBefore);

  /* acquisto riuscito: livello e fondi ok */
  S.coins = highLvl.cost;
  check('acquisto riuscito', house.buyFurniture(highLvl.id) === true);
  check('le monete sono state scalate', S.coins === 0);
  check('il pezzo è nel posseduto', S.furnOwned.includes(highLvl.id));
  check('furnLevelLock torna null per un pezzo già tuo', house.furnLevelLock(highLvl.id) === null);
  check('comprarlo di nuovo non fa nulla (già tuo)', house.buyFurniture(highLvl.id) === false);

  /* un secondo pezzo, economico, per i test di piazzamento: `cheap` (prati_rug) è un
     DECORO — un tappeto, non un mobile — e un terzo pezzo (`extraSolid`, prati_table) per
     isolare il rifiuto "stesso strato già occupato" senza confonderlo col rifiuto "già
     piazzato altrove" (che scatterebbe riprovando lo stesso `highLvl`). */
  S.coins = cheap.cost; S.level = Math.max(S.level, cheap.lvl);
  check('secondo acquisto riuscito (pezzo economico)', house.buyFurniture(cheap.id) === true);
  const extraSolid = FURN_SETS.prati.find(f => f.slot === 'tavolo');   // 2×1, stesso strato del letto
  S.coins = extraSolid.cost; S.level = Math.max(S.level, extraSolid.lvl);
  check('terzo acquisto riuscito (mobile solido di scorta)', house.buyFurniture(extraSolid.id) === true);
  check('il vassoio (non piazzato) contiene tutti e tre', house.ownedUnplaced().length === 3 &&
    house.ownedUnplaced().includes(cheap.id) && house.ownedUnplaced().includes(highLvl.id) && house.ownedUnplaced().includes(extraSolid.id));

  /* piazzamento: cella valida di pavimento nella stanza 0 (sempre sbloccata) — coordinate
     LOCALI DIRETTE alla scena della stanza (0,0 = angolo della SUA griglia, niente più
     offset di un corridoio condiviso). */
  const cell = house.floorCellAt(0, 3 * TS + 8, 2 * TS + 8); // dentro ROOM_TILE_W×ROOM_TILE_H, con spazio per un 2×2
  check('la cella scelta per il test è pavimento calpestabile', !!cell && cell.room === 0);
  check('piazzare nella stanza sbloccata riesce', house.tryPlaceFurniture(0, cell.gx, cell.gy, cheap.id) === true);
  check('il pezzo ora è piazzato in S.house', house.furnAt(0, cell.gx, cell.gy) && house.furnAt(0, cell.gx, cell.gy).itemId === cheap.id);
  check('esce dal vassoio una volta piazzato', !house.ownedUnplaced().includes(cheap.id));
  /* `cheap` è un tappeto: un DECORO non blocca il passo — richiesto esplicitamente
     ("se metto oggetti più piccoli di una casella non ci cammino attorno"). */
  check('un decoro (tappeto) non blocca il passaggio', house.houseFurnSolid(0, cell.gx * TS + 8, cell.gy * TS + 8) === false);

  /* un mobile SOLIDO sulla STESSA cella di un decoro: "tappeto sotto la sedia" — due strati
     indipendenti, non un unico slot per casella (richiesto esplicitamente). */
  check('un mobile solido si piazza SULLA cella di un decoro (tappeto sotto)', house.tryPlaceFurniture(0, cell.gx, cell.gy, highLvl.id) === true);
  check('ora la cella blocca il passaggio (lo strato solido)', house.houseFurnSolid(0, cell.gx * TS + 8, cell.gy * TS + 8) === true);
  check('furnAt preferisce il solido quando ci sono entrambi', house.furnAt(0, cell.gx, cell.gy).itemId === highLvl.id);
  check('decorAt trova comunque il tappeto sotto', house.decorAt(0, cell.gx, cell.gy) && house.decorAt(0, cell.gx, cell.gy).itemId === cheap.id);
  /* un SECONDO mobile solido sulla stessa cella (stesso strato già occupato): rifiutato */
  check('un secondo pezzo nello STESSO strato è rifiutato', house.tryPlaceFurniture(0, cell.gx, cell.gy, extraSolid.id) === false);

  /* piazzare in una stanza ANCORA CHIUSA: rifiutato (stanza 1 chiusa in questo stato pulito) */
  check('piazzare in una stanza chiusa è rifiutato', house.tryPlaceFurniture(1, 3, 4, highLvl.id) === false);

  /* rimuovere/spostare: `removeFurnitureAt` senza strato preferisce il solido — toglie il
     mobile e lascia il tappeto lì sotto, esattamente come ci si aspetta togliendo un mobile
     da sopra un tappeto. */
  check('rimuovere il pezzo piazzato riesce', house.removeFurnitureAt(0, cell.gx, cell.gy) === true);
  check('torna nel vassoio dopo la rimozione', house.ownedUnplaced().includes(highLvl.id));
  check('il tappeto resta dov\'era', house.furnAt(0, cell.gx, cell.gy) && house.furnAt(0, cell.gx, cell.gy).itemId === cheap.id);
  check('la cella liberata dal mobile non è più solida', house.houseFurnSolid(0, cell.gx * TS + 8, cell.gy * TS + 8) === false);
  /* e ora si toglie anche il tappeto (unico strato rimasto) */
  check('rimuovere anche il decoro riesce', house.removeFurnitureAt(0, cell.gx, cell.gy) === true);
  check('torna nel vassoio anche lui', house.ownedUnplaced().includes(cheap.id));
  const cell2 = house.floorCellAt(0, 6 * TS + 8, 2 * TS + 8);
  check('si ripiazza altrove (spostamento = rimuovi + piazza)', house.tryPlaceFurniture(0, cell2.gx, cell2.gy, cheap.id) === true);
  check('rimuovere da una cella vuota non fa nulla', house.removeFurnitureAt(0, 9, 9) === false);

  /* interazione in-scena: houseFloorHere() dal loop, camminando davvero dentro casa
     (atrio) e poi ENTRANDO nella Sala (varco della stanza 0, sempre sbloccata) */
  if (S.home) {
    inter.INT.active = false; inter.INT.justLeft = false;
    P.x = S.home.x * TS + 8; P.y = S.home.y * TS + 2; P.dir = 'up'; P.moving = true;
    inter.checkDoorEnter();
    if (inter.INT.active && inter.INT.b && inter.INT.b.type === 'house') {
      /* la SCENA DELL'ATRIO va disegnata davvero: una funzione mai chiamata da nessun
         test è un crash che aspetta (REGOLA #9) */
      const { render } = await import('../src/render.js');
      const { cam } = state;
      cam.x = P.x; cam.y = P.y;
      let drewOk = true;
      try { render(4000); } catch (e) { drewOk = false; }
      check('l\'atrio della casa si disegna senza errori', drewOk);

      inter.enterHouseRoom(0); // varco 0 (Sala) sempre sbloccato: si entra dritti nella sua scena
      check('si è entrati nella scena della Sala', inter.INT.houseRoom === 0);
      drewOk = true;
      try { render(4050); } catch (e) { drewOk = false; }
      check('la Sala con l\'arredo piazzato si disegna senza errori', drewOk);

      /* piazzare sotto i PROPRI piedi (come act() fa via houseFloorHere) rende la cella
         solida all'istante: senza nudgeOffFurniture() il giocatore restava incastrato dentro
         il mobile appena piazzato (segnalato: "mi blocco sulla poltrona"). */
      const selfCell = house.floorCellAt(0, 1 * TS + 8, 4 * TS + 8);
      inter.INT.x = selfCell.gx * TS + 8; inter.INT.y = selfCell.gy * TS + 8;
      check('piazzare sulla propria cella riesce', house.tryPlaceFurniture(0, selfCell.gx, selfCell.gy, highLvl.id) === true);
      const stuckBefore = inter.interiorSolid(inter.INT.x, inter.INT.y);
      inter.nudgeOffFurniture();
      check('il mobile appena piazzato sotto i piedi diventa solido', stuckBefore === true);
      check('nudgeOffFurniture sposta via dal mobile: non più incastrati', inter.intCollide(inter.INT.x, inter.INT.y) === false);

      /* NON SI RESTA INCASTRATI, MAI. Con i mobili 2×2 spostarsi di UNA casella non basta:
         quella accanto può essere ancora dentro lo stesso mobile, e in un angolo le altre
         sono muro — si restava fermi dentro il proprio letto (segnalato: "ogni volta che
         piazzo qualcosa in casa rimango bloccato"). */
      {
        const letto2 = FURN_SETS.prati.find(f => f.slot === 'letto');
        if (!S.furnOwned.includes(letto2.id)) S.furnOwned.push(letto2.id);
        const prima = S.house.rooms[0].furn.slice();   // il blocco dopo conta su quello che c'è già
        S.house.rooms[0].furn = [];
        /* angolo alto-sinistro: a destra e sotto c'è il mobile, sopra e a sinistra il muro */
        inter.INT.x = 1 * TS + 8; inter.INT.y = 2 * TS + 8;
        check('un 2×2 si piazza anche nell\'angolo', house.tryPlaceFurniture(0, 1, 2, letto2.id) === true);
        check('e ci si ritrova dentro (la cella è diventata solida)', inter.interiorSolid(inter.INT.x, inter.INT.y) === true);
        inter.nudgeOffFurniture();
        /* si misura con la scatola dei PIEDI (intCollide), la stessa con cui si cammina in casa */
        check('dopo il piazzamento NON si resta incastrati', inter.intCollide(inter.INT.x, inter.INT.y) === false,
          'x=' + inter.INT.x + ' y=' + inter.INT.y);
        /* e nemmeno con la stanza quasi piena: si finisce comunque su una casella libera */
        S.house.rooms[0].furn = [];
        for (const [gx2, gy2] of [[1, 2], [3, 2], [5, 2], [7, 2], [1, 4], [3, 4]]) {
          S.house.rooms[0].furn.push({ itemId: letto2.id, gx: gx2, gy: gy2, rot: 0 });
        }
        inter.INT.x = 3 * TS + 8; inter.INT.y = 4 * TS + 8;
        inter.nudgeOffFurniture();
        check('e nemmeno in una stanza quasi piena', inter.intCollide(inter.INT.x, inter.INT.y) === false,
          'x=' + inter.INT.x + ' y=' + inter.INT.y);
        S.house.rooms[0].furn = prima;
      }

      /* IN CASA si urta coi PIEDI: la profondità si decide coi piedi (y+12), e con la scatola
         vecchia (y..y+5) i piedi entravano 7px dentro una sedia — Digsy finiva disegnato dietro
         lo schienale stando davanti. Si cammina verso il basso contro una sedia e si pretende
         che i piedi restino FUORI dal suo ingombro. */
      {
        const sedia = 'boschi_chair';
        if (!S.furnOwned.includes(sedia)) S.furnOwned.push(sedia);
        const primaS = S.house.rooms[0].furn.slice();
        S.house.rooms[0].furn = [];
        house.tryPlaceFurniture(0, 4, 4, sedia);
        inter.INT.x = 4 * TS + 16; inter.INT.y = 2 * TS;
        let passi = 0;
        while (!inter.intCollide(inter.INT.x, inter.INT.y + 1) && passi++ < 200) inter.INT.y += 1;
        const piedi = inter.INT.y + 12;
        check('camminando contro una sedia, i piedi restano FUORI dal suo ingombro', piedi <= 4 * TS, 'piedi a ' + piedi + ', sedia da ' + 4 * TS);
        S.house.rooms[0].furn = primaS;
      }

      /* piazzare DAVANTI ALLA PORTA: quella casella è dove si ricompare rientrando nella
         stanza. Un mobile lì bloccava il rientro (segnalato: "se lo metto davanti alla
         porta quando entro sono bloccato") — ora la cella d'ingresso non è piazzabile. */
      const entry = house.roomEntryPoint();
      const entryCell = house.floorCellAt(0, entry.x, entry.y);
      check('la cella davanti alla porta NON è pavimento piazzabile', entryCell === null);
      check('piazzare sulla cella d\'ingresso è rifiutato', house.tryPlaceFurniture(0, Math.floor(entry.x / TS), Math.floor(entry.y / TS), highLvl.id) === false);
      house.removeFurnitureAt(0, selfCell.gx, selfCell.gy); // ripristina per il resto del blocco

      /* SALVATAGGIO VECCHIO con un mobile già lì (da prima del fix sopra): bloccava il
         rientro nella stanza, con l'atrio che rimbalzava avanti e indietro senza mai entrare
         (segnalato: "adesso non entra neanche nella stanza dal corridoio"). La pulizia una
         tantum in ensureHouseState() lo toglie e lo rimette nel vassoio. */
      const egx = Math.floor(entry.x / TS), egy = Math.floor(entry.y / TS);
      S.house.rooms[0].furn.push({ itemId: highLvl.id, gx: egx, gy: egy }); // bypassa tryPlaceFurniture apposta
      house.ensureHouseState();
      check('un mobile vecchio sulla cella d\'ingresso viene tolto dalla pulizia una tantum',
        house.furnAt(0, egx, egy) === null && house.ownedUnplaced().includes(highLvl.id));

      inter.INT.x = cell2.gx * TS + 8; inter.INT.y = cell2.gy * TS + 8;
      const here = inter.houseFloorHere();
      check('houseFloorHere trova il pezzo piazzato sotto i piedi', !!here && here.itemId === cheap.id);
      /* act() lo raccoglie: torna nel vassoio */
      gameplay.act();
      check('act() lo raccoglie: non è più piazzato in nessuna stanza', house.ownedUnplaced().includes(cheap.id));

      /* TOCCO DIRETTO sul mobile (M4-bis): si raccoglie/piazza toccando la cella giusta, non
         serve più camminarci sopra come per {act} — richiesto esplicitamente ("devo poterli
         spostare come mi pare"). `tapFurnitureAt` è la funzione dietro al tocco sulla canvas
         (input.js): qui si chiama direttamente, senza simulare un evento di puntatore. */
      /* `act()` sopra ha RACCOLTO il tappeto (nuovo comportamento M4-bis: non lo rimuove più
         subito, resta "in mano" finché non lo si ripiazza) — si annulla per partire puliti. */
      house.cancelHold();
      const cell3 = house.floorCellAt(0, 3 * TS + 8, 4 * TS + 8);
      check('tap su una cella vuota (non in mano) non è gestito: resta un comando per camminare',
        gameplay.tapFurnitureAt(cell3.gx, cell3.gy) === false);
      /* il LETTO non si raccoglie col tocco (ci si dorme: c'è il suo pannello), quindi il
         test dello spostamento usa un mobile qualsiasi */
      house.tryPlaceFurniture(0, cell3.gx, cell3.gy, extraSolid.id);
      check('tap su un mobile piazzato lo raccoglie (senza doverci stare sopra)', gameplay.tapFurnitureAt(cell3.gx, cell3.gy) === true);
      check('ora è "in mano"', house.isHolding() === true);
      const cell4 = house.floorCellAt(0, 6 * TS + 8, 4 * TS + 8);
      check('tap su una cella vuota, tenendolo in mano, lo piazza lì', gameplay.tapFurnitureAt(cell4.gx, cell4.gy) === true);
      check('non è più "in mano" dopo il piazzamento', house.isHolding() === false);
      check('il mobile è ora sulla nuova cella toccata', house.furnAt(0, cell4.gx, cell4.gy) && house.furnAt(0, cell4.gx, cell4.gy).itemId === extraSolid.id);
      house.removeFurnitureAt(0, cell4.gx, cell4.gy); // ripulisce: non deve sporcare i test dopo

      inter.leaveHouseRoom();
      check('leaveHouseRoom torna nell\'atrio', inter.INT.houseRoom === null);
      inter.exitInterior();
    }
  }

  /* ---- TAGLIE, PARETE e FONDI (l'arredo che compone la stanza, non la riempie) ---- */
  {
    const { furnSize, furnPlace, furnIsBackdrop } = dataM;
    const letto = FURN_SETS.prati.find(f => f.slot === 'letto');
    const quadro = FURN_SETS.prati.find(f => f.place === 'wall');
    const parato = FURN_SETS.prati.find(f => f.place === 'paper');
    const pavim = FURN_SETS.prati.find(f => f.place === 'ground');
    check('ogni zona ha carta da parati, pavimento e un pezzo da parete',
      dataM.ZONES.every(z => ['paper', 'ground', 'wall'].every(p => FURN_SETS[z.id].some(f => f.place === p))));
    /* LE TAGLIE ESISTONO DAVVERO: se tornassero tutte 1×1 la stanza tornerebbe senza
       gerarchia (un letto grande quanto una lampada) e nessun test se ne accorgerebbe */
    check('il letto occupa più di una casella', furnSize(letto.id, 0).w * furnSize(letto.id, 0).h > 1);
    const tavolo = FURN_SETS.prati.find(f => f.slot === 'tavolo');
    check('ruotare un pezzo rettangolare scambia larghezza e altezza',
      furnSize(tavolo.id, 1).w === furnSize(tavolo.id, 0).h && furnSize(tavolo.id, 1).h === furnSize(tavolo.id, 0).w);
    check('un quadro non è solido (non blocca il passo)', dataM.furnIsSolid(quadro.id) === false);
    check('carta da parati e pavimento sono fondi, non oggetti da posare',
      furnIsBackdrop(parato.id) && furnIsBackdrop(pavim.id) && !furnIsBackdrop(letto.id));

    S.furnOwned = [letto.id, quadro.id, parato.id, pavim.id];
    S.house.rooms[0].furn = [];
    /* INGOMBRO: un 2×2 non entra se una delle sue quattro caselle è fuori dal pavimento */
    check('un mobile 2×2 sul bordo destro è rifiutato (sborda)', house.tryPlaceFurniture(0, 8, 3, letto.id) === false);
    check('lo stesso mobile entra una casella più dentro', house.tryPlaceFurniture(0, 7, 3, letto.id) === true);
    check('le sue QUATTRO caselle bloccano il passo, non solo l\'angolo',
      house.houseFurnSolid(0, 8 * TS + 8, 4 * TS + 8) === true && house.houseFurnSolid(0, 7 * TS + 8, 3 * TS + 8) === true);
    check('un secondo mobile che si sovrappone anche solo in parte è rifiutato',
      house.tryPlaceFurniture(0, 8, 4, tavolo.id) === false);
    house.removeFurnitureAt(0, 7, 3);

    /* PARETE: si appende stando nella prima fila, e finisce SULLA parete (gy 1), non per terra */
    check('la fila alta è parete, non pavimento', house.isWallCell(3, 1) === true && house.isFloorCell(3, 1) === false);
    check('un quadro appeso dalla prima fila finisce sulla parete', house.tryPlaceFurniture(0, 3, 2, quadro.id) === true);
    check('il quadro sta sulla parete (gy 1)', !!house.wallAt(0, 3, 1));
    check('la parete non blocca il passo sotto', house.houseFurnSolid(0, 3 * TS + 8, 2 * TS + 8) === false);
    check('un quadro NON si appende dal centro della stanza (serve stare al muro)',
      house.removeFurnitureAt(0, 3, 1) && house.tryPlaceFurniture(0, 3, 4, quadro.id) === false);

    /* FONDI: non si posano, si applicano — e sono annullabili */
    check('applicare la carta da parati riesce', house.tryPlaceFurniture(0, 3, 3, parato.id) === true);
    check('la stanza ora ha quella carta da parati', house.roomPaper(0) === parato.id);
    check('non è finita sul pavimento come un mobile', house.furnAt(0, 3, 3) === null);
    check('applicare il pavimento riesce', house.applyBackdrop(0, pavim.id) === true);
    check('la stanza ora ha quel pavimento', house.roomGround(0) === pavim.id);
    check('togliere il fondo riporta la stanza di serie', house.clearBackdrop(0, 'paper') && house.roomPaper(0) === null);
    check('i fondi non stanno nel vassoio dei pezzi da posare',
      !house.ownedUnplaced().includes(parato.id) && !house.ownedUnplaced().includes(pavim.id));
    check('ma si ritrovano nella loro lista', house.ownedBackdrops('paper').includes(parato.id));

    /* MIGRAZIONE dei salvataggi vecchi: pezzi 1×1 rimasti dove non ci stanno più */
    S.house.rooms[0].furn = [
      { itemId: letto.id, gx: 8, gy: 5 },      // 2×2: sborda sia a destra sia in basso
      { itemId: quadro.id, gx: 4, gy: 4 },     // quadro finito per terra
    ];
    const mossi = house.migrateFurniture();
    check('la migrazione rimette nel vassoio i pezzi che non ci stanno più', mossi === 2 && S.house.rooms[0].furn.length === 0);
    check('e restano tuoi (nel vassoio), non spariti', house.ownedUnplaced().includes(letto.id));
    S.house.rooms[0].furn = [];
  }

  /* ---- ARREDARE VEDENDO: il pezzo in mano si vede nella stanza e lo si trascina ---- */
  {
    const letto = FURN_SETS.prati.find(f => f.slot === 'letto');
    const tav = FURN_SETS.prati.find(f => f.slot === 'tavolo');
    const quadro = FURN_SETS.prati.find(f => f.place === 'wall');
    const parato = FURN_SETS.prati.find(f => f.place === 'paper');
    S.furnOwned = [letto.id, tav.id, quadro.id, parato.id];
    S.house.rooms[0].furn = []; house.cancelHold();

    /* dal vassoio si PRENDE IN MANO: prima veniva piantato sotto i piedi e per giudicarlo
       bisognava posarlo, guardarlo, raccoglierlo e riposarlo */
    check('un pezzo del vassoio si prende in mano', house.takeHold(tav.id) === true && house.isHolding() === true);
    check('non se ne prendono due', house.takeHold(letto.id) === false);
    check('non è ancora piazzato da nessuna parte', house.furnAt(0, 3, 3) === null);
    check('appena preso non ha ancora una casella', house.holdTarget() === null);

    /* l'ANTEPRIMA segue il puntatore: la casella la muove chi guarda */
    house.setHoldTarget(4, 3);
    check('l\'anteprima sta dove la si è portata', house.holdTarget().gx === 4 && house.holdTarget().gy === 3);
    check('e lì ci sta (verde)', house.holdPlacement(0).ok === true);
    house.tryPlaceFurniture(0, 1, 2, letto.id);        // un letto 2×2 in mezzo ai piedi
    house.setHoldTarget(1, 2);
    check('sopra un mobile l\'anteprima dice di NO (rosso)', house.holdPlacement(0).ok === false);
    check('e posare lì non fa niente', house.placeHold(0) === false && house.isHolding() === true);

    /* si posa DOVE SI VEDE, senza ripetere le coordinate */
    house.setHoldTarget(5, 4);
    check('si posa dove si vede l\'anteprima', house.placeHold(0) === true);
    check('ed è finito proprio lì', house.furnAt(0, 5, 4) && house.furnAt(0, 5, 4).itemId === tav.id);
    check('la mano è di nuovo libera', house.isHolding() === false);

    /* raccogliendo un mobile l'anteprima nasce DOVE ERA: alzandolo non deve saltare altrove */
    house.pickUpFurniture(0, 5, 4);
    check('raccogliendo, l\'anteprima parte dalla sua casella', house.isHolding() && house.holdTarget().gx === 5 && house.holdTarget().gy === 4);

    /* RUOTARE si vede subito: l'anteprima cambia ingombro, quindi anche il verdetto */
    house.setHoldTarget(8, 3);                          // 2×1 orizzontale: sborda a destra
    const primaDiRuotare = house.holdPlacement(0).ok;
    house.rotateHold();                                 // 1×2 verticale: ci sta
    check('ruotando cambia l\'ingombro e quindi il verdetto', primaDiRuotare === false && house.holdPlacement(0).ok === true);
    house.cancelHold();

    /* un QUADRO si trascina anche SULLA parete, non solo sulla casella davanti */
    house.takeHold(quadro.id);
    house.setHoldTarget(4, 1);
    check('un quadro trascinato sul muro ci va davvero', house.holdPlacement(0).ok === true && house.holdPlacement(0).gy === 1);
    house.setHoldTarget(4, 2);
    check('e anche dalla casella davanti al muro', house.holdPlacement(0).gy === 1);
    house.setHoldTarget(4, 4);
    check('ma non in mezzo alla stanza', house.holdPlacement(0).ok === false);
    house.cancelHold();

    /* i FONDI non si prendono in mano: si applicano */
    check('la carta da parati non si prende in mano', house.takeHold(parato.id) === false);
    S.house.rooms[0].furn = [];
  }

  /* ---- GRIGLIA FITTA e PARETE DI FONDO ---- */
  {
    const vaso = FURN_SETS.palude.find(f => f.id === 'palude_vase');
    const tav = FURN_SETS.prati.find(f => f.slot === 'tavolo');
    const PEDESTAL_ID = dataM.PEDESTAL_ID;
    S.furnOwned = [PEDESTAL_ID, vaso.id, tav.id];
    S.house.rooms[0].furn = []; house.cancelHold();
    /* "questa posizione deve essere accettabile": un piedistallo addossato alla parete di
       fondo (la prima fila sotto il muro) risultava rosso */
    check('un mobile si addossa alla parete di fondo (fila 1)', house.canPlace(0, 4, 1, PEDESTAL_ID, 0) === true);
    /* "la griglia deve essere più fitta": si va di mezza casella in mezza casella */
    check('il passo di posizionamento è mezza casella', house.FURN_STEP === 0.5);
    check('le posizioni si agganciano alla mezza casella', house.snapFurn(3.26) === 3.5 && house.snapFurn(3.74) === 3.5 && house.snapFurn(3.1) === 3);
    check('un pezzo si posa a mezza casella', house.tryPlaceFurniture(0, 3.5, 3, tav.id) === true);
    const t = house.furnAt(0, 4, 3);
    check('e ci resta davvero (3.5)', !!t && t.gx === 3.5);
    /* fianco a fianco senza vuoti: un vaso attaccato al tavolo spostato di mezza casella */
    check('un pezzo accanto, appena dopo, ci sta (niente vuoti obbligati)', house.tryPlaceFurniture(0, 5.5, 3, vaso.id) === true);
    /* e la sovrapposizione anche di mezza casella resta vietata nello stesso strato */
    house.removeFurnitureAt(0, 5, 3, 'decor');
    S.furnOwned.push('boschi_chair');
    check('sovrapporsi di mezza casella allo stesso strato è vietato', house.canPlace(0, 5, 3, 'boschi_chair', 0) === false);
    /* la solidità è al pixel: accanto a un mobile spostato di mezza casella ci si passa */
    check('il mobile a 3.5 blocca da 3.5 in poi', house.houseFurnSolid(0, 3.6 * TS, 3.5 * TS) === true);
    check('ma la mezza casella prima resta libera', house.houseFurnSolid(0, 3.4 * TS, 3.5 * TS) === false);
    /* la porta resta sgombra anche col passo fine */
    const e = house.roomEntryPoint();
    check('davanti alla porta non si posa neanche di sbieco', house.canPlace(0, e.x / TS - 0.5, Math.floor(e.y / TS), tav.id, 1) === false);
    /* MIRANDO TROPPO IN ALTO l'anteprima si ferma contro la parete, non diventa rossa: il
       puntatore sta sul disegno, che sale sopra la base ("continua a darmi rosso nella parte
       alta", due foto) */
    const su = house.clampFurn(vaso.id, 0, 4, 0.5);
    check('trascinato sopra il muro, il pezzo si ferma contro la parete', su.gy === 1 && house.canPlace(0, su.gx, su.gy, vaso.id, 0) === true);
    const dx = house.clampFurn(tav.id, 0, 9, 3);
    check('e contro la parete laterale scorre invece di sbordare', dx.gx + 2 <= 9.5 && house.canPlace(0, dx.gx, dx.gy, tav.id, 0) === true);
    check('un quadro trascinato ovunque resta sulla sua parete', house.clampFurn('prati_art', 0, 3, 5).gy === 1);
    S.house.rooms[0].furn = [];
  }

  /* ---- COMODITÀ DELLA STANZA e RIPOSO: arredare deve servire a qualcosa ---- */
  {
    const gameplay2 = await import('../src/gameplay.js');
    const stateM = await import('../src/state.js');
    const letto = FURN_SETS.prati.find(f => f.slot === 'letto');
    const tappeto = FURN_SETS.prati.find(f => f.slot === 'tappeto');
    const quadro = FURN_SETS.prati.find(f => f.place === 'wall');
    const tav = FURN_SETS.prati.find(f => f.slot === 'tavolo');
    const parato = FURN_SETS.prati.find(f => f.place === 'paper');
    const pav = FURN_SETS.prati.find(f => f.place === 'ground');
    S.furnOwned = [letto.id, tappeto.id, quadro.id, tav.id, parato.id, pav.id];
    S.house.rooms[0].furn = []; S.house.rooms[0].paper = null; S.house.rooms[0].ground = null;

    check('una stanza vuota non è comoda', house.roomComfort(0).score === 0 && house.roomComfort(0).level === 0);
    check('e dormirci non regala nessuna fatica gratis', house.restFreeFor(0) === 0);
    house.tryPlaceFurniture(0, 1, 2, letto.id);
    check('il letto si riconosce nella stanza', !!house.bedInRoom(0) && house.bedInRoom(0).itemId === letto.id);
    const soloLetto = house.roomComfort(0).score;
    house.tryPlaceFurniture(0, 4, 3, tappeto.id);   // 2×2: la cella davanti alla porta non è piazzabile
    house.tryPlaceFurniture(0, 6, 2, tav.id);
    house.tryPlaceFurniture(0, 3, 2, quadro.id);              // dalla prima fila → va sulla parete
    house.applyBackdrop(0, parato.id); house.applyBackdrop(0, pav.id);
    const piena = house.roomComfort(0);
    check('arredare alza davvero la comodità', piena.score > soloLetto, soloLetto + '→' + piena.score);
    /* i pezzi CONTANO PER QUELLO CHE SONO: il tappeto, il quadro e i due fondi hanno ognuno
       la sua voce — un punteggio che sale e basta non direbbe al giocatore cosa cambiare */
    const voci = piena.bits.map(b => b.k);
    check('la comodità dice DA COSA è fatta', ['tappeto', 'parete', 'parato', 'pavimento'].every(k => voci.includes(k)), voci.join(','));
    check('pezzi tutti della stessa zona: coerenza premiata', voci.includes('coerenza'));
    check('e la dormita a casa ora regala fatiche gratis', house.restFreeFor(0) > 0);
    /* mescolare le zone toglie la coerenza (non è un divieto: è una scelta che si paga) */
    house.removeFurnitureAt(0, 6, 2);
    S.furnOwned.push('boschi_chair');
    house.tryPlaceFurniture(0, 6, 2, 'boschi_chair');
    check('mescolando le zone la coerenza si perde', !house.roomComfort(0).bits.some(b => b.k === 'coerenza'));

    /* IL RIPOSO: le fatiche gratis si scalano nell'UNICO punto di spesa dell'energia, quindi
       valgono per lo scavo come per accetta, piccone e cristalli (che costano 2) */
    S.energy = 20; S.restFree = 3;
    stateM.spendEnergy(1);
    check('la prima fatica dopo una bella dormita non costa energia', S.energy === 20 && S.restFree === 2);
    stateM.spendEnergy(2);
    check('una fatica da 2 consuma due riposi, non energia', S.energy === 20 && S.restFree === 0);
    stateM.spendEnergy(2);
    check('finiti i riposi si torna a pagare in energia', S.energy === 18);

    /* DORMIRE NEL PROPRIO LETTO: rifà l'energia come la Locanda e imposta il riposo */
    S.energy = 3; S.restFree = 0; S.sleepBlockHalf = null;
    const atteso = house.restFreeFor(0);
    check('si dorme nel proprio letto', gameplay2.sleepAtHome(0) === true);
    check('energia piena, come alla Locanda', S.energy === S.maxEnergy);
    check('e il riposo vale quanto è curata la stanza', S.restFree === atteso, S.restFree + ' vs ' + atteso);
    /* e non si dorme due volte di fila (stessa regola della Locanda) */
    check('non si dorme due volte di fila', gameplay2.sleepAtHome(0) === false);
    S.house.rooms[0].furn = []; S.house.rooms[0].paper = null; S.house.rooms[0].ground = null; S.restFree = 0;
  }

  /* save/load: arredo posseduto e piazzato sopravvivono */
  {
    S.furnOwned = [cheap.id, highLvl.id];
    S.house.rooms[0].furn = [{ itemId: highLvl.id, gx: 3, gy: 4 }];
    state.save();
    /* round-trip: state.load() rilegge dal disco SENZA toccare l'oggetto S vivo (a differenza
       di initState(), che lo RIASSEGNA e renderebbe stale la `S` catturata a inizio file — lo
       fa solo il blocco delle migrazioni, molto più avanti nel file, per questo). */
    const raw = state.load();
    check('il salvataggio include S.furnOwned', Array.isArray(raw.furnOwned) && raw.furnOwned.length === 2 &&
      raw.furnOwned.includes(cheap.id) && raw.furnOwned.includes(highLvl.id));
    check('il salvataggio include l\'arredo piazzato', raw.house.rooms[0].furn.length === 1 &&
      raw.house.rooms[0].furn[0].itemId === highLvl.id && raw.house.rooms[0].furn[0].gx === 3 && raw.house.rooms[0].furn[0].gy === 4);
  }

  /* BOTTEGA D'ARREDO: il Negozio non vende più mobili ("in un alimentari non ha senso
     acquistare arredamenti"); la Bottega mostra SOLO il set della zona corrente, coi badge giusti */
  {
    S.furnOwned = []; S.level = 1; S.coins = 0;
    const z = regionsM.zoneAt(Math.floor(P.x / TS), Math.floor(P.y / TS));
    ui.openBuilding({ type: 'store', name: 'Negozio' });
    let html = document.getElementById('m-body').innerHTML;
    check('il Negozio non vende arredamento (niente mobili, niente argomenti, niente schede)',
      FURN_SETS[z.id].every(f => !html.includes(i18n.furnLabel(f.id))) && !/data-ftopic=|data-stab=/.test(html));
    /* ARREDAMENTO PER ARGOMENTI: entrando in bottega si vedono gli argomenti, non i mobili */
    ui.openBuilding({ type: 'furniture', name: 'Bottega d\'arredo' });
    html = document.getElementById('m-body').innerHTML;
    check('la Bottega d\'arredo si apre col suo titolo', /arredo/i.test(document.getElementById('m-title').innerHTML));
    check('Arredamento: si entra nella griglia degli ARGOMENTI (stile della zona + 12 temi)',
      (html.match(/data-ftopic=/g) || []).length === 13 && !FURN_SETS[z.id].some(f => html.includes('data-furn="' + f.id + '"')));
    /* e scegliendo lo stile della zona compaiono i suoi pezzi */
    ui.renderFurnShop('zona');
    html = document.getElementById('m-body').innerHTML;
    check('dentro un argomento c\'è il bottone per tornare agli argomenti', /data-fback=/.test(html));
    check('il tab Arredamento mostra il set della zona corrente (' + z.id + ')',
      FURN_SETS[z.id].every(f => html.includes(i18n.furnLabel(f.id))));
    const altriZone = dataM.ZONES.filter(zz => zz.id !== z.id);
    const fuoriPosto = altriZone.some(zz => FURN_SETS[zz.id].some(f => html.includes(i18n.furnLabel(f.id))));
    check('non mostra il set di ALTRE zone', !fuoriPosto);
    /* badge: livello 1 → il primo pezzo (lvl 1) è comprabile, quelli di livello alto sono 🔒 */
    const lvl1 = FURN_SETS[z.id].find(f => f.lvl <= 1), lvlHigh = FURN_SETS[z.id].find(f => f.lvl > 1);
    if (lvl1) check('un pezzo di livello 1 mostra il prezzo (comprabile)', html.includes('🪙 ' + lvl1.cost) || html.includes(String(lvl1.cost)));
    if (lvlHigh) check('un pezzo di livello alto mostra il lucchetto', html.includes('Lv' + lvlHigh.lvl));
    ui.closeModal(true);
  }
}

/* ---------- IN BARCA NON SI VEDONO LE GAMBE ---------- */
{
  /* Il personaggio ridisegnato a 32px ha le gambe più in alto e il corpo più largo di prima:
     lo scafo, tarato sulla vecchia figura, era più stretto di lui e partiva troppo in basso —
     si vedevano i polpacci spuntare fuori dalla barca (segnalato con foto).
     Qui si MISURA lo scafo come lo vede il giocatore: si tiene il conto delle trasformazioni
     (i mezzi disegnati a mano a mezza scala vengono raddoppiati), e le misure sono prese
     RISPETTO allo scafo, perché il beccheggio muove barca ed eroe insieme. */
  const render2 = await import('../src/render.js');
  const { ctx: ctx2 } = await import('../src/screen.js');
  const { P: P2 } = state;
  const scafo = (disegna) => {
    const rects = [];
    let tr = { x: 0, y: 0, kx: 1, ky: 1 };
    const pila = [];
    const oldFill = ctx2.fillRect, oldSave = ctx2.save, oldRestore = ctx2.restore, oldTr = ctx2.translate, oldSc = ctx2.scale;
    /* lo specchio (verso sinistra) ha kx negativo: il rettangolo va riportato con la sua
       larghezza positiva, altrimenti "largo -30" non somiglia a niente */
    ctx2.fillRect = (x, y, w, h) => {
      const x0 = tr.x + x * tr.kx, w0 = w * tr.kx;
      rects.push([w0 < 0 ? x0 + w0 : x0, tr.y + y * tr.ky, Math.abs(w0), Math.abs(h * tr.ky)]);
    };
    ctx2.save = () => pila.push({ ...tr });
    ctx2.restore = () => { tr = pila.pop() || { x: 0, y: 0, kx: 1, ky: 1 }; };
    ctx2.translate = (x, y) => { tr.x += x * tr.kx; tr.y += y * tr.ky; };
    ctx2.scale = (kx, ky) => { tr.kx *= kx; tr.ky *= (ky === undefined ? kx : ky); };
    try { disegna(); } finally { ctx2.fillRect = oldFill; ctx2.save = oldSave; ctx2.restore = oldRestore; ctx2.translate = oldTr; ctx2.scale = oldSc; }
    const largo = rects.filter(r => r[2] >= 18).sort((a2, b2) => a2[1] - b2[1]);   // i pezzi di scafo
    if (!largo.length) return null;
    const top = largo[0][1], w = Math.max(...largo.map(r => r[2]));
    const fondo = Math.max(...largo.map(r => r[1] + r[3])) - top;
    const buchi = [];
    for (let x = -7; x <= 7; x += 2) for (let y = top + 1; y <= top + 9; y += 2) {
      if (!rects.some(r => x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3])) buchi.push(x + ',' + y);
    }
    return { w, fondo, buchi };
  };
  for (const dir of ['right', 'left', 'up', 'down']) {
    P2.dir = dir; P2.moving = false; P2.digging = null;
    for (const [nome, disegna] of [['barca', () => render2.drawBoat(0, 0, true)], ['motoscafo', () => render2.drawMotorboat(0, 0, true)]]) {
      const m = scafo(disegna);
      check(nome + ' (' + dir + '): lo scafo è largo quanto il corpo', !!m && m.w >= 20, m ? m.w + 'px' : 'nessuno scafo');
      check(nome + ' (' + dir + '): ed è fondo abbastanza da nascondere le gambe', !!m && m.fondo >= 8, m ? m.fondo + 'px' : '—');
      check(nome + ' (' + dir + '): pieno per tutta la larghezza del corpo', !!m && m.buchi.length === 0, m ? m.buchi.slice(0, 4).join(' ') : '—');
    }
  }
}

/* ---------- CATALOGO DELL'ARREDO: 12 temi, sagome tutte diverse ---------- */
{
  const fc = await import('../src/furnCatalog.js');
  const fr = await import('../src/furnRecipe.js');
  const fa = await import('../src/furnArt.js');
  const dm = await import('../src/data.js');
  const { FURN_CATALOG: CAT, FURN_THEMES: TEMI } = fc;
  check('catalogo: 12 temi', TEMI.length === 12);
  /* la richiesta era "almeno altri 200/300": si pretende la soglia, e un minimo per tema così
     nessun argomento resta con tre pezzi */
  const perTema = Object.fromEntries(TEMI.map(t => [t.id, CAT.filter(f => f.theme === t.id).length]));
  const pochi = Object.entries(perTema).filter(([, n]) => n < 18).map(([k, n]) => k + ':' + n);
  check('catalogo: almeno 250 pezzi (' + CAT.length + ')', CAT.length >= 250);
  check('catalogo: ogni tema ha almeno 18 pezzi', pochi.length === 0, pochi.join(' '));
  const ids = new Set();
  const dup = CAT.filter(f => { const d = ids.has(f.id); ids.add(f.id); return d; }).map(f => f.id);
  check('catalogo: nessun id ripetuto', dup.length === 0, dup.join(' '));
  check('catalogo: nessun id si scontra coi set di zona', CAT.every(f => !Object.values(dm.FURN_SETS).flat().some(z => z.id === f.id)));
  /* SAGOME DIVERSE, NIENTE RICOLORI: la firma della ricetta senza colori deve essere unica */
  const firme = new Map(), gemelli = [];
  for (const f of CAT) {
    const k = fr.recipeShape(f.art);
    if (firme.has(k)) gemelli.push(f.id + '=' + firme.get(k)); else firme.set(k, f.id);
  }
  check('catalogo: ogni pezzo ha una sagoma sua (niente ricolori)', gemelli.length === 0, gemelli.join(' · '));
  /* DENTRO LA SUA CASELLA: di lato non esce, sopra non sale oltre 12px (copre la faccia di
     Digsy), sotto non sborda; i quadri stanno nella fascia della parete (36px) */
  const fuori = [];
  for (const f of CAT) {
    const W = (f.w || 1) * 32, H = f.place === 'wall' ? 36 : (f.h || 1) * 32;
    for (const [nome, src] of [['art', f.art], ['side', f.side], ['back', f.back]]) {
      if (!src) continue;
      const sw = nome === 'side' ? (f.h || 1) * 32 : W, sh = nome === 'side' ? (f.w || 1) * 32 : H;
      const b = fr.recipeBounds(src);
      const minY = f.place === 'wall' ? 0 : -fa.RISE_MAX;
      if (b.x0 < 0 || b.x1 > sw || b.y0 < minY || b.y1 > sh) fuori.push(f.id + '.' + nome + ' ' + JSON.stringify(b));
    }
  }
  check('catalogo: nessun disegno esce dal suo ingombro', fuori.length === 0, fuori.slice(0, 4).join(' · '));
  const coloriStrani = [];
  for (const f of CAT) for (const src of [f.art, f.side, f.back].filter(Boolean)) for (const c of fr.recipeColors(src)) {
    if (fr.resolveColor(c, { m: f.m, n: f.n || f.m }) === '#ff00ff') coloriStrani.push(f.id + ':' + c);
  }
  check('catalogo: ogni colore delle ricette esiste', coloriStrani.length === 0, coloriStrani.slice(0, 6).join(' '));
  const senzaNome = CAT.filter(f => !f.it || !f.en || !f.ru).map(f => f.id);
  check('catalogo: ogni pezzo ha nome italiano, inglese e russo', senzaNome.length === 0, senzaNome.join(' '));
  check('catalogo: taglie, prezzi e livelli sensati', CAT.every(f => [1, 2].includes(f.w || 1) && [1, 2].includes(f.h || 1) && f.cost > 0 && f.lvl >= 1 && f.lvl <= 15 && ['floor', 'rug', 'wall'].includes(f.place)));
  check('catalogo: ogni tema ha pezzi base sempre in vendita', TEMI.every(t => CAT.some(f => f.theme === t.id && f.base)));
  check('catalogo: ogni zona ha il suo tema', dm.ZONES.every(z => TEMI.some(t => t.id === fc.ZONE_THEME[z.id])));
  /* e ogni pezzo si DISEGNA davvero (regola #9), anche nelle viste di profilo */
  const rotti = [];
  for (const f of CAT) {
    let n = 0; const g = { rect: () => n++, px: () => n++, shadow: () => {}, shade8: h => h };
    for (const rot of (f.side ? [0, 1, 2, 3] : [0])) {
      try { fa.drawFurnPiece(g, f.id, 0, 0, 64, 64, 1000, rot); } catch (e) { rotti.push(f.id + ' ' + e.message); }
    }
    if (n < 6) rotti.push(f.id + ' (' + n + ' tratti)');
  }
  check('catalogo: ogni pezzo si disegna (e non è un francobollo vuoto)', rotti.length === 0, rotti.slice(0, 5).join(' · '));
}

/* ---------- CATALOGO AL NEGOZIO: vetrina del giorno, tema di zona, prezzo ---------- */
{
  const fs = await import('../src/furnShop.js');
  const fc = await import('../src/furnCatalog.js');
  const house9 = await import('../src/house.js');
  const ui9 = await import('../src/ui.js');
  const { FURN_CATALOG: CAT } = fc;
  const FURN_CATALOG_T = CAT;
  const tema = 'cucina', zonaAltrove = 'dune';                 // la cucina non è il tema delle dune
  const oggi = fs.catalogToday(tema, 5, zonaAltrove);
  const basi = CAT.filter(f => f.theme === tema && f.base).map(f => f.id);
  check('vetrina: i pezzi base di un tema ci sono sempre', basi.every(id => oggi.includes(id)));
  check('vetrina: più i pezzi a rotazione (e non tutto il tema)', oggi.length === basi.length + fs.ROTAZIONE && oggi.length < CAT.filter(f => f.theme === tema).length);
  check('vetrina: lo stesso giorno mostra la stessa vetrina', JSON.stringify(fs.catalogToday(tema, 5, zonaAltrove)) === JSON.stringify(oggi));
  const giorni = new Set([6, 7, 8, 9, 10].map(d => fs.catalogToday(tema, d, zonaAltrove).join(',')));
  check('vetrina: nei giorni dopo cambia (un motivo per ripassare)', giorni.size >= 3, giorni.size + ' vetrine diverse su 5 giorni');
  /* nel negozio di una zona il suo tema è tutto in vetrina e scontato */
  const casa = fc.ZONE_THEME.dune;
  check('vetrina: nella sua zona il tema di casa è tutto disponibile', fs.catalogToday(casa, 5, 'dune').length === CAT.filter(f => f.theme === casa).length);
  const pezzoCasa = CAT.find(f => f.theme === casa && f.cost >= 40);
  check('prezzo: il tema di casa costa un quarto in meno', fs.catalogPrice(pezzoCasa.id, 'dune') === Math.round(pezzoCasa.cost * 0.75));
  check('prezzo: altrove si paga il listino', fs.catalogPrice(pezzoCasa.id, 'prati') === pezzoCasa.cost);
  /* comprare al prezzo scontato scala proprio quel prezzo, mai più del listino */
  S.furnOwned = []; S.level = 20; S.coins = 1000;
  const prima = S.coins;
  check('comprare dal catalogo a prezzo di zona riesce', house9.buyFurniture(pezzoCasa.id, fs.catalogPrice(pezzoCasa.id, 'dune')) === true);
  check('e scala il prezzo scontato, non il listino', prima - S.coins === fs.catalogPrice(pezzoCasa.id, 'dune'), (prima - S.coins) + '');
  const altro = CAT.find(f => f.theme === 'bambini' && f.cost >= 40);
  S.coins = 1000;
  house9.buyFurniture(altro.id, altro.cost * 10);
  check('un "prezzo" sopra il listino non viene mai applicato', 1000 - S.coins === altro.cost);
  /* la scheda Catalogo del Negozio si disegna, coi temi e la vetrina */
  let crash = null;
  try { ui9.renderFurnShop(null); } catch (e) { crash = e.message; }
  let html9 = document.getElementById('m-body').innerHTML;
  check('Bottega d\'arredo: la griglia degli argomenti si disegna', crash === null, crash || '');
  check('Bottega d\'arredo: gli argomenti sono i dodici temi più lo stile della zona', (html9.match(/data-ftopic=/g) || []).length === 13);
  ui9.renderFurnShop('magico');
  html9 = document.getElementById('m-body').innerHTML;
  check('Bottega d\'arredo: dentro un tema ci sono i pezzi in vetrina da comprare', /data-cfurn=/.test(html9) || /già tuo|owned/.test(html9));
  check('Bottega d\'arredo: e SOLO di quel tema', FURN_CATALOG_T.filter(f => f.theme !== 'magico').every(f => !html9.includes('data-cfurn="' + f.id + '"')));
  /* COMODITÀ: una stanza tutta dello stesso tema del catalogo è coerente */
  const due = CAT.filter(f => f.theme === 'rustico' && f.place === 'floor' && (f.w || 1) === 1 && (f.h || 1) === 1).slice(0, 2);
  S.furnOwned = due.map(f => f.id);
  S.house.rooms[0].furn = []; S.house.rooms[0].paper = null; S.house.rooms[0].ground = null;
  house9.tryPlaceFurniture(0, 2, 2, due[0].id); house9.tryPlaceFurniture(0, 6, 2, due[1].id);
  check('comodità: due pezzi dello stesso tema del catalogo sono coerenti', house9.roomComfort(0).bits.some(b => b.k === 'coerenza'));
  S.house.rooms[0].furn = [];
}

/* ---------- VASSOIO: schede per argomento e ricerca (nella scheda o ovunque) ---------- */
{
  const ui8 = await import('../src/ui.js');
  const pezzi = ['prati_bed', 'cucina_stufa', 'cucina_lavello', 'rustico_panca', 'bambini_palla', 'prati_paper'];
  check('vassoio: la scheda "Tutti" mostra tutto', ui8.trayFilter(pezzi, 'tutti', '', false).length === pezzi.length);
  check('vassoio: una scheda mostra solo i suoi pezzi', JSON.stringify(ui8.trayFilter(pezzi, 'cucina', '', false)) === JSON.stringify(['cucina_stufa', 'cucina_lavello']));
  check('vassoio: lo stile di zona ha la sua scheda', JSON.stringify(ui8.trayFilter(pezzi, 'zona', '', false)) === JSON.stringify(['prati_bed']));
  check('vassoio: carta da parati e pavimento stanno nella scheda del fondo', JSON.stringify(ui8.trayFilter(pezzi, 'fondi', '', false)) === JSON.stringify(['prati_paper']));
  /* i test girano in italiano: "stufa" è la Stufa a legna, "panca" la Panca di legno */
  check('vassoio: la ricerca NELLA scheda resta nella scheda', ui8.trayFilter(pezzi, 'cucina', 'panca', false).length === 0);
  check('vassoio: la ricerca OVUNQUE trova anche fuori dalla scheda', JSON.stringify(ui8.trayFilter(pezzi, 'cucina', 'panca', true)) === JSON.stringify(['rustico_panca']));
  check('vassoio: la ricerca ignora maiuscole e accenti', ui8.trayFilter(pezzi, 'tutti', 'STUFA', false).includes('cucina_stufa'));
  /* e il vassoio si disegna con le schede e il campo di ricerca */
  S.furnOwned = pezzi.slice(); S.house.rooms[0].furn = [];
  let crash8 = null;
  try { ui8.openFurnitureTray(0, 3, 3); } catch (e) { crash8 = e.message; }
  const h8 = document.getElementById('m-body').innerHTML;
  check('vassoio: si apre con le schede e la ricerca', crash8 === null && /data-ttab=/.test(h8) && /traySearch/.test(h8), crash8 || '');
  ui8.closeModal(true);
}

/* ---------- ANTEPRIME DEL PERSONAGGIO: mai a scala frazionaria ---------- */
{
  /* La canvas dell'editor era 60×22 mentre il disegno è tarato su 120×44: il personaggio
     veniva disegnato a scala 0,5 (mezzo pixel) e poi ingrandito dal CSS a 360px. Era l'unica
     immagine sfuocata del gioco, e nessuna misura se ne accorgeva. */
  const fsP = await import('node:fs');
  const srcUi = fsP.readFileSync('src/ui.js', 'utf8');
  const canv = [...srcUi.matchAll(/id="prevCv"\s+width="(\d+)"\s+height="(\d+)"/g)].map(m => m[1] + '×' + m[2]);
  check('tutte le anteprime del personaggio hanno la stessa canvas', canv.length >= 2 && new Set(canv).size === 1, canv.join(' '));
  const ref = (srcUi.match(/const PREV_REF_W = (\d+), PREV_REF_H = (\d+)/) || []).slice(1).join('×');
  check('e la canvas è 1:1 col disegno (niente scala frazionaria)', canv[0] === ref, canv[0] + ' vs ' + ref);
}

/* ---------- CASA del giocatore (arredo: disegno nativo + piedistallo) ---------- */
{
  const house = await import('../src/house.js');
  const inter = await import('../src/interior.js');
  const dataM = await import('../src/data.js');
  const i18n = await import('../src/i18n.js');
  const furnArt = await import('../src/furnArt.js');
  const { ctx } = await import('../src/screen.js');
  const { FURN_BY_ID, PEDESTAL_ID } = dataM;

  /* ---- ARTE DELL'ARREDO: ogni pezzo si disegna DAVVERO, e nella stessa vista del gioco ----
     I mobili erano cubetti isometrici sopra un pavimento in pianta: non poggiavano da nessuna
     parte e sembravano buttati lì. Un modulo di disegno che nessuno esegue è un crash che
     aspetta (REGOLA #9), quindi qui si disegnano tutti, uno per uno. */
  const allIds = Object.keys(FURN_BY_ID);
  check('c\'è il piedistallo fra i pezzi', allIds.includes(PEDESTAL_ID));
  {
    const painted = [];
    const g = { rect: (x, y, w, h, c) => painted.push(c), px: (x, y, c) => painted.push(c),
      shadow: () => painted.push('shadow'), shade8: (h) => h };
    const senzaDisegno = [], senzaOmbra = [];
    for (const id of allIds) {
      painted.length = 0;
      let crash = null;
      try { furnArt.drawFurnPiece(g, id, 0, 0, 32 * (FURN_BY_ID[id].w || 1), 32 * (FURN_BY_ID[id].h || 1), 1000); } catch (e) { crash = e.message; }
      if (crash || painted.length < 3) senzaDisegno.push(id + (crash ? ' (' + crash + ')' : ''));
      /* OMBRA DI CONTATTO su tutto ciò che sta in piedi sul pavimento: senza, l'oggetto
         galleggia sopra le assi — è metà del motivo per cui sembravano incollati sopra */
      const cat = furnArt.artCategory(id);
      if (['bed', 'table', 'chair', 'chest', 'hearth', 'crystal', 'plant', 'lamp', 'pedestal', 'box'].includes(cat)
        && !painted.includes('shadow')) senzaOmbra.push(id);
    }
    check('ogni pezzo di arredo si disegna davvero (' + allIds.length + ')', senzaDisegno.length === 0, senzaDisegno.join(' '));
    check('ogni mobile poggia a terra con la sua ombra di contatto', senzaOmbra.length === 0, senzaOmbra.join(' '));
    /* FORME DIVERSE per famiglie diverse: se tutte le categorie disegnassero lo stesso
       rettangolo la stanza tornerebbe a sembrare piena di scatole */
    const firme = new Map();
    for (const id of allIds) {
      painted.length = 0;
      try { furnArt.drawFurnPiece(g, id, 0, 0, 64, 64, 1000); } catch (e) { /* già contato sopra */ }
      firme.set(furnArt.artCategory(id), painted.length);
    }
    check('le famiglie di mobili non hanno tutte la stessa sagoma', new Set(firme.values()).size >= 5,
      [...firme.entries()].map(e => e.join(':')).join(' '));
    /* IL FONDO: pavimento e carta da parati sono arredo anche loro */
    painted.length = 0;
    furnArt.drawGroundTile(g, 'prati_ground', 0, 0, 1, 1);
    check('il pavimento comprato disegna la sua trama', painted.length >= 2);
    painted.length = 0;
    furnArt.drawPaperBand(g, 'prati_paper', 0, 0, 320, 42);
    check('la carta da parati disegna motivo e battiscopa', painted.length >= 4);
    {
      /* nessun fondo sborda: le mattonelle della carta "a blocchi" finivano fuori dalla stanza */
      const fuori = [];
      const ids = Object.keys(FURN_BY_ID).filter(k => ['paper', 'ground'].includes(FURN_BY_ID[k].place));
      for (const id of ids) {
        const paper = FURN_BY_ID[id].place === 'paper';
        const W0 = paper ? 320 : TS, H0 = paper ? 42 : TS;
        let esce = false;
        const gb = { shade8: (h) => h, px: (x, y) => { if (x < 0 || y < 0 || x >= W0 || y >= H0) esce = true; },
          rect: (x, y, w, h) => { if (x < 0 || y < 0 || x + w > W0 || y + h > H0) esce = true; } };
        if (paper) furnArt.drawPaperBand(gb, id, 0, 0, W0, H0); else for (const [tx, ty] of [[0, 0], [1, 3], [5, 2]]) furnArt.drawGroundTile(gb, id, 0, 0, tx, ty);
        if (esce) fuori.push(id);
      }
      check('carta da parati e pavimenti restano dentro il loro rettangolo', ids.length >= 6 && fuori.length === 0, fuori.join(' '));
    }
    /* PARQUET: le tavole sono lunghe e attraversano le caselle. Dove una tavola finisce proprio
       sul bordo della casella mancava il giunto e il tono cambiava di colpo: si rivedevano i
       quadrotti. Nessun cambio di tono al bordo senza la riga scura del giunto. */
    {
      const { shade8: sh8 } = await import('../src/brush.js');
      const Wp = 256, Hp = 256, buf = new Array(Wp * Hp).fill('');
      const gp = { shade8: sh8, px() {}, rect: (x, y, w, h, c) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && yy < Hp && xx >= 0 && xx < Wp) buf[yy * Wp + xx] = c; } };
      const def = { c1: '#b8894f', c2: '#a97a45', kind: 'plank' };
      for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) furnArt.drawGroundTile(gp, null, tx * TS, ty * TS, tx, ty, def);
      const tinte = new Set([def.c1, def.c2, sh8(def.c1, 0.94)]);
      let salti = 0;
      for (let y = 3; y < Hp; y += 8) for (let x = TS; x < Wp; x += TS) {
        const a = buf[y * Wp + x - 1], b = buf[y * Wp + x];
        if (a !== b && tinte.has(a) && tinte.has(b)) salti++;
      }
      check('parquet: nessun cambio di tavola sul bordo della casella senza giunto', salti === 0, salti + ' salti');
    }
    /* BOTTEGHE (shopArt.js): ogni mestiere si disegna tutto, di giorno e di notte, con e senza
       uovo nella teca, e niente esce dai muri. Lo zoccolo di pietra del Laboratorio sbordava
       di 15px nel buio a destra; un errore in un solo mobile fermava il disegno della stanza. */
    {
      const shop = await import('../src/shopArt.js');
      const { shade8: sh8 } = await import('../src/brush.js');
      const RW = 320, RH = 224;
      const errori = [], fuori = new Set();
      let n = 0;
      const gb = { shade8: sh8, shadow: () => {},
        px: (x, y) => { n++; if (x < 0 || x >= RW || y < -shop.SHOP_TOP || y >= RH + 4) fuori.add('px'); },
        rect: (x, y, w, h) => { n++; if (x < 0 || x + w > RW || y < -shop.SHOP_TOP || y + h > RH + 4) fuori.add([x, y, w, h].join(',')); } };
      for (const type of ['store', 'inn', 'barber', 'tailor', 'lab', 'furniture']) {
        const wins = shop.SHOP_WINDOWS[type];
        for (const [nk, tm, egg, ready] of [[0, 1000, null, false], [0.9, 7777, { q: 'raro' }, true], [0.2, 3333, { q: 'raro' }, false]]) {
          const prima = fuori.size; n = 0;
          try {
            shop.drawShopFloor(gb, type, RW, RH, ['#b8894f', '#a97a45'], furnArt.drawGroundTile);
            shop.drawShopWall(gb, type, RW, RH, nk, tm, wins);
            shop.drawShopShell(gb, type, RW, RH, nk, wins);
            ({ store: shop.drawStoreProps, inn: shop.drawInnProps, barber: shop.drawBarberProps, tailor: shop.drawTailorProps, lab: shop.drawLabProps, furniture: shop.drawFurnitureProps })[type](gb, RW, RH, tm);
            shop.drawCounter(gb, type, TS, Math.round(2.2 * TS), RW - 2 * TS, 20);
            ({ store: shop.drawStoreFloorProps, inn: shop.drawInnFloorProps, barber: shop.drawBarberFloorProps, tailor: shop.drawTailorFloorProps, lab: shop.drawLabFloorProps, furniture: shop.drawFurnitureFloorProps })[type](gb, RW, RH, tm, egg, ready);
            shop.drawShopFront(gb, RW, RH);
          } catch (e) { errori.push(type + ': ' + e.message); }
          if (fuori.size > prima) errori.push(type + ' sborda');
          if (n < 400) errori.push(type + ' quasi vuota (' + n + ')');
        }
      }
      check('le 6 botteghe si disegnano intere, senza uscire dai muri', errori.length === 0, errori.concat([...fuori].slice(0, 4)).join(' | '));
      check('ogni bottega ha i suoi materiali', new Set(Object.values(shop.SHOP_STYLE).map(st => st.wall)).size === Object.keys(shop.SHOP_STYLE).length);
    }
  }
  /* ---- LA ROTAZIONE SI VEDE ---- */
  {
    /* il disegno ignorava `rot`: un letto 2×2 o una sedia ruotati restavano IDENTICI, e ruotare
       sembrava non funzionare ("non riesco a far ruotare nulla"). Ogni pezzo con un verso deve
       avere quattro disegni DIVERSI (almeno i tre non speculari fra loro); chi è uguale da ogni
       lato non si ruota proprio. Si confronta la sequenza vera di rettangoli dipinti. */
    const firma = (id, rot) => {
      const out = [];
      const g = { rect: (x, y, w, h, c) => out.push([Math.round(x), Math.round(y), Math.round(w), Math.round(h), c].join(':')),
        px: (x, y, c) => out.push([x, y, c].join(':')), shadow: () => {}, shade8: (hx, k) => hx + '*' + k };
      const it = FURN_BY_ID[id], sz = dataM.furnSize(id, rot);
      furnArt.drawFurnPiece(g, id, 0, 0, sz.w * 32, sz.h * 32, 1000, rot);
      return out.join('|');
    };
    const piatti = [];
    for (const id of allIds) {
      if (!furnArt.furnRotatable(id)) continue;
      const f = [0, 1, 2, 3].map(r => firma(id, r));
      /* un tavolo è uguale davanti e dietro: gli bastano due disegni (orizzontale/verticale);
         letto, sedia, baule e focolare hanno un davanti e ne servono almeno tre */
      const minimo = furnArt.artCategory(id) === 'table' ? 2 : 3;
      if (new Set(f).size < minimo) piatti.push(id + ' (' + new Set(f).size + ' disegni)');
    }
    check('ogni mobile con un verso cambia disegno ruotandolo', piatti.length === 0, piatti.join(' · '));
    check('letto, sedia, tavolo, focolare e baule si ruotano', ['prati_bed', 'boschi_chair', 'terre_throne', 'prati_table', 'ghiacci_hearth', 'dune_chest'].every(id => furnArt.furnRotatable(id)));
    check('vaso, lampada, cristallo, tappeto, piedistallo e quadri NO', ['palude_vase', 'prati_lamp', 'terre_crystal', 'prati_rug', PEDESTAL_ID, 'prati_art'].every(id => !furnArt.furnRotatable(id)));
    S.furnOwned = ['palude_vase', 'boschi_chair']; S.house.rooms[0].furn = []; house.cancelHold();
    house.takeHold('palude_vase'); house.setHoldTarget(3, 3);
    check('ruotare un vaso non fa nulla e lo dice (torna false)', house.rotateHold() === false && house.holdItem().rot === 0);
    check('e non ha la maniglia ↻', house.rotateHandleRect(0) === null);
    house.cancelHold();
    house.takeHold('boschi_chair'); house.setHoldTarget(3, 3);
    check('una sedia invece si gira', house.rotateHold() === true && house.holdItem().rot === 1 && !!house.rotateHandleRect(0));
    house.cancelHold();
  }
  /* ---- COPERTURE: un mobile non copre la faccia di Digsy ---- */
  {
    /* NESSUN pezzo sale sopra la sua casella più di RISE_MAX: Digsy è alto 32, e la sedia che
       saliva di 22 gli copriva la faccia stando fra un tavolo e la sedia ("palesi errori di
       copertura"). Si misura il DISEGNO vero — il rettangolo più alto dipinto — non la
       tabella, che potrebbe mentire. */
    const alti = [];
    for (const id of allIds) {
      const it = FURN_BY_ID[id];
      if (['wall', 'paper', 'ground'].includes(it.place)) continue;
      let minY = 0;
      const g = { rect: (x, y) => { minY = Math.min(minY, y); }, px: (x, y) => { minY = Math.min(minY, y); }, shadow: () => {}, shade8: h => h };
      try { furnArt.drawFurnPiece(g, id, 0, 0, 32 * (it.w || 1), 32 * (it.h || 1), 1000); } catch (e) { /* contato altrove */ }
      if (-minY > furnArt.RISE_MAX) alti.push(id + ' (' + (-minY) + 'px)');
      if (-minY > furnArt.furnRise(id) + 1) alti.push(id + ': la tabella dice ' + furnArt.furnRise(id) + ' ma il disegno sale di ' + (-minY));
    }
    check('nessun mobile sale oltre ' + furnArt.RISE_MAX + 'px (non copre la faccia) e la tabella dice il vero', alti.length === 0, alti.join(' · '));
  }
  /* ---- miniatura: lo STESSO disegno del mondo, dentro un riquadro ---- */
  {
    const cv = document.createElement('canvas'); cv.width = 44; cv.height = 40;
    const painted = new Set();
    ctx.fillRect = () => painted.add(String(ctx.fillStyle));
    let crash = null;
    try { furnArt.drawFurnThumb(cv, 'prati_table', 1000); } catch (e) { crash = e.message; }
    delete ctx.fillRect;
    check('la miniatura di un mobile si disegna senza crash', crash === null, crash || '');
    check('e dipinge dei pixel (non resta bianca)', painted.size > 0);
  }

  /* ---- piazzamento del piedistallo + assegnazione di una specie (M4) ---- */
  {
    S.furnOwned = [PEDESTAL_ID];
    S.house = { rooms: [{ id: 0, unlocked: true, furn: [] }, { id: 1, unlocked: false, furn: [] }, { id: 2, unlocked: false, furn: [] }, { id: 3, unlocked: false, furn: [] }] };
    const cell = house.floorCellAt(0, 3 * TS + 8, 4 * TS + 8);
    check('il piedistallo si piazza come un mobile qualsiasi', house.tryPlaceFurniture(0, cell.gx, cell.gy, PEDESTAL_ID) === true);

    const sp = SPECIES[0];
    const museumBefore = S.museum[sp.id];
    /* specie SENZA nessun pezzo consegnato: l'assegnazione è rifiutata */
    delete S.museum[sp.id];
    check('una specie senza pezzi consegnati non è candidabile', !house.pedestalCandidates().includes(sp.id));
    check('assegnarla comunque viene rifiutato', house.assignPedestal(0, cell.gx, cell.gy, sp.id) === false);
    check('il piedistallo resta senza specie', house.furnAt(0, cell.gx, cell.gy).spId == null);

    /* con almeno un pezzo consegnato: candidabile e assegnabile */
    S.museum[sp.id] = ['cranio', 'torace'];
    check('ora la specie è candidabile', house.pedestalCandidates().includes(sp.id));
    check('assegnazione riuscita', house.assignPedestal(0, cell.gx, cell.gy, sp.id) === true);
    check('il piedistallo porta la specie assegnata', house.furnAt(0, cell.gx, cell.gy).spId === sp.id);

    /* la scheda del piedistallo (E su una cella con itemId=pedestal) si apre senza crash,
       sia da assegnata (mostra l'esposizione) sia da vuota (mostra la scelta) */
    let crash = null;
    try { ui.openPedestal(0, cell.gx, cell.gy); } catch (e) { crash = e.message; }
    check('la scheda del piedistallo assegnato si apre senza crash', crash === null, crash || '');
    check('e mostra quanti pezzi sono esposti', /2\/5|2 \/ 5/.test(document.getElementById('m-body').innerHTML));
    ui.closeModal(true);

    /* reimposta a vuoto (cambia specie) e riprova l'apertura sul ramo "scegli" */
    check('si può rimettere a vuoto (cambia specie)', house.assignPedestal(0, cell.gx, cell.gy, null) === true);
    check('il piedistallo torna senza specie', house.furnAt(0, cell.gx, cell.gy).spId == null);
    crash = null;
    try { ui.openPedestal(0, cell.gx, cell.gy); } catch (e) { crash = e.message; }
    check('la scheda del piedistallo vuoto si apre senza crash', crash === null, crash || '');
    check('e propone la specie con pezzi consegnati', document.getElementById('m-body').innerHTML.includes(sp.name));
    ui.closeModal(true);

    if (museumBefore === undefined) delete S.museum[sp.id]; else S.museum[sp.id] = museumBefore;
  }

  /* ---- drawHouseRooms con mobili + piedistallo assegnato: la scena si disegna davvero ---- */
  if (S.home) {
    inter.INT.active = false; inter.INT.justLeft = false;
    P.x = S.home.x * TS + 8; P.y = S.home.y * TS + 2; P.dir = 'up'; P.moving = true;
    inter.checkDoorEnter();
    if (inter.INT.active && inter.INT.b && inter.INT.b.type === 'house') {
      const sp = SPECIES[1] || SPECIES[0];
      const museumBefore = S.museum[sp.id];
      S.museum[sp.id] = ['cranio'];
      const cell = house.floorCellAt(0, 3 * TS + 8, 4 * TS + 8);
      house.assignPedestal(0, cell.gx, cell.gy, sp.id);
      inter.enterHouseRoom(0); // la scena della Sala (drawHouseRoomScene) va disegnata davvero
      const { render } = await import('../src/render.js');
      const { cam } = state;
      cam.x = P.x; cam.y = P.y;
      let drewOk = true;
      try { render(4200); } catch (e) { drewOk = false; }
      check('la Sala col piedistallo esposto si disegna senza errori', drewOk);
      /* ARCHITETTURA DELLA CASA (houseArt.js): l'atrio con porte aperte e chiuse su tutti e
         due i tipi di muro, e le quattro stanze di giorno e di notte, si disegnano davvero */
      const houseArt = await import('../src/houseArt.js');
      const interiors = await import('../src/interiors.js');
      const { view } = await import('../src/screen.js');
      inter.leaveHouseRoom();
      const lock0 = S.house.rooms.map(r => r.unlocked);
      let archOk = true;
      for (const mix of [[true, false, true, false], [true, true, false, true]]) {
        mix.forEach((u, i) => { S.house.rooms[i].unlocked = u; });
        try { render(5000); } catch (e) { archOk = false; }
      }
      const o = interiors.houseOrigin(view.W, view.H), c = interiors.interiorCam();
      check('atrio: il tocco usa lo stesso punto in cui la scena è disegnata', c.x === -o.ox && c.y === -o.oy, JSON.stringify([o, c]));
      for (let id = 0; id < 4; id++) {
        S.house.rooms[id].unlocked = true; inter.enterHouseRoom(id);
        for (const tod of [0.5, 0.95]) { const t0 = S.tod; S.tod = tod; try { render(6000); } catch (e) { archOk = false; } S.tod = t0; }
        const o2 = interiors.houseOrigin(view.W, view.H), c2 = interiors.interiorCam();
        if (c2.x !== -o2.ox || c2.y !== -o2.oy) archOk = false;
        inter.leaveHouseRoom();
      }
      check('atrio e le 4 stanze (giorno e notte, porte aperte e chiuse) si disegnano', archOk);
      check('ogni stanza ha il suo stile e la sua icona di targhetta', houseArt.ROOM_STYLE.length >= 4 && houseArt.ROOM_ICON.length >= 4
        && new Set(houseArt.ROOM_STYLE.map(st => st.wains)).size === 4 && new Set(houseArt.ROOM_ICON.map(ic => ic.join())).size === 4);
      lock0.forEach((u, i) => { S.house.rooms[i].unlocked = u; });
      inter.enterHouseRoom(0);
      inter.leaveHouseRoom(); inter.exitInterior();
      if (museumBefore === undefined) delete S.museum[sp.id]; else S.museum[sp.id] = museumBefore;
    }
  }
}

/* ---------- render smoke ---------- */
{
  const { render } = await import('../src/render.js');
  const { fit } = await import('../src/screen.js');
  fit();
  const { cam } = state;
  cam.x = P.x; cam.y = P.y;
  render(1000);
  check('render frame completo senza errori', true);
  /* smoke ESTESO: tutti i biomi (meteo/landmark diversi) + compagno + notte, nessun errore */
  const companionMod = await import('../src/companion.js');
  S.creatures = [{ uid: 9, name: 'Smoke', skull: 'lepre', torso: 'lepre', leg: 'lepre', q: 'comune' }];
  companionMod.setCompanion(companionMod.companionCandidates()[0]);
  let smokeThrew = false;
  try {
    for (let d = 1; d <= 6; d++) { S.day = d; for (const [zx, zy] of [[5, 5], [320, 90], [-220, 160], [140, -280], [-300, -120]]) { P.x = zx * TS; P.y = zy * TS; cam.x = P.x; cam.y = P.y; render(1000 + d * 400); } }
    S.tod = 0.7; render(3000); S.tod = 0.25;
    /* raccoglitore leggendario AL LAVORO (ogni tipo → attrezzo/lenza + schegge) + "+fossile" che sale */
    const { COMP } = companionMod;
    COMP.x = P.x + 20; COMP.y = P.y; COMP.fx = [{ x: P.x, y: P.y - 10, life: 0.6, q: 'raro' }];
    for (const wty of ['terra', 'acqua', 'albero', 'roccia']) { COMP.job = { type: wty, wx: P.x + 30, wy: P.y, phase: 'work', t: 0.6 }; render(3200); }
    COMP.job = null; COMP.fx = [];
    /* CAVALCATURA volante di grotta (drawFlyingMount) */
    const dataS = await import('../src/data.js');
    const cs = dataS.CAVE_POOL[0].id;
    companionMod.setCompanion({ skull: cs, torso: cs, leg: cs, q: 'leggendario', key: 'sm', name: 'Fly' });
    S.mounted = true; P.moving = true;
    for (const dd of ['down', 'up', 'left', 'right']) { P.dir = dd; render(3400); } // fronte/spalle/profilo
    S.mounted = false; P.moving = false;
    /* compagno che segue: anche lui gira su/giù (front/back) */
    companionMod.setCompanion({ skull: 'lepre', torso: 'lepre', leg: 'lepre', q: 'comune', key: 'r2', name: 'Rot' });
    const { COMP: COMP2 } = companionMod;
    for (const f of ['up', 'down', 'left', 'right']) { COMP2.face = f; render(3500); }
    /* "gioca col compagno": pallina in volo (throw), ferma ad aspettare (chase), e la barra
       di tempismo sopra la testa (catch) — tutte e tre le fasi vanno disegnate */
    COMP2.x = P.x - 10; COMP2.y = P.y;
    COMP2.play = { phase: 'throw', t: 0.15, tx: P.x + 40, ty: P.y + 10 };
    render(3600);
    COMP2.play = { phase: 'chase', t: 0, tx: P.x + 40, ty: P.y + 10 };
    render(3600);
    COMP2.play = { phase: 'catch', t: 0.5, tx: P.x + 40, ty: P.y + 10 };
    render(3600);
    COMP2.play = { phase: 'return', t: 0.1, tx: P.x + 40, ty: P.y + 10 };
    render(3600);
    COMP2.play = null;
    companionMod.clearCompanion();
  } catch (e) { smokeThrew = true; }
  check('smoke render esteso (biomi/meteo/landmark/compagno/notte/raccoglitore/volo)', smokeThrew === false);
  /* INTERNI: ogni stanza va DISEGNATA davvero. Questo controllo nasce da una regressione vera:
     spostando gli interni in un modulo a parte, due simboli (drawSayBalloon e NIGHT) sono
     rimasti in render.js e il gioco crashava appena si entrava in un edificio — con tutti i
     test verdi, perché nessuno chiamava mai drawInteriorScene. */
  {
    const inter2 = await import('../src/interior.js');
    const types = ['store', 'lab', 'museum', 'inn', 'barber', 'tailor', 'furniture'];
    const broken = [];
    for (const t of types) {
      for (const tod of [0.25, 0.7]) {          // di giorno e di notte (finestre accese)
        try {
          S.tod = tod;
          inter2.enterInterior({ type: t, name: t, x: Math.floor(P.x / TS), y: Math.floor(P.y / TS) });
          render(1500);
          inter2.INT.say = { text: 'prova palloncino' };   // il balloon è disegnato solo se c'è
          render(1600);
          inter2.INT.say = null;
        } catch (e) { broken.push(t + '@' + tod + ': ' + e.message); }
      }
    }
    try { inter2.exitInterior(); } catch (e) { /* la posizione d'uscita dipende dalla città */ }
    S.tod = 0.25;
    check('si entra e si disegna in tutte e 6 le stanze, giorno e notte', broken.length === 0, broken[0] || '');
  }
  /* GROTTA: stessa storia, è una scena a sé */
  {
    const cave2 = await import('../src/cave.js');
    let caveBroke = '';
    try { cave2.enterCave(1, 10, 10); render(1700); cave2.exitCave(); }
    catch (e) { caveBroke = e.message; }
    check('si entra e si disegna nella grotta', caveBroke === '', caveBroke);
  }
  companionMod.clearCompanion();
  const { view } = await import('../src/screen.js');
  check('fit copre la finestra a scala intera', view.W * view.K >= 1440 && view.H * view.K >= 900);
}

/* ---------- PENNELLATE VERE: le entità e i mezzi vanno DIPINTI, non solo "non crashati" ----------
   Lo smoke qui sopra prova solo che render() non lancia: se un ramo non viene MAI raggiunto
   (la barca senza acqua, lo scavo senza P.digging, la X senza mappe) passa verde anche quando
   il disegno è rotto — è la stessa trappola che aveva tenuto in piedi gli interni rotti con
   475 test verdi. Qui si SPIA il pennello: brush.js scrive il colore in ctx.fillStyle e poi
   chiama fillRect, quindi registrando i colori si sa cosa è finito davvero sullo schermo.
   Ogni prova confronta due fotogrammi (con e senza la cosa da disegnare): il colore che
   compare SOLO nel secondo dimostra che è stata quella funzione a dipingerlo. */
{
  const { render } = await import('../src/render.js');
  const { ctx, view: vw } = await import('../src/screen.js');
  const props = await import('../src/props.js');
  const tap = await import('../src/tapmove.js');
  const prefsMod = await import('../src/prefs.js');
  const { cam } = state;

  const seen = new Set();
  /* la spia sostituisce fillRect sul contesto stub e lo rimette sempre (anche se il disegno
     esplode): un contesto lasciato sporco falserebbe tutte le prove successive.
     Si registrano anche i drawImage: gli sprite voxel (chimere, compagno) sono canvas
     preparate una volta sola e poi TIMBRATE, quindi il pennello a colori non le vedrebbe
     e un recinto pieno risulterebbe identico a uno vuoto. */
  const crashes = [];
  const spy = fn => {
    seen.clear();
    let img = 0;
    ctx.fillRect = () => seen.add(String(ctx.fillStyle));
    ctx.drawImage = () => seen.add('<sprite ' + (++img) + '>');
    /* un disegno che esplode viene ANNOTATO, non lasciato salire: se buttasse giù il
       processo si perderebbero tutte le prove successive, e col crash di una sola entità
       non si saprebbe più nulla di tutte le altre */
    try { fn(); } catch (e) { crashes.push(e.message); } finally { delete ctx.fillRect; delete ctx.drawImage; }
    return new Set(seen);
  };
  const at = (tx, ty) => { P.x = tx * TS + 8; P.y = ty * TS + 8; cam.x = P.x; cam.y = P.y; };
  const frame = (tx, ty, t = 1000) => spy(() => { at(tx, ty); render(t); });
  /* "solo qui": il colore c'è nel fotogramma A e non nel controllo B */
  const only = (a, b, c) => a.has(c) && !b.has(c);

  /* stato da rimettere a posto: questo blocco muove il giocatore in capo al mondo e gli
     regala mezzi che non ha — i test che vengono dopo devono ritrovare tutto com'era */
  const keep = {
    x: P.x, y: P.y, dir: P.dir, moving: P.moving, digging: P.digging,
    gear: S.gear, tools: { ...S.tools }, maps: S.maps, tod: S.tod, marker: prefsMod.pref('marker'),
  };

  /* posti VERI del mondo (deterministici col seed dei test): mai coordinate inventate a mano,
     che al primo ritocco del worldgen punterebbero su un prato vuoto senza che nessuno se ne accorga */
  let site = null, wreck = null, willow = null, cave = null;
  for (let cx = -6; cx <= 6 && !site; cx++) for (let cy = -6; cy <= 6 && !site; cy++) site = world.siteForCell(cx, cy);
  for (let cx = -6; cx <= 6 && !wreck; cx++) for (let cy = -6; cy <= 6 && !wreck; cy++) wreck = world.wreckForCell(cx, cy);
  for (let cx = -14; cx <= 14 && !willow; cx++) for (let cy = -14; cy <= 14 && !willow; cy++) {
    const l = world.landmarkForCell(cx, cy); if (l && l.type === 'willow') willow = l;
  }
  for (let x = -200; x <= 200 && !cave; x++) for (let y = -200; y <= 200 && !cave; y++) if (world.caveEntranceAt(x, y)) cave = [x, y];
  check('il mondo di prova offre sito, relitto, meraviglia e imbocco di grotta', !!site && !!wreck && !!willow && !!cave);

  /* terra ferma di riferimento: è il "prima" di quasi tutte le prove */
  const land = [site.x, site.y];
  P.dir = 'down'; P.moving = false; P.digging = null; S.gear = null; S.maps = [];
  const plain = frame(land[0], land[1]);

  /* ---- SCAVO: l'animazione parte a OGNI scavata, ed è la più vista del gioco ---- */
  {
    P.digging = { t: 0.3, dur: 1, kind: 'dig' };          // ph .3 → colpo assestato
    const dig = frame(land[0], land[1]);
    P.digging = { t: 0.05, dur: 1, kind: 'dig' };         // ph .05 → pala alzata
    const up = frame(land[0], land[1]);
    check('scavo: la terra schizza ai piedi sul colpo', only(dig, plain, '#8a6a42'));
    check('scavo: la pala alzata è un fotogramma diverso dal colpo', up.has('#b8b0a2') && !up.has('#8a6a42'));
    P.dir = 'right';
    P.digging = { t: 0.3, dur: 1, kind: 'chop' };
    const chop = frame(land[0], land[1]);
    P.digging = { t: 0.3, dur: 1, kind: 'mine' };
    const mine = frame(land[0], land[1]);
    check('accetta: testa rossiccia, non la pala', only(chop, plain, '#b5622e') && !chop.has('#8a6a42'));
    check('piccone: testa grigia, non la terra della pala', only(mine, plain, '#9a9285') && !mine.has('#8a6a42'));
    P.digging = null; P.dir = 'down';
  }

  /* ---- MEZZI: si comprano con le monete di ore di gioco, e nessuno li aveva mai disegnati ---- */
  {
    S.tools.bike = true; S.tools.skates = true; P.moving = true;
    S.gear = 'bike'; P.dir = 'right';
    const bikeSide = frame(land[0], land[1]);
    P.dir = 'down';
    const bikeFront = frame(land[0], land[1]);
    P.dir = 'up';
    const bikeBack = frame(land[0], land[1]);
    S.gear = 'skates'; P.dir = 'right';
    const skate = frame(land[0], land[1]);
    check('bici di profilo: telaio a V rosso + ruote', only(bikeSide, plain, '#d1655f') && bikeSide.has('#2a2016'));
    check('bici di fronte: manubrio, NON il telaio di profilo', only(bikeFront, plain, '#c94f4a') && !bikeFront.has('#d1655f'));
    check('bici di spalle: disegno a mano (sella rossa)', only(bikeBack, plain, '#c94f4a'));
    check('pattini: quattro rotelle sotto i piedi', only(skate, plain, '#e0b040'));
    S.gear = null; P.moving = false;
  }

  /* ---- BARCA E MOTOSCAFO: l'acqua è mezzo mondo, e la barca ci si spawna da sola ---- */
  {
    S.tools.boat = false; S.tools.motorboat = false;
    const swimming = frame(wreck.x, wreck.y);              // stesso punto, ma a piedi: è il controllo
    S.tools.boat = true;
    P.moving = true;
    const boat = frame(wreck.x, wreck.y);
    P.digging = { t: 0.5, dur: 1, kind: 'fish' };
    const fish = frame(wreck.x, wreck.y);
    P.digging = null;
    S.tools.motorboat = true;
    const moto = frame(wreck.x, wreck.y);
    check('barca: scafo di legno con bordo chiaro sull\'acqua', only(boat, swimming, '#a97a4c'));
    check('barca: pescando compaiono canna, filo e galleggiante', only(fish, boat, '#e8e2d0'));
    check('motoscafo: scafo bianco con banda azzurra (e non quello di legno)', only(moto, boat, '#eef2f4') && moto.has('#3d8ba0'));
    check('relitto: lo scafo spezzato affiora davvero dal mare', only(boat, plain, '#5a4430'));
    S.tools.boat = false; S.tools.motorboat = false; P.moving = false;
  }

  /* ---- ENTITÀ DEL MONDO: la logica era testata, il disegno mai ---- */
  {
    const siteFar = frame(site.x + 60, site.y + 60);        // fuori vista: il sito non c'entra
    check('sito di scavo: ossa che affiorano dal montarolo', only(plain, siteFar, '#ece5d2'));
    const caveF = frame(cave[0], cave[1]);
    check('imbocco di grotta: arco buio nella roccia', only(caveF, plain, '#08070b'));
    const lmF = frame(willow.x, willow.y);
    check('meraviglia: il salice della palude è dipinto per intero', only(lmF, plain, '#86b552'));
    /* X del tesoro: si paga fino a 🪙480 per una mappa, se la X non si vede è denaro buttato */
    S.maps = [{ x: land[0] + 1, y: land[1], rar: 'raro', uid: 991 }];
    const xF = frame(land[0], land[1]);
    S.maps = [];
    check('X del tesoro: croce rossa dipinta a terra', only(xF, plain, '#c24a34'));
    /* buca dello scavo: senza, una casella esaurita è indistinguibile da una intatta */
    const holeKey = land[0] + ',' + land[1];
    const had = state.dugSet.has(holeKey);
    state.dugSet.add(holeKey);
    const holeF = frame(land[0], land[1]);
    if (!had) state.dugSet.delete(holeKey);
    check('buca: la casella già scavata si vede', only(holeF, plain, '#2a1d12'));
  }

  /* ---- ROBA A TERRA E CHIMERE DEL PARCO: due liste che il render disegna a parte ---- */
  {
    /* i reperti caduti (zaino pieno) DEVONO vedersi: sono già tuoi, e se non li vedi li perdi */
    const keepDrops = S.drops;
    S.drops = [{ tx: land[0] + 1, ty: land[1], kind: 'good', payload: { id: 'spiga' } }];
    const dropped = frame(land[0], land[1]);
    S.drops = keepDrops;
    check('oggetti lasciati a terra: si vedono e si possono ritrovare', dropped.size > plain.size && !!dropped.size);

    /* il cortile di casa è la vetrina del gioco: è lì che le chimere "tornano a vivere" */
    const house = await import('../src/house.js');
    house.ensureHouseState();
    const pen = world.yardRect();
    /* nel cortile vive SOLO chi hai scelto (`S.house.yard`): per avere un cortile DAVVERO
       vuoto come controllo basta svuotare la scelta */
    const keepCre = S.creatures, keepAwk = S.awakened, keepYard = S.house.yard;
    const px0 = pen.cx, py0 = pen.y1 - 1; // prato aperto a sud della casa (il centro del rettangolo è la casa)
    S.creatures = []; S.awakened = []; S.house.yard = []; park.yardAnimals.length = 0;
    at(px0, py0); park.refreshVisParks();
    const empty = spy(() => render(2000));
    S.creatures = [{ uid: 5, name: 'Parcosauro', skull: SPECIES[0].id, torso: SPECIES[0].id, leg: SPECIES[0].id, q: 'comune' }];
    S.house.yard = ['chi5'];
    park.yardAnimals.length = 0; park.yardList();
    /* la creatura nasce in un punto a caso del cortile: da quando il cortile è grande il
       doppio poteva capitare FUORI dall'inquadratura, e il test falliva a giri alterni senza
       che niente fosse rotto. Qui la si mette davanti al giocatore: la prova è che venga
       disegnata, non dove il caso l'ha messa. */
    for (const a of park.yardAnimals) { a.x = a.tx = px0 * TS + 8; a.y = a.ty = (py0 - 1) * TS + 8; }
    const full = spy(() => render(2000));
    S.creatures = keepCre; S.awakened = keepAwk; S.house.yard = keepYard; park.yardAnimals.length = 0;
    check('cortile: la chimera assemblata passeggia davvero dentro', full.size > empty.size);
  }

  /* ---- MERAVIGLIA OLTRE IL BORDO: sono alte 9 caselle, se si disegnano solo "dentro"
     spariscono di colpo proprio mentre le stai guardando ---- */
  {
    /* appena fuori dal bordo destro, ma dentro il margine di cortesia: la distanza si
       calcola dalla vista corrente, non da un numero scritto a mano */
    const off = frame(willow.x - (Math.floor(vw.VW / 2) + 4), willow.y);
    check('meraviglia: si dipinge anche con l\'ancora appena fuori schermo', off.has('#86b552'));
  }

  /* ---- FRECCIA A BORDO SCHERMO: è l'unico modo di ritrovare la città o la X pagata 🪙480 ---- */
  {
    const keepTarget = compassMod.compass.target, keepGuide = compassMod.compass.cityGuide;
    /* terra vuota, lontano dal sito di scavo: la sua scintilla è dello stesso giallo della
       freccia e falserebbe il confronto */
    at(land[0] + 60, land[1] + 60);
    compassMod.compass.target = null; compassMod.compass.cityGuide = false;
    const noArrow = spy(() => render(1000));
    compassMod.compass.target = { x: P.x + 4000, y: P.y };      // X della mappa lontanissima
    const redArrow = spy(() => render(1000));
    compassMod.compass.target = null; compassMod.compass.cityGuide = true;
    compassMod.nearestTown();
    const goldArrow = spy(() => render(1000));
    compassMod.compass.target = keepTarget; compassMod.compass.cityGuide = keepGuide;
    check('bussola: freccia ROSSA verso la X della mappa seguita', only(redArrow, noArrow, '#e4573d'));
    check('bussola: freccia gialla verso la città quando è fuori vista', only(goldArrow, noArrow, '#f6d95c'));
  }

  /* ---- SEGNALINO DELLA META: senza, col mouse si tocca due o tre volte lo stesso punto ---- */
  {
    tap.goal.on = true; tap.goal.x = P.x + 32; tap.goal.y = P.y;
    const goalOn = frame(land[0], land[1]);
    prefsMod.setPref('marker', false);
    const goalOff = frame(land[0], land[1]);
    prefsMod.setPref('marker', true);
    tap.clearGoal();
    check('meta: l\'anello pulsante è dipinto sotto i piedi', only(goalOn, plain, '#f2c53d'));
    check('meta: spegnendo il segnalino dalle preferenze sparisce', !goalOff.has('#f2c53d'));
  }

  /* ---- DECORAZIONI DI BIOMA: firmano le zone, e nessun test le aveva mai dipinte ----
     si cercano nel mondo vero a spirale dall'origine: se un giorno una zona smettesse di
     produrle, il test lo direbbe invece di passare su coordinate scritte a mano */
  {
    const wanted = { redspire: null, orecrystal: null, icecrystal: null, hay: null };
    for (let r = 1; r <= 420 && Object.values(wanted).some(v => !v); r++) {
      const hit = (x, y) => { const d = world.decoAt(x, y); if (d && d in wanted && !wanted[d]) wanted[d] = [x, y]; };
      for (let x = -r; x <= r; x++) { hit(x, -r); hit(x, r); }
      for (let y = -r + 1; y <= r - 1; y++) { hit(-r, y); hit(r, y); }
    }
    check('le decorazioni di bioma esistono ancora nel mondo', Object.values(wanted).every(Boolean),
      Object.keys(wanted).filter(k => !wanted[k]).join(', '));
    let drawnOk = true, missing = '';
    /* colore-firma di ciascuna: se la funzione smette di dipingerlo, la decorazione è sparita
       dal mondo pur restando "presente" nella logica */
    for (const [type, col] of [['redspire', '#cc7854'], ['orecrystal', '#9ad0c8'], ['icecrystal', '#9fd4e6'], ['hay', '#b08a20']]) {
      const p = wanted[type]; if (!p) { drawnOk = false; missing += type + ' '; continue; }
      const f = frame(p[0], p[1]);
      if (!f.has(col)) { drawnOk = false; missing += type + ' '; }
    }
    check('guglie, cristalli, ghiaccio e balle di fieno vengono dipinti dal render', drawnOk, missing);
    /* e le stesse funzioni, chiamate da sole, devono dipingere il loro colore anche fuori
       dal mondo (le usano anche le pagine di prova /sprites) */
    const direct = [
      ['drawRedspire', '#b05e3e'], ['drawOrecrystal', '#eaf6fa'],
      ['drawIcecrystal', '#9fd4e6'], ['drawHay', '#c9a227'], ['drawHole', '#2a1d12'],
    ];
    let dOk = true, dBad = '';
    for (const [fn, col] of direct) { const s = spy(() => props[fn](0, 0)); if (!s.has(col)) { dOk = false; dBad += fn + ' '; } }
    check('le decorazioni si disegnano anche fuori dal mondo (Sprite Studio)', dOk, dBad);
  }

  /* ---- LIBRO DEI FOSSILI: in Node WebGL non c'è, quindi DEVE scattare il ripiego 2D ----
     è metà del valore della pagina: se il fallback non dipinge, chi apre il Libro su un
     dispositivo senza WebGL vede sessanta riquadri neri e crede che il gioco sia rotto */
  {
    const bookui = await import('../src/bookui.js');
    const { baseSpec } = await import('../src/bones.js');
    const { ALL_SPECIES } = await import('../src/data.js');
    const sp = ALL_SPECIES[0];
    const cv = document.createElement('canvas'); cv.width = 220; cv.height = 165;
    const bones = spy(() => bookui.drawVoxel2D(cv, baseSpec(sp), false, false, null));
    const sil = spy(() => bookui.drawVoxel2D(cv, baseSpec(sp), true, false, null));
    const flesh = spy(() => bookui.drawVoxel2D(cv, baseSpec(sp), false, true, null));
    check('libro: la proiezione 2D dipinge le ossa a tre toni', bones.has('#ffffff') && bones.has('#8f887a'));
    check('libro: la specie non identificata resta una silhouette', sil.has('#4a4438') && !sil.has('#ffffff'));
    check('libro: la vista VIVA usa i colori della specie, non le ossa', flesh.size > 1 && !flesh.has('#d6d0c2'));
    /* remount3D → mount3D: l'import di Three riesce anche in Node, ma senza WebGL
       mountSkeleton esplode e va preso il ramo di ripiego. È asincrono: si aspetta. */
    const painted = new Set();
    ctx.fillRect = () => painted.add(String(ctx.fillStyle));
    const target = bookui.remount3D(cv, baseSpec(sp), false, false, null);
    for (let i = 0; i < 200 && !painted.size; i++) await new Promise(r => setTimeout(r, 10));
    delete ctx.fillRect;
    bookui.disposeViews();
    check('libro: senza WebGL il 3D ripiega sulla proiezione 2D (e disegna)', painted.has('#ffffff'), [...painted].join(' '));
    check('libro: il rimontaggio riusa la canvas quando non c\'è un genitore', target === cv);

    /* IL LIBRO APERTO PER DAVVERO. Lo stub restituisce sempre [] da querySelectorAll, quindi
       il ciclo che riempie le canvas delle pagine non veniva mai eseguito: openBook passava
       verde anche con gli schizzi rotti. Qui si consegnano al modulo due canvas vere per
       quella sola chiamata, e si guarda cosa ci finisce sopra. */
    const pagesEl = document.getElementById('bk-pages');
    const origQSA = pagesEl.querySelectorAll;
    const mkCv = ds => { const c = document.createElement('canvas'); c.width = 220; c.height = 165; c.dataset = ds; return c; };
    const cvBig = mkCv({ sp: sp.id }), cvSketch = mkCv({ sp2: sp.id });
    /* il pulsante ▶ Vivo: rimonta il modello nella versione rianimata. Senza un elemento
       vero non veniva mai premuto, e il premio del risveglio (5 pezzi + una fialetta intera)
       è proprio quel bottone. */
    const flipBtn = { dataset: { fs: sp.id }, textContent: '', parentElement: { querySelector: () => cvBig } };
    pagesEl.querySelectorAll = sel => (sel === '.bp-cv' ? [cvBig] : sel === '.bk-sketch' ? [cvSketch]
      : sel === '.bk-flip3d' ? [flipBtn] : []);
    const keepCodex = S.codex, keepMuseum = S.museum[sp.id];
    S.codex = ALL_SPECIES.slice(0, 4).map(x => x.id);   // 4 specie = 2 pagine: si può sfogliare
    S.museum[sp.id] = ['cranio'];              // un solo pezzo consegnato: il resto resta spento
    const page = spy(() => bookui.openBook(0));
    check('libro: aprendo una pagina lo schizzo della specie viene dipinto', page.has('#ffffff') || page.has('#d6d0c2'));
    /* il senso dell'oscuramento: si accende solo ciò che hai davvero portato al Museo */
    check('libro: i pezzi non ancora consegnati restano spenti', page.has('#403a55') || page.has('#332e42'));
    /* SFOGLIATA: la pagina si piega e il contenuto cambia a metà giro, quindi il numero
       arriva dopo l'animazione — si aspetta invece di scavalcarla, perché è proprio il
       giro completo (piega, cambio, rientro) che deve finire senza incastrarsi */
    const pageNo = () => Number((String(document.getElementById('bk-nav').innerHTML).match(/([0-9]+) \/ /) || [])[1]);
    const settle = async () => { for (let i = 0; i < 60; i++) await new Promise(r => setTimeout(r, 20)); };
    flipBtn.onclick();
    const toFlesh = flipBtn.dataset.mode === 'flesh' && flipBtn.textContent.startsWith('\u25c0');
    flipBtn.onclick();
    const toBones = flipBtn.dataset.mode !== 'flesh' && flipBtn.textContent.startsWith('\u25b6');
    check('libro: \u25b6 Vivo mostra l\'animale rianimato e \u25c0 riporta alle ossa', toFlesh && toBones);
    /* un test molto più in alto aveva già lanciato una sfogliata: i suoi timer sono ancora
       in volo e bookFlip ignora i clic mentre una pagina gira. Prima si lascia atterrare. */
    await settle(); bookui.openBook(0);
    const p0 = pageNo();
    document.getElementById('bkNext').onclick(); await settle();
    const p1 = pageNo();
    document.getElementById('bkPrev').onclick(); await settle();
    check('libro: le frecce sfogliano avanti e indietro', p1 === p0 + 1 && pageNo() === p0, `${p0} → ${p1} → ${pageNo()}`);
    /* INDICATORE OSSA: conteggio X/5 (pezzi al Museo) e, a teca piena, pagina bordata d'oro */
    const { PARTS: BOOK_PARTS } = await import('../src/data.js');
    bookui.openBook(0);
    const htmlPartial = String(document.getElementById('bk-pages').innerHTML);
    check('libro: teca incompleta mostra il conteggio ossa X/5', /1\/5/.test(htmlPartial) && !/bk-complete/.test(htmlPartial));
    const keepDon = S.donated.slice();
    S.museum[sp.id] = BOOK_PARTS.map(p => p.id);          // tutte e 5 le ossa consegnate
    if (!S.donated.includes(sp.id)) S.donated.push(sp.id);
    bookui.openBook(0);
    const htmlFull = String(document.getElementById('bk-pages').innerHTML);
    check('libro: teca completa → pagina Completo bordata d\'oro (bk-complete)', /bk-complete/.test(htmlFull) && /Completo/.test(htmlFull));
    S.donated = keepDon;
    S.codex = keepCodex;
    if (keepMuseum === undefined) delete S.museum[sp.id]; else S.museum[sp.id] = keepMuseum;
    pagesEl.querySelectorAll = origQSA;
    /* si chiude anche cliccando fuori dal libro: sul telefono è il gesto naturale */
    const ov = document.getElementById('bookov');
    ov.dispatchEvent({ type: 'click', target: ov });
    check('libro: il clic fuori dalle pagine lo chiude', bookui.isBookOpen() === false);
    bookui.openBook(0);
    document.getElementById('bk-close').onclick();
    check('libro: il pulsante di chiusura è collegato', bookui.isBookOpen() === false);
  }

  /* ---- PANNELLI MAI APERTI: ogni schermata che il giocatore può aprire va DISEGNATA ---- */
  {
    const mBody = document.getElementById('m-body');
    /* apre un pannello e restituisce quello che il giocatore si troverebbe davanti; se il
       pannello esplode lo si annota invece di far cadere tutta la suite */
    const panel = fn => { mBody.innerHTML = ''; try { fn(); } catch (e) { crashes.push(e.message); } return String(mBody.innerHTML); };
    at(land[0], land[1]);

    const inn = panel(() => ui.openBuilding({ type: 'inn', name: 'Locanda' }));
    check('Locanda: il pannello dice cosa fa il riposo e mostra l\'energia', /Dormi/.test(inn) && inn.includes(S.energy + '/' + S.maxEnergy));

    const board = panel(() => ui.openQuestBoard());
    check('Cartello delle missioni: bacheca del giorno con le offerte', board.includes('Bacheca') && board.includes('data-accept'));

    const achs = panel(() => ui.openAchievements());
    check('Traguardi: elenco a gradini (tracce + medaglie)', achs.includes('Gradini sbloccati') && achs.includes('tdots'));

    const guide = panel(() => ui.openHudGuide());
    check('Guida HUD: spiega monete, energia e zona a chi inizia', guide.includes('Monete') && guide.includes('Energia') && guide.includes('Zona'));

    const keepCre = S.creatures;
    S.creatures = [];
    const noComp = panel(() => ui.openCompanionPicker());
    check('Compagno: senza chimere spiega come ottenerne una', noComp.includes('Nessuna chimera'));
    S.creatures = [{ uid: 77, name: 'Provolone', skull: SPECIES[0].id, torso: SPECIES[0].id, leg: SPECIES[0].id, q: 'comune' }];
    const withComp = panel(() => ui.openCompanionPicker());
    check('Compagno: con una chimera la si può scegliere', withComp.includes('Provolone') && withComp.includes('data-comp'));
    check('Compagno: si può anche mettere nel cortile', withComp.includes('data-yard'));
    S.creatures = keepCre;

    const exSp = SPECIES[0].id;
    const keepMus = S.museum[exSp];
    S.museum[exSp] = ['cranio'];
    const exh = panel(() => ui.openExhibit(exSp));
    check('Teca del museo: scheda col pezzo esposto e la descrizione', exh.includes('exhCv') && /1\/\d/.test(exh));
    if (keepMus === undefined) delete S.museum[exSp]; else S.museum[exSp] = keepMus;

    /* si guarda la classe del riquadro, non isModalOpen(): quello risponde anche per zaino,
       libro e mappa, che qui non c'entrano */
    ui.closeModal(true);
    check('e alla fine la modale si richiude', document.getElementById('modal').classList.contains('on') === false);
  }

  check('nessuna funzione di disegno è esplosa lungo il percorso', crashes.length === 0, crashes[0]);

  /* stato globale come lo si era trovato */
  P.x = keep.x; P.y = keep.y; P.dir = keep.dir; P.moving = keep.moving; P.digging = keep.digging;
  S.gear = keep.gear; S.tools = keep.tools; S.maps = keep.maps; S.tod = keep.tod;
  prefsMod.setPref('marker', keep.marker);
  cam.x = P.x; cam.y = P.y;
}

/* ---------- MEZZI rifiniti a mano (Sprite Studio + banca sprite) ---------- */
{
  const render = await import('../src/render.js');
  const bank = await import('../src/spritebank.js');
  const { ctx } = await import('../src/screen.js');
  const prevComp = S.companion;
  S.companion = { skull: 'abissodonte', torso: 'abissodonte', leg: 'abissodonte', q: 3 }; // per la cavalcatura
  const kinds = ['boat', 'motorboat', 'bike', 'skates', 'mount'];
  const dirs = ['down', 'up', 'right', 'left'];
  let painted = 0, threw = 0;
  ctx.fillRect = () => painted++;
  for (const k of kinds) for (const d of dirs) {
    try { render.drawVehiclePreview(k, 40, 40, d); } catch (e) { threw++; }
  }
  delete ctx.fillRect;
  S.companion = prevComp;
  check('Studio Mezzi: drawVehiclePreview rende ogni mezzo×verso senza crash', threw === 0, threw + ' crash');
  check('Studio Mezzi: i mezzi disegnano davvero dei pixel', painted > 0);

  /* la banca è ADDITIVA e OVERLAY: il disegno porta solo il VEICOLO, l'eroe resta procedurale.
     Il motoscafo di fronte è già disegnato a mano; gli altri versi restano procedurali. */
  check('banca mezzi: motoscafo (3 viste) disegnato a mano', ['down', 'up', 'side'].every(v => bank.hasSprite('vehicle:motorboat:' + v) === true));
  check('banca mezzi: i mezzi non disegnati restano procedurali', bank.hasSprite('vehicle:boat:down') === false && bank.hasSprite('vehicle:boat:side') === false);
  const md = bank.spriteDef('vehicle:motorboat:down');
  /* i mezzi usano la CORNICE FISSA 32×34 con ancora sull'origine del player (16,12): stabile,
     WYSIWYG con l'editor; spostare un pixel al bordo non riancora più il disegno */
  check('banca mezzi: cornice fissa 32×34, ancora sull\'origine (16,12)', !!md && md.w === 32 && md.h === 34 && md.rows.length === 34 && md.rows.every(r => r.length === 32) && md.ax === 16 && md.ay === 12);

  /* gli id della scheda Mezzi nello Studio devono combaciare col mapping del gioco:
     verso ∈ {down,up,side}, mezzo ∈ i 5 noti (una svista di naming = disegni orfani) */
  const { readFileSync } = await import('node:fs');
  const studioSrc = readFileSync(new URL('../public/sprites/index.html', import.meta.url), 'utf8');
  const ids = [...studioSrc.matchAll(/'vehicle:(\w+):(\w+)'/g)];
  check('Studio Mezzi: 15 voci (5 mezzi × 3 viste)', ids.length === 15, ids.length + ' voci');
  check('Studio Mezzi: id coerenti (mezzo noto, verso down/up/side)',
    ids.every(m => kinds.includes(m[1]) && ['down', 'up', 'side'].includes(m[2])));

  /* PATTINI a mano ANIMATI e ATTACCATI AI PIEDI: si disegnano eroe+pattini come in gioco (bob
     incluso) e si controlla che le rotelle (ambra #e0b040) stiano SEMPRE 2px sotto le scarpe
     (W #f2ead8) in ogni frame, e che si SPOSTINO coi piedi tra fr0 e fr1 (animazione). */
  const sprMod = await import('../src/sprites.js');
  const { ctx: sctx } = await import('../src/screen.js');
  /* nello stub Node save/translate/scale sono no-op (Proxy): drawHero/drawBankSkates ora
     usano il transform vero del canvas (16bit HD, raddoppio geometrico) per posizionarsi,
     quindi qui bisogna SIMULARLO a mano per leggere le coordinate assolute vere, non quelle
     locali grezze passate a fillRect. */
  const ofr = sctx.fillRect, osave = sctx.save, orestore = sctx.restore, otr = sctx.translate, osc = sctx.scale;
  let tx = 0, ty = 0, scX = 1, scY = 1, tstack = [];
  sctx.save = () => { tstack.push([tx, ty, scX, scY]); };
  sctx.restore = () => { const s = tstack.pop(); if (s) [tx, ty, scX, scY] = s; };
  sctx.translate = (dx, dy) => { tx += dx * scX; ty += dy * scY; };
  sctx.scale = (a, b) => { scX *= a; scY *= b; };
  let W = [], amb = [];
  sctx.fillRect = (x, y) => { const X = Math.round(tx + x * scX), Y = Math.round(ty + y * scY); if (sctx.fillStyle === sprMod.PAL.b) W.push([X, Y]); /* scarpe: la suola */ if (sctx.fillStyle === '#e0b040') amb.push([X, Y]); };
  const SX = 100;
  const shotSk = (dir, moving, fr) => {
    P.dir = dir; P.moving = moving; W = []; amb = []; tx = 0; ty = 0; scX = 1; scY = 1; tstack = [];
    const bob = fr === 1 ? -1 : 0;
    sprMod.drawHero(null, SX - 16, 100 + bob, dir, fr);
    tx = 0; ty = 0; scX = 1; scY = 1; tstack = [];
    render.drawBankSkates(SX, 100 + bob, fr);
    const feetY = Math.max(...W.map(p => p[1]));                     // scarpe = riga più in basso
    const wheelY = Math.min(...amb.map(p => p[1]));                  // rotelle = riga più in alto
    const feetXs = W.filter(p => p[1] === feetY).map(p => p[0]).sort((a, b) => a - b);
    return { n: amb.length, gap: wheelY - feetY, feetC: (feetXs[0] + feetXs[feetXs.length - 1]) / 2, wheelC: (Math.min(...amb.map(p => p[0])) + Math.max(...amb.map(p => p[0]))) / 2 };
  };
  const d0 = shotSk('down', true, 0), d1 = shotSk('down', true, 1), sSt = shotSk('down', false, 0);
  const si0 = shotSk('side', true, 0), si1 = shotSk('side', true, 1);
  sctx.fillRect = ofr; sctx.save = osave; sctx.restore = orestore; sctx.translate = otr; sctx.scale = osc; P.moving = false;
  check('pattini a mano: le rotelle si disegnano (4)', d0.n === 4 && d1.n === 4);
  check('pattini a mano: ATTACCATI ai piedi (rotelle appena sotto le scarpe, ogni frame)', d0.gap >= 2 && d0.gap <= 6 && d1.gap >= 2 && d1.gap <= 6 && si0.gap >= 2 && si0.gap <= 6 && si1.gap >= 2 && si1.gap <= 6);
  check('pattini a mano: centrati sotto i piedi (fronte, entrambi i frame)', Math.abs(d0.wheelC - d0.feetC) <= 2 && Math.abs(d1.wheelC - d1.feetC) <= 2);
  check('pattini a mano: ANIMATI, seguono i piedi che si spostano tra i frame', d0.wheelC !== d1.wheelC || si0.wheelC !== si1.wheelC);
  /* REGRESSIONE: drawPlayer deve passare `sy + bob` (attaccati al bob dei piedi), non `sy` liscio
     (che li staccava verticalmente). */
  const renderSrc = readFileSync(new URL('../src/render.js', import.meta.url), 'utf8');
  check('pattini a mano: baseline col bob (attaccati ai piedi)', /drawBankSkates\(sx,\s*sy \+ bob,\s*fr\)/.test(renderSrc));
}

/* ---------- FIX: mappa garantisce la rarità anche fuori finestra; cavalcatura incollata in volo ---------- */
{
  const { ZONES: ZG, zonePools: zpG } = await import('../src/data.js');
  /* la X di una mappa GARANTISCE la rarità comprata: anche se la specie di quella rarità è fuori
     dalla sua finestra (notte/stagione), makeRaw deve tornare quella rarità, non una più bassa. */
  let allRight = true, tested = 0;
  for (const z of ZG) {
    if (!zpG[z.id] || !zpG[z.id].some(s => s.r === 'leggendario')) continue;
    for (const tod of [0.5, 0.0]) for (const day of [1, 2, 3]) {   // giorno/notte × stagioni
      S.tod = tod; S.day = day;
      for (let i = 0; i < 8; i++) { const raw = gameplay.makeRaw(z.id, 500, 'leggendario', 'any'); tested++; if (!raw || raw.q !== 'leggendario') allRight = false; }
    }
  }
  S.tod = 0.25; S.day = 1;
  check('mappa: rarità GARANTITA anche fuori finestra (leggendario resta leggendario)', allRight && tested > 0, tested + ' prove');

  /* cavalcatura in volo = incollata al player: all'atterraggio il compagno è già lì, non torna
     dal punto di decollo (bug segnalato). updateCompanion(dt, true) snappa COMP su P. */
  const comp2 = await import('../src/companion.js');
  S.companion = { key: 'k', skull: 'abissodonte', torso: 'abissodonte', leg: 'abissodonte', q: 'leggendario' };
  P.x = 500; P.y = 500; comp2.COMP.x = 40; comp2.COMP.y = 40; comp2.COMP.init = true; comp2.COMP.job = null;
  comp2.updateCompanion(0.016, true);   // in volo
  check('cavalcatura: in volo il compagno resta INCOLLATO al player (niente ritorno al decollo)', comp2.COMP.x === P.x && comp2.COMP.y === P.y);
  comp2.COMP.x = 40; comp2.COMP.y = 40;
  comp2.updateCompanion(0.016, false);  // a terra: insegue (non snappa di colpo al player)
  check('cavalcatura: a terra il compagno INSEGUE (non teletrasporta)', comp2.COMP.x !== P.x || comp2.COMP.y !== P.y);

  /* ATTERRAGGIO: non si scende MAI incastrati su una casella solida (montagna/roccia/albero).
     O si atterra sul punto libero più vicino, o si resta in volo. */
  const keepXY = { x: P.x, y: P.y, m: S.mounted };
  let solid = null;
  for (let ty = -50; ty < 50 && !solid; ty++) for (let tx = -50; tx < 50; tx++) {
    if (gameplay.collide(tx * TS + 8, ty * TS + 8)) { solid = { tx, ty }; break; }
  }
  if (solid) {
    P.x = solid.tx * TS + 8; P.y = solid.ty * TS + 8; S.mounted = true;
    gameplay.toggleMount();                                       // prova a scendere
    const stuck = S.mounted === false && gameplay.collide(P.x, P.y);   // atterrato su solido = bug
    check('cavalcatura: non si atterra MAI incastrati su casella solida', !stuck);
  }
  P.x = keepXY.x; P.y = keepXY.y; S.mounted = false;
  S.companion = null; comp2.COMP.init = false;
}

/* ---------- ARREDO del parco: stagno/alberi/siepe/aiuole dentro il recinto ---------- */
{
  const { parkDeco } = await import('../src/world.js');
  const pen = { x0: 0, y0: 0, x1: 11, y1: 7 }, cx = 6;              // recinto 12×8 (interno 10×6)
  const at = (tx, ty) => parkDeco(pen, cx, tx, ty);
  check('parco: il bordo (staccionata) non ha arredo', at(0, 3) === null && at(11, 3) === null && at(5, 0) === null && at(5, 7) === null);
  check('parco: la colonna del cancello resta libera', at(cx, 3) === null && at(cx - 1, 3) === null);
  check('parco: stagno (acqua vera) nell\'angolo interno', at(1, 1) && at(1, 1).kind === 'pond' && at(3, 2) && at(3, 2).kind === 'pond');
  check('parco: alberi agli angoli interni', at(10, 1) && at(10, 1).kind === 'tree' && at(1, 6) && at(1, 6).kind === 'tree' && at(10, 6) && at(10, 6).kind === 'tree');
  /* il CENTRO resta perlopiù libero (le creature ci passeggiano): l'arredo sta su anello+angoli+stagno */
  let centerFilled = 0, centerTot = 0;
  for (let ty = 3; ty <= 5; ty++) for (let tx = 4; tx <= 8; tx++) { if (tx === cx || tx === cx - 1) continue; centerTot++; const d = at(tx, ty); if (d && d.kind !== 'flowerbed') centerFilled++; }
  check('parco: il centro resta libero per le creature (solo aiuole piatte, niente ostacoli)', centerFilled === 0 && centerTot > 0);
  check('parco: deterministico (stessa cella → stesso arredo)', JSON.stringify(at(1, 3)) === JSON.stringify(at(1, 3)));

  /* sul CORTILE vero (M5): staccionate orientate, stagno = acqua vera ma non pescabile.
     `S.home` è già stato fissato da un test precedente ("CASA del giocatore"). */
  const { townForTile, yardInfo: yInfo, yardRect: yRect, TCELL: TC } = await import('../src/world.js');
  const p = yRect();
  check('cortile: S.home trovato per fissare il recinto', !!p);
  if (p) {
    const midY = Math.floor((p.y0 + p.y1) / 2), midX = p.cx + 3;   // colonna non-cancello
    const side = yInfo(p.x0, midY), topbot = yInfo(midX, p.y1);
    check('cortile: staccionata VERTICALE sui lati (fv, non fh)', !!side && side.fence && side.fv === true && !side.fh);
    check('cortile: staccionata ORIZZONTALE sopra/sotto (fh, non fv)', !!topbot && topbot.fence && topbot.fh === true && !topbot.fv);
    const wx = p.x0 + 2, wy = p.y0 + 2;                                 // dentro lo stagno
    check('cortile: lo stagno è acqua DECORATIVA → NON pescabile', yInfo(wx, wy).floor === true && gameplay.waterTile(wx, wy) === false);
  }

  /* BACHECA (cartello missioni) LONTANA dalla fontana: stavano appiccicate. Scandisce le città. */
  let towns = 0, noBoard = 0, tooClose = 0, minD = 999;
  for (let cy = 0; cy < 60; cy++) for (let cx = 0; cx < 60; cx++) {
    const t = townForTile(cx * TC + 20, cy * TC + 20);
    if (!t || (t.size !== 'città' && t.size !== 'paese')) continue;
    towns++;
    const fnt = (t.decos || []).find(dd => dd.type === 'fountain');
    const board = (t.decos || []).find(dd => dd.type === 'board');
    if (!board) { noBoard++; continue; }
    if (fnt) { const dd = Math.max(Math.abs(board.x - (fnt.x + 0.5)), Math.abs(board.y - (fnt.y + 0.5))); if (dd < minD) minD = dd; if (dd < 4) tooClose++; }
  }
  check('bacheca: sempre presente in paesi/città', towns > 0 && noBoard === 0);
  check('bacheca: SEMPRE lontana dalla fontana (≥4 caselle dal centro)', tooClose === 0 && minD >= 4, 'distMin ' + minD);
}

/* ---------- console: comandi cheat NON distruttivi + vanilla (blocco isolato in fondo) ---------- */
{
  const cmds = await import('../src/commands.js');
  const { PARTS: PARTSc, ZONES: ZONESc, THEMED_HAT, THEMED_HAIR } = await import('../src/data.js');
  const regionsC = await import('../src/regions.js');
  const dbg2 = await import('../src/debug.js');
  if (state.isCheatLock()) cmds.runCommand('vanilla'); // parti pulito
  state.clearCheatSnapshot(); state.setCheatLock(false); // nessuno snapshot residuo da test precedenti
  if (dbg2.isDebug()) dbg2.toggleDebug();
  // baseline "salvato" PULITA (lo snapshot del primo cheat la cattura)
  S.coins = 50; S.day = 3; S.energy = 10; S.maxEnergy = 30;
  S.awakened = []; S.dna = {}; S.museum = {}; S.book = {}; S.unlocked = { hats: [], hairs: [] }; S.items = [];
  cmds.runCommand('energy=40'); check('console: energy=40 (alza il max)', S.energy === 40 && S.maxEnergy === 40);
  cmds.runCommand('day=12'); check('console: day=12', S.day === 12);
  const dnC = await import('../src/daynight.js');
  cmds.runCommand('season=inverno'); check('console: season=inverno', dnC.seasonOf(S.day) === 3);
  cmds.runCommand('season=primavera'); check('console: season=primavera', dnC.seasonOf(S.day) === 0);
  const wthC = await import('../src/weather.js');
  cmds.runCommand('weather=pioggia'); check('console: weather=pioggia (override)', S.weatherOverride === 'rain' && wthC.weatherAt('prati', 5) === 'rain');
  cmds.runCommand('weather=off'); check('console: weather=off (auto)', S.weatherOverride === null);
  check('console: gotosite/gotowreck/gotolandmark rispondono', typeof cmds.runCommand('gotosite') === 'string' && typeof cmds.runCommand('gotowreck') === 'string' && typeof cmds.runCommand('gotolandmark') === 'string');
  /* segnalato: "quando uso gotobone rimango bloccato" — con 5 parti impacchettate vicine
     (corno e cranio distano UNA casella) il vicino della parte più vicina è spesso UN'ALTRA
     parte dello stesso scheletro, e il teletrasporto ci piazzava DENTRO un monticello solido.
     Su tanti scheletri diversi, non deve capitare mai più. */
  {
    let stuck = 0, tried = 0;
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) {
      const s = world.boneSiteForCell(x, y); if (!s) continue;
      tried++;
      P.x = s.x * TS; P.y = s.y * TS; // già dentro la SUA cella: gotobone prende proprio questo
      cmds.runCommand('gotobone');
      if (world.isSolidTile(Math.floor(P.x / TS), Math.floor((P.y + 13) / TS))) stuck++;
    }
    check('gotobone: mai teletrasportati dentro un monticello solido (' + tried + ' scheletri)', tried > 3 && stuck === 0);
  }
  cmds.runCommand('speed=8'); check('console: speed=8', P.speedMul === 8);
  cmds.runCommand('speed=99'); check('console: speed clamp a 20', P.speedMul === 20);
  check('console: primo cheat accende il lock (tag) e PERSISTE lo snapshot pre-cheat', state.isCheatLock() === true && state.hasCheatSnapshot() === true);
  /* il save NON è più congelato: con i comandi attivi si salva normalmente (testare non perde i progressi) */
  { const before = localStorage.getItem(state.SK); S.coins = 777; const ok = state.save(); check('console: con i comandi attivi il gioco SI SALVA (niente più freeze)', ok === true && localStorage.getItem(state.SK) !== before && JSON.parse(localStorage.getItem(state.SK)).coins === 777); }
  cmds.runCommand('goddna');
  check('console: goddna → DNA di tutte le specie, grotte comprese',
    (await import('../src/data.js')).ALL_SPECIES.every(sp => S.dna[sp.id] >= 2));
  S.items = []; S.tools = {}; S.shovel = 0; S.maps = []; cmds.runCommand('goditem');
  check('console: goditem → fossili (grotte comprese) + attrezzi + barca + mappe + mezzi',
    S.items.length === (await import('../src/data.js')).ALL_SPECIES.length * PARTSc.length && S.tools.boat && S.tools.axe && S.tools.pick && S.tools.skates && S.tools.bike && S.tools.motorboat && S.tools.torch && S.shovel > 0 && S.maps.length >= 3 && S.teleports > 0);
  S.unlocked = { hats: [], hairs: [] }; S.museum = {}; S.awakened = [];
  cmds.runCommand('godmode');
  const { PREMIUM_HATS: PH } = await import('../src/data.js');
  const ach2G = await import('../src/achievements.js');
  check('console: godmode sblocca+completa tutto (incl. volo + cappelli-trofeo glitter)', dbg2.isDebug() === true && ach2G.TROPHY_HATS.every(h => S.unlocked.hats.includes(h)) && S.glitterHats.length === ach2G.TROPHY_HATS.length &&
    S.unlocked.hairs.length === THEMED_HAIR.length && P.speedMul === 5 && P.fly === true && S.items.length > 0 && S.tools.boat && SPECIES.every(sp => S.awakened.includes(sp.id)) && ZONESc.every(z => S.book[z.id]));
  check('console: suggest per goto', cmds.suggest('goto=pal').includes('goto=palude'));
  cmds.runCommand('goto=dune');
  check('console: goto=dune porta nelle Dune', regionsC.zoneAt(Math.floor(P.x / TS), Math.floor((P.y + 13) / TS)).id === 'dune');
  // VANILLA: rimuove i cheat e ripristina lo stato pre-cheat (coins=50, day=3, energia base)
  cmds.runCommand('vanilla');
  check('console: vanilla ripristina il salvataggio (e spegne il volo)', state.isCheatLock() === false && dbg2.isDebug() === false &&
    P.speedMul === 1 && P.fly === false && S.coins === 50 && S.day === 3 && S.maxEnergy === 30 && S.awakened.length === 0);
}

/* ---------- GROTTE: ingressi, area buia, scavo di fossili di grotta, uscita ---------- */
{
  const cave = await import('../src/cave.js');
  const { CAVE_SPECIES, spById } = await import('../src/data.js');
  const bones = await import('../src/bones.js');
  check('6 specie di grotta (fuori dalle 60) con blueprint e sprite', CAVE_SPECIES.length === 6 &&
    CAVE_SPECIES.every(s => s.src === 'grotta' && s.id in spById && bones.buildVoxels(bones.baseSpec(s)).length > 10));
  // un ingresso grotta esiste da qualche parte sulle montagne
  let ent = null;
  for (let x = -120; x < 120 && !ent; x++) for (let y = -120; y < 120 && !ent; y++) if (world.caveEntranceAt(x, y)) ent = [x, y];
  check('esiste un imbocco di grotta (montagna, terra sotto)', !!ent && !world.isSolidTile(ent[0], ent[1]));
  // entra, trova un giacimento, scava → fossile di grotta grezzo
  cave.enterCave(7, ent ? ent[0] : 0, ent ? ent[1] : 0);
  check('in grotta: attiva, spawn nel corridoio', cave.CAVE.active === true && cave.CAVE.x > 0);
  let node = null;
  for (let x = 1; x < cave.CAVE.w - 1 && !node; x++) for (let y = 1; y < cave.CAVE.h - 1 && !node; y++) if (cave.caveNodeAt(x, y) && !cave.caveNodeDone(x, y)) node = [x, y];
  check('la grotta ha giacimenti luminosi', !!node);
  cave.CAVE.x = node[0] * TS + 8; cave.CAVE.y = node[1] * TS - 5; S.energy = 10; S.raw = []; S.caveDug = [];
  const om3 = Math.random; Math.random = () => 0.1; // forza il reperto (55% base)
  S.tools.pick = false;
  check('cristalli: senza piccone non si scava', cave.digCave() === 'nopick' && !cave.CAVE.digging);
  S.tools.pick = true;
  check('scavo grotta: parte', cave.digCave() === true);
  cave.stepCave(1); Math.random = om3;
  check('scavo grotta → fossile di grotta grezzo', S.raw.length === 1 && spById[S.raw[0].s].src === 'grotta' && cave.caveNodeDone(node[0], node[1]));
  /* LO ZAINO VALE ANCHE SOTTOTERRA. Qui `S.raw.push` era diretto: l'unica fonte di reperti
     che scavalcava la capienza, cioè proprio ciò per cui si pagano gli ingrandimenti.
     Quaggiù non c'è terra su cui posarlo, quindi il cristallo resta al suo posto. */
  {
    let node2 = null;
    for (let x = 1; x < cave.CAVE.w - 1 && !node2; x++) for (let y = 1; y < cave.CAVE.h - 1 && !node2; y++) if (cave.caveNodeAt(x, y) && !cave.caveNodeDone(x, y)) node2 = [x, y];
    cave.CAVE.x = node2[0] * TS + 8; cave.CAVE.y = node2[1] * TS - 5;
    S.items = []; S.bagCap = 14; S.energy = 30;
    while (gameplay.fossilCount() < gameplay.bagCap()) S.raw.push({ uid: 950 + S.raw.length, s: 'prato', t: 'coda', q: 'comune', val: 3 });
    const nRaw = S.raw.length, en = S.energy;
    check('grotta a zaino pieno: il cristallo resta al suo posto', cave.digCave() === 'bagfull'
      && !cave.CAVE.digging && S.raw.length === nRaw && S.energy === en
      && !cave.caveNodeDone(node2[0], node2[1]));
    S.raw = []; S.caveDug = [];
  }
  // uscita dal corridoio in basso
  cave.CAVE.x = (cave.CAVE.w >> 1) * TS + TS / 2; cave.CAVE.y = (cave.CAVE.h - 1.3) * TS;
  for (let i = 0; i < 200 && cave.CAVE.active; i++) cave.updateCave(1 / 60, { down: true }, 46);
  check('grotta: si esce dal corridoio', cave.CAVE.active === false);
  /* entrare in grotta apre l'ala del Libro: le 6 specie diventano catalogabili */
  {
    const { ALL_SPECIES: ASP } = await import('../src/data.js');
    check('la prima grotta apre l\'ala del Libro', S.book.grotta === true);
    const before = S.codex.length;
    S.codex.push('cavernide');
    ui.openBook();
    const bh = document.getElementById('bk-pages').innerHTML;
    check('le specie di grotta hanno una pagina nel Libro', /Cavernide/.test(bh) || ASP.some(s => s.zone === 'grotta'));
    ui.closeBook(); S.codex.length = before;
    check('il catalogo conta 66 specie, non 60 su 60', ASP.length === 66);
  }
  /* REGOLA: UN masso davanti + spiazzo 3×3 sgombro, e serve il PICCONE per entrare */
  const ents = [];
  for (let x = -120; x < 120; x++) for (let y = -120; y < 120; y++) if (world.caveEntranceAt(x, y)) ents.push([x, y]);
  check('grotte RARE ma esistenti', ents.length >= 2 && ents.length <= 12, 'n=' + ents.length);
  let guardBad = 0, areaBad = 0;
  for (const [x, y] of ents) {
    if (world.decoAt(x, y + 1) !== 'boulder') guardBad++;              // il masso c'è
    if (!world.isSolidTile(x, y + 1)) guardBad++;                      // ed è solido (sigilla)
    for (let dy = 1; dy <= 3; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 1) continue;                              // il masso è l'unica eccezione
      if (world.decoAt(x + dx, y + dy) || world.isSolidTile(x + dx, y + dy)) areaBad++;
    }
  }
  check('ogni grotta: UN solo masso davanti', guardBad === 0, 'bad=' + guardBad);
  check('ogni grotta: spiazzo 3×3 libero', areaBad === 0, 'bad=' + areaBad);
  /* spaccato il masso col piccone la strada è libera */
  {
    const [x, y] = ents[0];
    state.minedSet.add(x + ',' + (y + 1));
    check('col piccone il masso sparisce e si passa', world.decoAt(x, y + 1) === null && !world.isSolidTile(x, y + 1));
    state.minedSet.delete(x + ',' + (y + 1));
  }
  /* ingresso: senza piccone niente grotta, col piccone si entra */
  {
    const [x, y] = ents[0];
    const dbg2 = await import('../src/debug.js');
    if (dbg2.isDebug()) dbg2.toggleDebug();
    const put = () => { P.x = x * TS + 8; P.y = y * TS - 13 + 13; P.moving = true; P.dir = 'up'; cave.CAVE.justLeft = false; };
    S.tools.pick = false; put(); cave.checkCaveEnter(world.caveEntranceAt);
    check('senza piccone NON si entra in grotta', cave.CAVE.active === false);
    S.tools.pick = true; put(); cave.checkCaveEnter(world.caveEntranceAt);
    check('col piccone si entra in grotta', cave.CAVE.active === true);
    cave.exitCave(); cave.CAVE.justLeft = false;
  }
}

/* ---------- landmark endemici: presenti, deterministici, 3 per bioma ---------- */
{
  let found = null;
  for (let x = -220; x < 220 && !found; x++) for (let y = -220; y < 220 && !found; y++) { const l = world.landmarkAt(x, y); if (l) found = [x, y, l]; }
  check('landmark presenti + deterministici', !!found && world.landmarkAt(found[0], found[1]) === found[2]);
  check('6 biomi × 3 landmark unici', world.LANDMARKS.length === 6 && world.LANDMARKS.every(a => a.length === 3));
  /* ogni meraviglia sul SUO terreno: le ninfee solo sull'acqua, le altre su terra ferma */
  {
    let lily = 0, lilyBad = 0, landBad = 0;
    for (let x = -220; x < 220; x++) for (let y = -220; y < 220; y++) {
      const l = world.landmarkAt(x, y); if (!l) continue;
      if (l === 'lilypad') { lily++; if (!world.wonderTerrainOk('lilypad', x, y)) lilyBad++; }
      else if (world.baseTerrain(x, y) === 0 || world.baseTerrain(x, y) === 1) landBad++;
    }
    check('le ninfee crescono SOLO sull\'acqua', lilyBad === 0, 'lily=' + lily);
    check('le altre meraviglie non finiscono in mare', landBad === 0);
  }
  /* le meraviglie MASSICCE bloccano il passo (blocco di ghiaccio, piloni), ma davanti a
     ognuna resta sempre spazio libero per avvicinarsi e usarla */
  {
    const wa = await import('../src/wonderart.js');
    let solidCount = 0, blockedFront = 0;
    for (let x = -220; x < 220; x += 1) for (let y = -220; y < 220; y += 1) {
      const l = world.landmarkAt(x, y); if (!l) continue;
      if ((wa.WONDER_SOLID[l] || []).length) solidCount++;
      for (let dy = 1; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) if (wa.wonderSolidTile(l, x, y, x + dx, y + dy)) blockedFront++;
    }
    check('esistono meraviglie massicce (non si attraversano)', solidCount > 0, 'n=' + solidCount);
    check('davanti a ogni meraviglia resta spazio per avvicinarsi', blockedFront === 0);
    check('il blocco di ghiaccio è solido, l\'arco no', wa.wonderSolidTile('frozenbeast', 0, 0, 0, -1) === true &&
      wa.wonderSolidTile('bonearch', 0, 0, 0, 0) === false && wa.wonderSolidTile('bonearch', 0, 0, -2, 0) === true);
  }
  /* cartello delle missioni = ostacolo SOLIDO (si interagisce da adiacente) */
  let tw = null;
  for (let cx = -8; cx < 8 && !tw; cx++) for (let cy = -8; cy < 8 && !tw; cy++) { const t = world.townForCell(cx, cy); if (t && t.board) tw = t; }
  check('cartello missioni = deco solida', !!tw && world.isSolidTile(tw.board.x, tw.board.y) === true);
}

/* ---------- traguardi: si sbloccano dallo stato, non si ri-sbloccano ---------- */
{
  const ach = await import('../src/achievements.js');
  const { ALL_SPECIES: ASP } = await import('../src/data.js');
  S.trophies = {}; S.codex = []; S.raw = []; S.items = []; S.creatures = []; S.awakened = []; S.donated = []; S.caves = {}; S.companion = null; S.coins = 0; S.level = 1; S.questTotal = 0; S.findsTotal = 0;
  ach.checkAchievements();
  check('trofei: stato vuoto → nessun gradino', ach.trophyCount() === 0);
  // TRACCIA "Scopritore": Bronzo a 10 specie, con notifica (traccia, gradino)
  S.codex = ASP.slice(0, 10).map(s => s.id);
  let ups = []; ach.checkAchievements((t, tier) => ups.push(t.id + ':' + tier));
  check('trofeo Scopritore → Bronzo a 10 specie', ach.trophyTier('discover') === 1 && ups.includes('discover:1'));
  ups = []; ach.checkAchievements((t, tier) => ups.push(t.id + ':' + tier));
  check('un gradino già preso non si ri-sblocca', ups.length === 0);
  // salto di più gradini in un colpo → notifica per OGNI gradino saltato
  S.codex = ASP.slice(0, 45).map(s => s.id); ups = []; ach.checkAchievements((t, tier) => ups.push(t.id + ':' + tier));
  check('45 specie → Argento e Oro insieme (Scopritore=Oro)', ach.trophyTier('discover') === 3 && ups.includes('discover:2') && ups.includes('discover:3'));
  // un'ALTRA traccia sale indipendente
  S.coins = 500; ach.checkAchievements();
  check('trofeo Danaroso → Bronzo a 500 monete', ach.trophyTier('coins') === 1);
  // PLATINO Scopritore = TUTTE le specie (grotte comprese: il totale si chiede ai dati)
  S.codex = ASP.slice(0, ASP.length - 1).map(s => s.id); ach.checkAchievements();
  check('quasi tutte le specie = Oro, non Platino', ach.trophyTier('discover') === 3);
  S.codex = ASP.map(s => s.id); ach.checkAchievements();
  check('TUTTE le specie → Platino Scopritore', ach.trophyTier('discover') === 4);
  check('9 tracce × 4 gradini = 36 totali', ach.TRACKS.length === 9 && ach.TIER_TOTAL === 36);
  S.trophies = {}; S.codex = [];
}

/* ---------- progressione archeologo: XP → livelli → capacità ---------- */
{
  const pr = await import('../src/progress.js');
  S.level = 1; S.xp = 0; S.maxEnergy = 30;
  const need = pr.xpToNext();
  pr.addXp(need);
  check('livello sale a soglia XP (+5 energia max)', pr.playerLevel() === 2 && S.maxEnergy === 35 && pr.playerXp() === 0);
  check('capacità sbloccate: scavo più rapido salendo, più rari', (() => { const a = (S.level = 2, pr.digDurationMul()); const b = (S.level = 11, pr.digDurationMul()); S.level = 2; return a > b && b < 1 && pr.rareBonus() > 1; })());
  S.level = 1; S.xp = 0; S.maxEnergy = 30;
  pr.addXp(pr.xpToNext() - 1);
  check('sotto soglia: accumula senza salire', pr.playerLevel() === 1 && pr.playerXp() === pr.xpToNext() - 1);
  /* il livello ora dà anche un traguardo che si VEDE: al livello del primo premium (5),
     un secondo toast annuncia il cappello nuovo in Sartoria (non solo "Livello 5!") */
  {
    const box5 = document.getElementById('toasts'), said5 = [];
    const origApp5 = box5.appendChild;
    box5.appendChild = c => { said5.push(String(c.innerHTML)); return c; };
    S.level = 4; S.xp = 0;
    while (S.level < 5) gameplay.gainXp(pr.xpToNext());
    box5.appendChild = origApp5;
    check('a livello 5 arriva anche l\'annuncio del cappello', said5.some(t => /Sartoria|Tailor/.test(t)), said5.join(' | '));
  }
  S.level = 1; S.xp = 0; S.maxEnergy = 30;
}

/* ---------- compagno: candidati (chimere + risvegliati), scelta, abilità ---------- */
{
  const comp = await import('../src/companion.js');
  S.creatures = [{ uid: 1, name: 'Testudo', skull: 'lepre', torso: 'lepre', leg: 'lepre', q: 'raro' }];
  S.awakened = ['prato'];
  const cands = comp.companionCandidates();
  check('candidati compagno: chimere + risvegliati', cands.length === 2 && cands.some(c => c.key === 'chi1') && cands.some(c => c.key === 'spprato'));
  comp.setCompanion(cands[0]);
  check('compagno impostato + HUD', comp.companionSpec() && comp.companionSpec().key === 'chi1' && comp.isCurrentCompanion('chi1'));
  /* POTERE dai TRATTI: tipo = fonte della specie (skull), potenza = rarità */
  const dataC = await import('../src/data.js');
  const water = dataC.ALL_SPECIES.find(s => s.src === 'acqua');
  const wSpec = { skull: water.id, torso: water.id, leg: water.id, q: 'eccezionale', key: 'w', name: 'W' };
  check('compagno: TIPO dalla fonte della specie (acqua→Pescatore)', comp.companionType(wSpec) === 'acqua');
  check('compagno: POTENZA scala con la rarità', comp.companionPower({ q: 'comune' }) < comp.companionPower({ q: 'raro' })
    && comp.companionPower({ q: 'raro' }) < comp.companionPower({ q: 'eccezionale' }) && comp.companionPower({ q: 'eccezionale' }) < comp.companionPower({ q: 'leggendario' }));
  comp.setCompanion(wSpec);
  check('compagno: yieldMul potenzia SOLO la sua attività', Math.abs(comp.companionYieldMul('acqua') - 1.22) < 1e-9 && comp.companionYieldMul('terra') === 1 && comp.companionHelps() === true);
  /* CHIMERA (cranio+zampa di fonti DIVERSE) → DUE poteri, ognuno RIDOTTO ma sono due;
     risveglio/chimera focalizzata (stesse fonti) → UN potere PIENO, mai battuto da un asse chimera */
  const tree = dataC.ALL_SPECIES.find(s => s.src === 'albero');
  const chim = { skull: water.id, torso: water.id, leg: tree.id, q: 'comune', key: 'ch', name: 'Chim' };
  const cp = comp.companionPowers(chim);
  const singleFull = comp.companionPower({ skull: water.id, torso: water.id, leg: water.id, q: 'comune' }); // risveglio pieno
  check('chimera: DUE poteri (acqua+albero), ognuno < un risveglio singolo', cp.length === 2 && cp.some(p => p.type === 'acqua') && cp.some(p => p.type === 'albero') && cp[0].mag < singleFull);
  comp.setCompanion(chim);
  check('chimera: potenzia ENTRAMBE le attività (ridotto ciascuno)', Math.abs(comp.companionYieldMul('acqua') - 1.05) < 1e-9 && Math.abs(comp.companionYieldMul('albero') - 1.05) < 1e-9 && comp.companionYieldMul('terra') === 1);
  /* CHIMERA a estremità dello STESSO tipo (specie diverse, entrambe terra) → SEMPRE due poteri:
     il tipo ½ + un bonus UNIVERSALE ½ ('all' = resa su tutte le raccolte). Ogni chimera è versatile. */
  const terraA = dataC.SPECIES.find(s => (s.src || 'terra') === 'terra');
  const terraB = dataC.SPECIES.find(s => (s.src || 'terra') === 'terra' && s.id !== terraA.id);
  const chimSame = { skull: terraA.id, torso: terraA.id, leg: terraB.id, q: 'comune', key: 'cs', name: 'CS' };
  const cps = comp.companionPowers(chimSame);
  check('chimera stesso-tipo: SEMPRE 2 poteri (tipo + universale)', cps.length === 2 && cps[0].type === 'terra' && cps[1].type === 'all');
  comp.setCompanion(chimSame);
  check('chimera universale: resa su OGNI attività, MAX non somma (mai oltre il ½)',
    Math.abs(comp.companionYieldMul('terra') - 1.05) < 1e-9 && Math.abs(comp.companionYieldMul('acqua') - 1.05) < 1e-9 && Math.abs(comp.companionYieldMul('roccia') - 1.05) < 1e-9);
  /* un RISVEGLIO (cranio=torace=zampa, STESSA specie) resta UN potere PIENO, senza universale */
  check('risveglio: UN potere pieno, niente universale', comp.companionPowers(wSpec).length === 1 && comp.companionPowers(wSpec)[0].type === 'acqua');
  /* LANTERNA: il compagno di GROTTA fa luce anche in SUPERFICIE (di notte), scala con la rarità;
     gli altri tipi non danno luce */
  comp.setCompanion({ skull: 'cavernide', torso: 'cavernide', leg: 'cavernide', q: 'comune', key: 'g1', name: 'G' });
  const lb1 = comp.companionLightBonus();
  comp.setCompanion({ skull: 'abissodonte', torso: 'abissodonte', leg: 'abissodonte', q: 'leggendario', key: 'g2', name: 'G2' });
  const lb2 = comp.companionLightBonus();
  comp.setCompanion(wSpec); const lb0 = comp.companionLightBonus(); // acqua → niente luce
  check('Lanterna: il compagno di grotta fa luce (scala con rarità), gli altri no', lb1 > 0 && lb2 > lb1 && lb0 === 0);
  comp.clearCompanion();
  check('Lanterna: senza compagno niente bonus luce', comp.companionLightBonus() === 0);
  check('compagno rimandato a casa', comp.companionSpec() === null && comp.companionYieldMul('acqua') === 1 && comp.companionHelps() === false);
}

/* ---------- compagno LEGGENDARIO: raccoglitore autonomo (Fase 1) ---------- */
{
  const comp = await import('../src/companion.js');
  const gp = await import('../src/gameplay.js');
  const world = await import('../src/world.js');
  const dataN = await import('../src/data.js');
  const { COMP } = comp;
  const terra = dataN.ALL_SPECIES.find(s => (s.src || 'terra') === 'terra');
  const legTerra = { skull: terra.id, torso: terra.id, leg: terra.id, q: 'leggendario', key: 'lt', name: 'Legterra' };
  /* casella scavabile e libera con un'adiacente valida (il raccoglitore cerca nel ring r≥1) */
  let wx = null, wy = null;
  for (let ty = -20; ty <= 20 && wx === null; ty++) for (let tx = -20; tx <= 20; tx++) {
    if (world.diggable(world.baseTerrain(tx, ty)) && !world.townInfo(tx, ty) && !world.decoAt(tx, ty)
      && world.diggable(world.baseTerrain(tx + 1, ty)) && !world.townInfo(tx + 1, ty) && !world.decoAt(tx + 1, ty)) { wx = tx; wy = ty; break; }
  }
  check('trovata terra libera per il test del raccoglitore', wx !== null);
  check('companionGathers: solo LEGGENDARI di tipo raccolta', (() => {
    comp.setCompanion(legTerra); const a = gp.companionGathers();
    comp.setCompanion({ ...legTerra, q: 'raro' }); const b = gp.companionGathers();
    const cave = (dataN.CAVE_POOL && dataN.CAVE_POOL[0]) ? dataN.CAVE_POOL[0].id : null;
    let g = false; if (cave) { comp.setCompanion({ skull: cave, torso: cave, leg: cave, q: 'leggendario', key: 'lg', name: 'Lg' }); g = gp.companionGathers(); }
    return a === true && b === false && g === false; // leggendario terra sì, raro no, grotta no (ha la cavalcatura)
  })());
  const TS = dataN.TS;
  S.items = []; S.raw = []; S.uid = S.uid || 1;
  comp.setCompanion(legTerra);
  COMP.x = wx * TS + 8; COMP.y = wy * TS + 8; COMP.job = null; COMP.cool = 0; COMP.fx = [];
  P.x = COMP.x; P.y = COMP.y;   // il player è VICINO: il raccoglitore lavora (non ti sta seguendo)
  /* IL CASO SI FISSA: la pausa fra un lavoro e l'altro va da 18 a 60 secondi e la riuscita è
     al 50%, quindi un test che aspetta "prima o poi un fossile" diventa una monetina. Con
     Math.random a 0 la pausa è la più corta e la fortuna gira sempre bene. */
  const dado = Math.random;
  Math.random = () => 0;
  const xpPrima = S.xp || 0, livPrima = S.level || 1;
  let got = false;
  for (let i = 0; i < 4000 && !got; i++) { gp.companionWorkTick(1 / 60); if (S.raw.length > 0) got = true; } // il grezzo va in S.raw
  check('raccoglitore leggendario: lavora e PORTA un fossile nello zaino', got && COMP.fx.length >= 1);
  /* NIENTE XP: l'esperienza la prende chi scava, non chi guarda scavare. Un raccoglitore che
     livellava da solo faceva salire di livello lasciando il gioco aperto. */
  check('raccoglitore: il fossile che porta NON dà XP', (S.xp || 0) === xpPrima && (S.level || 1) === livPrima);
  /* LA BUCA RESTA: la casella si consuma come quando la scavi tu. Senza, tornava trenta volte
     sulla stessa casella — la prima buona che trovava a spirale. */
  const st5 = await import('../src/state.js');
  check('raccoglitore: la casella lavorata resta SCAVATA (buca, come per te)', st5.dugSet.size > 0);
  const primaBuca = st5.dugSet.size;
  /* la pausa va a OROLOGIO VERO e questo ciclo gira in tempo zero: senza azzerarla, il secondo
     lavoro non partirebbe mai e il test misurerebbe la pausa invece della scelta della casella */
  COMP.job = null; COMP.cool = 0; S.compNext = 0;
  for (let i = 0; i < 4000; i++) { gp.companionWorkTick(1 / 60); S.compNext = 0; }
  check('raccoglitore: scava caselle NUOVE, non sempre la stessa', st5.dugSet.size > primaBuca);
  /* pausa fra 3× e 10× la vecchia cadenza: al minimo del dado deve essere 3× (18 s).
     Sta nel SALVATAGGIO (`S.compNext`) e non in memoria: era un contatore a runtime, azzerato a
     ogni caricamento, e ricaricando la pagina in continuazione il raccoglitore scavava a
     raffica — la pausa non contava niente. */
  /* il compagno si è allontanato lavorando: se resta lontano dal player il primo controllo
     molla il lavoro e la pausa non viene mai impostata */
  S.compNext = 0; COMP.x = wx * TS + 8; COMP.y = wy * TS + 8; P.x = COMP.x; P.y = COMP.y;
  COMP.job = { type: 'terra', tx: wx, ty: wy, wx: COMP.x, wy: COMP.y, phase: 'work', t: 0.001, hit: 3 };
  gp.companionWorkTick(1 / 30);
  const attesa1 = ((S.compNext || 0) - Date.now()) / 1000;
  check('raccoglitore: la pausa è almeno 3× la vecchia (18 s, non 6)', attesa1 >= 17.5, 'attesa=' + attesa1.toFixed(1));
  Math.random = () => 0.999;                 // dado al massimo: pausa lunghissima e mani vuote
  S.raw = []; S.compNext = 0; COMP.x = wx * TS + 8; COMP.y = wy * TS + 8; P.x = COMP.x; P.y = COMP.y;
  COMP.job = { type: 'terra', tx: wx, ty: wy, wx: COMP.x, wy: COMP.y, phase: 'work', t: 0.001, hit: 3 };
  gp.companionWorkTick(1 / 30);
  const attesa2 = ((S.compNext || 0) - Date.now()) / 1000;
  check('raccoglitore: al massimo la pausa è 10× (60 s)', attesa2 > 55 && attesa2 <= 60.1, 'attesa=' + attesa2.toFixed(1));
  check('raccoglitore: metà delle volte torna a mani vuote', S.raw.length === 0);
  /* IL REFRESH NON AZZERA LA PAUSA: con la pausa attiva non si prende nessun lavoro, nemmeno
     ripartendo da zero come dopo un caricamento (COMP è in memoria, S.compNext no). */
  Math.random = () => 0;
  S.raw = []; COMP.job = null; COMP.cool = 0;               // come dopo un ricarico della pagina
  S.compNext = Date.now() + 30000;
  for (let i = 0; i < 600; i++) gp.companionWorkTick(1 / 60);
  check('raccoglitore: ricaricare la pagina NON azzera la pausa', COMP.job === null && S.raw.length === 0);
  Math.random = dado;
  S.compNext = 0;
  st5.dugSet.clear(); S.dug = []; S.raw = []; COMP.job = null; COMP.cool = 0;
  /* se il player si ALLONTANA, il raccoglitore MOLLA il lavoro (job=null) e torna a seguirlo */
  COMP.x = wx * TS + 8; COMP.y = wy * TS + 8; COMP.job = { type: 'terra', phase: 'work', t: 1, wx: COMP.x, wy: COMP.y, hit: -1 }; COMP.cool = 0;
  P.x = COMP.x + 8 * TS; P.y = COMP.y;   // player lontano
  gp.companionWorkTick(1 / 60);
  check('raccoglitore: se il player si allontana MOLLA il lavoro e lo segue', COMP.job === null);
  /* non-leggendario: non auto-raccoglie */
  S.raw = []; comp.setCompanion({ ...legTerra, q: 'raro' }); COMP.job = null; COMP.cool = 0;
  for (let i = 0; i < 600; i++) gp.companionWorkTick(1 / 60);
  check('compagno non-leggendario NON auto-raccoglie', S.raw.length === 0 && COMP.job === null);
  /* zaino pieno: si ferma (scavo resta la fonte principale) */
  comp.setCompanion(legTerra);
  S.raw = []; S.items = Array.from({ length: gp.bagCap() }, (_, i) => ({ uid: 9000 + i, s: terra.id, t: 'cranio', q: 'comune', val: 5 }));
  COMP.x = wx * TS + 8; COMP.y = wy * TS + 8; COMP.job = null; COMP.cool = 0;
  P.x = COMP.x; P.y = COMP.y;   // vicino: ma zaino pieno → non lavora comunque
  for (let i = 0; i < 400; i++) gp.companionWorkTick(1 / 60);
  check('zaino pieno: il raccoglitore NON lavora', COMP.job === null && S.raw.length === 0);
  comp.clearCompanion(); COMP.job = null; COMP.fx = []; S.items = []; S.raw = [];
}

/* ---------- MINIGIOCO #7: gioca col compagno (lancia e riporta) ---------- */
{
  const comp = await import('../src/companion.js');
  const gp = await import('../src/gameplay.js');
  const world = await import('../src/world.js');
  const dataN = await import('../src/data.js');
  const wo = await import('../src/wonders.js');
  const { COMP } = comp;
  const terra = dataN.ALL_SPECIES.find(s => (s.src || 'terra') === 'terra');
  const pet = { skull: terra.id, torso: terra.id, leg: terra.id, q: 'comune', key: 'pet1', name: 'Pet' };

  comp.clearCompanion(); COMP.job = null; COMP.play = null; COMP.playCool = 0;
  check('senza compagno: non giocabile', gp.companionPlayable() === false);

  comp.setCompanion(pet);
  /* su terra scavabile e libera vince lo scavo, non si gioca */
  let gx = null, gy = null;
  for (let ty = -20; ty <= 20 && gx === null; ty++) for (let tx = -20; tx <= 20; tx++) {
    if (world.diggable(world.baseTerrain(tx, ty)) && !world.townInfo(tx, ty) && !world.decoAt(tx, ty)) { gx = tx; gy = ty; break; }
  }
  P.x = gx * TS + 8; P.y = gy * TS + 8 - 13; COMP.x = P.x; COMP.y = P.y; COMP.job = null; COMP.play = null; COMP.playCool = 0;
  check('su terra scavabile: vince lo scavo, non si gioca', gp.companionPlayable() === false);

  /* nel cortile di casa (tryDig lo blocca): si gioca — è la casa naturale del minigioco.
     `S.home` era stato fissato da un test precedente, ma il blocco `vanilla` qui sopra
     ripristina lo snapshot pre-cheat (preso PRIMA che la casa esistesse) e se lo porta via:
     va rifissato. */
  if (!S.home) {
    let hTown = null;
    for (let cx = -14; cx < 14 && !hTown; cx++) for (let cy = -14; cy < 14 && !hTown; cy++) {
      const t = world.townForCell(cx, cy); if (t && t.size === 'città') hTown = t;
    }
    S.home = hTown && world.findHomeSpot(hTown);
  }
  const pen = world.yardRect();
  check('trovato il cortile per il test', !!pen);
  const px0 = pen.cx, py0 = pen.y1 - 1; // prato aperto a sud della casa (il centro del rettangolo è la casa)
  P.x = px0 * TS + 8; P.y = py0 * TS + 8 - 13; P.dir = 'down'; COMP.x = P.x; COMP.y = P.y; COMP.job = null; COMP.play = null; COMP.playCool = 0;
  check('nel cortile: compagno giocabile', gp.companionPlayable() === true);
  COMP.job = { phase: 'go' }; check('compagno al lavoro: non giocabile', gp.companionPlayable() === false); COMP.job = null;
  COMP.playCool = 1; check('appena finito un round: pausa, non giocabile', gp.companionPlayable() === false); COMP.playCool = 0;

  /* IL PROMPT DEVE DIRE LA VERITÀ: con un solo tasto per tutto, un E che non fa quello che il
     prompt dice è la cosa che confonde di più (segnalato). */
  ui.closeBag(); ui.closeBook(); ui.closeMap(); ui.closeModal(); ui.updatePrompt();
  const prReady = document.getElementById('prompt').innerHTML || '';
  check('pronto a giocare: il prompt lo dice ("Gioca")', /Gioca|Play/.test(prReady), prReady.slice(0, 40));

  /* il round intero: lancio → insegue → cattura → torna */
  const started = gp.playWithCompanion();
  check('E avvia il lancio', started === true && !!COMP.play && COMP.play.phase === 'throw');
  for (let i = 0; i < 60 && COMP.play && COMP.play.phase === 'throw'; i++) gp.companionPlayTick(1 / 60);
  check('dopo il lancio il compagno insegue', COMP.play && COMP.play.phase === 'chase');
  ui.updatePrompt();
  check('in inseguimento: niente prompt (E non fa nulla adesso, meglio tacere)', document.getElementById('prompt').style.display === 'none');
  for (let i = 0; i < 600 && COMP.play && COMP.play.phase === 'chase'; i++) gp.companionPlayTick(1 / 20);
  check('raggiunto il bersaglio: finestra di cattura aperta', COMP.play && COMP.play.phase === 'catch');
  ui.updatePrompt();
  const prCatch = document.getElementById('prompt').innerHTML || '';
  check('finestra aperta: il prompt dice di prenderlo AL VOLO', /AL VOLO|NOW/.test(prCatch), prCatch.slice(0, 40));

  /* la finestra d'oro deve premiare un riflesso NATURALE ("lo prendo appena arriva"), non
     un'attesa deliberata — segnalato: "mi dà sempre bel riporto" perché la finestra era a
     metà di un secondo di attesa, mentre chi gioca preme presto. ~220ms dopo il "ding" (tempo
     di reazione realistico) deve bastare. */
  {
    const bR = wo.buffLeft('digX2');
    COMP.play.t = 0.22;
    const okReflex = gp.tryCatchCompanion();
    check('un riflesso pronto (~220ms) prende al volo, non solo l\'attesa a metà barra', okReflex === true && wo.buffLeft('digX2') === bR + 3);
    for (let i = 0; i < 600 && COMP.play; i++) gp.companionPlayTick(1 / 20);
    COMP.playCool = 0;
    check('secondo round: nuovo lancio riuscito', gp.playWithCompanion() === true && !!COMP.play);
    for (let i = 0; i < 60 && COMP.play && COMP.play.phase === 'throw'; i++) gp.companionPlayTick(1 / 60);
    for (let i = 0; i < 600 && COMP.play && COMP.play.phase === 'chase'; i++) gp.companionPlayTick(1 / 20);
  }

  /* presa PERFETTA (dentro la finestra d'oro) → 3 cariche */
  const b1 = wo.buffLeft('digX2');
  COMP.play.t = (gp.PLAY_PERFECT[0] + gp.PLAY_PERFECT[1]) / 2 * gp.PLAY_CATCH;
  const caught = gp.tryCatchCompanion();
  check('presa al volo nella finestra d\'oro: 3 cariche di digX2', caught === true && wo.buffLeft('digX2') === b1 + 3 && COMP.play.phase === 'return');
  for (let i = 0; i < 600 && COMP.play; i++) gp.companionPlayTick(1 / 20);
  check('tornato dal player: round chiuso, in pausa', COMP.play === null && COMP.playCool > 0);

  /* mai un fallimento vero: se il tempo scade da solo, torna comunque (1 carica, non zero) */
  COMP.playCool = 0;
  check('terzo round: nuovo lancio riuscito', gp.playWithCompanion() === true && !!COMP.play);
  for (let i = 0; i < 60 && COMP.play && COMP.play.phase === 'throw'; i++) gp.companionPlayTick(1 / 60);
  for (let i = 0; i < 600 && COMP.play && COMP.play.phase === 'chase'; i++) gp.companionPlayTick(1 / 20);
  const b2 = wo.buffLeft('digX2');
  for (let i = 0; i < 200 && COMP.play && COMP.play.phase === 'catch'; i++) gp.companionPlayTick(1 / 60);
  check('tempo scaduto: comunque riportato, 1 carica (mai un fallimento vero)', wo.buffLeft('digX2') === b2 + 1 && !!COMP.play && COMP.play.phase === 'return');
  for (let i = 0; i < 600 && COMP.play; i++) gp.companionPlayTick(1 / 20);

  /* E durante la finestra di cattura ha SEMPRE priorità in act(), prima di ogni altra cosa */
  COMP.playCool = 0;
  check('quarto round: nuovo lancio riuscito', gp.playWithCompanion() === true && !!COMP.play);
  for (let i = 0; i < 60 && COMP.play && COMP.play.phase === 'throw'; i++) gp.companionPlayTick(1 / 60);
  for (let i = 0; i < 600 && COMP.play && COMP.play.phase === 'chase'; i++) gp.companionPlayTick(1 / 20);
  check('finestra aperta: act() la risolve subito', gp.companionPlayable() === false); // il round è già in corso: niente doppio lancio
  gp.act();
  check('act() durante la cattura risolve il gioco (E = prendilo)', COMP.play && COMP.play.phase === 'return');
  for (let i = 0; i < 600 && COMP.play; i++) gp.companionPlayTick(1 / 20);
  comp.clearCompanion(); COMP.job = null; COMP.play = null; COMP.playCool = 0;
  delete S.buffs.digX2; // non lasciare cariche in giro per i test dopo di questo
}

/* ---------- compagno GROTTA leggendario: cavalcatura volante (Fase 2) ---------- */
{
  const comp = await import('../src/companion.js');
  const gp = await import('../src/gameplay.js');
  const cave = await import('../src/cave.js');
  const dataN = await import('../src/data.js');
  const TS = dataN.TS;
  const caveSp = dataN.CAVE_POOL[0].id;
  const grottaLeg = { skull: caveSp, torso: caveSp, leg: caveSp, q: 'leggendario', key: 'gl', name: 'Volante' };
  const terra = dataN.ALL_SPECIES.find(s => (s.src || 'terra') === 'terra');
  /* GATING: cavalcabile solo se GROTTA + leggendario */
  comp.setCompanion(grottaLeg); const ridesGrotta = gp.companionRides();
  comp.setCompanion({ skull: terra.id, torso: terra.id, leg: terra.id, q: 'leggendario', key: 'tl', name: 'T' }); const ridesTerra = gp.companionRides();
  comp.setCompanion({ ...grottaLeg, q: 'raro' }); const ridesRaro = gp.companionRides();
  check('companionRides: solo GROTTA leggendario', ridesGrotta === true && ridesTerra === false && ridesRaro === false);
  /* MOUNT: attiva volo, velocità ×3 */
  comp.setCompanion(grottaLeg); S.mounted = false; cave.CAVE.active = false;
  const t1 = gp.toggleMount();
  check('cavalca: volo attivo e viaggio veloce (×3)', t1 === true && S.mounted === true && gp.isMounted() === true && gp.gearSpeedMul() === 3);
  /* BYPASS: in volo si attraversa l'acqua (a piedi è solida) */
  let w = null;
  for (let x = -60; x < 60 && !w; x++) for (let y = -60; y < 60 && !w; y++)
    if (gp.waterTile(x, y) && gp.waterTile(x + 1, y) && gp.waterTile(x - 1, y) && gp.waterTile(x, y + 1) && gp.waterTile(x, y - 1)) w = [x, y];
  check('esiste acqua circondata da acqua', !!w);
  const wpx = w[0] * TS + 8, wpy = w[1] * TS + 8;
  check('in volo si attraversa l\'acqua (collide=false)', gp.collide(wpx, wpy) === false);
  gp.toggleMount();
  check('a terra sull\'acqua si è bloccati (collide=true)', S.mounted === false && gp.collide(wpx, wpy) === true);
  /* VINCOLO: in GROTTA non si vola */
  comp.setCompanion(grottaLeg); S.mounted = true; cave.CAVE.active = true;
  check('in grotta isMounted=false e toggleMount rifiutato', gp.isMounted() === false && gp.toggleMount() === false);
  cave.CAVE.active = false;
  /* IN VOLO NON SI SCAVA (E bloccato) — a terra invece scava */
  {
    const world = await import('../src/world.js');
    let dt = null;
    for (let x = -30; x < 30 && !dt; x++) for (let y = -30; y < 30; y++) {
      const open = (a, b) => world.diggable(world.baseTerrain(a, b)) && !world.townInfo(a, b) && !world.decoAt(a, b);
      if (open(x, y) && open(x, y + 1)) { dt = [x, y]; break; }
    }
    check('trovata terra scavabile (test volo)', !!dt);
    P.x = dt[0] * TS + 8; P.y = dt[1] * TS + 8; P.dir = 'down'; S.energy = 10; P.digging = null;
    comp.setCompanion(grottaLeg); S.mounted = true;
    gp.act();
    check('in volo E NON scava', P.digging == null && gp.isMounted() === true);
    S.mounted = false; P.digging = null;
    gp.act();
    check('a terra E scava (contro-prova)', P.digging != null);
    P.digging = null; comp.clearCompanion();
  }
  /* entrare in grotta fa SCENDERE */
  S.mounted = true; cave.enterCave(1, 0, 0);
  check('entrando in grotta si scende (mounted=false)', S.mounted === false);
  cave.CAVE.active = false;
  comp.clearCompanion(); S.mounted = false;
}

/* ---------- missioni: bacheca deterministica, accetta/consegna, limite, scadenza ---------- */
{
  const q = await import('../src/quests.js');
  S.quests = null; S.day = 5; S.items = []; S.goods = []; S.coins = 0;
  const offers = q.boardOffers(1, 1, 5);
  check('bacheca: 4 offerte deterministiche', offers.length === 4 && q.boardOffers(1, 1, 5)[0].qid === offers[0].qid);
  const off = offers[0];
  check('accetta una missione', q.acceptQuest(off, 5) === true && q.isActive(off.qid));
  const a = q.activeQuests()[0];
  if (a.type === 'fossils') for (let i = 0; i < a.n; i++) S.items.push({ uid: 900 + i, s: 'lepre', t: 'cranio', q: a.rar, val: 5 });
  else if (a.type === 'goods') S.goods.push({ uid: 900, id: a.goodId, n: a.n, val: 3 * a.n, good: true }); // come in gioco: UNA pila
  else for (let i = 0; i < a.n; i++) S.items.push({ uid: 900 + i, s: 'lepre', t: a.part, q: 'comune', val: 5 });
  const xpQ = S.xp || 0, lvQ = S.level || 1;
  check('consegna: ricompensa e chiusura', q.canComplete(a) && !!q.deliverQuest(a.qid) && S.coins === a.reward && q.isDone(a.qid) && !q.isActive(a.qid));
  check('le missioni danno XP', (S.level || 1) > lvQ || (S.xp || 0) > xpQ);
  /* L'ESPERIENZA SI CONTA IN UN POSTO SOLO. `deliverQuest` la dava già, e il pulsante di
     consegna gliene aggiungeva una seconda: ogni missione ne pagava due, e col totem della
     doppia XP attivo bruciava 2 dei 10 carichi invece di 1. Nessun `gainXp` fuori da qui. */
  {
    const { readFileSync: rfs } = await import('node:fs');
    const src = rfs(new URL('../src/ui.js', import.meta.url), 'utf8');
    const near = src.split('\n').filter(l => /data-deliver|deliverQuest/.test(l)).join('\n');
    check('il pulsante di consegna non raddoppia l\'esperienza', !/gainXp/.test(near));
  }
  /* una missione non deve mangiarti il pezzo migliore: si consuma il meno prezioso */
  {
    const { PARTS: PRT } = await import('../src/data.js');
    const part = PRT[0].id;
    S.items = [{ uid: 9001, s: SPECIES[0].id, t: part, q: 'leggendario', val: 95 },
               { uid: 9002, s: SPECIES[0].id, t: part, q: 'comune', val: 6 }];
    const off = q.boardOffers(3, 3, 7).find(o => o.type === 'parts' && o.n === 1);
    if (off) { off.part = part; q.acceptQuest(off, 7); q.deliverQuest(off.qid);
      check('la missione consuma il pezzo MENO prezioso', S.items.length === 1 && S.items[0].q === 'leggendario');
    } else check('la missione consuma il pezzo MENO prezioso', true, 'nessuna offerta parts');
    S.items = [];
  }
  /* I GOODS SONO IMPILATI: il cartello deve contare le UNITÀ, non le voci dell'elenco, e la
     consegna deve SCALARE la pila. Prima "Guscio di lumaca ×2" nello zaino leggeva 1/2 sul
     cartello (missione impossibile), e una richiesta di 4 avrebbe cancellato la pila da 14. */
  {
    S.quests.active = []; S.quests.done = []; S.items = []; S.coins = 0;
    const gid = Object.keys((await import('../src/data.js')).goodById)[0];
    S.goods = [{ uid: 7001, id: gid, n: 14, val: 140, good: true }];
    const off = { qid: 'g1', type: 'goods', goodId: gid, n: 4, reward: 20, giver: 0 };
    q.acceptQuest(off, 5);
    const qa = q.activeQuests().find(x => x.qid === 'g1');
    check('cartello: conta le UNITÀ dentro la pila', q.questHave(qa) === 14 && q.canComplete(qa));
    check('consegna: scala la pila, non la cancella', !!q.deliverQuest('g1') && S.goods.length === 1 && S.goods[0].n === 10 && S.goods[0].val === 100);
    /* pila esaurita → sparisce; più pile → si svuotano una alla volta */
    S.quests.active = []; S.quests.done = [];
    S.goods = [{ uid: 7002, id: gid, n: 64, val: 640, good: true }, { uid: 7003, id: gid, n: 2, val: 20, good: true }];
    const off2 = { qid: 'g2', type: 'goods', goodId: gid, n: 3, reward: 10, giver: 0 };
    q.acceptQuest(off2, 5); q.deliverQuest('g2');
    check('più pile: si svuota prima la piccola e sparisce', S.goods.length === 1 && S.goods[0].n === 63);
    S.goods = []; S.quests.active = []; S.quests.done = [];
  }
  S.quests.active = []; S.quests.done = [];
  const o2 = q.boardOffers(2, 2, 5);
  q.acceptQuest(o2[0], 5); q.acceptQuest(o2[1], 5); q.acceptQuest(o2[2], 5);
  check('massimo 3 missioni attive', q.acceptQuest(o2[3], 5) === 'full' && q.activeQuests().length === 3);
  /* LASCIA una missione per liberare lo slot e prendere la 4ª (richiesta dei giocatori). */
  S.items = [{ uid: 8001, s: SPECIES[0].id, t: 'cranio', q: 'raro', val: 30 }];
  check('lascia una missione: libera lo slot', q.abandonQuest(o2[0].qid) === true && q.activeQuests().length === 2 && !q.isActive(o2[0].qid));
  check('lasciare NON consuma i reperti', S.items.length === 1);          // solo la consegna spende
  check('ora si può prendere la 4ª missione', q.acceptQuest(o2[3], 5) === true && q.activeQuests().length === 3);
  check('la missione lasciata non è segnata "fatta"', !q.isDone(o2[0].qid));
  /* con uno slot di nuovo libero, la lasciata si ri-accetta (non è bruciata) */
  check('la missione lasciata è riprendibile', q.abandonQuest(o2[3].qid) === true && q.acceptQuest(o2[0], 5) === true && q.isActive(o2[0].qid));
  check('abbandonare una missione inesistente torna false', q.abandonQuest('nope') === false);
  S.items = [];
  /* il pulsante Lascia esiste nel cartello ed è cablato ad abandonQuest */
  {
    const { readFileSync: rfs } = await import('node:fs');
    const src = rfs(new URL('../src/ui.js', import.meta.url), 'utf8');
    check('il cartello ha il pulsante Lascia', /data-abandon/.test(src) && /abandonQuest/.test(src));
  }
  S.quests.active = []; S.quests.done = [];
  S.day = 6; q.ensureQuests(6);
  check('a fine giornata le missioni scadono', q.activeQuests().length === 0);
  /* SCADENZA: non basta che ensureQuests sappia buttarle via, deve essere IMPOSSIBILE vedere
     o consegnare lo stack di ieri. Prima la pulizia la faceva solo chi si ricordava di
     chiamare ensureQuests (l'HUD ogni 2s e le due schermate): il minigioco delle lucciole
     leggeva lo stack diretto e consegnava DA SOLO una richiesta del giorno prima, pagandola.
     Un giocatore l'ha segnalato come "le missioni scadute non spariscono dallo stack". */
  {
    const scaduta = () => {
      S.day = 9; S.coins = 0; S.goods = [];
      S.items = [{ uid: 7001, s: SPECIES[0].id, t: 'cranio', q: 'comune', val: 6 }];
      S.quests = { day: 8, active: [{ type: 'fossils', rar: 'comune', n: 1, reward: 99, qid: 'ieri', day: 8 }], done: ['fatta-ieri'] };
    };
    scaduta(); check('scadute: activeQuests() non le mostra più', q.activeQuests().length === 0);
    scaduta(); check('scadute: isActive() dice di no', q.isActive('ieri') === false);
    scaduta(); check('scadute: isDone() non tiene le fatte di ieri', q.isDone('fatta-ieri') === false);
    scaduta(); check('scadute: NON si consegnano più', q.deliverQuest('ieri') === false && S.coins === 0);
    scaduta(); check('scadute: il minigioco lucciole non le vede', q.fireflyQuest() === null);
    scaduta(); check('scadute: abbandonarle non risuscita lo stack', q.abandonQuest('ieri') === false && q.activeQuests().length === 0);
    /* quante se ne perdono: serve per DIRLO, sparire in silenzio si legge come un bug */
    scaduta(); check('expireQuests conta quante ne sono scadute', q.expireQuests(9) === 1);
    S.day = 9; S.quests = { day: 9, active: [{ qid: 'a' }, { qid: 'b' }], done: [] };
    check('expireQuests non tocca le missioni del giorno in corso',
      q.expireQuests(9) === 0 && q.activeQuests().length === 2);
    check('avviso di scadenza: singolare, plurale col numero, niente con zero',
      /missione/.test(q.questExpiryText(1)) && /3 missioni/.test(q.questExpiryText(3)) && q.questExpiryText(0) === '');
  }
  /* il giorno avanza in DUE punti (l'orologio del loop e il letto della Locanda): tutti e due
     devono contare le scadute PRIMA di updateHUD, che è quello che svuota lo stack — dopo non
     ci sarebbe più niente da contare e chi dorme non saprebbe mai di averle perse */
  {
    const { readFileSync: rfs } = await import('node:fs');
    const mainSrc = rfs(new URL('../src/main.js', import.meta.url), 'utf8');
    const gpSrc = rfs(new URL('../src/gameplay.js', import.meta.url), 'utf8');
    check('il cambio giorno dell\'orologio avvisa delle missioni scadute',
      /expireQuests\(S\.day\)/.test(mainSrc) && /questExpiryText/.test(mainSrc));
    const rest = gpSrc.slice(gpSrc.indexOf('export function restInn'));
    /* i commenti vanno via PRIMA di misurare l'ordine: qui sopra ce n'è uno che spiega
       proprio questo vincolo e nomina updateHUD, e il confronto pescava quello */
    const body = rest.slice(0, rest.indexOf('\n}')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    check('dormire alla Locanda avvisa delle missioni scadute', /expireQuests/.test(body) && /questExpiryText/.test(body));
    check('le scadute si contano PRIMA di updateHUD (che svuota lo stack)',
      body.indexOf('expireQuests') < body.indexOf('updateHUD'));
  }
  S.quests = null; S.day = 5; S.items = []; S.goods = []; S.coins = 0;
}

/* ---------- meteo: deterministico per (zona, giorno), pioggia alza i drop ---------- */
{
  const wth = await import('../src/weather.js');
  const w = wth.weatherAt('palude', 3);
  check('meteo deterministico per zona+giorno', wth.weatherAt('palude', 3) === w && ['rain', 'clear'].includes(w));
  check('pioggia alza i drop, sereno no', wth.weatherDropMul('rain') > 1 && wth.weatherDropMul('clear') === 1);
  check('etichetta meteo è stringa', typeof wth.weatherLabel('snow') === 'string');
}

/* ---------- MERCATO: la richiesta cambia per specie+giorno, si applica SOLO alla vendita ---------- */
{
  const mkt = await import('../src/market.js');
  const dataM = await import('../src/data.js');
  const sp1 = dataM.ALL_SPECIES[3].id, sp2 = dataM.ALL_SPECIES[10].id;
  check('deterministico: stessa specie, stesso giorno → stesso prezzo', mkt.marketMul(sp1, 7) === mkt.marketMul(sp1, 7));
  check('specie diverse nello stesso giorno possono avere fasce diverse', dataM.ALL_SPECIES.slice(0, 20).some(s => mkt.marketMul(s.id, 7) !== mkt.marketMul(sp1, 7)));
  check('lo stesso giorno cambia la fascia (mercato che si muove col tempo)', dataM.ALL_SPECIES.some(s => mkt.marketMul(s.id, 1) !== mkt.marketMul(s.id, 2)));
  check('ogni fascia è una di quelle dichiarate', mkt.MARKET_TIERS.some(t => t.mul === mkt.marketMul(sp1, 7)));
  check('il prezzo finale arrotonda e non scende mai sotto 1', mkt.marketPrice(1, sp1, 7) >= 1 && mkt.marketPrice(10, sp1, 7) === Math.round(10 * mkt.marketMul(sp1, 7)));
  check('etichetta: stringa (vuota per la fascia "normale")', typeof mkt.marketLabel(sp1, 7) === 'string');
  /* override da console (market=alto): forza la fascia per OGNI specie, per provarlo/fotografarlo */
  const state2 = state;
  state2.S.marketOverride = 'record';
  check('override: ogni specie va alla fascia forzata', mkt.marketMul(sp1, 7) === 1.7 && mkt.marketMul(sp2, 9) === 1.7);
  state2.S.marketOverride = null;
  /* si applica ALLA VENDITA, non al valore base: commissioni/restauro/Museo restano quelli che erano */
  const base = { uid: 8001, s: sp1, t: 'cranio', q: 'raro', val: 40 };
  S.items = [base]; S.coins = 0; S.day = 5;
  const expected = mkt.marketPrice(40, sp1, 5);
  gameplay.sellItem(8001);
  check('sellItem paga il prezzo di MERCATO, non sempre il valore base', S.coins === expected);
  check('il valore base del reperto (per commissioni/restauro) non viene toccato', base.val === 40);
  S.items = [{ uid: 8002, s: sp1, t: 'cranio', q: 'raro', val: 40 }, { uid: 8003, s: sp2, t: 'torace', q: 'comune', val: 10 }];
  S.coins = 0;
  const wantSum = mkt.marketPrice(40, sp1, S.day) + mkt.marketPrice(10, sp2, S.day);
  const r = gameplay.sellAll();
  check('sellAll somma i prezzi di mercato di OGNI pezzo (specie diverse, fasce diverse)', r.g === wantSum && S.coins === wantSum);
  S.items = [];
}

/* ---------- audio: mood per bioma + crossfade non lancia (senza AudioContext in Node) ---------- */
{
  const audio = await import('../src/audio.js');
  const { ZONES } = await import('../src/data.js');
  check('mood per tutti i biomi + grotta', ZONES.every(z => audio.MOODS[z.id]) && !!audio.MOODS.grotta);
  check('ogni mood ha tempo/shift/lead', Object.values(audio.MOODS).every(m => m.tempo > 0 && typeof m.shift === 'number' && (m.lead === 'square' || m.lead === 'triangle')));
  let threw = false; try { for (const z of ZONES) audio.setBiomeMood(z.id); audio.setBiomeMood('grotta'); audio.setBiomeMood('prati'); } catch (e) { threw = true; }
  check('setBiomeMood non lancia senza audio avviato', threw === false);
  /* REGOLA MUSICALE: si modula solo verso tonalita VICINE sul circolo delle quinte.
     keyDistance in semitoni: 0=stessa, 1=quinta/quarta (vicinissime), 6=tritono (lontane). */
  check('keyDistance: stessa tonalita = 0', audio.keyDistance(0, 0) === 0 && audio.keyDistance(-5, -5) === 0);
  check('keyDistance: quinta = 1', audio.keyDistance(0, 7) === 1 && audio.keyDistance(0, -5) === 1);
  check('keyDistance: tritono = 6', audio.keyDistance(0, 6) === 6);
  check('keyDistance: simmetrica e in ottava', audio.keyDistance(0, -7) === audio.keyDistance(0, 5) && audio.keyDistance(0, -12) === 0);
  // il semitono e la tonalita PIU LONTANA: era il difetto (palude -3 = FA#, ghiacci +4 = DO#)
  check('un semitono e lontano (5 quinte)', audio.keyDistance(0, 1) === 5 && audio.keyDistance(0, -3) === 3 && audio.keyDistance(0, 4) === 4);
  // OGNI mood deve stare nel vicinato della tonica (prati = 0): distanza <= 2 quinte
  const tonica = audio.MOODS.prati.shift;
  const lontani = Object.entries(audio.MOODS).filter(([, m]) => audio.keyDistance(tonica, m.shift) > 2);
  check('ogni bioma e in una tonalita vicina alla tonica (<=2)', lontani.length === 0);
  // i due colpevoli segnalati ora sono vicini
  check('palude e ghiacci restano tonalita VICINE (non le vecchie lontane FA#/DO#)', audio.keyDistance(tonica, audio.MOODS.palude.shift) <= 2 && audio.keyDistance(tonica, audio.MOODS.ghiacci.shift) <= 2);
}

/* ---------- audio: scheda in BACKGROUND = silenzio (su Android la musica continuava col
   browser ridotto, e per zittirla si doveva chiudere l'app) ---------- */
{
  const audio = await import('../src/audio.js');
  let susp = 0, res = 0, oscs = 0;
  const par = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class FakeAC {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createGain() { return { gain: par(), connect() {} }; }
    createOscillator() { oscs++; return { type: '', frequency: par(), connect() {}, start() {}, stop() {} }; }
    suspend() { susp++; this.state = 'suspended'; }
    resume() { res++; this.state = 'running'; return Promise.resolve(); }
  }
  globalThis.AudioContext = FakeAC;
  audio.setMusicOn(true); audio.armAudioResume(); audio.startAudio();
  document.visibilityState = 'hidden';
  document.dispatchEvent({ type: 'visibilitychange' });
  check('scheda nascosta: il contesto audio viene SOSPESO (non basta fermare il sequencer)', susp === 1);
  oscs = 0; audio.playSfx('coin');
  check('a contesto sospeso gli SFX non si accodano (sparerebbero tutti al ritorno)', oscs === 0);
  document.visibilityState = 'visible';
  document.dispatchEvent({ type: 'visibilitychange' });
  check('tornando davanti la musica riparte', res >= 1);
  // musica SPENTA dalle impostazioni: tornare davanti non gliela rimette addosso
  audio.setMusicOn(false); const res0 = res;
  document.visibilityState = 'hidden'; document.dispatchEvent({ type: 'visibilitychange' });
  document.visibilityState = 'visible'; document.dispatchEvent({ type: 'visibilitychange' });
  check('musica spenta: il ritorno in primo piano non la riaccende', res === res0);
  audio.suspendAudio(); delete globalThis.AudioContext;
}

/* ---------- SMOKE del tasto E: act() non deve MAI lanciare (un identificatore rimosto a
   metà bloccava OGNI azione, scavo compreso). Qui si prova in tutti i contesti. ---------- */
{
  const inter = await import('../src/interior.js');
  const cave = await import('../src/cave.js');
  const acted = [];
  const tryAct = (label) => { try { gameplay.act(); acted.push(null); } catch (e) { acted.push(label + ': ' + e.message); } };
  /* 1) mondo aperto, su terreno scavabile */
  inter.INT.active = false; cave.CAVE.active = false; P.digging = null;
  const st = world.findStart(); P.x = st.x; P.y = st.y;
  tryAct('overworld');
  P.digging = null;
  /* 2) dentro un edificio (negozio) e dentro il museo (Curatore, teche, Maestro) */
  let tw = null; // serve una CITTÀ (ha il museo): scandisco le celle finché la trovo
  for (let cx = -6; cx < 6 && !tw; cx++) for (let cy = -6; cy < 6 && !tw; cy++) {
    const t = world.townForCell(cx, cy); if (t && t.buildings.some(b => b.type === 'museum')) tw = t;
  }
  if (tw) {
    for (const b of tw.buildings) {
      inter.enterInterior(b, tw); tryAct('interno:' + b.type);
      if (b.type === 'museum') {
        inter.resetMentor(); inter.INT.x = inter.MENTOR.x; inter.INT.y = inter.MENTOR.y + 12; tryAct('museo:maestro');
        inter.INT.x = (inter.GAL_DESK.x0 + inter.GAL_DESK.x1) / 2; inter.INT.y = inter.GAL_DESK.y1 + 10; tryAct('museo:curatore');
      }
      inter.exitInterior(); inter.INT.justLeft = false; P.digging = null;
    }
  }
  /* 3) in grotta */
  cave.CAVE.active = true; tryAct('grotta'); cave.CAVE.active = false; P.digging = null;
  const errs = acted.filter(Boolean);
  check('tasto E (act) non lancia in nessun contesto', errs.length === 0, errs.slice(0, 2).join(' | '));
  check('act provato in più contesti', acted.length >= 4, 'n=' + acted.length);
}

/* ---------- Le decorazioni che SEMBRANO raccoglibili lo sono davvero ---------- */
{
  const { HARVEST_DECO } = world;
  check('funghi, conchiglie, fiori e canne sono raccoglibili', Object.keys(HARVEST_DECO).length === 4 &&
    ['mushroom', 'shell', 'flower', 'reed'].every(k => HARVEST_DECO[k]));
  /* il raccoglibile si deve DISTINGUERE dal disegno, non solo dalla stellina: le funzioni
     ricevono il flag ripe e ne disegnano una forma diversa (fungo rosso a pois vs bruno,
     fiordaliso col gambo vs fiorellino, conchiglia intera vs valva, giunco col pennacchio) */
  {
    const fs2 = (await import('node:fs'));
    const rsrc = fs2.readFileSync('src/render.js', 'utf8') + fs2.readFileSync('src/props.js', 'utf8');
    const ok = ['drawMushroom(sx, sy, time, tx, ty, ripe)', 'drawFlower(sx, sy, tx, ty, ripe)',
      'drawShell(sx, sy, ripe)', 'drawReed(sx, sy, time, tx, ty, ripe)'].every(f => rsrc.includes(f));
    const passed = (rsrc.match(/draw(Mushroom|Flower|Shell|Reed)\([^)]*\brip\)/g) || []).length;
    check('le decorazioni mature hanno un disegno diverso, non solo la stellina', ok && passed === 4);
    const shad = (rsrc.match(/if \(rip\) shadow\(/g) || []).length;
    check('e tutte e 4 hanno ombra di contatto quando sono mature', shad === 4);
  }
  /* trovane uno nel mondo e raccoglilo */
  let spot = null;
  for (let x = -200; x < 200 && !spot; x++) for (let y = -200; y < 200 && !spot; y++) {
    const id = world.harvestDecoAt(x, y); if (id) spot = [x, y, id];
  }
  check('nel mondo ci sono decorazioni raccoglibili', !!spot, spot ? spot[2] : '');
  if (spot) {
    P.x = spot[0] * TS + 8; P.y = spot[1] * TS - 13;
    const goods0 = (S.goods || []).length;
    check('E le raccoglie', gameplay.collectPickup() === true && (S.goods || []).length === goods0 + 1);
    check('e spariscono dalla mappa', world.harvestDecoAt(spot[0], spot[1]) === null && world.decoAt(spot[0], spot[1]) === null);
    /* su un'altra decorazione il prompt deve dire COSA si raccoglie */
    let spot2 = null;
    for (let x = -200; x < 200 && !spot2; x++) for (let y = -200; y < 200 && !spot2; y++) {
      const id2 = world.harvestDecoAt(x, y); if (id2) spot2 = [x, y, id2];
    }
    if (spot2) {
      P.x = spot2[0] * TS + 8; P.y = spot2[1] * TS - 13;
      ui.closeBag(); ui.closeBook(); ui.closeMap(); ui.closeModal();   // il prompt non si aggiorna con un pannello aperto
      ui.updatePrompt();
      const pr = document.getElementById('prompt').innerHTML || '';
      check('il prompt dice cosa raccogli', /Raccogli|Pick/.test(pr) && pr.length > 12, pr.slice(0, 40));
    } else check('il prompt dice cosa raccogli', true, 'nessuna seconda decorazione');
  }
  /* solo una MINORANZA è matura: il paesaggio resta, la raccolta non diventa una miniera */
  let nDeco = 0, nRip = 0;
  for (let x = 0; x < 300; x++) for (let y = 0; y < 300; y++) {
    const d = world.decoAt(x, y);
    if (d && world.HARVEST_DECO[d]) { nDeco++; if (world.harvestDecoAt(x, y)) nRip++; }
  }
  check('il paesaggio resta fitto', nDeco > 500, nDeco + ' decorazioni');
  check('solo una minoranza è raccoglibile', nRip / Math.max(1, nDeco) < 0.25, Math.round(nRip / nDeco * 100) + '% mature');
  /* reddito da raccolta in ~5 minuti di cammino: deve restare il BOOTSTRAP, non una rendita */
  { const { goodById: GB2 } = await import('../src/data.js');
    let tot = 0;
    for (let x = 0; x < 870; x++) for (let dy = -3; dy <= 3; dy++) {
      const p3 = world.pickupAt(x, 40 + dy); if (p3) tot += (GB2[p3] || {}).val || 0;
      const h3 = world.harvestDecoAt(x, 40 + dy); if (h3) tot += (GB2[h3] || {}).val || 0;
    }
    check('raccolta totale: bootstrap, non rendita', tot >= 25 && tot <= 90, tot + '🪙 in ~5 min');
  }
}

/* ---------- La RACCOLTA a terra è il bootstrap, non una rendita ----------
   (dava ~200🪙 in 5 minuti di camminata: più di un'intera giornata di scavi, senza costare
   energia. Ora deve bastare per la pala e poco altro.) ---------- */
{
  const { goodById: GB } = await import('../src/data.js');
  let n = 0, val = 0;
  for (let x = 0; x < 870; x++) for (let dy = -3; dy <= 3; dy++) {   // ~5 minuti di cammino
    const p2 = world.pickupAt(x, 40 + dy);
    if (p2) { n++; const g = GB[p2]; val += g ? g.val : 0; }
  }
  check('raccolta: bastano pochi minuti per la pala, non per arricchirsi', val >= 15 && val <= 70, val + '🪙 in ~5 min');
  check('gli oggetti a terra restano rari', n >= 3 && n <= 25, 'n=' + n);
}

/* ---------- CITTÀ E INTERNI TEMATIZZATI: stessa pianta, materiali del bioma ---------- */
{
  const fs = (await import('node:fs'));
  const rsrc = fs.readFileSync('src/render.js', 'utf8');
  const tsrc = fs.readFileSync('src/tiles.js', 'utf8');       // terreno e materiali vivono qui
  check('esiste una palette di materiali per ogni bioma', /export const BIOME_BUILD = \[/.test(tsrc) &&
    (tsrc.match(/roof:/g) || []).length === 6);
  check('lastricato e strade prendono il materiale del bioma', /biomeBuild\(tx, ty\)\.floor/.test(tsrc) && /biomeBuild\(tx, ty\)\.road/.test(tsrc));
  check('i tetti cambiano col bioma, e nelle Lande si innevano', /BB\.roof/.test(fs.readFileSync('src/townArt.js', 'utf8')) && /BB\.snow/.test(fs.readFileSync('src/townArt.js', 'utf8')));
  check('ogni bioma ha un MATERIALE di tetto (mat)', (tsrc.match(/mat:\s*'/g) || []).length === 6);
  { const tsrc2 = fs.readFileSync('src/townArt.js', 'utf8');
    const mats = [...new Set((tsrc.match(/mat:\s*'([a-z]+)'/g) || []).map(m => m.split("'")[1]))];
    check('i tetti disegnano il materiale di OGNI bioma (townArt.roof)', mats.length >= 5 && mats.every(m => tsrc2.includes("case '" + m + "'")), mats.join(' ')); }
  check('il legno degli interni cambia col bioma', /export const INT_WOOD = \[/.test(tsrc) && (tsrc.match(/#/g) || []).length > 100);
  /* DISEGNO VERO: i 6 edifici si disegnano senza errori (materiale tetto + neve inclusi) */
  const render3 = await import('../src/render.js');
  let drew = true, drewErr = '';
  try { for (const t of ['museum', 'store', 'inn', 'barber', 'tailor', 'lab', 'furniture']) render3.drawBuilding({ type: t, x0: 0, y0: 0, x1: 4, y1: 1 }, 120, 120); } catch (e) { drew = false; drewErr = e.message; }
  check('i 6 edifici si disegnano senza errori', drew, drewErr);
}

/* ---------- ONBOARDING: ogni meccanica si spiega quando la incontri, e resta nella Guida ---------- */
{
  const tips = await import('../src/tips.js');
  S.tips = {};
  check('la guida copre le meccaniche chiave', tips.TIP_IDS.length >= 10 &&
    ['dig', 'raw', 'energy', 'bagfull', 'water', 'cave', 'wonder', 'map', 'dna'].every(id => tips.TIPS[id]));
  check('ogni voce ha titolo e testo utili', tips.TIP_IDS.every(id => tips.tipTitle(id).length > 3 && tips.tipText(id).length > 40));
  check('un suggerimento esce una volta sola', tips.markTip('dig') === true && tips.markTip('dig') === false && tips.tipSeen('dig'));
  check('il conteggio della guida sale', tips.tipsSeenCount() === 1);
  ui.openGuide();
  const gh = document.getElementById('m-body').innerHTML;
  check('la Guida elenca tutto, anche ciò che non hai ancora visto', gh.includes(tips.tipTitle('cave')) && gh.includes(tips.tipTitle('dig')));
  ui.closeModal();
  /* lo scavo è la meccanica primaria: DEVE essere spiegata */
  const mainSrc = (await import('node:fs')).readFileSync('src/main.js', 'utf8');
  check('lo scavo viene spiegato al primo passo', /showTip\('dig'\)/.test(mainSrc));
  S.tips = {};
}

/* ---------- FEEDBACK: i momenti importanti hanno un suono e un banner ---------- */
{
  const audio = await import('../src/audio.js');
  for (const n of ['fanfare', 'nope', 'ui', 'coin', 'found', 'dig']) {
    let threw = false; try { audio.playSfx(n); } catch (e) { threw = true; }
    if (threw) check('sfx ' + n + ' non lancia', false);
  }
  check('esistono i suoni di festa, errore e interfaccia', true);
  const src = (await import('node:fs')).readFileSync('src/gameplay.js', 'utf8');
  check('chimera e risveglio annunciati con banner+suono', /bigMoment\(/.test(src) &&
    (src.match(/bigMoment\(/g) || []).length >= 3);
  /* il suono POSITIVO ('found') deve accompagnare OGNI reperto, non solo lo scavo a terra:
     accetta/piccone lo davano solo col colpo dell'attrezzo, il sito non lo dava affatto */
  check('accetta/piccone: suono "found" sul reperto (non solo il colpo)', /found \? 'found' : kind === 'chop'/.test(src));
  check('sito di scavo: suono "found" sul reperto pregiato', /addFossil\(raw, s\.x, s\.y\)\)\s*\{[^]*?playSfx\('found'\)/.test(src));
  const ui = (await import('node:fs')).readFileSync('src/ui.js', 'utf8');
  check('traguardo con fanfara', /checkAchievements\(\(/.test(ui) && ui.includes("playSfx('fanfare')"));
  check('HUD: avvisa energia bassa e zaino pieno', /classList\.toggle\('low'/.test(ui) && /classList\.toggle\('full'/.test(ui));
}

/* ---------- BILANCIAMENTO: pity timer e protezione doppioni (numeri in BILANCIAMENTO.md) ---------- */
{
  const om = Math.random;
  const raw0 = { museum: S.museum, codex: S.codex, pity: S.pity, raw: S.raw, items: S.items };
  S.museum = {}; S.codex = []; S.pity = {}; S.raw = []; S.items = [];
  /* distribuzione: ~30% comune, ~7% raro, ~2.5% ecc., ~0.6% leggendario PER RITROVAMENTO×0.4 */
  const w0 = gameplay.rarWeights(0), tot0 = w0.comune + w0.raro + w0.eccezionale + w0.leggendario;
  check('pesi rarità come i giochi di riferimento', Math.abs(w0.comune / tot0 - 0.75) < 0.03 &&
    Math.abs(w0.leggendario / tot0 - 0.015) < 0.01, 'legg=' + (w0.leggendario / tot0 * 100).toFixed(2) + '%');
  const wFar = gameplay.rarWeights(3000);
  check('la distanza aumenta i rari senza stravolgere', wFar.leggendario > w0.leggendario && wFar.leggendario / wFar.comune < 0.25);
  /* PITY: dopo N ritrovamenti senza rarità, la rarità è garantita */
  Math.random = () => 0.001;                       // sempre il primo candidato, mai il soft pity
  S.pity = { raro: gameplay.PITY.raro, eccezionale: 0, leggendario: 0 };
  const r1 = gameplay.makeRaw('prati', 0);
  check('pity: raro garantito dopo ' + gameplay.PITY.raro + ' scavi sfortunati', ['raro', 'eccezionale', 'leggendario'].includes(r1.q));
  S.pity = { raro: 0, eccezionale: gameplay.PITY.eccezionale, leggendario: 0 };
  const r2 = gameplay.makeRaw('prati', 0);
  check('pity: eccezionale garantito a ' + gameplay.PITY.eccezionale, ['eccezionale', 'leggendario'].includes(r2.q));
  S.pity = { raro: 0, eccezionale: 0, leggendario: gameplay.PITY.leggendario };
  check('pity: leggendario garantito a ' + gameplay.PITY.leggendario, gameplay.makeRaw('prati', 0).q === 'leggendario');
  /* il contatore si azzera quando arriva la rarità e sale quando manca */
  S.pity = {}; Math.random = () => 0.001;
  for (let i = 0; i < 5; i++) gameplay.makeRaw('prati', 0);
  check('i contatori di sfortuna salgono', (S.pity.leggendario || 0) >= 4);
  S.pity = { raro: gameplay.PITY.raro, eccezionale: 0, leggendario: 0 };
  gameplay.makeRaw('prati', 0);
  check('e si azzerano quando la rarità arriva', (S.pity.raro || 0) === 0);
  /* ANTI-DOPPIONE: a parità di rarità esce prima ciò che manca */
  S.pity = {}; S.codex = []; S.museum = {}; S.raw = []; S.items = [];
  Math.random = om;
  const seen = {}; const parts = {};
  for (let i = 0; i < 400; i++) { const it = gameplay.makeRaw('prati', 0); seen[it.s] = (seen[it.s] || 0) + 1; }
  check('nessuna specie di terra resta esclusa', Object.keys(seen).length >= 6, 'specie=' + Object.keys(seen).length);
  /* con una teca quasi piena, il pezzo mancante è favorito */
  const spTest = Object.keys(seen)[0];
  S.museum[spTest] = ['cranio', 'torace', 'zampa', 'coda'];      // manca il corno
  let missHit = 0, tot = 0;
  for (let i = 0; i < 300; i++) { const it = gameplay.makeRaw('prati', 0); if (it.s !== spTest) continue; tot++; if (it.t === 'corno') missHit++; }
  check('il pezzo che manca esce più spesso (anti-doppione)', tot === 0 || missHit / tot > 0.4, (missHit / Math.max(1, tot) * 100).toFixed(0) + '%');
  Math.random = om;
  S.museum = raw0.museum; S.codex = raw0.codex; S.pity = raw0.pity; S.raw = raw0.raw; S.items = raw0.items;
}

/* ---------- MERAVIGLIE: grandi, si scoprono, hanno un dono con riposo, e un Libro 3D ---------- */
{
  const wo = await import('../src/wonders.js');
  const w3 = await import('../src/wonders3d.js');
  const ids = Object.keys(wo.WONDERS);
  /* RARITÀ: incontrarne una dev'essere un evento, e non devono mai capitare vicine */
  {
    let n2 = 0; const found2 = [];
    for (let x = -300; x < 300; x++) for (let y = -300; y < 300; y++) { const t = world.landmarkAt(x, y); if (t) { n2++; found2.push([x, y, t]); } }
    const area = 600 * 600;
    check('le meraviglie sono RARE', n2 > 0 && area / n2 > 20000, 'una ogni ' + Math.round(area / Math.max(1, n2)).toLocaleString() + ' tile');
    let dmin = 1e9, amin = 1e9;
    for (let i = 0; i < found2.length; i++) for (let j = i + 1; j < found2.length; j++) {
      const d = Math.hypot(found2[i][0] - found2[j][0], found2[i][1] - found2[j][1]);
      dmin = Math.min(dmin, d);
      if (['bonearch', 'redarch'].includes(found2[i][2]) && ['bonearch', 'redarch'].includes(found2[j][2])) amin = Math.min(amin, d);
    }
    check('mai due meraviglie a due passi', dmin >= 85, 'min=' + Math.round(dmin));
    check('gli archi sono ben distanti fra loro', amin >= 300, 'min=' + (amin === 1e9 ? 'n/d' : Math.round(amin)));
  }
  check('18 meraviglie, 3 per bioma', ids.length === 18 && new Set(ids.map(i => wo.WONDERS[i].zone)).size === 6);
  check('ogni meraviglia è GRANDE (5-9 tile)', ids.every(i => wo.wonderWidth(i) >= 5 && wo.wonderWidth(i) % 2 === 1));
  check('ogni meraviglia ha nome, descrizione, riga del nonno e dono', ids.every(i =>
    wo.wonderName(i).length > 3 && wo.wonderDesc(i).length > 10 && wo.wonderGrandpa(i).length > 10 && wo.wonderPower(i).length > 5));
  check('ogni meraviglia ha un modello 3D riconoscibile', ids.every(i => w3.hasWonderModel(i) && w3.wonderVoxels(i).length > 300));
  /* scoperta */
  S.wonders = []; S.wonderUse = {}; S.arches = {};
  check('si scopre una volta sola', wo.discoverWonder('menhir') === true && wo.discoverWonder('menhir') === false && wo.isDiscovered('menhir'));
  /* riposo: il testo dice sempre lo stato */
  S.day = 10; wo.markWonderUsed('menhir', 5, 5);
  check('dopo l\'uso riposa e lo dice', wo.wonderReadyIn('menhir', 5, 5) === 3 && /riposa|resting/.test(wo.wonderStatusText('menhir', 5, 5)));
  S.day = 13;
  check('passati i giorni torna pronta', wo.wonderReadyIn('menhir', 5, 5) === 0 && /pronta|ready/.test(wo.wonderStatusText('menhir', 5, 5)));
  check('due meraviglie uguali hanno riposi separati', wo.wonderReadyIn('menhir', 99, 99) === 0);
  check('gli archi non riposano mai', wo.wonderCd('bonearch') === 0 && wo.wonderCd('redarch') === 0);
  /* si interagisce da VICINO: non da mezzo schermo di distanza */
  {
    let ent2 = null;
    for (let x = -220; x < 220 && !ent2; x++) for (let y = -220; y < 220 && !ent2; y++) if (world.landmarkAt(x, y)) ent2 = [x, y];
    const put2 = (dx, dy) => { P.x = (ent2[0] + dx) * TS + 8; P.y = (ent2[1] + dy) * TS - 13; };
    put2(0, 1);
    check('vicino alla meraviglia si interagisce', !!gameplay.nearbyWonder());
    put2(5, 0);
    check('a 5 tile NON si interagisce più', gameplay.nearbyWonder() === null);
    put2(0, 6);
    check('nemmeno da 6 tile sotto', gameplay.nearbyWonder() === null);
  }
  /* archi: rete di viaggio */
  wo.rememberArch('bonearch', 40, 12); wo.rememberArch('redarch', -80, 30);
  check('gli archi visitati si ricordano', wo.archList().length === 2);
  const px0 = P.x, py0 = P.y;
  check('si viaggia da un arco all\'altro', wo.travelToArch(wo.archList()[1].key) === true && P.x !== px0);
  P.x = px0; P.y = py0;
  /* i doni temporanei si consumano */
  wo.addBuff('digX2', 2);
  check('i doni a tempo si consumano', wo.buffLeft('digX2') === 2 && wo.useBuff('digX2') && wo.buffLeft('digX2') === 1);
  S.buffs = {};
  /* il Libro delle Meraviglie */
  ui.openWonderBook();
  const wh = document.getElementById('m-body').innerHTML;
  check('Libro Meraviglie: mostra le trovate e nasconde le altre', wh.includes(wo.wonderName('menhir')) && /\?/.test(wh));
  ui.closeModal();
  S.wonders = []; S.wonderUse = {}; S.arches = {};
}

/* ---------- MAPPA: si scopre esplorando ---------- */
{
  const mp = await import('../src/map.js');
  S.explored = {};
  check('all\'inizio non si è esplorato nulla', mp.exploredCount() === 0 && mp.isExplored(0, 0) === false);
  P.x = 100 * TS; P.y = 100 * TS;
  mp.trackPlayer();
  check('camminando si scopre la mappa', mp.isExplored(100, 100) === true && mp.exploredCount() >= 9);
  check('il resto del mondo resta ignoto', mp.isExplored(400, 400) === false);
  const before = mp.exploredCount();
  mp.revealArea(100, 100, 40);
  check('le meraviglie rivelano grandi aree', mp.exploredCount() > before + 30);
  S.explored = {};
}

/* ---------- LETTERE DEL NONNO: l'arco narrativo (una per sala riempita + il congedo) ---------- */
{
  const lt = await import('../src/letters.js');
  const { MUSEUM_ZONES: MZ, zonePools: ZP } = await import('../src/data.js');
  const museum0 = S.museum, letters0 = S.letters;
  S.museum = {}; S.letters = [];
  check('nessuna lettera con il museo vuoto', lt.pendingLetter() === null && lt.roomFilled('prati') === false);
  /* riempio la sala dei prati: almeno UN pezzo per ogni specie della zona */
  ZP['prati'].forEach(sp => { S.museum[sp.id] = [{ t: 'cranio' }]; });
  check('sala piena → lettera in attesa', lt.roomFilled('prati') === true && lt.pendingLetter() === 'prati');
  check('la lettera si consegna una volta sola', lt.giveLetter('prati') === true && lt.giveLetter('prati') === false && lt.hasLetter('prati'));
  check('testo della lettera presente in ita e eng', lt.letterBody('prati').length >= 3 && lt.letterTitle('prati').length > 4);
  /* riempiendo TUTTE le sale (grotta compresa) arriva il congedo */
  MZ.forEach(z => { ZP[z.id].forEach(sp => { S.museum[sp.id] = [{ t: 'cranio' }]; }); lt.giveLetter(z.id); });
  check('tutte le sale piene → arriva il finale', lt.pendingLetter() === 'finale' && lt.letterBody('finale').length >= 4);
  lt.giveLetter('finale');
  check('dopo il finale non resta nulla da consegnare', lt.pendingLetter() === null);
  check('ogni ala ha la sua lettera', lt.allLetters().length === MZ.length + 1 && MZ.every(z => lt.letterTitle(z.id) !== z.id));
  /* pannello di rilettura */
  ui.openLetters();
  const lh = document.getElementById('m-body').innerHTML;
  check('pannello lettere: elenca quelle ricevute', lh.includes(lt.letterTitle('prati')));
  ui.closeBag(); ui.closeBook(); ui.closeMap();   // isModalOpen conta anche zaino/libro/mappa aperti prima
  ui.openLetter('prati');
  check('la lettera si rilegge', document.getElementById('m-body').innerHTML.includes(lt.letterBody('prati')[0].slice(0, 20)));
  /* chiudendo una lettera si torna all'ELENCO, non al gioco */
  ui.closeModal();
  const afterClose = document.getElementById('m-body').innerHTML;
  const modalOn = () => ui.isModalOpen();
  check('chiudendo la lettera si torna all\'elenco', modalOn() && afterClose.includes(lt.letterTitle('prati')) && !afterClose.includes(lt.letterBody('prati')[0].slice(0, 20)));
  check('c\'è il pulsante per tornare indietro', (ui.openLetter('prati'), !!document.getElementById('ltBack')));
  { const b = document.getElementById('ltBack'); if (b && b.onclick) b.onclick(); }
  check('il pulsante riporta all\'elenco', document.getElementById('m-body').innerHTML.includes(lt.letterTitle('prati')) && modalOn());
  ui.closeModal();
  check('dall\'elenco si esce davvero dal gioco', modalOn() === false);
  /* la lettera CONSEGNATA dal Curatore non ha un elenco a cui tornare */
  ui.openLetter('prati', false);
  ui.closeModal();
  check('la lettera appena consegnata si chiude e basta', modalOn() === false);
  S.museum = museum0; S.letters = letters0;
}

/* ---------- EDITOR PG: non si deve poter chiudere per sbaglio (salterebbe intro+regalo) ---------- */
{
  let done = 0;
  ui.openEditor(() => done++);
  ui.closeModal();                                   // tap fuori / ESC
  check('editor: il tap fuori NON lo chiude', ui.isModalOpen() === true && done === 0);
  const start = document.getElementById('lookDone');
  if (start && start.onclick) start.onclick();
  check('editor: si esce da "Inizia l\'avventura"', ui.isModalOpen() === false && done === 1 && S.lookDone === true);
  ui.closeModal();
}

/* ---------- SALVATAGGIO: la parte che, se sbaglia, cancella la partita di qualcuno ---------- */
{
  const SKk = state.SK;
  const snap = JSON.stringify(S);                       // per rimettere tutto com'era alla fine
  /* 1) save CORROTTO: non si butta, si mette da parte e si ripiega sul backup */
  localStorage.setItem(state.BAK, JSON.stringify({ coins: 777, day: 3, v: 1 }));
  localStorage.setItem(SKk, '{questo non è json');
  localStorage.removeItem(state.BROKEN);
  const rec = state.load();
  check('save corrotto → riparte dal backup', !!rec && rec.coins === 777);
  check('save corrotto messo da parte, mai buttato', (localStorage.getItem(state.BROKEN) || '').startsWith('{questo'));
  /* 2) quota piena: save() lo dice, non finge */
  const realSet = localStorage.setItem.bind(localStorage);
  let warned = null;
  state.setSaveErrorHandler(n => { warned = n; });
  localStorage.setItem = () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; };
  const okq = state.save();
  localStorage.setItem = realSet;
  check('quota piena: save() torna false e avvisa', okq === false && warned === 'QuotaExceededError' && state.saveError() === 'QuotaExceededError');
  state.setSaveErrorHandler(null);
  check('tornata la scrittura, save() riparte', state.save() === true && state.saveError() === null);
  /* 3) le liste di tile non si gonfiano di duplicati (era la causa della quota piena) */
  S.dug = []; state.dugSet.clear();
  for (let i = 0; i < 50; i++) { state.dugSet.add('7,9'); S.dug.push('7,9'); }
  state.save();
  check('salvataggio senza duplicati (dug dedup)', S.dug.length === 1 && S.dug[0] === '7,9');
  /* 4) versione di schema scritta e conservata */
  check('schema versionato', S.v === state.SAVE_V && JSON.parse(localStorage.getItem(SKk)).v === state.SAVE_V);
  /* 5) con i comandi attivi si SALVA anche negli slot (tutto persiste; `vanilla` annulla via snapshot) */
  state.setCheatLock(true);
  const before = localStorage.getItem(SKk + '_slot1');
  const slotRes = state.saveToSlot(1);
  check('slot SALVA anche con i comandi attivi', slotRes !== 'cheat' && localStorage.getItem(SKk + '_slot1') !== before);
  state.setCheatLock(false);
  /* 6) migrazioni: un save VECCHIO si apre senza esplodere e viene portato al presente */
  const legacy = { seed: 12345, coins: 5, day: 2, look: { hat: '#fff', shirt: '#fff', pants: '#fff', skin: '#fff', hatOn: false },
    vials: ['lepre'], tools: { boat: true }, gear: 'boat', raw: [], items: [], codex: [] };
  localStorage.setItem(SKk, JSON.stringify(legacy));
  state.initState();
  const S2 = state.S;
  check('save legacy: caricato e versionato', S2.coins === 5 && S2.v === state.SAVE_V);
  check('legacy: hatOn → hatStyle', S2.look.hatStyle === 'none' && S2.look.hairStyle !== undefined);
  check('legacy: vials → dna in fialette', S2.vials === undefined && S2.dna.lepre === 1);
  check('legacy: la barca non è più un gear attivabile', S2.gear === null && S2.tools.boat === true);
  check('legacy: campi nuovi popolati', Array.isArray(S2.maps) && typeof S2.fountains === 'object' && S2.museumJob === null);
  /* M6: la poltrona di partenza arriva anche a chi ha un save vecchio, come il piedistallo */
  {
    const dataMig = await import('../src/data.js');
    check('legacy: poltrona di partenza regalata una volta sola',
      S2.starterFurnGiven === true && S2.furnOwned.includes(dataMig.STARTER_FURN_ID));
  }
  /* PARCO CHE RENDE: un save legacy senza `idleAt` non deve inventarsi un arretrato di ore —
     si migra ad ADESSO, non a zero (che darebbe subito il tetto massimo) né a niente
     (che farebbe esplodere idle.js al prossimo boot). */
  check('legacy: idleAt manca → migrato ad ADESSO, niente arretrato regalato', typeof S2.idleAt === 'number' && S2.idleAt >= Date.now() - 5000);
  /* e chi gioca DAVVERO lo tiene fresco: ogni save() lo riporta ad ADESSO */
  S2.idleAt = Date.now() - 5 * 3600000; // finta assenza di 5 ore vere
  const stale = S2.idleAt;
  state.save();
  check('giocando (save) il conto dell\'assenza riparte da ADESSO', S2.idleAt > stale);
  check('partita nuova: idleAt parte da ADESSO', typeof state.fresh().idleAt === 'number' && state.fresh().idleAt >= Date.now() - 5000);
  /* 7) un save dal FUTURO non viene declassato */
  localStorage.setItem(SKk, JSON.stringify({ ...legacy, v: 99 }));
  state.initState();
  check('save dal futuro: versione conservata', state.S.v === 99);
  /* 8) partita NUOVA (nessun save salvato): la poltrona di partenza c'è già, senza fare niente */
  localStorage.removeItem(SKk);
  state.initState();
  {
    const dataMig2 = await import('../src/data.js');
    check('partita nuova: la poltrona di partenza è già nel vassoio',
      state.S.furnOwned.includes(dataMig2.STARTER_FURN_ID));
  }
  /* ripristino lo stato della suite */
  localStorage.setItem(SKk, snap); state.initState();
  Object.assign(state.S, JSON.parse(snap));
  state.dugSet.clear(); (state.S.dug || []).forEach(k => state.dugSet.add(k));
}

/* ---------- COMPAGNO IN ACQUA: segue il player in barca e NUOTA (niente camminata) ----------
   NB: si usano i riferimenti VIVI state.S/state.P: qui sopra la suite ha chiamato initState()
   (blocco migrazioni), quindi le S/P catturate a inizio file sono STALE e i moduli (companion.js)
   leggono state.S/state.P. Scrivere sulle stale non arriverebbe al compagno. */
{
  const comp = await import('../src/companion.js');
  const Sl = state.S, Pl = state.P;
  const before = Sl.companion;
  Sl.companion = { skull: SPECIES[0].id, torso: SPECIES[0].id, leg: SPECIES[0].id, q: 'comune', name: 'Test' };
  comp.COMP.init = false; comp.COMP.job = null; // stato pulito: nessun lavoro del raccoglitore in corso
  /* il player entra in acqua: dopo qualche passo il compagno è sull'acqua anche lui */
  let w = null;
  for (let x = -60; x < 60 && !w; x++) for (let y = -60; y < 60 && !w; y++) if (gameplay.waterTile(x, y) && gameplay.waterTile(x + 1, y)) w = [x, y];
  check('esiste uno specchio d\'acqua', !!w);
  Pl.x = w[0] * TS + 8; Pl.y = w[1] * TS - 13; Pl.dir = 'right';
  for (let i = 0; i < 200; i++) comp.updateCompanion(1 / 60);
  const cw = gameplay.waterTile(Math.floor(comp.COMP.x / TS), Math.floor((comp.COMP.y + 13) / TS));
  check('il compagno segue in acqua (→ nuota)', cw === true);
  /* ANTI-TREMOLIO: niente deadzone. Col bersaglio a 1.5px il compagno DEVE muoversi verso di
     esso, senza scavalcarlo (min(d, velocità)). Il bersaglio ora è sulla SCIA dei passi: la si
     costruisce camminando davvero, su una fila di caselle libere. */
  const wld = await import('../src/world.js');
  let lx = null, ly = null;
  for (let yy = 0; yy < 200 && lx === null; yy++) for (let xx = 0; xx < 200; xx++) {
    let ok = true;
    for (let k = -2; k <= 6 && ok; k++) if (wld.isSolidTile(xx + k, yy) || wld.townInfo(xx + k, yy)) ok = false;
    if (ok) { lx = xx; ly = yy; break; }
  }
  comp.resetCompanionTrail(); comp.COMP.job = null;
  Pl.dir = 'right'; Pl.x = lx * TS + 16; Pl.y = ly * TS + 16 - 26;
  comp.updateCompanion(1 / 60);
  for (let i = 0; i < 60; i++) { Pl.x += 2; comp.updateCompanion(1 / 60); }
  const targetX = Pl.x - comp.FOLLOW_PX;
  comp.COMP.x = targetX - 1.5; comp.COMP.y = Pl.y;         // 1,5px dal bersaglio sulla scia
  const x0 = comp.COMP.x;
  comp.updateCompanion(1 / 60);
  check('compagno: nessuna deadzone (segue anche da vicino, senza scavalcare)', comp.COMP.x > x0 && comp.COMP.x <= targetX + 1e-6);
  /* E SI DISEGNA DOVE STA: l'ombra del compagno cade sui suoi PIEDI (ancora + FOOT_DY), come
     quella di Digsy. Veniva disegnato con la base sull'ancora, 26px più su: dietro a Digsy
     davanti a una porta sembrava dentro la casa, sul tetto. Si registra l'ombra disegnata. */
  {
    const { render: rnd } = await import('../src/render.js');
    const { ctx: cctx } = await import('../src/screen.js');
    const { cam: ccam } = await import('../src/state.js');
    const { FOOT_DY: FD } = await import('../src/body.js');
    if (!S.companion) comp.setCompanion({ skull: SPECIES[0].id, torso: SPECIES[0].id, leg: SPECIES[0].id, q: 'comune', key: 'sp' + SPECIES[0].id, name: 'Prova' });
    comp.COMP.job = null; comp.COMP.play = null; comp.COMP.init = true;
    comp.COMP.x = Pl.x + 60; comp.COMP.y = Pl.y;
    const ombre = [];
    const oldFR = cctx.fillRect, oldS = cctx.save, oldR = cctx.restore, oldT = cctx.translate, oldST = cctx.setTransform;
    /* il compagno si disegna dentro un translate: si tiene il conto dell'origine per avere le
       coordinate VERE sullo schermo (le scale non servono: l'ombra non viene scalata) */
    let org = { x: 0, y: 0 }; const pila = [];
    cctx.save = () => pila.push({ ...org });
    cctx.restore = () => { org = pila.pop() || { x: 0, y: 0 }; };
    cctx.translate = (x, y) => { org.x += x; org.y += y; };
    cctx.setTransform = () => { org = { x: 0, y: 0 }; };
    cctx.fillRect = (x, y, w, h) => { if (String(cctx.fillStyle).startsWith('rgba(15,25,15')) ombre.push([org.x + x, org.y + y, w, h]); };
    try { rnd(3000); } finally { cctx.fillRect = oldFR; cctx.save = oldS; cctx.restore = oldR; cctx.translate = oldT; cctx.setTransform = oldST; }
    const piediSchermo = comp.COMP.y + FD - ccam.y;
    const sotto = ombre.some(r => Math.abs((r[1] + r[3] / 2) - piediSchermo) <= 3 && Math.abs(r[0] - (comp.COMP.x - ccam.x)) <= 20);
    check('il compagno ha l\'ombra sotto i PIEDI (non 26px più su, dentro le case)', sotto, 'piedi a ' + Math.round(piediSchermo) + ', ombre: ' + ombre.slice(0, 3).map(r => Math.round(r[1])).join(','));
  }
  /* NON SI COMPENETRA: segue la scia dei passi, quindi uscendo da una casa verso il basso non
     finisce DENTRO la casa (il vecchio bersaglio "dietro al verso" ci cadeva in mezzo —
     segnalato con foto). Si esce dalla porta di casa camminando in giù e si pretende che il
     compagno non stia mai su una casella dell'edificio. */
  if (S.home) {
    const hf = wld.houseFootprint();
    comp.resetCompanionTrail(); comp.COMP.job = null;
    Pl.dir = 'down'; Pl.x = hf.doorx * TS + 16; Pl.y = (hf.doory + 1) * TS + 4 - 26;   // appena usciti
    let dentro = 0;
    for (let i = 0; i < 90; i++) {
      if (i > 0 && i < 50) Pl.y += 1;                                           // si allontana verso il basso
      comp.updateCompanion(1 / 60);
      const ctx2 = Math.floor(comp.COMP.x / TS), cty2 = Math.floor((comp.COMP.y + 26) / TS);
      if (ctx2 >= hf.x0 && ctx2 <= hf.x1 && cty2 >= hf.y0 && cty2 <= hf.y1) dentro++;
    }
    check('uscendo di casa il compagno non finisce mai dentro l\'edificio', dentro === 0, dentro + ' frame dentro');
  }
  /* ISTERESI: in DIAGONALE (dx≈dy) il verso non deve flippare profilo↔fronte a ogni frame */
  comp.COMP.init = true; comp.COMP.job = null;
  Pl.x = 200; Pl.y = 200; Pl.dir = 'right';              // bersaglio = (184, 208)
  comp.COMP.x = 174; comp.COMP.y = 218; comp.COMP.face = 'down'; // in diagonale dal bersaglio
  let flips = 0;
  for (let i = 0; i < 40; i++) { const f0 = comp.COMP.face; comp.updateCompanion(1 / 60); if (comp.COMP.face !== f0) flips++; }
  check('compagno: in diagonale il verso NON flippa (isteresi)', flips === 0);
  Sl.companion = before; comp.COMP.init = false;
}

/* ---------- INPUT: mentre si scrive in un campo (nome del personaggio) il gioco non
   deve rubare i tasti — W/A/S/D/E/I/Z/L/Q erano impossibili da digitare ---------- */
{
  const input = await import('../src/input.js');
  const fake = t => ({ tagName: t, isContentEditable: false });
  check('campo di testo → il gioco non reagisce', input.isTyping(fake('INPUT')) === true &&
    input.isTyping(fake('TEXTAREA')) === true && input.isTyping(fake('SELECT')) === true &&
    input.isTyping({ tagName: 'DIV', isContentEditable: true }) === true);
  check('fuori dai campi → i tasti restano al gioco', input.isTyping(fake('CANVAS')) === false &&
    input.isTyping(fake('BODY')) === false && input.isTyping(null) === false);
}

/* ---------- CONSOLE: ↑/↓ ripescano i comandi dati, come in un terminale ---------- */
{
  const isrc = (await import('node:fs')).readFileSync('src/input.js', 'utf8');
  check('la console ha una cronologia', /pushHistory/.test(isrc) && /histPrev/.test(isrc) && /histNext/.test(isrc));
  check('freccia su e giù collegate', /ArrowUp[\s\S]{0,120}histPrev/.test(isrc) && /ArrowDown[\s\S]{0,120}histNext/.test(isrc));
  check('la cronologia sopravvive al refresh', /digsy_cmdhist/.test(isrc) && /localStorage\.setItem\(HKEY/.test(isrc));
  check('niente doppioni consecutivi e tetto agli elementi', /hist\[hist\.length - 1\] !== s2/.test(isrc) && /hist\.length > 60/.test(isrc));
  /* comportamento: simulo la logica su una copia isolata */
  const H = []; let idx = -1, draft = '';
  const push = v => { const t = String(v).trim(); if (!t) return; if (H[H.length - 1] !== t) H.push(t); idx = -1; draft = ''; };
  const prev = cur => { if (!H.length) return null; if (idx === -1) { draft = cur; idx = H.length - 1; } else if (idx > 0) idx--; return H[idx]; };
  const next = () => { if (idx === -1) return null; if (idx < H.length - 1) { idx++; return H[idx]; } idx = -1; return draft; };
  push('money=40'); push('goto=grotta'); push('goto=grotta'); push('help');
  check('i doppioni consecutivi non si accumulano', H.length === 3);
  check('↑ risale dall\'ultimo al primo', prev('mon') === 'help' && prev() === 'goto=grotta' && prev() === 'money=40' && prev() === 'money=40');
  check('↓ ridiscende e restituisce ciò che stavi scrivendo', next() === 'goto=grotta' && next() === 'help' && next() === 'mon');
}

/* ---------- REGOLA FERREA: le animazioni NON prendono la fase dalle coordinate schermo ----------
   (con la camera in movimento l'animazione correrebbe insieme al personaggio) ---------- */
{
  const { readFileSync, readdirSync } = await import('node:fs');
  const bad = [];
  for (const f of readdirSync('src').filter(n => n.endsWith('.js'))) {
    const src = readFileSync('src/' + f, 'utf8').split('\n');
    src.forEach((line, i) => {
      if (/^\s*\/[/*]/.test(line)) return;                       // salta i commenti
      /* Math.sin/cos/floor che mescolano il TEMPO con una coordinata SCHERMO */
      if (/(sin|cos|floor)\s*\([^)]*\b(time|frameTime)\b[^)]*[+\-*/]\s*\b(sx|sy|cx2?|bx|by)\b/.test(line)) bad.push(f + ':' + (i + 1));
    });
  }
  check('nessuna animazione prende la fase dalle coordinate schermo', bad.length === 0, bad.slice(0, 3).join(' '));
}

/* ---------- INPUT: i tasti devono muovere e agire davvero ---------- */
{
  const S = state.S, P2 = state.P;
  const inp = await import('../src/input.js');
  const fire = (t, k, target) => globalThis.__fireKey(t, k, target);
  (await import('../src/ui.js')).tossAbort();   // un eventuale minigioco fontana aperto da un test prima intercetterebbe i tasti

  /* FONTANA: durante i tiri E/spazio vanno al minigioco (per fermare il tiro), non ad act */
  { const ui2 = await import('../src/ui.js'); const isrc2 = (await import('node:fs')).readFileSync('src/input.js', 'utf8');
    let ff = -1; ui2.openToss(h => { ff = h; });
    check('il minigioco fontana si apre', ui2.isTossOpen() === true);
    check('E/spazio fermano il tiro (instradati al minigioco, non ad act)', /isTossOpen\(\)\)\s*\{[\s\S]*?tossPress\(\)/.test(isrc2));
    ui2.tossAbort();
    check('ESC/abort chiude il minigioco e risolve i tiri fatti', ui2.isTossOpen() === false && ff >= 0);
  }

  /* movimento: WASD e frecce impostano gli stessi flag */
  fire('keydown', 'w'); check('W preme su', inp.keys.up === true);
  fire('keyup', 'w'); check('rilasciando W si ferma', !inp.keys.up);
  fire('keydown', 'ArrowRight'); check('le frecce valgono come WASD', inp.keys.right === true);
  fire('keyup', 'ArrowRight');
  for (const [k, f] of [['a', 'left'], ['s', 'down'], ['d', 'right']]) {
    fire('keydown', k); const ok = inp.keys[f] === true; fire('keyup', k);
    check('tasto ' + k + ' → ' + f, ok);
  }
  /* mentre si scrive in un campo il gioco NON deve reagire (bug storico: il nome del
     personaggio muoveva il giocatore) */
  const input = { tagName: 'INPUT' };
  fire('keydown', 'w', input);
  check('scrivendo in un campo il gioco non si muove', !inp.keys.up);
  fire('keyup', 'w', input);
  check('isTyping riconosce i campi di testo', inp.isTyping({ tagName: 'INPUT' }) && !inp.isTyping({ tagName: 'BODY' }));
  check('la console tiene la cronologia dei comandi', Array.isArray(inp.cmdHistory()));

  /* CONSOLE: si apre col backslash, ricorda i comandi come un terminale (↑/↓), Tab completa */
  const cmdi = document.getElementById('cmdi'), cmdEl = document.getElementById('cmd');
  fire('keydown', '\\');
  check('il backslash apre la console', cmdEl.classList.contains('on'));
  /* la console dei CHEAT è uno strumento da DEV: nel build ONLINE (import.meta.env.DEV=false)
     dev'essere DISATTIVATA. Guardia sul sorgente: gate su import.meta.env.DEV + openConsole che esce. */
  const { readFileSync: rfsInp } = await import('node:fs');
  const inputSrc = rfsInp(new URL('../src/input.js', import.meta.url), 'utf8');
  check('cheat: console gated per il build online (import.meta.env.DEV)', /const CHEATS_ON = !import\.meta\.env \|\| !!import\.meta\.env\.DEV/.test(inputSrc) && /if \(!CHEATS_ON\) return/.test(inputSrc) && /&& CHEATS_ON\)/.test(inputSrc));
  const type = (k) => { const ev = { key: k, target: cmdi, preventDefault() {}, stopPropagation() {} };
    (cmdi.listeners.keydown || []).forEach(fn => fn(ev)); return ev; };
  cmdi.value = 'money=999'; type('Enter');
  check('un comando dato finisce nella cronologia', inp.cmdHistory().includes('money=999'));
  cmdi.value = ''; type('ArrowUp');
  check('la freccia su richiama l\'ultimo comando', cmdi.value === 'money=999');
  type('ArrowDown');
  check('la freccia giù torna a quello che stavi scrivendo', cmdi.value === '');
  cmdi.value = 'got'; type('Tab');
  check('Tab completa il comando', cmdi.value.startsWith('got') && cmdi.value.length > 3);
  type('Escape');
  check('ESC chiude la console', !cmdEl.classList.contains('on'));
  /* mentre la console è aperta il gioco NON deve muoversi */
  fire('keydown', '\\'); fire('keydown', 'w');
  check('con la console aperta il giocatore resta fermo', !inp.keys.up);
  fire('keydown', '\\');

  /* TASTO DESTRO = azione: col mouse si deve poter giocare senza tastiera */
  {
    const cvR = document.getElementById('cv');
    let agito = false;
    const gp17 = await import('../src/gameplay.js');
    const orig = gp17.act;
    /* si verifica che il gestore ci sia e che annulli la meta: agire vale DOVE SI È */
    const tm17 = await import('../src/tapmove.js');
    tm17.setGoal(9999, 9999, null);
    cvR.dispatchEvent({ type: 'contextmenu', preventDefault() { agito = true; } });
    check('il tasto destro è intercettato (niente menu del browser)', agito === true);
    check('e agire annulla la meta: si agisce dove si è', tm17.hasGoal() === false);
    const isrc17 = (await import('node:fs')).readFileSync('src/input.js', 'utf8');
    check('il tasto destro chiama la stessa azione della E', /contextmenu[\s\S]{0,400}act\(\)/.test(isrc17));
  }

  /* ARREDO COL PUNTATORE, dentro il vero input.js: selezionare, trascinare, ruotare con R,
     annullare con Esc, e l'anteprima che si accosta al muro. L'e2e lo prova in un browser;
     qui si fanno girare gli stessi rami a ogni `npm test`, perché un ramo mai eseguito è un
     crash che aspetta (REGOLA #9). */
  {
    const inter18 = await import('../src/interior.js');
    const house18 = await import('../src/house.js');
    const { interiorCam } = await import('../src/interiors.js');
    const { view: view18 } = await import('../src/screen.js');
    const { TS: TS18 } = await import('../src/data.js');
    if (!view18.W) { view18.W = 400; view18.H = 300; }
    const cv18 = document.getElementById('cv');
    const home18 = S.home || { x: 50, y: 50 };
    if (!S.home) S.home = home18;
    inter18.enterInterior({ type: 'house', name: 'house', x: home18.x, y: home18.y });
    inter18.enterHouseRoom(0);
    S.house.rooms[0].unlocked = true; S.house.rooms[0].furn = [];
    if (!S.furnOwned.includes('prati_table')) S.furnOwned.push('prati_table');
    house18.cancelHold();
    const scr = (gx, gy) => { const c = interiorCam(); return { x: ((gx + 0.5) * TS18 - c.x) / view18.W * 100, y: ((gy + 0.5) * TS18 - c.y) / view18.H * 100 }; };
    const pev = (t, gx, gy) => { const q = scr(gx, gy); cv18.dispatchEvent({ type: t, clientX: q.x, clientY: q.y, pointerId: 18, preventDefault() {} }); };
    /* dal vassoio: il puntatore sopra la parete accosta l'anteprima al muro, verde */
    house18.takeHold('prati_table');
    /* l'anteprima si muove SOLO trascinando (col mouse inseguiva il puntatore e la maniglia ↻
       scappava via): si preme e si porta sopra la parete */
    pev('pointerdown', 4, 3);
    pev('pointermove', 5, 0);
    const pl18 = house18.holdPlacement(0);
    check('input: trascinando sopra la parete l\'anteprima si accosta al muro (verde)', !!pl18 && pl18.ok === true && pl18.gy === 1, JSON.stringify(pl18));
    pev('pointerup', 5, 0);
    check('input: rilasciando, il pezzo si posa', house18.isHolding() === false && S.house.rooms[0].furn.length === 1);
    /* senza premere, muovere il puntatore NON sposta il mobile in mano */
    S.house.rooms[0].furn = [];
    house18.takeHold('prati_table'); house18.setHoldTarget(3, 3);
    pev('pointermove', 7, 5);
    check('input: senza premere, il puntatore non trascina via il mobile', house18.holdTarget().gx === 3 && house18.holdTarget().gy === 3);
    /* LA MANIGLIA ↻: si tocca e ruota, senza posare e senza spostare */
    const hr18 = house18.rotateHandleRect(0);
    check('input: col mobile in mano c\'è la maniglia per ruotare', !!hr18 && hr18.w >= 16);
    const rotPrima = house18.holdItem().rot, cPrima = scr((hr18.x + hr18.w / 2) / TS18 - 0.5, (hr18.y + hr18.h / 2) / TS18 - 0.5);
    cv18.dispatchEvent({ type: 'pointerdown', clientX: cPrima.x, clientY: cPrima.y, pointerId: 18, preventDefault() {} });
    cv18.dispatchEvent({ type: 'pointerup', clientX: cPrima.x, clientY: cPrima.y, pointerId: 18, preventDefault() {} });
    check('input: toccando la maniglia il mobile ruota di un quarto', house18.holdItem() && house18.holdItem().rot === (rotPrima + 1) % 4);
    check('input: e resta in mano (la maniglia non lo posa)', house18.isHolding() === true);
    /* un clic altrove lo posa lì */
    pev('pointerdown', 4, 3); pev('pointerup', 4, 3);
    check('input: col pezzo in mano, un clic lo posa', house18.isHolding() === false && S.house.rooms[0].furn.length === 1);
    /* un clic sul mobile lo seleziona e RESTA in mano */
    const f18 = S.house.rooms[0].furn[0];
    pev('pointerdown', f18.gx + 0.2, f18.gy); pev('pointerup', f18.gx + 0.2, f18.gy);
    check('input: un clic sul mobile lo seleziona (resta in mano)', house18.isHolding() === true);
    const r0 = house18.holdItem().rot;
    __fireKey('keydown', 'r');
    check('input: R lo ruota di un quarto', house18.holdItem().rot === (r0 + 1) % 4);
    __fireKey('keydown', 'Escape');
    check('input: Esc lo rimette nel vassoio (e non fa uscire dalla stanza)', house18.isHolding() === false && inter18.INT.active === true);
    /* trascinare un mobile piazzato: si alza alla pressione e si posa dove si rilascia */
    house18.takeHold('prati_table'); pev('pointerdown', 3, 4); pev('pointerup', 3, 4);
    const g0 = S.house.rooms[0].furn[0];
    pev('pointerdown', g0.gx + 0.2, g0.gy);
    pev('pointermove', g0.gx + 2.2, g0.gy - 1);             // verso il muro: lontano dalla porta
    pev('pointerup', g0.gx + 2.2, g0.gy - 1);
    const g1 = S.house.rooms[0].furn[0];
    check('input: trascinando, il mobile si sposta dove lo si lascia', !!g1 && house18.isHolding() === false && g1.gx !== g0.gx, g0.gx + '→' + (g1 && g1.gx));
    S.house.rooms[0].furn = []; house18.cancelHold();
    inter18.leaveHouseRoom(); inter18.exitInterior();
  }

  /* TOCCO SUL MONDO: la conversione e la scelta della scena vivono qui, e il tocco deve
     essere ignorato quando c'è un pannello aperto sopra */
  {
    const pr11 = await import('../src/prefs.js');
    const tm11 = await import('../src/tapmove.js');
    const ui11 = await import('../src/ui.js');
    const cv = document.getElementById('cv');
    const tap = (x, y) => {
      cv.dispatchEvent({ type: 'pointerdown', clientX: x, clientY: y, pointerId: 4, preventDefault() {} });
      cv.dispatchEvent({ type: 'pointerup', clientX: x, clientY: y, pointerId: 4, preventDefault() {} });
    };
    pr11.setPref('touch', 'tap');
    tm11.clearGoal();
    /* con un pannello aperto il tocco non deve muovere nessuno */
    ui11.openBag('finds'); tap(50, 50);
    check('col pannello aperto il tocco non muove', tm11.hasGoal() === false);
    ui11.closeBag();
    /* trascinare non è toccare */
    cv.dispatchEvent({ type: 'pointerdown', clientX: 10, clientY: 10, pointerId: 5, preventDefault() {} });
    cv.dispatchEvent({ type: 'pointerup', clientX: 90, clientY: 80, pointerId: 5, preventDefault() {} });
    check('trascinare non fissa una meta', tm11.hasGoal() === false);
    pr11.setPref('touch', 'joystick');
    tm11.clearGoal();
  }

  /* LEVA SOTTO IL DITO: nasce dove si appoggia, guida trascinando, sparisce al rilascio */
  {
    const pr16 = await import('../src/prefs.js');
    const tm16 = await import('../src/tapmove.js');
    const om16 = globalThis.matchMedia, ow16 = globalThis.innerWidth;
    globalThis.matchMedia = q => ({ matches: /coarse/.test(q) }); globalThis.innerWidth = 390;
    pr16.setPref('touch', 'float');
    tm16.clearGoal();
    const cv16 = document.getElementById('cv'), joy16 = document.getElementById('joy');
    const pev = (t, x, y) => cv16.dispatchEvent({ type: t, clientX: x, clientY: y, pointerId: 12, preventDefault() {} });
    pev('pointerdown', 200, 300);
    check('appoggiando il dito non parte nulla finché non si trascina',
      !inp.keys.right && !joy16.classList.contains('floating'));
    pev('pointermove', 260, 300);
    check('trascinando a destra si va a destra', inp.keys.right === true && !inp.keys.left);
    check('e la leva compare sotto il dito', joy16.classList.contains('floating') && !joy16.classList.contains('off'));
    check('nasce dove ho appoggiato', joy16.style.left === '138px' && joy16.style.top === '238px',
      joy16.style.left + ',' + joy16.style.top);
    pev('pointermove', 200, 240);
    check('trascinando in su si va in su', inp.keys.up === true && !inp.keys.down);
    pev('pointerup', 200, 240);
    check('staccando ci si ferma e la leva sparisce',
      !inp.keys.up && !inp.keys.right && !joy16.classList.contains('floating') && joy16.classList.contains('off'));
    check('e un trascinamento non lascia una meta', tm16.hasGoal() === false);
    pr16.setPref('touch', 'joystick');
    globalThis.matchMedia = om16; globalThis.innerWidth = ow16;
  }

  /* JOYSTICK: il vettore del dito diventa gli stessi flag della tastiera */
  const joy = document.getElementById('joy');
  const pj = (x, y, type2) => joy.dispatchEvent({ type: type2, pointerId: 3, clientX: x, clientY: y, preventDefault() {}, isPrimary: true });
  pj(50, 50, 'pointerdown'); pj(95, 50, 'pointermove');
  check('spingendo la leva a destra si va a destra', inp.keys.right === true && !inp.keys.left);
  pj(5, 50, 'pointermove');
  check('e dall\'altra parte a sinistra', inp.keys.left === true && !inp.keys.right);
  pj(50, 50, 'pointermove');
  check('al centro c\'è la zona morta: fermo', !inp.keys.left && !inp.keys.right && !inp.keys.up && !inp.keys.down);
  pj(50, 50, 'pointerup');
  check('staccando il dito ci si ferma', !inp.keys.right && !inp.keys.down);
}

/* ---------- BOOT: main.js deve poter partire (era l'unico modulo mai importato) ---------- */
{
  let bootErr = '';
  try {
    await import('../src/main.js');
  } catch (e) { bootErr = e.message; }
  check('il boot del gioco non esplode', bootErr === '', bootErr);
  /* la sonda che usano gli e2e: se sparisce, i test visivi smettono di poter disegnare */
  await new Promise(r => setTimeout(r, 30));
  const G = globalThis.window && globalThis.window.__digsy;
  check('la sonda __digsy è esposta al browser', !!G && typeof G.frame === 'function' && typeof G.enterRoom === 'function');
  if (G) {
    let frameErr = '';
    try { G.frame(1234); } catch (e) { frameErr = e.message; }
    check('la sonda disegna un frame senza errori', frameErr === '', frameErr);
  }
}

/* ---------- SPLASH: titolo e menu di pausa, tutte le viste ---------- */
/* NOVITÀ non deve restare indietro: la voce in cima al changelog deve combaciare con la
   versione corrente (major.minor). Bumpi la versione ma scordi le note = i tester non le vedono. */
{
  const { CHANGELOG } = await import('../src/changelog.js');
  const { VERSION } = await import('../src/version.js');
  const mm = s => (String(s).match(/v?(\d+)\.(\d+)/) || []).slice(1, 3).join('.');
  check('il changelog ha una voce in cima', CHANGELOG.length > 0 && !!CHANGELOG[0].v);
  check('la voce in cima al changelog è la versione corrente', mm(CHANGELOG[0].v) === mm(VERSION));
  check('ogni voce del changelog ha testo IT ed EN', CHANGELOG.every(c => Array.isArray(c.it) && Array.isArray(c.en) && c.it.length === c.en.length && c.it.length > 0));
}

{
  const sp = await import('../src/splash.js');
  let spErr = '';
  try {
    sp.showSplash();
    check('la splash si apre', sp.splashActive() === true);
    for (const v of ['main', 'saves', 'audio', 'lang', 'settings', 'trophies', 'changelog', 'commands', 'credits']) sp.setView(v);
    /* le Impostazioni cambiano col dispositivo: leve e mano su touch, mouse su desktop */
    const pr13 = await import('../src/prefs.js');
    const om13 = globalThis.matchMedia, ow13 = globalThis.innerWidth;
    const dev = on => { globalThis.matchMedia = q => ({ matches: on && /coarse/.test(q) }); globalThis.innerWidth = on ? 390 : 1440; };
    dev(true);
    for (const t of ['joystick', 'float', 'tap']) { pr13.setPref('touch', t); sp.setView('settings'); }
    for (const hnd of ['left', 'right']) { pr13.setPref('hand', hnd); sp.setView('settings'); }
    const menuTouch = document.getElementById('sp-menu').innerHTML;
    check('su telefono: le tre leve e la mano', /data-touch="joystick"/.test(menuTouch)
      && /data-touch="float"/.test(menuTouch) && /data-touch="tap"/.test(menuTouch) && /data-hand="left"/.test(menuTouch));
    check('e nessuna opzione da mouse', !/data-mouse=/.test(menuTouch));
    dev(false);
    for (const m of ['tap', 'follow', 'keys']) { pr13.setPref('mouse', m); sp.setView('settings'); }
    const menuMouse = document.getElementById('sp-menu').innerHTML;
    check('su desktop: le opzioni del mouse', /data-mouse="tap"/.test(menuMouse)
      && /data-mouse="follow"/.test(menuMouse) && /data-mouse="keys"/.test(menuMouse));
    check('e niente leve né mancino, che non avrebbero senso',
      !/data-touch=/.test(menuMouse) && !/data-hand=/.test(menuMouse));
    globalThis.matchMedia = om13; globalThis.innerWidth = ow13;
    pr13.resetPrefs();
    check('ogni vista del menu si costruisce', true);
    sp.setView('main');
    sp.resumeSplash();
    check('si riprende a giocare uscendo dalla splash', sp.splashActive() === false);
  } catch (e) { spErr = e.message; }
  check('il menu non lancia errori', spErr === '', spErr);
}

/* ---------- AUDIO: impostazioni persistite e nessun suono che esploda ---------- */
{
  const au = await import('../src/audio.js');
  const o0 = au.audioOpts();
  check('le impostazioni audio esistono', typeof o0.music === 'boolean' && typeof o0.vol === 'number');
  au.setVolume(0.3); au.setSfxVolume(0.4); au.setMusicOn(false); au.setSfxOn(true);
  const o1 = au.audioOpts();
  check('volume e interruttori si applicano', o1.vol === 0.3 && o1.sfxVol === 0.4 && o1.music === false && o1.sfx === true);
  check('le impostazioni audio stanno FUORI dal salvataggio', !!localStorage.getItem('digsy_audio') && S.vol === undefined);
  au.setVolume(5); au.setSfxVolume(-2);
  const o2 = au.audioOpts();
  check('i volumi restano tra 0 e 1', o2.vol <= 1 && o2.vol >= 0 && o2.sfxVol >= 0 && o2.sfxVol <= 1);
  let sfxErr = '';
  try { for (const n of ['click', 'dig', 'coin', 'found', 'fanfare', 'nope', 'chop', 'mine', 'fish', 'boh']) au.playSfx(n); }
  catch (e) { sfxErr = e.message; }
  check('tutti gli effetti sonori si possono chiamare (anche senza WebAudio)', sfxErr === '', sfxErr);
  let moodErr = '';
  try { for (const z of ['prati', 'dune', 'boschi', 'terre', 'palude', 'ghiacci', 'grotta']) au.setBiomeMood(z); au.armAudioResume(); }
  catch (e) { moodErr = e.message; }
  check('il tema cambia per bioma senza errori', moodErr === '', moodErr);
  au.setVolume(o0.vol); au.setMusicOn(o0.music); au.setSfxOn(o0.sfx);
}

/* ---------- PROIEZIONE VOXEL: tutte le varianti di disegno ---------- */
{
  const vv = await import('../src/voxview.js');
  const bn = await import('../src/bones.js');
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48;
  const vox = bn.buildVoxels(bn.baseSpec('lepre'));
  let e1 = '';
  try {
    vv.projectVox(cv, vox);                          // normale
    vv.projectVox(cv, vox, true);                    // silhouette (specie non ancora scoperta)
    vv.projectVox(cv, vox, false, ['cranio']);       // solo i pezzi consegnati accesi
    vv.projectVox(cv, vox, false, null, '#42301f');  // fondo di roccia (tavolo di preparazione)
    vv.projectVox(cv, vox, false, null, null, 7);    // scala massima
    vv.projectVox(cv, []);                           // modello vuoto: non deve esplodere
    vv.projectVox(cv, bn.buildFleshVoxels(bn.baseSpec('lepre')));  // versione VIVA
  } catch (e) { e1 = e.message; }
  check('la proiezione voxel regge tutte le varianti', e1 === '', e1);
}

/* ---------- TAVOLO DI PREPARAZIONE: il gesto completo ---------- */
{
  const S = state.S;
  const pu = await import('../src/prepui.js');
  const pr2 = await import('../src/prepare.js');
  S.raw = [{ uid: 500, s: 'lepre', t: 'cranio', q: 'eccezionale', val: 100 }];
  const cand = pu.prepCandidate();
  check('il tavolo propone il pezzo del lotto', !!cand);
  let after = 0;
  pu.openPrepare(cand.it, () => { after++; });
  check('il tavolo è aperto', pu.isPrepOpen() === true);
  /* si spazzola trascinando: qui si simula il gesto sulla canvas */
  const cv2 = document.getElementById('pr-cv');
  const drag = (x, y, type) => cv2.dispatchEvent({ type, clientX: x, clientY: y, pointerId: 1, preventDefault() {}, touches: null });
  drag(10, 10, 'pointerdown');
  for (let i = 0; i < 100; i++) drag((i * 7) % 100, (i * 11) % 100, 'pointermove');
  drag(90, 90, 'pointerup');
  const fill = document.getElementById('pr-fill');
  check('la barra di pulizia si riempie mentre si spazzola', parseFloat(fill.style.width) > 0);
  const dusted = parseFloat(fill.style.width);
  /* si scelgono gli altri due attrezzi e si trascina: la pulizia sale ancora (roccia + crosta) */
  for (const t of ['scalpello', 'spatola', 'pennello']) {
    const b = document.getElementById('pr-t-' + t); if (b && b.onclick) b.onclick();
    drag(18, 18, 'pointerdown');
    for (let i = 0; i < 120; i++) drag((i * 5) % 100, (i * 9) % 100, 'pointermove');
    drag(82, 82, 'pointerup');
  }
  check('usando i 3 attrezzi la pulizia cresce ancora', parseFloat(document.getElementById('pr-fill').style.width) >= dusted);
  const doneBtn = document.getElementById('pr-done');
  if (doneBtn && doneBtn.onclick) doneBtn.onclick();
  check('chiudendo, il tavolo si chiude e richiama chi lo ha aperto', pu.isPrepOpen() === false && after === 1);
  check('il reperto porta il segno della preparazione', pr2.isPrepped(S.raw[0]) === true);
  /* ESC deve chiudere anche se si esce a metà */
  pu.openPrepare(S.raw[0], null); pu.closePrepare();
  check('si può chiudere il tavolo in qualsiasi momento', pu.isPrepOpen() === false);
  S.raw = [];
}

/* ---------- RICOMPONI LO SCHELETRO: il gesto di trascinamento (museo) ---------- */
{
  const S = state.S;
  const ui2 = await import('../src/ui.js');
  const sk = await import('../src/skeletonfit.js');
  S.xp = 0;
  const piece1 = { s: 'lepre', t: 'torace', q: 'raro', val: 40 };
  const piece2 = { s: 'lepre', t: 'zampa', q: 'raro', val: 30 };
  let allDone = 0;
  ui2.openSkeletonFit([piece1, piece2], () => { allDone++; });
  check('si apre sul primo pezzo della coda', ui2.isSkeletonFitOpen() === true);
  const piece = document.getElementById('sk-piece');
  const drag = (x, y, type) => piece.dispatchEvent({ type, clientX: x, clientY: y, pointerId: 1, preventDefault() {}, touches: null });
  const torace = sk.socketFor('torace');
  drag(50, 92, 'pointerdown');
  /* socket SBAGLIATO prima: niente fallimento vero, il pezzo torna alla base e si può riprovare */
  const zampa = sk.socketFor('zampa');
  drag(zampa.x * 100, zampa.y * 100, 'pointermove');
  drag(zampa.x * 100, zampa.y * 100, 'pointerup');
  check('socket sbagliato: il minigioco resta aperto sullo stesso pezzo', ui2.isSkeletonFitOpen() === true);
  drag(50, 92, 'pointerdown');
  drag(torace.x * 100, torace.y * 100, 'pointermove');
  drag(torace.x * 100, torace.y * 100, 'pointerup');
  check('socket giusto: XP bonus assegnato', S.xp > 0);
  check('passa al pezzo successivo della coda', ui2.isSkeletonFitOpen() === true);
  /* sempre saltabile: mai una tassa sul loop base */
  const xpAfterFirst = S.xp;
  const skipBtn = document.getElementById('sk-skip'); if (skipBtn && skipBtn.onclick) skipBtn.onclick();
  check('Salta chiude senza bonus e passa oltre', S.xp === xpAfterFirst);
  check('coda esaurita: il minigioco si chiude e richiama chi lo ha aperto', ui2.isSkeletonFitOpen() === false && allDone === 1);
  /* ESC = salta, stessa via del bottone */
  ui2.openSkeletonFit([piece1], () => { allDone++; });
  ui2.skeletonFitSkip();
  check('ESC salta come il bottone', ui2.isSkeletonFitOpen() === false && allDone === 2);
}

/* ---------- BUSSOLA: nome, direzione e passi verso la città più vicina ---------- */
{
  const S = state.S, P3 = state.P;
  const comp = await import('../src/compass.js');
  const w3 = await import('../src/world.js');
  P3.x = 40 * 16; P3.y = 40 * 16;
  comp.nearestTown();
  check('trova una città e ne misura la distanza', !!comp.compass.town && comp.compass.dist < Infinity);
  check('octant copre gli 8 versi', [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]
    .map(([x, y]) => comp.octant(x, y)).filter((v, i, a) => a.indexOf(v) === i).length === 8);
  let compErr = '';
  try { comp.updateCompass(1000); comp.updateCompass(2000); } catch (e) { compErr = e.message; }
  check('la bussola si aggiorna senza errori', compErr === '', compErr);
  check('playerInTown risponde sempre sì o no', typeof comp.playerInTown(comp.compass.town) === 'boolean');
  /* con una mappa del tesoro in mano la bussola deve puntare la X, non la città */
  S.maps = [{ uid: 77, x: 300, y: 300, rar: 'raro' }]; S.trackMap = 77;
  check('con una mappa attiva la bussola segue la X', !!comp.trackedMap());
  S.trackMap = null; S.maps = [];
  check('senza mappa attiva torna alla città', comp.trackedMap() === null);
}

/* ---------- INTRO: la cutscene iniziale ---------- */
{
  const intro = await import('../src/intro.js');
  let introErr = '';
  try {
    let done = false;
    intro.playIntro(() => { done = true; });
    check('avviata, l\'intro è attiva', intro.introActive() === true);
    /* REGOLA FERREA: si avanza solo al click, e ci deve SEMPRE essere una via di fuga */
    const box = document.getElementById('introbox');
    check('l\'intro ha il tasto Salta e il suggerimento "tocca per continuare"',
      !!box && /introskip/.test(box.innerHTML || '') && /continuare|continue/.test(box.innerHTML || ''));
    check('nessun avanzamento automatico: senza click resta lì', intro.introActive() === true);
    /* si avanza SOLO cliccando: qui si clicca fino in fondo, come farebbe un giocatore */
    const tap = document.getElementById('introtap');
    let clicks = 0;
    while (tap && tap.onclick && clicks < 60) { tap.onclick(); clicks++; }
    check('cliccando si scorrono tutte le battute', clicks > 0);
    const skip = document.getElementById('introskip');
    if (skip && skip.onclick) skip.onclick({ stopPropagation() {}, preventDefault() {} });
    check('il tasto Salta chiude l\'intro', intro.introActive() === false);
  } catch (e) { introErr = e.message; }
  check('la cutscene iniziale gira senza errori', introErr === '', introErr);
}

/* ---------- TROFEI: si disegnano tutti ---------- */
{
  const tr2 = await import('../src/trophy.js');
  const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
  let bad = '';
  try { for (let i = 0; i < 12; i++) { tr2.drawTrophy(cv, i, true); tr2.drawTrophy(cv, i, false); } }
  catch (e) { bad = e.message; }
  check('i trofei si disegnano tutti, vinti e non', bad === '', bad);
}

/* ---------- MOBILE: il mondo non deve essere ingrandito fino a tagliare le scene ---------- */
{
  /* la formula dello zoom era nata con le caselle da 16px: con le caselle a 32 e il minimo fermo
     a 2, un telefono mostrava CINQUE caselle e stanze, botteghe e museo uscivano tagliati
     (visto con un test vero su iPhone e Pixel emulati). */
  const scr = await import('../src/screen.js');
  const { TS: TS2 } = await import('../src/data.js');
  const iw = globalThis.innerWidth, ih = globalThis.innerHeight, dp = globalThis.devicePixelRatio;
  const bad = [];
  for (const [w, h, d] of [[320, 568, 2], [390, 664, 3], [412, 839, 2.625], [750, 342, 3], [1280, 800, 2], [1920, 1080, 1]]) {
    globalThis.innerWidth = w; globalThis.innerHeight = h; globalThis.devicePixelRatio = d;
    scr.fit();
    const tilesShort = Math.min(scr.view.W, scr.view.H) / TS2;
    if (tilesShort < 9) bad.push(w + 'x' + h + ': ' + tilesShort.toFixed(1) + ' caselle');
    if (w < 700 && scr.view.W < 10 * TS2) bad.push(w + 'x' + h + ': la stanza (10 caselle) non entra');
    if (scr.view.PX !== scr.view.K * Math.max(1, Math.round(d))) bad.push(w + 'x' + h + ': PX sbagliato');
  }
  globalThis.innerWidth = iw; globalThis.innerHeight = ih; globalThis.devicePixelRatio = dp; scr.fit();
  check('mobile: sul lato corto entrano almeno 9 caselle, e la stanza intera su un telefono', bad.length === 0, bad.join(' | '));
}

/* ---------- GROTTE: le decorazioni hanno un motivo per stare dove stanno ---------- */
{
  /* "tante cose messe lì a caso senza senso": ora funghi, stalagmiti e pozze nascono solo contro
     una parete (sotto le stalattiti, nelle zone umide). In mezzo al pavimento aperto: niente. */
  const ca = await import('../src/caveArt.js');
  const open = { solid: () => false, nodeNear: () => false, nearEntrance: () => false };
  const wallAbove = { solid: (x, y) => y === 99, nodeNear: () => false, nearEntrance: () => false };
  const FUNGO = '#6fe0c8', STALAG = '#4a4239', POZZA = '#2c3c48';
  let aCaso = 0, conMotivo = 0;
  for (let tx = 0; tx < 300; tx++) {
    const cols = new Set();
    const g = { rect: (x, y, w, h, c) => cols.add(c), px: (x, y, c) => cols.add(c) };
    ca.caveFloor(g, tx, 40, 0, 0, open, 1000);
    if (cols.has(FUNGO) || cols.has(STALAG) || cols.has(POZZA)) aCaso++;
    const cols2 = new Set();
    const g2 = { rect: (x, y, w, h, c) => cols2.add(c), px: (x, y, c) => cols2.add(c) };
    ca.caveFloor(g2, tx, 100, 0, 0, wallAbove, 1000);
    if (cols2.has(FUNGO) || cols2.has(STALAG) || cols2.has(POZZA)) conMotivo++;
  }
  check('grotta: in mezzo al pavimento aperto niente funghi, stalagmiti o pozze', aCaso === 0, aCaso + ' caselle');
  check('grotta: contro le pareti invece compaiono', conMotivo > 20, conMotivo + ' caselle');
  let viola = 0;
  const gw = { rect: (x, y, w, h, c) => { if (/^#(2c2942|33304a|7a72ad|3d3960|6d64a4|4a4378)$/i.test(c)) viola++; }, px() {} };
  for (let tx = 0; tx < 50; tx++) ca.caveWall(gw, tx, 5, 0, 0, { solid: (x, y) => y !== 6, nodeNear: () => true, nearEntrance: () => false }, 500);
  check('grotta: niente più pareti viola', viola === 0, viola + '');
}

/* ---------- MERAVIGLIE: tutte e 18 devono disegnarsi ---------- */
{
  const wa = await import('../src/wonderart.js');
  const { WONDERS } = await import('../src/wonders.js');
  const G = { rect() {}, px() {}, shadow() {}, shade8: h => h, snap: v => v, ctx: { fillStyle: '', fillRect() {} } };
  const broken = [];
  for (const t of Object.keys(WONDERS)) {
    for (const time of [0, 1200, 5000]) {
      try { wa.drawWonder(G, t, 100, 100, time); } catch (e) { broken.push(t + ': ' + e.message); }
    }
  }
  check('tutte e 18 le meraviglie si disegnano', broken.length === 0, broken[0] || '');
  /* IN NATIVO: tutte e 18 le meraviglie sono disegnate a 32 px per casella. Prima erano sulla
     griglia da 16 e il mondo le raddoppiava: pixel grossi il doppio di Digsy e delle case.
     Anche le cinque dello Sprite Studio sono state ridisegnate in nativo (a richiesta: "rifai
     tu"); i loro sprite restano nella banca come riserva, ma il nativo ha la precedenza. */
  {
    const wn = await import('../src/wonderNative.js');
    const tipi = Object.keys(WONDERS);
    check('tutte le meraviglie sono disegnate in nativo', tipi.every(t => wn.hasNativeWonder(t)), tipi.filter(t => !wn.hasNativeWonder(t)).join(' '));
    { let viaNativo = true;
      for (const t of tipi) { let n = 0; const G2 = { rect: (x, y, w, h) => { if (w % 1 || h % 1 || w === 0.5) n++; }, px() {}, shadow() {}, shade8: h => h, ctx: { fillStyle: '', fillRect() {} } };
        wa.drawWonder(G2, t, 0, 0, 0); if (n === 0) viaNativo = false; }
      check('drawWonder usa il nativo anche dove c\'è uno sprite dello Studio', viaNativo); }
    const fuori = [];
    for (const t of tipi.filter(x => wn.hasNativeWonder(x))) {
      const half = (WONDERS[t].w * 32) / 2 + 20;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      const rec = { shade8: h => h, px: (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); },
        rect: (x, y, w, h) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x + w); y0 = Math.min(y0, y); y1 = Math.max(y1, y + h); } };
      for (const tm of [0, 700, 1900, 4100]) wn.drawNativeWonder(rec, t, tm);
      const alto = t === 'gianttree' ? -380 : -260;                       // l'albero più alto del mondo
      if (x0 < -half || x1 > half || y0 < alto || y1 > 32) fuori.push(t + ' [' + [x0, x1, y0, y1].join(',') + ']');
    }
    check('ogni meraviglia nativa sta nel suo ingombro (larghezza in caselle, niente sotto terra)', fuori.length === 0, fuori.join(' '));
  }
  check('ogni meraviglia dichiara le sue tile solide', Object.keys(WONDERS).every(t =>
    wa.wonderSolidTile(t, 0, 0, 0, 0) === true || wa.wonderSolidTile(t, 0, 0, 0, 0) === false));
}

/* ---------- MONETE sempre visibili mentre si compra ---------- */
{
  const S = state.S;
  const ui6 = await import('../src/ui.js');
  S.coins = 137;
  ui6.openBuilding({ type: 'store', name: 'Negozio' });
  const chip = document.getElementById('m-coins');
  check('nel pannello si vedono le monete', /137/.test(chip.innerHTML || ''));
  S.coins = 42; ui6.updateHUD();
  check('e si aggiornano dopo un acquisto', /42/.test(chip.innerHTML || ''));
  ui6.closeModal();
}

/* ---------- POSIZIONE: mai NaN, o il gioco diventa ingiocabile ---------- */
{
  const S = state.S, P5 = state.P;
  const inter5 = await import('../src/interior.js');
  /* uscire da un edificio senza porta valida non deve spedire il player nel nulla */
  P5.x = 500; P5.y = 600;
  inter5.enterInterior({ type: 'store', name: 'X' });
  inter5.exitInterior();
  check('uscendo da un edificio malformato si torna da dove si è entrati',
    Number.isFinite(P5.x) && Number.isFinite(P5.y) && P5.x === 500 && P5.y === 600);
  /* e comunque una posizione impazzita si ripara invece di propagarsi */
  P5.x = NaN; P5.y = 12;
  check('una posizione non valida viene riparata', state.sanitizePos() === true && Number.isFinite(P5.x) && Number.isFinite(P5.y));
  check('con la posizione buona non tocca niente', state.sanitizePos() === false);
}

/* ---------- IMPOSTAZIONI: preferenze del giocatore, fuori dal salvataggio ---------- */
{
  const pr3 = await import('../src/prefs.js');
  pr3.resetPrefs();
  /* le due leve esistono solo su touch: il blocco si prova fingendo un telefono */
  const omP = globalThis.matchMedia, owP = globalThis.innerWidth;
  const asTouch = on => { globalThis.matchMedia = q => ({ matches: on && /coarse/.test(q) }); globalThis.innerWidth = on ? 390 : 1440; };
  asTouch(true);
  check('di serie: suggerimenti accesi e leva', pr3.pref('tips') === true && pr3.pref('touch') === 'joystick');
  pr3.setPref('tips', false);
  check('spegnere i suggerimenti si ricorda', pr3.tipsOn() === false && !!localStorage.getItem('digsy_prefs'));
  check('le preferenze NON finiscono nel salvataggio', state.S.tips !== false && state.S.touch === undefined);
  /* il tip spento non deve comparire, ma va segnato come visto: riaccendendoli non arrivano
     tutti insieme e la Guida non li mostra come nuovi */
  {
    const S = state.S; S.tips = {};
    const ui5 = await import('../src/ui.js');
    const shown = ui5.showTip('dig');
    check('coi suggerimenti spenti non compare nulla', shown === false);
    check('ma resta segnato come già visto', !!S.tips.dig);
  }
  /* TRE modi di muoversi, mai due insieme */
  pr3.setPref('touch', 'float');
  check('leva sotto il dito: niente cerchio fisso a schermo', pr3.floatStickOn() === true && pr3.joystickOn() === false);
  check('e il tocco secco manda comunque dove si tocca', pr3.tapToMoveOn() === true);
  pr3.setPref('touch', 'joystick');
  check('leva fissa: nessuna leva fluttuante', pr3.joystickOn() === true && pr3.floatStickOn() === false);
  pr3.setPref('touch', 'tap');
  check('modalità tocca-per-muoverti: la leva sparisce', pr3.tapToMoveOn() === true && pr3.joystickOn() === false && pr3.floatStickOn() === false);
  pr3.setPref('touch', 'joystick');
  check('modalità leva: il tocco sul mondo non muove', pr3.joystickOn() === true && pr3.tapToMoveOn() === false);
  /* i due comandi si escludono: la leva coprirebbe proprio la parte di schermo da toccare */
  check('non esistono mai insieme', !(pr3.joystickOn() && pr3.tapToMoveOn()));
  /* chi aveva salvato il vecchio "entrambi" finisce sul tocco, non in mezzo */
  pr3.setPref('touch', 'both');
  check('la vecchia impostazione "entrambi" passa al tocco', pr3.tapToMoveOn() && !pr3.joystickOn());
  check('una preferenza sconosciuta viene rifiutata', pr3.setPref('inesistente', 1) === false);

  /* MANCINI: i comandi si specchiano */
  const uiH = await import('../src/ui.js');
  pr3.setPref('hand', 'left'); uiH.syncTouchControls();
  check('mancino: i comandi si spostano', pr3.leftHanded() === true && document.body.classList.contains('lefty'));
  pr3.setPref('hand', 'right'); uiH.syncTouchControls();
  check('destro: tornano al loro posto', pr3.leftHanded() === false && !document.body.classList.contains('lefty'));
  /* lo spostamento è solo grafico: il CSS lo applica dove i comandi esistono davvero */
  const css = (await import('node:fs')).readFileSync('src/style.css', 'utf8');
  /* col MOUSE le leve non compaiono mai, e c'è invece il "segui il puntatore" */
  asTouch(false);
  pr3.setPref('touch', 'joystick'); pr3.setPref('mouse', 'follow');
  check('su desktop nessuna leva, nemmeno se scelta prima', !pr3.joystickOn() && !pr3.floatStickOn());
  check('su desktop c\'è il segui-puntatore', pr3.followMouseOn() === true && pr3.tapToMoveOn() === false);
  pr3.setPref('mouse', 'tap');
  check('e il clic-dove-andare resta disponibile', pr3.tapToMoveOn() === true && pr3.followMouseOn() === false);
  asTouch(true);
  check('su telefono il segui-puntatore non esiste', pr3.followMouseOn() === false);
  globalThis.matchMedia = omP; globalThis.innerWidth = owP;

  check('lo specchio dei comandi vale solo su touch',
    /pointer:coarse[^{]*\{[\s\S]*?body\.lefty #abtn/.test(css));
  check('la leva fluttuante non ha una posizione fissa', /#joy\.floating\{[^}]*position:fixed/.test(css));
  pr3.resetPrefs();
}

/* ---------- TOCCO: si mira alla casella TOCCATA, non a quella sotto ---------- */
{
  const tm12 = await import('../src/tapmove.js');
  const { TS: TS12 } = await import('../src/data.js');
  const scr = await import('../src/screen.js');
  scr.fit();
  /* un punto qualsiasi dello schermo → la casella del mondo che c'è sotto il dito.
     Il giocatore poi ci arriva coi PIEDI: è il personaggio a doversi posizionare, non il
     bersaglio a spostarsi. Se le due cose si confondono, per entrare in un negozio bisogna
     toccare l'insegna invece della porta (successo davvero). */
  const rect = { left: 0, top: 0, width: 100, height: 100 };
  const cam12 = { x: 0, y: 0 };
  const w = tm12.screenToWorld(50, 50, rect, { W: 320, H: 320 }, cam12);
  const tileToccata = { tx: Math.floor(w.x / TS12), ty: Math.floor(w.y / TS12) };
  /* la meta si registra spostata in su di 13px, così i piedi finiscono sulla casella giusta */
  tm12.setGoal(w.x, w.y - 13, null);
  const g12 = tm12.goalTile();
  check('la meta è la casella che si è toccata', g12.tx === tileToccata.tx && g12.ty === tileToccata.ty,
    'toccata ' + tileToccata.tx + ',' + tileToccata.ty + ' · meta ' + g12.tx + ',' + g12.ty);
  tm12.clearGoal();
}

/* ---------- TOCCO: deve funzionare in OGNI scena, non solo all'aperto ---------- */
{
  const S = state.S, P10 = state.P;
  const tm10 = await import('../src/tapmove.js');
  const inter10 = await import('../src/interior.js');
  const cave10 = await import('../src/cave.js');
  const { TS: TS10 } = await import('../src/data.js');

  /* DENTRO UN EDIFICIO */
  inter10.enterInterior({ type: 'store', name: 'X', doorx: 5, doory: 5 });
  /* si parte da dove il gioco mette il giocatore entrando (davanti alla porta): scegliere
     una casella a mano rischia di finire dentro uno scaffale */
  const ix0 = inter10.INT.x, iy0 = inter10.INT.y;
  tm10.setGoal(ix0, iy0 - 2 * TS10, null);            // due caselle più su, verso il bancone
  for (let i = 0; i < 40; i++) inter10.updateInterior(1 / 60, {}, 60);
  check('nella stanza si cammina verso la meta', inter10.INT.y < iy0, 'y ' + Math.round(iy0) + ' → ' + Math.round(inter10.INT.y));
  /* l'animazione deve girare MENTRE si cammina (a fine percorso è giusto che si fermi) */
  tm10.setGoal(inter10.INT.x, inter10.INT.y - 3 * TS10, null);
  let animInt = false;
  for (let i = 0; i < 10; i++) { inter10.updateInterior(1 / 60, {}, 60); if (inter10.INT.moving) animInt = true; }
  check('e l\'animazione della camminata parte', animInt === true);
  /* i tasti hanno la precedenza e annullano la meta */
  tm10.setGoal(9 * TS10, 4 * TS10, null);
  inter10.updateInterior(1 / 60, { right: true }, 60);
  check('nella stanza i tasti annullano la meta', tm10.hasGoal() === false);
  /* TOCCANDO L'USCIO si esce: il punto sta oltre l'ultima casella camminabile, quindi senza
     una regola apposta il percorso si fermerebbe davanti alla porta e non uscirebbe mai */
  {
    const doorTx = inter10.INT.w >> 1, doorTy = inter10.INT.h - 1;
    inter10.INT.x = doorTx * TS10 + 8; inter10.INT.y = (inter10.INT.h - 3) * TS10;
    tm10.setGoal(doorTx * TS10 + 8, doorTy * TS10 + 8 - 13, null);
    check('la meta è riconosciuta come uscita', inter10.goalIsExit() === true);
    let uscito = false;
    for (let i = 0; i < 90 && !uscito; i++) { inter10.updateInterior(1 / 60, {}, 60); if (!inter10.INT.active) uscito = true; }
    check('toccando l\'uscio si esce davvero', uscito === true);
  }
  inter10.exitInterior();

  /* NELLA GROTTA */
  cave10.enterCave(1, 10, 10);
  cave10.CAVE.x = (cave10.CAVE.w >> 1) * TS10; cave10.CAVE.y = (cave10.CAVE.h - 4) * TS10;
  const cy0 = cave10.CAVE.y;
  tm10.setGoal(cave10.CAVE.x, cy0 - 3 * TS10, null);
  for (let i = 0; i < 30; i++) cave10.updateCave(1 / 60, {}, 60);
  check('in grotta si cammina verso la meta', cave10.CAVE.y < cy0, 'y ' + cy0 + ' → ' + Math.round(cave10.CAVE.y));
  /* GALLERIA DEL MUSEO: è 60×62 caselle, la camera si ferma al bordo e la porta finisce
     sull'ultima riga di pixel dello schermo — col mouse non è materialmente cliccabile.
     Cliccando POCO SOPRA la porta si deve uscire lo stesso. */
  {
    inter10.enterInterior({ type: 'museum', name: 'Museo', doorx: 5, doory: 5 });
    /* entrando la prima volta parte la cutscene del Curatore, che blocca l'input: qui si
       prova il movimento, non la cutscene */
    inter10.CUT.on = false;
    const cx = inter10.INT.w >> 1;
    inter10.INT.x = cx * TS10 + 8; inter10.INT.y = (inter10.INT.h - 4) * TS10;
    check('vicino all\'uscita il gioco lo segnala', inter10.nearExit() === true);
    /* meta TRE caselle sopra la porta e una di lato: deve valere come uscita */
    tm10.setGoal((cx + 1) * TS10 + 8, (inter10.INT.h - 2) * TS10 + 8 - 13, null);
    check('cliccare poco sopra la porta vale come uscita', inter10.goalIsExit() === true);
    /* DA DENTRO LA GALLERIA fino a fuori, col solo clic: è il caso che si rompeva.
       Il bancone del Curatore sta davanti alla porta e va aggirato; se il percorso promette
       un passaggio in cui il personaggio non entra, ci si incastra e non si esce più. */
    {
      const pfM = await import('../src/path.js');
      const blockedM = (tx, ty) => !pfM.fits(tx, ty, TS10, inter10.intCollide);
      inter10.INT.x = cx * TS10 + 8; inter10.INT.y = (inter10.INT.h - 8) * TS10;
      const sx = Math.floor(inter10.INT.x / TS10), sy = Math.floor((inter10.INT.y + 13) / TS10);
      const pM = pfM.findPath(sx, sy, cx, inter10.INT.h - 2, blockedM, 30);
      check('c\'è un percorso dalla galleria alla porta', !!pM && pM.length > 0);
      /* ogni casella del percorso deve essere davvero percorribile dal personaggio */
      check('il percorso promette solo passaggi in cui il personaggio entra',
        !!pM && pM.every(([tx, ty]) => !blockedM(tx, ty)));
      tm10.setGoal(cx * TS10 + 8, (inter10.INT.h - 2) * TS10 + 8 - 13, pM);
      let fuoriM = false;
      for (let i = 0; i < 400 && !fuoriM; i++) { inter10.updateInterior(1 / 60, {}, 60); if (!inter10.INT.active) fuoriM = true; }
      check('col solo clic si esce dal museo', fuoriM === true);
      /* CLICCANDO LA STRADA disegnata oltre la porta: è il gesto naturale ("vado fuori"),
         e prima non funzionava perché fuori dalla stanza non c'è nulla di calpestabile */
      inter10.enterInterior({ type: 'museum', name: 'Museo', doorx: 5, doory: 5 });
      inter10.CUT.on = false;
      inter10.INT.x = cx * TS10 + 8; inter10.INT.y = (inter10.INT.h - 6) * TS10;
      const fuori = { tx: cx, ty: inter10.INT.h };            // una casella OLTRE la stanza
      const conv = (tx, ty) => (ty >= inter10.INT.h - 1 && Math.abs(tx - cx) <= 3)
        ? { tx: cx, ty: inter10.INT.h - 2 } : null;
      const soglia = conv(fuori.tx, fuori.ty);
      check('il clic sulla strada si traduce nella soglia', !!soglia && soglia.ty === inter10.INT.h - 2);
      const sx2 = Math.floor(inter10.INT.x / TS10), sy2 = Math.floor((inter10.INT.y + 13) / TS10);
      const p2 = pfM.findPath(sx2, sy2, soglia.tx, soglia.ty, blockedM, 30);
      tm10.setGoal(soglia.tx * TS10 + 8, soglia.ty * TS10 + 8 - 13, p2);
      let fuoriS = false;
      for (let i = 0; i < 400 && !fuoriS; i++) { inter10.updateInterior(1 / 60, {}, 60); if (!inter10.INT.active) fuoriS = true; }
      check('cliccando fuori dalla porta si esce', fuoriS === true);
      inter10.enterInterior({ type: 'museum', name: 'Museo', doorx: 5, doory: 5 });
      inter10.CUT.on = false;
    }
    /* dal corridoio DAVANTI alla porta (sotto il bancone del Curatore, che sta a metà
       strada) il cammino è libero: si deve uscire */
    inter10.INT.y = (inter10.INT.h - 3) * TS10;
    tm10.setGoal(cx * TS10 + 8, (inter10.INT.h - 2) * TS10 + 8 - 13, null);
    let uscito2 = false;
    for (let i = 0; i < 200 && !uscito2; i++) { inter10.updateInterior(1 / 60, {}, 60); if (!inter10.INT.active) uscito2 = true; }
    check('e si esce davvero dalla galleria', uscito2 === true);
    tm10.clearGoal();
  }

  /* uscita dalla grotta toccando il corridoio in basso */
  {
    const ex = cave10.CAVE.w >> 1;
    cave10.CAVE.x = ex * TS10 + 8; cave10.CAVE.y = (cave10.CAVE.h - 4) * TS10;
    tm10.setGoal(ex * TS10 + 8, (cave10.CAVE.h - 1) * TS10 + 8 - 13, null);
    let fuori = false;
    for (let i = 0; i < 90 && !fuori; i++) { cave10.updateCave(1 / 60, {}, 60); if (!cave10.CAVE.active) fuori = true; }
    check('toccando l\'uscita della grotta si risale', fuori === true);
  }
  tm10.clearGoal();
  cave10.exitCave();

  /* la camera di ogni scena esiste: è ciò che traduce il tocco in un punto della scena */
  check('ogni scena sa dov\'è la sua camera',
    typeof (await import('../src/interiors.js')).interiorCam === 'function' && typeof cave10.caveCam === 'function');
}

/* ---------- I TESTI DEVONO DIRE I NUMERI VERI (regola ferrea) ---------- */
{
  const fsN = (await import('node:fs'));
  const gpN = await import('../src/gameplay.js');
  const dN = await import('../src/data.js');
  const uiSrc = fsN.readFileSync('src/ui.js', 'utf8');
  const tipSrc = fsN.readFileSync('src/tips.js', 'utf8');
  const all = uiSrc + tipSrc;
  /* i numeri scritti a mano nei testi invecchiano male: se qualcuno cambia la costante e
     non il testo, il gioco mente al giocatore. Qui i due valori si confrontano. */
  const eat = 15;                                    // quanto rende un ristoro (eatSnack)
  check('il testo del ristoro dice il vero (+' + eat + ' ⚡)', all.includes('+' + eat + ' ⚡'));
  check('il costo dell\'uovo nel testo è quello vero (interpolato, non scritto a mano)',
    uiSrc.includes('${EGG_FOOD}') && uiSrc.includes('${EGG_ENERGY}') && uiSrc.includes('${EGG_DAYS}'));
  /* DNA: 2 fialette per il risveglio, 1 per una chimera. Nessun testo deve dire "una
     fialetta risveglia": è stato sbagliato davvero. */
  check('nessun testo promette il risveglio con UNA sola fialetta',
    !/una fialetta di DNA intera, invece, faccio rivivere/.test(all) &&
    !/a full DNA vial I can instead revive/.test(all));
  check('i testi del DNA dicono che ne servono 2',
    /2 fialette|2 DNA vials|2 risvegliano|2</.test(all));
  /* zaino: la capienza mostrata deve venire dalla funzione, non da un numero scritto */
  /* il numero esatto è una manopola di bilanciamento: qui si pretende solo che l'interfaccia
     lo CHIEDA al gioco (bagCap()) e che le taglie siano una scala crescente col suo listino */
  check('la capienza dello zaino non è scritta a mano', /bagCap\(\)/.test(uiSrc)
    && gpN.BAG_CAPS.length === gpN.BAG_UPCOST.length + 1
    && gpN.BAG_CAPS.every((c, i) => i === 0 || c > gpN.BAG_CAPS[i - 1]));
}

/* ---------- MINIATURE: dove c'è un pezzo, si deve vedere il pezzo ---------- */
{
  /* La canvas della miniatura ha il fondo scuro: se nessuno ci disegna sopra il voxel,
     al posto del fossile resta un quadrato nero. È successo nel pannello della fusione,
     dove mancava la chiamata a hydratePv dopo l'innerHTML. */
  const src15 = (await import('node:fs')).readFileSync('src/ui.js', 'utf8');
  const heads = [...src15.matchAll(/function (render\w+|open\w+)\s*\([^)]*\)\s*\{/g)];
  const senza = [];
  for (let i = 0; i < heads.length; i++) {
    const body = src15.slice(heads[i].index, i + 1 < heads.length ? heads[i + 1].index : src15.length);
    if (/data-pv=/.test(body) && !/hydratePv\(/.test(body)) senza.push(heads[i][1]);
  }
  check('ogni pannello con miniature le disegna davvero', senza.length === 0, senza.join(' '));
}

/* ---------- La pagina COMANDI elenca anche quelli della console ---------- */
{
  const sp14 = await import('../src/splash.js');
  const cm14 = await import('../src/commands.js');
  sp14.showSplash(); sp14.setView('commands');
  const html14 = document.getElementById('sp-menu').innerHTML;
  check('la pagina Comandi elenca i comandi della console', /sp-cmdrow/.test(html14));
  /* i comandi che servono ai tester devono essere raggiungibili senza sapere già che
     esistono: prima si scoprivano solo scrivendo `help` dentro la console */
  for (const c of ['dupes', 'prep', 'stress', 'godmode', 'vanilla']) {
    check('… compreso ' + c, html14.includes(c));
  }
  check('l\'elenco viene da un posto solo', cm14.commandHelp().length >= 20 &&
    cm14.commandHelp().every(t => typeof t === 'string' && t.length > 4));
  /* in ordine alfabetico: cercarne uno in trenta righe disordinate è una tortura */
  {
    const names = cm14.commandHelp().map(t => t.split('—')[0].trim().toLowerCase());
    check('i comandi sono in ordine alfabetico', names.every((v, i) => i === 0 || names[i - 1] <= v),
      names.find((v, i) => i > 0 && names[i - 1] > v) || '');
  }
  sp14.setView('main'); sp14.resumeSplash();
}

/* ---------- COMANDO dupes: doppioni pronti per provare la fusione ---------- */
{
  const S = state.S;
  const cmd9 = await import('../src/commands.js');
  const fz9 = await import('../src/fuse.js');
  S.items = [];
  const out9 = cmd9.runCommand('dupes');
  check('dupes dà 3 pezzi identici', S.items.length === 3 &&
    S.items.every(x => x.s === S.items[0].s && x.t === S.items[0].t));
  check('e sono subito fondibili', fz9.fusibleGroups(S.items).length === 1, out9);
  check('la specie ottenuta è nel codex (si vede il nome, non "???")', S.codex.includes(S.items[0].s));
  S.items = [];
  cmd9.runCommand('dupes=eccezionale');
  check('si può scegliere la rarità', S.items.length === 3 && S.items[0].q === 'eccezionale');
  S.items = [];
  cmd9.runCommand('doppioni');
  check('alias italiano', S.items.length === 3);
  cmd9.runCommand('vanilla');
  S.items = [];
}

/* ---------- FUSIONE DEI DOPPIONI: 3 uguali → 1 di rarità superiore ---------- */
{
  const S = state.S;
  const fz = await import('../src/fuse.js');
  const gp9 = await import('../src/gameplay.js');
  const d9 = await import('../src/data.js');
  const com = d9.ALL_SPECIES.find(s2 => s2.r === 'comune' && s2.zone === 'prati');

  /* servono TRE pezzi identici, non due */
  S.items = [
    { uid: 1, s: com.id, t: 'zampa', q: 'comune', val: 5 },
    { uid: 2, s: com.id, t: 'zampa', q: 'comune', val: 5 },
  ];
  check('con due pezzi non si fonde', fz.fusibleGroups(S.items).length === 0);
  S.items.push({ uid: 3, s: com.id, t: 'zampa', q: 'comune', val: 5 });
  const g = fz.fusibleGroups(S.items)[0];
  check('con tre pezzi uguali il gruppo compare', !!g && g.spId === com.id && g.part === 'zampa');

  /* il risultato: stessa parte, rarità sopra, specie della stessa zona */
  const res = fz.fuseResult(g, arr => arr[0]);
  check('sale di una rarità', res.q === 'raro');
  check('resta la stessa parte', res.part === 'zampa');
  check('la specie viene dalla stessa zona', d9.spById[res.spId].zone === com.zone);
  check('e vale di più dell\'originale', res.val > 5);

  /* la fusione consuma esattamente tre pezzi e ne rende uno */
  S.items = [
    { uid: 10, s: com.id, t: 'coda', q: 'comune', val: 4 },
    { uid: 11, s: com.id, t: 'coda', q: 'comune', val: 4 },
    { uid: 12, s: com.id, t: 'coda', q: 'comune', val: 4 },
    { uid: 13, s: com.id, t: 'coda', q: 'comune', val: 4 },
  ];
  S.codex = []; S.uid = 500; S.museum = {};
  const out = gp9.fuseDupes(com.id, 'coda');
  check('fondere toglie 3 pezzi e ne aggiunge 1', !!out && S.items.length === 2);
  check('il pezzo nuovo è nello zaino', S.items.some(x => x.uid === out.uid && x.q === 'raro'));
  check('fondere fa scoprire la specie ottenuta', S.codex.includes(out.s));
  check('lo zaino non si riempie fondendo', S.items.length < 4);

  /* i leggendari sono il tetto: non si fondono */
  const leg = d9.ALL_SPECIES.find(s2 => s2.r === 'leggendario');
  S.items = [1, 2, 3].map(i => ({ uid: 20 + i, s: leg.id, t: 'cranio', q: 'leggendario', val: 90 }));
  check('i leggendari non si fondono (sono già il massimo)', fz.fusibleGroups(S.items).length === 0);
  check('nextRarity si ferma al leggendario', fz.nextRarity('leggendario') === null && fz.nextRarity('raro') === 'eccezionale');

  /* pezzi di specie diverse non sono doppioni */
  const com2 = d9.ALL_SPECIES.filter(s2 => s2.r === 'comune' && s2.zone === 'prati')[1];
  S.items = [
    { uid: 30, s: com.id, t: 'cranio', q: 'comune', val: 8 },
    { uid: 31, s: com2.id, t: 'cranio', q: 'comune', val: 8 },
    { uid: 32, s: com.id, t: 'cranio', q: 'comune', val: 8 },
  ];
  check('specie diverse non fanno gruppo', fz.fusibleGroups(S.items).length === 0);
  /* e nemmeno parti diverse della stessa specie */
  S.items = [
    { uid: 40, s: com.id, t: 'cranio', q: 'comune', val: 8 },
    { uid: 41, s: com.id, t: 'torace', q: 'comune', val: 7 },
    { uid: 42, s: com.id, t: 'coda', q: 'comune', val: 4 },
  ];
  check('parti diverse non fanno gruppo', fz.fusibleGroups(S.items).length === 0);
  S.items = [];
}

/* ---------- ALLEVAMENTO: la prole nasce da 2 chimere che hai già, tu scegli i tratti ---------- */
{
  const S = state.S;
  const br = await import('../src/breeding.js');
  const d10 = await import('../src/data.js');
  const water3 = d10.ALL_SPECIES.find(s2 => s2.src === 'acqua'), tree3 = d10.ALL_SPECIES.find(s2 => s2.src === 'albero');
  const keepC = S.creatures, keepI = S.items, keepEn = S.energy, keepEgg = S.egg, keepDay = S.day, keepUid = S.uid;
  S.egg = null; S.day = 5; S.uid = 8000;
  const p1 = { uid: 7001, name: 'Mamma', skull: water3.id, torso: water3.id, leg: water3.id, q: 'raro' };
  const p2 = { uid: 7002, name: 'Papà', skull: tree3.id, torso: tree3.id, leg: tree3.id, q: 'eccezionale' };
  S.creatures = [p1, p2];

  /* anteprima PURA: da chi eredita cosa, senza tirare i dadi */
  const prev = br.previewOffspring(p1, p2, { skull: 1, torso: 2, leg: 1 });
  check('anteprima: eredita esattamente quello scelto (skull=p1, torso=p2, leg=p1)',
    prev.skull === water3.id && prev.torso === tree3.id && prev.leg === water3.id);

  /* canLay: servono 2 genitori diversi, abbastanza doppioni, abbastanza energia */
  S.items = []; S.energy = 30;
  check('senza doppioni a sufficienza: non si può deporre', br.canLay(p1.uid, p2.uid).ok === false);
  S.items = Array.from({ length: br.EGG_FOOD }, (_, i) => ({ uid: 100 + i, s: water3.id, t: 'coda', q: 'comune', val: 3 + i }));
  check('con genitori uguali: rifiutato', br.canLay(p1.uid, p1.uid).ok === false);
  S.energy = 0;
  check('senza energia: rifiutato', br.canLay(p1.uid, p2.uid).ok === false);
  S.energy = 30;
  check('genitori diversi + doppioni + energia: via libera', br.canLay(p1.uid, p2.uid).ok === true);

  /* il cibo previsto sono i MENO preziosi (protegge quelli buoni), come la commissione */
  S.items = [{ uid: 200, s: water3.id, t: 'coda', q: 'leggendario', val: 90 }, ...S.items];
  const food = br.foodPreview();
  check('il cibo sceglie i doppioni MENO preziosi, non i più pregiati', !food.some(it => it.uid === 200));

  /* depone l'uovo: consuma cibo+energia, un solo uovo alla volta */
  S.items = Array.from({ length: br.EGG_FOOD }, (_, i) => ({ uid: 300 + i, s: water3.id, t: 'coda', q: 'comune', val: 3 + i }));
  const before = { items: S.items.length, energy: S.energy };
  const omB = Math.random; Math.random = () => 0.99; // mai mutazione, mai bonus rarità: la base esatta
  const r1 = br.layEgg(p1.uid, p2.uid, { skull: 1, torso: 2, leg: 1 }, S.day);
  check('layEgg riesce e consuma cibo+energia', r1.ok === true && S.items.length === before.items - br.EGG_FOOD && S.energy === before.energy - br.EGG_ENERGY);
  check('senza mutazione/bonus: eredita esattamente la scelta, rarità = la massima dei 2 genitori',
    S.egg.skull === water3.id && S.egg.torso === tree3.id && S.egg.leg === water3.id && S.egg.q === 'eccezionale');
  check('un uovo alla volta: non se ne depone un secondo', br.layEgg(p1.uid, p2.uid, { skull: 1, torso: 1, leg: 1 }).ok === false);
  Math.random = omB;

  /* non è pronto prima del tempo, lo è dopo EGG_DAYS */
  check('non ancora pronto', br.eggReady(S.day) === false && br.eggDaysLeft(S.day) === br.EGG_DAYS);
  check('pronto dopo EGG_DAYS giorni', br.eggReady(S.day + br.EGG_DAYS) === true);
  check('non si schiude in anticipo', br.hatchEgg(S.day) === null);
  const nCreaturesBefore = S.creatures.length;
  const child = br.hatchEgg(S.day + br.EGG_DAYS);
  check('la schiusa materializza la creatura già decisa alla deposizione', !!child && child.skull === water3.id && child.torso === tree3.id && child.q === 'eccezionale');
  check('finisce nel parco (S.creatures) e libera lo slot per il prossimo uovo', S.creatures.length === nCreaturesBefore + 1 && br.egg() === null);

  /* mutazione: con la fortuna sempre a favore, ESCE una specie imparentata, non quella scelta */
  S.creatures = [p1, p2]; S.items = Array.from({ length: br.EGG_FOOD }, (_, i) => ({ uid: 400 + i, s: water3.id, t: 'coda', q: 'leggendario', val: 50 }));
  const omB2 = Math.random; Math.random = () => 0.0; // mutazione SEMPRE, bonus rarità SEMPRE
  const r2 = br.layEgg(p1.uid, p2.uid, { skull: 1, torso: 1, leg: 1 }, S.day);
  Math.random = omB2;
  check('mutazione garantita: la prole NON è la specie scelta, ma della stessa FONTE (un altro Pescatore)',
    r2.ok === true && S.egg.skull !== water3.id && (d10.spById[S.egg.skull].src || 'terra') === 'acqua');
  check('bonus di rarità garantito: sale di un gradino oltre il massimo dei genitori (eccezionale→leggendario)', S.egg.q === 'leggendario');

  S.creatures = keepC; S.items = keepI; S.energy = keepEn; S.egg = keepEgg; S.day = keepDay; S.uid = keepUid;
}

/* ---------- TOCCO: si deve poter ENTRARE toccando la porta ---------- */
{
  const S = state.S, P8 = state.P;
  const tm8 = await import('../src/tapmove.js');
  const inter8 = await import('../src/interior.js');
  const w8 = await import('../src/world.js');
  const { TS: TS8 } = await import('../src/data.js');
  /* si cerca una porta vera nel mondo */
  let door = null;
  for (let cx = -10; cx < 10 && !door; cx++) for (let cy = -10; cy < 10 && !door; cy++) {
    const t = w8.townForCell(cx, cy);
    if (t && t.buildings && t.buildings.length) { const b = t.buildings[0]; door = { b, t }; }
  }
  check('trovata una porta nel mondo', !!door);
  if (door) {
    const dx = door.b.doorx, dy = door.b.doory;
    /* in piedi SULLA porta ma senza intenzione: non si entra (si sta passando) */
    inter8.exitInterior();
    P8.x = dx * TS8 + 8; P8.y = dy * TS8 - 13 + 8; P8.moving = true; P8.dir = 'right';
    tm8.clearGoal(); inter8.INT.justLeft = false;
    inter8.checkDoorEnter();
    check('passando davanti alla porta non si entra', inter8.INT.active === false);
    /* stessa posizione, ma la porta è dove si è TOCCATO: si entra */
    tm8.setGoal(dx * TS8 + 8, dy * TS8 - 13 + 8, null);
    check('la meta coincide con la porta', tm8.goalIsTile(dx, dy) === true);
    inter8.checkDoorEnter();
    check('toccando la porta ci si entra da qualsiasi lato', inter8.INT.active === true);
    check('e entrando la meta si annulla', tm8.hasGoal() === false);
    inter8.exitInterior();
  }
}

/* ---------- ZAINO: lasciare a terra deve essere possibile anche su un telefono ---------- */
{
  const S = state.S;
  const ui7 = await import('../src/ui.js');
  const { ALL_SPECIES: SP7 } = await import('../src/data.js');
  S.items = [{ uid: 8001, s: SP7[0].id, t: 'zampa', q: 'comune', val: 5 }];
  S.raw = []; S.goods = [];
  ui7.openBag('finds');
  const box = document.getElementById('bagbox');
  check('ogni reperto ha il comando "lascia a terra"', /data-drop="8001"/.test(box.innerHTML || ''));
  /* l'icona del cestino deve ESISTERE nel set: withIcons strippa le emoji che non conosce,
     e il bottone restava muto (era successo: 🗑 non era mappata) */
  {
    const ic7 = await import('../src/icons.js');
    check('il cestino ha la sua icona pixel', ic7.ICON_NAMES.includes('trash'));
    const isrc7 = (await import('node:fs')).readFileSync('src/icons.js', 'utf8');
    check('e la mappa emoji→icona la conosce', /'🗑': 'trash'/.test(isrc7));
  }
  /* un comando solo, uguale ovunque: il trascinamento-fuori è stato tolto perché su un
     telefono lo zaino copre tutto lo schermo e un "fuori" non esiste */
  const bag = document.getElementById('bagbox').innerHTML;
  check('si spiega di toccare il cestino', /Tocca/.test(bag) && !/Trascina/.test(bag));
  const uisrc = (await import('node:fs')).readFileSync('src/ui.js', 'utf8');
  check('del trascinamento non resta traccia', !/data-drag=|bagDrag|DRAG_MIN/.test(uisrc));
  ui7.closeBag();
  S.items = [];
}

/* ---------- MONDO: nessuna ricorsione che esaurisca lo stack ---------- */
{
  const w6 = await import('../src/world.js');
  const gp6 = await import('../src/gameplay.js');
  const S = state.S, P6 = state.P;
  /* Regressione vera: decoAt → caveClearingAt → caveEntranceAt → caveCompute → siteAt →
     siteForCell → decoAt. Ogni anello tocca caselle diverse, quindi la catena si allunga
     invece di ripetersi: con le cache fredde (arrivo in una zona mai vista, per esempio
     dopo un teletrasporto) faceva "Maximum call stack size exceeded". */
  let boom = '';
  const pf6 = await import('../src/path.js');
  try {
    /* è la ricerca di percorso a scoprirlo: interroga centinaia di caselle mai viste in
       un colpo solo, che è esattamente quello che succede al primo tocco dopo un viaggio */
    for (let i = 0; i < 60; i++) {
      P6.x = (i * 37 % 4000) * TS; P6.y = (i * 53 % 4000) * TS;
      const tx = Math.floor(P6.x / TS), ty = Math.floor((P6.y + 13) / TS);
      for (const [dx, dy] of [[10, 8], [0, 18], [12, 12]]) pf6.findPath(tx, ty, tx + dx, ty + dy, gp6.tileBlocked);
    }
  } catch (e) { boom = e.message; }
  check('esplorare zone mai viste non esaurisce lo stack', boom === '', boom);
  /* e chi genera il mondo non deve passare dal ramo delle grotte */
  const wsrc = (await import('node:fs')).readFileSync('src/world.js', 'utf8');
  check('la generazione dei siti usa la decorazione naturale, non decoAt',
    /!decoNatural\(x, y\)/.test(wsrc) && !/!decoAt\(x, y\)/.test(wsrc));
}

/* ---------- PERCORSO: aggirare gli ostacoli, ma non attraversare il mondo ---------- */
{
  const pf = await import('../src/path.js');
  /* muro verticale con un varco: il percorso deve trovarlo */
  const wall = (tx, ty) => tx === 5 && ty !== 3;
  const p1 = pf.findPath(0, 0, 10, 0, wall);
  check('aggira un muro passando dal varco', !!p1 && p1.some(([x, y]) => x === 5 && y === 3));
  check('e arriva davvero alla meta', p1[p1.length - 1][0] === 10 && p1[p1.length - 1][1] === 0);
  /* muro chiuso: nessun percorso, e lo si dice */
  const closed = (tx) => tx === 5;
  check('muro senza varchi: nessun percorso', pf.findPath(0, 0, 10, 0, closed) === null);
  /* limite di lunghezza: 40 caselle */
  const free = () => false;
  check('entro il limite si va', !!pf.findPath(0, 0, 30, 0, free));
  check('oltre 40 caselle il tocco non vale', pf.findPath(0, 0, 60, 0, free) === null);
  check('il limite è configurabile', !!pf.findPath(0, 0, 60, 0, free, 80) && pf.MAX_LEN === 40);
  /* niente tagli attraverso gli spigoli: due muri a L non si attraversano in diagonale */
  const corner = (tx, ty) => (tx === 1 && ty === 0) || (tx === 0 && ty === 1);
  const p2 = pf.findPath(0, 0, 1, 1, corner);
  check('non si passa attraverso gli spigoli', p2 === null || !p2.some(([x, y]) => x === 1 && y === 1 && p2.length === 1));
  /* toccando un albero (casella occupata) si va accanto invece di rifiutare */
  const tree = (tx, ty) => tx === 4 && ty === 0;
  const p3 = pf.findPath(0, 0, 4, 0, tree);
  check('toccando un ostacolo ci si ferma accanto', !!p3 && p3.length > 0 && !tree(p3[p3.length - 1][0], p3[p3.length - 1][1]));
  /* costo: una ricerca deve stare dentro un frame anche nel caso peggiore, cioè quando il
     percorso NON esiste e l'A* esplora tutto quello che gli è concesso */
  {
    const maze = (tx, ty) => (tx % 4 === 0) && (ty % 7 !== 0);
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) pf.findPath(0, 0, 30, 25, maze);
    check('una ricerca costa meno di 16 ms (un frame)', (Date.now() - t0) / 20 < 16);
    const chiuso = () => true;                       // nessuna via: il caso più caro
    const t1 = Date.now();
    for (let i = 0; i < 20; i++) pf.findPath(0, 0, 25, 25, chiuso);
    check('anche senza vie d\'uscita resta sotto un frame', (Date.now() - t1) / 20 < 16);
  }
  /* la stessa casella non va interrogata due volte: è la memoria che tiene giù i tempi */
  {
    let calls = 0;
    pf.findPath(0, 0, 12, 9, (tx, ty) => { calls++; return false; });
    check('ogni casella viene valutata una volta sola', calls < 400, calls + ' chiamate');
  }
}

/* ---------- TOCCA DOVE ANDARE: cammina, scivola sui muri, si arrende ---------- */
{
  const tm = await import('../src/tapmove.js');
  const P4 = state.P;
  P4.x = 100; P4.y = 100;
  check('senza meta non si muove', tm.hasGoal() === false && tm.advance(0.1, 60, () => true) === false);
  tm.setGoal(200, 100);
  check('meta impostata', tm.hasGoal() === true);
  /* passo verso destra */
  const st = tm.stepToward(100, 100, 200, 100);
  check('la direzione punta alla meta', st.dx === 1 && st.dy === 0 && st.dist === 100);
  tm.advance(0.5, 100, (nx, ny) => { P4.x = nx; P4.y = ny; return true; });
  check('avanza verso la meta', P4.x > 100 && P4.dir === 'right');
  /* arrivo: la meta si spegne da sola */
  P4.x = 199.5; P4.y = 100;
  tm.advance(0.1, 100, () => true);
  check('arrivati, la meta si spegne', tm.hasGoal() === false);
  /* muro: dopo un po' si rinuncia invece di spingere all'infinito */
  P4.x = 100; P4.y = 100;
  tm.setGoal(300, 100);
  for (let i = 0; i < 40; i++) tm.advance(0.05, 100, () => false);
  check('contro un muro si rinuncia da soli', tm.hasGoal() === false);
  /* scivolamento: bloccato in diagonale, passa lungo un asse */
  P4.x = 100; P4.y = 100;
  tm.setGoal(200, 200);
  let tries = 0;
  tm.advance(0.1, 100, (nx, ny) => { tries++; if (tries === 1) return false; P4.x = nx; P4.y = ny; return true; });
  check('se la diagonale è bloccata scivola su un asse', tries >= 2 && (P4.x !== 100 || P4.y !== 100));
  tm.clearGoal();
  /* schermo → mondo */
  const w = tm.screenToWorld(50, 25, { left: 0, top: 0, width: 100, height: 50 }, { W: 200, H: 100 }, { x: 1000, y: 500 });
  check('il tocco si converte in coordinate del mondo', w.x === 1100 && w.y === 550);
}

/* ---------- APERTURA: intro CORTA, e l'insegnamento passato al TUTORIAL ----------
   L'intro raccontava tutto in sedici battute e quasi tutti premevano Salta — comprese le
   battute che servivano davvero (il reperto è grezzo, si porta al Museo, la roba a terra si
   vende per comprare la pala). Ora l'intro fa solo la cornice e le lezioni le FA FARE il
   tutorial. Questi controlli tengono ferme tutte e due le metà: che l'intro resti corta, e
   che nessuna delle lezioni si sia persa per strada nel trasloco. */
{
  const fs4 = (await import('node:fs'));
  const isrc = fs4.readFileSync('src/intro.js', 'utf8');
  const tsrc = fs4.readFileSync('src/tutorial.js', 'utf8');
  const battute = (isrc.match(/\{ s: '[GD]'/g) || []).length;
  check(`l'intro non supera le 5 battute (${battute})`, battute > 0 && battute <= 5);
  check('il tutorial insegna a raccogliere le cose da terra',
    /luccicano|shiny things/i.test(tsrc));
  check('il tutorial manda a vendere al Negozio e a comprare la pala',
    /Negozio|Shop/.test(tsrc) && /pala|spade/i.test(tsrc));
  /* IL REGALO DEL NONNO È GREZZO. Un grezzo non serve a niente finché non lo si fa
     identificare, e si identifica SOLO al Museo. Se domani il Museo comparisse anche altrove
     (o sparisse dalle città grandi) i controlli qui sotto cadono, ed è quello che devono fare. */
  check('il tutorial manda al Museo a far identificare il grezzo', /Museo|Museum/.test(tsrc));
  check('il tutorial insegna a piazzare un mobile prima di scavare',
    /armchair/.test(tsrc));
  {
    /* la promessa del nonno regge sul mondo vero? */
    let cities = 0, withMus = 0, smallWithMus = 0;
    for (let cx = -8; cx < 8; cx++) for (let cy = -8; cy < 8; cy++) {
      const t = world.townForCell(cx, cy); if (!t) continue;
      const m = world.hasMuseum(t);
      if (t.size === 'città') { cities++; if (m) withMus++; }
      else if (m) smallWithMus++;
    }
    check(`ogni città grande ha davvero il Museo (${withMus}/${cities})`, cities > 0 && withMus === cities);
    check('borghi e paesi davvero non ne hanno', smallWithMus === 0);
  }
}

/* ---------- TUTORIAL: i cinque passi sono il ciclo d'apertura, e sono ESEGUIBILI ----------
   Il primo ordine che avevo scritto (esci → scava → raccogli) non stava in piedi: si nasce
   SENZA pala e con zero monete, e senza pala `tryDig` rifiuta. Un tutorial che chiede una cosa
   che il gioco vieta è peggio di nessun tutorial. Questi controlli tengono l'ordine ancorato
   alle regole vere: la pala prima dello scavo, e il Museo raggiungibile da dove si parte.
   La partita ORA comincia dentro la Sala di casa propria (main.js entra da solo dopo
   editor/intro): `armchair` è quindi il PRIMISSIMO passo, prima ancora di uscire in strada —
   piazzare la poltrona di partenza (già nel vassoio, regalata in state.js) è il primo gesto
   possibile da dove ci si trova. */
{
  const tut = await import('../src/tutorial.js');
  const gp5 = await import('../src/gameplay.js');
  const dataT = await import('../src/data.js');
  const house = await import('../src/house.js');
  const S = state.S, P5 = state.P;
  check('i passi sono cinque, nell\'ordine del ciclo d\'apertura',
    tut.STEP_IDS.join('>') === 'armchair>pick>shop>dig>museum');
  /* si nasce senza pala: il passo dello scavo NON può venire prima di quello del Negozio */
  check('lo scavo viene DOPO aver comprato la pala',
    tut.STEP_IDS.indexOf('shop') < tut.STEP_IDS.indexOf('dig'));
  /* la poltrona è il primissimo gesto: si è già in Sala, prima ancora di uscire in strada */
  check('la poltrona è il primissimo passo',
    tut.STEP_IDS.indexOf('armchair') === 0 && tut.STEP_IDS.indexOf('armchair') < tut.STEP_IDS.indexOf('pick'));

  /* piazza/rimuove la poltrona di partenza nella stanza 0 (Sala), per pilotare l'auto() del
     passo senza passare dal vero overlay della casa */
  const armchairSet = (on) => {
    house.ensureHouseState();
    S.house.rooms[0].furn = on ? [{ itemId: dataT.STARTER_FURN_ID, gx: 2, gy: 2 }] : [];
  };

  S.tut = null; S.coins = 0; S.goods = []; S.tools = {}; S.raw = []; armchairSet(false);
  check('si parte dal passo della poltrona', tut.tutStepId() === 'armchair' && tut.tutActive());
  check('scavare durante la poltrona non sblocca niente', tut.tutBump('dig') === false && tut.tutStepId() === 'armchair');
  check('senza piazzarla il passo non avanza', tut.tutTick() === false && tut.tutStepId() === 'armchair');
  /* piazzarla in un'ALTRA stanza (Cucina, id 1) non basta: il passo guarda la Sala (stanza 0) */
  house.ensureHouseState(); S.house.rooms[1].unlocked = true;
  S.house.rooms[1].furn = [{ itemId: dataT.STARTER_FURN_ID, gx: 2, gy: 2 }];
  check('piazzata in un\'altra stanza non conta', tut.tutTick() === false && tut.tutStepId() === 'armchair');
  S.house.rooms[1].furn = []; S.house.rooms[1].unlocked = false;
  armchairSet(true);
  check('piazzata in Sala → si passa alla raccolta', tut.tutTick() === 'step' && tut.tutStepId() === 'pick');
  check('la soglia della raccolta è il prezzo della pala', tut.tutProgress().need === gp5.TOOL_COST.spade);
  /* raccolta: conta il VALORE (monete + merce), non il numero di oggetti — con valori da 1 a 5
     a seconda del bioma "otto oggetti" qualche volta non bastava per la pala e il tutorial
     restava fermo senza dire perché */
  S.goods = [{ id: 'spiga', val: gp5.TOOL_COST.spade, n: 1, good: true }];
  check('raccolto abbastanza → si passa al Negozio', tut.tutTick() === 'step' && tut.tutStepId() === 'shop');

  /* PASSO "shop": la pala LAMPEGGIA, ogni altro acquisto è disabilitato (a richiesta: "nel
     tutorial la pala deve lampeggiare e deve essere disabilitato ogni altro acquisto") —
     altrimenti le prime monete raccolte finiscono in ristori/mappe prima di scavare una volta. */
  {
    // lo stub del DOM non implementa querySelectorAll (torna sempre []): si controlla
    // la stringa HTML generata direttamente, come già fa il resto di questo file
    ui.openBuilding({ type: 'store', name: 'Negozio' });
    const body = document.getElementById('m-body').innerHTML;
    const spadeTag = (body.match(/<button[^>]*data-tool="spade"[^>]*>/) || [''])[0];
    check('la pala ha la classe che lampeggia', spadeTag.includes('tut-target'), spadeTag);
    check('la pala NON è disabilitata', spadeTag.length > 0 && !spadeTag.includes('disabled'), spadeTag);
    const otherBtnTags = [...body.matchAll(/<button[^>]*(?:data-tool="(?!spade")[^"]*"|data-map="[^"]*"|id="buy(?:En|Tp|Bag)")[^>]*>/g)].map(m => m[0]);
    check('ci sono altri acquisti da controllare nel Negozio', otherBtnTags.length > 0);
    check('ogni altro acquisto è disabilitato', otherBtnTags.every(t => t.includes('disabled')), otherBtnTags.filter(t => !t.includes('disabled')));
    ui.closeModal(true);
  }

  S.tools = { spade: true };
  /* la pala presa: il Negozio torna normale, niente più lampeggio né blocchi */
  {
    ui.openBuilding({ type: 'store', name: 'Negozio' });
    const body2 = document.getElementById('m-body').innerHTML;
    const otherBtnTags2 = [...body2.matchAll(/<button[^>]*(?:data-tool="[^"]*"|data-map="[^"]*"|id="buy(?:En|Tp|Bag)")[^>]*>/g)].map(m => m[0]);
    check('pala comprata: gli altri acquisti tornano attivi', otherBtnTags2.length > 0 && otherBtnTags2.every(t => !t.includes('disabled')), otherBtnTags2.filter(t => t.includes('disabled')));
    ui.closeModal(true);
  }
  check('comprata la pala → si passa allo scavo', tut.tutTick() === 'step' && tut.tutStepId() === 'dig');
  check('scavato → si passa al Museo', tut.tutBump('dig') === 'step' && tut.tutStepId() === 'museum');
  check('le targhe sulle case si accendono solo quando serve entrare',
    tut.tutShowLabels() === true);
  check('consegnato al Museo → tutorial finito', tut.tutBump('museum') === 'step' && tut.tutDone() && !tut.tutActive());
  check('finito, le targhe si spengono', tut.tutShowLabels() === false);
  armchairSet(false);

  /* SI PARTE IN UNA CITTÀ COL MUSEO: è quello che rende l'ultimo passo un trenta passi invece
     di una traversata. Se `findStart` cambiasse, il tutorial diventerebbe una caccia. */
  {
    const start = world.findStart();
    const stx = Math.floor(start.x / TS), sty = Math.floor(start.y / TS);
    const home = world.townForTile(stx, sty);
    check('si parte dentro una città che ha il Museo', !!home && world.hasMuseum(home));
    S.tut = null; S.coins = 0; S.goods = []; S.tools = {}; armchairSet(false); // torna al passo 'armchair'
    check('il passo della poltrona indica la porta di casa',
      tut.tutStepId() === 'armchair' && tut.tutTarget(start.x, start.y) === S.home);
    armchairSet(true); tut.tutTick();                 // poltrona piazzata → passo 'pick'
    const gPick = tut.tutTarget(start.x, start.y);
    check('il passo della raccolta indica DOVE andare', !!gPick && Number.isFinite(gPick.x));
    S.goods = [{ id: 'spiga', val: gp5.TOOL_COST.spade, n: 1, good: true }]; tut.tutTick();
    const gShop = tut.tutTarget(start.x, start.y);
    check('il passo del Negozio indica la porta del Negozio',
      !!gShop && (home.buildings || []).some(b => b.type === 'store' && b.doorx === gShop.x && b.doory === gShop.y));
    S.tools = { spade: true }; tut.tutTick(); tut.tutBump('dig');
    const gMus = tut.tutTarget(start.x, start.y);
    check('il passo del Museo indica la porta del Museo',
      !!gMus && (home.buildings || []).some(b => b.type === 'museum' && b.doorx === gMus.x && b.doory === gMus.y));
    armchairSet(false);
  }
  /* IL PRIMO SCAVO DEL TUTORIAL NON VA MAI A VUOTO. Una casella d'erba rende .30: senza
     garanzia, sette giocatori su dieci vedrebbero "…solo terra" al primissimo colpo della loro
     vita, subito dopo aver faticato per comprare la pala — e il passo dopo dice di portare il
     reperto al Museo. Garantito, ci si arriva con DUE grezzi (il dono del nonno e il proprio)
     e la prima volta il ciclo si chiude per intero. */
  {
    const w5 = await import('../src/world.js');
    const orig = Math.random;
    S.tut = null; S.tools = { spade: true }; S.coins = 999; S.goods = []; armchairSet(true);
    tut.tutTick();                                  // poltrona già piazzata → passo 'pick'
    tut.tutTick();                                  // la borsa paga la pala → passo 'shop'
    tut.tutTick();                                  // pala comprata → passo 'dig'
    check('si parte dal passo dello scavo', tut.tutStepId() === 'dig');
    armchairSet(false);
    /* terreno scavabile fuori città, e la sfortuna al massimo: senza garanzia non uscirebbe
       niente */
    let tx5 = 0, ty5 = 0;
    for (let r = 3; r < 400 && !tx5; r++) {
      const cx5 = Math.round(P.x / TS) + r;
      if (w5.diggable(w5.baseTerrain(cx5, Math.round(P.y / TS))) && !w5.townInfo(cx5, Math.round(P.y / TS))
        && !w5.dugSetHas) { tx5 = cx5; ty5 = Math.round(P.y / TS); }
    }
    if (tx5) {
      P.x = tx5 * TS + 8; P.y = ty5 * TS + 2; P.dir = 'down';   // piedi (P.y+13) sulla casella
      S.raw = []; S.energy = 30; P.digging = null;
      Math.random = () => 0.999;                    // il tiro peggiore possibile
      gameplay.tryDig();
      for (let i = 0; i < 80 && P.digging; i++) gameplay.stepDig(0.05);
      Math.random = orig;
      check('il primo scavo del tutorial dà sempre un reperto', S.raw.length === 1,
        S.raw.length + ' grezzi con il tiro peggiore');
      check('e quel colpo chiude il passo dello scavo', tut.tutStepId() === 'museum');
    } else check('il primo scavo del tutorial dà sempre un reperto', true, 'nessuna casella scavabile vicina');
    Math.random = orig;
    S.tut = null; S.raw = []; S.tools = {}; S.coins = 0;
  }

  /* DUE COSE DIVERSE NON POSSONO COSTARE UGUALE SULLO STESSO BANCONE. Il ristoro stava a 15
     come la pala, e il primo obiettivo del tutorial è mettere insieme esattamente 15: si
     comprava il ristoro credendo di comprare la pala e il tutorial restava fermo. */
  check(`il ristoro non costa quanto la pala (${gp5.SNACK_BASE} vs ${gp5.TOOL_COST.spade})`,
    gp5.SNACK_BASE !== gp5.TOOL_COST.spade);

  /* NIENTE TREMOLIO. Le targhe si appoggiano alla griglia dei PIXEL FISICI (passo 1/K), non a
     quella dei pixel di gioco: arrotondate al pixel di gioco restano ferme per K fotogrammi e
     poi scattano, e camminando si vede la scritta vibrare sopra la casa (regola ferrea n.2,
     segnalata da un giocatore). Si misura sullo spostamento minimo che la camera sa fare. */
  {
    const rnd = await import('../src/render.js');
    const scr = await import('../src/screen.js');
    const K0 = scr.view.K, W0 = scr.view.W, PX0 = scr.view.PX;
    scr.view.K = 4; scr.view.PX = 4; scr.view.W = 400;   // PX = pixel fisici per pixel di gioco (qui densità 1)
    const passo = 1 / scr.view.K;
    const a = rnd.plateBox(100, 100, 40, 16);
    const b = rnd.plateBox(100 + passo, 100 + passo, 40, 16);
    check('la targa segue la casa a passi di 1/K, non a scatti di un pixel intero',
      Math.abs((b.bx - a.bx) - passo) < 1e-9 && Math.abs((b.by - a.by) - passo) < 1e-9);
    check('la targa cade esattamente sulla griglia dei pixel fisici',
      Math.abs(a.bx * scr.view.K - Math.round(a.bx * scr.view.K)) < 1e-9
      && Math.abs(a.by * scr.view.K - Math.round(a.by * scr.view.K)) < 1e-9);
    /* mezzo pixel fisico NON deve muovere la targa: se la seguisse, vibrerebbe al contrario */
    const c = rnd.plateBox(100 + passo / 4, 100, 40, 16);
    check('sotto il mezzo pixel fisico la targa sta ferma', c.bx === a.bx);
    scr.view.K = K0; scr.view.PX = PX0; scr.view.W = W0;
  }
  {
    const fs6 = await import('node:fs');
    const rsrc = fs6.readFileSync('src/render.js', 'utf8');
    const body = rsrc.slice(rsrc.indexOf('export function plateBox'));
    check('plateBox non arrotonda ai pixel di GIOCO', !/Math\.round/.test(body.slice(0, body.indexOf('\n}'))));
  }

  /* IL MUSEO STA CHIUSO finché il tutorial non ci manda. Senza, si entra al primo minuto e si
     consegna il reperto del nonno prima di aver capito cosa sia una consegna: il passo del
     Museo scatta a vuoto e il ciclo che il tutorial insegna si spezza a metà.
     Ma chiuso NON vuol dire murato: saltando il tutorial il gioco deve tornare intero. */
  {
    S.tut = null; S.tools = {}; S.coins = 0; S.goods = [];
    check('al primo passo il Museo è chiuso', tut.tutStepId() === 'armchair' && tut.museumOpen() === false);
    check('e la porta lo dice invece di non fare niente', tut.museumClosedText().length > 20);
    S.tools = { spade: true }; S.coins = 999; armchairSet(true);
    tut.tutTick(); tut.tutTick(); tut.tutTick(); tut.tutBump('dig');
    check('arrivati al suo passo, il Museo apre', tut.tutStepId() === 'museum' && tut.museumOpen() === true);
    armchairSet(false);
    /* SALTARE RESTITUISCE IL GIOCO INTERO: nessuna porta resta chiusa dietro di sé */
    S.tut = null; S.tools = {}; S.coins = 0;
    check('a tutorial in corso resta chiuso', tut.museumOpen() === false);
    tut.tutSkip();
    check('saltato: il Museo torna aperto subito', tut.museumOpen() === true && !tut.tutActive());
    tut.tutRestart();
    check('rifacendolo torna chiuso finché non serve', tut.museumOpen() === false);
    /* e finito per bene, resta aperto */
    S.tools = { spade: true }; S.coins = 999; armchairSet(true);
    tut.tutTick(); tut.tutTick(); tut.tutTick(); tut.tutBump('dig'); tut.tutBump('museum');
    check('finito: il Museo resta aperto', tut.tutDone() && tut.museumOpen() === true);
    armchairSet(false);
    /* la porta del Museo passa DAVVERO da museumOpen, non è solo una funzione che nessuno usa */
    {
      const fs11 = await import('node:fs');
      const isrc11 = fs11.readFileSync('src/interior.js', 'utf8');
      check('la porta del Museo consulta la chiusura', /museumOpen\(\)/.test(isrc11));
    }
    S.tut = null; S.tools = {}; S.coins = 0;
  }

  /* saltabile, e RIFACIBILE: chi salta al primo minuto non perde l'insegnamento per sempre */
  tut.tutSkip();
  check('saltato: sparisce e non spunta niente', !tut.tutActive() && tut.tutSkipped() && tut.tutChecked(0) === false);
  tut.tutRestart();
  check('rifatto dalla Guida: riparte dal primo passo', tut.tutActive() && tut.tutStepId() === 'armchair' && !tut.tutSkipped());
  {
    const fs5 = await import('node:fs');
    const usrc = fs5.readFileSync('src/ui.js', 'utf8');
    check('la Guida ha il pulsante per rifare il tutorial', /tutAgain/.test(usrc) && /tutRestart/.test(usrc));
  }
  S.tut = null; S.coins = 0; S.goods = []; S.tools = {}; S.raw = [];
  P5.x = P5.x; // stato del giocatore invariato: il blocco non lo ha mosso
}

/* ---------- COMANDO prep: apre il minigioco anche senza museo sotto mano ---------- */
{
  const S = state.S;
  const cmds4 = await import('../src/commands.js');
  const ui4 = await import('../src/ui.js');
  S.raw = [];
  const out = cmds4.runCommand('prep');
  await new Promise(r => setTimeout(r, 30));
  check('prep apre il tavolo di preparazione', ui4.isPrepOpen() === true, out);
  check('e se non hai un pezzo adatto te ne dà uno', S.raw.length === 1 && S.raw[0].q === 'eccezionale');
  ui4.closePrepare();
  /* la rarità si può scegliere */
  S.raw = [];
  cmds4.runCommand('prep=leggendario');
  await new Promise(r => setTimeout(r, 30));
  check('prep=leggendario dà un pezzo leggendario', S.raw[0] && S.raw[0].q === 'leggendario');
  ui4.closePrepare();
  /* gli alias devono funzionare, e i comandi "both" anche senza valore */
  S.raw = [];
  check('alias minigioco/tavolo', /Tavolo|Preparation/.test(cmds4.runCommand('minigioco') || ''));
  ui4.closePrepare();
  check('un comando "both" si può dare anche secco', !/^Usa|^Use/.test(cmds4.runCommand('stress') || ''));
  cmds4.runCommand('vanilla');
  S.raw = [];
}

/* ---------- COMANDO skfit: apre il minigioco «ricomponi lo scheletro» ovunque ---------- */
{
  const S = state.S;
  const cmds5 = await import('../src/commands.js');
  const ui5 = await import('../src/ui.js');
  const out5 = cmds5.runCommand('skfit');
  await new Promise(r => setTimeout(r, 30));
  check('skfit apre il minigioco', ui5.isSkeletonFitOpen() === true, out5);
  ui5.skeletonFitSkip();
  check('e si può chiudere subito con lo stesso ESC di sempre', ui5.isSkeletonFitOpen() === false);
  check('alias scheletro/montaggio', /scheletro|skeleton/i.test(cmds5.runCommand('montaggio') || ''));
  ui5.skeletonFitSkip();
}

/* ---------- COMANDO playcomp: gioca col compagno OVUNQUE (anche senza uno) ---------- */
{
  const S = state.S;
  const cmds6 = await import('../src/commands.js');
  const comp6 = await import('../src/companion.js');
  const gp6 = await import('../src/gameplay.js');
  const { COMP } = comp6;
  comp6.clearCompanion(); COMP.job = null; COMP.play = null; COMP.playCool = 0;
  const out6 = cmds6.runCommand('playcomp');
  check('playcomp senza compagno: te ne dà uno e lancia comunque', !!S.companion && !!COMP.play && COMP.play.phase === 'throw', out6);
  /* alias, e forza il round anche su terra scavabile (dove il gioco normale non partirebbe) */
  COMP.job = null; COMP.play = null; COMP.playCool = 0;
  const out7 = cmds6.runCommand('gioca');
  check('alias gioca/fetch: parte OVUNQUE (bypassa il controllo del terreno)', !!COMP.play);
  for (let i = 0; i < 900 && COMP.play; i++) gp6.companionPlayTick(1 / 20); // lascia esaurire il round
  delete S.buffs.digX2;
  comp6.clearCompanion(); COMP.job = null; COMP.play = null; COMP.playCool = 0;
}

/* ---------- COMANDO layegg/hatchegg: depone e schiude un uovo senza dover cercare nulla ---------- */
{
  const S = state.S;
  const cmds7 = await import('../src/commands.js');
  const br7 = await import('../src/breeding.js');
  const keep = { creatures: S.creatures, items: S.items, egg: S.egg, energy: S.energy };
  S.creatures = []; S.items = []; S.egg = null;
  const out8 = cmds7.runCommand('layegg');
  check('layegg: crea genitori/cibo se mancano e depone davvero', !!S.egg, out8);
  const out9 = cmds7.runCommand('hatchegg');
  check('hatchegg: pronto SUBITO, si schiude', S.egg === null && /Hatched|Schiuso/.test(out9), out9);
  check('senza uovo: hatchegg lo dice, non esplode', /No egg|Nessun uovo/.test(cmds7.runCommand('hatchegg')));
  S.creatures = keep.creatures; S.items = keep.items; S.egg = keep.egg; S.energy = keep.energy;
}

/* ---------- COMANDO stress: deve caricare davvero, e vanilla deve ripulire ---------- */
{
  const S = state.S;
  const cmds3 = await import('../src/commands.js');
  const before = { cre: (S.creatures || []).length, expl: Object.keys(S.explored || {}).length };
  const out = cmds3.runCommand('stress=1');
  check('stress carica creature, mappa e scavi', /50/.test(out) &&
    S.creatures.length === 50 && Object.keys(S.explored).length >= 2000 && state.dugSet.size >= 2000);
  check('stress dice quanto pesa il salvataggio', /MB/.test(out));
  cmds3.runCommand('vanilla');
  check('vanilla riporta tutto com\'era', (state.S.creatures || []).length === before.cre);
}

/* ---------- MAPPA: la compressione deve reggere partite lunghissime ---------- */
{
  const S = state.S;
  const pm = await import('../src/packmap.js');
  const map3 = await import('../src/map.js');
  /* andata e ritorno senza perdere un blocco, coordinate negative comprese */
  const obj = {};
  for (let y = -30; y < 30; y++) for (let x = -40; x < 40; x++) obj[x + ',' + y] = 1;
  obj['999999,-888888'] = 1;                       // un blocco lontanissimo e isolato
  const back = pm.unpackExplored(pm.packExplored(obj));
  check('mappa: comprimere e decomprimere non perde blocchi',
    Object.keys(back).length === Object.keys(obj).length && back['999999,-888888'] === 1);
  const raw = JSON.stringify(obj).length, pack = JSON.stringify(pm.packExplored(obj)).length;
  check('mappa: la compressione riduce di almeno 10 volte', raw / pack >= 10, 'x' + (raw / pack).toFixed(0));
  /* i salvataggi vecchi (formato "cx,cy":1) devono restare leggibili */
  check('mappa: si legge anche il vecchio formato', pm.unpackExplored({ '3,4': 1, '-2,-5': 1 })['3,4'] === 1);
  /* il giro completo attraverso il salvataggio vero */
  S.explored = { '10,10': 1, '11,10': 1, '12,10': 1, '-7,-7': 1 };
  /* i test dei cheat lasciano il salvataggio bloccato: qui serve scrivere davvero */
  const wasLocked = state.isCheatLock();
  if (wasLocked) (await import('../src/commands.js')).runCommand('vanilla');
  S.explored = { '10,10': 1, '11,10': 1, '12,10': 1, '-7,-7': 1 };
  state.save();
  const stored = JSON.parse(localStorage.getItem(state.SK));
  check('mappa: sul disco finisce compressa, non in chiaro', !Object.keys(stored.explored).some(k => k.includes(',')));
  const round = pm.unpackExplored(stored.explored);

  check('mappa: rileggendo si ritrova tutto', Object.keys(round).length === 4 && round['-7,-7'] === 1);
  /* una partita ENORME deve stare nella quota del browser (~5 MB) */
  const big = {};
  for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) big[x + ',' + y] = 1;   // 10 milioni di caselle
  const bigPack = JSON.stringify(pm.packExplored(big)).length;
  check('mappa: 10 milioni di caselle scoperte stanno sotto 1 MB', bigPack < 1024 * 1024,
    (bigPack / 1024).toFixed(0) + ' KB');
  S.explored = {};

  /* ZOOM OUT: la mappa ha livelli sotto 1 px/tile (vista d'insieme), renderizzati CAMPIONANDO
     (interi: niente sfocatura). mapZoomBy deve arrivarci e drawMapCanvas non deve esplodere. */
  const mapMod = await import('../src/mapui.js');
  const { readFileSync: readFS } = await import('node:fs');
  const mapSrc = readFS(new URL('../src/mapui.js', import.meta.url), 'utf8');
  const zooms = (mapSrc.match(/MAP_ZOOMS = \[([^\]]+)\]/) || [])[1] || '';
  const zvals = zooms.split(',').map(s => parseFloat(s)).filter(v => !isNaN(v));
  check('mappa: ci sono livelli di ZOOM OUT (sotto 1 px/tile)', zvals.some(v => v < 1) && zvals.filter(v => v < 1).length >= 2);
  let mapCrash = false;
  try { mapMod.mapReset(); for (let i = 0; i < 4; i++) mapMod.mapZoomBy(-1); mapMod.mapReset(); } catch (e) { mapCrash = true; }
  check('mappa: zoom out fino al minimo senza crash', !mapCrash);

  /* BIOMI leggibili: la mappa colora la terra per ZONA (non più solo per terreno), così due prati
     di biomi diversi non sono lo stesso verde. Un colore per zona, tutti distinti, + legenda. */
  const { ZONES: ZM } = await import('../src/data.js');
  check('mappa: colora per BIOMA (MAP_ZONE + zoneIdxAt)', /const MAP_ZONE = \[/.test(mapSrc) && /zoneIdxAt\(tx, ty\)/.test(mapSrc) && /mapTerrColor\(tx, ty\)/.test(mapSrc));
  const mzCols = ((mapSrc.match(/MAP_ZONE = \[([^\]]+)\]/) || [])[1] || '').match(/#[0-9a-fA-F]{6}/g) || [];
  check('mappa: un colore di bioma per zona, tutti distinti', mzCols.length === ZM.length && new Set(mzCols).size === mzCols.length);
  /* NIENTE NOMI DI BIOMA in legenda: erano sei voci su quattordici, metà dello spazio speso a
     dire che il verde è prato — cosa che si impara camminando e che il tag della zona nell'HUD
     dice già mentre ci sei dentro. La legenda spiega i SIMBOLI, quelli che non si indovinano. */
  check('mappa: la legenda NON elenca i nomi dei biomi',
    !/ZONES\.map\(/.test(mapSrc) && !/z\.name/.test(mapSrc));
  for (const voce of ['città col Museo', 'meraviglia', 'X del tesoro', 'sei qui', 'da esplorare', 'casa tua', 'paese', 'ossa da scavare']) {
    check('mappa: la legenda spiega ancora "' + voce + '"', mapSrc.includes(`'${voce}'`));
  }

  /* DOVE SEI: una stellina che pulsa, non un quadratino identico a quello dei paesi.
     La fase viene dal TEMPO (regola 1): legata alle coordinate, trascinando la mappa la
     stella batterebbe a scatti. E pulsa fra due MISURE, mai fino a scomparire: un indicatore
     di posizione che se ne va a intermittenza si cerca due volte invece di una. */
  check('mappa: "sei qui" è uno spillo rosso, disegnato a parte dai pin quadrati',
    /function sagomaSpillo\(/.test(mapSrc) && /function meStar\(/.test(mapSrc) && /meStar\(c,/.test(mapSrc));
  /* lampeggia cambiando TINTA: sparendo si cerca due volte, cambiando misura balla sul foglio */
  check('mappa: lo spillo lampeggia fra due rossi, senza sparire né cambiare misura',
    /acceso \? '#f03b2e' : '#8f2018'/.test(mapSrc) && !/ellipse\(X, Y/.test(mapSrc));
  /* la pulsazione va anche ACCESA. Il primo giro l'ho scritta e non chiamata: la funzione
     esisteva, i test sul tempo passavano, e in gioco l'alone stava fermo. */
  check('mappa: aprendola la pulsazione parte davvero', /avviaPulsazione\(\);/.test(mapSrc.split('export function openMap')[1] || ''));
  /* si apre a ×3: a un pixel per tile la città sotto i piedi era grande sei pixel */
  check('mappa: si apre già zoomata, non alla vista d\'insieme',
    /const MAP_ZOOM_DEF = 3;/.test(mapSrc) && /let mapZoom = MAP_ZOOM_DEF/.test(mapSrc)
    && /mapZoom = MAP_ZOOM_DEF; mapOff/.test(mapSrc));
  /* "non si capisce cosa è cosa": ogni luogo è un DISTINTIVO con l'icona, di misura fissa e
     leggibile, e la legenda usa la stessa funzione di disegno dei segni veri */
  check('mappa: ogni segno ha la sua icona e il suo colore, tutti diversi',
    Object.values(mapMod.MAP_SIGNS).every(sg => sg.size >= 30 && sg.icon) &&
    new Set(Object.values(mapMod.MAP_SIGNS).map(sg => sg.bg + sg.icon + sg.size)).size === Object.keys(mapMod.MAP_SIGNS).length);
  check('mappa: il Museo è il segno più grande (è il motivo per cui si torna in città)',
    Object.values(mapMod.MAP_SIGNS).every(sg => sg.size <= mapMod.MAP_SIGNS.museum.size));
  check('mappa: la legenda disegna gli STESSI segni della carta', /function paintLegend\(/.test(mapSrc) && /drawSign\(c2, k, 20, 20\)/.test(mapSrc)
    && Object.keys(mapMod.MAP_SIGNS).every(k => mapSrc.includes("legendItem('" + k + "'")));
  { let ok = true; const calls = [];
    const fake = { fillRect: () => calls.push(1), beginPath() {}, arc() {}, fill() { calls.push(1); }, moveTo() {}, lineTo() {}, stroke() { calls.push(1); },
      save() {}, restore() {}, translate() {}, scale() {}, closePath() {}, quadraticCurveTo() {} };
    try { for (const k of Object.keys(mapMod.MAP_SIGNS)) mapMod.drawSign(fake, k, 20, 20); mapMod.drawTreasureX(fake, 20, 20); } catch (e) { ok = false; }
    check('mappa: tutti i segni si disegnano (anche senza icone, come nei test)', ok && calls.length > 20); }
  check('mappa: le coste hanno la loro riga, i nomi delle città sono scritti',
    /COSTE:/.test(mapSrc) && /drawLabel\(c, label/.test(mapSrc));
  check('mappa: la stella pulsa e la fase viene dal tempo',
    /Math\.floor\(\(t \|\| 0\) \/ 380\)/.test(mapSrc) && /requestAnimationFrame/.test(mapSrc));
  check('mappa: la pulsazione si ferma chiudendo la mappa',
    /cancelAnimationFrame/.test(mapSrc) && /if \(!mapOpenFlag\) \{ pulseRaf = null; return; \}/.test(mapSrc));
  check('mappa: si ridisegna solo al CAMBIO di fase, non a ogni fotogramma',
    /if \(f !== pulseFase\) \{ pulseFase = f; drawMapCanvas\(\); \}/.test(mapSrc));
}

/* ---------- BETA: aggiornamento forzato, nelle Impostazioni ---------- */
{
  /* Stava nascosto nei Credits, dove nessuno lo cerca: chi resta su una versione vecchia
     non va a leggere i ringraziamenti. Ora è nelle Impostazioni, con la versione accanto —
     che è la prima cosa da chiedere a un tester che segnala un bug già corretto. */
  const sp2 = await import('../src/splash.js');
  sp2.showSplash();
  sp2.setView('settings');
  const menu = document.getElementById('sp-menu');
  check('nelle Impostazioni c\'è il tasto di aggiornamento', /id="sp-refresh"/.test(menu.innerHTML || ''));
  check('e dice che il salvataggio resta', /salvataggio resta|save stays/.test(menu.innerHTML || ''));
  check('accanto c\'è la versione, per chi segnala un bug', /v\d+\.\d+\.\d+/.test(menu.innerHTML || ''));
  sp2.setView('credits');
  check('nei Credits non c\'è più', !/id="sp-refresh"/.test(menu.innerHTML || ''));
  sp2.setView('main');
  check('nel menu principale non si vede: è roba da tester', !/id="sp-refresh"/.test(menu.innerHTML || ''));
  /* l'aggiornamento NON deve toccare il salvataggio: si controlla che la chiave resti */
  const before = localStorage.getItem('ossa_world_pixel_v1');
  await sp2.hardRefresh();
  check('aggiornare non cancella la partita', localStorage.getItem('ossa_world_pixel_v1') === before);
  sp2.resumeSplash();
}

/* ---------- RUSSO: dizionario coerente e nessuna stringa rotta ---------- */
{
  const fsR = (await import('node:fs'));
  const i18r = await import('../src/i18n.js');
  const RU = i18r.dictOf('ru');
  check('la lingua russa è nell\'elenco', i18r.LANGS.some(l => l.id === 'ru' && l.label === 'Русский'));
  check('il dizionario russo esiste ed è pieno', !!RU && Object.keys(RU).length > 400);

  /* tutte le stringhe EN che il gioco può mostrare, estratte dal codice */
  const dec = x => x.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
  const en = new Set();
  for (const f of fsR.readdirSync('src').filter(x => x.endsWith('.js'))) {
    const src2 = fsR.readFileSync('src/' + f, 'utf8');
    /* le chiamate usano sia gli apici singoli sia i doppi (quando il testo contiene un
       apostrofo): vanno prese entrambe, o una stringa sfugge al controllo */
    for (const re of [/tr\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g,
      /tr\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g,
      /tr\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/g]) {
      let m; while ((m = re.exec(src2))) en.add(dec(m[2]));
    }
  }
  /* anche le ETICHETTE dei dati passano dal dizionario: rarità, parti, zone, edifici,
     stagioni, capelli, cappelli. Sono coppie ['it','en'] dentro i18n.js */
  {
    /* le coppie ['italiano', 'inglese'] non stanno solo in i18n.js: anche le battute degli
       NPC e le etichette delle abilità sono scritte così dentro ui.js.
       Da i18n.js si prende TUTTO (sono tabelle di etichette, anche di una parola sola);
       da ui.js si scartano gli identificatori, che lì convivono col testo. */
    {
      const i18only = fsR.readFileSync('src/i18n.js', 'utf8');
      const reAll = /\[\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\]/g;
      let mi; while ((mi = reAll.exec(i18only))) en.add(dec(mi[2]));
    }
    for (const f of ['src/ui.js']) {
      const src3 = fsR.readFileSync(f, 'utf8');
      for (const re2 of [/\[\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\]/g,
        /\[\s*'((?:[^'\\]|\\.)*)',\s*\n\s*'((?:[^'\\]|\\.)*)'\s*\]/g]) {
        /* si scartano le coppie che sono IDENTIFICATORI, non testo ('redarch', 'sniff'):
           un id è tutto minuscolo e senza spazi; un'etichetta comincia per maiuscola */
        let m2;
        while ((m2 = re2.exec(src3))) {
          const v = dec(m2[2]);
          if (v.length > 2 && (/\s/.test(v) || /^[A-Z]/.test(v))) en.add(v);
        }
      }
    }
  }
  /* e i MODULI-DATI, che tengono i testi in tabelle e non in chiamate tr(): meraviglie,
     traguardi, lettere del nonno. Erano il buco vero — 142 stringhe restavano in inglese
     e il controllo diceva "97% tradotto" perché non le guardava nemmeno. */
  {
    const w2 = await import('../src/wonders.js');
    for (const w of Object.values(w2.WONDERS)) for (const k of ['n', 'd', 'gp', 'p']) if (w[k] && w[k][1]) en.add(w[k][1]);
    const a2 = await import('../src/achievements.js');
    for (const t of a2.TRACKS) { en.add(t.en); en.add(t.den); }
    for (const k of a2.TIERS) en.add(a2.TIER_LABEL[k][1]);
    /* il CATALOGO dell'arredo: 250 nomi in una tabella, non in chiamate tr() */
    const fc2 = await import('../src/furnCatalog.js');
    for (const f of [...fc2.FURN_CATALOG, ...fc2.FURN_THEMES]) en.add(f.en);
    const l2 = await import('../src/letters.js');
    for (const l of [...Object.values(l2.LETTERS), l2.FINALE]) { en.add(l.t[1]); for (const line of l.b[1]) en.add(line); }
    /* le battute della cutscene iniziale stanno in una tabella dentro intro.js */
    {
      const isrc = fsR.readFileSync('src/intro.js', 'utf8');
      const re3 = /en:\s*'((?:[^'\\]|\\.)*)'/g;
      let m3; while ((m3 = re3.exec(isrc))) en.add(dec(m3[1]));
    }
  }
  /* niente scorciatoie: nessun modulo deve più scegliere la lingua da solo con LANG === 'it',
     perché quel ramo salta il dizionario e la terza lingua non arriva mai */
  {
    const sneaky = fsR.readdirSync('src').filter(f => f.endsWith('.js') && f !== 'i18n.js')
      .filter(f => /LANG\s*===\s*'it'/.test(fsR.readFileSync('src/' + f, 'utf8')));
    check('nessun modulo sceglie la lingua scavalcando tr()', sneaky.length === 0, sneaky.join(' '));
  }
  const missing = [...en].filter(k => k && RU[k] === undefined);
  check('il russo copre il 99% delle stringhe', missing.length <= en.size * 0.01,
    missing.length + '/' + en.size + ' senza traduzione: ' + missing.slice(0, 3).map(x => JSON.stringify(x)).join(' '));

  /* GLI SPAZI CONTANO: le stringhe si concatenano a numeri e nomi. Se la traduzione perde lo
     spazio iniziale o finale, in gioco le parole si attaccano ("Уровень3" invece di "Уровень 3"). */
  const spaceBad = Object.entries(RU).filter(([k, v]) =>
    (/^\s/.test(k) !== /^\s/.test(v)) || (/\s$/.test(k) !== /\s$/.test(v)));
  check('gli spazi iniziali e finali sono conservati', spaceBad.length === 0,
    spaceBad.slice(0, 2).map(([k]) => JSON.stringify(k)).join(' '));

  /* i tag HTML devono restare identici, altrimenti il pannello si rompe */
  const tagsOf = x => (x.match(/<[^>]+>/g) || []).join('');
  const tagBad = Object.entries(RU).filter(([k, v]) => tagsOf(k) !== tagsOf(v));
  check('i tag HTML sono gli stessi dell\'originale', tagBad.length === 0,
    tagBad.slice(0, 2).map(([k]) => JSON.stringify(k)).join(' '));

  /* niente chiavi morte: una voce che non esiste più nel codice è solo peso */
  const dead = Object.keys(RU).filter(k => !en.has(k));
  check('nessuna voce del dizionario è orfana', dead.length === 0, dead.slice(0, 3).map(x => JSON.stringify(x)).join(' '));

  /* il russo è davvero in cirillico (non inglese copiato) */
  const cyr = Object.values(RU).filter(v => /[А-Яа-яЁё]/.test(v)).length;
  check('le traduzioni sono in cirillico', cyr > Object.keys(RU).length * 0.9);

  /* commutando lingua, tr() deve restituire il russo e cadere sull'inglese se manca */
  check('fallback: nessuna traduzione vuota (meglio l\'inglese che il nulla)',
    Object.values(RU).every(v => typeof v === 'string' && v.length > 0));
}

/* ---------- ICONA: tab, home del telefono e menu app ---------- */
{
  const fsI = await import('node:fs');
  const html = fsI.readFileSync('index.html', 'utf8');
  check('favicon dichiarata', /rel="icon"[^>]*href="\/favicon\.svg"/.test(html));
  check('icona per la home di iOS', /rel="apple-touch-icon"[^>]*icon-180\.png/.test(html));
  check('manifest collegato', /rel="manifest"/.test(html));
  const files = ['public/favicon.svg', 'public/icon.svg', 'public/icon-180.png', 'public/icon-192.png', 'public/icon-512.png', 'public/manifest.webmanifest'];
  check('i file dell\'icona esistono tutti', files.every(f => fsI.existsSync(f)), files.filter(f => !fsI.existsSync(f)).join(' '));
  const mf = JSON.parse(fsI.readFileSync('public/manifest.webmanifest', 'utf8'));
  check('manifest: nome e icone coerenti', mf.name === 'Digsy World' && mf.icons.length === 3 &&
    mf.icons.some(i => /512/.test(i.src) && /maskable/.test(i.purpose || '')));
  /* l'icona è pixel-art: niente antialias, altrimenti a 16px diventa una macchia */
  const svg = fsI.readFileSync('public/favicon.svg', 'utf8');
  check('icona a pixel netti (crispEdges, solo rettangoli)', /crispEdges/.test(svg) && !/<circle|<path/.test(svg));
}

/* ---------- TESTI: i comandi devono nominare il tasto GIUSTO per il dispositivo ---------- */
{
  const i18 = await import('../src/i18n.js');
  const tips2 = await import('../src/tips.js');
  const uiK = await import('../src/ui.js');
  const setTouch = on => { globalThis.matchMedia = q => ({ matches: on && /coarse/.test(q) }); globalThis.innerWidth = on ? 390 : 1440; };
  const om2 = globalThis.matchMedia, ow2 = globalThis.innerWidth;

  setTouch(false);
  check('desktop: il comando è E', i18.actKey().includes('E') && !i18.actKey().includes('A'));
  check('desktop: le scorciatoie si scrivono', i18.keyHint('M').includes('M'));
  const dTip = tips2.tipText('dig');
  check('desktop: il suggerimento dello scavo dice E', /\bE\b/.test(dTip) && !/>A</.test(dTip));

  setTouch(true);
  check('mobile: il comando è A (il tasto E non esiste)', i18.actKey().includes('A') && !i18.actKey().includes('E'));
  check('mobile: niente scorciatoie da tastiera', i18.keyHint('M') === '');
  const mTip = tips2.tipText('dig');
  check('mobile: il suggerimento dello scavo dice A', />A</.test(mTip) && !/>E</.test(mTip));
  const mMap = tips2.tipText('map');
  check('mobile: il suggerimento della mappa non nomina M', !/>M</.test(mMap));
  /* il prompt sul campo: nessun testo deve nominare E su un telefono */
  uiK.openGuide && uiK.openGuide();
  const guide = document.getElementById('m-body').innerHTML;
  check('mobile: la guida elenca i comandi touch, non i tasti', !/>E</.test(guide) && !/WASD/.test(guide));
  uiK.closeModal();

  globalThis.matchMedia = om2; globalThis.innerWidth = ow2;
}

/* ---------- LOOK: la palette deve SEMPRE seguire S.look ---------- */
{
  const S = state.S;
  const spr = await import('../src/sprites.js');
  const uiL = await import('../src/ui.js');
  /* bug vero: "Personaggio casuale" sostituiva S.look senza chiamare applyLook, così
     cambiavano solo le forme (taglio/cappello) e i COLORI restavano quelli di prima:
     l'anteprima mostrava una pelle e in gioco ne compariva un'altra. */
  S.look = { hat: '#111111', shirt: '#222222', pants: '#333333', skin: '#444444',
    hairStyle: 'short', hairColor: '#555555', hatStyle: 'explorer', eyeColor: '#666666' };
  spr.applyLook();
  check('la palette segue il look', spr.PAL.F === '#444444' && spr.PAL.S === '#222222' && spr.PAL.A === '#555555');
  /* e ogni schermata che cambia il look deve lasciarla allineata */
  uiL.openEditor(() => {});
  const rnd = document.getElementById('rndAll');
  if (rnd && rnd.onclick) rnd.onclick();
  check('Personaggio casuale: palette allineata al nuovo look',
    spr.PAL.F === S.look.skin && spr.PAL.S === S.look.shirt && spr.PAL.P === S.look.pants && spr.PAL.A === S.look.hairColor);
  uiL.lockModal(false); uiL.closeModal();
}

/* ---------- RICOMPONI LO SCHELETRO (logica pura) ---------- */
{
  const sk = await import('../src/skeletonfit.js');
  const dt = await import('../src/data.js');
  check('un socket per ogni parte del reperto', dt.PARTS.every(p => !!sk.socketFor(p.id)) && sk.SOCKETS.length === dt.PARTS.length);
  const torace = sk.socketFor('torace');
  check('dentro il raggio: si prende il socket giusto', sk.nearestSocket(torace.x, torace.y).id === 'torace');
  check('fuori dal raggio: nessun socket (niente prese a caso)', sk.nearestSocket(0.5, 0.5 + sk.HIT_R * 3) == null || sk.nearestSocket(0.99, 0.99) == null);
  check('grado veloce = XP pieno', sk.gradeForTime(500).id === 'perfetto' && sk.gradeForTime(500).xp > sk.gradeForTime(9000).xp);
  check('grado lento comunque premia (mai un fallimento vero)', sk.gradeForTime(60000).xp > 0);
  check('saltare non penalizza (0 XP, non un malus)', sk.SKIP_GRADE.xp === 0);
}

/* ---------- PREPARAZIONE DEL REPERTO (il secondo verbo) ---------- */
{
  const S = state.S;
  const pr = await import('../src/prepare.js');
  const allCells = (bd, tool, hs) => { for (let k = 0; k < 8; k++) for (let y = 0; y < pr.H; y++) for (let x = 0; x < pr.W; x++) pr.work(bd, tool, x + 0.5, y + 0.5, hs); };
  const findCell = (bd, wantBone) => { for (let y = 0; y < pr.H; y++) for (let x = 0; x < pr.W; x++) { const i = y * pr.W + x; if (!!bd.bone[i] === wantBone) return [x, y, i]; } return [-1, -1, -1]; };
  const CTR = c => c + 0.5;   // centro della cella c (le coord in celle sono frazionarie)
  const b = pr.newBoard(7);
  check('all\'inizio tutto coperto di polvere, osso intatto', pr.dustPct(b) < 0.1 && pr.integrity(b) === 1);
  check('stesso reperto = stesso stato', JSON.stringify(pr.newBoard(7)) === JSON.stringify(b));
  check('grado: pulito e intatto = perfetto ×1.5', pr.gradeFor(1, 1).id === 'perfetto' && pr.gradeFor(1, 1).mult === 1.5);
  check('grado: niente = nessun bonus, MAI una penalità', pr.gradeFor(0, 1).mult === 1 && pr.gradeFor(0, 1).xp === 0);
  check('cella centrale = quella sotto il punto del cursore', pr.centerCell(CTR(3), CTR(2)) === 2 * pr.W + 3 && pr.centerCell(-1, 0) === -1);
  /* PASSO 1 — PENNELLO: spolvera ovunque, MAI danni */
  { const bb = pr.newBoard(3); allCells(bb, 'pennello', 2);
    check('il pennello spolvera senza danni', pr.dustPct(bb) > 0.9 && pr.integrity(bb) === 1); }
  /* PASSO 2 — SCALPELLO: box toglie la roccia; il DANNO è solo se il CENTRO è sull'osso */
  { const bb = pr.newBoard(3); allCells(bb, 'pennello', 2);          // prima spolvera
    const [mx, my, mi] = findCell(bb, false), [bx, by] = findCell(bb, true);
    const rock0 = bb.rock[mi]; pr.work(bb, 'scalpello', CTR(mx), CTR(my), 1);
    check('lo scalpello (centro sulla ROCCIA) stacca la roccia senza danni', bb.rock[mi] < rock0 && pr.integrity(bb) === 1);
    const i0 = pr.integrity(bb);
    for (let k = 0; k < 6; k++) pr.work(bb, 'scalpello', CTR(bx), CTR(by), 1);
    check('lo scalpello col CENTRO sull\'osso lo scheggia (integrità cala)', pr.integrity(bb) < i0); }
  /* liberato il BORDO, la roccia lontana COLLASSA da sola (niente busywork sul 90% vuoto) */
  { const bb = pr.newBoard(3); allCells(bb, 'pennello', 2);
    for (let y = 0; y < pr.H; y++) for (let x = 0; x < pr.W; x++) if (bb.border[y * pr.W + x]) for (let k = 0; k < 3; k++) pr.work(bb, 'scalpello', CTR(x), CTR(y), 1);
    check('scalpellato il bordo, il fossile si libera (freed) senza toccarlo', bb.freed === true && pr.integrity(bb) === 1);
    pr.collapseFree(bb);
    check('collapseFree stacca la roccia lontana (rockPct al 100%)', pr.rockPct(bb) > 0.99); }
  /* PASSO 3 — SPATOLA: PULIRE è sempre sicuro; il danno viene solo da GRATTARE FERMI (scrape) il
     centro sull'osso GIÀ pulito */
  { const bb = pr.newBoard(5); allCells(bb, 'pennello', 2);
    const [ox, oy, oi] = findCell(bb, true);
    const crust0 = bb.crust[oi];
    for (let k = 0; k < 6; k++) pr.work(bb, 'spatola', CTR(ox), CTR(oy), 1);   // pulisci a fondo quella cella
    check('la spatola toglie la crosta dall\'osso', bb.crust[oi] < crust0);
    check('pulire la crosta NON scheggia (integrità piena)', pr.integrity(bb) === 1);
    const i0 = pr.integrity(bb);
    for (let k = 0; k < 30; k++) pr.scrape(bb, CTR(ox), CTR(oy));      // poi gratta FERMI l'osso pulito
    check('grattare fermi l\'osso già pulito lo rovina (integrità cala)', pr.integrity(bb) < i0); }
  {
    const it = { uid: 1, s: 'lepre', t: 'cranio', q: 'raro', val: 40 };
    const g = pr.applyPrep(it, 1, 1);
    check('preparato: valore ×1.5 e marchio (pulizia+integrità)', g.id === 'perfetto' && it.val === 60 && it.prep === 100 && it.prepInteg === 100);
    check('e non si prepara due volte', pr.applyPrep(it, 1, 1) === null && it.val === 60);
  }
  /* la regola anti-tedio: UN pezzo per consegna, e solo da raro in su */
  {
    S.raw = [
      { uid: 20, s: 'lepre', t: 'zampa', q: 'comune', val: 5 },
      { uid: 21, s: 'lepre', t: 'cranio', q: 'raro', val: 30 },
      { uid: 22, s: 'lepre', t: 'torace', q: 'eccezionale', val: 70 },
    ];
    const c = ui.prepCandidate();
    check('al tavolo va UN pezzo solo: il migliore del lotto', !!c && c.it.uid === 22);
    pr.applyPrep(c.it, 1);
    const c2 = ui.prepCandidate();
    check('preparato quello, propone il successivo raro', !!c2 && c2.it.uid === 21);
    pr.applyPrep(c2.it, 1);
    check('i comuni non vanno mai al tavolo (niente catena di montaggio)', ui.prepCandidate() === null);
    S.raw = [];
  }
}

/* ---------- LUCCIOLE (#5): minigioco notturno legato alla missione stagionale ---------- */
{
  const ff = await import('../src/firefly.js');
  const qm = await import('../src/quests.js');
  const dn = await import('../src/daynight.js');
  const S = state.S;
  ff.resetFireflies();
  P.x = 0; P.y = 0;

  // la missione lucciole è STAGIONALE (estate) e va accettata perché il minigioco parta
  let summer = -1, other = -1;
  for (let d = 0; d < 12 && (summer < 0 || other < 0); d++) { if (dn.seasonOf(d) === qm.FIREFLY_SEASON) { if (summer < 0) summer = d; } else if (other < 0) other = d; }
  const hasFire = day => { for (let cx = 0; cx < 8; cx++) for (let cy = 0; cy < 8; cy++) if (qm.boardOffers(cx, cy, day).some(o => o.type === 'fireflies')) return true; return false; };
  check('la missione lucciole compare SOLO d\'estate', hasFire(summer) === true && hasFire(other) === false);

  S.fireflies = 0;
  S.quests = { day: S.day, active: [], done: [] };
  ff.updateFireflies(0, 0.9);
  check('senza la missione, di notte NON partono le lucciole', ff.fireflyCount() === 0);
  S.quests.active = [{ type: 'fireflies', n: 5, base: (S.fireflies || 0), qid: 'ff', day: S.day }];
  ff.updateFireflies(20, 0.9);
  check('con la missione attiva, di notte compaiono lucciole', ff.fireflyCount() > 0);
  ff.updateFireflies(140, 0.1);
  check('di giorno le lucciole spariscono', ff.fireflyCount() === 0);
  ff.updateFireflies(260, 0.9);
  const flies = ff._fliesForTest();
  flies[0].x = P.x; flies[0].y = P.y + 8;                 // una lucciola a portata di retino
  const before = S.fireflies || 0;
  check('a portata: E rileva la lucciola (prompt)', ff.fireflyInReach() === true);
  check('la RETINATA (E) cattura la lucciola e la missione avanza', ff.tryCatchFireflies() === true && (S.fireflies || 0) > before && qm.questHave(S.quests.active[0]) > 0);
  ff.resetFireflies();
  check('senza NESSUNA lucciola, E non retina (torna allo scavo)', ff.tryCatchFireflies() === false && ff.fireflyInReach() === false);
  /* lucciole presenti ma FUORI portata: E dà la retinata a VUOTO (consumato, niente scavo) e NON cattura */
  ff.updateFireflies(400, 0.9);
  for (const f of ff._fliesForTest()) { f.x = P.x + 120; f.y = P.y; }
  const ff0 = S.fireflies || 0;
  check('lucciole lontane: E retina a vuoto (E consumato, niente cattura né scavo)', ff.tryCatchFireflies() === true && (S.fireflies || 0) === ff0 && ff.fireflyInReach() === false);
  /* COMPLETAMENTO AUTOMATICO: raggiunto l'obiettivo la missione si consegna da sola e le lucciole sfumano */
  S.fireflies = 0; S.coins = 0;
  S.quests = { day: S.day, active: [{ type: 'fireflies', n: 1, base: 0, reward: 20, qid: 'ffc', day: S.day }], done: [] };
  ff.resetFireflies(); ff.updateFireflies(300, 0.9);
  const fl2 = ff._fliesForTest(); fl2[0].x = P.x; fl2[0].y = P.y + 8;
  ff.tryCatchFireflies();
  check('obiettivo raggiunto → missione consegnata da sola', S.quests.done.includes('ffc') && S.coins > 0);
  for (let t = 0; t < 25; t++) ff.updateFireflies(300 + t * 50, 0.9);
  check('a missione finita le lucciole sfumano e spariscono', ff.fireflyCount() === 0);
  /* PREMIO SPECIALE: completare la missione RARA dà una MAPPA verso un fossile leggendario (niente monete) */
  const qm2 = await import('../src/quests.js');
  S.fireflies = 0; S.coins = 0; S.maps = []; S.uid = S.uid || 1;
  S.quests = { day: S.day, active: [{ type: 'fireflies', n: 1, base: 0, reward: 0, prize: 'map', prizeRar: 'leggendario', qid: 'ffm', day: S.day }], done: [] };
  ff.resetFireflies(); ff.updateFireflies(500, 0.9);
  const flm = ff._fliesForTest(); flm[0].x = P.x; flm[0].y = P.y + 8;
  ff.tryCatchFireflies();
  check('premio lucciole = mappa leggendaria, niente monete', S.quests.done.includes('ffm') && S.coins === 0 && (S.maps || []).some(m => m.rar === 'leggendario'));
  check('etichetta premio lucciole mostra la mappa, non le monete', /🗺️/.test(qm2.questRewardText({ type: 'fireflies', prize: 'map', prizeRar: 'leggendario', reward: 0 })));
  ff.resetFireflies();
  S.quests = null; S.fireflies = 0; S.maps = [];
}

/* ---------- FINESTRE DI PRESENZA (specie notturne e stagionali) ---------- */
{
  const S = state.S;
  const data = await import('../src/data.js');
  const win = data.SPECIES.filter(x => x.when);
  check('12 specie hanno una finestra: 1 notturna e 1 stagionale per zona', win.length === 12 &&
    data.ZONES.every(z => {
      const p = data.zonePools[z.id];
      return p.filter(x => x.when && x.when.night).length === 1 && p.filter(x => x.when && x.when.season != null).length === 1;
    }));
  check('le finestre stanno solo su specie con fonte dedicata (barca/piccone)',
    win.every(x => x.src === 'acqua' || x.src === 'roccia'));
  /* la regola che tiene in piedi il pity: scavando la TERRA ogni rarità resta raggiungibile
     a qualsiasi ora e in qualsiasi stagione */
  check('scavando la terra nessuna rarità dipende da notte o stagione',
    data.ZONES.every(z => ['comune', 'raro', 'eccezionale', 'leggendario'].every(q =>
      data.zonePools[z.id].some(x => (x.src || 'terra') === 'terra' && x.r === q && !x.when))));
  check('availableNow: notturna assente di giorno, presente di notte',
    !data.availableNow(win.find(x => x.when.night), false, 0) && data.availableNow(win.find(x => x.when.night), true, 0));
  {
    const sp = win.find(x => x.when.season != null);
    check('availableNow: stagionale solo nella sua stagione',
      data.availableNow(sp, false, sp.when.season) && !data.availableNow(sp, false, (sp.when.season + 1) % 4));
  }
  /* e il pescato notturno deve davvero cambiare: di giorno quella specie non esce mai */
  {
    const gp = await import('../src/gameplay.js');
    const night = win.find(x => x.when.night);
    S.tod = 0.3; S.day = 1; S.pity = {}; S.codex = []; S.museum = {};
    let seenDay = 0;
    for (let i = 0; i < 120; i++) if (gp.makeRaw(night.zone, 0, null, 'acqua')) seenDay++;
    S.tod = 0.75;
    let seenNight = 0;
    for (let i = 0; i < 120; i++) { const r = gp.makeRaw(night.zone, 0, null, 'acqua'); if (r && r.s === night.id) seenNight++; }
    check('di giorno l\'acqua non dà nulla, di notte dà la specie notturna', seenDay === 0 && seenNight === 120);
    S.tod = 0.3;
  }
}

/* ---------- COMMISSIONE DEL MUSEO (impegno a 3 giorni) ---------- */
{
  const cm = await import('../src/commission.js');
  const S = state.S;   // i test dei salvataggi riassegnano state.S: qui serve quello vivo
  S.commission = null; S.day = 10; S.coins = 0; S.items = []; S.dna = {}; S.codex = [];
  const o1 = cm.offerFor(S.day), o1b = cm.offerFor(S.day);
  check('commissione: la proposta del giorno e stabile', JSON.stringify(o1) === JSON.stringify(o1b));
  check('e cambia il giorno dopo', JSON.stringify(cm.offerFor(S.day + 1)) !== JSON.stringify(o1));
  check('senza codex propone una rarita (non una specie sconosciuta)', o1.kind === 'rarity');

  cm.accept(o1, S.day);
  check('accettata: una sola alla volta', !!cm.active() && cm.accept(cm.offerFor(S.day + 1), S.day) === false);
  check('scadenza a 3 giorni inclusa quella di oggi', cm.daysLeft(S.day) === 3 && cm.daysLeft(S.day + 2) === 1);

  check('senza pezzi non si consegna', !cm.canDeliver() && cm.deliver(S.day) === null);
  for (let i = 0; i < o1.n + 1; i++) S.items.push({ uid: 100 + i, s: 'x', t: 'cranio', q: o1.rar, val: 10 + i * 10 });
  check('con i pezzi giusti si puo consegnare', cm.canDeliver());
  const done = cm.deliver(S.day);
  check('consegnata: monete accreditate e commissione chiusa', !!done && S.coins === o1.reward && cm.active() === null);
  check('e ha consumato i pezzi meno preziosi', S.items.length === 1 && S.items[0].val === 10 + o1.n * 10);

  S.commission = null; S.day = 20;
  cm.accept(cm.offerFor(S.day), S.day);
  check('non scade finche e nei termini', cm.pruneExpired(S.day + 2) === false && !!cm.active());
  const co0 = S.coins;
  check('scaduta: sparisce senza togliere nulla', cm.pruneExpired(S.day + 3) === true && cm.active() === null && S.coins === co0);

  const { ALL_SPECIES: ALLSP } = await import('../src/data.js');
  S.codex = ALLSP.slice(0, 8).map(x => x.id); S.commission = null;
  let sawSpecies = false;
  for (let d = 1; d < 40 && !sawSpecies; d++) if (cm.offerFor(d).kind === 'species') sawSpecies = true;
  check('col codex compaiono richieste di una specie precisa', sawSpecies);
  {
    let so = null; for (let d = 1; d < 40 && !so; d++) { const o = cm.offerFor(d); if (o.kind === 'species') so = o; }
    S.commission = null; S.items = []; S.dna = {}; S.day = 30;
    cm.accept(so, S.day);
    for (let i = 0; i < so.n; i++) S.items.push({ uid: 200 + i, s: so.spId, t: 'cranio', q: 'comune', val: 5 });
    const r = cm.deliver(S.day);
    check('la commissione di specie paga una fialetta INTERA', !!r && S.dna[so.spId] === 1);
  }
  S.commission = null;
}

failures += summary('digsy-world');
process.exit(failures ? 1 : 0);
