import './style.css';
import {
  BET_STEPS,
  CARDS,
  CARD_SETS,
  CHARACTER_COLORS,
  CHARACTER_SPECIES_LIST,
  CharacterSpecies,
  formatCoins,
  formatCoinsFull,
  KINGDOM_BUILDINGS,
  QUEST_TEMPLATES,
  SEASON_PASS_STEPS,
  SHOP_ITEMS,
  ShopCategory,
  SLOT_MACHINES,
  SlotMachineTheme,
  SlotSymbol,
  WHEEL_SLICES,
} from './data/machines';
import { CoinDozerController, PlinkoController } from './game/arcadeGames';
import { MascotRenderer } from './game/mascotRenderer';
import { SoundFX } from './game/SoundFX';
import {
  generateHoldCoinValue,
  HoldCoinCell,
  JackpotKey,
  spinReels,
  SpinResult,
} from './game/slotEngine';
import {
  GameState,
  getBuildingUpgradeCost,
  getKingdomLevel,
  getTotalMultiplier,
  grantXp,
  incrementQuest,
  loadGameState,
  openCardChest,
  saveGameState,
  xpNeededForLevel,
} from './storage/state';

type TabId = 'slots' | 'arcade' | 'character' | 'bonuses' | 'fair';
type ArcadeSubTab = 'dozer' | 'plinko' | 'scratch' | 'village';
type BonusSubTab = 'wheel' | 'cards' | 'pass';

const HALF_HOUR_MS = 30 * 60 * 1000;
const WHEEL_COOLDOWN_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

class FairCoinSlotsApp {
  private root: HTMLElement;
  private state: GameState;
  private sfx = new SoundFX();
  private hudCharacter: MascotRenderer | null = null;
  private previewCharacter: MascotRenderer | null = null;
  private dozerCtrl: CoinDozerController | null = null;
  private plinkoCtrl: PlinkoController | null = null;

  private activeTab: TabId = 'slots';
  private arcadeSub: ArcadeSubTab = 'dozer';
  private bonusSub: BonusSubTab = 'wheel';
  private shopCategory: ShopCategory = 'outfit';

  private isSpinning = false;
  private autoSpin = false;
  private turboSpin = false;
  private currentGrid: SlotSymbol[][];
  private winningCells = new Set<string>();
  private lastGambleAmount = 0;

  private wheelAngle = 0;
  private wheelSpinning = false;
  private toastTimer = 0;
  private sessionAlertShown = false;

  // Scratch card local board
  private scratchBoard: { emoji: string; coins: number; spins: number; revealed: boolean }[] = [];
  private plinkoBet = 10_000_000;
  private raidDoneBoard = false;
  private raidRevealed: boolean[] = [false, false, false, false];
  private raidValues: number[] = [];

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = loadGameState();
    this.sfx.enabled = this.state.soundEnabled;

    const machine = this.getActiveMachine();
    this.currentGrid = this.buildInitialGrid(machine);
    this.resetScratchBoard();
    this.resetRaidBoard();

