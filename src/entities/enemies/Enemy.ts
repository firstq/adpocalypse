import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { Coin } from '../Coin';
import { Gear } from '../Gear';
import { MetaProgress } from '../../systems/MetaProgress';

export interface EnemyMultipliers {
  hp?: number;
  speed?: number;
  damage?: number;
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  readonly maxHp: number;
  readonly speed: number;
  readonly contactDamage: number;
  readonly contactRadius: number;
  readonly coinDrop: number;
  readonly knockback: number;
  hitThisSwing: boolean = false;

  protected gameScene: GameScene;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  protected bodyContainer!: Phaser.GameObjects.Container;
  private flashOverlay!: Phaser.GameObjects.Rectangle;
  private dying = false;

  constructor(
    scene: GameScene,
    x: number,
    y: number,
    hp: number,
    speed: number,
    contactDamage: number,
    contactRadius: number,
    coinDrop: number,
    knockback = 0,
    mult: EnemyMultipliers = {},
  ) {
    super(scene, x, y, '');
    this.gameScene = scene;

    const hm = mult.hp ?? 1;
    const sm = mult.speed ?? 1;
    const dm = mult.damage ?? 1;

    this.hp = Math.round(hp * hm);
    this.maxHp = this.hp;
    this.speed = speed * sm;
    this.contactDamage = Math.round(contactDamage * dm);
    this.contactRadius = contactRadius;
    this.coinDrop = coinDrop;
    this.knockback = knockback;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.enemies.add(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    this.setVisible(false);
    this.bodyContainer = scene.add.container(x, y);
    this.bodyContainer.setDepth(4);

    this.buildBody();

    this.flashOverlay = this.scene.add.rectangle(0, 0, this.getBodyWidth(), this.getBodyHeight(), 0xffffff);
    this.flashOverlay.setAlpha(0);
    this.bodyContainer.add(this.flashOverlay);

    this.buildHPBar();
  }

  protected abstract buildBody(): void;
  protected abstract getBodyWidth(): number;
  protected abstract getBodyHeight(): number;

  private buildHPBar(): void {
    const w = this.getBodyWidth();
    const barW = Math.max(w, 40);
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - this.getBodyHeight() / 2 - 14, barW, 6, 0x555555).setDepth(10);
    this.hpBarFill = this.scene.add.rectangle(this.x, this.y - this.getBodyHeight() / 2 - 14, barW, 6, 0x2ecc71).setDepth(11);
    this.hpBarFill.setOrigin(0.5, 0.5);
  }

  private updateHPBar(): void {
    const bw = Math.max(this.getBodyWidth(), 40);
    const pct = this.hp / this.maxHp;
    const barX = this.x;
    const barY = this.y - this.getBodyHeight() / 2 - 14;
    this.hpBarBg.setPosition(barX, barY);
    this.hpBarFill.setPosition(barX - bw * (1 - pct) / 2, barY);
    this.hpBarFill.setSize(bw * pct, 6);
    const color = pct > 0.5 ? 0x2ecc71 : pct > 0.25 ? 0xf39c12 : 0xe74c3c;
    this.hpBarFill.setFillStyle(color);
  }

  update(): void {
    if (!this.active || this.dying) return;
    this.moveTowardPlayer();
    this.bodyContainer.setPosition(this.x, this.y);
    this.updateHPBar();
  }

  protected moveTowardPlayer(): void {
    const player = this.gameScene.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
  }

  takeDamage(amount: number): void {
    if (this.dying) return;
    this.hp = Math.max(0, this.hp - amount);
    this.flashWhite();
    if (this.hp <= 0) {
      this.die();
    }
  }

  flashWhite(): void {
    this.scene.tweens.killTweensOf(this.flashOverlay);
    this.flashOverlay.setAlpha(0.9);
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 60,
      ease: 'Linear',
    });
  }

  applyHitKnockback(fromX: number, fromY: number, force: number): void {
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.x += (dx / len) * force;
    this.y += (dy / len) * force;
  }

  protected getGearDrop(): number { return 0; }

  protected die(): void {
    if (this.dying) return;
    this.dying = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    for (let i = 0; i < this.coinDrop; i++) {
      const ox = Phaser.Math.Between(-20, 20);
      const oy = Phaser.Math.Between(-20, 20);
      new Coin(this.gameScene, this.x + ox, this.y + oy);
    }

    const bossGears = this.getGearDrop();
    if (bossGears > 0) {
      for (let i = 0; i < bossGears; i++) {
        new Gear(this.gameScene, this.x + Phaser.Math.Between(-35, 35), this.y + Phaser.Math.Between(-20, 20));
      }
    } else {
      const chance = 0.05 + MetaProgress.getUpgradeLevel('gear_chance') * 0.005;
      if (Math.random() < chance) {
        new Gear(this.gameScene, this.x, this.y);
      }
    }

    this.scene.tweens.add({
      targets: this.bodyContainer,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.hpBarBg.destroy();
        this.hpBarFill.destroy();
        this.bodyContainer.destroy();
        this.destroy();
        this.gameScene.onEnemyDied();
      },
    });

    this.gameScene.triggerDeathSlowmo();

    const count = Phaser.Math.Between(8, 12);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const dist = Phaser.Math.Between(40, 90);
      const size = Phaser.Math.Between(6, 12);
      const particle = this.scene.add.rectangle(
        this.x, this.y, size, size, 0xffd700,
      ).setDepth(20);
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    this.gameScene.audio.playSFX('enemyDie');
  }

  destroy(fromScene?: boolean): void {
    if (!this.dying) {
      this.hpBarBg?.destroy();
      this.hpBarFill?.destroy();
      this.bodyContainer?.destroy();
    }
    super.destroy(fromScene);
  }
}
