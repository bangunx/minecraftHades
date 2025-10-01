import * as THREE from 'three';
import { BLOCKS, BLOCK_DEFINITIONS, SELECTABLE_BLOCK_IDS } from './blockTypes.js';
import { TerrainGenerator } from './terrainGenerator.js';
import { TextureFactory } from '../textures/textureFactory.js';

const WORLD_WIDTH = 64;
const WORLD_DEPTH = 64;
const WORLD_HEIGHT = 48;
const SEA_LEVEL = 14;

const DIRECTIONS = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 }
];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.width = WORLD_WIDTH;
    this.depth = WORLD_DEPTH;
    this.height = WORLD_HEIGHT;
    this.seaLevel = SEA_LEVEL;

    this.blocks = new Uint8Array(this.width * this.height * this.depth);
    this.materialFactory = new TextureFactory();
    this.materials = this.materialFactory.getMaterials();
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.geometry.translate(0.5, 0.5, 0.5);

    this.terrainGenerator = new TerrainGenerator({
      width: this.width,
      depth: this.depth,
      height: this.height,
      seaLevel: this.seaLevel,
      seed: 20240509
    });

    this.group = null;
    this.dirty = true;
    this.rebuildCooldown = 0;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 10;
    this.intersectableMeshes = [];
    this.lastBuildTime = 0;
  }

  generate() {
    this.blocks.fill(BLOCKS.AIR);
    this.terrainGenerator.generate(this);
    this.dirty = true;
  }

  update(delta) {
    if (!this.dirty) return;
    this.rebuildCooldown -= delta;
    if (this.rebuildCooldown <= 0) {
      this.build();
      this.rebuildCooldown = 0.1;
    }
  }

  build() {
    if (this.group) {
      this.scene.remove(this.group);
    }

    const group = new THREE.Group();
    group.name = 'voxel-world';

    const geometry = this.geometry;
    const meshes = [];

    const positionsByBlock = new Map();

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.depth; z++) {
          const id = this.getBlock(x, y, z);
          if (id === BLOCKS.AIR) continue;
          if (!this.materials[id]) continue;

          if (!this._shouldRenderBlock(x, y, z, id)) continue;

          if (!positionsByBlock.has(id)) {
            positionsByBlock.set(id, []);
          }
          positionsByBlock.get(id).push({ x, y, z });
        }
      }
    }

    positionsByBlock.forEach((positions, blockId) => {
      const material = this.materials[blockId];
      if (!material) return;
      const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = blockId !== BLOCKS.WATER && blockId !== BLOCKS.LEAVES;
      mesh.receiveShadow = blockId !== BLOCKS.WATER;
      mesh.name = `block-${BLOCK_DEFINITIONS[blockId]?.name ?? blockId}`;

      const matrix = new THREE.Matrix4();
      const worldPositions = [];
      positions.forEach((pos, index) => {
        matrix.makeTranslation(pos.x, pos.y, pos.z);
        mesh.setMatrixAt(index, matrix);
        worldPositions.push(new THREE.Vector3(pos.x, pos.y, pos.z));
      });

      mesh.instanceMatrix.needsUpdate = true;
      mesh.userData = {
        blockId,
        positions: worldPositions
      };

      if (blockId === BLOCKS.WATER) {
        mesh.renderOrder = 1;
      }

      group.add(mesh);
      meshes.push(mesh);
    });

    this.scene.add(group);
    this.group = group;
    this.intersectableMeshes = meshes;
    this.dirty = false;
    this.lastBuildTime = performance.now();
  }

  isWithinBounds(x, y, z) {
    return (
      x >= 0 && x < this.width &&
      y >= 0 && y < this.height &&
      z >= 0 && z < this.depth
    );
  }

  getIndex(x, y, z) {
    return x + this.width * (z + this.depth * y);
  }

  getBlock(x, y, z) {
    if (!this.isWithinBounds(x, y, z)) return BLOCKS.AIR;
    return this.blocks[this.getIndex(x, y, z)];
  }

  setBlockImmediate(x, y, z, blockId) {
    if (!this.isWithinBounds(x, y, z)) return;
    this.blocks[this.getIndex(x, y, z)] = blockId;
  }

  setBlock(x, y, z, blockId) {
    if (!this.isWithinBounds(x, y, z)) return false;
    const index = this.getIndex(x, y, z);
    if (this.blocks[index] === blockId) return false;
    this.blocks[index] = blockId;
    this._markDirty();
    return true;
  }

  setBlockIfAir(x, y, z, blockId) {
    if (!this.isWithinBounds(x, y, z)) return;
    const index = this.getIndex(x, y, z);
    if (this.blocks[index] === BLOCKS.AIR || this.blocks[index] === BLOCKS.WATER) {
      this.blocks[index] = blockId;
    }
  }

  isSolid(x, y, z) {
    const blockId = this.getBlock(x, y, z);
    const def = BLOCK_DEFINITIONS[blockId];
    return def ? def.solid : false;
  }

  dig(x, y, z) {
    const current = this.getBlock(x, y, z);
    if (current === BLOCKS.AIR || current === BLOCKS.WATER) return false;
    this.setBlock(x, y, z, BLOCKS.AIR);
    return true;
  }

  place(x, y, z, blockId) {
    const def = BLOCK_DEFINITIONS[blockId];
    if (!def || !def.selectable) return false;
    if (!this.isWithinBounds(x, y, z)) return false;

    const current = this.getBlock(x, y, z);
    if (current !== BLOCKS.AIR && current !== BLOCKS.WATER && current !== BLOCKS.LEAVES) {
      return false;
    }

    return this.setBlock(x, y, z, blockId);
  }

  getSurfaceHeight(x, z) {
    for (let y = this.height - 1; y >= 0; y--) {
      const block = this.getBlock(x, y, z);
      if (block !== BLOCKS.AIR && block !== BLOCKS.WATER) {
        return y;
      }
    }
    return 0;
  }

  _markDirty() {
    this.dirty = true;
    this.rebuildCooldown = 0.01;
  }

  _shouldRenderBlock(x, y, z, blockId) {
    const def = BLOCK_DEFINITIONS[blockId];
    if (!def) return false;

    if (blockId === BLOCKS.WATER) {
      const above = this.getBlock(x, y + 1, z);
      if (above !== BLOCKS.WATER) return true;
      for (const dir of DIRECTIONS) {
        if (Math.abs(dir.y) > 0) continue;
        const neighbor = this.getBlock(x + dir.x, y + dir.y, z + dir.z);
        if (neighbor !== BLOCKS.WATER) return true;
      }
      return false;
    }

    if (blockId === BLOCKS.LEAVES) {
      return true;
    }

    for (const dir of DIRECTIONS) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const nz = z + dir.z;
      const neighbor = this.getBlock(nx, ny, nz);
      if (neighbor === BLOCKS.AIR || neighbor === BLOCKS.WATER) return true;
      const neighborDef = BLOCK_DEFINITIONS[neighbor];
      if (!neighborDef || neighborDef.transparent) {
        if (neighbor === blockId && neighborDef?.transparent) {
          continue;
        }
        return true;
      }
    }
    return false;
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

    const blockPos = new THREE.Vector3(data.x, data.y, data.z);
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

  dispose() {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse((child) => {
        if (child.isInstancedMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose?.());
          } else {
            child.material.dispose?.();
          }
        }
      });
    }

    this.geometry.dispose();
  }
}
