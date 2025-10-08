import * as THREE from 'https://unpkg.com/three@0.162.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.162.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe7ff);
scene.fog = new THREE.Fog(0xcfe7ff, 80, 240);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(26, 24, 38);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 10;
controls.maxDistance = 120;
controls.minPolarAngle = 0.8;
controls.maxPolarAngle = 1.45;
controls.target.set(0, 4, 0);
controls.update();

const clock = new THREE.Clock();

const state = {
  mode: 'build',
  playing: false,
  activePieceType: 'straight',
  ghost: null,
  ghostType: null,
  ghostRotationStep: THREE.MathUtils.degToRad(15),
  trackPieces: [],
  deleteMode: false,
  pointerDown: false,
  pointerDownPosition: new THREE.Vector2(),
  pointerMoved: false,
  longPressTimeout: null,
  longPressTriggered: false,
  trackCurve: null,
  trackLength: 0,
  trackProgress: 0,
  trainSpeed: 8,
  lighting: {
    mode: 'day',
    progress: 1,
    duration: 1.3,
    start: null,
    target: null,
  },
  waterfallMaterial: null,
  balloonGroup: null,
  trainGroup: null,
  trainWheels: [],
  adjustableMaterials: [],
  placementTargets: [],
  raycaster: new THREE.Raycaster(),
  pointerNDC: new THREE.Vector2(),
};

const toastEl = document.getElementById('toast');
const btnPlay = document.getElementById('btnPlay');
const btnHome = document.getElementById('btnHome');
const btnSun = document.getElementById('btnSun');
const btnUndo = document.getElementById('btnUndo');
const btnDelete = document.getElementById('btnDelete');
const modeLabel = document.getElementById('modeLabel');
const pieceButtons = Array.from(document.querySelectorAll('[data-piece]'));

const rootGroup = new THREE.Group();
scene.add(rootGroup);

const pieceGroup = new THREE.Group();
rootGroup.add(pieceGroup);

initLights();
createEnvironment();
setupStationAndTrain();
setupUI();
setActivePiece('straight');

window.addEventListener('resize', onResize);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointerleave', onPointerCancel);
canvas.addEventListener('pointercancel', onPointerCancel);
canvas.addEventListener('click', onCanvasClick);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('keydown', onKeyDown);

animate();

function initLights() {
  const hemi = new THREE.HemisphereLight(0xcfe9ff, 0xa0e1bf, 0.95);
  hemi.position.set(0, 80, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffdfb0, 1.15);
  dir.position.set(-45, 60, 35);
  dir.castShadow = false;
  scene.add(dir);

  state.lighting.base = { hemi, dir };
  state.lighting.target = createLightingPreset('day');
}

function createLightingPreset(mode) {
  if (mode === 'night') {
    return {
      hemiSky: new THREE.Color(0xa7b6ff),
      hemiGround: new THREE.Color(0x5f7ea0),
      hemiIntensity: 0.4,
      dirColor: new THREE.Color(0xf5d5ff),
      dirIntensity: 0.45,
      background: new THREE.Color(0xa7b6ff),
      fog: new THREE.Fog(0xa7b6ff, 60, 180),
      exposure: 0.95,
    };
  }
  return {
    hemiSky: new THREE.Color(0xcfe9ff),
    hemiGround: new THREE.Color(0xa0e1bf),
    hemiIntensity: 0.95,
    dirColor: new THREE.Color(0xffdfb0),
    dirIntensity: 1.15,
    background: new THREE.Color(0xcfe7ff),
    fog: new THREE.Fog(0xcfe7ff, 80, 240),
    exposure: 1.05,
  };
}

function setupUI() {
  pieceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (state.mode !== 'build') {
        showToast('Kembali ke mode Build untuk mengedit rel.');
        return;
      }
      const type = button.dataset.piece;
      setActivePiece(type);
    });
  });

  btnUndo.addEventListener('click', () => {
    if (state.mode !== 'build') {
      showToast('Undo hanya tersedia di mode Build.');
      return;
    }
    undoPiece();
  });

  btnDelete.addEventListener('click', () => {
    if (state.mode !== 'build') {
      showToast('Aktifkan Build mode untuk hapus rel.');
      return;
    }
    state.deleteMode = !state.deleteMode;
    document.body.classList.toggle('delete-mode', state.deleteMode);
    btnDelete.classList.toggle('active', state.deleteMode);
    showToast(state.deleteMode ? 'Klik rel untuk menghapus.' : 'Mode hapus dimatikan.');
  });

  btnPlay.addEventListener('click', () => {
    if (state.mode === 'build') {
      startPlayMode();
    } else {
      togglePlayPause();
    }
  });

  btnHome.addEventListener('click', () => {
    window.location.href = '/elearn/portal.html';
  });

  btnSun.addEventListener('click', () => {
    const next = state.lighting.mode === 'day' ? 'night' : 'day';
    setLightingMode(next);
  });
}

