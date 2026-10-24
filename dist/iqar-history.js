const $=id=>document.getElementById(id);
const colors={'boa':'#48bb78','moderada':'#f6cf4c','ruim':'#f69d61','muito ruim':'#ef4444','péssima':'#a00076'};
const fmt=t=>new Date(t).toLocaleString('pt-BR',{timeZone:'America/Manaus'});
let monitorar=null;
function render(){
 const hours=Number($('iqarPeriod').value),end=Date.now(),start=end-hours*3600000;
 const archived=monitorar?.history?.enabled;
 const records=archived?(monitorar.history.readings??[]):(monitorar?.reading?[monitorar.reading]:[]);
 const rows=records.filter(r=>Number.isFinite(r.iqar)&&Date.parse(r.time)>=start&&Date.parse(r.time)<=end).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 $('iqarStatus').textContent=archived?`${rows.length} observações disponíveis no período. Janela móvel de 7 dias, formada a partir da ativação. Cobertura parcial; sem preenchimento retroativo.`:'Arquivamento de IQAr ainda não ativado. Exibimos somente a última leitura disponível, quando estiver no período selecionado; ela não constitui uma série histórica.';
 $('iqarChart').replaceChildren();$('iqarTable').replaceChildren();$('iqarDetail').textContent='As observações não confirmam a condição atual.';
 if(!rows.length){$('iqarChart').textContent='Sem observações de IQAr neste período.';return;}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),width=Math.max(900,hours*12),height=280,max=Math.max(50,...rows.map(r=>r.iqar))*1.1;
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.width=width+'px';svg.style.height=height+'px';svg.setAttribute('role','group');svg.setAttribute('aria-label','Observações de IQAr por horário de medição. Valores também disponíveis na tabela.');
 function el(tag,attrs,text){const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;svg.append(n);return n;}
 for(let i=0;i<=4;i++){const v=max*i/4,y=220-v/max*180;el('line',{x1:55,x2:width-20,y1:y,y2:y,stroke:'#dce6df'});el('text',{x:4,y:y+4,'font-size':12},v.toFixed(0));}
 const x=t=>55+(t-start)/(end-start)*(width-85);
 for(let i=0;i<=6;i++){const t=start+(end-start)*i/6;el('text',{x:x(t),y:252,'text-anchor':i===0?'start':i===6?'end':'middle','font-size':11},new Date(t).toLocaleString('pt-BR',{timeZone:'America/Manaus',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}));}
 const table=document.createElement('table'),head=table.createTHead().insertRow();for(const text of ['Medição (Manaus)','IQAr','Classificação','Consulta (Manaus)']){const th=document.createElement('th');th.scope='col';th.textContent=text;head.append(th);}
 for(const r of rows){const detail=`Medição: ${fmt(r.time)} (Manaus). IQAr ${r.iqar} — ${r.classification}. Consultado: ${fmt(r.collectedAt)} (Manaus). Fonte: FioAres / MonitorAr. Média de 24 horas de MP2,5.`;
 const bar=el('rect',{x:x(Date.parse(r.time))-4,y:220-r.iqar/max*180,width:8,height:Math.max(2,r.iqar/max*180),fill:colors[r.classification.toLowerCase()]??'#9ca3af',tabindex:0,role:'button','aria-label':detail});
 const title=document.createElementNS(ns,'title');title.textContent=detail;bar.append(title);bar.addEventListener('click',()=>{$('iqarDetail').textContent=detail;});bar.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('iqarDetail').textContent=detail;}});
 const row=table.insertRow();for(const text of [fmt(r.time),String(r.iqar),r.classification,fmt(r.collectedAt)])row.insertCell().textContent=text;
 }
 $('iqarChart').append(svg);$('iqarTable').append(table);
}
$('iqarPeriod').addEventListener('change',render);
try{const response=await fetch('/api/evidence');if(!response.ok)throw Error();monitorar=(await response.json()).monitorar;render();}catch{$('iqarStatus').textContent='Não foi possível consultar o IQAr. Tente novamente mais tarde; falha de consulta não significa ausência de poluição.';}
