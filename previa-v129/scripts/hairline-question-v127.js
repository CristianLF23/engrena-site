const{Cam,fit,proj,mk,circ,poly,clamp,spring,stepS,register,pointer,disposer}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,3.7);fit(C,[[-30,-8,0],[30,8,0],[-30,-8,93],[30,8,93]],200,164);const P=proj(C),root=mk('g',{},svg),back=mk('path',{class:'sil'},root),face=mk('path',{class:'sil hi'},root),dotBack=mk('path',{class:'sil'},root),dotFace=mk('path',{class:'sil hi'},root),lean=spring(.05);
 const curves=[[[ -18,67],[-18,89],[20,88],[20,69]],[[20,69],[20,55],[1,56],[1,41]],[[1,41],[1,39],[1,37],[1,35]]],points=[];
 curves.forEach(curve=>{for(let i=0;i<=24;i++){const t=i/24,s=1-t,[a,b,c,d]=curve,x=s*s*s*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t*t*t*d[0],z=s*s*s*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t*t*t*d[1],dx=3*s*s*(b[0]-a[0])+6*s*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]),dz=3*s*s*(b[1]-a[1])+6*s*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]),len=Math.hypot(dx,dz);if(points.length&&i===0)continue;points.push({x,z,nx:-dz/len,nz:dx/len})}});
 const outline=points.map(p=>[p.x+p.nx*4.8,p.z+p.nz*4.8]).concat(points.slice().reverse().map(p=>[p.x-p.nx*4.8,p.z-p.nz*4.8]));let gain=value,last=NaN;
 function draw(){if(last===lean.x)return;last=lean.x;const a=lean.x*.14,Q=(x,y,z)=>P(x*Math.cos(a)+(z-48)*Math.sin(a),y,48+(z-48)*Math.cos(a)-x*Math.sin(a));
  back.setAttribute('d',poly(outline.map(([x,z])=>Q(x,-2.8,z))));face.setAttribute('d',poly(outline.map(([x,z])=>Q(x,2.8,z))));dotBack.setAttribute('d',poly(circ(5,48).map(q=>Q(1+q.u,-2.8,17+q.v))));dotFace.setAttribute('d',poly(circ(5,48).map(q=>Q(1+q.u,2.8,17+q.v))));
 }
 const loop=register(stage,dt=>{const live=stepS(lean,dt);draw();return live});bag.add(loop.unregister);function choose([x]){lean.t=clamp((x-200)/110,-1,1)*gain;read.textContent='dúvida';loop.wake()}
 bag.add(pointer(stage,{move:choose,leave(){lean.t=.05;read.textContent='rest';loop.wake()}}));bag.on(stage,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose([e.key==='ArrowLeft'?125:275])}});draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;loop.wake()},destroy:bag.dispose};
}
hairline({name:'question',means:'Uma interrogação em volume se inclina com o ponteiro e convida a esclarecer as dúvidas.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[125,160],[275,160],[210,190],null],mount});