function createEnvironment() {
  const groundMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xbde7b0,
    roughness: 0.95,
    metalness: 0,
  }), { dayColor: 0xbde7b0, nightColor: 0x567d59 });

  const ground = new THREE.Mesh(new THREE.CircleGeometry(130, 96), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = false;
  ground.name = 'ground';
  rootGroup.add(ground);
  state.placementTargets.push(ground);

  const rimMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xa9d89a,
    roughness: 0.85,
    metalness: 0,
  }), { dayColor: 0xa9d89a, nightColor: 0x4d7053 });

  const rim = new THREE.Mesh(new THREE.RingGeometry(110, 130, 64), rimMaterial);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = -0.05;
  rootGroup.add(rim);

  addHills();
  addTrees();
  addWater();
  addClouds();
  addBalloon();
}

function addHills() {
  const hillColors = [0xc8efb8, 0xc1e8ae, 0xb6dfab, 0xd0f0c6, 0xc3efbf];

  for (let i = 0; i < 8; i++) {
    const scale = THREE.MathUtils.randFloat(1.8, 3.6);
    const hillGeo = new THREE.SphereGeometry(4, 32, 32);
    const dayColor = hillColors[i % hillColors.length];
    const material = registerMaterial(new THREE.MeshStandardMaterial({
      color: dayColor,
      roughness: 0.92,
      metalness: 0.02,
    }), { dayColor, nightColor: new THREE.Color(dayColor).multiplyScalar(0.55).getHex() });

    const hill = new THREE.Mesh(hillGeo, material);
    const angle = (i / 8) * Math.PI * 2 + THREE.MathUtils.randFloat(-0.3, 0.3);
    const radius = THREE.MathUtils.randFloat(18, 46);
    hill.position.set(Math.cos(angle) * radius, scale * 0.4, Math.sin(angle) * radius);
    hill.scale.set(scale, scale * THREE.MathUtils.randFloat(0.5, 0.85), scale);
    rootGroup.add(hill);
  }
}

function addTrees() {
  const treeGroup = new THREE.Group();
  rootGroup.add(treeGroup);

  const trunkMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xd5b38f,
    roughness: 0.8,
    metalness: 0.1,
  }), { dayColor: 0xd5b38f, nightColor: 0x5b463a });

  const leavesMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xaadf9b,
    roughness: 0.65,
    metalness: 0.05,
  }), { dayColor: 0xaadf9b, nightColor: 0x4f7655 });

  for (let i = 0; i < 22; i++) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 3.4, 8), trunkMaterial);
    trunk.position.y = 1.7;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3, 12), leavesMaterial);
    cone.position.y = 3.6;
    cone.rotation.z = THREE.MathUtils.randFloatSpread(0.1);
    tree.add(trunk);
    tree.add(cone);
    const angle = Math.random() * Math.PI * 2;
    const radius = THREE.MathUtils.randFloat(12, 52);
    tree.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    tree.rotation.y = Math.random() * Math.PI;
    treeGroup.add(tree);
  }
}

function addWater() {
  const waterMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0x9fd7ff,
    transparent: true,
    opacity: 0.8,
    roughness: 0.2,
    metalness: 0.05,
    emissive: new THREE.Color(0x74b4f6),
    emissiveIntensity: 0.2,
  }), {
    dayColor: 0x9fd7ff,
    nightColor: 0x446c9e,
    dayEmissive: 0x74b4f6,
    nightEmissive: 0x3d5ca0,
  });

  const lake = new THREE.Mesh(new THREE.CircleGeometry(14, 48), waterMaterial);
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(-10, 0.02, 8);
  rootGroup.add(lake);

  const waterfallTexture = createWaterfallTexture();
  const waterfallMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.72,
    map: waterfallTexture,
    emissive: new THREE.Color(0x6ea5ff),
    emissiveIntensity: 0.35,
    roughness: 0.1,
    metalness: 0,
  }), {
    dayColor: 0xffffff,
    nightColor: 0xcfd6ff,
    dayEmissive: 0x6ea5ff,
    nightEmissive: 0x8295ff,
  });

  const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), waterfallMaterial);
  waterfall.position.set(-10, 3.8, -6);
  waterfall.rotation.y = THREE.MathUtils.degToRad(30);
  waterfall.renderOrder = 2;
  rootGroup.add(waterfall);
  state.waterfallMaterial = waterfallMaterial;
}

