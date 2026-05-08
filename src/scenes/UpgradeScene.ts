import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UPGRADE_POOL } from '../config';
import { GameScene } from './GameScene';
import { UpgradeCard } from '../ui/UpgradeCard';
import { adManager } from '../systems/sdk';

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  create(): void {
    const numCards  = (this.registry.get('upgradeCards')   as number) ?? 3;
    const nextWave  = (this.registry.get('upgradeWave')    as number) ?? 1;
    const waveCoins = (this.registry.get('upgradeWaveCoins') as number) ?? 0;
    const isBoss = numCards >= 4;

    // Dark overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82);

    // Title
    const title      = isBoss ? '★ BOSS DEFEATED! ★' : `WAVE ${nextWave - 1} CLEARED!`;
    const titleColor = isBoss ? '#ff6600' : '#f1c40f';
    this.add.text(GAME_WIDTH / 2, 52, title, {
      fontSize: isBoss ? '50px' : '46px',
      fontFamily: 'Arial Black, Arial',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 118, 'Choose an upgrade', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5);

    // Double-coins rewarded ad (only if player earned coins this wave)
    if (waveCoins > 0) {
      let adUsed = false;
      const adBg = this.add.rectangle(GAME_WIDTH / 2, 152, 280, 28, 0x1a3a1a).setStrokeStyle(1, 0x22c55e);
      const adBtn = this.add.text(GAME_WIDTH / 2, 152, `▶ AD: +${waveCoins} bonus coins`, {
        fontSize: '13px',
        fontFamily: 'Arial Black, Arial',
        color: '#22c55e',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      adBg.setInteractive({ useHandCursor: true });
      const doAd = () => {
        if (adUsed) return;
        adBtn.disableInteractive().setText('Loading...');
        adBg.removeInteractive();
        void adManager.showRewarded().then(rewarded => {
          if (rewarded) {
            adUsed = true;
            const gs = this.scene.get('GameScene') as GameScene;
            gs.addCoins(waveCoins);
            adBtn.setText(`✓ +${waveCoins} coins added!`);
            adBg.setStrokeStyle(1, 0x166534);
          } else {
            adBtn.setInteractive({ useHandCursor: true }).setText(`▶ AD: +${waveCoins} bonus coins`);
            adBg.setInteractive({ useHandCursor: true });
          }
        });
      };
      adBtn.on('pointerdown', doAd);
      adBg.on('pointerdown', doAd);
    }

    // Pick random upgrades
    const pool     = Phaser.Utils.Array.Shuffle([...UPGRADE_POOL]);
    const selected = pool.slice(0, numCards);

    const cardW  = 240;
    const gap    = numCards >= 4 ? 24 : 36;
    const totalW = numCards * cardW + (numCards - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const cardY  = GAME_HEIGHT / 2 + 60;

    selected.forEach((upg, i) => {
      new UpgradeCard(this, startX + i * (cardW + gap), cardY, {
        iconKey:     upg.iconKey,
        name:        upg.label,
        category:    upg.category,
        bigNumber:   upg.bigNumber,
        description: upg.description,
        variant:     'in-wave',
        buyLabel:    'CHOOSE',
        onBuy: () => {
          const gs = this.scene.get('GameScene') as GameScene;
          gs.audio.playSFX('sfx_upgrade_select');
          gs.player.applyUpgrade(upg.id);
          this.resumeGame(nextWave);
        },
      });
    });

    // Skip button
    const skipText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, `[ skip — start wave ${nextWave} ]`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#475569',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    skipText.on('pointerover', () => skipText.setColor('#94a3b8'));
    skipText.on('pointerout',  () => skipText.setColor('#475569'));
    skipText.on('pointerdown', () => this.resumeGame(nextWave));
  }

  private resumeGame(nextWave: number): void {
    this.registry.remove('upgradeWaveCoins');
    this.registry.set('upgradeNextWave', nextWave);
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
