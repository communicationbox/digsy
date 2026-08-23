/* PARCO CHE RENDE — mentre sei via, i visitatori lasciano qualche moneta (e ogni tanto una
   fialetta a sorpresa). GARNISH BOUNDED, non un motore che gioca al posto tuo:
     - NIENTE auto-scavo: il verbo `E` resta l'unico modo per riempire lo zaino.
     - NIENTE rendita che scala: il tetto sulle ORE conta anche se sparisci una settimana.
     - NIENTE decadimento: le chimere non "hanno fame", il gioco resta senza game over.
   Il tempo che conta è quello VERO (Date.now), non il giorno di gioco: chi si allontana un
   weekend intero non deve tornare più ricco di chi si allontana una notte.

   Modulo PURO (niente localStorage/DOM): i numeri si testano da soli. */

export const IDLE_CAP_HOURS = 10;            // oltre non si accumula altro: un'assenza lunga non paga di più
export const IDLE_MIN_MINUTES = 20;          // sotto: non vale la pena disturbare (refresh continui, sviluppo)
export const IDLE_COIN_PER_CREATURE_HOUR = 1.2;
export const IDLE_MAX_CREATURES = 15;        // rendimenti calanti oltre: accumulare chimere non è l'obiettivo
export const IDLE_DNA_CHANCE = 0.25;         // una mezza sorpresa, non una fonte di DNA

/* ore VERE trascorse, cappate — mai negative (orologio del dispositivo cambiato, ecc.) */
export function idleHours(nowMs, lastMs) {
  return Math.max(0, Math.min(IDLE_CAP_HOURS, (nowMs - lastMs) / 3600000));
}
/* sotto la soglia minima: 0 esatto, niente arrotondamenti che regalano 1 moneta per un refresh */
export function idleEligible(hours) { return hours * 60 >= IDLE_MIN_MINUTES; }
export function idleCoins(hours, creatureCount) {
  if (!idleEligible(hours)) return 0;
  return Math.round(Math.min(IDLE_MAX_CREATURES, Math.max(0, creatureCount)) * IDLE_COIN_PER_CREATURE_HOUR * hours);
}
