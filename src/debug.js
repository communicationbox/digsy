/* Modalità DEBUG (Ctrl+Shift+D): override runtime, NON tocca il salvataggio.
   Energia/monete infinite, libro completo, velocità ×3. */
export let DEBUG = false;
export function isDebug() { return DEBUG; }
export function toggleDebug() { DEBUG = !DEBUG; return DEBUG; }
