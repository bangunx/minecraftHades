import { Game } from './core/game.js';

const canvas = document.getElementById('app');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('start');
const hudElement = document.getElementById('hud');

const game = new Game({
  canvas,
  hudElement,
  onPointerLockChange: (locked) => {
    overlay.classList.toggle('hidden', locked);
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
