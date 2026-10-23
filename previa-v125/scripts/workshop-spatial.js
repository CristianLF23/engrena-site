import * as T from '../vendor/three/three.module.min.js';
import {makeCar,roundedBox,material,disposeObject} from './hero-workshop.js';

const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), lerp=T.MathUtils.lerp;
const V=(x,z)=>new T.Vector3(x,0,z), LOOP=30, CARS=6, HEADWAY=LOOP/CARS, ROOF=3.55;
// Both service lanes are drive-through: every bend is outside the building.
function route(lane){
  const curves=[
    new T.CubicBezierCurve3(V(-12,5.9),V(-5.4,5.9),V(lane,5.9),V(lane,2.8)),
    new T.LineCurve3(V(lane,2.8),V(lane,-1.9)),
    new T.LineCurve3(V(lane,-1.9),V(lane,-6.9)),
    new T.CubicBezierCurve3(V(lane,-6.9),V(lane,-9.2),V(6,-9.2),V(6,-6.9)),
    new T.LineCurve3(V(6,-6.9),V(6,4.2)),
    new T.CubicBezierCurve3(V(6,4.2),V(6,6.5),V(9,6.5),V(13,6.5))
  ];
  curves.forEach(c=>{c.arcLengthDivisions=180;c.updateArcLengths()});return curves;
}
const paths=[route(-1.6),route(1.6)];
function sample(seconds,index){
  const t=((seconds+index*HEADWAY)%LOOP+LOOP)%LOOP,lane=index%2;
  let segment,u,state;
  if(t<4.5){segment=0;u=1-Math.pow(1-t/4.5,1.35);state='approaching'}
  else if(t<5.5){segment=0;u=1;state='waiting'}
  else if(t<8.5){segment=1;u=(1-Math.cos(Math.PI*(t-5.5)/3))/2;state='entering'}
  else if(t<11.5){segment=1;u=1;state='servicing'}
  else if(t<15.5){segment=2;u=Math.pow((t-11.5)/4,1.5);state='leaving'}
  else if(t<19.5){segment=3;u=(t-15.5)/4;state='circulating'}
  else if(t<25.5){segment=4;u=(t-19.5)/6;state='circulating'}
  else{segment=5;u=(t-25.5)/4.5;state='departing'}
  const curve=paths[lane][segment],point=curve.getPointAt(u),tangent=curve.getTangentAt(u);
  return {point,heading:Math.atan2(-tangent.z,tangent.x),state,t,segment,lane};
}

// Collision audit uses conservative oriented footprints, rather than screen projections.
export function auditWorkshopPaths(){
  let minClearance=Infinity,violations=0,minVehicleClearance=Infinity,vehicleCollisions=0,waitingSamples=0,samples=0;
  const obstacles=[[-3.35,-1.7,.15,2.9],[3.35,-1.7,.15,2.9],[0,1,.15,.18],[-3.35,1,.15,.18],[3.35,1,.15,.18]];
  for(const lane of [-1.6,1.6])for(const x of [lane-.94,lane+.94])obstacles.push([x,-2,.075,.12]);
  function separation(a,b){
    const axes=[[Math.cos(a.heading),-Math.sin(a.heading)],[Math.sin(a.heading),Math.cos(a.heading)],[1,0],[0,1]];
    return Math.max(...axes.map(([x,z])=>{
      const ra=1.09*Math.abs(x*Math.cos(a.heading)-z*Math.sin(a.heading))+.53*Math.abs(x*Math.sin(a.heading)+z*Math.cos(a.heading));
      return Math.abs(x*(a.point.x-b[0])+z*(a.point.z-b[1]))-ra-b[2]*Math.abs(x)-b[3]*Math.abs(z);
    }));
  }
  function vehicleSeparation(a,b){
    const axes=[a.heading,a.heading+Math.PI/2,b.heading,b.heading+Math.PI/2].map(h=>[Math.cos(h),-Math.sin(h)]);
    return Math.max(...axes.map(([x,z])=>{
      const radius=p=>1.09*Math.abs(x*Math.cos(p.heading)-z*Math.sin(p.heading))+.53*Math.abs(x*Math.sin(p.heading)+z*Math.cos(p.heading));
      return Math.abs(x*(a.point.x-b.point.x)+z*(a.point.z-b.point.z))-radius(a)-radius(b);
    }));
  }
  for(let s=0;s<LOOP;s+=.01){const positions=Array.from({length:CARS},(_,i)=>sample(s,i));for(let i=0;i<CARS;i++){
    const a=positions[i];samples++;if(a.state==='waiting')waitingSamples++;
    for(const o of obstacles){const d=separation(a,o);minClearance=Math.min(minClearance,d);if(d<0)violations++}
    for(let j=i+1;j<CARS;j++){const d=vehicleSeparation(a,positions[j]);minVehicleClearance=Math.min(minVehicleClearance,d);if(d<0)vehicleCollisions++}
  }}
  return {samples,violations,minClearance,vehicleCollisions,minVehicleClearance,waitingSamples,cars:CARS,entryInterval:HEADWAY,roofHeight:ROOF,coinMinimumHeight:4.75,carWidth:1.06,doorClearWidth:3.05};
}

