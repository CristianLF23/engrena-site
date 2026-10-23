const {Cam,fit,proj,facing,mk,solid,put,prism,rings,rrect,ringAt,run,hull,poly,open,circ,fillet,clamp,spring,stepS,register,pointer,disposer}=HL;
function mount({stage,svg,read},value){
 const bag=disposer(),C=Cam(45,.5,2.7);
 fit(C,[[-39,-18,0],[39,23,0],[-39,-18,84],[39,23,84]],200,166);
 const P=proj(C),front=facing(C),root=mk('g',{},svg);
 const bubbles=[mk('path',{class:'sil'},root),mk('path',{class:'sil'},root)],messageLines=[mk('path',{class:'nf lo'},root),mk('path',{class:'nf lo'},root)];
 const bubbleShape=fillet([[-12,-6],[-8,-6],[-11,-11],[-2,-6],[12,-6],[12,7],[-12,7]],[2,.5,.2,.6,2,2,2],6);
 bubbles.forEach((bubble,i)=>{const Q=(u,v)=>P(u+(i?19:-20),-7,v+(i?74:62));bubble.setAttribute('d',poly(bubbleShape.map(q=>Q(q[0],q[1]))));messageLines[i].setAttribute('d',open([Q(-7,2),Q(7,2)])+open([Q(-7,-1.5),Q(3,-1.5)]));});
 const cord=mk('path',{class:'nf'},root),body=solid(root);
 const foot=rrect(-25,-13,25,20,4,14),top=rrect(-17,-8,17,8.5,3.3,14),inner=rrect(-16,-7,16,7.5,2.8,14);
 put(body,{sil:poly(hull(ringAt(P,foot,2).concat(ringAt(P,top,26)))),crease:open(ringAt(P,run(inner,front),26))});
 // The rotary dial lies on the actual sloped front of the tapered body.
 const D=(x,z)=>P(x,20-(z-2)*11.5/24+.15,z),dial=mk('path',{class:'sil'},root),center=mk('path',{class:'nf lo'},root);
 dial.setAttribute('d',poly(circ(9.1,64).map(q=>D(q.u,14.4+q.v))));
 center.setAttribute('d',poly(circ(3.6,48).map(q=>D(q.u,14.4+q.v))));
 for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2+.2,x=Math.cos(a)*6.7,z=14.4+Math.sin(a)*6.7;mk('path',{class:'nf',d:poly(circ(1.25,20).map(q=>D(x+q.u,z+q.v)))},root);}
 for(const x of [-13,13]){const post=solid(root);put(post,prism(P,front,...rings(x-1.7,-1.8,x+1.7,2.2,1.3,.45),26,33));}
 const lift=spring(3),tilt=spring(.035),receiver=solid(root),ears=[solid(root),solid(root)];
 let gain=value,active=0,last='',lastPointer=null;
 function pose(x,y,z){const a=tilt.x;return P(x*Math.cos(a)+(z-40)*Math.sin(a),y-3,40+(z-40)*Math.cos(a)-x*Math.sin(a)+lift.x);}
 function draw(){const signature=`${lift.x}:${tilt.x}:${active}`;if(last===signature)return;last=signature;
  const arch=(x,y,z)=>pose(x,y,z+3.2*(1-(x/21)**2));
  put(receiver,prism(arch,front,...rings(-21,-4,21,4,3.2,.8),40.5,45));
  ears.forEach((ear,i)=>{const x=i?23:-23;put(ear,prism(pose,front,...rings(x-6.5,-7,x+6.5,7,5.8,.8),33.5,45));});
  const a=pose(29,0,39),b=P(46,-2,45+lift.x*.5),c=P(45,19,8),d=P(23.5,13,9);
  cord.setAttribute('d',`M${a[0]},${a[1]}C${b[0]},${b[1]} ${c[0]},${c[1]} ${d[0]},${d[1]}`);
  bubbles.forEach((bubble,i)=>bubble.classList.toggle('hi',i===active));
 }
 const loop=register(stage,dt=>{const a=stepS(lift,dt),b=stepS(tilt,dt);draw();return a||b;});bag.add(loop.unregister);
 function choose(point){lastPointer=point;const [x,y]=point;active=x<200?0:1;lift.t=3+clamp((235-y)/130,0,1)*9*gain;tilt.t=clamp((x-200)/100,-1,1)*.14*gain;read.textContent=active?'retorno':'conversa';loop.wake();}
 bag.add(pointer(stage,{move:choose,leave(){lastPointer=null;active=0;lift.t=3;tilt.t=.035;read.textContent='rest';loop.wake();}}));
 bag.on(stage,'keydown',event=>{if(['ArrowLeft','ArrowRight','Home'].includes(event.key)){event.preventDefault();choose([event.key==='ArrowLeft'?135:265,145]);}});
 draw();read.textContent='rest';bag.add(()=>svg.replaceChildren());return{set(v){gain=v;if(lastPointer)choose(lastPointer);else loop.wake();},destroy:bag.dispose};
}
hairline({name:'better',means:'Um telefone de disco com fone suspenso e balões de conversa representa o acompanhamento dos orçamentos.',rules:[1,3,4,5,6,7,8,9,10],range:[.7,1,1.2],tour:[[140,175],[265,140],[210,160],null],mount});
