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
  HIGH_ROLLER_EXTRA_BETS,
  KENO_PAYOUTS,
  KINGDOM_BUILDINGS,
  PET_CATALOG,
  PetId,
  QUEST_TEMPLATES,
  ROULETTE_RED_NUMS,
  SEASON_PASS_STEPS,
  SHOP_ITEMS,
  ShopCategory,
  SLOT_MACHINES,
  SlotMachineTheme,
  SlotSymbol,
  VIKING_QUEST_STEPS,
  WHEEL_SLICES,
} from './data/machines';
import { CoinDozerController, PlinkoController } from './game/arcadeGames';
import {
  drawHiLoOutcomeCard,
  drawKenoRound,
  drawRandomCard,
  evaluateRouletteBet,
  formatHiLoRank,
  GASHAPON_COIN_COST,
  getActiveFlashEvent,
  getActivePetBoost,
  getCurrentPuzzleChapter,
  grantRandomPuzzlePiece,
  HiLoCard,
  PET_BOOST_DURATION_MS,
  PET_TREATS_SHOP_COST,
  RouletteBetType,
} from './game/expansionLogic';
import { MascotRenderer } from './game/mascotRenderer';
import { CrashRocketCanvas, GashaponCanvas, RouletteWheelCanvas } from './game/newMinigames';
import { SoundFX } from './game/SoundFX';
import {
  generateHoldCoinValue,
  HoldCoinCell,
  JackpotKey,
  spinReels,
  SpinResult,
  WinningLine,
} from './game/slotEngine';
import {
  GameState,
  getBuildingUpgradeCost,
  getCurrentMonthKey,
  getKingdomLevel,
  getTotalMultiplier,
  grantXp,
  incrementQuest,
  loadGameState,
  openCardChest,
  resolveDeviceId,
  saveGameState,
  SimOfferProcessingState,
  xpNeededForLevel,
} from './storage/state';

type TabId = 'slots' | 'arcade' | 'character' | 'bonuses';
type ArcadeSubTab = 'crash' | 'casino' | 'fox' | 'highroller' | 'dozer' | 'plinko' | 'scratch' | 'village';
type CharacterSubTab = 'studio' | 'pets';
type BonusSubTab = 'wheel' | 'cards' | 'pass';

const HALF_HOUR_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const VIP_PASS_DURATION_MS = 5 * 60 * 1000;
const SCRATCH_CARD_COST = 15_000_000;
const RAID_COST = 20_000_000;
const CANNON_COST = 25_000_000;
const VAULT_MULTS = [1.35, 1.85, 2.6, 4.0, 6.5];

class FairCoinSlotsApp {
  private root: HTMLElement;
  private state: GameState;
  private sfx = new SoundFX();
  private hudCharacter: MascotRenderer | null = null;
  private previewCharacter: MascotRenderer | null = null;
  private dozerCtrl: CoinDozerController | null = null;
  private plinkoCtrl: PlinkoController | null = null;
  private crashCtrl: CrashRocketCanvas | null = null;
  private rouletteCtrl: RouletteWheelCanvas | null = null;
  private gashaponCtrl: GashaponCanvas | null = null;

  private activeTab: TabId = 'slots';
  private arcadeSub: ArcadeSubTab = 'crash';
  private characterSub: CharacterSubTab = 'studio';
  private bonusSub: BonusSubTab = 'wheel';
  private shopCategory: ShopCategory = 'outfit';

  private isSpinning = false;
  private spinToken = 0;
  private autoSpin = false;
  private turboSpin = false;
  private autoSpinTimer: number | null = null;
  private moodTimer: number | null = null;
  private balloonTimer: number | null = null;
  private currentGrid: SlotSymbol[][];
  private winningCells = new Set<string>();
  private winningLines: WinningLine[] = [];
  private lastGambleAmount = 0;

  private wheelAngle = 0;
  private wheelSpinning = false;
  private wheelRafId: number | null = null;
  private wheelPendingSettle: (() => void) | null = null;
  private isLuckWheelSpin = false;
  private toastTimer = 0;
  private sessionIntervalId: number | null = null;
  private vipPassTickerId: number | null = null;
  private sessionAlertShown = false;
  private syncTimer: number | null = null;
  private globalEntries: GlobalSlotsEntry[] = [];
  private globalStatusText = '';
  private showServerConfig = false;
  private leaderboardTapCount = 0;
  private leaderboardTapTimer: number | null = null;

  // Arcade & Casino Minigames state
  private scratchBoard: { emoji: string; coins: number; spins: number; revealed: boolean }[] = [];
  private plinkoBet = 25_000_000;
  private highRollerBet = 100_000_000;
  private diceBet = 50_000_000;
  private vaultBet = 100_000_000;
  private vaultActive = false;
  private vaultStep = 0;
  private vaultRevealed: ('hidden' | 'safe' | 'bomb')[] = Array(6).fill('hidden');
  private vaultBombs = new Set<number>();
  private raidDoneBoard = false;
  private raidRevealed: boolean[] = [false, false, false, false];
  private raidValues: number[] = [];

  // New expansion minigames state
  private crashBet = 100_000_000;
  private hiloBet = 50_000_000;
  private hiloActive = false;
  private hiloCard: HiLoCard = drawRandomCard();
  private hiloStreak = 0;
  private hiloMult = 1.0;
  private rouletteBet = 50_000_000;
  private rouletteBetType: RouletteBetType = 'red';
  private rouletteLastNum: number | null = null;
  private kenoBet = 25_000_000;
  private kenoPicks: number[] = [3, 7, 12, 18, 22];
  private kenoDrawn: number[] = [];

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
    this.startVipPassTicker();
    this.scheduleNextBalloon();
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
    this.crashCtrl?.destroy();
    this.crashCtrl = null;
    this.rouletteCtrl?.destroy();
    this.rouletteCtrl = null;
    this.gashaponCtrl?.destroy();
    this.gashaponCtrl = null;
    this.previewCharacter?.destroy();
    this.previewCharacter = null;

