import { Game } from './core/game.js';

const canvas = document.getElementById('app');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('start');
const hudElement = document.getElementById('hud');
const minimapCanvas = document.getElementById('minimap');
const compassElement = document.getElementById('compass');
const crosshairElement = document.getElementById('crosshair');
const toggleViewButton = document.getElementById('toggleViewButton');
const viewModeLabel = document.getElementById('viewModeLabel');

const game = new Game({
  canvas,
  hudElement,
  minimapCanvas,
  compassElement,
  viewModeLabelElement: viewModeLabel,
  onPointerLockChange: (locked) => {
    overlay.classList.toggle('hidden', locked);
    if (crosshairElement) {
      crosshairElement.classList.toggle('hidden', !locked);
    }
  }
});

if (toggleViewButton) {
  toggleViewButton.addEventListener('click', () => {
    game.toggleViewMode();
  });
}

startButton.addEventListener('click', () => {
  game.start();
});

window.addEventListener('resize', () => {
  game.handleResize();
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.dispose();
  });
}
