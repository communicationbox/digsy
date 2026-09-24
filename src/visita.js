/* LA VISITA — entrare nel mondo di un altro, e tornare a casa com'eri.
 *
 * La regola madre (MULTIPLAYER.md): **il mondo è di chi ospita, quello che porti addosso è
 * tuo**. Qui dentro c'è l'unica operazione che la fa succedere: metti da parte il tuo mondo,
 * adotti il suo, e al ritorno rimetti il tuo esattamente com'era.
 *
 * NON È UN MECCANISMO NUOVO. Il gioco fa già la stessa cosa per i comandi cheat: `vanilla`
 * ripristina lo stato di prima da uno snapshot. Qui si riusa l'idea, ristretta ai soli campi
 * del mondo (`CAMPI_MONDO` in state.js): zaino, monete, energia, collezioni e aspetto non
 * vengono nemmeno sfiorati, perché sono roba tua e devono restare tali anche mentre giochi in
 * casa d'altri.
 *
 * TRE COSE CHE VANNO FATTE INSIEME, o non funziona niente:
 * 1. il SEME al generatore (lo fa `applicaMondo`);
 * 2. le CACHE del mondo buttate — sono indicizzate per coordinata e non per seme, quindi
 *    senza pulirle si vedrebbe un mondo cucito coi pezzi di due mondi diversi, senza un
 *    errore da nessuna parte;
 * 3. il SALVATAGGIO spento — altrimenti l'autosave ogni cinque secondi scriverebbe il mondo
 *    dell'altro dentro il tuo. Quella la ferma `save()` stessa (`setOspiteAltrove`).
 */
import { S, P, save, snapshotMondo, applicaMondo, setOspiteAltrove, dugSet, choppedSet, minedSet, pickedSet } from './state.js';
import { noteDug } from './packmap.js';
import { resetWorldCaches } from './world.js';

export const VISITA = { attiva: false, da: null, entrataAt: 0 };
let casa = null;      // il mio mondo, messo da parte

/* Il mondo da spedire a chi entra, più dove mi trovo io: l'ospite arriva ACCANTO a chi l'ha
   invitato, non in un punto qualsiasi di un mondo che non ha mai visto. */
export function mondoDaMandare() {
  return { mondo: snapshotMondo(), x: P.x, y: P.y };
}

/* Entro come ospite. Torna false se il pacchetto non ha senso: meglio restare a casa propria
   che ritrovarsi in un mondo a metà. */
export function entra(pacco, da) {
  if (!pacco || !pacco.mondo || typeof pacco.mondo.seed !== 'number') return false;
  if (VISITA.attiva) torna();
  casa = { mondo: snapshotMondo(), px: P.x, py: P.y };
  if (!applicaMondo(pacco.mondo)) { casa = null; return false; }
  resetWorldCaches();
  setOspiteAltrove(true);
  VISITA.attiva = true; VISITA.da = da || null; VISITA.entrataAt = Date.now();
  /* si arriva accanto all'ospitante; se non ha detto dove sta, al centro del suo mondo */
  P.x = typeof pacco.x === 'number' ? pacco.x : 0;
  P.y = typeof pacco.y === 'number' ? pacco.y : 0;
  return true;
}

/* Torno a casa mia. Rimetto il mio mondo, mi rimetto dov'ero, e riazzero il tempo d'assenza:
   la visita NON paga l'idle — stavo giocando, non ero via, e senza questo si scoprirebbe
   subito che farsi ospitare è il modo più comodo per accumulare. */
export function torna() {
  if (!casa) { setOspiteAltrove(false); VISITA.attiva = false; return false; }
  applicaMondo(casa.mondo);
  resetWorldCaches();
  P.x = casa.px; P.y = casa.py;
  S.idleAt = Date.now();
  casa = null;
  VISITA.attiva = false; VISITA.da = null;
  setOspiteAltrove(false);
  save();               // ora sì: il mondo è di nuovo il mio
  return true;
}

export function sonoOspite() { return VISITA.attiva; }

/* ---------- cosa l'ospite NON può toccare ----------
   Casa e cortile dell'ospitante si visitano ma non si toccano: niente arredo spostato, niente
   dormire nel letto di un altro, niente scavare in giardino. Sono due rettangoli precisi, e la
   domanda si fa QUI una volta sola invece di spargere `if (sonoOspite())` per mezzo gioco. */
export function puoToccare(tx, ty, hf, yr) {
  if (!VISITA.attiva) return true;                       // a casa propria si fa quel che si vuole
  if (hf && tx >= hf.x0 && tx <= hf.x1 && ty >= hf.y0 && ty <= hf.y1) return false;
  if (yr && tx >= yr.x0 && tx <= yr.x1 && ty >= yr.y0 && ty <= yr.y1) return false;
  return true;
}

/* ---------- l'orologio ----------
   L'ospite non calcola il tempo: lo riceve. Qui si applica quello che arriva dall'ospitante,
   con un filtro: un giorno che va all'indietro o un'ora fuori scala vuol dire pacchetto rotto
   o dispettoso, e si lascia perdere invece di far tornare indietro le stagioni. */
export function applicaOrologio(day, tod) {
  if (!VISITA.attiva) return false;
  if (typeof day === 'number' && Number.isFinite(day) && day >= 1 && day < 1e6) S.day = Math.floor(day);
  if (typeof tod === 'number' && Number.isFinite(tod) && tod >= 0 && tod < 1) S.tod = tod;
  return true;
}

/* ---------- quello che si consuma ----------
   Una casella scavata, un albero tagliato, un masso spaccato, un oggetto raccolto: succede nel
   mondo di chi ospita e vale per tutti e due. Arriva dalla rete, quindi la coordinata è già
   passata dal filtro di `decode` — qui si applica e basta.
   `noteDug` non è un dettaglio: il pacchetto delle caselle scavate ha una cache incrementale, e
   aggiungere senza avvisarla lascerebbe il salvataggio indietro di una casella. */
export function applicaMutazione(k, c) {
  if (!k || !c) return false;
  if (k === 'dug') {
    if (dugSet.has(c)) return false;
    dugSet.add(c); if (!S.dug) S.dug = []; S.dug.push(c); noteDug(dugSet, c);
    return true;
  }
  const insiemi = { chop: [choppedSet, 'chopped'], mine: [minedSet, 'mined'], pick: [pickedSet, 'picked'] };
  const e = insiemi[k]; if (!e) return false;
  const [set, campo] = e;
  if (set.has(c)) return false;
  set.add(c); if (!S[campo]) S[campo] = []; S[campo].push(c);
  return true;
}
