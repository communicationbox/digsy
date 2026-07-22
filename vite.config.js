import { defineConfig } from 'vite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/* base relativa: la build funziona anche servita da una sottocartella
   (es. GitHub Pages https://utente.github.io/digsy/). In dev i TOOL statici in
   public/<nome>/index.html (editor cappelli, editor zaino, …) vanno serviti a mano:
   senza questo middleware la history-fallback di Vite risponde con il GIOCO. */
export default defineConfig({
  base: './',
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
      const toolRe = /public[\\/][a-z0-9-]+[\\/]index\.html$/i;
      /* cambio a un tool (public/<nome>/index.html) → RICARICA la pagina aperta. Senza, l'editor
         restava su una versione vecchia e ogni ritocco al codice sembrava "non fare niente". */
      server.watcher.on('change', (f) => { if (toolRe.test(String(f).replace(/\\/g, '/'))) server.ws.send({ type: 'full-reload' }); });
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || '').split('?')[0].replace(/\/$/, '');
        const file = path && /^\/[a-z0-9-]+$/i.test(path) ? resolve(__dirname, 'public' + path, 'index.html') : null;
        if (file && existsSync(file)) {
          /* transformIndexHtml INIETTA il client HMR di Vite (così la pagina riceve il full-reload);
             no-store impedisce al browser di servire una copia vecchia dalla cache. */
          let html = readFileSync(file, 'utf8');
          try { html = await server.transformIndexHtml(req.originalUrl || req.url, html); } catch (e) { /* raw */ }
          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Cache-Control', 'no-store');
          res.end(html);
          return;
        }
        next();
      });
    },
  }],
});
