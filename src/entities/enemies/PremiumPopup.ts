import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { Enemy } from './Enemy';
import { Projectile } from '../Projectile';

export class PremiumPopup extends Enemy {
  private static readonly W = 140;
  private static readonly H = 120;
  private shootTimer = 0;
  private readonly SHOOT_INTERVAL = 1200;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 120, 40, 25, 70, 3);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PremiumPopup.W, PremiumPopup.H);
    this.shootTimer = scene.time.now + 1000;
  }

  protected buildBody(): void {
    const rect = this.scene.add.rectangle(0, 0, PremiumPopup.W, PremiumPopup.H, 0xf1c40f);
    rect.setStrokeStyle(3, 0xd4ac0d);

    const glow = this.scene.add.rectangle(0, 0, PremiumPopup.W + 6, PremiumPopup.H + 6, 0xffd700, 0.3);

    const star = this.scene.add.text(0, -38, '★ PREMIUM ★', {
      fontSize: '14px',
      fontFamily: 'Arial Black, Arial',
      color: '#8B0000',
    }).setOrigin(0.5);

    const title = this.scene.add.text(0, -10, 'You WON', {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#000000',
    }).setOrigin(0.5);

    const sub = this.scene.add.text(0, 16, 'an iPhone! 🎉', {
      fontSize: '15px',
      fontFamily: 'Arial',
      color: '#000000',
    }).setOrigin(0.5);

    const btn = this.scene.add.text(0, 44, '[ CLAIM NOW! ]', {
      fontSize: '12px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      backgroundColor: '#e74c3c',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5);

    this.bodyContainer.add([glow, rect, star, title, sub, btn]);

    // Pulsing animation
    this.scene.tweens.add({
      targets: this.bodyContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
    const player = this.gameScene.player;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    new Projectile(this.gameScene, this.x, this.y, angle, 240, 18);
    this.gameScene.audio.playSFX('shoot');
  }

  protected getBodyWidth(): number { return PremiumPopup.W; }
  protected getBodyHeight(): number { return PremiumPopup.H; }
}
