import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Button } from '../ui/Button';
import { AudioManager } from '../systems/AudioManager';
import { MetaProgress } from '../systems/MetaProgress';
import { adManager, sdkInstance } from '../systems/sdk';
import { LeaderboardEntry } from '../systems/YandexSDK';
import { t, setLanguage, getLanguage, Language } from '../i18n';

export class MenuScene extends Phaser.Scene {
  private audio!: AudioManager;
  private debugPanel: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.audio = new AudioManager(this);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.spawnBgDecorations();

    this.add.text(GAME_WIDTH / 2, 185, 'ADPOCALYPSE', {
      fontSize: '96px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
      stroke: '#0a0a1a',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 285, t('menu.subtitle'), {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#a8dadc',
    }).setOrigin(0.5);

    const bestWave = parseInt(localStorage.getItem('bestWave') || '0');
    if (bestWave > 0) {
      this.add.text(GAME_WIDTH / 2, 320, t('menu.best_wave', { wave: bestWave }), {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffd700',
      }).setOrigin(0.5);
    }

    new Button(this, GAME_WIDTH / 2, 390, 200, 60, t('menu.play'), () => {
      this.scene.start('GameScene');
    });

    const gears = MetaProgress.getGears();
    new Button(this, GAME_WIDTH / 2, 468, 220, 54, t('menu.workshop', { gears }), () => {
      MetaProgress.markWorkshopVisited();
      this.scene.start('WorkshopScene');
    }, 0x334466);

    const lbBtn = new Button(this, GAME_WIDTH / 2, 540, 220, 50, t('menu.leaderboard'), () => {
      lbBtn.setLabel(t('common.loading'));
      void sdkInstance.getLeaderboardEntries('best_wave', 10).then(entries => {
        lbBtn.setLabel(t('menu.leaderboard'));
        this.showLeaderboardModal(entries);
      });
    }, 0x1a3a6a);

    const muteBtn = new Button(this, GAME_WIDTH / 2, 602, 200, 50, this.muteLabel(), () => {
      this.audio.setMuted(!this.audio.isMuted());
      muteBtn.setLabel(this.muteLabel());
    }, 0x555555);

    new Button(this, GAME_WIDTH / 2, 660, 200, 46, t('credits.title'), () => {
      this.scene.start('CreditsScene');
    }, 0x1a2a4a);

    const settingsBtn = this.add.image(GAME_WIDTH - 20, 28, 'icon-gear')
      .setDisplaySize(28, 28).setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true }).setDepth(5);

    settingsBtn.on('pointerover', () => settingsBtn.setAlpha(0.7));
    settingsBtn.on('pointerout',  () => settingsBtn.setAlpha(1));
    settingsBtn.on('pointerdown', () => this.openSettings());

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 16, t('menu.controls'), {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#7f8c8d',
    }).setOrigin(0.5);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (event.ctrlKey && event.shiftKey && event.code === 'KeyR') {
          const confirmed = window.confirm('Reset ALL progress (gears, upgrades, best wave)? This cannot be undone.');
          if (confirmed) {
            MetaProgress.resetAll();
            this.scene.restart();
          }
        }
        if (event.ctrlKey && event.shiftKey && event.code === 'KeyD') {
          this.toggleDebugOverlay();
        }
      });
    }
  }

  private muteLabel(): string {
    return this.audio.isMuted() ? t('menu.sound_muted') : t('menu.sound_on');
  }

  private openSettings(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const closeAll = () => objects.forEach(o => o.destroy());
    const objects: Phaser.GameObjects.GameObject[] = [];

    const dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72)
      .setDepth(100).setInteractive();
    objects.push(dim);

    const panel = this.add.rectangle(cx, cy, 440, 430, 0x12122a)
      .setStrokeStyle(2, 0x4ecdc4).setDepth(101);
    objects.push(panel);

    const title = this.add.text(cx, cy - 190, t('settings.title'), {
      fontSize: '30px', fontFamily: 'Arial Black, Arial', color: '#4ecdc4',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(102);
    objects.push(title);

    // Mute toggle
    const muteRow = this.add.text(cx, cy - 122, this.muteSettingsLabel(), {
      fontSize: '18px', fontFamily: 'Arial', color: '#ecf0f1',
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    objects.push(muteRow);
    muteRow.on('pointerover', () => muteRow.setColor('#ffd700'));
    muteRow.on('pointerout',  () => muteRow.setColor('#ecf0f1'));
    muteRow.on('pointerdown', () => {
      this.audio.setMuted(!this.audio.isMuted());
      muteRow.setText(this.muteSettingsLabel());
    });

    // SFX Volume label
    const volLabel = this.add.text(cx, cy - 66, t('settings.sfx_volume'), {
      fontSize: '15px', fontFamily: 'Arial Black, Arial', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(102);
    objects.push(volLabel);

    // Slider
    const trackW = 280;
    const trackX = cx - trackW / 2;
    const trackY = cy - 26;

    const trackBg = this.add.rectangle(cx, trackY, trackW, 8, 0x333333).setDepth(102);
    objects.push(trackBg);

    let currentVol = this.audio.getSfxVolume();
    const fillBar = this.add.rectangle(trackX, trackY, trackW * currentVol, 8, 0x4ecdc4)
      .setOrigin(0, 0.5).setDepth(103);
    objects.push(fillBar);

    const handle = this.add.circle(trackX + trackW * currentVol, trackY, 10, 0xffffff).setDepth(104);
    objects.push(handle);

    const volPct = this.add.text(cx + trackW / 2 + 18, trackY, `${Math.round(currentVol * 100)}%`, {
      fontSize: '14px', fontFamily: 'Arial', color: '#ecf0f1',
    }).setOrigin(0, 0.5).setDepth(102);
    objects.push(volPct);

    const hitArea = this.add.rectangle(cx, trackY, trackW, 28, 0xffffff, 0)
      .setDepth(105).setInteractive({ useHandCursor: true });
    objects.push(hitArea);

    const applyVol = (ptr: Phaser.Input.Pointer) => {
      const relX = Phaser.Math.Clamp(ptr.x - trackX, 0, trackW);
      currentVol = relX / trackW;
      this.audio.setSfxVolume(currentVol);
      fillBar.setSize(Math.max(1, trackW * currentVol), 8);
      handle.setX(trackX + trackW * currentVol);
      volPct.setText(`${Math.round(currentVol * 100)}%`);
    };
    hitArea.on('pointerdown', applyVol);
    hitArea.on('pointermove', (ptr: Phaser.Input.Pointer) => { if (ptr.isDown) applyVol(ptr); });

    // Language toggle
    const langLabelY = cy + 30;
    const langLabel = this.add.text(cx, langLabelY, t('settings.language'), {
      fontSize: '15px', fontFamily: 'Arial Black, Arial', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(102);
    objects.push(langLabel);

    const btnW = 150;
    const btnH = 44;
    const langBtnY = langLabelY + 36;
    const current = getLanguage();

    const buildLangBtn = (lang: Language, bx: number, labelKey: string) => {
      const isActive = current === lang;
      const btnBg = this.add.rectangle(bx, langBtnY, btnW, btnH, isActive ? 0x1a3a2a : 0x1a1a2e)
        .setStrokeStyle(2, isActive ? 0xffd700 : 0x334155).setDepth(102).setInteractive({ useHandCursor: true });
      const btnText = this.add.text(bx, langBtnY, t(labelKey), {
        fontSize: '16px', fontFamily: 'Arial Black, Arial',
        color: isActive ? '#ffd700' : '#aaaaaa',
      }).setOrigin(0.5).setDepth(103);
      objects.push(btnBg, btnText);

      if (!isActive) {
        btnBg.on('pointerover', () => { btnBg.setFillStyle(0x222233); btnText.setColor('#ffffff'); });
        btnBg.on('pointerout',  () => { btnBg.setFillStyle(0x1a1a2e); btnText.setColor('#aaaaaa'); });
        btnBg.on('pointerdown', () => {
          setLanguage(lang);
          closeAll();
          this.scene.restart();
        });
      }
    };

    buildLangBtn('ru', cx - 82, 'settings.lang_ru');
    buildLangBtn('en', cx + 82, 'settings.lang_en');

    // Close button
    const closeBtn = this.add.text(cx, cy + 175, t('settings.close'), {
      fontSize: '24px', fontFamily: 'Arial Black, Arial', color: '#4ecdc4',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    objects.push(closeBtn);

    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout',  () => closeBtn.setColor('#4ecdc4'));
    closeBtn.on('pointerdown', closeAll);
    dim.on('pointerdown', closeAll);
  }

  private showLeaderboardModal(entries: LeaderboardEntry[]): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const closeAll = () => objects.forEach(o => o.destroy());
    const objects: Phaser.GameObjects.GameObject[] = [];

    const dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78)
      .setDepth(100).setInteractive();
    objects.push(dim);

    const panelH = Math.max(280, entries.length * 28 + 110);
    const panel = this.add.rectangle(cx, cy, 500, panelH, 0x0f1629)
      .setStrokeStyle(2, 0x4ecdc4).setDepth(101);
    objects.push(panel);

    const title = this.add.text(cx, cy - panelH / 2 + 28, t('menu.leaderboard'), {
      fontSize: '26px', fontFamily: 'Arial Black, Arial', color: '#4ecdc4',
    }).setOrigin(0.5).setDepth(102);
    objects.push(title);

    if (entries.length === 0) {
      const empty = this.add.text(cx, cy, t('menu.leaderboard_unavailable'), {
        fontSize: '16px', fontFamily: 'Arial', color: '#666666', align: 'center',
      }).setOrigin(0.5).setDepth(102);
      objects.push(empty);
    } else {
      const startY = cy - panelH / 2 + 70;
      entries.forEach((entry, i) => {
        const y = startY + i * 28;
        const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#aaaaaa';
        const row = this.add.text(cx, y,
          `${String(entry.rank).padEnd(4)} ${entry.name.substring(0, 20).padEnd(22)} ${entry.score}`,
          { fontSize: '14px', fontFamily: 'monospace', color: rankColor },
        ).setOrigin(0.5).setDepth(102);
        objects.push(row);
      });
    }

    const closeBtn = this.add.text(cx, cy + panelH / 2 - 28, t('settings.close'), {
      fontSize: '20px', fontFamily: 'Arial Black, Arial', color: '#4ecdc4',
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    objects.push(closeBtn);

    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout',  () => closeBtn.setColor('#4ecdc4'));
    closeBtn.on('pointerdown', closeAll);
    dim.on('pointerdown', closeAll);
  }

  private toggleDebugOverlay(): void {
    if (this.debugPanel) {
      this.debugPanel.destroy();
      this.debugPanel = null;
      return;
    }

    const lines = [
      `SDK: ${sdkInstance.isYandex() ? 'Yandex' : 'fallback'}`,
      `Logged in: ${sdkInstance.isLoggedIn() ? 'yes' : 'no'}`,
      `Last ad: ${adManager.lastInterstitialAge}s ago`,
      `Can interstitial: ${adManager.canShowInterstitial() ? 'yes' : 'no'}`,
    ];

    const bg = this.add.rectangle(110, 80, 240, lines.length * 22 + 16, 0x000000, 0.85)
      .setStrokeStyle(1, 0x4ecdc4).setDepth(500);
    const label = this.add.text(110, 80, lines.join('\n'), {
      fontSize: '13px', fontFamily: 'monospace', color: '#4ecdc4',
      lineSpacing: 4,
    }).setOrigin(0.5).setDepth(500);

    this.debugPanel = this.add.container(0, 0).setDepth(500);
    this.debugPanel.add([bg, label]);
  }

  private muteSettingsLabel(): string {
    return this.audio.isMuted() ? t('settings.sound_muted') : t('settings.sound_on');
  }

  private spawnBgDecorations(): void {
    const labels = ['✕ CLOSE', 'ACCEPT COOKIES', 'YOU WON!', '★ SUBSCRIBE', '* PREMIUM'];
    const colors = [0xe74c3c, 0xf39c12, 0xf1c40f, 0x9b59b6, 0x3498db];

    for (let i = 0; i < 6; i++) {
      const idx = i % labels.length;
      const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      const y = Phaser.Math.Between(50, GAME_HEIGHT - 50);
      const w = Phaser.Math.Between(80, 180);
      const h = Phaser.Math.Between(30, 60);

      const container = this.add.container(x, y);
      const rect = this.add.rectangle(0, 0, w, h, colors[idx], 0.15);
      const text = this.add.text(0, 0, labels[idx], {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5).setAlpha(0.3);
      container.add([rect, text]);
      container.setAlpha(0.4);

      this.tweens.add({
        targets: container,
        x: x + Phaser.Math.Between(-80, 80),
        y: y + Phaser.Math.Between(-40, 40),
        duration: Phaser.Math.Between(4000, 8000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
