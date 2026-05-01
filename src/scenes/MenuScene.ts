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
    this.audio = new AudioManager(this);

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

    const muteBtn = new Button(this, GAME_WIDTH / 2, 542, 200, 50, this.muteLabel(), () => {
      this.audio.setMuted(!this.audio.isMuted());
      muteBtn.setLabel(this.muteLabel());
    }, 0x555555);

    // Settings gear icon (top-right)
    const settingsBtn = this.add.text(GAME_WIDTH - 20, 14, '⚙', {
      fontSize: '28px',
      fontFamily: 'Arial',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).setDepth(5);

    settingsBtn.on('pointerover', () => settingsBtn.setAlpha(0.7));
    settingsBtn.on('pointerout',  () => settingsBtn.setAlpha(1));
    settingsBtn.on('pointerdown', () => this.openSettings());

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'WASD / Arrows — Move   |   Space / Click — Attack', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#7f8c8d',
    }).setOrigin(0.5);

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

  private muteLabel(): string {
    return this.audio.isMuted() ? '🔇 MUTED' : '🔊 SOUND';
  }

  private openSettings(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const closeAll = () => objects.forEach(o => o.destroy());
    const objects: Phaser.GameObjects.GameObject[] = [];

    const dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
      .setDepth(100).setInteractive();
    objects.push(dim);

    const panel = this.add.rectangle(cx, cy, 440, 340, 0x12122a)
      .setStrokeStyle(2, 0x4ecdc4).setDepth(101);
    objects.push(panel);

    const title = this.add.text(cx, cy - 140, 'SETTINGS', {
      fontSize: '30px', fontFamily: 'Arial Black, Arial', color: '#4ecdc4',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(102);
    objects.push(title);

    // Mute toggle
    const muteRow = this.add.text(cx, cy - 72, this.muteSettingsLabel(), {
      fontSize: '18px', fontFamily: 'Arial', color: '#ecf0f1',
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    objects.push(muteRow);
    muteRow.on('pointerover', () => muteRow.setColor('#ffd700'));
    muteRow.on('pointerout',  () => muteRow.setColor('#ecf0f1'));
    muteRow.on('pointerdown', () => {
      this.audio.setMuted(!this.audio.isMuted());
      muteRow.setText(this.muteSettingsLabel());
    });

    // SFX Volume label
    const volLabel = this.add.text(cx, cy - 16, 'SFX Volume', {
      fontSize: '15px', fontFamily: 'Arial Black, Arial', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(102);
    objects.push(volLabel);

    // Slider
    const trackW = 280;
    const trackX = cx - trackW / 2;
    const trackY = cy + 24;

    const trackBg = this.add.rectangle(cx, trackY, trackW, 8, 0x333333).setDepth(102);
    objects.push(trackBg);

    let currentVol = this.audio.getSfxVolume();
    const fillBar = this.add.rectangle(trackX, trackY, trackW * currentVol, 8, 0x4ecdc4)
      .setOrigin(0, 0.5).setDepth(103);
    objects.push(fillBar);

    const handle = this.add.circle(trackX + trackW * currentVol, trackY, 10, 0xffffff).setDepth(104);
    objects.push(handle);

    const volPct = this.add.text(cx + trackW / 2 + 18, trackY, `${Math.round(currentVol * 100)}%`, {
      fontSize: '14px', fontFamily: 'Arial', color: '#ecf0f1',
    }).setOrigin(0, 0.5).setDepth(102);
    objects.push(volPct);

    const hitArea = this.add.rectangle(cx, trackY, trackW, 28, 0xffffff, 0)
      .setDepth(105).setInteractive({ useHandCursor: true });
    objects.push(hitArea);

    const applyVol = (ptr: Phaser.Input.Pointer) => {
      const relX = Phaser.Math.Clamp(ptr.x - trackX, 0, trackW);
      currentVol = relX / trackW;
      this.audio.setSfxVolume(currentVol);
      fillBar.setSize(Math.max(1, trackW * currentVol), 8);
      handle.setX(trackX + trackW * currentVol);
      volPct.setText(`${Math.round(currentVol * 100)}%`);
    };
    hitArea.on('pointerdown', applyVol);
    hitArea.on('pointermove', (ptr: Phaser.Input.Pointer) => { if (ptr.isDown) applyVol(ptr); });

    // Close button
    const closeBtn = this.add.text(cx, cy + 120, '[ CLOSE ]', {
      fontSize: '24px', fontFamily: 'Arial Black, Arial', color: '#4ecdc4',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    objects.push(closeBtn);

    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout',  () => closeBtn.setColor('#4ecdc4'));
    closeBtn.on('pointerdown', closeAll);
    dim.on('pointerdown', closeAll);
  }

  private muteSettingsLabel(): string {
    return this.audio.isMuted()
      ? '🔇 Sound: MUTED  — click to unmute'
      : '🔊 Sound: ON  — click to mute';
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
