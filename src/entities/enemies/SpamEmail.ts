import { GameScene } from '../../scenes/GameScene';
import { Enemy, EnemyMultipliers } from './Enemy';

export class SpamEmail extends Enemy {
  private static readonly W = 44;
  private static readonly H = 32;

  constructor(scene: GameScene, x: number, y: number, mult?: EnemyMultipliers) {
    super(scene, x, y, 15, 120, 8, 22, 1, 0, mult);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(SpamEmail.W, SpamEmail.H);
  }

  protected buildBody(): void {
    const rect = this.scene.add.rectangle(0, 0, SpamEmail.W, SpamEmail.H, 0xf0f0f0);
    rect.setStrokeStyle(1, 0xaaaaaa);

    const at = this.scene.add.text(0, -1, '@', {
      fontSize: '18px',
      fontFamily: 'Arial Black',
      color: '#cc0000',
    }).setOrigin(0.5);

    this.bodyContainer.add([rect, at]);
  }

  protected getBodyWidth(): number { return SpamEmail.W; }
  protected getBodyHeight(): number { return SpamEmail.H; }
}
