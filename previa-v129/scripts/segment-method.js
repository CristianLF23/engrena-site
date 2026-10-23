(() => {
  'use strict';
  const band=document.querySelector('.segments-band'),track=band?.querySelector('.segments-track');
  const seed=track?.querySelector('.segments-group'),items=seed?[...seed.children].map(n=>n.cloneNode(true)):[];
  let frame=0,lastWidth=0,observer=null;
  function fillBand(){
    frame=0;if(!track||!items.length||document.documentElement.classList.contains('intro-active'))return;
    const width=band.clientWidth;if(width===lastWidth)return;lastWidth=width;
    const group=document.createElement('div');group.className='segments-group';
    items.forEach(n=>group.append(n.cloneNode(true)));track.replaceChildren(group);
    // Cover the viewport with full sets, then duplicate exactly one full lane.
    group.style.minWidth='0';group.style.justifyContent='flex-start';
    const unit=group.getBoundingClientRect().width;
    const sets=Math.max(1,Math.ceil((width+1)/Math.max(1,unit)));
    for(let i=1;i<sets;i++)items.forEach(n=>group.append(n.cloneNode(true)));
    const distance=group.getBoundingClientRect().width;
    track.append(group.cloneNode(true));
    track.style.setProperty('--segments-distance',-distance+'px');
    track.style.setProperty('--segments-duration',Math.max(20,distance/35)+'s');
  }
  const resize=()=>{if(!frame)frame=requestAnimationFrame(fillBand)};
  const words=document.querySelector('.method-words');
  const visible={band:true,words:false};
  function update(){const paused=document.hidden||document.documentElement.classList.contains('intro-active')||document.documentElement.classList.contains('motion-paused');if(track)track.style.animationPlayState=paused||!visible.band?'paused':'running';words?.classList.toggle('is-cycling',true);words?.querySelectorAll('span').forEach(n=>{n.style.animationPlayState=paused||!visible.words?'paused':'running'})}
  function start(){lastWidth=0;resize();update()}
  if(band&&track){observer=new ResizeObserver(resize);observer.observe(band);document.fonts.ready.then(()=>{lastWidth=0;resize()})}
  const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.target===band)visible.band=e.isIntersecting;if(e.target===words)visible.words=e.isIntersecting});update()},{threshold:0});if(band)io.observe(band);if(words)io.observe(words);
  addEventListener('engrena:intro-end',start);addEventListener('engrena:motion',update);document.addEventListener('visibilitychange',update);
  if(!document.documentElement.classList.contains('intro-active'))start();
  addEventListener('pagehide',e=>{if(e.persisted)return;cancelAnimationFrame(frame);observer?.disconnect();io.disconnect();removeEventListener('engrena:intro-end',start);removeEventListener('engrena:motion',update);document.removeEventListener('visibilitychange',update)});
})();
