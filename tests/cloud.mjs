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

  /* IL GIOCO DEVE CHIAMARE DOVE IL BACKEND STA DAVVERO.
     Il percorso era `./api` mentre i file PHP stanno in `server/api/`: ogni chiamata tornava
     404 e l'accesso falliva con un generico "login_failed" — un errore che manda a cercare
     il guasto fra Google e le credenziali invece che in una riga di percorso. Qui il
     percorso usato dal codice si confronta con la cartella vera su disco. */
  {
    const { readFileSync, existsSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/cloud.js', import.meta.url), 'utf8');
    const m = src.match(/window\.DIGSY_API\)\s*\|\|\s*'([^']+)'/);
    check('cloud: il percorso dell\'API è dichiarato', !!m);
    const dir = (m ? m[1] : '').replace(/^\.\//, '');
    check('cloud: il percorso punta alla cartella che esiste davvero (' + dir + ')',
      existsSync(new URL('../' + dir + '/auth.php', import.meta.url))
      && existsSync(new URL('../' + dir + '/save.php', import.meta.url)));
  }

  /* ---------- server finto ---------- */
  function makeServer() {
    const srv = {
      user: null,                       // { email, name } quando "collegato"
      slots: {},                        // '0' = partita in corso, '1'..'3' = slot manuali
      offline: false,
      calls: [],
    };
    /* `srv.save` resta scritto come prima nei test: è lo slot 0, la partita in corso */
    Object.defineProperty(srv, 'save', {
      get() { return srv.slots['0'] || null; },
      set(v) { if (v === null) delete srv.slots['0']; else srv.slots['0'] = v; },
    });
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
      if (url.includes('do=delete')) { srv.user = null; srv.slots = {}; return json(200, { ok: true }); }

      if (url.includes('save.php')) {
        if (!srv.user) return json(401, { ok: false, error: 'not_authenticated' });
        /* come il server vero: ?slot=N (0 = partita in corso, 1..3 manuali), ?slot=all */
        const q = /slot=([a-z0-9]+)/.exec(url);
        const slotStr = q ? q[1] : '0';
        if ((opts.method || 'GET') === 'GET') {
          if (slotStr === 'all') return json(200, { ok: true, saves: { ...srv.slots } });
          return json(200, { ok: true, save: srv.slots[slotStr] || null });
        }
        const cur = srv.slots[slotStr] ? srv.slots[slotStr].version : 0;
        if (!body.force && cur !== body.base_version) {
          return json(409, { ok: false, conflict: true, server: srv.slots[slotStr] || null });
        }
        srv.slots[slotStr] = {
          version: cur + 1, data: body.data, summary: body.summary,
          device: body.device, updated_at: 1000,
        };
        return json(200, { ok: true, version: srv.slots[slotStr].version });
      }
      return json(404, { ok: false, error: 'unknown' });
    };
    return srv;
  }

  const reset = () => {
    cl.cloud.user = null; cl.cloud.version = 0; cl.cloud.slotVersion = {}; cl.cloud.status = 'off';
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
    /* IL CASO CHE CONTA: due partite diverse, una qui e una sul server. Vince quella PIÙ
       AVANTI e si dice al giocatore cos'è successo. Prima si apriva una domanda ("quale
       tieni?"): giusta sulla carta, ma arriva quando uno vuole solo giocare e la si sbaglia.
       Qui la locale è al giorno 12, quella del server al 9: resta la locale. */
    check('account: due partite vere → vince quella più avanti (la locale)',
      acc.decideAfterLogin(vera, srvSave) === 'push');
    check('account: se è il SERVER ad essere più avanti, si scarica quella',
      acc.decideAfterLogin({ day: 2, coins: 10, items: [1, 2, 3], raw: [4], codex: [1, 2] },
        { version: 3, data: '{"day":30,"coins":900}' }) === 'pull');
    check('account: a parità si tiene quella del server (la vedono anche gli altri dispositivi)',
      acc.decideAfterLogin({ day: 5, coins: 100, items: [1, 2, 3], raw: [4], codex: [1, 2] },
        { version: 2, data: '{"day":5,"coins":100}' }) === 'pull');
    /* un salvataggio del server illeggibile non deve portarsi via la partita buona */
    check('account: partita del server corrotta → si tiene la locale',
      acc.decideAfterLogin(vera, { version: 4, data: '{rotto' }) === 'push');
    /* e comunque si DICE cosa è stato deciso */
    check('account: la riconciliazione si spiega al giocatore',
      /g12/.test(acc.reconcileMessage('push', vera, srvSave))
      && /g9/.test(acc.reconcileMessage('pull', vera, srvSave)));
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

    /* LA CATENA COMPLETA: salvo in locale → la partita finisce sul server.
       È il pezzo che mancava davvero. `wireSync` esisteva ma non agganciava niente e nessuno
       la chiamava: `onLocalSave` non partiva mai, quindi `scheduleSync` era irraggiungibile.
       Si scaricava la partita entrando e poi si giocava per ore senza che il server ne
       sapesse più nulla — il modo peggiore di fallire, perché sembra tutto a posto. */
    {
      const st = await import('../src/state.js');
      const srv = makeServer(); cl.setFetch(srv.fetch); reset();
      await cl.loginWithGoogle('buono');
      st.setSaveHook(null);                       // si riparte da zero
      check('account: la sincronia si aggancia una volta sola',
        acc.wireSync() === true && acc.wireSync() === false);
      const prima = srv.save;
      st.save();                                  // il gioco salva, come ogni 5 secondi
      check('account: salvare NON manda subito (si aspetta una pausa)', srv.save === prima);
      const r = await cl.flushSync();             // …e alla chiusura parte
      check('account: dopo il salvataggio la partita arriva al server',
        r && r.ok === true && srv.save && srv.save.data.includes('"day"'));
      /* e senza account collegato non si tenta nulla: chi gioca in locale resta in locale */
      reset();
      const dopo = srv.calls.length;
      st.save();
      check('account: senza accesso il salvataggio non chiama il server', srv.calls.length === dopo);
      st.setSaveHook(null);
    }

    /* ---------- I TRE SALVATAGGI MANUALI VIAGGIANO ANCH'ESSI ----------
       Gli slot sono partite a tutti gli effetti: chi ne salva una sul computer si aspetta di
       ritrovarla sul telefono. Prima restavano nel browser e basta — il cloud portava solo la
       partita in corso, e nessuno lo diceva. */
    {
      const st = await import('../src/state.js');
      const srv = makeServer(); cl.setFetch(srv.fetch); reset();
      await cl.loginWithGoogle('buono');
      const raw = (o) => JSON.stringify(o);

      /* decisione, slot per slot: sono partite indipendenti */
      check('slot: se qui non c\'è niente si scarica quello del server',
        acc.decideSlot(null, { data: '{"day":4}' }) === 'pull');
      check('slot: se il server non ce l\'ha si carica il nostro',
        acc.decideSlot(raw({ day: 4 }), null) === 'push');
      check('slot: fra due partite diverse vince quella più avanti',
        acc.decideSlot(raw({ day: 9, coins: 10 }), { data: '{"day":4,"coins":10}' }) === 'push'
        && acc.decideSlot(raw({ day: 2, coins: 10 }), { data: '{"day":8,"coins":10}' }) === 'pull');
      check('slot: vuoto di qua e di là non fa niente', acc.decideSlot(null, null) === 'none');
      check('slot: uno slot locale illeggibile non sovrascrive quello buono del server',
        acc.decideSlot('{rotto', { data: '{"day":4}' }) === 'pull');

      /* il giro completo: due slot pieni qui, uno solo sul server */
      st.setSlotRaw(1, raw({ day: 20, coins: 500 }));
      st.setSlotRaw(2, raw({ day: 3, coins: 10 }));
      try { localStorage.removeItem('ossa_world_pixel_v1_slot3'); } catch (e) { /* ok */ }
      srv.slots['2'] = { version: 5, data: raw({ day: 30, coins: 900 }), summary: 'g30' };
      srv.slots['3'] = { version: 2, data: raw({ day: 7, coins: 70 }), summary: 'g7' };

      const esito = await acc.syncSlots();
      check('slot 1: solo qui → sale sul server',
        esito[1] === 'push' && srv.slots['1'] && srv.slots['1'].data.includes('"day":20'));
      check('slot 2: il server è più avanti → scende qui',
        esito[2] === 'pull' && st.slotRaw(2).includes('"day":30'));
      check('slot 3: solo sul server → arriva qui',
        esito[3] === 'pull' && st.slotRaw(3).includes('"day":7'));
      check('slot: la partita IN CORSO non è stata toccata da tutto questo',
        !srv.slots['0'] || !srv.slots['0'].data.includes('"day":20'));

      /* salvare uno slot è un gesto esplicito: vince su quello che c'è sul server */
      st.setSlotRaw(2, raw({ day: 1, coins: 0 }));
      cl.cloud.slotVersion['2'] = 0;                    // versione fuori passo apposta
      const r = await acc.pushSlot(2);
      check('slot: "Salva" vince anche se il server ha altro (scelta esplicita)',
        r.ok === true && srv.slots['2'].data.includes('"day":1'));

      /* senza accesso non si tenta nulla */
      reset();
      const prima = srv.calls.length;
      check('slot: scollegati non si chiama il server',
        (await acc.pushSlot(1)).ok === false && srv.calls.length === prima);
      check('slot: scollegati la sincronia non fa niente',
        Object.keys(await acc.syncSlots()).length === 0);
      for (let n = 1; n <= 3; n++) { try { localStorage.removeItem('ossa_world_pixel_v1_slot' + n); } catch (e) { /* ok */ } }
    }

    /* LA MAPPA ESPLORATA VIAGGIA COMPRESSA, come nel salvataggio locale. Il salvataggio su
       disco la impacchetta per riga; quello per il server non lo faceva, e la stessa partita
       partiva decine di volte più grande — fino a sbattere contro il tetto del server proprio
       a chi ha esplorato di più. */
    {
      const st2 = await import('../src/state.js');
      st2.S.explored = {};
      for (let x = 0; x < 300; x++) for (let y = 0; y < 8; y++) st2.S.explored[x + ',' + y] = 1;
      const snap = st2.snapshotState();
      const grezzo = JSON.stringify(st2.S.explored).length;
      const spedito = JSON.stringify(snap.explored).length;
      check('account: la mappa esplorata parte compressa (' + Math.round(grezzo / spedito) + '× più piccola)',
        spedito * 5 < grezzo);
      /* e dev'essere RILEGGIBILE: una compressione che il gioco non sa riaprire è peggio */
      const { unpackExplored } = await import('../src/packmap.js');
      const riletta = unpackExplored(snap.explored);
      check('account: e si rilegge identica', Object.keys(riletta).length === Object.keys(st2.S.explored).length
        && riletta['299,7'] === 1);
      st2.S.explored = {};
    }

    check('account: il riassunto è leggibile', /g12/.test(acc.saveSummary(vera)));
    check('account: lo stato ha un\'etichetta', typeof acc.statusLabel() === 'string' && acc.statusLabel().length > 3);
  }

  reset();
  cl.setFetch((...a) => (typeof fetch === 'function' ? fetch(...a) : Promise.reject(new Error('no fetch'))));
}
