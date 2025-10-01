import { BLOCKS, blockNameFromId } from '../world/blockTypes.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class Minimap {
  constructor({ canvas, world, player }) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d') ?? null;
    this.world = world;
    this.player = player;

    this.displayWidth = canvas?.clientWidth || 180;
    this.displayHeight = canvas?.clientHeight || 180;
    this.pixelRatio = window.devicePixelRatio ?? 1;

    this.offscreen = document.createElement('canvas');
    this.offscreen.width = world.width;
    this.offscreen.height = world.depth;
    this.offCtx = this.offscreen.getContext('2d');
    this.offCtx.imageSmoothingEnabled = false;

    this.palette = {
      [BLOCKS.GRASS]: [84, 148, 72],
      [BLOCKS.DIRT]: [120, 88, 60],
      [BLOCKS.STONE]: [130, 134, 144],
      [BLOCKS.SAND]: [224, 206, 148],
      [BLOCKS.WATER]: [66, 142, 210],
      [BLOCKS.LOG]: [116, 83, 48],
      [BLOCKS.LEAVES]: [64, 140, 80],
      [BLOCKS.COBBLE]: [140, 144, 156],
      [BLOCKS.CLAY]: [162, 150, 196],
      [BLOCKS.GLASS]: [210, 234, 252],
      [BLOCKS.GLOWSTONE]: [255, 214, 120]
    };
    this.defaultColor = [180, 180, 180];

    this.landmarkMap = new Map();
    this.landmarks = [];
    this.maxLandmarks = 14;
    this.landmarkTimer = 0;
    this.landmarkInterval = 6;

    this.lastBuildTime = -1;

    this._configureCanvas();
    this._regenerateBase();
  }

  handleResize() {
    this._configureCanvas();
  }

  registerLandmark(x, z, label) {
    const lx = Math.floor(x);
    const lz = Math.floor(z);
    if (!this.world.isWithinBounds(lx, 0, lz)) return;
    const key = `${lx},${lz}`;
    if (this.landmarkMap.has(key)) return;
    const height = this.world.getSurfaceHeight(lx, lz);
    const blockId = this.world.getBlock(lx, height, lz);
    const entry = {
      x: lx,
      z: lz,
      height,
      blockId,
      label,
      pinned: true
    };
    this.landmarkMap.set(key, entry);
    this.landmarks.push(entry);
    this._trimLandmarks();
  }

  update(delta) {
    if (!this.ctx) return;

    if (this.world.lastBuildTime !== this.lastBuildTime) {
      this._regenerateBase();
    }

    this.landmarkTimer += delta;
    if (this.landmarkTimer >= this.landmarkInterval) {
      this.landmarkTimer = 0;
      this._captureCurrentLocation();
    }

    this._draw();
  }

  getLandmarkSummaries() {
    return this.landmarks.map((entry) => {
      const name = blockNameFromId(entry.blockId);
      const label = entry.label ?? name;
      const suffix = entry.pinned ? ' [pin]' : '';
      return `${label}${suffix} (${entry.x}, ${entry.z})`;
    });
  }

  _configureCanvas() {
    if (!this.canvas || !this.ctx) return;
    const displayWidth = this.canvas.clientWidth || this.displayWidth;
    const displayHeight = this.canvas.clientHeight || this.displayHeight;
    const ratio = window.devicePixelRatio || 1;

    this.displayWidth = displayWidth;
    this.displayHeight = displayHeight;
    this.pixelRatio = ratio;

    this.canvas.width = Math.round(displayWidth * ratio);
    this.canvas.height = Math.round(displayHeight * ratio);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(ratio, ratio);
    this.ctx.imageSmoothingEnabled = false;
  }

  _regenerateBase() {
    if (!this.offCtx) return;

    const width = this.world.width;
    const depth = this.world.depth;
    const imageData = this.offCtx.createImageData(width, depth);
    const data = imageData.data;

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const height = this.world.getSurfaceHeight(x, z);
        const blockId = this.world.getBlock(x, height, z);
        const color = this._colorForBlock(blockId, height);
        const index = (z * width + x) * 4;
        data[index] = color[0];
        data[index + 1] = color[1];
        data[index + 2] = color[2];
        data[index + 3] = 255;
      }
    }

    this.offCtx.putImageData(imageData, 0, 0);
    this.lastBuildTime = this.world.lastBuildTime;
  }

  _captureCurrentLocation() {
    const position = this.player.getPosition();
    const x = Math.floor(position.x);
    const z = Math.floor(position.z);

    if (!this.world.isWithinBounds(x, 0, z)) return;

    const key = `${x},${z}`;
    if (this.landmarkMap.has(key)) return;

    const height = this.world.getSurfaceHeight(x, z);
    const blockId = this.world.getBlock(x, height, z);
    const label = this._labelForLocation(blockId, height);

    const entry = { x, z, height, blockId, label, pinned: false };
    this.landmarkMap.set(key, entry);
    this.landmarks.push(entry);
    this._trimLandmarks();
  }

  _labelForLocation(blockId, height) {
    const name = blockNameFromId(blockId);
    if (blockId === BLOCKS.WATER) return `Water Line ${height}`;
    if (blockId === BLOCKS.SAND) return `Shore ${height}`;
    if (height >= this.world.seaLevel + 6) return `Highland ${height}`;
    if (height <= this.world.seaLevel - 3) return `Lowland ${height}`;
    return `${name} ${height}`;
  }

  _draw() {
    const ctx = this.ctx;
    const width = this.displayWidth;
    const height = this.displayHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.offscreen, 0, 0, this.world.width, this.world.depth, 0, 0, width, height);
    ctx.restore();

    this._drawLandmarks(ctx, width, height);
    this._drawPlayer(ctx, width, height);
    this._drawFrame(ctx, width, height);
  }

  _drawLandmarks(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(20, 24, 32, 0.65)';
    ctx.lineWidth = 1;

    for (const entry of this.landmarks) {
      const sx = (entry.x / this.world.width) * width;
      const sy = (entry.z / this.world.depth) * height;
      ctx.fillStyle = entry.pinned ? '#7bdff2' : '#ffd166';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawPlayer(ctx, width, height) {
    const position = this.player.getPosition();
    const px = clamp((position.x / this.world.width) * width, 6, width - 6);
    const pz = clamp((position.z / this.world.depth) * height, 6, height - 6);
    const heading = this.player.getHeadingRadians?.() ?? 0;

    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(heading);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(12, 16, 24, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _drawFrame(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    ctx.restore();
  }

  _colorForBlock(blockId, height) {
    const base = this.palette[blockId] ?? this.defaultColor;
    const shade = 0.75 + (height / this.world.height) * 0.35;
    return [
      clamp(Math.round(base[0] * shade), 0, 255),
      clamp(Math.round(base[1] * shade), 0, 255),
      clamp(Math.round(base[2] * shade), 0, 255)
    ];
  }

  _trimLandmarks() {
    while (this.landmarks.length > this.maxLandmarks) {
      const index = this.landmarks.findIndex((entry) => !entry.pinned);
      if (index === -1) break;
      const [removed] = this.landmarks.splice(index, 1);
      if (removed) {
        this.landmarkMap.delete(`${removed.x},${removed.z}`);
      }
    }
  }
}
