/* E2E VISIVI con Chrome headless.
   Carica l'index.html VERO della build (prima si testava una copia del DOM scritta a mano,
   già divergente dal gioco) e controlla i punti che ci hanno fatto perdere tempo:
   HUD leggibile e dentro lo schermo, overlay scrollabili col dito, target toccabili,
   nulla che sbordi in orizzontale. Gira su due viewport: telefono e telefono in orizzontale.

   `npm run e2e` — se Chrome manca esce 1 (non si finge verde: il silenzio era peggio). */
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
const findChrome = () => CHROME_CANDIDATES.find(c => existsSync(c)) || null;

/* Script iniettato nella pagina: il gioco è già avviato (splash saltata con ?nosplash).
   Ritorna una lista di righe PASS/FAIL. */
const PROBE = `
(function(){
  var out=[];
  var done=false;
  setTimeout(function(){ if(!done) finish(); }, 5000);   // rete di sicurezza: si stampa comunque   // se qualcosa si inceppa, si stampa lo stesso
  window.onerror=function(msg){ out.push('FAIL | errore nella sonda | '+msg); if(!done) finish(); };
  function A(name,cond,extra){out.push((cond?'PASS':'FAIL')+' | '+name+(extra?' | '+extra:''));}
  function css(el,p){return getComputedStyle(el).getPropertyValue(p);}
  function vis(el){ if(!el) return false; var r=el.getBoundingClientRect(); return r.width>0&&r.height>0; }
  var W=innerWidth, H=innerHeight;
  /* dispositivo: le leve a schermo esistono solo col dito, il segui-puntatore solo col mouse.
     Il gioco decide con questa stessa domanda, quindi i controlli devono usarla anche loro. */
  var TOUCH = (matchMedia('(pointer:coarse)').matches) || innerWidth<=760;

  /* 1. niente scroll orizzontale: la pagina non deve MAI sbordare */
  A('nessuno sbordo orizzontale', document.documentElement.scrollWidth <= W+1,
    'scrollW='+document.documentElement.scrollWidth+' vw='+W);

  /* 2. HUD: dentro lo schermo, testi con interlinea (bug storico), chip toccabili */
  var hud=document.getElementById('hud');
  A('HUD presente', vis(hud));
  if(hud){
    var hr=hud.getBoundingClientRect();
    A('HUD dentro lo schermo', hr.right<=W+1 && hr.left>=-1, 'right='+Math.round(hr.right));
    A('HUD non copre mezzo schermo', hr.height <= H*0.42, 'h='+Math.round(hr.height)+' vh='+H);
    A('HUD con interlinea (niente righe sovrapposte)', parseFloat(css(hud,'line-height'))>=8);
    var tags=[].slice.call(hud.querySelectorAll('.tag'));
    var small=tags.filter(function(t){var r=t.getBoundingClientRect();return r.height>0&&r.height<28;});
    A('chip HUD abbastanza alti da toccare', small.length===0, small.length+' sotto 28px');
  }

  /* 2-bis. lo ZAINO su desktop è un comando in basso a sinistra; su touch resta nell'HUD */
  var bagb=document.getElementById('bagbtn');
  if(bagb){
    var bb=bagb.getBoundingClientRect();
    var desktop=matchMedia('(hover:hover) and (pointer:fine)').matches;
    if(desktop){
      A('zaino: in basso a sinistra su desktop', bb.left<80 && bb.bottom>H-90 && bb.bottom<=H+1,
        Math.round(bb.left)+','+Math.round(bb.bottom)+' su '+H);
      A('zaino: bersaglio comodo (≥48px)', bb.height>=48, Math.round(bb.height)+'px');
      var joy0=document.getElementById('joy');
      var joyVis=joy0 && joy0.getBoundingClientRect().width>0;
      A('zaino: non copre il joystick', !joyVis, joyVis?'joystick visibile sotto':'joystick nascosto su desktop');
    } else {
      A("zaino: nell'HUD su touch", bb.top < H*0.25, 'top '+Math.round(bb.top));
    }
    A('zaino: dentro lo schermo', bb.right<=W+1 && bb.left>=-1 && bb.bottom<=H+1);
  }

  /* 3. controlli touch: joystick e tasto A presenti, dentro lo schermo, grandi */
  var joy=document.getElementById('joy'), ab=document.getElementById('abtn');
  var coarse=matchMedia('(pointer:coarse)').matches;
  A('controlli touch presenti nel DOM', !!joy && !!ab);
  if(coarse){                      /* solo su un vero dispositivo touch sono visibili */
    A('joystick visibile', vis(joy));
    A('tasto A visibile', vis(ab));
    if(joy){var jr=joy.getBoundingClientRect(); A('joystick dentro lo schermo', jr.left>=-1&&jr.bottom<=H+1);}
    if(ab){var ar=ab.getBoundingClientRect(); A('tasto A grande almeno 64px', ar.width>=64, Math.round(ar.width)+'px');}
  } else {
    /* headless senza emulazione touch: si controlla la MISURA dichiarata nel CSS */
    var jw=parseFloat(css(joy,'width')), aw=parseFloat(css(ab,'width'));
    A('joystick dimensionato per il pollice (>=120px)', jw>=120, Math.round(jw)+'px');
    A('tasto A dimensionato per il pollice (>=64px)', aw>=64, Math.round(aw)+'px');
  }

  /* 4. OVERLAY: si aprono, restano dentro lo schermo e SI SCORRONO col dito.
        (body ha touch-action:none per il gioco: senza pan-y gli elenchi non scorrevano) */
  function checkOverlay(name, openFn, boxSel, scrollSel){
    try{ openFn(); }catch(e){ A(name+': si apre', false, e.message); return; }
    var box=document.querySelector(boxSel);
    A(name+': si apre', vis(box));
    if(!box) return;
    var r=box.getBoundingClientRect();
    A(name+': dentro lo schermo', r.left>=-2 && r.right<=W+2 && r.top>=-2 && r.bottom<=H+2,
      Math.round(r.left)+','+Math.round(r.top)+' '+Math.round(r.right)+'x'+Math.round(r.bottom));
    var sc=scrollSel?document.querySelector(scrollSel):null;
    if(sc){
      var ta=css(sc,'touch-action');
      A(name+': si scorre col dito', ta.indexOf('pan-y')>=0 || ta==='auto' || ta==='manipulation', 'touch-action='+ta);
    }
  }
  var G=window.__digsy||{};
  if(G.openBag) checkOverlay('zaino', G.openBag, '#bagbox', '.bag-scroll');
  /* su touch non devono comparire riferimenti a tasti della tastiera */
  /* (era 2-ter) su touch non devono comparire riferimenti a tasti della tastiera */
  if(G.openBag){
    G.openBag();
    var coarse2=matchMedia('(pointer:coarse)').matches || W<760;
    var kbds=[].slice.call(document.querySelectorAll('#bagbox .kbd-only, #bagbox kbd'))
      .filter(function(el){ return el.getBoundingClientRect().width>0; });
    A('zaino: niente scorciatoie da tastiera su touch', !coarse2 || kbds.length===0, kbds.length+' visibili');
    if(G.closeBag) G.closeBag();
  }

  if(G.closeBag) G.closeBag();
  /* la mappa NON deve scorrere come una lista: il dito la TRASCINA e la pizzica per lo zoom,
     quindi touch-action:none è voluto. Si controlla che il trascinamento ci sia. */
  if(G.openMap) checkOverlay('mappa', G.openMap, '#mapbox', null);
  var mcv=document.getElementById('mapcv');
  if(mcv){ A('mappa: si trascina col dito', css(mcv,'touch-action')==='none' && css(mcv,'cursor').indexOf('grab')>=0,
    'touch-action='+css(mcv,'touch-action')+' cursor='+css(mcv,'cursor')); }
  if(G.closeMap) G.closeMap();
  if(G.openBook) checkOverlay('libro', G.openBook, '#bookframe', '.bkpage');
  /* LIBRO su mobile: la X dev'essere TUTTA visibile e i comandi in basso leggibili */
  if(G.openBook){
    var bx=document.querySelector('#bookframe .x');
    if(bx){ var br2=bx.getBoundingClientRect();
      A('libro: la X è tutta dentro lo schermo', br2.right<=W-2 && br2.top>=2 && br2.left>=2 && br2.bottom<=H-2,
        Math.round(br2.left)+','+Math.round(br2.top)+' '+Math.round(br2.width)+'px');
      A('libro: la X è toccabile', br2.width>=40 && br2.height>=40, Math.round(br2.width)+'px'); }
    var nav=document.getElementById('bk-nav');
    if(nav){ var nr=nav.getBoundingClientRect();
      A('libro: la barra sotto sta nello schermo', nr.bottom<=H+1 && nr.width>0, 'bottom '+Math.round(nr.bottom)+'/'+H); }
    var btns=[].slice.call(document.querySelectorAll('#bk-nav .btn'));
    var tinyB=btns.filter(function(b){var r=b.getBoundingClientRect();return r.height<44||r.width<44;});
    A('libro: frecce grandi almeno 44px', tinyB.length===0, btns.length? (tinyB.length+' piccole su '+btns.length) : 'libro vuoto: nessuna freccia da misurare');
    var metas=[].slice.call(document.querySelectorAll('.bk-meta span'));
    var over2=metas.filter(function(m2){var r=m2.getBoundingClientRect();return r.right>W+1||r.left<-1;});
    A('libro: le informazioni non sbordano', over2.length===0, over2.length+' fuori');
    var tinyT=[].slice.call(document.querySelectorAll('#bookframe *')).filter(function(el){
      return el.children.length===0 && el.textContent.trim().length>2 && parseFloat(css(el,'font-size'))<12;});
    A('libro: nessun testo sotto 12px', tinyT.length===0, tinyT.length+' elementi');
  }
  if(G.closeBook) G.closeBook();
  if(G.openGuide) checkOverlay('guida', G.openGuide, '.sheet', '.sb');
  if(G.closeModal) G.closeModal();

  /* 5. la mappa deve avere i comandi di zoom raggiungibili col pollice */
  if(G.openMap){
    G.openMap();
    var zin=document.getElementById('mp-in'), zout=document.getElementById('mp-out');
    A('mappa: pulsanti zoom presenti', vis(zin)&&vis(zout));
    if(zin){var zr=zin.getBoundingClientRect();
      A('mappa: zoom toccabile (>=32px)', zr.width>=32&&zr.height>=32, Math.round(zr.width)+'px');
      A('mappa: zoom dentro lo schermo', zr.right<=W+1&&zr.bottom<=H+1);}
    if(G.closeMap) G.closeMap();
  }

  /* 7. testo leggibile: niente sotto 10px nei pannelli aperti (eseguito prima della splash) */
  if(G.openBag){
    G.openBag();
    var tiny=[].slice.call(document.querySelectorAll('#bagbox *')).filter(function(el){
      var f=parseFloat(css(el,'font-size')); return el.textContent.trim().length>2 && f>0 && f<10;});
    A('nessun testo sotto 10px nello zaino', tiny.length===0, tiny.length+' elementi');
    if(G.closeBag) G.closeBag();
  }
  /* 5-bis. SCENE INTERNE: si entra davvero in ogni stanza e si DISEGNA un frame.
     Nasce da una regressione vera: due simboli rimasti in render.js dopo uno split di moduli
     facevano crashare il gioco appena si entrava in un edificio, con tutti i test verdi.
     Qui il crash si vede subito: window.onerror trasforma l'errore in un FAIL. */
  var errCount = 0;
  var prevErr = window.onerror;
  window.onerror = function(msg){ errCount++; out.push('FAIL | crash disegnando una scena | '+msg); return true; };

  /* 6. SPLASH: da ogni sottomenu si deve poter USCIRE (su mobile non c'è ESC e il pulsante
        in fondo finiva sotto il bordo dello schermo) */
  var sp=document.getElementById('splash');
  var G3=window.__digsy||{};
  if(sp && G3.splashView){
    sp.classList.remove('off');
    var views=['saves','audio','lang','trophies','changelog','commands','credits'];
    var vi=0;
    var stepView=function(){
      if(vi>=views.length){ G3.splashView('main'); sp.classList.add('off'); rooms(finish); return; }
      var v=views[vi++];
      G3.splashView(v);
      setTimeout(function(){
        var x=document.getElementById('sp-x'), back=document.getElementById('sp-back');
        var xr=x?x.getBoundingClientRect():null;
        A('splash/'+v+': la X è raggiungibile', !!x && xr.width>=32 && xr.right<=W+1 && xr.top>=-1 && xr.bottom<=H+1,
          x?('X '+Math.round(xr.width)+'px a y'+Math.round(xr.top)):'niente X');
        A("splash/"+v+": una sola via di uscita", !back, back ? "c'è anche Indietro" : "solo la X");
        /* UNA sola barra di scorrimento: nessun contenitore scrollabile dentro un altro */
        var card=document.querySelector('.sp-card');
        var scrollables=[].slice.call(document.querySelectorAll('.sp-card, .sp-card *')).filter(function(el){
          var st=getComputedStyle(el); var sc=/auto|scroll/.test(st.overflowY);
          return sc && el.scrollHeight > el.clientHeight + 2;
        });
        A('splash/'+v+': una sola barra di scorrimento', scrollables.length<=1, scrollables.length+' aree che scorrono');
        A('splash/'+v+': il pannello sta nello schermo', !card || card.getBoundingClientRect().bottom<=H+2,
          card?Math.round(card.getBoundingClientRect().bottom)+'/'+H:'');
        stepView();
      }, 80);
    };
    stepView();
  } else { rooms(finish); }

  /* USCIRE DAL MUSEO COL SOLO MOUSE: la galleria è enorme e la camera la segue, quindi la
     porta finiva sull'ultimo pixel dello schermo e oltre non c'era nulla da cliccare. */
  {
    var G10 = window.__digsy || {};
    if (G10.enterRoom) {
      G10.enterRoom('museum').then(function(){
        G10.frame(1000);
        var eb = document.getElementById('exitbtn');
        A("nel museo c'è un comando di uscita raggiungibile", !!eb, eb ? "presente" : "assente");
        if (G10.leaveRoom) G10.leaveRoom();
      });
    }
  }

  /* PRIMA PARTITA: il percorso che vede OGNI nuovo giocatore. Nessun test lo copriva da
     cima a fondo, ed è quello dove un errore costa di più (chi arriva e non capisce, esce). */
  {
    var okStart = true, why = [];
    var hud0 = document.getElementById('hud');
    if(!hud0 || !hud0.getBoundingClientRect().width) { okStart = false; why.push('HUD assente'); }
    var cv0 = document.getElementById('cv');
    if(!cv0 || !cv0.width) { okStart = false; why.push('canvas non dimensionata'); }
    /* il gioco deve essere GIOCABILE: niente pannelli aperti sopra al primo avvio */
    var openOv = ['modal','bagov','bookov','mapov','prepov'].filter(function(id){
      var e=document.getElementById(id); return e && e.classList.contains('on');
    });
    if(openOv.length) { okStart = false; why.push('overlay aperti: '+openOv.join(',')); }
    A('la partita si apre pronta da giocare', okStart, why.join(' · '));
  }

  /* ---------------- CONTRASTO: nessun testo e nessuna icona invisibile ----------------
     Il contrasto non è una svista da correggere quando qualcuno se ne accorge: qui si
     misura. Si scorre TUTTO ciò che è visibile, si risale al primo sfondo davvero opaco
     dietro l'elemento e si controlla il rapporto di luminanza (WCAG). Ha già preso due
     casi veri: lo zaino pieno con icona gialla su fondo giallo, e la regola dell'avviso
     che su desktop non si applicava nemmeno. */
  function rgb(c){ var m=(c||'').match(/[0-9.]+/g); return m?{r:+m[0],g:+m[1],b:+m[2],a:m.length>3?+m[3]:1}:null; }
  function relLum(c){
    var f=function(v){ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);
  }
  function ratio(fg,bg){
    var a=relLum(fg)+0.05, b=relLum(bg)+0.05;
    return a>b ? a/b : b/a;
  }
  /* lo sfondo VERO: si risale finché non se ne trova uno opaco (i genitori trasparenti
     non contano, ed è lì che nascono le sorprese) */
  function bgOf(el){
    for (var n=el; n && n.nodeType===1; n=n.parentElement){
      var c=rgb(getComputedStyle(n).backgroundColor);
      if (c && c.a>=0.85) return c;
    }
    return {r:20,g:18,b:14,a:1};
  }
  function visible(el){
    var s=getComputedStyle(el);
    if (s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)<0.35) return false;
    var r=el.getBoundingClientRect();
    return r.width>2 && r.height>2;
  }
  function checkContrast(label){
    var bad=[];
    var nodes=[].slice.call(document.querySelectorAll('#hud *, #prompt, .sheet *, #bagbox *, .sp-card *, #mapbox *, #prepbox *'));
    nodes.forEach(function(el){
      if(!visible(el)) return;
      var own=[].slice.call(el.childNodes).some(function(n){ return n.nodeType===3 && n.textContent.trim().length>1; });
      var isIcon=el.classList && el.classList.contains('pxi');
      if(!own && !isIcon) return;
      var fg=rgb(getComputedStyle(el).color); if(!fg) return;
      var bg=bgOf(el);
      var rt=ratio(fg,bg);
      /* 3:1 è la soglia WCAG per testo grande e per gli elementi grafici: qui i testi sono
         grossi e in grassetto, quindi è la soglia giusta senza diventare pedanti */
      if(rt<3){
        /* per gli SVG className è un oggetto: si costruisce un'etichetta utile a mano */
        var who=el.id || (typeof el.className==='string'?el.className:'') || el.tagName;
        var host=el.parentElement?(el.parentElement.id||(typeof el.parentElement.className==='string'?el.parentElement.className:'')):'';
        bad.push((host?host+'>':'')+who+' '+rt.toFixed(1)+':1');
      }
    });
    A('contrasto leggibile ovunque ('+label+')', bad.length===0, bad.slice(0,4).join(' · '));
  }
  checkContrast('gioco');
  /* e dentro i pannelli veri, che è dove sta il 90% del testo */
  {
    var G9=window.__digsy||{};
    if(G9.openStore){ G9.openStore(); checkContrast('negozio'); if(G9.closeModal) G9.closeModal(); }
    if(G9.openBag){ G9.openBag('finds'); checkContrast('zaino'); if(G9.closeBag) G9.closeBag(); }
    if(G9.openGuide){ G9.openGuide(); checkContrast('guida'); if(G9.closeModal) G9.closeModal(); }
  }
  /* e con gli AVVISI accesi, che sono proprio i casi che cambiano i colori */
  {
    var bb2=document.getElementById('bagbtn'), en2=document.querySelector('#h-en');
    var enTag=en2&&en2.closest?en2.closest('.tag'):null;
    if(bb2) bb2.classList.add('full');
    if(enTag) enTag.classList.add('low');
    checkContrast('avvisi accesi');
    if(bb2) bb2.classList.remove('full');
    if(enTag) enTag.classList.remove('low');
  }

  /* MONETE nell'intestazione: aperto un pannello l'HUD sparisce sotto, e senza questo chip
     non si sa più quanto si può spendere mentre si compra. Deve stare nello schermo, su
     una riga, e non farsi spingere fuori dal nome della città. */
  function coinsHead(cb){
    var G6=window.__digsy||{};
    if(!G6.openStore){ cb(); return; }
    G6.openStore().then(function(){ setTimeout(function(){
      var chip=document.getElementById('m-coins'), ttl=document.getElementById('m-title');
      var cr=chip?chip.getBoundingClientRect():null;
      A('le monete si vedono nel pannello del negozio', !!chip && cr.width>0 && /[0-9]/.test(chip.textContent||''),
        chip?('"'+(chip.textContent||'').trim()+'" larghezza '+Math.round(cr.width)):'chip assente');
      A('le monete restano dentro lo schermo', !!cr && cr.right<=W+1 && cr.top>=-1, cr?Math.round(cr.right)+'/'+W:'');
      var tr2=ttl.getBoundingClientRect();
      A("il titolo non spinge fuori le monete", !cr || !tr2 || tr2.right<=cr.left+1,
        Math.round(tr2.right)+' vs '+Math.round(cr.left));
      A('intestazione su una riga sola', !cr || cr.height<=52, cr?Math.round(cr.height)+'px':'');
      /* il chip e la X devono essere alti UGUALI: due bottoni di altezza diversa accanto
         fanno sembrare l'intestazione storta */
      var xb=document.getElementById('m-close');
      var xr=xb?xb.getBoundingClientRect():null;
      A('monete e X hanno la stessa altezza', !!xr && !!cr && Math.abs(xr.height-cr.height)<=1,
        cr&&xr?Math.round(cr.height)+' vs '+Math.round(xr.height):'');
      if(G6.closeModal) G6.closeModal();
      cb();
    }, 80); });
  }

  /* LEVA SOTTO IL DITO: appoggi dove vuoi, trascini e si cammina. Un tocco secco invece
     non è un comando di leva: manda il personaggio dove hai toccato. */
  function floatStick(cb){
    var G7=window.__digsy||{};
    if(!G7.setPref||!G7.keysNow){ cb(); return; }
    var cv=document.getElementById('cv');
    var ev=function(t,x,y){ cv.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,bubbles:true,pointerId:21})); };
    if(!TOUCH){ return floatMouseSkip(); }
    function floatMouseSkip(){ A('leva sotto il dito: non pertinente col mouse', true); followMouse(cb); return null; }
    G7.setPref('touch','float').then(function(){
      if(G7.updateHUD) G7.updateHUD();
      var joy=document.getElementById('joy');
      A('a riposo la leva non occupa un angolo', !!joy && !joy.classList.contains('floating'));
      /* appoggio + trascinamento verso destra */
      ev('pointerdown', 200, 300);
      ev('pointermove', 260, 300);
      return G7.keysNow();
    }).then(function(k){
      A('trascinando a destra si va a destra', k.right===true && !k.left, JSON.stringify(k));
      var joy=document.getElementById('joy');
      var jr=joy?joy.getBoundingClientRect():null;
      A('la leva compare sotto il dito', !!joy && joy.classList.contains('floating'),
        jr?Math.round(jr.left)+','+Math.round(jr.top):'');
      /* e deve essere VISIBILE: la classe che nasconde la leva fissa non deve vincere */
      A('e si vede davvero (niente display:none)', !joy.classList.contains('off') && getComputedStyle(joy).display !== 'none',
        'off='+joy.classList.contains('off')+' display='+getComputedStyle(joy).display);
      /* su un browser con mouse i comandi touch sono nascosti dal CSS (rettangolo 0×0):
         qui si controlla la posizione SCRITTA dal gioco, che è ciò che conta */
      var lx=parseFloat(joy.style.left), ly=parseFloat(joy.style.top);
      A('e nasce dove ho appoggiato, non in un angolo',
        Math.abs(lx+62-200)<12 && Math.abs(ly+62-300)<12,
        'centro ' + Math.round(lx+62) + ',' + Math.round(ly+62));
      /* l'HUD si aggiorna ogni due secondi: NON deve spegnere la leva che si sta usando
         (succedeva davvero: spariva sotto il pollice dopo 2 secondi esatti) */
      if(G7.updateHUD) G7.updateHUD();
      var j3=document.getElementById('joy');
      A("un aggiornamento dell'HUD non spegne la leva in uso",
        j3.classList.contains('floating') && !j3.classList.contains('off'),
        'off='+j3.classList.contains('off'));
      ev('pointerup', 260, 300);
      return G7.keysNow();
    }).then(function(k){
      A('staccando il dito ci si ferma', !k.right && !k.left && !k.up && !k.down);
      var j2=document.getElementById('joy');
      A('e la leva sparisce', !j2.classList.contains('floating') && j2.classList.contains('off'));
      return G7.setPref('touch','joystick');
    }).then(function(){ if(G7.updateHUD) G7.updateHUD(); followMouse(cb); });
  }

  /* SEGUI IL PUNTATORE (desktop): tenendo premuto, Digsy va verso il mouse; al rilascio
     si ferma. È il corrispettivo della leva per chi gioca con il mouse. */
  function followMouse(cb){
    var G8=window.__digsy||{};
    if(!G8.setPref||!G8.keysNow||!G8.frame){ cb(); return; }
    /* il segui-puntatore esiste solo dove c'è un puntatore: su un telefono non si prova */
    if(TOUCH){ A('segui-puntatore: non pertinente col dito', true); cb(); return; }
    var cv=document.getElementById('cv');
    var ev=function(t,x,y){ cv.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,bubbles:true,pointerId:31})); };
    G8.setPref('mouse','follow').then(function(){
      G8.frame(1000);                       // la camera dev'essere aggiornata
      var r=cv.getBoundingClientRect();
      /* premo a DESTRA del personaggio, che sta al centro dello schermo */
      ev('pointerdown', r.left+r.width*0.9, r.top+r.height*0.5);
      if(G8.stepWorld) G8.stepWorld(1/60);
      return G8.keysNow();
    }).then(function(k){
      A('tenendo premuto a destra si va a destra', k.right===true && !k.left, JSON.stringify(k));
      var r=cv.getBoundingClientRect();
      ev('pointerup', r.left+r.width*0.9, r.top+r.height*0.5);
      return G8.keysNow();
    }).then(function(k){
      A('rilasciando ci si ferma', !k.right && !k.left && !k.up && !k.down);
      return G8.setPref('mouse','tap');
    }).then(function(){ cb(); });
  }

  /* TOCCA DOVE ANDARE: il tocco sulla canvas deve diventare una meta, ma solo se il
     comando è attivo nelle Impostazioni e solo se non c'è un pannello aperto sopra. */
  function tapMove(cb){
    var G5=window.__digsy||{};
    if(!G5.goalInfo||!G5.setPref){ A('sonda: tocca-dove-andare', false, 'sonda incompleta'); return cb(); }
    var cv=document.getElementById('cv');
    var tap=function(x,y){
      var r=cv.getBoundingClientRect();
      ['pointerdown','pointerup'].forEach(function(t){
        cv.dispatchEvent(new PointerEvent(t,{clientX:r.left+x,clientY:r.top+y,bubbles:true,pointerId:9}));
      });
    };
    /* i controlli precedenti lasciano aperta la splash: finché c'è, il tocco sul mondo è
       giustamente ignorato. Si riprende il gioco prima di provare. */
    /* un frame PRIMA di toccare: la camera si aggiorna solo disegnando, e senza camera la
       conversione schermo→mondo darebbe un punto lontanissimo dal giocatore (in gioco non
       succede mai, perché il loop gira sempre; qui il rAF è fermo) */
    if(G5.frame) G5.frame(1000);
    if(G5.closeModal) G5.closeModal();
    if(G5.closeBag) G5.closeBag();
    if(G5.closeBook) G5.closeBook();
    if(G5.closeMap) G5.closeMap();
    if(!TOUCH){ A('dispositivo con mouse: niente prove da dito', true, 'w='+W); return cb(); }
    G5.resume().then(function(){ return G5.uiBusy(); }).then(function(b){
      A('prima del tocco il gioco è libero (niente pannelli aperti)', !b.modal && !b.splash && !b.prep,
        'modal='+b.modal+' splash='+b.splash+' prep='+b.prep);
      return G5.setPref('touch','joystick');
    }).then(function(){
      tap(60,60);
      return G5.goalInfo();
    }).then(function(g){
      A('col solo joystick il tocco NON muove', g.on===false);
      var joy0=document.getElementById('joy');
      /* nota: su un browser con mouse i comandi touch sono nascosti dal CSS a prescindere;
         qui conta che il gioco NON li spenga di sua iniziativa */
      A('con la leva scelta, la leva non è spenta dal gioco', !!joy0 && !joy0.classList.contains('off'));
      return G5.setPref('touch','tap');
    }).then(function(){
      if(G5.updateHUD) G5.updateHUD();
      var joy1=document.getElementById('joy');
      var jr=joy1?joy1.getBoundingClientRect():null;
      /* la leva DEVE sparire: coprirebbe proprio la parte di schermo che si vuole toccare */
      A('scegliendo «tocca dove andare» la leva sparisce', !!joy1 && joy1.classList.contains('off') && (!jr || jr.width===0),
        jr?Math.round(jr.width)+'px':'assente');
      tap(60,60);
      return G5.goalInfo();
    }).then(function(g){
      var r2=cv.getBoundingClientRect();
      A('con «tocca dove andare» il tocco fissa la meta', g.on===true,
        'meta='+Math.round(g.x)+','+Math.round(g.y)+' player='+Math.round(g.px)+','+Math.round(g.py)+' cam='+Math.round(g.cx)+','+Math.round(g.cy));
      /* un trascinamento non è un tocco: non deve far partire nessuno */
      var r=cv.getBoundingClientRect();
      cv.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+20,clientY:r.top+20,bubbles:true,pointerId:10}));
      cv.dispatchEvent(new PointerEvent('pointerup',{clientX:r.left+120,clientY:r.top+90,bubbles:true,pointerId:10}));
      return G5.goalInfo();
    }).then(function(g){
      A('trascinare non fissa una nuova meta', Math.round(g.x)!==0);
      /* CAMMINATA: le gambe si devono muovere davvero. Il rAF in headless è fermo, quindi
         il passo del mondo si chiede a mano — è così che si è scoperto che P.moving veniva
         azzerato a ogni frame e il personaggio scivolava con le gambe ferme. */
      var animato=false, mosso=false;
      if(G5.stepWorld){
        var x0=null;
        for(var i=0;i<30;i++){
          var st=G5.stepWorld(1/60);
          if(x0===null) x0=st.x;
          if(st.moving && st.anim>0) animato=true;
          if(Math.abs(st.x-x0)>1 || Math.abs(st.y-(st.y))>1) mosso=true;
        }
      }
      A('camminando verso la meta le gambe si muovono', animato, animato?'':'P.moving resta falso');
      return G5.setPref('touch','joystick');
    }).then(function(){ if(G5.updateHUD) G5.updateHUD(); cb(); });
  }

  /* entra in ogni stanza (e nella grotta), lascia disegnare un frame, poi esce */
  function rooms(cb){
    var G4=window.__digsy||{};
    if(!G4.enterRoom){ A('sonda: si può entrare nelle stanze', false, 'enterRoom assente'); return cb(); }
    var list=['store','lab','museum','inn','barber','tailor'];
    var i=0, before=errCount;
    var step=function(){
      if(i>=list.length){
        G4.enterCave().then(function(){ setTimeout(function(){
          try { G4.frame(1500); } catch(e){ errCount++; out.push('FAIL | crash disegnando la grotta | '+e.message); }
          G4.leaveCave();
          A('la grotta si disegna senza crash', errCount===before, errCount-before+' errori');
          coinsHead(function(){ tapMove(function(){ floatStick(cb); }); });
        }, 120); });
        return;
      }
      var t=list[i++];
      G4.enterRoom(t).then(function(){
        /* il palloncino va acceso PRIMA di disegnare (say è asincrono: senza attenderlo il
           ramo che lo disegna non veniva mai eseguito) */
        return G4.say('prova del palloncino di dialogo, testo lungo che deve andare a capo da solo');
      }).then(function(){
        /* si DISEGNA per davvero: rAF non avanza in headless, il frame va chiesto a mano */
        try { G4.frame(1000); G4.frame(2400); } catch(e){ errCount++; out.push('FAIL | crash disegnando '+t+' | '+e.message); }
        setTimeout(function(){
          G4.inRoom().then(function(inside){
            A('stanza '+t+': ci si entra davvero', inside===true);
            A('stanza '+t+': si disegna senza crash', errCount===before, errCount-before+' errori');
            before=errCount;
            G4.say(null);
            G4.leaveRoom(); setTimeout(step, 60);
          });
        }, 140);
      });
    };
    step();
  }

  function finish(){ if(done) return; done=true;
    var M='__E2'+'E__', N='__EN'+'D__';
    var el=document.getElementById('R2');
    el.textContent=M+out.join('\\n')+N;
    el.setAttribute('data-res', M+out.join(' ;; ')+N);   // il dump-DOM conserva gli attributi
    document.title=M+out.length+N;
  }
})();
`;

