import * as THREE from '../vendor/three/three.module.min.js';

const TAU = Math.PI * 2;
const LOOP_SECONDS = 12;
const PITCH_DISTANCE = 2.78;
const ASSEMBLY_SECONDS = 1.65;
const clamp01 = value => Math.min(1, Math.max(0, Number(value) || 0));

function makeGearGeometry() {
  const shape = new THREE.Shape();
  const teeth = 18;
  const pitch=1.39,base=pitch*Math.cos(Math.PI/9),root=1.20,tip=1.51;
  const involute=radius=>{const alpha=Math.acos(base/radius);return Math.tan(alpha)-alpha;};
  const halfAtPitch=Math.PI/(2*teeth),invPitch=involute(pitch),period=TAU/teeth;
  const flank=[base,(base+tip)/2,tip].map(radius=>[halfAtPitch+invPitch-involute(radius),radius]);
  const profile=[[-.5*period,root],[-.35*period,root],...flank.map(([angle,radius])=>[-angle,radius]),[0,tip],...[...flank].reverse(),[.35*period,root],[.5*period,root]];
  for (let tooth = 0; tooth < teeth; tooth++) {
    profile.forEach(([offset,radius], step) => {
      const angle = tooth/teeth*TAU+offset;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (!tooth && !step) shape.moveTo(x,y);
      else shape.lineTo(x,y);
    });
  }
  shape.closePath();
  const bore = new THREE.Path();
  bore.absarc(0,0,.285,0,TAU,true);
  shape.holes.push(bore);
  const geometry = new THREE.ExtrudeGeometry(shape,{
    depth:.76,bevelEnabled:true,bevelSegments:2,steps:1,
    bevelSize:.045,bevelThickness:.045,curveSegments:24,
  });
  geometry.translate(0,0,-.38);
  const positions=geometry.attributes.position,colors=[];
  for(let i=0;i<positions.count;i++){
    const radius=Math.hypot(positions.getX(i),positions.getY(i));
    const depth=THREE.MathUtils.smoothstep(positions.getZ(i),-.43,.43);
    const valley=THREE.MathUtils.smoothstep(radius,1.19,1.39);
    const shade=radius<.34?.48+depth*.28:(.76+valley*.24)*(.80+depth*.20);
    colors.push(shade,shade,shade);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  return geometry;
}

function makeTurnedFace() {
  const profile=[[.293,.432],[.302,.451],[.328,.458],[.349,.453],[.373,.434],[.40,.429],[.44,.427],[.65,.426],[1.05,.426],[1.10,.429],[1.14,.439],[1.175,.439]];
  const geometry=new THREE.LatheGeometry([...profile].reverse().map(([r,z])=>new THREE.Vector2(r,z)),80);
  geometry.rotateX(Math.PI/2);
  const position=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<position.count;i++)uv.setXY(i,position.getX(i)/2.35+.5,position.getY(i)/2.35+.5);
  uv.needsUpdate=true;return geometry;
}

function makeMachiningTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const pixels = context.createImageData(512,512);
  let seed = 9137;
  for (let y=0;y<512;y++) for (let x=0;x<512;x++) {
    seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
    const radius = Math.hypot(x-255.5,y-255.5);
    const value = Math.round(220 + Math.sin(radius*2.1)*3 + Math.sin(radius*.41)*2 + (seed/4294967296-.5)*7);
    const i = (y*512+x)*4;
    pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = value;
    pixels.data[i+3] = 255;
  }
  context.putImageData(pixels,0,0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 2;
  return texture;
}

function makeAnisotropyTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const context=canvas.getContext('2d'),pixels=context.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const angle=Math.atan2(y-127.5,x-127.5)+Math.PI/2,i=(y*256+x)*4;
    pixels.data[i]=Math.round(Math.cos(angle)*127+128);
    pixels.data[i+1]=Math.round(Math.sin(angle)*127+128);
    pixels.data[i+2]=230;pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);return new THREE.CanvasTexture(canvas);
}

function makeEnvironment(renderer) {
  // Original studio environment: broad softboxes and dark flags, no external HDR.
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const context=canvas.getContext('2d');
  const background=context.createLinearGradient(0,0,0,256);
  background.addColorStop(0,'#cdd5dc');background.addColorStop(.42,'#697782');
  background.addColorStop(.7,'#28323b');background.addColorStop(1,'#111b24');
  context.fillStyle=background;context.fillRect(0,0,512,256);
  [[62,20,46,151],[241,28,108,61],[407,48,29,132]].forEach(([x,y,w,h])=>{
    const softbox=context.createLinearGradient(x-12,0,x+w+12,0);
    softbox.addColorStop(0,'rgba(246,250,255,0)');softbox.addColorStop(.22,'#f6faff');
    softbox.addColorStop(.78,'#f6faff');softbox.addColorStop(1,'rgba(246,250,255,0)');
    context.fillStyle=softbox;context.fillRect(x-12,y,w+24,h);
  });
  context.fillStyle='#15202a';context.fillRect(160,76,24,132);
  const source = new THREE.CanvasTexture(canvas);
  source.mapping=THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;source.needsUpdate = true;
  const generator = new THREE.PMREMGenerator(renderer);
  try { return generator.fromEquirectangular(source); }
  finally { generator.dispose();source.dispose(); }
}

