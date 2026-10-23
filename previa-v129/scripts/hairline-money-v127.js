const{Cam,fit,proj,mk,solid,put,prism,rings,facing,poly,clamp,spring,stepS,register,pointer,disposer}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,3.7);fit(C,[[-32,-9,2],[32,9,2],[-32,-9,86],[32,9,86]],200,164);
 const P=proj(C),front=facing(C),root=mk('g',{},svg),bar=solid(root),back=mk('path',{class:'sil'},root),face=mk('path',{class:'sil hi'},root),turn=spring(.12);
 const curves=[[[18,65],[8,77],[-18,74],[-18,58]],[[-18,58],[-18,44],[19,48],[19,31]],[[19,31],[19,15],[-8,12],[-20,23]]];
 const points=[];curves.forEach(curve=>{for(let i=0;i<=24;i++){const t=i/24,s=1-t,[a,b,c,d]=curve,x=s*s*s*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t*t*t*d[0],z=s*s*s*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t*t*t*d[1],dx=3*s*s*(b[0]-a[0])+6*s*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]),dz=3*s*s*(b[1]-a[1])+6*s*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]),len=Math.hypot(dx,dz);if(points.length&&i===0)continue;points.push({x,z,nx:-dz/len,nz:dx/len})}});
 const outline=points.map(p=>[p.x+p.nx*4.6,p.z+p.nz*4.6]).concat(points.slice().reverse().map(p=>[p.x-p.nx*4.6,p.z-p.nz*4.6]));let gain=value,last=NaN;
 function draw(){if(last===turn.x)return;last=turn.x;const a=turn.x*.23,Q=(x,y,z)=>P(x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),z+turn.x*3);
  put(bar,prism(Q,front,...rings(-1.6,-2.5,1.6,2.5,1.2,.45),7,83));back.setAttribute('d',poly(outline.map(([x,z])=>Q(x,-2.7,z))));face.setAttribute('d',poly(outline.map(([x,z])=>Q(x,2.7,z))));
 }
 const loop=register(stage,dt=>{const live=stepS(turn,dt);draw();return live});bag.add(loop.unregister);
 function choose([x]){turn.t=clamp((x-200)/100,-1,1)*gain;read.textContent='oportunidade';loop.wake()}
 bag.add(pointer(stage,{move:choose,leave(){turn.t=.12;read.textContent='rest';loop.wake()}}));bag.on(stage,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose([e.key==='ArrowLeft'?120:280])}});draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;loop.wake()},destroy:bag.dispose};
}
hairline({name:'money',means:'Um cifrão em volume gira suavemente para lembrar as oportunidades de venda que merecem atenção.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[125,165],[275,145],[210,190],null],mount});
