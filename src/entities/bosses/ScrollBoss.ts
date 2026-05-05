import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { Boss } from './Boss';
import { Projectile } from '../Projectile';
import { SpamEmail } from '../enemies/SpamEmail';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';

interface ScrollBand {
  warning: Phaser.GameObjects.Rectangle | null;
  band: Phaser.GameObjects.Rectangle | null;
}

const POST_COLORS = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6];
const POST_LABELS = ['POST', 'AD', 'VIDEO', 'SHARE', 'LIKE'];

export class ScrollBoss extends Boss {
  static readonly NAME = 'ETERNAL SCROLL';

  private shootTimer = 0;
  private bandTimer = 0;
  private trackerTimer = 0;
  private bandFromTop = true;
  private activeBand: ScrollBand = { warning: null, band: null };

  // Visual segments that fade as HP drops in phase 1
  private postSegments: Phaser.GameObjects.Container[] = [];

  constructor(scene: GameScene, x: number, y: number, hp: number, waveNumber: number) {
    super(scene, x, y, hp, 35, 22, 85, 25, waveNumber);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(110, 140);
    this.shootTimer = scene.time.now + 3000;
  }

  getBossName(): string { return ScrollBoss.NAME; }
  getPhaseThresholds(): number[] { return [0.70, 0.35]; }
  protected getDeathLines(): string {
    return 'FEED CLOSED\nYou have been online for 8 hours.';
  }
  protected getGearDrop(): number { return 12; }

  protected buildBody(): void {
    // Core post stack (5 stacked segments in a slight spiral)
    const segments: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < 5; i++) {
      const offsetX = (i - 2) * 6;
      const offsetY = -60 + i * 28;
      const postCont = this.scene.add.container(offsetX, offsetY);

      const bg = this.scene.add.rectangle(0, 0, 100, 24, POST_COLORS[i], 0.85);
      bg.setStrokeStyle(1, 0xffffff, 0.3);
      const lbl = this.scene.add.text(0, 0, POST_LABELS[i], {
        fontSize: '11px', fontFamily: 'Arial Black, Arial', color: '#ffffff',
      }).setOrigin(0.5);

      postCont.add([bg, lbl]);
      segments.push(postCont);
    }

    // Core (only visible after phase 1)
    const core = this.scene.add.rectangle(0, 0, 30, 30, 0x8800aa);
    core.setStrokeStyle(2, 0xcc00ff);
    core.setAlpha(0);

    this.bodyContainer.add([...segments, core]);

    this.scene.tweens.add({
      targets: this.bodyContainer, angle: 360, duration: 5000, repeat: -1, ease: 'Linear',
    });

    // Store references for fading in phase 1
    this.postSegments = segments;

