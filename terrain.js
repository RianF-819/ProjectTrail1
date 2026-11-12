/**
 * terrain.js - One-way mountain pass with varied surfaces and scenery
 * Features:
 * - 2.4 km climbing route with asphalt, dirt, rock, sand, and mud sections
 * - Mountain heightfield and trackside rocks, shrubs, trees, and checkpoints
 * - Cannon-es heightfield collision tiles aligned with the Three.js terrain
 */

import * as CANNON from 'cannon-es';
import * as THREE from 'three';

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class Terrain {
  constructor(scene, world, width = 400, length = 2600, resolutionX = 201, resolutionZ = 1301) {
    this.scene = scene;
    this.world = world;
    this.width = width;
    this.length = length;
    this.resolutionX = resolutionX;
    this.resolutionZ = resolutionZ;
    this.mesh = null;
    this.body = null;
    this.bodies = [];
    this.matrix = null;
    this.minH = 0;
    this.maxH = 0;
    this.zones = [];
    this.checkpoints = [];
    this.trackPoints = [
      [0, -1100, 0],
      [0, -1000, 0],
      [0, -850, 6],
      [35, -700, 19],
      [75, -540, 33],
      [80, -360, 48],
      [45, -180, 63],
      [-10, -20, 78],
      [-55, 140, 93],
      [-65, 310, 108],
      [-25, 470, 124],
      [30, 630, 140],
      [65, 790, 156],
      [55, 950, 172],
      [10, 1100, 188],
      [-45, 1230, 204],
    ];
    const surfaceTypes = [
      'asphalt', 'dirt', 'dirt', 'dirt', 'dirt',
      'rock', 'rock', 'rock', 'dirt', 'sand',
      'sand', 'dirt', 'mud', 'mud', 'rock',
    ];
    this.trackSegments = [];
    this.trackPointDistances = [0];
    this.trackLength = 0;
    for (let i = 1; i < this.trackPoints.length; i++) {
      const [x1, z1, h1] = this.trackPoints[i - 1];
      const [x2, z2, h2] = this.trackPoints[i];
      const segmentLength = Math.hypot(x2 - x1, z2 - z1);
      this.trackSegments.push([
        x1, z1, x2, z2, h1, h2, surfaceTypes[i - 1],
        this.trackLength, this.trackLength + segmentLength,
      ]);
      this.trackLength += segmentLength;
      this.trackPointDistances.push(this.trackLength);
    }

    this.generateHeightmap();
    this.createPhysics();
    this.createVisuals();
    this.defineZones();
    this.createScenery();
    this.createCheckpoints();
  }

  calculateHeight(worldX, worldZ) {
    let h = 0;
    const track = this.getTrackData(worldX, worldZ);

    h += 1.8 * Math.sin(worldX * 0.018) * Math.cos(worldZ * 0.009);
    h += 0.9 * Math.sin(worldX * 0.042 + worldZ * 0.013);

    const westRidgeX = -140 + 11 * Math.sin(worldZ * 0.0024);
    const westRidgeDistance = worldX - westRidgeX;
    const westRidgeBase = Math.max(34,
      52 + Math.max(0, worldZ + 1100) * 0.105 +
      12 * Math.sin(worldZ * 0.0041) + 7 * Math.sin(worldZ * 0.011));
    h += westRidgeBase * Math.exp(-(westRidgeDistance * westRidgeDistance) / (2 * 38 * 38));

    const eastRidgeX = 172 + 7 * Math.sin(worldZ * 0.0031);
    const eastRidgeDistance = worldX - eastRidgeX;
    const eastRidgeBase = 24 + Math.max(0, worldZ + 1100) * 0.045;
    h += eastRidgeBase * Math.exp(-(eastRidgeDistance * eastRidgeDistance) / (2 * 30 * 30));

    const trackBlend = 1 - smoothstep(10, 36, track.crossTrackDistance);
    h += (track.elevation - h) * trackBlend;

    const roughness = track.surface === 'rock' ? 0.16
      : (track.surface === 'sand' ? 0.1 : (track.surface === 'mud' ? 0.045 : 0.035));
    h += Math.sin(track.progress * 0.22 + worldX * 0.17) *
      roughness * trackBlend;

    return h;
  }

  getTrackElevation(worldX, worldZ) {
    return this.getTrackData(worldX, worldZ).elevation;
  }

  getTrackData(worldX, worldZ) {
    let nearestDistanceSq = Infinity;
    let elevation = 0;
    let progress = 0;
    let surface = 'dirt';

    for (const [x1, z1, x2, z2, h1, h2, segmentSurface, startDistance, endDistance] of this.trackSegments) {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const t = Math.max(0, Math.min(1,
        ((worldX - x1) * dx + (worldZ - z1) * dz) / (dx * dx + dz * dz)));
      const nearestX = x1 + t * dx;
      const nearestZ = z1 + t * dz;
      const distanceSq = (worldX - nearestX) ** 2 + (worldZ - nearestZ) ** 2;
      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        elevation = h1 + (h2 - h1) * t;
        progress = startDistance + (endDistance - startDistance) * t;
        surface = segmentSurface;
      }
    }

    return {
      crossTrackDistance: Math.sqrt(nearestDistanceSq),
      elevation,
      progress,
      surface,
    };
  }

  getSurfaceHeight(worldX, worldZ) {
    const elementSize = this.width / (this.resolutionX - 1);
    const gridX = Math.max(0, Math.min(this.resolutionX - 1,
      (worldX + this.width / 2) / elementSize));
    const gridZ = Math.max(0, Math.min(this.resolutionZ - 1,
      (this.length / 2 - worldZ) / elementSize));
    const cellX = Math.min(this.resolutionX - 2, Math.floor(gridX));
    const cellZ = Math.min(this.resolutionZ - 2, Math.floor(gridZ));
    const x = gridX - cellX;
    const z = gridZ - cellZ;
    const h00 = this.matrix[cellX][cellZ];
    const h10 = this.matrix[cellX + 1][cellZ];
    const h01 = this.matrix[cellX][cellZ + 1];
    const h11 = this.matrix[cellX + 1][cellZ + 1];

    if (x + z <= 1) {
      return h00 + x * (h10 - h00) + z * (h01 - h00);
    }

    return h11 + (1 - x) * (h01 - h11) + (1 - z) * (h10 - h11);
  }

  getTrackDistance(worldX, worldZ) {
    return this.getTrackData(worldX, worldZ).crossTrackDistance;
  }

  generateHeightmap() {
    const elementSize = this.width / (this.resolutionX - 1);
    const matrix = [];
    let minH = Infinity;
    let maxH = -Infinity;

    for (let i = 0; i < this.resolutionX; i++) {
      const row = [];
      for (let j = 0; j < this.resolutionZ; j++) {
        // Cannon Heightfield mapping:
        // Local X (i) -> World X (-width/2 to +width/2)
        // Local Y (j) -> World Z (+length/2 to -length/2)
        const worldX = -this.width / 2 + i * elementSize;
        const worldZ = this.length / 2 - j * elementSize;
        const h = this.calculateHeight(worldX, worldZ);
        row.push(h);
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
      }
      matrix.push(row);
    }
    this.matrix = matrix;
    this.minH = minH;
    this.maxH = maxH;
  }

  createPhysics() {
    const elementSize = this.width / (this.resolutionX - 1);
    const q = new CANNON.Quaternion();
    q.setFromEuler(-Math.PI / 2, 0, 0);
    const tileIntervals = this.resolutionX - 1;

    for (let startZ = 0; startZ < this.resolutionZ - 1; startZ += tileIntervals) {
      const endZ = Math.min(startZ + tileIntervals, this.resolutionZ - 1);
      const tileMatrix = this.matrix.map((row) => {
        const tileRow = row.slice(startZ, endZ + 1);
        while (tileRow.length < this.resolutionX) {
          tileRow.push(tileRow[tileRow.length - 1]);
        }
        return tileRow;
      });
      const hfShape = new CANNON.Heightfield(tileMatrix, {
        elementSize,
        minValue: this.minH,
        maxValue: this.maxH,
      });
      const body = new CANNON.Body({ mass: 0 });
      body.collisionFilterGroup = 2;
      body.collisionFilterMask = 1;
      body.addShape(
        hfShape,
        new CANNON.Vec3(-this.width / 2, 0, this.length / 2 - startZ * elementSize),
        q
      );
      this.world.addBody(body);
      this.bodies.push(body);
    }

    this.body = this.bodies[0];
  }

  createVisuals() {
    const resX = this.resolutionX;
    const resZ = this.resolutionZ;
    const elementSize = this.width / (resX - 1);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(resX * resZ * 3);
    const colors = new Float32Array(resX * resZ * 3);
    const indices = [];

    const colorGrass = new THREE.Color(0x3e7a32);  // Rich meadow green
    const colorGrassLight = new THREE.Color(0x569642); // Sunlit grass
    const colorDirt = new THREE.Color(0x8a532d);   // Sandy dirt track
    const colorClay = new THREE.Color(0xa66336);   // Warm reddish clay
    const colorRock = new THREE.Color(0x696058);   // Mountain rock
    const surfaceColors = {
      asphalt: new THREE.Color(0x34383b),
      dirt: colorDirt,
      rock: colorRock,
      sand: new THREE.Color(0xc3a16b),
      mud: new THREE.Color(0x4c3527),
    };
    const tempColor = new THREE.Color();
    const grassColor = new THREE.Color();

    for (let j = 0; j < resZ; j++) {
      for (let i = 0; i < resX; i++) {
        const index = i + j * resX;
        const x = -this.width / 2 + i * elementSize;
        const z = this.length / 2 - j * elementSize;
        const h = this.matrix[i][j];
        positions[index * 3] = x;
        positions[index * 3 + 1] = h;
        positions[index * 3 + 2] = z;

        const track = this.getTrackData(x, z);
        if (h > 80 && track.crossTrackDistance > 24) {
          tempColor.copy(colorRock).lerp(colorGrass, Math.max(0, (25 - h) / 10));
        } else {
          const grassNoise = Math.sin(x * 0.2 + z * 0.2) * 0.5 + 0.5;
          grassColor.copy(colorGrass).lerp(colorGrassLight, grassNoise);
          const groundNoise = Math.sin(x * 0.42 + Math.sin(z * 0.1)) *
            Math.cos(z * 0.34 - x * 0.08);
          grassColor.lerp(colorClay, groundNoise * 0.05);
          const trackColor = surfaceColors[track.surface] || colorDirt;
          const trackNoise = track.surface === 'asphalt'
            ? Math.sin(z * 0.08) * 0.025
            : groundNoise * 0.13;
          const trackBlend = 1 - smoothstep(8.5, 18, track.crossTrackDistance);
          tempColor.copy(grassColor).lerp(trackColor, trackBlend);
          if (trackBlend > 0) tempColor.multiplyScalar(1 + trackNoise * trackBlend);
        }

        colors[index * 3] = tempColor.r;
        colors[index * 3 + 1] = tempColor.g;
        colors[index * 3 + 2] = tempColor.b;
      }
    }

    for (let j = 0; j < resZ - 1; j++) {
      for (let i = 0; i < resX - 1; i++) {
        const a = i + j * resX;
        const b = a + 1;
        const c = a + resX;
        const d = c + 1;
        indices.push(a, b, c, d, c, b);
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
    this.createAsphaltRoad();

    // Distant outer horizon skirt ground (infinite feeling)
    const skirtGeo = new THREE.PlaneGeometry(this.width * 2.5, this.length * 2.5);
    skirtGeo.rotateX(-Math.PI / 2);
    const skirtMat = new THREE.MeshBasicMaterial({ color: 0x2d5a24 });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = this.minH - 0.5;
    this.scene.add(skirt);
  }

  createAsphaltRoad() {
    const asphaltSegment = this.trackSegments.find((segment) => segment[6] === 'asphalt');
    if (!asphaltSegment) return;

    const [x1, z1, x2, z2] = asphaltSegment;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const roadLength = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const centerX = (x1 + x2) / 2;
    const centerZ = (z1 + z2) / 2;
    const roadY = this.getSurfaceHeight(centerX, centerZ) + 0.045;
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x34383b,
      roughness: 0.94,
      metalness: 0.02,
    });
    const markingMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7e2d3,
      roughness: 0.8,
      metalness: 0,
    });
    const roadGeometry = new THREE.PlaneGeometry(14, roadLength, 1, Math.ceil(roadLength / 8));
    roadGeometry.rotateX(-Math.PI / 2);
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.position.set(centerX, roadY, centerZ);
    road.rotation.y = angle;
    road.receiveShadow = true;
    this.scene.add(road);

    const addMarking = (width, length, lateralOffset, alongDistance) => {
      const progress = alongDistance / roadLength;
      const x = x1 + dx * progress - Math.sin(angle) * lateralOffset;
      const z = z1 + dz * progress + Math.cos(angle) * lateralOffset;
      const geometry = new THREE.PlaneGeometry(width, length);
      geometry.rotateX(-Math.PI / 2);
      const marking = new THREE.Mesh(geometry, markingMaterial);
      marking.position.set(x, roadY + 0.025, z);
      marking.rotation.y = angle;
      this.scene.add(marking);
    };

    addMarking(0.14, roadLength, -6.65, roadLength / 2);
    addMarking(0.14, roadLength, 6.65, roadLength / 2);
    for (let distance = 8; distance < roadLength - 4; distance += 12) {
      addMarking(0.18, 3.2, 0, distance);
    }
    addMarking(14, 0.22, 0, roadLength);
  }

  defineZones() {
    const surfaceProperties = {
      asphalt: { friction: 1.08, suspMult: 0.92 },
      dirt: { friction: 1.0, suspMult: 1.0 },
      rock: { friction: 0.84, suspMult: 1.18 },
      sand: { friction: 0.7, suspMult: 1.12 },
      mud: { friction: 0.46, suspMult: 0.86 },
    };

    this.zones = this.trackSegments.map((segment) => {
      const [x1, z1, x2, z2, , , surface] = segment;
      return {
        start: { x: x1, z: z1 },
        end: { x: x2, z: z2 },
        halfWidth: 8,
        surface,
        ...surfaceProperties[surface],
      };
    });
  }

  /**
   * Low-Poly Pine Trees & Motocross Track Props
   */
  createScenery() {
    const random = createSeededRandom(0x4d585452);
    // Shared geometry & materials for high performance
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.8, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 1.0 });

    const foliageGeo = new THREE.ConeGeometry(1.4, 3.2, 5);
    const foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x224c1c, roughness: 0.9, flatShading: true });
    const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x183814, roughness: 0.9, flatShading: true });

    // Procedural tree positions scattered on hills, away from the main track
    const treePositions = [];
    const seedPoints = [
      { cx: -150, cz: -900, count: 24, r: 38 },
      { cx: 155, cz: -720, count: 16, r: 34 },
      { cx: -150, cz: -450, count: 24, r: 38 },
      { cx: 155, cz: -240, count: 16, r: 34 },
      { cx: -150, cz: 0, count: 24, r: 38 },
      { cx: 155, cz: 260, count: 16, r: 34 },
      { cx: -150, cz: 550, count: 24, r: 38 },
      { cx: 155, cz: 820, count: 16, r: 34 },
      { cx: -150, cz: 1100, count: 24, r: 38 },
    ];

    for (const group of seedPoints) {
      for (let k = 0; k < group.count; k++) {
        const angle = random() * Math.PI * 2;
        const rad = random() * group.r;
        const px = group.cx + Math.cos(angle) * rad;
        const pz = group.cz + Math.sin(angle) * rad;
        if (this.getTrackDistance(px, pz) < 15) continue;

        const py = this.getSurfaceHeight(px, pz);
        treePositions.push({ x: px, y: py, z: pz, scale: 0.8 + random() * 0.6 });
      }
    }

    const treeGroup = new THREE.Group();
    for (const pos of treePositions) {
      const tree = new THREE.Group();

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.9;
      trunk.castShadow = true;
      tree.add(trunk);

      const fMat = random() > 0.5 ? foliageMat1 : foliageMat2;
      const foliage = new THREE.Mesh(foliageGeo, fMat);
      foliage.position.y = 2.8;
      foliage.castShadow = true;
      tree.add(foliage);

      tree.position.set(pos.x, pos.y, pos.z);
      tree.rotation.y = random() * Math.PI * 2;
      tree.scale.setScalar(pos.scale);
      treeGroup.add(tree);
    }
    this.scene.add(treeGroup);
    this.createTracksideDetails(random);
  }

  createTracksideDetails(random) {
    const rockGeometry = new THREE.IcosahedronGeometry(0.7, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x74695c, roughness: 1, flatShading: true });
    const shrubGeometry = new THREE.ConeGeometry(0.42, 0.9, 5);
    const shrubMaterial = new THREE.MeshStandardMaterial({ color: 0x315d28, roughness: 1, flatShading: true });
    const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 110);
    const shrubs = new THREE.InstancedMesh(shrubGeometry, shrubMaterial, 90);
    const dummy = new THREE.Object3D();
    let rockCount = 0;
    let shrubCount = 0;
    for (let attempt = 0; attempt < 1600 && (rockCount < rocks.count || shrubCount < shrubs.count); attempt++) {
      const segmentIndex = Math.floor(random() * this.trackSegments.length);
      const [x1, z1, x2, z2] = this.trackSegments[segmentIndex];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const segmentLength = Math.hypot(dx, dz);
      const along = random();
      const side = random() < 0.5 ? -1 : 1;
      const offset = 14 + random() * 22;
      const x = x1 + dx * along - dz / segmentLength * offset * side;
      const z = z1 + dz * along + dx / segmentLength * offset * side;
      if (Math.abs(x) > this.width / 2 - 5 ||
          Math.abs(z) > this.length / 2 - 5) continue;

      const surfaceY = this.getSurfaceHeight(x, z);
      if (random() < 0.58 && rockCount < rocks.count) {
        const scale = 0.35 + random() * 0.8;
        const verticalScale = scale * (0.55 + random() * 0.65);
        dummy.position.set(x, surfaceY + verticalScale * 0.7, z);
        dummy.rotation.set(0, random() * Math.PI, 0);
        dummy.scale.set(scale, verticalScale, scale);
        dummy.updateMatrix();
        rocks.setMatrixAt(rockCount++, dummy.matrix);
      } else if (shrubCount < shrubs.count) {
        const scale = 0.55 + random() * 0.75;
        dummy.position.set(x, surfaceY + scale * 0.42, z);
        dummy.rotation.set(0, random() * Math.PI, 0);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        shrubs.setMatrixAt(shrubCount++, dummy.matrix);
      }
    }

    rocks.count = rockCount;
    shrubs.count = shrubCount;
    rocks.instanceMatrix.needsUpdate = true;
    shrubs.instanceMatrix.needsUpdate = true;
    rocks.receiveShadow = true;
    shrubs.receiveShadow = true;
    this.scene.add(rocks, shrubs);
  }

  /**
   * Glowing KickMX Checkpoint Arches along the Track
   */
  createCheckpoints() {
    const checkpointSpecs = [
      { index: 0, label: 'START / ASPHALT' },
      { index: 1, label: 'DIRT CLIMB' },
      { index: 5, label: 'ROCKY RIDGE' },
      { index: 10, label: 'SAND CUT' },
      { index: 13, label: 'MUD PASS' },
      { index: this.trackPoints.length - 1, label: 'SUMMIT FINISH' },
    ];
    const archPositions = checkpointSpecs.map(({ index, label }) => {
      const point = this.trackPoints[index];
      const previous = this.trackPoints[Math.max(0, index - 1)];
      const next = this.trackPoints[Math.min(this.trackPoints.length - 1, index + 1)];
      const dx = index === this.trackPoints.length - 1
        ? point[0] - previous[0]
        : next[0] - point[0];
      const dz = index === this.trackPoints.length - 1
        ? point[1] - previous[1]
        : next[1] - point[1];
      return {
        x: point[0],
        z: point[1],
        rotY: Math.atan2(dx, dz),
        label,
        distance: this.trackPointDistances[index],
      };
    });

    const torusGeo = new THREE.TorusGeometry(3.2, 0.22, 8, 20, Math.PI);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff3300,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.7,
    });

    const glowPillarGeo = new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });

    for (let i = 0; i < archPositions.length; i++) {
      const cp = archPositions[i];
      const y = this.getSurfaceHeight(cp.x, cp.z);
      const gateGroup = new THREE.Group();

      // Arch top
      const arch = new THREE.Mesh(torusGeo, archMat);
      arch.position.y = 3.0;
      gateGroup.add(arch);

      // Left & right support pillars
      const pLeft = new THREE.Mesh(glowPillarGeo, pillarMat);
      const leftX = Math.cos(cp.rotY) * -3.2;
      const leftZ = -Math.sin(cp.rotY) * -3.2;
      const leftGroundY = this.getSurfaceHeight(cp.x + leftX, cp.z + leftZ);
      const leftHeight = Math.max(1, 3 - (leftGroundY - y));
      pLeft.position.set(-3.2, leftGroundY - y + leftHeight / 2, 0);
      pLeft.scale.y = leftHeight / 3.2;
      gateGroup.add(pLeft);

      const pRight = new THREE.Mesh(glowPillarGeo, pillarMat);
      const rightX = Math.cos(cp.rotY) * 3.2;
      const rightZ = -Math.sin(cp.rotY) * 3.2;
      const rightGroundY = this.getSurfaceHeight(cp.x + rightX, cp.z + rightZ);
      const rightHeight = Math.max(1, 3 - (rightGroundY - y));
      pRight.position.set(3.2, rightGroundY - y + rightHeight / 2, 0);
      pRight.scale.y = rightHeight / 3.2;
      gateGroup.add(pRight);

      gateGroup.position.set(cp.x, y, cp.z);
      gateGroup.rotation.y = cp.rotY;
      this.scene.add(gateGroup);
      this.checkpoints.push({ ...cp, y, mesh: gateGroup });
    }
  }

  getZones() {
    return this.zones;
  }
}
