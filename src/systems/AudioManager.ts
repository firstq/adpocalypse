import Phaser from 'phaser';
import { saveManager } from './sdk';

interface AudioSettings {
  muted: boolean;
  sfxVolume: number;
}

const STORAGE_KEY = 'adpocalypse_audio_settings';
const DEFAULT_VOLUME = 0.6;
const COOLDOWN_MS = 50;

export class AudioManager {
  private scene: Phaser.Scene;
  private sfxVolume = DEFAULT_VOLUME;
  private lastPlayTime = new Map<string, number>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s: AudioSettings = JSON.parse(raw);
      if (s.muted) this.scene.sound.setMute(true);
      if (typeof s.sfxVolume === 'number') {
        this.sfxVolume = s.sfxVolume;
        this.scene.sound.setVolume(this.sfxVolume);
      }
    } catch { /* ignore — private browsing or corrupt data */ }
  }

  private saveSettings(): void {
    try {
      const s: AudioSettings = { muted: this.scene.sound.mute, sfxVolume: this.sfxVolume };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      saveManager.scheduleSave();
    } catch { /* ignore */ }
  }

  playSFX(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    const now = Date.now();
    const last = this.lastPlayTime.get(key) ?? 0;
    if (now - last < COOLDOWN_MS) return;
    this.lastPlayTime.set(key, now);

    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`Missing audio: ${key}`);
      return;
    }

    try {
      this.scene.sound.play(key, { volume: this.sfxVolume, ...config });
    } catch (e) {
      console.warn(`Audio error for ${key}:`, e);
    }
  }

  setMuted(muted: boolean): void {
    this.scene.sound.setMute(muted);
    this.saveSettings();
  }

  isMuted(): boolean {
    return this.scene.sound.mute;
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.scene.sound.setVolume(this.sfxVolume);
    this.saveSettings();
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  // No-op: music not in this iteration
  playMusic(_key: string): void {}
}
