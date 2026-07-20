/* COPERTURA — quanta parte del codice i test eseguono davvero.
   Usa il profilatore di V8 già dentro Node (NODE_V8_COVERAGE): zero dipendenze, come tutto
   il resto del progetto. Non è una metrica da inseguire per il numero: serve a trovare i
   BUCHI NERI, cioè i moduli che nessun test tocca mai — è esattamente lì che si era
   nascosto il crash degli interni.

   `npm run cov`            → tabella per modulo, dal peggiore al migliore
   `npm run cov -- --gate`  → esce 1 se un modulo scende sotto la sua soglia minima */
import { readdirSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COVDIR = join(ROOT, '.coverage');

/* Soglia GENERALE bassa e soglie ALTE dove il codice è logica pura testabile.
   I moduli di solo disegno restano più bassi di natura: lì la rete è lo smoke (unit + e2e),
   che li ESEGUE tutti; pretendere il 90% di righe su un disegno significherebbe scrivere
   test che non verificano niente. */
const FLOOR = 55;
/* skeleton3d.js gira solo con WebGL (Three.js): in Node non è caricabile. Lo coprono gli
   e2e nel browser, dove il libro monta la vista 3D. Escluso di proposito, non dimenticato. */
const EXCLUDE = new Set(['skeleton3d.js']);
const MIN = {
  'achievements.js': 90, 'audio.js': 65, 'bones.js': 95, 'bookui.js': 88,
  'brush.js': 95, 'cave.js': 90, 'changelog.js': 95, 'commands.js': 80,
  'commission.js': 90, 'companion.js': 85, 'compass.js': 85, 'data.js': 95,
  'daynight.js': 90, 'debug.js': 95, 'gameplay.js': 85, 'i18n.js': 90,
  'icons.js': 90, 'input.js': 80, 'interior.js': 85, 'interiors.js': 90,
  'intro.js': 55, 'letters.js': 95, 'main.js': 65, 'map.js': 90,
  'noise.js': 95, 'park.js': 95, 'prepare.js': 95, 'prepui.js': 95,
  'progress.js': 90, 'props.js': 90, 'quests.js': 85, 'regions.js': 95,
  'render.js': 90, 'screen.js': 95, 'splash.js': 85, 'spritebank.js': 90,
  'sprites.js': 95, 'state.js': 90, 'tiles.js': 90, 'tips.js': 95,
  'trophy.js': 95, 'ui.js': 80, 'version.js': 95, 'voxview.js': 95,
  'weather.js': 95, 'wonderart.js': 95, 'wonders.js': 95, 'wonders3d.js': 95,
  'world.js': 90,
};

function run() {
  if (existsSync(COVDIR)) rmSync(COVDIR, { recursive: true, force: true });
  mkdirSync(COVDIR, { recursive: true });
  execFileSync(process.execPath, [join(ROOT, 'tests/run.mjs')], {
    cwd: ROOT, stdio: 'ignore', env: { ...process.env, NODE_V8_COVERAGE: COVDIR },
  });
}

/* V8 dà i byte coperti; si convertono in percentuale di byte eseguibili del file */
function collect() {
  const out = new Map();
  for (const f of readdirSync(COVDIR)) {
    const j = JSON.parse(readFileSync(join(COVDIR, f), 'utf8'));
    for (const r of j.result) {
      if (!r.url.includes('/src/') || !r.url.endsWith('.js')) continue;
      const name = r.url.split('/src/')[1];
      const prev = out.get(name);
      const cur = pct(r);
      if (!prev || cur.total > prev.total) out.set(name, cur);
    }
  }
  return out;
}
function pct(r) {
  let total = 0, covered = 0;
  for (const fn of r.functions) {
    /* il primo range di ogni funzione è il suo corpo intero; i successivi sono i buchi */
    const ranges = fn.ranges;
    if (!ranges.length) continue;
    const body = ranges[0];
    const len = body.endOffset - body.startOffset;
    if (fn.isBlockCoverage === false) { total += len; covered += body.count > 0 ? len : 0; continue; }
    total += len;
    let uncovered = 0;
    for (const rg of ranges.slice(1)) if (rg.count === 0) uncovered += rg.endOffset - rg.startOffset;
    covered += Math.max(0, len - uncovered);
  }
  return { total, covered, p: total ? (covered / total) * 100 : 100 };
}

run();
const cov = collect();
const src = readdirSync(join(ROOT, 'src')).filter(f => f.endsWith('.js'));
const rows = src.filter(f => !EXCLUDE.has(f)).map(f => {
  const c = cov.get(f);
  return { f, p: c ? c.p : 0, seen: !!c, min: MIN[f] ?? FLOOR };
}).sort((a, b) => a.p - b.p);

const gate = process.argv.includes('--gate');
const bar = p => '█'.repeat(Math.round(p / 5)).padEnd(20, '·');
console.log('\nCOPERTURA per modulo (soglia · barra · %)\n');
let failed = [];
for (const r of rows) {
  const ok = r.p >= r.min;
  if (!ok) failed.push(r);
  console.log(`  ${ok ? 'ok  ' : 'BASSA'} ${r.f.padEnd(18)} ${String(r.min).padStart(3)}%  ${bar(r.p)} ${r.p.toFixed(1).padStart(5)}%${r.seen ? '' : '   ← mai importato dai test'}`);
}
const tot = rows.reduce((a, r) => a + r.p, 0) / rows.length;
console.log(`\n  media: ${tot.toFixed(1)}% su ${rows.length} moduli (esclusi: ${[...EXCLUDE].join(', ')} — serve WebGL) · sotto soglia: ${failed.length}\n`);
if (gate && failed.length) {
  console.log('  moduli sotto la loro soglia:', failed.map(r => `${r.f} (${r.p.toFixed(0)}<${r.min})`).join(', '), '\n');
  process.exit(1);
}
