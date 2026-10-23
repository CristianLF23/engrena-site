var { Cam, circ, fit, flatDot, facing, mk, place, pointer, proj, prism, put, register, disposer, rings, solid, poly, open, ringAt } = HL;
function mount({ stage, svg, read }) {
    const bag = disposer(), C = Cam(45, .5, 1.75);
    fit(C, [[-34, -12, 0], [34, 28, 0], [-34, -12, 34], [34, 28, 34]], 200, 166);
    const P = proj(C), front = facing(C), root = mk('g', {}, svg), calendar = solid(root), loop = mk('path', { class: 'nf lo' }, root), loopHi = mk('path', { class: 'nf' }, root);
    put(calendar, prism(P, front, ...rings(-28, -8, 4, 20, 3, 1), 0, 24));
    const top = mk('path', { class: 'nf lo' }, root), days = [];
    for (let i = 0; i < 4; i++) days.push(flatDot(root, C, 1.3, i === 1 ? 'dot' : 'dot m'));
    const orbit = [flatDot(root, C, 1.5, 'dot'), flatDot(root, C, 1.5, 'dot m'), flatDot(root, C, 1.5, 'dot m')];
    let clock = 0, paused = false, active = -1;
    function draw(now) {
      const phase = (now % 7.2) / 7.2;
      top.setAttribute('d', open([P(-28, 8, 24), P(4, 8, 24)]));
      for (let i = 0; i < 4; i++) place(days[i], P(-23 + i * 7, 4 + (i % 2) * 6, 24));
      const center = P(16, 9, 5), radius = 13;
      loop.setAttribute('d', open(circ(radius, 40).map((q) => P(16 + q.u, 9 + q.v, 2))));
      loopHi.setAttribute('d', open(circ(radius, 11).slice(0, 5).map((q) => P(16 + q.u, 9 + q.v, 2))));
      orbit.forEach((dot, i) => { const a = phase * Math.PI * 2 + i * Math.PI * 2 / 3; place(dot, P(16 + Math.cos(a) * radius, 9 + Math.sin(a) * radius, 4)); dot.classList.toggle('hi', i === active - 1); });
    }
    const board = register(stage, (dt) => { if (paused || HL.reducedMotion()) { draw(0); return false; } clock += dt; draw(clock); return true; }); bag.add(board.unregister);
    const hit = P(-12, 6, 12);
    bag.add(pointer(stage, { move: ([sx]) => { active = Math.abs(sx - hit[0]) < 80 ? 1 : 2; read.textContent = active === 1 ? 'calendar' : 'loop'; board.wake(); }, leave: () => { active = -1; read.textContent = 'rest'; board.wake(); } }));
    draw(0);
    return { set() {}, setPaused(value) { paused = Boolean(value); if (!paused) board.wake(); }, destroy: bag.dispose };
}
hairline({ name: 'recurrence', means: 'Um calendário organiza o próximo contato e o ciclo de retorno do cliente.', rules: [1, 5, 6, 7, 9], range: [0, .5, 1], tour: [[125, 170], [250, 150], [296, 104], null], mount });
