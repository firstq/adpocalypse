import Phaser from 'phaser';
import { type GameScene } from '../scenes/GameScene';
import { COIN_VALUE, COLORS } from '../config';

export class Coin extends Phaser.Physics.Arcade.Sprite {
  readonly value: number = COIN_VALUE;
  private graphic!: Phaser.GameObjects.Container;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.coins.add(this);

    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 20);
    body.setCollideWorldBounds(true);
    body.setVelocity(Phaser.Math.Between(-60, 60), Phaser.Math.Between(-120, -60));
    body.setGravityY(300);

    const circle = scene.add.circle(0, 0, 10, COLORS.coin);
    const inner = scene.add.circle(0, 0, 6, 0xffa500);
    const text = scene.add.text(0, 0, '$', {
      fontSize: '10px',
      fontFamily: 'Arial Black',
      color: '#8B6914',
    }).setOrigin(0.5);

    this.graphic = scene.add.container(x, y, [circle, inner, text]);
    this.graphic.setDepth(3);
    this.graphic.setScale(0);

    // Pop: 0 → 1.2 → 1.0, then idle pulse
    scene.tweens.add({
      targets: this.graphic,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 120,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: this.graphic,
          scaleX: 1,
          scaleY: 1,
          duration: 80,
          ease: 'Sine.easeOut',
          onComplete: () => {
            scene.tweens.add({
              targets: this.graphic,
              scaleX: 1.2,
              scaleY: 1.2,
              duration: 400,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
          },
        });
      },
    });
  }

  update(): void {
    // Clamp to ground so coins don't fall through the floor
    const groundTop = (this.scene as GameScene).groundTop;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.y >= groundTop) {
      this.y = groundTop;
      body.setVelocityY(0);
    }
    this.graphic.setPosition(this.x, this.y);
  }

  destroy(fromScene?: boolean): void {
    this.graphic?.destroy();
    super.destroy(fromScene);
  }
}
