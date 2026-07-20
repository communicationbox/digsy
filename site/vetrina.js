/* LE CREATURE, IN TRE DIMENSIONI, IN CIMA ALLA PAGINA.
 *
 * Il gioco ha sessantasei scheletri disegnati a mano osso per osso, e la vetrina ne mostrava
 * uno screenshot. Sono la cosa più bella che c'è dentro: qui girano davvero, una dopo
 * l'altra, con gli stessi moduli che usa il Libro dei Fossili — non un video, non un'immagine.
 *
 * Costa: Three.js sono ~130 KB compressi. Si carica DOPO la pagina e solo dove ha senso
 * (niente su connessioni lente, telefoni piccoli o per chi ha chiesto meno animazioni):
 * chi non lo vede trova comunque lo screenshot più sotto.
 */
import { ALL_SPECIES } from '../src/data.js';
import { baseSpec } from '../src/bones.js';

const CANVAS = document.getElementById('creatura');
const NOME = document.getElementById('creatura-nome');
if (CANVAS) avvia();

async function avvia() {
  let mountSkeleton;
  try {
    ({ mountSkeleton } = await import('../src/skeleton3d.js'));
  } catch (e) { return; }        // niente WebGL o niente rete: resta lo screenshot

  /* una scelta a caso, ma sempre diversa: chi torna sulla pagina vede altre creature */
  const scelte = [...ALL_SPECIES].sort(() => Math.random() - 0.5).slice(0, 8);
  let i = 0, vista = null;

  const mostra = () => {
    const sp = scelte[i % scelte.length];
    i++;
    try {
      if (vista && vista.dispose) vista.dispose();
      /* `flesh`: la creatura VIVA, non lo scheletro. In vetrina deve far venire voglia di
         giocare, e un animale colorato che gira lo fa più di un mucchio d'ossa. */
      vista = mountSkeleton(CANVAS, baseSpec(sp), { flesh: true, spin: true });
      if (NOME) NOME.textContent = sp.name;
      CANVAS.classList.add('on');
    } catch (e) { /* una specie che non si monta non deve fermare il carosello */ }
  };

  mostra();
  setInterval(() => { CANVAS.classList.remove('on'); setTimeout(mostra, 500); }, 6000);
}
