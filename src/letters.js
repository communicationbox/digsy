/* LETTERE DEL NONNO — l'arco narrativo del gioco.
   Ogni volta che riempi una sala del Museo (almeno un pezzo per ogni specie di quella zona)
   il Curatore ti consegna una lettera che il nonno gli aveva lasciato. Sette lettere, una per
   ala, e quando le hai tutte arriva il congedo. Si rileggono dal menu (✉ Lettere). */
import { S, save } from './state.js';
import { MUSEUM_ZONES, zonePools } from './data.js';
import { tr } from './i18n.js';

/* it/en: testo della lettera. `t` = titolo, `b` = corpo (righe). */
export const LETTERS = {
  prati: {
    t: ['Dove tutto è cominciato', 'Where it all began'],
    b: [
      ['Se leggi questa lettera, hai riempito la prima sala. Bravo.',
       'Su questi prati ho trovato il mio primo osso. Avevo la tua età e nessuno mi credette:',
       'dicevano che erano sassi strani, che le creature grandi non erano mai esistite.',
       'Ho passato la vita a dimostrare il contrario, una sala alla volta.',
       'Continua a scavare. Le cose importanti stanno sempre sotto.'],
      ['If you are reading this, you filled the first room. Well done.',
       'On these meadows I found my first bone. I was your age and nobody believed me:',
       'they said they were odd stones, that the great creatures had never existed.',
       'I spent my life proving otherwise, one room at a time.',
       'Keep digging. What matters is always underneath.'],
    ],
  },
  dune: {
    t: ['La prima intera', 'The first whole one'],
    b: [
      ['Nelle dune ho trovato la prima creatura INTERA. Ci ho messo due stagioni.',
       'Il vento scopriva un osso e il giorno dopo lo risotterrava: una risata amara.',
       'Quando l\'ho vista tutta, distesa nella sabbia, mi sono seduto e ho pianto.',
       'Non per la fatica: perché per un attimo ho capito quanto era viva.'],
      ['In the dunes I found the first WHOLE creature. It took me two seasons.',
       'The wind would uncover a bone and bury it again the next day: a bitter joke.',
       'When I finally saw all of it, laid out in the sand, I sat down and wept.',
       'Not from exhaustion: because for a moment I understood how alive it had been.'],
    ],
  },
  boschi: {
    t: ['La cenere', 'The ash'],
    b: [
      ['Ti sarai chiesto perché i boschi sono grigi. Sotto la terra c\'è uno strato di cenere,',
       'sottile come un foglio, e sopra quella riga non si trova più nulla.',
       'Sotto: mille creature. Sopra: silenzio.',
       'Non so ancora cosa sia successo. Forse lo scoprirai tu.'],
      ['You must have wondered why these woods are grey. Under the soil there is a layer of ash,',
       'thin as a sheet of paper, and above that line you find nothing at all.',
       'Below it: a thousand creatures. Above it: silence.',
       'I still do not know what happened. Maybe you will find out.'],
    ],
  },
  terre: {
    t: ['Il primo risveglio', 'The first awakening'],
    b: [
      ['Nelle Terre Rosse ho capito che le ossa conservano qualcosa di più della forma.',
       'Un filo di vita, dentro. Il Curatore lo chiama DNA; io lo chiamavo ostinazione.',
       'La prima creatura che si è mossa di nuovo mi ha guardato per tre secondi,',
       'poi è andata a bere. Tre secondi che valgono una vita di lavoro.'],
      ['In the Red Lands I understood that bones keep more than a shape.',
       'A thread of life, inside. The Curator calls it DNA; I called it stubbornness.',
       'The first creature that moved again looked at me for three seconds,',
       'then went to drink. Three seconds worth a lifetime of work.'],
    ],
  },
  palude: {
    t: ['Il dubbio', 'The doubt'],
    b: [
      ['Nella palude mi sono fermato a lungo. Non per il fango: per una domanda.',
       'Abbiamo il diritto di riportarle indietro? Il mondo che conoscevano non c\'è più.',
       'Poi ho visto la prima chimera correre nel parco, felice come un cucciolo,',
       'e ho deciso che la risposta era sì — a patto di trattarle bene.'],
      ['In the marsh I stopped for a long time. Not because of the mud: because of a question.',
       'Do we have the right to bring them back? The world they knew is gone.',
       'Then I saw the first chimera run across the park, happy as a puppy,',
       'and I decided the answer was yes — as long as we treat them well.'],
    ],
  },
  ghiacci: {
    t: ['Il freddo', 'The cold'],
    b: [
      ['Le Lande Gelide sono l\'ultimo posto in cui sono riuscito ad arrivare.',
       'Il ghiaccio conserva tutto: pelle, occhi, l\'ultimo pasto. È un museo che non chiede biglietto.',
       'Ho lasciato lì lo scavo a metà, non per scelta: le gambe non mi reggevano più.',
       'Se sei arrivato fin qui, hai già fatto più strada di me. Sono fiero di te.'],
      ['The Frozen Wastes are the farthest I ever managed to go.',
       'Ice keeps everything: skin, eyes, the last meal. A museum that charges no ticket.',
       'I left that dig half finished, not by choice: my legs would not carry me anymore.',
       'If you got this far, you have already gone farther than I did. I am proud of you.'],
    ],
  },
  grotta: {
    t: ['Sotto ogni cosa', 'Beneath everything'],
    b: [
      ['Le grotte non le ho mai raccontate a nessuno, nemmeno al Curatore.',
       'Là sotto le ossa brillano, e non per i cristalli: brillano da sole.',
       'Credo che le creature ci si rifugiassero quando il cielo divenne cenere.',
       'Le ultime sono morte al buio, insieme. Falle uscire alla luce, tu che puoi.'],
      ['I never told anyone about the caves, not even the Curator.',
       'Down there the bones glow, and not because of the crystals: they glow on their own.',
       'I believe the creatures sheltered there when the sky turned to ash.',
       'The last ones died in the dark, together. Bring them out into the light, you who can.'],
    ],
  },
};
/* congedo: arriva quando hai raccolto tutte e sette le lettere */
export const FINALE = {
  t: ['L\'ultima lettera', 'The last letter'],
  b: [
    ['Sette sale. Le hai riempite tutte, una per una, come avevo sognato di fare io.',
     'Non ho mai cercato le creature per la gloria: le cercavo perché nessuno le ricordava,',
     'e una cosa dimenticata è come se non fosse mai esistita.',
     'Ora c\'è un museo intero che le ricorda al posto mio. E ci sei tu.',
     'Il resto del mondo è ancora là fuori, pieno di terra da smuovere.',
     'Vai piano, bevi acqua, saluta il Curatore da parte mia. — Nonno'],
    ['Seven rooms. You filled them all, one by one, as I had dreamed of doing.',
     'I never looked for the creatures for glory: I looked for them because no one remembered them,',
     'and a forgotten thing might as well have never existed.',
     'Now there is a whole museum remembering them in my place. And there is you.',
     'The rest of the world is still out there, full of soil to turn.',
     'Go slowly, drink water, say hello to the Curator for me. — Grandpa'],
  ],
};
export function letterTitle(id) { const l = id === 'finale' ? FINALE : LETTERS[id]; return l ? tr(l.t[0], l.t[1]) : id; }
export function letterBody(id) { const l = id === 'finale' ? FINALE : LETTERS[id]; return l ? l.b[1].map((en, i) => tr(l.b[0][i], en)) : []; }

/* una SALA è piena quando ogni specie di quella zona ha almeno un pezzo esposto */
export function roomFilled(zoneId) {
  const pool = zonePools[zoneId] || [];
  return pool.length > 0 && pool.every(sp => ((S.museum || {})[sp.id] || []).length > 0);
}
export function hasLetter(id) { return (S.letters || []).includes(id); }
/* prossima lettera da consegnare: la prima sala piena la cui lettera non è ancora stata data */
export function pendingLetter() {
  for (const z of MUSEUM_ZONES) if (roomFilled(z.id) && !hasLetter(z.id)) return z.id;
  if (MUSEUM_ZONES.every(z => hasLetter(z.id)) && !hasLetter('finale')) return 'finale';
  return null;
}
export function giveLetter(id) {
  if (!id || hasLetter(id)) return false;
  if (!S.letters) S.letters = [];
  S.letters.push(id); save();
  return true;
}
export function allLetters() { return MUSEUM_ZONES.map(z => z.id).concat(['finale']); }
