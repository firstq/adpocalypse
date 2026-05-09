export class DamageTracker {
  private recentHits: Array<{ damage: number; timestamp: number }> = [];
  private readonly WINDOW_MS = 30_000;

  recordHit(damage: number): void {
    this.recentHits.push({ damage, timestamp: Date.now() });
    this.cleanup();
  }

  getAverageHit(): number {
    this.cleanup();
    if (this.recentHits.length === 0) return 10;
    return this.recentHits.reduce((sum, h) => sum + h.damage, 0) / this.recentHits.length;
  }

  reset(): void {
    this.recentHits = [];
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.WINDOW_MS;
    this.recentHits = this.recentHits.filter(h => h.timestamp >= cutoff);
  }
}