function addClouds() {
  const cloudMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.82,
    roughness: 0.9,
    metalness: 0,
  }), { dayColor: 0xffffff, nightColor: 0xdce6ff });

  for (let i = 0; i < 3; i++) {
    const cloud = new THREE.Group();
    const count = THREE.MathUtils.randInt(3, 5);
    for (let j = 0; j < count; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 20), cloudMaterial);
      puff.scale.setScalar(THREE.MathUtils.randFloat(0.8, 1.4));
      puff.position.set(
        THREE.MathUtils.randFloatSpread(3),
        THREE.MathUtils.randFloatSpread(1.2),
        THREE.MathUtils.randFloatSpread(1.8)
      );
      cloud.add(puff);
    }
    cloud.position.set(
      THREE.MathUtils.randFloatSpread(80),
      THREE.MathUtils.randFloat(20, 32),
      THREE.MathUtils.randFloatSpread(80)
    );
    cloud.userData.origin = cloud.position.clone();
    cloud.userData.offset = Math.random() * Math.PI * 2;
    rootGroup.add(cloud);
  }
}

function addBalloon() {
  // TODO: replace with GLB hot air balloon asset
  const balloonGroup = new THREE.Group();
  const balloonMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xffb6c1,
    roughness: 0.5,
    metalness: 0.1,
    emissive: new THREE.Color(0xffd0dd),
    emissiveIntensity: 0.2,
  }), {
    dayColor: 0xffb6c1,
    nightColor: 0xc67a87,
    dayEmissive: 0xffd0dd,
    nightEmissive: 0x4f2133,
  });

  const balloon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 32, 32), balloonMaterial);
  balloon.scale.set(1, 1.2, 1);
  balloonGroup.add(balloon);

  const band = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 12, 24), registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xfac7cf,
    roughness: 0.6,
    metalness: 0.2,
  }), { dayColor: 0xfac7cf, nightColor: 0x8f5a60 }));
  band.rotation.x = Math.PI / 2;
  band.position.y = -0.8;
  balloonGroup.add(band);

  const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0xd4b48c, roughness: 0.8, metalness: 0.1 });
  for (let i = 0; i < 4; i++) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5, 6), ropeMaterial);
    const angle = (i / 4) * Math.PI * 2;
    rope.position.set(Math.cos(angle) * 0.6, -3, Math.sin(angle) * 0.6);
    rope.rotation.z = Math.PI / 2;
    balloonGroup.add(rope);
  }

  const basketMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xffe2a6,
    roughness: 0.7,
    metalness: 0.1,
  }), { dayColor: 0xffe2a6, nightColor: 0x9c7d4a });
  const basket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.4, 1, 1, 1), basketMaterial);
  basket.position.y = -4.2;
  balloonGroup.add(basket);

  balloonGroup.position.set(12, 14, -16);
  rootGroup.add(balloonGroup);
  state.balloonGroup = balloonGroup;
}

function createWaterfallTexture() {
  const canvasTex = document.createElement('canvas');
  canvasTex.width = 64;
  canvasTex.height = 256;
  const ctx = canvasTex.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasTex.height);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.5, '#d4f1ff');
  gradient.addColorStop(1, '#8fd6ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasTex.width, canvasTex.height);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#9ad8ff';
  for (let i = 0; i < 10; i++) {
    const x = (i / 10) * canvasTex.width;
    ctx.fillRect(x, 0, 6, canvasTex.height);
  }
  const texture = new THREE.CanvasTexture(canvasTex);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1.8);
  return texture;
}

