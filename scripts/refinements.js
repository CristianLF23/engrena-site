(() => {
  'use strict';
  const scriptURL = document.currentScript.src;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const $ = selector => document.querySelector(selector);
  let effectsPaused = false;
  const motionOff = () => reduced.matches || effectsPaused;

  // Native horizontal cards: no automatic slide changes or scroll hijacking.
  const track = $('#feedback-track');
  const previous = $('#feedback-prev'), next = $('#feedback-next');
  const cards = [...track.children];
  function currentCard() {
    const edge = track.getBoundingClientRect().left;
    return cards.reduce((closest, card, i) =>
      Math.abs(card.getBoundingClientRect().left - edge) < Math.abs(cards[closest].getBoundingClientRect().left - edge) ? i : closest, 0);
  }
  function updateCards() {
    const allFit = track.scrollWidth <= track.clientWidth + 2;
    const index = currentCard();
    previous.disabled = allFit || track.scrollLeft <= 2;
    next.disabled = allFit || track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    $('#feedback-position').textContent = allFit ? '03 / 03' : String(index + 1).padStart(2, '0') + ' / 03';
  }
  function moveCard(direction) {
    const index = Math.max(0, Math.min(cards.length - 1, currentCard() + direction));
    const left = cards[index].getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    track.scrollTo({ left, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => moveCard(-1));
  next.addEventListener('click', () => moveCard(1));
  track.addEventListener('scroll', updateCards, { passive: true });
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home' || event.key === 'End') track.scrollTo({ left: event.key === 'Home' ? 0 : track.scrollWidth, behavior: reduced.matches ? 'instant' : 'smooth' });
    else moveCard(event.key === 'ArrowRight' ? 1 : -1);
  });

  const contact = $('#contato');
  const contactObserver = new IntersectionObserver(entries => {
    contact.classList.toggle('is-in-view', entries[0].isIntersecting && !document.hidden);
  }, { threshold: 0 });
  contactObserver.observe(contact);

  // One transparent scene travels at the page edge, then occupies the reserved
  // counter slot. Scroll never changes document height or captures touch input.
  const host = $('#premium-gear'), dock = $('#gear-dock'), about = $('#engrena');
  const clamp = value => Math.max(0, Math.min(1, value));
  const lerp = (a, b, value) => a + (b - a) * value;
  const smooth = value => value * value * (3 - 2 * value);
  let gear = null, loading = false, disabled = false, generation = 0;
  let frame = 0, lastFrame = 0, lastDraw = 0, layoutDirty = true;
  let start = 0, end = 1, baseSize = 500, idleAngle = 0;
  let visible = false, docked = false, progress = 0, renderedAngle = 0;
  let resizeObserver;
  function restoreFallback() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastFrame = 0; visible = false; docked = false;
    gear?.dispose(); gear = null;
    host.classList.remove('is-travelling', 'has-scene');
    host.removeAttribute('style'); host.removeAttribute('data-state');
    dock.append(host);
  }
  function measure() {
    layoutDirty = false;
    baseSize = innerWidth < 600 ? Math.min(320, innerWidth * .9) : Math.min(640, innerWidth * .48);
    host.style.setProperty('--gear-size', baseSize + 'px');
    start = about.getBoundingClientRect().top + scrollY - Math.min(160, innerHeight * .20);
    end = dock.getBoundingClientRect().top + scrollY - innerHeight * .40;
    updateCards();
  }
  async function loadGear() {
    if (gear || loading || disabled || motionOff() || saveData || location.protocol === 'file:') return;
    loading = true;
    const attempt = ++generation;
    try {
      const { initPremiumGear } = await import(new URL('premium-gear.js?v=1.11', scriptURL));
      if (attempt !== generation || motionOff()) return;
      const candidate = await initPremiumGear(host);
      if (attempt !== generation || motionOff()) { candidate.dispose(); return; }
      if (!candidate.stats.ready) { candidate.dispose(); disabled = true; return; }
      gear = candidate;
      host.classList.add('has-scene', 'is-travelling');
      document.body.append(host);
      layoutDirty = true;
      schedule();
    } catch (error) {
      disabled = true;
      restoreFallback();
    } finally { loading = false; }
  }
  function paint(time) {
    frame = 0;
    if (motionOff() || document.hidden || !gear) return;
    if (layoutDirty) measure();
    const target = dock.getBoundingClientRect();
    const y = scrollY;
    visible = y >= start && target.bottom > 0;
    gear.setVisible(visible);
    host.style.visibility = visible ? 'visible' : 'hidden';
    if (!visible) { lastFrame = 0; return; }
    progress = clamp((y - start) / Math.max(1, end - start));
    const blend = smooth(clamp((innerHeight * 1.1 - target.top) / (innerHeight * .7)));
    docked = blend >= .999;
    const floatX = innerWidth - baseSize * (.38 + Math.sin(progress * Math.PI) * .10);
    const floatY = innerHeight * (.28 + progress * .16 + Math.sin(progress * Math.PI * 2) * .06);
    const x = lerp(floatX, target.left, blend);
    const top = lerp(floatY, target.top, blend);
    const scale = lerp(1, target.width / baseSize, blend);
    const fade = clamp((y - start) / Math.max(1, innerHeight * .2));
    host.style.transform = `translate3d(${x.toFixed(2)}px,${top.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
    host.style.opacity = String(lerp(innerWidth < 600 ? .13 : .18, 1, Math.pow(blend, 3)) * fade);
    host.dataset.state = docked ? 'docked' : 'travelling';
    const delta = lastFrame ? Math.min(.08, (time - lastFrame) / 1000) : 0;
    lastFrame = time;
    if (docked) idleAngle += delta * .17;
    const nextAngle = -progress * Math.PI * 5 + idleAngle;
    if (Math.abs(nextAngle - renderedAngle) > .0001 && time - lastDraw >= 1000 / 30) {
      renderedAngle = nextAngle;
      gear.setRotation(renderedAngle); lastDraw = time;
    }
    if (docked) frame = requestAnimationFrame(paint);
  }
  function schedule() {
    if (!gear) {
      const near = about.getBoundingClientRect().top < innerHeight * 1.4 && dock.getBoundingClientRect().bottom > 0;
      if (near) loadGear();
      return;
    }
    if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
  }
  function onResize() { layoutDirty = true; updateCards(); schedule(); }
  function onContextLost() { disabled = true; generation++; restoreFallback(); }
  host.addEventListener('premiumgear:lost', onContextLost);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', onResize, { passive: true });
  resizeObserver = new ResizeObserver(() => { layoutDirty = true; schedule(); });
  resizeObserver.observe($('#conteudo'));
  document.fonts.ready.then(onResize);
  const motionControl = $('#motion-preference');
  function updateMotionControl() {
    motionControl.disabled = reduced.matches;
    motionControl.setAttribute('aria-pressed', String(motionOff()));
    motionControl.textContent = reduced.matches ? 'Movimentos reduzidos pelo dispositivo' : effectsPaused ? 'Retomar efeitos contínuos' : 'Pausar efeitos contínuos';
  }
  function changeMotion() {
    generation++;
    if (motionOff()) restoreFallback();
    else { disabled = false; layoutDirty = true; schedule(); }
    updateMotionControl();
  }
  reduced.addEventListener('change', changeMotion);
  motionControl.addEventListener('click', () => {
    effectsPaused = !effectsPaused;
    document.documentElement.classList.toggle('motion-paused', effectsPaused);
    dispatchEvent(new CustomEvent('engrena:motion', { detail: { paused: effectsPaused } }));
    changeMotion();
  });
  updateMotionControl();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
      contact.classList.remove('is-in-view');
      document.querySelector('.segments-track').style.animationPlayState = 'paused';
    } else {
      document.querySelector('.segments-track').style.animationPlayState = '';
      const box = contact.getBoundingClientRect();
      contact.classList.toggle('is-in-view', box.top < innerHeight && box.bottom > 0);
      schedule();
    }
  });
  addEventListener('pagehide', event => {
    if (event.persisted) return;
    generation++; restoreFallback(); resizeObserver.disconnect(); contactObserver.disconnect();
    removeEventListener('scroll', schedule); removeEventListener('resize', onResize);
  });
  window.engrenaRefinements = Object.freeze({
    get gear() { return { active: Boolean(gear), fallback: !gear, visible, docked, progress, angle: renderedAngle, start, end, ...gear?.stats }; },
    get feedback() { return { index: currentCard(), scrollable: track.scrollWidth > track.clientWidth + 2 }; }
  });
  measure(); schedule();
})();
