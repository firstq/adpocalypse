import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

const SFX: Array<[string, string]> = [
  ['sfx_attack',         'assets/audio/sfx/attack.ogg'],
  ['sfx_hit',            'assets/audio/sfx/hit.ogg'],
  ['sfx_player_hurt',    'assets/audio/sfx/player_hurt.ogg'],
  ['sfx_player_death',   'assets/audio/sfx/player_death.ogg'],
  ['sfx_enemy_death',    'assets/audio/sfx/enemy_death.ogg'],
  ['sfx_coin_pickup',    'assets/audio/sfx/coin_pickup.ogg'],
  ['sfx_gear_pickup',    'assets/audio/sfx/gear_pickup.ogg'],
  ['sfx_button_click',   'assets/audio/sfx/button_click.ogg'],
  ['sfx_wave_complete',  'assets/audio/sfx/wave_complete.ogg'],
  ['sfx_upgrade_select', 'assets/audio/sfx/upgrade_select.ogg'],
  ['sfx_purchase',       'assets/audio/sfx/purchase.ogg'],
  ['sfx_reroll',         'assets/audio/sfx/refresh.ogg'],
  ['sfx_boss_appear',    'assets/audio/sfx/boss_appear.ogg'],
  ['shoot',              'assets/audio/sfx/shoot.ogg'],
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const bar = this.add.graphics();
    const bg = this.add.graphics();
    bg.fillStyle(0x222222).fillRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2 - 15, 320, 30);

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(COLORS.hpBar).fillRect(GAME_WIDTH / 2 - 158, GAME_HEIGHT / 2 - 13, 316 * value, 26);
    });

    for (const [key, path] of SFX) {
      this.load.audio(key, path);
    }
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
