import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Button } from '../ui/Button';
import { AudioManager } from '../systems/AudioManager';
import { MetaProgress } from '../systems/MetaProgress';

export class MenuScene extends Phaser.Scene {
  private audio!: AudioManager;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.audio = new AudioManager();

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.spawnBgDecorations();

    this.add.text(GAME_WIDTH / 2, 185, 'ADPOCALYPSE', {
      fontSize: '96px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
      stroke: '#0a0a1a',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 285, 'Fight the Internet!', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#a8dadc',
    }).setOrigin(0.5);

    // Best wave stat
    const bestWave = parseInt(localStorage.getItem('bestWave') || '0');
    if (bestWave > 0) {
      this.add.text(GAME_WIDTH / 2, 320, `Best: Wave ${bestWave}`, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffd700',
      }).setOrigin(0.5);
    }

    new Button(this, GAME_WIDTH / 2, 390, 200, 60, 'PLAY', () => {
      this.scene.start('GameScene');
    });

    const gears = MetaProgress.getGears();
    new Button(this, GAME_WIDTH / 2, 468, 220, 54, `⚙ WORKSHOP (${gears})`, () => {
      MetaProgress.markWorkshopVisited();
      this.scene.start('WorkshopScene');
    }, 0x334466);

    let muted = false;
    const muteBtn = new Button(this, GAME_WIDTH / 2, 542, 200, 50, '🔊 SOUND', () => {
      muted = !muted;
      this.audio.setMuted(muted);
      muteBtn.setLabel(muted ? '🔇 MUTED' : '🔊 SOUND');
    }, 0x555555);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'WASD / Arrows — Move   |   Space / Click — Attack', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#7f8c8d',
    }).setOrigin(0.5);

    // Hidden reset: Ctrl+Shift+R
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (event.ctrlKey && event.shiftKey && event.code === 'KeyR') {
          const confirmed = window.confirm('Reset ALL progress (gears, upgrades, best wave)? This cannot be undone.');
          if (confirmed) {
            MetaProgress.resetAll();
            this.scene.restart();
          }
        }
      });
    }
  }

  private spawnBgDecorations(): void {
    const labels = ['✕ CLOSE', 'ACCEPT COOKIES', 'YOU WON!', '★ SUBSCRIBE', '⚡ PREMIUM'];
    const colors = [0xe74c3c, 0xf39c12, 0xf1c40f, 0x9b59b6, 0x3498db];

    for (let i = 0; i < 6; i++) {
      const idx = i % labels.length;
      const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      const y = Phaser.Math.Between(50, GAME_HEIGHT - 50);
      const w = Phaser.Math.Between(80, 180);
      const h = Phaser.Math.Between(30, 60);

      const container = this.add.container(x, y);
      const rect = this.add.rectangle(0, 0, w, h, colors[idx], 0.15);
      const text = this.add.text(0, 0, labels[idx], {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.3);
      container.add([rect, text]);
      container.setAlpha(0.4);

      this.tweens.add({
        targets: container,
        x: x + Phaser.Math.Between(-80, 80),
        y: y + Phaser.Math.Between(-40, 40),
        duration: Phaser.Math.Between(4000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
