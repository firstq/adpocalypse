import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { GameScene } from '../scenes/GameScene';
import { EnemyMultipliers } from '../entities/enemies/Enemy';
import { PopupClose } from '../entities/enemies/PopupClose';
import { CookieBanner } from '../entities/enemies/CookieBanner';
import { PremiumPopup } from '../entities/enemies/PremiumPopup';
import { SpamEmail } from '../entities/enemies/SpamEmail';
import { AutoplayVideo } from '../entities/enemies/AutoplayVideo';
import { AlgorithmBoss } from '../entities/bosses/AlgorithmBoss';
import { SpamBoss } from '../entities/bosses/SpamBoss';
import { ScrollBoss } from '../entities/bosses/ScrollBoss';

interface WaveDef {
  popupClose: number;
  cookieBanner: number;
  premiumPopup: number;
  spamEmail: number;
  autoplayVideo: number;
  isBoss: boolean;
}

export class WaveManager {
  private scene: GameScene;
  private currentWave = 0;
  private remaining = 0;
  private totalInWave = 0;
  private waveCompleteTriggered = false;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  startWave(waveNumber: number): void {
    this.currentWave = waveNumber;
    this.waveCompleteTriggered = false;

    const def = this.buildWaveDef(waveNumber);
    this.totalInWave = def.isBoss
      ? 1
      : def.popupClose + def.cookieBanner + def.premiumPopup + def.spamEmail + def.autoplayVideo;
    this.remaining = this.totalInWave;

    this.scene.setWave(waveNumber);
    this.scene.setEnemiesRemaining(this.remaining);
    this.scene.setEnemiesTotal(this.totalInWave);

    this.showWaveBanner(waveNumber, def.isBoss);

    if (def.isBoss) {
      // Boss spawns after intro banner fades (~2.5 s)
      this.scene.time.delayedCall(2500, () => this.spawnBoss(waveNumber));
      return;
    }

    const mult = this.buildMult(waveNumber);
    let delay = 700;
    const interval = 420;

    for (let i = 0; i < def.popupClose; i++) {
      this.scene.time.delayedCall(delay, () => this.spawnPopupClose(mult));
      delay += interval;
    }
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

  private spawnBoss(waveNumber: number): void {
    // bossType cycles: 0=Algorithm, 1=Spam, 2=Scroll
    const bossIndex = Math.floor(waveNumber / 5);        // 1, 2, 3, 4, 5…
    const bossType = (bossIndex - 1) % 3;                // 0, 1, 2, 0, 1…
    const cycle = Math.floor((bossIndex - 1) / 3);       // 0, 0, 0, 1, 1…

    const cx = GAME_WIDTH / 2;
    switch (bossType) {
      case 0:
        new AlgorithmBoss(this.scene, cx, 200, 300 + 150 * cycle, waveNumber);
        break;
      case 1:
        new SpamBoss(this.scene, cx, 170, 400 + 200 * cycle, waveNumber);
        break;
      case 2:
        new ScrollBoss(this.scene, cx, 200, 500 + 250 * cycle, waveNumber);
        break;
    }
  }

  private buildWaveDef(N: number): WaveDef {
    if (N % 5 === 0) {
      return {
        popupClose: 0, cookieBanner: 0, premiumPopup: 0,
        spamEmail: 0, autoplayVideo: 0, isBoss: true,
      };
    }

    const total = 5 + Math.floor(N * 2);
    const autoplay = N >= 8 ? Math.min(2, 1 + Math.floor((N - 8) / 4)) : 0;
    const premium  = N >= 3 ? Math.min(3, 1 + Math.floor((N - 3) / 3)) : 0;
    const cookie   = N >= 2 ? Math.min(5, 1 + Math.floor((N - 2) / 2)) : 0;
    const spam     = N >= 4 ? Math.min(8, 3 + Math.floor((N - 4) / 2)) : 0;
    const special  = autoplay + premium + cookie + spam;
    const popup    = Math.max(3, total - special);

    return { popupClose: popup, cookieBanner: cookie, premiumPopup: premium, spamEmail: spam, autoplayVideo: autoplay, isBoss: false };
  }

  private buildMult(N: number): EnemyMultipliers {
    return {
      hp:     Math.pow(1.12, N - 1),
      speed:  Math.min(2.5, Math.pow(1.05, N - 1)),
      damage: Math.pow(1.08, N - 1),
    };
  }

  private showWaveBanner(waveNumber: number, isBoss: boolean): void {
    if (isBoss) {
      this.scene.audio.playSFX('sfx_boss_appear');
      const bossType = ((Math.floor(waveNumber / 5)) - 1) % 3;
      const bossNames = [AlgorithmBoss.NAME, SpamBoss.NAME, ScrollBoss.NAME];
      const bossName = bossNames[bossType];

      const items: Phaser.GameObjects.Text[] = [];
      const waveLabel = this.scene.add.text(GAME_WIDTH / 2, 170, `⚠ BOSS WAVE ${waveNumber} ⚠`, {
        fontSize: '54px', fontFamily: 'Arial Black, Arial', color: '#ff4500',
        stroke: '#000000', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(50).setAlpha(0);

      const nameLabel = this.scene.add.text(GAME_WIDTH / 2, 240, bossName, {
        fontSize: '36px', fontFamily: 'Arial Black, Arial', color: '#ffcc00',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(50).setAlpha(0);

      items.push(waveLabel, nameLabel);

      this.scene.tweens.add({
        targets: items, alpha: 1, duration: 300, ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.time.delayedCall(1500, () => {
            this.scene.tweens.add({
              targets: items, alpha: 0, duration: 300,
              onComplete: () => items.forEach(t => t.destroy()),
            });
          });
        },
      });
      return;
    }

    const text = this.scene.add.text(GAME_WIDTH / 2, 200, `WAVE ${waveNumber}`, {
      fontSize: '72px', fontFamily: 'Arial Black, Arial', color: '#f1c40f',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.scene.tweens.add({
      targets: text, alpha: 1, y: 180, duration: 300, ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(1200, () => {
          this.scene.tweens.add({
            targets: text, alpha: 0, y: 150, duration: 300,
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
    new PopupClose(this.scene, this.randomEdgeX(), Phaser.Math.Between(80, this.scene.groundTop - 40), mult);
  }

  private spawnCookieBanner(mult: EnemyMultipliers): void {
    new CookieBanner(this.scene, this.randomEdgeX(), this.scene.groundTop - 27, mult);
  }

  private spawnPremiumPopup(mult: EnemyMultipliers): void {
    new PremiumPopup(this.scene, this.randomEdgeX(), Phaser.Math.Between(100, this.scene.groundTop - 100), mult);
  }

  private spawnSpamEmail(mult: EnemyMultipliers): void {
    new SpamEmail(this.scene, this.randomEdgeX(), Phaser.Math.Between(80, this.scene.groundTop - 40), mult);
  }

  private spawnAutoplayVideo(mult: EnemyMultipliers): void {
    new AutoplayVideo(
      this.scene,
      Phaser.Math.Between(200, GAME_WIDTH - 200),
      Phaser.Math.Between(120, this.scene.groundTop - 120),
      mult,
    );
  }

  onEnemyKilled(): void {
    if (this.waveCompleteTriggered) return;
    this.remaining = Math.max(0, this.remaining - 1);
    this.scene.setEnemiesRemaining(this.remaining);
    if (this.remaining === 0) {
      this.waveCompleteTriggered = true;
      const isBoss = this.currentWave % 5 === 0;
      this.scene.time.delayedCall(isBoss ? 1800 : 600, () => {
        this.scene.onWaveComplete(this.currentWave, isBoss ? 4 : 3);
      });
    }
  }
}
