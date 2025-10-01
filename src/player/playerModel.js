import * as THREE from 'three';

export class PlayerModel {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'player-avatar';

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3d7eb3, roughness: 0.48, metalness: 0.08 });
    const limbMaterial = new THREE.MeshStandardMaterial({ color: 0x2b3a55, roughness: 0.6 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.4, metalness: 0.1 });
    const gloveMaterial = new THREE.MeshStandardMaterial({ color: 0xd9b08c, roughness: 0.55 });
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d0a7, roughness: 0.45 });
    const visorMaterial = new THREE.MeshStandardMaterial({ color: 0x172035, roughness: 0.35, metalness: 0.2 });

    const parts = [];

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.9, 0.28), limbMaterial);
    leftLeg.position.set(-0.16, 0.45, 0);
    parts.push(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.9, 0.28), limbMaterial);
    rightLeg.position.set(0.16, 0.45, 0);
    parts.push(rightLeg);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.88, 0.38), bodyMaterial);
    torso.position.y = 0.9 + 0.44;
    parts.push(torso);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.4), accentMaterial);
    belt.position.y = 0.9;
    parts.push(belt);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.26), limbMaterial);
    leftArm.position.set(-0.48, 1.32, 0);
    leftArm.rotation.z = 0.18;
    parts.push(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.26), limbMaterial);
    rightArm.position.set(0.48, 1.32, 0);
    rightArm.rotation.z = -0.18;
    parts.push(rightArm);

    const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.24), gloveMaterial);
    leftGlove.position.set(-0.48, 0.96, 0);
    parts.push(leftGlove);

    const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.24), gloveMaterial);
    rightGlove.position.set(0.48, 0.96, 0);
    parts.push(rightGlove);

    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.6, 0.12), accentMaterial);
    pack.position.set(0, 1.26, -0.26);
    parts.push(pack);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.42), headMaterial);
    head.position.set(0, 1.78, 0);
    parts.push(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.04), visorMaterial);
    visor.position.set(0, 1.8, 0.23);
    parts.push(visor);

    parts.forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    });

    this.meshes = parts;
  }

  update(position, headingRadians, halfHeight) {
    const feetY = position.y - halfHeight;
    this.group.position.set(position.x, feetY, position.z);
    this.group.rotation.y = headingRadians;
  }

  dispose() {
    if (!this.meshes) return;
    this.meshes.forEach((mesh) => {
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    });
    this.meshes = [];
  }

  setVisible(visible) {
    if (this.group) {
      this.group.visible = visible;
    }
  }
}
