import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { Boss } from './Boss';
import { Projectile } from '../Projectile';
import { PopupClose } from '../enemies/PopupClose';
import { GAME_WIDTH } from '../../config';

interface ShieldOrb {
  graphic: Phaser.GameObjects.Arc;
  pulseGlow: Phaser.GameObjects.Arc;
  hp: number;
  alive: boolean;
  index: number;
}

export class AlgorithmBoss extends Boss {
  static readonly NAME = 'ALGORITHM LORD';

  private shootTimer = 0;
  private chargeTimer = 0;
  private chargeActive = false;
  private chargeWindup = false;
  private minionTimer = 0;
  private posHistory: { x: number; y: number }[] = [];
  private posRecordTimer = 0;
  private shieldOrbs: ShieldOrb[] = [];

  constructor(scene: GameScene, x: number, y: number, hp: number, waveNumber: number) {
    super(scene, x, y, hp, 55, 20, 80, 15, waveNumber, 150);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(110, 110);
    this.shootTimer = scene.time.now + 3000; // grace period after intro
  }

  getBossName(): string { return AlgorithmBoss.NAME; }
  getPhaseThresholds(): number[] { return [0.66, 0.33]; }
  protected getDeathLines(): string {
    return 'ALGORITHM DEFEATED\nYour privacy is restored... for now.';
  }
  protected getGearDrop(): number { return 8; }

  protected buildBody(): void {
    const outer = this.scene.add.circle(0, 0, 58, 0x0a0a3a);
    outer.setStrokeStyle(3, 0x4444ff);
    const glow = this.scene.add.circle(0, 0, 72, 0x2222cc, 0.12);
    const inner = this.scene.add.circle(0, 0, 32, 0x6622aa);
    const pupil = this.scene.add.circle(0, 0, 14, 0x111111);
    const eyeIcon = this.scene.add.text(0, -2, '👁', { fontSize: '20px' }).setOrigin(0.5);
    const nameTxt = this.scene.add.text(0, 50, 'ALGORITHM', {
      fontSize: '13px', fontFamily: 'Arial Black, Arial', color: '#6699ff',
    }).setOrigin(0.5);

    this.bodyContainer.add([glow, outer, inner, pupil, eyeIcon, nameTxt]);

    // Pulsing glow
    this.scene.tweens.add({
      targets: glow, alpha: 0.04, duration: 700, yoyo: true, repeat: -1,
    });

    // Slow rotation of the outer ring indicator
    this.scene.tweens.add({
      targets: outer, angle: 360, duration: 4000, repeat: -1,
    });
  }

  protected getBodyWidth(): number { return 110; }
  protected getBodyHeight(): number { return 110; }

  // ── Movement ────────────────────────────────────────────────────────────────

  protected moveTowardPlayer(): void {
    if (this.chargeActive) return; // velocity set by charge
    const time = this.scene.time.now / 1000;
    const player = this.gameScene.player;
    let targetX: number;
    let targetY: number;

    if (this.phase === 1) {
      // Drifting figure-eight — stays in upper half
      targetX = player.x + Math.sin(time * 0.9) * 120;
      targetY = Math.max(100, Math.min(280, player.y - 140 + Math.cos(time * 0.7) * 60));
    } else if (this.phase === 2) {
      // Slower drift during shield phase
      targetX = player.x + Math.sin(time * 0.5) * 90;
      targetY = Math.max(100, Math.min(260, player.y - 160 + Math.cos(time * 0.4) * 50));
    } else {
      // Phase 3: chase directly at higher speed
      targetX = player.x;
      targetY = player.y - 20;
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const s = this.phase === 3 ? this.speed * 1.4 : this.phase === 2 ? this.speed * 0.6 : this.speed;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * s, (dy / dist) * s);
  }

  // ── Boss update loop ────────────────────────────────────────────────────────

  protected bossUpdate(): void {
    const now = this.scene.time.now;

    // Record player position for delayed shot
    if (now > this.posRecordTimer) {
      this.posRecordTimer = now + 120;
      this.posHistory.push({ x: this.gameScene.player.x, y: this.gameScene.player.y });
      if (this.posHistory.length > 8) this.posHistory.shift();
    }

    // Shoot
    if (now > this.shootTimer) {
      this.shoot();
      this.shootTimer = now + (this.phase === 3 ? 1500 : 2000);
    }

    // Phase 2 — orbit orbs + minion spawning
    if (this.phase === 2) {
      this.updateOrbPositions();
      if (now > this.minionTimer) {
        this.minionTimer = now + 3000;
        this.spawnMinion(new PopupClose(this.gameScene, this.edgeX(), this.randomY(), {}));
      }
    }

    // Phase 3 — charge attack
    if (this.phase === 3 && !this.chargeActive && !this.chargeWindup && now > this.chargeTimer) {
      this.startCharge();
    }
  }

