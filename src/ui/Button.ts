import Phaser from 'phaser';

export class Button {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onClick: () => void,
    color = 0x4ecdc4,
  ) {
    this.bg = scene.add.rectangle(x, y, width, height, color)
      .setInteractive({ useHandCursor: true })
      .setDepth(10)
      .setStrokeStyle(2, 0xffffff);

    this.label = scene.add.text(x, y, text, {
      fontSize: '22px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);

    this.bg.on('pointerover', () => {
      this.bg.setFillStyle(0xffffff);
      this.label.setColor('#000000');
    });
    this.bg.on('pointerout', () => {
      this.bg.setFillStyle(color);
      this.label.setColor('#ffffff');
    });
    this.bg.on('pointerdown', () => {
      if (scene.cache.audio.exists('sfx_button_click')) {
        scene.sound.play('sfx_button_click', { volume: 0.6 });
      }
      onClick();
    });
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }
}
