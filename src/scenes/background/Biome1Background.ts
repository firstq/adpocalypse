import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../../config';

const BG_TOP = 0x1a1a3a;
const BG_BOT = 0x2a2a5a;
const ICON_COLORS = [0x6366f1, 0x818cf8, 0xa78bfa, 0xc4b5fd];
const TICKER_SPEED = 50; // px/sec

const TICKER_MESSAGES = [
  '> CONNECTED TO INTERNET',
  '> 1,247 ADS BLOCKED TODAY',
  '> SYSTEM STATUS: NORMAL',
  '> CACHE CLEARED SUCCESSFULLY',
  '> 99 NEW NOTIFICATIONS',
  '> WARNING: COOKIE OVERFLOW DETECTED',
];

type Particle = {
  text: Phaser.GameObjects.Text;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
};

type Icon = {
  rect: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
};

export class Biome1Background {
  private readonly scene: Phaser.Scene;
  private icons: Icon[] = [];
  private particles: Particle[] = [];
  private tickerText!: Phaser.GameObjects.Text;
  private tickerX = GAME_WIDTH;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    this.buildGradient();
    this.buildGrid();
    this.buildBrowserWindows();
    this.buildDesktopIcons();
    this.buildParticles();
    this.buildVignette();
    this.buildStatusBar();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.updateIcons(dt);
    this.updateParticles(delta);
    this.updateTicker(dt);
  }

  private buildGradient(): void {
    const g = this.scene.add.graphics().setDepth(-10);
    g.fillGradientStyle(BG_TOP, BG_TOP, BG_BOT, BG_BOT, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private buildGrid(): void {
    const g = this.scene.add.graphics().setDepth(-9);
    g.lineStyle(1, 0x3a3a6a, 0.25);
    for (let x = 0; x <= GAME_WIDTH; x += 80) {
      g.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y <= GAME_HEIGHT; y += 80) {
      g.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private buildBrowserWindows(): void {
    const DEFS = [
      { x: -30,  y: 110, w: 160, h: 110, drift: 12, period: 22000, delay:     0 },
      { x:  730, y: 180, w: 200, h: 140, drift: 15, period: 28000, delay:  7000 },
      { x:  310, y: 460, w: 140, h:  90, drift: 10, period: 24000, delay:  3500 },
      { x: 1140, y: 300, w: 180, h: 120, drift: 14, period: 30000, delay: 11000 },
      { x:  160, y: 560, w: 130, h:  85, drift: 11, period: 20000, delay:  5500 },
    ];

    const DOT_COLORS = [0xef4444, 0xeab308, 0x22c55e];

    for (const def of DEFS) {
      const c = this.scene.add.container(def.x, def.y);
      c.setDepth(-8);
      c.setAlpha(0.12);

      // Body and title bar use origin (0.5, 0.5) — position them at their center
      const body     = this.scene.add.rectangle(def.w / 2, def.h / 2, def.w, def.h, 0x4338ca);
      const titleBar = this.scene.add.rectangle(def.w / 2, 5, def.w, 10, 0x3730a3);
      const dots     = DOT_COLORS.map((col, i) =>
        this.scene.add.rectangle(10 + i * 13, 5, 5, 5, col),
      );

      c.add([body, titleBar, ...dots]);

      this.scene.tweens.add({
        targets: c,
        y: def.y + def.drift,
        duration: def.period / 2,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: def.delay,
      });
    }
  }

  private buildDesktopIcons(): void {
    for (let i = 0; i < 7; i++) {
      const x     = Phaser.Math.Between(30, GAME_WIDTH - 30);
      const y     = Phaser.Math.Between(30, GAME_HEIGHT - 40);
      const color = Phaser.Utils.Array.GetRandom(ICON_COLORS);
      const rect  = this.scene.add.rectangle(x, y, 24, 24, color, 0.1).setDepth(-7);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(5, 10);
      this.icons.push({ rect, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    }
  }

  private buildParticles(): void {
    for (let i = 0; i < 10; i++) {
      this.spawnParticle();
    }
  }

  private spawnParticle(): void {
    const chars  = ['0', '1', '0', '1', '·'];
    const char   = Phaser.Utils.Array.GetRandom(chars);
    const x      = Phaser.Math.Between(0, GAME_WIDTH);
    const y      = Phaser.Math.Between(80, GAME_HEIGHT - 60);
    const maxAge = Phaser.Math.Between(8000, 12000);
    const vx     = Phaser.Math.FloatBetween(-2, 2);
    const vy     = Phaser.Math.FloatBetween(-8, -5);

    const text = this.scene.add.text(x, y, char, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#a78bfa',
    }).setAlpha(0).setDepth(-6);

    this.scene.tweens.add({
      targets: text,
      alpha: Phaser.Math.FloatBetween(0.3, 0.4),
      duration: 1000,
    });

    this.particles.push({ text, x, y, vx, vy, age: 0, maxAge });
  }

  private buildVignette(): void {
    const g = this.scene.add.graphics().setDepth(-3);

    // Each edge: fade from dark at the screen edge toward background color at the inner boundary
    g.fillGradientStyle(0x000000, BG_TOP, 0x000000, BG_BOT, 0.5);
    g.fillRect(0, 0, 140, GAME_HEIGHT);

    g.fillGradientStyle(BG_TOP, 0x000000, BG_BOT, 0x000000, 0.5);
    g.fillRect(GAME_WIDTH - 140, 0, 140, GAME_HEIGHT);

    g.fillGradientStyle(0x000000, 0x000000, BG_TOP, BG_TOP, 0.4);
    g.fillRect(0, 0, GAME_WIDTH, 80);

    g.fillGradientStyle(BG_BOT, BG_BOT, 0x000000, 0x000000, 0.4);
    g.fillRect(0, GAME_HEIGHT - 80, GAME_WIDTH, 80);
  }

  private buildStatusBar(): void {
    const BAR_H = 16;
    const barY  = GAME_HEIGHT - BAR_H / 2;

    this.scene.add.rectangle(GAME_WIDTH / 2, barY, GAME_WIDTH, BAR_H, 0x1e293b)
      .setAlpha(0.6)
      .setDepth(-1);

    this.tickerText = this.scene.add.text(
      GAME_WIDTH,
      barY,
      TICKER_MESSAGES.join('     '),
      { fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' },
    ).setOrigin(0, 0.5).setDepth(-1);

    this.tickerX = GAME_WIDTH;
  }

  private updateIcons(dt: number): void {
    for (const icon of this.icons) {
      icon.rect.x += icon.vx * dt;
      icon.rect.y += icon.vy * dt;
      if (icon.rect.x < -20)              icon.rect.x = GAME_WIDTH + 20;
      if (icon.rect.x > GAME_WIDTH + 20)  icon.rect.x = -20;
      if (icon.rect.y < -20)              icon.rect.y = GAME_HEIGHT + 20;
      if (icon.rect.y > GAME_HEIGHT + 20) icon.rect.y = -20;
    }
  }

  private updateParticles(delta: number): void {
    const dt   = delta / 1000;
    const dead: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += delta;
      p.x   += p.vx * dt;
      p.y   += p.vy * dt;
      p.text.setPosition(p.x, p.y);

      // Fade out in the last 1.5 s
      if (p.age > p.maxAge - 1500) {
        const progress = (p.age - (p.maxAge - 1500)) / 1500;
        p.text.setAlpha(Math.max(0, 0.35 * (1 - progress)));
      }

      if (p.age >= p.maxAge) {
        p.text.destroy();
        dead.push(i);
      }
    }

    for (let i = dead.length - 1; i >= 0; i--) {
      this.particles.splice(dead[i], 1);
    }
    for (let i = 0; i < dead.length; i++) {
      this.spawnParticle();
    }
  }

  private updateTicker(dt: number): void {
    this.tickerX -= TICKER_SPEED * dt;
    const textW = this.tickerText?.width || 1000;
    if (this.tickerX < -textW) {
      this.tickerX = GAME_WIDTH;
    }
    this.tickerText?.setX(this.tickerX);
  }
}
