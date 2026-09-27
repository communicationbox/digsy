/* LA PRESENZA IN LINEA, provata con socket VERE contro un centralino vero.
   `node tests/presenza.mjs`            → accende un centralino locale su una porta sua e prova lì
   `node tests/presenza.mjs wss://…/ws` → prova il centralino pubblicato (codici inventati a caso,
                                          nessuna stanza aperta: non tocca nessuno)
   Il caso che conta è il telefono che si RICOLLEGA mentre la sua linea vecchia è ancora appesa:
   chiudendo quella vecchia il centralino diceva «spento» agli amici, e la persona risultava
   offline pur essendo in linea con la nuova (segnalato: «mi diceva offline, ho riavviato»). */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../server/relay/package.json', import.meta.url));
let WebSocket;
try { WebSocket = require('ws'); } catch (e) {
  /* senza `ws` installato nel centralino non si prova: lo si dice, non si finge un verde */
  console.log('presenza: saltata (manca ws: cd server/relay && npm install)'); process.exit(0);
}

const esterno = process.argv[2];
const PORTA = 17499;
let relay = null;
if (!esterno) {
  relay = spawn(process.execPath, ['relay.js'], { cwd: new URL('../server/relay/', import.meta.url).pathname,
    env: { ...process.env, DIGSY_RELAY_PORT: String(PORTA) }, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 600));
}
const URL_ = esterno || `ws://127.0.0.1:${PORTA}/ws`;
const pausa = ms => new Promise(r => setTimeout(r, ms));
const cod = () => Array.from({ length: 10 }, () => 'ACDEFGHJKMNPQRTUVWXYZ234679'[Math.floor(Math.random() * 27)]).join('');

function cliente(nome, mio) {
  return new Promise((ok, ko) => {
    const ws = new WebSocket(URL_);
    const c = { ws, msg: [] };
    ws.on('message', d => { try { c.msg.push(JSON.parse(String(d))); } catch (e) { /* no */ } });
    ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', v: 1, name: nome, look: null, mio })));
    ws.on('error', ko);
    const guarda = setInterval(() => { if (c.msg.some(m => m.t === 'welcome')) { clearInterval(guarda); ok(c); } }, 20);
    setTimeout(() => ko(new Error('nessun welcome da ' + URL_)), 8000);
  });
}
let fail = 0, ok = 0;
const check = (n, c, x) => { if (c) ok++; else { fail++; console.log('  FAIL ' + n + (x ? ' → ' + x : '')); } };

try {
  const A = cod(), B = cod();
  const a = await cliente('A', A);
  a.ws.send(JSON.stringify({ t: 'amici', codici: [B] }));
  await pausa(300);
  const r0 = a.msg.filter(m => m.t === 'online').pop();
  check('un amico spento risulta spento', r0 && Array.isArray(r0.attivi) && r0.attivi.length === 0, JSON.stringify(r0));

  const b1 = await cliente('B', B);
  await pausa(300);
  check('quando arriva, il pallino si accende da solo', a.msg.some(m => m.t === 'online' && m.cambia === B && m.acceso === true));

  /* il telefono si risveglia: linea nuova, e la vecchia che muore dopo */
  const b2 = await cliente('B', B);
  await pausa(200);
  const prima = a.msg.length;
  b1.ws.terminate();
  await pausa(800);
  check('la linea VECCHIA che muore non spegne chi è in linea con la nuova',
    !a.msg.slice(prima).some(m => m.t === 'online' && m.cambia === B && m.acceso === false),
    JSON.stringify(a.msg.slice(prima)));
  a.ws.send(JSON.stringify({ t: 'amici', codici: [B] }));
  await pausa(300);
  const r1 = a.msg.filter(m => m.t === 'online' && Array.isArray(m.attivi)).pop();
  check('e chiedendo di nuovo risulta in linea', r1 && r1.attivi.includes(B), JSON.stringify(r1));

  /* chiudere l'ultima linea lo spegne davvero */
  b2.ws.close();
  await pausa(800);
  check('chiusa l\'ultima linea, il pallino si spegne', a.msg.some(m => m.t === 'online' && m.cambia === B && m.acceso === false));

  /* la linea resta viva col battito (il gioco manda un ping ogni 30 s) */
  const c = await cliente('C', cod());
  c.ws.send(JSON.stringify({ t: 'ping' }));
  await pausa(300);
  check('il battito ha risposta', c.msg.some(m => m.t === 'pong'));
  a.ws.close(); c.ws.close();
} catch (e) { fail++; console.log('  FAIL ' + e.message); }
if (relay) relay.kill();
console.log('presenza (' + URL_ + '): ' + ok + ' ok, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
