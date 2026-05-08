/**
 * Module-level singletons for SDK, saves, and ads.
 * All three default to fallback mode so the rest of the game can import them
 * safely before initSDK() resolves.
 */
import { YandexSDKFallback, createYandexSDK, IYandexSDK } from './YandexSDK';
import { SaveManager } from './SaveManager';
import { AdManager } from './AdManager';

export let sdkInstance: IYandexSDK = new YandexSDKFallback();
export let saveManager: SaveManager = new SaveManager(sdkInstance);
export let adManager: AdManager    = new AdManager(sdkInstance);

/**
 * Initialize the real SDK (or keep fallback if not on Yandex).
 * Loads cloud save data into localStorage before resolving.
 * Call this once, in BootScene, before starting PreloadScene.
 */
export async function initSDK(): Promise<void> {
  sdkInstance = await createYandexSDK();
  saveManager = new SaveManager(sdkInstance);
  adManager   = new AdManager(sdkInstance);
  await saveManager.load();
}
