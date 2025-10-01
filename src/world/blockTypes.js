export const BLOCKS = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  LOG: 6,
  LEAVES: 7
};

export const BLOCK_DEFINITIONS = {
  [BLOCKS.AIR]: {
    id: BLOCKS.AIR,
    name: 'Air',
    solid: false,
    transparent: true,
    selectable: false
  },
  [BLOCKS.GRASS]: {
    id: BLOCKS.GRASS,
    name: 'Grass',
    solid: true,
    transparent: false,
    selectable: true
  },
  [BLOCKS.DIRT]: {
    id: BLOCKS.DIRT,
    name: 'Dirt',
    solid: true,
    transparent: false,
    selectable: true
  },
  [BLOCKS.STONE]: {
    id: BLOCKS.STONE,
    name: 'Stone',
    solid: true,
    transparent: false,
    selectable: true
  },
  [BLOCKS.SAND]: {
    id: BLOCKS.SAND,
    name: 'Sand',
    solid: true,
    transparent: false,
    selectable: true
  },
  [BLOCKS.WATER]: {
    id: BLOCKS.WATER,
    name: 'Water',
    solid: false,
    transparent: true,
    selectable: false
  },
  [BLOCKS.LOG]: {
    id: BLOCKS.LOG,
    name: 'Log',
    solid: true,
    transparent: false,
    selectable: true
  },
  [BLOCKS.LEAVES]: {
    id: BLOCKS.LEAVES,
    name: 'Leaves',
    solid: true,
    transparent: true,
    selectable: false
  }
};

export const SELECTABLE_BLOCK_IDS = Object.values(BLOCK_DEFINITIONS)
  .filter((block) => block.selectable)
  .map((block) => block.id);

export function blockNameFromId(id) {
  const entry = BLOCK_DEFINITIONS[id];
  return entry ? entry.name : 'Unknown';
}
