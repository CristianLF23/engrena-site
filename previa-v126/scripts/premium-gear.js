import * as THREE from '../vendor/three/three.module.min.js';
import { createGearAssembly } from './gear-assembly.js';

/*
 * ENGRENA premium background gear.
 * The scene is intentionally a module without an animation loop: the page owns
 * scroll cadence and calls setRotation. All meshes are procedural and original.
 */
const TAU = Math.PI * 2;
const BLUE = 0x0b78e8;
const CHROME = 0xbac5cc;
const EDGE = 0x56636d;
let brushingTexture;

function addRadialWindows(shape, windows = 8, windowInner = 0.84, windowOuter = 2.08, halfWidth = 0.34) {
  for (let i = 0; i < windows; i += 1) {
    const center = i * TAU / windows + Math.PI / windows;
    const path = new THREE.Path();
    const points = [
      [windowInner, center + halfWidth], [windowOuter, center + halfWidth * 0.72],
      [windowOuter, center - halfWidth * 0.72], [windowInner, center - halfWidth],
    ];
    points.forEach(([radius, offset], index) => {
      const x = Math.cos(offset) * radius;
      const y = Math.sin(offset) * radius;
      if (index === 0) path.moveTo(x, y); else path.lineTo(x, y);
    });
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

function gearShape(teeth = 24, root = 2.32, tip = 2.77, bore = 0.68) {
  const shape = new THREE.Shape();
  const step = TAU / teeth;
  const pitch = 2.535, base = pitch * Math.cos(Math.PI / 9);
  const involute = radius => { const angle = Math.acos(base / radius); return Math.tan(angle) - angle; };
  const halfAtPitch = Math.PI / (2 * teeth), pitchInvolute = involute(pitch);
  const flank = [base, (base + tip) / 2, tip].map(radius => [halfAtPitch + pitchInvolute - involute(radius), radius]);
  for (let i = 0; i < teeth; i += 1) {
    const center = i * step;
    const profile = [
      [-.5 * step, root], [-.36 * step, root],
      ...flank.map(([angle, radius]) => [-angle, radius]), [0, tip],
      ...[...flank].reverse(), [.36 * step, root], [.5 * step, root],
    ];
    profile.forEach(([offset, radius], j) => {
      const angle = center + offset;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0 && j === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore, 0, TAU, true);
  shape.holes.push(hole);
  return addRadialWindows(shape);
}

function makeGearBody() {
  const geometry = new THREE.ExtrudeGeometry(gearShape(), {
    depth: 0.36,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: 0.045,
    bevelThickness: 0.045,
    curveSegments: 56,
    steps: 1,
  });
  geometry.translate(0, 0, -0.18);
  return geometry;
}

function getBrushingTexture() {
  if (brushingTexture) return brushingTexture;
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(canvas.width, canvas.height);
  let seed = 7141;
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = 0.5 + Math.sin(x * 0.78 + y * 0.03) * 0.17 + (seed / 4294967296 - 0.5) * 0.08;
    const value = Math.round(255 * Math.max(0.12, Math.min(0.9, grain)));
    const i = (y * canvas.width + x) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value; image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  brushingTexture = new THREE.CanvasTexture(canvas);
  brushingTexture.wrapS = THREE.RepeatWrapping;
  brushingTexture.wrapT = THREE.RepeatWrapping;
  brushingTexture.repeat.set(3.5, 1);
  brushingTexture.colorSpace = THREE.NoColorSpace;
  return brushingTexture;
}

function metal(color, roughness = 0.23, metalness = 0.94, brushed = false) {
  const material = new THREE.MeshPhysicalMaterial({
    color, metalness, roughness, envMapIntensity: 1.65, anisotropy: brushed ? .72 : 0,
    clearcoat: 0.28, clearcoatRoughness: 0.18,
  });
  if (brushed) material.roughnessMap = getBrushingTexture();
  return material;
}

function ring(outer, inner, depth, material, segments = 96) {
  // Smooth, subtly radiused turned faces catch the studio reflections.
  const bevel = Math.min(.035, depth * .22, (outer - inner) * .16);
  const front = depth / 2, back = -depth / 2, width = outer - inner;
  const profile = [
    [inner, back + bevel], [inner, front - bevel], [inner + bevel * .3, front - bevel * .3],
    [inner + bevel, front], [inner + width * .30, front + .018],
    [inner + width * .70, front + .018], [outer - bevel, front],
    [outer - bevel * .3, front - bevel * .3], [outer, front - bevel],
    [outer, back + bevel], [outer - bevel, back], [inner + bevel, back], [inner, back + bevel]
  ];
  const geometry = new THREE.LatheGeometry(profile.map(([r,z]) => new THREE.Vector2(r,z)), segments);
  geometry.rotateX(Math.PI / 2);
  return new THREE.Mesh(geometry, material);
}

// A machined face with real radial windows. The holes are part of the
// extrusion, so the recessed layer behind them remains visible as the gear
// rotates instead of relying on dark placeholder meshes.
function openworkPlate(outer, inner, depth, material, windows = 8, windowInner = 1.22, windowOuter = 1.68) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, TAU, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, inner, 0, TAU, true);
  shape.holes.push(bore);
  addRadialWindows(shape, windows, windowInner, windowOuter);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.022,
    bevelThickness: 0.016,
    curveSegments: 40,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  // Circumferential U coordinates keep the brushed grain tangent to the
  // machined face instead of producing a flat, untextured cap.
  const positions = geometry.attributes.position;
  const uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    let u = Math.atan2(y, x) / TAU;
    if (u < 0) u += 1;
    uv[i * 2] = u;
    uv[i * 2 + 1] = Math.min(1, Math.hypot(x, y) / outer);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return new THREE.Mesh(geometry, material);
}

function torus(radius, tube, material, z, radialSegments = 96) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, radialSegments), material);
  mesh.position.z = z;
  return mesh;
}

