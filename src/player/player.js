import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { PlayerInput } from './input.js';
import { BLOCK_DEFINITIONS } from '../world/blockTypes.js';
import { PlayerModel } from './playerModel.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor({ camera, canvas, world, scene, onPointerLockChange }) {
    this.camera = camera;
    this.world = world;
    this.canvas = canvas;
    this.scene = scene;
    this.onPointerLockChange = onPointerLockChange;

    this.controls = new PointerLockControls(camera, canvas);
    this.controls.connect();

    this.eyeHeight = 1.62;
    this.bodyHeight = 1.8;
    this.halfHeight = this.bodyHeight * 0.5;
    this.radius = 0.38;

    this.position = new THREE.Vector3(0.5, this.halfHeight + 5, 0.5);
    this.velocity = new THREE.Vector3();
    this.onGround = false;
    this.headingRadians = 0;

    this.viewMode = 'third';
    this.thirdPersonDistance = 4;
    this.minThirdPersonDistance = 1.5;
    this.maxThirdPersonDistance = 9;
    this.thirdPersonHeightOffset = 0.6;
    this.thirdPersonZoomSpeed = 0.6;
    this.thirdPersonSideOffset = 0.55;

    this.walkSpeed = 5;
    this.sprintSpeed = 8.5;
    this.gravity = 24;
    this.jumpStrength = 9;

    this.input = new PlayerInput(this.world.getSelectableBlocks());

    this._vectorForward = new THREE.Vector3(0, 0, -1);
    this._vectorRight = new THREE.Vector3();
    this._tempPosition = new THREE.Vector3();
    this._playerMin = new THREE.Vector3();
    this._playerMax = new THREE.Vector3();

    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handlePointerLockChange = this._handlePointerLockChange.bind(this);

    document.addEventListener('keydown', this._handleKeyDown);
    document.addEventListener('keyup', this._handleKeyUp);
    this._onLock = () => this._handlePointerLockChange(true);
    this._onUnlock = () => this._handlePointerLockChange(false);
    this.controls.addEventListener('lock', this._onLock);
    this.controls.addEventListener('unlock', this._onUnlock);

    this.model = new PlayerModel();
    if (this.scene && this.model.group) {
      this.scene.add(this.model.group);
    }

    this._cameraTarget = new THREE.Vector3();
    this._syncCamera(0);
    this._updateModel();
  }

  start() {
    this.controls.lock();
  }

  dispose() {
    document.removeEventListener('keydown', this._handleKeyDown);
    document.removeEventListener('keyup', this._handleKeyUp);
    this.controls.removeEventListener('lock', this._onLock);
    this.controls.removeEventListener('unlock', this._onUnlock);
    this.controls.dispose();
    if (this.scene && this.model?.group) {
      this.scene.remove(this.model.group);
    }
    this.model?.dispose?.();
  }

  isLocked() {
    return this.controls.isLocked;
  }

  update(delta) {
    const move = this.input.getMovementVector();

    this.controls.getDirection(this._vectorForward);
    this._vectorForward.y = 0;
    if (this._vectorForward.lengthSq() < 1e-6) {
      this._vectorForward.set(0, 0, 1);
    }
    this._vectorForward.normalize();
    this._vectorRight.crossVectors(this._vectorForward, WORLD_UP).normalize();
    this.headingRadians = Math.atan2(this._vectorForward.x, -this._vectorForward.z);

    const desired = new THREE.Vector3();
    desired.addScaledVector(this._vectorForward, -move.y);
    desired.addScaledVector(this._vectorRight, move.x);
    if (desired.lengthSq() > 0) {
      desired.normalize();
    }

    const targetSpeed = this.input.sprint ? this.sprintSpeed : this.walkSpeed;
    desired.multiplyScalar(targetSpeed);

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, desired.x, 12, delta);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, desired.z, 12, delta);

    this.velocity.y -= this.gravity * delta;

    if (this.onGround && this.input.consumeJumpRequest()) {
      this.velocity.y = this.jumpStrength;
      this.onGround = false;
    }

    this._applyMovement(delta);
    this._syncCamera(delta);
    this._updateModel();
  }

  getCamera() {
    return this.camera;
  }

  getEyesPosition() {
    return this.controls.getObject().position.clone();
  }

  getActiveBlockId() {
    return this.input.getActiveBlockId();
  }

  getPosition() {
    return this.position.clone();
  }

  getHeadingRadians() {
    return this.headingRadians;
  }

  getHeadingDegrees() {
    return THREE.MathUtils.radToDeg(this.headingRadians);
  }

  getBlockPalette() {
    return this.input.blockPalette.slice();
  }

  getViewMode() {
    return this.viewMode;
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'third' ? 'first' : 'third';
    this._updateModel();
    this._syncCamera(0);
    return this.viewMode;
  }

  adjustThirdPersonDistance(direction) {
    if (this.viewMode !== 'third' || !direction) return;
    const step = this.thirdPersonZoomSpeed * direction;
    this.thirdPersonDistance = THREE.MathUtils.clamp(
      this.thirdPersonDistance + step,
      this.minThirdPersonDistance,
      this.maxThirdPersonDistance
    );
  }

  intersectsBlock(x, y, z) {
    const halfExtents = {
      x: this.radius,
      y: this.halfHeight,
      z: this.radius
    };

    this._playerMin.set(
      this.position.x - halfExtents.x,
      this.position.y - halfExtents.y,
      this.position.z - halfExtents.z
    );

    this._playerMax.set(
      this.position.x + halfExtents.x,
      this.position.y + halfExtents.y,
      this.position.z + halfExtents.z
    );

    const blockMinX = x;
    const blockMinY = y;
    const blockMinZ = z;
    const blockMaxX = x + 1;
    const blockMaxY = y + 1;
    const blockMaxZ = z + 1;

    const separated =
      this._playerMax.x <= blockMinX ||
      this._playerMin.x >= blockMaxX ||
      this._playerMax.y <= blockMinY ||
      this._playerMin.y >= blockMaxY ||
      this._playerMax.z <= blockMinZ ||
      this._playerMin.z >= blockMaxZ;

    return !separated;
  }

  teleport(position) {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this._syncCamera(0);
    this._updateModel();
  }

  _handleKeyDown(event) {
    if (event.code === 'KeyV') {
      this.toggleViewMode();
      return;
    }
    if (!this.isLocked()) return;
    this.input.handleKeyDown(event.code);
  }

  _handleKeyUp(event) {
    if (!this.isLocked()) return;
    this.input.handleKeyUp(event.code);
  }

  _handlePointerLockChange(locked) {
    if (!locked) {
      this.input.moveForward = false;
      this.input.moveBackward = false;
      this.input.moveLeft = false;
      this.input.moveRight = false;
      this.input.sprint = false;
    }
    if (typeof this.onPointerLockChange === 'function') {
      this.onPointerLockChange(locked);
    }
  }

  _applyMovement(delta) {
    const newPosition = this.position.clone();

    this._sweepAxis(newPosition, 'x', this.velocity.x * delta);
    this._sweepAxis(newPosition, 'z', this.velocity.z * delta);
    const collidedY = this._sweepAxis(newPosition, 'y', this.velocity.y * delta);

    if (collidedY && this.velocity.y < 0) {
      this.onGround = true;
    } else if (!collidedY) {
      this.onGround = false;
    }

    if (collidedY) {
      this.velocity.y = 0;
    }

    this.position.copy(newPosition);
  }

  _sweepAxis(position, axis, delta) {
    if (delta === 0) return false;

    const halfExtents = {
      x: this.radius,
      y: this.halfHeight,
      z: this.radius
    };

    position[axis] += delta;

    const minX = Math.floor(position.x - halfExtents.x);
    const maxX = Math.floor(position.x + halfExtents.x);
    const minY = Math.floor(position.y - halfExtents.y);
    const maxY = Math.floor(position.y + halfExtents.y);
    const minZ = Math.floor(position.z - halfExtents.z);
    const maxZ = Math.floor(position.z + halfExtents.z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (!this.world.isWithinBounds(x, y, z)) {
            if (axis === 'x') {
              position.x = THREE.MathUtils.clamp(position.x, this.radius, this.world.width - this.radius - 1);
            }
            if (axis === 'z') {
              position.z = THREE.MathUtils.clamp(position.z, this.radius, this.world.depth - this.radius - 1);
            }
            if (axis === 'y' && position.y < this.halfHeight + 1) {
              position.y = this.halfHeight + 0.01;
            }
            return true;
          }

          const blockId = this.world.getBlock(x, y, z);
          const block = BLOCK_DEFINITIONS[blockId];
          if (!block || !block.solid) continue;

          if (axis === 'x') {
            if (delta > 0) {
              position.x = x - halfExtents.x - 0.001;
            } else {
              position.x = x + 1 + halfExtents.x + 0.001;
            }
            return true;
          }

          if (axis === 'z') {
            if (delta > 0) {
              position.z = z - halfExtents.z - 0.001;
            } else {
              position.z = z + 1 + halfExtents.z + 0.001;
            }
            return true;
          }

          if (axis === 'y') {
            if (delta > 0) {
              position.y = y - halfExtents.y - 0.001;
            } else {
              position.y = y + 1 + halfExtents.y + 0.001;
            }
            return true;
          }
        }
      }
    }

    return false;
  }

  _syncCamera(delta = 0) {
    const eyeOffset = this.eyeHeight - this.halfHeight;
    const eyePosition = this._tempPosition.copy(this.position);
    eyePosition.y += eyeOffset;

    const cameraObject = this.controls.getObject();

    if (this.viewMode === 'first') {
      this._cameraTarget.copy(eyePosition);
    } else {
      const forward = this._vectorForward.clone();
      forward.y = 0;
      if (forward.lengthSq() < 1e-6) {
        forward.set(0, 0, -1);
      }
      forward.normalize();

      const offset = forward.clone().multiplyScalar(-this.thirdPersonDistance);
      const cameraPosition = eyePosition.clone().add(offset);
      cameraPosition.y += this.thirdPersonHeightOffset;

      const right = new THREE.Vector3().crossVectors(forward, WORLD_UP);
      if (right.lengthSq() > 1e-6) {
        right.normalize().multiplyScalar(this.thirdPersonSideOffset);
        cameraPosition.add(right);
      }

      const adjustStep = forward.clone().multiplyScalar(0.35);
      let safety = 0;
      while (
        this.world.isSolid(
          Math.floor(cameraPosition.x),
          Math.floor(cameraPosition.y),
          Math.floor(cameraPosition.z)
        ) && safety < 12
      ) {
        cameraPosition.add(adjustStep);
        safety += 1;
      }

      this._cameraTarget.copy(cameraPosition);
    }

    if (delta <= 0) {
      cameraObject.position.copy(this._cameraTarget);
      return;
    }

    const smoothing = this.viewMode === 'first' ? 18 : 8;
    const factor = 1 - Math.exp(-smoothing * delta);
    cameraObject.position.lerp(this._cameraTarget, factor);
  }

  _updateModel() {
    if (!this.model) return;
    this.model.setVisible(this.viewMode === 'third');
    this.model.update(this.position, this.headingRadians, this.halfHeight);
  }
}
