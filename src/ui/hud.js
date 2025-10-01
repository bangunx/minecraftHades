import { blockNameFromId } from '../world/blockTypes.js';

export class Hud {
  constructor(element, player) {
    this.element = element;
    this.player = player;
    this.frameCount = 0;
    this.timeAccumulator = 0;
    this.fps = 0;
  }

  update(delta) {
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

    this.element.innerHTML = `
      <div>FPS: ${this.fps.toFixed(0)}</div>
      <div>Position: ${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}</div>
      <div>Active Block: ${blockName}</div>
      <div>Controls: [Left Click] Dig · [Right Click] Place · [1-5] Palette</div>
    `;
  }
}
