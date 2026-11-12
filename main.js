/**
 * main.js - KickMX Style Motocross Game Loop & Scene Engine
 * Complete Arcade Dirt Bike Experience:
 * - High-speed physics with Raycast Suspension & Boost mechanics
 * - Detailed motocross bike model with animated rider & steerable fork
 * - Real-time dirt/dust particle system from rear tires
 * - Web Audio API synthesized dirt bike engine & landing sounds
 * - Dynamic chase camera with speed-dependent FOV
 * - Airtime tracking & Clean Landing Boost system
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Bike } from './bikePhysics.js';
import { Terrain } from './terrain.js';
import { Controls } from './controls.js';
import { HUD } from './hud.js';

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
  gravity: -9.81,
  fixedTimeStep: 1 / 60,
  maxSubSteps: 6,
  bikeStartPos: { x: 0, y: 3, z: -1100 },
  cameraFollowDist: 6.8,
  cameraHeight: 3.2,
  baseFOV: 60,
  maxFOV: 74,
};

// ==========================================
// THREE.JS RENDERER & SCENE SETUP
// ==========================================
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// Bright sunny motocross sky
scene.background = new THREE.Color(0x7ec0ee);
scene.fog = new THREE.Fog(0x7ec0ee, 70, 240);

const camera = new THREE.PerspectiveCamera(CONFIG.baseFOV, window.innerWidth / window.innerHeight, 0.1, 400);

// Outdoor Motocross Lighting
const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x6e4a24, 0.85);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 1.35);
sunLight.position.set(50, 80, 40);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 600;
sunLight.shadow.camera.left = -220;
sunLight.shadow.camera.right = 220;
sunLight.shadow.camera.top = 220;
sunLight.shadow.camera.bottom = -220;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);
scene.add(sunLight.target);

// ==========================================
// PHYSICS WORLD (Cannon-es)
// ==========================================
const world = new CANNON.World();
world.gravity.set(0, CONFIG.gravity, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;
// Raycast suspension controls tire grip; keep chassis-ground impacts from erasing forward speed.
world.defaultContactMaterial.friction = 0.005;

// ==========================================
// GAME SUBSYSTEMS
// ==========================================
const controls = new Controls();
const hud = new HUD();
const terrain = new Terrain(scene, world, 400, 2600, 201, 1301);

const bike = new Bike(world);
const startTerrainY = terrain.getSurfaceHeight(CONFIG.bikeStartPos.x, CONFIG.bikeStartPos.z);
// Settle the chassis onto the suspension's static ride height.
bike.chassisBody.position.set(CONFIG.bikeStartPos.x, startTerrainY + 0.86, CONFIG.bikeStartPos.z);

// ==========================================
// DIRT BIKE & RIDER 3D VISUAL MODEL
// ==========================================
const bikeGroup = new THREE.Group();

// Materials
const matRed = new THREE.MeshStandardMaterial({ color: 0xd71920, roughness: 0.34, metalness: 0.08 });
const matWhitePlastics = new THREE.MeshStandardMaterial({ color: 0xf2f1e9, roughness: 0.42 });
const matBlue = new THREE.MeshStandardMaterial({ color: 0x174c91, roughness: 0.38, metalness: 0.08 });
const matBlackSeat = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.85 });
const matEngine = new THREE.MeshStandardMaterial({ color: 0x343a3d, metalness: 0.72, roughness: 0.38 });
const matChrome = new THREE.MeshStandardMaterial({ color: 0xc3c9cb, metalness: 0.9, roughness: 0.2 });
const matRubberTire = new THREE.MeshStandardMaterial({ color: 0x111314, roughness: 0.94 });
const matRim = new THREE.MeshStandardMaterial({ color: 0xe2e4df, metalness: 0.85, roughness: 0.24 });
const matRiderJersey = new THREE.MeshStandardMaterial({ color: 0x174c91, roughness: 0.62 });
const matRiderPants = new THREE.MeshStandardMaterial({ color: 0x202326, roughness: 0.76 });
const matRiderArmor = new THREE.MeshStandardMaterial({ color: 0xf2f1e9, roughness: 0.48 });
const matRiderRed = new THREE.MeshStandardMaterial({ color: 0xd71920, roughness: 0.42 });
const matRiderBoot = new THREE.MeshStandardMaterial({ color: 0x191c20, roughness: 0.82 });
const matRiderGlove = new THREE.MeshStandardMaterial({ color: 0x292d30, roughness: 0.74 });
const matTireTread = new THREE.MeshStandardMaterial({ color: 0x202223, roughness: 0.96 });
const matBrakeDisk = new THREE.MeshStandardMaterial({ color: 0x92999b, metalness: 0.85, roughness: 0.32 });
const matHelmet = new THREE.MeshStandardMaterial({ color: 0xd71920, roughness: 0.3 });
const matGoggles = new THREE.MeshStandardMaterial({ color: 0x182b39, metalness: 0.55, roughness: 0.18 });
const matGoggleLens = new THREE.MeshStandardMaterial({
  color: 0x36c8e8, emissive: 0x0b4b60, emissiveIntensity: 0.45, metalness: 0.55, roughness: 0.18,
});
const matGlass = new THREE.MeshStandardMaterial({
  color: 0x89c7d9, roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.48,
  side: THREE.DoubleSide,
});
const matMirror = new THREE.MeshStandardMaterial({
  color: 0x9baeb7, roughness: 0.16, metalness: 0.92,
});
const matRubber = new THREE.MeshStandardMaterial({ color: 0x151719, roughness: 0.92 });
const matIndicator = new THREE.MeshStandardMaterial({
  color: 0xffa52f, emissive: 0x7d3500, emissiveIntensity: 0.35, roughness: 0.3,
});
const matHeadlight = new THREE.MeshStandardMaterial({
  color: 0xf7fbff, emissive: 0xc5e8ff, emissiveIntensity: 1.3, roughness: 0.18,
});

function addBikeBeam(parent, start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 8),
    material
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addRiderSegment(parent, start, end, radius, material, endRadius = radius) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(endRadius, radius, direction.length(), 8),
    material
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWheelDetails(wheel) {
  const rimGeo = new THREE.TorusGeometry(0.235, 0.018, 6, 24);
  const spokeGeo = new THREE.CylinderGeometry(0.009, 0.009, 1, 5);
  const brakeDiskGeo = new THREE.CylinderGeometry(0.235, 0.235, 0.024, 24);
  const treadGeo = new THREE.BoxGeometry(0.2, 0.065, 0.075);
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(rimGeo, matRim);
    rim.rotation.y = Math.PI / 2;
    rim.position.x = side * 0.105;
    wheel.add(rim);

    const brakeDisk = new THREE.Mesh(brakeDiskGeo, matBrakeDisk);
    brakeDisk.rotation.z = Math.PI / 2;
    brakeDisk.position.x = side * 0.135;
    wheel.add(brakeDisk);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, matChrome);
      const outer = new THREE.Vector3(side * 0.105, Math.sin(angle) * 0.22, Math.cos(angle) * 0.22);
      const inner = new THREE.Vector3(side * 0.105, Math.sin(angle + 0.42) * 0.055, Math.cos(angle + 0.42) * 0.055);
      const direction = new THREE.Vector3().subVectors(outer, inner);
      spoke.scale.y = direction.length();
      spoke.position.copy(outer).add(inner).multiplyScalar(0.5);
      spoke.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      wheel.add(spoke);
    }

  }

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const tread = new THREE.Mesh(treadGeo, matTireTread);
    tread.position.set(0, Math.sin(angle) * 0.395, Math.cos(angle) * 0.395);
    tread.rotation.x = Math.PI / 2 - angle;
    wheel.add(tread);
  }
}

// Adventure chassis, twin-cylinder engine, skid plate and protective crash bars.
const engineMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.72), matEngine);
engineMesh.position.set(0, -0.04, -0.02);
engineMesh.castShadow = true;
bikeGroup.add(engineMesh);

const engineCoverGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16);
for (const side of [-1, 1]) {
  const cover = new THREE.Mesh(engineCoverGeo, matChrome);
  cover.rotation.z = Math.PI / 2;
  cover.position.set(side * 0.255, -0.06, 0.02);
  bikeGroup.add(cover);
}

const skidPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.72), matChrome);
skidPlate.position.set(0, -0.36, -0.02);
skidPlate.rotation.x = -0.12;
bikeGroup.add(skidPlate);

for (const side of [-1, 1]) {
  addBikeBeam(bikeGroup, new THREE.Vector3(side * 0.32, -0.28, -0.48), new THREE.Vector3(side * 0.39, 0.18, 0.22), 0.035, matChrome);
  addBikeBeam(bikeGroup, new THREE.Vector3(side * 0.39, 0.18, 0.22), new THREE.Vector3(side * 0.25, 0.62, 0.69), 0.035, matChrome);
}

const exhaustMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.72, 10), matChrome);
exhaustMesh.rotation.x = Math.PI / 2.8;
exhaustMesh.position.set(0.31, 0.08, -0.5);
bikeGroup.add(exhaustMesh);
const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.58, 10), matEngine);
muffler.rotation.x = Math.PI / 2;
muffler.position.set(0.28, 0.31, -0.77);
bikeGroup.add(muffler);

// Sculpted tank and red / white / blue rally bodywork.
const tank = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), matRed);
tank.scale.set(0.36, 0.28, 0.58);
tank.position.set(0, 0.4, 0.12);
tank.castShadow = true;
bikeGroup.add(tank);

const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.13, 0.98), matBlackSeat);
seat.position.set(0, 0.42, -0.49);
seat.rotation.x = -0.06;
seat.castShadow = true;
bikeGroup.add(seat);

for (const side of [-1, 1]) {
  const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.48, 0.67), matWhitePlastics);
  fairing.position.set(side * 0.31, 0.29, 0.32);
  fairing.rotation.x = -0.2;
  fairing.rotation.z = side * -0.08;
  fairing.castShadow = true;
  bikeGroup.add(fairing);

  const fairingStripe = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.49), matBlue);
  fairingStripe.position.set(side * 0.36, 0.3, 0.34);
  fairingStripe.rotation.x = -0.2;
  bikeGroup.add(fairingStripe);

  const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.3), matEngine);
  radiator.position.set(side * 0.24, 0.02, 0.31);
  bikeGroup.add(radiator);
}

const rearFender = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.68), matRed);
rearFender.position.set(0, 0.45, -1.02);
rearFender.rotation.x = -0.16;
bikeGroup.add(rearFender);

const frontFender = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.075, 0.82), matRed);
frontFender.position.set(0, 0.3, 1.08);
frontFender.rotation.x = 0.18;
bikeGroup.add(frontFender);
const beakTip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.34), matBlue);
beakTip.position.set(0, 0.34, 1.42);
beakTip.rotation.x = 0.15;
bikeGroup.add(beakTip);

// Tall rally screen, front fairing and twin headlights.
const frontFairing = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), matWhitePlastics);
frontFairing.scale.set(0.34, 0.48, 0.24);
frontFairing.position.set(0, 0.67, 0.83);
frontFairing.castShadow = true;
bikeGroup.add(frontFairing);

const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.55), matGlass);
screen.position.set(0, 1.08, 0.79);
screen.rotation.x = -0.27;
bikeGroup.add(screen);
addBikeBeam(bikeGroup, new THREE.Vector3(-0.24, 0.85, 0.81), new THREE.Vector3(-0.2, 1.28, 0.68), 0.018, matChrome);
addBikeBeam(bikeGroup, new THREE.Vector3(0.24, 0.85, 0.81), new THREE.Vector3(0.2, 1.28, 0.68), 0.018, matChrome);

const headlightHousing = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.1), matEngine);
headlightHousing.position.set(0, 0.57, 1.04);
bikeGroup.add(headlightHousing);
for (const side of [-1, 1]) {
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.035, 18), matHeadlight);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(side * 0.12, 0.59, 1.105);
  bikeGroup.add(lens);
}

// Spoked adventure wheels, long-travel forks and rear swingarm.
const wheelGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.22, 24);
wheelGeo.rotateZ(Math.PI / 2);
const frontForkPivot = new THREE.Group();
frontForkPivot.position.set(0, -0.47, 0.95);

const forkTubeGeo = new THREE.CylinderGeometry(0.047, 0.047, 0.92, 10);
for (const side of [-1, 1]) {
  const fork = new THREE.Mesh(forkTubeGeo, matChrome);
  fork.position.set(side * 0.16, 0.2, -0.05);
  frontForkPivot.add(fork);
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.067, 0.067, 0.56, 8), matBlue);
  guard.position.set(side * 0.16, 0.03, -0.05);
  frontForkPivot.add(guard);
}

const barMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.88, 8), matEngine);
barMesh.rotation.z = Math.PI / 2;
barMesh.position.set(0, 0.68, 0.02);
frontForkPivot.add(barMesh);

const instrumentHousing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.17, 0.28), matEngine);
instrumentHousing.position.set(0, 0.83, 0.64);
instrumentHousing.rotation.x = -0.22;
bikeGroup.add(instrumentHousing);
const instrumentScreen = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.012, 0.16), matGoggleLens);
instrumentScreen.position.set(0, 0.925, 0.71);
instrumentScreen.rotation.x = -0.22;
bikeGroup.add(instrumentScreen);

for (const side of [-1, 1]) {
  const handGuard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.34), matBlue);
  handGuard.position.set(side * 0.45, 0.68, 0.9);
  handGuard.rotation.y = side * 0.12;
  bikeGroup.add(handGuard);

  addBikeBeam(
    bikeGroup,
    new THREE.Vector3(side * 0.34, 0.69, 0.94),
    new THREE.Vector3(side * 0.5, 1.05, 0.72),
    0.014,
    matChrome
  );
  const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.055, 0.13), matEngine);
  mirrorHousing.position.set(side * 0.51, 1.08, 0.7);
  mirrorHousing.rotation.y = side * 0.12;
  bikeGroup.add(mirrorHousing);
  const mirrorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.085), matMirror);
  mirrorGlass.position.set(side * 0.51, 1.114, 0.7);
  mirrorGlass.rotation.y = side * 0.12;
  bikeGroup.add(mirrorGlass);

  const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), matIndicator);
  indicator.position.set(side * 0.36, 0.53, 1.0);
  bikeGroup.add(indicator);

  for (let grille = 0; grille < 5; grille++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, 0.25), matChrome);
    vent.position.set(side * 0.274, -0.11 + grille * 0.065, 0.31);
    bikeGroup.add(vent);
  }

  const footPeg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 8), matEngine);
  footPeg.rotation.z = Math.PI / 2;
  footPeg.position.set(side * 0.4, -0.28, -0.08);
  bikeGroup.add(footPeg);
  const pegRubber = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.055, 0.1), matRubber);
  pegRubber.position.set(side * 0.47, -0.28, -0.08);
  bikeGroup.add(pegRubber);
}

const wheelFront = new THREE.Mesh(wheelGeo, matRubberTire);
wheelFront.castShadow = true;
addWheelDetails(wheelFront);
frontForkPivot.add(wheelFront);
bikeGroup.add(frontForkPivot);

const wheelRear = new THREE.Mesh(wheelGeo, matRubberTire);
wheelRear.position.set(0, -0.47, -0.95);
wheelRear.castShadow = true;
addWheelDetails(wheelRear);
bikeGroup.add(wheelRear);

for (const side of [-1, 1]) {
  addBikeBeam(bikeGroup, new THREE.Vector3(0, -0.45, -0.95), new THREE.Vector3(side * 0.18, -0.16, -0.43), 0.045, matChrome);
  addBikeBeam(bikeGroup, new THREE.Vector3(side * 0.18, -0.16, -0.43), new THREE.Vector3(0, -0.45, -0.95), 0.035, matBlue);
}
const rearShock = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.68, 8), matRed);
rearShock.position.set(0, 0.05, -0.53);
rearShock.rotation.x = -0.35;
bikeGroup.add(rearShock);

const chainSprocket = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 6, 24), matChrome);
chainSprocket.rotation.y = Math.PI / 2;
chainSprocket.position.set(-0.17, -0.47, -0.95);
bikeGroup.add(chainSprocket);
addBikeBeam(
  bikeGroup,
  new THREE.Vector3(-0.18, -0.28, -0.89),
  new THREE.Vector3(-0.18, -0.12, -0.38),
  0.014,
  matRubber
);
addBikeBeam(
  bikeGroup,
  new THREE.Vector3(-0.18, -0.66, -0.89),
  new THREE.Vector3(-0.18, -0.48, -0.38),
  0.014,
  matRubber
);
const rearCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.18, 0.14), matEngine);
rearCaliper.position.set(-0.18, -0.34, -0.88);
bikeGroup.add(rearCaliper);

for (const side of [-1, 1]) {
  addBikeBeam(
    bikeGroup,
    new THREE.Vector3(side * 0.22, -0.2, 0.24),
    new THREE.Vector3(side * 0.2, -0.38, -0.9),
    0.035,
    matEngine
  );
  addBikeBeam(
    bikeGroup,
    new THREE.Vector3(side * 0.2, 0.44, -0.62),
    new THREE.Vector3(side * 0.2, 0.48, -1.15),
    0.018,
    matChrome
  );
}

const tailRack = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.035, 0.38), matChrome);
tailRack.position.set(0, 0.53, -1.08);
bikeGroup.add(tailRack);
const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.045), matRiderRed);
tailLight.position.set(0, 0.48, -1.38);
bikeGroup.add(tailLight);

for (const side of [-1, 1]) {
  const pannier = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.46), matBlackSeat);
  pannier.position.set(side * 0.52, 0.27, -0.86);
  pannier.castShadow = true;
  bikeGroup.add(pannier);
  const pannierPanel = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.19, 0.3), matWhitePlastics);
  pannierPanel.position.set(side * 0.63, 0.28, -0.86);
  bikeGroup.add(pannierPanel);
  const pannierStripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.31), matBlue);
  pannierStripe.position.set(side * 0.65, 0.27, -0.86);
  bikeGroup.add(pannierStripe);
}

// ==========================================
// RIDER CHARACTER MODEL
// ==========================================
const riderGroup = new THREE.Group();
riderGroup.position.set(0, 0.45, -0.15);

const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.34, 4, 10), matRiderJersey);
torsoMesh.scale.set(1.05, 1, 0.78);
torsoMesh.position.set(0, 0.43, -0.04);
torsoMesh.rotation.x = 0.28;
torsoMesh.castShadow = true;
riderGroup.add(torsoMesh);

const chestArmor = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), matRiderArmor);
chestArmor.scale.set(0.235, 0.27, 0.095);
chestArmor.position.set(0, 0.46, 0.16);
riderGroup.add(chestArmor);
const chestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.25, 0.025), matRiderRed);
chestStripe.position.set(0, 0.46, 0.248);
riderGroup.add(chestStripe);

const backProtector = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), matRiderArmor);
backProtector.scale.set(0.22, 0.25, 0.07);
backProtector.position.set(0, 0.45, -0.19);
riderGroup.add(backProtector);
const backProtectorStripe = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.3, 0.025), matRiderRed);
backProtectorStripe.position.set(0, 0.45, -0.257);
riderGroup.add(backProtectorStripe);

for (const side of [-1, 1]) {
  const shoulderPad = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), matRiderArmor);
  shoulderPad.scale.set(0.15, 0.13, 0.17);
  shoulderPad.position.set(side * 0.23, 0.63, -0.01);
  riderGroup.add(shoulderPad);
  const shoulderAccent = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), matRiderRed);
  shoulderAccent.scale.set(0.105, 0.09, 0.12);
  shoulderAccent.position.set(side * 0.24, 0.65, 0.02);
  riderGroup.add(shoulderAccent);
}

// Off-road helmet, peak, chin guard, and goggles
const headGroup = new THREE.Group();
headGroup.position.set(0, 0.87, 0.1);

const helmetMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), matHelmet);
helmetMesh.scale.set(1.02, 1.08, 1.2);
helmetMesh.castShadow = true;
headGroup.add(helmetMesh);
const helmetRearStripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.27, 0.025), matRiderArmor);
helmetRearStripe.position.set(0, 0.01, -0.273);
headGroup.add(helmetRearStripe);

const helmetChin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.24), matRiderArmor);
helmetChin.position.set(0, -0.11, 0.17);
headGroup.add(helmetChin);

const visorPeak = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.23), matRiderRed);
visorPeak.position.set(0, 0.15, 0.19);
visorPeak.rotation.x = 0.15;
headGroup.add(visorPeak);

const gogglesStrap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.095, 0.045), matGoggles);
gogglesStrap.position.set(0, 0.035, 0.19);
headGroup.add(gogglesStrap);
const gogglesMesh = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.065, 0.025), matGoggleLens);
gogglesMesh.position.set(0, 0.035, 0.219);
headGroup.add(gogglesMesh);
riderGroup.add(headGroup);

for (const side of [-1, 1]) {
  const shoulder = new THREE.Vector3(side * 0.23, 0.62, 0.01);
  const elbow = new THREE.Vector3(side * 0.34, 0.34, 0.43);
  const wrist = new THREE.Vector3(side * 0.39, -0.18, 1.0);
  addRiderSegment(riderGroup, shoulder, elbow, 0.09, matRiderJersey, 0.075);
  addRiderSegment(riderGroup, elbow, wrist, 0.075, matRiderJersey, 0.06);

  const elbowPad = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), matRiderRed);
  elbowPad.scale.set(0.09, 0.1, 0.095);
  elbowPad.position.copy(elbow);
  riderGroup.add(elbowPad);
  const glove = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), matRiderGlove);
  glove.scale.set(0.085, 0.075, 0.11);
  glove.position.copy(wrist);
  riderGroup.add(glove);

  const hip = new THREE.Vector3(side * 0.14, 0.12, -0.1);
  const knee = new THREE.Vector3(side * 0.29, -0.02, 0.17);
  const ankle = new THREE.Vector3(side * 0.27, -0.34, 0.22);
  addRiderSegment(riderGroup, hip, knee, 0.12, matRiderPants, 0.09);
  addRiderSegment(riderGroup, knee, ankle, 0.09, matRiderPants, 0.075);

  const kneePad = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), matRiderArmor);
  kneePad.scale.set(0.095, 0.11, 0.07);
  kneePad.position.copy(knee);
  riderGroup.add(kneePad);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.2, 0.3), matRiderBoot);
  boot.position.set(side * 0.27, -0.37, 0.31);
  boot.rotation.x = 0.12;
  riderGroup.add(boot);
}

bikeGroup.add(riderGroup);
scene.add(bikeGroup);

// ==========================================
// DUST / DIRT PARTICLE SYSTEM
// ==========================================
const PARTICLE_COUNT = 65;
const pGeo = new THREE.BufferGeometry();
const pPositions = new Float32Array(PARTICLE_COUNT * 3);
const pColors = new Float32Array(PARTICLE_COUNT * 3);

const pData = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
  pPositions[i * 3] = 0;
  pPositions[i * 3 + 1] = -100;
  pPositions[i * 3 + 2] = 0;

  pColors[i * 3] = 0.65;
  pColors[i * 3 + 1] = 0.45;
  pColors[i * 3 + 2] = 0.25;

  pData.push({
    active: false,
    life: 0,
    maxLife: 1.0,
    vx: 0, vy: 0, vz: 0,
    x: 0, y: -100, z: 0,
  });
}

pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

const pMat = new THREE.PointsMaterial({
  size: 0.65,
  vertexColors: true,
  transparent: true,
  opacity: 0.65,
  depthWrite: false,
});
const particleSystem = new THREE.Points(pGeo, pMat);
scene.add(particleSystem);

let nextParticleIdx = 0;
function spawnDirtParticle(pos, vel, count = 2) {
  for (let k = 0; k < count; k++) {
    const p = pData[nextParticleIdx];
    p.active = true;
    p.life = 0;
    p.maxLife = 0.4 + Math.random() * 0.4;
    p.x = pos.x + (Math.random() - 0.5) * 0.3;
    p.y = pos.y + 0.05 + Math.random() * 0.15;
    p.z = pos.z + (Math.random() - 0.5) * 0.3;
    p.vx = vel.x * -0.4 + (Math.random() - 0.5) * 1.5;
    p.vy = 1.2 + Math.random() * 2.0;
    p.vz = vel.z * -0.4 + (Math.random() - 0.5) * 1.5;
    nextParticleIdx = (nextParticleIdx + 1) % PARTICLE_COUNT;
  }
}

function updateParticles(dt) {
  const posAttr = pGeo.attributes.position;
  const colAttr = pGeo.attributes.color;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = pData[i];
    if (p.active) {
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        posAttr.setY(i, -100);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 4.0 * dt;

        posAttr.setXYZ(i, p.x, p.y, p.z);
        const alpha = 1.0 - (p.life / p.maxLife);
        colAttr.setXYZ(i, 0.7 * alpha, 0.48 * alpha, 0.28 * alpha);
      }
    }
  }
  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
}

// ==========================================
// SYNTHESIZED WEB AUDIO ENGINE (KickMX Braaap!)
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.filter = null;
    this.isReady = false;
  }

  init() {
    if (this.isReady || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.osc = this.ctx.createOscillator();
      this.osc.type = 'sawtooth';

      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 600;

      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.0;

      this.osc.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(this.ctx.destination);

      this.osc.start();
      this.isReady = true;
    } catch (e) {
      console.warn('Web Audio not allowed or failed:', e);
    }
  }

  updateEngine(rpm, throttle) {
    if (!this.isReady || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const freq = 38 + (rpm / 9500) * 190;
      this.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);

      const cutoff = 400 + Math.abs(throttle) * 1400 + (rpm / 9500) * 800;
      this.filter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);

      const vol = 0.04 + Math.abs(throttle) * 0.12 + (rpm / 9500) * 0.06;
      this.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    } catch (_) {}
  }

  playLandingThud() {
    if (!this.isReady || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.28, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (_) {}
  }

  playBoostChime() {
    if (!this.isReady || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.25);
      g.gain.setValueAtTime(0.2, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.31);
    } catch (_) {}
  }
}

const audio = new SoundEngine();

// ==========================================
// GAMEPLAY STATE
// ==========================================
let gear = 0;
let lastTime = performance.now();
let physicsAccumulator = 0;
let isPaused = true;
let recoveryCooldown = 0;
let wheelRollAngle = 0;
let airtime = 0;
let boostTimer = 0;
let runTime = 0;
let routeFinished = false;
let stableGroundTime = 0;

// Camera smooth interpolation target
const currentCamPos = new THREE.Vector3();
const targetCamPos = new THREE.Vector3();

// Initial camera placement
bikeGroup.position.copy(bike.chassisBody.position);
bikeGroup.quaternion.copy(bike.chassisBody.quaternion);
const initialCamOffset = new THREE.Vector3(0, CONFIG.cameraHeight, -CONFIG.cameraFollowDist);
initialCamOffset.applyQuaternion(bikeGroup.quaternion);
camera.position.copy(bikeGroup.position).add(initialCamOffset);
camera.lookAt(bikeGroup.position.x, bikeGroup.position.y + 1, bikeGroup.position.z);
currentCamPos.copy(camera.position);
renderer.render(scene, camera);

function updateGearFromSpeed() {
  const speed = Math.abs(bike.speed);
  let newGear = 0;
  if (speed > 5) newGear = 1;
  if (speed > 22) newGear = 2;
  if (speed > 42) newGear = 3;
  if (speed > 62) newGear = 4;
  if (speed > 82) newGear = 5;
  gear = newGear;
  bike.setGear(gear);
}

function hideInstruction() {
  const instr = document.getElementById('instructions');
  if (instr) instr.style.display = 'none';
}

function startGame() {
  try {
    audio.init();
    isPaused = false;
    runTime = 0;
    routeFinished = false;
    stableGroundTime = 0;
    hideInstruction();
    if (canvas && typeof canvas.focus === 'function') {
      canvas.focus();
    }
    updateRouteDisplay(0);
  } catch (err) {
    console.error('startGame error:', err);
  }
}

function updateRouteDisplay(distanceAlongTrack) {
  const distanceDisplay = document.getElementById('lap-counter');
  if (!distanceDisplay) return;

  const clampedDistance = Math.max(0, Math.min(terrain.trackLength, distanceAlongTrack));
  if (routeFinished) {
    distanceDisplay.textContent = 'FINISH';
  } else {
    distanceDisplay.textContent = (clampedDistance / 1000).toFixed(2);
  }
}

// Start interaction handlers
const gameContainer = document.getElementById('game-container');
if (gameContainer) {
  gameContainer.addEventListener('click', () => {
    if (isPaused) startGame();
  });
}

const instr = document.getElementById('instructions');
if (instr) {
  instr.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPaused) startGame();
  });
}

const btnStart = document.getElementById('btn-start');
if (btnStart) {
  btnStart.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isPaused) startGame();
  });
}

window.addEventListener('keydown', (e) => {
  if (isPaused && (e.key === 'Enter' || e.key === ' ')) {
    startGame();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateRunTimer(dt) {
  if (isPaused) return;
  runTime += dt;
  const ld = document.getElementById('lap-display');
  if (ld) {
    const mins = Math.floor(runTime / 60);
    const secs = Math.floor(runTime % 60);
    const ms = Math.floor((runTime % 1) * 100);
    ld.textContent =
      `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
}

// ==========================================
// MAIN GAME LOOP (60 FPS)
// ==========================================
function animate(time) {
  let dt = (time - lastTime) / 1000;
  lastTime = time;
  if (dt > 0.1) dt = 0.1;

  if (!isPaused) {
    const input = controls.getInput();
    const chassis = bike.chassisBody;
    const quat = chassis.quaternion;

    // 2. Recovery System (F Key)
    if (input.recoveryRequested && recoveryCooldown <= 0) {
      let curX = chassis.position.x;
      let curZ = chassis.position.z;
      // If player flew way out of bounds, return to spawn pad
      if (Math.abs(curX) > terrain.width / 2 - 5 ||
          Math.abs(curZ) > terrain.length / 2 - 5 ||
          chassis.position.y < terrain.minH - 10) {
        curX = CONFIG.bikeStartPos.x;
        curZ = CONFIG.bikeStartPos.z;
      }
      const groundY = terrain.getSurfaceHeight(curX, curZ);
      chassis.position.set(curX, groundY + 2.2, curZ);
      chassis.velocity.set(0, 0, 0);
      chassis.angularVelocity.set(0, 0, 0);
      chassis.quaternion.set(0, 0, 0, 1);
      chassis.wakeUp();
      routeFinished = false;
      stableGroundTime = 0;
      airtime = 0;
      boostTimer = 0;
      hud.hideAirtime();
      recoveryCooldown = 60;
      controls.resetRecovery();
    }
    if (recoveryCooldown > 0) recoveryCooldown--;
    controls.resetRecovery();

    // 3. Boost Countdown
    if (boostTimer > 0) {
      boostTimer -= dt;
      bike.maxForce = 2300;
    } else {
      bike.maxForce = 1750;
    }

    // 4. Update Bike Physics
    bike.setGearRange(input.gearRange);
    physicsAccumulator += dt;
    let substeps = 0;
    while (physicsAccumulator >= CONFIG.fixedTimeStep && substeps < CONFIG.maxSubSteps) {
      bike.update(CONFIG.fixedTimeStep, input, terrain.getZones());
      world.step(CONFIG.fixedTimeStep);
      physicsAccumulator -= CONFIG.fixedTimeStep;
      substeps++;
    }
    updateGearFromSpeed();

    // 4.5 One-way mountain-route distance and finish detection
    updateRunTimer(dt);
    const routePosition = terrain.getTrackData(chassis.position.x, chassis.position.z);
    const routeDistance = Math.max(0, Math.min(terrain.trackLength, routePosition.progress));
    if (routePosition.crossTrackDistance < 14 &&
        routeDistance >= terrain.trackLength - 8) {
      routeFinished = true;
    }
    updateRouteDisplay(routeDistance);

    // 5. Airtime & Clean Landing Detection (KickMX Stunt Mechanic)
    const upVec = new CANNON.Vec3(0, 1, 0);
    quat.vmult(upVec, upVec);
    const hasBothAxlesGrounded = bike.frontContactCount > 0 && bike.rearContactCount > 0;
    if (hasBothAxlesGrounded && Math.abs(chassis.velocity.y) < 4) {
      stableGroundTime += dt;
    } else {
      stableGroundTime = 0;
    }
    const isTouchingGround = stableGroundTime >= 0.05;

    if (isTouchingGround) {
      if (airtime > 0.38) {
        const forward = new CANNON.Vec3(0, 0, 1);
        quat.vmult(forward, forward);
        const pitchAngle = Math.atan2(forward.y, Math.hypot(forward.x, forward.z));
        const isCleanLanding = upVec.y > 0.75 &&
          Math.abs(bike.leanAngle) < 0.5 &&
          Math.abs(pitchAngle) < 0.35;
        if (isCleanLanding) {
          // CLEAN LANDING! Reward with speed boost
          boostTimer = 2.2;
          const forwardSpeed = Math.hypot(forward.x, forward.z);
          if (forwardSpeed > 0.001) {
            chassis.velocity.x += forward.x / forwardSpeed * 3;
            chassis.velocity.z += forward.z / forwardSpeed * 3;
          }

          hud.showBoost();
          audio.playBoostChime();
        }
        audio.playLandingThud();

        // Spawn touchdown dust puff
        spawnDirtParticle(chassis.position, chassis.velocity, 10);
      }
      airtime = 0;
    } else {
      airtime += dt;
    }

    // 6. Spawn Dirt Particles from rear wheel (FIXED CANNON.Vec3 vadd)
    if (isTouchingGround && (input.throttle > 0.1 || bike.isDrifting) && bike.speed > 3) {
      const rearRel = new CANNON.Vec3(0, -0.3, -0.9);
      quat.vmult(rearRel, rearRel);
      const rearWheelPos = chassis.position.vadd(rearRel);
      spawnDirtParticle(rearWheelPos, chassis.velocity, bike.isDrifting ? 5 : 2);
    }
    updateParticles(dt);

    // 7. Sync Visual Model with Physics Body
    bikeGroup.position.copy(chassis.position);
    bikeGroup.quaternion.copy(chassis.quaternion);
    sunLight.position.set(chassis.position.x + 50, chassis.position.y + 80, chassis.position.z + 40);
    sunLight.target.position.copy(chassis.position);

    // Steer front fork & roll wheels
    wheelRollAngle += (bike.speed / 3.6) * dt / 0.38;
    wheelFront.rotation.x = wheelRollAngle;
    const steerSpeedBlend = Math.min(bike.speed / 90, 1);
    frontForkPivot.rotation.y = -input.steer * (0.55 - steerSpeedBlend * 0.28);
    wheelRear.rotation.x = wheelRollAngle;

    // Dynamic Rider Lean into turns & pitch
    riderGroup.rotation.z = bike.leanAngle * 0.35;
    riderGroup.rotation.x = input.throttle > 0 ? 0.06 : (input.throttle < 0 ? 0.14 : 0);

    // 8. Smooth Damped Camera Follow & Dynamic Speed FOV
    const camOffset = new THREE.Vector3(0, CONFIG.cameraHeight, -CONFIG.cameraFollowDist);
    camOffset.applyQuaternion(bikeGroup.quaternion);
    targetCamPos.copy(bikeGroup.position).add(camOffset);
    currentCamPos.lerp(targetCamPos, 0.12);
    camera.position.copy(currentCamPos);

    // Look slightly ahead of bike
    const lookTarget = new THREE.Vector3(0, 0.8, 1.8);
    lookTarget.applyQuaternion(bikeGroup.quaternion).add(bikeGroup.position);
    camera.lookAt(lookTarget);

    // Dynamic FOV (Speed sensation)
    const speedRatio = Math.min(1.0, bike.speed / 90);
    const targetFOV = CONFIG.baseFOV + speedRatio * (CONFIG.maxFOV - CONFIG.baseFOV);
    camera.fov += (targetFOV - camera.fov) * 0.1;
    camera.updateProjectionMatrix();

    // 9. Update Audio Engine
    audio.updateEngine(bike.rpm, input.throttle);

    // 10. Update HUD Display
    hud.update(bike, airtime, boostTimer > 0);
  } else {
    // Camera orbit while on the start screen
    const timeSec = time * 0.0003;
    camera.position.set(
      bikeGroup.position.x + Math.sin(timeSec) * 6.5,
      bikeGroup.position.y + 2.5,
      bikeGroup.position.z + Math.cos(timeSec) * 6.5
    );
    camera.lookAt(bikeGroup.position.x, bikeGroup.position.y + 0.8, bikeGroup.position.z);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Start Game Loop
requestAnimationFrame(animate);

window.game = { bike, controls, world, scene, camera, terrain };
