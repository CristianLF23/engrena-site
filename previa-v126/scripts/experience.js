(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = $$('[data-method-step]');
  const track = $('#method-track');
  const previous = $('#method-prev'), next = $('#method-next');
  const chapters = $$('.rail-chapters a');
  const sections = $$('section[data-section]');
  let activeStep = 0, scrollFrame = 0;
  function selectStep(index) {
    activeStep = Math.max(0, Math.min(cards.length - 1, index));
    cards.forEach((card, i) => card.classList.toggle('is-current', i === activeStep));
    $('.method-position').textContent = (activeStep + 1) + ' de ' + cards.length;
    previous.disabled = activeStep === 0;
    next.disabled = activeStep === cards.length - 1;
    $('#metodo').dataset.activeStep = String(activeStep);
  }
  function goStep(index) {
    selectStep(index);
    if (track.scrollWidth > track.clientWidth + 2) {
      const left = cards[activeStep].offsetLeft - cards[0].offsetLeft;
      track.scrollTo({ left, behavior: reduced.matches ? 'instant' : 'smooth' });
    }
  }
  function syncStep() {
    if (track.scrollWidth <= track.clientWidth + 2) return;
    const left = track.getBoundingClientRect().left;
    const index = cards.reduce((best, card, i) => Math.abs(card.getBoundingClientRect().left - left) < Math.abs(cards[best].getBoundingClientRect().left - left) ? i : best, 0);
    selectStep(index);
  }
  previous.addEventListener('click', () => goStep(activeStep - 1));
  next.addEventListener('click', () => goStep(activeStep + 1));
  track.addEventListener('scroll', syncStep, { passive: true });
  track.addEventListener('keydown', event => {
    if(event.target.closest('.hairline-figure'))return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    goStep(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : activeStep + (event.key === 'ArrowRight' ? 1 : -1));
  });
  cards.forEach((card, index) => card.addEventListener('pointerenter', () => {
    if (matchMedia('(hover: hover)').matches) selectStep(index);
  }));
  function updatePosition() {
    scrollFrame = 0;
    let section = sections[0];
    sections.forEach(item => { if(item.getBoundingClientRect().top <= innerHeight * .35) section = item; });
    $('#rail-label').textContent = section.dataset.section;
    chapters.forEach(link => {
      if(link.hash === '#' + section.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    syncStep();
  }
  function schedulePosition() { if(!scrollFrame) scrollFrame=requestAnimationFrame(updatePosition); }
  addEventListener('scroll', schedulePosition, { passive: true });
  addEventListener('resize', schedulePosition, { passive: true });
  $('.method-controls').hidden = false;
  selectStep(0); updatePosition();

  // An illustrative sequence plays once on entry or tab selection, never rotates tabs.
  const demo = $('.product-demo'), replay = $('.demo-replay');
  let timeline = null, seen = new WeakSet(), demoVisible = false;
  const panels = $$('.demo-panel');
  const currentPanel = () => panels.find(panel => !panel.hidden);
  function finishFlow(panel) {
    timeline?.kill();timeline=null;
    if(window.gsap) gsap.set($$('[data-flow-item]',demo),{clearProps:'transform,opacity'});
    $$('[data-flow-item]',demo).forEach(item=>item.removeAttribute('data-flow-state'));
    if(panel)panel.dataset.flowState='complete';
  }
  function playFlow(panel, force=false) {
    finishFlow();
    if(!panel)return;
    if(panel.hasAttribute('data-guided')){finishFlow(panel);return;}
    if(reduced.matches || !window.gsap || (seen.has(panel)&&!force)){finishFlow(panel);return;}
    seen.add(panel);panel.dataset.flowState='running';
    const items=$$('[data-flow-item]',panel);
    timeline=gsap.timeline({onComplete:()=>finishFlow(panel)});
    items.forEach((item,i)=>{
      timeline.fromTo(item,{opacity:.65,y:8},{opacity:1,y:0,duration:.5,ease:'power2.out',clearProps:'transform,opacity'},i*.65);
      timeline.call(()=>{
        items.forEach(row=>row.removeAttribute('data-flow-state'));
        item.dataset.flowState='active';
      },[],i*.65);
    });
    timeline.to({}, {duration:.45});
  }
  const demoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    demoVisible=entry.isIntersecting;
    if(demoVisible)playFlow(currentPanel());else finishFlow(currentPanel());
  }),{threshold:.28});
  demoObserver.observe(demo);
  demo.addEventListener('demo:activate',event=>playFlow(event.target,true));
  replay.hidden=false;replay.addEventListener('click',()=>playFlow(currentPanel(),true));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)timeline?.pause();else if(demoVisible)timeline?.resume();
  });
  reduced.addEventListener('change',()=>{if(reduced.matches)finishFlow(currentPanel());});

  let motion=null;
  if(window.gsap&&window.ScrollTrigger){
    motion=gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)',()=>{
      $$('.section-kicker').forEach(element=>gsap.to(element,{'--line-progress':1,duration:.9,ease:'power2.inOut',scrollTrigger:{trigger:element,start:'top 90%',once:true}}));
      $$('.journey-block,.product-heading,.feature-row,.missed-opportunities li,.contact h2>span,.contact-bottom,.testimonial-slot').forEach(element=>{
        gsap.fromTo(element,{y:18,opacity:.55},{y:0,opacity:1,duration:.65,ease:'power2.out',clearProps:'transform,opacity',scrollTrigger:{trigger:element,start:'top 94%',once:true}});
      });
    });
  }
  addEventListener('pagehide',event=>{
    if(event.persisted)return;
    finishFlow();motion?.revert();demoObserver.disconnect();cancelAnimationFrame(scrollFrame);
    removeEventListener('scroll',schedulePosition);removeEventListener('resize',schedulePosition);
  });
  window.engrenaExperience=Object.freeze({get methodStep(){return activeStep},get flowState(){return currentPanel()?.dataset.flowState},get activePanel(){return currentPanel()?.id}});
})();