function setupStationAndTrain() {
  // TODO: replace with GLB station & train assets
  const station = new THREE.Group();
  station.position.set(6, 0, 3);

  const baseMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xfff0d7,
    roughness: 0.7,
    metalness: 0.05,
  }), { dayColor: 0xfff0d7, nightColor: 0xb39b7f });

  const roofMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xffb1c1,
    roughness: 0.6,
    metalness: 0.15,
  }), { dayColor: 0xffb1c1, nightColor: 0x7d4a5a });

  const base = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 3), baseMaterial);
  base.position.y = 0.5;
  station.add(base);

  const columnsMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xf8d2a8,
    roughness: 0.7,
    metalness: 0.05,
  }), { dayColor: 0xf8d2a8, nightColor: 0x9f7c53 });

  for (let i = -1; i <= 1; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 2.2, 10), columnsMaterial);
    col.position.set(i * 2.4, 1.6, -1);
    station.add(col);
  }

  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.5, 2.4, 4), roofMaterial);
  roof.position.y = 3.3;
  roof.rotation.y = Math.PI / 4;
  station.add(roof);

  const signMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0x5d6fff,
    emissive: new THREE.Color(0x7284ff),
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.2,
  }), { dayColor: 0x5d6fff, nightColor: 0x2a357d, dayEmissive: 0x7284ff, nightEmissive: 0x2634ff });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1, 0.2), signMaterial);
  sign.position.set(0, 2.7, 0);
  station.add(sign);

  const signText = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 0.4), new THREE.MeshBasicMaterial({
    color: 0xffffff,
  }));
  signText.position.set(0, 2.9, 0.12);
  station.add(signText);

  rootGroup.add(station);

  // Train (dummy placeholder) // TODO: replace with GLB
  const trainGroup = new THREE.Group();
  trainGroup.position.set(0, 0.9, 0);

  const locoMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xf6b1c4,
    roughness: 0.45,
    metalness: 0.2,
    emissive: new THREE.Color(0xffc6dd),
    emissiveIntensity: 0.12,
  }), { dayColor: 0xf6b1c4, nightColor: 0x7e4f5e, dayEmissive: 0xffc6dd, nightEmissive: 0x3d1a28 });

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 3.2), locoMaterial);
  cabin.position.set(0, 0.8, 0);
  trainGroup.add(cabin);

  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.1, 12), locoMaterial);
  chimney.position.set(0.6, 1.6, 1.1);
  trainGroup.add(chimney);

  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 16), locoMaterial);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0.6, 0.7, 1.9);
  trainGroup.add(nose);

  const roofCabin = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 16, 1, true), locoMaterial);
  roofCabin.rotation.z = Math.PI / 2;
  roofCabin.position.set(-0.2, 1.6, -0.3);
  trainGroup.add(roofCabin);

  const wagonMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0xffe0b5,
    roughness: 0.5,
    metalness: 0.1,
  }), { dayColor: 0xffe0b5, nightColor: 0x9f825c });

  for (let i = 1; i <= 2; i++) {
    const wagon = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 3.6), wagonMaterial);
    wagon.position.set(-i * 2.8, 0.7, 0);
    trainGroup.add(wagon);
  }

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x38435f,
    roughness: 0.7,
    metalness: 0.3,
  });

  const wheels = [];
  for (let i = -1; i <= 1; i++) {
    for (let side of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(i * 1.9, 0.3, side);
      trainGroup.add(wheel);
      wheels.push(wheel);
    }
  }
  state.trainWheels = wheels;

  rootGroup.add(trainGroup);
  state.trainGroup = trainGroup;
}

function setActivePiece(type) {
  if (state.activePieceType === type && state.ghost) {
    return;
  }
  state.activePieceType = type;
  pieceButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.piece === type);
  });
  ensureGhost(type);
  if (state.ghost) {
    state.ghost.rotation.set(0, 0, 0);
    updateGhostTransform();
  }
}

function ensureGhost(type) {
  if (!type) {
    if (state.ghost) {
      scene.remove(state.ghost);
      state.ghost = null;
    }
    return;
  }
  if (state.ghost) {
    scene.remove(state.ghost);
    state.ghost = null;
  }
  const { group } = createPiece(type, { ghost: true });
  group.visible = false;
  scene.add(group);
  state.ghost = group;
  state.ghostType = type;
}

