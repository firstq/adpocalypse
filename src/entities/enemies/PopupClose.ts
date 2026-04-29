import { GameScene } from '../../scenes/GameScene';
import { Enemy } from './Enemy';

export class PopupClose extends Enemy {
  private static readonly W = 60;
  private static readonly H = 60;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y, 20, 85, 12, 30, 1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PopupClose.W, PopupClose.H);
  }

  protected buildBody(): void {
    const rect = this.scene.add.rectangle(0, 0, PopupClose.W, PopupClose.H, 0xe74c3c);
    rect.setStrokeStyle(2, 0xc0392b);

    const closeText = this.scene.add.text(0, 0, '✕', {
      fontSize: '28px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
    }).setOrigin(0.5);

    const label = this.scene.add.text(0, 22, 'CLOSE', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#ffcccc',
    }).setOrigin(0.5);

    this.bodyContainer.add([rect, closeText, label]);
  }

  protected getBodyWidth(): number { return PopupClose.W; }
  protected getBodyHeight(): number { return PopupClose.H; }
}
