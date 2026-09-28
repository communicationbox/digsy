/* AL MASSIMO 60 FOTOGRAMMI AL SECONDO. Sugli schermi a 120 Hz (i MacBook Pro, molti telefoni)
   il browser chiama il ciclo il doppio delle volte, e il gioco disegnava il doppio: stessa
   immagine, doppio calore — con due schede aperte la ventola di un M2 Pro partiva (segnalato).
   Il movimento e le animazioni si calcolano sul TEMPO, quindi a 60 vanno uguali.
   La scadenza avanza di un sessantesimo alla volta invece di ripartire da ogni fotogramma: così
   anche uno schermo a 90 Hz resta a 60 di media invece di scendere a 45. Modulo puro. */
export const PASSO_60 = 1000 / 60;
/* `r` = { prossimo }: vero se questo giro va disegnato (e sposta la scadenza) */
export function tocca(r, ts) {
  if (ts < r.prossimo - 2) return false;
  r.prossimo = (ts - r.prossimo > PASSO_60) ? ts + PASSO_60 : r.prossimo + PASSO_60;
  return true;
}

/* LA GUARDIA DELLE CACHE. Le cache del disegno (render.js) sono provate pixel per pixel e
   misurate, ma su un dispositivo che non abbiamo in mano potrebbero costare più di quello che
   risparmiano — è successo: «va a 3 fps». Qui il gioco lo misura DA SÉ: se col disegno in cache
   i fotogrammi arrivano lenti (intervallo medio oltre LENTO ms), prova a spegnerle per un po' e
   tiene la strada più veloce. Il gioco non può andare peggio di come andava prima delle cache.
   Modulo puro: `g` è lo stato, `dt` l'intervallo fra due fotogrammi disegnati, torna la scelta
   (true = cache accese). */
export const LENTO = 25, CAMPIONE = 90, RIPROVA = 60000;
export function guardia(g, dt, now) {
  if (!(dt > 0) || dt > 500) return g.on;                   // scheda nascosta o pausa: non conta
  g.somma = (g.somma || 0) + dt; g.n = (g.n || 0) + 1;
  if (g.n < CAMPIONE) return g.on;
  const media = g.somma / g.n; g.somma = 0; g.n = 0;
  if (g.fase === 'prova') {                                 // finita la prova a cache spente
    g.fase = 'decisa';
    g.on = !(media < g.mediaOn * 0.8);                      // spente solo se DAVVERO più veloci
    g.dopo = now + RIPROVA;
    return g.on;
  }
  if (g.on && media > LENTO && !(g.dopo > now)) { g.fase = 'prova'; g.mediaOn = media; g.on = false; }
  return g.on;
}
