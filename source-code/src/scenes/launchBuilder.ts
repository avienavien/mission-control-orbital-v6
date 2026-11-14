import * as THREE from 'three';

export interface LaunchAssembly {
  rootGroup: THREE.Group;
  rocketGroup: THREE.Group;
  fairingLeft: THREE.Mesh;
  fairingRight: THREE.Mesh;
  payloadMount: THREE.Group;
  plumeMesh: THREE.Mesh;
  swingArm: THREE.Mesh;
  smokeParticles: THREE.InstancedMesh;
  updateLaunchAnimation: (progress01: number, dt: number) => void;
}

const _dummy = new THREE.Object3D();

export function createLaunchAssembly(): LaunchAssembly {
  const rootGroup = new THREE.Group();

  // Coastal Launch Pad Ground Plane (grounded at y=0)
  const padBase = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 9.5, 0.4, 32),
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.15,
    }),
  );
  padBase.position.y = -0.2;
  padBase.receiveShadow = true;
  rootGroup.add(padBase);

  // Flame Trench Deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.5, 5.2),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.25,
    }),
  );
  deck.position.y = 0.25;
  deck.receiveShadow = true;
  rootGroup.add(deck);

  // Umbilical Launch Tower
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.65,
    roughness: 0.4,
  });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(1.1, 7.6, 1.1), towerMat);
  tower.position.set(-2.3, 4.0, 0);
  tower.castShadow = true;
  rootGroup.add(tower);

  const swingArm = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.18, 0.32),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }),
  );
  swingArm.position.set(-1.1, 5.3, 0);
  rootGroup.add(swingArm);

  // Multi-Stage Launch Vehicle
  const rocketGroup = new THREE.Group();
  rocketGroup.position.set(0, 0.5, 0);
  rootGroup.add(rocketGroup);

  const whiteHullMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.25,
    roughness: 0.35,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.75,
    roughness: 0.35,
  });

  // First Stage Core
  const stage1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.58, 4.2, 24),
    whiteHullMat,
  );
  stage1.position.y = 2.3;
  stage1.castShadow = true;
  rocketGroup.add(stage1);

  // Interstage Band
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.56, 0.42, 24),
    darkMetalMat,
  );
  interstage.position.y = 4.6;
  rocketGroup.add(interstage);

  // Second Stage
  const stage2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.55, 1.4, 24),
    whiteHullMat,
  );
  stage2.position.y = 5.5;
  rocketGroup.add(stage2);

  // 4 Stabilizer Fins
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.8, 0.42),
      darkMetalMat,
    );
    fin.position.set(Math.sin(angle) * 0.65, 0.65, Math.cos(angle) * 0.65);
    fin.rotation.y = angle;
    rocketGroup.add(fin);
  }

  // Main Engine Bell
  const engineBell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.38, 0.45, 16),
    darkMetalMat,
  );
  engineBell.position.y = 0.02;
  rocketGroup.add(engineBell);

  // Split Payload Fairing Halves (Lathe half-shells)
  const fairingPoints = [
    new THREE.Vector2(0.54, 0),
    new THREE.Vector2(0.56, 0.7),
    new THREE.Vector2(0.45, 1.45),
    new THREE.Vector2(0.18, 2.05),
    new THREE.Vector2(0.01, 2.25),
  ];
  const fairingLeftGeo = new THREE.LatheGeometry(
    fairingPoints,
    18,
    0,
    Math.PI,
  );
  const fairingRightGeo = new THREE.LatheGeometry(
    fairingPoints,
    18,
    Math.PI,
    Math.PI,
  );

  const fairingLeft = new THREE.Mesh(fairingLeftGeo, whiteHullMat);
  fairingLeft.position.y = 6.18;
  rocketGroup.add(fairingLeft);

  const fairingRight = new THREE.Mesh(fairingRightGeo, whiteHullMat);
  fairingRight.position.y = 6.18;
  rocketGroup.add(fairingRight);

  // Payload Mount inside the fairing (holds the player's actual satellite)
  const payloadMount = new THREE.Group();
  payloadMount.position.set(0, 7.1, 0);
  payloadMount.scale.setScalar(0.32);
  rocketGroup.add(payloadMount);

  // Exhaust Plume
  const plumeGeo = new THREE.ConeGeometry(0.5, 3.2, 20);
  plumeGeo.translate(0, -1.6, 0);
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xffaa33,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
  plumeMesh.position.y = -0.15;
  plumeMesh.visible = false;
  rocketGroup.add(plumeMesh);

  // Exhaust Smoke Particles (InstancedMesh)
  const particleCount = 48;
  const smokeGeo = new THREE.SphereGeometry(0.32, 10, 10);
  const smokeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.45,
    roughness: 1,
    depthWrite: false,
  });
  const smokeParticles = new THREE.InstancedMesh(
    smokeGeo,
    smokeMat,
    particleCount,
  );
  smokeParticles.frustumCulled = false;
  rootGroup.add(smokeParticles);

  const particleSeeds = Array.from({ length: particleCount }, (_, i) => ({
    angle: (i / particleCount) * Math.PI * 2,
    speed: 1.5 + (i % 5) * 0.45,
    phase: (i % 12) / 12,
  }));

  const updateLaunchAnimation = (progress01: number, _dt: number) => {
    // 0.00 - 0.25: Countdown & Ignition on Pad
    // 0.25 - 0.62: Atmospheric Ascent
    // 0.62 - 0.82: Fairing Separation
    // 0.82 - 1.00: Satellite Deployment
    const ignitionActive = progress01 >= 0.16;
    plumeMesh.visible = ignitionActive && progress01 < 0.88;

    if (plumeMesh.visible) {
      const flicker = 0.88 + Math.sin(progress01 * 260) * 0.14;
      plumeMesh.scale.set(flicker, 0.85 + Math.cos(progress01 * 210) * 0.2, flicker);
    }

    // Swing umbilical arm away right before liftoff
    if (progress01 < 0.18) {
      swingArm.rotation.y = 0;
    } else {
      const armT = THREE.MathUtils.clamp((progress01 - 0.18) / 0.1, 0, 1);
      swingArm.rotation.y = armT * 1.15;
    }

    // Rocket altitude curve
    if (progress01 < 0.25) {
      const jitter = ignitionActive ? Math.sin(progress01 * 400) * 0.025 : 0;
      rocketGroup.position.set(jitter, 0.5, 0);
    } else {
      const climbT = (progress01 - 0.25) / 0.75;
      const altitude = Math.pow(climbT, 1.85) * 46;
      rocketGroup.position.set(0, 0.5 + altitude, 0);
    }

    // Fairing separation
    if (progress01 < 0.62) {
      fairingLeft.position.set(0, 6.18, 0);
      fairingLeft.rotation.set(0, 0, 0);
      fairingRight.position.set(0, 6.18, 0);
      fairingRight.rotation.set(0, 0, 0);
      fairingLeft.visible = true;
      fairingRight.visible = true;
    } else {
      const sepT = THREE.MathUtils.clamp((progress01 - 0.62) / 0.2, 0, 1);
      fairingLeft.position.set(0, 6.18 - sepT * 1.2, sepT * 2.8);
      fairingLeft.rotation.x = sepT * 0.7;
      fairingRight.position.set(0, 6.18 - sepT * 1.2, -sepT * 2.8);
      fairingRight.rotation.x = -sepT * 0.7;
      fairingLeft.visible = sepT < 0.98;
      fairingRight.visible = sepT < 0.98;
    }

    // Payload separation & satellite deployment
    if (progress01 < 0.78) {
      payloadMount.position.set(0, 7.1, 0);
      payloadMount.rotation.y = 0;
    } else {
      const depT = THREE.MathUtils.clamp((progress01 - 0.78) / 0.22, 0, 1);
      payloadMount.position.set(0, 7.1 + depT * 3.8, 0);
      payloadMount.rotation.y = depT * 1.1;
    }

    // Exhaust smoke plume near pad during ignition & early liftoff
    const showSmoke = ignitionActive && progress01 < 0.55;
    smokeParticles.visible = showSmoke;
    if (showSmoke) {
      for (let i = 0; i < particleCount; i++) {
        const s = particleSeeds[i];
        const age = ((progress01 * 6 + s.phase) % 1);
        const radius = 0.6 + age * 4.2 * s.speed * 0.45;
        _dummy.position.set(
          Math.cos(s.angle) * radius,
          0.35 + age * 1.2,
          Math.sin(s.angle) * radius,
        );
        const scale = (0.4 + age * 1.4) * (1 - progress01 * 1.1);
        _dummy.scale.setScalar(Math.max(0.01, scale));
        _dummy.updateMatrix();
        smokeParticles.setMatrixAt(i, _dummy.matrix);
      }
      smokeParticles.instanceMatrix.needsUpdate = true;
    }
  };

  return {
    rootGroup,
    rocketGroup,
    fairingLeft,
    fairingRight,
    payloadMount,
    plumeMesh,
    swingArm,
    smokeParticles,
    updateLaunchAnimation,
  };
}
