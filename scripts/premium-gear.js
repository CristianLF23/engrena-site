import * as THREE from '../vendor/three/three.module.min.js';

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
  return shape;
}

function makeGearBody() {
  const geometry = new THREE.ExtrudeGeometry(gearShape(), {
    depth: 0.68,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 48,
    steps: 1,
  });
  geometry.translate(0, 0, -0.34);
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
  renderer.toneMappingExposure = 1.12;
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

  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x101b24, 1.2));
  const key = new THREE.DirectionalLight(0xf5fbff, 3.2);
  key.position.set(-3.5, 5.5, 7.5); scene.add(key);
  const blueFill = new THREE.PointLight(BLUE, 12, 12, 2);
  blueFill.position.set(2.5, -1.3, 4); scene.add(blueFill);

  const rotor = new THREE.Group();
  world.add(rotor);
  const body = new THREE.Mesh(makeGearBody(), metal(CHROME, 0.18, 0.98, true));
  body.castShadow = false; rotor.add(body);

  // Rear toothed cap and a stepped front flange produce a machined bearing profile.
  const rearRing = ring(2.12, 1.77, 0.18, metal(EDGE, 0.24, 0.93, true));
  rearRing.position.z = -0.47; rotor.add(rearRing);
  const frontPlate = ring(2.19, 1.12, 0.18, metal(CHROME, 0.24, 0.98, true));
  frontPlate.position.z = 0.62; rotor.add(frontPlate);
  // A narrow exposed blue band sits in the depth gap between the toothed body and front flange.
  const sideBlueBand = ring(2.37, 1.86, 0.17, metal(0x1261f4, 0.23, 0.68));
  sideBlueBand.position.z = 0.46; rotor.add(sideBlueBand);
  rotor.add(torus(2.13, 0.055, metal(0xe9f1f5, 0.15, 1), 0.61, 80));
  rotor.add(torus(1.77, 0.042, metal(0x53616c, 0.3, 0.92), 0.61, 80));
  rotor.add(torus(1.18, 0.055, metal(0xeff6f9, 0.16, 1), 0.61, 80));

  const blueOuter = ring(1.61, 1.38, 0.13, metal(BLUE, 0.19, 0.92));
  blueOuter.position.z = 0.48; rotor.add(blueOuter);
  const blueInner = ring(1.30, 0.76, 0.21, metal(0x063a73, 0.25, 0.95));
  blueInner.position.z = 0.45; rotor.add(blueInner);
  const bore = ring(0.88, 0.66, 0.29, metal(0x0a1822, 0.22, 0.96));
  bore.position.z = 0.72; rotor.add(bore);
  const hub = ring(1.08, 0.88, 0.22, metal(CHROME, 0.15, 0.98, true));
  hub.position.z = 0.84; rotor.add(hub);
  rotor.add(torus(0.84, 0.06, metal(0x22a6ff, 0.18, 0.96), 0.86, 72));
  rotor.add(torus(0.71, 0.035, metal(0x8aa6b9, 0.27, 0.93), 0.87, 72));

  // Fine concentric engraving lines, intentionally restrained to avoid visual noise.
  [1.48, 1.55, 1.67, 1.72, 1.91, 2.01].forEach((radius, index) => {
    rotor.add(torus(radius, index % 2 ? 0.012 : 0.018, metal(index % 2 ? 0x53616c : 0xf3f8fb, 0.27, 0.96, true), 0.805 + (index % 2) * 0.012, 72));
  });

  const boltMaterial = metal(0x8996a0, 0.22, 0.98);
  const boltRing = new THREE.Group(); boltRing.position.z = 0.84; rotor.add(boltRing);
  for (let i = 0; i < 10; i += 1) {
    const angle = i * TAU / 10 + Math.PI / 10;
    const bolt = screw(boltMaterial, 0);
    bolt.position.set(Math.cos(angle) * 1.84, Math.sin(angle) * 1.84, 0);
    bolt.rotation.z = angle;
    boltRing.add(bolt);
  }

  const apertureMaterial = metal(0x101a21, 0.32, 0.9);
  const apertureRing = new THREE.Group(); apertureRing.position.z = 0.80; rotor.add(apertureRing);
  for (let i = 0; i < 8; i += 1) {
    const angle = i * TAU / 8 + Math.PI / 8;
    const aperture = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.075, 0.032), apertureMaterial);
    aperture.position.set(Math.cos(angle) * 1.47, Math.sin(angle) * 1.47, 0);
    aperture.rotation.z = angle;
    apertureRing.add(aperture);
  }

  let angle = 0;
  let disposed = false;
  let contextLost = false;
  let observer;
  const render = () => {
    if (disposed) return;
    renderer.render(scene, camera);
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
    scene.traverse(object => { if (object.isMesh && object.geometry?.attributes?.position) count += object.geometry.attributes.position.count; });
    return count;
  };
  const api = {
    setRotation(value) {
      angle = Number.isFinite(value) ? value : angle;
      rotor.rotation.z = angle;
      render();
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
        vertices: vertexCount(),
        drawcalls: renderer.info?.render?.calls || 0,
        geometries: renderer.info?.memory?.geometries || 0,
        pixelRatio: renderer.getPixelRatio(),
      };
    },
  };
  render();
  return api;
}

export default initPremiumGear;
