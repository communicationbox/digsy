# Digsy — attivazione del servizio WebSocket

**A chi gestisce `oracle.communicationbox.it`.**
Tre interventi che richiedono root. Tempo stimato: cinque minuti. Nessun riavvio di servizi
condivisi (Apache si *ricarica*, non si riavvia).

---

## In breve

Il gioco su `digsy.dev-box.it` aggiunge una modalità in cui due giocatori si vedono in tempo
reale. Serve un WebSocket, quindi un piccolo processo Node che sta già sulla macchina:

```
/var/www/digsy.dev-box.it/relay/          già installato, già funzionante
  relay.js  rooms.js  package.json  node_modules/   (solo `ws`, nessuna dipendenza transitiva)
```

È **già in esecuzione**, avviato a mano, e risponde su `127.0.0.1:17451`. Quello che manca è
solo renderlo un servizio di sistema e farlo raggiungere da Apache.

## Cosa serve

1. tre moduli di Apache (`proxy`, `proxy_http`, `proxy_wstunnel`);
2. una unit systemd (il file è già sul server, pronto);
3. due righe `ProxyPass` dentro il vhost `:443` di `digsy.dev-box.it`.

## Cosa NON tocca

- Nessun altro vhost, nessun altro sito della macchina.
- Nessuna porta nuova aperta sul firewall: il processo ascolta **solo su `127.0.0.1`** e resta
  irraggiungibile dall'esterno. L'unico ingresso è `wss://digsy.dev-box.it/ws`, cioè Apache
  sulla 443 che già c'è.
- Nessun database, nessun file scritto: il processo non ha stato su disco (la unit ha
  `ProtectSystem=strict`, `ProtectHome=read-only`, `NoNewPrivileges=true`).
- Nessun dato personale in transito né conservato: il processo inoltra messaggi fra i presenti
  di una stanza e non tiene niente in memoria oltre la sessione.

## Impronta

Un processo Node, ~50 MB residenti, praticamente zero CPU a riposo. Tetti scritti nel codice:
massimo 8 persone per stanza, 60 stanze, 40 messaggi al secondo per collegamento, 4 KB per
messaggio. Oltre, rifiuta.

---

## I comandi

### 1 · Moduli Apache

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel
```

*(«already enabled» va bene.)*

### 2 · Servizio

```bash
sudo cp /var/www/digsy.dev-box.it/relay/digsy-relay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo pkill -f 'node relay.js'        # spegne quello avviato a mano: tiene occupata la porta
sudo systemctl enable --now digsy-relay
systemctl status digsy-relay --no-pager | head -5
```

Atteso: `active (running)`.

La unit gira come **`web_digsy_dev_box_it`** (l'utente del sito), non come root.

### 3 · Vhost

Copia di sicurezza:

```bash
sudo cp -L /etc/apache2/sites-enabled/digsy.dev-box.it.conf ~/vhost-prima-del-ws.conf
```

Dentro il blocco `<VirtualHost *:443>` di `digsy.dev-box.it`, prima di `</VirtualHost>`:

```apache
    # centralino multiplayer: processo Node in ascolto solo su localhost
    ProxyPass        /ws  ws://127.0.0.1:17451/
    ProxyPassReverse /ws  ws://127.0.0.1:17451/
```

Se preferisci un inserimento automatico e idempotente (non fa nulla se già presente):

```bash
sudo python3 - <<'FINE'
import re
p = '/etc/apache2/sites-enabled/digsy.dev-box.it.conf'
s = open(p).read()
if '17451' in s:
    print('già presente: non tocco niente')
else:
    blocchi = list(re.finditer(r'<VirtualHost[^>]*:443[^>]*>.*?</VirtualHost>', s, re.S))
    if not blocchi:
        print('NESSUN blocco :443 trovato — mi fermo')
    else:
        b = blocchi[-1]
        taglio = b.end() - len('</VirtualHost>')
        righe = ('\n    # centralino multiplayer: processo Node in ascolto solo su localhost\n'
                 '    ProxyPass        /ws  ws://127.0.0.1:17451/\n'
                 '    ProxyPassReverse /ws  ws://127.0.0.1:17451/\n')
        open(p, 'w').write(s[:taglio] + righe + s[taglio:])
        print('inserito')
FINE
sudo apache2ctl configtest
```

Atteso: `inserito` e poi `Syntax OK`. **Solo allora:**

```bash
sudo systemctl reload apache2
```

---

## Verifica

```bash
curl -s http://127.0.0.1:17451/salute
# {"ok":true,"stanze":0,"presenti":0,"proto":1}

curl -s -o /dev/null -w '%{http_code}\n' https://digsy.dev-box.it/ws
# 400 o 426 = corretto (è un endpoint WebSocket, non HTTP). 404 = il proxy non è attivo.
```

Log: `journalctl -u digsy-relay -n 50 --no-pager`

## Se qualcosa va storto

```bash
# vhost com'era
sudo cp ~/vhost-prima-del-ws.conf /etc/apache2/sites-enabled/digsy.dev-box.it.conf
sudo apache2ctl configtest && sudo systemctl reload apache2

# spegnere il servizio del tutto
sudo systemctl disable --now digsy-relay
```

Spegnere il centralino **non rompe il gioco**: la modalità in compagnia smette di funzionare,
tutto il resto continua esattamente come prima.

## Aggiornamenti futuri

Il rilascio del gioco (`npm run deploy`) **non tocca** `server/`. Gli aggiornamenti del
centralino si caricano a mano e servono solo un riavvio del servizio:

```bash
sudo systemctl restart digsy-relay
```

Se possibile, un `sudoers` limitato a `systemctl restart digsy-relay` per l'utente
`web_digsy_dev_box_it` eviterebbe di disturbarti a ogni aggiornamento. Non è necessario.

---

Per qualsiasi dubbio: il sorgente del centralino è ~150 righe, sta in
`/var/www/digsy.dev-box.it/relay/relay.js`, e `rooms.js` accanto contiene tutta la logica con i
commenti sul perché di ogni limite.
