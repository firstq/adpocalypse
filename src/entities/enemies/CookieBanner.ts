import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { Enemy } from './Enemy';

export class CookieBanner extends Enemy {
  private static readonly W = 220;
  private static readonly H = 55;

  constructor(scene: GameScene, x: number, y: number) {
    // Moves horizontally along ground, pushes player
    super(scene, x, y, 50, 60, 20, 110, 2, 350);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(CookieBanner.W, CookieBanner.H);
  }

  protected buildBody(): void {
    const rect = this.scene.add.rectangle(0, 0, CookieBanner.W, CookieBanner.H, 0xf39c12);
    rect.setStrokeStyle(2, 0xe67e22);

    const icon = this.scene.add.text(-80, 0, '🍪', {
      fontSize: '22px',
    }).setOrigin(0.5);

    const text = this.scene.add.text(10, -8, 'This site uses cookies', {
      fontSize: '13px',
      fontFamily: 'Arial',
      color: '#000000',
    }).setOrigin(0.5);

    const btn = this.scene.add.text(10, 10, '[ ACCEPT ALL ]', {
      fontSize: '11px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      backgroundColor: '#c0392b',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    this.bodyContainer.add([rect, icon, text, btn]);
  }

  protected moveTowardPlayer(): void {
    const player = this.gameScene.player;
    const dx = player.x - this.x;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(dx > 0 ? this.speed : -this.speed);
    // Pin to ground row, no vertical physics
    this.y = this.gameScene.groundTop - CookieBanner.H / 2;
    body.setVelocityY(0);
  }

  protected getBodyWidth(): number { return CookieBanner.W; }
  protected getBodyHeight(): number { return CookieBanner.H; }
}
