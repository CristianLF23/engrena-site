var { Cam, clamp, fit, flatDot, facing, mk, place, pointer, proj, prism, put, register, disposer, rings, solid } = HL;
function mount({ stage, svg, read }) {
    const bag = disposer(), C = Cam(45, .5, 1.75);
    fit(C, [[-32, -10, 0], [32, 22, 0], [-32, -10, 36], [32, 22, 36]], 200, 166);
    const P = proj(C), front = facing(C), root = mk('g', {}, svg), base = solid(root);
    put(base, prism(P, front, ...rings(-32, -10, 32, 22, 3, 1), -2, 0));
    const bars = [], values = [14, 21, 28, 35], xs = [-21, -7, 7, 21];
    xs.forEach((x, i) => { const bar = solid(root); bars.push({ bar, x, value: values[i], current: values[i] }); });
    const coins = xs.slice(1).map((x) => ({ x, el: flatDot(root, C, 2.1, 'dot m'), rise: 0 }));
    const line = mk('path', { class: 'nf lo' }, root), points = xs.map((x, i) => [x, -3, values[i] + 2]);
    let clock = 0, paused = false, active = -1;
    function draw(now) {
      const phase = (now % 6.4) / 6.4;
      bars.forEach((item, i) => {
        const wave = Math.sin((phase * Math.PI * 2) - i * .7) * 4;
        item.current = clamp(item.value + wave, 8, 38);
        const ring = rings(item.x - 4.5, -3, item.x + 4.5, 5, 1.1, .55);
        put(item.bar, prism(P, front, ring[0], ring[1], 0, item.current));
        item.bar.sil.classList.toggle('hi', i === active);
      });
      const linePoints = xs.map((x, i) => P(x, -3, bars[i].current + 2)); line.setAttribute('d', linePoints.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(''));
      coins.forEach((coin, i) => { coin.rise = (phase + i * .23) % 1; placeCoin(coin, i); });
    }
    function placeCoin(coin, index) { const p = P(coin.x, 1, 32 + coin.rise * 12); coin.el.setAttribute('cx', p[0]); coin.el.setAttribute('cy', p[1]); coin.el.setAttribute('rx', '2.1'); coin.el.setAttribute('ry', '1.1'); coin.el.classList.toggle('hi', index === active - 1); }
    const board = register(stage, (dt) => { if (paused || HL.reducedMotion()) { draw(0); return false; } clock += dt; draw(clock); return true; }); bag.add(board.unregister);
    const hit = xs.map((x) => P(x, 0, values[1] / 2));
    bag.add(pointer(stage, { move: ([sx]) => { active = hit.reduce((best, point, i) => Math.abs(point[0] - sx) < Math.abs(hit[best][0] - sx) ? i : best, 0); read.textContent = `bar ${active + 1}`; board.wake(); }, leave: () => { active = -1; read.textContent = 'rest'; board.wake(); } }));
    draw(0);
    return { set() {}, setPaused(value) { paused = Boolean(value); if (!paused) board.wake(); }, destroy: bag.dispose };
}
hairline({ name: 'better', means: 'Barras sobem e descem enquanto moedas indicam novas oportunidades de faturamento.', rules: [1, 3, 5, 7, 9], range: [0, .5, 1], tour: [[130, 180], [200, 132], [282, 96], null], mount });
