import * as THREE from 'three';
import { createRenderer } from './renderer.js';
import { createCamera } from './camera.js';
import { GameLoop } from './loop.js';
import { setupLighting } from './lighting.js';
import { setupEnvironment } from './environment.js';
import { World } from '../world/world.js';
import { Player } from '../player/player.js';
import { Hud } from '../ui/hud.js';
import { Minimap } from '../ui/minimap.js';
import { Compass } from '../ui/compass.js';
import { BLOCKS } from '../world/blockTypes.js';

export class Game {
  constructor({ canvas, hudElement, minimapCanvas, compassElement, viewModeLabelElement, onPointerLockChange }) {
    this.canvas = canvas;
    this.renderer = createRenderer(canvas);
    this.scene = new THREE.Scene();
    this.camera = createCamera();

    setupEnvironment(this.scene);
    this.lighting = setupLighting(this.scene);

    this.world = new World(this.scene);
    this.world.generate();
    this.world.build();

    this.player = new Player({
      camera: this.camera,
      canvas,
      world: this.world,
      scene: this.scene,
      onPointerLockChange
    });

    this.scene.add(this.player.controls.getObject());

    const spawnPoint = this._findSpawnPoint();
    this.player.teleport(spawnPoint);

    this.minimap = minimapCanvas
      ? new Minimap({ canvas: minimapCanvas, world: this.world, player: this.player })
      : null;
    this.compass = compassElement ? new Compass({ element: compassElement, player: this.player }) : null;
    if (this.minimap) {
      this.minimap.registerLandmark(spawnPoint.x, spawnPoint.z, 'Spawn');
    }

    this.hud = new Hud(hudElement, this.player);

    this.viewModeLabelElement = viewModeLabelElement ?? null;
    this._lastViewModeLabel = null;
    this._updateViewModeLabel(true);

    this.loop = new GameLoop(this.update.bind(this), this.render.bind(this));

    this._rayDirection = new THREE.Vector3();

    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._preventContextMenu = (event) => event.preventDefault();
    this._handleWheel = this._handleWheel.bind(this);

    canvas.addEventListener('mousedown', this._handleMouseDown);
    canvas.addEventListener('contextmenu', this._preventContextMenu);
    canvas.addEventListener('wheel', this._handleWheel, { passive: false });
  }

  start() {
    if (!this.player.isLocked()) {
      this.player.start();
    }
    this.loop.start();
  }

  update(delta) {
    this.player.update(delta);
    this.world.update(delta);
    if (this.minimap) {
      this.minimap.update(delta);
    }
    if (this.compass) {
      this.compass.update();
    }

    const landmarks = this.minimap ? this.minimap.getLandmarkSummaries() : [];
    const headingLabel = this.compass ? this.compass.getDirectionLabel() : null;
    this._updateViewModeLabel();
    this.hud.update(delta, { landmarks, headingLabel });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.minimap?.handleResize();
  }

  dispose() {
    this.loop.stop();
    this.player.dispose();
    this.world.dispose();
    this.renderer.dispose();
    this.canvas.removeEventListener('mousedown', this._handleMouseDown);
    this.canvas.removeEventListener('contextmenu', this._preventContextMenu);
    this.canvas.removeEventListener('wheel', this._handleWheel);
  }

  _handleMouseDown(event) {
    if (!this.player.isLocked()) return;

    if (event.button === 0) {
      this._dig();
    } else if (event.button === 2) {
      this._place();
    }
  }

  _dig() {
    const target = this._raycast();
    if (!target) return;
    if (this.world.dig(target.block.x, target.block.y, target.block.z)) {
      this.world.update(0);
    }
  }

  _place() {
    const target = this._raycast();
    const blockId = this.player.getActiveBlockId();
    if (!target || !blockId) return;

    const placePosition = target.block.clone();
    const normal = target.normal.clone().round();
    placePosition.add(normal);
    placePosition.set(
      Math.round(placePosition.x),
      Math.round(placePosition.y),
      Math.round(placePosition.z)
    );

    if (!this.world.isWithinBounds(placePosition.x, placePosition.y, placePosition.z)) return;
    if (this.player.intersectsBlock(placePosition.x, placePosition.y, placePosition.z)) return;

    if (this.world.place(placePosition.x, placePosition.y, placePosition.z, blockId)) {
      this.world.update(0);
    }
  }

  _raycast() {
    const camera = this.player.getCamera();
    camera.getWorldDirection(this._rayDirection).normalize();
    const origin = this.player.getEyesPosition();
    return this.world.raycast(origin, this._rayDirection, { maxDistance: 8 });
  }

  _handleWheel(event) {
    const mode = this.player.getViewMode?.();
    if (mode !== 'third') return;

    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    this.player.adjustThirdPersonDistance?.(delta);
  }

  toggleViewMode() {
    const mode = this.player.toggleViewMode();
    this._updateViewModeLabel(true);
    return mode;
  }

  getViewMode() {
    return this.player.getViewMode();
  }

  _updateViewModeLabel(force = false) {
    if (!this.viewModeLabelElement) return;
    const mode = this.player.getViewMode();
    if (!force && mode === this._lastViewModeLabel) return;
    const label = mode === 'third' ? 'Third-person' : 'First-person';
    this.viewModeLabelElement.textContent = label;
    this._lastViewModeLabel = mode;
  }

  _findSpawnPoint() {
    const centerX = Math.floor(this.world.width / 2);
    const centerZ = Math.floor(this.world.depth / 2);
    const searchRadius = Math.max(this.world.width, this.world.depth) / 2;

    for (let r = 0; r < searchRadius; r += 2) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const x = centerX + dx;
          const z = centerZ + dz;
          if (!this.world.isWithinBounds(x, 0, z)) continue;
          const surface = this.world.getSurfaceHeight(x, z);
          const blockId = this.world.getBlock(x, surface, z);
          if (blockId === BLOCKS.WATER) continue;
          const centerY = surface + this.player.halfHeight + 0.2;
          if (centerY + this.player.halfHeight >= this.world.height) continue;
          return new THREE.Vector3(x + 0.5, centerY, z + 0.5);
        }
      }
    }

    return new THREE.Vector3(centerX + 0.5, this.player.halfHeight + 2, centerZ + 0.5);
  }
}
