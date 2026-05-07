export type UpgradeCategory = 'attack' | 'defense' | 'mobility' | 'economy' | 'special';

export const CATEGORY_COLORS: Record<UpgradeCategory, number> = {
  attack:   0xef4444,
  defense:  0x10b981,
  mobility: 0x3b82f6,
  economy:  0xeab308,
  special:  0xa855f7,
};

export const CATEGORY_COLORS_HEX: Record<UpgradeCategory, string> = {
  attack:   '#ef4444',
  defense:  '#10b981',
  mobility: '#3b82f6',
  economy:  '#eab308',
  special:  '#a855f7',
};
