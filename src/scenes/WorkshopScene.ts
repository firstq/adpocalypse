import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { MetaProgress, META_UPGRADE_DEFS, MetaUpgradeDef } from '../systems/MetaProgress';

const CARD_W = 362;
const CARD_H = 132;
const COLS = 3;
const H_GAP = 18;
const V_GAP = 12;
const ROW_PITCH = CARD_H + V_GAP;

// Column centres: equally spaced across 1280, leaving margin
const TOTAL_W = COLS * CARD_W + (COLS - 1) * H_GAP;
const LEFT_EDGE = (GAME_WIDTH - TOTAL_W) / 2;
const COL_CENTERS = [
  LEFT_EDGE + CARD_W / 2,
  LEFT_EDGE + CARD_W + H_GAP + CARD_W / 2,
  LEFT_EDGE + CARD_W * 2 + H_GAP * 2 + CARD_W / 2,
];

const GRID_TOP = 96; // y of first card centre

export class WorkshopScene extends Phaser.Scene {
  private gearsText!: Phaser.GameObjects.Text;
  private cardsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'WorkshopScene' });
  }

  create(): void {
    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d2b, 0x0d0d2b, 0x12122e, 0x12122e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Header
    this.add.text(GAME_WIDTH / 2, 18, '⚙ WORKSHOP', {
      fontSize: '42px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5, 0);

    this.gearsText = this.add.text(GAME_WIDTH / 2, 66, this.gearsLabel(), {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#aaaacc',
    }).setOrigin(0.5, 0);

    // Cards
    this.cardsContainer = this.add.container(0, 0);
    this.rebuildCards();

    // Back button
    const backBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 22, '[ BACK TO MENU ]', {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#555555',
    }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#aaaaaa'));
    backBtn.on('pointerout', () => backBtn.setColor('#555555'));
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
      this.buildCard(def, cx, cy);
    });
  }

  private buildCard(def: MetaUpgradeDef, cx: number, cy: number): void {
    const level = MetaProgress.getUpgradeLevel(def.id);
    const maxed = level >= def.maxLevel;
    const cost = MetaProgress.costForNextLevel(def.id);
    const canAfford = !maxed && MetaProgress.getGears() >= cost;

    const borderColor = maxed ? 0x446644 : canAfford ? 0x4ecdc4 : 0x333355;
    const container = this.add.container(cx, cy);

    // Background
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x0a0a1e, 1);
    bg.setStrokeStyle(2, borderColor);

    // Icon + name row
    const iconName = this.add.text(-CARD_W / 2 + 12, -CARD_H / 2 + 10, `${def.icon}  ${def.name}`, {
      fontSize: '15px',
      fontFamily: 'Arial Black, Arial',
      color: maxed ? '#55aa55' : '#e0e0e0',
    }).setOrigin(0, 0);

    // Description
    const desc = this.add.text(-CARD_W / 2 + 12, -CARD_H / 2 + 36, def.description, {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#777788',
      wordWrap: { width: CARD_W - 24 },
    }).setOrigin(0, 0);

    // Level dots + level label
    const dots = this.buildDots(level, def.maxLevel);
    const levelLabel = this.add.text(-CARD_W / 2 + 12, -CARD_H / 2 + 74, `Lv ${level}/${def.maxLevel}  ${dots}`, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#888899',
    }).setOrigin(0, 0);

    // Cost / maxed label
    const costLabel = maxed
      ? this.add.text(CARD_W / 2 - 12, -CARD_H / 2 + 74, 'MAXED', {
          fontSize: '12px',
          fontFamily: 'Arial Black, Arial',
          color: '#55aa55',
        }).setOrigin(1, 0)
      : this.add.text(CARD_W / 2 - 12, -CARD_H / 2 + 74, `⚙ ${cost}`, {
          fontSize: '13px',
          fontFamily: 'Arial Black, Arial',
          color: canAfford ? '#ffd700' : '#555566',
        }).setOrigin(1, 0);

    // Upgrade button
    const btnW = 120;
    const btnH = 26;
    const btnX = CARD_W / 2 - btnW / 2 - 12;
    const btnY = CARD_H / 2 - btnH / 2 - 8;

    const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, canAfford ? 0x226655 : 0x222233)
      .setStrokeStyle(1, canAfford ? 0x4ecdc4 : 0x333344);

    const btnLabel = this.add.text(btnX, btnY, maxed ? 'MAXED' : 'UPGRADE', {
      fontSize: '12px',
      fontFamily: 'Arial Black, Arial',
      color: maxed ? '#55aa55' : canAfford ? '#4ecdc4' : '#444455',
    }).setOrigin(0.5);

    container.add([bg, iconName, desc, levelLabel, costLabel, btnBg, btnLabel]);
    this.cardsContainer.add(container);

    if (!maxed && canAfford) {
      btnBg.setInteractive({ useHandCursor: true });

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0x338866);
        btnLabel.setColor('#ffffff');
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x226655);
        btnLabel.setColor('#4ecdc4');
      });
      btnBg.on('pointerdown', () => {
        if (MetaProgress.purchaseUpgrade(def.id)) {
          this.gearsText.setText(this.gearsLabel());
          this.rebuildCards();
        }
      });
    }
  }

  private buildDots(level: number, maxLevel: number): string {
    const filled = '●'.repeat(level);
    const empty = '○'.repeat(maxLevel - level);
    return filled + empty;
  }
}
