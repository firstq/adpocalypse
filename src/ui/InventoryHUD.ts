import Phaser from 'phaser';
import { ConsumableType, PlayerInventory } from '../systems/InventoryManager';

interface IconConfig {
  type: ConsumableType;
  emoji: string;
  key: string;
}

const CONFIGS: IconConfig[] = [
  { type: 'bomb',         emoji: '💣', key: '1' },
  { type: 'healthPotion', emoji: '🧪', key: '2' },
  { type: 'fullHeal',     emoji: '💊', key: '3' },
  { type: 'timeSlow',     emoji: '🕐', key: '4' },
];

const SIZE = 48;
const GAP  = 8;

interface IconEntry {
  bg:         Phaser.GameObjects.Rectangle;
  icon:       Phaser.GameObjects.Text;
  badge:      Phaser.GameObjects.Text;
  keyLabel:   Phaser.GameObjects.Text;
}

export class InventoryHUD extends Phaser.GameObjects.Container {
  private icons: IconEntry[] = [];
  private readonly isMobile: boolean;
  private readonly onActivate: (type: ConsumableType) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    isMobile: boolean,
    onActivate: (type: ConsumableType) => void,
  ) {
    super(scene, x, y);
    this.isMobile = isMobile;
    this.onActivate = onActivate;
    scene.add.existing(this);
    this.setDepth(90);
    this.buildIcons();
  }

  private buildIcons(): void {
    CONFIGS.forEach((cfg, i) => {
      const cx = i * (SIZE + GAP) + SIZE / 2;
      const cy = SIZE / 2;

      const bg = this.scene.add.rectangle(cx, cy, SIZE, SIZE, 0x1e293b)
        .setStrokeStyle(1, 0x334155);

      const icon = this.scene.add.text(cx, cy - 2, cfg.emoji, {
        fontSize: '24px',
        fontFamily: 'Arial',
      }).setOrigin(0.5);

      const badge = this.scene.add.text(cx + SIZE / 2 - 4, cy - SIZE / 2 + 4, '', {
        fontSize: '13px',
        fontFamily: 'Arial Black, Arial',
        color: '#ffffff',
        backgroundColor: '#0f172a',
        padding: { x: 2, y: 1 },
      }).setOrigin(1, 0).setDepth(1);

      const keyLabel = this.scene.add.text(cx, cy + SIZE / 2 - 8, cfg.key, {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: '#64748b',
      }).setOrigin(0.5, 1).setVisible(!this.isMobile);

      this.add([bg, icon, badge, keyLabel]);
      this.icons.push({ bg, icon, badge, keyLabel });

      bg.setInteractive({ useHandCursor: true });
      const type = cfg.type;
      bg.on('pointerdown', () => {
        this.scene.tweens.add({
          targets: [bg, icon],
          scaleX: 0.88, scaleY: 0.88,
          duration: 70,
          yoyo: true,
          ease: 'Power2',
        });
        this.onActivate(type);
      });
      bg.on('pointerover', () => bg.setFillStyle(0x2d3f55).setStrokeStyle(1, 0x4a6080));
      bg.on('pointerout',  () => bg.setFillStyle(0x1e293b).setStrokeStyle(1, 0x334155));
    });
  }

  update(inv: PlayerInventory, timeSlowActive: boolean, timeSlowRemaining: number): void {
    CONFIGS.forEach((cfg, i) => {
      const { bg, icon, badge } = this.icons[i];
      const count = inv[cfg.type];
      const empty = count <= 0;

      icon.setAlpha(empty ? 0.3 : 1);
      if (empty) icon.setTint(0x888888); else icon.clearTint();
      bg.setAlpha(empty ? 0.6 : 1);

      if (cfg.type === 'timeSlow' && timeSlowActive) {
        const secs = Math.ceil(timeSlowRemaining / 1000);
        badge.setText(`${secs}s`).setVisible(true);
        bg.setStrokeStyle(2, 0x3b82f6);
      } else if (count > 0) {
        badge.setText(`×${count}`).setVisible(true);
        bg.setStrokeStyle(1, 0x334155);
      } else {
        badge.setVisible(false);
        bg.setStrokeStyle(1, 0x334155);
      }
    });
  }
}
