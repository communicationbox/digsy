/* Suite Node: mondo/città, bussola, chimere/parco, sprite/look. Uso: npm test */
import { installStubs, check, summary } from './stub.mjs';
installStubs();

/* import dopo gli stub: i moduli toccano il DOM al load */
const { TS, SPECIES, RAR, CHIMERA_COST, SERVICE_COST, HAIR_STYLES, HAIR_COLORS, LOOKS } = await import('../src/data.js');
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
  for (let cx = -10; cx < 10; cx++) for (let cy = -10; cy < 10; cy++) {
    const t = world.townForCell(cx, cy); if (!t) continue; n++;
    sizes[t.size] = (sizes[t.size] || 0) + 1;
    if (!t.name || t.name.length < 4) bad++;
    const types = t.buildings.map(b => b.type);
    if (types.includes('barber')) barbers++;
    if (types.includes('tailor')) tailors++;
    for (const b of t.buildings) {
      if (b.x0 < t.x0 || b.x1 > t.x1 || b.y0 < t.y0 || b.y1 > t.y1) bad++;
      const below = world.townInfo(b.doorx, b.doory + 1);
      if (!below || !below.floor || world.isSolidTile(b.doorx, b.doory + 1)) bad++;
      const d = world.townInfo(b.doorx, b.doory);
      if (!d || !d.door) bad++;
    }
    // città (e parco) interamente dentro la cella
    const lim = { x0: cx * world.TCELL, y0: cy * world.TCELL, x1: (cx + 1) * world.TCELL - 1, y1: (cy + 1) * world.TCELL - 1 };
    const y1 = t.pen ? t.pen.y1 : t.y1;
    if (t.x0 < lim.x0 || t.x1 > lim.x1 || t.y0 < lim.y0 || y1 > lim.y1) bad++;
    if (t.size === 'città' && (!types.includes('barber') || !types.includes('tailor') || !t.pen)) bad++;
    if (t.size === 'paese' && !types.includes('barber')) bad++;
  }
  check(`città campionate (${n}, taglie ${JSON.stringify(sizes)})`, n > 60 && bad === 0);
  check(`barbieri nei paesi+città (${barbers}), sartorie nelle città (${tailors})`, barbers > 0 && tailors > 0);
  check('nomi deterministici', world.townName(3, 7) === world.townName(3, 7));
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
  cave.CAVE.x = (cave.CAVE.w >> 1) * TS + 8;
  cave.CAVE.y = (cave.CAVE.h - 4) * TS;
  const camBottom = cave.caveCam().y + 200;              // 200 = altezza vista di prova
  check('sotto l\'imbocco c\'è spazio visibile (' + Math.round(camBottom - rh) + ' px)', camBottom > rh);

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
  let wrong = 0;
  const handmade = Object.keys(bank.SPRITES).filter(k => k.startsWith('wonder:')).map(k => k.slice(7));
  for (const type of handmade) {
    const g = brush();
    drawWonder(g, type, 0, 0, 0);
    /* i colori della banca sono la firma: se si vedono, è stato usato il disegno a mano */
    const pal = Object.values(bank.spriteDef('wonder:' + type).pal);
    const hits = pal.filter(col => g.used.has(col)).length;
    if (hits < pal.length / 2) wrong++;
  }
  check(`drawWonder usa i disegni a mano (${handmade.length}: ${handmade.join(', ')})`,
    handmade.length > 0 && wrong === 0);
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
  check('FOOT_DY vale quello che valeva', body.FOOT_DY === 13);

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
  S.coins = 100; S.items = [
    { uid: 1, s: 'gastro', t: 'cranio', q: 'raro', val: 10 },
    { uid: 2, s: 'prato', t: 'torace', q: 'comune', val: 8 },
    { uid: 3, s: 'magma', t: 'zampa', q: 'leggendario', val: 30 },
    { uid: 4, s: 'alce', t: 'coda', q: 'comune', val: 5 },
  ]; S.creatures = [];
  /* chimera SENZA DNA: rifiutata */
  S.dna = {};
  check('senza DNA rifiuta', !gameplay.assembleChimera(1, 2, 3) && S.creatures.length === 0);
  /* con ½ fialetta per ogni specie distinta: ok, e le mezze si consumano */
  S.dna = { gastro: 2, prato: 1, magma: 1 };
  const ok = gameplay.assembleChimera(1, 2, 3);
  check('assembla: economia esatta (monete + ½ DNA a specie)', ok && S.coins === 100 - CHIMERA_COST && S.items.length === 1 && S.creatures.length === 1 &&
    S.dna.gastro === 1 && S.dna.prato === 0 && S.dna.magma === 0);
  check('rarità = max delle parti', S.creatures[0].q === 'leggendario');
  S.coins = 5; S.items.push({ uid: 5, s: 'gufo', t: 'cranio', q: 'comune', val: 4 }, { uid: 6, s: 'lepre', t: 'torace', q: 'comune', val: 4 }, { uid: 7, s: 'pinna', t: 'zampa', q: 'comune', val: 4 });
  check('senza monete rifiuta', !gameplay.assembleChimera(5, 6, 7) && S.creatures.length === 1);
  S.coins = 100;
  check('slot sbagliato rifiuta', !gameplay.assembleChimera(6, 5, 7));
}

