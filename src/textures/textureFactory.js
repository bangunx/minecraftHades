import * as THREE from 'three';
import { BLOCKS } from '../world/blockTypes.js';

const SIZE = 32;

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  return canvas;
}

function toCanvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function addFineNoise(ctx, intensity = 0.06) {
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() * 2 - 1) * intensity * 255;
    data[i] = clampColor(data[i] + noise);
    data[i + 1] = clampColor(data[i + 1] + noise);
    data[i + 2] = clampColor(data[i + 2] + noise);
  }
  ctx.putImageData(imageData, 0, 0);
}

function clampColor(value) {
  return Math.max(0, Math.min(255, value));
}

function hexToRgb(hex) {
  const parsed = parseInt(hex.replace('#', ''), 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function paintVerticalGradient(ctx, topHex, bottomHex) {
  const top = hexToRgb(topHex);
  const bottom = hexToRgb(bottomHex);
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const { data } = imageData;
  for (let y = 0; y < SIZE; y++) {
    const t = y / (SIZE - 1);
    const r = Math.round(lerp(top.r, bottom.r, t));
    const g = Math.round(lerp(top.g, bottom.g, t));
    const b = Math.round(lerp(top.b, bottom.b, t));
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawSpeckles(ctx, color, density, radiusRange = [1, 2], alpha = 0.35) {
  const rgb = hexToRgb(color);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const amount = Math.floor(SIZE * SIZE * density);
  for (let i = 0; i < amount; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const radius = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStripes(ctx, color, stripeWidth = 4, alpha = 0.25) {
  const rgb = hexToRgb(color);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  for (let x = 0; x < SIZE; x += stripeWidth * 2) {
    ctx.fillRect(x, 0, stripeWidth, SIZE);
  }
  ctx.restore();
}

function drawRings(ctx, innerColor, outerColor) {
  const inner = hexToRgb(innerColor);
  const outer = hexToRgb(outerColor);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const maxRadius = SIZE / 2 - 1;
  for (let r = 0; r < maxRadius; r += 1) {
    const t = r / maxRadius;
    const cr = Math.round(lerp(inner.r, outer.r, t));
    const cg = Math.round(lerp(inner.g, outer.g, t));
    const cb = Math.round(lerp(inner.b, outer.b, t));
    ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${1 - t * 0.8})`;
    ctx.beginPath();
    ctx.arc(cx, cy, maxRadius - r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawWaves(ctx, color, amplitude = 1.5, frequency = 0.35, alpha = 0.25) {
  const rgb = hexToRgb(color);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  ctx.lineWidth = 1;
  for (let y = 0; y < SIZE; y += 4) {
    ctx.beginPath();
    for (let x = 0; x < SIZE; x++) {
      const offset = Math.sin(frequency * x + y * 0.35) * amplitude;
      ctx.lineTo(x, y + offset);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function makeGrassTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#3ea847', '#3b6224');
  drawSpeckles(ctx, '#56d76d', 0.02, [0.6, 1.5], 0.6);
  drawSpeckles(ctx, '#2e4d19', 0.01, [0.5, 1], 0.35);
  addFineNoise(ctx, 0.1);
  return toCanvasTexture(canvas);
}

function makeDirtTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#5b3a1a', '#3b2412');
  drawSpeckles(ctx, '#6d4521', 0.025, [0.8, 1.8], 0.6);
  drawSpeckles(ctx, '#2d170a', 0.018, [0.8, 1.4], 0.4);
  addFineNoise(ctx, 0.12);
  return toCanvasTexture(canvas);
}

function makeStoneTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#8f9399', '#5a5f65');
  drawSpeckles(ctx, '#d5d7d9', 0.01, [0.4, 1.1], 0.55);
  drawSpeckles(ctx, '#2a2d30', 0.01, [0.4, 1.1], 0.45);
  addFineNoise(ctx, 0.08);
  return toCanvasTexture(canvas);
}

function makeSandTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#f0e0a0', '#d7b970');
  drawSpeckles(ctx, '#f8f2c6', 0.018, [0.6, 1.2], 0.5);
  drawSpeckles(ctx, '#bca261', 0.012, [0.6, 1], 0.35);
  addFineNoise(ctx, 0.06);
  return toCanvasTexture(canvas);
}

function makeWaterTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#64b9ff', '#2361a3');
  drawWaves(ctx, '#b8e3ff', 1.3, 0.28, 0.55);
  drawWaves(ctx, '#2060a8', 1.8, 0.22, 0.35);
  addFineNoise(ctx, 0.04);
  const texture = toCanvasTexture(canvas);
  return texture;
}

function makeLogTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#825127', '#4a2d15');
  drawStripes(ctx, '#9a6635', 5, 0.45);
  drawStripes(ctx, '#2b1508', 2, 0.25);
  addFineNoise(ctx, 0.08);
  return toCanvasTexture(canvas);
}

function makeLeavesTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#3f8a3c', '#1e4d1c');
  drawSpeckles(ctx, '#75d06d', 0.035, [0.7, 1.4], 0.6);
  drawSpeckles(ctx, '#274f25', 0.02, [0.6, 1.2], 0.4);
  addFineNoise(ctx, 0.08);
  const texture = toCanvasTexture(canvas);
  return texture;
}

function makeSaplingTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2d5016';
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawSpeckles(ctx, '#4a8c2a', 0.04, [1, 2.5], 0.8);
  drawSpeckles(ctx, '#1a3010', 0.02, [0.8, 1.5], 0.5);
  addFineNoise(ctx, 0.06);
  const texture = toCanvasTexture(canvas);
  return texture;
}

function makeWheatTexture(stage) {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  const colors = {
    1: { top: '#6b9b37', bottom: '#4a6b25' },
    2: { top: '#8ab84d', bottom: '#6b9b37' },
    3: { top: '#e8d174', bottom: '#c4a648' }
  };
  const color = colors[stage] || colors[1];
  paintVerticalGradient(ctx, color.top, color.bottom);
  drawSpeckles(ctx, '#f0e8a0', 0.015, [0.5, 1], 0.4);
  addFineNoise(ctx, 0.08);
  const texture = toCanvasTexture(canvas);
  return texture;
}

function makeCobblestoneTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#7a7c80', '#5a5c60');
  drawSpeckles(ctx, '#9a9c9f', 0.025, [1, 2.5], 0.6);
  drawSpeckles(ctx, '#3a3c40', 0.02, [0.8, 2], 0.5);
  addFineNoise(ctx, 0.12);
  const texture = toCanvasTexture(canvas);
  return texture;
}

function makeGravelTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#7d7166', '#5a5046');
  drawSpeckles(ctx, '#938578', 0.035, [0.8, 2], 0.65);
  drawSpeckles(ctx, '#3d352c', 0.025, [0.7, 1.8], 0.5);
  addFineNoise(ctx, 0.14);
  const texture = toCanvasTexture(canvas);
  return texture;
}

function createWaterMaterial(texture) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    opacity: 0.72,
    roughness: 0.35,
    metalness: 0.05,
    depthWrite: false
  });
  return material;
}

function createOpaqueMaterial(texture, extra = {}) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.95,
    metalness: 0.02,
    ...extra
  });
  return material;
}

function createLeafMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.35,
    roughness: 0.85,
    metalness: 0.05
  });
}

export class TextureFactory {
  constructor() {
    this.materials = null;
  }

  getMaterials() {
    if (this.materials) return this.materials;

    const grass = makeGrassTexture();
    const dirt = makeDirtTexture();
    const stone = makeStoneTexture();
    const sand = makeSandTexture();
    const water = makeWaterTexture();
    const log = makeLogTexture();
    const leaves = makeLeavesTexture();
    const sapling = makeSaplingTexture();
    const wheat1 = makeWheatTexture(1);
    const wheat2 = makeWheatTexture(2);
    const wheat3 = makeWheatTexture(3);
    const cobblestone = makeCobblestoneTexture();
    const gravel = makeGravelTexture();

    this.materials = {
      [BLOCKS.GRASS]: createOpaqueMaterial(grass, { roughness: 0.88 }),
      [BLOCKS.DIRT]: createOpaqueMaterial(dirt),
      [BLOCKS.STONE]: createOpaqueMaterial(stone, { roughness: 0.7 }),
      [BLOCKS.SAND]: createOpaqueMaterial(sand, { roughness: 0.95 }),
      [BLOCKS.WATER]: createWaterMaterial(water),
      [BLOCKS.LOG]: createOpaqueMaterial(log, { roughness: 0.78 }),
      [BLOCKS.LEAVES]: createLeafMaterial(leaves),
      [BLOCKS.WATER_FLOWING]: createWaterMaterial(water),
      [BLOCKS.SAPLING]: createLeafMaterial(sapling),
      [BLOCKS.WHEAT_STAGE_1]: createLeafMaterial(wheat1),
      [BLOCKS.WHEAT_STAGE_2]: createLeafMaterial(wheat2),
      [BLOCKS.WHEAT_STAGE_3]: createLeafMaterial(wheat3),
      [BLOCKS.COBBLESTONE]: createOpaqueMaterial(cobblestone, { roughness: 0.92 }),
      [BLOCKS.GRAVEL]: createOpaqueMaterial(gravel, { roughness: 0.96 })
    };

    return this.materials;
  }
}
