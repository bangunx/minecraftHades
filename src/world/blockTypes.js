export const BLOCKS = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  LOG: 6,
  LEAVES: 7,
  WATER_FLOWING: 8,
  SAPLING: 9,
  WHEAT_STAGE_1: 10,
  WHEAT_STAGE_2: 11,
  WHEAT_STAGE_3: 12,
  COBBLESTONE: 13,
  GRAVEL: 14
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
    selectable: true
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
  },
  [BLOCKS.WATER_FLOWING]: {
    id: BLOCKS.WATER_FLOWING,
    name: 'Flowing Water',
    solid: false,
    transparent: true,
    selectable: false,
    tickable: true
  },
  [BLOCKS.SAPLING]: {
    id: BLOCKS.SAPLING,
    name: 'Sapling',
    solid: false,
    transparent: true,
    selectable: true,
    tickable: true
  },
  [BLOCKS.WHEAT_STAGE_1]: {
    id: BLOCKS.WHEAT_STAGE_1,
    name: 'Wheat (Young)',
    solid: false,
    transparent: true,
    selectable: false,
    tickable: true
  },
  [BLOCKS.WHEAT_STAGE_2]: {
    id: BLOCKS.WHEAT_STAGE_2,
    name: 'Wheat (Growing)',
    solid: false,
    transparent: true,
    selectable: false,
    tickable: true
  },
  [BLOCKS.WHEAT_STAGE_3]: {
    id: BLOCKS.WHEAT_STAGE_3,
    name: 'Wheat (Mature)',
    solid: false,
    transparent: true,
    selectable: true,
    tickable: false
  },
  [BLOCKS.COBBLESTONE]: {
    id: BLOCKS.COBBLESTONE,
    name: 'Cobblestone',
    solid: true,
    transparent: false,
    selectable: true
  },
  [BLOCKS.GRAVEL]: {
    id: BLOCKS.GRAVEL,
    name: 'Gravel',
    solid: true,
    transparent: false,
    selectable: true
  }
};

export const SELECTABLE_BLOCK_IDS = [
  BLOCKS.GRASS,
  BLOCKS.SAND,
  BLOCKS.STONE,
  BLOCKS.LOG,
  BLOCKS.WATER,
  BLOCKS.SAPLING,
  BLOCKS.WHEAT_STAGE_3,
  BLOCKS.COBBLESTONE,
  BLOCKS.GRAVEL
];

export function blockNameFromId(id) {
  const entry = BLOCK_DEFINITIONS[id];
  return entry ? entry.name : 'Unknown';
}