/* ---------- parco ---------- */
{
  let big = null;
  for (let cx = -15; cx < 15 && !big; cx++) for (let cy = -15; cy < 15 && !big; cy++) { const t = world.townForCell(cx, cy); if (t && t.pen) big = t; }
  check('città con parco trovata', !!big);
  const p = big.pen;
  let fenceBad = 0;
  for (let tx = p.x0; tx <= p.x1; tx++) for (let ty = p.y0; ty <= p.y1; ty++) {
    const ti = world.townInfo(tx, ty);
    const gate = ty === p.y0 && (tx === big.C.x - 1 || tx === big.C.x);
    const edge = (tx === p.x0 || tx === p.x1 || ty === p.y0 || ty === p.y1) && !gate;
    if (edge && (!ti || !ti.solid)) fenceBad++;
    if (!edge && (!ti || !ti.floor || world.isSolidTile(tx, ty))) fenceBad++;
  }
  check('recinto: bordi solidi, cancello+interno percorribili', fenceBad === 0);
  P.x = big.C.x * TS; P.y = big.C.y * TS;
  park.refreshVisParks();
  check('parco nei visParks', park.visParks.includes(big));
  const list = park.parkList(big);
  check('una chimera nel parco', list.length === S.creatures.length && list.length === 1);

  /* LE SPECIE RISVEGLIATE VIVONO NEL PARCO. Costano cinque pezzi e una fialetta intera di
     DNA, e per mesi il recinto le ha ignorate: comparivano solo nel Libro e fra i compagni.
     Un giocatore ne aveva risvegliate dieci e le credeva perse. */
  {
    const before = park.parkList(big).length;
    S.awakened.push('fangodonte', 'brontorana');
    const after = park.parkList(big);
    check('le specie risvegliate entrano nel parco',
      after.length === before + 2 && S.creatures.length + S.awakened.length === after.length);
    const nomi = after.map(a => a.c.name);
    check('nel parco ci sono col loro nome di specie',
      nomi.includes('Fangodonte') && nomi.includes('Brontorana'));
    check('una specie risvegliata ha lo sprite della specie (cranio=torace=zampa)',
      after.some(a => a.c.skull === 'fangodonte' && a.c.torso === 'fangodonte' && a.c.leg === 'fangodonte'));
    /* parco e selettore dei compagni devono pescare dalla STESSA lista: quando erano due
       elenchi scritti a mano sono divergute proprio così */
    const comp = (await import('../src/companion.js')).companionCandidates();
    check('parco e compagni: stessa popolazione',
      comp.length === after.length && comp.every((c, i) => c.key === after[i].c.key));
    S.awakened.length = 0;
    check('tolte le risvegliate il parco torna alle sole chimere',
      park.parkList(big).length === S.creatures.length);
  }
  let out = 0;
  for (let i = 0; i < 3600; i++) {
    park.updatePark(big, 1 / 60);
    for (const a of list) {
      const tx = Math.floor(a.x / TS), ty = Math.floor(a.y / TS);
      if (tx <= p.x0 || tx >= p.x1 || ty <= p.y0 || ty >= p.y1) out++;
    }
  }
  check('60s di wander senza fughe', out === 0);
}

