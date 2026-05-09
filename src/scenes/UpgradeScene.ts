import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UPGRADE_POOL, UPGRADE_DIMINISHING, getUpgradeBigNumber } from '../config';
import { GameScene } from './GameScene';
import { UpgradeCard } from '../ui/UpgradeCard';
import { RewardedAdButton } from '../ui/RewardedAdButton';
import { adManager } from '../systems/sdk';
import { t } from '../i18n';

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  create(): void {
    const numCards  = (this.registry.get('upgradeCards')     as number) ?? 3;
    const nextWave  = (this.registry.get('upgradeWave')      as number) ?? 1;
    const waveCoins = (this.registry.get('upgradeWaveCoins') as number) ?? 0;
    const isBoss = numCards >= 4;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82);

    const title      = isBoss ? t('wave.boss_cleared') : t('wave.cleared', { wave: nextWave - 1 });
    const titleColor = isBoss ? '#ff6600' : '#f1c40f';
    this.add.text(GAME_WIDTH / 2, 52, title, {
      fontSize: isBoss ? '50px' : '46px',
      fontFamily: 'Arial Black, Arial',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 118, t('wave.choose_upgrade'), {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0.5);

    let adButton: RewardedAdButton | undefined;
    if (waveCoins > 0) {
      adButton = new RewardedAdButton(this, GAME_WIDTH / 2, 200, {
        size: 'large',
        subtitle: t('ad.double_coins_subtitle'),
        rewardLabel: t('ad.bonus_coins', { amount: waveCoins }),
        onAdRequest: () => adManager.showRewarded(),
        onSuccess: () => {
          const gs = this.scene.get('GameScene') as GameScene;
          gs.addCoins(waveCoins);
        },
      });
      adButton.show();
    }

    const pool     = Phaser.Utils.Array.Shuffle([...UPGRADE_POOL]);
    const selected = pool.slice(0, numCards);

    const gs = this.scene.get('GameScene') as GameScene;
    const activeUpgrades = gs.player.upgradeState.activeUpgrades;

    const cardW  = 240;
    const gap    = numCards >= 4 ? 24 : 36;
    const totalW = numCards * cardW + (numCards - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const cardY  = GAME_HEIGHT / 2 + 60;

    selected.forEach((upg, i) => {
      const timesPicked = activeUpgrades.filter(id => id === upg.id).length;
      const bigNumber = getUpgradeBigNumber(upg.id, timesPicked);
      const isDiminishing = timesPicked >= 4 && UPGRADE_DIMINISHING[upg.id] !== undefined;
      const description = t(`inwave.${upg.id}.desc`) + (isDiminishing ? ' (diminishing)' : '');

      new UpgradeCard(this, startX + i * (cardW + gap), cardY, {
        iconKey:     upg.iconKey,
        name:        t(`inwave.${upg.id}`),
        category:    upg.category,
        bigNumber,
        description,
        variant:     'in-wave',
        buyLabel:    t('wave.upgrade_choose'),
        onBuy: () => {
          adButton?.hide();
          gs.audio.playSFX('sfx_upgrade_select');
          gs.player.applyUpgrade(upg.id);
          this.resumeGame(nextWave);
        },
      });
    });

    const skipText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, t('wave.skip', { wave: nextWave }), {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#475569',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    skipText.on('pointerover', () => skipText.setColor('#94a3b8'));
    skipText.on('pointerout',  () => skipText.setColor('#475569'));
    skipText.on('pointerdown', () => { adButton?.hide(); this.resumeGame(nextWave); });
  }

  private resumeGame(nextWave: number): void {
    this.registry.remove('upgradeWaveCoins');
    this.registry.set('upgradeNextWave', nextWave);
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
