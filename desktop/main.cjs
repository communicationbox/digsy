/* APP DESKTOP di Digsy World: una finestra che apre la build del gioco (app/index.html) dal disco.
   Niente rete obbligatoria: il mondo è procedurale e il salvataggio sta nel profilo dell'app.
   Il battito anonimo e il login Google restano quelli della versione web (il login da file locale
   non è un'origine autorizzata: il gioco lo riconosce e non mostra il pulsante). */
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 640, minHeight: 480,
    backgroundColor: '#1a1410', title: 'Digsy World', autoHideMenuBar: true,
    icon: path.join(__dirname, 'app', 'icon-512.png'),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  /* i link esterni (privacy, Discord, sito) si aprono nel browser, non dentro il gioco */
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); } });
  /* F11 schermo intero */
  win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen()); });
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
