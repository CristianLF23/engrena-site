(() => {
  'use strict';
  const section=document.querySelector('#jornada'),steps=[...document.querySelectorAll('.working-steps>li')];
  if(!section||!steps.length||!window.gsap)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),vertical=matchMedia('(max-width:1000px)');
  let timeline=null,visible=false,disposed=false;
  const bars=steps.slice(0,-1).map(step=>{const bar=document.createElement('span');bar.className='working-progress';bar.setAttribute('aria-hidden','true');step.append(bar);return bar});
  const clear=()=>{steps.forEach(step=>step.classList.remove('journey-current','journey-done'));};
  function build(){
    timeline?.kill();clear();gsap.set(bars,{scaleX:vertical.matches?1:0,scaleY:vertical.matches?0:1});
    timeline=gsap.timeline({paused:true,repeat:-1,repeatDelay:1.1});
    timeline.call(()=>{clear();gsap.set(bars,{scaleX:vertical.matches?1:0,scaleY:vertical.matches?0:1})});
    steps.forEach((step,index)=>{
      timeline.call(()=>{steps.forEach((node,i)=>{node.classList.toggle('journey-current',i===index);node.classList.toggle('journey-done',i<index)});section.dataset.journeyStep=String(index+1)});
      timeline.to({}, {duration:.65});
      if(bars[index])timeline.to(bars[index],{[vertical.matches?'scaleY':'scaleX']:1,duration:1.55,ease:'power1.inOut'});
      else timeline.to({}, {duration:1.55});
    });update();
  }
  function update(){
    if(disposed)return;
    const motionOff=reduced.matches||document.documentElement.classList.contains('motion-paused');
    if(motionOff){timeline?.pause();clear();gsap.set(bars,{opacity:0});return;}
    gsap.set(bars,{opacity:1});
    if(visible&&!document.hidden&&!document.documentElement.classList.contains('intro-active'))timeline?.resume();else timeline?.pause();
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update()},{threshold:.1});observer.observe(section);
  reduced.addEventListener('change',update);vertical.addEventListener('change',build);document.addEventListener('visibilitychange',update);addEventListener('engrena:motion',update);addEventListener('engrena:intro-end',update);build();
  addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;timeline?.kill();observer.disconnect();reduced.removeEventListener('change',update);vertical.removeEventListener('change',build);document.removeEventListener('visibilitychange',update);removeEventListener('engrena:motion',update);removeEventListener('engrena:intro-end',update)});
})();
