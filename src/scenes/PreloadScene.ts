import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Progress bar
    const bar = this.add.graphics();
    const bg = this.add.graphics();
    bg.fillStyle(0x222222).fillRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2 - 15, 320, 30);

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(COLORS.hpBar).fillRect(GAME_WIDTH / 2 - 158, GAME_HEIGHT / 2 - 13, 316 * value, 26);
    });

    // All assets are procedurally generated — nothing to load for the MVP.
    // TODO: load Kenney sprite sheets here when available.
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
