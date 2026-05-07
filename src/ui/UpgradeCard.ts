import Phaser from 'phaser';
import { UpgradeCategory, CATEGORY_COLORS, CATEGORY_COLORS_HEX } from './categories';

export type ItemType = 'consumable' | 'upgrade' | 'rare';

export interface UpgradeCardConfig {
  iconKey: string;
  name: string;
  category: UpgradeCategory;
  bigNumber: string;
  description: string;
  cost?: { amount: number; currency: 'coins' | 'gears' };
  affordable?: boolean;
  buyLabel?: string;
  onBuy?: () => void;
  itemType?: ItemType;
  level?: { current: number; max: number };
  currentEffect?: string;
  nextEffect?: string;
  variant?: 'shop' | 'workshop' | 'in-wave';
}

type Variant = 'shop' | 'workshop' | 'in-wave';

const CARD_W: Record<Variant, number> = { 'in-wave': 240, shop: 280, workshop: 280 };
const CARD_H: Record<Variant, number> = { 'in-wave': 360, shop: 260, workshop: 280 };

const ITEM_TYPE_STYLE: Record<ItemType, { bg: number; text: string; label: string }> = {
  consumable: { bg: 0x3b82f6, text: '#ffffff', label: '1× USE' },
  upgrade:    { bg: 0xeab308, text: '#0f172a', label: '∞ PERM' },
  rare:       { bg: 0xa855f7, text: '#ffffff', label: '★ RARE' },
};

export class UpgradeCard extends Phaser.GameObjects.Container {
  private bgRect!: Phaser.GameObjects.Rectangle;
  private rarePulseTween?: Phaser.Tweens.Tween;

