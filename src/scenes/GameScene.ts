import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Coin } from '../entities/Coin';
import { Gear } from '../entities/Gear';
import { WaveManager } from '../systems/WaveManager';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { Projectile } from '../entities/Projectile';
import { MetaProgress } from '../systems/MetaProgress';

export interface GameState {
  coins: number;
  wave: number;
  enemiesRemaining: number;
  totalEnemiesInWave: number;
  hp: number;
  maxHp: number;
  bestWave: number;
  activeUpgrades: string[];
  gearsThisRun: number;
}

export class GameScene extends Phaser.Scene {
  player!: Player;
  enemies!: Phaser.GameObjects.Group;
  coins!: Phaser.GameObjects.Group;
  gears!: Phaser.GameObjects.Group;
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
  private gearsThisRun = 0;

  readonly groundY = GAME_HEIGHT - 60;
  readonly groundTop = GAME_HEIGHT - 100;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameOver = false;
    this.currentWave = 1;
    this.gearsThisRun = 0;

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
      gearsThisRun: 0,
    };

    this.audio = new AudioManager();
    this.inputManager = new InputManager(this);

    this.buildLevel();

    this.damageOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xe74c3c, 0).setDepth(99);

    this.enemies = this.add.group();
    this.coins = this.add.group();
    this.gears = this.add.group();
    this.projectiles = this.add.group();
    this.playerProjectiles = this.add.group();

    this.player = new Player(this, GAME_WIDTH / 2, this.groundTop - 40);
    this.applyMetaUpgrades();

    this.gameState.hp = this.player.hp;
    this.gameState.maxHp = this.player.maxHp;

    this.waveManager = new WaveManager(this);
    this.waveManager.startWave(1);

    this.physics.add.overlap(
      this.player,
      this.coins,
      (_p, c) => this.collectCoin(c as Coin),
    );

    this.physics.add.overlap(
      this.player,
      this.gears,
      (_p, g) => this.collectGear(g as Gear),
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

    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        if (!this.gameOver && this.player?.active && this.player.upgradeState.regenRate > 0) {
          this.player.heal(this.player.upgradeState.regenRate);
        }
      },
    });

    this.events.on('resume', () => {
      // Shop path
      const shopWave = this.registry.get('shopNextWave') as number | undefined;
      if (shopWave !== undefined) {
        this.registry.remove('shopNextWave');
        const effects = (this.registry.get('shopPendingEffects') as string[] | undefined) ?? [];
        this.registry.remove('shopPendingEffects');
        this.applyShopEffects(effects, shopWave);
        return;
      }
      // Upgrade path
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

  private applyMetaUpgrades(): void {
    const lvl = (id: string) => MetaProgress.getUpgradeLevel(id);

    // Damage
    const dmgLvl = lvl('damage');
    if (dmgLvl > 0) {
      this.player.meleeDamage = Math.round(this.player.meleeDamage * (1 + 0.03 * dmgLvl));
    }

    // Max HP + starting HP
    const hpLvl = lvl('max_hp');
    const startHpLvl = lvl('start_hp');
    this.player.maxHp += 5 * hpLvl + 10 * startHpLvl;
    this.player.hp = this.player.maxHp;

    // Speed
    this.player.upgradeState.speedMult += 0.02 * lvl('speed');

    // Attack speed (reduces cooldown)
    const atkLvl = lvl('attack_speed');
    if (atkLvl > 0) {
      this.player.upgradeState.cooldownMult = Math.max(0.25, 1 - 0.02 * atkLvl);
    }

    // Coin bonus
    this.player.upgradeState.coinMult += 0.05 * lvl('coin_bonus');

    // Crit chance
    const critLvl = lvl('crit_chance');
    if (critLvl > 0) {
      this.player.upgradeState.critChance = Math.min(0.75, this.player.upgradeState.critChance + 0.01 * critLvl);
    }

    // Magnet radius
    const magnetLvl = lvl('magnet_range');
    if (magnetLvl > 0) {
      this.player.upgradeState.magnetRadius += 20 * magnetLvl;
    }

    // Revive charges
    const reviveLvl = lvl('revive');
    if (reviveLvl > 0) {
      this.player.reviveCharges = reviveLvl >= 10 ? 3 : reviveLvl >= 5 ? 2 : 1;
    }
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
    this.gears.getChildren().forEach(g => (g as Gear).update());
    this.projectiles.getChildren().forEach(p => (p as Projectile).update());

    // Magnet: pull coins toward player
    const magR = this.player.upgradeState.magnetRadius;
    if (magR > 0) {
      this.coins.getChildren().forEach(c => {
        const coin = c as Coin;
        if (!coin.active) return;
        const dx = this.player.x - coin.x;
        const dy = this.player.y - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < magR && dist > 5) {
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
    this.gameState.gearsThisRun = this.gearsThisRun;
    this.updateUI();

    if (this.player.hp <= 0 && !this.gameOver) {
      if (this.player.reviveCharges > 0) {
        this.player.reviveCharges--;
        this.player.hp = Math.ceil(this.player.maxHp * 0.5);
        this.showReviveEffect();
      } else {
        this.triggerGameOver();
      }
    }
  }

  private showReviveEffect(): void {
    const charges = this.player.reviveCharges;
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `💫 REVIVED! (${charges} left)`, {
      fontSize: '36px',
      fontFamily: 'Arial Black, Arial',
      color: '#aaddff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(98);

    this.tweens.add({
      targets: t,
      y: GAME_HEIGHT / 2 - 80,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });

    // Brief flash of white
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xaaddff, 0.5).setDepth(97);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  private checkPlayerEnemyCollisions(): void {
    this.enemies.getChildren().forEach(e => {
      const enemy = e as Enemy;
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < enemy.contactRadius + 20) {
        const wasInvincible = this.player.isCurrentlyInvincible;
        this.player.takeDamage(enemy.contactDamage);
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
        if (this.player.upgradeState.doubleStrikeChance > 0 &&
            Math.random() < this.player.upgradeState.doubleStrikeChance) {
          enemy.takeDamage(damage);
          this.showDoubleText(enemy.x, enemy.y);
        }
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

  collectGear(gear: Gear): void {
    this.gearsThisRun++;
    this.gameState.gearsThisRun = this.gearsThisRun;
    gear.destroy();
    this.audio.playSFX('coin');
    this.spawnGearParticles(gear.x, gear.y);
    this.updateUI();
  }

  private spawnGearParticles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = Phaser.Math.Between(20, 45);
      const p = this.add.rectangle(x, y, 4, 4, 0xaaaadd).setDepth(20);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: Phaser.Math.Between(200, 350),
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
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

    // Wave-clear gear bonus every 5 waves (boss waves)
    if (waveNumber % 5 === 0) {
      const bonus = Phaser.Math.Between(1, 2);
      this.gearsThisRun += bonus;
      this.gameState.gearsThisRun = this.gearsThisRun;
      this.showBonusGears(bonus);
    }

    // Reset time slow applied by shop
    this.physics.world.timeScale = 1;

    this.updateUI();

    this.time.delayedCall(800, () => {
      if (this.gameOver) return;

      const isBossWave = waveNumber % 5 === 0;
      const isShopWave = waveNumber % 3 === 0 && !isBossWave;

      if (isShopWave) {
        this.registry.set('shopNextWave', nextWave);
        this.scene.pause();
        this.scene.launch('ShopScene');
      } else {
        this.registry.set('upgradeCards', upgradeCards);
        this.registry.set('upgradeWave', nextWave);
        this.scene.pause();
        this.scene.launch('UpgradeScene');
      }
    });
  }

  private showBonusGears(n: number): void {
    const t = this.add.text(GAME_WIDTH / 2, 250, `+${n} ⚙ bonus gears!`, {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial',
      color: '#aaaadd',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(55).setAlpha(0);

    this.tweens.add({
      targets: t,
      alpha: 1,
      y: 220,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(900, () => {
          this.tweens.add({
            targets: t,
            alpha: 0,
            y: 190,
            duration: 300,
            onComplete: () => t.destroy(),
          });
        });
      },
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
    if (!this.scene.isActive('UIScene')) return;
    const ui = this.scene.get('UIScene') as Phaser.Scene & { updateState?: (s: GameState) => void };
    if (ui?.updateState) {
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

    // Persist gears earned this run
    MetaProgress.addGears(this.gearsThisRun);

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
    const cy = GAME_HEIGHT / 2 - 10;
    const panel = this.add.container(cx, cy).setDepth(110);

    const glow = this.add.rectangle(0, 0, 616, 556, 0xe74c3c, 0.1);
    const bg = this.add.rectangle(0, 0, 600, 540, 0x080808, 0.95);
    bg.setStrokeStyle(2, 0xe74c3c);

    const title = this.add.text(0, -230, 'GAME OVER', {
      fontSize: '72px',
      fontFamily: 'Arial Black, Arial',
      color: '#e74c3c',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    const waveText = this.add.text(0, -158, `Wave: ${reached}`, {
      fontSize: '28px',
      fontFamily: 'Arial Black, Arial',
      color: '#ecf0f1',
    }).setOrigin(0.5);

    const recordText = isNewRecord
      ? this.add.text(0, -124, '🏆 NEW RECORD!', {
          fontSize: '22px',
          fontFamily: 'Arial Black, Arial',
          color: '#ffd700',
        }).setOrigin(0.5)
      : this.add.text(0, -124, `Best: ${best}`, {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#666666',
        }).setOrigin(0.5);

    const coinsText = this.add.text(0, -86, `Coins collected: ${this.gameState.coins}`, {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#ffd700',
    }).setOrigin(0.5);

    const upgradesText = this.add.text(0, -55, `Upgrades taken: ${this.player.upgradeState.activeUpgrades.length}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Separator
    const sep = this.add.rectangle(0, -32, 400, 1, 0x444444);

    // Gear count-up animation
    const gearsEarned = this.gearsThisRun;
    const totalGears = MetaProgress.getGears();
    const gearsObj = { value: 0 };

    const gearsText = this.add.text(0, -12, '⚙ Gears earned this run: 0', {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#aaaadd',
    }).setOrigin(0.5);

    const totalText = this.add.text(0, 18, `⚙ Total gears: ${totalGears}`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#777799',
    }).setOrigin(0.5);

    // Count-up animation
    this.tweens.add({
      targets: gearsObj,
      value: gearsEarned,
      duration: 1000,
      ease: 'Power2',
      onUpdate: () => {
        gearsText.setText(`⚙ Gears earned this run: ${Math.floor(gearsObj.value)}`);
      },
      onComplete: () => {
        gearsText.setText(`⚙ Gears earned this run: ${gearsEarned}`);
      },
    });

    const tryAgainBtn = this.add.text(0, 80, '[ TRY AGAIN ]', {
      fontSize: '34px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    tryAgainBtn.on('pointerover', () => tryAgainBtn.setColor('#ffffff'));
    tryAgainBtn.on('pointerout', () => tryAgainBtn.setColor('#4ecdc4'));
    tryAgainBtn.on('pointerdown', () => this.scene.start('GameScene'));

    // Workshop button (pulsing glow if player has unspent gears)
    const workshopGlowRect = this.add.rectangle(0, 135, 260, 46, 0xffaa00, 0);
    const workshopBtn = this.add.text(0, 135, '[ ⚙ VISIT WORKSHOP ]', {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffcc66',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    if (totalGears > 0) {
      this.tweens.add({
        targets: workshopGlowRect,
        alpha: 0.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    workshopBtn.on('pointerover', () => workshopBtn.setColor('#ffffff'));
    workshopBtn.on('pointerout', () => workshopBtn.setColor('#ffcc66'));
    workshopBtn.on('pointerdown', () => {
      MetaProgress.markWorkshopVisited();
      this.scene.start('WorkshopScene');
    });

    const menuBtn = this.add.text(0, 190, '[ MAIN MENU ]', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#888888'));
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // First-time workshop nudge
    const firstTime = !MetaProgress.hasVisitedWorkshop() && gearsEarned > 0;
    const nudge = firstTime
      ? this.add.text(0, 222, '↑ Spend your gears here to grow stronger!', {
          fontSize: '13px',
          fontFamily: 'Arial',
          color: '#ffaa44',
        }).setOrigin(0.5)
      : this.add.text(0, 0, '', { fontSize: '1px' });

    panel.add([
      glow, bg,
      title, waveText, recordText, coinsText, upgradesText,
      sep, gearsText, totalText,
      tryAgainBtn,
      workshopGlowRect, workshopBtn, menuBtn,
      nudge,
    ]);

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

  // ── Shop integration ────────────────────────────────────────────────────────

  getCoins(): number { return this.gameState.coins; }

  spendCoins(amount: number): boolean {
    if (this.gameState.coins < amount) return false;
    this.gameState.coins -= amount;
    this.updateUI();
    return true;
  }

  applyShopItem(id: string): void {
    const p = this.player;
    const u = p.upgradeState;
    switch (id) {
      case 'small_potion':     p.heal(15); break;
      case 'health_potion':    p.heal(30); break;
      case 'full_heal':        p.hp = p.maxHp; break;
      case 'coin_sack':        this.gameState.coins += 20; break;
      case 'quick_snack':      p.maxHp += 5; p.hp = p.maxHp; break;
      case 'coin_magnet_shop': u.magnetRadius += 350; break;
      case 'damage_boost_shop':
        u.damageMult *= 1.10;
        p.meleeDamage = Math.round(p.meleeDamage * 1.10);
        break;
      case 'hp_boost_shop':      p.maxHp += 20; p.heal(20); break;
      case 'speed_boost_shop':   u.speedMult *= 1.08; break;
      case 'attack_speed_shop':  u.cooldownMult = Math.max(0.25, u.cooldownMult * 0.90); break;
      case 'lucky_coins':        u.bonusCoinDrop += 1; break;
      case 'gear_up':            u.gearDropBonus = Math.min(0.95, u.gearDropBonus + 0.02); break;
      case 'vampire_blade':      u.lifestealHp += 5; break;
      case 'thorns_shop':        u.thorns += 8; break;
      case 'double_strike':      u.doubleStrikeChance = Math.min(0.6, u.doubleStrikeChance + 0.20); break;
      case 'phoenix_feather':    p.reviveCharges += 1; break;
    }
    this.gameState.hp = p.hp;
    this.gameState.maxHp = p.maxHp;
  }

  private applyShopEffects(effects: string[], nextWave: number): void {
    if (effects.includes('time_slow')) {
      this.physics.world.timeScale = 0.7;
    }
    this.waveManager.startWave(nextWave);
    if (effects.includes('bomb')) {
      this.time.delayedCall(1800, () => this.fireBomb());
    }
  }

  private fireBomb(): void {
    if (this.gameOver) return;
    this.enemies.getChildren().forEach(e => {
      const enemy = e as Enemy;
      if (enemy.active) enemy.takeDamage(50);
    });
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const p = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 8, 0xff6600).setDepth(30);
      this.tweens.add({
        targets: p,
        x: GAME_WIDTH / 2 + Math.cos(angle) * 500,
        y: GAME_HEIGHT / 2 + Math.sin(angle) * 350,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '💣 BOOM!', {
      fontSize: '52px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff6600',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(31).setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      duration: 80,
      onComplete: () => {
        this.time.delayedCall(500, () => {
          this.tweens.add({
            targets: t,
            y: t.y - 80,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => t.destroy(),
          });
        });
      },
    });
  }

  private showDoubleText(x: number, y: number): void {
    const t = this.add.text(x + 20, y - 48, '×2!', {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#ff9900',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: t,
      y: y - 96,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }
}
