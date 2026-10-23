const{Cam,fit,proj,facing,mk,solid,put,prism,rings,rrect,ringAt,run,poly,open,circ,clamp,lerp,spring,stepS,tween,tset,tval,tdone,register,pointer,disposer}=HL;
const N=4, XS=[-30,-10,10,30], W=15, D=18, H=4;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,3.15);fit(C,[[-42,-13,0],[42,25,0],[-42,-13,40],[42,25,40]],200,166);
 const P=proj(C),front=facing(C),root=mk('g',{},svg),base=solid(root);
 put(base,prism(P,front,...rings(-42,-13,42,25,4,1),-3,0));
 const cells=XS.map(x=>solid(root));
 cells.forEach((c,i)=>put(c,prism(P,front,...rings(XS[i]-8,-8,XS[i]+8,18,2,.7),0,3)));
 const cards=XS.map((x,i)=>{const g=mk('g',{},root),face=solid(g),top=mk('path',{class:'nf lo'},g),mark=mk('path',{class:'nf'},g);return{g,x,i,face,top,mark,a:tween(0),z:tween(0)}});
 let gain=value,active=-1,last='';
 function pose(card,i,now){const lift=tval(card.z,now),shift=tval(card.a,now),x=lerp(card.x,card.x+18*gain,shift),Q=(u,v,z)=>P(x+u,v,z+lift);put(card.face,prism(Q,front,...rings(-6,-1.5,6,1.5,.8,.45),3,10));card.top.setAttribute('d',open([Q(-4,-1,10.1),Q(4,-1,10.1),Q(4,1,10.1)]));card.mark.setAttribute('d',open([Q(-3,-.6,10.2),Q(0,.7,10.2),Q(3,-.6,10.2)]));card.face.sil.classList.toggle('hi',i===active);}
 function draw(now=performance.now()){const sig=cards.map(c=>`${tval(c.a,now).toFixed(3)}:${tval(c.z,now).toFixed(3)}`).join('|');if(sig===last)return;last=sig;cards.forEach((c,i)=>pose(c,i,now));}
 const loop=register(stage,(dt,now)=>{let live=false;cards.forEach(c=>{live=tdone(c.a,now)?live:true;live=tdone(c.z,now)?live:true});draw(now);return live});bag.add(loop.unregister);
 function choose([sx]){const a=XS.reduce((b,x,i)=>Math.abs(P(x,4,4)[0]-sx)<Math.abs(P(XS[b],4,4)[0]-sx)?i:b,0),now=performance.now();cards.forEach((c,i)=>{const d=Math.abs(i-a)*42;tset(c.a,i===a?.72:0,now,d);tset(c.z,i===a?12:0,now,d)});active=a;read.textContent=`ficha ${a+1}`;loop.wake();}
 bag.add(pointer(stage,{move:choose,leave(){const now=performance.now();cards.forEach((c,i)=>{tset(c.a,0,now,Math.abs(i-(active<0?0:active))*42);tset(c.z,0,now,Math.abs(i-(active<0?0:active))*42)});active=-1;read.textContent='rest';loop.wake()}}));
 bag.on(stage,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const a=clamp((active<0?0:active)+(e.key==='ArrowRight'?1:-1),0,N-1);choose([P(XS[a],4,4)[0]])}});
 draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;last='';loop.wake()},destroy:bag.dispose};
}
hairline({name:'followup',means:'Fichas de oportunidades avançam para o próximo acompanhamento.',rules:[1,2,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[145,205],[200,160],[270,205],null],mount});
