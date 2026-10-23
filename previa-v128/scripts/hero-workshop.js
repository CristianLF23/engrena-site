import * as THREE from '../vendor/three/three.module.min.js';
export {makeCar,roundedBox,material,disposeObject};

const TAU=Math.PI*2, LOOP_SECONDS=12, clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,Number(v)||0));
const emit=(stage,name,progress)=>stage.dispatchEvent(new CustomEvent('workshop:stage',{detail:{stage:name,progress}}));

function disposeObject(root){
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{materials.add(m);if(m.map)textures.add(m.map);});}});
  textures.forEach(t=>t.dispose?.());materials.forEach(m=>m.dispose?.());geometries.forEach(g=>g.dispose?.());
}
function material(color,roughness=.5,metalness=.15,transparent=false,opacity=1){return new THREE.MeshStandardMaterial({color,roughness,metalness,transparent,opacity});}
function roundedBox(w,h,d,mat,r=.12){
  const shape=new THREE.Shape();const x=w/2,y=h/2;shape.moveTo(-x+r,-y);shape.lineTo(x-r,-y);shape.quadraticCurveTo(x,-y,x,-y+r);shape.lineTo(x,y-r);shape.quadraticCurveTo(x,y,x-r,y);shape.lineTo(-x+r,y);shape.quadraticCurveTo(-x,y,-x,y-r);shape.lineTo(-x,-y+r);shape.quadraticCurveTo(-x,-y,-x+r,-y);
  const g=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSegments:2,bevelSize:r*.35,bevelThickness:r*.35,curveSegments:3});g.center();return new THREE.Mesh(g,mat);
}
function cog(radius,teeth,depth,mat){
  const s=new THREE.Shape();for(let i=0;i<teeth*4;i++){const a=i/(teeth*4)*TAU;const rr=radius*(i%4<2?1:1.16);const p=new THREE.Vector2(Math.cos(a)*rr,Math.sin(a)*rr);i?s.lineTo(p.x,p.y):s.moveTo(p.x,p.y);}s.closePath();const hole=new THREE.Path();hole.absarc(0,0,radius*.42,0,TAU,false);s.holes.push(hole);const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.025,curveSegments:8});g.center();return new THREE.Mesh(g,mat);
}
function makeCar(bodyMat,accent){
  const car=new THREE.Group();car.name='workshop-car';
  const profile=new THREE.Shape();profile.moveTo(-1.03,.34);profile.quadraticCurveTo(-1.08,.57,-.88,.64);profile.lineTo(-.66,.69);profile.quadraticCurveTo(-.47,.76,-.26,.76);profile.lineTo(.52,.69);profile.quadraticCurveTo(.86,.66,1.02,.53);profile.lineTo(1.04,.34);profile.quadraticCurveTo(.9,.24,.67,.24);profile.lineTo(-.78,.24);profile.quadraticCurveTo(-1,.25,-1.03,.34);
  const shell=new THREE.ExtrudeGeometry(profile,{depth:.8,bevelEnabled:true,bevelSegments:3,bevelSize:.045,bevelThickness:.04,curveSegments:10});shell.translate(0,0,-.4);
  const body=new THREE.Mesh(shell,bodyMat);body.castShadow=true;car.add(body);
  const glassProfile=new THREE.Shape();glassProfile.moveTo(-.68,.66);glassProfile.quadraticCurveTo(-.54,.97,-.37,1.01);glassProfile.quadraticCurveTo(-.1,1.08,.29,.97);glassProfile.lineTo(.64,.67);glassProfile.closePath();
  const glassGeo=new THREE.ExtrudeGeometry(glassProfile,{depth:.65,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.025,curveSegments:10});glassGeo.translate(0,0,-.325);
  const glass=new THREE.Mesh(glassGeo,material(0x19384e,.15,.35));car.add(glass);
  const roof=roundedBox(.7,.045,.67,bodyMat,.035);roof.position.set(-.12,1.01,0);car.add(roof);
  const pillar=roundedBox(.035,.34,.69,bodyMat,.01);pillar.position.set(-.07,.83,0);car.add(pillar);
  const tires=material(0x172330,.75,.05),rims=material(0xd7e1eb,.2,.8),wheels=[];
  for(const x of [-.65,.65])for(const z of [-.43,.43]){
    const wheel=new THREE.Group();wheel.position.set(x,.23,z);wheel.userData.wheel=true;
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.13,24),tires);tire.rotation.x=Math.PI/2;tire.castShadow=true;wheel.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.14,20),rims);rim.rotation.x=Math.PI/2;wheel.add(rim);
    const spokes=new THREE.InstancedMesh(new THREE.BoxGeometry(.025,.25,.145),rims,5);const spokePose=new THREE.Object3D();for(let i=0;i<5;i++){spokePose.rotation.z=i*Math.PI/5;spokePose.updateMatrix();spokes.setMatrixAt(i,spokePose.matrix)}wheel.add(spokes);
    car.add(wheel);wheels.push(wheel);
  }
  const head=material(0xdbf7ff,.1,.15),tail=material(0xa82743,.3,.2);
  for(const z of [-.28,.28]){const light=roundedBox(.035,.09,.17,head,.025);light.position.set(1.03,.51,z);car.add(light);const rear=roundedBox(.035,.075,.18,tail,.02);rear.position.set(-1.035,.5,z);car.add(rear)}
  const grill=roundedBox(.03,.11,.49,material(0x223344,.4,.2),.025);grill.position.set(1.06,.36,0);car.add(grill);
  car.userData.wheels=wheels;return car;
}
function addLabel(scene,text,pos,color,size=.22){
  const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,512,128);x.fillStyle=color;x.font='600 42px Arial';x.fillText(text,12,72);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size*4,size),m);mesh.position.set(...pos);scene.add(mesh);return mesh;
}

