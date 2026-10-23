(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const stage=document.querySelector('#mechanism-stage');
  const progress=document.createElement('div');progress.className='scroll-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
  let tick=0;
  const draw=()=>{tick=0;progress.style.transform=`scaleX(${Math.min(1,scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight))})`};
  const scroll=()=>{if(!tick)tick=requestAnimationFrame(draw)};
  addEventListener('scroll',scroll,{passive:true});addEventListener('resize',scroll,{passive:true});draw();
  let coins=null;
  stage?.addEventListener('workshop:stage',event=>{
    const name=event.detail.stage;
    document.querySelectorAll('[data-workshop-stage]').forEach(node=>node.classList.toggle('is-active',node.dataset.workshopStage===(name==='return'?'service':name)));
    if(name==='service'&&!reduced.matches&&!document.documentElement.classList.contains('motion-paused')&&window.gsap){
      coins?.kill();const tokens=[...document.querySelectorAll('.service-tokens svg')];
      gsap.set(tokens,{x:i=>(i-1)*22,y:12,opacity:0,scale:.75});
      coins=gsap.timeline().to(tokens,{y:-85,opacity:1,scale:1,duration:.8,stagger:.18,ease:'power2.out'}).to(tokens,{y:-115,opacity:0,duration:.4,stagger:.13},.75);
    }
  });
  let choreography=null;
  if(window.gsap&&window.ScrollTrigger){
    choreography=gsap.matchMedia();
    choreography.add('(prefers-reduced-motion: no-preference)',()=>{
      const mm=gsap.timeline({scrollTrigger:{trigger:'#engrena',start:'top 85%',end:'top 25%',scrub:1}});
      mm.fromTo('.solution:first-child .solution-visual',{y:35,rotation:-2},{y:0,rotation:0,ease:'none'},0).fromTo('.solution:last-child .solution-visual',{y:65,rotation:2},{y:0,rotation:0,ease:'none'},0);
      gsap.fromTo('.method-connector',{scaleX:0},{scaleX:1,transformOrigin:'left',duration:.8,stagger:.2,ease:'power2.out',scrollTrigger:{trigger:'#method-track',start:'top 78%',once:true}});
      gsap.fromTo('.product-demo',{y:24},{y:0,ease:'none',scrollTrigger:{trigger:'#chatengrena',start:'top bottom',end:'top 25%',scrub:.8}});
      gsap.fromTo('.contact-gear',{rotation:-22},{rotation:30,ease:'none',scrollTrigger:{trigger:'#contato',start:'top bottom',end:'bottom top',scrub:1.2}});
    });
  }
  const cleanup=()=>{coins?.kill();choreography?.revert();cancelAnimationFrame(tick);removeEventListener('scroll',scroll);removeEventListener('resize',scroll)};
  addEventListener('engrena:motion',event=>{if(event.detail.paused){coins?.kill();window.gsap?.set('.service-tokens svg',{opacity:0})}});
  addEventListener('pagehide',event=>{if(!event.persisted)cleanup()});
})();
