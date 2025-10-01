import * as THREE from 'three';
import { BLOCKS, BLOCK_DEFINITIONS, SELECTABLE_BLOCK_IDS } from './blockTypes.js';
import { TerrainGenerator } from './terrainGenerator.js';
import { TextureFactory } from '../textures/textureFactory.js';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';

const DIRECTIONS = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 }
];

function chunkKey(x, z) {
  return `${x},${z}`;
}

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export class World {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.height = CHUNK_HEIGHT;
    this.seaLevel = options.seaLevel ?? 22;
    this.renderDistance = options.renderDistance ?? 4; // in chunks
    this.rebuildPerFrame = options.rebuildPerFrame ?? 2;
    this.seed = options.seed ?? 20240509;

    this.materialFactory = new TextureFactory();
    this.materials = this.materialFactory.getMaterials();
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.geometry.translate(0.5, 0.5, 0.5);

    this.terrainGenerator = new TerrainGenerator({
      seaLevel: this.seaLevel,
      seed: this.seed
    });

    this.chunks = new Map();
    this.activeMeshes = new Map();
    this.intersectableMeshes = [];

    this.buildQueue = [];
    this.pendingBuild = new Set();

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 10;
    this.lastBuildTime = 0;

    // Tick system for block updates
    this.tickedBlocks = new Map(); // key: "x,y,z", value: { x, y, z, blockId, tickCount, maxTicks }
    this.waterFlowQueue = new Set(); // Set of "x,y,z" keys for water blocks to process
    this.ticksPerFrame = 10; // Process max N ticked blocks per frame
    this.waterFlowPerFrame = 5; // Process max N water blocks per frame
    this.tickCounter = 0;
  }

  generate(initialChunkX = 0, initialChunkZ = 0) {
    this._ensureChunk(initialChunkX, initialChunkZ).activate(this.scene);
    this._queueChunkBuild(this._getChunk(initialChunkX, initialChunkZ));
    this._updateActiveChunks(initialChunkX, initialChunkZ);
    this._processBuildQueue();
  }

  update(playerPosition, delta) {
    const playerChunkX = Math.floor(Math.floor(playerPosition.x) / CHUNK_SIZE);
    const playerChunkZ = Math.floor(Math.floor(playerPosition.z) / CHUNK_SIZE);

    this._updateActiveChunks(playerChunkX, playerChunkZ);
    this._processBuildQueue();
    this._processTicks(delta);
    this._processWaterFlow();
  }

  _updateActiveChunks(centerChunkX, centerChunkZ) {
    const needed = new Set();

    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;
        const key = chunkKey(chunkX, chunkZ);
        needed.add(key);

        let chunk = this._getChunk(chunkX, chunkZ);
        if (!chunk) {
          chunk = this._ensureChunk(chunkX, chunkZ);
        }

        if (!chunk.active) {
          chunk.activate(this.scene);
          this._queueChunkBuild(chunk);
        }
      }
    }

    this.chunks.forEach((chunk, key) => {
      if (!needed.has(key)) {
        chunk.deactivate(this.scene);
        this.activeMeshes.delete(key);
      }
    });

    this._refreshMeshes();
  }

  _processBuildQueue() {
    let processed = 0;
    const limit = this.rebuildPerFrame;

    while (processed < limit && this.buildQueue.length > 0) {
      const chunk = this.buildQueue.shift();
      this.pendingBuild.delete(chunkKey(chunk.chunkX, chunk.chunkZ));
      if (!chunk.active) continue;

      const meshes = chunk.build();
      if (meshes) {
        this.activeMeshes.set(chunkKey(chunk.chunkX, chunk.chunkZ), meshes);
      }
      processed++;
    }

    if (processed > 0) {
      this._refreshMeshes();
      this.lastBuildTime = performance.now();
    }
  }

  _ensureChunk(chunkX, chunkZ) {
    const key = chunkKey(chunkX, chunkZ);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk({
        world: this,
        generator: this.terrainGenerator,
        chunkX,
        chunkZ,
        geometry: this.geometry,
        materials: this.materials
      });
      this.chunks.set(key, chunk);
      this._queueChunkBuild(chunk);
    }
    return chunk;
  }

  _getChunk(chunkX, chunkZ) {
    return this.chunks.get(chunkKey(chunkX, chunkZ));
  }

  _queueChunkBuild(chunk) {
    const key = chunkKey(chunk.chunkX, chunk.chunkZ);
    if (this.pendingBuild.has(key)) return;
    this.pendingBuild.add(key);
    this.buildQueue.push(chunk);
  }

  _refreshMeshes() {
    const meshes = [];
    this.activeMeshes.forEach((chunkMeshes) => {
      chunkMeshes.forEach((mesh) => meshes.push(mesh));
    });
    this.intersectableMeshes = meshes;
  }

  dispose() {
    this.chunks.forEach((chunk) => {
      chunk.dispose();
    });
    this.chunks.clear();
    this.activeMeshes.clear();
    this.intersectableMeshes = [];
    this.geometry.dispose();
  }

  isWithinBounds(x, y, z) {
    return y >= 0 && y < this.height;
  }

  isWithinHeight(y) {
    return y >= 0 && y < this.height;
  }

  getBlock(x, y, z, { ensureGeneration = false } = {}) {
    if (!this.isWithinHeight(y)) return BLOCKS.AIR;
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const chunkX = Math.floor(blockX / CHUNK_SIZE);
    const chunkZ = Math.floor(blockZ / CHUNK_SIZE);
    const chunk = ensureGeneration ? this._ensureChunk(chunkX, chunkZ) : this._getChunk(chunkX, chunkZ);
    if (!chunk) return BLOCKS.AIR;
    const localX = mod(blockX, CHUNK_SIZE);
    const localZ = mod(blockZ, CHUNK_SIZE);
    return chunk.getBlock(localX, Math.floor(y), localZ);
  }

  setBlock(x, y, z, blockId) {
    if (!this.isWithinHeight(y)) return false;
    const blockX = Math.floor(x);
    const blockY = Math.floor(y);
    const blockZ = Math.floor(z);
    const chunkX = Math.floor(blockX / CHUNK_SIZE);
    const chunkZ = Math.floor(blockZ / CHUNK_SIZE);
    const chunk = this._ensureChunk(chunkX, chunkZ);
    const localX = mod(blockX, CHUNK_SIZE);
    const localZ = mod(blockZ, CHUNK_SIZE);
    
    const oldBlockId = chunk.getBlock(localX, blockY, localZ);
    const updated = chunk.setBlock(localX, blockY, localZ, blockId);
    
    if (updated) {
      this._queueChunkBuild(chunk);
      this._markNeighborChunks(chunkX, chunkZ, localX, localZ);
      
      // Handle tickable blocks
      const blockDef = BLOCK_DEFINITIONS[blockId];
      if (blockDef && blockDef.tickable) {
        this._registerTickableBlock(blockX, blockY, blockZ, blockId);
      } else {
        this._unregisterTickableBlock(blockX, blockY, blockZ);
      }
      
      // Handle water flow
      if (blockId === BLOCKS.WATER) {
        this._triggerWaterFlow(blockX, blockY, blockZ);
      } else if (oldBlockId === BLOCKS.WATER || oldBlockId === BLOCKS.WATER_FLOWING) {
        // Water was removed, check neighbors
        this._checkWaterNeighbors(blockX, blockY, blockZ);
      }
    }
    return updated;
  }

  setBlockImmediate(x, y, z, blockId) {
    if (!this.isWithinHeight(y)) return;
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const chunkX = Math.floor(blockX / CHUNK_SIZE);
    const chunkZ = Math.floor(blockZ / CHUNK_SIZE);
    const chunk = this._ensureChunk(chunkX, chunkZ);
    const localX = mod(blockX, CHUNK_SIZE);
    const localZ = mod(blockZ, CHUNK_SIZE);
    chunk.setBlockImmediate(localX, Math.floor(y), localZ, blockId);
    this._queueChunkBuild(chunk);
    this._markNeighborChunks(chunkX, chunkZ, localX, localZ);
  }

  setBlockIfAir(x, y, z, blockId) {
    if (!this.isWithinHeight(y)) return;
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const chunkX = Math.floor(blockX / CHUNK_SIZE);
    const chunkZ = Math.floor(blockZ / CHUNK_SIZE);
    const chunk = this._ensureChunk(chunkX, chunkZ);
    const localX = mod(blockX, CHUNK_SIZE);
    const localZ = mod(blockZ, CHUNK_SIZE);
    chunk.setBlockIfAir(localX, Math.floor(y), localZ, blockId);
    this._queueChunkBuild(chunk);
    this._markNeighborChunks(chunkX, chunkZ, localX, localZ);
  }

  dig(x, y, z) {
    const current = this.getBlock(x, y, z);
    if (current === BLOCKS.AIR) return false;
    return this.setBlock(x, y, z, BLOCKS.AIR);
  }

  place(x, y, z, blockId) {
    const def = BLOCK_DEFINITIONS[blockId];
    if (!def || !def.selectable) return false;
    const current = this.getBlock(x, y, z, { ensureGeneration: true });
    if (current !== BLOCKS.AIR && current !== BLOCKS.WATER && current !== BLOCKS.LEAVES) {
      return false;
    }
    return this.setBlock(x, y, z, blockId);
  }

  getSurfaceHeight(x, z) {
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const chunkX = Math.floor(blockX / CHUNK_SIZE);
    const chunkZ = Math.floor(blockZ / CHUNK_SIZE);
    const chunk = this._ensureChunk(chunkX, chunkZ);
    const localX = mod(blockX, CHUNK_SIZE);
    const localZ = mod(blockZ, CHUNK_SIZE);
    for (let y = this.height - 1; y >= 0; y--) {
      const block = chunk.getBlock(localX, y, localZ);
      if (block !== BLOCKS.AIR && block !== BLOCKS.WATER) {
        return y;
      }
    }
    return 0;
  }

  getSurfaceBlockId(x, z) {
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const chunkX = Math.floor(blockX / CHUNK_SIZE);
    const chunkZ = Math.floor(blockZ / CHUNK_SIZE);
    const chunk = this._getChunk(chunkX, chunkZ);
    if (!chunk) return BLOCKS.AIR;
    const localX = mod(blockX, CHUNK_SIZE);
    const localZ = mod(blockZ, CHUNK_SIZE);
    for (let y = this.height - 1; y >= 0; y--) {
      const block = chunk.getBlock(localX, y, localZ);
      if (block !== BLOCKS.AIR && block !== BLOCKS.WATER) {
        return block;
      }
    }
    return BLOCKS.AIR;
  }

  raycast(origin, direction, options = {}) {
    const maxDistance = options.maxDistance ?? 8;
    this.raycaster.set(origin, direction.normalize());
    this.raycaster.far = maxDistance;

    const intersections = this.raycaster.intersectObjects(this.intersectableMeshes, false);
    if (!intersections.length) return null;
    const hit = intersections[0];
    const mesh = hit.object;
    const { instanceId } = hit;
    const data = mesh.userData.positions[instanceId];

    if (!data) return null;

    const chunk = mesh.userData.chunk;
    const worldX = chunk.chunkX * CHUNK_SIZE + data.x;
    const worldZ = chunk.chunkZ * CHUNK_SIZE + data.z;

    const blockPos = new THREE.Vector3(worldX, data.y, worldZ);
    const normal = hit.face?.normal ? hit.face.normal.clone() : new THREE.Vector3();

    return {
      point: hit.point.clone(),
      block: blockPos,
      normal,
      blockId: mesh.userData.blockId
    };
  }

  getSelectableBlocks() {
    return SELECTABLE_BLOCK_IDS;
  }

  _markNeighborChunks(chunkX, chunkZ, localX, localZ) {
    if (localX === 0) this._markChunkDirty(chunkX - 1, chunkZ);
    if (localX === CHUNK_SIZE - 1) this._markChunkDirty(chunkX + 1, chunkZ);
    if (localZ === 0) this._markChunkDirty(chunkX, chunkZ - 1);
    if (localZ === CHUNK_SIZE - 1) this._markChunkDirty(chunkX, chunkZ + 1);
  }

  _markChunkDirty(chunkX, chunkZ) {
    const chunk = this._getChunk(chunkX, chunkZ);
    if (chunk) {
      chunk.markDirty();
      this._queueChunkBuild(chunk);
    }
  }

  // Tick System for Flora Growth
  _registerTickableBlock(x, y, z, blockId) {
    const key = `${x},${y},${z}`;
    let maxTicks = 100; // Default
    
    // Different blocks have different growth rates
    if (blockId === BLOCKS.SAPLING) {
      maxTicks = 200; // ~3.3 seconds at 60fps
    } else if (blockId === BLOCKS.WHEAT_STAGE_1 || blockId === BLOCKS.WHEAT_STAGE_2) {
      maxTicks = 150; // ~2.5 seconds per stage
    } else if (blockId === BLOCKS.WATER_FLOWING) {
      maxTicks = 30; // Water flows faster
    }
    
    this.tickedBlocks.set(key, { x, y, z, blockId, tickCount: 0, maxTicks });
  }

  _unregisterTickableBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    this.tickedBlocks.delete(key);
  }

  _processTicks(delta) {
    if (this.tickedBlocks.size === 0) return;
    
    this.tickCounter++;
    let processed = 0;
    const limit = this.ticksPerFrame;
    
    const blocksToUpdate = [];
    
    for (const [key, data] of this.tickedBlocks.entries()) {
      if (processed >= limit) break;
      
      data.tickCount++;
      
      if (data.tickCount >= data.maxTicks) {
        blocksToUpdate.push(data);
      }
      
      processed++;
    }
    
    // Apply updates
    for (const data of blocksToUpdate) {
      this._tickBlock(data);
    }
  }

  _tickBlock(data) {
    const { x, y, z, blockId } = data;
    const currentBlock = this.getBlock(x, y, z);
    
    // Verify block hasn't changed
    if (currentBlock !== blockId) {
      this._unregisterTickableBlock(x, y, z);
      return;
    }
    
    let newBlockId = null;
    
    // Sapling grows into tree
    if (blockId === BLOCKS.SAPLING) {
      // Check if there's space above
      let hasSpace = true;
      for (let dy = 1; dy <= 6; dy++) {
        const above = this.getBlock(x, y + dy, z);
        if (above !== BLOCKS.AIR && above !== BLOCKS.LEAVES) {
          hasSpace = false;
          break;
        }
      }
      
      if (hasSpace) {
        // Grow tree
        this._growTree(x, y, z);
        this._unregisterTickableBlock(x, y, z);
      } else {
        // Reset tick count, try again later
        const key = `${x},${y},${z}`;
        const tickData = this.tickedBlocks.get(key);
        if (tickData) {
          tickData.tickCount = 0;
        }
      }
      return;
    }
    
    // Wheat growth stages
    if (blockId === BLOCKS.WHEAT_STAGE_1) {
      newBlockId = BLOCKS.WHEAT_STAGE_2;
    } else if (blockId === BLOCKS.WHEAT_STAGE_2) {
      newBlockId = BLOCKS.WHEAT_STAGE_3;
    }
    
    if (newBlockId) {
      this.setBlock(x, y, z, newBlockId);
    }
  }

  _growTree(x, baseY, z) {
    // Remove sapling
    this.setBlock(x, baseY, z, BLOCKS.AIR);
    
    // Plant trunk
    const height = 4 + Math.floor(Math.random() * 2);
    for (let dy = 0; dy < height; dy++) {
      this.setBlock(x, baseY + dy, z, BLOCKS.LOG);
    }
    
    // Add leaves
    const leafRadius = 2;
    const leafCenterY = baseY + height - 1;
    for (let dy = -leafRadius; dy <= leafRadius; dy++) {
      for (let dx = -leafRadius; dx <= leafRadius; dx++) {
        for (let dz = -leafRadius; dz <= leafRadius; dz++) {
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz * 0.7);
          if (distance > leafRadius + 0.6) continue;
          
          const targetY = leafCenterY + dy;
          if (targetY < 0 || targetY >= this.height) continue;
          
          const current = this.getBlock(x + dx, targetY, z + dz);
          if (current === BLOCKS.AIR) {
            this.setBlock(x + dx, targetY, z + dz, BLOCKS.LEAVES);
          }
        }
      }
    }
  }

  // Water Flow Simulation
  _triggerWaterFlow(x, y, z) {
    const key = `${x},${y},${z}`;
    this.waterFlowQueue.add(key);
    
    // Also check neighbors
    this._checkWaterNeighbors(x, y, z);
  }

  _checkWaterNeighbors(x, y, z) {
    const neighbors = [
      { x: x + 1, y, z },
      { x: x - 1, y, z },
      { x, y, z: z + 1 },
      { x, y, z: z - 1 },
      { x, y: y - 1, z }
    ];
    
    for (const neighbor of neighbors) {
      const blockId = this.getBlock(neighbor.x, neighbor.y, neighbor.z);
      if (blockId === BLOCKS.WATER || blockId === BLOCKS.WATER_FLOWING) {
        const key = `${neighbor.x},${neighbor.y},${neighbor.z}`;
        this.waterFlowQueue.add(key);
      }
    }
  }

  _processWaterFlow() {
    if (this.waterFlowQueue.size === 0) return;
    
    let processed = 0;
    const limit = this.waterFlowPerFrame;
    const keysToRemove = [];
    
    for (const key of this.waterFlowQueue) {
      if (processed >= limit) break;
      
      const [x, y, z] = key.split(',').map(Number);
      const blockId = this.getBlock(x, y, z);
      
      // Only process water blocks
      if (blockId !== BLOCKS.WATER && blockId !== BLOCKS.WATER_FLOWING) {
        keysToRemove.push(key);
        processed++;
        continue;
      }
      
      // Water flows down first
      const below = this.getBlock(x, y - 1, z);
      if (below === BLOCKS.AIR) {
        this.setBlock(x, y - 1, z, BLOCKS.WATER_FLOWING);
        keysToRemove.push(key);
        processed++;
        continue;
      }
      
      // Then spread horizontally (only for source blocks)
      if (blockId === BLOCKS.WATER) {
        const directions = [
          { x: x + 1, y, z },
          { x: x - 1, y, z },
          { x, y, z: z + 1 },
          { x, y, z: z - 1 }
        ];
        
        let spread = false;
        for (const dir of directions) {
          const neighborBlock = this.getBlock(dir.x, dir.y, dir.z);
          if (neighborBlock === BLOCKS.AIR) {
            this.setBlock(dir.x, dir.y, dir.z, BLOCKS.WATER_FLOWING);
            spread = true;
          }
        }
        
        if (spread) {
          // Keep source block in queue for continued spreading
          processed++;
          continue;
        }
      }
      
      // Flowing water doesn't spread horizontally
      keysToRemove.push(key);
      processed++;
    }
    
    // Remove processed keys
    for (const key of keysToRemove) {
      this.waterFlowQueue.delete(key);
    }
  }
}
