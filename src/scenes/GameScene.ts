import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Coin } from '../entities/Coin';
import { WaveManager } from '../systems/WaveManager';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { Projectile } from '../entities/Projectile';

export interface GameState {
  coins: number;
  wave: number;
  enemiesRemaining: number;
  totalEnemiesInWave: number;
  hp: number;
  maxHp: number;
  bestWave: number;
  activeUpgrades: string[];
}

export class GameScene extends Phaser.Scene {
  player!: Player;
  enemies!: Phaser.GameObjects.Group;
  coins!: Phaser.GameObjects.Group;
  projectiles!: Phaser.GameObjects.Group;
  playerProjectiles!: Phaser.GameObjects.Group;

  private waveManager!: WaveManager;
  audio!: AudioManager;
  private inputManager!: InputManager;

  private gameState!: GameState;
  private gameOver = false;
  private hitstopActive = false;
  private slowmoActive = false;
  private damageOverlay!: Phaser.GameObjects.Rectangle;
  private currentWave = 1;

  readonly groundY = GAME_HEIGHT - 60;
  readonly groundTop = GAME_HEIGHT - 100;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameOver = false;
    this.currentWave = 1;

    const bestWave = parseInt(localStorage.getItem('bestWave') || '0');

    this.gameState = {
      coins: 0,
      wave: 1,
      enemiesRemaining: 0,
      totalEnemiesInWave: 1,
      hp: 100,
      maxHp: 100,
      bestWave,
      activeUpgrades: [],
    };

    this.audio = new AudioManager();
    this.inputManager = new InputManager(this);

    this.buildLevel();

