export class AudioManager {
  private muted = false;

  playSFX(key: string): void {
    if (!this.muted) {
      console.log(`[SFX] ${key}`);
      // TODO: this.scene.sound.play(key);
    }
  }

  playMusic(key: string): void {
    if (!this.muted) {
      console.log(`[Music] ${key}`);
      // TODO: this.scene.sound.play(key, { loop: true });
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    console.log(`[Audio] muted: ${muted}`);
  }
}
