# Fair Coin Slots 🐷🎰

Een vrolijke cartoon social slot- & coin-game gebouwd met TypeScript, Vite en Capacitor Android — ontworpen als **eerlijk, anti-verslavend en spotgoedkoop alternatief** voor uitbuitende casino-apps.

## Belangrijkste onderdelen
- **Cartoon Mascotte ("Penny het Geluksvarken")**: reageert live op spins, bonusgames en grote winsten.
- **6 Gokkasten op Level Road**: *Gouden Varken*, *Tropische Piraat*, *Snoep Paleis*, *Farao's Schat*, *Ruimte Katten* en *Diamant Draak* (5x3, 20 winlijnen, Wilds, Scatters voor Gratis Spins, 4 Progressieve Jackpots).
- **Muntengrijper Bonus (Hold & Spin)**: verzamel 5+ munten en draai respins om een heel 5x3 bord vol munten te pakken.
- **Penny's Dorp**: bouw & upgrade 5 cartoongebouwen voor hogere blijvende winst-multipliers.
- **Rad van Fortuin & Gratis Bonussen**: rad-draaien, halfuur-bonussen, dagelijkse reeksen en gratis Reddingsboei als je munten op zijn.
- **Kaartenalbum & Missies**: open gratis schatkisten en maak kaartsets compleet voor miljarden aan speelmunten.
- **Eerlijk Spel & €5 Bescherming**: een transparante simulatie van het €5/maand-model (500B munten + 3x bonussen en een harde €5/maand-limiet) zodat niemand honderden euro's kan verliezen. In deze losse APK wordt **geen echt geld verwerkt**.

## Lokaal bouwen
```bash
npm install
npm run build
npx cap sync android
```

## GitHub Actions
Elke push naar `main` bouwt automatisch `app-debug.apk` en `app-release.aab` via `.github/workflows/android-build.yml`.
