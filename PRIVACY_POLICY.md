# Privacy Policy — Fair Coin Slots

**Last updated:** 2026-11-16  
**Developer:** VaelNTN  
**Package ID:** `com.faircoinslots.game`  
**Repository:** https://github.com/VaelNTN/fair-coin-slots

---

## English (Google Play Store Review)

### 1. Overview & No Real-Money Gambling
Fair Coin Slots is a **100% free virtual-coin cartoon arcade game** created specifically as a safe, zero-cost alternative without predatory monetization:
- **Zero real-money gambling:** Virtual coins have no monetary value and cannot be bought, sold, or cashed out.
- **Zero in-app purchases / microtransactions:** No real money can ever be spent inside the app.
- **Zero advertisements or third-party trackers.**

### 2. Data Stored Locally on Your Device
Your virtual coin balance, free spin state, unlocked cartoon avatar/outfits, display name, and optional custom server URL are stored locally on your device using WebView `localStorage`.

### 3. Online Highscore Leaderboard (Optional)
If online highscores are enabled (via the developer's Cloudflare Worker API), the app transmits only:
- A randomly generated anonymous `deviceId` (created locally on first launch)
- Your chosen display name / nickname
- Your virtual coin/score balance for the public leaderboard

We do **not** collect your real name, email address, payment details, location, contacts, or advertising ID.

### 4. Data Sharing & Selling
We do not sell, rent, or share any user data with advertisers, data brokers, or third parties.

### 5. Data Deletion
- **Local data:** Clear app storage or uninstall the app.
- **Leaderboard entry:** Open an issue on `https://github.com/VaelNTN/fair-coin-slots/issues` mentioning your display name to request removal.

---

## Nederlands

### 1. Overzicht (100% Gratis & Geen Echt Geld)
Fair Coin Slots is een volledig gratis cartoon-spel met uitsluitend virtuele munten zonder waarde:
- **Geen echt geld / geen in-app aankopen:** Je kunt nooit echt geld storten, verliezen of uitbetalen.
- **Geen advertenties of trackers van derden.**

### 2. Lokale opslag & Online Highscores
Je virtuele munten, gratis spins, ontgrendelde cartoon-outfits en spelersnaam worden lokaal opgeslagen (`localStorage`). Voor de online highscore-lijst worden alleen een lokaal gegenereerd `deviceId`, je gekozen spelersnaam en je score naar je eigen Cloudflare Worker gestuurd.