function createPiece(type, { ghost = false } = {}) {
  // TODO: replace with GLB modular track pieces
  const group = new THREE.Group();
  group.userData.type = type;
  let localPath = [];
  const materials = getTrackMaterials(ghost);

  if (type === 'straight') {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 6), materials.base());
    sleeper.position.y = 0.15;
    group.add(sleeper);

    const railGeo = new THREE.BoxGeometry(0.18, 0.3, 6.2);
    const railLeft = new THREE.Mesh(railGeo, materials.rail());
    railLeft.position.set(-0.55, 0.5, 0);
    const railRight = railLeft.clone();
    railRight.position.x = 0.55;
    group.add(railLeft, railRight);

    localPath = [
      new THREE.Vector3(0, 0, -3),
      new THREE.Vector3(0, 0, 3),
    ];
  } else if (type === 'curve') {
    const radius = 4;
    const segments = 24;
    localPath = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * Math.PI * 0.5;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius;
      localPath.push(new THREE.Vector3(x, 0, z));
    }
    const curvePath = new THREE.CatmullRomCurve3(localPath);
    const baseTube = new THREE.Mesh(new THREE.TubeGeometry(curvePath, 64, 0.35, 16, false), materials.base());
    baseTube.position.y = 0.1;
    group.add(baseTube);

    const outerScale = (radius + 0.45) / radius;
    const innerScale = (radius - 0.45) / radius;
    const outerCurve = new THREE.CatmullRomCurve3(localPath.map((p) => p.clone().multiplyScalar(outerScale)));
    const innerCurve = new THREE.CatmullRomCurve3(localPath.map((p) => p.clone().multiplyScalar(innerScale)));
    const outerRail = new THREE.Mesh(new THREE.TubeGeometry(outerCurve, 64, 0.1, 12, false), materials.rail());
    const innerRail = new THREE.Mesh(new THREE.TubeGeometry(innerCurve, 64, 0.1, 12, false), materials.rail());
    outerRail.position.y = 0.25;
    innerRail.position.y = 0.25;
    group.add(outerRail, innerRail);
  } else if (type === 'slope') {
    const slopeGeo = new THREE.BoxGeometry(1.8, 0.3, 6, 1, 1, 4);
    const pos = slopeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const t = (z + 3) / 6;
      const lift = t * 2;
      pos.setY(i, pos.getY(i) + lift);
    }
    slopeGeo.computeVertexNormals();
    const ramp = new THREE.Mesh(slopeGeo, materials.base());
    ramp.position.y = 0.1;
    group.add(ramp);

    const railGeo = new THREE.BoxGeometry(0.18, 0.2, 6.2, 1, 1, 4);
    const railPos = railGeo.attributes.position;
    const lengthHalf = 3.1;
    for (let i = 0; i < railPos.count; i++) {
      const z = railPos.getZ(i);
      const t = (z + lengthHalf) / (lengthHalf * 2);
      railPos.setY(i, railPos.getY(i) + t * 2);
    }
    railGeo.computeVertexNormals();
    const railLeft = new THREE.Mesh(railGeo, materials.rail());
    const railRight = railLeft.clone();
    railLeft.position.set(-0.6, 0.35, 0);
    railRight.position.set(0.6, 0.35, 0);
    group.add(railLeft, railRight);

    localPath = [
      new THREE.Vector3(0, 0, -3),
      new THREE.Vector3(0, 2, 3),
    ];
  } else if (type === 'loop') {
    const loopRadius = 3;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(loopRadius, 0.28, 16, 64), materials.rail());
    torus.rotation.y = Math.PI / 2;
    group.add(torus);

    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(loopRadius + 0.6, 0.18, 12, 48), materials.base());
    baseRing.rotation.y = Math.PI / 2;
    baseRing.scale.set(1, 1, 0.22);
    baseRing.position.y = -0.4;
    group.add(baseRing);

    localPath = [];
    const segments = 24;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const x = 0;
      const y = Math.sin(t) * loopRadius;
      const z = Math.cos(t) * loopRadius;
      localPath.push(new THREE.Vector3(x, y, z));
    }
  }

  group.userData.localPath = localPath;

  if (!ghost) {
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }

  return { group, localPath };
}

function getTrackMaterials(ghost) {
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0xf6c8da,
    roughness: 0.55,
    metalness: 0.18,
  });
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.5,
  });

  const baseNight = 0x8f6473;
  const railNight = 0xbfd3ff;

  if (ghost) {
    const ghostBase = () => new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      emissive: new THREE.Color(0x718dff),
      emissiveIntensity: 0.5,
      roughness: 0.45,
      metalness: 0.1,
    });
    return {
      base: ghostBase,
      rail: ghostBase,
    };
  }

  return {
    base: () => registerMaterial(baseMaterial.clone(), { dayColor: 0xf6c8da, nightColor: baseNight }),
    rail: () => registerMaterial(railMaterial.clone(), { dayColor: 0xffffff, nightColor: railNight }),
  };
}

function registerMaterial(material, options = {}) {
  const entry = {
    material,
    dayColor: options.dayColor !== undefined ? new THREE.Color(options.dayColor) : material.color.clone(),
    nightColor: options.nightColor !== undefined ? new THREE.Color(options.nightColor) : material.color.clone().multiplyScalar(0.5),
    dayEmissive: options.dayEmissive !== undefined ? new THREE.Color(options.dayEmissive) : material.emissive.clone(),
    nightEmissive: options.nightEmissive !== undefined ? new THREE.Color(options.nightEmissive) : material.emissive.clone().multiplyScalar(0.4),
  };
  material.userData = material.userData || {};
  material.userData.lightingEntry = entry;
  state.adjustableMaterials.push(entry);
  return material;
}

