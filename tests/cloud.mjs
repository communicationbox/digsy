/* SINCRONIZZAZIONE — i casi che fanno perdere le partite.
 *
 * Il server finto risponde come quello vero (stessi codici, stessi corpi), così si provano
 * senza rete i tre momenti che contano: la sessione scaduta, la rete assente, e soprattutto
 * il CONFLITTO — due dispositivi che hanno giocato la stessa partita da punti diversi.
 *
 * Importato da tests/run.mjs.
 */

export async function runCloudTests(check) {
  const cl = await import('../src/cloud.js');

  /* ---------- server finto ---------- */
  function makeServer() {
    const srv = {
      user: null,                       // { email, name } quando "collegato"
      save: null,                       // { version, data, summary, device, updated_at }
      offline: false,
      calls: [],
    };
    srv.fetch = async (url, opts = {}) => {
      srv.calls.push(url);
      if (srv.offline) throw new Error('network down');
      const body = opts.body ? JSON.parse(opts.body) : {};
      const json = (status, data) => ({
        status, ok: status >= 200 && status < 300, json: async () => data,
      });

      if (url.includes('do=me')) return json(200, { ok: true, user: srv.user });
      if (url.includes('do=google')) {
        if (body.credential === 'cattivo') return json(401, { ok: false, error: 'wrong_audience' });
        srv.user = { email: 'marco@example.com', name: 'Marco' };
        return json(200, { ok: true, user: srv.user });
      }
      if (url.includes('do=logout')) { srv.user = null; return json(200, { ok: true }); }
      if (url.includes('do=delete')) { srv.user = null; srv.save = null; return json(200, { ok: true }); }

      if (url.includes('save.php')) {
        if (!srv.user) return json(401, { ok: false, error: 'not_authenticated' });
        if ((opts.method || 'GET') === 'GET') return json(200, { ok: true, save: srv.save });
        const cur = srv.save ? srv.save.version : 0;
        if (!body.force && cur !== body.base_version) {
          return json(409, { ok: false, conflict: true, server: srv.save });
        }
        srv.save = {
          version: cur + 1, data: body.data, summary: body.summary,
          device: body.device, updated_at: 1000,
        };
        return json(200, { ok: true, version: srv.save.version });
      }
      return json(404, { ok: false, error: 'unknown' });
    };
    return srv;
  }

  const reset = () => {
    cl.cloud.user = null; cl.cloud.version = 0; cl.cloud.status = 'off';
    cl.cloud.pending = false; cl.cloud.conflict = null; cl.cloud.lastError = '';
    cl.cancelSync();
  };

  /* ---------- accesso ---------- */
  {
    const srv = makeServer(); cl.setFetch(srv.fetch); reset();
    check('cloud: senza sessione non si è collegati', (await cl.fetchMe()) === null && cl.cloud.status === 'off');

    const bad = await cl.loginWithGoogle('cattivo');
    check('cloud: token rifiutato dal server → niente accesso',
      bad === null && cl.cloud.user === null && cl.cloud.lastError === 'wrong_audience');

    const u = await cl.loginWithGoogle('buono');
    check('cloud: accesso riuscito', u && u.email === 'marco@example.com' && cl.cloud.status === 'ok');

    await cl.logout();
    check('cloud: uscita pulita', cl.cloud.user === null && cl.cloud.status === 'off');
  }

  /* ---------- rete assente ---------- */
  {
    const srv = makeServer(); cl.setFetch(srv.fetch); reset();
    await cl.loginWithGoogle('buono');
    srv.offline = true;
    const r = await cl.pushSave('{"day":2}', 'g2', 'pc');
    check('cloud: senza rete il salvataggio non è un errore, resta in sospeso',
      r.offline === true && cl.cloud.pending === true && cl.cloud.status === 'offline');
    /* e il gioco non deve aver perso l'accesso solo perché è caduta la linea */
    check('cloud: la rete assente non fa perdere l\'accesso', cl.cloud.user !== null);
    srv.offline = false;
    const r2 = await cl.pushSave('{"day":2}', 'g2', 'pc');
    check('cloud: tornata la rete, il salvataggio passa', r2.ok === true && cl.cloud.pending === false);
  }

  /* ---------- sessione scaduta mentre si gioca ---------- */
  {
    const srv = makeServer(); cl.setFetch(srv.fetch); reset();
    await cl.loginWithGoogle('buono');
    await cl.pushSave('{"day":1}', 'g1', 'pc');
    srv.user = null;                                   // il server ha dimenticato la sessione
    const r = await cl.pushSave('{"day":2}', 'g2', 'pc');
    check('cloud: sessione scaduta → si torna scollegati, senza schianti',
      r.ok === false && r.error === 'not_logged' && cl.cloud.user === null);
  }

  /* ---------- IL CONFLITTO ---------- */
  {
    const srv = makeServer(); cl.setFetch(srv.fetch); reset();
    await cl.loginWithGoogle('buono');
    /* il PC salva due volte */
    await cl.pushSave('{"day":3,"coins":40}', 'g3 · 40c', 'Windows');
    await cl.pushSave('{"day":4,"coins":55}', 'g4 · 55c', 'Windows');
    check('cloud: la versione avanza a ogni salvataggio', cl.cloud.version === 2);

    /* il telefono era rimasto alla versione 1 e ha giocato per conto suo */
    cl.cloud.version = 1;
    const r = await cl.pushSave('{"day":9,"coins":10}', 'g9 · 10c', 'Android');
    check('cloud: scrittura su versione superata → conflitto, NON sovrascrive',
      r.conflict === true && cl.cloud.status === 'conflict');
    check('cloud: il conflitto porta con sé la partita del server, per poter scegliere',
      r.server && r.server.summary === 'g4 · 55c');
    check('cloud: sul server è ancora intatta la partita del PC',
      srv.save.data.includes('"day":4'));

    /* il giocatore sceglie: tengo quella del telefono */
    cl.cloud.version = 2;
    const forced = await cl.pushSave('{"day":9,"coins":10}', 'g9 · 10c', 'Android', true);
    check('cloud: con la scelta esplicita la partita del telefono vince',
      forced.ok === true && srv.save.data.includes('"day":9') && cl.cloud.conflict === null);
  }

  /* ---------- ritmo: non una richiesta per ogni salvataggio ---------- */
  {
    const srv = makeServer(); cl.setFetch(srv.fetch); reset();
    await cl.loginWithGoogle('buono');
    const before = srv.calls.length;
    let n = 0;
    const payload = () => ({ json: '{"day":' + (++n) + '}', summary: 'g' + n, device: 'pc' });
    /* dieci salvataggi ravvicinati, come fa il gioco ogni 5 secondi */
    for (let i = 0; i < 10; i++) cl.scheduleSync(payload, 20);
    check('cloud: dieci salvataggi ravvicinati non fanno dieci richieste',
      srv.calls.length === before);
    await new Promise(r => setTimeout(r, 60));
    const sent = srv.calls.length - before;
    check('cloud: parte una sola richiesta, con l\'ultimo stato (' + sent + ')',
      sent === 1 && srv.save && srv.save.data === '{"day":1}');

    /* flush: quando si esce dal gioco si manda subito */
    cl.scheduleSync(payload, 60000);
    const r = await cl.flushSync();
    check('cloud: alla chiusura si manda subito quello in sospeso', r.ok === true);
  }

  /* ---------- scollegati: non si tenta nemmeno ---------- */
  {
    const srv = makeServer(); cl.setFetch(srv.fetch); reset();
    const r = await cl.pushSave('{"day":1}', 'g1', 'pc');
    check('cloud: senza accesso non si manda niente al server',
      r.ok === false && r.error === 'not_logged' && srv.calls.length === 0);
    check('cloud: senza accesso non si programma nemmeno la sincronia',
      cl.scheduleSync(() => ({ json: '{}', summary: '', device: '' })) === false);
  }

  /* ---------- descrizioni leggibili ---------- */
  {
    check('cloud: la partita si descrive con quello che il giocatore riconosce',
      cl.describeSave({ day: 7, coins: 120, items: [1, 2], raw: [3] }) === 'g7 · 120c · 3r');
    check('cloud: descrivere il nulla non esplode', cl.describeSave(null) === '');
    check('cloud: si capisce quale partita è più avanti',
      cl.compareSaves({ day: 9 }, { day: 4 }) === 1
      && cl.compareSaves({ day: 4, coins: 10 }, { day: 4, coins: 90 }) === -1
      && cl.compareSaves({ day: 3, coins: 5 }, { day: 3, coins: 5 }) === 0);
    check('cloud: il dispositivo ha un nome riconoscibile', typeof cl.deviceName() === 'string' && cl.deviceName().length > 2);
  }

  /* ---------- IL PRIMO ACCESSO: nessuno deve perdere la partita che ha già ---------- */
  {
    const acc = await import('../src/account.js');

    /* peso: distingue una partita vera da una appena nata */
    const nuova = { day: 1, coins: 0, items: [], raw: [], codex: [], creatures: [] };
    const vera = { day: 12, coins: 400, items: [1, 2, 3], raw: [4], codex: [1, 2], creatures: [{}] };
    check('account: una partita appena nata pesa poco', acc.saveWeight(nuova) < acc.KEEP_THRESHOLD);
    check('account: una partita giocata pesa', acc.saveWeight(vera) > acc.KEEP_THRESHOLD);
    check('account: il nulla pesa zero', acc.saveWeight(null) === 0);

    const srvSave = { version: 3, data: '{"day":9}', summary: 'g9' };
    /* il caso che conta: ho giocato QUI e c'è anche una partita sul server */
    check('account: due partite vere → decide il giocatore',
      acc.decideAfterLogin(vera, srvSave) === 'ask');
    /* entro da un dispositivo nuovo: si scarica, senza disturbare nessuno */
    check('account: dispositivo nuovo → scarica dal server',
      acc.decideAfterLogin(nuova, srvSave) === 'pull');
    /* primo accesso in assoluto: si carica la mia partita */
    check('account: server vuoto e partita locale → la carica',
      acc.decideAfterLogin(vera, null) === 'push');
    /* niente da nessuna parte */
    check('account: niente da nessuna parte → non si fa nulla',
      acc.decideAfterLogin(nuova, null) === 'none');
    /* mai buttare via in silenzio: con una partita locale vera non si scarica MAI da soli */
    check('account: con una partita locale vera non si sovrascrive mai in automatico',
      acc.decideAfterLogin(vera, srvSave) !== 'pull');

    /* NESSUNO PERDE LA PARTITA CHE HA GIÀ: prima di sovrascrivere il salvataggio locale con
       quello del server se ne tiene una copia, e la copia non si rovina mai. */
    try { localStorage.removeItem(acc.BACKUP_KEY); } catch (e) { /* ok */ }
    localStorage.setItem('ossa_world_pixel_v1', '{"day":42,"coins":999}');
    const applied = acc.applyRemote({ version: 2, data: '{"day":3}' }, false);
    check('account: la partita del server viene applicata', applied === true
      && localStorage.getItem('ossa_world_pixel_v1').includes('"day":3'));
    check('account: la partita che c\'era prima è al sicuro',
      acc.hasBackup() && localStorage.getItem(acc.BACKUP_KEY).includes('"day":42'));
    /* una seconda sovrascrittura non deve mangiarsi la copia buona */
    acc.applyRemote({ version: 3, data: '{"day":4}' }, false);
    check('account: la copia di riserva resta la PRIMA, non l\'ultima',
      localStorage.getItem(acc.BACKUP_KEY).includes('"day":42'));
    check('account: la partita di prima si può rimettere', acc.restoreBackup(false) === true
      && localStorage.getItem('ossa_world_pixel_v1').includes('"day":42'));
    try { localStorage.removeItem(acc.BACKUP_KEY); localStorage.removeItem('ossa_world_pixel_v1'); } catch (e) { /* ok */ }

    check('account: il riassunto è leggibile', /g12/.test(acc.saveSummary(vera)));
    check('account: lo stato ha un\'etichetta', typeof acc.statusLabel() === 'string' && acc.statusLabel().length > 3);
  }

  reset();
  cl.setFetch((...a) => (typeof fetch === 'function' ? fetch(...a) : Promise.reject(new Error('no fetch'))));
}
