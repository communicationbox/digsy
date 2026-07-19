/* Wrapper Three.js: voxel 3D "8-bit" — render a bassa risoluzione, upscalato pixelato.
   Caricato in lazy-import solo quando serve (libro / anteprima chimera). */
import * as THREE from 'three';
import { buildVoxels, buildFleshVoxels } from './bones.js';

const COLS = { bone: 0xe8e2d0, shade: 0xcbbfa4, dark: 0x8f836b, eye: 0x3a3128, dim: 0x4a4458, dim2: 0x3a3448 };
const SIL = 0x5a4a3a;

export function mountSkeleton(canvas, spec, opts = {}) {
  const { silhouette = false, spin = true, flesh = false, lit = null, voxels: given = null } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1); // niente retina: pixel grossi = 8-bit
  renderer.setSize(canvas.width, canvas.height, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6efdd);

  const voxels = given || (flesh ? buildFleshVoxels(spec) : buildVoxels(spec)); // `given`: meraviglie e altri modelli non-scheletro
  /* bounding box per centrare e inquadrare */
  let mn = [9e9, 9e9, 9e9], mx = [-9e9, -9e9, -9e9];
  for (const v of voxels) { [v.x, v.y, v.z].forEach((c, i) => { mn[i] = Math.min(mn[i], c); mx[i] = Math.max(mx[i], c); }); }
  const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
  /* inquadratura con minimo fisso: le creature piccole APPAIONO piccole (la taglia si legge) */
  const span = Math.max(26, Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) + 4);

  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const byCol = {};
  /* lit = pezzi consegnati al museo: gli altri restano scheletro OSCURATO */
  for (const v of voxels) {
    let k = silhouette ? 'sil' : (v.col || v.k);
    if (!silhouette && !v.col && lit && v.p && !lit.includes(v.p)) k = v.k === 'shade' || v.k === 'dark' ? 'dim2' : 'dim';
    (byCol[k] = byCol[k] || []).push(v);
  }
  const dummy = new THREE.Object3D();
  for (const [k, list] of Object.entries(byCol)) {
    const mat = silhouette
      ? new THREE.MeshBasicMaterial({ color: SIL })
      : new THREE.MeshLambertMaterial({ color: k.startsWith('#') ? new THREE.Color(k) : (COLS[k] || COLS.bone) });
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((v, i) => { dummy.position.set(v.x - cx, v.y - cy, v.z - cz); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    group.add(im);
  }
  scene.add(group);
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.1); sun.position.set(4, 8, 6); scene.add(sun);

  const aspect = canvas.width / canvas.height;
  const camera = new THREE.OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, 0.1, 100);
  camera.position.set(span, span * 0.7, span); camera.lookAt(0, 0, 0);

  /* drag per ruotare (mouse/touch); lo spin riprende dopo 2s di inattività */
  let dragging = false, lx = 0, ly = 0, lastDrag = 0;
  canvas.style.cursor = 'grab'; canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    group.rotation.y += (e.clientX - lx) * 0.012;
    group.rotation.x = Math.max(-0.9, Math.min(0.9, group.rotation.x + (e.clientY - ly) * 0.01));
    lx = e.clientX; ly = e.clientY; lastDrag = performance.now();
  });
  const endDrag = () => { dragging = false; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

  let raf = 0, dead = false;
  (function tick() {
    if (dead) return;
    if (spin && !dragging && performance.now() - lastDrag > 2000) group.rotation.y += 0.012;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  })();
  /* per cambiare spec: dispose() e rimonta (le viste sono piccole, costa nulla) */
  return {
    dispose() { dead = true; cancelAnimationFrame(raf); geo.dispose(); renderer.dispose(); renderer.forceContextLoss?.(); },
  };
}