function makeShadowTexture() {
  const canvas = document.createElement('canvas');canvas.width=canvas.height=128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64,64,4,64,64,64);
  gradient.addColorStop(0,'rgba(7,16,24,.48)');
  gradient.addColorStop(.33,'rgba(7,16,24,.25)');
  gradient.addColorStop(.72,'rgba(7,16,24,.055)');
  gradient.addColorStop(1,'rgba(7,16,24,0)');
  context.fillStyle=gradient;context.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(canvas);
}

function makePiece(material,faceMaterial,geometry,index,details) {
  // The outer group owns the oblique pose; only its child spins on the shaft.
  const pose = new THREE.Group();pose.name=`mechanism-piece-${index}`;
  const rotor = new THREE.Group();rotor.name=`mechanism-rotor-${index}`;
  pose.add(rotor);
  const body=new THREE.Mesh(geometry,material);body.castShadow=true;rotor.add(body);
  rotor.add(new THREE.Mesh(details.face,faceMaterial));
  const back = new THREE.Mesh(details.back,faceMaterial);back.position.z=-.428;back.rotation.y=Math.PI;rotor.add(back);
  const rim = new THREE.Mesh(details.bore,material);rim.position.z=.449;rotor.add(rim);
  const line = new THREE.Mesh(details.line,material);line.position.z=.431;rotor.add(line);
  pose.userData={rotor,material,faceMaterial,index,restX:(index-1)*3.55,joinedX:(index-1)*PITCH_DISTANCE};
  return pose;
}

