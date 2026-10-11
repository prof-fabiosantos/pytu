export function sensorSummary(sensors,location){
 const selected=(sensors??[]).filter(s=>location==='manaus'||s.neighborhood===location);
 const current=selected.filter(s=>s.available&&s.classification);
 if(!selected.length)return 'Sem sensor cadastrado neste local. Isso não significa ar limpo.';
 if(!current.length)return 'Sensores locais sem classificação atual. Isso não significa ar limpo.';
 const order=['Boa','Moderada','Ruim','Muito ruim','Péssima'];
 const counts=new Map();for(const s of current)counts.set(s.classification.label,(counts.get(s.classification.label)??0)+1);
 const labels=order.filter(label=>counts.has(label)).map(label=>`${label} (${counts.get(label)})`);
 return 'Sensores locais · faixas indicativas: '+labels.join(' · ')+'.'+(current.length<selected.length?` ${selected.length-current.length} sem classificação atual.`:'');
}
