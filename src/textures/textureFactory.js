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

function applyAlpha(ctx, alphaValue) {
  const clamped = Math.round(Math.max(0, Math.min(255, alphaValue)));
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = clamped;
  }
  ctx.putImageData(imageData, 0, 0);
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

function makeCobbleTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#8c8f94', '#575b5f');
  drawSpeckles(ctx, '#aeb1b6', 0.018, [0.6, 1.3], 0.55);
  drawSpeckles(ctx, '#35373a', 0.014, [0.6, 1.5], 0.45);
  addFineNoise(ctx, 0.08);
  return toCanvasTexture(canvas);
}

function makeClayTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#c7b8d4', '#8d7fa7');
  drawSpeckles(ctx, '#dcd2ea', 0.018, [0.7, 1.4], 0.5);
  drawSpeckles(ctx, '#6a5d86', 0.012, [0.7, 1.3], 0.35);
  addFineNoise(ctx, 0.07);
  return toCanvasTexture(canvas);
}

function makeGlassTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#e6f6ff', '#a7d3ff');
  drawWaves(ctx, '#ffffff', 0.6, 0.38, 0.28);
  applyAlpha(ctx, 180);
  return toCanvasTexture(canvas);
}

function makeGlowTexture() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  paintVerticalGradient(ctx, '#ffe89a', '#e3a848');
  drawSpeckles(ctx, '#fff5c2', 0.025, [0.6, 1.3], 0.65);
  drawSpeckles(ctx, '#b36a1f', 0.012, [0.6, 1.1], 0.35);
  addFineNoise(ctx, 0.06);
  return toCanvasTexture(canvas);
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

function createGlassMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    opacity: 0.55,
    roughness: 0.12,
    metalness: 0.04,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function createGlowMaterial(texture) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    emissive: new THREE.Color('#ffcf6f'),
    emissiveIntensity: 0.9,
    roughness: 0.4,
    metalness: 0.12
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
    const cobble = makeCobbleTexture();
    const clay = makeClayTexture();
    const glass = makeGlassTexture();
    const glow = makeGlowTexture();

    this.materials = {
      [BLOCKS.GRASS]: createOpaqueMaterial(grass, { roughness: 0.88 }),
      [BLOCKS.DIRT]: createOpaqueMaterial(dirt),
      [BLOCKS.STONE]: createOpaqueMaterial(stone, { roughness: 0.7 }),
      [BLOCKS.SAND]: createOpaqueMaterial(sand, { roughness: 0.95 }),
      [BLOCKS.WATER]: createWaterMaterial(water),
      [BLOCKS.LOG]: createOpaqueMaterial(log, { roughness: 0.78 }),
      [BLOCKS.LEAVES]: createLeafMaterial(leaves),
      [BLOCKS.COBBLE]: createOpaqueMaterial(cobble, { roughness: 0.82 }),
      [BLOCKS.CLAY]: createOpaqueMaterial(clay, { roughness: 0.76 }),
      [BLOCKS.GLASS]: createGlassMaterial(glass),
      [BLOCKS.GLOWSTONE]: createGlowMaterial(glow)
    };

    return this.materials;
  }
}
