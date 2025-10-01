# Three.js Voxel World

A lightweight, modular Three.js sandbox inspired by Minecraft. It procedurally generates a voxel landscape with custom textures, water, sandbanks, and small forests. Wander the terrain, dig blocks, and place new ones using an in-browser pointer lock experience.

## Features

- Procedural terrain built from layered value noise with beaches, hills, and ponds
- Custom-made pixel textures generated in-code (no external assets)
- First-person movement with gravity, sprinting, and jumping
- Block interaction: left-click to dig, right-click to place selected block
- Simple tree growth and water that renders only exposed surfaces
- Compass, minimap with visit markers, and a visible avatar to ground navigation
- Expanded block palette featuring cobble, clay, glass, and glowstone building blocks
- Modular structure with focused folders for core, player, textures, world, and UI logic

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
3. Open the presented URL (Vite defaults to http://127.0.0.1:5173).
4. Click "Enter World" to lock the pointer and start exploring.

> **Note:** If your environment does not have Node.js / npm installed, install them first (https://nodejs.org) or use an alternative package manager that can run Vite.

## Controls

- `WASD` – walk / strafe
- `Shift` – sprint
- `Space` – jump
- `Mouse` – look around
- `Left click` – dig block
- `Right click` – place block
- `1-9` – choose from the block palette (grass, dirt, stone, sand, logs, cobble, clay, glass, glowstone)
- `Q/E` – cycle blocks in the palette without using number keys
- `V` – toggle first/third-person view
- `Mouse wheel` – zoom camera distance while in third-person

## Project Layout

```
src/
  core/         Game bootstrapping, renderer, lighting, loop
  player/       Pointer-lock player capsule, input, physics
  textures/     Canvas-based texture factory
  world/        Block registry, terrain generator, voxel meshing
  utils/        Shared utilities (noise)
  ui/           HUD overlay logic
```

## Next Ideas

- Chunk streaming for larger play areas
- Day/night cycle with animated sun and water caustics
- Basic crafting or inventory system

Enjoy building your own voxel scenes!
