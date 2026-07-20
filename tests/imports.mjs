/* IDENTIFICATORI USATI MA MAI IMPORTATI — il guasto che non fa rumore.
 *
 * Un modulo ES gira sempre in strict mode: usare un nome che non è né importato né dichiarato
 * lancia `ReferenceError` NEL MOMENTO in cui quella riga viene eseguita. Se la riga sta dentro
 * un gestore di click o una schermata che nessun test apre, il modulo si carica benissimo, i
 * test restano verdi, e il giocatore trova un pulsante morto senza nessun messaggio.
 *
 * Ne avevamo tre insieme, tutti invisibili:
 *   - ui.js  → `bookPage = 0` nel pulsante Libro dello zaino (bookPage vive in bookui.js):
 *              lo zaino si chiudeva e il Libro non si apriva MAI. Segnalato da un giocatore.
 *   - ui.js  → `PARTS` in openExhibit: premere E davanti a uno qualsiasi dei 60 piedistalli
 *              del museo non faceva assolutamente nulla.
 *   - splash.js → `S` nel flusso di conflitto dell'account: chi ha due partite diverse
 *              restava piantato sulla schermata di accesso senza poter scegliere.
 *
 * COME FUNZIONA. Niente parser e niente dipendenze: si costruisce il VOCABOLARIO dei nomi che
 * vivono a livello di modulo negli altri file di src/ (esportati o no), e per ogni file si
 * cercano quei nomi usati senza importarli e senza dichiararli in casa. Limitandosi a nomi che
 * appartengono davvero a un altro modulo, i falsi allarmi spariscono: se un nome è dichiarato
 * da qualche parte nel file — anche dentro una funzione, anche come parametro — si lascia
 * stare. Meglio lasciarsi sfuggire qualcosa che gridare al lupo.
 */
import { readFileSync, readdirSync } from 'fs';

/* Via commenti e stringhe: dentro non c'è codice, e le stringhe di gioco contengono di tutto
   ("Grandpa's letters", "https://…", "/* dentro un testo").
   UNA SOLA passata con le alternative in ordine di apparizione: pulire prima gli apici singoli
   e poi i doppi faceva sì che l'apostrofo dentro una stringa a virgolette doppie aprisse una
   finta stringa e sballasse il resto del file — venti falsi allarmi da lì.
   Dei template letterali si tengono solo le espressioni ${…}: lì il codice c'è davvero. */
