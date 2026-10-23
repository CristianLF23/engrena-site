const{Cam,fit,proj,facing,mk,solid,put,prism,rings,rrect,circ,poly,open,clamp,lerp,spring,stepS,register,pointer,disposer}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,3.15);fit(C,[[-39,-16,0],[39,25,0],[-39,-16,52],[39,25,52]],200,164);
 const P=proj(C),front=facing(C),root=mk('g',{},svg),base=solid(root);put(base,prism(P,front,...rings(-39,-16,39,25,4,1),-3,0));
 const xs=[-27,-9,9,27],rests=[12,20,28,36],bars=xs.map((x,i)=>({x,shape:solid(root),sp:spring(rests[i])}));
 const line=mk('path',{class:'nf lo'},root),coinGroup=mk('g',{},root),coins=[0,1,2].map(()=>({front:mk('path',{class:'sil'},coinGroup),crease:mk('path',{class:'nf lo'},coinGroup)})),rise=spring(0);
 let gain=value,last='',active=-1;
 function draw(){const signature=bars.map(b=>b.sp.x).join(',')+rise.x;if(signature===last)return;last=signature;
  bars.forEach((b,i)=>{put(b.shape,prism(P,front,...rings(b.x-6,-2,b.x+6,12,1.5,.65),0,b.sp.x));b.shape.sil.classList.toggle('hi',i===(active<0?3:active))});
  line.setAttribute('d',open(bars.map(b=>P(b.x,12.4,b.sp.x+1))));
  coins.forEach((coin,i)=>{const x=16+i*8,y=22-i*3,z=14+i*7+rise.x;coin.front.setAttribute('d',poly(circ(5,36).map(q=>P(x+q.u,y,z+q.v))));coin.crease.setAttribute('d',poly(circ(3.6,32).map(q=>P(x+q.u,y+.05,z+q.v))))});
 }
 const loop=register(stage,dt=>{let live=stepS(rise,dt);bars.forEach(b=>{live=stepS(b.sp,dt)||live});draw();return live});bag.add(loop.unregister);
 const hit=xs.map(x=>P(x,5,20));
 function choose([sx]){active=hit.reduce((best,p,i)=>Math.abs(p[0]-sx)<Math.abs(hit[best][0]-sx)?i:best,0);bars.forEach((b,i)=>b.sp.t=clamp(rests[i]+(14-Math.abs(i-active)*6)*gain,7,49));rise.t=12*gain;read.textContent='venda';loop.wake()}
 bag.add(pointer(stage,{move:choose,leave(){active=-1;bars.forEach((b,i)=>b.sp.t=rests[i]);rise.t=0;read.textContent='rest';loop.wake()}}));bag.on(stage,'keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();choose(hit[clamp(active+(e.key==='ArrowRight'?1:-1),0,3)])}});
 draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;loop.wake()},destroy:bag.dispose};
}
hairline({name:'better',means:'Barras ganham altura e moedas sobem conforme mais oportunidades viram vendas.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[125,205],[200,165],[270,128],null],mount});
