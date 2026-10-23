const STYLE_URL = new URL('./method-visuals.css', import.meta.url).href;
let stylePromise;
function ensureStyle() {
  if (stylePromise) return stylePromise;
  stylePromise = new Promise((resolve) => {
    if (document.querySelector(`link[href="${STYLE_URL}"]`)) return resolve();
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = STYLE_URL; link.onload = resolve; link.onerror = resolve; document.head.append(link);
  });
  return stylePromise;
}
const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, parent) => { const node = document.createElementNS(SVG_NS, tag); Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, String(value))); parent?.append(node); return node; };
const text = (value, attrs, parent) => { const node = el('text', attrs, parent); node.textContent = value; return node; };
function makeBetter(svg) {
  el('rect', { class:'diagram-plate', x:38, y:28, width:324, height:158, rx:12 }, svg); text('ATENDIMENTO COM MAIS CONTROLE', { class:'diagram-muted', x:58, y:51 }, svg);
  [145,111,77].forEach((y) => el('line', { class:'diagram-track', x1:72, y1:y, x2:334, y2:y }, svg));
  [[92,111,30,'#cfe0f6'],[145,94,30,'#a9c8ee'],[198,74,30,'#74a5e4'],[251,55,30,'#1261f4']].forEach(([x,y,width,fill], index) => { const bar=el('rect',{class:'chart-bar',x,y,width,height:145-y,rx:4,fill},svg); bar.style.animationDelay=`${index*.16}s`; });
  el('path', { class:'chart-line', d:'M78 132 C111 125 120 128 141 113 S178 117 198 91 S232 94 253 70 S294 82 326 52' }, svg);
  [[108,118],[218,83],[308,46]].forEach(([x,y], index) => { const group=el('g',{class:'money-pill'},svg); el('circle',{class:'diagram-green',cx:x,cy:y,r:11},group); text('R$',{x,y:y+3.5,'text-anchor':'middle',fill:'#fff','font-size':7,'font-weight':700},group); group.style.animationDelay=`${index*.55}s`; });
  text('mais clareza para decidir', { class:'diagram-text', x:58, y:173 }, svg);
}
function makeRecurrence(svg) {
  el('rect',{class:'diagram-plate',x:38,y:28,width:324,height:158,rx:12},svg); text('PÓS-VENDA EM MOVIMENTO',{class:'diagram-muted',x:58,y:51},svg);
  const calendar=el('g',{transform:'translate(94 69)'},svg); el('rect',{class:'diagram-blue-light',x:0,y:12,width:118,height:78,rx:8},calendar); el('rect',{class:'diagram-blue',x:0,y:12,width:118,height:20,rx:8},calendar); el('line',{class:'diagram-edge',x1:0,y1:32,x2:118,y2:32},calendar); [24,47,70,93].forEach((x)=>el('line',{class:'diagram-edge',x1:x,y1:45,x2:x,y2:82},calendar)); [50,67].forEach((y)=>el('line',{class:'diagram-edge',x1:12,y1:y,x2:106,y2:y},calendar)); el('circle',{class:'diagram-cyan',cx:24,cy:58,r:4},calendar); el('circle',{class:'diagram-green',cx:70,cy:75,r:4},calendar);
  el('path',{class:'diagram-line-soft',d:'M238 126 C292 126 307 77 278 66 C249 56 236 84 253 98 C266 109 300 102 322 75'},svg); el('path',{class:'diagram-line',d:'M318 74 l10 1 -5 9'},svg);
  const orbit=el('g',{class:'loop-orbit'},svg); el('circle',{class:'diagram-blue-light',cx:200,cy:108,r:30},orbit); el('circle',{class:'diagram-edge',cx:200,cy:108,r:30},orbit); el('circle',{class:'diagram-green',cx:200,cy:78,r:5},orbit); [0,1,2,3].forEach((index)=>el('circle',{class:'loop-dot',fill:index%2?'#11c8e9':'#1261f4',cx:200+Math.cos(index*Math.PI/2)*24,cy:108+Math.sin(index*Math.PI/2)*24,r:3},svg));
  text('próximo contato',{class:'diagram-text',x:242,y:161},svg); text('cliente volta no tempo certo',{class:'diagram-muted',x:58,y:173},svg);
}
export function mountMethodVisual(stage, type) {
  ensureStyle();
  const root=stage.querySelector('.hairline-figure')||stage; root.hidden=false; root.replaceChildren(); root.dataset.hairline=`method-${type}`; root.setAttribute('role','img'); root.setAttribute('aria-label',type==='better'?'Gráfico animado de atendimento e faturamento com evolução positiva.':'Calendário animado que representa o próximo contato e a recorrência do cliente.');
  const svg=el('svg',{class:'method-diagram',viewBox:'0 0 400 220','aria-hidden':'true'},root); type==='better'?makeBetter(svg):makeRecurrence(svg);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'); let destroyed=false; let visible=false; let paused=reduced.matches||document.documentElement.classList.contains('motion-paused');
  const update=()=>{if(destroyed)return; paused=reduced.matches||document.documentElement.classList.contains('motion-paused'); svg.classList.toggle('is-paused',paused); svg.classList.toggle('is-reduced',reduced.matches); svg.classList.toggle('is-running',visible&&!paused&&!reduced.matches);};
  reduced.addEventListener('change',update); addEventListener('engrena:motion',update); const observer=new IntersectionObserver((entries)=>{visible=entries.some((entry)=>entry.isIntersecting);update();},{rootMargin:'120px'}); observer.observe(stage); update();
  return {setPaused(value){paused=Boolean(value);update();},setProgress(){},setFocus(){},destroy(){if(destroyed)return;destroyed=true;observer.disconnect();reduced.removeEventListener('change',update);removeEventListener('engrena:motion',update);root.replaceChildren();}};
}
