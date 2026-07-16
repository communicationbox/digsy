import { defineConfig } from 'vite';

/* base relativa: la build funziona anche servita da una sottocartella
   (es. GitHub Pages https://utente.github.io/digsy/) */
export default defineConfig({
  base: './',
});
