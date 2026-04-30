import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { Enemy, EnemyMultipliers } from './Enemy';
import { Projectile } from '../Projectile';

export class AutoplayVideo extends Enemy {
  private static readonly W = 160;
  private static readonly H = 110;
  private shootTimer = 0;
  private readonly SHOOT_INTERVAL = 1500;

  constructor(scene: GameScene, x: number, y: number, mult?: EnemyMultipliers) {
    // speed=0 — stationary
    super(scene, x, y, 60, 0, 10, 80, 2, 0, mult);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(AutoplayVideo.W, AutoplayVideo.H);
    this.shootTimer = scene.time.now + 1200;
  }

  protected buildBody(): void {
    const rect = this.scene.add.rectangle(0, 0, AutoplayVideo.W, AutoplayVideo.H, 0x1a1a4e);
    rect.setStrokeStyle(2, 0x2980b9);

    const screen = this.scene.add.rectangle(0, -12, AutoplayVideo.W - 12, 68, 0x000030);

    const play = this.scene.add.text(0, -12, '▶', {
      fontSize: '30px',
      color: '#ff0000',
    }).setOrigin(0.5);

    // Progress bar
    const barBg = this.scene.add.rectangle(0, 36, AutoplayVideo.W - 20, 5, 0x333333);
    const barFill = this.scene.add.rectangle(-(AutoplayVideo.W - 20) / 2, 36, (AutoplayVideo.W - 20) * 0.65, 5, 0xff0000);
    barFill.setOrigin(0, 0.5);

    const label = this.scene.add.text(0, 47, 'AUTOPLAY ON', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5);

    this.bodyContainer.add([rect, screen, play, barBg, barFill, label]);
  }

  update(): void {
    super.update();
    if (!this.active) return;
    if (this.scene.time.now >= this.shootTimer) {
      this.shoot();
      this.shootTimer = this.scene.time.now + this.SHOOT_INTERVAL;
    }
  }

  private shoot(): void {
    const cardinalAngles = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2];
    cardinalAngles.forEach(angle => {
      new Projectile(this.gameScene, this.x, this.y, angle, 160, 12);
    });
    this.gameScene.audio.playSFX('shoot');
  }

  protected getBodyWidth(): number { return AutoplayVideo.W; }
  protected getBodyHeight(): number { return AutoplayVideo.H; }
}
