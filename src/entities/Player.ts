import Phaser from 'phaser';
import {
  PLAYER_HP, PLAYER_SPEED, PLAYER_MELEE_DAMAGE,
  PLAYER_INVINCIBILITY_MS, PLAYER_ATTACK_DURATION_MS,
  GAME_WIDTH, COLORS,
} from '../config';
import { InputManager } from '../systems/InputManager';
import { GameScene } from '../scenes/GameScene';

const SWORD_IDLE_ANGLE = 20;

interface UpgradeState {
  damageMult: number;
  speedMult: number;
  cooldownMult: number;
  lifestealHp: number;
  critChance: number;
  magnetRadius: number;
  thorns: number;
  regenRate: number;
  coinMult: number;
  swingMult: number;
  doubleStrikeChance: number;
  bonusCoinDrop: number;
  gearDropBonus: number;
  activeUpgrades: string[];
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number = PLAYER_HP;
  maxHp: number = PLAYER_HP;
  meleeDamage: number = PLAYER_MELEE_DAMAGE;
  reviveCharges: number = 0;
  facingRight: boolean = true;
  isAttacking: boolean = false;

  readonly upgradeState: UpgradeState = {
    damageMult: 1,
    speedMult: 1,
    cooldownMult: 1,
    lifestealHp: 0,
    critChance: 0,
    magnetRadius: 0,
    thorns: 0,
    regenRate: 0,
    coinMult: 1,
    swingMult: 1,
    doubleStrikeChance: 0,
    bonusCoinDrop: 0,
    gearDropBonus: 0,
    activeUpgrades: [],
  };

  private invincible: boolean = false;
  private attackCooldown: boolean = false;
  private swingGraphic!: Phaser.GameObjects.Graphics;
  private bodyGraphic!: Phaser.GameObjects.Graphics;
  private swordGraphic!: Phaser.GameObjects.Graphics;
  private gameScene: GameScene;
  private currentVx = 0;
  private currentVy = 0;
  private attackTweening = false;
  private cooldownGraphic!: Phaser.GameObjects.Graphics;
  private attackCooldownStart = 0;