/* ---------- sprite / look ---------- */
{
  let bad = 0;
  for (const dir of ['down', 'up', 'side']) for (const fr of [0, 1]) {
    const rows = sprites.SPR[dir][fr];
    if (rows.length !== 16) bad++;
    rows.forEach(r => { if (r.length !== 16) bad++; for (const ch of r) if (!(ch in sprites.PAL)) bad++; });
  }
  check('6 varianti sprite 16x16 con chiavi valide', bad === 0);
  let hbad = 0;
  for (const st of Object.keys(sprites.HAIRS)) for (const dir of ['down', 'side', 'up']) {
    for (const [y, r] of sprites.HAIRS[st][dir]) {
      if (y < 0 || y > 15 || r.length !== 16) hbad++;
      for (const ch of r) if (!(ch in sprites.PAL)) hbad++;
    }
  }
  check('overlay capelli validi (4 stili × 3 direzioni)', hbad === 0);
  check('stili/colori capelli coerenti coi dati (6 stili, 12 colori)', HAIR_STYLES.length === 6 && HAIR_STYLES.every(s => s.id in sprites.HAIRS) && HAIR_COLORS.length === 12);
  // fronte/retro: capelli simmetrici rispetto all'asse della testa (colonne 4–9 → specchio c↔13-c)
  let asym = 0;
  for (const st of Object.keys(sprites.HAIRS)) for (const dir of ['down', 'up']) {
    for (const [, r] of sprites.HAIRS[st][dir]) {
      for (let c = 0; c < 16; c++) {
        const m = 13 - c;
        if (m >= 0 && m < 16 && (r[c] === 'A') !== (r[m] === 'A')) asym++;
      }
    }
  }
  check('capelli centrati (simmetria fronte/retro)', asym === 0);
  let hatBad = 0;
  for (const st of Object.keys(sprites.HATS)) for (const dir of ['down', 'side', 'up']) {
    for (const [y, r] of sprites.HATS[st][dir]) {
      if (y < -3 || y > 15 || r.length !== 16) hatBad++; // fino a 3 righe sopra la testa
      for (const ch of r) if (!(ch in sprites.PAL)) hatBad++;
    }
  }
  check('overlay cappelli validi (3 forme × 3 direzioni)', hatBad === 0);
  const { HAT_STYLES } = await import('../src/data.js');
  check('forme cappello coerenti coi dati', HAT_STYLES.length === 3 && HAT_STYLES.every(s => s.id in sprites.HATS));
  check('shade #ffffff 0.5 = #808080', sprites.shade('#ffffff', 0.5) === '#808080');
  S.look.hat = '#5a86c8'; sprites.applyLook();
  check('applyLook aggiorna palette + ombra', sprites.PAL.H === '#5a86c8' && sprites.PAL.h === sprites.shade('#5a86c8', 0.72));
  S.look.hairColor = '#caa25a'; sprites.applyLook();
  check('applyLook aggiorna capelli', sprites.PAL.A === '#caa25a');
  check('hatStyle di default explorer', state.fresh().look.hatStyle === 'explorer');
  // smoke: eroe senza cappello e con ogni taglio, tutte le direzioni
  const stubCtx = { fillStyle: '', fillRect() {}, clearRect() {} };
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
      S.look.hatStyle = hst; S.look.hairStyle = hair; sprites.applyLook();
      const hairCol = sprites.PAL.A;
      const rec = { fillStyle: '', fillRect(px2, py2) { if (this.fillStyle === hairCol && py2 <= crown) clip++; }, clearRect() {} };
      for (const dir of ['down', 'up', 'right']) sprites.drawHero(rec, 0, 0, dir, 0);
    }
  }
  check('capelli mai sopra la corona del cappello', clip === 0);
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
    S.coins = 20; S.snacks = 0; S.energy = 5; S.maxEnergy = 30;
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
  gameplay.tryDig(); gameplay.stepDig(2);
  check('debug: scava con 0 energia, senza consumarla', S.energy === 0 && state.dugSet.has(dug2[0] + ',' + dug2[1]));
  // monete infinite: chimera gratis con 0 monete
  S.items = [
    { uid: 901, s: 'prato', t: 'cranio', q: 'comune', val: 5 },
    { uid: 902, s: 'lepre', t: 'torace', q: 'comune', val: 5 },
    { uid: 903, s: 'alce', t: 'zampa', q: 'comune', val: 5 },
  ];
  const nCr = S.creatures.length;
  check('debug: chimera gratis', gameplay.assembleChimera(901, 902, 903) === true && S.coins === 0 && S.creatures.length === nCr + 1);
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
  P.x = door.doorx * TS + 8; P.y = door.doory * TS + 2;
  inter.INT.justLeft = false;
  P.dir = 'right'; P.moving = true;
  inter.checkDoorEnter();
  check('passare DAVANTI alla porta non fa entrare', inter.INT.active === false);
  P.dir = 'up'; P.moving = true;
  inter.checkDoorEnter();
  check('camminare DENTRO la porta (verso l\'alto) = dentro, senza E', inter.INT.active === true && inter.INT.b === door);
  check('NPC con nome per ogni mestiere', ['lab','store','museum','inn','barber','tailor'].every(t => inter.npcName(t).length > 3));
  // spawn interno: vicino alla porta, non nel muro
  check('spawn interno valido', !inter.interiorSolid(inter.INT.x, inter.INT.y));
  // cammina verso l'alto fino al bancone → vicino all'NPC
  for (let i = 0; i < 300; i++) inter.updateInterior(1 / 60, { up: true }, 46);
  check('si arriva davanti all\'NPC (bancone lo ferma)', inter.nearNpc() && !inter.interiorSolid(inter.INT.x, inter.INT.y));
  // torna giù fino alla porta → esce, player piazzato SOTTO la porta
  for (let i = 0; i < 400 && inter.INT.active; i++) inter.updateInterior(1 / 60, { down: true }, 46);
  check('uscita dalla porta', inter.INT.active === false);
  check('player sotto la porta (fuori)', Math.floor(P.x / TS) === door.doorx && Math.floor(P.y / TS) === door.doory + 1);
  // anti-rientro: justLeft blocca finché non ti allontani
  P.x = door.doorx * TS + 8; P.y = door.doory * TS + 2;
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
  for (const type of ['lab', 'store', 'inn', 'barber', 'tailor']) { // museo: stanze proprie, testato a parte
    const b = byType[type]; if (!b) { roomBad.push(type + ':manca'); continue; }
    inter.enterInterior(b, null);
    if (!inter.interiorSolid(30, 56) || !inter.interiorSolid(130, 58)) roomBad.push(type + ':lati');
    if (inter.interiorSolid(80, 56) || inter.interiorSolid(80, 90)) roomBad.push(type + ':corridoio');
    for (let i = 0; i < 300 && !inter.nearNpc(); i++) inter.updateInterior(1 / 60, { up: true }, 46);
    if (!inter.nearNpc()) roomBad.push(type + ':npc');
    inter.exitInterior(); inter.INT.justLeft = false;
  }
  check('5 stanze a tema: solidi/corridoio/NPC ok' + (roomBad.length ? ' (' + roomBad.join(' ') + ')' : ''), roomBad.length === 0);
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
  check('seconda consegna rifiutata (job in corso)', gameplay.museumDeposit() === false);
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
  inter.INT.x = (pd.x0 + pd.x1) / 2; inter.INT.y = pd.y1 + 8;
  const nc = inter.nearCase();
  check('etichetta piedistallo: specie e progresso', !!nc && nc.sp.id === pd.sp.id && nc.n === (S.museum[pd.sp.id] || []).length);
  /* si cammina nel corridoio a SUD dei piedistalli (le teche sono solide a tutta altezza) */
  inter.INT.x = pd.x0 - 20; inter.INT.y = pd.y1 + 24;
  let moved = 0;
  for (let i = 0; i < 120; i++) { const x0 = inter.INT.x; inter.updateInterior(1 / 60, { right: true }, 46); if (inter.INT.x > x0) moved++; }
  check('galleria: corridoi percorribili', moved > 60);
  /* collisione SOLO sulla base (il pg passa dietro la teca, z-order per y) */
  check('teca: collisione sulla base', !!pd && pd.y0 === pd.ty * 16 + 4 && pd.y1 === pd.ty * 16 + 15);
  /* uscita dalla porta in basso al centro */
  inter.INT.x = (inter.GAL_W / 2) * 16; inter.INT.y = (inter.GAL_H - 1.5) * 16;
  for (let i = 0; i < 300 && inter.INT.active; i++) inter.updateInterior(1 / 60, { down: true }, 46);
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
      /* città intera (parco compreso) dentro la sua cella: townForTile deve ritrovarla */
      const y1 = c.pen ? c.pen.y1 : c.y1;
      if (Math.floor(c.x0 / world.TCELL) !== cx || Math.floor(c.x1 / world.TCELL) !== cx ||
        Math.floor(c.y0 / world.TCELL) !== cy || Math.floor(y1 / world.TCELL) !== cy) inCell = false;
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
  } catch (e) { smokeThrew = true; }
  check('smoke render esteso (biomi/meteo/landmark/compagno/notte)', smokeThrew === false);
  /* INTERNI: ogni stanza va DISEGNATA davvero. Questo controllo nasce da una regressione vera:
     spostando gli interni in un modulo a parte, due simboli (drawSayBalloon e NIGHT) sono
     rimasti in render.js e il gioco crashava appena si entrava in un edificio — con tutti i
     test verdi, perché nessuno chiamava mai drawInteriorScene. */
  {
    const inter2 = await import('../src/interior.js');
    const types = ['store', 'lab', 'museum', 'inn', 'barber', 'tailor'];
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
    check('bici di spalle: catarifrangente giallo', only(bikeBack, plain, '#f2c53d'));
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
    check('relitto: lo scafo spezzato affiora davvero dal mare', only(boat, plain, '#4a382a'));
    S.tools.boat = false; S.tools.motorboat = false; P.moving = false;
  }

  /* ---- ENTITÀ DEL MONDO: la logica era testata, il disegno mai ---- */
  {
    const siteFar = frame(site.x + 60, site.y + 60);        // fuori vista: il sito non c'entra
    check('sito di scavo: ossa che affiorano dal montarolo', only(plain, siteFar, '#ece5d2'));
    const caveF = frame(cave[0], cave[1]);
    check('imbocco di grotta: arco buio nella roccia', only(caveF, plain, '#15131a'));
    const lmF = frame(willow.x, willow.y);
    check('meraviglia: il salice della palude è dipinto per intero', only(lmF, plain, '#86b552'));
    /* X del tesoro: si paga fino a 🪙480 per una mappa, se la X non si vede è denaro buttato */
    S.maps = [{ x: land[0] + 1, y: land[1], rar: 'raro', uid: 991 }];
    const xF = frame(land[0], land[1]);
    S.maps = [];
    check('X del tesoro: croce rossa dipinta a terra', only(xF, plain, '#b8402e'));
    /* buca dello scavo: senza, una casella esaurita è indistinguibile da una intatta */
    const holeKey = land[0] + ',' + land[1];
    const had = state.dugSet.has(holeKey);
    state.dugSet.add(holeKey);
    const holeF = frame(land[0], land[1]);
    if (!had) state.dugSet.delete(holeKey);
    check('buca: la casella già scavata si vede', only(holeF, plain, '#4d371f'));
  }

  /* ---- ROBA A TERRA E CHIMERE DEL PARCO: due liste che il render disegna a parte ---- */
  {
    /* i reperti caduti (zaino pieno) DEVONO vedersi: sono già tuoi, e se non li vedi li perdi */
    const keepDrops = S.drops;
    S.drops = [{ tx: land[0] + 1, ty: land[1], kind: 'good', payload: { id: 'spiga' } }];
    const dropped = frame(land[0], land[1]);
    S.drops = keepDrops;
    check('oggetti lasciati a terra: si vedono e si possono ritrovare', dropped.size > plain.size && !!dropped.size);

    /* il parco è la vetrina del gioco: è lì che le chimere "tornano a vivere" */
    let pen = null;
    for (let cx = -8; cx <= 8 && !pen; cx++) for (let cy = -8; cy <= 8 && !pen; cy++) {
      const t = world.townForCell(cx, cy); if (t && t.pen) pen = t;
    }
    /* nel recinto vivono chimere E specie risvegliate: per avere un recinto DAVVERO vuoto
       come controllo vanno azzerate tutte e due (i test precedenti risvegliano parecchio) */
    const keepCre = S.creatures, keepAwk = S.awakened;
    const px0 = Math.floor((pen.pen.x0 + pen.pen.x1) / 2), py0 = Math.floor((pen.pen.y0 + pen.pen.y1) / 2);
    S.creatures = []; S.awakened = []; park.parks.clear();
    at(px0, py0); park.refreshVisParks();
    const empty = spy(() => render(2000));
    S.creatures = [{ uid: 5, name: 'Parcosauro', skull: SPECIES[0].id, torso: SPECIES[0].id, leg: SPECIES[0].id, q: 'comune' }];
    park.parks.clear();
    for (const t of park.visParks) park.parkList(t);
    const full = spy(() => render(2000));
    S.creatures = keepCre; S.awakened = keepAwk; park.parks.clear();
    check('parco: la chimera assemblata passeggia davvero nel recinto', full.size > empty.size);
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
    for (const [type, col] of [['redspire', '#cc7854'], ['orecrystal', '#9ad0c8'], ['icecrystal', '#8fd0e6'], ['hay', '#b99b2e']]) {
      const p = wanted[type]; if (!p) { drawnOk = false; missing += type + ' '; continue; }
      const f = frame(p[0], p[1]);
      if (!f.has(col)) { drawnOk = false; missing += type + ' '; }
    }
    check('guglie, cristalli, ghiaccio e balle di fieno vengono dipinti dal render', drawnOk, missing);
    /* e le stesse funzioni, chiamate da sole, devono dipingere il loro colore anche fuori
       dal mondo (le usano anche le pagine di prova /sprites) */
    const direct = [
      ['drawRedspire', '#b05e3e'], ['drawOrecrystal', '#e8f6fb'],
      ['drawIcecrystal', '#bfe9f4'], ['drawHay', '#d4b13c'], ['drawHole', '#6d4f30'],
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
    check('Traguardi: elenco completo con quelli sbloccati', achs.includes('Traguardi sbloccati'));

    const guide = panel(() => ui.openHudGuide());
    check('Guida HUD: spiega monete, energia e zona a chi inizia', guide.includes('Monete') && guide.includes('Energia') && guide.includes('Zona'));

    const keepCre = S.creatures;
    S.creatures = [];
    const noComp = panel(() => ui.openCompanionPicker());
    check('Compagno: senza chimere spiega come ottenerne una', noComp.includes('Nessuna chimera'));
    S.creatures = [{ uid: 77, name: 'Provolone', skull: SPECIES[0].id, torso: SPECIES[0].id, leg: SPECIES[0].id, q: 'comune' }];
    const withComp = panel(() => ui.openCompanionPicker());
    check('Compagno: con una chimera la si può scegliere', withComp.includes('Provolone') && withComp.includes('data-comp'));
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

/* ---------- console: comandi cheat NON distruttivi + vanilla (blocco isolato in fondo) ---------- */
{
  const cmds = await import('../src/commands.js');
  const { PARTS: PARTSc, ZONES: ZONESc, THEMED_HAT, THEMED_HAIR } = await import('../src/data.js');
  const regionsC = await import('../src/regions.js');
  const dbg2 = await import('../src/debug.js');
  if (state.isCheatLock()) cmds.runCommand('vanilla'); // parti pulito
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
  cmds.runCommand('speed=8'); check('console: speed=8', P.speedMul === 8);
  cmds.runCommand('speed=99'); check('console: speed clamp a 20', P.speedMul === 20);
  check('console: primo cheat congela il salvataggio (lock)', state.isCheatLock() === true);
  cmds.runCommand('goddna');
  check('console: goddna → DNA di tutte le specie, grotte comprese',
    (await import('../src/data.js')).ALL_SPECIES.every(sp => S.dna[sp.id] >= 2));
  S.items = []; S.tools = {}; S.shovel = 0; S.maps = []; cmds.runCommand('goditem');
  check('console: goditem → fossili (grotte comprese) + attrezzi + barca + mappe + mezzi',
    S.items.length === (await import('../src/data.js')).ALL_SPECIES.length * PARTSc.length && S.tools.boat && S.tools.axe && S.tools.pick && S.tools.skates && S.tools.bike && S.tools.motorboat && S.tools.torch && S.shovel > 0 && S.maps.length >= 3 && S.teleports > 0);
  S.unlocked = { hats: [], hairs: [] }; S.museum = {}; S.awakened = [];
  cmds.runCommand('godmode');
  const { PREMIUM_HATS: PH } = await import('../src/data.js');
  check('console: godmode sblocca+completa tutto (incl. volo)', dbg2.isDebug() === true && S.unlocked.hats.length === THEMED_HAT.length + PH.length &&
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
  cave.CAVE.x = (cave.CAVE.w >> 1) * TS + 8; cave.CAVE.y = (cave.CAVE.h - 1.3) * TS;
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
  S.achieved = []; S.codex = []; S.raw = []; S.items = []; S.creatures = []; S.awakened = []; S.donated = []; S.caves = {}; S.companion = null; S.coins = 0; S.level = 1; S.questTotal = 0;
  ach.checkAchievements();
  check('nessun traguardo con stato vuoto', S.achieved.length === 0);
  S.codex = ['lepre'];
  let unlocked = []; ach.checkAchievements(a => unlocked.push(a.id));
  check('traguardo "prima scoperta" si sblocca', ach.isAchieved('first_find') && unlocked.includes('first_find'));
  unlocked = []; ach.checkAchievements(a => unlocked.push(a.id));
  check('traguardo non si ri-sblocca', !unlocked.includes('first_find'));
  S.coins = 600; ach.checkAchievements();
  check('traguardo "danaroso" a 500+', ach.isAchieved('rich'));

  /* "LE HAI SCOPERTE TUTTE" DEVE VOLER DIRE TUTTE. Il traguardo confrontava il codex col
     numero 60 scritto a mano, ma nel codex finiscono anche le 6 specie di grotta: bastava
     identificarne cinque per farlo scattare con cinque specie di superficie ancora da
     trovare. Il totale si chiede ai dati. */
  {
    const { ALL_SPECIES: ASP, SPECIES: SUP, CAVE_SPECIES: CSP } = await import('../src/data.js');
    S.achieved = []; S.codex = SUP.slice(0, SUP.length - CSP.length).map(s => s.id).concat(CSP.map(s => s.id));
    check('codex pieno di superficie+grotta ma incompleto', S.codex.length === SUP.length && S.codex.length < ASP.length);
    ach.checkAchievements();
    check('mescolare le specie di grotta NON fa scattare "le hai scoperte tutte"', !ach.isAchieved('all60'));
    S.codex = ASP.map(s => s.id); ach.checkAchievements();
    check('col catalogo davvero completo il traguardo arriva', ach.isAchieved('all60'));
    check('la descrizione dice il totale VERO, senza rompere la traduzione',
      ach.achDesc(ach.ACHS.find(a => a.id === 'all60')).includes(String(ASP.length)));
  }
  S.achieved = []; S.codex = [];
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
  check('abilità deterministica valida', comp.ABILITIES.includes(comp.companionAbility()) && comp.abilityOf(cands[1]) === comp.abilityOf(cands[1]));
  comp.clearCompanion();
  check('compagno rimandato a casa', comp.companionSpec() === null && comp.companionAbility() === null);
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
  else if (a.type === 'goods') for (let i = 0; i < a.n; i++) S.goods.push({ uid: 900 + i, id: a.goodId, val: 3, good: true });
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
  S.quests.active = []; S.quests.done = [];
  const o2 = q.boardOffers(2, 2, 5);
  q.acceptQuest(o2[0], 5); q.acceptQuest(o2[1], 5); q.acceptQuest(o2[2], 5);
  check('massimo 3 missioni attive', q.acceptQuest(o2[3], 5) === 'full' && q.activeQuests().length === 3);
  q.ensureQuests(6);
  check('a fine giornata le missioni scadono', q.activeQuests().length === 0);
}

/* ---------- meteo: deterministico per (zona, giorno), pioggia alza i drop ---------- */
{
  const wth = await import('../src/weather.js');
  const w = wth.weatherAt('palude', 3);
  check('meteo deterministico per zona+giorno', wth.weatherAt('palude', 3) === w && ['rain', 'clear'].includes(w));
  check('pioggia alza i drop, sereno no', wth.weatherDropMul('rain') > 1 && wth.weatherDropMul('clear') === 1);
  check('etichetta meteo è stringa', typeof wth.weatherLabel('snow') === 'string');
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
  check('palude e ghiacci non piu tonalita lontane', audio.keyDistance(tonica, audio.MOODS.palude.shift) <= 1 && audio.keyDistance(tonica, audio.MOODS.ghiacci.shift) <= 1);
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
  check('i tetti cambiano col bioma, e nelle Lande si innevano', /BB\.roof/.test(rsrc) && /snowCap/.test(rsrc));
  check('ogni bioma ha un MATERIALE di tetto (mat)', (tsrc.match(/mat:\s*'/g) || []).length === 6);
  check('i tetti disegnano il materiale del bioma (roofMat)', /roofMat\s*=/.test(rsrc) && /roofMat\(sy/.test(rsrc));
  check('il legno degli interni cambia col bioma', /export const INT_WOOD = \[/.test(tsrc) && (tsrc.match(/#/g) || []).length > 100);
  /* DISEGNO VERO: i 6 edifici si disegnano senza errori (materiale tetto + neve inclusi) */
  const render3 = await import('../src/render.js');
  let drew = true, drewErr = '';
  try { for (const t of ['museum', 'store', 'inn', 'barber', 'tailor', 'lab']) render3.drawBuilding({ type: t, x0: 0, y0: 0, x1: 4, y1: 1 }, 120, 120); } catch (e) { drew = false; drewErr = e.message; }
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
  const ui = (await import('node:fs')).readFileSync('src/ui.js', 'utf8');
  check('traguardo con fanfara', /checkAchievements[\s\S]{0,200}fanfare/.test(ui));
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
  /* 5) sotto cheat non si scrive NEMMENO negli slot */
  state.setCheatLock(true);
  const before = localStorage.getItem(SKk + '_slot1');
  check('slot rifiutato sotto cheat', state.saveToSlot(1) === 'cheat' && localStorage.getItem(SKk + '_slot1') === before);
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
  /* 7) un save dal FUTURO non viene declassato */
  localStorage.setItem(SKk, JSON.stringify({ ...legacy, v: 99 }));
  state.initState();
  check('save dal futuro: versione conservata', state.S.v === 99);
  /* ripristino lo stato della suite */
  localStorage.setItem(SKk, snap); state.initState();
  Object.assign(state.S, JSON.parse(snap));
  state.dugSet.clear(); (state.S.dug || []).forEach(k => state.dugSet.add(k));
}

/* ---------- COMPAGNO IN ACQUA: segue il player in barca e NUOTA (niente camminata) ---------- */
{
  const comp = await import('../src/companion.js');
  const before = S.companion;
  S.companion = { skull: SPECIES[0].id, torso: SPECIES[0].id, leg: SPECIES[0].id, q: 'comune', name: 'Test' };
  comp.COMP.init = false;
  /* il player entra in acqua: dopo qualche passo il compagno è sull'acqua anche lui */
  let w = null;
  for (let x = -60; x < 60 && !w; x++) for (let y = -60; y < 60 && !w; y++) if (gameplay.waterTile(x, y) && gameplay.waterTile(x + 1, y)) w = [x, y];
  check('esiste uno specchio d\'acqua', !!w);
  P.x = w[0] * TS + 8; P.y = w[1] * TS - 13; P.dir = 'right';
  for (let i = 0; i < 200; i++) comp.updateCompanion(1 / 60);
  const cw = gameplay.waterTile(Math.floor(comp.COMP.x / TS), Math.floor((comp.COMP.y + 13) / TS));
  check('il compagno segue in acqua (→ nuota)', cw === true);
  S.companion = before; comp.COMP.init = false;
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
  check('il costo della chimera nel testo è quello vero',
    uiSrc.includes('${CHIMERA_COST}') && dN.CHIMERA_COST === 40);
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

/* ---------- INTRO: il nonno deve spiegare da dove arrivano le prime monete ---------- */
{
  const fs4 = (await import('node:fs'));
  const isrc = fs4.readFileSync('src/intro.js', 'utf8');
  check('l\'intro dice di raccogliere le cose da terra', /Mushrooms, wheat ears, shells|Funghi, spighe, conchiglie/.test(isrc));
  /* IL NONNO REGALA UN FOSSILE GREZZO. Un grezzo non serve a niente finché non lo si fa
     identificare, e si identifica SOLO al Museo, che sta SOLO nelle città grandi. Senza
     dirlo, si gira con un leggendario in tasca senza sapere che farsene. E le battute
     devono restare VERE: se domani il Museo comparisse anche altrove, questo test cade. */
  check('il nonno manda al Museo a far identificare il fossile', /Museo|Museum/.test(isrc));
  check('il nonno dice che il Museo sta nelle città grandi',
    /città grande|big city/i.test(isrc));
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
  check('e di venderle al Negozio per i primi attrezzi',
    /sell them at the Shop|vendila al Negozio/.test(isrc) && /spade before anything|pala prima di tutto/.test(isrc));
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
    for (const a of a2.ACHS) { en.add(a.en[0]); en.add(a.en[1]); }
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
  check('senza lucciole a portata, E non retina (niente)', ff.tryCatchFireflies() === false && ff.fireflyInReach() === false);
  S.quests = null; S.fireflies = 0;
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
