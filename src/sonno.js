/* IL SONNO IN COMPAGNIA — chi dorme sogna e aspetta.
 *
 * Da soli il letto porta all'alba e basta: è così dal primo giorno e non cambia. In due no,
 * perché l'orologio è uno solo ed è di chi ospita (MULTIPLAYER.md, regola 4): se andare a
 * letto facesse passare la notte a chiunque lo decidesse, un ospite cambierebbe il cielo, le
 * stagioni e le scadenze di un'altra persona senza che lei abbia detto niente.
 *
 * Quello che succede, in una riga: **chi dorme sogna e aspetta**. Se dormono tutti, la notte
 * passa subito. Se dorme solo chi ospita, è lui a scegliere — *al mattino* (la notte passa per
 * tutti) o *di notte* (non è successo niente). Chi non ha dormito vede passare il tempo con
 * una dissolvenza e **non recupera energia**: è l'unica cosa che rende il sonno una scelta
 * invece di un pulsante, e senza di essa basterebbe non dormire mai e aspettare gli altri.
 *
 * L'ENERGIA SI RIFÀ NELL'ISTANTE IN CUI LA NOTTE PASSA, non quando ci si corica. Se fosse al
 * momento di coricarsi si andrebbe a letto e ci si rialzerebbe subito, a ripetizione.
 *
 * QUI DENTRO NON C'È NIENTE CHE DISEGNA. La parte che decide sta qui e si prova offline; il
 * sogno a schermo è in `dream.js`, che questo modulo chiama e basta.
 */
import { S } from './state.js';
import { MP, sonoOspitante, dormo as diCheDormo, alba as mandaAlba } from './mp.js';

export const SONNO = { dormo: false, notte: false, bonus: 0 };

/* IL «BEN RIPOSATO» DEL PROPRIO LETTO SI PRENDE QUANDO SI È DORMITO DAVVERO. In compagnia fra
   il coricarsi e il mattino passa del tempo (lo decide chi ospita), e darlo al momento di
   infilarsi sotto le coperte vorrebbe dire prenderselo anche alzandosi subito. Si mette da
   parte qui e si riscuote con l'alba. */
export function prometti(n) { SONNO.bonus = n || 0; }
export function riscuoti() { const n = SONNO.bonus; SONNO.bonus = 0; return n; }

/* Si sta giocando in compagnia? (non "c'è la socket aperta": una stanza da soli è come essere
   da soli, e il letto deve funzionare come sempre) */
export function inCompagnia() { return MP.stato === 'dentro' && MP.room.peers.size > 0; }

/* Dormono TUTTI? Io compreso: è la condizione per far passare la notte senza chiedere niente
   a nessuno. La guarda solo chi ospita, perché è l'unico che può muovere l'orologio. */
export function tuttiDormono() {
  if (!SONNO.dormo) return false;
  for (const p of MP.room.peers.values()) if (!p.dorme) return false;
  return true;
}
/* chi sta dormendo, per il sogno a schermo ("stai aspettando Luca") */
export function svegli() {
  return [...MP.room.peers.values()].filter(p => !p.dorme).map(p => p.name);
}

/* VADO A LETTO. Torna quello che il gioco deve fare adesso:
   - 'solo'   → nessuna compagnia: il letto funziona come sempre (l'alba subito)
   - 'subito' → dormono tutti: la notte passa, e la fa passare chi ospita
   - 'sogno'  → si sogna e si aspetta */
export function vadoADormire(notte) {
  SONNO.notte = !!notte;
  if (!inCompagnia()) return 'solo';
  SONNO.dormo = true;
  diCheDormo(true);
  if (sonoOspitante() && tuttiDormono()) return 'subito';
  return 'sogno';
}

/* DORMONO TUTTI: la notte passa subito, senza chiedere niente a nessuno. Si esce dal sonno
   anche qui — la notte è passata, quindi nessuno sta più dormendo. */
export function notteSubito() {
  SONNO.dormo = false;
  diCheDormo(false);
  mandaAlba(SONNO.notte);
  return true;
}

/* MI SVEGLIO, di mia volontà. `passa` vale solo per chi ospita: è la scelta fra *al mattino*
   (la notte passa per tutti) e *di notte* (non è successo niente). Torna true se la notte è
   passata — cioè se chi si sveglia ha diritto all'energia. */
export function miSveglio(passa) {
  const dormivo = SONNO.dormo;
  SONNO.dormo = false;
  diCheDormo(false);
  if (!passa || !sonoOspitante()) return false;
  mandaAlba(SONNO.notte);
  return dormivo;
}

/* UN ALTRO SI È CORICATO (o si è alzato). Solo chi ospita ha qualcosa da farci: se adesso
   dormono tutti, la notte passa senza che nessuno debba premere niente. */
export function qualcunoSiCorica() {
  return !!(sonoOspitante() && tuttiDormono());
}

/* È PASSATA LA NOTTE, e l'ha fatta passare chi ospita. Torna true se tocca a me l'energia:
   solo a chi stava dormendo. */
export function albaRicevuta() {
  const dormivo = SONNO.dormo;
  SONNO.dormo = false;
  return dormivo;
}

/* si smette di dormire senza che sia successo niente: uscendo dalla stanza, o cadendo la linea */
export function sveglia() { SONNO.dormo = false; }

/* quanta energia si rifà: tutta, e solo a chi ha dormito */
export function rifaiEnergia() { S.energy = S.maxEnergy; }
