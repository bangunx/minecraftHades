import { BLOCKS } from './blockTypes.js';
import { FractalNoise } from '../utils/noise.js';

export class TerrainGenerator {
  constructor(options) {
    const {
      width,
      depth,
      height,
      seaLevel,
      seed = 1337
    } = options;

    this.width = width;
    this.depth = depth;
    this.height = height;
    this.seaLevel = seaLevel;

    this.continentalNoise = new FractalNoise(seed, 4, 0.5, 2.1);
    this.detailNoise = new FractalNoise(seed + 101, 3, 0.6, 2.6);
    this.roughNoise = new FractalNoise(seed + 503, 2, 0.7, 3.6);
  }

  generate(world) {
    const waterLevel = this.seaLevel;

    for (let x = 0; x < this.width; x++) {
      for (let z = 0; z < this.depth; z++) {
        const height = this._computeHeight(x, z);
        const cappedHeight = Math.min(this.height - 1, Math.max(1, height));

        for (let y = 0; y <= cappedHeight; y++) {
          let blockId = BLOCKS.STONE;

          if (y === cappedHeight) {
            if (y < waterLevel - 2) {
              blockId = BLOCKS.SAND;
            } else if (y < waterLevel) {
              blockId = BLOCKS.SAND;
            } else if (y < waterLevel + 1) {
              blockId = BLOCKS.SAND;
            } else if (y < waterLevel + 4) {
              blockId = BLOCKS.GRASS;
            } else {
              blockId = BLOCKS.GRASS;
            }
          } else if (y >= cappedHeight - 3) {
            blockId = BLOCKS.DIRT;
          } else if (y <= 3) {
            blockId = BLOCKS.STONE;
          }

          world.setBlockImmediate(x, y, z, blockId);
        }

        if (waterLevel > cappedHeight) {
          const waterTop = Math.min(waterLevel, this.height - 1);
          for (let y = cappedHeight + 1; y <= waterTop; y++) {
            world.setBlockImmediate(x, y, z, BLOCKS.WATER);
          }

          for (let y = waterTop + 1; y < this.height; y++) {
            world.setBlockImmediate(x, y, z, BLOCKS.AIR);
          }
        } else {
          for (let y = cappedHeight + 1; y < this.height; y++) {
            world.setBlockImmediate(x, y, z, BLOCKS.AIR);
          }
        }
      }
    }

    this._scatterTrees(world);
  }

  _computeHeight(x, z) {
    const nx = x / this.width;
    const nz = z / this.depth;

    const continental = this.continentalNoise.sample(nx * 1.4, nz * 1.4);
    const detail = this.detailNoise.sample(nx * 6.0, nz * 6.0);
    const rough = this.roughNoise.sample(nx * 18.0, nz * 18.0);

    const base = continental * 18 + detail * 8 + rough * 2;
    const height = this.seaLevel + base - 6;
    return Math.round(height);
  }

  _scatterTrees(world) {
    const minHeightForTree = this.seaLevel + 2;
    for (let x = 2; x < this.width - 2; x++) {
      for (let z = 2; z < this.depth - 2; z++) {
        const topY = world.getSurfaceHeight(x, z);
        if (topY <= minHeightForTree) continue;
        const blockId = world.getBlock(x, topY, z);
        if (blockId !== BLOCKS.GRASS) continue;

        if (Math.random() < 0.02) {
          this._plantTree(world, x, topY + 1, z);
        }
      }
    }
  }

  _plantTree(world, baseX, baseY, baseZ) {
    const height = 4 + Math.floor(Math.random() * 2.5);

    for (let y = 0; y < height; y++) {
      const currentY = baseY + y;
      if (currentY >= this.height - 1) break;
      world.setBlockIfAir(baseX, currentY, baseZ, BLOCKS.LOG);
    }

    const leafRadius = 2;
    const leafCenterY = baseY + height - 2;
    for (let y = -leafRadius; y <= leafRadius + 1; y++) {
      for (let x = -leafRadius; x <= leafRadius; x++) {
        for (let z = -leafRadius; z <= leafRadius; z++) {
          const distance = Math.sqrt(x * x + y * y + z * z * 0.8);
          if (distance > leafRadius + 0.8) continue;

          const worldX = baseX + x;
          const worldY = leafCenterY + y;
          const worldZ = baseZ + z;

          if (!world.isWithinBounds(worldX, worldY, worldZ)) continue;
          if (world.getBlock(worldX, worldY, worldZ) === BLOCKS.LOG) continue;

          if (Math.random() > 0.15 || distance < leafRadius) {
            world.setBlockIfAir(worldX, worldY, worldZ, BLOCKS.LEAVES);
          }
        }
      }
    }
  }
}
