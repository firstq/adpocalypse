# Adpocalypse

A browser-based 2D arcade game where you fight internet ads — popups, cookie banners, and premium spam — across endless enemy waves. Built with Phaser 3, TypeScript, and Vite.

## Play Now

**itch.io:** _(link coming soon)_

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build          # TypeScript compile + Vite production build → dist/
npm run build:itch     # Same + packages dist/ into adpocalypse-itch.zip
npm run preview        # Serve dist/ locally to test before upload
```

Upload `adpocalypse-itch.zip` directly on itch.io (HTML game, no server needed).

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR on port 3000 |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run build:itch` | Build + zip for itch.io upload |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint on all TypeScript source files |

## Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Move | WASD or Arrow keys | Virtual joystick (left side) |
| Attack | Space or Left click | Attack button (right side) |
| Pause | Pause button (top right) | Same |

## Required Kenney Assets

All graphics are procedurally generated for the MVP. To replace placeholders with real sprites, download these free CC0 packs from [kenney.nl](https://kenney.nl):

1. **Toon Characters 1** — https://kenney.nl/assets/toon-characters-1  
   Unpack to `public/assets/characters/`

2. **Particle Pack** — https://kenney.nl/assets/particle-pack  
   Unpack to `public/assets/particles/`

3. **UI Pack** — https://kenney.nl/assets/ui-pack  
   Unpack to `public/assets/ui/`

After downloading, load sprites in `src/scenes/PreloadScene.ts` and replace the `Phaser.GameObjects.Graphics` drawing code in each entity file.

## Project Structure

```
src/
  main.ts                  # Phaser.Game entry point
  config.ts                # Global constants (resolution, stats, wave defs)
  scenes/
    BootScene.ts           # Minimal boot, goes straight to PreloadScene
    PreloadScene.ts        # Asset loading with progress bar
    MenuScene.ts           # Main menu with Play and Mute buttons
    GameScene.ts           # Core gameplay, physics, collision, game state
    UIScene.ts             # HUD overlay (HP, coins, wave info, pause)
  entities/
    Player.ts              # Player with movement, attack, damage, blinking
    enemies/
      Enemy.ts             # Abstract base: HP bar, death, coin drops
      PopupClose.ts        # Red ✕ popup — rushes player
      CookieBanner.ts      # Yellow bar — horizontal patrol, knockback
      PremiumPopup.ts      # Gold box — slow, fires projectiles every 2s
    Coin.ts                # Collectible dropped on enemy death
    Projectile.ts          # Enemy projectile (email envelope)
  systems/
    WaveManager.ts         # Spawns enemies in staggered waves
    AudioManager.ts        # Stub — console.log only, swap in real sounds
    InputManager.ts        # Unified keyboard + virtual joystick + touch
    YandexSDK.ts           # Stub for Yandex Games SDK integration
  ui/
    HPBar.ts               # Reusable HP bar component
    Button.ts              # Reusable button with hover state
public/
  assets/                  # Place Kenney assets here
```

## Enemy Types

| Enemy | HP | Speed | Damage | Special |
|---|---|---|---|---|
| PopupClose (✕) | 20 | 60 | 10 | Charges directly at player |
| CookieBanner | 40 | 40 | 15 | Horizontal only, knockback 300 |
| PremiumPopup | 80 | 30 | 20 | Fires projectile every 2s, drops 3× coins |

## Wave Structure

| Wave | PopupClose | CookieBanner | PremiumPopup |
|---|---|---|---|
| 1 | 5 | 0 | 0 |
| 2 | 8 | 2 | 0 |
| 3 | 10 | 3 | 1 |

After wave 3: Level Complete screen → restart.

## TODO (Post-MVP)

- [ ] Real audio: background music + SFX (Kenney Impact Sounds / Music Jingles packs)
- [ ] Pixel art sprites replacing all Graphics placeholders
- [ ] XP system and level-up upgrade shop (speed / damage / HP)
- [ ] More enemy types: VideoAd (unskippable, high HP), SpamEmail (swarm)
- [ ] Multiple biomes / level backgrounds
- [ ] Real Yandex Games SDK: interstitials, rewarded video, leaderboard
- [ ] Persistent high score via YandexSDK.saveProgress / localStorage
- [ ] Boss enemy at end of every 5th wave
- [ ] Co-op (two-player keyboard share)
- [ ] Mobile haptic feedback
- [ ] Difficulty scaling between restarts
