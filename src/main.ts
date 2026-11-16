import './style.css';
import {
  BET_STEPS,
  CARDS,
  CARD_SETS,
  formatCoins,
  formatCoinsFull,
  KINGDOM_BUILDINGS,
  QUEST_TEMPLATES,
  SLOT_MACHINES,
  SlotMachineTheme,
  SlotSymbol,
  WHEEL_SLICES,
} from './data/machines';
import { MascotAccessory, MascotRenderer } from './game/mascotRenderer';
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

type TabId = 'slots' | 'village' | 'wheel' | 'cards' | 'fair';

const HALF_HOUR_MS = 30 * 60 * 1000;
const WHEEL_COOLDOWN_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

class FairCoinSlotsApp {
  private root: HTMLElement;
  private state: GameState;
  private sfx = new SoundFX();
  private mascot: MascotRenderer | null = null;
  private activeTab: TabId = 'slots';
  private isSpinning = false;
  private autoSpin = false;
  private turboSpin = false;
  private currentGrid: SlotSymbol[][];
  private winningCells = new Set<string>();
  private wheelAngle = 0;
  private wheelSpinning = false;
  private toastTimer = 0;
  private sessionAlertShown = false;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = loadGameState();
    this.sfx.enabled = this.state.soundEnabled;

    const machine = this.getActiveMachine();
    this.currentGrid = this.buildInitialGrid(machine);

    this.renderShell();
    this.initMascot();
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

