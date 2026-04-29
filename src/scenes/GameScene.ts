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
  hp: number;
  maxHp: number;
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
  private levelComplete = false;
  private hitstopActive = false;

  // Ground platform boundaries
  readonly groundY = GAME_HEIGHT - 60;
  readonly groundTop = GAME_HEIGHT - 100;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameOver = false;
    this.levelComplete = false;

    this.gameState = { coins: 0, wave: 1, enemiesRemaining: 0, hp: 100, maxHp: 100 };

    this.audio = new AudioManager();
    this.inputManager = new InputManager(this);

    this.buildLevel();

    this.enemies = this.add.group();
    this.coins = this.add.group();
    this.projectiles = this.add.group();
    this.playerProjectiles = this.add.group();

    this.player = new Player(this, GAME_WIDTH / 2, this.groundTop - 40);

    this.waveManager = new WaveManager(this);
    this.waveManager.startWave(1);

    // Overlap: player touches coin
    this.physics.add.overlap(
      this.player,
      this.coins,
      (_p, c) => this.collectCoin(c as Coin),
    );

    // Overlap: enemy projectiles hit player
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

    // Always (re)launch UIScene fresh when GameScene starts
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.launch('UIScene');
    this.updateUI();
  }

  private buildLevel(): void {
    // Sky background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d2b, 0x0d0d2b, 0x1a1a3e, 0x1a1a3e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Ground
    const ground = this.add.graphics();
    ground.fillStyle(0x16213e);
    ground.fillRect(0, this.groundY, GAME_WIDTH, GAME_HEIGHT - this.groundY);
    ground.fillStyle(0x0f3460);
    ground.fillRect(0, this.groundY, GAME_WIDTH, 4);

    // Grid lines for depth
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
    if (this.gameOver || this.levelComplete) return;

    this.inputManager.update();
    this.player.update(this.inputManager);

    this.enemies.getChildren().forEach(e => (e as Enemy).update());
    this.coins.getChildren().forEach(c => (c as Coin).update());
    this.projectiles.getChildren().forEach(p => (p as Projectile).update());

    this.checkPlayerEnemyCollisions();
    this.checkAttackEnemyCollisions();
    this.checkProjectileWalls();

    this.gameState.hp = this.player.hp;
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
        this.player.takeDamage(enemy.contactDamage);
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
      // Hit if sword arc (90px) reaches enemy edge: dist <= swordReach + enemyRadius
      if (dist > 90 + enemy.contactRadius) return;
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      const facingAngle = this.player.facingRight ? 0 : Math.PI;
      const diff = Phaser.Math.Angle.Wrap(angle - facingAngle);
      if (Math.abs(diff) < Math.PI / 2) {
        enemy.takeDamage(this.player.meleeDamage);
        enemy.hitThisSwing = true;
        this.audio.playSFX('attack');
        this.cameras.main.shake(80, 0.005);
        this.triggerHitstop();
        enemy.applyHitKnockback(this.player.x, this.player.y, 30);
        this.spawnHitParticles(enemy.x, enemy.y);
      }
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
    this.gameState.coins += coin.value;
    coin.destroy();
    this.audio.playSFX('coin');
    this.updateUI();
  }

  onEnemyDied(): void {
    this.gameState.enemiesRemaining = Math.max(0, this.gameState.enemiesRemaining - 1);
    this.updateUI();
    this.waveManager.onEnemyKilled();
  }

  onWaveComplete(waveNumber: number): void {
    this.gameState.wave = waveNumber + 1;
    if (waveNumber >= 3) {
      this.triggerLevelComplete();
    } else {
      // Brief pause then next wave
      this.time.delayedCall(2000, () => {
        this.waveManager.startWave(waveNumber + 1);
      });
    }
    this.updateUI();
  }

  setEnemiesRemaining(count: number): void {
    this.gameState.enemiesRemaining = count;
    this.updateUI();
  }

  setWave(wave: number): void {
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
    this.audio.playSFX('gameover');

    // Dim overlay
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setDepth(100);
    this.tweens.add({ targets: overlay, alpha: 0.7, duration: 500 });

    this.time.delayedCall(300, () => {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'GAME OVER', {
        fontSize: '80px',
        fontFamily: 'Arial Black, Arial',
        color: '#e74c3c',
        stroke: '#000000',
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(101);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Coins collected: ${this.gameState.coins}`, {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffd700',
      }).setOrigin(0.5).setDepth(101);

      const tryAgainBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '[ TRY AGAIN ]', {
        fontSize: '36px',
        fontFamily: 'Arial Black, Arial',
        color: '#4ecdc4',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

      tryAgainBtn.on('pointerover', () => tryAgainBtn.setColor('#ffffff'));
      tryAgainBtn.on('pointerout', () => tryAgainBtn.setColor('#4ecdc4'));
      tryAgainBtn.on('pointerdown', () => this.restartGame());
    });
  }

  private triggerLevelComplete(): void {
    this.levelComplete = true;
    this.audio.playSFX('win');

    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setDepth(100);
    this.tweens.add({ targets: overlay, alpha: 0.7, duration: 500 });

    this.time.delayedCall(300, () => {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'LEVEL COMPLETE!', {
        fontSize: '72px',
        fontFamily: 'Arial Black, Arial',
        color: '#f1c40f',
        stroke: '#000000',
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(101);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '🏆 All waves cleared!', {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ecf0f1',
      }).setOrigin(0.5).setDepth(101);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, `Coins: ${this.gameState.coins}`, {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffd700',
      }).setOrigin(0.5).setDepth(101);

      const nextBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, '[ NEXT LEVEL ]', {
        fontSize: '36px',
        fontFamily: 'Arial Black, Arial',
        color: '#4ecdc4',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

      nextBtn.on('pointerover', () => nextBtn.setColor('#ffffff'));
      nextBtn.on('pointerout', () => nextBtn.setColor('#4ecdc4'));
      nextBtn.on('pointerdown', () => this.restartGame());
    });
  }

  private restartGame(): void {
    // scene.start() stops the current scene and starts it fresh;
    // GameScene.create() will stop + relaunch UIScene itself.
    this.scene.start('GameScene');
  }
}
