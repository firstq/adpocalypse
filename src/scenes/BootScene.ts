import Phaser from 'phaser';
import { initSDK, sdkInstance } from '../systems/sdk';
import { initI18n } from '../i18n';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    // Kick off async SDK init; transition to PreloadScene when done (or on error)
    this.initAsync().catch((err: unknown) => {
      console.error('[BootScene] SDK init error:', err);
      this.scene.start('PreloadScene');
    });
  }

  private async initAsync(): Promise<void> {
    await initSDK();
    initI18n(sdkInstance.getLang());
    this.scene.start('PreloadScene');
  }
}