  private renderShell(): void {
    this.root.innerHTML = `
      <header class="hud">
        <div class="mascot-box" id="mascot-tap" title="Tik om Penny's accessoire te wisselen">
          <canvas id="mascot-canvas" width="80" height="80" style="width:54px;height:54px;"></canvas>
        </div>
        <div class="hud-center">
          <div class="coin-pill">
            <span class="coin-val" id="hud-coins">🪙 50M</span>
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
        <section class="tab-panel" id="tab-village"></section>
        <section class="tab-panel" id="tab-wheel"></section>
        <section class="tab-panel" id="tab-cards"></section>
        <section class="tab-panel" id="tab-fair"></section>
      </main>

      <nav class="bottom-nav">
        <button class="nav-btn active" data-tab="slots"><span class="nav-ico">🎰</span><span>Slots</span></button>
        <button class="nav-btn" data-tab="village"><span class="nav-ico">🏘️</span><span>Dorp</span></button>
        <button class="nav-btn" data-tab="wheel"><span class="nav-ico">🎡</span><span>Rad</span></button>
        <button class="nav-btn" data-tab="cards"><span class="nav-ico">🃏</span><span>Kaarten</span></button>
        <button class="nav-btn" data-tab="fair"><span class="nav-ico">🛡️</span><span>Eerlijk €5</span></button>
      </nav>

      <div class="modal-backdrop hidden" id="modal-backdrop">
        <div class="modal-box" id="modal-box"></div>
      </div>
    `;

    this.root.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab as TabId;
        this.switchTab(tab);
      });
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

    const mascotTap = this.root.querySelector<HTMLDivElement>('#mascot-tap')!;
    mascotTap.addEventListener('click', () => {
      const order: MascotAccessory[] = ['crown', 'shades', 'both', 'none'];
      const idx = order.indexOf(this.state.mascotAccessory);
      this.state.mascotAccessory = order[(idx + 1) % order.length];
      this.mascot?.setAccessory(this.state.mascotAccessory);
      this.sfx.playTap();
      saveGameState(this.state);
      this.showToast('Penny heeft een nieuwe look!');
    });

    const rescueBtn = this.root.querySelector<HTMLButtonElement>('#hud-rescue')!;
    rescueBtn.addEventListener('click', () => this.claimRescueBonus());
  }

  private initMascot(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>('#mascot-canvas');
    if (canvas) {
      this.mascot = new MascotRenderer(canvas);
      this.mascot.setAccessory(this.state.mascotAccessory);
    }
  }

  private switchTab(tab: TabId): void {
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
      if (this.activeTab === 'wheel') {
        this.renderWheelTab();
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
    if (this.activeTab === 'slots') this.renderSlotsTab();
    else if (this.activeTab === 'village') this.renderVillageTab();
    else if (this.activeTab === 'wheel') this.renderWheelTab();
    else if (this.activeTab === 'cards') this.renderCardsTab();
    else if (this.activeTab === 'fair') this.renderFairTab();
  }

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

      <div class="slot-cabinet" style="background:${machine.gradient}; border-color:${machine.frameColor};">
        <div class="cabinet-header">
          <span>${machine.badgeEmoji} ${machine.name} • 20 Lijnen</span>
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
        this.sfx.playTap();
        saveGameState(this.state);
        this.renderSlotsTab(`${target.badgeEmoji} Welkom bij ${target.name}!`);
      });
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
      if (this.autoSpin && !this.isSpinning) {
        this.triggerSpin();
      }
    });

    panel.querySelector('#btn-spin')?.addEventListener('click', () => {
      this.triggerSpin();
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
      // Automatically step down bet to fit remaining coins smoothly
      while (this.state.betIndex > 0 && BET_STEPS[this.state.betIndex] > this.state.coins) {
        this.state.betIndex--;
      }
      this.showToast('Inzet aangepast naar je beschikbare munten.');
      this.renderSlotsTab();
      return;
    }

    this.isSpinning = true;
    this.winningCells.clear();
    this.mascot?.setMood('spinning');
    this.sfx.playSpinStart();

    if (usingFreeSpin) {
      this.state.freeSpins -= 1;
    } else {
      this.state.coins -= bet;
    }

    // Grow progressive jackpots transparently
    this.state.jackpots.mini += Math.round(bet * 0.015);
    this.state.jackpots.minor += Math.round(bet * 0.025);
    this.state.jackpots.major += Math.round(bet * 0.04);
    this.state.jackpots.grand += Math.round(bet * 0.06);
    this.state.totalSpins += 1;
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

    // Animate columns spinning
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

    // Apply winnings & highlights
    await this.applySpinOutcome(result, bet);
    this.isSpinning = false;

    if (this.autoSpin && !result.triggerHoldAndSpin && this.activeTab === 'slots') {
      setTimeout(() => {
        if (this.autoSpin && !this.isSpinning) {
          this.triggerSpin();
        }
      }, this.turboSpin ? 260 : 650);
    }
  }

  private async applySpinOutcome(result: SpinResult, bet: number): Promise<void> {
    if (result.totalWin > 0) {
      this.state.coins += result.totalWin;
      this.state.totalWon += result.totalWin;
      incrementQuest(this.state, 'wins', 1);
    }

    if (result.jackpotWon) {
      const defaults: Record<JackpotKey, number> = {
        mini: 25_000_000,
        minor: 150_000_000,
        major: 950_000_000,
        grand: 8_500_000_000,
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
      this.mascot?.setMood('bigwin');
      this.sfx.playBigWin();
      this.spawnCoinShower(28);
    } else if (result.winTier === 'epic' || result.winTier === 'mega' || result.winTier === 'big') {
      const label =
        result.winTier === 'epic' ? 'EPISCHE WINST' : result.winTier === 'mega' ? 'MEGA WINST' : 'GROTE WINST';
      msg = `🎉 ${label}! +${formatCoins(result.totalWin)} munten!`;
      isBig = true;
      this.mascot?.setMood('bigwin');
      this.sfx.playBigWin();
      this.spawnCoinShower(22);
    } else if (result.totalWin > 0) {
      msg = `✨ Gewonnen: +${formatCoins(result.totalWin)} munten (${result.winningLines.length} lijn${result.winningLines.length === 1 ? '' : 'en'})`;
      this.mascot?.setMood('bonus');
      this.sfx.playWin();
      this.spawnCoinShower(8);
    } else {
      this.mascot?.setMood('idle');
    }

    if (result.awardedFreeSpins > 0) {
      msg += ` • +${result.awardedFreeSpins} Gratis Spins!`;
      isBig = true;
    }

    this.renderHud();
    if (this.activeTab === 'slots') {
      this.renderSlotsTab(msg, isBig);
    }

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
        if (!this.isSpinning) this.mascot?.setMood('idle');
      }, 1500);
    }
  }

  private async runHoldAndSpinBonus(initialCoins: HoldCoinCell[], bet: number): Promise<void> {
    this.mascot?.setMood('bonus');
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
        <div style="font-size:16px;font-weight:900;color:#06d6a0;">
          Totaal: +${formatCoins(sum)} munten
        </div>
        <button class="action-btn" id="hold-action-btn">
          ${finished ? 'Claim & Speel Verder!' : 'Spin Respin!'}
        </button>
      `;

      const actionBtn = box.querySelector<HTMLButtonElement>('#hold-action-btn')!;
      actionBtn.addEventListener('click', () => {
        if (finished) {
          this.state.coins += sum;
          this.state.totalWon += sum;
          saveGameState(this.state);
          backdrop.classList.add('hidden');
          this.mascot?.setMood('idle');
          this.spawnCoinShower(24);
          this.renderAll();
          return;
        }

        // Perform one respin across empty slots
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

  private renderVillageTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-village')!;
    const kingdomLvl = getKingdomLevel(this.state);
    const mult = getTotalMultiplier(this.state);

    panel.innerHTML = `
      <div class="card">
        <h2>🏘️ Penny's Munten-Dorp (Niveau ${kingdomLvl})</h2>
        <p>Bouw & upgrade net als in Coin Master! Elk gebouwniveau verhoogt blijvend je winst-multiplier (nu <b>${mult}x</b>).</p>
      </div>

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
    `;

    panel.querySelectorAll<HTMLButtonElement>('[data-build]').forEach((btn) => {
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
        this.showToast(`🔨 ${b.name} naar Level ${lvl + 1}! Multiplier omhoog!`);
        this.renderAll();
      });
    });
  }

  private renderWheelTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-wheel')!;
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

    panel.innerHTML = `
      <div class="card wheel-wrap">
        <h2>🎡 Rad van Fortuin</h2>
        <div class="wheel-pointer">🔻</div>
        <canvas id="wheel-canvas" width="250" height="250"></canvas>
        <button class="action-btn" id="btn-spin-wheel" ${wheelLeft > 0 || this.wheelSpinning ? 'disabled' : ''}>
          ${wheelLeft > 0 ? `Volgende draai over ${formatWait(wheelLeft)}` : 'DRAAI GRATIS AAN HET RAD!'}
        </button>
      </div>

      <div class="card">
        <h3>⏰ Gratis Munten Elke 30 Minuten</h3>
        <p>Geen reclame-video's verplicht: klik en ontvang direct ${this.state.fairPassActive ? '3x extra ' : ''}gratis munten.</p>
        <button class="action-btn green" id="btn-halfhour" ${halfLeft > 0 ? 'disabled' : ''}>
          ${halfLeft > 0 ? `Beschikbaar over ${formatWait(halfLeft)}` : `Claim 🪙 ${formatCoins(35_000_000 * (this.state.fairPassActive ? 3 : 1))}`}
        </button>
      </div>

      <div class="card">
        <h3>📅 Dagelijkse Beloning (Reeks: ${this.state.dailyStreak} dagen)</h3>
        <p>Elke dag een flinke lading munten én een schatkist!</p>
        <button class="action-btn secondary" id="btn-daily" ${dailyLeft > 0 ? 'disabled' : ''}>
          ${dailyLeft > 0 ? `Morgen weer (${formatWait(dailyLeft)})` : `Claim Dagbonus + 🎁 Kist`}
        </button>
      </div>
    `;

    this.drawWheelCanvas();

    panel.querySelector('#btn-spin-wheel')?.addEventListener('click', () => this.spinFortuneWheel());
    panel.querySelector('#btn-halfhour')?.addEventListener('click', () => {
      const reward = 35_000_000 * (this.state.fairPassActive ? 3 : 1);
      this.state.coins += reward;
      this.state.lastHalfHourBonusAt = Date.now();
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.spawnCoinShower(14);
      this.showToast(`🪙 +${formatCoins(reward)} halfuur-bonus geclaimd!`);
      this.renderAll();
    });

    panel.querySelector('#btn-daily')?.addEventListener('click', () => {
      this.state.dailyStreak += 1;
      const reward = (80_000_000 + this.state.dailyStreak * 25_000_000) * (this.state.fairPassActive ? 3 : 1);
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
    // Target angle so chosen slice aligns with top pointer (-PI/2)
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
          this.showToast('🎡 Radprijs: +1 Schatkist met kaarten!');
        } else {
          const pot = this.state.jackpots.mini;
          this.state.coins += pot;
          this.state.jackpots.mini = 25_000_000;
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

  private renderCardsTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-cards')!;
    const ownedUnique = CARDS.filter((c) => (this.state.cards[c.id] ?? 0) > 0).length;

    panel.innerHTML = `
      <div class="card">
        <h2>🎁 Schatkisten & Kaarten (${ownedUnique}/${CARDS.length})</h2>
        <p>Open gratis schatkisten die je verdient met levels, missies en het rad. Maak een set compleet voor miljarden aan bonusmunten!</p>
        <button class="action-btn" id="btn-open-chest" ${this.state.chests <= 0 ? 'disabled' : ''}>
          🎁 Open Schatkist (${this.state.chests} beschikbaar)
        </button>
      </div>

      <div class="card">
        <h3>📋 Missies</h3>
        ${QUEST_TEMPLATES.map((q) => {
          const qp = this.state.quests[q.id] ?? { progress: 0, claimed: false };
          const done = qp.progress >= q.target;
          return `
            <div class="building-row">
              <div class="building-info">
                <strong>${q.title}</strong>
                <small>Voortgang: ${qp.progress}/${q.target} • Beloning: 🪙 ${formatCoins(q.rewardCoins)} + ${q.rewardChests}🎁</small>
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

    panel.querySelector('#btn-open-chest')?.addEventListener('click', () => {
      if (this.state.chests <= 0) return;
      this.state.chests -= 1;
      const drawn = openCardChest(this.state);
      saveGameState(this.state);
      this.sfx.playBigWin();
      this.showChestModal(drawn);
      this.renderAll();
    });

    panel.querySelectorAll<HTMLButtonElement>('[data-claim-quest]').forEach((btn) => {
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

    panel.querySelectorAll<HTMLButtonElement>('[data-claim-set]').forEach((btn) => {
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

  private renderFairTab(): void {
    const panel = this.root.querySelector<HTMLElement>('#tab-fair')!;
    const sessionMins = Math.floor((Date.now() - this.state.sessionStartAt) / 60_000);

    panel.innerHTML = `
      <div class="card">
        <div><span class="fair-badge">🛡️ ANTI-UITBUITING & €5 BESCHERMING</span></div>
        <h2>Waarom Fair Coin Slots anders is</h2>
        <p>
          Veel bekende coin/slot apps sturen op €50-€500 aankopen door winkansen te verlagen, "bijna-winst" trucs te gebruiken en pop-up timers te tonen.
          <br/><br/>
          <b>Fair Coin Slots draait het om:</b> je speelt gratis of met een eenmalige <b>€5 Eerlijke Maandpas</b> waarmee je letterlijk maanden vooruit kunt.
          Een harde <b>€5/maand-limiet</b> maakt het onmogelijk voor kwetsbare of verslaafde spelers om honderden euro's te verliezen.
        </p>
      </div>

      <div class="card">
        <h3>💎 De €5 Eerlijke Pas (Simulatie — €0 echt geld)</h3>
        <p>
          In deze losse APK-versie wordt <b>geen echt geld verwerkt</b>. Je kunt hieronder vrij testen hoe het €5-model werkt:
          <b>+500B munten</b>, <b>3x bonus-opbrengst</b> en een harde <b>€5,00/maand</b> bestedingslimiet.
        </p>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;">
          <span>Maandlimiet gebruikt:</span>
          <strong style="color:#06d6a0;">€${this.state.monthlySpentEur.toFixed(2)} / €5,00 (HARD CAP)</strong>
        </div>
        <button class="action-btn ${this.state.fairPassActive ? 'green' : ''}" id="btn-sim-pass" ${this.state.fairPassActive ? 'disabled' : ''}>
          ${this.state.fairPassActive ? '✓ €5 Pas Actief (Maanden speelplezier!)' : 'Test €5 Eerlijke Pas (+500B munten & 3x Bonussen)'}
        </button>
      </div>

      <div class="card">
        <h3>⏱️ Gezond Spelen & Statistieken</h3>
        <p>
          • Speeltijd deze sessie: <b>${sessionMins} min</b> (pauze-herinnering: elke <b>${this.state.reminderMinutes} min</b>)<br/>
          • Totaal gedraaid: <b>${this.state.totalSpins}</b> spins<br/>
          • Totaal gewonnen: <b>${formatCoinsFull(this.state.totalWon)}</b> speelmunten<br/>
          • Reddingsboei gebruikt: <b>${this.state.rescueCount}x</b> (gratis herstart zonder ooit te hoeven betalen)
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="action-btn secondary" id="btn-toggle-reminder">Pauzemelding: ${this.state.reminderMinutes}m</button>
          <button class="action-btn secondary" id="btn-reset-game">Reset Spelstand</button>
        </div>
      </div>
    `;

    panel.querySelector('#btn-sim-pass')?.addEventListener('click', () => {
      if (this.state.fairPassActive) return;
      this.state.fairPassActive = true;
      this.state.monthlySpentEur = 5.0;
      this.state.passActivatedAt = Date.now();
      this.state.coins += 500_000_000_000; // +500B coins!
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
      localStorage.removeItem('fair_coin_slots_state_v1');
      this.state = loadGameState();
      saveGameState(this.state);
      this.sfx.playTap();
      this.showToast('Spelstand gereset naar 50M startmunten!');
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
    const bonus = 25_000_000;
    this.state.coins += bonus;
    this.state.rescueCount += 1;
    saveGameState(this.state);
    this.sfx.playBigWin();
    this.spawnCoinShower(14);
    this.showToast(`🛟 Gratis Reddingsboei! +${formatCoins(bonus)} munten — je hoeft nooit bij te kopen!`);
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
