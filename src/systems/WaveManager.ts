import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { GameScene } from '../scenes/GameScene';
import { EnemyMultipliers } from '../entities/enemies/Enemy';
import { PopupClose } from '../entities/enemies/PopupClose';
import { CookieBanner } from '../entities/enemies/CookieBanner';
import { PremiumPopup } from '../entities/enemies/PremiumPopup';
import { SpamEmail } from '../entities/enemies/SpamEmail';
import { AutoplayVideo } from '../entities/enemies/AutoplayVideo';
import { BossPopup, getBossTierName } from '../entities/enemies/BossPopup';

interface WaveDef {
  popupClose: number;
  cookieBanner: number;
  premiumPopup: number;
  spamEmail: number;
  autoplayVideo: number;
  isBoss: boolean;
  bossHp?: number;
}

export class WaveManager {
  private scene: GameScene;
  private currentWave = 0;
  private remaining = 0;
  private totalInWave = 0;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  startWave(waveNumber: number): void {
    this.currentWave = waveNumber;
    const def = this.buildWaveDef(waveNumber);
    this.totalInWave = def.popupClose + def.cookieBanner + def.premiumPopup +
      def.spamEmail + def.autoplayVideo + (def.isBoss ? 1 : 0);
    this.remaining = this.totalInWave;

    this.scene.setWave(waveNumber);
    this.scene.setEnemiesRemaining(this.remaining);
    this.scene.setEnemiesTotal(this.totalInWave);

    this.showWaveBanner(waveNumber, def.isBoss);

    const mult = this.buildMult(waveNumber);
    let delay = 700;
    const interval = 420;

    if (def.isBoss) {
      const bossIndex = Math.floor(waveNumber / 5);
      this.scene.time.delayedCall(800, () => {
        new BossPopup(this.scene, GAME_WIDTH / 2, 200, def.bossHp!, bossIndex);
      });
      for (let i = 0; i < def.popupClose; i++) {
        this.scene.time.delayedCall(delay + i * interval, () => this.spawnPopupClose(mult));
      }
      delay += def.popupClose * interval;
      for (let i = 0; i < def.spamEmail; i++) {
        this.scene.time.delayedCall(delay + i * 150, () => this.spawnSpamEmail(mult));
      }
      return;
    }

    for (let i = 0; i < def.popupClose; i++) {
      this.scene.time.delayedCall(delay, () => this.spawnPopupClose(mult));
      delay += interval;
    }
    // Spam emails come in quick clusters
    let spamSpawned = 0;
    while (spamSpawned < def.spamEmail) {
      const clusterSize = Math.min(Phaser.Math.Between(3, 4), def.spamEmail - spamSpawned);
      for (let i = 0; i < clusterSize; i++) {
        this.scene.time.delayedCall(delay + i * 80, () => this.spawnSpamEmail(mult));
      }
      delay += interval + clusterSize * 80;
      spamSpawned += clusterSize;
    }
    for (let i = 0; i < def.cookieBanner; i++) {
      this.scene.time.delayedCall(delay, () => this.spawnCookieBanner(mult));
      delay += interval + 200;
    }
    for (let i = 0; i < def.premiumPopup; i++) {
      this.scene.time.delayedCall(delay, () => this.spawnPremiumPopup(mult));
      delay += interval + 400;
    }
    for (let i = 0; i < def.autoplayVideo; i++) {
      this.scene.time.delayedCall(delay, () => this.spawnAutoplayVideo(mult));
      delay += interval + 300;
    }
  }

