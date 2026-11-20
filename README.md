# Piggy Bank Slots 🐷🎰

A vibrant cartoon social slots, arcade, city-builder & collectibles game built with TypeScript, Vite, and Capacitor Android.

## Key Features
- **3D Studio Slot Machines**: 5×3 themed slot cabinets with 20 paylines, Wilds, Scatters & Free Spins, 4 Progressive Jackpots, Hold & Spin Coin Grab, Lightning City Attacks, Coin King Piggy Heists, and City Shields.
- **Golden Piggy Bank & Free Emergency Refill**: Every spin feeds your Golden Piggy Bank vault, plus a free Emergency Piggy Refill keeps you spinning whenever coins run low.
- **31-Day Monthly Daily Rewards Calendar**: Full 31-day reward track with weekly milestones (Days 7, 14, 21, 28), 1 free weekly Streak Shield, and the Day 31 Grand Monthly Jackpot (+ Joker Card & Mascot Bonus).
- **Arcade & Minigames**: Crash Rocket, Roulette, Hi-Lo, Keno, Gashapon, Plinko, Coin Dozer, Bomb Vault, Lucky Dice, Scratch Cards, Prize Wheel, and Viking Quest.
- **550+ Circular Cities & Royal Club**: Build and upgrade 5-star landmarks across themed worlds, trade with friends, and complete Co-op Club Chests.
- **135-Card Royal Album & 23 Full-Body Mascots**: Open Bronze, Silver & Gold card packs, craft with Duplicate Stars & Joker Cards, and customize 23 animated cartoon mascots with collectible outfits and pets.
- **100% Virtual Coins (No Real-Money Gambling)**: All in-game packages and passes are simulated with virtual coins only — no real money is ever charged or processed.

## Local Build
```bash
npm install
npm run build
npx cap sync android
```

## GitHub Actions
Every push to `main` builds `app-debug.apk` and `app-release.aab` via `.github/workflows/android-build.yml` and publishes `PiggyBankSlots.apk` to GitHub Releases.
