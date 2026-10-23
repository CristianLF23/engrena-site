const{Cam,fit,proj,mk,solid,put,prism,rings,rrect,ringAt,run,hull,facing,poly,open,circ,clamp,spring,stepS,register,pointer,disposer}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,3.05);fit(C,[[-36,-8,0],[36,30,0],[-36,-8,66],[36,30,66]],200,166);
 const P=proj(C),front=facing(C),root=mk('g',{},svg),base=solid(root);put(base,prism(P,front,...rings(-36,-8,36,30,4,1),-3,0));
 const outer=rrect(-30,5,30,62,4,12),page=rrect(-27,8,27,59,2,12),sheet=mk('path',{class:'sil'},root),back=mk('path',{class:'lo'},root),header=mk('path',{class:'nf lo'},root);
 back.setAttribute('d',poly(hull(outer.map(q=>P(q.u,7,q.v)).concat(outer.map(q=>P(q.u,10,q.v))))));
 const ringsEls=[-17,17].map(x=>mk('path',{class:'nf'},root)), cells=Array.from({length:12},()=>mk('path',{class:'nf lo'},root));
 const carG=mk('g',{},root),body=solid(carG),cabin=solid(carG),wind=mk('path',{class:'nf lo'},carG),wheels=[-6,6].map(x=>mk('path',{class:'sil'},carG));
 const motion=spring(.18),carTravel=spring(0);let gain=value,last=NaN,active=0;
 function car(Q){put(body,prism(Q,front,...rings(-8,-6,8,6,1.8,.6),2,8));put(cabin,{sil:poly(hull(ringAt(Q,rrect(-5,-4,5,4,1.4,8),8).concat(ringAt(Q,rrect(-4,-3,4,3,1.2,8),15)))),crease:open([Q(-3,-3,15),Q(3,-3,15),Q(3,3,15)])});wind.setAttribute('d',open([Q(-4,-3,15),Q(4,-3,15),Q(5,-4,8),Q(-5,-4,8)]));wheels.forEach((w,i)=>w.setAttribute('d',poly(circ(2.2,24).map(q=>Q((i?6:-6)+q.u,6.3,q.v+2.2)))));}
 function draw(){if(last===`${motion.x}:${carTravel.x}`)return;last=`${motion.x}:${carTravel.x}`;const a=motion.x,F=(x,z)=>P(x,10-(60-z)*Math.sin(a),60-(60-z)*Math.cos(a));sheet.setAttribute('d',poly(page.map(q=>F(q.u,q.v))));header.setAttribute('d',open([F(-23,47),F(23,47)]));ringsEls.forEach((el,i)=>el.setAttribute('d',open(circ(4,30).map(q=>P(i?17:-17,8+q.u,60+q.v)))));cells.forEach((el,i)=>{const x=-20+(i%4)*13,z=42-Math.floor(i/4)*12;el.setAttribute('d',poly(rrect(x-3,z-3,x+3,z+3,1,6).map(q=>F(q.u,q.v))));el.classList.toggle('hi',i===active)});car((x,y,z)=>P(x+4+carTravel.x,y+22,z));}
 const loop=register(stage,dt=>{const pageLive=stepS(motion,dt),carLive=stepS(carTravel,dt);draw();return pageLive||carLive});bag.add(loop.unregister);
 function choose([sx,sy]){active=clamp(Math.floor((sx-120)/45),0,3);motion.t=clamp((220-sy)/190,0,.5)*gain;carTravel.t=clamp((sx-200)/80,-1,1)*18*gain;read.textContent=`retorno ${active+1}`;loop.wake()}
 bag.add(pointer(stage,{move:choose,leave(){active=0;motion.t=0;carTravel.t=0;last=NaN;read.textContent='rest';loop.wake()}}));bag.on(stage,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose([e.key==='ArrowLeft'?130:270,150])}});draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;loop.wake()},destroy:bag.dispose};
}
hairline({name:'recurrence',means:'Um calendário marca revisões e o mesmo carro retorna para o próximo atendimento.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[130,200],[205,132],[275,190],null],mount});
