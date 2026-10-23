const{Cam,fit,proj,mk,rrect,circ,poly,open,clamp,spring,stepS,register,pointer,disposer}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,3.9);fit(C,[[-32,-28,6],[48,32,6],[-32,-28,74],[48,32,74]],200,165);const P=proj(C),root=mk('g',{},svg),k=Math.SQRT1_2;
 const D=(u,v,depth=0)=>P(u*k+depth*k,-u*k+depth*k,36+v),board=rrect(-25,-25,25,25,3.2,14);
 mk('path',{class:'sil',d:poly(board.map(q=>D(q.u,q.v,-3)))},root);mk('path',{class:'sil',d:poly(board.map(q=>D(q.u,q.v,0)))},root);
 mk('path',{class:'sil',d:poly(rrect(-9,21,9,27,2.5,12).map(q=>D(q.u,q.v,1)))},root);
 for(let i=0;i<4;i++){const z=13-i*9;mk('path',{class:'nf lo',d:poly(rrect(-18,z-2,-14,z+2,.8,6).map(q=>D(q.u,q.v,.1)))+open([D(-10,z,.1),D(17,z,.1)])},root)}
 const handleBack=mk('path',{class:'sil'},root),handleFace=mk('path',{class:'sil'},root),rimBack=mk('path',{class:'sil','fill-rule':'evenodd'},root),rimFace=mk('path',{class:'sil hi','fill-rule':'evenodd'},root),innerEdge=mk('path',{class:'nf lo'},root),travel=spring(-.12);
 let gain=value,last=NaN;const handle=rrect(0,-3.3,24,3.3,3.2,14),outer=circ(15,64),inner=circ(11.5,64);
 function draw(){if(last===travel.x)return;last=travel.x;const x=travel.x*10,z=44+travel.x*3,L=(u,v,d)=>P(9+x+u*k+d*k,12-u*k+d*k,z+v),H=(u,v,d)=>L(10+(u+v)*k,-10+(-u+v)*k,d);
  handleBack.setAttribute('d',poly(handle.map(q=>H(q.u,q.v,-1.8))));handleFace.setAttribute('d',poly(handle.map(q=>H(q.u,q.v,1.8))));
  const ring=d=>poly(outer.map(q=>L(q.u,q.v,d)))+poly(inner.slice().reverse().map(q=>L(q.u,q.v,d)));
  rimBack.setAttribute('d',ring(-2.2));rimFace.setAttribute('d',ring(2.2));innerEdge.setAttribute('d',poly(circ(12.2,64).map(q=>L(q.u,q.v,2.3))));
 }
 const loop=register(stage,dt=>{const live=stepS(travel,dt);draw();return live});bag.add(loop.unregister);function choose([x]){travel.t=clamp((x-200)/85,-1,1)*gain;read.textContent='análise';loop.wake()}
 bag.add(pointer(stage,{move:choose,leave(){travel.t=-.12;read.textContent='rest';loop.wake()}}));bag.on(stage,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose([e.key==='ArrowLeft'?125:275])}});draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;loop.wake()},destroy:bag.dispose};
}
hairline({name:'diagnosis',means:'Uma lupa de aro largo e cabo sólido examina uma ordem de serviço durante o diagnóstico.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[135,155],[265,155],[200,195],null],mount});
