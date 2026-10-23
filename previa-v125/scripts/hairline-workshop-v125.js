const {Cam,fit,proj,facing,mk,solid,put,prism,rings,rrect,ringAt,run,hull,poly,open,circ,lerp,clamp,spring,stepS,register,pointer,disposer}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,2.72);fit(C,[[-37,-23,0],[37,59,0],[-37,-23,43],[37,23,43]],200,162);
 const P=proj(C),front=facing(C),root=mk('g',{},svg),parts=[];
 function block(x0,y0,x1,y1,z0,z1,r=2){const item=solid(root);put(item,prism(P,front,...rings(x0,y0,x1,y1,r,.6),z0,z1));parts.push({g:item.g,depth:(x0+x1+y0+y1)/2});return item}
 block(-37,-23,37,59,-2,0,4);
 // Two open driving lanes: each 22 wide for a car 13 wide.
 block(-32,-18,-29,23,0,35);block(-2,-18,2,23,0,35);block(29,-18,32,23,0,35);
 const cars=[-15,15].map(x=>{const g=mk('g',{},root),body=solid(g),cabin=solid(g),wind=mk('path',{class:'nf lo'},g),wheels=[-5,5].map(y=>({y,p:mk('path',{class:'sil'},g),rim:mk('path',{class:'nf lo'},g)}));const item={g,depth:0,x,body,cabin,wind,wheels};parts.push(item);return item});
 const roof=block(-35,-21,35,25,35,40,2);parts[parts.length-1].depth=200;
 const roofSeam=mk('path',{class:'nf lo',d:open([P(-28,-13,40.1),P(28,-13,40.1)])},roof.g);roof.sil.classList.add('hi');
 const motion=spring(.18);let gain=value,last=-1;
 function draw(){if(last===motion.x)return;last=motion.x;const t=clamp(motion.x,0,1);
  cars.forEach((car,i)=>{const y=lerp(48,0,i?1-t:t),Q=(x,v,z)=>P(car.x+x,y+v,z);car.depth=car.x+y;
   put(car.body,prism(Q,front,...rings(-6.5,-9,6.5,9,2,.6),2.3,8));
   const foot=rrect(-5.5,-3.5,5.5,5,1.6,8),top=rrect(-4.5,-1.5,4.5,3.6,1.4,8),inner=rrect(-3.9,-.9,3.9,3,1,8);
   put(car.cabin,{sil:poly(hull(ringAt(Q,foot,8).concat(ringAt(Q,top,15)))),crease:open(ringAt(Q,run(inner,front),15))});
   car.wind.setAttribute('d',open([Q(-4.5,-1.5,15),Q(4.5,-1.5,15),Q(5.5,-3.5,8),Q(-5.5,-3.5,8)]));
   car.wheels.forEach(w=>{w.p.setAttribute('d',poly(circ(2.3,24).map(q=>Q(6.6,q.u+w.y,q.v+2.3))));w.rim.setAttribute('d',poly(circ(1,18).map(q=>Q(6.7,q.u+w.y,q.v+2.3))))});
   car.body.sil.classList.toggle('hi',i===0&&motion.t>.2);
  });
  // The slab stays behind; the roof occludes cars inside the actual volume.
  parts.slice(1).sort((a,b)=>a.depth-b.depth).forEach(p=>root.append(p.g));
 }
 const loop=register(stage,dt=>{const live=stepS(motion,dt);draw();return live});bag.add(loop.unregister);
 function choose([x,y]){motion.t=clamp((280-y)/150*gain,0,1);roof.sil.classList.toggle('hi',motion.t<=.2);read.textContent=motion.t>.6?'box':'entrada';loop.wake()}
 bag.add(pointer(stage,{move:choose,leave(){motion.t=.18;roof.sil.classList.add('hi');read.textContent='rest';loop.wake()}}));
 bag.on(stage,'keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();choose([200,e.key==='ArrowLeft'||e.key==='Home'?260:130])});
 draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;loop.wake()},destroy:bag.dispose};
}
hairline({name:'workshop',means:'Uma oficina com duas passagens recebe um carro enquanto outro sai.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[175,252],[210,166],[230,128],null],mount});
