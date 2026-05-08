import { IYandexSDK, SaveData } from './YandexSDK';

const LS = {
  bestWave:        'bestWave',
  gears:           'adpocalypse_gears',
  metaUpgrades:    'adpocalypse_meta_upgrades',
  workshopVisited: 'adpocalypse_first_workshop_visit',
  audioSettings:   'adpocalypse_audio_settings',
} as const;

/** Abstracts cloud/local save so the rest of the game never talks to localStorage directly for persistence. */
export class SaveManager {
  private sdk: IYandexSDK;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(sdk: IYandexSDK) {
    this.sdk = sdk;
  }

  /**
   * Called once at startup: loads cloud data and writes it to localStorage
   * so existing MetaProgress / AudioManager code continues to work unchanged.
   */
  async load(): Promise<void> {
    try {
      const data = await this.sdk.loadPlayerData();
      if (!data) return; // fallback mode or error — localStorage stays as-is
      this.writeToLocalStorage(data);
    } catch (err) {
      console.warn('[SaveManager] load failed, using local data:', err);
    }
  }

  /** Debounced: schedules a cloud save ~500 ms after the last call. */
  scheduleSave(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { void this.flush(); }, 500);
  }

  /** Immediate cloud save — prefer scheduleSave() for user-triggered mutations. */
  async flush(): Promise<void> {
    try {
      await this.sdk.savePlayerData(this.readFromLocalStorage());
    } catch (err) {
      console.warn('[SaveManager] flush failed:', err);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private readFromLocalStorage(): SaveData {
    const bestWave  = parseInt(localStorage.getItem(LS.bestWave) || '0') || 0;
    const totalGears = (JSON.parse(localStorage.getItem(LS.gears) ?? '0') as number) || 0;
    const metaUpgrades = (JSON.parse(localStorage.getItem(LS.metaUpgrades) ?? '{}') as Record<string, number>) || {};
    const workshopVisited = (JSON.parse(localStorage.getItem(LS.workshopVisited) ?? 'false') as boolean) || false;
    const audio = JSON.parse(localStorage.getItem(LS.audioSettings) ?? '{}') as { muted?: boolean; sfxVolume?: number };

    return {
      bestWave,
      totalGears,
      metaUpgrades,
      workshopVisited,
      audioMuted:  audio.muted    ?? false,
      sfxVolume:   audio.sfxVolume ?? 0.6,
    };
  }

  private writeToLocalStorage(data: Partial<SaveData>): void {
    if (data.bestWave !== undefined)
      localStorage.setItem(LS.bestWave, String(data.bestWave));

    if (data.totalGears !== undefined)
      localStorage.setItem(LS.gears, JSON.stringify(data.totalGears));

    if (data.metaUpgrades !== undefined)
      localStorage.setItem(LS.metaUpgrades, JSON.stringify(data.metaUpgrades));

    if (data.workshopVisited !== undefined)
      localStorage.setItem(LS.workshopVisited, JSON.stringify(data.workshopVisited));

    if (data.audioMuted !== undefined || data.sfxVolume !== undefined) {
      const existing = JSON.parse(localStorage.getItem(LS.audioSettings) ?? '{}') as { muted?: boolean; sfxVolume?: number };
      const merged = {
        muted:     data.audioMuted  ?? existing.muted     ?? false,
        sfxVolume: data.sfxVolume   ?? existing.sfxVolume ?? 0.6,
      };
      localStorage.setItem(LS.audioSettings, JSON.stringify(merged));
    }
  }
}