export async function initMechanism(stage,{holdAssembly=false}={}){
  if(!stage)throw new Error('mechanism-stage não encontrado');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, saveData=Boolean(navigator.connection?.saveData);
  const stats={renderer:'three-webgl',vertices:0,drawcalls:0,pieces:3,dpr:1,running:false,active:false,paused:false,fallback:false,frames:0,elapsedSeconds:0,loopDuration:LOOP_SECONDS,rotationAngles:[0,0,0],poseY:[0,0,0],assembly:holdAssembly?0:1,introState:holdAssembly?'ready':'complete',shadows:{type:'geometry',casters:2,receivers:1,mapSize:0},cars:2,carStates:[],stage:'find'};
  if(reduced||saveData)return {stats,setProgress(){},setFocus(){},setPaused(){},pause(){},resume(){},reveal(){},prepareIntro(){},dispose(){}};
  let renderer,scene,camera,canvas,resizeObserver,intersection;let raf=0,last=0,lastRender=0,disposed=false,visible=true,playing=true;let progress=0,targetProgress=0,intro=holdAssembly?0:1;let carClock=0,focus=null;
  const clean=[];const track=x=>x;const world=new THREE.Vector3();
  function stop(){cancelAnimationFrame(raf);raf=0;stats.running=false;last=0;lastRender=0;}
  function fallback(){stage.classList.remove('scene-ready','is-coupled');stage.closest('.mechanism-wrap')?.classList.remove('has-live-mechanism');canvas?.remove();stats.fallback=true;stage.dispatchEvent(new CustomEvent('mechanism:fallback'));}
  function dispose(){if(disposed)return;disposed=true;stop();resizeObserver?.disconnect();intersection?.disconnect();clean.forEach(fn=>fn());if(scene)disposeObject(scene);renderer?.dispose();renderer?.forceContextLoss?.();fallback();}
  function listen(t,e,fn,o){t.addEventListener(e,fn,o);clean.push(()=>t.removeEventListener(e,fn,o));}
  try{
    canvas=document.createElement('canvas');canvas.className='mechanism-canvas';canvas.setAttribute('aria-hidden','true');stage.appendChild(canvas);
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-7,7,3,-3,.1,100);camera.position.set(8,7,12);camera.lookAt(0,.9,-.5);scene.add(new THREE.HemisphereLight(0xe8f4ff,0x122235,1.7));
    const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-5,9,8);key.castShadow=true;key.shadow.mapSize.set(512,512);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=8;key.shadow.camera.bottom=-4;scene.add(key);stats.shadows.mapSize=512;
    const rim=new THREE.DirectionalLight(0x1686ff,2);rim.position.set(5,3,-5);scene.add(rim);
    const white=track(material(0xeef4f7,.28,.08)), cobalt=track(material(0x0b63ef,.24,.28)), cyan=track(material(0x13d8ff,.23,.3)), dark=track(material(0x0d2232,.34,.42)), silver=track(material(0xcad7e0,.24,.75));
    const root=new THREE.Group();root.position.y=-.9;scene.add(root);
    const floor=new THREE.Mesh(track(new THREE.PlaneGeometry(20,12)),track(new THREE.ShadowMaterial({color:0x03101b,opacity:.37})));floor.rotation.x=-Math.PI/2;floor.position.y=0;floor.receiveShadow=true;root.add(floor);
    const building=new THREE.Group();root.add(building);
    const back=roundedBox(7.4,3.55,.44,white,.13);back.position.set(1.1,1.65,-1.5);back.castShadow=true;building.add(back);
    const fascia=roundedBox(7.7,.48,.58,cobalt,.12);fascia.position.set(1.1,3.28,-.55);building.add(fascia);
    const fasciaLine=roundedBox(6.8,.07,.05,cyan,.02);fasciaLine.position.set(1.1,2.95,-.86);building.add(fasciaLine);
    const bayLanes=[-1.65,.4,2.45];
    for(let i=0;i<3;i++){const bay=new THREE.Group();const x=bayLanes[i];const frame=roundedBox(1.65,2.45,.08,dark,.06);frame.position.set(x,.98,-1.21);bay.add(frame);const inner=roundedBox(1.4,2.2,.06,material(0x9cb5c7,.35,.12),.03);inner.position.set(x,.96,-1.15);bay.add(inner);const top=roundedBox(1.4,.14,.12,cobalt,.03);top.position.set(x,2.05,.45);bay.add(top);for(let j=0;j<3;j++){const post=new THREE.Mesh(new THREE.BoxGeometry(.06,1.8,.07),cobalt);post.position.set(x-.48+j*.48,.83,-.88);bay.add(post);}const lift=new THREE.Mesh(new THREE.BoxGeometry(1.1,.05,.4),dark);lift.position.set(x,.12,-.36);bay.add(lift);building.add(bay);}
    for(const x of [-2.65,-.63,1.43,3.48]){const post=roundedBox(.16,2.9,.18,white,.035);post.position.set(x,1.43,.55);post.castShadow=true;building.add(post)}
    const rightWall=roundedBox(.18,2.85,2.1,white,.05);rightWall.position.set(4.72,1.4,-.48);building.add(rightWall);
    const apron=roundedBox(7.6,.08,2.5,white,.04);apron.position.set(1.1,-.03,.12);apron.receiveShadow=true;building.add(apron);
    const brandPlate=roundedBox(2.6,.6,.08,white,.04);brandPlate.position.set(1.1,3.27,-.21);building.add(brandPlate);
    const brandTexture=await new THREE.TextureLoader().loadAsync(new URL('../assets/brand/logo-color.svg',import.meta.url).href);brandTexture.colorSpace=THREE.SRGBColorSpace;
    const brand=new THREE.Mesh(new THREE.PlaneGeometry(2.25,.53),new THREE.MeshBasicMaterial({map:brandTexture,transparent:true,depthWrite:false}));brand.position.set(1.1,3.27,-.16);building.add(brand);
    const sign=roundedBox(2.25,.62,.08,dark,.09);sign.position.set(3.25,2.2,-.92);building.add(sign);
    const gearRig=new THREE.Group();gearRig.position.set(4.45,.55,-1.35);root.add(gearRig);gearRig.visible=false;[0,1,2].forEach(i=>{const g=cog(.55,10,.15,i===1?cobalt:silver);g.rotation.x=Math.PI/2;g.position.x=(i-1)*.72;g.position.y=(i%2)*.45;g.userData.phase=i===1?-1:1;gearRig.add(g);});
    const panel=roundedBox(3.2,1.55,.1,dark,.11);panel.position.set(-4.05,2.2,-.95);root.add(panel);panel.visible=false;const panelBar=roundedBox(2.35,.16,.08,cobalt,.04);panelBar.position.set(-4.25,2.58,-1.06);root.add(panelBar);panelBar.visible=false;for(let i=0;i<3;i++){const dot=new THREE.Mesh(new THREE.SphereGeometry(.08,12,8),track(material(i===2?cyan:cobalt,.3,.45)));dot.position.set(-5.2+i*.32,1.95,-1.1);root.add(dot);dot.visible=false;}
    const cars=[makeCar(silver,cyan),makeCar(white,cobalt)];cars.forEach(car=>{car.position.y=-.05;car.position.z=1.35;root.add(car);});
    function setCar(car,phase,dt,index){
      const t=(carClock/LOOP_SECONDS+phase)%1,lane=bayLanes[index];let point,heading=0,reverse=false,stageName='find';
      if(t<.24){const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(-6.6,0,3.4+index*.6),new THREE.Vector3(-3,0,3.4),new THREE.Vector3(lane,0,3.1),new THREE.Vector3(lane,0,1.65));point=curve.getPoint(t/.24);const v=curve.getTangent(t/.24);heading=Math.atan2(-v.z,v.x);stageName=t<.14?'find':'contact'}
      else if(t<.39){point=new THREE.Vector3(lane,0,THREE.MathUtils.lerp(1.65,-.22,(t-.24)/.15));heading=Math.PI/2;stageName='service'}
      else if(t<.60){point=new THREE.Vector3(lane,0,-.22);heading=Math.PI/2;stageName='service'}
      else if(t<.73){point=new THREE.Vector3(lane,0,THREE.MathUtils.lerp(-.22,1.65,(t-.60)/.13));heading=Math.PI/2;reverse=true;stageName='return'}
      else{const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(lane,0,1.65),new THREE.Vector3(lane,0,3.3),new THREE.Vector3(3.8,0,3.4),new THREE.Vector3(6.8,0,3.5));point=curve.getPoint((t-.73)/.27);const v=curve.getTangent((t-.73)/.27);heading=Math.atan2(-v.z,v.x);stageName='return'}
      const previous=car.userData.previous;const distance=previous?previous.distanceTo(point):0;
      car.visible=t>.012&&t<.985;car.position.copy(point);car.position.y=.01;
      const difference=Math.atan2(Math.sin(heading-car.rotation.y),Math.cos(heading-car.rotation.y));car.rotation.y+=difference*(1-Math.exp(-18*dt));
      if(distance<1)car.userData.wheels.forEach(wheel=>wheel.rotation.z+=(reverse?-1:1)*distance/.23);
      car.userData.previous=point.clone();return {x:point.x,z:point.z,direction:car.rotation.y,stage:stageName,active:distance>.001,visible:car.visible};
    }
    function pose(dt){
      progress+=(targetProgress-progress)*.075;root.position.x=progress*.6;gearRig.children.forEach((g,i)=>g.rotation.z+=(i===1?-1:1)*dt*.55);stats.carStates=cars.map((c,i)=>setCar(c,i*.48,dt,i));
      const cycle=(carClock%LOOP_SECONDS)/LOOP_SECONDS;const stageName=cycle<.2?'find':cycle<.43?'contact':cycle<.68?'service':'return';if(stageName!==stats.stage){stats.stage=stageName;emit(stage,stageName,cycle);}
      stats.elapsedSeconds=carClock;stats.rotationAngles=gearRig.children.map(g=>g.rotation.z);stats.poseY=[root.rotation.y];stats.assembly=intro;stats.introState=holdAssembly?'ready':'complete';
    }
    function resize(){const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight),a=w/h,v=14.8/a;camera.left=-v*a/2;camera.right=v*a/2;camera.top=v/2;camera.bottom=-v/2;camera.updateProjectionMatrix();stats.dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2000000/(w*h)));renderer.setPixelRatio(stats.dpr);renderer.setSize(w,h,false);schedule();}
    function frame(t){raf=0;if(disposed||!visible||document.hidden){stop();return;}const interval=innerWidth<720?1000/30:1000/60;if(lastRender&&t-lastRender<interval-.5){schedule();return;}const dt=last?Math.min(.1,(t-last)/1000):0;last=t;lastRender=t;if(playing&&!holdAssembly){carClock+=dt;intro=Math.min(1,intro+dt/1.8);}pose(dt);renderer.render(scene,camera);stats.frames++;stats.drawcalls=renderer.info.render.calls;stats.active=true;if(playing||Math.abs(targetProgress-progress)>.001)schedule();else stats.running=false;}
    function schedule(){if(!raf&&!disposed&&visible&&!document.hidden){raf=requestAnimationFrame(frame);stats.running=true;}}
    function prep(){holdAssembly=true;intro=0;carClock=0;stats.elapsedSeconds=0;stats.stage='find';stats.introState='ready';stage.classList.remove('is-coupled');pose(0);schedule();}
    scene.traverse(object=>{if(object.geometry?.attributes?.position)stats.vertices+=object.geometry.attributes.position.count;});
    resize();pose(0);renderer.render(scene,camera);stats.frames++;stats.drawcalls=renderer.info.render.calls;stage.classList.add('scene-ready');stage.closest('.mechanism-wrap')?.classList.add('has-live-mechanism');
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);intersection=new IntersectionObserver(es=>{visible=es[0]?.isIntersecting??true;if(visible)schedule();else stop();},{threshold:.01});intersection.observe(stage);
    listen(document,'visibilitychange',()=>document.hidden?stop():schedule());listen(canvas,'webglcontextlost',e=>{e.preventDefault();dispose();});
    listen(stage,'pointermove',e=>{if(e.pointerType==='touch')return;const r=stage.getBoundingClientRect();root.rotation.y+=(Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1))*.02-root.rotation.y)*.08;schedule();},{passive:true});
    schedule();
    return {stats,prepareIntro:prep,reveal(){holdAssembly=false;intro=1;stats.introState='assembling';stage.classList.add('is-coupled');emit(stage,'find',0);schedule();},setProgress(v){targetProgress=clamp(v);schedule();},setFocus(v){focus=Number.isInteger(v)?v:null;cars.forEach((c,i)=>c.traverse(o=>{if(o.material?.emissiveIntensity!==undefined)o.material.emissiveIntensity=(focus===null||focus===i)?.12:.04;}));schedule();},setPaused(v){playing=!v;stats.paused=Boolean(v);if(playing)schedule();else stop();},pause(){playing=false;stats.paused=true;stop();},resume(){playing=true;stats.paused=false;schedule();},dispose};
  }catch(error){dispose();throw error instanceof Error?error:new Error('Falha ao iniciar a oficina 3D');}
}