function unregisterMaterial(material) {
  if (!material) return;
  const entry = material.userData && material.userData.lightingEntry;
  if (!entry) return;
  const index = state.adjustableMaterials.indexOf(entry);
  if (index >= 0) {
    state.adjustableMaterials.splice(index, 1);
  }
  delete material.userData.lightingEntry;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerMove(event) {
  updatePointerFromEvent(event);
  if (state.pointerDown) {
    const dx = event.clientX - state.pointerDownPosition.x;
    const dy = event.clientY - state.pointerDownPosition.y;
    if (Math.sqrt(dx * dx + dy * dy) > 12) {
      state.pointerMoved = true;
      if (state.longPressTimeout) {
        clearTimeout(state.longPressTimeout);
        state.longPressTimeout = null;
      }
    }
  }
  updateGhostTransform();
}

function onPointerDown(event) {
  updatePointerFromEvent(event);
  state.pointerDown = true;
  state.pointerMoved = false;
  state.pointerDownPosition.set(event.clientX, event.clientY);
  state.longPressTriggered = false;

  if (event.pointerType === 'touch' && state.mode === 'build' && state.activePieceType) {
    state.longPressTimeout = window.setTimeout(() => {
      rotateGhost();
      state.longPressTriggered = true;
      showToast('Rotasi +15°');
    }, 600);
  }
}

function onPointerUp(event) {
  if (state.longPressTimeout) {
    clearTimeout(state.longPressTimeout);
    state.longPressTimeout = null;
  }

  if (event.pointerType === 'touch' && !state.pointerMoved && !state.longPressTriggered) {
    if (state.deleteMode) {
      attemptDelete(event);
    } else {
      tryPlacePiece();
    }
  }

  state.pointerDown = false;
  state.pointerMoved = false;
}

function onPointerCancel() {
  if (state.longPressTimeout) {
    clearTimeout(state.longPressTimeout);
    state.longPressTimeout = null;
  }
  state.pointerDown = false;
  state.pointerMoved = false;
}

function onCanvasClick(event) {
  if (event.pointerType === 'touch') return;
  updatePointerFromEvent(event);
  if (state.mode !== 'build') {
    if (state.deleteMode) {
      attemptDelete(event);
    }
    return;
  }

  if (state.deleteMode) {
    attemptDelete(event);
    return;
  }

  tryPlacePiece();
}

function onKeyDown(event) {
  if (event.repeat) return;
  if (event.key === 'r' || event.key === 'R') {
    if (state.mode === 'build' && state.activePieceType) {
      rotateGhost();
    }
  }
  if (event.key === 'Escape') {
    if (state.mode === 'build') {
      if (state.activePieceType) {
        ensureGhost(null);
        state.activePieceType = null;
        pieceButtons.forEach((button) => button.classList.remove('active'));
        showToast('Ghost piece dibatalkan.');
      }
    } else if (state.mode === 'play') {
      returnToBuildMode();
      showToast('Kembali ke Build mode.');
    }
  }
}

function rotateGhost() {
  if (!state.ghost || state.mode !== 'build') return;
  state.ghost.rotation.y += state.ghostRotationStep;
}

function updatePointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateGhostTransform() {
  if (!state.ghost || !state.activePieceType || state.mode !== 'build') {
    if (state.ghost) state.ghost.visible = false;
    return;
  }

  state.raycaster.setFromCamera(state.pointerNDC, camera);
  const intersects = state.raycaster.intersectObjects(state.placementTargets, false);
  if (intersects.length === 0) {
    state.ghost.visible = false;
    return;
  }

  const point = intersects[0].point;
  const snapped = snapToGrid(point, 1);
  state.ghost.position.copy(snapped);
  state.ghost.visible = true;
}

function snapToGrid(vector3, grid = 1) {
  const snapped = vector3.clone();
  snapped.x = Math.round(snapped.x / grid) * grid;
  snapped.y = Math.max(0, Math.round(snapped.y / grid) * grid);
  snapped.z = Math.round(snapped.z / grid) * grid;
  return snapped;
}

function tryPlacePiece() {
  if (!state.ghost || !state.ghost.visible || !state.activePieceType) {
    showToast('Pilih potongan rel dari toolbar.');
    return;
  }

  const { group } = createPiece(state.activePieceType, { ghost: false });
  group.position.copy(state.ghost.position);
  group.rotation.copy(state.ghost.rotation);
  group.updateMatrixWorld(true);

  const bounding = new THREE.Box3().setFromObject(group);
  for (const piece of state.trackPieces) {
    if (bounding.intersectsBox(piece.boundingBox)) {
      showToast('Rel bertabrakan. Atur ulang posisinya.');
      return;
    }
  }

  pieceGroup.add(group);
  const pieceInfo = {
    mesh: group,
    type: state.activePieceType,
    boundingBox: bounding,
    localPath: group.userData.localPath.map((p) => p.clone()),
  };
  state.trackPieces.push(pieceInfo);
  flashPlacement(group);
}

function undoPiece() {
  const last = state.trackPieces.pop();
  if (!last) {
    showToast('Belum ada rel untuk di-undo.');
    return;
  }
  pieceGroup.remove(last.mesh);
  disposePieceMesh(last.mesh);
  showToast('Rel terakhir dihapus.');
}

function attemptDelete(event) {
  updatePointerFromEvent(event);
  state.raycaster.setFromCamera(state.pointerNDC, camera);
  const intersects = state.raycaster.intersectObjects(pieceGroup.children, true);
  if (!intersects.length) return;
  const top = findTopPiece(intersects[0].object);
  const index = state.trackPieces.findIndex((piece) => piece.mesh === top);
  if (index >= 0) {
    pieceGroup.remove(top);
    state.trackPieces.splice(index, 1);
    disposePieceMesh(top);
    showToast('Rel dihapus.');
  }
}

function findTopPiece(object) {
  let current = object;
  while (current.parent && current.parent !== pieceGroup) {
    current = current.parent;
  }
  return current;
}

function flashPlacement(group) {
  const initial = group.scale.clone();
  group.scale.multiplyScalar(1.08);
  setTimeout(() => {
    group.scale.copy(initial);
  }, 120);
}

function disposePieceMesh(mesh) {
  mesh.traverse((child) => {
    if (child.isMesh) {
      unregisterMaterial(child.material);
      child.material && child.material.dispose?.();
      child.geometry && child.geometry.dispose?.();
    }
  });
}

function startPlayMode() {
  if (!state.trackPieces.length) {
    showToast('Bangun rel dulu.');
    return;
  }

  const curve = buildTrackCurve();
  if (!curve) {
    showToast('Lintasan belum valid.');
    return;
  }

  state.trackCurve = curve;
  state.trackLength = curve.getLength();
  state.trackProgress = 0;
  state.mode = 'play';
  state.playing = true;
  modeLabel.textContent = 'Mode: Play';
  btnPlay.textContent = '⏸';
  btnPlay.setAttribute('aria-label', 'Pause');
  toggleToolbarDisabled(true);
  if (state.deleteMode) {
    state.deleteMode = false;
    document.body.classList.remove('delete-mode');
    btnDelete.classList.remove('active');
  }
  if (state.ghost) {
    state.ghost.visible = false;
  }
  showToast('Kereta berjalan!');
}

function toggleToolbarDisabled(disabled) {
  pieceButtons.forEach((button) => {
    button.disabled = disabled;
  });
  btnUndo.disabled = disabled;
  btnDelete.disabled = disabled;
}

function togglePlayPause() {
  if (!state.trackCurve) {
    startPlayMode();
    return;
  }
  state.playing = !state.playing;
  btnPlay.textContent = state.playing ? '⏸' : '▶️';
  btnPlay.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
  showToast(state.playing ? 'Kereta berjalan.' : 'Kereta dijeda.');
}

function returnToBuildMode() {
  state.mode = 'build';
  state.playing = false;
  state.trackCurve = null;
  modeLabel.textContent = 'Mode: Build';
  btnPlay.textContent = '▶️';
  btnPlay.setAttribute('aria-label', 'Play');
  toggleToolbarDisabled(false);
  if (state.activePieceType) {
    ensureGhost(state.activePieceType);
    updateGhostTransform();
  }
}

function buildTrackCurve() {
  const points = [];
  for (const piece of state.trackPieces) {
    piece.mesh.updateMatrixWorld(true);
    const matrix = piece.mesh.matrixWorld;
    piece.boundingBox = new THREE.Box3().setFromObject(piece.mesh);
    for (const localPoint of piece.localPath) {
      const worldPoint = localPoint.clone().applyMatrix4(matrix);
      if (points.length === 0 || points[points.length - 1].distanceToSquared(worldPoint) > 0.01) {
        points.push(worldPoint);
      }
    }
  }

  if (points.length < 2) return null;
  const closed = points[0].distanceTo(points[points.length - 1]) < 0.6;
  return new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.2);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  controls.update();

  updateEnvironment(delta);
  updateLighting(delta);
  updateTrain(delta);

  if (state.waterfallMaterial) {
    const map = state.waterfallMaterial.map;
    if (map) {
      map.offset.y -= delta * 0.6;
    }
  }

  renderer.render(scene, camera);
}

