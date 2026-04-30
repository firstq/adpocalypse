import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { Enemy } from './Enemy';
import { Projectile } from '../Projectile';

interface BossTier {
  name: string;
  subtitle: string;
  bodyColor: number;
  strokeColor: number;
  glowColor: number;
  icon: string;
  shootInterval: number;
  chargeInterval: number;
  chargeSpeed: number;
  chargeDuration: number;
  shotCount: number;
  shotSpread: number;
  rotatingShot: boolean;
}

const BOSS_TIERS: BossTier[] = [
  {
    // Wave 5
    name: 'POPUP.EXE',
    subtitle: 'CLOSE THIS WINDOW',
    bodyColor: 0x5a0000,
    strokeColor: 0xff4500,
    glowColor: 0xff4500,
    icon: '☠',
    shootInterval: 2500,
    chargeInterval: 4000,
    chargeSpeed: 550,
    chargeDuration: 450,
    shotCount: 1,
    shotSpread: 0,
    rotatingShot: false,
  },
  {
    // Wave 10
    name: 'ADBLOCK KILLER',
    subtitle: 'YOUR AD BLOCKER IS DISABLED',
    bodyColor: 0x3a0060,
    strokeColor: 0xcc00ff,
    glowColor: 0xaa00ee,
    icon: '🚫',
    shootInterval: 2000,
    chargeInterval: 3500,
    chargeSpeed: 600,
    chargeDuration: 420,
    shotCount: 3,
    shotSpread: 0.32,
    rotatingShot: false,
  },
  {
    // Wave 15
    name: 'SUBSCRIBE OR DIE',
    subtitle: 'FREE TRIAL EXPIRED',
    bodyColor: 0x002050,
    strokeColor: 0x00aaff,
    glowColor: 0x0088dd,
    icon: '🔔',
    shootInterval: 1700,
    chargeInterval: 3000,
    chargeSpeed: 650,
    chargeDuration: 400,
    shotCount: 5,
    shotSpread: 0.28,
    rotatingShot: false,
  },
  {
    // Wave 20+
    name: 'ADPOCALYPSE',
    subtitle: '— FINAL FORM —',
    bodyColor: 0x120a00,
    strokeColor: 0xffd700,
    glowColor: 0xffaa00,
    icon: '💀',
    shootInterval: 1400,
    chargeInterval: 2500,
    chargeSpeed: 700,
    chargeDuration: 380,
    shotCount: 8,
    shotSpread: 0,
    rotatingShot: true,
  },
];

export function getBossTierName(bossIndex: number): string {
  return BOSS_TIERS[Math.min(BOSS_TIERS.length - 1, bossIndex - 1)].name;
}

// Temporary static slot used to pass bossIndex into buildBody (called from super())
let _pendingBossIndex = 1;

export class BossPopup extends Enemy {
  static readonly W = 185;
  static readonly H = 155;

  // tier is set inside buildBody which runs during super()
  private tier!: BossTier;
  private shootTimer = 0;
  private chargeTimer = 0;
  private charging = false;
  private rotationAngle = 0;

  constructor(scene: GameScene, x: number, y: number, hp: number, bossIndex: number) {
    _pendingBossIndex = bossIndex;
    super(scene, x, y, hp, 28, 30, 92, 10, 200);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BossPopup.W, BossPopup.H);

    this.shootTimer = scene.time.now + 1500;
    this.chargeTimer = scene.time.now + this.tier.chargeInterval;
  }

  protected buildBody(): void {
    const tierIdx = Math.min(BOSS_TIERS.length - 1, _pendingBossIndex - 1);
    this.tier = BOSS_TIERS[tierIdx];
    const t = this.tier;

    const strokeHex = '#' + t.strokeColor.toString(16).padStart(6, '0');

    const glow = this.scene.add.rectangle(0, 0, BossPopup.W + 22, BossPopup.H + 22, t.glowColor, 0.2);
    const rect = this.scene.add.rectangle(0, 0, BossPopup.W, BossPopup.H, t.bodyColor);
    rect.setStrokeStyle(4, t.strokeColor);

    const icon = this.scene.add.text(0, -48, t.icon, {
      fontSize: '46px',
    }).setOrigin(0.5);

    const name = this.scene.add.text(0, 14, t.name, {
      fontSize: '19px',
      fontFamily: 'Arial Black, Arial',
      color: strokeHex,
    }).setOrigin(0.5);

    const sub = this.scene.add.text(0, 40, t.subtitle, {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#bbbbbb',
    }).setOrigin(0.5);

    this.bodyContainer.add([glow, rect, icon, name, sub]);

    this.scene.tweens.add({
      targets: glow,
      alpha: 0.05,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  update(): void {
    super.update();
    if (!this.active) return;

    const now = this.scene.time.now;
    if (!this.charging && now >= this.chargeTimer) this.startCharge();
    if (now >= this.shootTimer) {
      this.shoot();
      this.shootTimer = now + this.tier.shootInterval;
    }
  }

  private startCharge(): void {
    this.charging = true;

    this.scene.tweens.add({
      targets: this.bodyContainer,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 350,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => {
        if (!this.active) return;
        const player = this.gameScene.player;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity((dx / len) * this.tier.chargeSpeed, (dy / len) * this.tier.chargeSpeed);

        this.scene.time.delayedCall(this.tier.chargeDuration, () => {
          if (!this.active) return;
          (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
          this.charging = false;
          this.chargeTimer = this.scene.time.now + this.tier.chargeInterval;
        });
      },
    });
  }

  protected moveTowardPlayer(): void {
    if (this.charging) return;
    super.moveTowardPlayer();
  }

  private shoot(): void {
    if (this.tier.rotatingShot) {
      for (let i = 0; i < this.tier.shotCount; i++) {
        const angle = this.rotationAngle + (i / this.tier.shotCount) * Math.PI * 2;
        new Projectile(this.gameScene, this.x, this.y, angle, 200, 22);
      }
      this.rotationAngle += 0.45;
    } else {
      const player = this.gameScene.player;
      const base = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      const count = this.tier.shotCount;
      for (let i = 0; i < count; i++) {
        const offset = count > 1 ? (i - (count - 1) / 2) * this.tier.shotSpread : 0;
        new Projectile(this.gameScene, this.x, this.y, base + offset, 220, 22);
      }
    }
    this.gameScene.audio.playSFX('shoot');
  }

  protected getBodyWidth(): number { return BossPopup.W; }
  protected getBodyHeight(): number { return BossPopup.H; }
  protected getGearDrop(): number { return Phaser.Math.Between(3, 5); }
}
