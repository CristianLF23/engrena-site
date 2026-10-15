import * as THREE from '../vendor/three/three.module.min.js';

const COLORS = {
  steel: 0x222b32,
  blue: 0x1261f4,
  silver: 0xb9c4cc,
  dark: 0x071018,
};

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

function makeGearGeometry(three) {
  const teeth = 18;
  const outerRadius = 1.48;
  const rootRadius = 1.18;
  const boreRadius = 0.28;
  const shape = new three.Shape();
  const points = teeth * 4;
  for (let i = 0; i < points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const radius = [rootRadius, outerRadius, outerRadius, rootRadius][i % 4];
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const hole = new three.Path();
  hole.absarc(0, 0, boreRadius, 0, Math.PI * 2, false);
  shape.holes.push(hole);

  return new three.ExtrudeGeometry(shape, {
    depth: 0.78,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.055,
    bevelThickness: 0.055,
    curveSegments: 18,
  });
}

function makePiece(three, material, index, gearGeometry) {
  const group = new three.Group();
  group.name = `mechanism-piece-${index}`;
  group.rotation.y = -0.52 + index * 0.02;
  group.rotation.z = index === 1 ? -0.018 : index === 0 ? 0.028 : 0.02;

  const gear = new three.Mesh(gearGeometry, material);
  gear.castShadow = false;
  gear.receiveShadow = false;
  group.add(gear);

  const rimMaterial = material.clone();
  rimMaterial.roughness = 0.24;
  rimMaterial.metalness = 0.94;
  const rim = new three.Mesh(new three.TorusGeometry(0.34, 0.025, 6, 40), rimMaterial);
  rim.position.z = 0.81;
  group.add(rim);
  const faceLine = new three.Mesh(new three.TorusGeometry(1.06, 0.014, 5, 48), rimMaterial);
  faceLine.position.z = 0.81;
  group.add(faceLine);

  group.userData = { material, rimMaterial, restX: [-3.45, 0, 3.45][index], joinedX: [-3.05, 0, 3.05][index] };
  return group;
}

export async function initMechanism(stage) {
  if (!stage) throw new Error('mechanism-stage não encontrado');

  const fallback = stage.querySelector('.mechanism-image');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection?.saveData);
  let canvas = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let animationFrame = 0;
  let observer = null;
  let resizeObserver = null;
  let visible = true;
  let disposed = false;
  let targetProgress = reduced || saveData ? 1 : 0;
  let currentProgress = targetProgress;
  let focusIndex = null;
  let cleanup = () => {};
  const pointer = { x: 0, y: 0 };
  const pieces = [];
  const disposables = [];

  const stats = {
    renderer: 'three-webgl',
    vertices: 0,
    pieces: 3,
    dpr: 1,
    running: false,
    fallback: false,
  };

  const stop = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    stats.running = false;
  };

  const fail = (error) => {
    stop();
    cleanup();
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    stage.classList.remove('scene-ready');
    stats.fallback = true;
    throw error instanceof Error ? error : new Error('Falha ao iniciar a cena mecânica');
  };

  if (reduced || saveData) {
    stats.fallback = true;
    return {
      setProgress: (progress) => { targetProgress = clamp01(progress); currentProgress = targetProgress; },
      setFocus: () => {},
      dispose: () => {},
      stats,
    };
  }

  try {
    canvas = document.createElement('canvas');
    canvas.className = 'mechanism-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas);

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.innerWidth > 720, powerPreference: 'high-performance' });
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1 : 1.5);
    stats.dpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-6, 6, 1.7, -1.7, 0.1, 100);
    camera.position.set(1.5, 1.2, 12);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xdbe8f1, 0x10151b, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 4.2);
    key.position.set(4, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x4d8dff, 2.4);
    rim.position.set(-5, 1, -4);
    scene.add(rim);
    const fill = new THREE.PointLight(0x00cfff, 13, 14, 2);
    fill.position.set(0, -2, 4);
    scene.add(fill);

    // A tiny authored lightbox provides metal reflections without an external HDR.
    const faces = Array.from({ length: 6 }, (_, index) => {
      const face = document.createElement('canvas'); face.width = 128; face.height = 128;
      const context = face.getContext('2d');
      context.fillStyle = index === 3 ? '#2b333b' : '#8b969e'; context.fillRect(0, 0, 128, 128);
      context.fillStyle = '#f4f8fc'; context.fillRect(index % 2 ? 13 : 72, 0, 22, 128);
      context.fillStyle = '#37424d'; context.fillRect(0, 90, 128, 38);
      return face;
    });
    const environment = new THREE.CubeTexture(faces);
    environment.colorSpace = THREE.SRGBColorSpace;
    environment.needsUpdate = true;
    scene.environment = environment;
    disposables.push(environment);

    const gearGeometry = makeGearGeometry(THREE);
    const materials = [
      new THREE.MeshStandardMaterial({ color: COLORS.steel, metalness: 0.95, roughness: 0.31 }),
      new THREE.MeshStandardMaterial({ color: COLORS.blue, metalness: 0.84, roughness: 0.24, emissive: 0x061a52, emissiveIntensity: 0.12 }),
      new THREE.MeshStandardMaterial({ color: COLORS.silver, metalness: 0.98, roughness: 0.22 }),
    ];
    materials.forEach((material) => disposables.push(material));
    disposables.push(gearGeometry);
    materials.forEach((material, index) => {
      const piece = makePiece(THREE, material, index, gearGeometry);
      pieces.push(piece);
      scene.add(piece);
    });
    stats.vertices = 0;
    pieces.forEach(piece => piece.traverse(object => { if (object.geometry) stats.vertices += object.geometry.attributes.position.count; }));

    const resize = () => {
      if (!renderer || !camera) return;
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      const aspect = width / height;
      const viewHeight = aspect < 2.4 ? 9.2 / aspect : 3.55;
      camera.left = -viewHeight * aspect / 2;
      camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (camera && pieces.length) requestAnimationFrame(() => { if (!disposed) renderer.render(scene, camera); });
    };
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    const setVisible = (entries) => { visible = entries[0]?.isIntersecting ?? true; if (!visible) stop(); else schedule(); };
    observer = new IntersectionObserver(setVisible, { threshold: 0.01 });
    observer.observe(stage);

    const onVisibility = () => { if (document.hidden) stop(); else schedule(); };
    const onContextLost = (event) => {
      event.preventDefault(); stop(); cleanup();
      stage.classList.remove('scene-ready'); stats.fallback = true;
      canvas?.remove();
      stage.dispatchEvent(new CustomEvent('mechanism:fallback'));
    };
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    const onPointer = event => {
      const rect = stage.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - .5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - .5) * 2;
      schedule();
    };
    const onPointerLeave = () => { pointer.x = 0; pointer.y = 0; schedule(); };
    stage.addEventListener('pointermove', onPointer);
    stage.addEventListener('pointerleave', onPointerLeave);
    disposables.push({ dispose: () => { stage.removeEventListener('pointermove', onPointer); stage.removeEventListener('pointerleave', onPointerLeave); } });
    disposables.push({ dispose: () => document.removeEventListener('visibilitychange', onVisibility) });
    disposables.push({ dispose: () => canvas?.removeEventListener('webglcontextlost', onContextLost) });

    const render = () => {
      animationFrame = 0;
      if (disposed || !visible || document.hidden) return;
      currentProgress += (targetProgress - currentProgress) * 0.085;
      if (Math.abs(targetProgress - currentProgress) < 0.0005) currentProgress = targetProgress;
      pieces.forEach((piece, index) => {
        const x = THREE.MathUtils.lerp(piece.userData.restX, piece.userData.joinedX, currentProgress);
        piece.position.x = x;
        piece.position.z = Math.sin((index + 1) * 1.5 + currentProgress * Math.PI) * 0.08;
        piece.rotation.y = -0.52 + index * 0.02 + pointer.x * .08 + currentProgress * .07;
        piece.rotation.x = pointer.y * .07;
        const active = focusIndex === null || focusIndex === index;
        piece.scale.setScalar(active ? 1 : 0.94);
        piece.userData.material.emissiveIntensity = focusIndex === index ? 0.32 : index === 1 ? 0.12 : 0;
      });
      camera.position.x = 1.5 + (currentProgress - 0.5) * 0.18;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      if (Math.abs(targetProgress - currentProgress) > 0.0005) schedule();
      else stats.running = false;
    };
    function schedule() {
      if (!animationFrame && !disposed && visible && !document.hidden) {
        animationFrame = requestAnimationFrame(render);
        stats.running = true;
      }
    }

    const controller = {
      setProgress(progress) { targetProgress = clamp01(progress); schedule(); },
      setFocus(indexOrNull) { focusIndex = Number.isInteger(indexOrNull) && indexOrNull >= 0 && indexOrNull < 3 ? indexOrNull : null; schedule(); },
      dispose() {
        if (disposed) return;
        disposed = true;
        stop();
        observer?.disconnect();
        resizeObserver?.disconnect();
        const geometries = new Set();
        const materialsToDispose = new Set();
        pieces.forEach((piece) => piece.traverse((object) => {
          if (object.geometry) geometries.add(object.geometry);
          if (object.material) {
            const list = Array.isArray(object.material) ? object.material : [object.material];
            list.forEach((material) => materialsToDispose.add(material));
          }
        }));
        geometries.forEach((geometry) => geometry.dispose());
        materialsToDispose.forEach((material) => material.dispose());
        disposables.forEach((resource) => resource?.dispose?.());
        renderer?.dispose();
        renderer?.forceContextLoss?.();
        if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
        stage.classList.remove('scene-ready');
        stats.running = false;
      },
      stats,
    };
    cleanup = () => controller.dispose();
    renderer.render(scene, camera);
    stage.classList.add('scene-ready');
    schedule();
    return controller;
  } catch (error) {
    return fail(error);
  }
}
