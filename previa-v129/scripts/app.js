(() => {
  'use strict';
  const appURL = document.currentScript.src;
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const loader=$('#intro-loader'), contact=$('#contact-dialog'), menu=$('#menu-dialog'), privacy=$('#privacy-dialog');
  const stage=$('#mechanism-stage'), explore=$('#explore-mechanism');
  const originalDescription=$('#mechanism-description').textContent;
  const hero=$('#inicio'),mechanismImage=$('.mechanism-image');
  const gearImage={src:mechanismImage.getAttribute('src'),srcset:mechanismImage.getAttribute('srcset'),alt:mechanismImage.alt};
  const originalImage={src:'assets/images/mechanism-original.webp',srcset:'assets/images/mechanism-original-small.webp 1086w, assets/images/mechanism-original.webp 2172w',alt:'Três peças industriais originais em aço escuro, azul e prata, em perspectiva oblíqua.'};
  let heroVariant='gears';
  let introAssembly=null,introAssemblyFrame=0;
  let introDone=false, introTimeline=null, introRun=0, introReturnFocus=null, introTimer=0;
  let introScene=null, introPoseTimeline=null, introLostHandler=null;
  let scene=null, sceneActive=false, sceneProgress=0, selectedPiece=null, sceneStarting=false, sceneAttempt=0;
  let sceneStartFrame=0;
  let counterStarted=false, contactCompleted=false, counterStart=0, elapsed=0, counterSeconds=0, interval=0;
  const illustrativeRate=10;
  let heroVisible=true, contactVisible=false, footerVisible=false, scrollFrame=0;
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  async function loadSymbols(){
    const mounts=$$('[data-brand-symbol]');
    try{
      const response=await fetch(new URL('../assets/brand/symbol.svg',appURL));
      if(!response.ok)throw new Error('Symbol unavailable');
      const source=await response.text();
      mounts.forEach((mount,i)=>{
        const svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
        const ids=$$('[id]',svg).map(e=>e.id);
        $$('[id]',svg).forEach(e=>{
          if(e.id.includes('gear-piece-'))e.dataset.gearPiece=e.id.split('gear-piece-')[1];
          e.id='brand-'+i+'-'+e.id;
        });
        [svg,...$$('*',svg)].forEach(e=>[...e.attributes].forEach(attr=>{
          let value=attr.value;
          ids.forEach(id=>{
            value=value.replaceAll('url(#'+id+')','url(#brand-'+i+'-'+id+')');
            if(value==='#'+id)value='#brand-'+i+'-'+id;
            if(attr.name==='aria-labelledby')value=value.split(' ').map(v=>v===id?'brand-'+i+'-'+id:v).join(' ');
          });
          e.setAttribute(attr.name,value);
        }));
        svg.setAttribute('aria-hidden','true');svg.removeAttribute('role');
        mount.replaceChildren(document.importNode(svg,true));
      });
    }catch{
      mounts.forEach(mount=>{
        const image=new Image();image.src=new URL('../assets/brand/symbol.svg',appURL).href;image.alt='';image.width=128;image.height=128;
        mount.replaceChildren(image);
      });
    }
  }
  function releaseIntro(run) {
    if(run!==introRun)return;
    const wasActive=document.documentElement.classList.contains('intro-active');
    const hadIntroFocus=loader.contains(document.activeElement);
    clearTimeout(introTimer);cancelAnimationFrame(introAssemblyFrame);introAssemblyFrame=0;introAssembly?.kill();
    clearTimeout(window.engrenaIntroBoot?.timer);
    loader.hidden=true;loader.setAttribute('aria-hidden','true');
    introPoseTimeline?.kill();introScene?.dispose();introScene=null;
    if(introLostHandler)$('#intro-gear')?.removeEventListener('premiumgear:lost',introLostHandler);
    introLostHandler=null;
    $('#intro-gear')?.classList.remove('has-scene','scene-preparing');
    document.documentElement.classList.remove('intro-active');
    $('#site-content').inert=false;
    updateFloating();
    const skip=$('#skip-intro');skip.disabled=true;skip.tabIndex=-1;
    if(hadIntroFocus){
      const target=introReturnFocus?.isConnected&&!loader.contains(introReturnFocus)?introReturnFocus:$('#conteudo');
      if(target){target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
    }
    window.ScrollTrigger?.refresh();
    queueHeroScene();
    if(wasActive)dispatchEvent(new CustomEvent('engrena:intro-end'));
  }
  let portalProgress=0;
  const portalSVG=$('#brand-portal'),portalBrand=$('#portal-brand'),portalCut=$('#portal-cut');
  const portalSurface=portalBrand?.parentElement;
  const portalBounds=['portal-mask-base','portal-paper','brand-portal-mask'].map(id=>$('#'+id));
  let portalViewport=null;
  function sizePortal(){
    const width=innerWidth,height=innerHeight;
    if(portalViewport?.width===width&&portalViewport?.height===height)return;
    portalViewport={width,height,initial:Math.min(width*.78/540,1.7),final:Math.hypot(width,height)/18};
    portalSVG?.setAttribute('viewBox',`0 0 ${width} ${height}`);
    portalBounds.forEach(node=>{node?.setAttribute('width',width);node?.setAttribute('height',height)});
  }
  function paintPortal(value=portalProgress){
    portalProgress=value;
    if(!portalSVG)return;if(!portalViewport)sizePortal();
    const{width,height,initial,final}=portalViewport;
    const scale=initial*Math.pow(final/initial,value);
    const anchorX=270+(303.5-270)*Math.min(1,value*2),anchorY=64+(69.5-64)*Math.min(1,value*2);
    const transform=`translate(${width/2-anchorX*scale} ${height/2-anchorY*scale}) scale(${scale})`;
    portalBrand.setAttribute('transform',transform);portalCut.setAttribute('transform',transform);
    loader.dataset.portalProgress=value.toFixed(3);
  }
  addEventListener('resize',()=>{if(document.documentElement.classList.contains('intro-active')){sizePortal();paintPortal()}},{passive:true});
  function finishIntro(immediate=false){
    const completedRun=introRun;
    if(introDone){if(immediate){introTimeline?.kill();releaseIntro(completedRun);}return;}
    introDone=true;clearTimeout(introTimer);scene?.reveal();
    if(immediate||reduced.matches){introTimeline?.kill();releaseIntro(completedRun);return;}
    loader.dataset.zoomStartedAfterAssembly=String(loader.dataset.assembly==='complete');
    portalSurface?.setAttribute('mask','url(#brand-portal-mask)');
    loader.classList.add('leaving');
    if(window.gsap){
      const camera={value:0};
      introTimeline=gsap.timeline({onComplete:()=>releaseIntro(completedRun)})
        .to($('#skip-intro'),{opacity:0,duration:.2},0)
        .to(camera,{value:1,duration:1.35,ease:'power2.inOut',onUpdate:()=>paintPortal(camera.value)},0)
        .to($('#brand-portal'),{opacity:0,duration:.18},1.18);
    }else releaseIntro(completedRun);
    setTimeout(()=>releaseIntro(completedRun),1700);
  }
  const symbolsReady=loadSymbols();
  window.engrenaSkipIntro=()=>finishIntro(true);

  function updateFloating(){
    document.body.classList.toggle('hero-is-visible',heroVisible);
    $('#floating-contact').classList.toggle('is-visible',!document.documentElement.classList.contains('intro-active')&&!$('dialog[open]'));
  }
  function show(dialog){if(!dialog.open){dialog.showModal();entrance(dialog)}$('#floating-contact').classList.remove('is-visible')}
  function entrance(element){
    if(reduced.matches||!element?.animate)return;
    element.getAnimations().forEach(animation=>animation.cancel());
    element.animate([{opacity:.55,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  function close(dialog){if(dialog.open)dialog.close()}
  [contact,menu,privacy].forEach(dialog=>{
    dialog.addEventListener('click',e=>{
      if(e.target!==dialog)return;
      const r=dialog.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close(dialog);
    });
    dialog.addEventListener('close',updateFloating);
  });
  $('#menu-trigger').addEventListener('click',()=>{finishIntro();show(menu)});
  $('[data-close-menu]').addEventListener('click',()=>close(menu));
  $$('nav a[href^="#"]',menu).forEach(link=>link.addEventListener('click',()=>close(menu)));
  $('#privacy-trigger').addEventListener('click',()=>show(privacy));
  $('[data-close-privacy]').addEventListener('click',()=>close(privacy));
  $$('[data-close-contact]').forEach(button=>button.addEventListener('click',()=>close(contact)));

  function renderCounter(){
    $('#elapsed-time').textContent=[Math.floor(elapsed/3600),Math.floor(elapsed%3600/60),elapsed%60].map(n=>String(n).padStart(2,'0')).join(':');
    const value=$('#missed-value'),formatted='- '+money.format(counterSeconds*illustrativeRate);
    if(value.textContent!==formatted){value.textContent=formatted;}
    const bucket=Math.floor(counterSeconds/2);
    if(!reduced.matches&&bucket!==Number(value.dataset.tick||0)){value.dataset.tick=String(bucket);value.animate([{transform:'translateY(2px)'},{transform:'translateY(0)'}],{duration:180,easing:'ease-out'});}
  }
  function stopCounter(){
    if(counterStarted&&!contactCompleted){counterSeconds=(performance.now()-counterStart)/1000;elapsed=Math.floor(counterSeconds);renderCounter()}
    contactCompleted=true;clearInterval(interval);
    $('.counter-block .counter-foot').textContent='Formulário concluído. Contadores pausados.';
  }
  const counterObserver=new IntersectionObserver(entries=>{
    if(!entries.some(e=>e.isIntersecting)||counterStarted||contactCompleted)return;
    counterStarted=true;counterStart=performance.now();elapsed=0;counterSeconds=0;renderCounter();
    interval=setInterval(()=>{counterSeconds=(performance.now()-counterStart)/1000;elapsed=Math.floor(counterSeconds);renderCounter()},50);
    counterObserver.disconnect();
  },{threshold:.25});
  counterObserver.observe($('.counter-grid'));

  document.addEventListener('engrena:contact-demo-complete',()=>stopCounter());
  $$('[data-open-contact]').forEach(button=>button.addEventListener('click',e=>{
    if(!window.engrenaContact)return;
    e.preventDefault();finishIntro();close(menu);
    window.engrenaContact.open(button);
  }));

  const tabs=$$('[role="tab"]');
  function activateTab(tab){
    const changed=tab.getAttribute('aria-selected')!=='true';
    tabs.forEach(item=>{
      const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;
      $('#'+item.getAttribute('aria-controls')).hidden=!selected;
    });
    if(changed){const panel=$('#'+tab.getAttribute('aria-controls'));entrance(panel);panel.dispatchEvent(new CustomEvent('demo:activate',{bubbles:true}));}
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>activateTab(tab));
    tab.addEventListener('keydown',e=>{
      let next=i;
      if(e.key==='ArrowRight')next=(i+1)%tabs.length;
      else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
      else if(e.key==='Home')next=0;
      else if(e.key==='End')next=tabs.length-1;
      else return;
      e.preventDefault();activateTab(tabs[next]);tabs[next].focus();
    });
  });

  const descriptions=[
    'Vender mais: atrair pessoas que precisam dos serviços da sua oficina.',
    'Vender melhor: treinar a equipe, responder e acompanhar cada orçamento.',
    'Vender com recorrência: manter o contato para o cliente voltar no próximo serviço.'
  ];
  $$('.mechanism-label').forEach((button,i)=>button.addEventListener('click',()=>{
    selectedPiece=selectedPiece===i?null:i;
    $$('.mechanism-label').forEach((b,j)=>b.setAttribute('aria-pressed',String(j===selectedPiece)));
    $('#mechanism-description').textContent=selectedPiece===null?originalDescription:descriptions[selectedPiece];
    scene?.setFocus(selectedPiece);
  }));
  function exploreLabel(playing){
    if(!explore)return;
    explore.replaceChildren(document.createTextNode(sceneActive?(playing?'Pausar animação':'Retomar animação'):'Ativar animação'));
    const icon=document.createElement('span');icon.className='loop-control-icon';icon.classList.toggle('is-playing',playing);icon.setAttribute('aria-hidden','true');
    explore.append(icon);explore.setAttribute('aria-pressed',String(playing));
  }
  function canAnimate(){return heroVariant==='gears'&&!reduced.matches&&!document.documentElement.classList.contains('motion-paused')&&!saveData&&location.protocol!=='file:'}
  function selectHeroVariant(variant,updateURL=true){
    heroVariant=variant==='original'?'original':'gears';sceneAttempt++;
    scene?.dispose();scene=null;sceneActive=false;
    const image=heroVariant==='original'?originalImage:gearImage;
    mechanismImage.srcset=image.srcset||'';mechanismImage.src=image.src;mechanismImage.alt=image.alt;
    hero.dataset.heroVariant=heroVariant;
    if(explore)explore.hidden=!canAnimate();exploreLabel(false);
    if(updateURL){
      const url=new URL(location.href);
      if(heroVariant==='original')url.searchParams.set('abertura','original');else url.searchParams.delete('abertura');
      history.replaceState(null,'',url);
    }
    if(introDone&&canAnimate())startScene();
  }
  $('.header-context').hidden=true;
  selectHeroVariant(heroVariant,false);
  stage.addEventListener('mechanism:fallback',()=>{
    scene=null;sceneActive=false;exploreLabel(false);
    $('#mechanism-description').textContent=selectedPiece===null?originalDescription:descriptions[selectedPiece];
  });
  async function startScene(){
    if(!canAnimate()||sceneStarting||sceneActive||!heroVisible||document.hidden||document.documentElement.classList.contains('intro-active'))return;
    const attempt=++sceneAttempt;sceneStarting=true;
    if(explore){explore.hidden=false;explore.disabled=true;explore.textContent='Preparando animação';}
    try{
      const {initMechanism}=await import(new URL('workshop-spatial.js?v=1.25',appURL));
      if(attempt!==sceneAttempt||!canAnimate())return;
      const nextScene=await initMechanism(stage,{holdAssembly:!introDone});
      if(attempt!==sceneAttempt||!canAnimate()){nextScene.dispose();return}
      scene=nextScene;if(scene.stats.fallback)throw new Error('Fallback active');if(introDone)scene.reveal();
      scene.setProgress(sceneProgress);scene.setFocus(selectedPiece);sceneActive=true;exploreLabel(true);
    }catch{
      scene?.dispose();scene=null;stage.classList.remove('scene-ready');
      sceneActive=false;exploreLabel(false);
    }finally{
      sceneStarting=false;if(explore){explore.disabled=false;explore.hidden=!canAnimate();}
      if(attempt!==sceneAttempt&&canAnimate()&&!sceneActive)queueMicrotask(startScene);
    }
  }
  function queueHeroScene(){
    if(sceneStartFrame||sceneStarting||sceneActive||!canAnimate()||!heroVisible||document.hidden||document.documentElement.classList.contains('intro-active'))return;
    // Present the revealed page before geometry and shader preparation begin.
    // The existing capture of this scene remains visible until its first render.
    sceneStartFrame=requestAnimationFrame(()=>{
      sceneStartFrame=requestAnimationFrame(()=>{sceneStartFrame=0;startScene()});
    });
  }
  const replayIntro=$('#replay-intro');
  function beginIntro(replay=false){
    const run=++introRun;
    introTimeline?.kill();clearTimeout(introTimer);
    if(reduced.matches||saveData||document.documentElement.classList.contains('motion-paused')||(!replay&&window.engrenaIntroBoot?.expired)){
      introDone=false;finishIntro(true);return;
    }
    introReturnFocus=document.activeElement instanceof HTMLElement&&document.activeElement!==document.body?document.activeElement:null;
    introDone=false;
    loader.getAnimations().forEach(animation=>animation.cancel());
    loader.querySelectorAll('.loader-top,.loader-bottom,.loader-caption,.loader-symbol,.loader-identity').forEach(el=>el.removeAttribute('style'));
    loader.removeAttribute('style');loader.classList.remove('leaving');loader.hidden=false;
    document.documentElement.classList.add('intro-active');
    $('#site-content').inert=true;
    loader.setAttribute('aria-hidden','false');$('#skip-intro').disabled=false;$('#skip-intro').tabIndex=0;
    loader.focus({preventScroll:true});
    sizePortal();paintPortal(0);
    // The full-screen mask is needed only for the zoom, not letter assembly.
    portalSurface?.removeAttribute('mask');
    $('#brand-portal').style.opacity='1';
    cancelAnimationFrame(introAssemblyFrame);introAssemblyFrame=0;introAssembly?.kill();
    let brandReady=Promise.resolve();
    if(window.gsap){
      let resolveBrand;brandReady=new Promise(resolve=>{resolveBrand=resolve});
      const parts=$$('[data-portal-piece]'),letters=$$('[data-portal-letter]');
      gsap.set(parts,{opacity:0,x:i=>[-34,-20,30][i],y:i=>[-24,28,18][i],rotation:i=>[-13,9,12][i],transformOrigin:'50% 50%'});
      gsap.set(letters,{opacity:0,x:i=>(i%2?-1:1)*(18+i*2),y:i=>i%2?28:-28,rotation:i=>i%2?8:-8,transformOrigin:'50% 50%'});
      gsap.set('#portal-cut',{opacity:0});loader.dataset.assembly='preparing';
      introAssembly=gsap.timeline({paused:true,onStart:()=>{loader.dataset.assembly='building'},onComplete:()=>{loader.dataset.assembly='complete';resolveBrand()},onInterrupt:()=>resolveBrand()})
        .to(parts,{x:0,y:0,rotation:0,opacity:1,duration:.6,stagger:.13,ease:'power3.out'},0)
        .to(letters,{x:0,y:0,rotation:0,opacity:1,duration:.62,stagger:.075,ease:'power3.out'},.3)
        .to('#portal-cut',{opacity:1,duration:.01},1.38);
      introAssemblyFrame=requestAnimationFrame(()=>{
        introAssemblyFrame=requestAnimationFrame(()=>{introAssemblyFrame=0;if(run===introRun&&!introDone)introAssembly?.play()});
      });
    }

    // Restart CSS brand choreography, including cached/replayed introductions.
    loader.querySelectorAll('.loader-symbol,.loader-symbol svg,.loader-symbol [data-gear-piece],.loader-progress i').forEach(el=>el.getAnimations().forEach(animation=>{animation.cancel();animation.play();}));
    if(replay){scene?.prepareIntro();exploreLabel(true);}
    Promise.all([
      Promise.race([Promise.allSettled([document.fonts.ready,mechanismImage.decode?.(),symbolsReady]),new Promise(resolve=>setTimeout(resolve,1400))]),
      new Promise(resolve=>setTimeout(resolve,1550)),brandReady
    ]).then(()=>{if(run===introRun)finishIntro();});
    introTimer=setTimeout(()=>{if(run===introRun)finishIntro(true);},4100);
  }

  if(replayIntro)replayIntro.hidden=reduced.matches||saveData;
  replayIntro?.addEventListener('click',()=>{if(heroVariant==='original')selectHeroVariant('gears');beginIntro(true);});
  beginIntro();
  explore?.addEventListener('click',()=>{
    if(!sceneActive){startScene();return}
    const pause=!scene.stats.paused;scene.setPaused(pause);exploreLabel(!pause);
  });
  reduced.addEventListener('change',()=>{
    if(replayIntro)replayIntro.hidden=reduced.matches||saveData;
    if(reduced.matches){
      sceneAttempt++;
      scene?.dispose();scene=null;sceneActive=false;stage.classList.remove('scene-ready');if(explore)explore.hidden=true;finishIntro();
    }else{if(explore)explore.hidden=!canAnimate();exploreLabel(false);if(introDone)startScene()}
  });
  addEventListener('engrena:motion',event=>{
    selectHeroVariant(heroVariant,false);
    if(replayIntro)replayIntro.hidden=reduced.matches||saveData||event.detail.paused;
    if(event.detail.paused)finishIntro(true);
  });

  const visibility=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.target.id==='inicio'){heroVisible=e.isIntersecting;if(heroVisible&&introDone)queueHeroScene();}
      if(e.target.id==='contato')contactVisible=e.isIntersecting;
      if(e.target.classList.contains('site-footer'))footerVisible=e.isIntersecting;
    });updateFloating();
  },{threshold:.01});
  [$('#inicio'),$('#contato'),$('.site-footer')].forEach(e=>visibility.observe(e));
  const sections=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting)$('#rail-label').textContent=e.target.dataset.section});
  },{rootMargin:'-10% 0px -55% 0px',threshold:0});
  $$('[data-section]').forEach(e=>sections.observe(e));
  function updateScroll(){
    scrollFrame=0;
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    $('#rail-progress').style.transform='scaleY('+Math.min(1,scrollY/max)+')';
    if(!window.ScrollTrigger||reduced.matches){
      const r=$('#inicio').getBoundingClientRect();
      sceneProgress=Math.max(0,Math.min(1,-r.top/Math.max(1,r.height*.8)));scene?.setProgress(sceneProgress);
    }
  }
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll)},{passive:true});
  addEventListener('resize',updateScroll,{passive:true});updateScroll();
  let motion=null;
  if(window.gsap&&window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);motion=gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)',()=>{
      ScrollTrigger.create({trigger:'#inicio',start:'top top',end:'bottom top',onUpdate:self=>{
        sceneProgress=self.progress;scene?.setProgress(sceneProgress);
      }});
      $$('.section-kicker,.about h2,.product-heading,.results-heading,.inertia-intro,.faq-heading').forEach(e=>{
        gsap.fromTo(e,{y:20,opacity:.45},{y:0,opacity:1,duration:.65,ease:'power2.out',clearProps:'transform,opacity',scrollTrigger:{trigger:e,start:'top 93%',once:true}});
      });
      gsap.fromTo('.method-art',{y:12},{y:-12,ease:'none',scrollTrigger:{trigger:'#metodo',start:'top bottom',end:'bottom top',scrub:.8}});
    });
    document.fonts.ready.then(()=>{if(!document.documentElement.classList.contains('intro-active'))ScrollTrigger.refresh()});
  }
  addEventListener('pagehide',e=>{
    if(e.persisted)return;sceneAttempt++;cancelAnimationFrame(sceneStartFrame);sceneStartFrame=0;cancelAnimationFrame(introAssemblyFrame);introAssemblyFrame=0;scene?.dispose();introPoseTimeline?.kill();introScene?.dispose();motion?.revert();clearInterval(interval);
    counterObserver.disconnect();visibility.disconnect();sections.disconnect();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&introDone)queueHeroScene()});
  window.engrenaPreview=Object.freeze({
    version:'1.28',externalTransmission:false,
    get heroVariant(){return heroVariant},
    get counter(){return{started:counterStarted,elapsed,seconds:counterSeconds,rate:illustrativeRate,stopped:contactCompleted}},
    get scene(){return scene?{...scene.stats,active:sceneActive}:{active:false}}
  });
})();
