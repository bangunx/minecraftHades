import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { PlayerInput } from './input.js';
import { BLOCK_DEFINITIONS } from '../world/blockTypes.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor({ camera, canvas, world, onPointerLockChange }) {
    this.camera = camera;
    this.world = world;
    this.canvas = canvas;
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

    this.walkSpeed = 5;
    this.sprintSpeed = 8.5;
    this.gravity = 24;
    this.jumpStrength = 9;

    this.input = new PlayerInput(this.world.getSelectableBlocks());

    this._vectorForward = new THREE.Vector3();
    this._vectorRight = new THREE.Vector3();
    this._tempPosition = new THREE.Vector3();
    this._playerMin = new THREE.Vector3();
    this._playerMax = new THREE.Vector3();

    this.cameraMode = 'fps';
    this.thirdPersonDistance = 4.5;
    this.thirdPersonMinDistance = 2.5;
    this.thirdPersonMaxDistance = 12;
    this.thirdPersonVerticalOffset = 0.6;
    this.thirdPersonScrollScale = 0.01;
    this.flySpeed = 9;
    this.flySprintMultiplier = 1.75;

    this._cameraCollisionRay = new THREE.Raycaster();
    this._cameraCollisionRay.far = this.thirdPersonMaxDistance;

    this.defaultFov = this.camera.fov;
    this.minFov = 20;
    this.maxFov = 120;
    this.zoomStep = 6;
    this.zoomScrollScale = 0.05;
    this.sprintFovBoost = 8;
    this._manualFovOffset = 0;
    this._targetFov = this.camera.fov;
    this._fovEpsilon = 1e-3;

    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handlePointerLockChange = this._handlePointerLockChange.bind(this);
    this._handleWheel = this._handleWheel.bind(this);

    document.addEventListener('keydown', this._handleKeyDown);
    document.addEventListener('keyup', this._handleKeyUp);
    this._wheelListenerOptions = { passive: false };
    document.addEventListener('wheel', this._handleWheel, this._wheelListenerOptions);
    this._onLock = () => this._handlePointerLockChange(true);
    this._onUnlock = () => this._handlePointerLockChange(false);
    this.controls.addEventListener('lock', this._onLock);
    this.controls.addEventListener('unlock', this._onUnlock);

    this._refreshFovTarget();
    this._syncCamera();
  }

  start() {
    this.controls.lock();
  }

  dispose() {
    document.removeEventListener('keydown', this._handleKeyDown);
    document.removeEventListener('keyup', this._handleKeyUp);
    document.removeEventListener('wheel', this._handleWheel, this._wheelListenerOptions);
    this.controls.removeEventListener('lock', this._onLock);
    this.controls.removeEventListener('unlock', this._onUnlock);
    this.controls.dispose();
  }

  isLocked() {
    return this.controls.isLocked;
  }

  update(delta) {
    if (this.cameraMode === 'fly') {
      this._updateFly(delta);
    } else {
      this._updateGround(delta);
    }
    this._syncCamera();
    this._refreshFovTarget();
    this._updateZoom(delta);
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

  getActiveBlockIndex() {
    return this.input.getActiveBlockIndex();
  }

  getBlockPalette() {
    return this.input.getBlockPalette();
  }

  setActiveBlockIndex(index) {
    this.input.setActiveBlockIndex(index);
  }

  getCameraMode() {
    return this.cameraMode;
  }

  getPosition() {
    return this.position.clone();
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
    this._syncCamera();
  }

  _handleKeyDown(event) {
    if (event.code === 'F5') {
      event.preventDefault?.();
      this._cycleCameraMode();
      return;
    }
    if (!this.isLocked()) return;
    if (this._handleZoomKey(event.code)) return;
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
      this.input.flyUp = false;
      this.input.flyDown = false;
      this.input.jumpHeld = false;
      this.input.consumeJumpRequest();
    }
    if (typeof this.onPointerLockChange === 'function') {
      this.onPointerLockChange(locked);
    }
  }

  _handleWheel(event) {
    if (!this.isLocked()) return;
    if (event.cancelable) {
      event.preventDefault();
    }

    if (event.altKey || event.ctrlKey) {
      this.input.cyclePalette(event.deltaY);
      return;
    }

    if (this.cameraMode === 'tps' && !event.shiftKey) {
      this._adjustThirdPersonDistance(event.deltaY);
      return;
    }

    const deltaFov = event.deltaY * this.zoomScrollScale;
    if (deltaFov !== 0) {
      this._adjustZoom(deltaFov);
    }
  }

  _cycleCameraMode() {
    const modes = ['fps', 'tps', 'fly'];
    const currentIndex = modes.indexOf(this.cameraMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this._setCameraMode(nextMode);
  }

  _setCameraMode(mode) {
    if (this.cameraMode === mode) return;
    const previous = this.cameraMode;
    this.cameraMode = mode;

    if (mode === 'fly') {
      this.velocity.set(0, 0, 0);
      this.onGround = false;
    }

    if (previous === 'fly') {
      this.input.flyUp = false;
      this.input.flyDown = false;
      this.input.jumpHeld = false;
      this.input.consumeJumpRequest();
    }

    this._refreshFovTarget();
    this._syncCamera();
  }

  _handleZoomKey(code) {
    switch (code) {
      case 'Equal':
      case 'NumpadAdd':
        this._adjustZoom(-this.zoomStep);
        return true;
      case 'Minus':
      case 'NumpadSubtract':
        this._adjustZoom(this.zoomStep);
        return true;
      case 'Digit0':
      case 'Numpad0':
        this._setManualFov(this.defaultFov);
        return true;
      default:
        return false;
    }
  }

  _adjustZoom(deltaFov) {
    this._setManualFov(this.defaultFov + this._manualFovOffset + deltaFov);
  }

  _setManualFov(fov) {
    const clamped = THREE.MathUtils.clamp(fov, this.minFov, this.maxFov);
    this._manualFovOffset = clamped - this.defaultFov;
    this._refreshFovTarget();
  }

  _updateZoom(delta) {
    const nextFov = THREE.MathUtils.damp(this.camera.fov, this._targetFov, 12, delta);
    if (Math.abs(nextFov - this.camera.fov) > this._fovEpsilon) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }

  _refreshFovTarget() {
    const sprintBoost = this.cameraMode !== 'fly' && this.input.sprint ? this.sprintFovBoost : 0;
    const desired = THREE.MathUtils.clamp(
      this.defaultFov + this._manualFovOffset + sprintBoost,
      this.minFov,
      this.maxFov
    );
    this._targetFov = desired;
  }

  _updateGround(delta) {
    const move = this.input.getMovementVector();

    this.controls.getDirection(this._vectorForward);
    this._vectorForward.y = 0;
    if (this._vectorForward.lengthSq() < 1e-6) {
      this._vectorForward.set(0, 0, 1);
    }
    this._vectorForward.normalize();
    this._vectorRight.crossVectors(this._vectorForward, WORLD_UP).normalize();

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
  }

  _updateFly(delta) {
    const move = this.input.getMovementVector();

    this.controls.getDirection(this._vectorForward);
    if (this._vectorForward.lengthSq() < 1e-6) {
      this._vectorForward.set(0, 0, 1);
    }
    this._vectorForward.normalize();

    const forwardFlat = this._vectorForward.clone();
    forwardFlat.y = 0;
    if (forwardFlat.lengthSq() < 1e-6) {
      forwardFlat.set(0, 0, -1);
    }
    forwardFlat.normalize();
    this._vectorRight.crossVectors(forwardFlat, WORLD_UP).normalize();

    const movement = new THREE.Vector3();
    movement.addScaledVector(forwardFlat, -move.y);
    movement.addScaledVector(this._vectorRight, move.x);

    let vertical = 0;
    if (this.input.flyUp || this.input.jumpHeld) vertical += 1;
    if (this.input.flyDown) vertical -= 1;
    movement.y += vertical;

    if (movement.lengthSq() > 0) {
      movement.normalize();
    }

    const speed = this.input.sprint ? this.flySpeed * this.flySprintMultiplier : this.flySpeed;
    const displacement = movement.multiplyScalar(speed * delta);
    this.position.add(displacement);

    if (delta > 0) {
      this.velocity.copy(displacement).divideScalar(delta);
    } else {
      this.velocity.set(0, 0, 0);
    }

    this.onGround = false;
  }

  _adjustThirdPersonDistance(deltaY) {
    const next = THREE.MathUtils.clamp(
      this.thirdPersonDistance + deltaY * this.thirdPersonScrollScale,
      this.thirdPersonMinDistance,
      this.thirdPersonMaxDistance
    );
    this.thirdPersonDistance = next;
    this._syncCamera();
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
          if (!this.world.isWithinHeight(y)) {
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

  _syncCamera() {
    const eyeOffset = this.eyeHeight - this.halfHeight;
    const headPosition = this._tempPosition.copy(this.position);
    headPosition.y += eyeOffset;

    if (this.cameraMode === 'tps') {
      const cameraPosition = this._computeThirdPersonCamera(headPosition);
      this.controls.getObject().position.copy(cameraPosition);
    } else {
      this.controls.getObject().position.copy(headPosition);
    }
  }

  _computeThirdPersonCamera(targetPosition) {
    this.controls.getDirection(this._vectorForward);
    if (this._vectorForward.lengthSq() < 1e-6) {
      this._vectorForward.set(0, 0, 1);
    }
    this._vectorForward.normalize();

    const backward = this._vectorForward.clone().multiplyScalar(-1);
    const desired = targetPosition.clone().addScaledVector(backward, this.thirdPersonDistance);
    desired.y += this.thirdPersonVerticalOffset;

    const rayDirection = desired.clone().sub(targetPosition);
    const distance = rayDirection.length();
    if (distance > 0.001) {
      rayDirection.normalize();
      this._cameraCollisionRay.set(targetPosition, rayDirection);
      this._cameraCollisionRay.far = distance;
      const intersections = this._cameraCollisionRay.intersectObjects(this.world.intersectableMeshes, false);
      if (intersections.length > 0) {
        const safeDistance = Math.max(0.3, intersections[0].distance - 0.2);
        desired.copy(targetPosition).addScaledVector(rayDirection, safeDistance);
      }
    }

    // Keep camera slightly above ground level to avoid clipping.
    desired.y = Math.max(desired.y, targetPosition.y - 0.5);
    return desired;
  }
}
