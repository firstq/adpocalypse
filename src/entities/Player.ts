import Phaser from 'phaser';
import {
  PLAYER_HP, PLAYER_SPEED, PLAYER_MELEE_DAMAGE,
  PLAYER_INVINCIBILITY_MS, PLAYER_ATTACK_DURATION_MS,
  GAME_WIDTH, COLORS,
} from '../config';
import { InputManager } from '../systems/InputManager';
import { GameScene } from '../scenes/GameScene';

const SWORD_IDLE_ANGLE = 20; // magnitude; sign depends on facing direction

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number = PLAYER_HP;
  readonly maxHp: number = PLAYER_HP;
  readonly meleeDamage: number = PLAYER_MELEE_DAMAGE;
  facingRight: boolean = true;
  isAttacking: boolean = false;

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
    this.swordGraphic.setAngle(SWORD_IDLE_ANGLE); // facing right initially

    this.cooldownGraphic = scene.add.graphics();
    this.cooldownGraphic.setDepth(4);

    this.swingGraphic = scene.add.graphics();
    this.swingGraphic.setDepth(6);

    // Sprite itself is invisible — we draw via Graphics
    this.setVisible(false);
  }

  private drawBody(): void {
    const g = this.bodyGraphic;
    g.clear();

    // Torso
    g.fillStyle(COLORS.player);
    g.fillRoundedRect(-14, -20, 28, 40, 5);

    // Head
    g.fillStyle(0xfce4b3);
    g.fillCircle(0, -32, 15);

    // Eyes
    g.fillStyle(0x1a1a2e);
    const eyeX = this.facingRight ? 5 : -5;
    g.fillCircle(eyeX, -34, 3);
    g.fillCircle(eyeX - (this.facingRight ? 6 : -6), -34, 2);

    // Legs
    g.fillStyle(0x2c3e50);
    g.fillRect(-13, 18, 10, 16);
    g.fillRect(3, 18, 10, 16);
  }

  // Sword drawn centered at grip point (crossguard at origin)
  private drawSword(): void {
    const g = this.swordGraphic;
    g.clear();
    g.fillStyle(0xbdc3c7);
    g.fillRect(-3, -30, 7, 28);  // blade (up from grip)
    g.fillStyle(0x7f8c8d);
    g.fillRect(-6, -4, 12, 5);   // crossguard
    g.fillStyle(0x8B4513);
    g.fillRect(-2, 1, 5, 10);    // handle (down from grip)
  }

  private drawSwing(): void {
    const g = this.swingGraphic;
    g.clear();
    g.setScale(this.facingRight ? 1 : -1, 1);

    const start = -Math.PI * 0.55;
    const end   =  Math.PI * 0.55;

    g.fillStyle(0xffffff, 0.3);
    g.slice(0, 0, 90, start, end, false);
    g.fillPath();

    g.lineStyle(4, 0xffffff, 0.9);
    g.beginPath();
    g.arc(0, 0, 90, start, end, false);
    g.strokePath();
  }

  update(input: InputManager): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const delta = this.scene.game.loop.delta;
    const lerpT = Math.min(1, delta / 50);

    let targetVx = 0;
    if (input.left) {
      targetVx = -PLAYER_SPEED;
      this.facingRight = false;
    } else if (input.right) {
      targetVx = PLAYER_SPEED;
      this.facingRight = true;
    }

    let targetVy = 0;
    if (input.up) targetVy = -PLAYER_SPEED;
    else if (input.down) targetVy = PLAYER_SPEED;

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

    if (input.attack && !this.attackCooldown) {
      this.performAttack();
    }

    // Body graphic — lean ±5° in movement direction
    const leanAngle = (this.currentVx / PLAYER_SPEED) * 5;
    this.bodyGraphic.setPosition(this.x, this.y);
    this.bodyGraphic.setAngle(leanAngle);
    this.drawBody();

    // Sword graphic — angle controls direction, no scale mirroring needed
    const handX = this.facingRight ? -16 : 16;
    this.swordGraphic.setPosition(this.x + handX, this.y + 2);
    if (!this.attackTweening) {
      this.swordGraphic.setAngle(this.facingRight ? -SWORD_IDLE_ANGLE : SWORD_IDLE_ANGLE);
    }
    this.drawSword();
    this.drawCooldownBar();

    // Swing arc tracks player
    this.swingGraphic.setPosition(this.x, this.y);

    // Faster, fully-invisible blink when invincible
    const visible = !this.invincible || (Math.floor(this.scene.time.now / 50) % 2 === 0);
    const alpha = visible ? 1 : 0;
    this.bodyGraphic.setAlpha(alpha);
    this.swordGraphic.setAlpha(alpha);
  }

  private performAttack(): void {
    if (this.attackCooldown) return;
    this.isAttacking = true;
    this.attackCooldown = true;

    // Clear hit flags
    this.gameScene.enemies.getChildren().forEach(e => {
      (e as unknown as { hitThisSwing: boolean }).hitThisSwing = false;
    });

    // Angles depend on facing direction
    const startAngle = this.facingRight ? -105 : 105;
    const endAngle   = this.facingRight ?   35 : -35;
    const idleAngle  = this.facingRight ? -SWORD_IDLE_ANGLE : SWORD_IDLE_ANGLE;

    this.attackTweening = true;
    this.attackCooldownStart = this.scene.time.now;

    // Scale punch on body
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

    this.scene.time.delayedCall(PLAYER_ATTACK_DURATION_MS + 100, () => {
      this.attackCooldown = false;
    });
  }

  private drawCooldownBar(): void {
    const g = this.cooldownGraphic;
    g.clear();
    if (!this.attackCooldown) return;

    const elapsed = this.scene.time.now - this.attackCooldownStart;
    const totalMs = PLAYER_ATTACK_DURATION_MS + 100;
    const progress = Math.min(1, elapsed / totalMs);
    const maxW = 28;
    const bx = this.x - maxW / 2;
    const by = this.y + 38;

    g.fillStyle(0x000000, 0.5);
    g.fillRect(bx, by, maxW, 3);
    g.fillStyle(0x4ecdc4, 1);
    g.fillRect(bx, by, maxW * progress, 3);
  }

  takeDamage(amount: number): void {
    if (this.invincible || this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invincible = true;
    this.gameScene.audio.playSFX('damage');
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
