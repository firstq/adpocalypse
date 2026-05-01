export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PLAYER_HP = 100;
export const PLAYER_SPEED = 200;
export const PLAYER_MELEE_DAMAGE = 20;
export const PLAYER_MELEE_RANGE = 80;
export const PLAYER_MELEE_ANGLE = 90;
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
  spamEmail: 0xf0f0f0,
  autoplayVideo: 0x2980b9,
  bossPopup: 0xff4500,
  coin: 0xffd700,
  gear: 0x999999,
  projectile: 0x9b59b6,
  hpBar: 0x2ecc71,
  hpBarBg: 0x7f8c8d,
  ui: 0xecf0f1,
};

export interface UpgradeDef {
  id: string;
  icon: string;
  label: string;
  description: string;
}

export const UPGRADE_POOL: UpgradeDef[] = [
  { id: 'hp_boost',     icon: '❤️',  label: '+25 Max HP',      description: 'Increase maximum HP by 25 and heal immediately.' },
  { id: 'hp_restore',   icon: '💊',  label: 'Full Heal',       description: 'Restore all HP to current maximum.' },
  { id: 'damage_boost', icon: '⚔️',  label: '+25% Damage',     description: 'All attacks deal 25% more damage.' },
  { id: 'speed_boost',  icon: '👟',  label: '+20% Speed',      description: 'Move 20% faster.' },
  { id: 'attack_speed', icon: '⚡',  label: 'Faster Attacks',  description: 'Attack cooldown reduced by 25%.' },
  { id: 'lifesteal',    icon: '🩸',  label: 'Lifesteal',       description: 'Heal 5 HP each time you kill an enemy.' },
  { id: 'crit',         icon: '💥',  label: 'Critical Hits',   description: '25% chance to deal double damage.' },
  { id: 'magnet',       icon: '🧲',  label: 'Coin Magnet',     description: 'Coins fly toward you automatically.' },
  { id: 'thorns',       icon: '🌵',  label: 'Thorns',          description: 'Reflect 5 damage to enemies that hit you.' },
  { id: 'regen',        icon: '🌿',  label: 'Regeneration',    description: 'Recover 1 HP every 2 seconds.' },
  { id: 'double_coins', icon: '💰',  label: 'Double Coins',    description: 'All coin pickups are worth double.' },
  { id: 'wide_swing',   icon: '🌀',  label: 'Wide Swing',      description: 'Attack arc 30% wider and longer.' },
];
