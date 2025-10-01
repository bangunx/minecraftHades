import * as THREE from 'three';

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(32, 24, 32);
  camera.rotation.order = 'YXZ';
  return camera;
}
