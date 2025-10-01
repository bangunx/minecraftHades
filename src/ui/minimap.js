import * as THREE from 'three';
import { BLOCKS } from '../world/blockTypes.js';
import { CHUNK_SIZE } from '../world/chunk.js';

const DEFAULT_COLORS = {
  [BLOCKS.AIR]: '#000000',
  [BLOCKS.GRASS]: '#3aa76d',
  [BLOCKS.DIRT]: '#8b5a2b',
  [BLOCKS.STONE]: '#7b8494',
  [BLOCKS.SAND]: '#d7c379',
  [BLOCKS.WATER]: '#3a6cde',
  [BLOCKS.LOG]: '#7d4b26',
  [BLOCKS.LEAVES]: '#49c070'
};

export class Minimap {
  constructor(container, world, player, options = {}) {
    this.container = container;
    this.world = world;
    this.player = player;

    const size = options.size ?? 180;
    const pixelRatio = window.devicePixelRatio ?? 1;
    this.viewRadiusBlocks = options.viewRadiusBlocks ?? world.renderDistance * CHUNK_SIZE;
    if (!Number.isFinite(this.viewRadiusBlocks) || this.viewRadiusBlocks <= 0) {
      this.viewRadiusBlocks = 64;
    }
    this.refreshInterval = options.refreshInterval ?? 0.25;

    this._accumulator = 0;

    this.displayCanvas = document.createElement('canvas');
    this.displayCanvas.width = Math.floor(size * pixelRatio);
    this.displayCanvas.height = Math.floor(size * pixelRatio);
    this.displayCanvas.style.width = `${size}px`;
    this.displayCanvas.style.height = `${size}px`;
    this.displayCanvas.style.imageRendering = 'pixelated';
    this.displayCtx = this.displayCanvas.getContext('2d');
    this.displayCtx.imageSmoothingEnabled = false;

    this.markerSize = options.markerSize ?? 8;
    this.colors = { ...DEFAULT_COLORS, ...(options.colors ?? {}) };

    this._tempDirection = new THREE.Vector3();
    this._lastWorldBuildTime = -1;
    this._needsRedraw = true;
    this._baseImageData = null;

    if (this.container) {
      this.container.appendChild(this.displayCanvas);
    }
  }

  update(delta = 0) {
    if (!this.displayCtx) return;

    this._accumulator += delta;

    if (
      this.world.lastBuildTime !== this._lastWorldBuildTime ||
      this._needsRedraw ||
      this._accumulator >= this.refreshInterval
    ) {
      this._drawTerrain();
      this._lastWorldBuildTime = this.world.lastBuildTime;
      this._needsRedraw = false;
      this._accumulator = 0;
    }

    this._drawPlayerMarker();
  }

  refreshTerrain() {
    this._needsRedraw = true;
  }

  dispose() {
    if (this.container && this.displayCanvas.parentElement === this.container) {
      this.container.removeChild(this.displayCanvas);
    }
    this.displayCanvas = null;
    this.displayCtx = null;
    this._baseImageData = null;
  }

  _drawTerrain() {
    const ctx = this.displayCtx;
    if (!ctx) return;

    const { width, height } = this.displayCanvas;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const playerPos = this.player.getPosition();
    const viewDiameter = Math.max(1, this.viewRadiusBlocks * 2);

    for (let py = 0; py < height; py++) {
      const v = height > 1 ? py / (height - 1) : 0.5;
      const worldZ = playerPos.z + (v - 0.5) * viewDiameter;
      for (let px = 0; px < width; px++) {
        const u = width > 1 ? px / (width - 1) : 0.5;
        const worldX = playerPos.x + (u - 0.5) * viewDiameter;
        const blockId = this.world.getSurfaceBlockId(worldX, worldZ);
        const color = this._getColor(blockId);
        const index = (px + py * width) * 4;
        data[index + 0] = color.r;
        data[index + 1] = color.g;
        data[index + 2] = color.b;
        data[index + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    this._baseImageData = imageData;
  }

  _drawPlayerMarker() {
    if (!this.displayCtx) return;

    const ctx = this.displayCtx;
    const { width, height } = this.displayCanvas;

    if (this._baseImageData) {
      ctx.putImageData(this._baseImageData, 0, 0);
    }

    const position = this.player.getPosition();
    const viewDiameter = Math.max(1, this.viewRadiusBlocks * 2);
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const px = centerX;
    const py = centerY;

    const direction = this.player.getCamera().getWorldDirection(this._tempDirection);
    const angle = Math.atan2(direction.x, direction.z);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -this.markerSize * 0.6);
    ctx.lineTo(this.markerSize * 0.45, this.markerSize * 0.6);
    ctx.lineTo(-this.markerSize * 0.45, this.markerSize * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(1, this.markerSize * 0.12);
    ctx.beginPath();
    ctx.arc(px, py, this.markerSize * 0.65, 0, Math.PI * 2);
    ctx.stroke();
  }

  _getColor(blockId) {
    const hex = this.colors[blockId] ?? '#505050';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }
}
