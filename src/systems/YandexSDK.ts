export class YandexSDK {
  init(): void {
    console.log('[YandexSDK] init — stub');
    // TODO: await ysdk.init() from the real Yandex Games SDK
  }

  showInterstitial(): void {
    console.log('[YandexSDK] showInterstitial — stub');
    // TODO: ysdk.adv.showFullscreenAdv(...)
  }

  showRewardedVideo(onReward: () => void): void {
    console.log('[YandexSDK] showRewardedVideo — stub, calling onReward immediately');
    onReward();
    // TODO: ysdk.adv.showRewardedVideo({ callbacks: { onRewarded: onReward } })
  }

  saveProgress(data: unknown): void {
    console.log('[YandexSDK] saveProgress — using localStorage stub');
    localStorage.setItem('adpocalypse_save', JSON.stringify(data));
    // TODO: ysdk.getPlayer().then(p => p.setData(data))
  }

  loadProgress(): unknown {
    console.log('[YandexSDK] loadProgress — using localStorage stub');
    const raw = localStorage.getItem('adpocalypse_save');
    return raw ? JSON.parse(raw) : null;
    // TODO: ysdk.getPlayer().then(p => p.getData())
  }
}
