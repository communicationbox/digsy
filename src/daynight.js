/* Ciclo giorno/notte (come Minecraft: 20 minuti reali) + stagioni */
import { S } from './state.js';

export const DAY_LEN = 1200;   // secondi reali per un giorno intero
export const SEASON_LEN = 3;   // giorni per stagione

export const SEASONS = [
  { id: 'primavera', icon: '🌸' },
  { id: 'estate', icon: '☀️' },
  { id: 'autunno', icon: '🍂' },
  { id: 'inverno', icon: '❄️' },
];
export function seasonOf(day) { return Math.floor(((day || 1) - 1) / SEASON_LEN) % 4; }

/* tod 0..1 → oscurità 0..1: 0–0.5 giorno, 0.5–0.58 tramonto, 0.58–0.92 notte, 0.92–1 alba */
export function darknessAt(tod) {
  if (tod < 0.5) return 0;
  if (tod < 0.58) return (tod - 0.5) / 0.08;
  if (tod < 0.92) return 1;
  return 1 - (tod - 0.92) / 0.08;
}
export function isNight() { return darknessAt(S.tod || 0) > 0.5; }

/* avanza l'orologio; true se è scattato un nuovo giorno */
export function advanceTime(dt) {
  const prev = S.tod || 0;
  S.tod = (prev + dt / DAY_LEN) % 1;
  if (S.tod < prev) { S.day++; return true; }
  return false;
}
