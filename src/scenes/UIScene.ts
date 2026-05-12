import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UPGRADE_POOL } from '../config';
import { HPBar } from '../ui/HPBar';
import { BossHPBar } from '../ui/BossHPBar';
import { InventoryHUD } from '../ui/InventoryHUD';
import { GameScene, GameState } from './GameScene';
import { ConsumableType } from '../systems/InventoryManager';
import { t } from '../i18n';

export class UIScene extends Phaser.Scene {
  private hpBar!: HPBar;
  private coinText!: Phaser.GameObjects.Text;
  private gearText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private enemyBar!: Phaser.GameObjects.Rectangle;
  private enemyBarLabel!: Phaser.GameObjects.Text;
  private upgradeIcons!: Phaser.GameObjects.Container;
  private inventoryHUD!: InventoryHUD;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private paused = false;
  private lastUpgradeCount = -1;
  private bossBar: BossHPBar | null = null;
  private freezeTimerContainer!: Phaser.GameObjects.Container;
  private freezeTimerNum!: Phaser.GameObjects.Text;
  private isMobile = false;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.paused = false;
    this.lastUpgradeCount = -1;

    // HP bar
    this.add.rectangle(110, 30, 204, 24, 0x000000, 0.5).setOrigin(0.5, 0.5);
    this.hpBar = new HPBar(this, 10, 18, 200, 20, 0xe74c3c, 0x555555);
    this.add.text(10, 14, t('ui.hp'), {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    });

