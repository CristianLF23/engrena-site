const{Cam,fit,proj,mk,solid,put,prism,rings,rrect,ringAt,run,hull,facing,poly,open,circ,clamp,spring,stepS,register,pointer,disposer}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,3.05);fit(C,[[-34,-4,0],[34,32,0],[-34,-4,67],[34,32,67]],200,166);
 const P=proj(C),front=facing(C),root=mk('g',{},svg),base=solid(root);put(base,prism(P,front,...rings(-34,-4,34,32,4,1),-3,0));
 // A bound service calendar, not a phone: two binder rings, page grid and returning appointment.
 const back=mk('path',{class:'sil'},root),sheet=mk('path',{class:'sil'},root),header=mk('path',{class:'nf lo'},root),binding=[-17,17].map(()=>mk('path',{class:'nf'},root));
 const outer=rrect(-30,7,30,61,3,10),page=rrect(-27,10,27,58,2,10);
 back.setAttribute('d',poly(hull(outer.map(q=>P(q.u,6,q.v)).concat(outer.map(q=>P(q.u,10,q.v))))));
 const cells=Array.from({length:9},()=>mk('path',{class:'nf lo'},root)),motion=spring(0);let gain=value,last=NaN,active=0;
 // A small service vehicle is parked at the foot of the calendar to anchor its meaning.
 const body=solid(root),cabin=solid(root),wheels=[-6,6].map(()=>mk('path',{class:'sil'},root));
 const Q=(x,y,z)=>P(x+8,y+24,z);
 put(body,prism(Q,front,...rings(-16,-6,16,6,2,.6),2,8));put(cabin,prism(Q,front,...rings(-7,-5,6,5,1.8,.6),8,16));
 wheels.forEach((w,i)=>w.setAttribute('d',poly(circ(2.6,26).map(q=>Q(q.u+(i?10:-10),6.2,q.v+2.6)))));
 function draw(){if(last===motion.x)return;last=motion.x;const angle=motion.x;
  const F=(x,z)=>P(x,10-(58-z)*Math.sin(angle),58-(58-z)*Math.cos(angle));
  sheet.setAttribute('d',poly(page.map(q=>F(q.u,q.v))));header.setAttribute('d',open([F(-24,47),F(24,47)]));
  binding.forEach((b,i)=>b.setAttribute('d',open(circ(4,32).map(q=>P(i?17:-17,8+q.u,60+q.v)))));
  cells.forEach((cell,i)=>{const x=-20+(i%3)*17,z=37-Math.floor(i/3)*11;cell.setAttribute('d',poly(rrect(x-3,z-3,x+3,z+3,1,6).map(q=>F(q.u,q.v))));cell.classList.toggle('hi',i===active)});
 }
 const loop=register(stage,dt=>{const live=stepS(motion,dt);draw();return live});bag.add(loop.unregister);
 function choose([sx,sy]){active=clamp(Math.floor((sx-120)/55),0,2)*3+1;motion.t=clamp((220-sy)/200,0,.5)*gain;last=NaN;read.textContent='retorno';loop.wake()}
 bag.add(pointer(stage,{move:choose,leave(){active=0;motion.t=0;last=NaN;read.textContent='rest';loop.wake()}}));bag.on(stage,'keydown',e=>{if(['ArrowLeft','ArrowRight','Home'].includes(e.key)){e.preventDefault();choose([e.key==='ArrowLeft'?130:250,150])}});
 draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;loop.wake()},destroy:bag.dispose};
}
hairline({name:'recurrence',means:'Um calendário de revisões volta a marcar o próximo atendimento do mesmo carro.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[135,200],[205,132],[270,180],null],mount});
