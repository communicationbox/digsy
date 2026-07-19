import { defineConfig } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/* base relativa: la build funziona anche servita da una sottocartella
   (es. GitHub Pages https://utente.github.io/digsy/). In dev i TOOL statici in
   public/<nome>/index.html (editor cappelli, editor zaino, …) vanno serviti a mano:
   senza questo middleware la history-fallback di Vite risponde con il GIOCO. */
export default defineConfig({
  base: './',
  plugins: [{
    name: 'serve-public-tools',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0].replace(/\/$/, '');
        const file = path && /^\/[a-z0-9-]+$/i.test(path) ? resolve(__dirname, 'public' + path, 'index.html') : null;
        if (file && existsSync(file)) {
          res.setHeader('Content-Type', 'text/html');
          res.end(readFileSync(file));
          return;
        }
        next();
      });
    },
  }],
});
