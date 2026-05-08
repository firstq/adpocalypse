import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { MetaProgress, META_UPGRADE_DEFS } from '../systems/MetaProgress';
import { UpgradeCard } from '../ui/UpgradeCard';
import { RewardedAdButton } from '../ui/RewardedAdButton';
import { adManager } from '../systems/sdk';
import { t } from '../i18n';

// Once per browser session
let workshopRewardUsedThisSession = false;

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

const HEADER_H = 128;
const FOOTER_H = 52;
const VISIBLE_H = GAME_HEIGHT - HEADER_H - FOOTER_H;
const GRID_TOP = HEADER_H + CARD_H / 2;

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
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d2b, 0x0d0d2b, 0x12122e, 0x12122e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, 14, t('workshop.title'), {
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

    if (!workshopRewardUsedThisSession) {
      const adBtn = new RewardedAdButton(this, GAME_WIDTH - 210, 98, {
        size: 'medium',
        subtitle: t('ad.workshop_subtitle'),
        rewardLabel: t('ad.free_gears'),
        onAdRequest: () => adManager.showRewarded(),
        onSuccess: () => {
          workshopRewardUsedThisSession = true;
          MetaProgress.addGears(5);
          this.gearsText.setText(this.gearsLabel());
          this.rebuildCards();
        },
      });
      adBtn.show();
    }

    this.cardsContainer = this.add.container(0, 0);
    this.rebuildCards();

    this.maskGraphics = this.make.graphics();
    this.maskGraphics.fillStyle(0xffffff);
    this.maskGraphics.fillRect(0, HEADER_H, GAME_WIDTH, VISIBLE_H);
    this.cardsContainer.setMask(this.maskGraphics.createGeometryMask());

    const totalRows = Math.ceil(META_UPGRADE_DEFS.length / COLS);
    const contentH = totalRows * CARD_H + (totalRows - 1) * V_GAP;
    this.maxScroll = Math.max(0, contentH - VISIBLE_H);
    this.scrollOffset = 0;

    this.input.on('wheel', (_ptr: unknown, _gos: unknown, _dx: number, dy: number) => {
      this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset + dy * 0.6, 0, this.maxScroll);
      this.cardsContainer.setY(-this.scrollOffset);
    });

    if (this.maxScroll > 0) {
      this.add.text(GAME_WIDTH - 20, HEADER_H + VISIBLE_H / 2, '↕', {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#334155',
      }).setOrigin(1, 0.5);
    }

    const backBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 14, t('workshop.back'), {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#475569',
    }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#94a3b8'));
    backBtn.on('pointerout', () => backBtn.setColor('#475569'));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private gearsLabel(): string {
    return t('workshop.gears', { gears: MetaProgress.getGears() });
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

      const bigNumber = def.describeLevel(level === 0 ? 1 : level);
      const currentEffect = def.describeLevel(level);
      const nextEffect = maxed ? undefined : def.describeLevel(level + 1);

      const card = new UpgradeCard(this, cx, cy, {
        iconKey: def.iconKey,
        name: t(`meta.${def.id}`),
        category: def.category,
        bigNumber,
        description: t(`meta.${def.id}.desc`),
        level: { current: level, max: def.maxLevel },
        currentEffect,
        nextEffect,
        cost: maxed ? undefined : { amount: cost, currency: 'gears' },
        affordable: canAfford,
        buyLabel: t('workshop.upgrade'),
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

    this.cardsContainer.setY(-this.scrollOffset);
  }
}
