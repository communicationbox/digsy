/* FOTO DI UNA SCHERMATA — per GUARDARE il risultato invece di indovinarlo.
 *
 * Serviva. Le schermate venivano consegnate senza che nessuno le avesse mai viste: i test
 * dicevano verde perché controllavano che i comandi ESISTESSERO, non che fossero messi bene.
 * Così sono passati tre salvataggi schiacciati fino a sparire, cinque riquadri di larghezze
 * diverse e tre taglie di pulsante nella stessa schermata — tutte cose che si vedono in un
 * secondo e che nessuna misura automatica aveva colto.
 *
 *   npm run shot                  → la schermata iniziale
 *   npm run shot -- settings      → le impostazioni
 *   npm run shot -- saves 390,844 → i salvataggi, su telefono
 *   npm run shot -- editor 390,844 → la creazione del personaggio, su telefono
 *
 * Le viste sono quelle di splash.js: main · saves · stats · settings · trophies · changelog
 * · credits · account. La foto finisce in `.shots/<vista>.png`.
 *
 * Perché un server invece di aprire il file: da `file://` Chrome non carica i moduli ES e si
 * finisce per fotografare la pagina di avvio, senza stili — succede, e sembra che il CSS sia
 * rotto.
 */
import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SHOTS = join(ROOT, '.shots');
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(c => existsSync(c));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json' };

