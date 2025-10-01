import * as THREE from 'three';

export function setupEnvironment(scene) {
  const sky = new THREE.Color(0x7fc8ff);
  scene.background = sky;
  scene.fog = new THREE.FogExp2(0x7bb1ff, 0.0085);
}
