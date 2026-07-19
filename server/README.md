# Backend di Digsy — accesso Google e partita in cloud

Quattro file di libreria, due endpoint. Nessuna dipendenza, nessun Composer: PHP 8 con PDO
e curl, che il server ha già.

```
server/
  api/auth.php        accesso Google, chi sono, uscita, cancellazione account
  api/save.php        scarica e carica la partita (con rilevamento conflitti)
  lib/                database, schema, sessioni, utenti, salvataggi, verifica Google
  tests/run.php       suite completa su SQLite — nessun servizio da avviare
  config.example.php  da copiare in config.php e compilare
```

## Messa in opera

**1. Database.** Crea database e utente su MySQL:

```sql
CREATE DATABASE digsy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'digsy'@'localhost' IDENTIFIED BY 'una-password-lunga';
GRANT ALL PRIVILEGES ON digsy.* TO 'digsy'@'localhost';
```

Le tabelle si creano da sole alla prima chiamata (`migrate()`).

**2. Configurazione.** `cp config.example.php config.php` e compila credenziali e client id.
`config.php` è in `.gitignore`: non deve finire nel repository.

**3. Google.** Su [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
crea un progetto, poi *Credenziali → Crea credenziali → ID client OAuth 2.0*, tipo
**Applicazione web**, e metti `https://digsy.dev-box.it` fra le **origini JavaScript
autorizzate**. Copia l'ID client in `config.php`. È gratis.

**4. Dove mettere i file.** Va pubblicata **solo `api/`**. Il modo giusto è tenere il resto
fuori dalla cartella servita dal web:

```
/var/www/digsy/          ← non pubblicata
  server/lib, config.php, data/
/var/www/digsy/public/   ← pubblicata (DocumentRoot)
  index.html, assets/    ← la build del gioco (dist/)
  api/                   ← copia di server/api
```

C'è anche un `.htaccess` che nega config, lib, tests e database, ma è una **rete di
sicurezza, non la difesa**: se PHP smettesse di essere attivo su quella cartella (un
aggiornamento, un vhost cambiato), `config.php` verrebbe servito come testo — password del
database compresa. Tenere i file fuori dalla webroot è l'unica misura che regge da sola.

**5. Prova.** `php server/tests/run.php` deve dire `0 fail`. Poi, dal browser,
`https://digsy.dev-box.it/api/auth.php?do=me` deve rispondere `{"ok":true,"user":null}`.

## Come funziona l'accesso

1. il gioco mostra il pulsante Google e riceve un **ID token**
2. lo manda a `POST /api/auth.php?do=google`
3. **il server lo verifica con Google** e controlla che sia stato emesso *per questa
   applicazione* — senza quel controllo un token ottenuto da un'app qualsiasi varrebbe qui
4. si crea una sessione nostra: cookie `httpOnly` + `Secure` + `SameSite=Lax`, e nel
   database va solo l'**hash** del token
5. da qui in poi Google non serve più

## Il pezzo che conta davvero: i conflitti

Il salvataggio di Digsy è uno stato monolitico, non un elenco di eventi: due partite
divergenti **non si possono fondere**. Se giochi mezz'ora sul telefono senza rete e poi apri
il PC, una delle due deve cedere.

Ogni salvataggio porta un numero di **versione**. Chi salva dichiara da quale versione parte;
se il server è più avanti, la scrittura riceve **409** invece di sovrascrivere, e nella
risposta arriva la partita del server (con giorno e monete in chiaro) così il gioco può
mostrare le due e far scegliere. Solo `force: true` — una scelta esplicita del giocatore —
sovrascrive.

Senza questo, "l'ultimo che scrive vince" cancella ore di gioco senza dire niente.

## Dimensioni reali

| Partita | Peso |
|---|---|
| appena creata | 841 B |
| ~3 ore | 7 KB |
| ~40 ore | 175 KB |

Il limite di scrittura è 4 MB, molto sopra il necessario. Mille giocatori occupano meno di
200 MB.
