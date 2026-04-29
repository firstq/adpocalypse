import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { HPBar } from '../ui/HPBar';
import { GameState } from './GameScene';

export class UIScene extends Phaser.Scene {
  private hpBar!: HPBar;
  private coinText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private paused = false;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.paused = false;

    // HP bar background
    this.add.rectangle(110, 30, 204, 24, 0x000000, 0.5).setOrigin(0.5, 0.5);
    this.hpBar = new HPBar(this, 10, 18, 200, 20, 0xe74c3c, 0x555555);

    this.add.text(10, 14, 'HP', {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    });

    // Coin counter
    this.coinText = this.add.text(10, 50, '🪙 0', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3,
    });

    // Wave info (top center)
    this.waveText = this.add.text(GAME_WIDTH / 2, 20, 'Wave 1 | Enemies: 0', {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ecf0f1',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);

    // Pause button (top right)
    const pauseBtn = this.add.text(GAME_WIDTH - 20, 20, '⏸', {
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
      // GameScene.start() cleans itself up and relaunches UIScene
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
    this.hpBar?.setValue(state.hp, state.maxHp);
    this.coinText?.setText(`🪙 ${state.coins}`);
    this.waveText?.setText(`Wave ${state.wave} | Enemies: ${state.enemiesRemaining}`);
  }
}
