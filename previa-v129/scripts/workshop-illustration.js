/* Independent vehicles on the original illustrated workshop, not a camera effect. */
const LOOP=15, W=1536,H=1024;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
function point(a,b,t){return [lerp(a[0],b[0],t),lerp(a[1],b[1],t)]}
function curve(a,b,c,t){const k=1-t;return [k*k*a[0]+2*k*t*b[0]+t*t*c[0],k*k*a[1]+2*k*t*b[1]+t*t*c[1]]}
async function bitmap(name){const im=new Image();im.src=new URL('../assets/images/'+name+'.webp',import.meta.url);await im.decode();return im}

export async function initMechanism(stage,{holdAssembly=false}={}){
  const [base,enter,exit]=await Promise.all(['workshop-base','workshop-car-in','workshop-car-out'].map(bitmap));
  const canvas=document.createElement('canvas');canvas.className='mechanism-canvas';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('Canvas unavailable');
  let dead=false,visible=true,paused=false,held=holdAssembly,raf=0,last=0,lastRender=0,clock=2.6;
  let width=1,height=1,scale=1,offsetX=0,offsetY=0;
  const arrivals=new Map(),coins=[];
  const stats={renderer:'canvas-illustrated',active:true,ready:true,running:false,paused:false,fallback:false,frames:0,elapsedSeconds:0,loopDuration:LOOP,cars:5,carStates:[],arrivals:0,moneyColor:'#16a56a',pieces:3,dpr:1,vertices:0,drawcalls:0,stage:'find'};
  function car(image,x,y,w,flip=false,opacity=1){
    const h=w*image.height/image.width;ctx.save();ctx.globalAlpha=opacity;
    ctx.translate(x,y);if(flip)ctx.scale(-1,1);
    ctx.save();ctx.scale(1,.26);const shade=ctx.createRadialGradient(0,0,2,0,0,w*.43);shade.addColorStop(0,'rgba(12,37,64,.20)');shade.addColorStop(1,'rgba(12,37,64,0)');ctx.fillStyle=shade;ctx.fillRect(-w*.5,-w*.5,w,w);ctx.restore();
    ctx.drawImage(image,-w/2,-h,w,h);ctx.restore();
  }
  function foreground(){
    // The roof and jambs remain in front of a vehicle crossing the entrance.
    ctx.save();ctx.beginPath();
    const shapes=[[[488,484],[880,548],[889,604],[494,546]],[[495,536],[536,546],[536,766],[493,759]],[[851,591],[895,603],[895,862],[849,843]]];
    for(const shape of shapes){ctx.moveTo(...shape[0]);shape.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath()}
    ctx.clip();ctx.drawImage(base,0,0,W,H);ctx.restore();
  }
  function spawn(index,cycle){
    if(arrivals.get(index)===cycle)return;arrivals.set(index,cycle);stats.arrivals++;
    for(let i=0;i<4;i++)coins.push({birth:clock+i*.18,x:730+i*19,y:686-i*9});
    stage.dispatchEvent(new CustomEvent('workshop:arrival',{detail:{car:index,total:stats.arrivals}}));
    stage.dispatchEvent(new CustomEvent('workshop:stage',{detail:{stage:'service',progress:clock/LOOP%1}}));
  }
  function draw(){
    ctx.setTransform(stats.dpr,0,0,stats.dpr,0,0);ctx.clearRect(0,0,width,height);ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
    ctx.drawImage(base,0,0,W,H);stats.carStates=[];
    // Two cars circulate on the forecourt independently of servicing cars.
    for(let i=0;i<2;i++){
      const t=(clock/(11+i*2)+i*.53)%1;
      const p=i?point([1750,1040],[-260,895],t):point([-260,930],[1770,1070],t);
      car(i?enter:exit,p[0],p[1],225,!!i,clamp(Math.min(t,1-t)*12));
      stats.carStates.push({kind:'passing',x:p[0],y:p[1],phase:t});
    }
    const depth=[];
    for(let i=0;i<3;i++){
      const shifted=clock+i*5,t=(shifted%LOOP)/LOOP,cycle=Math.floor(shifted/LOOP);let p,w,alpha=1,image=enter,flip=false,kind='approaching';
      if(t<.28){p=curve([-280,1010],[390,990],[706,802],t/.28);w=lerp(355,250,t/.28);alpha=clamp(t*16)}
      else if(t<.42){p=point([706,802],[747,736],(t-.28)/.14);w=lerp(250,190,(t-.28)/.14);kind='entering';spawn(i,cycle)}
      else if(t<.51){p=[747,736];w=190;kind='servicing';alpha=1-clamp((t-.46)/.05)}
      else if(t<.61){p=point([747,736],[647,842],(t-.51)/.10);w=lerp(185,250,(t-.51)/.10);image=exit;flip=true;kind='leaving';alpha=clamp((t-.51)*25)}
      else if(t<.83){p=curve([647,842],[290,1030],[-280,1100],(t-.61)/.22);w=lerp(250,330,(t-.61)/.22);image=exit;flip=true;kind='leaving';alpha=clamp((.83-t)*14)}
      else continue;
      depth.push({image,p,w,flip,alpha});stats.carStates.push({kind,x:p[0],y:p[1],phase:t});
    }
    depth.sort((a,b)=>a.p[1]-b.p[1]);for(const c of depth)car(c.image,c.p[0],c.p[1],c.w,c.flip,c.alpha);
    foreground();
    for(let i=coins.length-1;i>=0;i--){const coin=coins[i],age=clock-coin.birth;if(age>1.7){coins.splice(i,1);continue}if(age<0)continue;
      const rise=age*105,alpha=Math.min(1,age*8)*clamp((1.7-age)/.5);ctx.save();ctx.globalAlpha=alpha;ctx.translate(coin.x+Math.sin(age*2)*13,coin.y-rise);ctx.rotate(Math.sin(age*3)*.12);
      ctx.beginPath();ctx.ellipse(0,0,28,29,0,0,Math.PI*2);ctx.fillStyle='#16a56a';ctx.fill();ctx.strokeStyle='#a3edc4';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#fff';ctx.font='600 25px Barlow, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('R$',0,1);ctx.restore();
    }
    stats.visibleCoins=coins.filter(c=>clock>=c.birth).length;stats.elapsedSeconds=clock-2.6;stats.frames++;stats.drawcalls=1+stats.carStates.length+coins.length;
  }
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;lastRender=0;stats.running=false}
  function frame(now){raf=0;if(dead||!visible||document.hidden||paused||held){stop();return}
    const limit=innerWidth<720?1000/30:1000/60;if(lastRender&&now-lastRender<limit-.5){schedule();return}
    const dt=last?Math.min(.25,(now-last)/1000):0;last=now;lastRender=now;clock+=dt;draw();schedule();
  }
  function schedule(){if(!raf&&!dead&&visible&&!document.hidden&&!paused&&!held){stats.running=true;raf=requestAnimationFrame(frame)}}
  function resize(){width=Math.max(1,stage.clientWidth);height=Math.max(1,stage.clientHeight);stats.dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1500000/(width*height)));canvas.width=Math.round(width*stats.dpr);canvas.height=Math.round(height*stats.dpr);scale=Math.min(width/W,height/H);offsetX=(width-W*scale)/2;offsetY=(height-H*scale)/2;draw();schedule()}
  stage.append(canvas);resize();stage.classList.add('scene-ready');
  const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(stage);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?schedule():stop()},{threshold:.01});intersection.observe(stage);
  const onVisibility=()=>document.hidden?stop():schedule();document.addEventListener('visibilitychange',onVisibility);
  schedule();
  return {stats,reveal(){held=false;schedule()},prepareIntro(){held=true;clock=2.6;stop();draw()},setProgress(){},setFocus(){},setPaused(value){paused=!!value;stats.paused=paused;paused?stop():schedule()},pause(){this.setPaused(true)},resume(){this.setPaused(false)},dispose(){if(dead)return;dead=true;stop();sizeObserver.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',onVisibility);canvas.remove();stage.classList.remove('scene-ready');stats.active=false;coins.length=0}};
}
