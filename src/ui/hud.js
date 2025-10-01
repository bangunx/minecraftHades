import { blockNameFromId } from '../world/blockTypes.js';

export class Hud {
  constructor(infoElement, hotbarElement, player) {
    this.infoElement = infoElement;
    this.hotbarElement = hotbarElement;
    this.player = player;
    this.frameCount = 0;
    this.timeAccumulator = 0;
    this.fps = 0;

    this._lastPaletteKey = '';
    this._lastActiveIndex = -1;
    this._hotbarSlots = [];

    this._handleHotbarClick = this._handleHotbarClick.bind(this);

    if (this.hotbarElement) {
      this.hotbarElement.addEventListener('click', this._handleHotbarClick);
    }
  }

  update(delta) {
    this.frameCount += 1;
    this.timeAccumulator += delta;
    if (this.timeAccumulator >= 0.5) {
      this.fps = this.frameCount / this.timeAccumulator;
      this.frameCount = 0;
      this.timeAccumulator = 0;
    }

    this._updateInfoPanel();
    this._updateHotbar();
  }

  _updateInfoPanel() {
    if (!this.infoElement) return;

    const position = this.player.getPosition();
    const blockId = this.player.getActiveBlockId();
    const blockName = blockId ? blockNameFromId(blockId) : 'None';

    this.infoElement.innerHTML = `
      <div>FPS: ${this.fps.toFixed(0)}</div>
      <div>Position: ${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}</div>
      <div>Camera: ${this.player.getCameraMode().toUpperCase()}</div>
      <div>Active Block: ${blockName}</div>
      <div>Controls: [L-Click] Dig · [R-Click] Place · Scroll Zoom (TPS distance) · [Shift+Scroll] FOV · [Alt+Scroll] Palette · [F5] Camera · [-/+] FOV · [0] Reset</div>
    `;
  }

  _updateHotbar() {
    if (!this.hotbarElement) return;

    const palette = this.player.getBlockPalette();
    const activeIndex = this.player.getActiveBlockIndex();
    const paletteKey = palette.join(',');

    if (paletteKey !== this._lastPaletteKey) {
      this.hotbarElement.innerHTML = palette
        .map((id, index) => this._renderHotbarSlot(id, index))
        .join('');
      this._hotbarSlots = Array.from(this.hotbarElement.querySelectorAll('[data-slot-index]'));
      this._lastPaletteKey = paletteKey;
      this._lastActiveIndex = -1; // force refresh highlight
    }

    if (activeIndex !== this._lastActiveIndex) {
      this._hotbarSlots.forEach((slot, index) => {
        slot.classList.toggle('active', index === activeIndex);
      });
      this._lastActiveIndex = activeIndex;
    }
  }

  _renderHotbarSlot(blockId, index) {
    const name = blockNameFromId(blockId);
    const keyLabel = index < 9 ? index + 1 : '';
    return `
      <div class="hotbar-slot" data-slot-index="${index}">
        <span class="hotbar-key">${keyLabel}</span>
        <span class="hotbar-label">${name}</span>
      </div>
    `;
  }

  _handleHotbarClick(event) {
    const slot = event.target.closest('[data-slot-index]');
    if (!slot) return;
    const index = Number(slot.dataset.slotIndex);
    if (Number.isNaN(index)) return;
    this.player.setActiveBlockIndex(index);
  }
}
