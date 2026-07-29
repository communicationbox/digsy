/* CHI STA GIOCANDO, E FIN DOVE ARRIVA.
 *
 * Legge quello che il battito ha raccolto e lo racconta in italiano. Serve a rispondere alle
 * domande per cui si fa provare un gioco:
 *   - quanto durano le sessioni?
 *   - a che punto la gente si ferma?
 *   - qualcuno è tornato il giorno dopo?
 *
 * `npm run tester`             → il quadro di adesso
 * `npm run tester -- --errori` → anche gli schianti segnalati dai giocatori
 * `/stats` con `npm run dev`   → gli stessi numeri, ma da guardare (grafici, solo in locale)
 *
 * La lettura e i conti stanno in `tests/battito.mjs`: qui c'è solo il racconto.
 *
 * NB: i numeri sono pochi e vanno letti come indizi, non come verità. Con tre tester, una
 * sessione lunga può essere qualcuno che ha lasciato la scheda aperta.
 */
import { righeBattito, righeErrori } from './battito.mjs';

const durata = (m) => (m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm');
const quando = (ts) => {
  const min = Math.round((Date.now() / 1000 - ts) / 60);
  if (min < 2) return 'adesso';
  if (min < 60) return min + ' minuti fa';
  if (min < 60 * 24) return Math.round(min / 60) + ' ore fa';
  return Math.round(min / 1440) + ' giorni fa';
};

const righe = righeBattito();

if (!righe.length) {
  console.log('\nNessun dato ancora. Il battito parte dopo cinque minuti di gioco vero.\n');
} else {
  const ora = Date.now() / 1000;
  const attivi = righe.filter(r => ora - r.ts < 600);        // battito negli ultimi 10 minuti
  const oggi = righe.filter(r => ora - r.ts < 86400);

  console.log('\n── CHI STA GIOCANDO ' + '─'.repeat(42));
  console.log(attivi.length
    ? `  ${attivi.length} in questo momento`
    : '  nessuno in questo momento');
  console.log(`  ${oggi.length} nelle ultime 24 ore · ${righe.length} in tutto\n`);

  console.log('── QUANTO DURANO ' + '─'.repeat(45));
  const minuti = righe.map(r => r.min).sort((a, b) => a - b);
  const mediana = minuti[Math.floor(minuti.length / 2)];
  console.log(`  più lunga: ${durata(minuti[minuti.length - 1])} · tipica: ${durata(mediana)}`);
  /* la percentuale che conta: quanti mollano prima di aver visto qualcosa */
  const subito = righe.filter(r => r.min < 5).length;
  console.log(`  chi ha smesso entro 5 minuti: ${subito} su ${righe.length}`
    + (subito ? '   ← il numero da tenere d\'occhio' : ''));
  const tornati = righe.filter(r => (r.sessioni || 1) > 1);
  console.log(`  tornati almeno una seconda volta: ${tornati.length}\n`);

  console.log('── FIN DOVE ARRIVANO ' + '─'.repeat(41));
  const perGiorno = {};
  for (const r of righe) { const g = r.day || 1; perGiorno[g] = (perGiorno[g] || 0) + 1; }
  for (const g of Object.keys(perGiorno).map(Number).sort((a, b) => a - b)) {
    console.log(`  giorno ${String(g).padStart(2)} · ${'█'.repeat(perGiorno[g])} ${perGiorno[g]}`);
  }
  const spec = Math.max(...righe.map(r => r.spec || 0));
  const lvl = Math.max(...righe.map(r => r.lvl || 1));
  console.log(`  più avanti di tutti: livello ${lvl}, ${spec} specie scoperte\n`);

  console.log('── COME GIOCANO ' + '─'.repeat(46));
  const tel = righe.filter(r => r.tocco).length;
  const app = righe.filter(r => r.app).length;
  console.log(`  da telefono: ${tel}/${righe.length} · con l'app installata: ${app}/${righe.length}\n`);

  console.log('── UNO PER UNO ' + '─'.repeat(47));
  for (const r of righe.slice(0, 12)) {
    console.log(`  ${quando(r.ts).padEnd(14)} ${durata(r.min).padStart(8)}`
      + ` · giorno ${String(r.day).padStart(2)} · liv ${r.lvl} · ${String(r.spec).padStart(2)} specie`
      + ` · ${r.tocco ? 'telefono' : 'computer'}${r.app ? ' (app)' : ''}`
      + ` · ${r.sessioni > 1 ? r.sessioni + ' volte' : 'prima volta'}`);
  }
  console.log('');
}

if (process.argv.includes('--errori')) {
  const lista = righeErrori();
  console.log('── SCHIANTI SEGNALATI ' + '─'.repeat(40));
  if (!lista.length) console.log('  nessuno\n');
  else {
    for (const e of lista.slice(0, 10)) {
      console.log(`  ${quando(e.ultimo).padEnd(14)} ×${String(e.n).padEnd(3)} [${e.scena || '?'}] ${e.msg.slice(0, 70)}`);
      if (e.dove && e.dove !== ':') console.log(`  ${' '.repeat(14)}     ${e.dove.slice(0, 70)}`);
    }
    console.log('');
  }
}
