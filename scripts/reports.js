(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = document.querySelector('[data-results-stage]');
  const panels = [...document.querySelectorAll('[data-report]')];
  if (!stage || !panels.length) return;
  const formatters = new Map();
  const number = (value, decimals) => {
    if (!formatters.has(decimals)) formatters.set(decimals, new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
    return formatters.get(decimals).format(value);
  };
  const charts = panels.flatMap((panel, panelIndex) => [...panel.querySelectorAll('.report-chart')].map(svg => ({
    panel, panelIndex, svg, values: (svg.dataset.values || '').split(',').map(Number), maximum: Number(svg.dataset.max || 1), base: Number(svg.dataset.base || 280), height: Number(svg.dataset.height || 216), xs: (svg.dataset.xs || '100,340,580').split(',').map(Number), line: svg.querySelector('.chart-line'), area: svg.querySelector('.chart-area'), points: [...svg.querySelectorAll('.chart-point')], labels: [...svg.querySelectorAll('[data-point-label]')], bars: [...svg.querySelectorAll('.chart-bar')], rows: [...panel.querySelectorAll('.chart-data dd')], phase: 0,
  })));
  const chartValue = (chart, index, progress) => {
    const decimals = Number(chart.svg.dataset.labelDecimals || 0);
    const scale = Number(chart.svg.dataset.labelScale || 1);
    const prefix = chart.svg.dataset.labelPrefix || '';
    const unit = chart.svg.dataset.unit || '';
    const suffix = unit === 'x' ? 'x' : scale === 1000 ? '' : unit;
    return `${prefix}${number(chart.values[index] * scale * progress, decimals)}${suffix}`;
  };
  function paintChart(chart, progress) {
    const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, progress)), 3); chart.phase = eased;
    const points = chart.values.map((value, index) => ({ x: chart.xs[index] ?? chart.xs[0], y: chart.base - value / chart.maximum * chart.height * eased }));
    const d = points.length ? `M ${points.map(point => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(' L ')}` : '';
    if (chart.line) chart.line.setAttribute('d', d);
    if (chart.area) { chart.area.setAttribute('d', points.length ? `${d} L${points.at(-1).x},${chart.base} L${points[0].x},${chart.base} Z` : ''); chart.area.style.opacity = String(eased * .22); }
    chart.points.forEach((point, index) => { const value = points[index]; if (!value) return; point.setAttribute('cx', value.x); point.setAttribute('cy', value.y); point.setAttribute('r', String(5 * eased)); point.style.opacity = String(eased); });
    chart.labels.forEach((label, index) => { const value = points[index]; if (!value) return; label.setAttribute('x', value.x); label.setAttribute('y', value.y - 18); label.textContent = chartValue(chart, index, eased); label.style.opacity = String(Math.min(1, eased * 3)); });
    chart.bars.forEach((bar, index) => { const value = chart.values[index]; if (value === undefined) return; const height = value / chart.maximum * chart.height * eased; bar.setAttribute('y', chart.base - height); bar.setAttribute('height', height); bar.style.opacity = String(eased); });
    chart.rows.forEach((row, index) => { if (chart.values[index] !== undefined) row.textContent = chartValue(chart, index, eased); });
  }
  function paintPanel(index, progress) { const panel = panels[index]; panel.dataset.reportState = progress >= .999 ? 'complete' : progress > 0 ? 'running' : 'ready'; panel.querySelectorAll('.report-chart').forEach(svg => { const chart = charts.find(item => item.svg === svg); if (chart) paintChart(chart, progress); }); panel.querySelectorAll('[data-count]').forEach(node => { const decimals = Number(node.dataset.decimals || 0); node.textContent = number(Number(node.dataset.count) * (1 - Math.pow(1 - progress, 3)), decimals); }); }
  const entries = panels.map(() => ({ started: 0, progress: 0, complete: false })); let entryRaf = 0;
  const motionOff = () => reduced.matches || document.documentElement.classList.contains('motion-paused');
  function tick(time) { entryRaf = 0; if (motionOff()) { entries.forEach((entry, index) => { entry.progress = 1; entry.complete = true; paintPanel(index, 1); }); return; } let running = false; entries.forEach((entry, index) => { if (!entry.started || entry.complete) return; entry.progress = Math.min(1, (time - entry.started) / 1500); paintPanel(index, entry.progress); if (entry.progress < 1) running = true; else entry.complete = true; }); if (running) entryRaf = requestAnimationFrame(tick); }
  function start(index) { const entry = entries[index]; if (!entry || entry.started || motionOff()) return; entry.started = performance.now(); panels[index].classList.add('is-visible'); if (!entryRaf) entryRaf = requestAnimationFrame(tick); }
  const observer = new IntersectionObserver(items => items.forEach(item => { if (item.isIntersecting) start(panels.indexOf(item.target)); }), { threshold: .1, rootMargin: '100px 0px' }); panels.forEach(panel => observer.observe(panel));
  panels.forEach((panel, index) => paintPanel(index, motionOff() ? 1 : 0));
  reduced.addEventListener('change', () => { if (motionOff()) entries.forEach((entry, index) => { entry.progress = 1; entry.complete = true; panels[index].classList.add('is-visible'); paintPanel(index, 1); }); });
  addEventListener('engrena:motion', () => { if (motionOff()) entries.forEach((entry, index) => { entry.progress = 1; entry.complete = true; panels[index].classList.add('is-visible'); paintPanel(index, 1); }); });
  addEventListener('pagehide', () => { observer.disconnect(); cancelAnimationFrame(entryRaf); });
  window.engrenaReports = Object.freeze({ get charts() { return panels.map((panel, index) => ({ state: panel.dataset.reportState || 'ready', progress: charts.find(chart => chart.panelIndex === index)?.phase || 0, kinds: [...panel.querySelectorAll('[data-chart-kind]')].map(item => item.dataset.chartKind) })); } });
})();
