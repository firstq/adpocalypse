import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { Boss } from './Boss';
import { Projectile } from '../Projectile';
import { SpamEmail } from '../enemies/SpamEmail';
import { GAME_WIDTH } from '../../config';

export class SpamBoss extends Boss {
  static readonly NAME = 'EMAIL SPAMMER';

  private shootTimer = 0;
  private tentacleTimer = 0;
  private minionTimer = 0;
  private regenTimer = 0;

  // Side-to-side patrol
  private patrolDir = 1;
  private readonly patrolSpeed = 90;

  // Track envelope tentacle graphics (so we can tween them)
  private tentacleLines: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: GameScene, x: number, y: number, hp: number, waveNumber: number) {
    super(scene, x, y, hp, 40, 18, 72, 20, waveNumber);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(130, 100);
    this.shootTimer = scene.time.now + 3000;
    this.tentacleTimer = scene.time.now + 4500;
  }

  getBossName(): string { return SpamBoss.NAME; }
  getPhaseThresholds(): number[] { return [0.50]; }
  protected getDeathLines(): string {
    return 'INBOX CLEAN\n1,847 unread messages destroyed.';
  }
  protected getGearDrop(): number { return 10; }

  protected buildBody(): void {
    // Main envelope
    const body = this.scene.add.rectangle(0, 0, 130, 100, 0xf5f0e8);
    body.setStrokeStyle(3, 0xddcc99);

    // Flap / crease lines
    const lineL = this.scene.add.rectangle(-35, -10, 3, 70, 0xddcc99, 0.5);
    const lineR = this.scene.add.rectangle(35, -10, 3, 70, 0xddcc99, 0.5);
    const lineH = this.scene.add.rectangle(0, -20, 130, 3, 0xddcc99, 0.5);

    // Red stamp
    const stamp = this.scene.add.rectangle(42, -28, 28, 20, 0xcc2222);
    stamp.setStrokeStyle(2, 0xff4444);
    const stampTxt = this.scene.add.text(42, -28, '⚠', { fontSize: '14px' }).setOrigin(0.5);

    // Label
    const label = this.scene.add.text(0, 8, 'SPAM', {
      fontSize: '22px', fontFamily: 'Arial Black, Arial', color: '#cc2222',
    }).setOrigin(0.5);

    // Tentacles (6 thin rects extending below)
    this.tentacleLines = [];
    for (let i = 0; i < 6; i++) {
      const tx = -60 + i * 25;
      const tentacle = this.scene.add.rectangle(tx, 68, 8, 36, 0xddcc99, 0.8);
      this.tentacleLines.push(tentacle);
    }

    this.bodyContainer.add([body, lineL, lineR, lineH, stamp, stampTxt, label, ...this.tentacleLines]);
  }

  protected getBodyWidth(): number { return 130; }
  protected getBodyHeight(): number { return 100; }

  // ── Movement: side-to-side patrol, NOT chasing player ──────────────────────

  protected moveTowardPlayer(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Stay in upper portion of screen
    const targetY = this.phase === 1 ? 160 : 180;
    const dyToTarget = targetY - this.y;
    const vy = Phaser.Math.Clamp(dyToTarget * 2, -40, 40);

    // Patrol side-to-side
    const speed = this.phase === 2 ? this.patrolSpeed * 0.7 : this.patrolSpeed;
    body.setVelocity(this.patrolDir * speed, vy);

    // Bounce at edges
    if (this.x < 120) { this.patrolDir = 1; }
    else if (this.x > GAME_WIDTH - 120) { this.patrolDir = -1; }
  }

  // ── Boss update ─────────────────────────────────────────────────────────────

  protected bossUpdate(): void {
    const now = this.scene.time.now;

    if (now > this.shootTimer) {
      this.shoot();
      this.shootTimer = now + (this.phase === 1 ? 3000 : 3500);
    }

    if (this.phase === 1 && now > this.tentacleTimer) {
      this.tentacleTimer = now + 5000;
      this.doTentacleSlam();
    }

    if (this.phase === 2) {
      if (now > this.minionTimer) {
        this.minionTimer = now + 4000;
        this.spawnMinions();
      }
      if (now > this.regenTimer) {
        this.regenTimer = now + 1000;
        this.applyRegen();
      }
    }
  }

  protected onPhaseChange(_phase: number): void {
    // Phase 2 starts minion spawning + regen; timer initialization is above in bossUpdate
    this.minionTimer = this.scene.time.now + 1000;
    this.regenTimer = this.scene.time.now + 2000;
  }

  // ── Fan shot ────────────────────────────────────────────────────────────────

  private shoot(): void {
    const player = this.gameScene.player;
    const base = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const count = 8;
    const spread = 0.55;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spread / (count - 1) * 2;
      new Projectile(this.gameScene, this.x, this.y + 50, base + offset, 180, 16);
    }
    this.gameScene.audio.playSFX('shoot');
  }

  // ── Tentacle slam ───────────────────────────────────────────────────────────

  private doTentacleSlam(): void {
    // Animate tentacles extending downward
    this.tentacleLines.forEach((tl, i) => {
      this.scene.tweens.add({
        targets: tl,
        scaleY: 2.8,
        duration: 300,
        yoyo: true,
        delay: i * 60,
        ease: 'Power2',
      });
    });

    // Damage player if they're under the boss during the slam
    this.scene.time.delayedCall(200, () => {
      if (!this.active) return;
      const player = this.gameScene.player;
      if (Math.abs(player.x - this.x) < 80 && player.y > this.y) {
        player.takeDamage(20);
        this.gameScene.cameras.main.shake(120, 0.008);
      }
    });
  }

  // ── Minion spawning (Phase 2) ────────────────────────────────────────────────

  private spawnMinions(): void {
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(60, GAME_WIDTH - 60);
      const y = Phaser.Math.Between(100, this.gameScene.groundTop - 60);
      this.spawnMinion(new SpamEmail(this.gameScene, x, y, {}));
    }
  }

  private applyRegen(): void {
    const alive = this.bossMinions.filter(m => m.active).length;
    if (alive >= 3 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + 5);
    }
  }
}
