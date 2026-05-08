import Phaser from 'phaser';

export interface RewardedAdConfig {
  rewardLabel: string;
  size?: 'large' | 'medium' | 'small';
  onAdRequest: () => Promise<boolean>;
  onSuccess?: () => void;
  onFail?: () => void;
  subtitle?: string;
  /** Pulse scale multiplier (default 1.03). Pass 1.02 for a subtler shop-context pulse. */
  pulseScale?: number;
  /** Pulse loop duration ms (default 1100). Pass 2000 for a slower, less attention-grabbing pulse. */
  pulseDuration?: number;
}

const SIZES = {
  large:  { w: 480, h: 100 },
  medium: { w: 360, h: 80 },
  small:  { w: 210, h: 50 },
};

const BG_TOP   = 0xfb923c;
const BG_BOT   = 0xc2410c;
const BORDER   = 0xfde047;
const ICON_BG  = 0x1e1b4b;
const ICON_TRI = 0xfde047;
const GLOW_C   = 0xfbbf24;

export class RewardedAdButton extends Phaser.GameObjects.Container {
  private pulseTween?: Phaser.Tweens.Tween;
  private glowObj!: Phaser.GameObjects.Graphics;
  private bgObj!: Phaser.GameObjects.Graphics;
  private subtitleTxt!: Phaser.GameObjects.Text;
  private rewardTxt!: Phaser.GameObjects.Text;
  private autoHideTimer?: Phaser.Time.TimerEvent;
  private used = false;
  private bw: number;
  private bh: number;
  private cfg: RewardedAdConfig;

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: RewardedAdConfig) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(9999).setAlpha(0).setScale(0.7);
    this.cfg = cfg;

    const sz = SIZES[cfg.size ?? 'large'];
    this.bw = sz.w;
    this.bh = sz.h;

    this.build();
  }

  private build(): void {
    const w = this.bw;
    const h = this.bh;
    const hw = w / 2;
    const hh = h / 2;

    // Glow halo (behind bg) — subtler for small/compact usage
    const glowAlpha = this.cfg.size === 'small' ? 0.2 : 0.35;
    this.glowObj = this.scene.add.graphics();
    this.glowObj.fillStyle(GLOW_C, glowAlpha);
    this.glowObj.fillRoundedRect(-hw - 10, -hh - 10, w + 20, h + 20, 14);
    this.add(this.glowObj);

    // Main background
    this.bgObj = this.scene.add.graphics();
    this.drawBg(hw, hh);
    this.add(this.bgObj);

    // Transparent interactive hit zone
    const hit = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0);
    hit.setInteractive({ useHandCursor: true });
    this.add(hit);

    // Video icon
    const iconPad = 14;
    const iconSize = Math.round(h * 0.56);
    const iconCx = -hw + iconPad + iconSize / 2;

    const iconBg = this.scene.add.graphics();
    iconBg.fillStyle(ICON_BG, 1);
    iconBg.fillRoundedRect(iconCx - iconSize / 2, -iconSize / 2, iconSize, iconSize, 5);
    this.add(iconBg);

    const triH = iconSize * 0.42;
    const triW = triH * 0.87;
    const triOffX = iconCx + triW * 0.12;
    const tri = this.scene.add.graphics();
    tri.fillStyle(ICON_TRI, 1);
    tri.fillTriangle(
      triOffX - triW / 2, -triH / 2,
      triOffX - triW / 2,  triH / 2,
      triOffX + triW / 2,  0,
    );
    this.add(tri);

    // Text block (right of icon)
    const textLeft = -hw + iconPad + iconSize + 14;
    const fs1 = h >= 90 ? 18 : h >= 75 ? 16 : 14;
    const fs2 = h >= 90 ? 24 : h >= 75 ? 20 : 17;
    const lineGap = fs1 * 0.6 + fs2 * 0.55;

    this.subtitleTxt = this.scene.add.text(textLeft, -lineGap * 0.55, this.cfg.subtitle ?? 'WATCH AD', {
      fontSize: `${fs1}px`,
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
    this.add(this.subtitleTxt);

    this.rewardTxt = this.scene.add.text(textLeft, lineGap * 0.7, this.cfg.rewardLabel, {
      fontSize: `${fs2}px`,
      fontFamily: 'Arial Black, Arial',
      color: '#fde047',
    }).setOrigin(0, 0.5);
    this.add(this.rewardTxt);

    // Pointer events
    hit.on('pointerover', () => {
      if (this.used) return;
      this.stopPulse();
      this.scene.tweens.add({ targets: this, scaleX: 1.06, scaleY: 1.06, duration: 80 });
    });
    hit.on('pointerout', () => {
      if (this.used) return;
      this.scene.tweens.add({
        targets: this, scaleX: 1, scaleY: 1, duration: 80,
        onComplete: () => this.startPulse(),
      });
    });
    hit.on('pointerdown', () => this.handleClick(hit, hw, hh));
  }

  private handleClick(hit: Phaser.GameObjects.Rectangle, hw: number, hh: number): void {
    if (this.used) return;
    this.used = true;
    hit.disableInteractive();
    this.stopPulse();
    this.autoHideTimer?.destroy();
    this.playSFX('sfx_button_click');

    this.scene.tweens.add({
      targets: this, scaleX: 0.94, scaleY: 0.94,
      duration: 80, yoyo: true, ease: 'Power2',
      onComplete: () => {
        this.subtitleTxt.setText('Loading...');
        this.rewardTxt.setText('');
        void this.cfg.onAdRequest().then(rewarded => {
          if (rewarded) this.showSuccess(hw, hh);
          else this.showFailure();
        });
      },
    });
  }

  private showSuccess(hw: number, hh: number): void {
    this.bgObj.clear();
    this.bgObj.fillStyle(0x16a34a, 1);
    this.bgObj.fillRoundedRect(-hw, -hh, this.bw, this.bh, 10);
    this.bgObj.lineStyle(4, 0x86efac, 1);
    this.bgObj.strokeRoundedRect(-hw, -hh, this.bw, this.bh, 10);

    this.glowObj.clear();
    this.glowObj.fillStyle(0x22c55e, 0.3);
    this.glowObj.fillRoundedRect(-hw - 10, -hh - 10, this.bw + 20, this.bh + 20, 14);

    this.subtitleTxt.setText('✓ REWARD COLLECTED').setColor('#ffffff');
    this.rewardTxt.setText(this.cfg.rewardLabel).setColor('#86efac');

    this.spawnParticles();
    this.playSFX('sfx_coin_pickup');
    this.scene.time.delayedCall(120, () => this.playSFX('sfx_coin_pickup'));
    this.scene.time.delayedCall(240, () => this.playSFX('sfx_coin_pickup'));

    this.scene.time.delayedCall(300, () => this.cfg.onSuccess?.());
    this.scene.time.delayedCall(2200, () => { if (this.active) this.hide(); });
  }

  private showFailure(): void {
    this.subtitleTxt.setText('AD UNAVAILABLE').setColor('#ff6666');
    this.rewardTxt.setText('Try again later');
    this.scene.time.delayedCall(2000, () => {
      this.cfg.onFail?.();
      if (this.active) this.hide();
    });
  }

  show(): void {
    this.autoHideTimer = this.scene.time.delayedCall(12000, () => {
      if (!this.used && this.active) {
        this.scene.tweens.add({ targets: this, alpha: 0.45, duration: 800 });
      }
    });

    this.scene.tweens.add({
      targets: this, alpha: 1, scaleX: 1.08, scaleY: 1.08,
      duration: 350, ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this, scaleX: 1, scaleY: 1,
          duration: 200, ease: 'Power2',
          onComplete: () => this.startPulse(),
        });
      },
    });

    this.playSFX('sfx_wave_complete');
  }

  hide(): void {
    this.stopPulse();
    this.autoHideTimer?.destroy();
    if (!this.active) return;
    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 200,
      onComplete: () => { if (this.active) this.destroy(); },
    });
  }

  private startPulse(): void {
    if (this.pulseTween || this.used) return;
    const ps = this.cfg.pulseScale ?? 1.03;
    const pd = this.cfg.pulseDuration ?? 1100;
    this.pulseTween = this.scene.tweens.add({
      targets: this, scaleX: ps, scaleY: ps,
      duration: pd, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  private stopPulse(): void {
    this.pulseTween?.stop();
    this.pulseTween = undefined;
  }

  private drawBg(hw: number, hh: number): void {
    this.bgObj.clear();
    this.bgObj.fillGradientStyle(BG_TOP, BG_TOP, BG_BOT, BG_BOT, 1);
    this.bgObj.fillRoundedRect(-hw, -hh, this.bw, this.bh, 10);
    this.bgObj.lineStyle(4, BORDER, 1);
    this.bgObj.strokeRoundedRect(-hw, -hh, this.bw, this.bh, 10);
  }

  private spawnParticles(): void {
    const palette = [0xfde047, 0xfbbf24, 0xffd700, 0xffffff];
    for (let i = 0; i < 10; i++) {
      const px = this.x + Phaser.Math.Between(-this.bw / 2, this.bw / 2);
      const py = this.y + Phaser.Math.Between(-this.bh / 2, this.bh / 2);
      const p = this.scene.add.rectangle(px, py, 6, 6, palette[i % 4]).setDepth(10000);
      this.scene.tweens.add({
        targets: p,
        x: px + Phaser.Math.Between(-70, 70),
        y: py + Phaser.Math.Between(-90, -20),
        alpha: 0, scaleX: 0, scaleY: 0,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  private playSFX(key: string): void {
    if (!this.scene?.cache?.audio?.exists(key)) return;
    try { this.scene.sound.play(key, { volume: 0.6 }); } catch { /* ignore */ }
  }
}
