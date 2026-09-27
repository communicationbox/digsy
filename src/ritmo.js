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
