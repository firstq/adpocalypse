import Phaser from 'phaser';
import { WAVE_DEFINITIONS, GAME_WIDTH } from '../config';
import { GameScene } from '../scenes/GameScene';
import { PopupClose } from '../entities/enemies/PopupClose';
import { CookieBanner } from '../entities/enemies/CookieBanner';
import { PremiumPopup } from '../entities/enemies/PremiumPopup';

export class WaveManager {
  private scene: GameScene;
  private currentWave = 0;
  private remaining = 0;
  private totalSpawned = 0;
  private totalInWave = 0;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  startWave(waveNumber: number): void {
    this.currentWave = waveNumber;
    const def = WAVE_DEFINITIONS[waveNumber - 1];
    this.totalInWave = def.popupClose + def.cookieBanner + def.premiumPopup;
    this.remaining = this.totalInWave;
    this.totalSpawned = 0;

    this.scene.setWave(waveNumber);
    this.scene.setEnemiesRemaining(this.remaining);

    this.showWaveBanner(waveNumber);

    // Spawn enemies with staggered delays
    let delay = 600;
    const spawnInterval = 450;

    for (let i = 0; i < def.popupClose; i++) {
      this.scene.time.delayedCall(delay, () => this.spawnPopupClose());
      delay += spawnInterval;
    }
    for (let i = 0; i < def.cookieBanner; i++) {
      this.scene.time.delayedCall(delay, () => this.spawnCookieBanner());
      delay += spawnInterval + 200;
    }
    for (let i = 0; i < def.premiumPopup; i++) {
      this.scene.time.delayedCall(delay, () => this.spawnPremiumPopup());
      delay += spawnInterval + 400;
    }
  }

  private showWaveBanner(waveNumber: number): void {
    const text = this.scene.add.text(GAME_WIDTH / 2, 200, `WAVE ${waveNumber}`, {
      fontSize: '72px',
      fontFamily: 'Arial Black, Arial',
      color: '#f1c40f',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.scene.tweens.add({
      targets: text,
      alpha: 1,
      y: 180,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(1000, () => {
          this.scene.tweens.add({
            targets: text,
            alpha: 0,
            y: 150,
            duration: 300,
            onComplete: () => text.destroy(),
          });
        });
      },
    });
  }

  private spawnPopupClose(): void {
    const x = this.randomEdgeX();
    const y = Phaser.Math.Between(80, this.scene.groundTop - 40);
    new PopupClose(this.scene, x, y);
    this.totalSpawned++;
  }

  private spawnCookieBanner(): void {
    const x = this.randomEdgeX();
    new CookieBanner(this.scene, x, this.scene.groundTop - 27);
    this.totalSpawned++;
  }

  private spawnPremiumPopup(): void {
    const x = this.randomEdgeX();
    const y = Phaser.Math.Between(100, this.scene.groundTop - 100);
    new PremiumPopup(this.scene, x, y);
    this.totalSpawned++;
  }

  private randomEdgeX(): number {
    return Math.random() > 0.5 ? Phaser.Math.Between(20, 100) : Phaser.Math.Between(GAME_WIDTH - 100, GAME_WIDTH - 20);
  }

  onEnemyKilled(): void {
    this.remaining = Math.max(0, this.remaining - 1);
    this.scene.setEnemiesRemaining(this.remaining);
    if (this.remaining === 0 && this.totalSpawned >= this.totalInWave) {
      this.scene.time.delayedCall(500, () => {
        this.scene.onWaveComplete(this.currentWave);
      });
    }
  }
}
