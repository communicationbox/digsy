/* Progressione "Archeologo": XP dai ritrovamenti/missioni → livelli che sbloccano capacità
   (più energia max, scavo più rapido, più chance di rari). Curva leggera. */
import { S } from './state.js';

export function playerLevel() { return S.level || 1; }
export function playerXp() { return S.xp || 0; }
/* XP per salire dal livello corrente al successivo */
export function xpToNext() { return 50 + (playerLevel() - 1) * 45; }
/* XP per rarità del reperto trovato */
export const XP_BY_RAR = { comune: 4, raro: 9, eccezionale: 18, leggendario: 34 };

/* aggiunge XP; ogni livello: +5 energia max (e ricarica), sblocchi passivi. onLevel(newLevel) per il toast. */
export function addXp(n, onLevel) {
  if (!n || n <= 0) return;
  S.xp = (S.xp || 0) + n;
  let leveled = 0;
  while (S.xp >= xpToNext()) {
    S.xp -= xpToNext();
    S.level = (S.level || 1) + 1;
    S.maxEnergy = (S.maxEnergy || 30) + 5;
    S.energy = S.maxEnergy;
    leveled = S.level;
  }
  if (leveled && onLevel) onLevel(leveled);
}
/* capacità sbloccate dal livello */
/* scavo LENTO all'inizio, sempre più RAPIDO salendo di livello (ricompensa i livelli):
   Lv1 ×1.5 (lento) → −10% per livello → cap ×0.5 (dal Lv11, 3× più veloce dell'inizio). */
/* con un livello esplicito si può mostrare al giocatore cosa otterrà SALENDO (Maestro) */
export function digDurationMul(lv) { return Math.max(0.5, 1.5 - ((lv || playerLevel()) - 1) * 0.1); }
export function rareBonus(lv) { return Math.min(2.5, 1 + ((lv || playerLevel()) - 1) * 0.06); } // + chance rari/leggendari (con tetto)
/* descrizione capacità correnti (per l'HUD/guida) */
export function perkText(it, en) { return { it, en }; }