async function main() {
  const vista = process.argv[2] || 'main';
  const size = process.argv[3] || '900,1300';
  if (!CHROME) { console.error('foto: Chrome non trovato'); return 1; }
  if (!existsSync(join(DIST, 'index.html'))) { console.error('foto: manca dist/ — `npm run build`'); return 1; }
  mkdirSync(SHOTS, { recursive: true });

  /* la sonda apre la splash e va sulla vista chiesta: `splashView` è asincrona, quindi le si
     lascia il tempo di caricare il modulo prima dello scatto */
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  /* LA FOTO DICE A CHE LARGHEZZA È STATA SCATTATA, scritta in un angolo.
     Serve perché Chrome headless su macOS non scende sotto una certa larghezza di finestra:
     chiedendo 390 la pagina viene disegnata a 500 e lo screenshot RITAGLIA a 390. Il
     risultato sembra una schermata che sborda — e si passa mezz'ora a "riparare" un CSS che
     non ha niente che non va. Con la misura vera stampata sopra, l'inganno dura un secondo. */
  const probe = `<script>setTimeout(function(){
    var sp=document.getElementById('splash'); var G=window.__digsy||{};
    /* 'gioco' fotografa il gioco vero senza menu davanti: l'HUD e le scene si guardano solo
       così, e sono la parte che il giocatore vede per tutto il tempo */
    /* e SUBITO DOPO si rinfresca la barra: in headless requestAnimationFrame non avanza, quindi
       il giro d'HUD del game loop (ogni 2s) non arriva mai. Senza questa riga la foto ritrae
       l'HUD com'era CON LA SPLASH DAVANTI — cioè con tutto quello che si nasconde sotto un menu
       aperto ancora nascosto (la lista del tutorial ci è sparita per intero). */
    /* e display:none, non solo la classe: .off sfuma con una transizione e allo scatto la
       splash traspariva ancora — nella foto si leggevano "Continue" e "Save" in mezzo al
       mondo. Vale solo per la pagina della foto, il gioco non la vede mai. */
    if (${JSON.stringify(vista)} === 'gioco') { if(sp){ sp.classList.add('off'); sp.style.display='none'; } if(G.updateHUD) G.updateHUD(); }
    /* 'editor' = la creazione del personaggio: si vede una volta sola nella vita di una
       partita, ed è esattamente per questo che va guardata di proposito */
    else if (${JSON.stringify(vista)} === 'editor') { if(sp) sp.classList.add('off'); if(G.openEditor) G.openEditor(); }
    /* 'scheletrosepolto' = i 5 monticelli del sito grande, appena scoperto */
    else if (${JSON.stringify(vista)} === 'scheletrosepolto') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('gotobone').then(function(){ if(G.updateHUD) G.updateHUD(); }); }
    /* 'museo' = il banco del Curatore: e' dove si vede quanto manca alle sale, cioe' l'unico
       traguardo lungo del gioco. Va guardato, non solo misurato da un test */
    else if (${JSON.stringify(vista)} === 'statua') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.gotoStatue) G.gotoStatue().then(function(){ if(G.frame) G.frame(1000); }); }
    /* 'lab' = il banco del Laboratorio con tre pezzi e NIENTE DNA: è lo stato in cui il
       bottone "Risveglia!" non può partire, e si deve leggere il perché senza cliccare */
    else if (${JSON.stringify(vista)} === 'lab') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('goditem').then(function(){ var S=G.state(); S.dna={}; S.coins=510; if(G.openLab) G.openLab(); }); }
    /* 'allevamento' = il Lab con 2 chimere già in parco: la scheda "Alleva una chimera" */
    else if (${JSON.stringify(vista)} === 'allevamento') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('chimera').then(function(){ return G.cmd('chimera'); }).then(function(){ if(G.openLab) G.openLab(); }); }
    /* 'uovo' = il Lab con un uovo GIÀ deposto e pronto a schiudersi: si deve VEDERE (non solo leggere) */
    else if (${JSON.stringify(vista)} === 'uovo') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('chimera').then(function(){ return G.cmd('chimera'); }).then(function(){
        var S=G.state(); var cs=S.creatures;
        S.egg={ uid:9999, skull:cs[0].skull, torso:cs[0].torso, leg:cs[0].leg, q:'raro',
          p1:cs[0].name, p2:cs[1].name, laidDay:S.day, readyDay:S.day };
        if(G.openLab) G.openLab(); }); }
    /* 'lab-room' = la STANZA vera del Laboratorio (non il pannello): la teca di cova sta lì,
       sempre visibile camminandoci, vuota finché non deponi l'uovo */
    else if (${JSON.stringify(vista)} === 'lab-room') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('chimera').then(function(){ return G.cmd('chimera'); }).then(function(){
        var S=G.state(); var cs=S.creatures;
        S.egg={ uid:9999, skull:cs[0].skull, torso:cs[0].torso, leg:cs[0].leg, q:'raro',
          p1:cs[0].name, p2:cs[1].name, laidDay:S.day, readyDay:S.day };
        return G.enterRoom('lab');
      }).then(function(){ if(G.intPos) return G.intPos(5, 5); }).then(function(){ if(G.frame) G.frame(1000); }); }
    else if (${JSON.stringify(vista)} === 'lab-room-empty') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.enterRoom) G.enterRoom('lab').then(function(){ if(G.intPos) return G.intPos(5, 5); }).then(function(){ if(G.frame) G.frame(1000); }); }
    /* 'casa' = la Sala ARREDATA: fondo comprato (carta da parati + pavimento) e un pezzo per
       famiglia — letto 2×2, tavolo 2×1, poltrona, tappeto sotto, lampada, pianta, quadro alla
       parete e piedistallo. È la foto in cui si vede se la stanza è ARREDATA o se ha solo
       della roba sopra, e va guardata: i test misurano che i pezzi esistano, non che stiano
       bene insieme. */
    else if (${JSON.stringify(vista)} === 'casa') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      var hm2;
      if(G.enterRoom) G.enterRoom('house').then(function(){ return G.enterHouseRoom(0); }).then(function(){ return G.house(); }).then(function(hm){
        hm2 = hm;
        var S = G.state();
        ['prati_paper', 'prati_ground', 'prati_rug', 'prati_bed', 'prati_table', 'prati_lamp',
         'prati_art', 'boschi_chair', 'palude_vase', 'pedestal'].forEach(function (id) {
          if (S.furnOwned.indexOf(id) < 0) S.furnOwned.push(id);
        });
        S.house.rooms[0].furn = [];
        hm.applyBackdrop(0, 'prati_paper'); hm.applyBackdrop(0, 'prati_ground');
        hm.cancelHold();
        hm.tryPlaceFurniture(0, 1, 2, 'prati_bed', 0);      // letto 2×2 addossato al muro
        hm.tryPlaceFurniture(0, 4, 3, 'prati_rug', 0);      // tappeto 2×2...
        hm.tryPlaceFurniture(0, 4, 4, 'prati_table', 0);    // ...col tavolo sopra
        hm.tryPlaceFurniture(0, 6, 2, 'boschi_chair', 0);
        hm.tryPlaceFurniture(0, 8, 2, 'prati_lamp', 0);
        hm.tryPlaceFurniture(0, 3, 2, 'palude_vase', 0);
        hm.tryPlaceFurniture(0, 5, 2, 'prati_art', 0);      // quadro: si appende dalla prima fila
        hm.tryPlaceFurniture(0, 8, 4, 'pedestal', 0);
        return G.intPos(2, 5);
      }).then(function(){ return G.updatePrompt && G.updatePrompt(); })
        .then(function(){ if(G.frame) G.frame(1000); }); }
    /* 'barca' = in acqua, in barca: si guarda che lo scafo copra davvero le gambe (il
       relitto in mare è il modo più diretto per finire sull'acqua) */
    else if (${JSON.stringify(vista)} === 'barca') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('goditem').then(function(){ return G.cmd('gotowater'); })
        .then(function(){ var P2 = G.player(); P2.dir = (new URLSearchParams(location.search).get('dir') || 'right'); P2.moving = false;
          var S2 = G.state(); S2.tools.motorboat = new URLSearchParams(location.search).get('mezzo') === 'motoscafo';
          if(G.updateHUD) G.updateHUD(); if(G.frame) G.frame(1000); }); }
    /* 'mezzo' = bici/pattini sul terreno: si guarda che il mezzo sia grande quanto Digsy */
    else if (${JSON.stringify(vista)} === 'mezzo') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('goditem').then(function(){
        var S2 = G.state(), P2 = G.player(), q = new URLSearchParams(location.search);
        S2.gear = q.get('mezzo') || 'bike'; P2.dir = q.get('dir') || 'right'; P2.moving = true;
        if(G.updateHUD) G.updateHUD(); if(G.frame) G.frame(1000);
      }); }
    /* 'cancello' = fuori dal cortile, davanti al cancello chiuso a chiave: da qui lo si deve
       poter riaprire con E (ed è il punto in cui è stato segnalato che non si apre più) */
    else if (${JSON.stringify(vista)} === 'cancello') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('gotopark').then(function(){
        var S2 = G.state(), P2 = G.player();
        S2.gateLocked = new URLSearchParams(location.search).get('aperto') !== '1';
        return G.yard();
      }).then(function(y){
        var P2 = G.player();
        P2.x = y.cx * 32 + 16; P2.y = (y.y1 + 1) * 32 + 16 - 26; P2.dir = 'up';
        return G.updatePrompt && G.updatePrompt();
      }).then(function(){ if(G.updateHUD) G.updateHUD(); if(G.frame) G.frame(1000); }); }
    /* 'buddy-casa' = appena usciti di casa verso il basso, col compagno: non deve stare dentro
       la casa (era sul tetto, segnalato con foto) */
    else if (${JSON.stringify(vista)} === 'buddy-casa') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('godmode').then(function(){ return G.debug(false); }).then(function(){ return G.cmd('companion=terra raro'); })
        .then(function(){ return G.cmd('gotopark'); })
        .then(function(){ return G.yard(); }).then(function(y){
          var P2 = G.player(); P2.dir = 'down';
          var hy = (y.y0 + y.y1) / 2;                                   // la porta di casa sta al centro del cortile
          P2.x = y.cx * 32 + 16; P2.y = (hy + 1) * 32 + 4 - 26;
          for (var i = 0; i < 160; i++) { if (i > 0 && i < 90) P2.y += 1; if (G.stepWorld) G.stepWorld(1 / 60); }
          if(G.updateHUD) G.updateHUD(); if(G.frame) G.frame(1500);

        }); }
    /* 'meraviglia' = un landmark nel mondo: si guarda se i suoi pixel sono quelli del mondo
       o il doppio (era il caso delle creature) */
    else if (${JSON.stringify(vista)} === 'meraviglia') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('gotolandmark').then(function(){ if(G.updateHUD) G.updateHUD(); if(G.frame) G.frame(1500); }); }
    /* 'libro' = una pagina del Libro dei Fossili: lo scheletro 3D gira lì dentro, ed è dove
       si guarda da vicino la risoluzione del modello */
    else if (${JSON.stringify(vista)} === 'libro') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('godmode').then(function(){ return G.debug(false); }).then(function(){ if(G.openBook) G.openBook(); }); }
    /* 'creature' = il cortile con le creature vive: è LÌ che si guarda la loro pixel art,
       accanto a Digsy e alle staccionate ridisegnate native */
    else if (${JSON.stringify(vista)} === 'creature') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('chimera').then(function(){ return G.cmd('chimera'); }).then(function(){ return G.cmd('chimera'); })
        .then(function(){ return G.cmd('chimera'); }).then(function(){ return G.cmd('chimera'); })
        .then(function(){ var S=G.state(); S.house.yard = (S.creatures||[]).map(function(c){ return 'chi' + c.uid; }); return G.cmd('gotopark'); })
        .then(function(){ for (var i=0;i<400;i++) G.stepPark(1/60); if(G.updateHUD) G.updateHUD(); if(G.frame) G.frame(2000); }); }
    /* 'arredo-mano' = un mobile IN MANO: l'anteprima nella stanza, sulla casella dove
       finirebbe (verde = ci sta, rosso = no). È la cosa che prima non si vedeva */
    else if (${JSON.stringify(vista)} === 'arredo-mano') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.enterRoom) G.enterRoom('house').then(function(){ return G.enterHouseRoom(0); }).then(function(){ return G.house(); }).then(function(hm){
        var S = G.state(), q = new URLSearchParams(location.search);
        ['prati_ground', 'prati_paper', 'prati_rug', 'prati_bed', 'prati_table'].forEach(function (id) {
          if (S.furnOwned.indexOf(id) < 0) S.furnOwned.push(id);
        });
        S.house.rooms[0].furn = [];
        hm.applyBackdrop(0, 'prati_ground'); hm.applyBackdrop(0, 'prati_paper');
        hm.tryPlaceFurniture(0, 1, 2, 'prati_bed', 0);
        hm.cancelHold();
        hm.takeHold('prati_table', q.get('rot') ? +q.get('rot') : 0);
        hm.setHoldTarget(+(q.get('gx') || 5), +(q.get('gy') || 3));
        return G.intPos(3, 5);
      }).then(function(){ return G.updatePrompt && G.updatePrompt(); })
        .then(function(){ if(G.frame) G.frame(1000); }); }
    /* 'profondita' = Digsy fra una sedia (sopra) e un tavolo (sotto): deve stare DAVANTI alla
       sedia e DIETRO al tavolo. Parametri: px,py = posizione in caselle (anche frazionarie) */
    else if (${JSON.stringify(vista)} === 'profondita') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.enterRoom) G.enterRoom('house').then(function(){ return G.enterHouseRoom(0); }).then(function(){ return G.house(); }).then(function(hm){
        var S = G.state(), q = new URLSearchParams(location.search);
        ['boschi_chair', 'prati_table', 'prati_ground'].forEach(function (id) { if (S.furnOwned.indexOf(id) < 0) S.furnOwned.push(id); });
        S.house.rooms[0].furn = []; hm.cancelHold();
        hm.applyBackdrop(0, 'prati_ground');
        hm.tryPlaceFurniture(0, 4, +(q.get('cy') || 2), 'boschi_chair', 0);
        hm.tryPlaceFurniture(0, 3.5, +(q.get('ty') || 4), 'prati_table', 0);
        return G.intPos(+(q.get('px') || 4), +(q.get('py') || 3));
      }).then(function(){ if(G.frame) G.frame(1000); }); }
    /* 'rotazioni' = i quattro versi di sedia, letto, baule e tavolo piazzati in fila: si guarda
       che ruotare CAMBI davvero il disegno (prima restava identico e sembrava rotto) */
    else if (${JSON.stringify(vista)} === 'rotazioni') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.enterRoom) G.enterRoom('house').then(function(){ return G.enterHouseRoom(0); }).then(function(){ return G.house(); }).then(function(hm){
        var S = G.state(), q = new URLSearchParams(location.search), pezzo = q.get('pezzo') || 'boschi_chair';
        S.house.rooms[0].furn = []; hm.cancelHold();
        /* quattro copie dello stesso pezzo, una per verso: si scrive direttamente (un pezzo
           comprato è uno solo, e qui serve vederlo in quattro pose affiancate) */
        var big = pezzo.indexOf('bed') >= 0;
        for (var r = 0; r < 4; r++) S.house.rooms[0].furn.push({ itemId: pezzo, gx: 1 + r * (big ? 2.5 : 2), gy: 2, rot: r });
        return G.intPos(4, 5);
      }).then(function(){ if(G.frame) G.frame(1000); }); }
    /* 'letto' = il pannello del letto di casa: comodità della stanza, cosa manca, e quanto
       rende dormirci. È il posto dove si legge PERCHÉ arredare conviene */
    else if (${JSON.stringify(vista)} === 'letto') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.enterRoom) G.enterRoom('house').then(function(){ return G.enterHouseRoom(0); }).then(function(){ return G.house(); }).then(function(hm){
        var S = G.state();
        ['prati_paper', 'prati_ground', 'prati_rug', 'prati_bed', 'prati_table'].forEach(function (id) {
          if (S.furnOwned.indexOf(id) < 0) S.furnOwned.push(id);
        });
        S.house.rooms[0].furn = [];
        hm.applyBackdrop(0, 'prati_ground');
        hm.tryPlaceFurniture(0, 1, 2, 'prati_bed', 0);
        hm.tryPlaceFurniture(0, 4, 3, 'prati_rug', 0);
        hm.tryPlaceFurniture(0, 6, 2, 'prati_table', 0);
        S.sleepBlockHalf = null;
        return G.intPos(1, 2);
      }).then(function(){ if(G.openBed) G.openBed(0, 1, 2); }); }
    /* 'casa-vuota' = la Camera SENZA niente comprato: è lo stato in cui si vede la casa la
       prima volta, e deve già sembrare una stanza — non un livello di prova */
    else if (${JSON.stringify(vista)} === 'casa-vuota') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.enterRoom) G.enterRoom('house').then(function(){
        var S = G.state(); S.house.rooms[3].unlocked = true; S.house.rooms[3].furn = [];
        S.house.rooms[3].paper = null; S.house.rooms[3].ground = null;
        return G.enterHouseRoom(3);
      }).then(function(){ return G.intPos(4, 4); }).then(function(){ if(G.frame) G.frame(1000); }); }
    /* l'altro caso: fialette in mano, requisiti soddisfatti, bottone acceso */
    else if (${JSON.stringify(vista)} === 'lab-dna') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('goditem').then(function(){ return G.cmd('goddna'); }).then(function(){
        G.state().coins=510; if(G.openLab) G.openLab(); }); }
    /* 'compagno' = il pannello Compagno e cortile con una decina di creature: due bottoni per
       scheda, ed è la schermata dove si vedeva subito che i bottoni andavano a capo a scalini */
    else if (${JSON.stringify(vista)} === 'compagno') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.cmd) G.cmd('godmode').then(function(){ return G.cmd('chimera'); }).then(function(){ return G.cmd('chimera'); })
        .then(function(){ var S=G.state(); S.awakened = S.awakened.slice(0, 8); return G.debug(false); })
        .then(function(){ if(G.openCompanion) G.openCompanion(); }); }
    else if (${JSON.stringify(vista)} === 'teca') { if(sp){ sp.classList.add('off'); sp.style.display='none'; } if(G.openExhibit) G.openExhibit(); }
    /* 'scheletro' = il minigioco al banco del Museo: un pezzo nuovo, grezzo, di una specie
       ancora senza teca — deposito e ritiro veri (stessi bottoni del giocatore) fanno
       scattare il montaggio da soli */
    else if (${JSON.stringify(vista)} === 'scheletro') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.openMuseum) { var S=G.state(); S.museum.lepre=[]; S.raw=[{uid:9001,s:'lepre',t:'cranio',q:'raro',val:40}];
        G.openMuseum().then(function(){ var d=document.getElementById('mudep'); if(d) d.click();
          var c=document.getElementById('mucol'); if(c) c.click(); }); } }  /* mucol si ripesca DOPO il click di mudep: quello ridisegna il pannello e sostituisce il nodo */
    else if (${JSON.stringify(vista)} === 'progressi') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.openMuseum) G.openMuseum().then(function(){ var t=document.querySelector('[data-mtab="prog"]'); if(t) t.click(); }); }
    /* 'sartoria' = il banco del sarto a basso livello: i premium sotto soglia si VEDONO ma
       sono spenti (Lv, non prezzo) — il traguardo che dà voglia di salire */
    else if (${JSON.stringify(vista)} === 'sartoria') { if(sp){ sp.classList.add('off'); sp.style.display='none'; }
      if(G.openTailor) { var S=G.state(); S.level=1; S.xp=0; S.unlocked.hats=[]; G.openTailor(); } }
    else if (${JSON.stringify(vista)} === 'museo') { if(sp){ sp.classList.add('off'); sp.style.display='none'; } if(G.openMuseum) G.openMuseum().then(function(){
        /* la scheda si sceglie da qui: senza, si fotografa sempre e solo la prima */
        var t=document.querySelector('[data-mtab=\"'+(location.hash.slice(1)||'desk')+'\"]'); if(t) t.click();
      }); }
    else {
      if(sp) sp.classList.remove('off');
      if(G.splashView) G.splashView(${JSON.stringify(vista)});
    }
    /* il badge è uno strumento di lavoro: con --pulito non si mette, perché queste foto
       finiscono anche nella vetrina e là un riquadro verde di debug stona parecchio */
    if (${JSON.stringify(process.argv.includes('--pulito'))}) return;
    var b=document.createElement('div');
    b.textContent = innerWidth + '×' + innerHeight + (innerWidth != ${JSON.stringify(size.split(',')[0])} ? '  (CHIESTO ${size.split(',')[0]}: Chrome non scende sotto ~500)' : '');
    b.style.cssText='position:fixed;left:0;bottom:0;z-index:99999;background:#000;color:#0f0;'
      + 'font:11px ui-monospace,monospace;padding:2px 6px;pointer-events:none';
    document.body.appendChild(b);
  }, 1200);</script>`;
  writeFileSync(join(DIST, '__shot.html'), html.replace('</body>', probe + '</body>'));

  const srv = createServer((req, res) => {
    const p = join(DIST, decodeURIComponent(req.url.split('?')[0]));
    /* si LEGGE prima di rispondere: scrivendo l'intestazione e fallendo dopo, il catch
       provava a scriverne una seconda e il server moriva sul primo file mancante */
    let body = null;
    try { body = readFileSync(p); } catch (e) { /* non c'è */ }
    if (!body) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const porta = srv.address().port;
  const dest = join(SHOTS, vista + '.png');
  /* SPAWN, non execFileSync: quello è SINCRONO e blocca l'event loop di Node, quindi il
     server qui sopra non risponderebbe a nessuna richiesta e Chrome resterebbe ad aspettare
     una pagina che non arriva mai — si torna con una cartella vuota e nessun errore. */
  await new Promise((risolvi) => {
    const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--user-data-dir=' + mkdtempSync(join(tmpdir(), 'digsy-shot-')),
      '--window-size=' + size, '--virtual-time-budget=6000',
      /* argomenti extra alla pagina (es. `npm run shot -- barca 400,400 dir=up`): alcune viste
         hanno una variante da guardare — il verso in cui si guarda, la scheda aperta */
      '--screenshot=' + dest, `http://127.0.0.1:${porta}/__shot.html?` + (process.argv.slice(4).find(a => a.includes('=')) || '')], { stdio: 'ignore' });
    const stacca = setTimeout(() => { try { ch.kill('SIGKILL'); } catch (e) {} risolvi(); }, 45000);
    ch.on('exit', () => { clearTimeout(stacca); risolvi(); });
  });
  srv.close();
  if (!existsSync(dest)) { console.error('foto: non è stata scritta'); return 1; }
  console.log('foto: ' + dest + '  (' + vista + ' · ' + size + ')');
  return 0;
}

process.exit(await main());
