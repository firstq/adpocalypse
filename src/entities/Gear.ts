import Phaser from 'phaser';
import { type GameScene } from '../scenes/GameScene';

export class Gear extends Phaser.Physics.Arcade.Sprite {
  private graphic!: Phaser.GameObjects.Container;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    scene.gears.add(this);

    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(18, 18);
    body.setCollideWorldBounds(true);
    body.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-140, -70));
    body.setGravityY(280);

    const outer = scene.add.circle(0, 0, 9, 0x999999);
    const inner = scene.add.circle(0, 0, 5, 0x555566);
    const icon = scene.add.text(0, 0, '⚙', {
      fontSize: '9px',
      fontFamily: 'Arial',
      color: '#ccccdd',
    }).setOrigin(0.5);

    this.graphic = scene.add.container(x, y, [outer, inner, icon]);
    this.graphic.setDepth(3);
    this.graphic.setScale(0);

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
              angle: 360,
              duration: 2400,
              repeat: -1,
              ease: 'Linear',
            });
            scene.tweens.add({
              targets: this.graphic,
              scaleX: 1.18,
              scaleY: 1.18,
              duration: 700,
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
