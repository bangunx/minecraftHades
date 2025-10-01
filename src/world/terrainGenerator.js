import { BLOCKS } from './blockTypes.js';
import { FractalNoise } from '../utils/noise.js';
import { CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';

function hash3(x, y, z, seed) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647 + seed * 69069;
  h = (h ^ (h >> 13)) * 1274126177;
  h ^= h >> 16;
  return (h >>> 0) / 4294967295;
}

// Biome types
export const BIOMES = {
  DESERT: 0,
  PLAINS: 1,
  FOREST: 2,
  MOUNTAINS: 3,
  BEACH: 4
};

export class TerrainGenerator {
  constructor({ seaLevel, seed = 1337 }) {
    this.seaLevel = seaLevel;
    this.seed = seed;

    this.continentalNoise = new FractalNoise(seed, 5, 0.5, 2.1);
    this.detailNoise = new FractalNoise(seed + 101, 4, 0.55, 2.6);
    this.roughNoise = new FractalNoise(seed + 503, 3, 0.6, 3.4);
    this.biomeNoise = new FractalNoise(seed + 901, 3, 0.7, 2.2);
    this.moistureNoise = new FractalNoise(seed + 1337, 4, 0.6, 2.5);
  }

  generateChunk(chunk) {
    const { chunkX, chunkZ } = chunk;

    // Initialize biome data for chunk
    if (!chunk.biomeData) {
      chunk.biomeData = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    }

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const worldCoords = chunk.worldPosition(lx, lz);
        const worldX = worldCoords.x;
        const worldZ = worldCoords.z;

        const height = this._computeHeight(worldX, worldZ);
        const cappedHeight = Math.min(CHUNK_HEIGHT - 1, Math.max(1, height));
        const biome = this._getBiome(worldX, worldZ, cappedHeight);
        
        // Store biome data
        chunk.biomeData[lx + lz * CHUNK_SIZE] = biome;

        for (let y = 0; y <= cappedHeight; y++) {
          let blockId = BLOCKS.STONE;

          if (y === cappedHeight) {
            blockId = this._getSurfaceBlock(biome, y, worldX, worldZ);
          } else if (y >= cappedHeight - 4) {
            blockId = this._getSubsurfaceBlock(biome, y, cappedHeight);
          } else if (y <= 3) {
            blockId = BLOCKS.STONE;
          } else {
            // Add occasional underground variety
            const undergroundRand = hash3(worldX, y, worldZ, this.seed + 9999);
            if (undergroundRand > 0.98) {
              blockId = biome === BIOMES.DESERT ? BLOCKS.SAND : BLOCKS.GRAVEL;
            } else if (undergroundRand > 0.96) {
              blockId = BLOCKS.COBBLESTONE;
            }
          }

          chunk.setBlockImmediate(lx, y, lz, blockId);
        }

        if (this.seaLevel > cappedHeight) {
          const waterTop = Math.min(this.seaLevel, CHUNK_HEIGHT - 1);
          for (let y = cappedHeight + 1; y <= waterTop; y++) {
            chunk.setBlockImmediate(lx, y, lz, BLOCKS.WATER);
          }

          for (let y = waterTop + 1; y < CHUNK_HEIGHT; y++) {
            chunk.setBlockImmediate(lx, y, lz, BLOCKS.AIR);
          }
        } else {
          for (let y = cappedHeight + 1; y < CHUNK_HEIGHT; y++) {
            chunk.setBlockImmediate(lx, y, lz, BLOCKS.AIR);
          }
        }

        this._maybeScatterFlora(chunk, lx, cappedHeight, lz, worldX, worldZ);
      }
    }
  }

  _computeHeight(x, z) {
    const continental = this.continentalNoise.sample(x * 0.004, z * 0.004);
    const detail = this.detailNoise.sample(x * 0.01, z * 0.01);
    const rough = this.roughNoise.sample(x * 0.04, z * 0.04);
    const biomeValue = this.biomeNoise.sample(x * 0.003, z * 0.003);

    // Adjust height based on biome
    let heightModifier = 1.0;
    if (biomeValue < -0.3) { // Desert - flatter
      heightModifier = 0.7;
    } else if (biomeValue > 0.5) { // Mountains - higher
      heightModifier = 1.6;
    }

    const base = (continental * 36 + detail * 18 + rough * 4) * heightModifier;
    const height = this.seaLevel + base - 12;
    return Math.round(height);
  }

  _getBiome(x, z, height) {
    const biomeValue = this.biomeNoise.sample(x * 0.003, z * 0.003);
    const moisture = this.moistureNoise.sample(x * 0.005, z * 0.005);

    // Beach biome near water
    if (height >= this.seaLevel - 1 && height <= this.seaLevel + 2) {
      return BIOMES.BEACH;
    }

    // Desert (dry + hot)
    if (biomeValue < -0.3 && moisture < 0) {
      return BIOMES.DESERT;
    }

    // Mountains (high elevation)
    if (biomeValue > 0.5 || height > this.seaLevel + 15) {
      return BIOMES.MOUNTAINS;
    }

    // Forest (wet)
    if (moisture > 0.3) {
      return BIOMES.FOREST;
    }

    // Default: Plains
    return BIOMES.PLAINS;
  }

  _getSurfaceBlock(biome, y, worldX, worldZ) {
    switch (biome) {
      case BIOMES.DESERT:
        return BLOCKS.SAND;
      case BIOMES.BEACH:
        return BLOCKS.SAND;
      case BIOMES.MOUNTAINS:
        if (y > this.seaLevel + 20) {
          return BLOCKS.STONE; // Rocky peaks
        }
        return BLOCKS.COBBLESTONE;
      case BIOMES.FOREST:
      case BIOMES.PLAINS:
      default:
        return y < this.seaLevel + 1 ? BLOCKS.SAND : BLOCKS.GRASS;
    }
  }

  _getSubsurfaceBlock(biome, y, surfaceY) {
    const depth = surfaceY - y;
    switch (biome) {
      case BIOMES.DESERT:
      case BIOMES.BEACH:
        return depth < 3 ? BLOCKS.SAND : BLOCKS.STONE;
      case BIOMES.MOUNTAINS:
        return BLOCKS.STONE;
      default:
        return BLOCKS.DIRT;
    }
  }

  _maybeScatterFlora(chunk, localX, surfaceY, localZ, worldX, worldZ) {
    if (surfaceY <= this.seaLevel) return;
    const blockId = chunk.getBlock(localX, surfaceY, localZ);
    
    // Get biome for this location
    const biome = chunk.biomeData ? chunk.biomeData[localX + localZ * CHUNK_SIZE] : BIOMES.PLAINS;
    
    const rand = hash3(worldX, surfaceY, worldZ, this.seed + 12345);

    // Biome-specific flora
    switch (biome) {
      case BIOMES.FOREST:
        if (blockId === BLOCKS.GRASS) {
          if (rand > 0.96) { // More trees in forest
            this._plantTree(chunk, worldX, surfaceY + 1, worldZ);
          } else if (rand > 0.90) {
            chunk.setBlockIfAir(localX, surfaceY + 1, localZ, BLOCKS.SAPLING);
          }
        }
        break;

      case BIOMES.PLAINS:
        if (blockId === BLOCKS.GRASS) {
          if (rand > 0.98) {
            this._plantTree(chunk, worldX, surfaceY + 1, worldZ);
          } else if (rand > 0.92) {
            // Plant wheat
            chunk.setBlockIfAir(localX, surfaceY + 1, localZ, BLOCKS.WHEAT_STAGE_1);
          }
        }
        break;

      case BIOMES.MOUNTAINS:
        if (blockId === BLOCKS.GRASS || blockId === BLOCKS.COBBLESTONE) {
          if (rand > 0.985) { // Sparse trees
            this._plantTree(chunk, worldX, surfaceY + 1, worldZ);
          }
        }
        break;

      case BIOMES.DESERT:
        // No flora in desert
        break;

      case BIOMES.BEACH:
        // Minimal flora on beach
        break;
    }
  }

  _plantTree(chunk, baseWorldX, baseY, baseWorldZ) {
    const baseLocal = this._toLocal(chunk, baseWorldX, baseWorldZ);
    const height = 4 + Math.floor(hash3(baseWorldX, baseY, baseWorldZ, this.seed + 2024) * 3);

    for (let y = 0; y < height; y++) {
      const currentY = baseY + y;
      if (currentY >= CHUNK_HEIGHT - 1) break;
      chunk.setBlockIfAir(baseLocal.x, currentY, baseLocal.z, BLOCKS.LOG);
    }

    const leafRadius = 2;
    const leafCenterY = baseY + height - 1;
    for (let dy = -leafRadius; dy <= leafRadius; dy++) {
      for (let dx = -leafRadius; dx <= leafRadius; dx++) {
        for (let dz = -leafRadius; dz <= leafRadius; dz++) {
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz * 0.7);
          if (distance > leafRadius + 0.6) continue;

          const worldX = baseWorldX + dx;
          const worldZ = baseWorldZ + dz;
          const local = this._toLocal(chunk, worldX, worldZ);

          if (local.chunk !== chunk) continue;
          const targetY = leafCenterY + dy;
          if (targetY < 0 || targetY >= CHUNK_HEIGHT) continue;

          chunk.setBlockIfAir(local.x, targetY, local.z, BLOCKS.LEAVES);
        }
      }
    }
  }

  _scatterFlowers(chunk, localX, localY, localZ) {
    if (localY >= CHUNK_HEIGHT) return;
    // Placeholder for future flora system; keep air clear for now.
  }

  _toLocal(chunk, worldX, worldZ) {
    const relativeX = worldX - chunk.chunkX * CHUNK_SIZE;
    const relativeZ = worldZ - chunk.chunkZ * CHUNK_SIZE;
    if (
      relativeX >= 0 &&
      relativeX < CHUNK_SIZE &&
      relativeZ >= 0 &&
      relativeZ < CHUNK_SIZE
    ) {
      return { x: relativeX, z: relativeZ, chunk };
    }
    return { x: relativeX, z: relativeZ, chunk: null };
  }
}