function mergeStatic(group){
  const bins=new Map();group.updateMatrixWorld(true);
  group.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!bins.has(o.material))bins.set(o.material,[]);bins.get(o.material).push(g)});
  const result=new T.Group();
  for(const [mat,geos]of bins){const combined=new T.BufferGeometry();for(const name of ['position','normal','uv']){if(!geos.every(g=>g.getAttribute(name)))continue;const arrays=geos.map(g=>g.getAttribute(name)),size=arrays.reduce((n,a)=>n+a.array.length,0),data=new Float32Array(size);let offset=0;for(const a of arrays){data.set(a.array,offset);offset+=a.array.length}combined.setAttribute(name,new T.BufferAttribute(data,arrays[0].itemSize))}const mesh=new T.Mesh(combined,mat);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);geos.forEach(g=>g.dispose())}
  group.traverse(o=>o.geometry?.dispose());return result;
}
function textTexture(text,color,bg=null){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,512,128)}x.fillStyle=color;x.font='700 60px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,68);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return map;}

export async function initMechanism(stage,{holdAssembly=false,compact=false}={}){
  let disposed=false,visible=true,paused=false,held=holdAssembly,raf=0,last=0,clock=2,lastRender=0;
  const stats={renderer:'three-spatial',ready:false,active:true,running:false,paused:false,fallback:false,frames:0,elapsedSeconds:0,loopDuration:LOOP,cars:CARS,carStates:[],arrivals:0,moneyColor:'#16a56a',coinPositions:[],roofHeight:ROOF,vertices:0,drawcalls:0,dpr:1,stage:'find',geometryAudit:auditWorkshopPaths()};
  const canvas=document.createElement('canvas');canvas.className='mechanism-canvas';canvas.setAttribute('aria-hidden','true');
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-10,10,7,-7,.1,100);
  camera.position.set(13,11,17);camera.lookAt(.3,1,-.9);
  scene.add(new T.HemisphereLight(0xf0f7ff,0xa7b7cf,2.5));
  const key=new T.DirectionalLight(0xffffff,3.7);key.position.set(-7,13,9);key.castShadow=true;key.shadow.mapSize.set(compact?512:1024,compact?512:1024);Object.assign(key.shadow.camera,{left:-13,right:13,top:12,bottom:-12,near:.5,far:50});key.shadow.bias=-.0005;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
  const fill=new T.DirectionalLight(0xaacbff,1.5);fill.position.set(8,6,-6);scene.add(fill);
  const white=material(0xf1f6fc,.32,.12),blue=material(0x1261f4,.25,.24),pale=material(0xcbd9eb,.55,.12),dark=material(0x153051,.4,.3),silver=material(0xb8c7d8,.26,.68),rubber=material(0x253142,.8,.03),glass=material(0x6da6d6,.16,.3),light=material(0xe8fbff,.2,.1);
  light.emissive=new T.Color(0xd4f2ff);light.emissiveIntensity=.5;
  const staticRoot=new T.Group();
  function box(w,h,d,x,y,z,mat=white,r=.035){const mesh=roundedBox(w,h,d,mat,r);mesh.position.set(x,y,z);staticRoot.add(mesh);return mesh;}
  function cyl(radius,height,x,y,z,mat=silver,segments=20){const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,height,segments),mat);mesh.position.set(x,y,z);staticRoot.add(mesh);return mesh;}
  // Raised architectural slab, clear apron and a continuous exterior driveway.
  box(14.6,.025,15.5,.4,-.05,-.8,white,.09);
  box(7,.075,5.7,0,-.01,-1.7,pale,.035);
  const road=material(0xdce6f3,.86,.03);box(14.3,.012,2.4,.4,-.043,5.9,road,.12);box(2.7,.012,12.8,5.95,-.04,-1.5,road,.12);box(10,.012,2.5,1.4,-.038,-7.2,road,.12);
  for(let x=-6;x<7;x+=1.5)box(.65,.018,.035,x,-.025,6,white,.003);
  for(const lane of [-1.6,1.6]){for(const x of [lane-1.2,lane+1.2])box(.035,.012,5.1,x,.035,-1.6,white,.003)}
  // Two real portals with an unobstructed driving envelope and rear exits.
  for(const x of [-3.35,0,3.35]){box(.24,3.1,.32,x,1.55,1,white,.04);box(.25,.22,.34,x,.12,1,dark,.015);box(.24,3.1,.30,x,1.55,-4.4,white,.04)}
  box(.22,3.05,5.6,-3.35,1.53,-1.7,white,.04);
  // Right wall has an actual recessed blue glass ribbon and framing.
  box(.22,1.15,5.6,3.35,.57,-1.7,white,.03);box(.22,.76,5.6,3.35,2.67,-1.7,white,.03);
  box(.15,1.25,4.8,3.36,1.77,-1.7,glass,.015);
  for(const z of [-4.4,-2.6,-.8,1])box(.25,1.28,.10,3.35,1.76,z,blue,.01);
  box(7.1,.33,5.95,0,3.32,-1.7,white,.1);box(7.16,.31,.29,0,3.37,1.25,blue,.05);
  box(7.16,.1,.3,0,3.12,1.25,dark,.025);box(.3,.31,6.0,3.48,3.37,-1.68,blue,.05);
  // Roof seams, raised service sign and ventilation details.
  box(6.55,.055,5.42,0,3.51,-1.7,pale,.06);
  for(const z of [-3.6,-2.2,-.8,.6])box(6.3,.018,.035,0,3.55,z,silver,.004);
  box(1.3,.22,.8,-2,3.65,-3.1,white,.07);
  for(let i=0;i<6;i++)box(.9,.018,.045,-2,3.77,-3.4+i*.11,dark,.004);
  box(2.95,.57,.1,0,3.38,1.43,white,.04);
  const sign=new T.Mesh(new T.PlaneGeometry(2.65,.55),new T.MeshBasicMaterial({map:textTexture('OFICINA','#1261f4'),transparent:true}));sign.position.set(0,3.38,1.53);scene.add(sign);
  for(const lane of [-1.6,1.6])for(let n=0;n<4;n++)box(2.82,.045,.04,lane,2.86+n*.055,1.1,silver,.006);
  // Bay lifts fit around the car footprint; workshop equipment makes the use clear.
  for(const lane of [-1.6,1.6]){
    for(const x of [lane-.94,lane+.94]){box(.15,2.3,.24,x,1.15,-2,blue,.025);box(.35,.05,.4,x,.06,-2,dark,.015);box(.27,.06,.7,x,.2,-2,silver,.015)}
    box(1.9,.06,.11,lane,2.3,-2,blue,.02);box(2.1,.06,.12,lane,2.96,-.7,light,.02);
    const glow=new T.PointLight(0xe2f4ff,4,4,2);glow.position.set(lane,2.55,-.7);scene.add(glow);
    box(1.4,.032,2.35,lane,.055,-1.9,silver,.02);
  }
  box(.65,.94,1.0,-2.91,.47,-3.65,blue,.045);
  for(let i=0;i<5;i++)box(.025,.02,.75,-2.57,.2+i*.15,-3.65,silver,.003);
  box(.58,.055,1.1,-2.91,.99,-3.65,silver,.02);
  // Exterior trolley, compressor, spare tyres and a hose reel.
  box(.65,.8,.65,-4.2,.41,.2,blue,.045);
  for(let i=0;i<4;i++)box(.49,.025,.02,-4.2,.2+i*.16,.54,silver,.006);
  for(const x of [-4.4,-4])for(const z of [-.02,.42])cyl(.055,.08,x,.035,z,rubber,10);
  for(let n=0;n<3;n++){const tire=new T.Mesh(new T.TorusGeometry(.38,.13,8,24),rubber);tire.rotation.x=Math.PI/2;tire.position.set(-4.2,.16+n*.26,-1.25);staticRoot.add(tire)}
  cyl(.3,.8,-4.2,.4,-2.5,blue);box(.24,.17,.3,-4.2,.87,-2.5,dark,.03);
  const hose=new T.Mesh(new T.TorusGeometry(.28,.035,6,20),dark);hose.position.set(-3.52,1.35,-.5);hose.rotation.y=Math.PI/2;staticRoot.add(hose);
  // Parking guides and low planting stay outside vehicle trajectories.
  for(const z of [-3.7,-2.9]){box(.65,.42,.6,-4.25,.2,z,white,.07);cyl(.24,.45,-4.25,.58,z,material(0x579b86,.8,.01),12)}
  scene.add(mergeStatic(staticRoot));
  // Roof landmark: a solid, bevelled gear mounted on a short metal support.
  const support=new T.Mesh(new T.CylinderGeometry(.105,.14,1.35,20),silver);support.position.set(-1.35,4.22,-2.1);support.castShadow=true;scene.add(support);
  const mount=new T.Mesh(new T.CylinderGeometry(.36,.36,.08,24),silver);mount.position.set(-1.35,3.63,-2.1);scene.add(mount);
  const gearStand=new T.Group();gearStand.position.set(-1.35,5.02,-2.1);gearStand.rotation.y=.53;scene.add(gearStand);
  const gearShape=new T.Shape();for(let i=0;i<56;i++){const a=i/56*Math.PI*2,r=i%4===1||i%4===2?1.21:1.04;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?gearShape.lineTo(x,y):gearShape.moveTo(x,y)}gearShape.closePath();const gearHole=new T.Path();gearHole.absarc(0,0,.45,0,Math.PI*2,true);gearShape.holes.push(gearHole);
  const gearGeo=new T.ExtrudeGeometry(gearShape,{depth:.22,bevelEnabled:true,bevelSegments:3,bevelSize:.035,bevelThickness:.035,curveSegments:32});gearGeo.center();
  const roofGear=new T.Group(),gearBody=new T.Mesh(gearGeo,blue);gearBody.castShadow=true;roofGear.add(gearBody);
  for(const z of [-.135,.135]){const ring=new T.Mesh(new T.TorusGeometry(.55,.035,8,48),silver);ring.position.z=z;roofGear.add(ring);for(let i=0;i<6;i++){const bolt=new T.Mesh(new T.CylinderGeometry(.047,.047,.025,8),silver);bolt.rotation.x=Math.PI/2;bolt.position.set(Math.cos(i*Math.PI/3)*.77,Math.sin(i*Math.PI/3)*.77,z);roofGear.add(bolt)}}gearStand.add(roofGear);
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.17,color:0x506789}));floor.rotation.x=-Math.PI/2;floor.position.y=-.066;floor.receiveShadow=true;scene.add(floor);
  const cars=[];
  const carMats=[material(0xe7edf5,.23,.45),material(0x1261f4,.22,.35),material(0x9bb0c8,.24,.5),material(0xf7fbff,.23,.35)];
  for(let i=0;i<CARS;i++){
    const carMat=carMats[i%carMats.length],car=makeCar(carMat,blue);car.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
    // Side mirrors and door handles remain solid geometry, at the same scale as the body.
    for(const z of [-.47,.47]){const mirror=roundedBox(.16,.08,.12,carMat,.018);mirror.position.set(.28,.73,z);car.add(mirror);const handle=roundedBox(.12,.025,.025,silver,.005);handle.position.set(-.27,.61,z);car.add(handle)}
    car.userData.steers=[];
    for(const wheel of car.userData.wheels.filter(w=>w.position.x>0)){const pivot=new T.Group();pivot.position.copy(wheel.position);car.add(pivot);pivot.add(wheel);wheel.position.set(0,0,0);car.userData.steers.push(pivot)}
    scene.add(car);cars.push(car);
  }
  const coins=[],arrived=new Map();let nextCoinAt=2,emission=0;
  const coinCanvas=document.createElement('canvas');coinCanvas.width=256;coinCanvas.height=256;const cc=coinCanvas.getContext('2d');cc.fillStyle='#16a56a';cc.fillRect(0,0,256,256);cc.strokeStyle='#91edbc';cc.lineWidth=5;cc.beginPath();cc.arc(128,128,112,0,Math.PI*2);cc.stroke();cc.fillStyle='#ffffff';cc.font='bold 96px Arial';cc.textAlign='center';cc.textBaseline='middle';cc.fillText('R$',128,134);const coinMap=new T.CanvasTexture(coinCanvas);coinMap.colorSpace=T.SRGBColorSpace;
  function spawnCoin(lane,ambient=false){
    for(let n=0;n<(ambient?1:2);n++){
      const group=new T.Group(),face=new T.MeshBasicMaterial({map:coinMap,transparent:false});
      const rim=new T.Mesh(new T.CylinderGeometry(.36,.36,.085,32),material(0x16a56a,.25,.25));rim.rotation.x=Math.PI/2;group.add(rim);
      const label=new T.Mesh(new T.CircleGeometry(.335,32),face);label.position.z=.047;group.add(label);scene.add(group);
      const stream=emission++%3;coins.push({group,birth:clock+n*.72,x:[.8,2.4,3.7][stream],z:[-.4,-1.5,.5][stream]});
    }
    if(!ambient){stats.arrivals++;stage.dispatchEvent(new CustomEvent('workshop:arrival',{detail:{total:stats.arrivals}}))}stats.emissions=emission;
  }
  function pose(){
    roofGear.rotation.z=-(clock-2)*.38;stats.roofGearAngle=roofGear.rotation.z;
    if(clock>=nextCoinAt){spawnCoin(0,true);nextCoinAt=clock+1.35}
    stats.carStates=cars.map((car,i)=>{
      const p=sample(clock,i),previous=car.userData.prev,cycle=Math.floor((clock+i*HEADWAY)/LOOP);
      const distance=previous?previous.distanceTo(p.point):0;
      const angle=car.userData.heading===undefined?0:Math.atan2(Math.sin(p.heading-car.userData.heading),Math.cos(p.heading-car.userData.heading));
      car.userData.steers.forEach(pivot=>pivot.rotation.y=distance>.001&&distance<1?clamp(Math.atan(1.3*angle/distance),-.5,.5):0);car.userData.heading=p.heading;
      car.position.copy(p.point);car.position.y=Math.abs(p.point.x)<3.1?lerp(-.025,.075,clamp((1.7-p.point.z)/.9)*clamp((p.point.z+5.1)/.7)):-.025;car.rotation.y=p.heading;car.visible=p.point.x>-9&&p.point.x<10;
      if(distance<1)car.userData.wheels.forEach(w=>w.rotation.z-=distance/.23);
      car.userData.prev=p.point.clone();
      if((p.state==='servicing'||(p.state==='entering'&&p.point.z<.5))&&arrived.get(i)!==cycle){arrived.set(i,cycle);spawnCoin(p.lane?1.6:-1.6)}
      return {x:p.point.x,z:p.point.z,heading:p.heading,state:p.state,visible:car.visible,wheelRotation:car.userData.wheels[0].rotation.z};
    });
    stats.coinPositions=[];
    for(let i=coins.length-1;i>=0;i--){const c=coins[i],age=clock-c.birth;if(age>2.5){scene.remove(c.group);c.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});coins.splice(i,1);continue}c.group.visible=age>=0;if(age<0)continue;c.group.position.set(c.x,4.75+age*.65,c.z);c.group.quaternion.copy(camera.quaternion);c.group.rotateY(Math.sin(age*2)*.24);c.group.scale.setScalar(Math.min(1,age*7)*Math.min(1,(2.5-age)*2));stats.coinPositions.push({x:c.x,y:c.group.position.y,screenY:c.group.position.clone().project(camera).y});}
    stats.elapsedSeconds=clock-2;stats.stage=stats.carStates[0].state==='servicing'?'service':stats.carStates[0].state==='entering'?'contact':'find';
  }
  function render(){pose();renderer.render(scene,camera);stats.frames++;stats.drawcalls=renderer.info.render.calls;stats.triangles=renderer.info.render.triangles;}
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;lastRender=0;stats.running=false;}
  function schedule(){if(!disposed&&!paused&&!held&&visible&&!document.hidden&&!raf){raf=requestAnimationFrame(frame);stats.running=true}}
  function frame(time){raf=0;if(disposed||paused||held||!visible||document.hidden){stop();return}const interval=compact||innerWidth<720?1000/30:1000/60;if(lastRender&&time-lastRender<interval-.5){schedule();return}clock+=last?Math.min((time-last)/1000,.08):0;last=time;lastRender=time;render();schedule()}
  function resize(){const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight),aspect=w/h;const height=Math.max(13.8,20/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();stats.dpr=Math.min(devicePixelRatio||1,compact?1.25:1.5,Math.sqrt(1300000/(w*h)));renderer.setPixelRatio(stats.dpr);renderer.setSize(w,h,false);render()}
  stage.append(canvas);resize();stats.ready=true;stage.classList.add('scene-ready');
  const unique=new Set();scene.traverse(o=>{if(o.geometry&&!unique.has(o.geometry)){unique.add(o.geometry);stats.vertices+=o.geometry.getAttribute('position').count}});
  const ro=new ResizeObserver(resize);ro.observe(stage);const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else stop()},{threshold:.01});io.observe(stage);
  function visibility(){document.hidden?stop():schedule()}
  function lost(event){event.preventDefault();stats.fallback=true;dispose();stage.dispatchEvent(new CustomEvent('mechanism:fallback'))}
  document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',lost);
  function dispose(){if(disposed)return;disposed=true;stop();ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);stage.classList.remove('scene-ready');canvas.remove();disposeObject(scene);coinMap.dispose();renderer.dispose();renderer.forceContextLoss();}
  schedule();
  return {stats,reveal(){held=false;schedule()},prepareIntro(){held=true;stop()},setProgress(){},setFocus(){},setPaused(value){paused=!!value;stats.paused=paused;paused?stop():schedule()},pause(){this.setPaused(true)},resume(){this.setPaused(false)},dispose};
}
