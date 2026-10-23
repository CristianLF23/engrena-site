var { Cam, clamp, circ, facing, fit, hull, lerp, mk, open, pointer, poly, proj, prism, register, disposer, rings, ringAt, run, solid, put, tour, spring, stepS } = HL;
function mount({ stage, svg, read }, value) {
    const bag = disposer(), C = Cam(45, .5, 1.65);
    fit(C, [[-38, -22, 0], [38, 34, 0], [-38, -22, 38], [38, 34, 38]], 200, 166);
    const P = proj(C), front = facing(C), root = mk('g', {}, svg), structure = mk('g', {}, root), cars = [];
    const block = (parent, x0, y0, x1, y1, z0, z1, cls = 'sil') => { const s = solid(parent); put(s, prism(P, front, ...rings(x0, y0, x1, y1, 2.2, .8), z0, z1)); s.sil.classList.add(cls); return s; };
    block(structure, -38, -18, 38, 34, -2, 0, 'sil');
    block(structure, -32, 5, -27, 20, 0, 32, 'sil'); block(structure, 27, 5, 32, 20, 0, 32, 'sil'); block(structure, -32, 18, 32, 24, 30, 36, 'sil');
    for (const x of [-24, 0, 24]) block(structure, x - 1, 6, x + 1, 18, 0, 28, 'lo');
    const roof = block(structure, -35, 2, 35, 22, 36, 39, 'sil'); roof.sil.classList.add('hi');
    const lanes = [-11, 11];
    function newCar(lane) {
      const group = mk('g', {}, root), body = solid(group), cabin = solid(group), wheels = [-1, 1].map((side) => mk('path', { class: 'nf lo' }, group));
      return { group, body, cabin, wheels, lane, phase: lane < 0 ? 0 : 4.4, prev: 0 };
    }
    lanes.forEach((lane) => cars.push(newCar(lane)));
    function drawCar(car, now, active) {
      const cycle = (now + car.phase) % 12; let visible = true, y = -24, state = 'approaching';
      if (cycle < 2.6) y = lerp(-24, 4, cycle / 2.6);
      else if (cycle < 7.3) { y = lerp(4, 22, (cycle - 2.6) / 4.7); state = 'service'; }
      else if (cycle < 9.8) { y = lerp(22, 36, (cycle - 7.3) / 2.5); state = 'departing'; }
      else { visible = false; state = 'rest'; }
      const Q = (x, yy, z) => P(car.lane + x, y + yy, z), bodyRing = rings(-7, -9, 7, 9, 2, .8), cabinFoot = rings(-5.4, -5.4, 5.4, 5.4, 1.8, .7);
      if (!visible) { car.body.sil.setAttribute('d', ''); car.cabin.sil.setAttribute('d', ''); car.wheels.forEach((wheel) => wheel.setAttribute('d', '')); return { state, visible: false }; }
      put(car.body, prism(Q, front, ...bodyRing, 2, 8)); put(car.cabin, prism(Q, front, ...cabinFoot, 8, 17));
      car.body.sil.classList.toggle('hi', active); car.cabin.sil.classList.toggle('hi', active);
      car.wheels.forEach((wheel, i) => { const side = i ? 1 : -1; wheel.setAttribute('d', poly(circ(2.4, 20).map((q) => Q(side * 6.2, q.u - 5 + i * 10, q.v + 4)))); });
      return { state, visible: true };
    }
    let clock = 0, paused = false, active = -1, stats = { loopDuration: 12, cars: 2, running: false };
    const board = register(stage, (dt) => { if (paused || HL.reducedMotion()) return false; clock = (clock + dt) % 12; stats.running = true; stats.carStates = cars.map((car, index) => drawCar(car, clock, active === index)); return true; }); bag.add(board.unregister);
    const laneScreen = lanes.map((lane) => P(lane, 4, 5));
    bag.add(pointer(stage, { move: ([sx, sy]) => { const next = laneScreen.reduce((best, point, i) => Math.abs(point[0] - sx) < Math.abs(laneScreen[best][0] - sx) ? i : best, 0); active = Math.abs(laneScreen[next][0] - sx) < 42 ? next : -1; read.textContent = active < 0 ? 'rest' : `car ${active + 1}`; board.wake(); }, leave: () => { active = -1; read.textContent = 'rest'; board.wake(); } }));
    return { set() {}, setPaused(value) { paused = Boolean(value); stats.paused = paused; if (!paused) board.wake(); }, stats, destroy: bag.dispose };
}
hairline({ name: 'workshop', means: 'Dois carros entram na oficina, passam pelo box e saem pela outra faixa.', rules: [1, 5, 6, 7, 9], range: [.7, 1, 1.3], tour: [[170, 210], [230, 158], [200, 112], null], mount });
