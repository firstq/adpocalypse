import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { GameScene } from './GameScene';
import { ShopItem, pickShopItems } from '../data/shopItems';
import { UpgradeCard } from '../ui/UpgradeCard';
import { RewardedAdButton } from '../ui/RewardedAdButton';
import { adManager } from '../systems/sdk';

const CARD_W = 280;
const CARD_H = 260;
const H_GAP = 20;
const V_GAP = 18;
const ROW_PITCH = CARD_H + V_GAP;

const TOTAL_W = 3 * CARD_W + 2 * H_GAP;
const LEFT_EDGE = (GAME_WIDTH - TOTAL_W) / 2;
const COL_CENTERS = [
  LEFT_EDGE + CARD_W / 2,
  LEFT_EDGE + CARD_W + H_GAP + CARD_W / 2,
  LEFT_EDGE + CARD_W * 2 + H_GAP * 2 + CARD_W / 2,
];
const GRID_TOP_Y = 88; // top of first card row (card centers at GRID_TOP_Y + CARD_H/2)
const ROW_CENTERS = [
  GRID_TOP_Y + CARD_H / 2,
  GRID_TOP_Y + CARD_H / 2 + ROW_PITCH,
];

export class ShopScene extends Phaser.Scene {
  private currentItems: ShopItem[] = [];
  private purchasedIds = new Set<string>();
  private pendingEffects: string[] = [];
  private rerollUsed = false;
  private nextWave = 1;

  private get rerollCost(): number { return 10 + (this.nextWave - 1) * 2; }

  private coinLabel!: Phaser.GameObjects.Text;
  private cardsContainer!: Phaser.GameObjects.Container;
  private rerollBg!: Phaser.GameObjects.Rectangle;
  private rerollLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    this.nextWave = (this.registry.get('shopNextWave') as number) ?? 1;
    this.currentItems = pickShopItems(this.nextWave - 1);
    this.purchasedIds = new Set();
    this.pendingEffects = [];
    this.rerollUsed = false;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.84);

    this.buildHeader();
    this.cardsContainer = this.add.container(0, 0);
    this.rebuildCards();
    this.buildFooter();
  }

  private buildHeader(): void {
    this.add.text(GAME_WIDTH / 2, 14, '💰 PREMIUM OFFERS', {
      fontSize: '38px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0);

    this.coinLabel = this.add.text(GAME_WIDTH / 2, 60, '', {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffd700',
    }).setOrigin(0.5, 0);
    this.refreshCoinLabel();
  }

  private buildFooter(): void {
    const footerY = ROW_CENTERS[1] + CARD_H / 2 + 24;

    // Bottom action row — three buttons evenly laid out:
    // [REFRESH ~230px] [FREE REROLL ~210px] [PROCEED ~230px]  total ~710px centred in 1280
    const REFRESH_X = 400;
    const AD_X      = 640;
    const PROCEED_X = 880;

    // Paid reroll
    this.rerollBg = this.add.rectangle(REFRESH_X, footerY, 230, 40, 0x334433)
      .setStrokeStyle(2, 0x55aa55)
      .setInteractive({ useHandCursor: true });

    this.rerollLabel = this.add.text(REFRESH_X, footerY, `🎲 REFRESH  🪙 ${this.rerollCost}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#55cc55',
    }).setOrigin(0.5);

    this.rerollBg.on('pointerover', () => { if (!this.rerollUsed) this.rerollBg.setFillStyle(0x446644); });
    this.rerollBg.on('pointerout',  () => { if (!this.rerollUsed) this.rerollBg.setFillStyle(0x334433); });
    this.rerollBg.on('pointerdown', () => this.doReroll());

    // Free reroll via rewarded ad — inline with the row, subtle pulse
    const adRerollBtn = new RewardedAdButton(this, AD_X, footerY, {
      size: 'small',
      subtitle: 'WATCH AD TO REROLL',
      rewardLabel: 'FREE REROLL',
      pulseScale: 1.02,
      pulseDuration: 2000,
      onAdRequest: () => adManager.showRewarded(),
      onSuccess: () => {
        this.purchasedIds = new Set();
        this.currentItems = pickShopItems(this.nextWave - 1);
        this.rebuildCards();
      },
    });
    adRerollBtn.show();

    // Proceed button
    const proceedBg = this.add.rectangle(PROCEED_X, footerY, 230, 40, 0x1e3a2f)
      .setStrokeStyle(2, 0x10b981)
      .setInteractive({ useHandCursor: true });

    const proceedLabel = this.add.text(PROCEED_X, footerY, `PROCEED  →  Wave ${this.nextWave}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#10b981',
    }).setOrigin(0.5);

    proceedBg.on('pointerover', () => { proceedBg.setFillStyle(0x2d5a44); proceedLabel.setColor('#ffffff'); });
    proceedBg.on('pointerout',  () => { proceedBg.setFillStyle(0x1e3a2f); proceedLabel.setColor('#10b981'); });
    proceedBg.on('pointerdown', () => this.doProceed());

    this.add.text(GAME_WIDTH / 2, footerY + 38, 'Buy multiple items — anything not purchased is discarded.', {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#475569',
    }).setOrigin(0.5);
  }

  private rebuildCards(): void {
    this.cardsContainer.removeAll(true);
    const gs = this.scene.get('GameScene') as GameScene;
    const coins = gs.getCoins();

    this.currentItems.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = COL_CENTERS[col];
      const cy = ROW_CENTERS[row];
      const bought = this.purchasedIds.has(item.id);
      const affordable = !bought && coins >= item.cost;

      const card = new UpgradeCard(this, cx, cy, {
        iconKey: item.iconKey,
        name: item.name,
        category: item.category,
        bigNumber: bought ? '✓' : item.bigNumber,
        description: item.description,
        itemType: item.rarity as 'consumable' | 'upgrade' | 'rare',
        cost: { amount: item.cost, currency: 'coins' },
        affordable,
        purchased: bought,
        variant: 'shop',
        onBuy: bought ? undefined : () => this.doBuy(item),
      });

      if (bought) {
        card.setAlpha(0.7);
      }

      this.cardsContainer.add(card);
    });

    this.refreshCoinLabel();
  }

  private doBuy(item: ShopItem): void {
    const gs = this.scene.get('GameScene') as GameScene;
    if (!gs.spendCoins(item.cost)) return;
    gs.audio.playSFX('sfx_purchase');

    if (item.isPending) {
      this.pendingEffects.push(item.id);
    } else {
      gs.applyShopItem(item.id);
    }

    this.purchasedIds.add(item.id);
    this.rebuildCards();
  }

  private doReroll(): void {
    if (this.rerollUsed) return;
    const gs = this.scene.get('GameScene') as GameScene;
    if (!gs.spendCoins(this.rerollCost)) return;
    gs.audio.playSFX('sfx_reroll');

    this.rerollUsed = true;
    this.purchasedIds = new Set();
    this.currentItems = pickShopItems(this.nextWave - 1);
    this.rebuildCards();

    this.rerollBg.setFillStyle(0x222222).setStrokeStyle(2, 0x333333).removeInteractive();
    this.rerollLabel.setColor('#444444');
  }

  private doProceed(): void {
    this.registry.set('shopPendingEffects', this.pendingEffects);
    this.scene.stop();
    this.scene.resume('GameScene');
  }

  private refreshCoinLabel(): void {
    const gs = this.scene.get('GameScene') as GameScene;
    this.coinLabel?.setText(`🪙 ${gs.getCoins()} coins available`);
  }
}
