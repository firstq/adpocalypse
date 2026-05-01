import Phaser from 'phaser';
import { GAME_WIDTH, UPGRADE_POOL } from '../config';
import { HPBar } from '../ui/HPBar';
import { GameScene, GameState } from './GameScene';

export class UIScene extends Phaser.Scene {
  private hpBar!: HPBar;
  private coinText!: Phaser.GameObjects.Text;
  private gearText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private enemyBar!: Phaser.GameObjects.Rectangle;
  private enemyBarLabel!: Phaser.GameObjects.Text;
  private upgradeIcons!: Phaser.GameObjects.Container;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private paused = false;
  private lastUpgradeCount = -1;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.paused = false;
    this.lastUpgradeCount = -1;

    // HP bar
    this.add.rectangle(110, 30, 204, 24, 0x000000, 0.5).setOrigin(0.5, 0.5);
    this.hpBar = new HPBar(this, 10, 18, 200, 20, 0xe74c3c, 0x555555);
    this.add.text(10, 14, 'HP', {
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

    // Wave info (top center)
    this.waveText = this.add.text(GAME_WIDTH / 2, 14, 'Wave 1', {
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

    // Best wave (top right, left of mute/pause)
    this.bestText = this.add.text(GAME_WIDTH - 108, 14, 'Best: —', {
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
    const title = this.add.text(0, -100, 'PAUSED', {
      fontSize: '52px',
      fontFamily: 'Arial Black, Arial',
      color: '#ecf0f1',
    }).setOrigin(0.5);

    const resumeText = this.add.text(0, 10, '[ RESUME ]', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#4ecdc4',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resumeText.on('pointerover', () => resumeText.setColor('#ffffff'));
    resumeText.on('pointerout', () => resumeText.setColor('#4ecdc4'));
    resumeText.on('pointerdown', () => this.togglePause());

    const restartText = this.add.text(0, 80, '[ RESTART ]', {
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

  updateState(state: GameState): void {
    if (!this.hpBar) return; // create() not yet called
    this.hpBar?.setValue(state.hp, state.maxHp);
    this.coinText?.setText(`🪙 ${state.coins}`);
    this.gearText?.setText(`⚙ ${state.gearsThisRun}`);

    const isBoss = state.wave > 1 && (state.wave - 1) % 5 === 0;
    const waveColor = isBoss ? '#ff6600' : '#ecf0f1';
    this.waveText?.setText(`Wave ${state.wave}`).setColor(waveColor);

    const best = state.bestWave > 0 ? `Best: ${state.bestWave}` : 'Best: —';
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
        const t = this.add.text(i * 26, 0, def.icon, { fontSize: '18px' });
        this.upgradeIcons.add(t);
      });
    }
  }
}
