export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PLAYER_HP = 100;
export const PLAYER_SPEED = 200;
export const PLAYER_MELEE_DAMAGE = 20;
export const PLAYER_MELEE_RANGE = 80;
export const PLAYER_MELEE_ANGLE = 90; // degrees
export const PLAYER_INVINCIBILITY_MS = 700;
export const PLAYER_ATTACK_DURATION_MS = 200;

export const COIN_VALUE = 1;

export const COLORS = {
  background: 0x1a1a2e,
  ground: 0x16213e,
  player: 0x4ecdc4,
  popupClose: 0xe74c3c,
  cookieBanner: 0xf39c12,
  premiumPopup: 0xf1c40f,
  coin: 0xffd700,
  projectile: 0x9b59b6,
  hpBar: 0x2ecc71,
  hpBarBg: 0x7f8c8d,
  ui: 0xecf0f1,
};

export const WAVE_DEFINITIONS = [
  { popupClose: 8, cookieBanner: 0, premiumPopup: 0 },
  { popupClose: 12, cookieBanner: 3, premiumPopup: 0 },
  { popupClose: 14, cookieBanner: 4, premiumPopup: 2 },
];
