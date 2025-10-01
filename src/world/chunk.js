import * as THREE from 'three';
import { BLOCKS, BLOCK_DEFINITIONS } from './blockTypes.js';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

export class Chunk {
  constructor({ world, generator, chunkX, chunkZ, materials, geometry }) {
    this.world = world;
    this.generator = generator;
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.geometry = geometry;
    this.materials = materials;

    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.group = new THREE.Group();
    this.group.name = `chunk-${chunkX}-${chunkZ}`;
    this.group.position.set(chunkX * CHUNK_SIZE, 0, chunkZ * CHUNK_SIZE);

    this._instancedMeshes = new Map();
    this._dirty = true;
    this.active = false;
    this.lastBuildVersion = -1;

    this.generate();
  }

  generate() {
    this.generator.generateChunk(this);
    this._dirty = true;
  }

  activate(scene) {
    if (this.active) return;
    scene.add(this.group);
    this.active = true;
    this._dirty = true;
  }

  deactivate(scene) {
    if (!this.active) return;
    scene.remove(this.group);
    this.active = false;
  }

  dispose() {
    this.deactivate(this.world.scene);
    this._instancedMeshes.forEach((mesh) => {
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose?.());
      } else {
        mesh.material?.dispose?.();
      }
    });
    this._instancedMeshes.clear();
  }

  markDirty() {
    this._dirty = true;
  }

  getBlockIndex(localX, localY, localZ) {
    return localX + CHUNK_SIZE * (localZ + CHUNK_SIZE * localY);
  }

  getBlock(localX, localY, localZ) {
    if (!this._isWithinChunk(localX, localY, localZ)) return BLOCKS.AIR;
    return this.blocks[this.getBlockIndex(localX, localY, localZ)];
  }

  setBlock(localX, localY, localZ, blockId) {
    if (!this._isWithinChunk(localX, localY, localZ)) return false;
    const index = this.getBlockIndex(localX, localY, localZ);
    if (this.blocks[index] === blockId) return false;
    this.blocks[index] = blockId;
    this.markDirty();
    return true;
  }

  setBlockImmediate(localX, localY, localZ, blockId) {
    if (!this._isWithinChunk(localX, localY, localZ)) return;
    this.blocks[this.getBlockIndex(localX, localY, localZ)] = blockId;
  }

  setBlockIfAir(localX, localY, localZ, blockId) {
    if (!this._isWithinChunk(localX, localY, localZ)) return;
    const index = this.getBlockIndex(localX, localY, localZ);
    const current = this.blocks[index];
    if (current === BLOCKS.AIR || current === BLOCKS.WATER) {
      this.blocks[index] = blockId;
    }
  }

  worldPosition(localX, localZ) {
    return {
      x: this.chunkX * CHUNK_SIZE + localX,
      z: this.chunkZ * CHUNK_SIZE + localZ
    };
  }

  build() {
    if (!this.active || !this._dirty) return null;

    this.group.clear();
    this._instancedMeshes.clear();

    const positionsByBlock = new Map();

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const blockId = this.getBlock(x, y, z);
          if (blockId === BLOCKS.AIR) continue;
          if (!this.materials[blockId]) continue;
          if (!this._shouldRenderBlock(x, y, z, blockId)) continue;

          if (!positionsByBlock.has(blockId)) {
            positionsByBlock.set(blockId, []);
          }
          positionsByBlock.get(blockId).push({ x, y, z });
        }
      }
    }

    const meshes = [];
    const matrix = new THREE.Matrix4();
    positionsByBlock.forEach((positions, blockId) => {
      const material = this.materials[blockId];
      const mesh = new THREE.InstancedMesh(this.geometry, material, positions.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = BLOCK_DEFINITIONS[blockId]?.solid ?? false;
      mesh.receiveShadow = blockId !== BLOCKS.WATER;
      mesh.name = `chunk-${this.chunkX}-${this.chunkZ}-block-${blockId}`;

      const worldPositions = [];
      positions.forEach((pos, index) => {
        matrix.makeTranslation(pos.x, pos.y, pos.z);
        mesh.setMatrixAt(index, matrix);
        worldPositions.push(new THREE.Vector3(pos.x, pos.y, pos.z));
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.userData = {
        blockId,
        positions: worldPositions,
        chunk: this
      };

      if (blockId === BLOCKS.WATER || blockId === BLOCKS.WATER_FLOWING) {
        mesh.renderOrder = 1;
      }

      this.group.add(mesh);
      meshes.push(mesh);
      this._instancedMeshes.set(blockId, mesh);
    });

    this._dirty = false;
    this.lastBuildVersion = performance.now();
    return meshes;
  }

  _shouldRenderBlock(x, y, z, blockId) {
    const def = BLOCK_DEFINITIONS[blockId];
    if (!def) return false;

    const worldX = this.chunkX * CHUNK_SIZE + x;
    const worldZ = this.chunkZ * CHUNK_SIZE + z;

    const neighborOffsets = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 }
    ];

    // Water blocks (source and flowing)
    if (blockId === BLOCKS.WATER || blockId === BLOCKS.WATER_FLOWING) {
      for (const offset of neighborOffsets) {
        const nx = worldX + offset.x;
        const ny = y + offset.y;
        const nz = worldZ + offset.z;
        const neighbor = this.world.getBlock(nx, ny, nz);
        if (neighbor !== BLOCKS.WATER && neighbor !== BLOCKS.WATER_FLOWING) {
          return true;
        }
      }
      return false;
    }

    // Small/transparent blocks always render (sapling, wheat, etc)
    if (!def.solid) {
      return true;
    }

    for (const offset of neighborOffsets) {
      const nx = worldX + offset.x;
      const ny = y + offset.y;
      const nz = worldZ + offset.z;
      const neighbor = this.world.getBlock(nx, ny, nz);
      const neighborDef = BLOCK_DEFINITIONS[neighbor];
      if (neighbor === BLOCKS.AIR || (neighborDef && neighborDef.transparent)) {
        return true;
      }
    }

    return false;
  }

  _isWithinChunk(x, y, z) {
    return (
      x >= 0 && x < CHUNK_SIZE &&
      y >= 0 && y < CHUNK_HEIGHT &&
      z >= 0 && z < CHUNK_SIZE
    );
  }
}
