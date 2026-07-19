# Bilanciamento — numeri e da dove vengono

> Tarato sui dati reali dei giochi di riferimento, non a occhio. Ogni scelta ha un ancoraggio.
> Da riaffinare coi betatester: qui restano le fonti per capire *perché* un numero è quello.

## 1. Rarità dei ritrovamenti

| | Digsy (peso) | % per ritrovamento | % per scavo (resa ~40%) | Ancoraggio |
|---|---|---|---|---|
| comune | 75 | 75% | ~30% | Stardew: artefatto da artifact spot 15–26% |
| raro | 17,5 | 17,5% | ~7% | fascia "evento della sessione" |
| eccezionale | 6 | 6% | ~2,4% | geode Stardew: ogni minerale 3,125% |
| leggendario | 1,5 | 1,5% | **~0,6%** | Dinosaur Egg 0,6% · Genshin 5★ base 0,6% |

Prima erano **84,7 / 9,9 / 4,4 / 1,1** (i pesi si applicavano alle *specie*, non alle rarità):
i leggendari uscivano 2,7 volte meno del dichiarato. Ora la rarità si estrae per prima.

Sotto lo **0,1% senza protezione** si entra nel territorio Slime Staff di Terraria (0,01%),
citato ovunque come errore di design. Per questo il leggendario sta a 0,6% **con pity**.

## 2. Pity timer (protezione dalla sfortuna)

| Garanzia | Dopo | Perché |
|---|---|---|
| raro | 30 scavi a secco | (1−0,07)³⁰ = 11,6% → colpisce il 12% più sfortunato |
| eccezionale | 90 scavi | (1−0,025)⁹⁰ = 10,3% |
| leggendario | soft pity dal 196°, hard a **280** | Genshin: soft pity al 74 su 90, cioè al 54% dell'attesa media (167) |

Regola presa da Genshin: **non si tara la soglia sulla media, si tara sulla coda** — serve a
tagliare il 10–15% di giocatori più sfortunati, non a cambiare l'esperienza mediana.

## 3. Protezione doppioni (la più importante per un gioco da collezione)

Con 66 specie × 5 pezzi = 330 pezzi, senza protezione il finale è tutto duplicati — la lamentela
storica di Animal Crossing. Da Hearthstone (leggendaria garantita non-duplicata finché il set
non è completo) e dai Fated Engram di Destiny 2:

- specie **mai vista**: peso ×5
- specie con **teca incompleta**: peso ×3
- **parte mancante** di quella specie: scelta nel 75% dei casi

## 4. Energia e giornata

Stardew: 270 energia, 2 per colpo di piccone = **135 azioni al giorno**, +34 per Stardrop
(+12,6%), fino a ×1,88 a fine partita. Digsy resta su 30⚡ + 5 per livello (×1,75 al Lv10):
scala equivalente, giornata più corta perché il ciclo è 20 minuti reali.

**Lezione da Graveyard Keeper** (dove l'energia è la meccanica più odiata): funziona solo se
c'è un orologio che scorre. Se dormire è gratis e sempre ottimale, l'energia è solo un tasto
"salta al mattino". Digsy ha già il vincolo (`canSleep` impone mezza giornata sveglio).

## 5. Costi degli attrezzi

Stardew scala gli upgrade **×2,5 → ×2,0 → ×2,5** (2.000 → 5.000 → 10.000 → 25.000) e lo zaino
**×5** (2.000 → 10.000). Digsy ora:

| | Prima | Ora | Gradino |
|---|---|---|---|
| pala | 15 | 15 | — |
| pala fortunata | 50 | 45 | ×3 |
| bussola | 70 | 70 | ×1,5 |
| accetta | 90 | 90 | ×1,3 |
| torcia | 90 | 110 | ×1,2 |
| pattini | 120 | 130 | ×1,2 |
| piccone | 130 | **200** | ×1,5 |
| barca | 300 | **460** | ×2,3 |
| bici | 350 | 500 | ×1,1 |
| motoscafo | 450 | **1.100** | ×2,2 |

Zaino invariato (45 → 120 → 260, ×2,7 e ×2,2).

## 6. Cooldown delle meraviglie

| Intervallo | Uso | Ancoraggio |
|---|---|---|
| 1 giorno | Yggdrasil, Oasi (energia), Salice (dormire) | Stardew artifact spot, fossili ACNH: giornalieri |
| 2–3 giorni | Bolle, Funghi, Totem, Geyser, Ninfee | via di mezzo fra giornaliero e settimanale |
| 4–5 giorni | Costolame, Filone, Guglia, Aurora | Traveling Cart di Stardew: 2 giorni su 7 |
| mai | Archi (viaggio rapido) | è trasporto, non ricompensa |

Il tempo che manca è **sempre scritto** nel prompt e nel pannello ("riposa ancora 2 giorni"):
i cooldown nascosti sono la prima causa di frustrazione nei cozy game.

## 7. Obiettivo di progressione

Statistiche Steam di Stardew Valley: **44,1%** dei giocatori dona 40 item al museo (42% della
collezione), ma solo **7,1%** la completa. È il target realistico anche qui: le **7 tracce per
zona** (una sala alla volta, con la lettera del nonno come premio) servono a dare un traguardo
chiudibile a chi non finirà mai le 66 specie.

---

### Fonti
Stardew Valley Wiki (Artifact Spot/Chances, Energy, Tools, Geode, Museum) · statistiche
achievement globali Steam di Stardew Valley · Genshin Impact pity system (Game8) · Hearthstone
Wiki (Card pack, pity timer) · Terraria Wiki (Slime Staff 1/10000) · Minecraft Wiki (rarità
posizionale dei diamanti) · Nookipedia (money rock ACNH) · Daniel Cook, *Loot drop best
practices*, Game Developer 2014 · discussioni Steam su Graveyard Keeper (sistema energia).

**Non usati perché non verificabili**: percentuali di completamento del museo in ACNH (Nintendo
non pubblica dati), guadagno orario di Stardew nelle prime ore, valori economici di Moonlighter,
presunte "percentuali standard dell'industria" per i tier di rarità — non esistono.