    // Coin counter
    this.coinText = this.add.text(10, 50, '🪙 0', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3,
    });

    // Gear counter (run total)
    this.gearText = this.add.text(10, 74, '⚙ 0', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#aaaacc',
      stroke: '#000000',
      strokeThickness: 2,
    });

    // Upgrade icons row
    this.upgradeIcons = this.add.container(10, 96);

    // Inventory HUD — bottom-right on mobile, top-left on desktop
    this.isMobile = !this.sys.game.device.os.desktop;
    const invX = this.isMobile ? GAME_WIDTH - 285 : 10;
    const invY = this.isMobile ? GAME_HEIGHT - 240 : 118;
    const iconSize = this.isMobile ? 56 : 48;
    this.inventoryHUD = new InventoryHUD(
      this,
      invX,
      invY,
      this.isMobile,
      (type: ConsumableType) => {
        (this.scene.get('GameScene') as GameScene).activateConsumable(type);
      },
      iconSize,
    );

    // Wave info (top center)
    this.waveText = this.add.text(GAME_WIDTH / 2, 14, t('wave.label', { wave: 1 }), {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial',
      color: '#ecf0f1',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);

    // Enemy progress bar (below wave text)
    const barW = 300;
    const barX = GAME_WIDTH / 2 - barW / 2;
    this.add.rectangle(barX, 46, barW, 8, 0x333333).setOrigin(0, 0);
    this.enemyBar = this.add.rectangle(barX, 46, barW, 8, 0xe74c3c).setOrigin(0, 0);
    this.enemyBarLabel = this.add.text(GAME_WIDTH / 2, 57, '0 / 0', {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5, 0);

    // Freeze timer (hidden by default, shown when time freeze is active)
    this.freezeTimerContainer = this.add.container(GAME_WIDTH / 2, 72).setDepth(55).setVisible(false);
    this.freezeTimerNum = this.add.text(0, 0, '8', {
      fontSize: '36px',
      fontFamily: 'Arial Black, Arial',
      color: '#67e8f9',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);
    const freezeLabel = this.add.text(0, 42, t('freeze.active'), {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#67e8f9',
    }).setOrigin(0.5, 0);
    this.freezeTimerContainer.add([this.freezeTimerNum, freezeLabel]);

    // Best wave (top right, left of mute/pause)
    this.bestText = this.add.text(GAME_WIDTH - 108, 14, t('ui.best_none'), {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#777777',
    }).setOrigin(1, 0);

    // Mute button
    const getAudio = () => (this.scene.get('GameScene') as GameScene).audio;
    const muteBtn = this.add.text(GAME_WIDTH - 56, 14, '🔊', {
      fontSize: '24px',
      fontFamily: 'Arial',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      const audio = getAudio();
      audio.setMuted(!audio.isMuted());
      muteBtn.setText(audio.isMuted() ? '🔇' : '🔊');
    });

    // Pause button
    const pauseBtn = this.add.text(GAME_WIDTH - 20, 14, '⏸', {
      fontSize: '28px',
      fontFamily: 'Arial',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    pauseBtn.on('pointerdown', () => this.togglePause());

    this.buildPauseOverlay();
  }

  private buildPauseOverlay(): void {
    this.pauseOverlay = this.add.container(GAME_WIDTH / 2, 360);
    this.pauseOverlay.setVisible(false);
    this.pauseOverlay.setDepth(200);

    const bg = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.85);
    const title = this.add.text(0, -100, t('ui.paused'), {
      fontSize: '52px',
      fontFamily: 'Arial Black, Arial',
      color: '#ecf0f1',
    }).setOrigin(0.5);

    const resumeText = this.add.text(0, 10, t('ui.resume'), {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#4ecdc4',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resumeText.on('pointerover', () => resumeText.setColor('#ffffff'));
    resumeText.on('pointerout', () => resumeText.setColor('#4ecdc4'));
    resumeText.on('pointerdown', () => this.togglePause());

    const restartText = this.add.text(0, 80, t('ui.restart'), {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#e74c3c',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartText.on('pointerover', () => restartText.setColor('#ffffff'));
    restartText.on('pointerout', () => restartText.setColor('#e74c3c'));
    restartText.on('pointerdown', () => {
      this.paused = false;
      this.scene.resume('GameScene');
      this.scene.get('GameScene').scene.start('GameScene');
    });

    this.pauseOverlay.add([bg, title, resumeText, restartText]);
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.scene.pause('GameScene');
      this.pauseOverlay.setVisible(true);
    } else {
      this.scene.resume('GameScene');
      this.pauseOverlay.setVisible(false);
    }
  }

  showBossBar(name: string, thresholds: number[], _maxHp: number): void {
    this.bossBar?.destroy();
    this.bossBar = new BossHPBar(this, name, thresholds);
  }

  updateBossBar(hp: number, maxHp: number, phase: number, phaseCount: number): void {
    this.bossBar?.update(hp, maxHp, phase, phaseCount);
  }

  hideBossBar(): void {
    this.bossBar?.destroy();
    this.bossBar = null;
  }

  updateState(state: GameState): void {
    if (!this.hpBar) return;
    this.hpBar?.setValue(state.hp, state.maxHp);
    this.coinText?.setText(`🪙 ${state.coins}`);
    this.gearText?.setText(`⚙ ${state.gearsThisRun}`);

    const isBoss = state.wave > 1 && (state.wave - 1) % 5 === 0;
    const waveColor = isBoss ? '#ff6600' : '#ecf0f1';
    this.waveText?.setText(t('wave.label', { wave: state.wave })).setColor(waveColor);

    const best = state.bestWave > 0 ? t('ui.best', { wave: state.bestWave }) : t('ui.best_none');
    this.bestText?.setText(best);

    // Enemy progress bar
    const total = Math.max(1, state.totalEnemiesInWave);
    const killed = total - state.enemiesRemaining;
    const pct = killed / total;
    if (this.enemyBar) {
      this.enemyBar.setSize(300 * pct, 8);
    }
    this.enemyBarLabel?.setText(`☠ ${killed} / ${total}`);

    // Upgrade icons — rebuild only when count changes
    const upgrades = state.activeUpgrades ?? [];
    if (upgrades.length !== this.lastUpgradeCount) {
      this.lastUpgradeCount = upgrades.length;
      this.upgradeIcons.removeAll(true);
      upgrades.slice(0, 20).forEach((id, i) => {
        const def = UPGRADE_POOL.find(u => u.id === id);
        if (!def) return;
        const txt = this.add.text(i * 26, 0, def.icon, { fontSize: '18px' });
        this.upgradeIcons.add(txt);
      });
    }

    // Inventory HUD
    if (state.inventory) {
      this.inventoryHUD?.update(state.inventory, state.timeSlowActive, state.timeSlowRemaining);
    }

    // Freeze timer display
    if (state.timeSlowActive) {
      this.freezeTimerContainer.setVisible(true);
      const secs = Math.ceil(state.timeSlowRemaining / 1000);
      this.freezeTimerNum.setText(String(secs)).setColor(secs <= 3 ? '#f97316' : '#67e8f9');
    } else {
      this.freezeTimerContainer.setVisible(false);
    }
  }

  showInventoryTutorial(): void {
    const iconSize = this.isMobile ? 56 : 48;
    const gap = this.isMobile ? 12 : 8;
    const invX = this.isMobile ? GAME_WIDTH - 285 : 10;
    const invY = this.isMobile ? GAME_HEIGHT - 240 : 118;
    const tipX = invX + (4 * iconSize + 3 * gap) / 2;
    const tipY = invY + iconSize + 8;

    const bg = this.add.rectangle(tipX, tipY, 260, 28, 0x1e293b, 0.92)
      .setStrokeStyle(1, 0x334155)
      .setDepth(200)
      .setAlpha(0);

    const label = this.add.text(tipX, tipY, t('inventory.tutorial'), {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#cbd5e1',
    }).setOrigin(0.5).setDepth(201).setAlpha(0);

    this.tweens.add({
      targets: [bg, label],
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.time.delayedCall(4000, () => {
          this.tweens.add({
            targets: [bg, label],
            alpha: 0,
            duration: 400,
            onComplete: () => { bg.destroy(); label.destroy(); },
          });
        });
      },
    });
  }
}