  // ── Shooting ────────────────────────────────────────────────────────────────

  private shoot(): void {
    if (this.phase === 1 || this.phase >= 3) {
      const target = this.posHistory.length > 0
        ? this.posHistory[0]
        : { x: this.gameScene.player.x, y: this.gameScene.player.y };
      const base = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

      if (this.phase === 3) {
        // Triple spread
        for (let i = -1; i <= 1; i++) {
          new Projectile(this.gameScene, this.x, this.y, base + i * 0.28, 200, 18);
        }
      } else {
        new Projectile(this.gameScene, this.x, this.y, base, 170, 18);
      }
      this.gameScene.audio.playSFX('shoot');
    }
  }

  // ── Shield orbs (Phase 2) ───────────────────────────────────────────────────

  protected onPhaseChange(phase: number): void {
    if (phase === 2) this.createShields();
    else if (phase === 3) this.removeRemainingShields();
  }

  private createShields(): void {
    for (let i = 0; i < 4; i++) {
      const glow = this.scene.add.circle(this.x, this.y, 18, 0x0066ff, 0.15).setDepth(7);
      const graphic = this.scene.add.circle(this.x, this.y, 14, 0x2299ff).setDepth(8);
      graphic.setStrokeStyle(2, 0x88ccff);
      this.shieldOrbs.push({ graphic, pulseGlow: glow, hp: 30, alive: true, index: i });
    }
  }

  private updateOrbPositions(): void {
    const time = this.scene.time.now / 1000;
    const orbitR = 80;
    this.shieldOrbs.forEach(orb => {
      if (!orb.alive) return;
      const angle = time * 1.8 + (orb.index / 4) * Math.PI * 2;
      const nx = this.x + Math.cos(angle) * orbitR;
      const ny = this.y + Math.sin(angle) * orbitR;
      orb.graphic.setPosition(nx, ny);
      orb.pulseGlow.setPosition(nx, ny);
    });
  }

  private removeRemainingShields(): void {
    this.shieldOrbs.forEach(orb => {
      if (orb.alive) {
        orb.graphic.destroy();
        orb.pulseGlow.destroy();
        orb.alive = false;
      }
    });
    this.shieldOrbs = [];
  }

  private damageShield(amount: number): void {
    const alive = this.shieldOrbs.filter(o => o.alive);
    if (!alive.length) return;
    const orb = alive[0];
    orb.hp -= amount;
    this.flashWhite();
    if (orb.hp <= 0) {
      this.burstOrb(orb);
    }
  }

  private burstOrb(orb: ShieldOrb): void {
    orb.alive = false;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = this.scene.add.circle(orb.graphic.x, orb.graphic.y, 5, 0x2299ff).setDepth(15);
      this.scene.tweens.add({
        targets: p,
        x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40,
        alpha: 0, scaleX: 0, scaleY: 0, duration: 350,
        onComplete: () => p.destroy(),
      });
    }
    orb.graphic.destroy();
    orb.pulseGlow.destroy();
  }

  // ── Charge (Phase 3) ────────────────────────────────────────────────────────

  private startCharge(): void {
    this.chargeWindup = true;

    // Red glow telegraph
    const glow = this.scene.add.circle(this.x, this.y, 90, 0xff0000, 0).setDepth(7);
    this.scene.tweens.add({
      targets: this.bodyContainer,
      scaleX: 1.25, scaleY: 1.25, duration: 800, yoyo: true, ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: glow, alpha: 0.2, duration: 800, ease: 'Sine.easeInOut',
    });

    this.scene.time.delayedCall(900, () => {
      glow.destroy();
      if (!this.active) return;
      this.chargeWindup = false;
      this.chargeActive = true;

      const player = this.gameScene.player;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      (this.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * 620, (dy / dist) * 620);

      this.scene.time.delayedCall(480, () => {
        if (!this.active) return;
        (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        this.chargeActive = false;
        this.chargeTimer = this.scene.time.now + 4000;
      });
    });
  }

  // ── takeDamage override: redirect to shields in phase 2 ────────────────────

  takeDamage(amount: number): void {
    if (!this.introComplete || this.phaseTransitioning) return;
    const activeOrbs = this.shieldOrbs.filter(o => o.alive);
    if (this.phase === 2 && activeOrbs.length > 0) {
      this.damageShield(amount);
      return; // Don't damage boss while shields are up
    }
    super.takeDamage(amount);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private edgeX(): number {
    return Math.random() > 0.5
      ? Phaser.Math.Between(20, 80)
      : Phaser.Math.Between(GAME_WIDTH - 80, GAME_WIDTH - 20);
  }

  private randomY(): number {
    return Phaser.Math.Between(80, this.gameScene.groundTop - 60);
  }

  protected die(): void {
    this.removeRemainingShields();
    super.die();
  }
}
