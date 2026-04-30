export type ShopRarity = 'consumable' | 'upgrade' | 'rare';

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  rarity: ShopRarity;
  isPending?: true; // effect applied at next wave start, not on purchase
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Consumables ──────────────────────────────────────────
  { id: 'small_potion',     name: 'Small Potion',    icon: '🫙', description: 'Restore 15 HP instantly',                          cost:  12, rarity: 'consumable' },
  { id: 'coin_sack',        name: 'Coin Sack',       icon: '💵', description: 'Gain 20 coins immediately',                        cost:  15, rarity: 'consumable' },
  { id: 'quick_snack',      name: 'Quick Snack',     icon: '🍏', description: '+5 max HP and restore to full health',             cost:  20, rarity: 'consumable' },
  { id: 'health_potion',    name: 'Health Potion',   icon: '🧪', description: 'Restore 30 HP instantly',                          cost:  25, rarity: 'consumable' },
  { id: 'full_heal',        name: 'Full Heal',        icon: '💊', description: 'Restore HP to maximum',                           cost:  75, rarity: 'consumable' },
  { id: 'coin_magnet_shop', name: 'Coin Magnet',      icon: '🧲', description: 'Auto-collect coins for the rest of this run',     cost:  40, rarity: 'consumable' },
  { id: 'time_slow',        name: 'Time Slow',        icon: '🕐', description: 'Enemies move 30% slower next wave',              cost:  60, rarity: 'consumable', isPending: true },
  { id: 'bomb',             name: 'Bomb',             icon: '💣', description: 'Deal 50 damage to all enemies at wave start',     cost:  50, rarity: 'consumable', isPending: true },
  // ── Permanent run upgrades ────────────────────────────────
  { id: 'damage_boost_shop',  name: 'Damage Boost',  icon: '⚔️', description: '+10% melee damage for this run',                 cost: 100, rarity: 'upgrade' },
  { id: 'hp_boost_shop',      name: 'HP Boost',      icon: '❤️', description: '+20 max HP and heal that amount',                cost: 100, rarity: 'upgrade' },
  { id: 'speed_boost_shop',   name: 'Speed Boost',   icon: '👟', description: '+8% movement speed',                             cost:  90, rarity: 'upgrade' },
  { id: 'attack_speed_shop',  name: 'Quick Hands',   icon: '⚡', description: '+10% attack speed',                              cost: 110, rarity: 'upgrade' },
  { id: 'lucky_coins',        name: 'Lucky Coins',   icon: '🍀', description: '+1 extra coin dropped per enemy kill',           cost: 125, rarity: 'upgrade' },
  { id: 'gear_up',            name: 'Gear Up',       icon: '⚙️', description: '+2% gear drop chance this run',                  cost: 200, rarity: 'upgrade' },
  // ── Rare ─────────────────────────────────────────────────
  { id: 'vampire_blade',    name: 'Vampire Blade',    icon: '🩸', description: 'Heal 5 HP each time you kill an enemy',          cost: 250, rarity: 'rare' },
  { id: 'thorns_shop',      name: 'Thorns Armor',     icon: '🌵', description: 'Enemies take 8 damage when they hit you',        cost: 225, rarity: 'rare' },
  { id: 'double_strike',    name: 'Double Strike',    icon: '💢', description: '20% chance each swing hits twice',               cost: 300, rarity: 'rare' },
  { id: 'phoenix_feather',  name: 'Phoenix Feather',  icon: '🔥', description: 'Auto-revive once this run at 50% HP',           cost: 400, rarity: 'rare' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick 6 items: 2 consumable, 3+ upgrade, 30% chance of 1 rare replacing the 4th upgrade.
 *  On wave 3 (first shop visit), guarantee at least 2 items costing ≤ 50 coins. */
export function pickShopItems(wave: number): ShopItem[] {
  const consumables = shuffle(SHOP_ITEMS.filter(i => i.rarity === 'consumable'));
  const upgrades    = shuffle(SHOP_ITEMS.filter(i => i.rarity === 'upgrade'));
  const rares       = shuffle(SHOP_ITEMS.filter(i => i.rarity === 'rare'));

  const picks: ShopItem[] = [
    ...consumables.slice(0, 2),
  ];

  if (Math.random() < 0.3 && rares.length > 0) {
    picks.push(...upgrades.slice(0, 3), rares[0]);
  } else {
    picks.push(...upgrades.slice(0, 4));
  }

  if (wave === 3) {
    const cheapCount = picks.filter(i => i.cost <= 25).length;
    if (cheapCount < 2) {
      const cheapPool = shuffle(SHOP_ITEMS.filter(i => i.cost <= 25 && !picks.some(p => p.id === i.id)));
      const needed = 2 - cheapCount;
      for (let n = 0; n < needed && n < cheapPool.length; n++) {
        picks[picks.length - 1 - n] = cheapPool[n];
      }
    }
  }

  return shuffle(picks);
}
