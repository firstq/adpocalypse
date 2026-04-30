import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { GameScene } from './GameScene';
import { ShopItem, pickShopItems } from '../data/shopItems';

const CARD_W = 362;
const CARD_H = 158;
const H_GAP = 17;
const V_GAP = 18;
const ROW_PITCH = CARD_H + V_GAP;

const TOTAL_W = 3 * CARD_W + 2 * H_GAP;
const LEFT_EDGE = (GAME_WIDTH - TOTAL_W) / 2;
const COL_CENTERS = [
  LEFT_EDGE + CARD_W / 2,
  LEFT_EDGE + CARD_W + H_GAP + CARD_W / 2,
  LEFT_EDGE + CARD_W * 2 + H_GAP * 2 + CARD_W / 2,
];
const ROW_CENTERS = [
  96 + CARD_H / 2,
  96 + CARD_H / 2 + ROW_PITCH,
];

const RARITY_COLOR: Record<string, string> = {
  consumable: '#5599dd',
  upgrade: '#55cc88',
  rare: '#dd8833',
};
const RARITY_LABEL: Record<string, string> = {
  consumable: 'CONSUMABLE',
  upgrade: 'UPGRADE',
  rare: '★ RARE',
};

const REROLL_COST = 30;

export class ShopScene extends Phaser.Scene {
  private currentItems: ShopItem[] = [];
  private purchasedIds = new Set<string>();
  private pendingEffects: string[] = [];
  private rerollUsed = false;
  private nextWave = 1;

  private coinLabel!: Phaser.GameObjects.Text;
  private cardsContainer!: Phaser.GameObjects.Container;
  private rerollBg!: Phaser.GameObjects.Rectangle;
  private rerollLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    this.nextWave = (this.registry.get('shopNextWave') as number) ?? 1;
    this.currentItems = pickShopItems();
    this.purchasedIds = new Set();
    this.pendingEffects = [];
    this.rerollUsed = false;

    // Background overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82);

