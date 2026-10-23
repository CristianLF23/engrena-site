(() => {
  'use strict';
  const base = document.currentScript?.src || new URL('./hairline-bridge.js', location.href).href;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let dead = false, started = false, tours = [], figures = [], tourRecords = [];
  const load = (relative) => new Promise((resolve, reject) => { const script = document.createElement('script');if(relative.startsWith('hairline-'))script.type='module'; script.src = new URL(relative, base); script.onload = resolve; script.onerror = reject; document.head.append(script); });
  const paused = () => reduced.matches || document.documentElement.classList.contains('motion-paused');
  const expose = (node) => { if (!node) return; node.hidden = false; node.closest('.method-visual-scene')?.classList.add('has-figure'); };
  const mountSpec = (spec) => {
    if (dead) return;
    const map = { workshop: '#hairline-oficina', better: '#hairline-plataforma', recurrence: '#hairline-retorno', followup: '#hairline-orcamento', diagnosis: '#hairline-diagnostico' };
    const stages = document.querySelectorAll(map[spec.name]);
    if (!stages.length) return;
    HL.inject(document);
    stages.forEach(stage=>{
    stage.dataset.hairline = `method-${spec.name}`;
    stage.setAttribute('role', 'img'); stage.setAttribute('aria-label', spec.means); stage.tabIndex=0; stage.hidden = false; stage.replaceChildren();
    const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage);
    const live = document.createElement('span'); live.dataset.hairlineLive = ''; live.setAttribute('aria-live', 'polite'); stage.append(live);
    const read = { textContent: 'rest' }, api = spec.mount({ stage, svg, read }, spec.range[1]);
    figures.push({ api, stage }); expose(stage);
    const record = { stage, stops: spec.tour, tour: null, visible:false };
    record.observer=new IntersectionObserver(entries=>{record.visible=entries[0].isIntersecting;update()},{threshold:.05});record.observer.observe(stage);
    if (record.tour) tours.push(record.tour);
    tourRecords.push(record); stage.__engrenaFigure = { api, tour: record.tour, live };
    });
  };
  window.hairline = (spec) => mountSpec(spec);
  const update = () => {
    if(!window.HL)return;
    HL.setReducedMotion(paused());
    const value = paused(); figures.forEach(({ api }) => api.setPaused?.(value));
    tourRecords.forEach((record) => {
      if (value || document.hidden || reduced.matches || !record.visible) { record.tour?.stop?.(); record.tour = null; }
      else if (!record.tour) record.tour = HL.tour(record.stage, record.stops, () => {});
    });
    tours = tourRecords.map((record) => record.tour).filter(Boolean);
  };
  async function start() {
    if (started || dead) return; started = true;
    try { await load('../vendor/hairline/kernel.js'); await load('hairline-workshop-v125.js'); await load('hairline-better-v126.js'); await load('hairline-recurrence-v126.js'); await load('hairline-followup-v126.js'); await load('hairline-diagnosis-v126.js'); update(); }
    catch { document.querySelectorAll('.method-visual-scene:not(.has-figure) .hairline-figure').forEach((node) => { node.hidden = true; }); }
  }
  const targets = document.querySelectorAll('#metodo,#oportunidades,#contato');
  if (targets.length && 'IntersectionObserver' in window) { const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); start(); } }, { rootMargin: '500px' }); targets.forEach(target=>observer.observe(target)); } else start();
  reduced.addEventListener('change', update); addEventListener('engrena:motion', update);document.addEventListener('visibilitychange',update);
  addEventListener('pagehide', (event) => { if (event.persisted) return; dead = true; tours.forEach((tour) => tour.stop());tourRecords.forEach(record=>record.observer.disconnect()); figures.forEach(({ api }) => api.destroy?.()); reduced.removeEventListener('change', update); removeEventListener('engrena:motion', update);document.removeEventListener('visibilitychange',update); });
})();