function updateEnvironment(delta) {
  rootGroup.children.forEach((child) => {
    if (child === pieceGroup || child === state.trainGroup) return;
    if (child.userData && child.userData.origin) {
      const origin = child.userData.origin;
      const offset = child.userData.offset || 0;
      child.position.x = origin.x + Math.sin(clock.elapsedTime * 0.3 + offset) * 2.4;
      child.position.z = origin.z + Math.cos(clock.elapsedTime * 0.26 + offset) * 2.4;
    }
  });

  if (state.balloonGroup) {
    const t = clock.elapsedTime;
    state.balloonGroup.position.y = 14 + Math.sin(t * 0.6) * 1.2;
    state.balloonGroup.rotation.y += delta * 0.2;
  }
}

function updateTrain(delta) {
  if (!state.trainGroup) return;

  if (state.mode === 'play' && state.trackCurve) {
    if (state.playing) {
      state.trackProgress = (state.trackProgress + (state.trainSpeed * delta) / Math.max(0.001, state.trackLength)) % 1;
    }
    const point = state.trackCurve.getPointAt(state.trackProgress);
    const tangent = state.trackCurve.getTangentAt(state.trackProgress).normalize();
    state.trainGroup.position.copy(point);

    const forward = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(forward, tangent);
    state.trainGroup.quaternion.slerp(quaternion, 0.3);

    const wheelRotation = (state.trainSpeed * delta) / 0.55;
    state.trainWheels.forEach((wheel) => {
      wheel.rotation.x += wheelRotation;
    });
  } else {
    state.trainGroup.position.lerp(new THREE.Vector3(0, 0.9, 0), 0.05);
    state.trainGroup.quaternion.slerp(new THREE.Quaternion(), 0.05);
  }
}

