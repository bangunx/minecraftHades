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
    this.flyUp = false;
    this.flyDown = false;
    this.jumpHeld = false;
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
        this.jumpHeld = true;
        this.flyUp = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprint = true;
        this.flyDown = true;
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
      case 'Space':
        this.jumpHeld = false;
        this.flyUp = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprint = false;
        this.flyDown = false;
        break;
      default:
        break;
    }
  }

  _handleBlockSelection(code) {
    if (!this.blockPalette.length) return;
    if (code.startsWith('Digit')) {
      const index = Number(code.slice(5)) - 1;
      if (!Number.isNaN(index)) {
        this.setActiveBlockIndex(index);
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
    return this.blockPalette[this.getActiveBlockIndex()];
  }

  getActiveBlockIndex() {
    if (!this.blockPalette.length) return -1;
    const length = this.blockPalette.length;
    return ((this.activeBlockIndex % length) + length) % length;
  }

  getBlockPalette() {
    return [...this.blockPalette];
  }

  setActiveBlockIndex(index) {
    if (!this.blockPalette.length) return;
    if (Number.isNaN(index)) return;
    this.activeBlockIndex = ((Math.floor(index) % this.blockPalette.length) + this.blockPalette.length) % this.blockPalette.length;
  }

  cyclePalette(direction) {
    if (!this.blockPalette.length) return;
    if (!direction) return;
    this.setActiveBlockIndex(this.activeBlockIndex + Math.sign(direction));
  }
}
