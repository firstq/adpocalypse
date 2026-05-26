// Ambient declarations for the Yandex Games SDK global.
// This file has no imports so all declarations are global (ambient module).
// The SDK script is loaded via <script src="/sdk.js"> — only present on Yandex's platform.

declare const YaGames: YaGamesFactory | undefined;

interface YaGamesFactory {
  init(): Promise<YandexGamesSDKInstance>;
}

interface YandexGamesSDKInstance {
  environment?: {
    i18n?: {
      lang?: string;
      tld?: string;
    };
  };
  features: {
    LoadingAPI?: { ready(): void };
  };
  adv: {
    showFullscreenAdv(params: { callbacks: YandexFullscreenCallbacks }): void;
    showRewardedVideo(params: { callbacks: YandexRewardedCallbacks }): void;
  };
  getPlayer(params?: { scopes: boolean }): Promise<YandexPlayer>;
  auth: {
    openAuthDialog(): Promise<void>;
  };
  leaderboards: {
    setScore(name: string, score: number, extraData?: string): Promise<void>;
    getEntries(name: string, params?: {
      includeUser?: boolean;
      quantityAround?: number;
      quantityTop?: number;
    }): Promise<YandexLeaderboardResult>;
    getPlayerEntry(name: string): Promise<YandexLeaderboardEntry>;
    getDescription(name: string): Promise<unknown>;
  };
}

interface YandexFullscreenCallbacks {
  onOpen?: () => void;
  onClose?: (wasShown: boolean) => void;
  onError?: (error: Error) => void;
  onOffline?: () => void;
}

interface YandexRewardedCallbacks {
  onOpen?: () => void;
  onRewarded?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

interface YandexPlayer {
  getID(): string;
  getName(): string;
  isAuthorized(): boolean;
  getData(keys?: string[]): Promise<Record<string, unknown>>;
  setData(data: Record<string, unknown>, flush?: boolean): Promise<void>;
}

interface YandexLeaderboards {
  setLeaderboardScore(name: string, score: number, extraData?: string): Promise<void>;
  getLeaderboardEntries(name: string, params?: {
    includeUser?: boolean;
    quantityAround?: number;
    quantityTop?: number;
  }): Promise<YandexLeaderboardResult>;
}

interface YandexLeaderboardResult {
  leaderboard: { name: string };
  userRank: number;
  entries: YandexLeaderboardEntry[];
}

interface YandexLeaderboardEntry {
  score: number;
  rank: number;
  player: { publicName: string };
}
