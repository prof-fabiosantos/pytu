const el=id=>document.getElementById(id);
const fmt=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('pt-BR',{maximumFractionDigits:1}):'—';
const time=t=>new Date(t).toLocaleString('pt-BR',{timeZone:'America/Manaus',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
let data;
function render(){
 const rows=data.hours.slice(0,Number(el('heatPeriod').value)),first=rows[0];
 el('heatCards').replaceChildren();
 for(const [label,value,unit] of [['Temperatura estimada',first.temperature,'°C'],['Sensação térmica',first.apparent,'°C'],['Umidade relativa',first.humidity,'%'],['Vento',first.wind,'km/h']]){
  const card=document.createElement('article'),title=document.createElement('span'),number=document.createElement('strong');title.textContent=label;number.textContent=fmt(value)+' '+unit;card.append(title,number);el('heatCards').append(card);
 }
 el('heatTime').textContent='Estimativa válida para '+time(first.time)+' · Coletada em '+time(data.collectedAt)+' (Manaus).';
 el('heatRows').replaceChildren();
 rows.forEach(p=>{const tr=document.createElement('tr');for(const value of [time(p.time),fmt(p.temperature),fmt(p.apparent),fmt(p.humidity),fmt(p.wind)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}el('heatRows').append(tr);});
 const values=rows.flatMap(p=>[p.temperature,p.apparent]).filter(v=>v!==null),min=Math.floor(Math.min(...values)-2),max=Math.ceil(Math.max(...values)+2);
 const width=860,height=270,left=48,right=825,top=20,bottom=215;
 const start=Date.parse(rows[0].time),end=Date.parse(rows.at(-1).time);
 const x=p=>left+(Date.parse(p.time)-start)/Math.max(3600000,end-start)*(right-left),y=v=>bottom-(v-min)/(max-min)*(bottom-top);
 let svg='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Previsão de temperatura e sensação térmica em Manaus, em graus Celsius. Valores disponíveis na tabela abaixo.">';
 for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;svg+='<line x1="'+left+'" x2="'+right+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="#d6e2dd"/><text x="4" y="'+(y(v)+5)+'">'+fmt(v)+'</text>';}
 for(const [key,color,dash] of [['temperature','#197453',''],['apparent','#aa5817','6 4']]){
  let path='',previous=null;rows.forEach(p=>{if(p[key]===null){previous=null;return;}const contiguous=previous!==null&&Date.parse(p.time)-previous===3600000;path+=(contiguous?' L':' M')+x(p)+' '+y(p[key]);previous=Date.parse(p.time);});svg+='<path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-dasharray="'+dash+'"/>';
 }
 [0,Math.floor((rows.length-1)/2),rows.length-1].forEach(i=>{svg+='<text x="'+x(rows[i])+'" y="246" text-anchor="'+(i===0?'start':i===rows.length-1?'end':'middle')+'">'+time(rows[i].time)+'</text>';});
 el('heatChart').innerHTML=svg+'</svg>';
 const valid=rows.filter(p=>p.temperature!==null),peak=valid.reduce((a,b)=>a.temperature>=b.temperature?a:b);
 el('heatSummary').textContent='Maior temperatura prevista no período: '+fmt(peak.temperature)+' °C, em '+time(peak.time)+' (Manaus). Lacunas representam valores indisponíveis, não zero.';
}
async function load(){
 try{
  const response=await fetch('/api/heat',{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error();
  data=await response.json();
  if(!data.available||!data.hours?.length){el('heatData').hidden=true;el('heatStatus').textContent=data.collectedAt?'Previsão desatualizada ou sem valores para este horário. Última coleta: '+time(data.collectedAt)+' (Manaus).':'Previsão indisponível. Tente novamente mais tarde. Não usamos valores de exemplo.';return;}
  el('heatStatus').textContent=data.error?'A última tentativa falhou; exibimos a previsão ainda recente, com o horário da coleta abaixo.':'Previsão disponível · horários de Manaus (UTC−4).';
  el('heatData').hidden=false;render();
 }catch{el('heatData').hidden=true;el('heatStatus').textContent='Não foi possível consultar a previsão. Nenhum valor de exemplo foi utilizado.';}
}
el('heatPeriod').addEventListener('change',()=>{if(data?.available)render();});
load();setInterval(()=>{if(!document.hidden)load();},300000);

