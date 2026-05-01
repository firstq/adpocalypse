const GEAR_KEY = 'adpocalypse_gears';
const META_KEY = 'adpocalypse_meta_upgrades';
const WORKSHOP_VISITED_KEY = 'adpocalypse_first_workshop_visit';

export interface MetaUpgradeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
}

export const META_UPGRADE_DEFS: MetaUpgradeDef[] = [
  { id: 'damage',       name: 'Sharper Steel', icon: '⚔️', description: '+3% melee damage per level (max +30%)',        maxLevel: 10 },
  { id: 'max_hp',       name: 'Tougher Skin',  icon: '🛡️', description: '+5 max HP per level (max +50 HP)',            maxLevel: 10 },
  { id: 'speed',        name: 'Swift Boots',   icon: '👟', description: '+2% movement speed per level (max +20%)',     maxLevel: 10 },
  { id: 'attack_speed', name: 'Quick Hands',   icon: '⚡', description: '+2% attack speed per level (max +20%)',       maxLevel: 10 },
  { id: 'coin_bonus',   name: 'Greedy',        icon: '💰', description: '+5% coin gain per level (max +50%)',          maxLevel: 10 },
  { id: 'gear_chance',  name: 'Lucky',         icon: '🍀', description: '+0.5% gear drop chance (max 10% total)',      maxLevel: 10 },
  { id: 'start_hp',     name: 'Healthy Start', icon: '❤️', description: 'Start each run with +10 HP (max +100 HP)',    maxLevel: 10 },
  { id: 'crit_chance',  name: 'Eagle Eye',     icon: '🎯', description: '+1% crit chance per level (max +10%)',        maxLevel: 10 },
  { id: 'magnet_range', name: 'Magnet',        icon: '🧲', description: '+20px coin pickup radius per level (max 200px)', maxLevel: 10 },
  { id: 'revive',       name: 'Second Wind',   icon: '💫', description: 'Revive at 50% HP: L1-4=1 use, L5-9=2, L10=3', maxLevel: 10 },
];

type MetaLevels = Record<string, number>;

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private browsing or storage full — silently ignore
  }
}

export const MetaProgress = {
  getGears(): number {
    return safeRead<number>(GEAR_KEY, 0);
  },

  addGears(n: number): void {
    safeWrite(GEAR_KEY, this.getGears() + n);
  },

  spendGears(n: number): boolean {
    const have = this.getGears();
    if (have < n) return false;
    safeWrite(GEAR_KEY, have - n);
    return true;
  },

  getLevels(): MetaLevels {
    return safeRead<MetaLevels>(META_KEY, {});
  },

  getUpgradeLevel(id: string): number {
    return this.getLevels()[id] ?? 0;
  },

  costForNextLevel(id: string): number {
    const level = this.getUpgradeLevel(id);
    const def = META_UPGRADE_DEFS.find(d => d.id === id);
    if (!def || level >= def.maxLevel) return Infinity;
    return (level + 1) * 5;
  },

  purchaseUpgrade(id: string): boolean {
    const cost = this.costForNextLevel(id);
    if (cost === Infinity) return false;
    if (!this.spendGears(cost)) return false;
    const levels = this.getLevels();
    levels[id] = (levels[id] ?? 0) + 1;
    safeWrite(META_KEY, levels);
    return true;
  },

  hasVisitedWorkshop(): boolean {
    return safeRead<boolean>(WORKSHOP_VISITED_KEY, false);
  },

  markWorkshopVisited(): void {
    safeWrite(WORKSHOP_VISITED_KEY, true);
  },

  resetAll(): void {
    try {
      localStorage.removeItem(GEAR_KEY);
      localStorage.removeItem(META_KEY);
      localStorage.removeItem(WORKSHOP_VISITED_KEY);
      localStorage.removeItem('bestWave');
    } catch {
      // ignore
    }
  },
};
