import Phaser from 'phaser';

export class BossHPBar {
  private bg: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private markers: Phaser.GameObjects.Rectangle[] = [];
  private nameText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private readonly barW: number;

  // Positioned below the wave/enemy-bar row, clear of left-column HUD
  private static readonly BAR_X = 220;
  private static readonly BAR_Y = 80;
  private static readonly BAR_W = 840;
  private static readonly BAR_H = 12;

  constructor(scene: Phaser.Scene, bossName: string, phaseThresholds: number[]) {
    const { BAR_X, BAR_Y, BAR_W, BAR_H } = BossHPBar;
    this.barW = BAR_W;
    const cx = BAR_X + BAR_W / 2;
    const depth = 80;

    this.bg = scene.add.rectangle(cx, BAR_Y, BAR_W, BAR_H, 0x0a0a0a)
      .setStrokeStyle(1, 0x444444).setDepth(depth);

    this.fill = scene.add.rectangle(BAR_X, BAR_Y, BAR_W, BAR_H, 0xe74c3c)
      .setOrigin(0, 0.5).setDepth(depth + 1);

    phaseThresholds.forEach(t => {
      const mx = BAR_X + BAR_W * t;
      const m = scene.add.rectangle(mx, BAR_Y, 2, BAR_H + 6, 0xffffff, 0.55)
        .setDepth(depth + 2);
      this.markers.push(m);
    });

    this.nameText = scene.add.text(BAR_X, BAR_Y - 11, bossName, {
      fontSize: '13px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff8800',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(depth + 2);

    this.hpText = scene.add.text(BAR_X + BAR_W, BAR_Y - 11, '', {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(1, 0.5).setDepth(depth + 2);
  }

  update(hp: number, maxHp: number, phase: number, phaseCount: number): void {
    const pct = Math.max(0, Math.min(1, hp / maxHp));
    this.fill.setSize(this.barW * pct, BossHPBar.BAR_H);
    const color = pct > 0.5 ? 0xe74c3c : pct > 0.25 ? 0xe67e22 : 0xc0392b;
    this.fill.setFillStyle(color);
    this.hpText.setText(`${Math.max(0, Math.round(hp))}  [P${phase}/${phaseCount}]`);
  }

  destroy(): void {
    this.bg.destroy();
    this.fill.destroy();
    this.markers.forEach(m => m.destroy());
    this.nameText.destroy();
    this.hpText.destroy();
  }
}
