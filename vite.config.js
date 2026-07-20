import { defineConfig } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/* base relativa: la build funziona anche servita da una sottocartella
   (es. GitHub Pages https://utente.github.io/digsy/). In dev i TOOL statici in
   public/<nome>/index.html (editor cappelli, editor zaino, …) vanno serviti a mano:
   senza questo middleware la history-fallback di Vite risponde con il GIOCO. */
export default defineConfig({
  base: './',
  /* DUE PAGINE: il gioco e la vetrina. La vetrina importa i moduli veri (le creature 3D sono
     le stesse del Libro), quindi deve passare dalla build come il gioco — non può essere un
     file statico che carica sorgenti che in produzione non esistono. */
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        vetrina: resolve(__dirname, 'site/index.html'),
      },
    },
  },
  /* IN SVILUPPO IL BACKEND NON C'È: Vite serve file statici, PHP non lo esegue. Senza questo
     inoltro ogni chiamata a `server/api/…` da localhost:5173 torna 404 e l'accesso fallisce
     con un "login_failed" che sembra un problema di credenziali e non lo è.
     `changeOrigin` fa arrivare al server l'Host giusto; `cookieDomainRewrite` toglie il
     dominio dal cookie di sessione, altrimenti il browser lo scarterebbe (arriva marcato
     digsy.dev-box.it mentre la pagina sta su localhost) e si resterebbe scollegati dopo un
     accesso in apparenza riuscito. */
  server: {
    proxy: {
      '/server/api': {
        target: 'https://digsy.dev-box.it',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: '',
      },
    },
  },
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