function stripNoise(src) {
  const re = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\[\s\S]|[^`\\])*`/g;
  return src.replace(re, m => {
    if (m[0] === '`') return templateCode(m);
    return m[0] === '/' ? m.replace(/[^\n]/g, ' ') : '""';           // i commenti tengono le righe
  });
}
/* Di un template letterale interessa SOLO ciò che sta dentro ${…}: lì c'è codice vero. Il
   resto è markup e testo di gioco, pieno di parole che somigliano a nomi di variabili (box,
   view, note, class…). Le graffe si contano a mano perché dentro un'espressione ce ne sono
   altre — oggetti, template annidati — e una regex non le bilancia. */
function templateCode(tpl) {
  let out = '';
  for (let i = 0; i < tpl.length; i++) {
    if (tpl[i] === '\\') { i++; continue; }
    if (tpl[i] !== '$' || tpl[i + 1] !== '{') { if (tpl[i] === '\n') out += '\n'; continue; }
    let depth = 1, j = i + 2, start = j;
    for (; j < tpl.length && depth; j++) {
      if (tpl[j] === '{') depth++;
      else if (tpl[j] === '}') depth--;
    }
    out += ' ' + stripNoise(tpl.slice(start, j - 1)) + ' ';           // annidati inclusi
    i = j - 1;
  }
  return out;
}

/* Le espressioni regolari letterali non sono testo né codice: dentro ci sono cose come
   /\{act\}/g, e "act" finirebbe per sembrare l'uso di una variabile. Si riconoscono da ciò
   che le precede — dopo un valore la barra è una divisione, dopo una parentesi o un uguale
   è una regex. */
function stripRegex(src) {
  return src.replace(/([(,=:!&|?{};[\n]|\breturn\b)(\s*)\/(?![/*])(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+\/[gimsuy]*/g,
    (m, pre, sp) => pre + sp + '""');
}

/* nomi dichiarati a livello di MODULO (top-level): export o meno */
function topLevelNames(src) {
  const out = new Set();
  const re = /^(?:export\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm;
  let m; while ((m = re.exec(src))) out.add(m[1]);
  /* `let a = 1, b = 2, c = 3`: dichiarano tutti, non solo il primo */
  const reList = /^(?:export\s+)?(?:const|let|var)\s+([^;\n]*)/gm;
  while ((m = reList.exec(src))) for (const part of m[1].split(',')) {
    const n = part.trim().match(/^([A-Za-z_$][\w$]*)\s*(?:=|$)/);
    if (n) out.add(n[1]);
  }
  return out;
}

/* TUTTI i nomi che il file dichiara o riceve: import, dichiarazioni (anche dentro le funzioni),
   parametri, destructuring, cattura del catch, etichette di ciclo */
function declaredAnywhere(src) {
  const out = new Set();
  const add = s => { for (const n of String(s).split(/[^\w$]+/)) if (n && !/^\d/.test(n)) out.add(n); };
  let m;
  /* import e RE-EXPORT (`export { x } from './y.js'`): il secondo non usa il nome, lo
     rimbalza — contarlo come uso segnalava map.js che "usa" packExplored senza importarlo */
  const reImport = /(?:import|export)\s+([\s\S]*?)\s+from\s*['"]/g;
  while ((m = reImport.exec(src))) add(m[1].replace(/\bas\b/g, ' ').replace(/[{}*]/g, ' '));
  const reDecl = /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = reDecl.exec(src))) out.add(m[1]);
  /* liste: `const a = x, b = y, c = z` — anche dentro le funzioni */
  const reList = /\b(?:const|let|var)\s+([^;\n]*)/g;
  while ((m = reList.exec(src))) for (const part of m[1].split(',')) {
    const n = part.trim().match(/^([A-Za-z_$][\w$]*)\s*(?:=|$)/);
    if (n) out.add(n[1]);
  }
  const reDestr = /\b(?:const|let|var)\s*[{[]([^}\]]*)[}\]]/g;
  while ((m = reDestr.exec(src))) add(m[1].replace(/=[^,]*/g, ' ').replace(/\bas\b/g, ' '));
  const reParams = /(?:function\s*[\w$]*\s*|\bcatch\s*)\(([^)]*)\)|\(([^()]*)\)\s*=>|([A-Za-z_$][\w$]*)\s*=>/g;
  while ((m = reParams.exec(src))) add((m[1] || m[2] || m[3] || '').replace(/=[^,]*/g, ' ').replace(/[{}[\].]/g, ' '));
  return out;
}

export function runImportTests(check) {
  const dir = new URL('../src/', import.meta.url);
  const files = readdirSync(dir).filter(f => f.endsWith('.js'));
  const raw = {}, clean = {};
  for (const f of files) {
    raw[f] = readFileSync(new URL(f, dir), 'utf8');
    clean[f] = stripRegex(stripNoise(raw[f]));
  }

  /* Parole del linguaggio e globali: non appartengono a nessun modulo, per quanto una
     dichiarazione a più nomi possa farle sembrare tali (`let a = null, b = null` faceva
     credere che "null" vivesse in audio.js, e ogni file "lo usava senza importarlo"). */
  const LANG = new Set(['null', 'true', 'false', 'undefined', 'this', 'new', 'typeof', 'void',
    'delete', 'instanceof', 'function', 'class', 'return', 'await', 'async', 'yield', 'let',
    'const', 'var', 'case', 'default', 'break', 'continue', 'throw', 'catch', 'finally',
    'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Map', 'Set', 'Date',
    'Promise', 'Error', 'RegExp', 'Infinity', 'NaN', 'window', 'document', 'console',
    'localStorage', 'sessionStorage', 'navigator', 'location', 'performance', 'fetch']);

  /* vocabolario: nome → file che lo dichiara a livello di modulo */
  const owner = new Map();
  for (const f of files) for (const n of topLevelNames(clean[f])) {
    if (!LANG.has(n) && !owner.has(n)) owner.set(n, f);
  }

  const problems = [];
  for (const f of files) {
    const mine = declaredAnywhere(clean[f]);
    const seen = new Set();
    /* si guardano solo gli usi VERI: un nome preceduto da punto è una proprietà (a.PARTS),
       uno seguito da due punti dentro un oggetto è una chiave */
    const re = /(^|[^.\w$])([A-Za-z_$][\w$]*)\b(?!\s*:)/g;
    let m;
    while ((m = re.exec(clean[f]))) {
      const n = m[2];
      /* I nomi corti si guardano solo se MAIUSCOLI: `S` e `P` (stato e giocatore) sono i due
         nomi più usati del progetto ed è esattamente uno di quelli che è sfuggito in
         splash.js, mentre `i`, `dx`, `a` sono contatori che vivono in ogni funzione. */
      if (n.length < 3 && n !== n.toUpperCase()) continue;
      if (seen.has(n) || mine.has(n)) continue;
      const from = owner.get(n);
      if (!from || from === f) continue;
      seen.add(n);
      const line = clean[f].slice(0, m.index).split('\n').length;
      problems.push(`${f}:${line} usa "${n}" (vive in ${from}) senza importarlo`);
    }
  }
  check('nessun modulo usa un nome di un altro modulo senza importarlo'
    + (problems.length ? ' → ' + problems.join(' | ') : ''), problems.length === 0);

  /* il guardiano deve saper ABBAIARE: se non riconoscesse più il guasto, sarebbe un test che
     dà solo conforto. Si rimette a mano il bug del pulsante Libro e ci si aspetta l'allarme. */
  {
    const rotto = raw['ui.js'].replace('openBook(0);', 'bookPage = 0; openBook();');
    const c = stripRegex(stripNoise(rotto)), mine = declaredAnywhere(c);
    const trovato = /bookPage/.test(c) && !mine.has('bookPage') && owner.get('bookPage') === 'bookui.js';
    check('il guardiano riconosce il bug del pulsante Libro se qualcuno lo rimette', trovato === true);
  }
}