function buildPage() {
  /* prende l'index.html della build e ci attacca la sonda: stesso DOM, stesso CSS, stesso JS */
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  /* NB: in Chrome headless con --virtual-time-budget il requestAnimationFrame NON avanza:
   qui si usano solo i timer, che invece scattano regolarmente. */
const probe = `<pre id="R2"></pre>
<script>window.addEventListener('error', function(e){ var el=document.getElementById('R2'); if(el&&!el.getAttribute('data-res')) el.setAttribute('data-err', e.message + ' @' + e.lineno); });</script>
<script>setTimeout(function(){${PROBE}}, 1200);</script>`;
  return html.replace('</body>', probe + '</body>');
}

function run() {
  const chrome = findChrome();
  if (!chrome) { console.error('e2e: Chrome non trovato — installalo per i test visivi'); return 1; }
  if (!existsSync(join(DIST, 'index.html'))) { console.error('e2e: manca dist/ — esegui `npm run build`'); return 1; }
  const dir = mkdtempSync(join(tmpdir(), 'digsy-e2e-'));
  const page = join(DIST, '__e2e.html');
  writeFileSync(page, buildPage());

  const VIEWPORTS = [['telefono', '390,844'], ['telefono orizzontale', '844,390']];
  let fails = 0, total = 0;
  for (const [label, size] of VIEWPORTS) {
    let dom = '';
    try {
      dom = execFileSync(chrome, [
        '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files',
        '--window-size=' + size, '--virtual-time-budget=15000',
        '--dump-dom', 'file://' + page + '?nosplash',
      ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    } catch (e) { console.error('e2e: Chrome ha fallito su ' + label); return 1; }
    const m = dom.match(/data-res="__E2E__([\s\S]*?)__END__"/) || dom.match(/__E2E__([\s\S]*?)__END__/);
    console.log('\n— ' + label + ' (' + size.replace(',', '×') + ')');
    if (!m) { console.error('  nessun risultato: la pagina non ha eseguito la sonda'); fails++; continue; }
    for (const l of m[1].split(/ ;; |\n/).filter(Boolean)) { total++; console.log('  ' + l.replace(/&#39;|&amp;#39;/g, "'").replace(/&amp;/g, '&')); if (l.startsWith('FAIL')) fails++; }
  }
  console.log(`\ne2e: ${total - fails} ok, ${fails} fail`);
  return fails ? 1 : 0;
}

process.exit(run());
