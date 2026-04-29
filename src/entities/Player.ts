import Phaser from 'phaser';
import {
  PLAYER_HP, PLAYER_SPEED, PLAYER_MELEE_DAMAGE,
  PLAYER_INVINCIBILITY_MS, PLAYER_ATTACK_DURATION_MS,
  GAME_WIDTH, COLORS,
} from '../config';
import { InputManager } from '../systems/InputManager';
import { GameScene } from '../scenes/GameScene';

const SWORD_IDLE_ANGLE = -20;

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

    g.fillStyle(0xffffff, 0.18);
    g.slice(0, 0, 90, start, end, false);
    g.fillPath();

    g.lineStyle(2, 0xffffff, 0.5);
    g.beginPath();
    g.arc(0, 0, 90, start, end, false);
    g.strokePath();
  }

  update(input: InputManager): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    let vx = 0;

    if (input.left) {
      vx = -PLAYER_SPEED;
      this.facingRight = false;
    } else if (input.right) {
      vx = PLAYER_SPEED;
      this.facingRight = true;
    }

    // Vertical movement + ground clamp
    let vy = 0;
    if (input.up) vy = -PLAYER_SPEED;
    else if (input.down) vy = PLAYER_SPEED;

    body.setVelocity(vx, vy);

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

    // Body graphic
    this.bodyGraphic.setPosition(this.x, this.y);
    this.drawBody();

    // Sword graphic — positioned at hand, mirrored when facing left
    const handX = this.facingRight ? 16 : -16;
    this.swordGraphic.setPosition(this.x + handX, this.y + 2);
    this.swordGraphic.setScale(this.facingRight ? 1 : -1, 1);
    this.drawSword();

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

    // Raise sword to wind-up position, then slash forward
    this.swordGraphic.setAngle(-105);
    this.scene.tweens.killTweensOf(this.swordGraphic);
    this.scene.tweens.add({
      targets: this.swordGraphic,
      angle: 35,
      duration: PLAYER_ATTACK_DURATION_MS,
      ease: 'Power3.easeOut',
      onComplete: () => {
        // Return to idle
        this.scene.tweens.add({
          targets: this.swordGraphic,
          angle: SWORD_IDLE_ANGLE,
          duration: 180,
          ease: 'Sine.easeOut',
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
    super.destroy(fromScene);
  }
}