  private swordYOffset = 0;
  private swordTwitchTimer = 0;
  private ringFlashAlpha = 0;
  private ringPulseAlpha = 0;
  private prematureFeedbackTimer = 0;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, '');
    this.gameScene = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setGravityY(0);
    body.setSize(32, 56);

    this.bodyGraphic = scene.add.graphics();
    this.bodyGraphic.setDepth(5);

    this.swordGraphic = scene.add.graphics();
    this.swordGraphic.setDepth(5);
    this.swordGraphic.setAngle(SWORD_IDLE_ANGLE);

    this.cooldownGraphic = scene.add.graphics();
    this.cooldownGraphic.setDepth(4);

    this.swingGraphic = scene.add.graphics();
    this.swingGraphic.setDepth(6);

    this.setVisible(false);
  }

  get isCurrentlyInvincible(): boolean {
    return this.invincible;
  }

  getSwingRange(): number {
    return 90 * this.upgradeState.swingMult;
  }

  getSwingAngle(): number {
    return (Math.PI / 2) * this.upgradeState.swingMult;
  }

  private getCooldownMs(): number {
    return Math.round((PLAYER_ATTACK_DURATION_MS + 100) * this.upgradeState.cooldownMult);
  }

  applyUpgrade(id: string): void {
    const u = this.upgradeState;
    u.activeUpgrades.push(id);

    switch (id) {
      case 'hp_boost':
        this.maxHp += 25;
        this.hp = Math.min(this.hp + 25, this.maxHp);
        break;
      case 'hp_restore':
        this.hp = this.maxHp;
        break;
      case 'damage_boost':
        u.damageMult *= 1.25;
        this.meleeDamage = Math.round(PLAYER_MELEE_DAMAGE * u.damageMult);
        break;
      case 'speed_boost':
        u.speedMult *= 1.2;
        break;
      case 'attack_speed':
        u.cooldownMult = Math.max(0.25, u.cooldownMult * 0.75);
        break;
      case 'lifesteal':
        u.lifestealHp += 5;
        break;
      case 'crit':
        u.critChance = Math.min(0.75, u.critChance + 0.25);
        break;
      case 'magnet':
        u.magnetRadius += 350;
        break;
      case 'thorns':
        u.thorns += 5;
        break;
      case 'regen':
        u.regenRate += 1;
        break;
      case 'double_coins':
        u.coinMult *= 2;
        break;
      case 'wide_swing':
        u.swingMult = Math.min(2, u.swingMult + 0.3);
        break;
    }
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  private drawBody(): void {
    const g = this.bodyGraphic;
    g.clear();

    g.fillStyle(COLORS.player);
    g.fillRoundedRect(-14, -20, 28, 40, 5);

    g.fillStyle(0xfce4b3);
    g.fillCircle(0, -32, 15);

    g.fillStyle(0x1a1a2e);
    const eyeX = this.facingRight ? 5 : -5;
    g.fillCircle(eyeX, -34, 3);
    g.fillCircle(eyeX - (this.facingRight ? 6 : -6), -34, 2);

    g.fillStyle(0x2c3e50);
    g.fillRect(-13, 18, 10, 16);
    g.fillRect(3, 18, 10, 16);
  }

  private drawSword(dimmed = false): void {
    const g = this.swordGraphic;
    g.clear();
    g.fillStyle(dimmed ? 0x555566 : 0xbdc3c7);
    g.fillRect(-3, -30, 7, 28);
    g.fillStyle(dimmed ? 0x3a3a44 : 0x7f8c8d);
    g.fillRect(-6, -4, 12, 5);
    g.fillStyle(dimmed ? 0x3d2008 : 0x8B4513);
    g.fillRect(-2, 1, 5, 10);
  }

  private drawSwing(): void {
    const g = this.swingGraphic;
    g.clear();
    g.setScale(this.facingRight ? 1 : -1, 1);

    const half = this.getSwingAngle();
    const start = -half - 0.1;
    const end   =  half + 0.1;
    const range = this.getSwingRange();

    g.fillStyle(0xffffff, 0.3);
    g.slice(0, 0, range, start, end, false);
    g.fillPath();

    g.lineStyle(4, 0xffffff, 0.9);
    g.beginPath();
    g.arc(0, 0, range, start, end, false);
    g.strokePath();
  }

  update(input: InputManager): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const delta = this.scene.game.loop.delta;
    const lerpT = Math.min(1, delta / 50);
    const speed = PLAYER_SPEED * this.upgradeState.speedMult;

    let targetVx = 0;
    if (input.left) {
      targetVx = -speed;
      this.facingRight = false;
    } else if (input.right) {
      targetVx = speed;
      this.facingRight = true;
    }

    let targetVy = 0;
    if (input.up) targetVy = -speed;
    else if (input.down) targetVy = speed;

    this.currentVx = Phaser.Math.Linear(this.currentVx, targetVx, lerpT);
    this.currentVy = Phaser.Math.Linear(this.currentVy, targetVy, lerpT);

    body.setVelocity(this.currentVx, this.currentVy);

    if (this.y > this.gameScene.groundTop) {
      this.y = this.gameScene.groundTop;
      body.setVelocityY(0);
    }
    if (this.y < 60) {
      this.y = 60;
      body.setVelocityY(0);
    }

    this.x = Phaser.Math.Clamp(this.x, 20, GAME_WIDTH - 20);

    if (input.attack) {
      if (!this.attackCooldown) {
        this.performAttack();
      } else {
        this.triggerPrematureFeedback();
      }
    }

    if (this.ringFlashAlpha > 0) this.ringFlashAlpha = Math.max(0, this.ringFlashAlpha - delta / 100);
    if (this.ringPulseAlpha > 0) this.ringPulseAlpha = Math.max(0, this.ringPulseAlpha - delta / 200);
    if (this.swordTwitchTimer > 0) this.swordTwitchTimer = Math.max(0, this.swordTwitchTimer - delta);

    const leanAngle = (this.currentVx / speed) * 5;
    this.bodyGraphic.setPosition(this.x, this.y);
    this.bodyGraphic.setAngle(leanAngle);
    this.drawBody();

    const handX = this.facingRight ? -16 : 16;
    const twitchX = this.swordTwitchTimer > 0
      ? (this.facingRight ? 1 : -1) * 4 * Math.sin(Math.PI * (1 - this.swordTwitchTimer / 100))
      : 0;
    this.swordGraphic.setPosition(this.x + handX + twitchX, this.y + 2 + this.swordYOffset);
    if (!this.attackTweening) {
      this.swordGraphic.setAngle(this.facingRight ? -SWORD_IDLE_ANGLE : SWORD_IDLE_ANGLE);
    }
    this.drawSword(this.attackCooldown);
    this.drawCooldownRing();

    this.swingGraphic.setPosition(this.x, this.y);

    const visible = !this.invincible || (Math.floor(this.scene.time.now / 50) % 2 === 0);
    const alpha = visible ? 1 : 0;
    this.bodyGraphic.setAlpha(alpha);
    this.swordGraphic.setAlpha(alpha);
  }

  private performAttack(): void {
    if (this.attackCooldown) return;
    this.isAttacking = true;
    this.attackCooldown = true;
    this.swordYOffset = 2;
    this.gameScene.audio.playSFX('sfx_attack');

    this.gameScene.enemies.getChildren().forEach(e => {
      (e as unknown as { hitThisSwing: boolean }).hitThisSwing = false;
    });

    const startAngle = this.facingRight ? -105 : 105;
    const endAngle   = this.facingRight ?   35 : -35;
    const idleAngle  = this.facingRight ? -SWORD_IDLE_ANGLE : SWORD_IDLE_ANGLE;

    this.attackTweening = true;
    this.attackCooldownStart = this.scene.time.now;

    this.scene.tweens.killTweensOf(this.bodyGraphic);
    this.scene.tweens.add({
      targets: this.bodyGraphic,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 75,
      yoyo: true,
      ease: 'Sine.easeOut',
    });

    this.scene.tweens.killTweensOf(this.swordGraphic);
    this.swordGraphic.setAngle(startAngle);
    this.scene.tweens.add({
      targets: this.swordGraphic,
      angle: endAngle,
      duration: PLAYER_ATTACK_DURATION_MS,
      ease: 'Power3.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.swordGraphic,
          angle: idleAngle,
          duration: 180,
          ease: 'Sine.easeOut',
          onComplete: () => { this.attackTweening = false; },
        });
      },
    });

    this.swingGraphic.setPosition(this.x, this.y);
    this.drawSwing();

    this.scene.time.delayedCall(PLAYER_ATTACK_DURATION_MS, () => {
      this.isAttacking = false;
      this.swingGraphic.clear();
    });

    const cooldownMs = this.getCooldownMs();
    this.scene.time.delayedCall(cooldownMs, () => {
      this.attackCooldown = false;
      this.swordYOffset = 0;
      this.swordGraphic.setScale(1, 0.9);
      this.scene.tweens.add({
        targets: this.swordGraphic,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
      this.ringFlashAlpha = 1;
    });
  }

  private drawCooldownRing(): void {
    const g = this.cooldownGraphic;
    g.clear();

    const rx = this.x;
    const ry = this.y + 22;
    const radius = 26;
    const ringColor = this.upgradeState.cooldownMult < 1 ? 0x3b82f6 : 0x06b6d4;

    // Background ring (always visible)
    g.lineStyle(4, 0x334155, 0.4);
    g.strokeCircle(rx, ry, radius);

    // Progress arc (fills clockwise from top as cooldown progresses)
    if (this.attackCooldown) {
      const elapsed = this.scene.time.now - this.attackCooldownStart;
      const progress = Math.min(1, elapsed / this.getCooldownMs());
      g.lineStyle(4, ringColor, 0.9);
      g.beginPath();
      g.arc(rx, ry, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
      g.strokePath();
    }

    // Flash white when attack becomes ready
    if (this.ringFlashAlpha > 0) {
      g.lineStyle(4, 0xffffff, this.ringFlashAlpha);
      g.strokeCircle(rx, ry, radius);
    }

    // Premature click pulse
    if (this.ringPulseAlpha > 0) {
      g.lineStyle(4, 0xffffff, this.ringPulseAlpha * 0.4);
      g.strokeCircle(rx, ry, radius);
    }
  }

  private triggerPrematureFeedback(): void {
    const now = this.scene.time.now;
    if (now - this.prematureFeedbackTimer < 200) return;
    this.prematureFeedbackTimer = now;

    this.gameScene.audio.playSFX('sfx_attack', { volume: 0.08 });
    this.swordTwitchTimer = 100;
    this.ringPulseAlpha = 1;
  }

  takeDamage(amount: number): void {
    if (this.invincible || this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invincible = true;
    this.gameScene.audio.playSFX('sfx_player_hurt');
    this.gameScene.cameras.main.shake(200, 0.01);
    this.gameScene.triggerDamageFlash();
    this.scene.time.delayedCall(PLAYER_INVINCIBILITY_MS, () => {
      this.invincible = false;
    });
  }

  destroy(fromScene?: boolean): void {
    this.bodyGraphic?.destroy();
    this.swordGraphic?.destroy();
    this.swingGraphic?.destroy();
    this.cooldownGraphic?.destroy();
    super.destroy(fromScene);
  }
}