function screw(material, z) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12), material);
  body.rotation.x = Math.PI / 2;
  body.position.z = z;
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.014, 6), metal(0x101a21, 0.3, 0.84));
  socket.rotation.x = Math.PI / 2;
  socket.position.z = z + 0.046;
  group.add(body, socket);
  return group;
}

function makeEnvironment(renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#d6dbe1'); gradient.addColorStop(0.32, '#424f5d');
  gradient.addColorStop(0.55, '#202a36'); gradient.addColorStop(1, '#111923');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 256);
  [[38, 4, 34, 210], [168, 22, 70, 190], [312, 8, 11, 220], [414, 20, 45, 180], [481, 34, 25, 165]].forEach(([x, y, w, h]) => {
    const light = ctx.createLinearGradient(x - 18, 0, x + w + 18, 0);
    light.addColorStop(0, 'rgba(255,255,255,0)'); light.addColorStop(0.23, '#fff');
    light.addColorStop(0.77, '#fff'); light.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = light; ctx.fillRect(x - 18, y, w + 36, h);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(texture);
  generator.dispose(); texture.dispose();
  return { texture: target.texture, target };
}

export async function initPremiumGear(container) {
  if (!container || typeof document === 'undefined') return { ready: false, stats: { ready: false }, dispose() {} };
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' });
  } catch (error) {
    return { ready: false, stats: { ready: false, error: String(error?.message || error) }, dispose() {} };
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const environment = makeEnvironment(renderer);
  scene.environment = environment.texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0.12, 0.36, 14.0);
  camera.lookAt(0, 0, 0);
  const world = new THREE.Group();
  world.rotation.y = -0.59;
  world.rotation.x = 0.13;
  world.rotation.z = -0.045;
  world.scale.setScalar(0.96);
  scene.add(world);

  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x101b24, 1.0));
  const key = new THREE.DirectionalLight(0xf5fbff, 1.9);
  key.position.set(-3.5, 5.5, 7.5); scene.add(key);
  const blueFill = new THREE.PointLight(BLUE, 7.2, 12, 2);
  blueFill.position.set(2.5, -1.3, 4); scene.add(blueFill);

  const rotor = createGearAssembly({ detail: 'full', index: 0 });
  world.add(rotor);

  let angle = 0;
  let tiltX = 0;
  let tiltY = 0;
  let renderFrames = 0;
  let disposed = false;
  let contextLost = false;
  let observer;
  const render = () => {
    if (disposed) return;
    renderer.render(scene, camera);
    renderFrames += 1;
  };
  const resize = () => {
    if (disposed) return;
    const width = Math.max(1, container.clientWidth || 700);
    const height = Math.max(1, container.clientHeight || width);
    const dpr = Math.min(window.devicePixelRatio || 1, width < 720 ? 1 : 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix(); render();
  };
  observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(container);
  const onContextLost = event => {
    event.preventDefault(); contextLost = true;
    container.dispatchEvent(new CustomEvent('premiumgear:lost', { detail: { reason: 'webglcontextlost' } }));
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost, { passive: false });
  resize();

  const vertexCount = () => {
    let count = 0;
    scene.traverse(object => {
      if ((object.isMesh || object.isInstancedMesh) && object.geometry?.attributes?.position) {
        count += object.geometry.attributes.position.count * (object.isInstancedMesh ? object.count : 1);
      }
    });
    return count;
  };
  const applyPose = (nextAngle, nextTiltX = tiltX, nextTiltY = tiltY) => {
    angle = Number.isFinite(nextAngle) ? nextAngle : angle;
    tiltX = Number.isFinite(nextTiltX) ? nextTiltX : tiltX;
    tiltY = Number.isFinite(nextTiltY) ? nextTiltY : tiltY;
    rotor.rotation.z = angle;
    world.rotation.x = 0.13 + tiltX;
    world.rotation.y = -0.59 + tiltY;
    render();
  };
  const api = {
    setRotation(value) {
      applyPose(value);
    },
    setPose(pose = {}) {
      applyPose(pose.angle, pose.tiltX, pose.tiltY);
    },
    setVisible(value) { renderer.domElement.style.visibility = value ? 'visible' : 'hidden'; },
    render,
    dispose() {
      if (disposed) return; disposed = true;
      observer?.disconnect(); observer = null;
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose());
      });
      environment.target?.dispose?.();
      brushingTexture?.dispose?.(); brushingTexture = null;
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.dispose(); renderer.domElement.remove();
    },
    get stats() {
      return {
        ready: !disposed && !contextLost,
        angle,
        frames: renderFrames,
        vertices: vertexCount(),
        drawcalls: renderer.info?.render?.calls || 0,
        geometries: renderer.info?.memory?.geometries || 0,
        pixelRatio: renderer.getPixelRatio(),
        cutouts: 8,
        blueLayerGap: 0.02,
        minLayerGap: 0.02,
      };
    },
  };
  render();
  return api;
}

export default initPremiumGear;