    if (this.wheelRafId !== null) {
      cancelAnimationFrame(this.wheelRafId);
      this.wheelRafId = null;
    }
    if (this.wheelSpinning) {
      this.wheelSpinning = false;
      this.isLuckWheelSpin = false;
      const settle = this.wheelPendingSettle;
      this.wheelPendingSettle = null;
      settle?.();
    }
  }

  private scheduleNextBalloon(): void {
    if (this.balloonTimer !== null) window.clearTimeout(this.balloonTimer);
    const delayMs = 28_000 + Math.floor(Math.random() * 22_000);
    this.balloonTimer = window.setTimeout(() => {
      this.balloonTimer = null;
      if (!document.hidden) {
        this.spawnFrenzyBalloon();
      }
      this.scheduleNextBalloon();
    }, delayMs);
  }

  private spawnFrenzyBalloon(): void {
    if (document.querySelector('.frenzy-balloon')) return;
    const colors = [
      'radial-gradient(circle at 30% 30%, #ff85a1, #ff5d8f)',
      'radial-gradient(circle at 30% 30%, #72efdd, #4cc9f0)',
      'radial-gradient(circle at 30% 30%, #ffe066, #ff9f1c)',
      'radial-gradient(circle at 30% 30%, #d8b4fe, #9b5de5)',
    ];
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'frenzy-balloon';
    el.style.left = `${12 + Math.random() * 72}%`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.innerHTML = `<span style="font-size:22px;">🎈</span><span>TAP!</span>`;

    el.addEventListener('click', () => {
      el.remove();
      const roll = Math.random();
      let msg = '';
      if (roll < 0.35) {
        this.state.gashaponTokens += 1;
        msg = '🎈 Balloon Pop! +1 🫧 Gashapon Token!';
      } else if (roll < 0.65) {
        this.state.petTreats += 2;
        msg = '🎈 Balloon Pop! +2 🍖 Pet Treats!';
      } else if (roll < 0.9) {
        const coins = (40 + Math.floor(Math.random() * 60)) * 1_000_000;
        this.state.coins += coins;
        this.state.totalWon += coins;
        msg = `🎈 Balloon Pop! +🪙 ${formatCoins(coins)}!`;
      } else {
        this.state.chests += 1;
        msg = '🎈 Balloon Pop! +1 🎁 Treasure Chest!';
      }
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnConfettiBurst(18);
      this.showToast(msg);
      this.renderHud();
    });

    document.body.appendChild(el);
    window.setTimeout(() => {
      if (el.isConnected) el.remove();
    }, 8600);
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
    if (this.sessionIntervalId !== null) {
      window.clearInterval(this.sessionIntervalId);
    }
    const updateTimer = () => {
      const mins = Math.floor((Date.now() - this.state.sessionStartAt) / 60_000);
      const pill = this.root.querySelector<HTMLElement>('#hud-session');
      if (pill) pill.textContent = `${mins}m`;
      if (!this.sessionAlertShown && this.state.reminderMinutes > 0 && mins >= this.state.reminderMinutes) {
        this.sessionAlertShown = true;
        this.showToast(`Break tip: you've played ${mins} mins. Take a breather anytime!`);
      }
      if (!document.hidden && this.activeTab === 'bonuses' && this.bonusSub === 'wheel' && !this.wheelSpinning) {
        this.renderBonusesTab();
      }
    };
    updateTimer();
    this.sessionIntervalId = window.setInterval(updateTimer, 15_000);
  }

  private startVipPassTicker(): void {
    if (this.vipPassTickerId !== null) {
      window.clearInterval(this.vipPassTickerId);
    }
    const tick = () => {
      // Tick Monthly VIP Pass
      const until = this.state.passProcessingUntil;
      if (until) {
        const remaining = until - Date.now();
        if (remaining <= 0) {
          this.completeVipPassPurchase();
        } else {
          const mmss = this.formatMmSs(remaining);
          const pct = Math.min(100, Math.max(2, Math.round(((VIP_PASS_DURATION_MS - remaining) / VIP_PASS_DURATION_MS) * 100)));
          const cdEl = this.root.querySelector<HTMLElement>('#vip-pass-countdown');
          if (cdEl) cdEl.textContent = mmss;
          const fillEl = this.root.querySelector<HTMLElement>('#vip-pass-progress');
          if (fillEl) fillEl.style.width = `${pct}%`;
          const msgEl = this.root.querySelector<HTMLElement>('#vip-pass-status');
          if (msgEl) msgEl.textContent = this.getVipLoadingStatus(remaining);
          const pillEl = this.root.querySelector<HTMLElement>('#vip-quick-timer');
          if (pillEl) pillEl.textContent = mmss;
          const cardTimerEl = this.root.querySelector<HTMLElement>('#vip-card-timer');
          if (cardTimerEl) cardTimerEl.textContent = mmss;
        }
      }

      // Tick generic simulated €0.00 offers
      const sim = this.state.simOfferProcessing;
      if (sim) {
        const rem = sim.until - Date.now();
        if (rem <= 0) {
          this.completeSimOfferPurchase();
        } else {
          const simMmSs = this.formatMmSs(rem);
          const simPct = Math.min(100, Math.max(2, Math.round(((sim.durationMs - rem) / sim.durationMs) * 100)));
          const sCd = this.root.querySelector<HTMLElement>('#sim-offer-countdown');
          if (sCd) sCd.textContent = simMmSs;
          const sFill = this.root.querySelector<HTMLElement>('#sim-offer-progress');
          if (sFill) sFill.style.width = `${simPct}%`;
          const sBtn = this.root.querySelector<HTMLElement>('#sim-offer-inline-timer');
          if (sBtn) sBtn.textContent = simMmSs;
        }
      }

      // Tick Flash Event & Pet Boost timers in UI
      const flash = getActiveFlashEvent();
      const flashEl = this.root.querySelector<HTMLElement>('#flash-event-timer');
      if (flashEl) flashEl.textContent = this.formatMmSs(flash.remainingMs);

      const petBoost = getActivePetBoost(this.state);
      const petTimerEl = this.root.querySelector<HTMLElement>('#pet-boost-timer');
      if (petTimerEl) {
        petTimerEl.textContent = petBoost.pet ? this.formatMmSs(petBoost.remainingMs) : 'Asleep';
      }
      const hudPetTimer = this.root.querySelector<HTMLElement>('#hud-pet-timer');
      if (hudPetTimer) {
        hudPetTimer.textContent = petBoost.pet ? `${petBoost.pet.emoji} ${this.formatMmSs(petBoost.remainingMs)}` : '🦊 Feed Pet';
      }
    };
    tick();
    this.vipPassTickerId = window.setInterval(tick, 1000);
  }

  private isPassClaimedThisMonth(): boolean {
    return this.state.lastPassMonthKey === getCurrentMonthKey();
  }

  private isPassProcessing(): boolean {
    return typeof this.state.passProcessingUntil === 'number' && this.state.passProcessingUntil > Date.now();
  }

  private formatMmSs(ms: number): string {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private getVipLoadingStatus(remainingMs: number): string {
    const elapsed = VIP_PASS_DURATION_MS - remainingMs;
    const step = Math.floor(elapsed / 40_000);
    const messages = [
      'Connecting to €0.00 Simulated Vault...',
      'Checking monthly pass eligibility...',
      'Validating zero-euro checkout receipt...',
      'Charging €0.00 to your virtual wallet...',
      'Minting 1,000,000,000 bonus coins...',
      'Packing 50 Free Spins (3x multiplier)...',
      'Polishing your Monthly VIP Crown...',
      'Finalizing VIP Pass activation...',
    ];
    return messages[Math.min(messages.length - 1, Math.max(0, step))];
  }

  private handleVipPassAction(): void {
    this.sfx.playTap();
    if (this.isPassProcessing()) {
      this.openVipLoadingModal();
      return;
    }
    if (this.isPassClaimedThisMonth()) {
      this.showToast('✅ VIP Pass already claimed this month! Back next month.');
      return;
    }
    this.openVipConfirmModal(1);
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
      rescueBtn.style.display = this.state.coins < 1_000_000 ? 'inline-block' : 'none';
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
  private buildMarqueeBulbs(count = 11): string {
    return Array.from({ length: count }, () => `<span class="marquee-bulb"></span>`).join('');
  }

  private buildPaylinesSvg(): string {
    if (this.winningLines.length === 0) return '';
    const beamColors = ['#ffd166', '#4cc9f0', '#ff5d8f', '#06d6a0', '#c084fc'];
    const lines = this.winningLines.slice(0, 6).map((wl, idx) => {
      const color = beamColors[idx % beamColors.length];
      const pts = wl.rows
        .slice(0, wl.matchCount)
        .map((r, c) => `${50 + c * 100},${29 + r * 63}`)
        .join(' ');
      return `
        <polyline class="payline-beam" points="${pts}" stroke="${color}" stroke-width="10" opacity="0.45" />
        <polyline class="payline-beam" points="${pts}" stroke="${color}" stroke-width="5" opacity="0.92" />
        <polyline class="payline-beam" points="${pts}" stroke="#ffffff" stroke-width="2" opacity="0.95" />
      `;
    });
    return `<svg class="payline-svg" viewBox="0 0 500 184" preserveAspectRatio="none">${lines.join('')}</svg>`;
  }

  private getSlotBetSteps(): number[] {
    const { event } = getActiveFlashEvent();
    return event.id === 'high_roller' ? [...BET_STEPS, ...HIGH_ROLLER_EXTRA_BETS] : BET_STEPS;
  }

  private renderSlotsTab(bannerText?: string, isBig = false): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-slots')!;
    const machine = this.getActiveMachine();
    const betSteps = this.getSlotBetSteps();
    if (this.state.betIndex >= betSteps.length) {
      this.state.betIndex = betSteps.length - 1;
    }
    const bet = betSteps[this.state.betIndex] ?? betSteps[0];
    const flash = getActiveFlashEvent();
    const petBoost = getActivePetBoost(this.state);

    const vipPillHtml = this.isPassProcessing()
      ? `<button class="vip-pill" id="btn-vip-quick"><span class="vip-mini-dot"></span><span>VIP <span id="vip-quick-timer">${this.formatMmSs(this.state.passProcessingUntil! - Date.now())}</span></span></button>`
      : this.isPassClaimedThisMonth()
        ? `<button class="vip-pill" style="border-color:#06d6a0;" id="btn-vip-quick">👑 VIP 3x ON</button>`
        : `<button class="vip-pill" id="btn-vip-quick">👑 €5 VIP Pass (€0)</button>`;

    const petPillHtml = `<button class="pet-status-pill" id="btn-hud-pet"><span id="hud-pet-timer">${
      petBoost.pet ? `${petBoost.pet.emoji} ${this.formatMmSs(petBoost.remainingMs)}` : '🦊 Feed Pet'
    }</span></button>`;

    panel.innerHTML = `
      <div class="flash-event-banner" style="border-color:${flash.event.color};">
        <span>${flash.event.emoji} <b>${flash.event.name}:</b> ${flash.event.desc}</span>
        <span style="color:${flash.event.color};white-space:nowrap;" id="flash-event-timer">${this.formatMmSs(flash.remainingMs)}</span>
      </div>

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
            : petPillHtml
        }
        ${
          this.lastGambleAmount > 0 && !this.isSpinning
            ? `<button class="piggy-pill" style="border-color:#06d6a0;" id="btn-gamble-win">🃏 Double ${formatCoins(this.lastGambleAmount)}?</button>`
            : vipPillHtml
        }
      </div>

      <div class="slot-cabinet" style="background:${machine.gradient}; border-color:${machine.frameColor};">
        <div class="marquee-lights">${this.buildMarqueeBulbs(11)}</div>
        <div class="reels-grid" id="reels-grid">
          ${this.currentGrid
            .map(
              (col, cIdx) => `
            <div class="reel-col ${this.isSpinning ? 'spinning' : ''}" data-col="${cIdx}">
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
          ${this.buildPaylinesSvg()}
        </div>

        <div class="win-banner ${isBig ? 'big' : ''}" id="win-banner">
          ${bannerText ?? 'Spin & win! Collect 🧩 Puzzle pieces, 🍖 Treats & 🫧 Tokens'}
        </div>
        <div class="marquee-lights">${this.buildMarqueeBulbs(11)}</div>
      </div>

      <div class="controls-bar">
        <div class="bet-box">
          <button class="bet-step-btn" id="btn-bet-down">−</button>
          <div class="bet-display">
            <small>BET</small>
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
        this.winningLines = [];
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
      this.spawnCoinFountain(14);
      this.showToast(`🐷 Piggy Bank opened! +${formatCoins(payout)} coins!`);
      this.renderAll();
    });

    panel.querySelector('#btn-hud-pet')?.addEventListener('click', () => {
      this.characterSub = 'pets';
      this.switchTab('character');
    });

    panel.querySelector('#btn-gamble-win')?.addEventListener('click', () => this.openGambleModal());
    panel.querySelector('#btn-vip-quick')?.addEventListener('click', () => this.handleVipPassAction());

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
      const steps = this.getSlotBetSteps();
      if (this.state.betIndex < steps.length - 1) {
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
      if (!this.autoSpin && this.autoSpinTimer !== null) {
        window.clearTimeout(this.autoSpinTimer);
        this.autoSpinTimer = null;
      }
      this.sfx.playTap();
      this.renderSlotsTab();
      if (this.autoSpin && !this.isSpinning) void this.triggerSpin();
    });

    panel.querySelector('#btn-spin')?.addEventListener('click', () => void this.triggerSpin());
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
        Pick Red or Black for <b>2x (${formatCoins(amount * 2)})</b>!
      </p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="action-btn pink" id="gamble-red">♥️ RED (2x)</button>
        <button class="action-btn secondary" id="gamble-black">♠️ BLACK (2x)</button>
      </div>
      <button class="action-btn green" id="gamble-keep">Collect Win</button>
    `;

    let resolved = false;
    const resolve = (choice: 'red' | 'black') => {
      if (resolved) return;
      resolved = true;
      // Rigged slightly in house favor (40% win / 60% house win) to burn high-win stacks
      const won = Math.random() < 0.4;
      const cardIsRed = won ? choice === 'red' : choice !== 'red';
      this.lastGambleAmount = 0;
      if (won) {
        this.state.coins += amount;
        this.state.totalWon += amount;
        this.sfx.playBigWin();
        this.spawnCoinShower(18);
        this.spawnCoinFountain(16);
        this.showToast(`🎉 ${cardIsRed ? '♥️ Red' : '♠️ Black'}! Doubled by +${formatCoins(amount)}!`);
      } else {
        this.state.coins = Math.max(0, this.state.coins - amount);
        this.sfx.playReelStop(0);
        this.showToast(`💥 House card was ${cardIsRed ? '♥️ Red' : '♠️ Black'}! Lost wagered win.`);
      }
      saveGameState(this.state);
      backdrop.classList.add('hidden');
      this.renderAll();
    };

    box.querySelector('#gamble-red')?.addEventListener('click', () => resolve('red'));
    box.querySelector('#gamble-black')?.addEventListener('click', () => resolve('black'));
    box.querySelector('#gamble-keep')?.addEventListener('click', () => {
      if (resolved) return;
      resolved = true;
      this.lastGambleAmount = 0;
      backdrop.classList.add('hidden');
      this.renderSlotsTab();
    });
  }

  private async triggerSpin(): Promise<void> {
    if (this.isSpinning) return;
    if (this.autoSpinTimer !== null) {
      window.clearTimeout(this.autoSpinTimer);
      this.autoSpinTimer = null;
    }

    const betSteps = this.getSlotBetSteps();
    if (this.state.betIndex >= betSteps.length) {
      this.state.betIndex = betSteps.length - 1;
    }
    const bet = betSteps[this.state.betIndex] ?? betSteps[0];
    const usingFreeSpin = this.state.freeSpins > 0;

    if (!usingFreeSpin && this.state.coins < bet) {
      if (this.state.coins < betSteps[0]) {
        this.autoSpin = false;
        this.claimRescueBonus();
        return;
      }
      while (this.state.betIndex > 0 && betSteps[this.state.betIndex] > this.state.coins) {
        this.state.betIndex--;
      }
      this.showToast('Bet adjusted to match your coins.');
      this.renderSlotsTab();
      return;
    }

    const myToken = ++this.spinToken;
    this.isSpinning = true;
    this.lastGambleAmount = 0;
    this.winningCells.clear();
    this.winningLines = [];
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

    this.root.querySelectorAll<HTMLElement>('.payline-svg').forEach((el) => el.remove());
    this.root.querySelectorAll<HTMLElement>('.reel-col').forEach((el) => el.classList.add('spinning'));

    const stepDelay = this.turboSpin ? 95 : 210;
    const baseDelay = this.turboSpin ? 180 : 380;

    for (let c = 0; c < 5; c++) {
      await this.wait(c === 0 ? baseDelay : stepDelay);
      if (this.spinToken !== myToken) {
        return;
      }
      this.currentGrid[c] = result.grid[c];
      const colEl = this.root.querySelector<HTMLElement>(`.reel-col[data-col="${c}"]`);
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

    if (this.spinToken !== myToken) return;
    await this.applySpinOutcome(result, bet);
    if (this.spinToken !== myToken) return;
    this.isSpinning = false;

    if (this.autoSpin && !result.triggerHoldAndSpin && this.activeTab === 'slots') {
      this.autoSpinTimer = window.setTimeout(() => {
        this.autoSpinTimer = null;
        if (this.autoSpin && !this.isSpinning && this.activeTab === 'slots') {
          void this.triggerSpin();
        }
      }, this.turboSpin ? 260 : 650);
    }
  }

  private async applySpinOutcome(result: SpinResult, bet: number): Promise<void> {
    const flash = getActiveFlashEvent();
    const petBoost = getActivePetBoost(this.state);

    let winBoostFactor = 1;
    if (flash.event.id === 'cash_frenzy') winBoostFactor += 0.35;
    if (petBoost.pet?.id === 'tiger') winBoostFactor += 0.25;

    const finalWin = result.jackpotWon ? result.totalWin : Math.round(result.totalWin * winBoostFactor);

    if (finalWin > 0) {
      this.state.coins += finalWin;
      this.state.totalWon += finalWin;
      incrementQuest(this.state, 'wins', 1);
      if (!result.jackpotWon && !this.autoSpin) {
        this.lastGambleAmount = finalWin;
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

    // Bonus Crazy Fox / Coin Master style collectibles dropped from spins
    const extraDrops: string[] = [];
    const puzzleChance = flash.event.id === 'cards_boom' ? 0.32 : 0.16;
    if (Math.random() < puzzleChance) {
      const puz = grantRandomPuzzlePiece(this.state);
      if (puz.completedChapter) {
        extraDrops.push(`🧩 Puzzle Complete! +${formatCoins(puz.completedChapter.rewardCoins)} +🃏 Joker`);
      } else if (puz.pieceIdx !== null) {
        extraDrops.push(`🧩 Puzzle #${puz.pieceIdx + 1}`);
      }
    }
    if (Math.random() < 0.12) {
      this.state.petTreats += 1;
      extraDrops.push('+1 🍖 Treat');
    }
    if (Math.random() < 0.08) {
      this.state.gashaponTokens += 1;
      extraDrops.push('+1 🫧 Token');
    }
    if (Math.random() < 0.08 && !this.state.revengeReady) {
      if (this.state.shields > 0) {
        this.state.shields -= 1;
        extraDrops.push('🛡️ Shield blocked Rival Foxy!');
      } else {
        this.state.revengeReady = true;
        extraDrops.push('🦊 Rival Foxy raided you! 2x REVENGE ready!');
      }
    }

    this.winningLines = result.winningLines;
    result.winningLines.forEach((wl) => {
      for (let c = 0; c < wl.matchCount; c++) {
        this.winningCells.add(`${c}-${wl.rows[c]}`);
      }
    });

    const xpMult = petBoost.pet?.id === 'rhino' ? 1.25 : 1;
    const xpInfo = grantXp(this.state, Math.round(result.xpGain * xpMult));
    saveGameState(this.state);
    this.scheduleGlobalSync();

    let msg = 'No win this spin — try again!';
    let isBig = false;

    if (result.jackpotWon) {
      msg = `🏆 ${result.jackpotWon.key.toUpperCase()} JACKPOT! +${formatCoins(finalWin)} coins!`;
      isBig = true;
      this.hudCharacter?.setMood('bigwin');
      this.sfx.playBigWin();
      this.spawnCoinShower(28);
      this.spawnCoinFountain(24);
    } else if (result.winTier === 'epic' || result.winTier === 'mega' || result.winTier === 'big') {
      const label =
        result.winTier === 'epic' ? 'EPIC WIN' : result.winTier === 'mega' ? 'MEGA WIN' : 'BIG WIN';
      msg = `🎉 ${label}! +${formatCoins(finalWin)} coins!`;
      isBig = true;
      this.hudCharacter?.setMood('bigwin');
      this.sfx.playBigWin();
      this.spawnCoinShower(22);
      this.spawnCoinFountain(18);
    } else if (finalWin > 0) {
      msg = `✨ Won +${formatCoins(finalWin)} coins (${result.winningLines.length} line${result.winningLines.length === 1 ? '' : 's'})`;
      this.hudCharacter?.setMood('bonus');
      this.sfx.playWin();
      this.spawnCoinShower(8);
      this.spawnCoinFountain(8);
    } else {
      this.hudCharacter?.setMood('idle');
    }

    if (result.awardedFreeSpins > 0) {
      msg += ` • +${result.awardedFreeSpins} Free Spins!`;
      isBig = true;
    }
    if (extraDrops.length > 0) {
      msg += ` • ${extraDrops.join(' • ')}`;
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
      if (this.moodTimer !== null) window.clearTimeout(this.moodTimer);
      this.moodTimer = window.setTimeout(() => {
        this.moodTimer = null;
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

  // ===================== 2. ARCADE TAB (Crash, Casino, Fox Gashapon, Dozer, Plinko, High-Roller, Lucky Games, Village & Cannon) =====================
  private renderArcadeTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-arcade')!;
    panel.innerHTML = `
      <div class="subtab-strip">
        <button class="subtab-btn ${this.arcadeSub === 'crash' ? 'active' : ''}" data-sub="crash">🚀 Crash & Hi-Lo</button>
        <button class="subtab-btn ${this.arcadeSub === 'casino' ? 'active' : ''}" data-sub="casino">🎡 Roulette & Keno</button>
        <button class="subtab-btn ${this.arcadeSub === 'fox' ? 'active' : ''}" data-sub="fox">🫧 Fox Gashapon</button>
        <button class="subtab-btn ${this.arcadeSub === 'highroller' ? 'active' : ''}" data-sub="highroller">🔥 Flip & Mines</button>
        <button class="subtab-btn ${this.arcadeSub === 'dozer' ? 'active' : ''}" data-sub="dozer">🪙 Dozer</button>
        <button class="subtab-btn ${this.arcadeSub === 'plinko' ? 'active' : ''}" data-sub="plinko">🟢 Plinko</button>
        <button class="subtab-btn ${this.arcadeSub === 'scratch' ? 'active' : ''}" data-sub="scratch">🎲 Lucky</button>
        <button class="subtab-btn ${this.arcadeSub === 'village' ? 'active' : ''}" data-sub="village">${this.state.revengeReady ? '⚡ Revenge!' : '💥 Raid & Village'}</button>
      </div>
      <div id="arcade-body" style="display:flex;flex-direction:column;gap:10px;"></div>
    `;

    panel.querySelectorAll<HTMLButtonElement>('[data-sub]').forEach((b) => {
      b.addEventListener('click', () => {
        this.cleanupSubCanvas();
        this.arcadeSub = b.dataset.sub as ArcadeSubTab;
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    const body = panel.querySelector<HTMLElement>('#arcade-body')!;
    if (this.arcadeSub === 'crash') this.renderCrashAndHiLo(body);
    else if (this.arcadeSub === 'casino') this.renderRouletteAndKeno(body);
    else if (this.arcadeSub === 'fox') this.renderFoxGashaponAndPuzzle(body);
    else if (this.arcadeSub === 'dozer') this.renderDozer(body);
    else if (this.arcadeSub === 'plinko') this.renderPlinko(body);
    else if (this.arcadeSub === 'highroller') this.renderHighRoller(body);
    else if (this.arcadeSub === 'scratch') this.renderScratchAndDice(body);
    else this.renderVillageAndRaid(body);
  }

  private renderCrashAndHiLo(body: HTMLElement): void {
    const crashBets = [50_000_000, 250_000_000, 1_000_000_000, 5_000_000_000];
    const hiloBets = [25_000_000, 100_000_000, 500_000_000];
    const petBoost = getActivePetBoost(this.state);
    const rhinoBoost = petBoost.pet?.id === 'rhino' ? 1.15 : 1;

    body.innerHTML = `
      <div class="card" style="align-items:center;text-align:center;">
        <h2>🚀 Crash Rocket</h2>
        <p>Launch the rocket & tap <b>CASH OUT</b> before it explodes!${rhinoBoost > 1 ? ' <b style="color:#4cc9f0;">(+15% Rhino Boost!)</b>' : ''}</p>
        <div class="crash-history">
          ${this.state.crashHistory
            .slice(0, 6)
            .map((m) => `<span class="crash-chip ${m < 1.5 ? 'low' : m >= 3 ? 'high' : 'mid'}">${m.toFixed(2)}x</span>`)
            .join('')}
        </div>
        <canvas id="crash-canvas" width="320" height="190" style="border-radius:14px;border:2px solid #ffd166;max-width:100%;"></canvas>
        <div class="subtab-strip" style="justify-content:center;max-width:100%;">
          ${crashBets
            .map(
              (amt) =>
                `<button class="subtab-btn ${this.crashBet === amt ? 'active' : ''}" data-cbet="${amt}">${formatCoins(amt)}</button>`
            )
            .join('')}
        </div>
        <div style="display:flex;gap:8px;width:100%;">
          <button class="action-btn" style="flex:1;" id="btn-crash-launch">🚀 LAUNCH (${formatCoins(this.crashBet)})</button>
          <button class="action-btn green" style="flex:1;" id="btn-crash-cashout" disabled>💰 CASH OUT</button>
        </div>
      </div>

      <div class="card" style="text-align:center;">
        <h2>🃏 Hi-Lo Card Streak</h2>
        <p>Guess if the next card is <b>Higher</b> or <b>Lower</b>! Streak pays up to <b>12x</b>.</p>
        <div class="hilo-card ${this.hiloCard.isRed ? 'red' : ''}">
          <span style="font-size:32px;line-height:1;">${formatHiLoRank(this.hiloCard.rank)}</span>
          <span style="font-size:24px;line-height:1;">${this.hiloCard.suit}</span>
        </div>
        ${
          !this.hiloActive
            ? `
          <div class="subtab-strip" style="justify-content:center;max-width:100%;">
            ${hiloBets
              .map(
                (amt) =>
                  `<button class="subtab-btn ${this.hiloBet === amt ? 'active' : ''}" data-hlbet="${amt}">${formatCoins(amt)}</button>`
              )
              .join('')}
          </div>
          <button class="action-btn secondary" id="btn-hilo-start">Deal Streak (${formatCoins(this.hiloBet)})</button>
        `
            : `
          <div style="font-size:13px;font-weight:900;color:#ffd166;">
            Streak: ${this.hiloStreak} • Payout: 🪙 ${formatCoins(Math.round(this.hiloBet * this.hiloMult))} (${this.hiloMult.toFixed(2)}x)
          </div>
          <div style="display:flex;gap:8px;">
            <button class="action-btn green" style="flex:1;" id="btn-hilo-high">⬆️ HIGHER</button>
            <button class="action-btn pink" style="flex:1;" id="btn-hilo-low">⬇️ LOWER</button>
          </div>
          <button class="action-btn" id="btn-hilo-cash" ${this.hiloStreak <= 0 ? 'disabled' : ''}>
            ${this.hiloStreak > 0 ? `💰 Cash Out 🪙 ${formatCoins(Math.round(this.hiloBet * this.hiloMult))}` : 'Win 1 guess to cash out'}
          </button>
        `
        }
      </div>
    `;

    const crashCanvas = body.querySelector<HTMLCanvasElement>('#crash-canvas')!;
    this.crashCtrl = new CrashRocketCanvas(crashCanvas);

    const launchBtn = body.querySelector<HTMLButtonElement>('#btn-crash-launch')!;
    const cashBtn = body.querySelector<HTMLButtonElement>('#btn-crash-cashout')!;

    body.querySelectorAll<HTMLButtonElement>('[data-cbet]').forEach((b) => {
      b.addEventListener('click', () => {
        if (this.crashCtrl?.isFlying()) return;
        this.crashBet = Number(b.dataset.cbet);
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    launchBtn.addEventListener('click', () => {
      if (!this.crashCtrl || this.crashCtrl.isFlying()) return;
      if (this.state.coins < this.crashBet) {
        this.showToast(`Need ${formatCoins(this.crashBet)} coins! Lower your bet or play Lucky Games.`);
        return;
      }
      this.state.coins -= this.crashBet;
      incrementQuest(this.state, 'arcade', 1);
      saveGameState(this.state);
      this.renderHud();
      this.sfx.playSpinStart();

      launchBtn.disabled = true;
      cashBtn.disabled = false;
      cashBtn.textContent = `💰 CASH OUT (1.00x)`;

      this.crashCtrl.launch(
        (m) => {
          if (cashBtn.isConnected && !cashBtn.disabled) {
            cashBtn.textContent = `💰 OUT (${m.toFixed(2)}x • ${formatCoins(Math.round(this.crashBet * m * rhinoBoost))})`;
          }
        },
        (crashedAt) => {
          this.state.crashHistory = [crashedAt, ...this.state.crashHistory].slice(0, 8);
          saveGameState(this.state);
          this.sfx.playReelStop(0);
          if (launchBtn.isConnected) launchBtn.disabled = false;
          if (cashBtn.isConnected) {
            cashBtn.disabled = true;
            cashBtn.textContent = '💥 CRASHED!';
          }
          this.showToast(`💥 Rocket crashed at ${crashedAt.toFixed(2)}x! Lost ${formatCoins(this.crashBet)}.`);
          window.setTimeout(() => {
            if (this.activeTab === 'arcade' && this.arcadeSub === 'crash' && !this.crashCtrl?.isFlying()) {
              this.renderArcadeTab();
            }
          }, 950);
        }
      );
    });

    cashBtn.addEventListener('click', () => {
      if (!this.crashCtrl || !this.crashCtrl.isFlying()) return;
      const cashed = this.crashCtrl.cashOut();
      if (cashed <= 0) return;
      const payout = Math.round(this.crashBet * cashed * rhinoBoost);
      this.state.coins += payout;
      this.state.totalWon += payout;
      this.state.crashHistory = [cashed, ...this.state.crashHistory].slice(0, 8);
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnCoinShower(18);
      this.spawnCoinFountain(14);
      launchBtn.disabled = false;
      cashBtn.disabled = true;
      cashBtn.textContent = `✅ +${formatCoins(payout)}`;
      this.showToast(`🚀 Cashed out at ${cashed.toFixed(2)}x! +${formatCoins(payout)} coins!`);
      this.renderHud();
    });

    // Hi-Lo Events
    body.querySelectorAll<HTMLButtonElement>('[data-hlbet]').forEach((b) => {
      b.addEventListener('click', () => {
        if (this.hiloActive) return;
        this.hiloBet = Number(b.dataset.hlbet);
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    body.querySelector('#btn-hilo-start')?.addEventListener('click', () => {
      if (this.state.coins < this.hiloBet) {
        this.showToast(`Need ${formatCoins(this.hiloBet)} coins for Hi-Lo!`);
        return;
      }
      this.state.coins -= this.hiloBet;
      this.hiloActive = true;
      this.hiloStreak = 0;
      this.hiloMult = 1.0;
      this.hiloCard = drawRandomCard();
      incrementQuest(this.state, 'arcade', 1);
      saveGameState(this.state);
      this.sfx.playTap();
      this.renderHud();
      this.renderArcadeTab();
    });

    const playHiLoGuess = (guess: 'high' | 'low') => {
      if (!this.hiloActive) return;
      const outcome = drawHiLoOutcomeCard(this.hiloCard.rank, guess, this.hiloStreak);
      this.hiloCard = outcome.next;
      if (outcome.won) {
        this.hiloStreak += 1;
        this.hiloMult = Number((1 + this.hiloStreak * 0.65 + (this.hiloStreak >= 3 ? 0.5 : 0)).toFixed(2));
        this.sfx.playCoin();
        if (this.hiloStreak >= 6) {
          const payout = Math.round(this.hiloBet * this.hiloMult);
          this.state.coins += payout;
          this.state.totalWon += payout;
          this.hiloActive = false;
          saveGameState(this.state);
          this.sfx.playBigWin();
          this.spawnCoinShower(18);
          this.showToast(`🃏 Max 6 Streak! +${formatCoins(payout)} coins!`);
          this.renderHud();
        }
      } else {
        this.hiloActive = false;
        saveGameState(this.state);
        this.sfx.playReelStop(0);
        this.showToast(`💥 Card was ${formatHiLoRank(outcome.next.rank)}${outcome.next.suit} — streak busted!`);
      }
      this.renderArcadeTab();
    };

    body.querySelector('#btn-hilo-high')?.addEventListener('click', () => playHiLoGuess('high'));
    body.querySelector('#btn-hilo-low')?.addEventListener('click', () => playHiLoGuess('low'));
    body.querySelector('#btn-hilo-cash')?.addEventListener('click', () => {
      if (!this.hiloActive || this.hiloStreak <= 0) return;
      const payout = Math.round(this.hiloBet * this.hiloMult);
      this.state.coins += payout;
      this.state.totalWon += payout;
      this.hiloActive = false;
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnCoinShower(14);
      this.showToast(`💰 Hi-Lo cashed out: +${formatCoins(payout)} coins!`);
      this.renderHud();
      this.renderArcadeTab();
    });
  }

  private renderRouletteAndKeno(body: HTMLElement): void {
    const rBets = [25_000_000, 100_000_000, 500_000_000];
    const kBets = [10_000_000, 25_000_000, 100_000_000];
    const rChoices: { id: RouletteBetType; label: string }[] = [
      { id: 'red', label: '🔴 Red (2x)' },
      { id: 'black', label: '⚫ Black (2x)' },
      { id: 'zero', label: '🟢 Zero (36x)' },
      { id: 'even', label: 'Even (2x)' },
      { id: 'odd', label: 'Odd (2x)' },
      { id: 'dozen1', label: '1–12 (3x)' },
      { id: 'dozen2', label: '13–24 (3x)' },
      { id: 'dozen3', label: '25–36 (3x)' },
    ];
    const petBoost = getActivePetBoost(this.state);
    const tigerMult = petBoost.pet?.id === 'tiger' ? 1.25 : 1;
    const rhinoMult = petBoost.pet?.id === 'rhino' ? 1.15 : 1;

    const lastBadge =
      this.rouletteLastNum !== null
        ? `<div style="font-size:13px;font-weight:900;color:${
            this.rouletteLastNum === 0 ? '#06d6a0' : ROULETTE_RED_NUMS.has(this.rouletteLastNum) ? '#ff5d8f' : '#e2e8f0'
          };">Last Landed: ${this.rouletteLastNum} (${
            this.rouletteLastNum === 0 ? 'GREEN 0' : ROULETTE_RED_NUMS.has(this.rouletteLastNum) ? 'RED' : 'BLACK'
          })</div>`
        : '';

    const kenoHits = this.kenoPicks.filter((n) => this.kenoDrawn.includes(n));

    body.innerHTML = `
      <div class="card" style="align-items:center;text-align:center;">
        <h2>🎡 European Roulette</h2>
        <p>Pick your bet & spin! Green <b>0</b> pays <b>36x</b>.${tigerMult > 1 ? ' <b style="color:#f72585;">(+25% Tiger Boost!)</b>' : ''}</p>
        <canvas id="roulette-canvas" width="216" height="216"></canvas>
        ${lastBadge}
        <div class="subtab-strip" style="justify-content:center;max-width:100%;">
          ${rBets
            .map(
              (amt) =>
                `<button class="subtab-btn ${this.rouletteBet === amt ? 'active' : ''}" data-rbet="${amt}">${formatCoins(amt)}</button>`
            )
            .join('')}
        </div>
        <div class="roulette-bet-grid" style="width:100%;">
          ${rChoices
            .map(
              (ch) =>
                `<button class="subtab-btn ${this.rouletteBetType === ch.id ? 'active' : ''}" data-rtype="${ch.id}" style="font-size:11px;padding:6px 4px;">${ch.label}</button>`
            )
            .join('')}
        </div>
        <button class="action-btn" id="btn-roulette-spin">🎡 Spin Roulette (${formatCoins(this.rouletteBet)})</button>
      </div>

      <div class="card" style="text-align:center;">
        <h2>🔢 Keno Lucky Bingo</h2>
        <p>Pick <b>5 numbers</b> (1–24), draw 8 balls! 3 hits = <b>2.5x</b> • 4 = <b>8x</b> • 5 = <b>35x</b>!</p>
        <div class="subtab-strip" style="justify-content:center;max-width:100%;">
          ${kBets
            .map(
              (amt) =>
                `<button class="subtab-btn ${this.kenoBet === amt ? 'active' : ''}" data-kbet="${amt}">${formatCoins(amt)}</button>`
            )
            .join('')}
        </div>
        <div class="keno-grid">
          ${Array.from({ length: 24 }, (_, i) => i + 1)
            .map((num) => {
              const picked = this.kenoPicks.includes(num);
              const drawn = this.kenoDrawn.includes(num);
              const hit = picked && drawn;
              const cls = hit ? 'hit' : drawn ? 'drawn' : picked ? 'picked' : '';
              return `<button class="keno-num ${cls}" data-knum="${num}">${num}</button>`;
            })
            .join('')}
        </div>
        ${
          this.kenoDrawn.length > 0
            ? `<div style="font-size:12px;font-weight:800;color:#ffd166;">Drawn: ${this.kenoDrawn.join(' • ')} (${kenoHits.length} hit${kenoHits.length === 1 ? '' : 's'} = ${KENO_PAYOUTS[kenoHits.length] ?? 0}x)</div>`
            : `<div style="font-size:12px;color:#c7b8e8;">Picked ${this.kenoPicks.length}/5 numbers</div>`
        }
        <div style="display:flex;gap:8px;">
          <button class="action-btn secondary" style="flex:1;" id="btn-keno-quick">🎲 Quick Pick</button>
          <button class="action-btn green" style="flex:1.4;" id="btn-keno-draw">Draw 8 Balls (${formatCoins(this.kenoBet)})</button>
        </div>
      </div>
    `;

    const rCanvas = body.querySelector<HTMLCanvasElement>('#roulette-canvas')!;
    this.rouletteCtrl = new RouletteWheelCanvas(rCanvas);

    body.querySelectorAll<HTMLButtonElement>('[data-rbet]').forEach((b) => {
      b.addEventListener('click', () => {
        if (this.rouletteCtrl?.isSpinning()) return;
        this.rouletteBet = Number(b.dataset.rbet);
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });
    body.querySelectorAll<HTMLButtonElement>('[data-rtype]').forEach((b) => {
      b.addEventListener('click', () => {
        if (this.rouletteCtrl?.isSpinning()) return;
        this.rouletteBetType = b.dataset.rtype as RouletteBetType;
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    const spinBtn = body.querySelector<HTMLButtonElement>('#btn-roulette-spin')!;
    spinBtn.addEventListener('click', () => {
      if (!this.rouletteCtrl || this.rouletteCtrl.isSpinning()) return;
      if (this.state.coins < this.rouletteBet) {
        this.showToast(`Need ${formatCoins(this.rouletteBet)} coins for Roulette!`);
        return;
      }
      this.state.coins -= this.rouletteBet;
      incrementQuest(this.state, 'arcade', 1);
      saveGameState(this.state);
      this.renderHud();
      spinBtn.disabled = true;

      const landedNum = Math.floor(Math.random() * 37);
      this.rouletteCtrl.spinTo(
        landedNum,
        () => {
          this.rouletteLastNum = landedNum;
          const basePayout = evaluateRouletteBet(landedNum, this.rouletteBetType, this.rouletteBet);
          const payout = Math.round(basePayout * tigerMult);
          if (payout > 0) {
            this.state.coins += payout;
            this.state.totalWon += payout;
            this.sfx.playBigWin();
            this.spawnCoinShower(18);
            this.showToast(`🎡 Landed ${landedNum}! Won +${formatCoins(payout)} coins!`);
          } else {
            this.sfx.playReelStop(0);
            this.showToast(`🎡 Landed ${landedNum} — House wins!`);
          }
          saveGameState(this.state);
          this.renderHud();
          if (this.activeTab === 'arcade' && this.arcadeSub === 'casino') {
            this.renderArcadeTab();
          }
        },
        () => this.sfx.playWheelTick()
      );
    });

    // Keno Handlers
    body.querySelectorAll<HTMLButtonElement>('[data-kbet]').forEach((b) => {
      b.addEventListener('click', () => {
        this.kenoBet = Number(b.dataset.kbet);
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    body.querySelectorAll<HTMLButtonElement>('[data-knum]').forEach((b) => {
      b.addEventListener('click', () => {
        const num = Number(b.dataset.knum);
        this.kenoDrawn = [];
        if (this.kenoPicks.includes(num)) {
          this.kenoPicks = this.kenoPicks.filter((x) => x !== num);
        } else if (this.kenoPicks.length < 5) {
          this.kenoPicks = [...this.kenoPicks, num].sort((a, b) => a - b);
        } else {
          this.kenoPicks = [...this.kenoPicks.slice(1), num].sort((a, b) => a - b);
        }
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    body.querySelector('#btn-keno-quick')?.addEventListener('click', () => {
      this.kenoDrawn = [];
      this.kenoPicks = Array.from({ length: 24 }, (_, i) => i + 1)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .sort((a, b) => a - b);
      this.sfx.playTap();
      this.renderArcadeTab();
    });

    body.querySelector('#btn-keno-draw')?.addEventListener('click', () => {
      if (this.kenoPicks.length < 5) {
        this.showToast('Pick 5 numbers first (or tap Quick Pick)!');
        return;
      }
      if (this.state.coins < this.kenoBet) {
        this.showToast(`Need ${formatCoins(this.kenoBet)} coins for Keno!`);
        return;
      }
      this.state.coins -= this.kenoBet;
      incrementQuest(this.state, 'arcade', 1);
      const res = drawKenoRound(this.kenoPicks, this.kenoBet, rhinoMult > 1);
      this.kenoDrawn = res.drawn;
      if (res.payout > 0) {
        this.state.coins += res.payout;
        this.state.totalWon += res.payout;
        this.sfx.playBigWin();
        this.spawnCoinShower(14);
        this.showToast(`🔢 Keno ${res.hits.length}/5 Hits! +${formatCoins(res.payout)} coins!`);
      } else {
        this.sfx.playReelStop(0);
        this.showToast(`🔢 Only ${res.hits.length} hit${res.hits.length === 1 ? '' : 's'} — try again!`);
      }
      saveGameState(this.state);
      this.renderHud();
      this.renderArcadeTab();
    });
  }

  private renderFoxGashaponAndPuzzle(body: HTMLElement): void {
    const ch = getCurrentPuzzleChapter(this.state);
    const piecesOwned = this.state.puzzlePieces.length;
    const hasToken = this.state.gashaponTokens > 0;

    body.innerHTML = `
      <div class="card" style="align-items:center;text-align:center;">
        <h2>🫧 Crazy Fox Gashapon</h2>
        <p>Turn the capsule crank to pop rare <b>🧩 Puzzle Pieces</b>, <b>🍖 Pet Treats</b>, <b>🃏 Joker Cards</b> & Jackpots!</p>
        <div style="font-size:12px;font-weight:800;color:#ffd166;">
          🫧 Tokens: <b>${this.state.gashaponTokens}</b> • 🍖 Treats: <b>${this.state.petTreats}</b> • 🃏 Jokers: <b>${this.state.jokerCards}</b>
        </div>
        <canvas id="gashapon-canvas" width="220" height="210"></canvas>
        <button class="action-btn ${hasToken ? 'green' : ''}" id="btn-gashapon-crank">
          ${hasToken ? `🫧 Crank Capsule (1 Token • ${this.state.gashaponTokens} left)` : `🫧 Crank Capsule (🪙 ${formatCoins(GASHAPON_COIN_COST)})`}
        </button>
      </div>

      <div class="card" style="text-align:center;">
        <h2>🧩 Puzzle: ${ch.title} (${piecesOwned}/9)</h2>
        <p>Collect all 9 pieces from Slots & Gashapon to win <b>🪙 ${formatCoins(ch.rewardCoins)} + ${ch.rewardChests}🎁 + 1🃏 Joker</b>!</p>
        <div class="puzzle-grid">
          ${ch.tiles
            .map((emoji, idx) => {
              const owned = this.state.puzzlePieces.includes(idx);
              return `
                <div class="puzzle-cell ${owned ? 'owned' : 'missing'}">
                  <span>${owned ? emoji : '❓'}</span>
                  <small style="font-size:9px;color:${owned ? '#ffd166' : '#c7b8e8'};">#${idx + 1}</small>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    const gCanvas = body.querySelector<HTMLCanvasElement>('#gashapon-canvas')!;
    this.gashaponCtrl = new GashaponCanvas(gCanvas);

    const crankBtn = body.querySelector<HTMLButtonElement>('#btn-gashapon-crank')!;
    crankBtn.addEventListener('click', () => {
      if (!this.gashaponCtrl || this.gashaponCtrl.isCranking()) return;
      if (this.state.gashaponTokens > 0) {
        this.state.gashaponTokens -= 1;
      } else if (this.state.coins >= GASHAPON_COIN_COST) {
        this.state.coins -= GASHAPON_COIN_COST;
      } else {
        this.showToast(`Need 1 Token or ${formatCoins(GASHAPON_COIN_COST)} coins!`);
        return;
      }
      incrementQuest(this.state, 'arcade', 1);
      saveGameState(this.state);
      this.renderHud();
      this.sfx.playSpinStart();
      crankBtn.disabled = true;

      const colors = ['#ff5d8f', '#4cc9f0', '#ffd166', '#06d6a0', '#c084fc'];
      const capColor = colors[Math.floor(Math.random() * colors.length)];

      this.gashaponCtrl.crank(capColor, () => {
        const roll = Math.random();
        let prizeMsg = '';
        if (roll < 0.36) {
          const puz = grantRandomPuzzlePiece(this.state);
          if (puz.completedChapter) {
            prizeMsg = `🎉 PUZZLE COMPLETE! +${formatCoins(puz.completedChapter.rewardCoins)} +🃏 Joker!`;
          } else {
            prizeMsg = `🫧 Capsule opened: 🧩 Puzzle Piece #${(puz.pieceIdx ?? 0) + 1}!`;
          }
        } else if (roll < 0.62) {
          this.state.petTreats += 3;
          prizeMsg = '🫧 Capsule opened: +3 🍖 Pet Treats!';
        } else if (roll < 0.85) {
          const coins = 85_000_000;
          this.state.coins += coins;
          this.state.totalWon += coins;
          prizeMsg = `🫧 Capsule opened: +🪙 ${formatCoins(coins)} Coins!`;
        } else if (roll < 0.95) {
          this.state.chests += 2;
          this.state.shields = Math.min(3, this.state.shields + 1);
          prizeMsg = '🫧 Capsule opened: +2 🎁 Chests & +1 🛡️ Shield!';
        } else {
          this.state.jokerCards += 1;
          prizeMsg = '🫧 ULTRA RARE! +1 🃏 Joker Wild Card!';
        }
        saveGameState(this.state);
        this.sfx.playBigWin();
        this.spawnConfettiBurst(24);
        this.spawnCoinShower(14);
        this.showToast(prizeMsg);
        this.renderHud();
        if (this.activeTab === 'arcade' && this.arcadeSub === 'fox') {
          this.renderArcadeTab();
        }
      });
    });
  }

  private renderDozer(body: HTMLElement): void {
    body.innerHTML = `
      <div class="card" style="align-items:center;text-align:center;">
        <h2>🪙 Coin Dozer</h2>
        <p>Drop coins (1M each, free if under 1M) to push 💎 15M gems, 🎟️ free spins & 🎁 chests!</p>
        <canvas id="dozer-canvas" width="300" height="250" style="border-radius:14px;border:2px solid #ffd166;cursor:pointer;max-width:100%;"></canvas>
        <button class="action-btn" id="btn-dozer-drop">Drop Coin (1M)</button>
      </div>
    `;

    const canvas = body.querySelector<HTMLCanvasElement>('#dozer-canvas')!;
    this.dozerCtrl = new CoinDozerController(canvas, {
      onDropCost: (cost) => {
        const effectiveCost = this.state.coins >= cost ? cost : 0;
        if (effectiveCost > 0) {
          this.state.coins -= effectiveCost;
        }
        incrementQuest(this.state, 'arcade', 1);
        saveGameState(this.state);
        this.renderHud();
        return true;
      },
      onScoreCoins: (c, chests, spins) => {
        this.state.coins += c;
        this.state.totalWon += c;
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

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        this.dozerCtrl?.dropCoin((e.clientX - rect.left) / rect.width);
      }
    });
    body.querySelector('#btn-dozer-drop')?.addEventListener('click', () => {
      this.dozerCtrl?.dropCoin(0.3 + Math.random() * 0.4);
    });
  }

  private renderPlinko(body: HTMLElement): void {
    const plinkoBets = [5_000_000, 25_000_000, 100_000_000, 500_000_000, 1_000_000_000];
    body.innerHTML = `
      <div class="card" style="align-items:center;text-align:center;">
        <h2>🟢 Plinko Drop</h2>
        <p>Wager per ball and drop for up to <b>12x</b> edge multipliers!</p>
        <div class="subtab-strip" style="justify-content:center;max-width:100%;">
          ${plinkoBets
            .map(
              (amt) =>
                `<button class="subtab-btn ${this.plinkoBet === amt ? 'active' : ''}" data-pbet="${amt}">${formatCoins(amt)}</button>`
            )
            .join('')}
        </div>
        <canvas id="plinko-canvas" width="300" height="260" style="border-radius:14px;border:2px solid #4cc9f0;max-width:100%;"></canvas>
        <button class="action-btn green" id="btn-plinko-drop">Drop Ball (Bet ${formatCoins(this.plinkoBet)})</button>
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
        if (mult >= 3) {
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
      if (this.state.coins < this.plinkoBet) {
        this.showToast(`Need ${formatCoins(this.plinkoBet)} coins! Lower your bet or play Lucky Games.`);
        return;
      }
      this.state.coins -= this.plinkoBet;
      incrementQuest(this.state, 'arcade', 1);
      saveGameState(this.state);
      this.renderHud();
      this.plinkoCtrl?.dropBall(this.plinkoBet);
    });
  }

  private renderHighRoller(body: HTMLElement): void {
    const flipBets = [50_000_000, 250_000_000, 1_000_000_000];
    const allInHalf = Math.max(10_000_000, Math.floor(this.state.coins * 0.5));
    const vaultBets = [25_000_000, 100_000_000, 500_000_000, 1_000_000_000];
    const currentVaultMult = this.vaultStep > 0 ? VAULT_MULTS[Math.min(VAULT_MULTS.length - 1, this.vaultStep - 1)] : 0;
    const currentVaultCashout = Math.round(this.vaultBet * currentVaultMult);

    body.innerHTML = `
      <div class="card">
        <h2>🔥 Crimson Coin Flip (2x)</h2>
        <p>Pick your wager and call <b>Gold</b> or <b>Ruby</b> to double your bet!</p>
        <div class="subtab-strip" style="max-width:100%;">
          ${flipBets
            .map(
              (amt) =>
                `<button class="subtab-btn ${this.highRollerBet === amt ? 'active' : ''}" data-fbet="${amt}">${formatCoins(amt)}</button>`
            )
            .join('')}
          <button class="subtab-btn ${this.highRollerBet === -1 ? 'active' : ''}" data-fbet="-1">50% ALL-IN (${formatCoins(allInHalf)})</button>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="action-btn" style="flex:1;" id="btn-flip-gold">🪙 GOLD (2x)</button>
          <button class="action-btn pink" style="flex:1;" id="btn-flip-ruby">💎 RUBY (2x)</button>
        </div>
      </div>

      <div class="card">
        <h2>🧨 Bomb Vault (Up to 6.5x)</h2>
        <p>Crack safe tiles to climb multipliers — watch out for hidden bombs!</p>
        ${
          !this.vaultActive
            ? `
          <div class="subtab-strip" style="max-width:100%;">
            ${vaultBets
              .map(
                (amt) =>
                  `<button class="subtab-btn ${this.vaultBet === amt ? 'active' : ''}" data-vbet="${amt}">${formatCoins(amt)}</button>`
              )
              .join('')}
          </div>
          <button class="action-btn secondary" id="btn-vault-start">Open Vault (${formatCoins(this.vaultBet)} Bet)</button>
        `
            : `
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#ffd166;font-weight:800;">
            <span>Stake: 🪙 ${formatCoins(this.vaultBet)}</span>
            <span>Next Safe: ${VAULT_MULTS[Math.min(VAULT_MULTS.length - 1, this.vaultStep)]}x</span>
          </div>
          <div class="vault-grid">
            ${this.vaultRevealed
              .map((st, idx) => {
                if (st === 'safe') {
                  return `<div class="vault-tile safe"><span>💎</span><small>SAFE</small></div>`;
                }
                if (st === 'bomb') {
                  return `<div class="vault-tile bomb"><span>💥</span><small>BOMB</small></div>`;
                }
                return `<button class="vault-tile" data-vault-cell="${idx}"><span>🔒</span><small>OPEN</small></button>`;
              })
              .join('')}
          </div>
          <button class="action-btn green" id="btn-vault-cashout" ${this.vaultStep <= 0 ? 'disabled' : ''}>
            ${this.vaultStep > 0 ? `💰 Cash Out 🪙 ${formatCoins(currentVaultCashout)} (${currentVaultMult}x)` : 'Pick at least 1 Safe'}
          </button>
        `
        }
      </div>
    `;

    body.querySelectorAll<HTMLButtonElement>('[data-fbet]').forEach((b) => {
      b.addEventListener('click', () => {
        this.highRollerBet = Number(b.dataset.fbet);
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    const playFlip = (side: 'gold' | 'ruby') => {
      const stake = this.highRollerBet === -1 ? Math.max(10_000_000, Math.floor(this.state.coins * 0.5)) : this.highRollerBet;
      if (this.state.coins < stake) {
        this.showToast(`Need ${formatCoins(stake)} coins! Play Lucky Games or lower wager.`);
        return;
      }
      this.state.coins -= stake;
      incrementQuest(this.state, 'arcade', 1);

      // House-rigged odds: 38% win / 62% house win
      const won = Math.random() < 0.38;
      const landed = won ? side : side === 'gold' ? 'ruby' : 'gold';
      if (won) {
        const payout = stake * 2;
        this.state.coins += payout;
        this.state.totalWon += stake;
        this.sfx.playBigWin();
        this.spawnCoinShower(16);
        this.showToast(`🔥 ${landed === 'gold' ? '🪙 GOLD' : '💎 RUBY'}! Won +${formatCoins(stake)} profit!`);
      } else {
        this.sfx.playReelStop(0);
        this.showToast(`💥 Landed ${landed === 'gold' ? '🪙 GOLD' : '💎 RUBY'} — lost ${formatCoins(stake)}!`);
      }
      saveGameState(this.state);
      this.renderHud();
      this.renderArcadeTab();
    };

    body.querySelector('#btn-flip-gold')?.addEventListener('click', () => playFlip('gold'));
    body.querySelector('#btn-flip-ruby')?.addEventListener('click', () => playFlip('ruby'));

    body.querySelectorAll<HTMLButtonElement>('[data-vbet]').forEach((b) => {
      b.addEventListener('click', () => {
        this.vaultBet = Number(b.dataset.vbet);
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    body.querySelector('#btn-vault-start')?.addEventListener('click', () => {
      if (this.state.coins < this.vaultBet) {
        this.showToast(`Need ${formatCoins(this.vaultBet)} coins to enter Bomb Vault!`);
        return;
      }
      this.state.coins -= this.vaultBet;
      this.vaultActive = true;
      this.vaultStep = 0;
      this.vaultRevealed = Array(6).fill('hidden');
      this.vaultBombs.clear();
      while (this.vaultBombs.size < 2) {
        this.vaultBombs.add(Math.floor(Math.random() * 6));
      }
      incrementQuest(this.state, 'arcade', 1);
      saveGameState(this.state);
      this.sfx.playTap();
      this.renderHud();
      this.renderArcadeTab();
    });

    body.querySelectorAll<HTMLButtonElement>('[data-vault-cell]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.vaultActive) return;
        const idx = Number(btn.dataset.vaultCell);
        if (this.vaultRevealed[idx] !== 'hidden') return;

        // Subtle house edge: bombs set + extra trap probability after 2+ greed steps
        const extraTrapChance = this.vaultStep >= 2 ? 0.35 : 0.12;
        const hitBomb = this.vaultBombs.has(idx) || Math.random() < extraTrapChance;

        if (hitBomb) {
          this.vaultRevealed[idx] = 'bomb';
          this.vaultBombs.forEach((bIdx) => {
            if (this.vaultRevealed[bIdx] === 'hidden') this.vaultRevealed[bIdx] = 'bomb';
          });
          this.vaultActive = false;
          this.vaultStep = 0;
          saveGameState(this.state);
          this.sfx.playReelStop(0);
          this.showToast(`💥 BOOM! Vault trap ate your ${formatCoins(this.vaultBet)} stake!`);
          this.renderHud();
          this.renderArcadeTab();
          return;
        }

        this.vaultRevealed[idx] = 'safe';
        this.vaultStep += 1;
        this.sfx.playCoin();

        if (this.vaultStep >= 4) {
          const mult = VAULT_MULTS[Math.min(VAULT_MULTS.length - 1, this.vaultStep - 1)];
          const payout = Math.round(this.vaultBet * mult);
          this.state.coins += payout;
          this.state.totalWon += payout;
          this.vaultActive = false;
          this.vaultStep = 0;
          saveGameState(this.state);
          this.sfx.playBigWin();
          this.spawnCoinShower(18);
          this.showToast(`🏆 Vault Cleared (${mult}x)! +${formatCoins(payout)} coins!`);
          this.renderHud();
        }
        this.renderArcadeTab();
      });
    });

    body.querySelector('#btn-vault-cashout')?.addEventListener('click', () => {
      if (!this.vaultActive || this.vaultStep <= 0) return;
      const mult = VAULT_MULTS[Math.min(VAULT_MULTS.length - 1, this.vaultStep - 1)];
      const payout = Math.round(this.vaultBet * mult);
      this.state.coins += payout;
      this.state.totalWon += payout;
      this.vaultActive = false;
      this.vaultStep = 0;
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnCoinShower(14);
      this.showToast(`💰 Cashed out ${mult}x! +${formatCoins(payout)} coins!`);
      this.renderHud();
      this.renderArcadeTab();
    });
  }

  private renderScratchAndDice(body: HTMLElement): void {
    const allDone = this.scratchBoard.every((s) => s.revealed);
    const scratchFree = this.state.coins < SCRATCH_CARD_COST;
    const diceBets = [10_000_000, 50_000_000, 200_000_000];
    const effectiveDiceBet = this.state.coins >= this.diceBet ? this.diceBet : 0;

    body.innerHTML = `
      <div class="card">
        <h2>🎫 Golden Scratch Card</h2>
        <p>Scratch all 6 tiles for guaranteed profit + free spins!</p>
        <div class="scratch-grid">
          ${this.scratchBoard
            .map((cell, idx) =>
              cell.revealed
                ? `<div class="scratch-tile revealed"><span>${cell.emoji}</span><span style="font-size:11px;">+${formatCoins(cell.coins)}${cell.spins ? ` +${cell.spins}🎟️` : ''}</span></div>`
                : `<button class="scratch-tile" data-scratch="${idx}">❓ SCRATCH</button>`
            )
            .join('')}
        </div>
        ${allDone ? `<button class="action-btn" id="btn-new-scratch">${scratchFree ? 'New Free Scratch Card' : `Buy New Card (🪙 ${formatCoins(SCRATCH_CARD_COST)})`}</button>` : ''}
      </div>

      <div class="card">
        <h3>🎲 Lucky Dice (Hot Streak)</h3>
        <p>Roll <b>5 or higher</b> on 2 dice to win <b>1.45x</b> your bet!${effectiveDiceBet === 0 ? ' (Free recovery mode: win +15M!)' : ''}</p>
        <div class="subtab-strip" style="max-width:100%;">
          ${diceBets
            .map(
              (amt) =>
                `<button class="subtab-btn ${this.diceBet === amt ? 'active' : ''}" data-dbet="${amt}">${formatCoins(amt)}</button>`
            )
            .join('')}
        </div>
        <button class="action-btn green" id="btn-roll-dice">
          🎲 Roll Dice (${effectiveDiceBet > 0 ? `Bet ${formatCoins(effectiveDiceBet)} → ${formatCoins(Math.round(effectiveDiceBet * 1.45))}` : 'FREE Roll → +15M'})
        </button>
      </div>
    `;

    body.querySelectorAll<HTMLButtonElement>('[data-scratch]').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = Number(b.dataset.scratch);
        const tile = this.scratchBoard[idx];
        if (!tile || tile.revealed) return;
        tile.revealed = true;
        this.state.coins += tile.coins;
        this.state.totalWon += tile.coins;
        this.state.freeSpins += tile.spins;
        incrementQuest(this.state, 'arcade', 1);
        saveGameState(this.state);
        this.sfx.playCoin();
        this.renderHud();
        this.renderArcadeTab();
      });
    });

    body.querySelector('#btn-new-scratch')?.addEventListener('click', () => {
      if (this.state.coins >= SCRATCH_CARD_COST) {
        this.state.coins -= SCRATCH_CARD_COST;
        saveGameState(this.state);
      }
      this.resetScratchBoard();
      this.sfx.playTap();
      this.renderHud();
      this.renderArcadeTab();
    });

    body.querySelectorAll<HTMLButtonElement>('[data-dbet]').forEach((b) => {
      b.addEventListener('click', () => {
        this.diceBet = Number(b.dataset.dbet);
        this.sfx.playTap();
        this.renderArcadeTab();
      });
    });

    body.querySelector('#btn-roll-dice')?.addEventListener('click', () => {
      const wager = this.state.coins >= this.diceBet ? this.diceBet : 0;
      if (wager > 0) this.state.coins -= wager;

      // Player-favored weighted dice (~82% win rate for sum >= 5)
      const weightedDie = () => {
        const r = Math.random();
        if (r < 0.08) return 1;
        if (r < 0.18) return 2;
        if (r < 0.36) return 3;
        if (r < 0.56) return 4;
        if (r < 0.78) return 5;
        return 6;
      };
      const d1 = weightedDie();
      const d2 = weightedDie();
      const sum = d1 + d2;
      incrementQuest(this.state, 'arcade', 1);

      if (sum >= 5) {
        const payout = wager > 0 ? Math.round(wager * 1.45) : 15_000_000;
        this.state.coins += payout;
        this.state.totalWon += payout;
        this.sfx.playBigWin();
        this.spawnCoinShower(10);
        this.showToast(`🎲 ${d1} + ${d2} = ${sum}! Won +${formatCoins(payout)} coins!`);
      } else {
        this.sfx.playReelStop(0);
        this.showToast(`🎲 ${d1} + ${d2} = ${sum}. Rare miss — roll again!`);
      }
      saveGameState(this.state);
      this.renderHud();
      this.renderArcadeTab();
    });
  }

  private renderVillageAndRaid(body: HTMLElement): void {
    const kingdomLvl = getKingdomLevel(this.state);
    const mult = getTotalMultiplier(this.state);
    const raidFree = this.state.coins < RAID_COST;
    const cannonFree = this.state.coins < CANNON_COST;
    const flash = getActiveFlashEvent();
    const petBoost = getActivePetBoost(this.state);
    const raidMult = (flash.event.id === 'raid_madness' ? 2 : 1) * (petBoost.pet?.id === 'foxy' ? 1.35 : 1);

    body.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
          <h2>💥 Attack Cannon vs ${this.state.rivalTargetName}</h2>
          ${this.state.revengeReady ? `<span class="vip-price-tag" style="background:#ff5d8f;color:#fff;">⚡ 2x REVENGE!</span>` : ''}
        </div>
        <p>Fire your cannon at a rival building! Smash unshielded buildings for huge loot${raidMult > 1 ? ` (<b style="color:#06d6a0;">${raidMult.toFixed(2)}x Boost active!</b>)` : ''}.</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          <button class="action-btn ${this.state.revengeReady ? 'pink' : ''}" data-cannon="Tower 🏰">🏰 Tower</button>
          <button class="action-btn ${this.state.revengeReady ? 'pink' : 'secondary'}" data-cannon="Vault 🏦">🏦 Vault</button>
          <button class="action-btn ${this.state.revengeReady ? 'pink' : 'green'}" data-cannon="Statues 🗿">🗿 Statue</button>
        </div>
        <div style="font-size:11px;color:#c7b8e8;text-align:center;">
          ${this.state.revengeReady ? '⚡ Payback mode! Next shot guarantees +2x SMASH!' : cannonFree ? 'Free attack when low on coins!' : `Shot cost: 🪙 ${formatCoins(CANNON_COST)}`}
        </div>
      </div>

      <div class="card">
        <h2>🏴‍☠️ Treasure Raid</h2>
        <p>Dig 3 spots in <b>King Croc's 🐊</b> village! Shields: <b>${this.state.shields} 🛡️</b>.</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          ${this.raidValues
            .map((val, i) =>
              this.raidRevealed[i]
                ? `<div class="scratch-tile revealed"><span>💰</span><span style="font-size:11px;">+${formatCoins(Math.round(val * raidMult))}</span></div>`
                : `<button class="scratch-tile" data-raid="${i}" ${this.raidDoneBoard ? 'disabled' : ''}>❌ DIG</button>`
            )
            .join('')}
        </div>
        ${this.raidDoneBoard ? `<button class="action-btn" id="btn-next-raid">${raidFree ? 'Find Free Rival' : `Next Rival (🪙 ${formatCoins(RAID_COST)})`}</button>` : ''}
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

    body.querySelectorAll<HTMLButtonElement>('[data-cannon]').forEach((b) => {
      b.addEventListener('click', () => {
        const target = b.dataset.cannon!;
        if (this.state.coins >= CANNON_COST) {
          this.state.coins -= CANNON_COST;
        }
        incrementQuest(this.state, 'arcade', 1);
        const isRevenge = this.state.revengeReady;
        this.state.revengeReady = false;
        const shielded = !isRevenge && Math.random() < 0.35;
        const baseLoot = shielded ? 22_000_000 : isRevenge ? 130_000_000 : 75_000_000;
        const loot = Math.round(baseLoot * raidMult);

        this.state.coins += loot;
        this.state.totalWon += loot;
        this.state.shields = Math.min(3, this.state.shields + (shielded ? 0 : 1));
        this.state.rivalTargetName = Math.random() < 0.5 ? 'Crazy Foxy 🦊' : 'King Croc 🐊';
        saveGameState(this.state);

        if (shielded) {
          this.sfx.playReelStop(1);
          this.showToast(`🛡️ Blocked by shield at ${target}! Salvaged +${formatCoins(loot)} coins.`);
        } else {
          this.sfx.playBigWin();
          this.spawnCoinShower(16);
          this.spawnConfettiBurst(22);
          this.showToast(`💥 ${isRevenge ? '2x REVENGE ' : ''}SMASHED ${target}! Stole +${formatCoins(loot)} coins!`);
        }
        this.renderHud();
        this.renderArcadeTab();
      });
    });

    body.querySelectorAll<HTMLButtonElement>('[data-raid]').forEach((b) => {
      b.addEventListener('click', () => {
        const idx = Number(b.dataset.raid);
        if (this.raidRevealed[idx] || this.raidDoneBoard) return;
        this.raidRevealed[idx] = true;
        const loot = Math.round(this.raidValues[idx] * raidMult);
        this.state.coins += loot;
        this.state.totalWon += loot;
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
      if (this.state.coins >= RAID_COST) {
        this.state.coins -= RAID_COST;
        saveGameState(this.state);
      }
      this.resetRaidBoard();
      this.sfx.playTap();
      this.renderHud();
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

  // ===================== 3. CHARACTER, STYLE SHOP & LUCKY PETS TAB =====================
  private renderCharacterTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-character')!;
    const petBoost = getActivePetBoost(this.state);

    const subNavHtml = `
      <div class="subtab-strip">
        <button class="subtab-btn ${this.characterSub === 'studio' ? 'active' : ''}" data-csub="studio">👕 Mascot & Shop</button>
        <button class="subtab-btn ${this.characterSub === 'pets' ? 'active' : ''}" data-csub="pets">🦊 Lucky Pets (${this.state.petTreats} 🍖)</button>
      </div>
    `;

    if (this.characterSub === 'pets') {
      panel.innerHTML = `
        ${subNavHtml}
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h2>🦊 Active Companion Pet</h2>
            <span class="vip-price-tag" id="pet-boost-timer">${petBoost.pet ? this.formatMmSs(petBoost.remainingMs) : 'Asleep'}</span>
          </div>
          <p>Feed your chosen pet <b>1 🍖 Treat</b> to wake it for <b>15 minutes</b> of live bonuses! Treats drop from Slots, Gashapon & Balloons.</p>
          <div style="display:flex;gap:8px;">
            <button class="action-btn green" style="flex:1;" id="btn-feed-pet" ${this.state.petTreats <= 0 ? 'disabled' : ''}>
              🍖 Feed Pet (${this.state.petTreats} left)
            </button>
            <button class="action-btn secondary" style="flex:1;" id="btn-buy-treats">
              Buy 3 🍖 (🪙 ${formatCoins(PET_TREATS_SHOP_COST)})
            </button>
          </div>
        </div>

        <div class="card">
          <h3>Select Your Companion</h3>
          ${PET_CATALOG.map((p) => {
            const selected = this.state.activePetId === p.id;
            return `
              <div class="building-row" style="${selected ? `border-color:${p.accent};background:rgba(255,209,102,0.12);` : ''}">
                <div class="building-icon" style="font-size:30px;">${p.emoji}</div>
                <div class="building-info">
                  <strong>${p.name} — <span style="color:${p.accent};">${p.perkTitle}</span></strong>
                  <small>${p.description}</small>
                </div>
                <button class="action-btn ${selected ? 'green' : 'secondary'}" data-pickpet="${p.id}">
                  ${selected ? 'Active ✓' : 'Select'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;

      panel.querySelectorAll<HTMLButtonElement>('[data-csub]').forEach((b) => {
        b.addEventListener('click', () => {
          this.characterSub = b.dataset.csub as CharacterSubTab;
          this.sfx.playTap();
          this.renderCharacterTab();
        });
      });

      panel.querySelectorAll<HTMLButtonElement>('[data-pickpet]').forEach((b) => {
        b.addEventListener('click', () => {
          this.state.activePetId = b.dataset.pickpet as PetId;
          saveGameState(this.state);
          this.sfx.playTap();
          this.renderCharacterTab();
        });
      });

      panel.querySelector('#btn-feed-pet')?.addEventListener('click', () => {
        if (this.state.petTreats <= 0) return;
        this.state.petTreats -= 1;
        const base = this.state.petBoostUntil && this.state.petBoostUntil > Date.now() ? this.state.petBoostUntil : Date.now();
        this.state.petBoostUntil = Math.min(Date.now() + 60 * 60 * 1000, base + PET_BOOST_DURATION_MS);
        saveGameState(this.state);
        this.sfx.playUpgrade();
        this.spawnConfettiBurst(16);
        const pet = PET_CATALOG.find((x) => x.id === this.state.activePetId) ?? PET_CATALOG[0];
        this.showToast(`${pet.emoji} ${pet.name} fed! Boost active for 15+ minutes!`);
        this.renderCharacterTab();
      });

      panel.querySelector('#btn-buy-treats')?.addEventListener('click', () => {
        if (this.state.coins < PET_TREATS_SHOP_COST) {
          this.showToast(`Need ${formatCoins(PET_TREATS_SHOP_COST)} coins for 3 Treats!`);
          return;
        }
        this.state.coins -= PET_TREATS_SHOP_COST;
        this.state.petTreats += 3;
        saveGameState(this.state);
        this.sfx.playCoin();
        this.showToast('🍖 Bought +3 Pet Treats!');
        this.renderHud();
        this.renderCharacterTab();
      });
      return;
    }

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
      ${subNavHtml}
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

    panel.querySelectorAll<HTMLButtonElement>('[data-csub]').forEach((b) => {
      b.addEventListener('click', () => {
        this.cleanupSubCanvas();
        this.characterSub = b.dataset.csub as CharacterSubTab;
        this.sfx.playTap();
        this.renderCharacterTab();
      });
    });

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
    const activeSim = this.state.simOfferProcessing;
    const vikingDef = VIKING_QUEST_STEPS[this.state.vikingStep] ?? VIKING_QUEST_STEPS[0];
    const vikingKeyProcessing = activeSim?.offerId === 'viking_key';
    const streakSimProcessing = activeSim?.offerId === 'streak_save';

    const formatWait = (ms: number) => {
      const s = Math.ceil(ms / 1000);
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${rem}s`;
    };

    const vikingBtnText =
      vikingDef.kind === 'paywall' && vikingKeyProcessing && activeSim
        ? `⏳ Forging Valhalla Key (<span id="sim-offer-inline-timer">${this.formatMmSs(activeSim.until - now)}</span>)...`
        : vikingDef.kind === 'free'
          ? '🎁 Claim Provisions (Free)'
          : vikingDef.kind === 'paywall'
            ? `🗝️ Unlock ${vikingDef.fakePriceLabel || '€4.99'} Key (€0.00 Real Money)`
            : vikingDef.kind === 'grand'
              ? '🏆 Claim Valhalla Grand Hoard!'
              : `⚔️ Wager 🪙 ${formatCoins(vikingDef.costCoins)}`;

    const streakBtnText =
      streakSimProcessing && activeSim
        ? `⏳ Verifying Streak Boost (<span id="sim-offer-inline-timer">${this.formatMmSs(activeSim.until - now)}</span>)...`
        : '⚡ €1.99 Streak Supercharge (€0.00 Real Money)';

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

      <div class="card vip-pass-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <h2>⚔️ Viking Quest (Stage ${this.state.vikingStage})</h2>
          <span class="vip-price-tag">Step ${this.state.vikingStep + 1}/${VIKING_QUEST_STEPS.length}</span>
        </div>
        <p style="font-size:12px;">Climb the high-stakes Viking ladder to win the Valhalla Grand Hoard! Lose a wager and get knocked back a step.</p>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;">
          ${VIKING_QUEST_STEPS.map((st, idx) => {
            const done = idx < this.state.vikingStep;
            const current = idx === this.state.vikingStep;
            const bg = done
              ? 'rgba(6,214,160,0.28);border-color:#06d6a0;color:#06d6a0'
              : current
                ? 'rgba(255,209,102,0.28);border-color:#ffd166;color:#ffd166'
                : 'rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.16);color:#a79bc2';
            const ico = done ? '✓' : st.kind === 'paywall' ? '🗝️' : st.kind === 'grand' ? '🏆' : `${idx + 1}`;
            return `<div style="text-align:center;padding:6px 2px;border-radius:9px;border:1.5px solid;font-size:12px;font-weight:900;${bg}">${ico}</div>`;
          }).join('')}
        </div>
        <div style="background:rgba(0,0,0,0.24);border-radius:12px;padding:9px;border:1px solid rgba(255,255,255,0.12);">
          <div style="font-size:13px;font-weight:900;color:#ffd166;">${vikingDef.title}</div>
          <div style="font-size:11px;color:#c7b8e8;margin-top:2px;">${vikingDef.rewardLabel}</div>
        </div>
        <button class="action-btn ${vikingDef.kind === 'free' || vikingDef.kind === 'grand' ? 'green' : vikingDef.kind === 'paywall' ? '' : 'pink'}" id="btn-viking-step">
          ${vikingBtnText}
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
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button class="action-btn secondary" id="btn-daily" ${dailyLeft > 0 ? 'disabled' : ''}>
            ${dailyLeft > 0 ? `Next in ${formatWait(dailyLeft)}` : `Claim Daily + 🎁 Chest`}
          </button>
          <button class="action-btn" id="btn-streak-supercharge" style="font-size:12px;">
            ${streakBtnText}
          </button>
        </div>
      </div>
    `;

    this.drawWheelCanvas();
    body.querySelector('#btn-spin-wheel')?.addEventListener('click', () => this.spinFortuneWheel());

    body.querySelector('#btn-viking-step')?.addEventListener('click', () => {
      const st = VIKING_QUEST_STEPS[this.state.vikingStep] ?? VIKING_QUEST_STEPS[0];
      if (st.kind === 'paywall') {
        this.handleSimOfferAction({
          offerId: 'viking_key',
          title: '🗝️ Gate of Valhalla Key',
          priceLabel: st.fakePriceLabel || '€4.99',
          rewardSummary: st.rewardLabel,
          durationMs: (st.waitSeconds ?? 180) * 1000,
        });
        return;
      }
      if (st.kind === 'free') {
        this.state.coins += 120_000_000;
        this.state.totalWon += 120_000_000;
        this.state.petTreats += 2;
        this.state.vikingStep = 1;
        saveGameState(this.state);
        this.sfx.playBigWin();
        this.spawnCoinShower(14);
        this.showToast('⚔️ Longship loaded! +120M Coins & +2 🍖 Pet Treats!');
        this.renderAll();
        return;
      }
      if (st.kind === 'grand') {
        this.state.coins += 3_000_000_000;
        this.state.totalWon += 3_000_000_000;
        this.state.jokerCards += 1;
        this.state.gashaponTokens += 4;
        this.state.vikingStage += 1;
        this.state.vikingStep = 0;
        saveGameState(this.state);
        this.sfx.playBigWin();
        this.spawnCoinShower(28);
        this.spawnCoinFountain(24);
        this.spawnConfettiBurst(36);
        this.showToast(`🏆 VALHALLA HOARD! +3B Coins, +1 🃏 Joker & +4 Tokens! Stage ${this.state.vikingStage} begins!`);
        this.renderAll();
        return;
      }

      // Wager step
      if (this.state.coins < st.costCoins) {
        this.showToast(`You need ${formatCoins(st.costCoins)} coins to challenge ${st.title}!`);
        return;
      }
      this.state.coins -= st.costCoins;
      incrementQuest(this.state, 'arcade', 1);

      const hitChance = st.step === 1 ? 0.7 : st.step === 2 ? 0.55 : 0.5;
      const won = Math.random() < hitChance;
      if (won) {
        if (st.step === 1) {
          this.state.coins += 300_000_000;
          this.state.totalWon += 300_000_000;
          this.state.chests += 2;
          this.state.vikingStep = 2;
          this.showToast('⚔️ Storm cleared! +300M Coins & +2 Chests!');
        } else if (st.step === 2) {
          this.state.coins += 900_000_000;
          this.state.totalWon += 900_000_000;
          this.state.gashaponTokens += 2;
          this.state.vikingStep = 3;
          this.showToast('⚔️ Berserker defeated! +900M Coins & +2 🫧 Tokens!');
        } else {
          this.state.coins += 2_500_000_000;
          this.state.totalWon += 2_500_000_000;
          this.state.chests += 4;
          this.state.vikingStep = 5;
          this.showToast('🐙 Kraken Slain! +2.5B Coins & +4 Chests! Grand Hoard ready!');
        }
        this.sfx.playBigWin();
        this.spawnCoinShower(18);
        this.spawnConfettiBurst(24);
      } else {
        // Knock back 1 step on Steps 1-2; on Kraken Wager (Step 4) stay past the Valhalla Key wall so player doesn't lose key
        if (st.step < 4) {
          this.state.vikingStep = Math.max(0, st.step - 1);
        }
        this.sfx.playReelStop(0);
        this.showToast(`💥 Viking raid repelled! Lost ${formatCoins(st.costCoins)} coins.`);
      }
      saveGameState(this.state);
      this.renderAll();
    });

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
    body.querySelector('#btn-streak-supercharge')?.addEventListener('click', () => {
      this.handleSimOfferAction({
        offerId: 'streak_save',
        title: '⚡ Daily Streak Supercharge',
        priceLabel: '€1.99',
        rewardSummary: '+250M Coins, +2 Treasure Chests & +1 Streak Day',
        durationMs: 120_000,
      });
    });
  }

  private renderCardsAndQuestsBody(body: HTMLElement): void {
    const ownedUnique = CARDS.filter((c) => (this.state.cards[c.id] ?? 0) > 0).length;
    const cardsBoom = getActiveFlashEvent().event.id === 'cards_boom';
    body.innerHTML = `
      <div class="card">
        <h2>🎁 Treasure Chests & Cards (${ownedUnique}/${CARDS.length})</h2>
        <p style="font-size:12px;">
          ${cardsBoom ? '🃏 <b style="color:#c084fc;">CARDS BOOM ACTIVE:</b> Opening a chest drops <b>4 cards</b> instead of 3!' : 'Open chests for album cards. Duplicate cards automatically fill your Star Vault!'}
        </p>
        <button class="action-btn" id="btn-open-chest" ${this.state.chests <= 0 ? 'disabled' : ''}>
          🎁 Open Chest (${this.state.chests} left • ${cardsBoom ? '4' : '3'} cards)
        </button>
      </div>

      <div class="card vip-pass-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <h3>⭐ Duplicate Star Vault</h3>
          <span class="vip-price-tag">⭐ ${this.state.duplicateStars} • 🃏 ${this.state.jokerCards} Jokers</span>
        </div>
        <p style="font-size:11px;">Duplicate cards convert into Stars (★). Trade Stars for giant coin packs or rare Joker Wild Cards! Tap <b>🃏 Use Joker</b> on any missing card below.</p>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
          <button class="action-btn secondary" data-star-swap="15" ${this.state.duplicateStars < 15 ? 'disabled' : ''} style="font-size:11px;padding:8px 4px;">
            15 ⭐<br/>300M + 2🎁
          </button>
          <button class="action-btn secondary" data-star-swap="35" ${this.state.duplicateStars < 35 ? 'disabled' : ''} style="font-size:11px;padding:8px 4px;">
            35 ⭐<br/>1B + 🫧 + 5🍖
          </button>
          <button class="action-btn green" data-star-swap="60" ${this.state.duplicateStars < 60 ? 'disabled' : ''} style="font-size:11px;padding:8px 4px;">
            60 ⭐<br/>+1 🃏 Joker
          </button>
        </div>
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
                  const canJoker = count === 0 && this.state.jokerCards > 0;
                  return `
                    <div class="collect-card ${count > 0 ? 'owned' : 'missing'}" ${canJoker ? 'style="opacity:0.9;filter:none;border-color:#06d6a0;"' : ''}>
                      <div class="c-emoji">${c.emoji}</div>
                      <div class="c-name">${c.name}</div>
                      <div class="c-count">${count > 0 ? `${count}x • ${'★'.repeat(c.stars)}` : `${c.rarity} • ${'★'.repeat(c.stars)}`}</div>
                      ${
                        canJoker
                          ? `<button class="action-btn green" data-use-joker="${c.id}" style="margin-top:4px;padding:3px 6px;font-size:10px;width:100%;">🃏 Use Joker</button>`
                          : ''
                      }
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
      const prevStars = this.state.duplicateStars;
      const cardCount = getActiveFlashEvent().event.id === 'cards_boom' ? 4 : 3;
      const drawn = openCardChest(this.state, cardCount);
      const starsGained = this.state.duplicateStars - prevStars;
      saveGameState(this.state);
      this.sfx.playBigWin();
      if (starsGained > 0) {
        this.showToast(`⭐ Duplicates converted to +${starsGained} Vault Stars!`);
      }
      this.showChestModal(drawn, starsGained);
      this.renderAll();
    });

    body.querySelectorAll<HTMLButtonElement>('[data-star-swap]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cost = Number(btn.dataset.starSwap);
        if (this.state.duplicateStars < cost) {
          this.showToast(`You need ${cost} ⭐ Duplicate Stars!`);
          return;
        }
        this.state.duplicateStars -= cost;
        if (cost === 15) {
          this.state.coins += 300_000_000;
          this.state.totalWon += 300_000_000;
          this.state.chests += 2;
          this.showToast('⭐ Vault Trade: +300M Coins & +2 Chests!');
        } else if (cost === 35) {
          this.state.coins += 1_000_000_000;
          this.state.totalWon += 1_000_000_000;
          this.state.gashaponTokens += 1;
          this.state.petTreats += 5;
          this.showToast('⭐ Vault Trade: +1B Coins, +1 🫧 Token & +5 🍖 Treats!');
        } else {
          this.state.jokerCards += 1;
          this.showToast('⭐ Vault Trade: +1 🃏 Joker Wild Card!');
        }
        saveGameState(this.state);
        this.sfx.playBigWin();
        this.spawnCoinShower(16);
        this.spawnConfettiBurst(20);
        this.renderAll();
      });
    });

    body.querySelectorAll<HTMLButtonElement>('[data-use-joker]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cardId = btn.dataset.useJoker!;
        const card = CARDS.find((c) => c.id === cardId);
        if (!card || this.state.jokerCards <= 0 || (this.state.cards[cardId] ?? 0) > 0) return;
        this.state.jokerCards -= 1;
        this.state.cards[cardId] = 1;
        saveGameState(this.state);
        this.sfx.playUpgrade();
        this.spawnConfettiBurst(22);
        this.showToast(`🃏 Joker Card unlocked ${card.emoji} ${card.name}!`);
        this.renderAll();
      });
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

    const claimedThisMonth = this.isPassClaimedThisMonth();
    const processingPass = this.isPassProcessing();
    const vipBtnLabel = processingPass
      ? `⏳ Verifying Payment (<span id="vip-card-timer">${this.formatMmSs(this.state.passProcessingUntil! - Date.now())}</span>)...`
      : claimedThisMonth
        ? '✅ VIP Pass Active This Month'
        : '👑 Buy €5.00 VIP Pass (€0.00 Real Money)';

    const activeSim = this.state.simOfferProcessing;
    const foxMegaProcessing = activeSim?.offerId === 'fox_mega';
    const foxMegaBtnLabel =
      foxMegaProcessing && activeSim
        ? `⏳ Verifying Bundle (<span id="sim-offer-inline-timer">${this.formatMmSs(activeSim.until - Date.now())}</span>)...`
        : '🦊 Claim €9.99 Fox Mega Bundle (€0.00 Real Money)';

    body.innerHTML = `
      <div class="card vip-pass-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <h2>👑 Monthly VIP Pass</h2>
          <span class="vip-price-tag">€5.00 • €0 Charged</span>
        </div>
        <p>
          Unlock once per month! Instant pack: <b>🪙 +1B Coins</b>, <b>🎟️ +50 Free Spins (3x)</b>, <b>🎁 +5 Chests</b> & <b>+0.5x Win Multiplier</b>.<br/>
          <small style="color:#ffd166;">Zero real money ever spent — simulated patience verification only.</small>
        </p>
        <button class="action-btn ${claimedThisMonth ? 'green' : ''}" id="btn-buy-vip-pass" ${claimedThisMonth && !processingPass ? 'disabled' : ''}>
          ${vipBtnLabel}
        </button>
      </div>

      <div class="card vip-pass-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <h2>🦊 Crazy Fox Mega Bundle</h2>
          <span class="vip-price-tag">€9.99 • €0 Charged</span>
        </div>
        <p>
          Massive pack: <b>🪙 +2B Coins</b>, <b>🫧 +10 Gashapon Tokens</b>, <b>🍖 +10 Pet Treats</b> & <b>🃏 +1 Joker Wild Card</b>.<br/>
          <small style="color:#ffd166;">Zero real money — passes 4 confirmations + 4-minute simulated verification.</small>
        </p>
        <button class="action-btn" id="btn-buy-fox-mega">
          ${foxMegaBtnLabel}
        </button>
      </div>

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

    body.querySelector('#btn-buy-vip-pass')?.addEventListener('click', () => this.handleVipPassAction());
    body.querySelector('#btn-buy-fox-mega')?.addEventListener('click', () => {
      this.handleSimOfferAction({
        offerId: 'fox_mega',
        title: '🦊 Crazy Fox Mega Bundle',
        priceLabel: '€9.99',
        rewardSummary: '+2B Coins, +10 Gashapon Tokens, +10 Pet Treats & +1 Joker Wild Card',
        durationMs: 240_000,
      });
    });

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
    const outerR = cx - 4;
    const r = cx - 14;
    const isLuckMode = this.isLuckWheelSpin || this.state.wheelSpins <= 0;

    ctx.clearRect(0, 0, size, size);

    // Outer ambient glow
    const bgGlow = ctx.createRadialGradient(cx, cy, r - 10, cx, cy, outerR + 3);
    bgGlow.addColorStop(0, 'rgba(255, 209, 102, 0.28)');
    bgGlow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = bgGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR + 3, 0, Math.PI * 2);
    ctx.fill();

    // Brushed metallic outer rim bezel
    const rimGrad = ctx.createLinearGradient(0, 0, size, size);
    rimGrad.addColorStop(0, '#fef08a');
    rimGrad.addColorStop(0.35, '#f59e0b');
    rimGrad.addColorStop(0.7, '#b45309');
    rimGrad.addColorStop(1, '#fde047');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.wheelAngle);

    // Rotating metallic rim studs
    const studCount = 16;
    for (let i = 0; i < studCount; i++) {
      const ang = (i * Math.PI * 2) / studCount;
      const sx = Math.cos(ang) * (r + 5);
      const sy = Math.sin(ang) * (r + 5);
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    if (isLuckMode) {
      const redHalf = 0.05 * Math.PI;
      const topAng = -Math.PI / 2;

      const greenGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, r);
      greenGrad.addColorStop(0, '#34d399');
      greenGrad.addColorStop(1, '#059669');
      ctx.fillStyle = greenGrad;
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
      ctx.font = '900 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍀 +150 SPINS!', 0, 38);
      ctx.font = '800 12px sans-serif';
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
        const mid = start + sliceAng / 2;

        // Glossy radial segment shading
        const gx = Math.cos(mid) * r * 0.55;
        const gy = Math.sin(mid) * r * 0.55;
        const segGrad = ctx.createRadialGradient(0, 0, 12, gx, gy, r);
        segGrad.addColorStop(0, '#ffffff38');
        segGrad.addColorStop(0.25, slice.color);
        segGrad.addColorStop(1, slice.color);

        ctx.fillStyle = segGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, start, end);
        ctx.closePath();
        ctx.fill();

        // Outer segment bevel arc
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, r - 2, start, end);
        ctx.stroke();

        // Gold divider stroke
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(start) * r, Math.sin(start) * r);
        ctx.stroke();

        ctx.save();
        ctx.rotate(mid);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.font = '800 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${slice.emoji} ${slice.label}`, r - 11, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${slice.emoji} ${slice.label}`, r - 12, 4);
        ctx.restore();
      });
    }
    ctx.restore();

    // Non-rotating top glass sheen on wheel face
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, Math.PI * 1.05, Math.PI * 1.95);
    ctx.quadraticCurveTo(cx, cy - 10, cx - (r - 1), cy - 4);
    ctx.closePath();
    const sheenGrad = ctx.createLinearGradient(0, cy - r, 0, cy);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.26)');
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.fill();
    ctx.restore();

    // Glowing 3D center spinner hub
    ctx.save();
    ctx.translate(cx, cy);
    const hubGlow = ctx.createRadialGradient(0, 0, 8, 0, 0, 29);
    hubGlow.addColorStop(0, 'rgba(255, 209, 102, 0.8)');
    hubGlow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = hubGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fill();

    const hubGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 20);
    hubGrad.addColorStop(0, '#fef9c3');
    hubGrad.addColorStop(0.55, '#ffd166');
    hubGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = hubGrad;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#240b36';
    ctx.font = 'bold 14px sans-serif';
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

    const settleOutcome = (showVisuals: boolean) => {
      if (luckTry) {
        if (luckWon) {
          this.state.wheelSpins = 150;
          if (showVisuals) {
            this.sfx.playBigWin();
            this.spawnCoinShower(24);
            this.spawnConfettiBurst(34);
            this.showToast('🎉 Lucky hit! +150 Wheel spins added!');
          }
        } else if (showVisuals) {
          this.sfx.playReelStop(0);
          this.showToast('😅 Narrow miss! Tap Try Your Luck again.');
        }
        saveGameState(this.state);
        if (showVisuals) this.renderAll();
        return;
      }

      const win = WHEEL_SLICES[chosenIdx];
      const passBoost = this.state.fairPassActive ? 2 : 1;
      this.state.lastWheelSpinAt = Date.now();
      incrementQuest(this.state, 'wheel', 1);

      if (win.type === 'coins') {
        this.state.coins += win.value * passBoost;
        if (showVisuals) this.showToast(`🎡 Wheel prize: +${formatCoins(win.value * passBoost)} coins!`);
      } else if (win.type === 'freespins') {
        this.state.freeSpins += win.value;
        if (showVisuals) this.showToast(`🎡 Wheel prize: +${win.value} Free Spins!`);
      } else if (win.type === 'chest') {
        this.state.chests += win.value;
        if (showVisuals) this.showToast(`🎡 Wheel prize: +${win.value} Chests!`);
      } else {
        const pot = this.state.jackpots.mini;
        this.state.coins += pot;
        this.state.jackpots.mini = 45_000_000;
        if (showVisuals) this.showToast(`🏆 Wheel prize: MINI JACKPOT (+${formatCoins(pot)})!`);
      }
      saveGameState(this.state);
      if (showVisuals) {
        this.sfx.playBigWin();
        this.spawnCoinShower(18);
        this.spawnConfettiBurst(30);
        this.renderAll();
      }
    };

    this.wheelPendingSettle = () => settleOutcome(false);

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
      if (!this.wheelSpinning) return;
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
        this.wheelRafId = requestAnimationFrame(step);
      } else {
        this.wheelRafId = null;
        this.wheelSpinning = false;
        this.isLuckWheelSpin = false;
        this.wheelPendingSettle = null;
        settleOutcome(true);
      }
    };
    this.wheelRafId = requestAnimationFrame(step);
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
        this.spinToken += 1;
        this.isSpinning = false;
        this.autoSpin = false;
        if (this.autoSpinTimer !== null) {
          window.clearTimeout(this.autoSpinTimer);
          this.autoSpinTimer = null;
        }
        if (this.moodTimer !== null) {
          window.clearTimeout(this.moodTimer);
          this.moodTimer = null;
        }
        if (this.wheelRafId !== null) {
          cancelAnimationFrame(this.wheelRafId);
          this.wheelRafId = null;
        }
        this.wheelSpinning = false;
        this.isLuckWheelSpin = false;
        this.wheelPendingSettle = null;
        this.wheelAngle = 0;
        this.cleanupSubCanvas();
        this.winningCells.clear();
        this.winningLines = [];
        this.lastGambleAmount = 0;
        this.vaultActive = false;
        this.vaultStep = 0;
        this.hiloActive = false;
        this.hiloStreak = 0;
        this.hiloMult = 1.0;
        this.kenoDrawn = [];
        this.rouletteLastNum = null;
        document.querySelectorAll('.frenzy-balloon').forEach((b) => b.remove());

        localStorage.removeItem('fair_coin_slots_state_v2');
        localStorage.removeItem('fair_coin_slots_state_v1');
        this.state = loadGameState(this.state.deviceId);
        this.currentGrid = this.buildInitialGrid(this.getActiveMachine());
        this.resetScratchBoard();
        this.resetRaidBoard();
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

  private openVipConfirmModal(step: 1 | 2 | 3 | 4): void {
    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    const prompts: Record<1 | 2 | 3 | 4, { title: string; msg: string; ok: string }> = {
      1: {
        title: '👑 Monthly VIP Pass — Step 1/4',
        msg: 'Unlock the <b>€5.00 Monthly VIP Pass</b>? No real money is ever charged (€0.00). Are you sure you want to proceed?',
        ok: 'OK, Continue (1/4)',
      },
      2: {
        title: '🤔 Are You Sure? — Step 2/4',
        msg: 'Just checking! Verification takes a ~5 minute loading wait instead of paying €5.00. Still want to continue?',
        ok: 'Yes, I Am Sure (2/4)',
      },
      3: {
        title: '⚠️ Really Sure? — Step 3/4',
        msg: 'You can only claim this Monthly VIP Pass <b>once per month</b>. Confirm you want to activate it now?',
        ok: 'Really Sure (3/4)',
      },
      4: {
        title: '🚀 Final Confirmation — Step 4/4',
        msg: 'Click <b>OK</b> below to begin your 5-minute simulated checkout (€0.00 real money charged).',
        ok: 'OK — Start Payment (4/4)',
      },
    };

    const current = prompts[step];
    box.innerHTML = `
      <h2 style="margin:0;color:#ffd166;">${current.title}</h2>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#fff8f0;">${current.msg}</p>
      <div style="font-size:12px;color:#06d6a0;font-weight:800;">Confirmation ${step} of 4 • €0.00 Real Money</div>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button class="action-btn secondary" id="vip-confirm-cancel" style="flex:1;">Cancel</button>
        <button class="action-btn" id="vip-confirm-ok" style="flex:1.4;">${current.ok}</button>
      </div>
    `;

    box.querySelector('#vip-confirm-cancel')?.addEventListener('click', () => {
      backdrop.classList.add('hidden');
      this.sfx.playTap();
      this.showToast('VIP Pass checkout cancelled.');
    });

    box.querySelector('#vip-confirm-ok')?.addEventListener('click', () => {
      this.sfx.playTap();
      if (step < 4) {
        this.openVipConfirmModal((step + 1) as 2 | 3 | 4);
      } else {
        this.state.passProcessingUntil = Date.now() + VIP_PASS_DURATION_MS;
        saveGameState(this.state);
        this.renderHud();
        this.renderActiveTab();
        this.openVipLoadingModal();
      }
    });
  }

  private openVipLoadingModal(): void {
    const until = this.state.passProcessingUntil;
    if (!until) return;
    const remaining = until - Date.now();
    if (remaining <= 0) {
      this.completeVipPassPurchase();
      return;
    }

    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    const pct = Math.min(100, Math.max(2, Math.round(((VIP_PASS_DURATION_MS - remaining) / VIP_PASS_DURATION_MS) * 100)));

    box.innerHTML = `
      <h2 style="margin:0;color:#ffd166;">⏳ Processing €5.00 VIP Pass</h2>
      <div class="vip-loader-ring" aria-label="Loading"></div>
      <div style="font-size:24px;font-weight:900;color:#ffd166;letter-spacing:1px;" id="vip-pass-countdown">${this.formatMmSs(remaining)}</div>
      <div class="vip-progress-track">
        <div class="vip-progress-fill" id="vip-pass-progress" style="width:${pct}%;"></div>
      </div>
      <p style="margin:0;font-size:12px;color:#c7b8e8;" id="vip-pass-status">${this.getVipLoadingStatus(remaining)}</p>
      <div style="font-size:11px;color:#06d6a0;font-weight:800;">€0.00 Real Money Charged • Wait for completion!</div>
      <button class="action-btn secondary" id="vip-minimize-btn">Keep Playing While Loading</button>
    `;

    box.querySelector('#vip-minimize-btn')?.addEventListener('click', () => {
      backdrop.classList.add('hidden');
      this.sfx.playTap();
      this.showToast('⏳ VIP Pass still verifying in background!');
    });
  }

  private completeVipPassPurchase(): void {
    this.state.passProcessingUntil = null;
    this.state.fairPassActive = true;
    this.state.passActivatedAt = Date.now();
    this.state.lastPassMonthKey = getCurrentMonthKey();
    this.state.monthlySpentEur = 0;

    // Grant Monthly VIP Pass rewards
    this.state.coins += 1_000_000_000;
    this.state.totalWon += 1_000_000_000;
    this.state.freeSpins += 50;
    this.state.freeSpinMultiplier = 3;
    this.state.chests += 5;
    saveGameState(this.state);

    this.sfx.playBigWin();
    this.spawnCoinShower(28);
    this.spawnCoinFountain(24);
    this.spawnConfettiBurst(36);
    this.renderAll();

    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    box.innerHTML = `
      <h2 style="margin:0;color:#06d6a0;">✅ Payment Completed!</h2>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#fff8f0;">
        Your <b>Monthly VIP Pass</b> is now active! (<b>€0.00</b> actually charged)
      </p>
      <div style="background:rgba(255,209,102,0.14);border:1.5px solid #ffd166;border-radius:14px;padding:10px;font-size:13px;font-weight:800;color:#ffd166;display:flex;flex-direction:column;gap:4px;">
        <div>🪙 +1,000,000,000 Coins</div>
        <div>🎟️ +50 Free Spins (3x Multiplier)</div>
        <div>🎁 +5 Treasure Chests</div>
        <div>👑 3x Bonuses & +0.5x Win Multiplier All Month!</div>
      </div>
      <button class="action-btn green" id="vip-complete-close">Awesome — Collect VIP Rewards!</button>
    `;

    box.querySelector('#vip-complete-close')?.addEventListener('click', () => {
      backdrop.classList.add('hidden');
      this.sfx.playTap();
    });
  }

  private handleSimOfferAction(offer: {
    offerId: SimOfferProcessingState['offerId'];
    title: string;
    priceLabel: string;
    rewardSummary: string;
    durationMs: number;
  }): void {
    this.sfx.playTap();
    if (this.state.simOfferProcessing) {
      if (this.state.simOfferProcessing.until <= Date.now()) {
        this.completeSimOfferPurchase();
      } else {
        if (this.state.simOfferProcessing.offerId !== offer.offerId) {
          this.showToast(`⏳ ${this.state.simOfferProcessing.title} is currently verifying!`);
        }
        this.openSimOfferLoadingModal();
      }
      return;
    }
    this.openSimOfferConfirmModal(offer, 1);
  }

  private openSimOfferConfirmModal(
    offer: {
      offerId: SimOfferProcessingState['offerId'];
      title: string;
      priceLabel: string;
      rewardSummary: string;
      durationMs: number;
    },
    step: 1 | 2 | 3 | 4
  ): void {
    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    const mins = Math.max(1, Math.round(offer.durationMs / 60_000));
    const prompts: Record<1 | 2 | 3 | 4, { title: string; msg: string; ok: string }> = {
      1: {
        title: `${offer.title} — Step 1/4`,
        msg: `Activate the <b>${offer.priceLabel} ${offer.title}</b>? No real money is ever charged (€0.00). Pack includes: <b>${offer.rewardSummary}</b>.`,
        ok: 'OK, Continue (1/4)',
      },
      2: {
        title: '🤔 Are You Sure? — Step 2/4',
        msg: `Just checking! Simulated checkout takes a <b>${mins}-minute</b> verification wait instead of paying ${offer.priceLabel}. Still continue?`,
        ok: 'Yes, I Am Sure (2/4)',
      },
      3: {
        title: '⚠️ Really Sure? — Step 3/4',
        msg: `Zero real money will be charged (€0.00). Confirm you want to wait ${mins}m to claim <b>${offer.title}</b>?`,
        ok: 'Really Sure (3/4)',
      },
      4: {
        title: '🚀 Final Confirmation — Step 4/4',
        msg: `Click <b>OK</b> below to start the ${mins}-minute simulated payment verification (€0.00 real money).`,
        ok: 'OK — Start Verification (4/4)',
      },
    };

    const current = prompts[step];
    box.innerHTML = `
      <h2 style="margin:0;color:#ffd166;">${current.title}</h2>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#fff8f0;">${current.msg}</p>
      <div style="font-size:12px;color:#06d6a0;font-weight:800;">Confirmation ${step} of 4 • €0.00 Real Money</div>
      <div style="display:flex;gap:8px;justify-content:center;">
        <button class="action-btn secondary" id="sim-confirm-cancel" style="flex:1;">Cancel</button>
        <button class="action-btn" id="sim-confirm-ok" style="flex:1.4;">${current.ok}</button>
      </div>
    `;

    box.querySelector('#sim-confirm-cancel')?.addEventListener('click', () => {
      backdrop.classList.add('hidden');
      this.sfx.playTap();
      this.showToast('Checkout cancelled — €0.00 charged.');
    });

    box.querySelector('#sim-confirm-ok')?.addEventListener('click', () => {
      this.sfx.playTap();
      if (step < 4) {
        this.openSimOfferConfirmModal(offer, (step + 1) as 2 | 3 | 4);
      } else {
        this.state.simOfferProcessing = {
          offerId: offer.offerId,
          title: offer.title,
          priceLabel: offer.priceLabel,
          rewardSummary: offer.rewardSummary,
          durationMs: offer.durationMs,
          until: Date.now() + offer.durationMs,
        };
        saveGameState(this.state);
        this.renderHud();
        this.renderActiveTab();
        this.openSimOfferLoadingModal();
      }
    });
  }

  private openSimOfferLoadingModal(): void {
    const sim = this.state.simOfferProcessing;
    if (!sim) return;
    const remaining = sim.until - Date.now();
    if (remaining <= 0) {
      this.completeSimOfferPurchase();
      return;
    }

    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    const pct = Math.min(100, Math.max(2, Math.round(((sim.durationMs - remaining) / sim.durationMs) * 100)));

    box.innerHTML = `
      <h2 style="margin:0;color:#ffd166;">⏳ Processing ${sim.priceLabel} Offer</h2>
      <div style="font-size:13px;font-weight:800;color:#fff8f0;">${sim.title}</div>
      <div class="vip-loader-ring" aria-label="Loading"></div>
      <div style="font-size:24px;font-weight:900;color:#ffd166;letter-spacing:1px;" id="sim-offer-countdown">${this.formatMmSs(remaining)}</div>
      <div class="vip-progress-track">
        <div class="vip-progress-fill" id="sim-offer-progress" style="width:${pct}%;"></div>
      </div>
      <p style="margin:0;font-size:12px;color:#c7b8e8;">Verifying €0.00 virtual receipt... Reward: <b>${sim.rewardSummary}</b></p>
      <div style="font-size:11px;color:#06d6a0;font-weight:800;">€0.00 Real Money Charged • Wait for completion!</div>
      <button class="action-btn secondary" id="sim-minimize-btn">Keep Playing While Loading</button>
    `;

    box.querySelector('#sim-minimize-btn')?.addEventListener('click', () => {
      backdrop.classList.add('hidden');
      this.sfx.playTap();
      this.showToast(`⏳ ${sim.title} still verifying in background!`);
    });
  }

  private completeSimOfferPurchase(): void {
    const sim = this.state.simOfferProcessing;
    if (!sim) return;
    this.state.simOfferProcessing = null;

    let lines: string[] = [];
    if (sim.offerId === 'viking_key') {
      this.state.vikingStep = Math.max(this.state.vikingStep, 4);
      this.state.coins += 600_000_000;
      this.state.totalWon += 600_000_000;
      this.state.petTreats += 3;
      lines = [
        '🗝️ Gate of Valhalla Unlocked (Step 5 Ready!)',
        '🪙 +600,000,000 Coins',
        '🍖 +3 Pet Treats',
      ];
    } else if (sim.offerId === 'streak_save') {
      this.state.coins += 250_000_000;
      this.state.totalWon += 250_000_000;
      this.state.chests += 2;
      this.state.dailyStreak += 1;
      lines = [
        '🪙 +250,000,000 Coins',
        '🎁 +2 Treasure Chests',
        `📅 Daily Streak Boosted to ${this.state.dailyStreak}d!`,
      ];
    } else {
      this.state.coins += 2_000_000_000;
      this.state.totalWon += 2_000_000_000;
      this.state.gashaponTokens += 10;
      this.state.petTreats += 10;
      this.state.jokerCards += 1;
      lines = [
        '🪙 +2,000,000,000 Coins',
        '🫧 +10 Gashapon Tokens',
        '🍖 +10 Pet Treats',
        '🃏 +1 Joker Wild Card',
      ];
    }

    saveGameState(this.state);
    this.sfx.playBigWin();
    this.spawnCoinShower(28);
    this.spawnCoinFountain(24);
    this.spawnConfettiBurst(36);
    this.renderAll();

    const backdrop = this.root.querySelector<HTMLElement>('#modal-backdrop')!;
    const box = this.root.querySelector<HTMLElement>('#modal-box')!;
    backdrop.classList.remove('hidden');

    box.innerHTML = `
      <h2 style="margin:0;color:#06d6a0;">✅ Payment Completed!</h2>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#fff8f0;">
        <b>${sim.title}</b> delivered! (<b>€0.00</b> actually charged)
      </p>
      <div style="background:rgba(255,209,102,0.14);border:1.5px solid #ffd166;border-radius:14px;padding:10px;font-size:13px;font-weight:800;color:#ffd166;display:flex;flex-direction:column;gap:4px;">
        ${lines.map((l) => `<div>${l}</div>`).join('')}
      </div>
      <button class="action-btn green" id="sim-complete-close">Awesome — Collect Rewards!</button>
    `;

    box.querySelector('#sim-complete-close')?.addEventListener('click', () => {
      backdrop.classList.add('hidden');
      this.sfx.playTap();
    });
  }

  private showChestModal(drawn: { emoji: string; name: string; rarity: string }[], starsGained = 0): void {
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
      ${
        starsGained > 0
          ? `<div style="font-size:12px;font-weight:800;color:#ffd166;">⭐ Duplicate cards added +${starsGained} Stars to your Star Vault!</div>`
          : ''
      }
      <button class="action-btn" id="close-chest-modal">Add to Album</button>
    `;

    box.querySelector('#close-chest-modal')?.addEventListener('click', () => {
      backdrop.classList.add('hidden');
      this.sfx.playTap();
    });
  }

  private claimRescueBonus(): void {
    const bonus = 50_000_000;
    this.state.coins += bonus;
    this.state.rescueCount += 1;
    saveGameState(this.state);
    this.sfx.playBigWin();
    this.spawnCoinShower(14);
    this.spawnCoinFountain(12);
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

  private spawnCoinFountain(count: number): void {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.48;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'fountain-particle';
      el.textContent = '★';
      el.style.left = `${cx - 12}px`;
      el.style.top = `${cy}px`;
      const dx = (Math.random() - 0.5) * 260;
      const peak = -110 - Math.random() * 110;
      const endY = 180 + Math.random() * 160;
      const dur = 0.85 + Math.random() * 0.45;
      el.style.setProperty('--dx', `${dx}px`);
      el.style.setProperty('--peak', `${peak}px`);
      el.style.setProperty('--endY', `${endY}px`);
      el.style.setProperty('--dur', `${dur}s`);
      el.style.animationDelay = `${Math.random() * 0.16}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), Math.round((dur + 0.25) * 1000));
    }
  }

  private spawnConfettiBurst(count: number): void {
    const palette = ['#ffd166', '#4cc9f0', '#ff5d8f', '#06d6a0', '#c084fc', '#ffffff'];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.42;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-particle';
      el.style.background = palette[i % palette.length];
      el.style.left = `${cx - 4}px`;
      el.style.top = `${cy}px`;
      const dx = (Math.random() - 0.5) * 290;
      const peak = -90 - Math.random() * 130;
      const endY = 200 + Math.random() * 180;
      const dur = 1.0 + Math.random() * 0.55;
      el.style.setProperty('--dx', `${dx}px`);
      el.style.setProperty('--peak', `${peak}px`);
      el.style.setProperty('--endY', `${endY}px`);
      el.style.setProperty('--dur', `${dur}s`);
      el.style.animationDelay = `${Math.random() * 0.14}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), Math.round((dur + 0.25) * 1000));
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
