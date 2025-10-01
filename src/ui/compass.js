import { MathUtils } from 'three';

export class Compass {
  constructor({ element, player }) {
    this.element = element;
    this.player = player;
    this.needleElement = element?.querySelector('.needle') ?? null;
    this.directionElement = element?.querySelector('.direction') ?? null;
    this.lastLabel = 'N';
    this.lastDegrees = 0;
  }

  update() {
    if (!this.element || !this.player?.getHeadingRadians) {
      return;
    }

    const headingRadians = this.player.getHeadingRadians();
    if (headingRadians == null) return;

    const degrees = MathUtils.radToDeg(headingRadians);
    const normalized = ((degrees % 360) + 360) % 360;

    if (this.needleElement) {
      this.needleElement.style.transform = `translate(-50%, -50%) rotate(${normalized}deg)`;
    }

    const label = this._labelFromDegrees(normalized);
    if (this.directionElement) {
      this.directionElement.textContent = label;
    }

    this.lastLabel = label;
    this.lastDegrees = normalized;
  }

  getDirectionLabel() {
    return this.lastLabel;
  }

  getDirectionDegrees() {
    return this.lastDegrees;
  }

  _labelFromDegrees(deg) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % directions.length;
    return directions[index];
  }
}
