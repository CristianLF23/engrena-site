(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const shortViewport = matchMedia('(max-height: 620px)');
  const stage = document.querySelector('[data-results-stage]');
  const track = document.querySelector('[data-results-track]');
  const panels = [...document.querySelectorAll('[data-report]')];
  if (!stage || !track || !panels.length) return;
  const formatters = new Map();
  const number = (value, decimals) => {
    if (!formatters.has(decimals)) formatters.set(decimals, new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
    return formatters.get(decimals).format(value);
  };
  const charts = panels.flatMap((panel, panelIndex) => [...panel.querySelectorAll('.report-chart')].map(svg => ({
    panel, panelIndex, svg, values: (svg.dataset.values || '').split(',').map(Number), maximum: Number(svg.dataset.max || 1),
    base: Number(svg.dataset.base || 280), height: Number(svg.dataset.height || 216), xs: (svg.dataset.xs || '100,340,580').split(',').map(Number),
    line: svg.querySelector('.chart-line'), area: svg.querySelector('.chart-area'), points: [...svg.querySelectorAll('.chart-point')], labels: [...svg.querySelectorAll('[data-point-label]')], bars: [...svg.querySelectorAll('.chart-bar')],
    rows: [...panel.querySelectorAll('.chart-data dd')], phase: 0,
  })));
  const chartValue = (chart, index, progress) => {
    const decimals = Number(chart.svg.dataset.labelDecimals || 0); const scale = Number(chart.svg.dataset.labelScale || 1); const prefix = chart.svg.dataset.labelPrefix || '';
    const suffix = chart.svg.dataset.unit === 'x' ? 'x' : scale === 1000 ? '' : chart.svg.dataset.unit || '';
    return `${prefix}${number(chart.values[index] * scale * progress, decimals)}${suffix}`;
  };
  function paintChart(chart, progress) {
    const eased = 1 - Math.pow(1 - Math.max(0, Math.min(1, progress)), 3); chart.phase = eased;
    const points = chart.values.map((value, index) => ({ x: chart.xs[index] ?? chart.xs[0], y: chart.base - value / chart.maximum * chart.height * eased }));
    const d = points.length ? `M ${points.map(point => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(' L ')}` : '';
    if (chart.line) chart.line.setAttribute('d', d); if (chart.area) chart.area.setAttribute('d', points.length ? `${d} L${points.at(-1).x},${chart.base} L${points[0].x},${chart.base} Z` : ''); if (chart.area) chart.area.style.opacity = String(eased);
    chart.points.forEach((point, index) => { const value = points[index]; if (!value) return; point.setAttribute('cx', value.x); point.setAttribute('cy', value.y); point.setAttribute('r', String(5 * eased)); point.style.opacity = String(eased); });
    chart.labels.forEach((label, index) => { const value = points[index]; if (!value) return; label.setAttribute('x', value.x); label.setAttribute('y', value.y - 18); label.textContent = chartValue(chart, index, eased); label.style.opacity = String(Math.min(1, eased * 3)); });
    chart.bars.forEach((bar, index) => { const value = chart.values[index]; if (value === undefined) return; const height = value / chart.maximum * chart.height * eased; bar.setAttribute('y', chart.base - height); bar.setAttribute('height', height); bar.style.opacity = String(eased); });
    chart.rows.forEach((row, index) => { if (chart.values[index] !== undefined) row.textContent = chartValue(chart, index, eased); });
  }
  function paintPanel(panelIndex, progress) {
    const panel = panels[panelIndex]; if (!panel) return; panel.dataset.reportState = progress >= .999 ? 'complete' : progress > 0 ? 'running' : 'ready';
    panel.querySelectorAll('.report-chart').forEach(svg => { const chart = charts.find(item => item.svg === svg); if (chart) paintChart(chart, progress); });
    panel.querySelectorAll('[data-count]').forEach(node => { const decimals = Number(node.dataset.decimals || 0); node.textContent = number(Number(node.dataset.count) * (1 - Math.pow(1 - progress, 3)), decimals); });
  }
  let raf = 0, activeIndex = 0, entryRaf = 0, trackRaf = 0, currentX = 0, targetX = 0, lastTrackTime = 0, stageVisible = false;
  const entries = panels.map(() => ({ started: 0, progress: 0, complete: false }));
  const motionOff = () => reduced.matches || shortViewport.matches || document.documentElement.classList.contains('motion-paused');
  let snapTrigger=null;
  function configureSnap(){
    snapTrigger?.kill();snapTrigger=null;
    if(!motionOff()&&window.ScrollTrigger){
      snapTrigger=ScrollTrigger.create({trigger:stage,start:'top top',end:'bottom bottom',snap:{snapTo:1/(panels.length-1),duration:{min:.18,max:.45},delay:.18,inertia:false}});
    }
    schedule();
  }
  function startEntry(index) {
    const entry = entries[index];
    if (!entry || entry.started || motionOff()) return;
    entry.started = performance.now();
    if (!entryRaf) entryRaf = requestAnimationFrame(tickEntries);
  }
  function tickEntries(time) {
    entryRaf = 0;
    if(motionOff()){entries.forEach((entry,index)=>{entry.progress=1;entry.complete=true;paintPanel(index,1);});return;}
    let running = false;
    entries.forEach((entry, index) => {
      if (!entry.started || entry.complete) return;
      entry.progress = Math.min(1, (time - entry.started) / 1600);
      paintPanel(index, entry.progress);
      if (entry.progress < 1) running = true; else entry.complete = true;
    });
    if (running) entryRaf = requestAnimationFrame(tickEntries);
  }
  function startVisibleEntry() {
    if (!stageVisible || motionOff()) return;
    const width = Math.max(1, track.clientWidth);
    panels.forEach((panel, index) => {
      const left = index * width + currentX;
      const right = left + width;
      if (left < width * .3 && right > width * .7) startEntry(index);
    });
  }
  function animateTrack(time) {
    trackRaf = 0;
    if (motionOff()) { currentX = targetX = 0; track.style.transform = 'none'; return; }
    const delta = lastTrackTime ? Math.min(.06, (time - lastTrackTime) / 1000) : 1 / 60; lastTrackTime = time;
    currentX += (targetX - currentX) * (1 - Math.exp(-18 * delta));
    track.style.transform = `translate3d(${currentX.toFixed(3)}px,0,0)`;
    startVisibleEntry();
    if (Math.abs(targetX - currentX) > .25) trackRaf = requestAnimationFrame(animateTrack);
  }
  function update() {
    raf = 0;
    if (motionOff()) {
      currentX = targetX = 0;
      track.style.transform = 'none';
      activeIndex = Math.max(0, Math.min(panels.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
      panels.forEach((panel, index) => paintPanel(index, 1));
    } else {
      const rect = stage.getBoundingClientRect(); stageVisible = rect.top < innerHeight * .8 && rect.bottom > 0;
      const travel = Math.max(1, stage.offsetHeight - innerHeight); const progress = Math.max(0, Math.min(1, -rect.top / travel));
      const maxX = Math.max(0, track.scrollWidth - track.clientWidth);
      targetX = -maxX * progress;
      startVisibleEntry();
      if (!trackRaf && Math.abs(targetX - currentX) > .25) trackRaf = requestAnimationFrame(animateTrack);
      const position = progress * (panels.length - 1); activeIndex = Math.max(0, Math.min(panels.length - 1, Math.round(position)));
      panels.forEach((panel, index) => {
        const entry = entries[index];
        paintPanel(index, entry.started ? (entry.complete ? 1 : entry.progress) : 0);
      });
    }
    const label = document.querySelector('[data-results-progress]'); if (label) label.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(panels.length).padStart(2, '0')}`;
    const prev = document.querySelector('[data-results-prev]'); const next = document.querySelector('[data-results-next]'); if (prev) prev.disabled = activeIndex === 0; if (next) next.disabled = activeIndex === panels.length - 1;
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(update); }
  function goTo(index) {
    const nextIndex = Math.max(0, Math.min(panels.length - 1, index));
    if (motionOff()) { track.scrollTo({ left: nextIndex * track.clientWidth, behavior: 'auto' }); schedule(); return; }
    const rect = stage.getBoundingClientRect(); const travel = Math.max(1, stage.offsetHeight - innerHeight);
    scrollTo({ top: scrollY + rect.top + travel * (nextIndex / (panels.length - 1)), behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  document.querySelector('[data-results-prev]')?.addEventListener('click', () => goTo(activeIndex - 1)); document.querySelector('[data-results-next]')?.addEventListener('click', () => goTo(activeIndex + 1));
  track.addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); goTo(event.key === 'Home' ? 0 : event.key === 'End' ? panels.length - 1 : activeIndex + (event.key === 'ArrowRight' ? 1 : -1)); });
  let touchStart=null;
  track.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&!motionOff())touchStart={x:event.clientX,y:event.clientY};},{passive:true});
  track.addEventListener('pointerup',event=>{
    if(!touchStart||motionOff())return;
    const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;touchStart=null;
    if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.3)goTo(activeIndex+(dx<0?1:-1));
  },{passive:true});
  track.addEventListener('pointercancel',()=>{touchStart=null;},{passive:true});
  addEventListener('scroll', schedule, { passive: true }); track.addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule, { passive: true }); reduced.addEventListener('change', schedule); addEventListener('engrena:motion', schedule);
  reduced.addEventListener('change',configureSnap);shortViewport.addEventListener('change',configureSnap);addEventListener('engrena:motion',configureSnap);
  addEventListener('pagehide',event=>{if(event.persisted)return;snapTrigger?.kill();cancelAnimationFrame(raf);cancelAnimationFrame(entryRaf);cancelAnimationFrame(trackRaf);});
  configureSnap();
  if (motionOff()) { track.style.transform = 'none'; panels.forEach((_, index) => paintPanel(index, 1)); } else schedule();
  window.engrenaReports = Object.freeze({ get charts() { return panels.map((panel, index) => ({ state: panel.dataset.reportState || 'ready', progress: charts.find(chart => chart.panelIndex === index)?.phase || 0, kinds: [...panel.querySelectorAll('[data-chart-kind]')].map(item => item.dataset.chartKind) })); } });
})();
