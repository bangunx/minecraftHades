import * as THREE from 'three';
import { createRenderer } from './renderer.js';
import { createCamera } from './camera.js';
import { GameLoop } from './loop.js';
import { setupLighting } from './lighting.js';
import { setupEnvironment } from './environment.js';
import { World } from '../world/world.js';
import { Player } from '../player/player.js';
import { Hud } from '../ui/hud.js';
import { BLOCKS } from '../world/blockTypes.js';

export class Game {
  constructor({ canvas, hudElement, onPointerLockChange }) {
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
      onPointerLockChange
    });

    this.scene.add(this.player.controls.getObject());

    const spawnPoint = this._findSpawnPoint();
    this.player.teleport(spawnPoint);

    this.hud = new Hud(hudElement, this.player);

    this.loop = new GameLoop(this.update.bind(this), this.render.bind(this));

    this._rayDirection = new THREE.Vector3();

    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._preventContextMenu = (event) => event.preventDefault();

    canvas.addEventListener('mousedown', this._handleMouseDown);
    canvas.addEventListener('contextmenu', this._preventContextMenu);
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
    this.hud.update(delta);
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
  }

  dispose() {
    this.loop.stop();
    this.player.dispose();
    this.world.dispose();
    this.renderer.dispose();
    this.canvas.removeEventListener('mousedown', this._handleMouseDown);
    this.canvas.removeEventListener('contextmenu', this._preventContextMenu);
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
