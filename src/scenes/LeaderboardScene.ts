import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { sdkInstance } from '../systems/sdk';
import { LeaderboardEntry } from '../systems/YandexSDK';
import { t } from '../i18n';

const CX = GAME_WIDTH / 2;
const PANEL_W = 560;

// Column x-positions inside the panel
const COL_RANK  = CX - 230;   // centered
const COL_NAME  = CX - 175;   // left-origin
const COL_SCORE = CX + 220;   // centered

export class LeaderboardScene extends Phaser.Scene {
  private contentObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(CX, 52, t('leaderboard.title'), {
      fontSize: '52px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Loading shown until data arrives
    this.addContent(this.add.text(CX, GAME_HEIGHT / 2, t('leaderboard.loading'), {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#888888',
    }).setOrigin(0.5));

    const closeBtn = this.add.text(CX, GAME_HEIGHT - 50, t('settings.close'), {
      fontSize: '26px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout',  () => closeBtn.setColor('#4ecdc4'));
    closeBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    void this.fetchEntries();
  }

  // ─────────────────────────────────────────────────────────────────────────────

  private addContent(...objs: Phaser.GameObjects.GameObject[]): void {
    for (const obj of objs) this.contentObjects.push(obj);
  }

  private clearContent(): void {
    this.contentObjects.forEach(o => o.destroy());
    this.contentObjects = [];
  }

  private async fetchEntries(): Promise<void> {
    if (!sdkInstance.isLoggedIn()) {
      this.clearContent();
      this.showNotLoggedIn();
      return;
    }

    const entries = await sdkInstance.getLeaderboardEntries('best_wave', 10);
    this.clearContent();

    if (entries.length === 0) {
      this.showEmpty();
    } else {
      this.showEntries(entries);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  private showNotLoggedIn(): void {
    const cy = GAME_HEIGHT / 2 - 36;

    this.addContent(
      this.add.rectangle(CX, cy + 16, PANEL_W, 140, 0x0f1629).setStrokeStyle(1, 0x334466),
      this.add.text(CX, cy, t('leaderboard.notAvailable'), {
        fontSize: '19px',
        fontFamily: 'Arial',
        color: '#888888',
        align: 'center',
      }).setOrigin(0.5),
    );

    // Sign-in button
    const btnY = cy + 78;
    const btnBg  = this.add.rectangle(CX, btnY, 200, 50, 0x1a3a6a)
      .setStrokeStyle(2, 0x4ecdc4).setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(CX, btnY, t('leaderboard.signIn'), {
      fontSize: '20px',
      fontFamily: 'Arial Black, Arial',
      color: '#4ecdc4',
    }).setOrigin(0.5);
    this.addContent(btnBg, btnTxt);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x1f4a8a));
    btnBg.on('pointerout',  () => btnBg.setFillStyle(0x1a3a6a));
    btnBg.on('pointerdown', () => {
      btnBg.disableInteractive();
      btnTxt.setText(t('common.loading'));
      void sdkInstance.openAuthDialog().then(() => {
        if (sdkInstance.isLoggedIn()) {
          this.clearContent();
          this.addContent(this.add.text(CX, GAME_HEIGHT / 2, t('leaderboard.loading'), {
            fontSize: '22px', fontFamily: 'Arial', color: '#888888',
          }).setOrigin(0.5));
          void this.fetchEntries();
        } else {
          btnBg.setInteractive({ useHandCursor: true });
          btnTxt.setText(t('leaderboard.signIn'));
        }
      });
    });
  }

  private showEmpty(): void {
    this.addContent(
      this.add.rectangle(CX, GAME_HEIGHT / 2, PANEL_W, 100, 0x0f1629).setStrokeStyle(1, 0x334466),
      this.add.text(CX, GAME_HEIGHT / 2, t('leaderboard.empty'), {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#888888',
        align: 'center',
      }).setOrigin(0.5),
    );
  }

  private showEntries(entries: LeaderboardEntry[]): void {
    const HEADER_Y     = 122;
    const SEP_Y        = HEADER_Y + 20;
    const ENTRY_START  = SEP_Y + 18;
    const ROW_H        = 32;
    const PANEL_TOP    = HEADER_Y - 14;
    const PANEL_BOTTOM = ENTRY_START + entries.length * ROW_H + 14;
    const PANEL_CY     = (PANEL_TOP + PANEL_BOTTOM) / 2;
    const PANEL_H      = PANEL_BOTTOM - PANEL_TOP;

    // Panel background
    this.addContent(
      this.add.rectangle(CX, PANEL_CY, PANEL_W, PANEL_H, 0x0f1629).setStrokeStyle(1, 0x334466),
    );

    // Column headers
    const hStyle = { fontSize: '13px', fontFamily: 'Arial Black, Arial', color: '#556677' };
    this.addContent(
      this.add.text(COL_RANK,  HEADER_Y, t('leaderboard.rank'),   hStyle).setOrigin(0.5),
      this.add.text(CX,        HEADER_Y, t('leaderboard.player'), hStyle).setOrigin(0.5),
      this.add.text(COL_SCORE, HEADER_Y, t('leaderboard.wave'),   hStyle).setOrigin(0.5),
    );

    // Separator
    this.addContent(this.add.rectangle(CX, SEP_Y, PANEL_W - 16, 1, 0x334466));

    // Entry rows
    const monoStyle  = { fontSize: '15px', fontFamily: 'monospace' };
    const nameStyle  = { fontSize: '15px', fontFamily: 'Arial', color: '#ecf0f1' };

    entries.forEach((entry, i) => {
      const y = ENTRY_START + i * ROW_H;
      const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#bbbbbb';
      const name = entry.name || t('leaderboard.player');

      this.addContent(
        this.add.text(COL_RANK,  y, String(entry.rank),          { ...monoStyle, color: rankColor }).setOrigin(0.5),
        this.add.text(COL_NAME,  y, name.substring(0, 26),       nameStyle).setOrigin(0, 0.5),
        this.add.text(COL_SCORE, y, String(entry.score),         { ...monoStyle, color: rankColor }).setOrigin(0.5),
      );
    });
  }
}
