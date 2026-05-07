import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { MetaProgress, META_UPGRADE_DEFS } from '../systems/MetaProgress';
import { UpgradeCard } from '../ui/UpgradeCard';

const CARD_W = 280;
const CARD_H = 280;
const COLS = 3;
const H_GAP = 18;
const V_GAP = 16;
const ROW_PITCH = CARD_H + V_GAP;

const TOTAL_W = COLS * CARD_W + (COLS - 1) * H_GAP;
const LEFT_EDGE = (GAME_WIDTH - TOTAL_W) / 2;
const COL_CENTERS = [
  LEFT_EDGE + CARD_W / 2,
  LEFT_EDGE + CARD_W + H_GAP + CARD_W / 2,
  LEFT_EDGE + CARD_W * 2 + H_GAP * 2 + CARD_W / 2,
];

const HEADER_H = 96;   // space reserved for header
const FOOTER_H = 52;   // space reserved for back button
const VISIBLE_H = GAME_HEIGHT - HEADER_H - FOOTER_H;
const GRID_TOP = HEADER_H + CARD_H / 2; // y of first card centre

export class WorkshopScene extends Phaser.Scene {
  private gearsText!: Phaser.GameObjects.Text;
  private cardsContainer!: Phaser.GameObjects.Container;
  private scrollOffset = 0;
  private maxScroll = 0;
  private maskGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'WorkshopScene' });
  }

  create(): void {
    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d2b, 0x0d0d2b, 0x12122e, 0x12122e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Header
    this.add.text(GAME_WIDTH / 2, 14, '⚙ WORKSHOP', {
      fontSize: '40px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0);

    this.gearsText = this.add.text(GAME_WIDTH / 2, 62, this.gearsLabel(), {
      fontSize: '19px',
      fontFamily: 'Arial',
      color: '#aaaacc',
    }).setOrigin(0.5, 0);

    // Cards container (scrollable)
    this.cardsContainer = this.add.container(0, 0);
    this.rebuildCards();

    // Scroll mask — clips content to the area between header and footer
    this.maskGraphics = this.make.graphics();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(0, HEADER_H, GAME_WIDTH, VISIBLE_H);
    this.cardsContainer.setMask(this.maskGraphics.createGeometryMask());

    // Compute max scroll
    const totalRows = Math.ceil(META_UPGRADE_DEFS.length / COLS);
    const contentH = totalRows * CARD_H + (totalRows - 1) * V_GAP;
    this.maxScroll = Math.max(0, contentH - VISIBLE_H);
    this.scrollOffset = 0;

    // Mouse wheel scroll
    this.input.on('wheel', (_ptr: unknown, _gos: unknown, _dx: number, dy: number) => {
      this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + dy * 0.6, 0, this.maxScroll);
      this.cardsContainer.setY(-this.scrollOffset);
    });

    // Scroll hint (only if content overflows)
    if (this.maxScroll > 0) {
      this.add.text(GAME_WIDTH - 20, HEADER_H + VISIBLE_H / 2, '↕', {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#334155',
      }).setOrigin(1, 0.5);
    }

    // Back button
    const backBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 14, '[ BACK TO MENU ]', {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#475569',
    }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#94a3b8'));
    backBtn.on('pointerout', () => backBtn.setColor('#475569'));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private gearsLabel(): string {
    return `⚙ ${MetaProgress.getGears()} gears available`;
  }

  private rebuildCards(): void {
    this.cardsContainer.removeAll(true);

    META_UPGRADE_DEFS.forEach((def, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = COL_CENTERS[col];
      const cy = GRID_TOP + row * ROW_PITCH;

      const level = MetaProgress.getUpgradeLevel(def.id);
      const maxed = level >= def.maxLevel;
      const cost = MetaProgress.costForNextLevel(def.id);
      const canAfford = !maxed && MetaProgress.getGears() >= cost;

      // Show current value; for level-0 items preview what level 1 gives
      const bigNumber = def.describeLevel(level === 0 ? 1 : level);
      const currentEffect = def.describeLevel(level);
      const nextEffect = maxed ? undefined : def.describeLevel(level + 1);

      const card = new UpgradeCard(this, cx, cy, {
        iconKey: def.iconKey,
        name: def.name,
        category: def.category,
        bigNumber,
        description: def.description,
        level: { current: level, max: def.maxLevel },
        currentEffect,
        nextEffect,
        cost: maxed ? undefined : { amount: cost, currency: 'gears' },
        affordable: canAfford,
        buyLabel: 'UPGRADE',
        variant: 'workshop',
        onBuy: maxed ? undefined : () => {
          if (MetaProgress.purchaseUpgrade(def.id)) {
            this.gearsText.setText(this.gearsLabel());
            this.rebuildCards();
          }
        },
      });

      this.cardsContainer.add(card);
    });

    // Re-apply scroll position after rebuild
    this.cardsContainer.setY(-this.scrollOffset);
  }
}