    this.buildHeader();
    this.cardsContainer = this.add.container(0, 0);
    this.rebuildCards();
    this.buildFooter();
  }

  private buildHeader(): void {
    this.add.text(GAME_WIDTH / 2, 16, '💰 PREMIUM OFFERS', {
      fontSize: '40px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0);

    this.coinLabel = this.add.text(GAME_WIDTH / 2, 64, '', {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffd700',
    }).setOrigin(0.5, 0);
    this.refreshCoinLabel();
  }

  private buildFooter(): void {
    const footerY = ROW_CENTERS[1] + CARD_H / 2 + 28;

    // Reroll button
    this.rerollBg = this.add.rectangle(GAME_WIDTH / 2 - 200, footerY, 220, 40, 0x334433)
      .setStrokeStyle(2, 0x55aa55)
      .setInteractive({ useHandCursor: true });

    this.rerollLabel = this.add.text(GAME_WIDTH / 2 - 200, footerY, `REROLL  🪙 ${REROLL_COST}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#55cc55',
    }).setOrigin(0.5);

    this.rerollBg.on('pointerover', () => {
      if (!this.rerollUsed) this.rerollBg.setFillStyle(0x446644);
    });
    this.rerollBg.on('pointerout', () => {
      if (!this.rerollUsed) this.rerollBg.setFillStyle(0x334433);
    });
    this.rerollBg.on('pointerdown', () => this.doReroll());

    // Proceed button
    const proceedBg = this.add.rectangle(GAME_WIDTH / 2 + 200, footerY, 220, 40, 0x336644)
      .setStrokeStyle(2, 0x4ecdc4)
      .setInteractive({ useHandCursor: true });

    const proceedLabel = this.add.text(GAME_WIDTH / 2 + 200, footerY, `PROCEED  →  Wave ${this.nextWave}`, {
      fontSize: '16px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
    }).setOrigin(0.5);

    proceedBg.on('pointerover', () => {
      proceedBg.setFillStyle(0x447755);
      proceedLabel.setColor('#ffffff');
    });
    proceedBg.on('pointerout', () => {
      proceedBg.setFillStyle(0x336644);
      proceedLabel.setColor('#4ecdc4');
    });
    proceedBg.on('pointerdown', () => this.doProceed());

    // Hint
    this.add.text(GAME_WIDTH / 2, footerY + 36, 'Buy multiple items — anything not purchased is discarded.', {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#555566',
    }).setOrigin(0.5);
  }

  private rebuildCards(): void {
    this.cardsContainer.removeAll(true);
    this.currentItems.forEach((item, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      this.buildCard(item, COL_CENTERS[col], ROW_CENTERS[row]);
    });
    this.refreshCoinLabel();
  }

  private buildCard(item: ShopItem, cx: number, cy: number): void {
    const gs = this.scene.get('GameScene') as GameScene;
    const coins = gs.getCoins();
    const bought = this.purchasedIds.has(item.id);
    const canAfford = !bought && coins >= item.cost;

    const borderColor = bought ? 0x335533 : canAfford ? 0x4ecdc4 : 0x2a2a44;
    const container = this.add.container(cx, cy);

    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x0a0a1e, 0.95);
    bg.setStrokeStyle(2, borderColor);
    if (bought) bg.setFillStyle(0x0a1a0a, 0.95);

    // Icon + name
    const nameText = this.add.text(
      -CARD_W / 2 + 12, -CARD_H / 2 + 10,
      `${item.icon}  ${item.name}`,
      { fontSize: '15px', fontFamily: 'Arial Black, Arial', color: bought ? '#449944' : '#e0e0e0' },
    ).setOrigin(0, 0);

    // Description
    const desc = this.add.text(
      -CARD_W / 2 + 12, -CARD_H / 2 + 36,
      item.description,
      { fontSize: '11px', fontFamily: 'Arial', color: '#777788', wordWrap: { width: CARD_W - 24 } },
    ).setOrigin(0, 0);

    // Rarity badge
    const rarityLabel = this.add.text(
      -CARD_W / 2 + 12, -CARD_H / 2 + 76,
      RARITY_LABEL[item.rarity],
      { fontSize: '10px', fontFamily: 'Arial Black, Arial', color: RARITY_COLOR[item.rarity] },
    ).setOrigin(0, 0);

    // Cost
    const costLabel = this.add.text(
      CARD_W / 2 - 12, -CARD_H / 2 + 74,
      `🪙 ${item.cost}`,
      {
        fontSize: '14px',
        fontFamily: 'Arial Black, Arial',
        color: bought ? '#335533' : canAfford ? '#ffd700' : '#444455',
      },
    ).setOrigin(1, 0);

    // BUY button
    const btnW = 120;
    const btnH = 28;
    const btnX = CARD_W / 2 - btnW / 2 - 12;
    const btnY = CARD_H / 2 - btnH / 2 - 10;

    const btnFill = bought ? 0x1a3a1a : canAfford ? 0x226655 : 0x1a1a2e;
    const btnStroke = bought ? 0x335533 : canAfford ? 0x4ecdc4 : 0x333344;
    const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, btnFill)
      .setStrokeStyle(1, btnStroke);

    const btnText = bought ? '✓ BOUGHT' : 'BUY';
    const btnColor = bought ? '#44aa44' : canAfford ? '#4ecdc4' : '#444455';
    const btnLabel = this.add.text(btnX, btnY, btnText, {
      fontSize: '13px',
      fontFamily: 'Arial Black, Arial',
      color: btnColor,
    }).setOrigin(0.5);

    container.add([bg, nameText, desc, rarityLabel, costLabel, btnBg, btnLabel]);
    this.cardsContainer.add(container);

    if (!bought && canAfford) {
      btnBg.setInteractive({ useHandCursor: true });
      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0x338866);
        btnLabel.setColor('#ffffff');
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x226655);
        btnLabel.setColor('#4ecdc4');
      });
      btnBg.on('pointerdown', () => this.doBuy(item));
    }
  }

  private doBuy(item: ShopItem): void {
    const gs = this.scene.get('GameScene') as GameScene;
    if (!gs.spendCoins(item.cost)) return;

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
    if (!gs.spendCoins(REROLL_COST)) return;

    this.rerollUsed = true;
    this.purchasedIds = new Set();
    this.currentItems = pickShopItems();
    this.rebuildCards();

    // Disable reroll button visually
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
