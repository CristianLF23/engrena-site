(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const MONTHS = ['Abril', 'Maio', 'Junho'];
  const DURATION = 3000;
  const records = [...document.querySelectorAll('[data-report]')].map(element => ({
    element, trigger:element.querySelector('.report-chart')||element, frame: 0, progress: 0, state: 'ready',
    counters: [...element.querySelectorAll('[data-count]')],
    charts: [...element.querySelectorAll('.report-chart')].map(svg => ({
      svg, values: (svg.dataset.values || '').split(',').map(Number), maximum: Number(svg.dataset.max),
      line: svg.querySelector('.chart-line'), area: svg.querySelector('.chart-area'),
      points: [...svg.querySelectorAll('.chart-point')], labels: [...svg.querySelectorAll('[data-point-label]')], bars: [...svg.querySelectorAll('.chart-bar')],
      selectedMonth: 2, inspector: null, readout: null,
    })),
  }));
  const formats = new Map();
  function number(value, decimals) {
    if (!formats.has(decimals)) formats.set(decimals, new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
    return formats.get(decimals).format(value);
  }
  function chartValue(chart, index, progress = 1) {
    const decimals = Number(chart.svg.dataset.labelDecimals || (chart.svg.dataset.unit === 'x' ? 2 : 0));
    return (chart.svg.dataset.labelPrefix || '') + number(chart.values[index] * Number(chart.svg.dataset.labelScale || 1) * progress, decimals) + (chart.svg.dataset.unit === 'x' ? 'x' : '');
  }
  function setInspect(chart, index) {
    index = Math.max(0, Math.min(chart.values.length - 1, index));
    if(chart.selectedMonth===index && chart.readout?.textContent)return;
    chart.selectedMonth = index;
    chart.points.forEach((point, i) => point.classList.toggle('is-inspected', i === chart.selectedMonth));
    chart.labels.forEach((label, i) => label.classList.toggle('is-inspected', i === chart.selectedMonth));
    chart.bars.forEach((bar, i) => bar.classList.toggle('is-inspected', i === chart.selectedMonth));
    if (chart.inspector) chart.inspector.querySelectorAll('button').forEach((button, i) => {
      const active = i === chart.selectedMonth;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-selected', active);
    });
    if (chart.readout) {
      const year = chart.svg.closest('.report-figure')?.querySelector('figcaption span:last-child')?.textContent?.match(/\d{4}/)?.[0] || '2025';
      chart.readout.textContent = `${MONTHS[chart.selectedMonth]} ${year} · ${chartValue(chart, chart.selectedMonth)}`;
    }
  }
  function addInspector(chart) {
    const figure = chart.svg.closest('.report-figure');
    if (!figure || figure.querySelector('.chart-inspector')) return;
    const wrap = document.createElement('div');
    wrap.className = 'chart-inspector';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Inspecionar mês do gráfico');
    MONTHS.forEach((month, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = month; button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => setInspect(chart, index));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const current = index;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : event.key === 'ArrowRight' ? Math.min(2, current + 1) : Math.max(0, current - 1);
        setInspect(chart, next); wrap.querySelectorAll('button')[next]?.focus();
      });
      wrap.append(button);
    });
    const readout = document.createElement('p');
    readout.className = 'chart-inspector-readout'; readout.setAttribute('aria-live', 'polite'); readout.setAttribute('aria-atomic', 'true');
    wrap.append(readout); figure.append(wrap); chart.inspector = wrap; chart.readout = readout; setInspect(chart, 2);
    const inspectPointer=event=>{
      const point=chart.svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
      const matrix=chart.svg.getScreenCTM();if(!matrix)return;
      const x=point.matrixTransform(matrix.inverse()).x;
      const xs=(chart.svg.dataset.xs||'100,340,580').split(',').map(Number);
      const index=xs.reduce((best,value,i)=>Math.abs(value-x)<Math.abs(xs[best]-x)?i:best,0);
      setInspect(chart,index);
    };
    chart.svg.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')inspectPointer(event)});
    chart.svg.addEventListener('click',inspectPointer);
  }
  function paint(record, progress) {
    record.progress = progress;
    const finalPhase=record.charts.length?Math.max(0,Math.min(1,(progress-2/3)*3)):progress;
    const eased = 1 - Math.pow(1 - finalPhase, 3);
    record.counters.forEach(node => {
      const decimals = Number(node.dataset.decimals || 0), value = Number(node.dataset.count) * eased;
      node.textContent = (node.dataset.prefix || '') + number(value, decimals) + (node.dataset.suffix || '');
    });
    record.charts.forEach(chart => {
      const xs = (chart.svg.dataset.xs || '86,328,570').split(',').map(Number);
      const baseline = Number(chart.svg.dataset.base || 246), height = Number(chart.svg.dataset.height || 206);
      const points = chart.values.map((value, index) => {
        const local = Math.max(0, Math.min(1, (progress - index / chart.values.length) * chart.values.length));
        const phase = 1 - Math.pow(1 - local, 3);
        return { y: baseline - value / chart.maximum * height * phase, finalY:baseline-value/chart.maximum*height, phase };
      });
      const active = points.reduce((last, point, index) => point.phase > 0 ? index : last, -1);
      // Trace only real month-to-month segments; no invented intermediate low.
      const pathPoints=active<0?[]:[[xs[0],points[0].finalY]];
      for(let i=1;i<=active;i++)pathPoints.push([xs[i-1]+(xs[i]-xs[i-1])*points[i].phase,points[i-1].finalY+(points[i].finalY-points[i-1].finalY)*points[i].phase]);
      const d=pathPoints.length?'M '+pathPoints.map(point=>point.map(n=>n.toFixed(3)).join(',')).join(' L '):'';
      if(chart.line){chart.line.setAttribute('d',d);chart.line.style.strokeDasharray='none';chart.line.style.strokeDashoffset='0';}
      if(chart.area){chart.area.setAttribute('d',pathPoints.length?`${d} L${pathPoints.at(-1)[0]},${baseline} L${xs[0]},${baseline} Z`:'');chart.area.style.opacity=String(progress);}
      chart.points.forEach((point,index)=>{point.setAttribute('cy',points[index].finalY.toFixed(3));point.setAttribute('r',String(5*points[index].phase));point.style.opacity=String(points[index].phase);});
      chart.labels.forEach((label,index)=>{label.setAttribute('y',(points[index].finalY-18).toFixed(3));label.textContent=chartValue(chart,index,points[index].phase);label.style.opacity=String(Math.min(1,points[index].phase*3));});
      chart.bars.forEach((bar, index) => { const fullHeight = chart.values[index] / chart.maximum * height, visibleHeight = fullHeight * points[index].phase; bar.setAttribute('y', (baseline - visibleHeight).toFixed(3)); bar.setAttribute('height', visibleHeight.toFixed(3)); bar.style.transform = 'none'; bar.style.opacity = String(points[index].phase > 0 ? 1 : 0); });
    });
  }
  function setState(record, state) { record.state = state; record.element.dataset.reportState = state; }
  function finish(record) { cancelAnimationFrame(record.frame); record.frame = 0; paint(record, 1); setState(record, 'complete'); }
  function prepare(record) { cancelAnimationFrame(record.frame); record.frame = 0; paint(record, 0); setState(record, 'ready'); }
  function start(record) {
    if (record.state === 'running' || record.state === 'complete') return;
    if (reduced.matches) { finish(record); return; }
    setState(record, 'running');
    const started = performance.now() - record.progress * DURATION;
    function tick(time) {
      const progress = Math.max(0, Math.min(1, (time - started) / DURATION)); paint(record, progress);
      if (progress < 1) record.frame = requestAnimationFrame(tick); else { record.frame = 0; setState(record, 'complete'); }
    }
    record.frame = requestAnimationFrame(tick);
  }
  records.forEach(record => record.charts.forEach(addInspector));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    const record = records.find(item => item.trigger === entry.target); if (!record) return;
    if (entry.isIntersecting) start(record); else if (record.state === 'running') finish(record);
  }), { threshold: .18 });
  records.forEach(record => { if (reduced.matches) finish(record); else prepare(record); observer.observe(record.trigger); });
  const replay = document.querySelector('#replay-results');
  if (replay) { replay.hidden = false; replay.addEventListener('click', () => records.forEach(record => { if(reduced.matches){finish(record);return;} prepare(record); const rect = record.trigger.getBoundingClientRect(); if (rect.top < innerHeight && rect.bottom > 0) start(record); observer.unobserve(record.trigger); observer.observe(record.trigger); })); }
  reduced.addEventListener('change', () => { if (reduced.matches) records.forEach(finish); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) records.filter(record => record.state === 'running').forEach(record => { cancelAnimationFrame(record.frame); record.frame = 0; setState(record, 'paused'); });
    else records.filter(record => record.state === 'paused').forEach(start);
  });
  addEventListener('pagehide', event => { if (event.persisted) return; records.forEach(record => cancelAnimationFrame(record.frame)); observer.disconnect(); });
  window.engrenaReports = Object.freeze({ get charts() { return records.map(record => ({ state: record.state, progress: record.progress, kinds: record.charts.map(chart => chart.svg.closest('[data-chart-kind]')?.dataset.chartKind) })); } });
})();