    this.renderShell();
    this.initHudCharacter();
    this.renderAll();
    this.startSessionTicker();
  }

  private getActiveMachine(): SlotMachineTheme {
    return (
      SLOT_MACHINES.find((m) => m.id === this.state.activeMachineId && this.state.level >= m.unlockLevel) ??
      SLOT_MACHINES[0]
    );
  }

  private buildInitialGrid(machine: SlotMachineTheme): SlotSymbol[][] {
    const grid: SlotSymbol[][] = [];
    for (let c = 0; c < 5; c++) {
      const col: SlotSymbol[] = [];
      for (let r = 0; r < 3; r++) {
        col.push(machine.symbols[(c * 3 + r + 3) % machine.symbols.length]);
      }
      grid.push(col);
    }
    return grid;
  }

  private resetScratchBoard(): void {
    const options = [
      { emoji: '🪙', coins: 15_000_000, spins: 0 },
      { emoji: '💰', coins: 40_000_000, spins: 0 },
      { emoji: '💎', coins: 100_000_000, spins: 0 },
      { emoji: '🎟️', coins: 5_000_000, spins: 4 },
      { emoji: '👑', coins: 220_000_000, spins: 0 },
      { emoji: '🍀', coins: 25_000_000, spins: 2 },
    ];
    this.scratchBoard = options
      .sort(() => Math.random() - 0.5)
      .map((o) => ({ ...o, revealed: false }));
  }

  private resetRaidBoard(): void {
    this.raidDoneBoard = false;
    this.raidRevealed = [false, false, false, false];
    this.raidValues = [45_000_000, 95_000_000, 180_000_000, 35_000_000].sort(() => Math.random() - 0.5);
  }

  private renderShell(): void {
    this.root.innerHTML = `
      <header class="hud">
        <div class="mascot-box" id="mascot-tap" title="Tik om je karakter & kleertjes-shop te openen">
          <canvas id="hud-char-canvas" width="90" height="90" style="width:54px;height:54px;"></canvas>
        </div>
        <div class="hud-center">
          <div class="coin-pill">
            <span class="coin-val" id="hud-coins">🪙 1.5B</span>
            <button class="rescue-btn" id="hud-rescue" style="display:none;">+Reddingsboei</button>
          </div>
          <div class="xp-row">
            <span class="lvl-badge" id="hud-lvl">LVL 1</span>
            <div class="xp-track"><div class="xp-fill" id="hud-xp-fill" style="width:0%"></div></div>
            <span id="hud-mult">1.0x</span>
          </div>
        </div>
        <div class="hud-actions">
          <button class="icon-btn" id="btn-sound">🔊</button>
          <span class="session-pill" id="hud-session">0m</span>
        </div>
      </header>

      <main class="main-content">
        <section class="tab-panel active" id="tab-slots"></section>
        <section class="tab-panel" id="tab-arcade"></section>
        <section class="tab-panel" id="tab-character"></section>
        <section class="tab-panel" id="tab-bonuses"></section>
        <section class="tab-panel" id="tab-fair"></section>
      </main>

      <nav class="bottom-nav">
        <button class="nav-btn active" data-tab="slots"><span class="nav-ico">🎰</span><span>Slots</span></button>
        <button class="nav-btn" data-tab="arcade"><span class="nav-ico">🕹️</span><span>Arcade</span></button>
        <button class="nav-btn" data-tab="character"><span class="nav-ico">👕</span><span>Karakter</span></button>
        <button class="nav-btn" data-tab="bonuses"><span class="nav-ico">🎡</span><span>Bonussen</span></button>
        <button class="nav-btn" data-tab="fair"><span class="nav-ico">🛡️</span><span>Eerlijk €5</span></button>
      </nav>

      <div class="modal-backdrop hidden" id="modal-backdrop">
        <div class="modal-box" id="modal-box"></div>
      </div>
    `;

    this.root.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab as TabId));
    });

    const soundBtn = this.root.querySelector<HTMLButtonElement>('#btn-sound')!;
    soundBtn.addEventListener('click', () => {
      this.state.soundEnabled = !this.state.soundEnabled;
      this.sfx.enabled = this.state.soundEnabled;
      soundBtn.textContent = this.state.soundEnabled ? '🔊' : '🔇';
      saveGameState(this.state);
      if (this.state.soundEnabled) this.sfx.playTap();
    });
    soundBtn.textContent = this.state.soundEnabled ? '🔊' : '🔇';

    this.root.querySelector('#mascot-tap')?.addEventListener('click', () => {
      this.switchTab('character');
    });

    this.root.querySelector('#hud-rescue')?.addEventListener('click', () => this.claimRescueBonus());
  }

  private initHudCharacter(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>('#hud-char-canvas');
    if (canvas) {
      this.hudCharacter = new MascotRenderer(canvas);
      this.hudCharacter.setConfig(this.state.character);
    }
  }

  private syncCharacterRenderers(): void {
    this.hudCharacter?.setConfig(this.state.character);
    this.previewCharacter?.setConfig(this.state.character);
  }

  private cleanupSubCanvas(): void {
    this.dozerCtrl?.destroy();
    this.dozerCtrl = null;
    this.plinkoCtrl?.destroy();
    this.plinkoCtrl = null;
    this.previewCharacter?.destroy();
    this.previewCharacter = null;
  }

  private switchTab(tab: TabId): void {
    this.cleanupSubCanvas();
    this.activeTab = tab;
    this.sfx.playTap();
    this.root.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    this.root.querySelectorAll<HTMLElement>('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tab}`);
    });
    this.renderActiveTab();
  }

  private startSessionTicker(): void {
    const updateTimer = () => {
      const mins = Math.floor((Date.now() - this.state.sessionStartAt) / 60_000);
      const pill = this.root.querySelector<HTMLElement>('#hud-session');
      if (pill) pill.textContent = `${mins}m`;
      if (!this.sessionAlertShown && this.state.reminderMinutes > 0 && mins >= this.state.reminderMinutes) {
        this.sessionAlertShown = true;
        this.showToast(`Pauzetip: je speelt al ${mins} minuten. Neem gerust even pauze!`);
      }
      if (this.activeTab === 'bonuses' && this.bonusSub === 'wheel' && !this.wheelSpinning) {
        this.renderBonusesTab();
      }
    };
    updateTimer();
    window.setInterval(updateTimer, 15_000);
  }

  private renderAll(): void {
    this.renderHud();
    this.renderActiveTab();
  }

  private renderHud(): void {
    const coinsEl = this.root.querySelector<HTMLElement>('#hud-coins');
    const lvlEl = this.root.querySelector<HTMLElement>('#hud-lvl');
    const xpFill = this.root.querySelector<HTMLElement>('#hud-xp-fill');
    const multEl = this.root.querySelector<HTMLElement>('#hud-mult');
    const rescueBtn = this.root.querySelector<HTMLButtonElement>('#hud-rescue');

    if (coinsEl) coinsEl.textContent = `🪙 ${formatCoins(this.state.coins)}`;
    if (lvlEl) lvlEl.textContent = `LVL ${this.state.level}`;
    if (xpFill) {
      const needed = xpNeededForLevel(this.state.level);
      const pct = Math.min(100, Math.round((this.state.xp / needed) * 100));
      xpFill.style.width = `${pct}%`;
    }
    if (multEl) multEl.textContent = `${getTotalMultiplier(this.state)}x`;
    if (rescueBtn) {
      rescueBtn.style.display = this.state.coins < BET_STEPS[0] ? 'inline-block' : 'none';
    }
  }

  private renderActiveTab(): void {
    this.cleanupSubCanvas();
    if (this.activeTab === 'slots') this.renderSlotsTab();
    else if (this.activeTab === 'arcade') this.renderArcadeTab();
    else if (this.activeTab === 'character') this.renderCharacterTab();
    else if (this.activeTab === 'bonuses') this.renderBonusesTab();
    else if (this.activeTab === 'fair') this.renderFairTab();
  }

  // ===================== 1. SLOTS TAB =====================
  private renderSlotsTab(bannerText?: string, isBig = false): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-slots')!;
    const machine = this.getActiveMachine();
    const bet = BET_STEPS[this.state.betIndex] ?? BET_STEPS[0];

    panel.innerHTML = `
      <div class="machine-strip">
        ${SLOT_MACHINES.map((m) => {
          const unlocked = this.state.level >= m.unlockLevel;
          const active = m.id === machine.id;
          return `
            <button class="machine-chip ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" data-machine="${m.id}">
              <span>${m.badgeEmoji}</span>
              <span>${m.name}</span>
              ${unlocked ? '' : `<small>🔒L${m.unlockLevel}</small>`}
            </button>
          `;
        }).join('')}
      </div>

      <div class="jackpot-bar">
        <div class="jp-box mini"><div class="jp-label">MINI</div><div class="jp-val">${formatCoins(this.state.jackpots.mini)}</div></div>
        <div class="jp-box minor"><div class="jp-label">MINOR</div><div class="jp-val">${formatCoins(this.state.jackpots.minor)}</div></div>
        <div class="jp-box major"><div class="jp-label">MAJOR</div><div class="jp-val">${formatCoins(this.state.jackpots.major)}</div></div>
        <div class="jp-box grand"><div class="jp-label">GRAND</div><div class="jp-val">${formatCoins(this.state.jackpots.grand)}</div></div>
      </div>

      <div class="slot-quick-bar">
        <button class="piggy-pill" id="btn-piggy-break">🐷 Spaarvarken: ${formatCoins(this.state.piggyBankCoins)} (Gratis!)</button>
        ${
          this.lastGambleAmount > 0 && !this.isSpinning
            ? `<button class="piggy-pill" style="border-color:#06d6a0;" id="btn-gamble-win">🃏 Verdubbel ${formatCoins(this.lastGambleAmount)}?</button>`
            : `<span style="font-size:11px;color:#c7b8e8;">🏆 Toernooi: ${this.state.tournamentPoints} ptn</span>`
        }
      </div>

      <div class="slot-cabinet" style="background:${machine.gradient}; border-color:${machine.frameColor};">
        <div class="cabinet-header">
          <span>${machine.badgeEmoji} ${machine.name} • 20 Lijnen ${machine.wildMultiplier ? `• ${machine.wildMultiplier}x WILD` : ''}</span>
          ${
            this.state.freeSpins > 0
              ? `<span class="freespin-pill">🎟️ ${this.state.freeSpins} GRATIS (${this.state.freeSpinMultiplier}x)</span>`
              : `<span style="font-size:11px;color:${machine.accent};">5+ 🪙 = Bonusspel!</span>`
          }
        </div>

        <div class="reels-grid" id="reels-grid">
          ${this.currentGrid
            .map(
              (col, cIdx) => `
            <div class="reel-col" data-col="${cIdx}">
              ${col
                .map((sym, rIdx) => {
                  const isWin = this.winningCells.has(`${cIdx}-${rIdx}`);
                  return `
                    <div class="reel-cell ${isWin ? 'win-glow' : ''}" style="background:${sym.bg};">
                      <span class="sym-emoji">${sym.emoji}</span>
                      <span class="sym-tag">${sym.label}</span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `
            )
            .join('')}
        </div>

        <div class="win-banner ${isBig ? 'big' : ''}" id="win-banner">
          ${bannerText ?? 'Tik op DRAAI! 3x 🎟️ = Gratis Spins • 5+ 🪙 = Muntengrijper'}
        </div>
      </div>

      <div class="controls-bar">
        <div class="bet-box">
          <button class="bet-step-btn" id="btn-bet-down">−</button>
          <div class="bet-display">
            <small>INZET</small>
            <strong>${formatCoins(bet)}</strong>
          </div>
          <button class="bet-step-btn" id="btn-bet-up">+</button>
        </div>

        <button class="mini-toggle ${this.turboSpin ? 'active' : ''}" id="btn-turbo">⚡</button>
        <button class="mini-toggle ${this.autoSpin ? 'active' : ''}" id="btn-auto">AUTO</button>
        <button class="spin-btn ${this.state.freeSpins > 0 ? 'freespin-mode' : ''}" id="btn-spin">
          ${this.state.freeSpins > 0 ? `GRATIS (${this.state.freeSpins})` : 'DRAAI'}
        </button>
      </div>
    `;

    panel.querySelectorAll<HTMLButtonElement>('.machine-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.isSpinning) return;
        const target = SLOT_MACHINES.find((m) => m.id === btn.dataset.machine);
        if (!target) return;
        if (this.state.level < target.unlockLevel) {
          this.showToast(`Bereik Level ${target.unlockLevel} om ${target.name} te openen!`);
          return;
        }
        this.state.activeMachineId = target.id;
        this.currentGrid = this.buildInitialGrid(target);
        this.winningCells.clear();
        this.lastGambleAmount = 0;
        this.sfx.playTap();
        saveGameState(this.state);
        this.renderSlotsTab(`${target.badgeEmoji} Welkom bij ${target.name}!`);
      });
    });

    panel.querySelector('#btn-piggy-break')?.addEventListener('click', () => {
      if (this.state.piggyBankCoins < 10_000_000) {
        this.showToast(`Spaarvarken groeit elke spin! (Vanaf 10M gratis open te breken)`);
        return;
      }
      const payout = this.state.piggyBankCoins;
      this.state.coins += payout;
      this.state.piggyBankCoins = 5_000_000;
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnCoinShower(18);
      this.showToast(`🐷 Gratis Spaarvarken opengebroken! +${formatCoins(payout)} munten (zonder €4,99 onzin!)`);
      this.renderAll();
    });

    panel.querySelector('#btn-gamble-win')?.addEventListener('click', () => this.openGambleModal());

    panel.querySelector('#btn-bet-down')?.addEventListener('click', () => {
      if (this.isSpinning) return;
      if (this.state.betIndex > 0) {
        this.state.betIndex--;
        this.sfx.playTap();
        saveGameState(this.state);
        this.renderSlotsTab();
      }
    });

    panel.querySelector('#btn-bet-up')?.addEventListener('click', () => {
      if (this.isSpinning) return;
      if (this.state.betIndex < BET_STEPS.length - 1) {
        this.state.betIndex++;
        this.sfx.playTap();
        saveGameState(this.state);
        this.renderSlotsTab();
      }
    });

    panel.querySelector('#btn-turbo')?.addEventListener('click', () => {
      this.turboSpin = !this.turboSpin;
      this.sfx.playTap();
      this.renderSlotsTab();
    });

    panel.querySelector('#btn-auto')?.addEventListener('click', () => {
      this.autoSpin = !this.autoSpin;
      this.sfx.playTap();
      this.renderSlotsTab();
      if (this.autoSpin && !this.isSpinning) this.triggerSpin();
    });

    panel.querySelector('#btn-spin')?.addEventListener('click', () => this.triggerSpin());
  }

  private openGambleModal(): void {
    const amount = this.lastGambleAmount;
    if (amount <= 0) return;
    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    box.innerHTML = `
      <h2 style="margin:0;color:#ffd166;">🃏 Verdubbel Je Winst!</h2>
      <p style="margin:0;font-size:13px;color:#c7b8e8;">
        Huidige winst inzetbaar: <b>🪙 ${formatCoins(amount)}</b>.<br/>
        Kies Rood of Zwart voor <b>2x (${formatCoins(amount * 2)})</b> — volledig vrijwillig!
      </p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="action-btn pink" id="gamble-red">♥️ ROOD (2x)</button>
        <button class="action-btn secondary" id="gamble-black">♠️ ZWART (2x)</button>
      </div>
      <button class="action-btn green" id="gamble-keep">Nee bedankt, winst houden</button>
    `;

    const resolve = (choice: 'red' | 'black') => {
      const cardIsRed = Math.random() < 0.5;
      const won = (choice === 'red' && cardIsRed) || (choice === 'black' && !cardIsRed);
      this.lastGambleAmount = 0;
      if (won) {
        this.state.coins += amount; // extra +1x on top of already-credited amount
        this.state.totalWon += amount;
        this.sfx.playBigWin();
        this.spawnCoinShower(18);
        this.showToast(`🎉 ${cardIsRed ? '♥️ Rood' : '♠️ Zwart'}! Je winst is verdubbeld met +${formatCoins(amount)}!`);
      } else {
        this.state.coins = Math.max(0, this.state.coins - amount);
        this.sfx.playReelStop(0);
        this.showToast(`Helaas, het was ${cardIsRed ? '♥️ Rood' : '♠️ Zwart'}.`);
      }
      saveGameState(this.state);
      backdrop.classList.add('hidden');
      this.renderAll();
    };

    box.querySelector('#gamble-red')?.addEventListener('click', () => resolve('red'));
    box.querySelector('#gamble-black')?.addEventListener('click', () => resolve('black'));
    box.querySelector('#gamble-keep')?.addEventListener('click', () => {
      this.lastGambleAmount = 0;
      backdrop.classList.add('hidden');
      this.renderSlotsTab();
    });
  }

  private async triggerSpin(): Promise<void> {
    if (this.isSpinning) return;

    const bet = BET_STEPS[this.state.betIndex] ?? BET_STEPS[0];
    const usingFreeSpin = this.state.freeSpins > 0;

    if (!usingFreeSpin && this.state.coins < bet) {
      if (this.state.coins < BET_STEPS[0]) {
        this.autoSpin = false;
        this.claimRescueBonus();
        return;
      }
      while (this.state.betIndex > 0 && BET_STEPS[this.state.betIndex] > this.state.coins) {
        this.state.betIndex--;
      }
      this.showToast('Inzet aangepast naar je beschikbare munten.');
      this.renderSlotsTab();
      return;
    }

    this.isSpinning = true;
    this.lastGambleAmount = 0;
    this.winningCells.clear();
    this.hudCharacter?.setMood('spinning');
    this.sfx.playSpinStart();

    if (usingFreeSpin) this.state.freeSpins -= 1;
    else this.state.coins -= bet;

    this.state.jackpots.mini += Math.round(bet * 0.015);
    this.state.jackpots.minor += Math.round(bet * 0.025);
    this.state.jackpots.major += Math.round(bet * 0.04);
    this.state.jackpots.grand += Math.round(bet * 0.06);
    this.state.totalSpins += 1;
    this.state.tournamentPoints += Math.max(10, Math.round(Math.log10(Math.max(10, bet)) * 8));
    incrementQuest(this.state, 'spins', 1);

    this.renderHud();

    const machine = this.getActiveMachine();
    const result = spinReels({
      machine,
      bet,
      isFreeSpin: usingFreeSpin,
      freeSpinMultiplier: this.state.freeSpinMultiplier,
      kingdomMultiplier: getTotalMultiplier(this.state),
      jackpots: this.state.jackpots,
    });

    this.state.piggyBankCoins += result.piggyDeposit;

    const colEls = Array.from(this.root.querySelectorAll<HTMLElement>('.reel-col'));
    colEls.forEach((el) => el.classList.add('spinning'));

    const stepDelay = this.turboSpin ? 95 : 210;
    const baseDelay = this.turboSpin ? 180 : 380;

    for (let c = 0; c < 5; c++) {
      await this.wait(c === 0 ? baseDelay : stepDelay);
      this.currentGrid[c] = result.grid[c];
      const colEl = colEls[c];
      if (colEl) {
        colEl.classList.remove('spinning');
        colEl.innerHTML = result.grid[c]
          .map(
            (sym) => `
          <div class="reel-cell" style="background:${sym.bg};">
            <span class="sym-emoji">${sym.emoji}</span>
            <span class="sym-tag">${sym.label}</span>
          </div>
        `
          )
          .join('');
      }
      this.sfx.playReelStop(c);
    }

    await this.applySpinOutcome(result, bet);
    this.isSpinning = false;

    if (this.autoSpin && !result.triggerHoldAndSpin && this.activeTab === 'slots') {
      setTimeout(() => {
        if (this.autoSpin && !this.isSpinning) this.triggerSpin();
      }, this.turboSpin ? 260 : 650);
    }
  }

  private async applySpinOutcome(result: SpinResult, bet: number): Promise<void> {
    if (result.totalWin > 0) {
      this.state.coins += result.totalWin;
      this.state.totalWon += result.totalWin;
      incrementQuest(this.state, 'wins', 1);
      if (!result.jackpotWon && !this.autoSpin) {
        this.lastGambleAmount = result.totalWin;
      }
    }

    if (result.jackpotWon) {
      const defaults: Record<JackpotKey, number> = {
        mini: 45_000_000,
        minor: 280_000_000,
        major: 1_500_000_000,
        grand: 12_500_000_000,
      };
      this.state.jackpots[result.jackpotWon.key] = defaults[result.jackpotWon.key];
    }

    if (result.awardedFreeSpins > 0) {
      this.state.freeSpins += result.awardedFreeSpins;
      this.state.freeSpinMultiplier = this.state.fairPassActive ? 3 : 2;
    }

    result.winningLines.forEach((wl) => {
      for (let c = 0; c < wl.matchCount; c++) {
        this.winningCells.add(`${c}-${wl.rows[c]}`);
      }
    });

    const xpInfo = grantXp(this.state, result.xpGain);
    saveGameState(this.state);

    let msg = 'Geen winst deze draai — probeer nog eens!';
    let isBig = false;

    if (result.jackpotWon) {
      msg = `🏆 ${result.jackpotWon.key.toUpperCase()} JACKPOT! +${formatCoins(result.totalWin)} munten!`;
      isBig = true;
      this.hudCharacter?.setMood('bigwin');
      this.sfx.playBigWin();
      this.spawnCoinShower(28);
    } else if (result.winTier === 'epic' || result.winTier === 'mega' || result.winTier === 'big') {
      const label =
        result.winTier === 'epic' ? 'EPISCHE WINST' : result.winTier === 'mega' ? 'MEGA WINST' : 'GROTE WINST';
      msg = `🎉 ${label}! +${formatCoins(result.totalWin)} munten!`;
      isBig = true;
      this.hudCharacter?.setMood('bigwin');
      this.sfx.playBigWin();
      this.spawnCoinShower(22);
    } else if (result.totalWin > 0) {
      msg = `✨ Gewonnen: +${formatCoins(result.totalWin)} munten (${result.winningLines.length} lijn${result.winningLines.length === 1 ? '' : 'en'})`;
      this.hudCharacter?.setMood('bonus');
      this.sfx.playWin();
      this.spawnCoinShower(8);
    } else {
      this.hudCharacter?.setMood('idle');
    }

    if (result.awardedFreeSpins > 0) {
      msg += ` • +${result.awardedFreeSpins} Gratis Spins!`;
      isBig = true;
    }

    this.renderHud();
    if (this.activeTab === 'slots') this.renderSlotsTab(msg, isBig);

    if (xpInfo.leveledUp) {
      this.showToast(`🆙 Level ${xpInfo.newLevel}! +${formatCoins(xpInfo.levelReward)} munten & +1 Kist!`);
    }

    if (result.triggerHoldAndSpin) {
      this.autoSpin = false;
      incrementQuest(this.state, 'holdAndSpin', 1);
      saveGameState(this.state);
      await this.runHoldAndSpinBonus(result.coinPositions, bet);
    } else {
      setTimeout(() => {
        if (!this.isSpinning) this.hudCharacter?.setMood('idle');
      }, 1500);
    }
  }

  private async runHoldAndSpinBonus(initialCoins: HoldCoinCell[], bet: number): Promise<void> {
    this.hudCharacter?.setMood('bonus');
    this.sfx.playBigWin();

    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    const cells: (number | null)[] = Array(15).fill(null);
    initialCoins.forEach((c) => {
      cells[c.row * 5 + c.col] = c.value;
    });
    let respinsLeft = 3;

    const renderModal = (finished: boolean, grandExtra = 0) => {
      const sum = cells.reduce<number>((acc, v) => acc + (v ?? 0), 0) + grandExtra;
      box.innerHTML = `
        <h2 style="margin:0;color:#ffd166;">🪙 MUNTENGRIJP BONUS!</h2>
        <p style="margin:0;font-size:13px;color:#c7b8e8;">
          ${finished ? 'Bonus voltooid! Alle munten zijn voor jou!' : `Elke nieuwe munt zet de teller terug op 3! Nog <b>${respinsLeft}</b> respins.`}
        </p>
        <div class="hold-grid">
          ${cells
            .map(
              (val) => `
            <div class="hold-cell ${val !== null ? 'locked' : ''}">
              ${val !== null ? `<span>🪙</span><span>${formatCoins(val)}</span>` : '<span style="opacity:0.35">?</span>'}
            </div>
          `
            )
            .join('')}
        </div>
        <div style="font-size:16px;font-weight:900;color:#06d6a0;">Totaal: +${formatCoins(sum)} munten</div>
        <button class="action-btn" id="hold-action-btn">${finished ? 'Claim & Speel Verder!' : 'Spin Respin!'}</button>
      `;

      box.querySelector<HTMLButtonElement>('#hold-action-btn')!.addEventListener('click', () => {
        if (finished) {
          this.state.coins += sum;
          this.state.totalWon += sum;
          saveGameState(this.state);
          backdrop.classList.add('hidden');
          this.hudCharacter?.setMood('idle');
          this.spawnCoinShower(24);
          this.renderAll();
          return;
        }
        let added = false;
        for (let i = 0; i < cells.length; i++) {
          if (cells[i] === null && Math.random() < 0.28) {
            cells[i] = generateHoldCoinValue(bet);
            added = true;
          }
        }
        if (added) {
          respinsLeft = 3;
          this.sfx.playCoin();
        } else {
          respinsLeft -= 1;
          this.sfx.playReelStop(1);
        }
        const full = cells.every((c) => c !== null);
        if (full || respinsLeft <= 0) {
          const bonus = full ? this.state.jackpots.minor : 0;
          this.sfx.playBigWin();
          renderModal(true, bonus);
        } else {
          renderModal(false);
        }
      });
    };

    renderModal(false);
  }

  // ===================== 2. ARCADE TAB (Dozer, Plinko, Kraslot, Dorp & Raid) =====================
  private renderArcadeTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-arcade')!;
    panel.innerHTML = `
      <div class="subtab-strip">
        <button class="subtab-btn ${this.arcadeSub === 'dozer' ? 'active' : ''}" data-sub="dozer">🪙 Muntschuiver</button>
        <button class="subtab-btn ${this.arcadeSub === 'plinko' ? 'active' : ''}" data-sub="plinko">🟢 Plinko</button>
        <button class="subtab-btn ${this.arcadeSub === 'scratch' ? 'active' : ''}" data-sub="scratch">🎫 Kraslot</button>
        <button class="subtab-btn ${this.arcadeSub === 'village' ? 'active' : ''}" data-sub="village">🏘️ Dorp & Raid</button>
      </div>
      <div id="arcade-body" style="display:flex;flex-direction:column;gap:10px;"></div>
    `;

    panel.querySelectorAll<HTMLButtonElement>('[data-sub]').forEach((b) => {
      b.addEventListener('click', () => {
        this.arcadeSub = b.dataset.sub as ArcadeSubTab;
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    const body = panel.querySelector<HTMLElement>('#arcade-body')!;
    if (this.arcadeSub === 'dozer') this.renderDozer(body);
    else if (this.arcadeSub === 'plinko') this.renderPlinko(body);
    else if (this.arcadeSub === 'scratch') this.renderScratchAndDice(body);
    else this.renderVillageAndRaid(body);
  }

  private renderDozer(body: HTMLElement): void {
    body.innerHTML = `
      <div class="card" style="align-items:center;text-align:center;">
        <h2>🪙 Muntschuiver (Coin Dozer)</h2>
        <p>Tik op het bord of druk op de knop om een 1M munt te gooien! Duw stapels munten, 💎 diamanten, 🎟️ spins & 🎁 kisten over de rand.</p>
        <canvas id="dozer-canvas" width="300" height="250" style="border-radius:14px;border:2px solid #ffd166;cursor:pointer;max-width:100%;"></canvas>
        <button class="action-btn" id="btn-dozer-drop">Gooi Munt (1M) of tik op bord!</button>
      </div>
    `;

    const canvas = body.querySelector<HTMLCanvasElement>('#dozer-canvas')!;
    this.dozerCtrl = new CoinDozerController(canvas, {
      onDropCost: (cost) => {
        if (this.state.coins < cost) {
          this.showToast('Te weinig munten — gebruik de gratis Reddingsboei!');
          return false;
        }
        this.state.coins -= cost;
        incrementQuest(this.state, 'arcade', 1);
        saveGameState(this.state);
        this.renderHud();
        return true;
      },
      onScoreCoins: (c, chests, spins) => {
        this.state.coins += c;
        this.state.chests += chests;
        this.state.freeSpins += spins;
        saveGameState(this.state);
        this.renderHud();
        if (chests > 0 || spins > 0 || c >= 10_000_000) {
          this.showToast(`🪙 Muntschuiver prijs: +${formatCoins(c)}${chests ? ` +${chests}🎁` : ''}${spins ? ` +${spins}🎟️` : ''}`);
        }
      },
      playCoin: () => this.sfx.playCoin(),
      playWin: () => this.sfx.playWin(),
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.dozerCtrl?.dropCoin((e.clientX - rect.left) / rect.width);
    });
    body.querySelector('#btn-dozer-drop')?.addEventListener('click', () => {
      this.dozerCtrl?.dropCoin(0.3 + Math.random() * 0.4);
    });
  }

  private renderPlinko(body: HTMLElement): void {
    body.innerHTML = `
      <div class="card" style="align-items:center;text-align:center;">
        <h2>🟢 Plinko Ballenval</h2>
        <p>Laat ballen door de pinnen vallen naar de vermenigvuldigers tot <b>15x</b>!</p>
        <div class="subtab-strip" style="justify-content:center;">
          ${[1_000_000, 10_000_000, 50_000_000, 250_000_000]
            .map(
              (amt) =>
                `<button class="subtab-btn ${this.plinkoBet === amt ? 'active' : ''}" data-pbet="${amt}">${formatCoins(amt)}</button>`
            )
            .join('')}
        </div>
        <canvas id="plinko-canvas" width="300" height="260" style="border-radius:14px;border:2px solid #4cc9f0;max-width:100%;"></canvas>
        <button class="action-btn green" id="btn-plinko-drop">Laat Bal Vallen (Inzet: ${formatCoins(this.plinkoBet)})</button>
      </div>
    `;

    body.querySelectorAll<HTMLButtonElement>('[data-pbet]').forEach((b) => {
      b.addEventListener('click', () => {
        this.plinkoBet = Number(b.dataset.pbet);
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    const canvas = body.querySelector<HTMLCanvasElement>('#plinko-canvas')!;
    this.plinkoCtrl = new PlinkoController(
      canvas,
      (payout, mult) => {
        this.state.coins += payout;
        this.state.totalWon += payout;
        saveGameState(this.state);
        this.renderHud();
        if (mult >= 4) {
          this.sfx.playBigWin();
          this.spawnCoinShower(14);
          this.showToast(`🟢 Plinko ${mult}x! +${formatCoins(payout)} munten!`);
        } else {
          this.sfx.playWin();
        }
      },
      () => this.sfx.playWheelTick()
    );

    body.querySelector('#btn-plinko-drop')?.addEventListener('click', () => {
      if (this.state.coins < this.plinkoBet) {
        this.showToast('Te weinig munten voor deze Plinko-inzet!');
        return;
      }
      this.state.coins -= this.plinkoBet;
      incrementQuest(this.state, 'arcade', 1);
      saveGameState(this.state);
      this.renderHud();
      this.plinkoCtrl?.dropBall(this.plinkoBet);
    });
  }

  private renderScratchAndDice(body: HTMLElement): void {
    const allDone = this.scratchBoard.every((s) => s.revealed);
    body.innerHTML = `
      <div class="card">
        <h2>🎫 Geluks-Kraslot (Gratis!)</h2>
        <p>Kras alle 6 vakjes open voor directe miljoenen munten en gratis spins!</p>
        <div class="scratch-grid">
          ${this.scratchBoard
            .map((cell, idx) =>
              cell.revealed
                ? `<div class="scratch-tile revealed"><span>${cell.emoji}</span><span style="font-size:11px;">+${formatCoins(cell.coins)}${cell.spins ? ` +${cell.spins}🎟️` : ''}</span></div>`
                : `<button class="scratch-tile" data-scratch="${idx}">❓ KRAS</button>`
            )
            .join('')}
        </div>
        ${allDone ? `<button class="action-btn" id="btn-new-scratch">Nieuw Gratis Kraslot!</button>` : ''}
      </div>

      <div class="card">
        <h3>🎲 Hoger / Lager Dobbelen</h3>
        <p>Gooi 2 dobbelstenen (inzet 20M): gooi 7 of hoger en win <b>45M</b>!</p>
        <button class="action-btn secondary" id="btn-roll-dice">🎲 Gooi Dobbelstenen (20M → 45M)</button>
      </div>
    `;

    body.querySelectorAll<HTMLButtonElement>('[data-scratch]').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = Number(b.dataset.scratch);
        const tile = this.scratchBoard[idx];
        if (!tile || tile.revealed) return;
        tile.revealed = true;
        this.state.coins += tile.coins;
        this.state.freeSpins += tile.spins;
        incrementQuest(this.state, 'arcade', 1);
        saveGameState(this.state);
        this.sfx.playCoin();
        this.renderHud();
        this.renderArcadeTab();
      });
    });

    body.querySelector('#btn-new-scratch')?.addEventListener('click', () => {
      this.resetScratchBoard();
      this.sfx.playTap();
      this.renderArcadeTab();
    });

    body.querySelector('#btn-roll-dice')?.addEventListener('click', () => {
      const stake = 20_000_000;
      if (this.state.coins < stake) {
        this.showToast('Minimaal 20M munten nodig om te dobbelen.');
        return;
      }
      this.state.coins -= stake;
      const d1 = 1 + Math.floor(Math.random() * 6);
      const d2 = 1 + Math.floor(Math.random() * 6);
      const sum = d1 + d2;
      incrementQuest(this.state, 'arcade', 1);
      if (sum >= 7) {
        this.state.coins += 45_000_000;
        this.sfx.playBigWin();
        this.spawnCoinShower(10);
        this.showToast(`🎲 ${d1} + ${d2} = ${sum}! Gewonnen: +45M munten!`);
      } else {
        this.sfx.playReelStop(0);
        this.showToast(`🎲 ${d1} + ${d2} = ${sum}. Onder 7 — volgende keer beter!`);
      }
      saveGameState(this.state);
      this.renderHud();
    });
  }

  private renderVillageAndRaid(body: HTMLElement): void {
    const kingdomLvl = getKingdomLevel(this.state);
    const mult = getTotalMultiplier(this.state);

    body.innerHTML = `
      <div class="card">
        <h2>🏴‍☠️ Schatgraver Raid (Coin Master-stijl)</h2>
        <p>Graaf op 3 plekken in het dorp van rivaal <b>Koning Krokodil 🐊</b>! Je hebt ook <b>${this.state.shields} 🛡️ schilden</b>.</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          ${this.raidValues
            .map((val, i) =>
              this.raidRevealed[i]
                ? `<div class="scratch-tile revealed"><span>💰</span><span style="font-size:11px;">+${formatCoins(val)}</span></div>`
                : `<button class="scratch-tile" data-raid="${i}" ${this.raidDoneBoard ? 'disabled' : ''}>❌ GRAAF</button>`
            )
            .join('')}
        </div>
        ${this.raidDoneBoard ? `<button class="action-btn" id="btn-next-raid">Nieuwe Rival Zoeken!</button>` : ''}
      </div>

      <div class="card">
        <h2>🏘️ Mijn Dorp (Niveau ${kingdomLvl} • ${mult}x Winst)</h2>
        <p>Upgrade je gebouwen met speelmunten voor hogere blijvende multipliers!</p>
        ${KINGDOM_BUILDINGS.map((b) => {
          const lvl = this.state.buildings[b.id] ?? 1;
          const isMax = lvl >= b.maxLevel;
          const cost = getBuildingUpgradeCost(b.baseCost, lvl);
          const canAfford = this.state.coins >= cost;
          return `
            <div class="building-row">
              <div class="building-icon">${b.emoji}</div>
              <div class="building-info">
                <strong>${b.name} (Lvl ${lvl}/${b.maxLevel})</strong>
                <small>${b.description}</small>
              </div>
              <button class="action-btn ${canAfford && !isMax ? '' : 'secondary'}" data-build="${b.id}" ${isMax || !canAfford ? 'disabled' : ''}>
                ${isMax ? 'MAX' : `🪙 ${formatCoins(cost)}`}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;

    body.querySelectorAll<HTMLButtonElement>('[data-raid]').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = Number(b.dataset.raid);
        if (this.raidRevealed[idx] || this.raidDoneBoard) return;
        this.raidRevealed[idx] = true;
        const loot = this.raidValues[idx];
        this.state.coins += loot;
        this.state.shields = Math.min(3, this.state.shields + (Math.random() < 0.35 ? 1 : 0));
        incrementQuest(this.state, 'arcade', 1);
        if (this.raidRevealed.filter(Boolean).length >= 3) {
          this.raidDoneBoard = true;
        }
        saveGameState(this.state);
        this.sfx.playBigWin();
        this.spawnCoinShower(12);
        this.showToast(`🏴‍☠️ Schat opgegraven: +${formatCoins(loot)} munten!`);
        this.renderHud();
        this.renderArcadeTab();
      });
    });

    body.querySelector('#btn-next-raid')?.addEventListener('click', () => {
      this.resetRaidBoard();
      this.sfx.playTap();
      this.renderArcadeTab();
    });

    body.querySelectorAll<HTMLButtonElement>('[data-build]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.build!;
        const b = KINGDOM_BUILDINGS.find((x) => x.id === id);
        if (!b) return;
        const lvl = this.state.buildings[id] ?? 1;
        if (lvl >= b.maxLevel) return;
        const cost = getBuildingUpgradeCost(b.baseCost, lvl);
        if (this.state.coins < cost) return;
        this.state.coins -= cost;
        this.state.buildings[id] = lvl + 1;
        incrementQuest(this.state, 'upgrades', 1);
        grantXp(this.state, 90);
        saveGameState(this.state);
        this.sfx.playUpgrade();
        this.spawnCoinShower(10);
        this.showToast(`🔨 ${b.name} naar Level ${lvl + 1}! Multiplier nu ${getTotalMultiplier(this.state)}x`);
        this.renderAll();
      });
    });
  }

  // ===================== 3. KARAKTER & KLEERTJES-SHOP TAB =====================
  private renderCharacterTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-character')!;
    const c = this.state.character;
    const catLabels: { id: ShopCategory; label: string }[] = [
      { id: 'outfit', label: '👕 Kleertjes' },
      { id: 'hat', label: '👑 Hoeden' },
      { id: 'eyewear', label: '🕶️ Brillen' },
      { id: 'prop', label: '💰 Hand' },
      { id: 'aura', label: '✨ Aura' },
    ];
    const items = SHOP_ITEMS.filter((i) => i.category === this.shopCategory);

    panel.innerHTML = `
      <div class="char-stage">
        <canvas id="preview-char-canvas" width="180" height="180" style="width:140px;height:140px;"></canvas>
        <div style="font-size:14px;font-weight:900;color:#ffd166;">Jouw Eigen Cartoon Karakter</div>
        <div class="subtab-strip" style="justify-content:center;max-width:100%;">
          ${CHARACTER_SPECIES_LIST.map(
            (sp) => `
            <button class="subtab-btn ${c.species === sp.id ? 'active' : ''}" data-species="${sp.id}">
              ${sp.emoji} ${sp.name}
            </button>
          `
          ).join('')}
        </div>
        <div class="swatch-row">
          ${CHARACTER_COLORS.map(
            (col) => `
            <button class="color-swatch ${c.colorId === col.id ? 'active' : ''}" data-charcolor="${col.id}" style="background:${col.primary};" title="${col.name}"></button>
          `
          ).join('')}
        </div>
      </div>

      <div class="card">
        <h2>🛍️ Kleertjes- & Accessoires-Shop</h2>
        <p>Elk kledingstuk of accessoire kost maar <b>duizenden muntjes</b> (1.500 – 45.000) zodat je alles kunt verzamelen!</p>
        <div class="subtab-strip">
          ${catLabels
            .map(
              (cat) => `
            <button class="subtab-btn ${this.shopCategory === cat.id ? 'active' : ''}" data-shopcat="${cat.id}">${cat.label}</button>
          `
            )
            .join('')}
        </div>
        <div class="shop-grid">
          ${items
            .map((item) => {
              const owned = this.state.ownedShopItems.includes(item.id) || item.priceCoins === 0;
              const equipped = this.isItemEquipped(item.category, item.id);
              const priceLabel = item.priceCoins === 0 ? 'Gratis' : `🪙 ${item.priceCoins.toLocaleString('nl-NL')}`;
              return `
                <div class="shop-item ${equipped ? 'equipped' : ''}">
                  <div class="s-emoji">${item.emoji}</div>
                  <div class="s-name">${item.name}</div>
                  <div class="s-desc">${item.description}</div>
                  <button class="action-btn ${equipped ? 'green' : owned ? 'secondary' : ''}" data-shopitem="${item.id}" style="width:100%;">
                    ${equipped ? '✓ Aan' : owned ? 'Aantrekken' : `Koop ${priceLabel}`}
                  </button>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    const previewCanvas = panel.querySelector<HTMLCanvasElement>('#preview-char-canvas');
    if (previewCanvas) {
      this.previewCharacter = new MascotRenderer(previewCanvas);
      this.previewCharacter.setConfig(this.state.character);
    }

    panel.querySelectorAll<HTMLButtonElement>('[data-species]').forEach((b) => {
      b.addEventListener('click', () => {
        this.state.character.species = b.dataset.species as CharacterSpecies;
        saveGameState(this.state);
        this.sfx.playTap();
        this.syncCharacterRenderers();
        this.renderCharacterTab();
      });
    });

    panel.querySelectorAll<HTMLButtonElement>('[data-charcolor]').forEach((b) => {
      b.addEventListener('click', () => {
        this.state.character.colorId = b.dataset.charcolor!;
        saveGameState(this.state);
        this.sfx.playTap();
        this.syncCharacterRenderers();
        this.renderCharacterTab();
      });
    });

    panel.querySelectorAll<HTMLButtonElement>('[data-shopcat]').forEach((b) => {
      b.addEventListener('click', () => {
        this.shopCategory = b.dataset.shopcat as ShopCategory;
        this.sfx.playTap();
        this.renderCharacterTab();
      });
    });

    panel.querySelectorAll<HTMLButtonElement>('[data-shopitem]').forEach((b) => {
      b.addEventListener('click', () => {
        const item = SHOP_ITEMS.find((x) => x.id === b.dataset.shopitem);
        if (!item) return;
        const owned = this.state.ownedShopItems.includes(item.id) || item.priceCoins === 0;
        if (!owned) {
          if (this.state.coins < item.priceCoins) {
            this.showToast(`Je hebt ${item.priceCoins.toLocaleString('nl-NL')} munten nodig!`);
            return;
          }
          this.state.coins -= item.priceCoins;
          this.state.ownedShopItems.push(item.id);
          this.sfx.playUpgrade();
          this.showToast(`🛍️ ${item.name} gekocht voor ${item.priceCoins.toLocaleString('nl-NL')} munten en aangetrokken!`);
        } else {
          this.sfx.playTap();
        }
        this.equipItem(item.category, item.id);
        saveGameState(this.state);
        this.syncCharacterRenderers();
        this.renderHud();
        this.renderCharacterTab();
      });
    });
  }

  private isItemEquipped(cat: ShopCategory, id: string): boolean {
    if (cat === 'hat') return this.state.character.hatId === id;
    if (cat === 'eyewear') return this.state.character.eyewearId === id;
    if (cat === 'outfit') return this.state.character.outfitId === id;
    if (cat === 'prop') return this.state.character.propId === id;
    return this.state.character.auraId === id;
  }

  private equipItem(cat: ShopCategory, id: string): void {
    if (cat === 'hat') this.state.character.hatId = id;
    else if (cat === 'eyewear') this.state.character.eyewearId = id;
    else if (cat === 'outfit') this.state.character.outfitId = id;
    else if (cat === 'prop') this.state.character.propId = id;
    else this.state.character.auraId = id;
  }

  // ===================== 4. BONUSSEN TAB (Rad, Kaarten & Missies, Pas & Toernooi) =====================
  private renderBonusesTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-bonuses')!;
    panel.innerHTML = `
      <div class="subtab-strip">
        <button class="subtab-btn ${this.bonusSub === 'wheel' ? 'active' : ''}" data-bsub="wheel">🎡 Rad & Timers</button>
        <button class="subtab-btn ${this.bonusSub === 'cards' ? 'active' : ''}" data-bsub="cards">🃏 Kaarten & Missies</button>
        <button class="subtab-btn ${this.bonusSub === 'pass' ? 'active' : ''}" data-bsub="pass">🏆 Seizoenspas & Toernooi</button>
      </div>
      <div id="bonus-body" style="display:flex;flex-direction:column;gap:10px;"></div>
    `;

    panel.querySelectorAll<HTMLButtonElement>('[data-bsub]').forEach((b) => {
      b.addEventListener('click', () => {
        this.bonusSub = b.dataset.bsub as BonusSubTab;
        this.sfx.playTap();
        this.renderBonusesTab();
      });
    });

    const body = panel.querySelector<HTMLElement>('#bonus-body')!;
    if (this.bonusSub === 'wheel') this.renderWheelBody(body);
    else if (this.bonusSub === 'cards') this.renderCardsAndQuestsBody(body);
    else this.renderPassAndTournamentBody(body);
  }

  private renderWheelBody(body: HTMLElement): void {
    const now = Date.now();
    const halfLeft = Math.max(0, HALF_HOUR_MS - (now - this.state.lastHalfHourBonusAt));
    const wheelLeft = Math.max(0, WHEEL_COOLDOWN_MS - (now - this.state.lastWheelSpinAt));
    const dailyLeft = Math.max(0, DAY_MS - (now - this.state.lastDailyAt));

    const formatWait = (ms: number) => {
      const s = Math.ceil(ms / 1000);
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return m >= 60 ? `${Math.floor(m / 60)}u ${m % 60}m` : `${m}m ${rem}s`;
    };

    body.innerHTML = `
      <div class="card wheel-wrap">
        <h2>🎡 Rad van Fortuin</h2>
        <div class="wheel-pointer">🔻</div>
        <canvas id="wheel-canvas" width="240" height="240"></canvas>
        <button class="action-btn" id="btn-spin-wheel" ${wheelLeft > 0 || this.wheelSpinning ? 'disabled' : ''}>
          ${wheelLeft > 0 ? `Volgende draai over ${formatWait(wheelLeft)}` : 'DRAAI GRATIS AAN HET RAD!'}
        </button>
      </div>

      <div class="card">
        <h3>⏰ Gratis Munten Elke 30 Minuten</h3>
        <p>Geen verplichte reclame-video's: klik en pak direct gratis munten!</p>
        <button class="action-btn green" id="btn-halfhour" ${halfLeft > 0 ? 'disabled' : ''}>
          ${halfLeft > 0 ? `Beschikbaar over ${formatWait(halfLeft)}` : `Claim 🪙 ${formatCoins(80_000_000 * (this.state.fairPassActive ? 3 : 1))}`}
        </button>
      </div>

      <div class="card">
        <h3>📅 Dagelijkse Beloning (Reeks: ${this.state.dailyStreak} dagen)</h3>
        <button class="action-btn secondary" id="btn-daily" ${dailyLeft > 0 ? 'disabled' : ''}>
          ${dailyLeft > 0 ? `Morgen weer (${formatWait(dailyLeft)})` : `Claim Dagbonus + 🎁 Kist`}
        </button>
      </div>
    `;

    this.drawWheelCanvas();
    body.querySelector('#btn-spin-wheel')?.addEventListener('click', () => this.spinFortuneWheel());
    body.querySelector('#btn-halfhour')?.addEventListener('click', () => {
      const reward = 80_000_000 * (this.state.fairPassActive ? 3 : 1);
      this.state.coins += reward;
      this.state.lastHalfHourBonusAt = Date.now();
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnCoinShower(14);
      this.showToast(`🪙 +${formatCoins(reward)} halfuur-bonus geclaimd!`);
      this.renderAll();
    });
    body.querySelector('#btn-daily')?.addEventListener('click', () => {
      this.state.dailyStreak += 1;
      const reward = (180_000_000 + this.state.dailyStreak * 50_000_000) * (this.state.fairPassActive ? 3 : 1);
      this.state.coins += reward;
      this.state.chests += 1;
      this.state.lastDailyAt = Date.now();
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnCoinShower(18);
      this.showToast(`📅 Dag ${this.state.dailyStreak} bonus: +${formatCoins(reward)} & +1 Kist!`);
      this.renderAll();
    });
  }

  private renderCardsAndQuestsBody(body: HTMLElement): void {
    const ownedUnique = CARDS.filter((c) => (this.state.cards[c.id] ?? 0) > 0).length;
    body.innerHTML = `
      <div class="card">
        <h2>🎁 Schatkisten & Kaarten (${ownedUnique}/${CARDS.length})</h2>
        <button class="action-btn" id="btn-open-chest" ${this.state.chests <= 0 ? 'disabled' : ''}>
          🎁 Open Schatkist (${this.state.chests} beschikbaar)
        </button>
      </div>

      <div class="card">
        <h3>📋 Dagelijkse Missies</h3>
        ${QUEST_TEMPLATES.map((q) => {
          const qp = this.state.quests[q.id] ?? { progress: 0, claimed: false };
          const done = qp.progress >= q.target;
          return `
            <div class="building-row">
              <div class="building-info">
                <strong>${q.title}</strong>
                <small>${qp.progress}/${q.target} • 🪙 ${formatCoins(q.rewardCoins)} + ${q.rewardChests}🎁</small>
              </div>
              <button class="action-btn ${done && !qp.claimed ? 'green' : 'secondary'}" data-claim-quest="${q.id}" ${!done || qp.claimed ? 'disabled' : ''}>
                ${qp.claimed ? 'Geclaimd' : done ? 'Claim!' : `${qp.progress}/${q.target}`}
              </button>
            </div>
          `;
        }).join('')}
      </div>

      ${CARD_SETS.map((set) => {
        const setCards = CARDS.filter((c) => c.setId === set.id);
        const ownedInSet = setCards.filter((c) => (this.state.cards[c.id] ?? 0) > 0).length;
        const setComplete = ownedInSet === setCards.length;
        const alreadyClaimed = this.state.claimedSets.includes(set.id);
        return `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h3>${set.emoji} ${set.name} (${ownedInSet}/${setCards.length})</h3>
              <button class="action-btn" data-claim-set="${set.id}" ${!setComplete || alreadyClaimed ? 'disabled' : ''}>
                ${alreadyClaimed ? 'Compleet ✓' : `Claim ${formatCoins(set.rewardCoins)}`}
              </button>
            </div>
            <div class="cards-grid">
              ${setCards
                .map((c) => {
                  const count = this.state.cards[c.id] ?? 0;
                  return `
                    <div class="collect-card ${count > 0 ? 'owned' : 'missing'}">
                      <div class="c-emoji">${c.emoji}</div>
                      <div class="c-name">${c.name}</div>
                      <div class="c-count">${count > 0 ? `${count}x • ${'★'.repeat(c.stars)}` : c.rarity}</div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      }).join('')}
    `;

    body.querySelector('#btn-open-chest')?.addEventListener('click', () => {
      if (this.state.chests <= 0) return;
      this.state.chests -= 1;
      const drawn = openCardChest(this.state);
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.showChestModal(drawn);
      this.renderAll();
    });

    body.querySelectorAll<HTMLButtonElement>('[data-claim-quest]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.claimQuest!;
        const q = QUEST_TEMPLATES.find((x) => x.id === id);
        const qp = this.state.quests[id];
        if (!q || !qp || qp.claimed || qp.progress < q.target) return;
        qp.claimed = true;
        this.state.coins += q.rewardCoins;
        this.state.chests += q.rewardChests;
        saveGameState(this.state);
        this.sfx.playUpgrade();
        this.spawnCoinShower(12);
        this.showToast(`✅ Missie beloond: +${formatCoins(q.rewardCoins)} & +${q.rewardChests} kist!`);
        this.renderAll();
      });
    });

    body.querySelectorAll<HTMLButtonElement>('[data-claim-set]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const setId = btn.dataset.claimSet!;
        const set = CARD_SETS.find((s) => s.id === setId);
        if (!set || this.state.claimedSets.includes(setId)) return;
        const setCards = CARDS.filter((c) => c.setId === setId);
        if (!setCards.every((c) => (this.state.cards[c.id] ?? 0) > 0)) return;
        this.state.claimedSets.push(setId);
        this.state.coins += set.rewardCoins;
        saveGameState(this.state);
        this.sfx.playBigWin();
        this.spawnCoinShower(25);
        this.showToast(`🎉 Set '${set.name}' compleet! +${formatCoins(set.rewardCoins)} munten!`);
        this.renderAll();
      });
    });
  }

  private renderPassAndTournamentBody(body: HTMLElement): void {
    const rivals = [
      { name: 'Jij (Jouw Karakter)', pts: this.state.tournamentPoints, me: true },
      { name: 'Benni Beer 🐻', pts: 640, me: false },
      { name: 'Kiki Kat 🐱', pts: 410, me: false },
      { name: 'Kapitein Aap 🐒', pts: 230, me: false },
      { name: 'Robo-7 🤖', pts: 120, me: false },
    ].sort((a, b) => b.pts - a.pts);

    body.innerHTML = `
      <div class="card">
        <h2>🎟️ Gratis Seizoenspas (Geen €19,99 paywall!)</h2>
        <p>Verdien beloningen gewoon door te spinnen — helemaal gratis ontgrendeld!</p>
        ${SEASON_PASS_STEPS.map((st) => {
          const unlocked = this.state.totalSpins >= st.spinsRequired;
          const claimed = this.state.claimedPassSteps.includes(st.step);
          return `
            <div class="building-row">
              <div class="building-info">
                <strong>Stap ${st.step}: ${st.rewardLabel}</strong>
                <small>Nodig: ${Math.min(this.state.totalSpins, st.spinsRequired)}/${st.spinsRequired} spins</small>
              </div>
              <button class="action-btn ${unlocked && !claimed ? 'green' : 'secondary'}" data-pass="${st.step}" ${!unlocked || claimed ? 'disabled' : ''}>
                ${claimed ? 'Geclaimd ✓' : unlocked ? 'Claim!' : 'Bezig'}
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card">
        <h3>🏆 Wekelijks Cartoon Toernooi</h3>
        <p>Elke slot-spin levert toernooipunten op. Versla de cartoonrivals!</p>
        ${rivals
          .map(
            (r, idx) => `
          <div class="building-row" style="${r.me ? 'border-color:#ffd166;background:rgba(255,209,102,0.14);' : ''}">
            <div style="font-weight:900;width:24px;">#${idx + 1}</div>
            <div class="building-info"><strong>${r.name}</strong></div>
            <strong style="color:#06d6a0;">${r.pts} ptn</strong>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    body.querySelectorAll<HTMLButtonElement>('[data-pass]').forEach((b) => {
      b.addEventListener('click', () => {
        const stepNum = Number(b.dataset.pass);
        const st = SEASON_PASS_STEPS.find((x) => x.step === stepNum);
        if (!st || this.state.totalSpins < st.spinsRequired || this.state.claimedPassSteps.includes(stepNum)) return;
        this.state.claimedPassSteps.push(stepNum);
        if (st.rewardType === 'coins') this.state.coins += st.rewardAmount;
        else if (st.rewardType === 'freespins') this.state.freeSpins += st.rewardAmount;
        else this.state.chests += st.rewardAmount;
        saveGameState(this.state);
        this.sfx.playBigWin();
        this.spawnCoinShower(16);
        this.showToast(`🎉 Seizoenspas Stap ${stepNum}: ${st.rewardLabel} ontvangen!`);
        this.renderAll();
      });
    });
  }

  private drawWheelCanvas(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>('#wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 8;
    const sliceAng = (Math.PI * 2) / WHEEL_SLICES.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.wheelAngle);

    WHEEL_SLICES.forEach((slice, i) => {
      const start = i * sliceAng - Math.PI / 2;
      const end = start + sliceAng;
      ctx.fillStyle = slice.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + sliceAng / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${slice.emoji} ${slice.label}`, r - 12, 4);
      ctx.restore();
    });

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#240b36';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 1);
    ctx.restore();
  }

  private spinFortuneWheel(): void {
    if (this.wheelSpinning) return;
    this.wheelSpinning = true;
    const chosenIdx = Math.floor(Math.random() * WHEEL_SLICES.length);
    const sliceAng = (Math.PI * 2) / WHEEL_SLICES.length;
    const targetMod = (Math.PI * 2 - (chosenIdx + 0.5) * sliceAng) % (Math.PI * 2);
    const startAngle = this.wheelAngle;
    const totalDelta = Math.PI * 10 + ((targetMod - (startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    const startTime = performance.now();
    const duration = 2600;
    let lastTickSector = -1;

    const step = (now: number) => {
      const p = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      this.wheelAngle = startAngle + totalDelta * ease;
      this.drawWheelCanvas();

      const sector = Math.floor(this.wheelAngle / sliceAng);
      if (sector !== lastTickSector) {
        lastTickSector = sector;
        this.sfx.playWheelTick();
      }

      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        this.wheelSpinning = false;
        const win = WHEEL_SLICES[chosenIdx];
        const passBoost = this.state.fairPassActive ? 2 : 1;
        this.state.lastWheelSpinAt = Date.now();
        incrementQuest(this.state, 'wheel', 1);

        if (win.type === 'coins') {
          this.state.coins += win.value * passBoost;
          this.showToast(`🎡 Radprijs: +${formatCoins(win.value * passBoost)} munten!`);
        } else if (win.type === 'freespins') {
          this.state.freeSpins += win.value;
          this.showToast(`🎡 Radprijs: +${win.value} Gratis Spins!`);
        } else if (win.type === 'chest') {
          this.state.chests += win.value;
          this.showToast(`🎡 Radprijs: +${win.value} Schatkisten!`);
        } else {
          const pot = this.state.jackpots.mini;
          this.state.coins += pot;
          this.state.jackpots.mini = 45_000_000;
          this.showToast(`🏆 Radprijs: MINI JACKPOT (+${formatCoins(pot)})!`);
        }
        saveGameState(this.state);
        this.sfx.playBigWin();
        this.spawnCoinShower(18);
        this.renderAll();
      }
    };
    requestAnimationFrame(step);
  }

  // ===================== 5. EERLIJK €5 TAB =====================
  private renderFairTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-fair')!;
    const sessionMins = Math.floor((Date.now() - this.state.sessionStartAt) / 60_000);

    panel.innerHTML = `
      <div class="card">
        <div><span class="fair-badge">🛡️ ANTI-UITBUITING & €5 BESCHERMING</span></div>
        <h2>Samen tegen de uitbuit-industrie</h2>
        <p>
          Commerciële slot- & coin-apps buiten kwetsbare spelers uit met neppe bijna-winsten, €99-bundels en verslavende pop-ups.
          <br/><br/>
          <b>Fair Coin Slots biedt álles wat zij hebben — zonder de uitbuiting:</b><br/>
          • Iedereen start direct met <b>1.500.000.000 (1.5B)</b> speelmunten!<br/>
          • Kleertjes voor je eigen karakter kosten maar <b>duizenden muntjes</b>.<br/>
          • Spaarvarken, Seizoenspas, Muntschuiver, Plinko, Krasloten, Raid & Slots zitten er allemaal gratis in!
        </p>
      </div>

      <div class="card">
        <h3>💎 De €5 Eerlijke Pas (Simulatie — €0 echt geld)</h3>
        <p>
          In deze losse APK wordt <b>geen echt geld verwerkt</b>. Met een eenmalige €5-limiet per maand krijg je in dit ontwerp <b>+500B munten</b> en <b>3x bonussen</b> voor maandenlang zorgeloos plezier — zonder dat ooit iemand honderden euro's kan verliezen.
        </p>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;">
          <span>Harde maandlimiet:</span>
          <strong style="color:#06d6a0;">€${this.state.monthlySpentEur.toFixed(2)} / €5,00 (HARD CAP)</strong>
        </div>
        <button class="action-btn ${this.state.fairPassActive ? 'green' : ''}" id="btn-sim-pass" ${this.state.fairPassActive ? 'disabled' : ''}>
          ${this.state.fairPassActive ? '✓ €5 Pas Actief (Maanden speelplezier!)' : 'Test €5 Eerlijke Pas (+500B munten & 3x Bonussen)'}
        </button>
      </div>

      <div class="card">
        <h3>⏱️ Gezond Spelen & Statistieken</h3>
        <p>
          • Speeltijd sessie: <b>${sessionMins} min</b> (pauzemelding elke <b>${this.state.reminderMinutes} min</b>)<br/>
          • Totaal gedraaid: <b>${this.state.totalSpins}</b> spins • Gewonnen: <b>${formatCoinsFull(this.state.totalWon)}</b><br/>
          • Reddingsboei: <b>${this.state.rescueCount}x</b> gebruikt
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="action-btn secondary" id="btn-toggle-reminder">Pauzemelding: ${this.state.reminderMinutes}m</button>
          <button class="action-btn secondary" id="btn-reset-game">Reset (1.5B startmunten)</button>
        </div>
      </div>
    `;

    panel.querySelector('#btn-sim-pass')?.addEventListener('click', () => {
      if (this.state.fairPassActive) return;
      this.state.fairPassActive = true;
      this.state.monthlySpentEur = 5.0;
      this.state.passActivatedAt = Date.now();
      this.state.coins += 500_000_000_000;
      this.state.freeSpins += 50;
      this.state.chests += 5;
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnCoinShower(28);
      this.showToast('🛡️ Test-€5 Pas geactiveerd: +500B munten, +50 Spins & +5 Kisten!');
      this.renderAll();
    });

    panel.querySelector('#btn-toggle-reminder')?.addEventListener('click', () => {
      const steps = [15, 30, 45, 60];
      const next = steps[(steps.indexOf(this.state.reminderMinutes) + 1) % steps.length];
      this.state.reminderMinutes = next;
      this.sessionAlertShown = false;
      saveGameState(this.state);
      this.sfx.playTap();
      this.renderFairTab();
    });

    panel.querySelector('#btn-reset-game')?.addEventListener('click', () => {
      localStorage.removeItem('fair_coin_slots_state_v2');
      localStorage.removeItem('fair_coin_slots_state_v1');
      this.state = loadGameState();
      saveGameState(this.state);
      this.syncCharacterRenderers();
      this.sfx.playTap();
      this.showToast('Spelstand gereset naar 1.500.000.000 startmunten!');
      this.renderAll();
    });
  }

  private showChestModal(drawn: { emoji: string; name: string; rarity: string }[]): void {
    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    box.innerHTML = `
      <h2 style="margin:0;color:#ffd166;">🎁 Schatkist Geopend!</h2>
      <div class="cards-grid">
        ${drawn
          .map(
            (c) => `
          <div class="collect-card owned">
            <div class="c-emoji">${c.emoji}</div>
            <div class="c-name">${c.name}</div>
            <div class="c-count">${c.rarity}</div>
          </div>
        `
          )
          .join('')}
      </div>
      <button class="action-btn" id="close-chest-modal">Top, toevoegen aan album!</button>
    `;

    box.querySelector('#close-chest-modal')?.addEventListener('click', () => {
      backdrop.classList.add('hidden');
      this.sfx.playTap();
    });
  }

  private claimRescueBonus(): void {
    const bonus = 100_000_000;
    this.state.coins += bonus;
    this.state.rescueCount += 1;
    saveGameState(this.state);
    this.sfx.playBigWin();
    this.spawnCoinShower(14);
    this.showToast(`🛟 Gratis Reddingsboei! +${formatCoins(bonus)} munten — nooit verplicht betalen!`);
    this.renderAll();
  }

  private spawnCoinShower(count: number): void {
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'coin-particle';
      el.textContent = i % 4 === 0 ? '💎' : '🪙';
      el.style.left = `${Math.random() * 94}%`;
      el.style.animationDuration = `${1.1 + Math.random() * 1.1}s`;
      el.style.animationDelay = `${Math.random() * 0.35}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2400);
    }
  }

  private showToast(message: string): void {
    const existing = document.querySelector('.toast');
    existing?.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.remove(), 3400);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const appRoot = document.getElementById('app');
if (appRoot) {
  new FairCoinSlotsApp(appRoot);
}
