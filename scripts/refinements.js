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
  const cards = [...(track?.children || [])];
  function currentCard() {
    if(!track)return 0;
    const edge = track.getBoundingClientRect().left;
    return cards.reduce((closest, card, i) =>
      Math.abs(card.getBoundingClientRect().left - edge) < Math.abs(cards[closest].getBoundingClientRect().left - edge) ? i : closest, 0);
  }
  function updateCards() {
    if(!track||!previous||!next)return;
    const allFit = track.scrollWidth <= track.clientWidth + 2;
    const index = currentCard();
    previous.disabled = allFit || track.scrollLeft <= 2;
    next.disabled = allFit || track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    $('#feedback-position').textContent = allFit ? '03 / 03' : String(index + 1).padStart(2, '0') + ' / 03';
  }
  function moveCard(direction) {
    if(!track)return;
    const index = Math.max(0, Math.min(cards.length - 1, currentCard() + direction));
    const left = cards[index].getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    track.scrollTo({ left, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  previous?.addEventListener('click', () => moveCard(-1));
  next?.addEventListener('click', () => moveCard(1));
  track?.addEventListener('scroll', updateCards, { passive: true });
  track?.addEventListener('keydown', event => {
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
  let frame = 0, lastFrame = 0, layoutDirty = true;
  let start = 0, end = 1, baseSize = 500, idleAngle = 0, arrivalStart = 0, railWidth = 0;
  let dockLayout = { left: 0, top: 0, width: 0, height: 0 };
  let pose = null, targetPose = null, displayProgress = 0, dockOffsetY = 0, wasDockTarget = false;
  let visible = false, docked = false, progress = 0, renderedAngle = 0;
  let resizeObserver;
  function restoreFallback() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastFrame = 0; visible = false; docked = false; pose = null; targetPose = null;
    gear?.dispose(); gear = null;
    host.classList.remove('is-travelling', 'has-scene');
    host.removeAttribute('style'); host.removeAttribute('data-state');
    dock.append(host);
  }
  function measure() {
    layoutDirty = false;
    const slot = dock.getBoundingClientRect();
    const heroBottom = $('#inicio').getBoundingClientRect().bottom + scrollY;
    dockLayout = { left: slot.left, top: slot.top + scrollY, width: slot.width, height: slot.height };
    baseSize = innerWidth < 600 ? Math.min(320, innerWidth * .9) : Math.min(640, innerWidth * .48);
    railWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail')) || 0;
    start = heroBottom - innerHeight * .85;
    arrivalStart = dockLayout.top - innerHeight * 1.25;
    end = dockLayout.top - innerHeight * .40;
    host.style.setProperty('--gear-size', baseSize + 'px');
    updateCards();
  }
  async function loadGear() {
    if (gear || loading || disabled || motionOff() || saveData || location.protocol === 'file:') return;
    loading = true;
    const attempt = ++generation;
    try {
      const { initPremiumGear } = await import(new URL('premium-gear.js?v=1.13', scriptURL));
      if (attempt !== generation || motionOff()) return;
      const candidate = await initPremiumGear(host);
      if (attempt !== generation || motionOff()) { candidate.dispose(); return; }
      if (!candidate.stats.ready) { candidate.dispose(); disabled = true; return; }
      gear = candidate;
      host.style.opacity = '0'; host.style.visibility = 'hidden';
      host.classList.add('has-scene', 'is-travelling');
      document.body.append(host);
      layoutDirty = true;
      schedule();
    } catch (error) {
      disabled = true;
      restoreFallback();
    } finally {
      loading = false;
      if (attempt !== generation && !gear && !disabled && !motionOff()) queueMicrotask(schedule);
    }
  }
  function paint(time) {
    frame = 0;
    if (motionOff() || document.hidden || !gear) return;
    // Keep a live RAF even when this screen refresh is faster than our render
    // budget. The last scroll event can never be dropped by a frame throttle.
    if (lastFrame && time - lastFrame < 1000 / 60 - .75) {
      frame = requestAnimationFrame(paint); return;
    }
    if (layoutDirty) measure();
    const y = scrollY;
    visible = y >= start && dockLayout.top + dockLayout.height - y > 0;
    gear.setVisible(visible);
    host.style.visibility = visible ? 'visible' : 'hidden';
    if (!visible) { lastFrame = 0; pose = null; return; }
    const delta = lastFrame ? Math.min(.06, (time - lastFrame) / 1000) : 1 / 60;
    lastFrame = time;
    const follow = 1 - Math.exp(-14 * delta);
    progress = clamp((y - start) / Math.max(1, end - start));
    const arrival = clamp((y - arrivalStart) / Math.max(1, end - arrivalStart));
    const blend = smooth(arrival), dockTarget = arrival >= 1;
    const floating = p => {
      const cross = smooth(clamp((p - .12) / .32));
      const returnRight = smooth(clamp((p - .61) / .24));
      const left = railWidth - baseSize * (innerWidth < 600 ? .28 : .24);
      const right = innerWidth - baseSize * .68;
      return {x:lerp(right,left,cross*(1-returnRight)),y:innerHeight*(.32+Math.sin(p*Math.PI*2)*.065)};
    };
    const float = floating(progress);
    let x = float.x, top = float.y;
    if (arrival > 0) {
      // The curve is authored in document coordinates and ends at the actual
      // reserved slot. A moving viewport target no longer pulls it elsewhere.
      const first = floating(clamp((arrivalStart - start) / Math.max(1, end - start)));
      const fromY = arrivalStart + first.y;
      const controlY = fromY + (end - arrivalStart) / 3;
      const inverse = 1 - arrival;
      const documentY = inverse ** 3 * fromY + 3 * inverse ** 2 * arrival * controlY
        + 3 * inverse * arrival ** 2 * dockLayout.top + arrival ** 3 * dockLayout.top;
      x = lerp(first.x, dockLayout.left, blend);
      top = dockTarget ? dockLayout.top - y : documentY - y;
    }
    const scale = lerp(1, dockLayout.width / baseSize, blend);
    const fade = clamp((y - start) / Math.max(1, innerHeight * .2));
    const opacity = lerp(innerWidth < 600 ? .13 : .18, 1, blend ** 3) * fade;
    targetPose = { x, y: top, scale, opacity, progress, dockTarget };
    if (!pose) {
      pose = { x, y: top, scale, opacity };
      displayProgress = progress; dockOffsetY = 0;
    } else {
      pose.x = lerp(pose.x, x, follow);
      pose.scale = lerp(pose.scale, scale, follow);
      pose.opacity = lerp(pose.opacity, opacity, follow);
      if (dockTarget) {
        if (!wasDockTarget) dockOffsetY = pose.y - top;
        dockOffsetY *= 1 - follow;
        pose.y = top + dockOffsetY;
      } else pose.y = lerp(pose.y, top, follow);
      displayProgress = lerp(displayProgress, progress, follow);
    }
    wasDockTarget = dockTarget;
    docked = dockTarget && Math.abs(pose.x - x) < .75 && Math.abs(pose.y - top) < .75 && Math.abs(pose.scale - scale) * baseSize < .75;
    host.style.transform = `translate3d(${pose.x.toFixed(3)}px,${pose.y.toFixed(3)}px,0) scale(${pose.scale.toFixed(5)})`;
    host.style.opacity = String(pose.opacity);
    host.dataset.state = docked ? 'docked' : 'travelling';
    idleAngle += delta * (dockTarget ? .17 : .12);
    renderedAngle = -displayProgress * Math.PI * 4 + idleAngle;
    const tiltX = (Math.sin(displayProgress * Math.PI * 2) * .035 + Math.sin(time * .0003) * .01) * (1 - blend);
    const tiltY = Math.sin(displayProgress * Math.PI * 2) * .10 * (1 - blend);
    if (gear.setPose) gear.setPose({ angle: renderedAngle, tiltX, tiltY });
    else gear.setRotation(renderedAngle);
    frame = requestAnimationFrame(paint);
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
    get gear() { return { active: Boolean(gear), fallback: !gear, visible, docked, progress, displayProgress, angle: renderedAngle, start, end, pose: pose && { ...pose }, target: targetPose && { ...targetPose }, maxFps: 60, ...gear?.stats }; },
    get feedback() { return { index: currentCard(), scrollable: Boolean(track&&track.scrollWidth > track.clientWidth + 2) }; }
  });
  measure(); schedule();
})();
