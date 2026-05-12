import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export class InputManager {
  left = false;
  right = false;
  up = false;
  down = false;
  attack = false;

  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
  };

  private touchAttackHeld = false;
  private joystickActive = false;
  private joystickStart = { x: 0, y: 0 };
  private joystickCurrent = { x: 0, y: 0 };
  private joystickPointer: Phaser.Input.Pointer | null = null;
  private attackPointer: Phaser.Input.Pointer | null = null;

  // Touch UI graphics
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private scene: Phaser.Scene;
  private isMobile: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.isMobile = !scene.sys.game.device.os.desktop;

    const kbd = scene.input.keyboard!;
    this.keys = {
      left:  kbd.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up:    kbd.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down:  kbd.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      space: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    };

    if (this.isMobile) {
      this.buildTouchControls();
    }
  }

  private buildTouchControls(): void {
    // Virtual joystick (bottom left)
    const jx = 120;
    const jy = GAME_HEIGHT - 100;

    this.joystickBase = this.scene.add.circle(jx, jy, 55, 0xffffff, 0.15).setDepth(100).setScrollFactor(0);
    this.joystickKnob = this.scene.add.circle(jx, jy, 28, 0xffffff, 0.35).setDepth(101).setScrollFactor(0);

    // Touch attack button (bottom right)
    const ax = GAME_WIDTH - 120;
    const ay = GAME_HEIGHT - 100;
    const attackCircle = this.scene.add.circle(0, 0, 55, 0xe74c3c, 0.4);
    const attackText = this.scene.add.text(0, 0, '⚔', {
      fontSize: '36px',
    }).setOrigin(0.5);
    this.scene.add.container(ax, ay, [attackCircle, attackText])
      .setDepth(100).setScrollFactor(0);

    this.scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.x < GAME_WIDTH / 2 && this.joystickPointer === null) {
        this.joystickPointer = ptr;
        this.joystickActive = true;
        this.joystickStart = { x: ptr.x, y: ptr.y };
        this.joystickCurrent = { x: ptr.x, y: ptr.y };
      } else if (ptr.x >= GAME_WIDTH / 2 && this.attackPointer === null) {
        this.attackPointer = ptr;
        this.touchAttackHeld = true;
      }
    });

    this.scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (ptr === this.joystickPointer) {
        this.joystickCurrent = { x: ptr.x, y: ptr.y };
        const dx = ptr.x - this.joystickStart.x;
        const dy = ptr.y - this.joystickStart.y;
        const len = Math.min(Math.sqrt(dx * dx + dy * dy), 55);
        const angle = Math.atan2(dy, dx);
        this.joystickKnob.setPosition(
          this.joystickStart.x + Math.cos(angle) * len,
          this.joystickStart.y + Math.sin(angle) * len,
        );
      }
    });

    this.scene.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (ptr === this.joystickPointer) {
        this.joystickPointer = null;
        this.joystickActive = false;
        this.joystickKnob.setPosition(this.joystickBase.x, this.joystickBase.y);
      } else if (ptr === this.attackPointer) {
        this.attackPointer = null;
        this.touchAttackHeld = false;
      }
    });
  }

  update(): void {
    this.left = this.keys.left.isDown;
    this.right = this.keys.right.isDown;
    this.up = this.keys.up.isDown;
    this.down = this.keys.down.isDown;
    this.attack = this.keys.space.isDown || this.touchAttackHeld;

    if (this.isMobile && this.joystickActive) {
      const dx = this.joystickCurrent.x - this.joystickStart.x;
      const dy = this.joystickCurrent.y - this.joystickStart.y;
      this.left = dx < -15;
      this.right = dx > 15;
      this.up = dy < -15;
      this.down = dy > 15;
    }
  }
}
