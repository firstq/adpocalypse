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

import { UpgradeCategory } from './ui/categories';

export interface UpgradeDef {
  id: string;
  icon: string;
  iconKey: string;
  category: UpgradeCategory;
  label: string;
  description: string;
  bigNumber: string;
}

export const UPGRADE_POOL: UpgradeDef[] = [
  { id: 'hp_boost',     icon: '❤️',  iconKey: 'icon-healthy-start', category: 'defense',  bigNumber: '+25 HP',  label: '+25 Max HP',     description: 'Increase maximum HP by 25 and heal immediately.' },
  { id: 'hp_restore',   icon: '💊',  iconKey: 'icon-full-heal',     category: 'defense',  bigNumber: 'HEAL',    label: 'Full Heal',      description: 'Restore all HP to current maximum.' },
  { id: 'damage_boost', icon: '⚔️',  iconKey: 'icon-damage-boost',  category: 'attack',   bigNumber: '+25%',    label: '+25% Damage',    description: 'All attacks deal 25% more damage.' },
  { id: 'speed_boost',  icon: '👟',  iconKey: 'icon-speed-boost',   category: 'mobility', bigNumber: '+20%',    label: '+20% Speed',     description: 'Move 20% faster.' },
  { id: 'attack_speed', icon: '⚡',  iconKey: 'icon-quick-hands',   category: 'attack',   bigNumber: '-25%',    label: 'Faster Attacks', description: 'Attack cooldown reduced by 25%.' },
  { id: 'lifesteal',    icon: '🩸',  iconKey: 'icon-lifesteal',     category: 'defense',  bigNumber: '+5 HP',   label: 'Lifesteal',      description: 'Heal 5 HP each time you kill an enemy.' },
  { id: 'crit',         icon: '💥',  iconKey: 'icon-critical-hit',  category: 'attack',   bigNumber: '25%',     label: 'Critical Hits',  description: '25% chance to deal double damage.' },
  { id: 'magnet',       icon: '🧲',  iconKey: 'icon-magnet',        category: 'mobility', bigNumber: 'AUTO',    label: 'Coin Magnet',    description: 'Coins fly toward you automatically.' },
  { id: 'thorns',       icon: '🌵',  iconKey: 'icon-tougher-skin',  category: 'defense',  bigNumber: '5 DMG',   label: 'Thorns',         description: 'Reflect 5 damage to enemies that hit you.' },
  { id: 'regen',        icon: '🌿',  iconKey: 'icon-second-wind',   category: 'defense',  bigNumber: '+1 HP',   label: 'Regeneration',   description: 'Recover 1 HP every 2 seconds.' },
  { id: 'double_coins', icon: '💰',  iconKey: 'icon-double-coins',  category: 'economy',  bigNumber: '×2',      label: 'Double Coins',   description: 'All coin pickups are worth double.' },
  { id: 'wide_swing',   icon: '🌀',  iconKey: 'icon-sharper-steel', category: 'attack',   bigNumber: '+30%',    label: 'Wide Swing',     description: 'Attack arc 30% wider and longer.' },
];
