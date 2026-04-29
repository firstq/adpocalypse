import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Button } from '../ui/Button';
import { AudioManager } from '../systems/AudioManager';

export class MenuScene extends Phaser.Scene {
  private audio!: AudioManager;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.audio = new AudioManager();

    // Background gradient-like fill
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Decorative ad enemies drifting in background
    this.spawnBgDecorations();

    // Title
    this.add.text(GAME_WIDTH / 2, 200, 'AD SLAYER', {
      fontSize: '96px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
      stroke: '#0a0a1a',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 300, 'Fight the Internet!', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#a8dadc',
    }).setOrigin(0.5);

    // Play button
    new Button(this, GAME_WIDTH / 2, 430, 200, 60, 'PLAY', () => {
      this.scene.start('GameScene');
      // UIScene is launched by GameScene.create() automatically
    });

    // Mute button
    let muted = false;
    const muteBtn = new Button(this, GAME_WIDTH / 2, 520, 200, 50, '🔊 SOUND', () => {
      muted = !muted;
      this.audio.setMuted(muted);
      muteBtn.setLabel(muted ? '🔇 MUTED' : '🔊 SOUND');
    }, 0x555555);

    // Controls hint
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'WASD / Arrows — Move   |   Space / Click — Attack', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#7f8c8d',
    }).setOrigin(0.5);
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
