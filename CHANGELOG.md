# Changelog - MinecraftHades

## [2025-10-01] - Major Feature Update

### ✨ New Features Implemented

#### 🌍 Biome System
- **5 Distinct Biomes**:
  - **Desert**: Flat sandy terrain (0.7x height modifier), no vegetation
  - **Plains**: Grasslands with wheat fields (8% spawn rate) and sparse trees (2%)
  - **Forest**: Dense tree coverage (4%) with many saplings (6%)
  - **Mountains**: High elevation peaks (1.6x height), rocky cobblestone/stone surfaces
  - **Beach**: Sandy transition zones near water level (seaLevel ± 2 blocks)

- **Biome-Specific Generation**:
  - Surface blocks vary by biome (sand, grass, cobblestone, stone)
  - Subsurface layers adapted to biome type
  - Underground variety: 2% gravel, 2% cobblestone in stone layers
  - Biome data stored per-chunk for future features

#### 🌱 Flora Growth & Farming System
- **Sapling Growth**:
  - Place saplings on grass/dirt blocks
  - Grows into full tree after ~3.3 seconds (200 ticks at 60fps)
  - Checks vertical space (6 blocks) before growth
  - Generates 4-6 block trunk with spherical leaf canopy

- **Wheat Farming**:
  - 3-stage growth cycle (young → growing → mature)
  - Each stage takes ~2.5 seconds (150 ticks)
  - Total growth time: ~7.5 seconds
  - Spawns naturally in Plains biome (8% chance)
  - Mature wheat is harvestable

- **Tick System**:
  - Processes max 10 tickable blocks per frame (performance-optimized)
  - Automatic registration when tickable blocks are placed
  - `World.tickedBlocks` Map tracks all growing/animated blocks

#### 💧 Water Flow Simulation
- **Two Water Types**:
  - **WATER** (source block): Player-placed, spreads infinitely
  - **WATER_FLOWING**: Auto-generated, flows downward only

- **Flow Mechanics**:
  - Priority: Downward first, then horizontal spread (4 directions)
  - Source blocks spread horizontally AND downward
  - Flowing blocks only flow downward
  - Stopped by solid blocks automatically

- **Performance Optimization**:
  - Queue-based system (`World.waterFlowQueue` Set)
  - Processes max 5 water blocks per frame
  - Prevents lag from massive water updates
  - Triggered on placement/removal of water

#### 🎨 New Block Types (7 total)
1. **WATER_FLOWING** (ID: 8) - Flowing water variant
2. **SAPLING** (ID: 9) - Grows into trees, placeable
3. **WHEAT_STAGE_1** (ID: 10) - Young wheat
4. **WHEAT_STAGE_2** (ID: 11) - Growing wheat
5. **WHEAT_STAGE_3** (ID: 12) - Mature wheat, harvestable
6. **COBBLESTONE** (ID: 13) - Rocky block, found in mountains
7. **GRAVEL** (ID: 14) - Underground variety block

#### 🎮 Enhanced Camera System
- **3 Camera Modes** (cycle with F5):
  - **FPS**: First-person view at eye height
  - **TPS**: Third-person view with collision-aware positioning
  - **Fly**: Freecam mode with no collision physics

- **Dynamic FOV System**:
  - Sprint boost: +8 FOV (smoothly animated)
  - Manual zoom: `+/-` keys or mouse wheel
  - Reset zoom: `0` key returns to default
  - TPS distance: Mouse wheel adjusts camera distance (2.5-12 units)
  - FOV range: 20-120 with smooth damping

### 🔧 Technical Improvements

#### Block System
- Added `tickable` property to `BLOCK_DEFINITIONS`
- Automatic tick registration in `World.setBlock()`
- Block metadata expansion for future features

#### Terrain Generation
- Biome calculation uses noise combination (biome + moisture values)
- Height modifiers based on biome type
- Surface/subsurface block selection per biome
- Flora spawning rules per biome

#### Rendering
- Updated `_shouldRenderBlock()` for water variants
- Small/transparent blocks always render
- Water culling works for both water types

#### Performance
- Tick system: 10 blocks/frame max
- Water flow: 5 blocks/frame max
- Queue-based processing prevents frame drops
- Optimized biome data storage (Uint8Array)

### 📝 Documentation Updates
- Updated `.github/copilot-instructions.md` with all new features
- Added "Implemented Systems" section
- Added "Gameplay Mechanics" section with detailed mechanics
- Added "Key Implementation Files" reference
- Documented all controls and keybindings

### 🎯 Gameplay Impact
- **Exploration**: Diverse biomes create varied landscapes
- **Farming**: Plant and grow wheat for food (future feature)
- **Building**: Use water to create moats, rivers, fountains
- **Decoration**: Saplings and trees for landscaping
- **Survival**: Different biomes offer different resources

### 🔮 Future Extension Points
- Biome-specific mobs/animals
- Weather effects per biome
- Crop harvesting and inventory system
- Water-based crafting (irrigation, farming)
- Seasonal changes affecting flora growth
- Temperature/humidity affecting biomes

---

## Testing Notes

### How to Test New Features

1. **Biome Exploration**:
   - Walk around to find different biomes
   - Notice terrain height variations
   - Look for biome-specific blocks (sand, cobblestone)

2. **Flora Growth**:
   - Place sapling on grass → watch it grow (~3s)
   - Find wheat in Plains biome → watch 3-stage growth (~7.5s)
   - Try placing sapling in tight spaces → should fail gracefully

3. **Water Flow**:
   - Place water block → watch it spread
   - Dig block under water → water flows down
   - Create water source → observe horizontal spreading

4. **Camera Modes**:
   - Press F5 to cycle through FPS → TPS → Fly
   - Use +/- or mouse wheel to adjust FOV/distance
   - Test collision in TPS mode near terrain

### Known Limitations
- Water doesn't have finite volume (infinite source)
- Saplings need exactly 6 blocks of space (no partial growth)
- Wheat doesn't require water proximity (future feature)
- No biome transition blending (sharp boundaries)

---

## Performance Metrics
- Target: 60 FPS
- Tick budget: 10 blocks/frame (~0.16ms each)
- Water budget: 5 blocks/frame (~0.33ms each)
- Tested with: 4 chunk render distance (81 chunks)
