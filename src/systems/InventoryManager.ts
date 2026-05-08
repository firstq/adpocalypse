import Phaser from 'phaser';

export type ConsumableType = 'bomb' | 'healthPotion' | 'fullHeal' | 'timeSlow';

export interface PlayerInventory {
  bomb: number;
  healthPotion: number;
  fullHeal: number;
  timeSlow: number;
}

export class InventoryManager {
  private inv: PlayerInventory = { bomb: 0, healthPotion: 0, fullHeal: 0, timeSlow: 0 };
  readonly onChange = new Phaser.Events.EventEmitter();

  add(item: ConsumableType, count = 1): void {
    this.inv[item] += count;
    this.onChange.emit('change');
  }

  use(item: ConsumableType): boolean {
    if (this.inv[item] <= 0) return false;
    this.inv[item]--;
    this.onChange.emit('change');
    return true;
  }

  count(item: ConsumableType): number {
    return this.inv[item];
  }

  getAll(): PlayerInventory {
    return { ...this.inv };
  }

  reset(): void {
    this.inv = { bomb: 0, healthPotion: 0, fullHeal: 0, timeSlow: 0 };
    this.onChange.emit('change');
  }
}
