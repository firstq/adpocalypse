// ─────────────────────────────────────────────────────────────────────────────
// Public data types shared across all systems
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveData {
  bestWave: number;
  totalGears: number;
  metaUpgrades: Record<string, number>;
  workshopVisited: boolean;
  audioMuted: boolean;
  sfxVolume: number;
}

export interface LeaderboardEntry {
  rank: number;
  score: number;
  name: string;
}

export interface InterstitialCallbacks {
  onOpen?: () => void;
  onClose?: (wasShown: boolean) => void;
  onError?: (error: Error) => void;
}

export interface RewardedCallbacks {
  onOpen?: () => void;
  onRewarded?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified interface — identical API in real and fallback mode
// ─────────────────────────────────────────────────────────────────────────────

export interface IYandexSDK {
  /** Call after all assets are loaded so Yandex hides its loader. */
  notifyGameReady(): void;
  isYandex(): boolean;
  isLoggedIn(): boolean;
  /** Returns the user's language from the SDK environment ('ru' or 'en'). */
  getLang(): string;
  loadPlayerData(): Promise<Partial<SaveData> | null>;
  savePlayerData(data: SaveData): Promise<void>;
  showInterstitial(callbacks: InterstitialCallbacks): void;
  showRewardedVideo(callbacks: RewardedCallbacks): void;
  submitLeaderboardScore(leaderboardName: string, score: number): Promise<void>;
  getLeaderboardEntries(leaderboardName: string, count: number): Promise<LeaderboardEntry[]>;
  openAuthDialog(): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Real implementation — wraps the Yandex Games SDK
// ─────────────────────────────────────────────────────────────────────────────

export class YandexSDKReal implements IYandexSDK {
  private ysdk: YandexGamesSDKInstance;
  private player: YandexPlayer | null = null;
  private lang: string;

  constructor(ysdk: YandexGamesSDKInstance) {
    this.ysdk = ysdk;
    const rawLang = (ysdk.environment?.i18n?.lang || '').slice(0, 2).toLowerCase();
    this.lang = rawLang === 'ru' ? 'ru' : 'en';
    console.log('[YandexSDKReal] Language from SDK env:', this.lang);
  }

  async init(): Promise<void> {
    try {
      this.player = await this.ysdk.getPlayer({ scopes: false });
    } catch (err) {
      console.warn('[YandexSDKReal] Eager getPlayer() failed — leaderboard/auth may not work:', err);
    }
  }

  notifyGameReady(): void {
    this.ysdk.features.LoadingAPI?.ready();
  }

  isYandex(): boolean { return true; }

  isLoggedIn(): boolean {
    return this.player !== null && this.player.getMode() !== 'lite';
  }

  getLang(): string { return this.lang; }

  private async getOrFetchPlayer(): Promise<YandexPlayer> {
    if (!this.player) {
      this.player = await this.ysdk.getPlayer({ scopes: false });
    }
    return this.player;
  }

  async loadPlayerData(): Promise<Partial<SaveData> | null> {
    try {
      const p = await this.getOrFetchPlayer();
      const raw = await p.getData();
      return raw as Partial<SaveData>;
    } catch (err) {
      console.warn('[YandexSDKReal] loadPlayerData failed:', err);
      return null;
    }
  }

  async savePlayerData(data: SaveData): Promise<void> {
    try {
      const p = await this.getOrFetchPlayer();
      await p.setData(data as unknown as Record<string, unknown>, false);
    } catch (err) {
      console.warn('[YandexSDKReal] savePlayerData failed:', err);
    }
  }

  showInterstitial(callbacks: InterstitialCallbacks): void {
    this.ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen:  callbacks.onOpen,
        onClose: callbacks.onClose,
        onError: callbacks.onError,
      },
    });
  }

  showRewardedVideo(callbacks: RewardedCallbacks): void {
    this.ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen:     callbacks.onOpen,
        onRewarded: callbacks.onRewarded,
        onClose:    callbacks.onClose,
        onError:    callbacks.onError,
      },
    });
  }

  async submitLeaderboardScore(leaderboardName: string, score: number): Promise<void> {
    try {
      const lb = await this.ysdk.getLeaderboards();
      await lb.setLeaderboardScore(leaderboardName, score);
    } catch (err) {
      console.warn('[YandexSDKReal] submitLeaderboardScore failed:', err);
    }
  }

  async getLeaderboardEntries(leaderboardName: string, count: number): Promise<LeaderboardEntry[]> {
    try {
      const lb = await this.ysdk.getLeaderboards();
      const result = await lb.getLeaderboardEntries(leaderboardName, { quantityTop: count, includeUser: true });
      return result.entries.map(e => ({
        rank:  e.rank,
        score: e.score,
        name:  e.player.publicName || '',
      }));
    } catch (err) {
      console.warn('[YandexSDKReal] getLeaderboardEntries failed:', err);
      return [];
    }
  }

  async openAuthDialog(): Promise<void> {
    try {
      await this.ysdk.auth.openAuthDialog();
      // Refresh player object after potential login
      this.player = await this.ysdk.getPlayer({ scopes: false });
    } catch (err) {
      console.warn('[YandexSDKReal] openAuthDialog failed:', err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback — localStorage saves, stub ads (rewards granted immediately)
// ─────────────────────────────────────────────────────────────────────────────

export class YandexSDKFallback implements IYandexSDK {
  notifyGameReady(): void { /* no-op outside Yandex */ }
  isYandex(): boolean { return false; }
  isLoggedIn(): boolean { return false; }
  getLang(): string { return (navigator.language || 'ru').slice(0, 2).toLowerCase(); }

  async loadPlayerData(): Promise<null> {
    // Returning null tells SaveManager to use whatever is already in localStorage
    return null;
  }

  async savePlayerData(_data: SaveData): Promise<void> {
    // SaveManager already writes to localStorage; cloud write is a no-op in fallback
  }

  showInterstitial(callbacks: InterstitialCallbacks): void {
    console.log('[YandexSDK] fallback — interstitial skipped');
    // Use setTimeout so callers can set state between the call and the callback
    setTimeout(() => callbacks.onClose?.(true), 0);
  }

  showRewardedVideo(callbacks: RewardedCallbacks): void {
    console.log('[YandexSDK] fallback — rewarded video auto-rewarded');
    setTimeout(() => {
      callbacks.onOpen?.();
      callbacks.onRewarded?.();
      callbacks.onClose?.();
    }, 100);
  }

  async submitLeaderboardScore(_leaderboardName: string, _score: number): Promise<void> {
    console.log('[YandexSDK] fallback — leaderboard score not submitted');
  }

  async getLeaderboardEntries(_leaderboardName: string, _count: number): Promise<LeaderboardEntry[]> {
    return [];
  }

  async openAuthDialog(): Promise<void> {
    console.log('[YandexSDK] fallback — auth dialog not available');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory — detects environment and returns the right implementation
// ─────────────────────────────────────────────────────────────────────────────

export async function createYandexSDK(): Promise<IYandexSDK> {
  if (YaGames === undefined) {
    console.log('[YandexSDK] Not running on Yandex Games — using fallback');
    return new YandexSDKFallback();
  }

  try {
    const ysdk = await YaGames.init();
    const real = new YandexSDKReal(ysdk);
    await real.init();
    console.log('[YandexSDK] Initialized successfully. Logged in:', real.isLoggedIn(), 'Lang:', real.getLang());
    return real;
  } catch (err) {
    console.error('[YandexSDK] Init failed — using fallback:', err);
    return new YandexSDKFallback();
  }
}
