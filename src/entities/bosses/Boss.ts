import Phaser from 'phaser';
import { GameScene } from '../../scenes/GameScene';
import { Enemy } from '../enemies/Enemy';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';

// Forward reference to avoid circular import — UIScene type is only used via get()
interface UISceneLike {
  showBossBar(name: string, thresholds: number[], maxHp: number): void;
  updateBossBar(hp: number, maxHp: number, phase: number, phaseCount: number): void;
  hideBossBar(): void;
}

export abstract class Boss extends Enemy {
  protected phase = 1;
  protected phaseTransitioning = false;
  protected introComplete = false;
  protected readonly waveNumber: number;

  /** Enemies spawned by this boss — destroyed when boss dies. */
  protected bossMinions: Enemy[] = [];

  constructor(
    scene: GameScene,
    x: number,
    y: number,
    hp: number,
    speed: number,
    contactDamage: number,
    contactRadius: number,
    coinDrop: number,
    waveNumber: number,
    knockback = 0,
  ) {
    super(scene, x, y, hp, speed, contactDamage, contactRadius, coinDrop, knockback);
    this.waveNumber = waveNumber;
    this.isBossType = true;

    // Register boss HP bar in UIScene
    const ui = this.getUI();
    if (ui) ui.showBossBar(this.getBossName(), this.getPhaseThresholds(), this.maxHp);

    // Freeze and hide body during intro animation
    this.bodyContainer.setAlpha(0).setScale(0.15);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    this.playIntro();
  }

  /** Suppress per-enemy HP bar — Boss uses the top-screen bar via UIScene. */
  protected buildHPBar(): void { /* no-op */ }

  protected updateHPBar(): void {
    const thresholds = this.getPhaseThresholds();
    this.getUI()?.updateBossBar(this.hp, this.maxHp, this.phase, thresholds.length + 1);
  }

  abstract getBossName(): string;

  /**
   * HP fraction thresholds at which phases advance, in descending order.
   * e.g. [0.66, 0.33] = 3 phases transitioning at 66% and 33% HP.
   */
  abstract getPhaseThresholds(): number[];

  protected abstract onPhaseChange(newPhase: number): void;

  /** Called every frame after intro completes. Override in subclasses. */
  protected bossUpdate(): void { /* override in subclass */ }

  // ── Damage / phase system ───────────────────────────────────────────────────

  takeDamage(amount: number): void {
    if (!this.introComplete || this.phaseTransitioning) return;
    super.takeDamage(amount);
    this.checkPhaseTransition();
  }

  private checkPhaseTransition(): void {
    const pct = this.hp / this.maxHp;
    const thresholds = this.getPhaseThresholds();
    const newPhase = 1 + thresholds.filter(t => pct <= t).length;
    if (newPhase > this.phase) {
      this.phase = newPhase;
      this.phaseTransitioning = true;
      this.showPhaseFlash(newPhase);
      this.showImmunityPulse();
      this.scene.time.delayedCall(1100, () => {
        this.phaseTransitioning = false;
        if (this.active) this.onPhaseChange(newPhase);
      });
    }
  }

  private showImmunityPulse(): void {
    const PULSES = 5;
    const PERIOD = 220; // ms per flash cycle

    // Rapid white flash on the boss body to signal "immune"
    this.scene.tweens.add({
      targets: this.bodyContainer,
      alpha: 0.25,
      duration: PERIOD / 2,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: PULSES - 1,
      onComplete: () => {
        if (this.active) this.bodyContainer.setAlpha(1);
      },
    });

    // Expanding shield ring around the boss
    const ring = this.scene.add.circle(this.x, this.y, 55, 0xffffff, 0).setDepth(40)
      .setStrokeStyle(3, 0xffd700);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 1.8, scaleY: 1.8,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
  }

  private showPhaseFlash(phase: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    const flash = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.15)
      .setDepth(300);
    this.scene.tweens.add({
      targets: flash, alpha: 0, duration: 600,
      onComplete: () => flash.destroy(),
    });

    const txt = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `— PHASE ${phase} —`, {
      fontSize: '52px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6600',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(301).setAlpha(0);

    this.scene.tweens.add({
      targets: txt,
      alpha: 1, duration: 180, ease: 'Power2',
      yoyo: true, hold: 500,
      onComplete: () => txt.destroy(),
    });
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(): void {
    if (!this.introComplete) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.updateHPBar();
      return;
    }
    super.update(); // handles moveTowardPlayer, bodyContainer position, updateHPBar
    if (this.active) this.bossUpdate();
  }

  // ── Death ───────────────────────────────────────────────────────────────────

  protected die(): void {
    // Clean up top-screen HP bar
    this.getUI()?.hideBossBar();

    // Destroy all minions instantly (no death animation / kill callback)
    this.bossMinions.forEach(m => { if (m.active) m.destroy(); });
    this.bossMinions = [];

    // Clear all enemy projectiles
    const projs = this.gameScene.projectiles.getChildren().slice();
    projs.forEach(p => (p as any).destroy());

    this.showDeathSequence();
    super.die();
  }

  private showDeathSequence(): void {
    const lines = this.getDeathLines();
    if (!lines) return;

    this.scene.time.delayedCall(500, () => {
      if (!this.scene?.sys?.isActive()) return;
      const txt = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, lines, {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
      }).setOrigin(0.5).setDepth(55).setAlpha(0);

      this.scene.tweens.add({
        targets: txt, alpha: 1, y: txt.y - 10, duration: 300, ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.time.delayedCall(2200, () => {
            this.scene.tweens.add({
              targets: txt, alpha: 0, duration: 300,
              onComplete: () => txt.destroy(),
            });
          });
        },
      });
    });
  }

  /** Override to return flavour text shown on boss death. */
  protected getDeathLines(): string { return ''; }

  // ── Intro ───────────────────────────────────────────────────────────────────

  private playIntro(): void {
    const depth = 250;

    const vignette = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setDepth(depth - 1);

    const nameLbl = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 45, this.getBossName(), {
      fontSize: '56px', fontFamily: 'Arial Black, Arial',
      color: '#ff6600', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(depth).setAlpha(0);

    const subLbl = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 22, `WAVE ${this.waveNumber} BOSS`, {
      fontSize: '26px', fontFamily: 'Arial', color: '#ffcc44',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(depth).setAlpha(0);

    const introObjects = [vignette, nameLbl, subLbl];

    this.scene.tweens.add({ targets: vignette, alpha: 0.65, duration: 350 });

    this.scene.time.delayedCall(200, () => {
      this.scene.tweens.add({
        targets: [nameLbl, subLbl], alpha: 1, duration: 350, ease: 'Back.easeOut',
      });
    });

    this.scene.time.delayedCall(350, () => {
      this.scene.tweens.add({
        targets: this.bodyContainer, alpha: 1, scaleX: 1, scaleY: 1,
        duration: 650, ease: 'Back.easeOut',
      });
    });

    this.scene.time.delayedCall(2300, () => {
      this.scene.tweens.add({
        targets: introObjects, alpha: 0, duration: 400,
        onComplete: () => {
          introObjects.forEach(o => (o as any).destroy());
          this.introComplete = true;
        },
      });
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private getUI(): UISceneLike | null {
    const ui = this.gameScene.scene.get('UIScene') as unknown as UISceneLike;
    return ui ?? null;
  }

  /** Summon a boss minion: adds to bossMinions list and marks countsAsKill=false. */
  protected spawnMinion<T extends Enemy>(minion: T): T {
    minion.countsAsKill = false;
    this.bossMinions.push(minion);
    return minion;
  }
}
