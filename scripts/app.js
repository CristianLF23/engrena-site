(() => {
  'use strict';
  const appURL = document.currentScript.src;
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const loader=$('#intro-loader'), contact=$('#contact-dialog'), menu=$('#menu-dialog'), privacy=$('#privacy-dialog');
  const form=$('#qualification-form'), steps=$$('[data-form-step]'), stage=$('#mechanism-stage'), explore=$('#explore-mechanism');
  const originalDescription=$('#mechanism-description').textContent;
  let introDone=false, formStep=0, formCompleted=false, opener=null;
  let scene=null, sceneActive=false, sceneProgress=0, selectedPiece=null;
  let counterStarted=false, contactStarted=false, counterStart=0, elapsed=0, interval=0;
  let heroVisible=true, contactVisible=false, footerVisible=false, scrollFrame=0;
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const storage={
    get(){try{return sessionStorage.getItem('engrena-intro-v1')}catch{return null}},
    set(){try{sessionStorage.setItem('engrena-intro-v1','seen')}catch{}}
  };
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
        if(mount.classList.contains('form-brand'))$$('[fill="#1261F4"],[fill="#00CFFF"]',svg).forEach(e=>e.setAttribute('fill','#fff'));
        mount.replaceChildren(document.importNode(svg,true));
      });
    }catch{
      mounts.forEach(mount=>{
        const image=new Image();image.src=new URL('../assets/brand/'+(mount.classList.contains('form-brand')?'symbol-white.svg':'symbol.svg'),appURL).href;image.alt='';image.width=128;image.height=128;
        mount.replaceChildren(image);
      });
    }
  }
  function finishIntro(){
    if(introDone)return;introDone=true;
    loader.classList.add('leaving');loader.setAttribute('aria-hidden','true');
    $('#skip-intro').disabled=true;$('#skip-intro').tabIndex=-1;storage.set();
    if(window.gsap&&!reduced.matches)gsap.fromTo('.hero-heading',{y:16},{y:0,duration:.7,ease:'power2.out',clearProps:'transform'});
    setTimeout(()=>{loader.hidden=true},reduced.matches?0:450);
  }
  const symbolsReady=loadSymbols();
  if(reduced.matches||storage.get()==='seen')finishIntro();
  else{
    loader.setAttribute('aria-hidden','false');$('#skip-intro').tabIndex=0;
    Promise.race([Promise.allSettled([document.fonts.ready,$('.mechanism-image').decode?.(),symbolsReady]),new Promise(r=>setTimeout(r,1800))]).then(finishIntro);
  }
  $('#skip-intro').addEventListener('click',finishIntro);
  setTimeout(finishIntro,2300);

  function updateFloating(){
    $('#floating-contact').classList.toggle('is-visible',!heroVisible&&!contactVisible&&!footerVisible&&!$('dialog[open]'));
  }
  function show(dialog){if(!dialog.open)dialog.showModal();$('#floating-contact').classList.remove('is-visible')}
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
    $('#missed-value').textContent=money.format(elapsed);
  }
  function stopCounter(){
    if(counterStarted&&!contactStarted){elapsed=Math.floor((performance.now()-counterStart)/1000);renderCounter()}
    contactStarted=true;clearInterval(interval);
    $('.counter-block .counter-foot').textContent='Você deu o próximo passo.';
  }
  const counterObserver=new IntersectionObserver(entries=>{
    if(!entries.some(e=>e.isIntersecting)||counterStarted||contactStarted)return;
    counterStarted=true;counterStart=performance.now();elapsed=0;renderCounter();
    interval=setInterval(()=>{elapsed=Math.floor((performance.now()-counterStart)/1000);renderCounter()},1000);
    counterObserver.disconnect();
  },{threshold:.25});
  counterObserver.observe($('.counter-grid'));

  function setStep(step,focus=true){
    formStep=step;
    steps.forEach((fieldset,i)=>{fieldset.hidden=i!==step;fieldset.disabled=i!==step});
    $$('[data-step-indicator]').forEach((e,i)=>{
      e.classList.toggle('active',i===step);
      if(i===step)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');
    });
    if(focus)$('input,select',steps[step])?.focus({preventScroll:true});
    if(step===1){
      const title=document.createElement('strong'),place=document.createElement('span');
      title.textContent=$('#workshop').value.trim();
      place.textContent=$('#city').value.trim()+', '+$('#state').value;
      $('#form-recap').replaceChildren(title,place);
    }
  }
  setStep(0,false);
  const labels={workshop:'o nome da oficina',city:'a cidade',state:'o estado',revenue:'a faixa de faturamento',interest:'seu interesse','contact-name':'seu nome',whatsapp:'um WhatsApp válido com DDD'};
  function nationalPhone(value){
    let digits=value.replace(/\D/g,'');
    if(digits.startsWith('55')&&(digits.length===12||digits.length===13))digits=digits.slice(2);
    return digits;
  }
  function validate(step){
    const invalid=[];
    $$('input,select',steps[step]).forEach(control=>{
      let valid=Boolean(control.value.trim())&&control.checkValidity();
      if(control.id==='whatsapp')valid=/^[1-9]\d{9,10}$/.test(nationalPhone(control.value));
      if(valid)control.removeAttribute('aria-invalid');else{control.setAttribute('aria-invalid','true');invalid.push(control)}
    });
    const error=step===0?$('#step-error'):$('#contact-error');
    error.textContent=invalid.length?'Informe '+labels[invalid[0].id]+' para continuar.':'';
    if(invalid.length)invalid[0].focus();
    return !invalid.length;
  }
  $$('input,select',form).forEach(c=>c.addEventListener('input',()=>c.removeAttribute('aria-invalid')));
  $('#form-next').addEventListener('click',()=>{if(validate(0))setStep(1)});
  $('#form-back').addEventListener('click',()=>setStep(0));
  form.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&formStep===0&&e.target.tagName==='INPUT'){e.preventDefault();if(validate(0))setStep(1)}
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(formStep!==1){if(validate(0))setStep(1);return}
    if(!validate(1))return;
    // Demonstration only: no external submission or durable contact storage.
    formCompleted=true;form.hidden=true;$('#form-success').hidden=false;
    $('.form-steps').hidden=true;$('.demo-form-note').hidden=true;$('#form-success').focus({preventScroll:true});
  });
  $$('[data-open-contact]').forEach(button=>button.addEventListener('click',e=>{
    e.preventDefault();finishIntro();stopCounter();close(menu);opener=button;
    if(formCompleted){form.reset();formCompleted=false}
    form.hidden=false;$('#form-success').hidden=true;$('.form-steps').hidden=false;$('.demo-form-note').hidden=false;
    $('#interest').value=button.dataset.interest||'ambos';
    $('#step-error').textContent='';$('#contact-error').textContent='';
    $$('[aria-invalid]',form).forEach(c=>c.removeAttribute('aria-invalid'));
    setStep(0,false);show(contact);
    requestAnimationFrame(()=>$('#workshop').focus({preventScroll:true}));
  }));
  contact.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true})});

  const tabs=$$('[role="tab"]');
  function activateTab(tab){
    tabs.forEach(item=>{
      const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;
      $('#'+item.getAttribute('aria-controls')).hidden=!selected;
    });
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
    'Vender melhor: atendimento com inteligência e uma próxima ação definida.',
    'Vender com recorrência: continuar presente até o próximo serviço.'
  ];
  $$('.mechanism-label').forEach((button,i)=>button.addEventListener('click',()=>{
    selectedPiece=selectedPiece===i?null:i;
    $$('.mechanism-label').forEach((b,j)=>b.setAttribute('aria-pressed',String(j===selectedPiece)));
    $('#mechanism-description').textContent=selectedPiece===null?originalDescription:descriptions[selectedPiece];
    scene?.setFocus(selectedPiece);
  }));
  function exploreLabel(active){
    explore.replaceChildren(document.createTextNode(active?'Ver imagem do mecanismo':'Explorar em 3D'));
    const plus=document.createElement('span');plus.className='small-plus';plus.setAttribute('aria-hidden','true');plus.textContent='+';
    explore.append(plus);explore.setAttribute('aria-pressed',String(active));
  }
  if(!reduced.matches&&!saveData&&location.protocol!=='file:')explore.hidden=false;
  stage.addEventListener('mechanism:fallback',()=>{
    scene=null;sceneActive=false;exploreLabel(false);
    $('#mechanism-description').textContent='O mecanismo continua disponível na imagem. Você pode seguir explorando a Engrena.';
  });
  explore.addEventListener('click',async()=>{
    if(sceneActive){
      sceneActive=false;scene?.dispose();scene=null;stage.classList.remove('scene-ready');exploreLabel(false);return;
    }
    explore.disabled=true;explore.textContent='Preparando mecanismo';
    try{
      const {initMechanism}=await import(new URL('hero-scene.js',appURL));
      scene=await initMechanism(stage);
      if(scene.stats.fallback)throw new Error('Fallback active');
      scene.setProgress(sceneProgress);scene.setFocus(selectedPiece);sceneActive=true;exploreLabel(true);
    }catch{
      scene?.dispose();scene=null;stage.classList.remove('scene-ready');
      $('#mechanism-description').textContent='O modo 3D não está disponível aqui. Você pode continuar explorando o mecanismo na imagem.';
      exploreLabel(false);
    }finally{explore.disabled=false}
  });
  reduced.addEventListener('change',()=>{
    if(reduced.matches){
      scene?.dispose();scene=null;sceneActive=false;stage.classList.remove('scene-ready');explore.hidden=true;finishIntro();
    }else{explore.hidden=saveData||location.protocol==='file:';exploreLabel(false)}
  });

  const visibility=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.target.id==='inicio')heroVisible=e.isIntersecting;
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
      gsap.to('.method-symbol',{rotation:40,ease:'none',scrollTrigger:{trigger:'#metodo',start:'top bottom',end:'bottom top',scrub:.8}});
    });
    document.fonts.ready.then(()=>ScrollTrigger.refresh());
  }
  addEventListener('pagehide',e=>{
    if(e.persisted)return;scene?.dispose();motion?.revert();clearInterval(interval);
    counterObserver.disconnect();visibility.disconnect();sections.disconnect();
  });
  window.engrenaPreview=Object.freeze({
    version:'1.2',externalTransmission:false,
    get counter(){return{started:counterStarted,elapsed,stopped:contactStarted}},
    get scene(){return scene?{...scene.stats,active:sceneActive}:{active:false}}
  });
})();

