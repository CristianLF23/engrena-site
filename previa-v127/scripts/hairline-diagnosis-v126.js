const{Cam,fit,proj,facing,mk,solid,put,prism,rings,rrect,ringAt,poly,open,circ,clamp,spring,stepS,register,pointer,disposer}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,3.05);fit(C,[[-40,-14,0],[40,26,0],[-40,-14,42],[40,26,42]],200,166);
 const P=proj(C),front=facing(C),root=mk('g',{},svg),base=solid(root);put(base,prism(P,front,...rings(-40,-14,40,26,4,1),-3,0));
 const sheet=solid(root);put(sheet,prism(P,front,...rings(-30,-8,30,23,3,.8),1,5));
 const rows=Array.from({length:4},()=>mk('path',{class:'nf lo'},root)),marks=Array.from({length:4},()=>mk('path',{class:'nf'},root));
 const lens=mk('path',{class:'nf lo'},root),rim=mk('path',{class:'nf sil'},root),spot=mk('path',{class:'hi'},root),handle=solid(root),pos=spring(0);let gain=value,last=NaN,active=0;
 function draw(){if(last===pos.x)return;last=pos.x;const t=clamp(pos.x,-1,1),x=t*20,y=7+Math.abs(t)*2,z=11;rows.forEach((el,i)=>{const yy=19-i*7;el.setAttribute('d',open([P(-24,yy,5.4),P(24,yy,5.4)]));marks[i].setAttribute('d',open([P(-20,yy-2,5.5),P(-8,yy-2,5.5),P(-8,yy+2,5.5)]));marks[i].classList.toggle('hi',i===active)});const Q=(u,v,w)=>P(x+u,y+v,w);rim.setAttribute('d',open(circ(11,28).map(q=>Q(q.u,q.v,z))));lens.setAttribute('d',open(circ(8,24).map(q=>Q(q.u,q.v,z+.05))));spot.setAttribute('d',open([Q(-5,-1,z+.1),Q(5,-1,z+.1),Q(5,2,z+.1)]));put(handle,prism(P,front,...rings(x+7,y-1.5,x+25,y+1.5,1,.45),6.6,9.6));}
 const loop=register(stage,dt=>{const live=stepS(pos,dt);draw();return live});bag.add(loop.unregister);
 function choose([sx,sy]){const target=clamp((sx-200)/75,-1,1);pos.t=target*gain;active=clamp(Math.round((sy-124)/28),0,3);read.textContent=`análise ${active+1}`;loop.wake()}
 bag.add(pointer(stage,{move:choose,leave(){pos.t=0;active=0;read.textContent='rest';loop.wake()}}));bag.on(stage,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose([e.key==='ArrowLeft'?140:260,150])}});draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;loop.wake()},destroy:bag.dispose};
}
hairline({name:'diagnosis',means:'Uma lupa percorre a ordem de serviço e destaca o ponto que precisa de atenção.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[145,156],[200,130],[270,156],null],mount});