  private buildWaveDef(N: number): WaveDef {
    if (N % 5 === 0) {
      const bossIndex = Math.floor(N / 5);
      // More adds for higher-tier bosses
      const adds = Math.min(3 + bossIndex, 6);
      const spamAdds = bossIndex >= 3 ? Math.min(bossIndex - 1, 4) : 0;
      return {
        popupClose: adds,
        cookieBanner: 0,
        premiumPopup: 0,
        spamEmail: spamAdds,
        autoplayVideo: 0,
        isBoss: true,
        bossHp: 200 + 70 * bossIndex,
      };
    }

    const total = 5 + Math.floor(N * 1.5);
    const autoplay = N >= 8 ? Math.min(2, 1 + Math.floor((N - 8) / 4)) : 0;
    const premium  = N >= 3 ? Math.min(3, 1 + Math.floor((N - 3) / 3)) : 0;
    const cookie   = N >= 2 ? Math.min(5, 1 + Math.floor((N - 2) / 2)) : 0;
    const spam     = N >= 4 ? Math.min(8, 3 + Math.floor((N - 4) / 2)) : 0;

    const special = autoplay + premium + cookie + spam;
    const popup = Math.max(3, total - special);

    return { popupClose: popup, cookieBanner: cookie, premiumPopup: premium, spamEmail: spam, autoplayVideo: autoplay, isBoss: false };
  }

  private buildMult(N: number): EnemyMultipliers {
    return {
      hp:     1 + (N - 1) * 0.15,
      speed:  1 + (N - 1) * 0.06,
      damage: 1 + (N - 1) * 0.10,
    };
  }

  private showWaveBanner(waveNumber: number, isBoss: boolean): void {
    if (isBoss) {
      const bossIndex = Math.floor(waveNumber / 5);
      const bossName = getBossTierName(bossIndex);
      const items: Phaser.GameObjects.Text[] = [];

      const waveLabel = this.scene.add.text(GAME_WIDTH / 2, 170, `⚠ BOSS WAVE ${waveNumber} ⚠`, {
        fontSize: '54px',
        fontFamily: 'Arial Black, Arial',
        color: '#ff4500',
        stroke: '#000000',
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(50).setAlpha(0);

      const nameLabel = this.scene.add.text(GAME_WIDTH / 2, 240, bossName, {
        fontSize: '36px',
        fontFamily: 'Arial Black, Arial',
        color: '#ffcc00',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(50).setAlpha(0);

      items.push(waveLabel, nameLabel);
      this.scene.tweens.add({
        targets: items,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.time.delayedCall(1500, () => {
            this.scene.tweens.add({
              targets: items,
              alpha: 0,
              duration: 300,
              onComplete: () => items.forEach(t => t.destroy()),
            });
          });
        },
      });
      return;
    }

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
        this.scene.time.delayedCall(1200, () => {
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

  private randomEdgeX(): number {
    return Math.random() > 0.5
      ? Phaser.Math.Between(20, 100)
      : Phaser.Math.Between(GAME_WIDTH - 100, GAME_WIDTH - 20);
  }

  private spawnPopupClose(mult: EnemyMultipliers): void {
    const x = this.randomEdgeX();
    const y = Phaser.Math.Between(80, this.scene.groundTop - 40);
    new PopupClose(this.scene, x, y, mult);
  }

  private spawnCookieBanner(mult: EnemyMultipliers): void {
    const x = this.randomEdgeX();
    new CookieBanner(this.scene, x, this.scene.groundTop - 27, mult);
  }

  private spawnPremiumPopup(mult: EnemyMultipliers): void {
    const x = this.randomEdgeX();
    const y = Phaser.Math.Between(100, this.scene.groundTop - 100);
    new PremiumPopup(this.scene, x, y, mult);
  }

  private spawnSpamEmail(mult: EnemyMultipliers): void {
    const x = this.randomEdgeX();
    const y = Phaser.Math.Between(80, this.scene.groundTop - 40);
    new SpamEmail(this.scene, x, y, mult);
  }

  private spawnAutoplayVideo(mult: EnemyMultipliers): void {
    const x = Phaser.Math.Between(200, GAME_WIDTH - 200);
    const y = Phaser.Math.Between(120, this.scene.groundTop - 120);
    new AutoplayVideo(this.scene, x, y, mult);
  }

  onEnemyKilled(): void {
    this.remaining = Math.max(0, this.remaining - 1);
    this.scene.setEnemiesRemaining(this.remaining);
    if (this.remaining === 0) {
      const isBoss = this.currentWave % 5 === 0;
      this.scene.time.delayedCall(600, () => {
        this.scene.onWaveComplete(this.currentWave, isBoss ? 4 : 3);
      });
    }
  }
}