function updateLighting(delta) {
  const { lighting } = state;
  if (!lighting.base) return;
  if (lighting.progress >= 1) return;

  lighting.progress = Math.min(1, lighting.progress + delta / lighting.duration);
  const t = lighting.progress;
  const base = lighting.base;
  const start = lighting.start;
  const target = lighting.target;

  base.hemi.color.copy(start.hemiSky).lerp(target.hemiSky, t);
  base.hemi.groundColor.copy(start.hemiGround).lerp(target.hemiGround, t);
  base.hemi.intensity = THREE.MathUtils.lerp(start.hemiIntensity, target.hemiIntensity, t);
  base.dir.color.copy(start.dirColor).lerp(target.dirColor, t);
  base.dir.intensity = THREE.MathUtils.lerp(start.dirIntensity, target.dirIntensity, t);
  scene.background.copy(start.background).lerp(target.background, t);
  scene.fog.color.copy(start.background).lerp(target.background, t);
  if (scene.fog) {
    scene.fog.near = THREE.MathUtils.lerp(start.fog.near, target.fog.near, t);
    scene.fog.far = THREE.MathUtils.lerp(start.fog.far, target.fog.far, t);
  }
  renderer.toneMappingExposure = THREE.MathUtils.lerp(start.exposure, target.exposure, t);

  state.adjustableMaterials.forEach((entry) => {
    const { material, dayColor, nightColor, dayEmissive, nightEmissive } = entry;
    material.color.copy(dayColor).lerp(nightColor, lighting.mode === 'day' ? 1 - t : t);
    material.emissive.copy(dayEmissive).lerp(nightEmissive, lighting.mode === 'day' ? 1 - t : t);
  });
}

function setLightingMode(mode) {
  if (state.lighting.mode === mode) return;
  const targetPreset = createLightingPreset(mode);
  const { hemi, dir } = state.lighting.base;

  state.lighting.start = {
    hemiSky: hemi.color.clone(),
    hemiGround: hemi.groundColor.clone(),
    hemiIntensity: hemi.intensity,
    dirColor: dir.color.clone(),
    dirIntensity: dir.intensity,
    background: scene.background.clone(),
    fog: scene.fog ? scene.fog.clone() : new THREE.Fog(scene.background.clone(), 80, 240),
    exposure: renderer.toneMappingExposure,
  };
  state.lighting.target = targetPreset;
  state.lighting.mode = mode;
  state.lighting.progress = 0;
  showToast(mode === 'day' ? 'Mode siang aktif.' : 'Mode malam aktif.');
}

function showToast(text, duration = 2200) {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.add('visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toastEl.classList.remove('visible');
  }, duration);
}

// expose debug helper
window.__world = {
  scene,
  trackPieces: state.trackPieces,
  exportJSON() {
    return JSON.stringify(state.trackPieces.map((piece) => ({
      type: piece.type,
      position: piece.mesh.position.toArray(),
      rotation: piece.mesh.rotation.toArray(),
    })), null, 2);
  },
};
