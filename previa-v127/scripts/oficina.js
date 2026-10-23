/** Oficina: garagem aberta e carro que se aproxima do box pelo ponteiro. */
const {Cam,clamp,circ,fit,facing,hull,lerp,mk,open,pointer,poly,prism,proj,put,ringAt,rings,rrect,run,solid,spring,stepS,register,disposer,unproj}=HL;
function mount({stage,svg,read},value){
  const bag=disposer(),camera=Cam(45,.5,2.25);
  fit(camera,[[17,-3,0],[90,96,0],[17,-3,57],[90,37,57]],200,164);
  const P=proj(camera),front=facing(camera),root=mk('g',{},svg);
  const rear=mk('g',{},root),car=mk('g',{},root),near=mk('g',{},root);
  function block(parent,x0,y0,x1,y1,z0,z1,r=2,b=.7){const shape=solid(parent);put(shape,prism(P,front,...rings(x0,y0,x1,y1,r,b),z0,z1));return shape;}
  block(rear,17,-3,90,96,-2,0,5,1.2);
  block(rear,24,0,84,4,0,49,2,.7);
  block(rear,24,0,28,37,0,49,2,.7);
  block(rear,35,12,73,32,0,1,2,.5);
  const body=solid(car),cabin=solid(car),hood=mk('path',{class:'nf lo'},car),windscreen=mk('path',{class:'nf lo'},car);
  const wheels=[-10,10].map(y=>({y,outer:mk('path',{class:'sil'},car),inner:mk('path',{class:'nf lo'},car)}));
  block(near,80,0,84,37,0,49,2,.7);
  block(near,24,32,30,38,0,49,2,.7);block(near,78,32,84,38,0,49,2,.7);
  const lintel=block(near,24,0,84,38,49,54,2,.7);lintel.sil.classList.add('hi');
  const position=spring(0);let reach=value,last=NaN;
  const base=rings(-12,-18,12,18,4,1),foot=rrect(-10,-3,10,13,3,8),top=rrect(-8,1,8,10,2,8),inner=rrect(-7.2,1.8,7.2,9.2,1.2,8);
  function draw(){
    const t=clamp(position.x,0,1);if(t===last)return;last=t;
    const cy=lerp(76,29,t),Q=(x,y,z)=>P(x+54,y+cy,z);
    put(body,prism(Q,front,...base,6,14));
    put(cabin,{sil:poly(hull(ringAt(Q,foot,14).concat(ringAt(Q,top,27)))),crease:open(ringAt(Q,run(inner,front),27))});
    windscreen.setAttribute('d',open([Q(-8,1,27),Q(8,1,27),Q(10,-3,14),Q(-10,-3,14)]));
    hood.setAttribute('d',open([Q(-8,-6,14.2),Q(8,-6,14.2)]));
    for(const wheel of wheels){wheel.outer.setAttribute('d',poly(circ(5,24).map(q=>Q(12,q.u+wheel.y,q.v+6))));wheel.inner.setAttribute('d',poly(circ(2.2,18).map(q=>Q(12.1,q.u+wheel.y,q.v+6))))}
  }
  const loop=register(stage,dt=>{const live=stepS(position,dt);draw();return live;});bag.add(loop.unregister);
  function choose(point){const q=unproj(camera,point[0],point[1],0);position.t=Math.abs(q[0]-54)<48?clamp((89-q[1])/62*reach,0,1):0;read.textContent=position.t>.1?'box':'rest';lintel.sil.classList.toggle('hi',position.t<=.1);body.sil.classList.toggle('hi',position.t>.1);loop.wake();}
  bag.add(pointer(stage,{move:choose,leave(){position.t=0;read.textContent='rest';lintel.sil.classList.add('hi');body.sil.classList.remove('hi');loop.wake();}}));
  bag.on(stage,'keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();position.t=event.key==='Home'||event.key==='ArrowLeft'?0:1;read.textContent=position.t?'box':'rest';lintel.sil.classList.toggle('hi',!position.t);body.sil.classList.toggle('hi',!!position.t);loop.wake();});
  draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());
  return {set(v){reach=v;loop.wake();},destroy:bag.dispose};
}
hairline({name:'oficina',means:'Uma oficina aberta recebe o carro conforme o ponteiro se aproxima do box.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.3],tour:[[200,240],[218,190],[237,152],null],mount});