  readonly cardW: number;
  readonly cardH: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: UpgradeCardConfig) {
    super(scene, x, y);
    scene.add.existing(this);

    const variant: Variant = config.variant ?? 'in-wave';
    this.cardW = CARD_W[variant];
    this.cardH = CARD_H[variant];

    this.buildCard(config, variant);

    if (variant === 'in-wave' && config.onBuy) {
      this.setupInWaveInteraction(config);
    }
  }

  private buildCard(config: UpgradeCardConfig, variant: Variant): void {
    const W = this.cardW;
    const H = this.cardH;
    const hw = W / 2;
    const hh = H / 2;
    const PAD = 16;
    const catColor = CATEGORY_COLORS[config.category];
    const catHex = CATEGORY_COLORS_HEX[config.category];
    const ICON = 48;

    // ── Background ──
    this.bgRect = this.scene.add.rectangle(0, 0, W, H, 0x0f172a);
    this.bgRect.setStrokeStyle(1, 0x334155);
    this.add(this.bgRect);

    // ── Left border stripe ──
    const stripe = this.scene.add.rectangle(-hw + 2, 0, 4, H, catColor);
    this.add(stripe);

    // ── Icon ──
    const iconX = -hw + PAD + ICON / 2;
    const iconY = -hh + PAD + ICON / 2;
    if (this.scene.textures.exists(config.iconKey)) {
      const icon = this.scene.add.image(iconX, iconY, config.iconKey);
      icon.setDisplaySize(ICON, ICON);
      icon.setTint(catColor);
      this.add(icon);
    } else {
      const ph = this.scene.add.rectangle(iconX, iconY, ICON, ICON, catColor, 0.4);
      ph.setStrokeStyle(1, catColor);
      this.add(ph);
    }

    // ── Name ──
    const nameX = -hw + PAD + ICON + 8;
    const nameMaxW = hw - PAD - nameX;
    const nameText = this.scene.add.text(nameX, iconY, config.name, {
      fontSize: '15px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      wordWrap: { width: nameMaxW },
    }).setOrigin(0, 0.5);
    this.add(nameText);

    // ── Type tag (shop only) ──
    if (variant === 'shop' && config.itemType) {
      this.buildTypeTag(config.itemType, hw - PAD, -hh + PAD + 11);
    }

    // ── Big Number ──
    const bigFontSize = variant === 'in-wave' ? '52px' : '40px';
    const bigNumFromTop = variant === 'workshop' ? 100 : 110;
    const bigNum = this.scene.add.text(0, -hh + bigNumFromTop, config.bigNumber, {
      fontSize: bigFontSize,
      fontFamily: 'Arial Black, Arial',
      color: catHex,
    }).setOrigin(0.5, 0.5);
    this.add(bigNum);

    // ── Description ──
    const descFromTop = variant === 'in-wave' ? 170 : variant === 'shop' ? 160 : 130;
    const descText = this.scene.add.text(-hw + PAD, -hh + descFromTop, config.description, {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#94a3b8',
      wordWrap: { width: W - PAD * 2 },
    }).setOrigin(0, 0);
    this.add(descText);

    // ── Progress section (workshop only) ──
    // Anchored relative to cost row so it never overlaps: cost at hh-28, progress ends ~30px above it
    if (variant === 'workshop' && config.level) {
      const progFromTop = 190;
      this.buildProgressSection(config, -hw + PAD, -hh + progFromTop, catColor, catHex, W, PAD);
    }

    // ── Cost row (shop / workshop) ──
    if (config.cost !== undefined && variant !== 'in-wave') {
      this.buildCostRow(config, hh - 28, hw, catColor);
    }
  }

  private buildTypeTag(itemType: ItemType, rightX: number, centerY: number): void {
    const style = ITEM_TYPE_STYLE[itemType];
    const tagW = 76;
    const tagH = 22;
    const tagX = rightX - tagW / 2;

    const tagBg = this.scene.add.rectangle(tagX, centerY, tagW, tagH, style.bg);
    const tagLabel = this.scene.add.text(tagX, centerY, style.label, {
      fontSize: '10px',
      fontFamily: 'Arial Black, Arial',
      color: style.text,
    }).setOrigin(0.5);
    this.add([tagBg, tagLabel]);

    if (itemType === 'rare') {
      tagBg.setStrokeStyle(1, 0xc084fc);
      this.rarePulseTween = this.scene.tweens.add({
        targets: tagBg,
        alpha: { from: 0.75, to: 1 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private buildProgressSection(
    config: UpgradeCardConfig,
    leftX: number,
    topY: number,
    catColor: number,
    _catHex: string,
    W: number,
    PAD: number,
  ): void {
    const level = config.level!;
    const maxed = level.current >= level.max;

    if (maxed) {
      const maxLabel = this.scene.add.text(0, topY + 8, 'MAX LEVEL', {
        fontSize: '13px',
        fontFamily: 'Arial Black, Arial',
        color: '#10b981',
      }).setOrigin(0.5, 0);
      this.add(maxLabel);
      return;
    }

    const lvlLabel = this.scene.add.text(leftX, topY, `Level ${level.current} / ${level.max}`, {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#64748b',
    }).setOrigin(0, 0);
    this.add(lvlLabel);

    // Progress bar
    const barW = W - PAD * 2;
    const barH = 7;
    const barY = topY + 15;
    const barCX = leftX + barW / 2;
    const barBg = this.scene.add.rectangle(barCX, barY, barW, barH, 0x334155);
    this.add(barBg);

    if (level.current > 0) {
      const fillW = Math.max(1, barW * (level.current / level.max));
      const barFill = this.scene.add.rectangle(leftX, barY, fillW, barH, catColor);
      barFill.setOrigin(0, 0.5);
      this.add(barFill);
    }

    // Current → next effect comparison
    if (config.currentEffect !== undefined && config.nextEffect !== undefined) {
      const effY = barY + 12;
      const effText = this.scene.add.text(leftX, effY,
        `Now: ${config.currentEffect}  →  Next: ${config.nextEffect}`, {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: '#475569',
      }).setOrigin(0, 0);
      this.add(effText);
    }
  }

  private buildCostRow(config: UpgradeCardConfig, centerY: number, hw: number, catColor: number): void {
    const affordable = config.affordable ?? true;
    const maxed = config.level !== undefined && config.level.current >= config.level.max;
    const PAD = 16;

    const currencyIcon = config.cost!.currency === 'coins' ? '🪙' : '⚙';
    const amountColor = !affordable ? '#ef4444' : '#ffffff';

    const amountText = this.scene.add.text(-hw + PAD, centerY, `${currencyIcon} ${config.cost!.amount}`, {
      fontSize: '17px',
      fontFamily: 'Arial Black, Arial',
      color: amountColor,
    }).setOrigin(0, 0.5);
    this.add(amountText);

    const btnW = 100;
    const btnH = 34;
    const btnX = hw - PAD - btnW / 2;
    const btnLabel = maxed ? 'MAXED' : (config.buyLabel ?? 'BUY');
    const btnFill = maxed ? 0x334155 : affordable ? catColor : 0x475569;
    const btnTextColor = maxed ? '#64748b' : '#ffffff';

    const btn = this.scene.add.rectangle(btnX, centerY, btnW, btnH, btnFill);
    const btnLabelText = this.scene.add.text(btnX, centerY, btnLabel, {
      fontSize: '13px',
      fontFamily: 'Arial Black, Arial',
      color: btnTextColor,
    }).setOrigin(0.5);
    this.add([btn, btnLabelText]);

    if (!maxed && affordable && config.onBuy) {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setAlpha(0.8));
      btn.on('pointerout', () => btn.setAlpha(1));
      btn.on('pointerdown', () => config.onBuy!());
    }
  }

  private setupInWaveInteraction(config: UpgradeCardConfig): void {
    this.setSize(this.cardW, this.cardH);
    this.setInteractive({ useHandCursor: true });
    const catColor = CATEGORY_COLORS[config.category];

    this.on('pointerover', () => {
      this.scene.tweens.add({ targets: this, scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Sine.easeOut' });
      this.bgRect.setStrokeStyle(2, catColor);
    });
    this.on('pointerout', () => {
      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 150, ease: 'Sine.easeOut' });
      this.bgRect.setStrokeStyle(1, 0x334155);
    });
    this.on('pointerdown', () => config.onBuy!());
  }

  destroyCard(): void {
    this.rarePulseTween?.stop();
    this.destroy();
  }
}
