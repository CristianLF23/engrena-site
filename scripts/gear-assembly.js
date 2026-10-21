import * as THREE from '../vendor/three/three.module.min.js';

const TAU = Math.PI * 2;
const BLUE = 0x0b78e8;
const CHROME = 0xbac5cc;
const EDGE = 0x56636d;

function windows(shape, count = 8, inner = 0.84, outer = 2.08, half = 0.34) {
  for (let i = 0; i < count; i += 1) {
    const center = i * TAU / count + Math.PI / count;
    const path = new THREE.Path();
    [[inner, half], [outer, half * .72], [outer, -half * .72], [inner, -half]].forEach(([radius, offset], index) => {
      const angle = center + offset;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (!index) path.moveTo(x, y); else path.lineTo(x, y);
    });
    path.closePath(); shape.holes.push(path);
  }
  return shape;
}

function toothShape() {
  const shape = new THREE.Shape(); const teeth = 24; const step = TAU / teeth;
  const pitch = 2.535, root = 2.32, tip = 2.77, base = pitch * Math.cos(Math.PI / 9);
  const involute = radius => { const angle = Math.acos(base / radius); return Math.tan(angle) - angle; };
  const half = Math.PI / (2 * teeth), inv = involute(pitch);
  const flank = [base, (base + tip) / 2, tip].map(radius => [half + inv - involute(radius), radius]);
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    const profile = [[-.5 * step, root], [-.36 * step, root], ...flank.map(([a, r]) => [-a, r]), [0, tip], ...[...flank].reverse(), [.36 * step, root], [.5 * step, root]];
    profile.forEach(([offset, radius], index) => { const angle = tooth * step + offset; const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius; if (!tooth && !index) shape.moveTo(x, y); else shape.lineTo(x, y); });
  }
  shape.closePath(); const bore = new THREE.Path(); bore.absarc(0, 0, .68, 0, TAU, true); shape.holes.push(bore);
  return windows(shape);
}

function bodyGeometry(detail) {
  const compact = detail !== 'full';
  const geometry = new THREE.ExtrudeGeometry(toothShape(), { depth: .36, bevelEnabled: true, bevelSegments: compact ? 3 : 5, bevelSize: .04, bevelThickness: .04, curveSegments: compact ? 28 : 56, steps: 1 });
  geometry.translate(0, 0, -.18); return geometry;
}

function plateGeometry(detail) {
  const shape = new THREE.Shape(); shape.absarc(0, 0, 2.19, 0, TAU, false);
  const bore = new THREE.Path(); bore.absarc(0, 0, 1.12, 0, TAU, true); shape.holes.push(bore);
  windows(shape, 8, 1.26, detail === 'full' ? 1.90 : 1.86, detail === 'full' ? .28 : .27);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: true, bevelSegments: detail === 'full' ? 3 : 2, bevelSize: .018, bevelThickness: .014, curveSegments: detail === 'full' ? 40 : 28, steps: 1 });
  geometry.translate(0, 0, -.06); return geometry;
}

function metal(color, roughness, metalness = .94) { return new THREE.MeshPhysicalMaterial({ color, roughness, metalness, envMapIntensity: 1.45, clearcoat: .22, clearcoatRoughness: .2 }); }
function ring(outer, inner, depth, material, segments = 72) {
  const bevel = Math.min(.03, depth * .22, (outer - inner) * .16), front = depth / 2, back = -depth / 2, width = outer - inner;
  const profile = [[inner, back + bevel], [inner, front - bevel], [inner + bevel, front], [inner + width * .3, front + .014], [inner + width * .7, front + .014], [outer - bevel, front], [outer, front - bevel], [outer, back + bevel], [outer - bevel, back], [inner + bevel, back], [inner, back + bevel]];
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segments), material); mesh.rotation.x = Math.PI / 2; return mesh;
}
function torus(radius, tube, material, z) { const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 72), material); mesh.position.z = z; return mesh; }

export function createGearAssembly({ detail = 'hero', index = 0 } = {}) {
  const group = new THREE.Group(); group.name = `machined-gear-${index}`;
  const compact = detail !== 'full';
  const bodyColor = index === 1 && detail === 'hero' ? 0x315b7c : CHROME;
  const body = new THREE.Mesh(bodyGeometry(detail), metal(bodyColor, compact ? .14 : .2, .98)); group.add(body);
  const rear = ring(2.12, 1.77, .12, metal(EDGE, compact ? .2 : .26, .93)); rear.position.z = -.29; group.add(rear);
  const plate = new THREE.Mesh(plateGeometry(detail), metal(CHROME, compact ? .17 : .28, .98)); plate.position.z = .44; group.add(plate);
  const blueBand = ring(2.25, 2.01, .08, metal(0x1261f4, compact ? .18 : .24, .72)); blueBand.position.z = .28; group.add(blueBand);
  group.add(torus(2.13, .05, metal(0xe9f1f5, compact ? .12 : .18, 1), .53));
  group.add(torus(1.18, .05, metal(0xeff6f9, compact ? .13 : .18, 1), .53));
  const blueInner = ring(1.00, .76, .07, metal(0x063a73, compact ? .18 : .26, .95)); blueInner.position.z = .28; group.add(blueInner);
  const bore = ring(.88, .66, .18, metal(0x0a1822, compact ? .2 : .24, .96)); bore.position.z = .47; group.add(bore);
  const hub = ring(1.08, .88, .12, metal(CHROME, compact ? .13 : .17, .98)); hub.position.z = .55; group.add(hub);
  group.add(torus(.84, .06, metal(0x22a6ff, compact ? .14 : .2, .96), .57));
  group.add(torus(.71, .035, metal(0x8aa6b9, compact ? .2 : .28, .93), .58));
  if (detail === 'full') {
    group.add(torus(1.96, .016, metal(0xf3f8fb, .28, .96), .515));
    group.add(torus(2.08, .012, metal(0x53616c, .28, .96), .527));
  }
  const boltMaterial = metal(0x8996a0, .24, .98), socketMaterial = metal(0x101a21, .32, .84);
  const boltBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(.095, .095, .07, 12), boltMaterial, 10);
  const boltSocket = new THREE.InstancedMesh(new THREE.CylinderGeometry(.046, .046, .014, 6), socketMaterial, 10);
  for (let i = 0; i < 10; i += 1) {
    const angle = i * TAU / 10 + Math.PI / 10, x = Math.cos(angle) * 2.03, y = Math.sin(angle) * 2.03;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
    boltBody.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, y, 0), q, new THREE.Vector3(1, 1, 1)));
    boltSocket.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, y, .042), q, new THREE.Vector3(1, 1, 1)));
  }
  boltBody.instanceMatrix.needsUpdate = true; boltSocket.instanceMatrix.needsUpdate = true; boltBody.position.z = .55; boltSocket.position.z = .55; group.add(boltBody, boltSocket);
  return group;
}

export function disposeGearAssembly(group) {
  group?.traverse(object => { object.geometry?.dispose(); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose()); });
}

export default createGearAssembly;
