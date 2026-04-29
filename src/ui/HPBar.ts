import Phaser from 'phaser';

export class HPBar {
  private bg: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private readonly width: number;
  private readonly height: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: number,
    bgColor: number,
  ) {
    this.width = width;
    this.height = height;

    this.bg = scene.add.rectangle(x, y, width, height, bgColor).setOrigin(0, 0).setDepth(50);
    this.fill = scene.add.rectangle(x, y, width, height, fillColor).setOrigin(0, 0).setDepth(51);
  }

  setValue(current: number, max: number): void {
    const pct = Phaser.Math.Clamp(current / max, 0, 1);
    this.fill.setSize(this.width * pct, this.height);
    if (pct > 0.5) {
      this.fill.setFillStyle(0x2ecc71);
    } else if (pct > 0.25) {
      this.fill.setFillStyle(0xf39c12);
    } else {
      this.fill.setFillStyle(0xe74c3c);
    }
  }

  destroy(): void {
    this.bg.destroy();
    this.fill.destroy();
  }
}
