import * as THREE from 'three';

export function setupLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x3a2b18, 0.55);
  hemi.position.set(0, 32, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff5d6, 1.0);
  sun.position.set(60, 140, -40);
  sun.castShadow = true;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;

  scene.add(sun);

  return { hemi, sun };
}
