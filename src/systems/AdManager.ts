import { IYandexSDK } from './YandexSDK';

const MIN_INTERSTITIAL_INTERVAL_MS = 60_000;

/** Manages ad frequency, muting, and provides promise-based helpers. */
export class AdManager {
  private sdk: IYandexSDK;
  private lastInterstitialTime = 0;

  constructor(sdk: IYandexSDK) {
    this.sdk = sdk;
  }

  canShowInterstitial(): boolean {
    return Date.now() - this.lastInterstitialTime >= MIN_INTERSTITIAL_INTERVAL_MS;
  }

  get lastInterstitialAge(): number {
    return Math.floor((Date.now() - this.lastInterstitialTime) / 1000);
  }

  /**
   * Shows a full-screen interstitial ad.
   * Resolves when the ad closes (or immediately if cooldown hasn't elapsed).
   * The caller is responsible for muting/pausing the game before calling.
   */
  showInterstitial(): Promise<void> {
    return new Promise(resolve => {
      if (!this.canShowInterstitial()) { resolve(); return; }
      this.lastInterstitialTime = Date.now();
      this.sdk.showInterstitial({
        onClose: () => resolve(),
        onError: () => resolve(),
      });
    });
  }

  /**
   * Shows a rewarded video ad.
   * Resolves with `true` if the player earned the reward, `false` otherwise.
   */
  showRewarded(): Promise<boolean> {
    return new Promise(resolve => {
      let rewarded = false;
      this.sdk.showRewardedVideo({
        onRewarded: () => { rewarded = true; },
        onClose:    () => resolve(rewarded),
        onError:    () => resolve(false),
      });
    });
  }
}
