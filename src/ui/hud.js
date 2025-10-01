import { blockNameFromId } from '../world/blockTypes.js';

export class Hud {
  constructor(element, player) {
    this.element = element;
    this.player = player;
    this.frameCount = 0;
    this.timeAccumulator = 0;
    this.fps = 0;
  }

  update(delta, { landmarks = [], headingLabel = null } = {}) {
    this.frameCount += 1;
    this.timeAccumulator += delta;
    if (this.timeAccumulator >= 0.5) {
      this.fps = this.frameCount / this.timeAccumulator;
      this.frameCount = 0;
      this.timeAccumulator = 0;
    }

    const position = this.player.getPosition();
    const blockId = this.player.getActiveBlockId();
    const blockName = blockId ? blockNameFromId(blockId) : 'None';
    const heading = headingLabel ?? 'N';
    const viewMode = this.player.getViewMode ? this.player.getViewMode() : 'third';
    const viewLabel = viewMode === 'third' ? 'Third-person' : 'First-person';
    const palette = this.player.getBlockPalette ? this.player.getBlockPalette() : [];
    const paletteRange = palette.length ? `1-${palette.length}` : '1-?';

    const latestLandmarks = landmarks.slice(-3);
    const landmarkMarkup = latestLandmarks.length
      ? latestLandmarks.map((entry) => `<div class="landmark">${entry}</div>`).join('')
      : '<div class="landmark">None yet</div>';

    const paletteMarkup = palette.length
      ? palette
          .map((id, index) => {
            const label = blockNameFromId(id);
            const active = id === blockId ? ' active' : '';
            return `<span class="palette-entry${active}">${index + 1}: ${label}</span>`;
          })
          .join(' · ')
      : '<span class="palette-entry">No blocks</span>';

    this.element.innerHTML = `
      <div>FPS: ${this.fps.toFixed(0)}</div>
      <div>Position: ${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}</div>
      <div>Active Block: ${blockName}</div>
      <div>Heading: ${heading}</div>
      <div>View: ${viewLabel}</div>
      <div>Controls: [Left Click] Dig · [Right Click] Place · [${paletteRange}] Palette · [Q/E] Cycle · [V] Toggle View · Scroll (3rd)</div>
      <div>Palette: ${paletteMarkup}</div>
      <div>Landmarks:</div>
      ${landmarkMarkup}
    `;
  }
}