    this.damageOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xe74c3c, 0).setDepth(99);

    this.enemies = this.add.group();
    this.coins = this.add.group();
    this.projectiles = this.add.group();
    this.playerProjectiles = this.add.group();

    this.player = new Player(this, GAME_WIDTH / 2, this.groundTop - 40);

    this.waveManager = new WaveManager(this);
    this.waveManager.startWave(1);

    this.physics.add.overlap(
      this.player,
      this.coins,
      (_p, c) => this.collectCoin(c as Coin),
    );

    this.physics.add.overlap(
      this.player,
      this.projectiles,
      (_p, proj) => {
        const p = proj as Projectile;
        this.player.takeDamage(p.damage);
        p.destroy();
        this.audio.playSFX('hit');
      },
    );

    // Regen timer
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        if (!this.gameOver && this.player?.active && this.player.upgradeState.regenRate > 0) {
          this.player.heal(this.player.upgradeState.regenRate);
        }
      },
    });

    // Resume event: fired when UpgradeScene stops and resumes this scene
    this.events.on('resume', () => {
      const nextWave = this.registry.get('upgradeNextWave') as number | undefined;
      if (nextWave !== undefined) {
        this.registry.remove('upgradeNextWave');
        this.waveManager.startWave(nextWave);
      }
    });

    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.launch('UIScene');
    this.updateUI();
  }

  private buildLevel(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d2b, 0x0d0d2b, 0x1a1a3e, 0x1a1a3e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const ground = this.add.graphics();
    ground.fillStyle(0x16213e);
    ground.fillRect(0, this.groundY, GAME_WIDTH, GAME_HEIGHT - this.groundY);
    ground.fillStyle(0x0f3460);
    ground.fillRect(0, this.groundY, GAME_WIDTH, 4);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x0f3460, 0.3);
    for (let x = 0; x < GAME_WIDTH; x += 80) {
      grid.lineBetween(x, 0, x, this.groundY);
    }
    for (let y = 0; y < this.groundY; y += 80) {
      grid.lineBetween(0, y, GAME_WIDTH, y);
    }

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  update(): void {
    if (this.gameOver) return;

    this.inputManager.update();
    this.player.update(this.inputManager);

    this.enemies.getChildren().forEach(e => (e as Enemy).update());
    this.coins.getChildren().forEach(c => (c as Coin).update());
    this.projectiles.getChildren().forEach(p => (p as Projectile).update());

    // Magnet: pull coins toward player
    if (this.player.upgradeState.hasMagnet) {
      this.coins.getChildren().forEach(c => {
        const coin = c as Coin;
        if (!coin.active) return;
        const dx = this.player.x - coin.x;
        const dy = this.player.y - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 350 && dist > 5) {
          const body = coin.body as Phaser.Physics.Arcade.Body;
          body.setVelocity((dx / dist) * 300, (dy / dist) * 300);
        }
      });
    }

    this.checkPlayerEnemyCollisions();
    this.checkAttackEnemyCollisions();
    this.checkProjectileWalls();

    this.gameState.hp = this.player.hp;
    this.gameState.maxHp = this.player.maxHp;
    this.gameState.activeUpgrades = this.player.upgradeState.activeUpgrades;
    this.updateUI();

    if (this.player.hp <= 0 && !this.gameOver) {
      this.triggerGameOver();
    }
  }

  private checkPlayerEnemyCollisions(): void {
    this.enemies.getChildren().forEach(e => {
      const enemy = e as Enemy;
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < enemy.contactRadius + 20) {
        const wasInvincible = this.player.isCurrentlyInvincible;
        this.player.takeDamage(enemy.contactDamage);
        // Thorns: reflect damage if we weren't invincible
        if (!wasInvincible && this.player.upgradeState.thorns > 0) {
          enemy.takeDamage(this.player.upgradeState.thorns);
        }
        if (enemy.knockback > 0) {
          const dx = this.player.x - enemy.x;
          const dy = this.player.y - enemy.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const body = this.player.body as Phaser.Physics.Arcade.Body;
          body.setVelocity((dx / len) * enemy.knockback, (dy / len) * enemy.knockback);
        }
      }
    });
  }

  private checkAttackEnemyCollisions(): void {
    if (!this.player.isAttacking) return;
    this.enemies.getChildren().forEach(e => {
      const enemy = e as Enemy;
      if (!enemy.active || enemy.hitThisSwing) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist > this.player.getSwingRange() + enemy.contactRadius) return;
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      const facingAngle = this.player.facingRight ? 0 : Math.PI;
      const diff = Phaser.Math.Angle.Wrap(angle - facingAngle);
      if (Math.abs(diff) < this.player.getSwingAngle()) {
        let damage = this.player.meleeDamage;
        let isCrit = false;
        if (this.player.upgradeState.critChance > 0 && Math.random() < this.player.upgradeState.critChance) {
          damage = Math.round(damage * 2);
          isCrit = true;
        }
        enemy.takeDamage(damage);
        enemy.hitThisSwing = true;
        this.audio.playSFX('attack');
        this.cameras.main.shake(80, 0.005);
        this.triggerHitstop();
        enemy.applyHitKnockback(this.player.x, this.player.y, 30);
        this.spawnHitParticles(enemy.x, enemy.y);
        if (isCrit) this.showCritText(enemy.x, enemy.y);
      }
    });
  }

  private showCritText(x: number, y: number): void {
    const t = this.add.text(x, y - 30, 'CRIT!', {
      fontSize: '24px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: t,
      y: y - 80,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  triggerDeathSlowmo(): void {
    if (this.slowmoActive) return;
    this.slowmoActive = true;
    this.physics.world.timeScale = 0.5;
    this.time.delayedCall(100, () => {
      this.physics.world.timeScale = 1;
      this.slowmoActive = false;
    });
  }

  triggerDamageFlash(): void {
    this.tweens.killTweensOf(this.damageOverlay);
    this.damageOverlay.setAlpha(0.3);
    this.tweens.add({
      targets: this.damageOverlay,
      alpha: 0,
      duration: 200,
      ease: 'Linear',
    });
  }

  private triggerHitstop(): void {
    if (this.hitstopActive) return;
    this.hitstopActive = true;
    this.physics.world.pause();
    this.time.delayedCall(40, () => {
      this.physics.world.resume();
      this.hitstopActive = false;
    });
  }

  private spawnHitParticles(x: number, y: number): void {
    const count = Phaser.Math.Between(4, 6);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.4, 0.4);
      const dist = Phaser.Math.Between(25, 55);
      const particle = this.add.rectangle(x, y, 4, 4, 0xffffff).setDepth(20);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: Phaser.Math.Between(100, 180),
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private checkProjectileWalls(): void {
    this.projectiles.getChildren().forEach(p => {
      const proj = p as Projectile;
      if (proj.x < 0 || proj.x > GAME_WIDTH || proj.y < 0 || proj.y > GAME_HEIGHT) {
        proj.destroy();
      }
    });
  }

  collectCoin(coin: Coin): void {
    this.gameState.coins += Math.round(coin.value * this.player.upgradeState.coinMult);
    coin.destroy();
    this.audio.playSFX('coin');
    this.updateUI();
  }

  onEnemyDied(): void {
    this.gameState.enemiesRemaining = Math.max(0, this.gameState.enemiesRemaining - 1);
    if (this.player?.active && this.player.upgradeState.lifestealHp > 0) {
      this.player.heal(this.player.upgradeState.lifestealHp);
    }
    this.updateUI();
    this.waveManager.onEnemyKilled();
  }

  onWaveComplete(waveNumber: number, upgradeCards: number): void {
    if (this.gameOver) return;
    const nextWave = waveNumber + 1;
    this.gameState.wave = nextWave;
    this.updateUI();

    this.time.delayedCall(800, () => {
      if (this.gameOver) return;
      this.registry.set('upgradeCards', upgradeCards);
      this.registry.set('upgradeWave', nextWave);
      this.scene.pause();
      this.scene.launch('UpgradeScene');
    });
  }

  setEnemiesRemaining(count: number): void {
    this.gameState.enemiesRemaining = count;
    this.updateUI();
  }

  setEnemiesTotal(total: number): void {
    this.gameState.totalEnemiesInWave = total;
    this.updateUI();
  }

  setWave(wave: number): void {
    this.currentWave = wave;
    this.gameState.wave = wave;
    this.updateUI();
  }

  private updateUI(): void {
    const ui = this.scene.get('UIScene') as Phaser.Scene & { updateState?: (s: GameState) => void };
    if (ui && ui.updateState) {
      ui.updateState({ ...this.gameState });
    }
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.physics.world.pause();
    this.audio.playSFX('gameover');

    this.scene.stop('UIScene');

    const reached = this.currentWave;
    const prev = parseInt(localStorage.getItem('bestWave') || '0');
    const best = Math.max(reached, prev);
    localStorage.setItem('bestWave', String(best));
    const isNewRecord = reached > prev;

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setDepth(100);
    this.tweens.add({
      targets: overlay,
      alpha: 0.7,
      duration: 400,
      onComplete: () => this.buildGameOverPanel(reached, best, isNewRecord),
    });
  }

  private buildGameOverPanel(reached: number, best: number, isNewRecord: boolean): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panel = this.add.container(cx, cy).setDepth(110);

    const glow = this.add.rectangle(0, 0, 616, 436, 0xe74c3c, 0.12);
    const bg = this.add.rectangle(0, 0, 600, 420, 0x080808, 0.95);
    bg.setStrokeStyle(2, 0xe74c3c);

    const title = this.add.text(0, -155, 'GAME OVER', {
      fontSize: '72px',
      fontFamily: 'Arial Black, Arial',
      color: '#e74c3c',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    const waveText = this.add.text(0, -82, `Wave: ${reached}`, {
      fontSize: '28px',
      fontFamily: 'Arial Black, Arial',
      color: '#ecf0f1',
    }).setOrigin(0.5);

    const recordText = isNewRecord
      ? this.add.text(0, -50, '🏆 NEW RECORD!', {
          fontSize: '22px',
          fontFamily: 'Arial Black, Arial',
          color: '#ffd700',
        }).setOrigin(0.5)
      : this.add.text(0, -50, `Best: ${best}`, {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#666666',
        }).setOrigin(0.5);

    const coinsText = this.add.text(0, -5, `Coins collected: ${this.gameState.coins}`, {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffd700',
    }).setOrigin(0.5);

    const upgradesText = this.add.text(0, 32, `Upgrades taken: ${this.player.upgradeState.activeUpgrades.length}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    const tryAgainBtn = this.add.text(0, 108, '[ TRY AGAIN ]', {
      fontSize: '34px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tryAgainBtn.on('pointerover', () => tryAgainBtn.setColor('#ffffff'));
    tryAgainBtn.on('pointerout', () => tryAgainBtn.setColor('#4ecdc4'));
    tryAgainBtn.on('pointerdown', () => this.scene.start('GameScene'));

    const menuBtn = this.add.text(0, 160, '[ MAIN MENU ]', {
      fontSize: '26px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#888888'));
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    panel.add([glow, bg, title, waveText, recordText, coinsText, upgradesText, tryAgainBtn, menuBtn]);

    panel.setScale(0.85).setAlpha(0);
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }
}