export async function initMechanism(stage,{holdAssembly=false}={}) {
  if (!stage) throw new Error('mechanism-stage não encontrado');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection?.saveData);
  const stats = {renderer:'three-webgl',vertices:0,pieces:3,dpr:1,running:false,paused:false,fallback:false,frames:0,elapsedSeconds:0,loopDuration:LOOP_SECONDS,rotationAngles:[0,0,0],poseY:[0,0,0],assembly:0,gearCenters:[],meshDistance:PITCH_DISTANCE,introState:holdAssembly?'ready':'assembling',shadows:{type:'geometry',casters:3,receivers:1,mapSize:0}};
  if (reduced || saveData) {
    stats.fallback=true;
    return {stats,setProgress(){},setFocus(){},setPaused(){},reveal(){},dispose(){}};
  }
  let renderer,scene,camera,canvas,observer,resizeObserver;
  let animationFrame=0,disposed=false,visible=true,playing=true;
  let targetProgress=0,currentProgress=0,focusIndex=null,lastTime=0,lastRender=0;
  let introReleased=!holdAssembly,assemblyTime=0,hasCoupled=false;
  const pointer={x:0,y:0},targetPointer={x:0,y:0},pieces=[],shadows=[],resources=new Set(),cleanups=[];
  const gearRig=new THREE.Group(),worldPoint=new THREE.Vector3();
  const track=resource => {resources.add(resource);return resource;};
  function stop() {
    cancelAnimationFrame(animationFrame);animationFrame=0;lastTime=0;lastRender=0;stats.running=false;
  }
  function dispose() {
    if (disposed) return;
    disposed=true;stop();observer?.disconnect();resizeObserver?.disconnect();
    cleanups.forEach(cleanup=>cleanup());
    resources.forEach(resource=>resource.dispose());
    renderer?.dispose();renderer?.forceContextLoss?.();canvas?.remove();
    stage.classList.remove('scene-ready','is-coupled');
    stage.closest('.mechanism-wrap')?.classList.remove('has-live-mechanism');
  }
  function listen(target,event,listener,options) {
    target.addEventListener(event,listener,options);
    cleanups.push(()=>target.removeEventListener(event,listener,options));
  }
  try {
    canvas=document.createElement('canvas');canvas.className='mechanism-canvas';canvas.setAttribute('aria-hidden','true');
    stage.appendChild(canvas);
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    stats.dpr=Math.min(devicePixelRatio||1,innerWidth<720?1:1.5);
    renderer.setPixelRatio(stats.dpr);renderer.setClearColor(0,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    scene=new THREE.Scene();scene.add(gearRig);
    camera=new THREE.OrthographicCamera(-6,6,1.8,-1.8,.1,100);
    camera.position.set(.6,2.2,14);camera.lookAt(0,-.12,0);
    scene.add(new THREE.HemisphereLight(0xf3f6fa,0x373c40,.85));
    // Rear key light: its rays travel down and toward the visitor (+Z).
    const key=new THREE.DirectionalLight(0xe6f3ff,3.4);key.position.set(-1,10,-4.5);scene.add(key);
    key.castShadow=true;key.shadow.mapSize.setScalar(innerWidth<720?512:1024);
    Object.assign(key.shadow.camera,{left:-7,right:7,top:6,bottom:-6,near:1,far:28});
    key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.0001;key.shadow.normalBias=.012;key.shadow.radius=3;
    cleanups.push(()=>key.shadow.dispose());
    const fill=new THREE.DirectionalLight(0xdceaff,1.05);fill.position.set(6,1,4);scene.add(fill);
    const edge=new THREE.DirectionalLight(0xffffff,2.1);edge.position.set(-5,2,-4);scene.add(edge);
    const environment=track(makeEnvironment(renderer));scene.environment=environment.texture;
    const machining=track(makeMachiningTexture());
    const anisotropy=track(makeAnisotropyTexture());
    const geometry=track(makeGearGeometry());
    const details={
      face:track(makeTurnedFace()),
      back:track(new THREE.RingGeometry(.293,1.175,64,1)),
      bore:track(new THREE.TorusGeometry(.302,.012,6,48)),
      line:track(new THREE.TorusGeometry(1.108,.004,5,64)),
    };
    const colors=[0x626b73,0x1261f4,0xcdd6dd];
    colors.forEach((color,index)=>{
      const material=track(new THREE.MeshStandardMaterial({color,metalness:index===1?.72:.96,roughness:index===0?.32:.26,envMapIntensity:1.15,vertexColors:true}));
      const faceMaterial=track(new THREE.MeshPhysicalMaterial({color,metalness:index===1?.72:.96,roughness:.4,roughnessMap:machining,bumpMap:machining,bumpScale:.0008,anisotropy:.35,anisotropyMap:anisotropy,clearcoat:index===1?.22:0,clearcoatRoughness:.28,envMapIntensity:1.2}));
      const piece=makePiece(material,faceMaterial,geometry,index,details);pieces.push(piece);gearRig.add(piece);
    });
    // The same rotating tooth geometry casts the shadow. No separate shadow
    // animation can drift from the rotor or keep moving while it is paused.
    const receiver=new THREE.Mesh(track(new THREE.PlaneGeometry(16,14)),track(new THREE.ShadowMaterial({color:0x000000,opacity:.62,depthWrite:false})));
    receiver.name='mechanism-ground-shadow';receiver.rotation.x=-Math.PI/2;receiver.position.y=-1.535;receiver.receiveShadow=true;scene.add(receiver);
    const shadowTexture=track(makeShadowTexture());
    const shadowMaterial=track(new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.8,toneMapped:false}));
    const shadowGeometry=track(new THREE.PlaneGeometry(3.5,1.6));
    pieces.forEach(()=>{
      const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.57;
      shadows.push(shadow);scene.add(shadow);
    });
    scene.traverse(object=>{if(object.geometry)stats.vertices+=object.geometry.attributes.position.count;});

    function posePieces() {
      const t=clamp01(assemblyTime/ASSEMBLY_SECONDS);
      const assembled=t*t*t*(t*(t*6-15)+10);
      stats.assembly=assembled;
      // A shared rig keeps shafts parallel and pitch circles tangent during motion.
      gearRig.rotation.set(pointer.y*.018,-.56+pointer.x*.024-currentProgress*.025,0);
      gearRig.position.y=currentProgress*.045;
      gearRig.updateMatrixWorld(true);
      pieces.forEach((piece,index)=>{
        piece.position.x=THREE.MathUtils.lerp(piece.userData.restX,piece.userData.joinedX,assembled);
        const active=focusIndex===null||focusIndex===index;
        // Highlight through light, never resize meshing geometry.
        piece.userData.faceMaterial.envMapIntensity=active?1.2:.78;
        worldPoint.copy(piece.position).applyMatrix4(gearRig.matrixWorld);
        shadows[index].position.x=worldPoint.x+.05;shadows[index].position.z=worldPoint.z;
        piece.userData.rotor.rotation.z=(index===1?-1:1)*(stats.elapsedSeconds%LOOP_SECONDS)/LOOP_SECONDS*TAU+(index===1?Math.PI/18:0);
      });
      stats.rotationAngles=pieces.map(piece=>piece.userData.rotor.rotation.z);
      stats.poseY=pieces.map(()=>gearRig.rotation.y);
      stats.gearCenters=pieces.map(piece=>({x:piece.position.x,y:piece.position.y,z:piece.position.z}));
      key.position.x=-1+pointer.x*.4;scene.environmentRotation.y=pointer.x*.045;
      if(t===1&&!hasCoupled){hasCoupled=true;stats.introState='complete';stage.classList.add('is-coupled');}
    }
    function render(time) {
      animationFrame=0;
      if (disposed||!visible||document.hidden) {stop();return;}
      const interval=innerWidth<720?1000/30:1000/60;
      if (playing&&lastRender&&time-lastRender<interval-.7) {schedule();return;}
      const delta=lastTime?Math.min((time-lastTime)/1000,.1):0;
      lastTime=time;lastRender=time;
      if (playing&&introReleased) {stats.elapsedSeconds+=delta;assemblyTime=Math.min(ASSEMBLY_SECONDS,assemblyTime+delta);}
      pointer.x+=(targetPointer.x-pointer.x)*.075;pointer.y+=(targetPointer.y-pointer.y)*.075;
      currentProgress+=(targetProgress-currentProgress)*.085;
      if (Math.abs(targetProgress-currentProgress)<.0005) currentProgress=targetProgress;
      posePieces();renderer.render(scene,camera);stats.frames++;
      if ((playing&&introReleased)||Math.abs(targetProgress-currentProgress)>.0005) schedule();
      else stats.running=false;
    }
    function schedule() {
      if (!animationFrame&&!disposed&&visible&&!document.hidden) {
        animationFrame=requestAnimationFrame(render);stats.running=true;
      }
    }
    function resize() {
      const width=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight),aspect=width/height;
      const viewHeight=Math.max(3.8,9.5/aspect);
      camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
      camera.updateProjectionMatrix();renderer.setSize(width,height,false);
      stats.dpr=Math.min(devicePixelRatio||1,innerWidth<720?1:1.5);renderer.setPixelRatio(stats.dpr);
      const shadowSize=innerWidth<720?512:1024;
      if(key.shadow.mapSize.x!==shadowSize){key.shadow.map?.dispose();key.shadow.map=null;key.shadow.mapSize.setScalar(shadowSize);}
      stats.shadows.mapSize=shadowSize;
      camera.updateMatrixWorld();gearRig.updateMatrixWorld(true);
      const wrap=stage.closest('.mechanism-wrap');
      pieces.forEach((piece,index)=>{
        worldPoint.set(piece.userData.joinedX,0,0).applyMatrix4(gearRig.matrixWorld).project(camera);
        wrap?.style.setProperty('--piece-'+index+'-x',((worldPoint.x+1)*50).toFixed(3)+'%');
      });
      schedule();
    }
    posePieces();resize();renderer.render(scene,camera);stats.frames++;
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
    observer=new IntersectionObserver(entries=>{
      visible=entries[0]?.isIntersecting??true;
      if (!visible) stop();else schedule();
    },{threshold:.01});observer.observe(stage);
    listen(document,'visibilitychange',()=>{if(document.hidden)stop();else schedule();});
    listen(canvas,'webglcontextlost',event=>{
      event.preventDefault();dispose();stats.fallback=true;
      stage.dispatchEvent(new CustomEvent('mechanism:fallback'));
    });
    listen(stage,'pointermove',event=>{
      if(event.pointerType==='touch')return;
      const rect=stage.getBoundingClientRect();
      if(!playing)return;
      targetPointer.x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
      targetPointer.y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));schedule();
    },{passive:true});
    listen(stage,'pointerleave',()=>{targetPointer.x=targetPointer.y=0;if(playing)schedule();});
    stage.classList.add('scene-ready');stage.closest('.mechanism-wrap')?.classList.add('has-live-mechanism');schedule();
    return {
      stats,
      prepareIntro(){introReleased=false;assemblyTime=0;hasCoupled=false;stats.elapsedSeconds=0;stats.introState='ready';playing=true;stats.paused=false;stage.classList.remove('is-coupled');posePieces();schedule();},
      reveal(){introReleased=true;stats.introState=hasCoupled?'complete':'assembling';schedule();},
      setProgress(progress){targetProgress=clamp01(progress);schedule();},
      setFocus(index){focusIndex=Number.isInteger(index)&&index>=0&&index<3?index:null;schedule();},
      setPaused(paused){playing=!paused;stats.paused=Boolean(paused);stop();if(playing)schedule();},
      dispose,
    };
  } catch(error) {
    dispose();stats.fallback=true;
    throw error instanceof Error?error:new Error('Falha ao iniciar a cena mecânica');
  }
}
