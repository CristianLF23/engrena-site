(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = $$('[data-method-step]');
  const route = $$('.method-route li');
  const examples = [
    ['Uma busca vira oportunidade.', 'O cliente precisa revisar o carro. A campanha e o site ajudam sua oficina a ser encontrada.'],
    ['A oportunidade ganha direção.', 'A equipe recebe a conversa, entende a necessidade e acompanha o orçamento até uma decisão.'],
    ['O atendimento prepara o retorno.', 'Depois do serviço, o histórico e as rotinas de contato ajudam a manter o relacionamento.']
  ];
  let activeStep = -1, scrollFrame = 0;
  function selectStep(index) {
    if (index === activeStep) return;
    activeStep = index;
    cards.forEach((card, i) => card.classList.toggle('is-current', i === index));
    route.forEach((item, i) => item.classList.toggle('is-current', i === index));
    $('.method-position').textContent = '0' + (index + 1) + ' / 03';
    $('#method-example-title').textContent = examples[index][0];
    $('#method-example-copy').textContent = examples[index][1];
    if (!reduced.matches) $('.method-example').animate([{opacity:.45, transform:'translateY(6px)'},{opacity:1, transform:'translateY(0)'}], {duration:240, easing:'ease-out'});
    $('#metodo').dataset.activeStep = String(index);
  }
  const chapters = $$('.rail-chapters a');
  const sections = $$('section[data-section]');
  function updatePosition() {
    scrollFrame = 0;
    const target = innerHeight * .5;
    let index = 0;
    cards.forEach((card, i) => { if (card.getBoundingClientRect().top < target) index = i; });
    selectStep(index);
    const bounds = $('.method-stack').getBoundingClientRect();
    $('.method-stack').style.setProperty('--method-progress', String(Math.max(0,Math.min(1,(target-bounds.top)/bounds.height))));
    let section = sections[0];
    sections.forEach(item => { if(item.getBoundingClientRect().top <= innerHeight * .35) section = item; });
    $('#rail-label').textContent = section.dataset.section;
    chapters.forEach(link => {
      if(link.hash === '#'+section.id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  function schedulePosition() { if(!scrollFrame) scrollFrame=requestAnimationFrame(updatePosition); }
  addEventListener('scroll',schedulePosition,{passive:true});
  addEventListener('resize',schedulePosition,{passive:true});
  updatePosition();

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
      $$('.journey-block,.product-copy>.eyebrow,.product-copy>h2,.feature-row,.missed-opportunities li,.contact h2>span,.contact-bottom,.testimonial-slot').forEach(element=>{
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
