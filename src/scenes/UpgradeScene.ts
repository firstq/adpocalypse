import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UPGRADE_POOL, UpgradeDef } from '../config';
import { GameScene } from './GameScene';

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  create(): void {
    const numCards = (this.registry.get('upgradeCards') as number) ?? 3;
    const nextWave = (this.registry.get('upgradeWave') as number) ?? 1;
    const isBoss = numCards >= 4;

    // Dark overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78);

    // Title
    const title = isBoss ? '★ BOSS DEFEATED! ★' : `WAVE ${nextWave - 1} CLEARED!`;
    const titleColor = isBoss ? '#ff6600' : '#f1c40f';
    this.add.text(GAME_WIDTH / 2, 70, title, {
      fontSize: isBoss ? '52px' : '48px',
      fontFamily: 'Arial Black, Arial',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 135, 'Choose an upgrade', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Pick random non-duplicate upgrades
    const pool = Phaser.Utils.Array.Shuffle([...UPGRADE_POOL]) as UpgradeDef[];
    const selected = pool.slice(0, numCards);

    const cardW = 190;
    const cardH = 270;
    const gap = numCards >= 4 ? 24 : 40;
    const totalW = numCards * cardW + (numCards - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const cardY = GAME_HEIGHT / 2 + 55;

    selected.forEach((upg, i) => {
      this.createCard(startX + i * (cardW + gap), cardY, cardW, cardH, upg, nextWave);
    });

    // Skip button (wave number shown as hint)
    const skipText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 35, `[ skip — start wave ${nextWave} ]`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#555555',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    skipText.on('pointerover', () => skipText.setColor('#888888'));
    skipText.on('pointerout', () => skipText.setColor('#555555'));
    skipText.on('pointerdown', () => this.resumeGame(nextWave));
  }

  private createCard(cx: number, cy: number, w: number, h: number, upg: UpgradeDef, nextWave: number): void {
    const container = this.add.container(cx, cy);

    const bg = this.add.rectangle(0, 0, w, h, 0x0d0d2b);
    bg.setStrokeStyle(2, 0x4ecdc4);

    const icon = this.add.text(0, -h / 2 + 52, upg.icon, {
      fontSize: '48px',
    }).setOrigin(0.5);

    const label = this.add.text(0, -h / 2 + 112, upg.label, {
      fontSize: '17px',
      fontFamily: 'Arial Black, Arial',
      color: '#ecf0f1',
      wordWrap: { width: w - 16 },
      align: 'center',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -h / 2 + 148, upg.description, {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#888888',
      wordWrap: { width: w - 20 },
      align: 'center',
    }).setOrigin(0.5);

    container.add([bg, icon, label, desc]);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.setStrokeStyle(3, 0xffd700);
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 80 });
    });
    container.on('pointerout', () => {
      bg.setStrokeStyle(2, 0x4ecdc4);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 });
    });
    container.on('pointerdown', () => {
      const gameScene = this.scene.get('GameScene') as GameScene;
      gameScene.audio.playSFX('sfx_upgrade_select');
      gameScene.player.applyUpgrade(upg.id);
      this.resumeGame(nextWave);
    });
  }

  private resumeGame(nextWave: number): void {
    this.registry.set('upgradeNextWave', nextWave);
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
