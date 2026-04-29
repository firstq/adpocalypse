import Phaser from 'phaser';
import { GameScene } from '../scenes/GameScene';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  readonly damage: number;
  private graphic!: Phaser.GameObjects.Container;

  constructor(scene: GameScene, x: number, y: number, angle: number, speed: number, damage: number) {
    super(scene, x, y, '');
    this.damage = damage;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.projectiles.add(this);

    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 14);
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const envelope = scene.add.text(0, 0, '📧', { fontSize: '18px' }).setOrigin(0.5);
    this.graphic = scene.add.container(x, y, [envelope]);
    this.graphic.setDepth(8);
    this.graphic.setRotation(angle);
  }

  update(): void {
    this.graphic.setPosition(this.x, this.y);
  }

  destroy(fromScene?: boolean): void {
    this.graphic?.destroy();
    super.destroy(fromScene);
  }
}
