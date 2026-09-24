# Il centralino

Recapita, non simula. Vedi `MULTIPLAYER.md` per le regole del gioco; qui c'è solo come si
mette in piedi.

```
rooms.js    chi c'è in quale stanza e a chi si recapita — PURO, provato da `npm test`
relay.js    il trasporto (WebSocket) — ascolta SOLO su 127.0.0.1
```

Ascolta su `127.0.0.1:17451` e non è raggiungibile da fuori: il mondo esterno ci arriva
attraverso Apache, che fa da proxy su `wss://digsy.dev-box.it/ws`. Il browser, servito da una
pagina https, non accetterebbe comunque un `ws://` in chiaro.

Sta in `/var/www/digsy.dev-box.it/relay/`, **fuori dalla cartella pubblica**: nessuno deve
poter scaricare il sorgente del centralino.

## Una dipendenza, ed è voluta

`ws`, e nient'altro. Il resto del backend non ha dipendenze e ne va fiero, ma scrivere a mano
un server WebSocket vuol dire implementare l'RFC 6455 — handshake, frammentazione, maschere,
ping/pong, chiusura — cioè mettere davanti a internet un parser scritto in casa. `ws` non ha
dipendenze sue ed è lo standard di fatto: è esattamente il pezzo che non ha senso rifare.

## Messa in opera (SERVE ROOT — l'utente `web_digsy_dev_box_it` non ce l'ha)

```bash
# 1 · i moduli di Apache per il proxy WebSocket
sudo a2enmod proxy proxy_http proxy_wstunnel

# 2 · il servizio
sudo cp /var/www/digsy.dev-box.it/relay/digsy-relay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo pkill -f 'node relay.js'          # se ne gira uno avviato a mano, la porta è occupata
sudo systemctl enable --now digsy-relay
systemctl status digsy-relay --no-pager | head -5
```

3 · dentro il vhost `:443` di `digsy.dev-box.it`, due righe:

```apache
    # centralino multiplayer — il processo Node ascolta solo su localhost
    ProxyPass        /ws  ws://127.0.0.1:17451/
    ProxyPassReverse /ws  ws://127.0.0.1:17451/
```

```bash
sudo apache2ctl configtest && sudo systemctl reload apache2
```

## Provare che è vivo

```bash
curl -s http://127.0.0.1:17451/salute      # sul server: {"ok":true,"stanze":0,…}
journalctl -u digsy-relay -n 20 --no-pager
```

## Rilascio degli aggiornamenti

`npm run deploy` **non tocca `server/`** (è escluso apposta). Il centralino si carica a mano:

```bash
scp server/relay/relay.js server/relay/rooms.js digsy:/var/www/digsy.dev-box.it/relay/
ssh digsy 'sudo systemctl restart digsy-relay'
```
