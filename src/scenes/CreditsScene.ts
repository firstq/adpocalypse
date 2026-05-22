import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { t } from '../i18n';

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CreditsScene' });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Panel: center y=355, height=420 → top=145, bottom=565
    this.add.rectangle(cx, 355, 700, 420, 0x12122a)
      .setStrokeStyle(2, 0x4ecdc4);

    this.add.text(cx, 170, t('credits.title'), {
      fontSize: '28px', fontFamily: 'Arial Black, Arial', color: '#4ecdc4',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    // ── Icons ──────────────────────────────────────────────────────────────────
    this.header(cx, 207, t('credits.icons'));
    this.row(cx, 227, 'game-icons.net (CC BY 3.0)', '#ecf0f1', '13px');
    this.row(cx, 242, 'Lorc, Delapouite, sbed, zeromancer', '#aaaaaa', '12px');
    this.row(cx, 257, 'https://game-icons.net', '#4ecdc4', '12px');
    this.row(cx, 270, 'creativecommons.org/licenses/by/3.0/', '#666666', '11px');

    // ── Audio ──────────────────────────────────────────────────────────────────
    this.header(cx, 292, t('credits.audio'));
    this.row(cx, 312, 'Kenney.nl (CC0)', '#ecf0f1', '13px');
    this.row(cx, 327, 'https://kenney.nl', '#4ecdc4', '12px');

    // ── Game icon ──────────────────────────────────────────────────────────────
    this.header(cx, 350, t('credits.gameIcon'));
    this.row(cx, 370, 'Generated via Yandex Alice (YandexART)', '#ecf0f1', '13px');

    // ── Development ────────────────────────────────────────────────────────────
    this.header(cx, 392, t('credits.development'));
    this.row(cx, 412, 'Sergei Tiurikov', '#ecf0f1', '13px');
    this.row(cx, 427, 'Made with Phaser 3 + TypeScript', '#aaaaaa', '13px');

    // Close button — 28 px above panel bottom (565)
    const closeBtn = this.add.text(cx, 537, t('settings.close'), {
      fontSize: '22px', fontFamily: 'Arial Black, Arial', color: '#4ecdc4',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout',  () => closeBtn.setColor('#4ecdc4'));
    closeBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private header(x: number, y: number, label: string): void {
    this.add.text(x, y, label, {
      fontSize: '14px', fontFamily: 'Arial Black, Arial', color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  private row(x: number, y: number, text: string, color: string, fontSize: string): void {
    this.add.text(x, y, text, {
      fontSize, fontFamily: 'Arial', color,
    }).setOrigin(0.5);
  }
}
