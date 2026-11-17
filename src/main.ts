import './style.css';
import {
  fetchGlobalSlotsHighscores,
  GlobalSlotsEntry,
  submitGlobalSlotsScore,
} from './api/highscores';
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
  resolveDeviceId,
  saveGameState,
  xpNeededForLevel,
} from './storage/state';

type TabId = 'slots' | 'arcade' | 'character' | 'bonuses';
type ArcadeSubTab = 'dozer' | 'plinko' | 'scratch' | 'village';
type BonusSubTab = 'wheel' | 'cards' | 'pass';

const HALF_HOUR_MS = 30 * 60 * 1000;
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
  private isLuckWheelSpin = false;
  private toastTimer = 0;
  private sessionAlertShown = false;
  private syncTimer: number | null = null;
  private globalEntries: GlobalSlotsEntry[] = [];
  private globalStatusText = '';
  private showServerConfig = false;
  private leaderboardTapCount = 0;
  private leaderboardTapTimer: number | null = null;

  // Scratch card local board
  private scratchBoard: { emoji: string; coins: number; spins: number; revealed: boolean }[] = [];
  private plinkoBet = 10_000_000;
  private raidDoneBoard = false;
  private raidRevealed: boolean[] = [false, false, false, false];
  private raidValues: number[] = [];

  constructor(root: HTMLElement, initialState: GameState) {
    this.root = root;
    this.state = initialState;
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

  private scheduleGlobalSync(delayMs = 2500): void {
    if (!this.state.apiBaseUrl) return;
    if (this.syncTimer !== null) {
      window.clearTimeout(this.syncTimer);
    }
    this.syncTimer = window.setTimeout(() => {
      this.syncTimer = null;
      void submitGlobalSlotsScore(this.state.apiBaseUrl, {
        deviceId: this.state.deviceId,
        playerName: this.state.playerName.trim() || 'Player',
        level: this.state.level,
        coins: this.state.coins,
        totalWon: this.state.totalWon,
        totalSpins: this.state.totalSpins,
        tournamentPoints: this.state.tournamentPoints,
        species: this.state.character.species,
        colorId: this.state.character.colorId,
      });
    }, delayMs);
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
        <div class="mascot-box" id="mascot-tap" title="Customize your character">
          <canvas id="hud-char-canvas" width="90" height="90" style="width:54px;height:54px;"></canvas>
        </div>
        <div class="hud-center">
          <div class="coin-pill">
            <span class="coin-val" id="hud-coins">🪙 1.5B</span>
            <button class="rescue-btn" id="hud-rescue" style="display:none;">+Rescue</button>
          </div>
          <div class="xp-row">
            <span class="lvl-badge" id="hud-lvl">LVL 1</span>
            <div class="xp-track"><div class="xp-fill" id="hud-xp-fill" style="width:0%"></div></div>
            <span id="hud-mult">1.0x</span>
          </div>
        </div>
        <div class="hud-actions">
          <div class="hud-btn-row">
            <button class="icon-btn" id="btn-info" aria-label="Game Info">ℹ️</button>
            <button class="icon-btn" id="btn-sound" aria-label="Toggle Sound">🔊</button>
          </div>
          <span class="session-pill" id="hud-session">0m</span>
        </div>
      </header>

      <main class="main-content">
        <section class="tab-panel active" id="tab-slots"></section>
        <section class="tab-panel" id="tab-arcade"></section>
        <section class="tab-panel" id="tab-character"></section>
        <section class="tab-panel" id="tab-bonuses"></section>
      </main>

      <nav class="bottom-nav">
        <button class="nav-btn active" data-tab="slots"><span class="nav-ico">🎰</span><span>Slots</span></button>
        <button class="nav-btn" data-tab="arcade"><span class="nav-ico">🕹️</span><span>Arcade</span></button>
        <button class="nav-btn" data-tab="character"><span class="nav-ico">👕</span><span>Character</span></button>
        <button class="nav-btn" data-tab="bonuses"><span class="nav-ico">🎡</span><span>Rewards</span></button>
      </nav>

      <div class="modal-backdrop hidden" id="modal-backdrop">
        <div class="modal-box" id="modal-box"></div>
      </div>
    `;

    this.root.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab as TabId));
    });

    this.root.querySelector('#btn-info')?.addEventListener('click', () => {
      this.sfx.playTap();
      this.openInfoModal();
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
        this.showToast(`Break tip: you've played ${mins} mins. Take a breather anytime!`);
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
        <button class="piggy-pill" id="btn-piggy-break">🐷 Piggy: ${formatCoins(this.state.piggyBankCoins)}</button>
        ${
          this.state.freeSpins > 0
            ? `<span class="freespin-pill">🎟️ ${this.state.freeSpins} FREE (${this.state.freeSpinMultiplier}x)</span>`
            : ''
        }
        ${
          this.lastGambleAmount > 0 && !this.isSpinning
            ? `<button class="piggy-pill" style="border-color:#06d6a0;" id="btn-gamble-win">🃏 Double ${formatCoins(this.lastGambleAmount)}?</button>`
            : `<button class="piggy-pill" style="border-color:${this.state.slotsFreePlay ? '#06d6a0' : '#ff9f1c'};" id="btn-toggle-freeplay">${this.state.slotsFreePlay ? '♾️ Free Play: ON' : '💰 Bet Mode'}</button>`
        }
      </div>

      <div class="slot-cabinet" style="background:${machine.gradient}; border-color:${machine.frameColor};">
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
          ${bannerText ?? 'Spin & win! 3x 🎟️ = Free Spins • 5+ 🪙 = Coin Grab'}
        </div>
      </div>

      <div class="controls-bar">
        <div class="bet-box">
          <button class="bet-step-btn" id="btn-bet-down">−</button>
          <div class="bet-display">
            <small>${this.state.slotsFreePlay ? 'WIN SCALE' : 'BET'}</small>
            <strong>${formatCoins(bet)}</strong>
          </div>
          <button class="bet-step-btn" id="btn-bet-up">+</button>
        </div>

        <button class="mini-toggle ${this.turboSpin ? 'active' : ''}" id="btn-turbo">⚡</button>
        <button class="mini-toggle ${this.autoSpin ? 'active' : ''}" id="btn-auto">AUTO</button>
        <button class="spin-btn ${this.state.freeSpins > 0 ? 'freespin-mode' : ''}" id="btn-spin">
          ${this.state.freeSpins > 0 ? `FREE (${this.state.freeSpins})` : 'SPIN'}
        </button>
      </div>
    `;

    panel.querySelectorAll<HTMLButtonElement>('.machine-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.isSpinning) return;
        const target = SLOT_MACHINES.find((m) => m.id === btn.dataset.machine);
        if (!target) return;
        if (this.state.level < target.unlockLevel) {
          this.showToast(`Reach Level ${target.unlockLevel} to unlock ${target.name}!`);
          return;
        }
        this.state.activeMachineId = target.id;
        this.currentGrid = this.buildInitialGrid(target);
        this.winningCells.clear();
        this.lastGambleAmount = 0;
        this.sfx.playTap();
        saveGameState(this.state);
        this.renderSlotsTab(`${target.badgeEmoji} Playing ${target.name}!`);
      });
    });

    panel.querySelector('#btn-piggy-break')?.addEventListener('click', () => {
      if (this.state.piggyBankCoins < 10_000_000) {
        this.showToast('Piggy Bank fills every spin! Break open at 10M+.');
        return;
      }
      const payout = this.state.piggyBankCoins;
      this.state.coins += payout;
      this.state.piggyBankCoins = 5_000_000;
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnCoinShower(18);
      this.showToast(`🐷 Piggy Bank opened! +${formatCoins(payout)} coins!`);
      this.renderAll();
    });

    panel.querySelector('#btn-gamble-win')?.addEventListener('click', () => this.openGambleModal());

    panel.querySelector('#btn-toggle-freeplay')?.addEventListener('click', () => {
      if (this.isSpinning) return;
      this.state.slotsFreePlay = !this.state.slotsFreePlay;
      this.sfx.playTap();
      saveGameState(this.state);
      this.showToast(
        this.state.slotsFreePlay
          ? '♾️ Free Play ON — unlimited spins!'
          : '💰 Classic Bet Mode active.'
      );
      this.renderSlotsTab();
    });

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
      <h2 style="margin:0;color:#ffd166;">🃏 Double Your Win!</h2>
      <p style="margin:0;font-size:13px;color:#c7b8e8;">
        Current win: <b>🪙 ${formatCoins(amount)}</b>.<br/>
        Pick Red or Black for <b>2x (${formatCoins(amount * 2)})</b>.
      </p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="action-btn pink" id="gamble-red">♥️ RED (2x)</button>
        <button class="action-btn secondary" id="gamble-black">♠️ BLACK (2x)</button>
      </div>
      <button class="action-btn green" id="gamble-keep">Collect Win</button>
    `;

    const resolve = (choice: 'red' | 'black') => {
      const cardIsRed = Math.random() < 0.5;
      const won = (choice === 'red' && cardIsRed) || (choice === 'black' && !cardIsRed);
      this.lastGambleAmount = 0;
      if (won) {
        this.state.coins += amount;
        this.state.totalWon += amount;
        this.sfx.playBigWin();
        this.spawnCoinShower(18);
        this.showToast(`🎉 ${cardIsRed ? '♥️ Red' : '♠️ Black'}! Doubled by +${formatCoins(amount)}!`);
      } else {
        this.state.coins = Math.max(0, this.state.coins - amount);
        this.sfx.playReelStop(0);
        this.showToast(`Unlucky — it was ${cardIsRed ? '♥️ Red' : '♠️ Black'}.`);
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
    const freePlay = this.state.slotsFreePlay;

    if (!usingFreeSpin && !freePlay && this.state.coins < bet) {
      if (this.state.coins < BET_STEPS[0]) {
        this.autoSpin = false;
        this.claimRescueBonus();
        return;
      }
      while (this.state.betIndex > 0 && BET_STEPS[this.state.betIndex] > this.state.coins) {
        this.state.betIndex--;
      }
      this.showToast('Bet adjusted to match your coins.');
      this.renderSlotsTab();
      return;
    }

    this.isSpinning = true;
    this.lastGambleAmount = 0;
    this.winningCells.clear();
    this.hudCharacter?.setMood('spinning');
    this.sfx.playSpinStart();

    if (usingFreeSpin) this.state.freeSpins -= 1;
    else if (!freePlay) this.state.coins -= bet;

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
    this.scheduleGlobalSync();

    let msg = 'No win this spin — try again!';
    let isBig = false;

    if (result.jackpotWon) {
      msg = `🏆 ${result.jackpotWon.key.toUpperCase()} JACKPOT! +${formatCoins(result.totalWin)} coins!`;
      isBig = true;
      this.hudCharacter?.setMood('bigwin');
      this.sfx.playBigWin();
      this.spawnCoinShower(28);
    } else if (result.winTier === 'epic' || result.winTier === 'mega' || result.winTier === 'big') {
      const label =
        result.winTier === 'epic' ? 'EPIC WIN' : result.winTier === 'mega' ? 'MEGA WIN' : 'BIG WIN';
      msg = `🎉 ${label}! +${formatCoins(result.totalWin)} coins!`;
      isBig = true;
      this.hudCharacter?.setMood('bigwin');
      this.sfx.playBigWin();
      this.spawnCoinShower(22);
    } else if (result.totalWin > 0) {
      msg = `✨ Won +${formatCoins(result.totalWin)} coins (${result.winningLines.length} line${result.winningLines.length === 1 ? '' : 's'})`;
      this.hudCharacter?.setMood('bonus');
      this.sfx.playWin();
      this.spawnCoinShower(8);
    } else {
      this.hudCharacter?.setMood('idle');
    }

    if (result.awardedFreeSpins > 0) {
      msg += ` • +${result.awardedFreeSpins} Free Spins!`;
      isBig = true;
    }

    this.renderHud();
    if (this.activeTab === 'slots') this.renderSlotsTab(msg, isBig);

    if (xpInfo.leveledUp) {
      this.showToast(`🆙 Level ${xpInfo.newLevel}! +${formatCoins(xpInfo.levelReward)} coins & +1 Chest!`);
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
        <h2 style="margin:0;color:#ffd166;">🪙 COIN GRAB BONUS!</h2>
        <p style="margin:0;font-size:13px;color:#c7b8e8;">
          ${finished ? 'Bonus complete! All coins are yours!' : `Each new coin resets respins to 3! <b>${respinsLeft}</b> left.`}
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
        <div style="font-size:16px;font-weight:900;color:#06d6a0;">Total: +${formatCoins(sum)} coins</div>
        <button class="action-btn" id="hold-action-btn">${finished ? 'Collect & Continue' : 'Spin Respin'}</button>
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

  // ===================== 2. ARCADE TAB (Dozer, Plinko, Scratch, Village & Raid) =====================
  private renderArcadeTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-arcade')!;
    panel.innerHTML = `
      <div class="subtab-strip">
        <button class="subtab-btn ${this.arcadeSub === 'dozer' ? 'active' : ''}" data-sub="dozer">🪙 Coin Dozer</button>
        <button class="subtab-btn ${this.arcadeSub === 'plinko' ? 'active' : ''}" data-sub="plinko">🟢 Plinko</button>
        <button class="subtab-btn ${this.arcadeSub === 'scratch' ? 'active' : ''}" data-sub="scratch">🎫 Scratch Card</button>
        <button class="subtab-btn ${this.arcadeSub === 'village' ? 'active' : ''}" data-sub="village">🏘️ Village & Raid</button>
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
        <h2>🪙 Coin Dozer</h2>
        <p>Tap anywhere on the board to drop coins and push 💎 gems, 🎟️ spins & 🎁 chests.</p>
        <canvas id="dozer-canvas" width="300" height="250" style="border-radius:14px;border:2px solid #ffd166;cursor:pointer;max-width:100%;"></canvas>
        <button class="action-btn" id="btn-dozer-drop">Drop Coin</button>
      </div>
    `;

    const canvas = body.querySelector<HTMLCanvasElement>('#dozer-canvas')!;
    this.dozerCtrl = new CoinDozerController(canvas, {
      onDropCost: () => {
        incrementQuest(this.state, 'arcade', 1);
        saveGameState(this.state);
        return true;
      },
      onScoreCoins: (c, chests, spins) => {
        this.state.coins += c;
        this.state.chests += chests;
        this.state.freeSpins += spins;
        saveGameState(this.state);
        this.renderHud();
        if (chests > 0 || spins > 0 || c >= 10_000_000) {
          this.showToast(`🪙 Dozer prize: +${formatCoins(c)}${chests ? ` +${chests}🎁` : ''}${spins ? ` +${spins}🎟️` : ''}`);
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
        <h2>🟢 Plinko Drop</h2>
        <p>Pick a win scale and drop balls for up to <b>15x</b> payouts.</p>
        <div class="subtab-strip" style="justify-content:center;">
          ${[1_000_000, 10_000_000, 50_000_000, 250_000_000]
            .map(
              (amt) =>
                `<button class="subtab-btn ${this.plinkoBet === amt ? 'active' : ''}" data-pbet="${amt}">${formatCoins(amt)}</button>`
            )
            .join('')}
        </div>
        <canvas id="plinko-canvas" width="300" height="260" style="border-radius:14px;border:2px solid #4cc9f0;max-width:100%;"></canvas>
        <button class="action-btn green" id="btn-plinko-drop">Drop Ball (${formatCoins(this.plinkoBet)})</button>
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
          this.showToast(`🟢 Plinko ${mult}x! +${formatCoins(payout)} coins!`);
        } else {
          this.sfx.playWin();
        }
      },
      () => this.sfx.playWheelTick()
    );

    body.querySelector('#btn-plinko-drop')?.addEventListener('click', () => {
      incrementQuest(this.state, 'arcade', 1);
      saveGameState(this.state);
      this.plinkoCtrl?.dropBall(this.plinkoBet);
    });
  }

  private renderScratchAndDice(body: HTMLElement): void {
    const allDone = this.scratchBoard.every((s) => s.revealed);
    body.innerHTML = `
      <div class="card">
        <h2>🎫 Lucky Scratch Card</h2>
        <p>Scratch all 6 tiles for instant coins and free spins.</p>
        <div class="scratch-grid">
          ${this.scratchBoard
            .map((cell, idx) =>
              cell.revealed
                ? `<div class="scratch-tile revealed"><span>${cell.emoji}</span><span style="font-size:11px;">+${formatCoins(cell.coins)}${cell.spins ? ` +${cell.spins}🎟️` : ''}</span></div>`
                : `<button class="scratch-tile" data-scratch="${idx}">❓ SCRATCH</button>`
            )
            .join('')}
        </div>
        ${allDone ? `<button class="action-btn" id="btn-new-scratch">New Scratch Card</button>` : ''}
      </div>

      <div class="card">
        <h3>🎲 Lucky Dice</h3>
        <p>Roll 2 dice: roll 7 or higher to win <b>45M coins</b>!</p>
        <button class="action-btn secondary" id="btn-roll-dice">🎲 Roll Dice (7+ wins 45M)</button>
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
      const d1 = 1 + Math.floor(Math.random() * 6);
      const d2 = 1 + Math.floor(Math.random() * 6);
      const sum = d1 + d2;
      incrementQuest(this.state, 'arcade', 1);
      if (sum >= 7) {
        this.state.coins += 45_000_000;
        this.sfx.playBigWin();
        this.spawnCoinShower(10);
        this.showToast(`🎲 ${d1} + ${d2} = ${sum}! Won +45M coins!`);
      } else {
        this.sfx.playReelStop(0);
        this.showToast(`🎲 ${d1} + ${d2} = ${sum}. Under 7 — roll again!`);
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
        <h2>🏴‍☠️ Treasure Raid</h2>
        <p>Dig 3 spots in <b>King Croc's 🐊</b> village! Shields: <b>${this.state.shields} 🛡️</b>.</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          ${this.raidValues
            .map((val, i) =>
              this.raidRevealed[i]
                ? `<div class="scratch-tile revealed"><span>💰</span><span style="font-size:11px;">+${formatCoins(val)}</span></div>`
                : `<button class="scratch-tile" data-raid="${i}" ${this.raidDoneBoard ? 'disabled' : ''}>❌ DIG</button>`
            )
            .join('')}
        </div>
        ${this.raidDoneBoard ? `<button class="action-btn" id="btn-next-raid">Find New Rival</button>` : ''}
      </div>

      <div class="card">
        <h2>🏘️ My Village (Lvl ${kingdomLvl} • ${mult}x Win)</h2>
        <p>Upgrade buildings to boost your permanent multipliers.</p>
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
        this.showToast(`🏴‍☠️ Treasure dug up: +${formatCoins(loot)} coins!`);
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
        this.showToast(`🔨 ${b.name} upgraded to Level ${lvl + 1}! Multiplier: ${getTotalMultiplier(this.state)}x`);
        this.renderAll();
      });
    });
  }

  // ===================== 3. CHARACTER & STYLE SHOP TAB =====================
  private renderCharacterTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-character')!;
    const c = this.state.character;
    const catLabels: { id: ShopCategory; label: string }[] = [
      { id: 'outfit', label: '👕 Outfits' },
      { id: 'hat', label: '👑 Hats' },
      { id: 'eyewear', label: '🕶️ Eyewear' },
      { id: 'prop', label: '💰 Props' },
      { id: 'aura', label: '✨ Auras' },
    ];
    const items = SHOP_ITEMS.filter((i) => i.category === this.shopCategory);

    panel.innerHTML = `
      <div class="char-stage">
        <canvas id="preview-char-canvas" width="180" height="180" style="width:140px;height:140px;"></canvas>
        <div style="font-size:14px;font-weight:900;color:#ffd166;">Your Cartoon Mascot</div>
        <input id="char-player-name" class="text-input" type="text" maxlength="20" placeholder="Your player name" value="${this.state.playerName.replace(/"/g, '&quot;')}" style="max-width:240px;text-align:center;" />
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
        <h2>🛍️ Style & Accessory Shop</h2>
        <p>Unlock outfits and gear using virtual coins.</p>
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
              const priceLabel = item.priceCoins === 0 ? 'Free' : `🪙 ${item.priceCoins.toLocaleString('en-US')}`;
              return `
                <div class="shop-item ${equipped ? 'equipped' : ''}">
                  <div class="s-emoji">${item.emoji}</div>
                  <div class="s-name">${item.name}</div>
                  <div class="s-desc">${item.description}</div>
                  <button class="action-btn ${equipped ? 'green' : owned ? 'secondary' : ''}" data-shopitem="${item.id}" style="width:100%;">
                    ${equipped ? '✓ Equipped' : owned ? 'Equip' : `Buy ${priceLabel}`}
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

    panel.querySelector<HTMLInputElement>('#char-player-name')?.addEventListener('input', (ev) => {
      this.state.playerName = (ev.target as HTMLInputElement).value.slice(0, 20);
      saveGameState(this.state);
      this.scheduleGlobalSync(1200);
    });

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
            this.showToast(`You need ${item.priceCoins.toLocaleString('en-US')} coins!`);
            return;
          }
          this.state.coins -= item.priceCoins;
          this.state.ownedShopItems.push(item.id);
          this.sfx.playUpgrade();
          this.showToast(`🛍️ Bought & equipped ${item.name}!`);
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

  // ===================== 4. REWARDS TAB (Wheel, Cards & Quests, Pass & Ranks) =====================
  private renderBonusesTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-bonuses')!;
    panel.innerHTML = `
      <div class="subtab-strip">
        <button class="subtab-btn ${this.bonusSub === 'wheel' ? 'active' : ''}" data-bsub="wheel">🎡 Wheel & Timers</button>
        <button class="subtab-btn ${this.bonusSub === 'cards' ? 'active' : ''}" data-bsub="cards">🃏 Cards & Quests</button>
        <button class="subtab-btn ${this.bonusSub === 'pass' ? 'active' : ''}" data-bsub="pass">🏆 Season Pass & Ranks</button>
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
    else {
      this.renderPassAndTournamentBody(body);
      if (this.state.apiBaseUrl) {
        void this.refreshGlobalLeaderboard();
      }
    }
  }

  private renderWheelBody(body: HTMLElement): void {
    const now = Date.now();
    const halfLeft = Math.max(0, HALF_HOUR_MS - (now - this.state.lastHalfHourBonusAt));
    const dailyLeft = Math.max(0, DAY_MS - (now - this.state.lastDailyAt));
    const outOfSpins = this.state.wheelSpins <= 0;

    const formatWait = (ms: number) => {
      const s = Math.ceil(ms / 1000);
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${rem}s`;
    };

    body.innerHTML = `
      <div class="card wheel-wrap">
        <h2>🎡 Prize Wheel</h2>
        <div style="font-size:13px;font-weight:800;color:${outOfSpins ? '#ff70a6' : '#06d6a0'};text-align:center;">
          ${
            outOfSpins
              ? `😅 Out of spins! Spin for a <b>95% chance</b> at <b>+150 spins</b>!`
              : `🎟️ Wheel spins left: <b>${this.state.wheelSpins}</b>`
          }
        </div>
        <div class="wheel-pointer">🔻</div>
        <canvas id="wheel-canvas" width="240" height="240" style="width:240px;height:240px;"></canvas>
        <button class="action-btn ${outOfSpins ? 'green' : ''}" id="btn-spin-wheel" ${this.wheelSpinning ? 'disabled' : ''}>
          ${
            outOfSpins
              ? '🍀 Try Your Luck! (95% for +150 spins)'
              : `SPIN WHEEL (${this.state.wheelSpins} left)`
          }
        </button>
      </div>

      <div class="card">
        <h3>⏰ 30-Minute Coin Bonus</h3>
        <p>Tap anytime to claim instant bonus coins.</p>
        <button class="action-btn green" id="btn-halfhour" ${halfLeft > 0 ? 'disabled' : ''}>
          ${halfLeft > 0 ? `Ready in ${formatWait(halfLeft)}` : `Claim 🪙 ${formatCoins(80_000_000 * (this.state.fairPassActive ? 3 : 1))}`}
        </button>
      </div>

      <div class="card">
        <h3>📅 Daily Reward (Streak: ${this.state.dailyStreak}d)</h3>
        <button class="action-btn secondary" id="btn-daily" ${dailyLeft > 0 ? 'disabled' : ''}>
          ${dailyLeft > 0 ? `Next in ${formatWait(dailyLeft)}` : `Claim Daily + 🎁 Chest`}
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
      this.showToast(`🪙 +${formatCoins(reward)} 30-minute bonus claimed!`);
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
      this.showToast(`📅 Day ${this.state.dailyStreak} reward: +${formatCoins(reward)} & +1 Chest!`);
      this.renderAll();
    });
  }

  private renderCardsAndQuestsBody(body: HTMLElement): void {
    const ownedUnique = CARDS.filter((c) => (this.state.cards[c.id] ?? 0) > 0).length;
    body.innerHTML = `
      <div class="card">
        <h2>🎁 Treasure Chests & Cards (${ownedUnique}/${CARDS.length})</h2>
        <button class="action-btn" id="btn-open-chest" ${this.state.chests <= 0 ? 'disabled' : ''}>
          🎁 Open Chest (${this.state.chests} left)
        </button>
      </div>

      <div class="card">
        <h3>📋 Daily Quests</h3>
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
                ${qp.claimed ? 'Claimed' : done ? 'Claim!' : `${qp.progress}/${q.target}`}
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
                ${alreadyClaimed ? 'Complete ✓' : `Claim ${formatCoins(set.rewardCoins)}`}
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
        this.showToast(`✅ Quest claimed: +${formatCoins(q.rewardCoins)} & +${q.rewardChests} chest!`);
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
        this.showToast(`🎉 '${set.name}' set complete! +${formatCoins(set.rewardCoins)} coins!`);
        this.renderAll();
      });
    });
  }

  private renderPassAndTournamentBody(body: HTMLElement): void {
    const myName = this.state.playerName.trim() || 'Player';
    const rivals = [
      { name: `${myName} (You)`, pts: this.state.tournamentPoints, me: true },
      { name: 'Benni Bear 🐻', pts: 640, me: false },
      { name: 'Kiki Kitty 🐱', pts: 410, me: false },
      { name: 'Captain Ape 🐒', pts: 230, me: false },
      { name: 'Robo-7 🤖', pts: 120, me: false },
    ].sort((a, b) => b.pts - a.pts);

    const speciesEmoji = (sp: string) =>
      CHARACTER_SPECIES_LIST.find((x) => x.id === sp)?.emoji || '🐷';

    const statusLabel =
      this.globalStatusText ||
      (this.state.apiBaseUrl ? 'Connecting...' : 'Offline Mode — Local Records');

    body.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <h2 id="slots-hs-heading" style="cursor:pointer;">🏆 Leaderboard</h2>
          <button class="action-btn" id="btn-slots-refresh" style="padding:6px 10px;font-size:11px;">Refresh</button>
        </div>
        <div class="hs-status-bar">
          <span>${statusLabel}</span>
        </div>
        <div class="hs-config-panel ${this.showServerConfig ? '' : 'hidden'}" id="slots-config-panel">
          <p style="margin:0;font-size:11px;color:#c7b8e8;">
            Developer endpoint URL:
          </p>
          <div style="display:flex;gap:6px;">
            <input id="slots-api-input" class="text-input" type="url" placeholder="https://example.com" value="${this.state.apiBaseUrl.replace(/"/g, '&quot;')}" />
            <button class="action-btn green" id="btn-slots-save-api">Save</button>
          </div>
        </div>
        ${
          this.globalEntries.length > 0
            ? this.globalEntries
                .map((e) => {
                  const isMe = e.deviceId === this.state.deviceId;
                  return `
                    <div class="building-row" style="${isMe ? 'border-color:#ffd166;background:rgba(255,209,102,0.14);' : ''}">
                      <div style="font-weight:900;width:28px;">#${e.rank}</div>
                      <div style="font-size:20px;">${speciesEmoji(e.species)}</div>
                      <div class="building-info">
                        <strong>${e.playerName}${isMe ? ' (You)' : ''}</strong>
                        <small>LVL ${e.level} • ${e.totalSpins} spins</small>
                      </div>
                      <strong style="color:#ffd166;">🪙 ${formatCoins(e.totalWon)}</strong>
                    </div>
                  `;
                })
                .join('')
            : `<p style="font-size:12px;">Your score: <b>🪙 ${formatCoins(this.state.totalWon)}</b> won (Level ${this.state.level}).</p>`
        }
      </div>

      <div class="card">
        <h2>🎟️ Season Pass</h2>
        <p>Unlock milestone rewards automatically as you spin.</p>
        ${SEASON_PASS_STEPS.map((st) => {
          const unlocked = this.state.totalSpins >= st.spinsRequired;
          const claimed = this.state.claimedPassSteps.includes(st.step);
          return `
            <div class="building-row">
              <div class="building-info">
                <strong>Tier ${st.step}: ${st.rewardLabel}</strong>
                <small>Progress: ${Math.min(this.state.totalSpins, st.spinsRequired)}/${st.spinsRequired} spins</small>
              </div>
              <button class="action-btn ${unlocked && !claimed ? 'green' : 'secondary'}" data-pass="${st.step}" ${!unlocked || claimed ? 'disabled' : ''}>
                ${claimed ? 'Claimed ✓' : unlocked ? 'Claim!' : 'In Progress'}
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card">
        <h3>🏆 Weekly Tournament</h3>
        <p>Every spin earns tournament points. Outscore your rivals!</p>
        ${rivals
          .map(
            (r, idx) => `
          <div class="building-row" style="${r.me ? 'border-color:#ffd166;background:rgba(255,209,102,0.14);' : ''}">
            <div style="font-weight:900;width:24px;">#${idx + 1}</div>
            <div class="building-info"><strong>${r.name}</strong></div>
            <strong style="color:#06d6a0;">${r.pts} pts</strong>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    body.querySelector('#slots-hs-heading')?.addEventListener('click', () => {
      this.leaderboardTapCount += 1;
      if (this.leaderboardTapTimer !== null) {
        window.clearTimeout(this.leaderboardTapTimer);
      }
      if (this.leaderboardTapCount >= 5) {
        this.leaderboardTapCount = 0;
        this.showServerConfig = !this.showServerConfig;
        this.sfx.playTap();
        this.renderPassAndTournamentBody(body);
        return;
      }
      this.leaderboardTapTimer = window.setTimeout(() => {
        this.leaderboardTapCount = 0;
        this.leaderboardTapTimer = null;
      }, 1500);
    });

    body.querySelector('#btn-slots-refresh')?.addEventListener('click', () => {
      this.sfx.playTap();
      void this.refreshGlobalLeaderboard();
    });

    body.querySelector('#btn-slots-save-api')?.addEventListener('click', () => {
      const inp = body.querySelector<HTMLInputElement>('#slots-api-input');
      if (!inp) return;
      this.state.apiBaseUrl = inp.value.trim().replace(/\/+$/, '');
      saveGameState(this.state);
      this.showServerConfig = false;
      this.sfx.playTap();
      void this.refreshGlobalLeaderboard();
    });

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
        this.showToast(`🎉 Season Pass Tier ${stepNum}: ${st.rewardLabel} claimed!`);
        this.renderAll();
      });
    });
  }

  private async refreshGlobalLeaderboard(): Promise<void> {
    if (!this.state.apiBaseUrl) {
      this.globalEntries = [];
      this.globalStatusText = 'Offline Mode — Local Records';
      if (this.activeTab === 'bonuses' && this.bonusSub === 'pass') {
        const body = this.root.querySelector<HTMLElement>('#bonus-body');
        if (body) this.renderPassAndTournamentBody(body);
      }
      return;
    }

    this.globalStatusText = 'Connecting...';
    try {
      await submitGlobalSlotsScore(this.state.apiBaseUrl, {
        deviceId: this.state.deviceId,
        playerName: this.state.playerName.trim() || 'Player',
        level: this.state.level,
        coins: this.state.coins,
        totalWon: this.state.totalWon,
        totalSpins: this.state.totalSpins,
        tournamentPoints: this.state.tournamentPoints,
        species: this.state.character.species,
        colorId: this.state.character.colorId,
      });
      const res = await fetchGlobalSlotsHighscores(this.state.apiBaseUrl, this.state.deviceId, 50);
      this.globalEntries = res.entries;
      this.globalStatusText = `Live • ${res.entries.length} players worldwide`;
    } catch {
      this.globalStatusText = 'Offline Mode — Local Records';
    }
    if (this.activeTab === 'bonuses' && this.bonusSub === 'pass') {
      const body = this.root.querySelector<HTMLElement>('#bonus-body');
      if (body) this.renderPassAndTournamentBody(body);
    }
  }

  private drawWheelCanvas(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>('#wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 240;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const targetW = Math.round(size * dpr);
    if (canvas.width !== targetW || canvas.height !== targetW) {
      canvas.width = targetW;
      canvas.height = targetW;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const r = cx - 8;
    const isLuckMode = this.isLuckWheelSpin || this.state.wheelSpins <= 0;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.wheelAngle);

    if (isLuckMode) {
      const redHalf = 0.05 * Math.PI;
      const topAng = -Math.PI / 2;

      ctx.fillStyle = '#06d6a0';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, topAng + redHalf, topAng + Math.PI * 2 - redHalf);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, topAng - redHalf, topAng + redHalf);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#041f18';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍀 +150 SPINS!', 0, 38);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('95% CHANCE', 0, 58);

      ctx.save();
      ctx.rotate(topAng);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('5%', r - 10, 3);
      ctx.restore();
    } else {
      const sliceAng = (Math.PI * 2) / WHEEL_SLICES.length;
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
    }

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#240b36';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isLuckMode ? '🍀' : '★', 0, 1);
    ctx.restore();
  }

  private spinFortuneWheel(): void {
    if (this.wheelSpinning) return;
    this.wheelSpinning = true;

    const btn = this.root.querySelector<HTMLButtonElement>('#btn-spin-wheel');
    if (btn) btn.disabled = true;

    const luckTry = this.state.wheelSpins <= 0;
    this.isLuckWheelSpin = luckTry;

    if (!luckTry) {
      this.state.wheelSpins = Math.max(0, this.state.wheelSpins - 1);
      saveGameState(this.state);
    }

    const sliceAng = (Math.PI * 2) / WHEEL_SLICES.length;
    const chosenIdx = Math.floor(Math.random() * WHEEL_SLICES.length);
    const luckWon = luckTry ? Math.random() < 0.95 : false;

    let targetMod: number;
    if (luckTry) {
      if (luckWon) {
        targetMod = (0.25 + Math.random() * 1.5) * Math.PI;
      } else {
        targetMod = ((Math.random() - 0.5) * 0.05 * Math.PI + Math.PI * 2) % (Math.PI * 2);
      }
    } else {
      targetMod = (Math.PI * 2 - (chosenIdx + 0.5) * sliceAng) % (Math.PI * 2);
    }

    const startAngle = this.wheelAngle;
    const totalDelta = Math.PI * 10 + ((targetMod - (startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    const startTime = performance.now();
    const duration = 2400;
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
        this.isLuckWheelSpin = false;

        if (luckTry) {
          if (luckWon) {
            this.state.wheelSpins = 150;
            this.sfx.playBigWin();
            this.spawnCoinShower(24);
            this.showToast('🎉 Lucky hit! +150 Wheel spins added!');
          } else {
            this.sfx.playReelStop(0);
            this.showToast('😅 Narrow miss! Tap Try Your Luck again.');
          }
          saveGameState(this.state);
          this.renderAll();
          return;
        }

        const win = WHEEL_SLICES[chosenIdx];
        const passBoost = this.state.fairPassActive ? 2 : 1;
        this.state.lastWheelSpinAt = Date.now();
        incrementQuest(this.state, 'wheel', 1);

        if (win.type === 'coins') {
          this.state.coins += win.value * passBoost;
          this.showToast(`🎡 Wheel prize: +${formatCoins(win.value * passBoost)} coins!`);
        } else if (win.type === 'freespins') {
          this.state.freeSpins += win.value;
          this.showToast(`🎡 Wheel prize: +${win.value} Free Spins!`);
        } else if (win.type === 'chest') {
          this.state.chests += win.value;
          this.showToast(`🎡 Wheel prize: +${win.value} Chests!`);
        } else {
          const pot = this.state.jackpots.mini;
          this.state.coins += pot;
          this.state.jackpots.mini = 45_000_000;
          this.showToast(`🏆 Wheel prize: MINI JACKPOT (+${formatCoins(pot)})!`);
        }
        saveGameState(this.state);
        this.sfx.playBigWin();
        this.spawnCoinShower(18);
        this.renderAll();
      }
    };
    requestAnimationFrame(step);
  }

  private openInfoModal(): void {
    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    const renderInfo = () => {
      const sessionMins = Math.floor((Date.now() - this.state.sessionStartAt) / 60_000);
      box.innerHTML = `
        <h2 style="margin:0;color:#ffd166;">ℹ️ Fair Coin Slots</h2>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#fff8f0;">
          <b>100% Free Virtual Coins — No Real Money</b><br/>
          <span style="color:#c7b8e8;">All slot machines, minigames, and outfits use virtual coins only.</span>
        </p>
        <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:10px;font-size:12px;color:#c7b8e8;display:flex;flex-direction:column;gap:4px;">
          <div>Session: <b>${sessionMins}m</b> • Break tip every <b>${this.state.reminderMinutes}m</b></div>
          <div>Spins: <b>${this.state.totalSpins}</b> • Won: <b>${formatCoinsFull(this.state.totalWon)}</b></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          <button class="action-btn secondary" id="info-toggle-reminder">Reminder: ${this.state.reminderMinutes}m</button>
          <button class="action-btn pink" id="info-reset-game">Reset Progress</button>
        </div>
        <button class="action-btn green" id="info-close">Close</button>
      `;

      box.querySelector('#info-toggle-reminder')?.addEventListener('click', () => {
        const steps = [15, 30, 45, 60];
        const next = steps[(steps.indexOf(this.state.reminderMinutes) + 1) % steps.length];
        this.state.reminderMinutes = next;
        this.sessionAlertShown = false;
        saveGameState(this.state);
        this.sfx.playTap();
        renderInfo();
      });

      box.querySelector('#info-reset-game')?.addEventListener('click', () => {
        localStorage.removeItem('fair_coin_slots_state_v2');
        localStorage.removeItem('fair_coin_slots_state_v1');
        this.state = loadGameState(this.state.deviceId);
        saveGameState(this.state);
        this.syncCharacterRenderers();
        this.sfx.playTap();
        backdrop.classList.add('hidden');
        this.showToast('Progress reset to 1.5B starter coins!');
        this.renderAll();
      });

      box.querySelector('#info-close')?.addEventListener('click', () => {
        backdrop.classList.add('hidden');
        this.sfx.playTap();
      });
    };

    renderInfo();
  }

  private showChestModal(drawn: { emoji: string; name: string; rarity: string }[]): void {
    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    box.innerHTML = `
      <h2 style="margin:0;color:#ffd166;">🎁 Chest Opened!</h2>
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
      <button class="action-btn" id="close-chest-modal">Add to Album</button>
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
    this.showToast(`🛟 Coin Rescue! +${formatCoins(bonus)} coins added!`);
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

async function bootstrap(): Promise<void> {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  const deviceId = await resolveDeviceId();
  const initial = loadGameState(deviceId);
  new FairCoinSlotsApp(appRoot, initial);
}

void bootstrap();