    // Fade core in at phase 2 — handled via onPhaseChange
  }

  protected getBodyWidth(): number { return 110; }
  protected getBodyHeight(): number { return 140; }

  // ── Movement: lazy horizontal drift ─────────────────────────────────────────

  protected moveTowardPlayer(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const time = this.scene.time.now / 1000;
    const targetX = GAME_WIDTH / 2 + Math.sin(time * 0.4) * 280;
    const targetY = this.phase === 1 ? 200 : this.phase === 2 ? 190 : 180;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const s = this.speed * 0.6;
    body.setVelocity((dx / dist) * s, (dy / dist) * s);
  }

  // ── Boss update ─────────────────────────────────────────────────────────────

  protected bossUpdate(): void {
    const now = this.scene.time.now;

    // Fade segments proportionally to HP loss in phase 1
    if (this.phase === 1) {
      const pct = this.hp / this.maxHp;
      // Segments fade from last (index 4) to first as HP drops from 100%→70%
      const phase1Range = 0.30; // 100%→70%
      const fadePct = Math.max(0, (pct - 0.70) / phase1Range);
      this.postSegments.forEach((seg, i) => {
        const threshold = (5 - i) / 5;
        seg.setAlpha(fadePct < threshold ? Math.max(0, fadePct / threshold) : 1);
      });
    }

    if (now > this.shootTimer) {
      this.shoot();
      this.shootTimer = now + (this.phase === 3 ? 1000 : this.phase === 2 ? 3000 : 2500);
    }

    if (this.phase >= 2 && now > this.bandTimer) {
      const interval = this.phase === 3 ? 6000 : 8000;
      this.bandTimer = now + interval;
      this.spawnScrollBand(this.bandFromTop);
      if (this.phase === 3) this.bandFromTop = !this.bandFromTop;
    }

    if (this.phase === 3 && now > this.trackerTimer) {
      this.trackerTimer = now + 4000;
      this.spawnTrackers();
    }

    // Damage player from active band (player invincibility frames naturally limit this)
    if (this.activeBand.band?.active) {
      const bandY = this.activeBand.band.y;
      const player = this.gameScene.player;
      if (Math.abs(player.y - bandY) < 25) {
        player.takeDamage(18);
      }
    }
  }

  protected onPhaseChange(phase: number): void {
    if (phase === 2) {
      // Fade out all post segments, reveal core
      this.postSegments.forEach(s => {
        this.scene.tweens.add({ targets: s, alpha: 0, duration: 600 });
      });
      // Reveal core rectangle (last child)
      const core = this.bodyContainer.list[this.bodyContainer.list.length - 1] as Phaser.GameObjects.Rectangle;
      this.scene.tweens.add({ targets: core, alpha: 1, duration: 500 });

      this.bandTimer = this.scene.time.now + 2000;
    } else if (phase === 3) {
      this.trackerTimer = this.scene.time.now + 2000;
      this.bandTimer = this.scene.time.now + 1500;
    }
  }

  // ── Shooting ────────────────────────────────────────────────────────────────

  private shoot(): void {
    const player = this.gameScene.player;
    const base = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);

    if (this.phase === 3) {
      // 3-way spread
      for (let i = -1; i <= 1; i++) {
        new Projectile(this.gameScene, this.x, this.y, base + i * 0.32, 190, 18);
      }
    } else {
      // Single homing shot
      new Projectile(this.gameScene, this.x, this.y, base, 160, 18);
    }
    this.gameScene.audio.playSFX('shoot');
  }

  // ── Scrolling hazard band ────────────────────────────────────────────────────

  private spawnScrollBand(fromTop: boolean): void {
    const startY = fromTop ? -20 : GAME_HEIGHT + 20;
    const endY = fromTop ? GAME_HEIGHT + 20 : -20;

    // Warn with a tinted line at destination side
    const warnY = fromTop ? 0 : GAME_HEIGHT;
    const warnBand = this.scene.add.rectangle(GAME_WIDTH / 2, warnY, GAME_WIDTH, 40, 0xff2200, 0.18)
      .setDepth(25);
    this.activeBand.warning = warnBand;

    const warnTxt = this.scene.add.text(GAME_WIDTH / 2, warnY, '▼ SCROLL WAVE ▼', {
      fontSize: '18px', fontFamily: 'Arial Black, Arial',
      color: '#ff4400', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(26);

    this.scene.time.delayedCall(1000, () => {
      warnBand.destroy();
      warnTxt.destroy();
      if (!this.active) return;

      const band = this.scene.add.rectangle(GAME_WIDTH / 2, startY, GAME_WIDTH, 42, 0xff2200, 0.35)
        .setDepth(25);
      this.activeBand.band = band;

      this.scene.tweens.add({
        targets: band, y: endY, duration: 3000, ease: 'Linear',
        onComplete: () => { band.destroy(); this.activeBand.band = null; },
      });
    });
  }

  // ── Tracker minions (Phase 3) ────────────────────────────────────────────────

  private spawnTrackers(): void {
    for (let i = 0; i < 2; i++) {
      const x = Phaser.Math.Between(60, GAME_WIDTH - 60);
      const y = Phaser.Math.Between(100, this.gameScene.groundTop - 60);
      // SpamEmail works as a fast tracker
      this.spawnMinion(new SpamEmail(this.gameScene, x, y, { speed: 1.6 }));
    }
  }

  protected die(): void {
    // Clean up active band
    this.activeBand.warning?.destroy();
    this.activeBand.band?.destroy();
    super.die();
  }
}
