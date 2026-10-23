(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const paused=()=>reduced.matches||document.hidden||document.documentElement.classList.contains('motion-paused');
  const animations=[];let disposed=false;
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{
    const record=animations.find(record=>record.element===entry.target);if(!record)return;
    record.visible=entry.isIntersecting;record.update();
  })},{threshold:.2});
  document.querySelectorAll('[data-solution-story]').forEach(element=>{
    const steps=[...element.querySelectorAll('[data-story-step]')],progress=element.querySelector('.story-progress');
    const record={element,visible:false,timeline:null,update(){
      if(!window.gsap||paused()||!this.visible){this.timeline?.pause();return;}
      if(this.timeline){this.timeline.resume();return;}
      this.timeline=gsap.timeline({repeat:-1,repeatDelay:1.2});
      steps.forEach((step,i)=>{
        this.timeline.call(()=>{steps.forEach(node=>node.classList.toggle('is-current',node===step));element.dataset.storyStage=String(i)});
        this.timeline.to(progress,{scaleX:(i+1)/steps.length,duration:.65,ease:'power2.inOut'}).to({},{duration:1.7});
      });
      this.timeline.set(progress,{scaleX:.05});
    }};
    animations.push(record);observer.observe(element);
  });
  const panel=document.querySelector('[data-guided]'),demo=panel?.closest('.product-demo');
  const frames=panel?[...panel.querySelectorAll('[data-guide-frame]')]:[],buttons=panel?[...panel.querySelectorAll('[data-guide-step]')]:[];
  let sequence=null,frameTween=null,guideResize=null,started=false,manual=false,hovered=false,current=0;
  const measureFrames=()=>{
    const viewport=panel?.querySelector('.guided-viewport');if(!viewport)return;
    let height=0;
    frames.forEach(frame=>{
      const copy=frame.cloneNode(true);copy.hidden=false;
      Object.assign(copy.style,{position:'absolute',visibility:'hidden',pointerEvents:'none',inset:'0 auto auto 0',width:'100%',height:'auto',transform:'none'});
      viewport.append(copy);height=Math.max(height,copy.getBoundingClientRect().height);copy.remove();
    });
    viewport.style.minHeight=Math.ceil(height+2)+'px';
  };
  const activate=(index,animate=false)=>{
    current=index;frameTween?.kill();
    frames.forEach((frame,i)=>{frame.hidden=i!==index;frame.style.removeProperty('opacity');frame.style.removeProperty('transform')});
    buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    panel.dataset.guideStage=String(index);
    if(animate&&window.gsap&&!paused())frameTween=gsap.fromTo(frames[index],{y:8,opacity:.35},{y:0,opacity:1,duration:.55,ease:'power2.out',clearProps:'transform,opacity'});
  };
  const guide={element:demo,visible:false,update(){
    if(!panel||!window.gsap)return;
    const active=!panel.hidden;
    if(paused()||!this.visible||!active||manual||hovered){sequence?.pause();return;}
    if(sequence){sequence.resume();return;}
    if(started)return;started=true;
    sequence=gsap.timeline({onComplete:()=>{panel.dataset.guideState='complete'}});
    frames.forEach((_,i)=>{sequence.call(()=>activate(i,true)).to({},{duration:5.2})});
  }};
  if(panel&&demo){
    panel.dataset.guideState='ready';activate(0);animations.push(guide);observer.observe(demo);
    let lastWidth=0;guideResize=new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(Math.abs(lastWidth-width)>1){lastWidth=width;measureFrames()}});guideResize.observe(panel.querySelector('.guided-viewport'));document.fonts?.ready.then(measureFrames);
    buttons.forEach((button,i)=>button.addEventListener('click',()=>{manual=true;sequence?.pause();activate(i,true);panel.dataset.guideState='manual'}));
    demo.addEventListener('demo:activate',()=>guide.update());
    demo.querySelector('.demo-replay')?.addEventListener('click',()=>{
      if(panel.hidden)return;manual=false;started=false;sequence?.kill();sequence=null;activate(0);guide.update();
    });
    panel.addEventListener('focusin',()=>{manual=true;sequence?.pause()});
    panel.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;sequence?.pause()}});
    panel.addEventListener('pointerleave',()=>{hovered=false;guide.update()});
  }
  const update=()=>{if(!disposed)animations.forEach(record=>record.update())};
  reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update);addEventListener('engrena:motion',update);
  addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;observer.disconnect();guideResize?.disconnect();sequence?.kill();frameTween?.kill();animations.forEach(record=>record.timeline?.kill());reduced.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);removeEventListener('engrena:motion',update)});
  window.engrenaClarity={get stage(){return current},get running(){return !!sequence?.isActive()},get manual(){return manual},get stories(){return animations.filter(r=>r!==guide).map(r=>({visible:r.visible,running:!!r.timeline?.isActive()}))}};
})();
