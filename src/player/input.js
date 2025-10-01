import * as THREE from 'three';

export class PlayerInput {
  constructor(blockPalette = []) {
    this.blockPalette = blockPalette;
    this.activeBlockIndex = 0;

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.jumpRequested = false;
    this.sprint = false;

    this.lookDelta = new THREE.Vector2();
  }

  setPalette(ids) {
    this.blockPalette = ids;
    this.activeBlockIndex = 0;
  }

  handleKeyDown(code) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
      case 'Space':
        this.jumpRequested = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprint = true;
        break;
      case 'KeyQ':
        this.cyclePalette(-1);
        break;
      case 'KeyE':
        this.cyclePalette(1);
        break;
      default:
        this._handleBlockSelection(code);
        break;
    }
  }

  handleKeyUp(code) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprint = false;
        break;
      default:
        break;
    }
  }

  _handleBlockSelection(code) {
    if (!this.blockPalette.length) return;
    if (code.startsWith('Digit')) {
      const index = Number(code.slice(5)) - 1;
      if (!Number.isNaN(index) && index >= 0 && index < this.blockPalette.length) {
        this.activeBlockIndex = index;
      }
    }
  }

  consumeJumpRequest() {
    const requested = this.jumpRequested;
    this.jumpRequested = false;
    return requested;
  }

  getMovementVector() {
    const x = (this.moveRight ? 1 : 0) - (this.moveLeft ? 1 : 0);
    const z = (this.moveBackward ? 1 : 0) - (this.moveForward ? 1 : 0);
    const vector = new THREE.Vector2(x, z);
    if (vector.lengthSq() > 1e-5) {
      vector.normalize();
    }
    return vector;
  }

  getActiveBlockId() {
    if (!this.blockPalette.length) return null;
    return this.blockPalette[this.activeBlockIndex % this.blockPalette.length];
  }

  cyclePalette(step) {
    if (!this.blockPalette.length) return null;
    const length = this.blockPalette.length;
    this.activeBlockIndex = (this.activeBlockIndex + step + length) % length;
    return this.getActiveBlockId();
  }
}
