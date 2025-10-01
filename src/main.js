import { Game } from './core/game.js';

const canvas = document.getElementById('app');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('start');
const hudElement = document.getElementById('hud');
const crosshair = document.getElementById('crosshair');
const hotbarElement = document.getElementById('hotbar');
const minimapElement = document.getElementById('minimap');

const game = new Game({
  canvas,
  hudElement,
  hotbarElement,
  minimapElement,
  onPointerLockChange: (locked) => {
    overlay.classList.toggle('hidden', locked);
    crosshair.classList.toggle('visible', locked);
  }
});

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
