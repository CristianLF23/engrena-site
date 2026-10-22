import * as THREE from '../vendor/three/three.module.min.js';
import { createGearAssembly, disposeGearAssembly, createHeroFinishTextures } from './gear-assembly.js?v=1.17';

const TAU = Math.PI * 2;
const LOOP_SECONDS = 12;
const PITCH_DISTANCE = 2.78;
const ASSEMBLY_SECONDS = 1.65;
const clamp01 = value => Math.min(1, Math.max(0, Number(value) || 0));

function makeEnvironment(renderer) {
  // Actual light cards produce an HDR reflection field, built once locally.
  const studio=new THREE.Scene();studio.background=new THREE.Color(.065,.075,.09);
  const objects=[];
  function panel(width,height,position,intensity,color=0xffffff) {
    const geometry=new THREE.PlaneGeometry(width,height);
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.lookAt(0,0,0);
    studio.add(mesh);objects.push(mesh);
  }
  panel(14,5,[0,7,4],3.5);
  panel(5,12,[-7,2,5],4.2,0xeaf4ff);
  panel(2,10,[7,1,3],2.8);
  panel(7,3,[1,3,-7],2.4,0xc4d8f2);
  panel(11,5,[0,-7,2],.11,0x102333);
  panel(1.4,10,[-3,1,7],.025,0x0a121b);
  const generator = new THREE.PMREMGenerator(renderer);
  try { return generator.fromScene(studio,.025,.1,60); }
  finally { generator.dispose();objects.forEach(mesh=>{mesh.geometry.dispose();mesh.material.dispose();}); }
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

function makePiece(assembly,index) {
  // The outer group owns the oblique pose; only its child spins on the shaft.
  const pose = new THREE.Group();pose.name=`mechanism-piece-${index}`;
  const rotor = assembly;rotor.name=`mechanism-rotor-${index}`;
  // The shared premium assembly is authored at full route scale. Compact the
  // hero copy so its pitch radius is 1.39 and the three 2.78-pitch gears mesh.
  rotor.scale.setScalar(1.39 / 2.535);
  pose.add(rotor);
  rotor.traverse(object=>{if(object.isMesh||object.isInstancedMesh)object.castShadow=true;});
  pose.userData={rotor,index,restX:(index-1)*3.55,joinedX:(index-1)*PITCH_DISTANCE};
  return pose;
}

export async function initMechanism(stage,{holdAssembly=false}={}) {
  if (!stage) throw new Error('mechanism-stage não encontrado');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection?.saveData);
  const stats = {renderer:'three-webgl',vertices:0,drawcalls:0,pieces:3,dpr:1,running:false,paused:false,fallback:false,frames:0,elapsedSeconds:0,loopDuration:LOOP_SECONDS,rotationAngles:[0,0,0],poseY:[0,0,0],assembly:0,gearCenters:[],meshDistance:PITCH_DISTANCE,introState:holdAssembly?'ready':'assembling',shadows:{type:'geometry',casters:3,receivers:1,mapSize:0}};
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
    pieces.forEach(piece=>disposeGearAssembly(piece.userData?.rotor));
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
    stats.dpr=Math.min(devicePixelRatio||1,1.5);
    renderer.setPixelRatio(stats.dpr);renderer.setClearColor(0,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    scene=new THREE.Scene();scene.add(gearRig);
    camera=new THREE.OrthographicCamera(-6,6,1.8,-1.8,.1,100);
    camera.position.set(.6,2.2,14);camera.lookAt(0,-.12,0);
    scene.add(new THREE.HemisphereLight(0xf3f6fa,0x1a2631,.45));
    // Rear key light: its rays travel down and toward the visitor (+Z).
    const key=new THREE.DirectionalLight(0xe6f3ff,3.4);key.position.set(-1,10,-4.5);scene.add(key);
    key.castShadow=true;key.shadow.mapSize.setScalar(innerWidth<720?512:1024);
    Object.assign(key.shadow.camera,{left:-7,right:7,top:6,bottom:-6,near:1,far:28});
    key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.0001;key.shadow.normalBias=.012;key.shadow.radius=3;
    cleanups.push(()=>key.shadow.dispose());
    const fill=new THREE.DirectionalLight(0xdceaff,.8);fill.position.set(6,1,4);scene.add(fill);
    const edge=new THREE.DirectionalLight(0xffffff,2.1);edge.position.set(-5,2,-4);scene.add(edge);
    const frontFill=new THREE.DirectionalLight(0xe8f4ff,.4);frontFill.position.set(0,4,8);scene.add(frontFill);
    const environment=track(makeEnvironment(renderer));scene.environment=environment.texture;
    scene.environmentRotation.y=.65;
    const finishMaps=createHeroFinishTextures();Object.values(finishMaps).forEach(track);
    for (let index = 0; index < 3; index += 1) {
      const piece = makePiece(createGearAssembly({ detail: 'hero', index, finishMaps }), index);
      pieces.push(piece); gearRig.add(piece);
    }
    // The same rotating tooth geometry casts the shadow. No separate shadow
    // animation can drift from the rotor or keep moving while it is paused.
    const receiver=new THREE.Mesh(track(new THREE.PlaneGeometry(16,14)),track(new THREE.ShadowMaterial({color:0x000000,opacity:.46,depthWrite:false})));
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
        piece.traverse(object => { if (!object.material) return; (Array.isArray(object.material)?object.material:[object.material]).forEach(material=>{if(material.envMapIntensity!==undefined)material.envMapIntensity=active?1.1:.72;}); });
        worldPoint.copy(piece.position).applyMatrix4(gearRig.matrixWorld);
        shadows[index].position.x=worldPoint.x+.05;shadows[index].position.z=worldPoint.z;
        piece.userData.rotor.rotation.z=(index===1?-1:1)*(stats.elapsedSeconds%LOOP_SECONDS)/LOOP_SECONDS*TAU+(index===1?Math.PI/24:0);
      });
      stats.rotationAngles=pieces.map(piece=>piece.userData.rotor.rotation.z);
      stats.poseY=pieces.map(()=>gearRig.rotation.y);
      stats.gearCenters=pieces.map(piece=>({x:piece.position.x,y:piece.position.y,z:piece.position.z}));
      key.position.x=-1+pointer.x*.4;scene.environmentRotation.y=.65+pointer.x*.045;
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
      posePieces();renderer.render(scene,camera);stats.drawcalls=renderer.info.render.calls;stats.frames++;
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
      stats.dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2000000/(width*height)));renderer.setPixelRatio(stats.dpr);
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
    posePieces();resize();renderer.render(scene,camera);stats.drawcalls=renderer.info.render.calls;stats.frames++;
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
