(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const records = [...document.querySelectorAll('[data-report]')].map(element => ({
    element, frame:0, progress:0, state:'ready',
    counters:[...element.querySelectorAll('[data-count]')],
    charts:[...element.querySelectorAll('.report-chart')].map(svg => ({
      svg, values:svg.dataset.values.split(',').map(Number), maximum:Number(svg.dataset.max),
      line:svg.querySelector('.chart-line'),area:svg.querySelector('.chart-area'),
      points:[...svg.querySelectorAll('.chart-point')],labels:[...svg.querySelectorAll('[data-point-label]')],bars:[...svg.querySelectorAll('.chart-bar')],
    })),
  }));
  const formats=new Map();
  function number(value,decimals){
    if(!formats.has(decimals))formats.set(decimals,new Intl.NumberFormat('pt-BR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}));
    return formats.get(decimals).format(value);
  }
  function paint(record,progress){
    record.progress=progress;
    const eased=1-Math.pow(1-progress,3);
    record.counters.forEach(node=>{
      const decimals=Number(node.dataset.decimals||0),value=Number(node.dataset.count)*eased;
      node.textContent=(node.dataset.prefix||'')+number(value,decimals)+(node.dataset.suffix||'');
    });
    record.charts.forEach(chart=>{
      const xs=(chart.svg.dataset.xs||'86,328,570').split(',').map(Number),baseline=Number(chart.svg.dataset.base||246),height=Number(chart.svg.dataset.height||206);
      const ys=chart.values.map(value=>baseline-value/chart.maximum*height*eased);
      const d='M '+xs.map((x,i)=>x+','+ys[i].toFixed(3)).join(' L ');
      chart.line.setAttribute('d',d);
      chart.line.style.strokeDasharray='1';
      chart.line.style.strokeDashoffset=String(1-eased);
      chart.area.setAttribute('d',d+' L'+xs[2]+','+baseline+' L'+xs[0]+','+baseline+' Z');
      chart.area.style.opacity=String(eased);
      chart.points.forEach((point,i)=>{point.setAttribute('cy',ys[i].toFixed(3));point.setAttribute('r',String(5*Math.min(1,progress*3)));});
      chart.labels.forEach((label,i)=>{
        label.setAttribute('y',(ys[i]-18).toFixed(3));
        const decimals=Number(chart.svg.dataset.labelDecimals||(chart.svg.dataset.unit==='x'?2:0));
        label.textContent=(chart.svg.dataset.labelPrefix||'')+number(chart.values[i]*Number(chart.svg.dataset.labelScale||1)*eased,decimals)+(chart.svg.dataset.unit==='x'?'x':'');
        label.style.opacity=String(Math.min(1,progress*3));
      });
      chart.bars.forEach(bar=>bar.style.transform='scaleY('+eased+')');
    });
  }
  function setState(record,state){record.state=state;record.element.dataset.reportState=state;}
  function finish(record){cancelAnimationFrame(record.frame);record.frame=0;paint(record,1);setState(record,'complete');}
  function prepare(record){cancelAnimationFrame(record.frame);record.frame=0;paint(record,0);setState(record,'ready');}
  function start(record){
    if(record.state==='running'||record.state==='complete')return;
    if(reduced.matches){finish(record);return;}
    setState(record,'running');
    const started=performance.now(),duration=2300;
    function tick(time){
      const progress=Math.max(0,Math.min(1,(time-started)/duration));paint(record,progress);
      if(progress<1)record.frame=requestAnimationFrame(tick);
      else{record.frame=0;setState(record,'complete');}
    }
    record.frame=requestAnimationFrame(tick);
  }
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    const record=records.find(item=>item.element===entry.target);
    if(entry.isIntersecting)start(record);
    else if(record.state==='running')finish(record);
  }),{threshold:.18});
  records.forEach(record=>{
    if(reduced.matches)finish(record);else prepare(record);
    observer.observe(record.element);
  });
  const replay=document.querySelector('#replay-results');
  if(replay){
    replay.hidden=false;
    replay.addEventListener('click',()=>records.forEach(record=>{
      if(reduced.matches){finish(record);return;}
      prepare(record);
      const rect=record.element.getBoundingClientRect();
      if(rect.top<innerHeight&&rect.bottom>0)start(record);
      observer.unobserve(record.element);observer.observe(record.element);
    }));
  }
  reduced.addEventListener('change',()=>{if(reduced.matches)records.forEach(finish);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)records.filter(record=>record.state==='running').forEach(finish);});
  addEventListener('pagehide',event=>{
    if(event.persisted)return;
    records.forEach(record=>cancelAnimationFrame(record.frame));observer.disconnect();
  });
  window.engrenaReports=Object.freeze({get charts(){return records.map(record=>({state:record.state,progress:record.progress,kinds:record.charts.map(chart=>chart.svg.closest('[data-chart-kind]')?.dataset.chartKind)}));}});
})();
