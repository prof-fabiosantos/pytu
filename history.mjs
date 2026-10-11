export const dayOf=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'America/Manaus'});
export function emptyDay(day){return {version:1,day,air:[],fire:[],collections:[]};}
export function snapshot(e){
 const collectedAt=e.generatedAt,air=[];
 for(const s of e.purpleair?.sensors??[])if(s.available&&Number.isFinite(s.pm25))air.push({source:'PurpleAir',sensor:String(s.id),name:s.name,neighborhood:s.neighborhood??'',time:s.lastSeen,collectedAt:e.purpleair.collectedAt??collectedAt,pm25:s.pm25,humidity:s.humidity??null,sourceTime:e.purpleair.sourceTime??'',clockWarning:e.purpleair.clockWarning??'',period:'10 minutos; sem correção EPA; time é último contato, não horário exato da média',band:s.classification?.label??'',lat:s.lat,lon:s.lon});
 if(e.air?.available&&Number.isFinite(e.air.current?.value))air.push({source:'CAMS',sensor:'cams',name:'CAMS regional (~45 km)',neighborhood:'',time:new Date(e.air.current.time).toISOString(),collectedAt:e.air.collectedAt,pm25:e.air.current.value,humidity:null,period:'Estimativa horária regional',band:e.air.classification?.label??'',lat:e.air.grid?.lat,lon:e.air.grid?.lon});
 const fire=!e.fire?.stale?(e.fire?.points??[]).map(p=>({...p,collectedAt:e.fire.collectedAt,source:'INPE'})):[];
 const collection={time:collectedAt,airAvailable:!!e.air?.available,sensorsAvailable:air.filter(r=>r.source==='PurpleAir').length,fireAvailable:!!e.fire&&!e.fire.stale,firePartial:e.fire?.partial??true,files:e.fire?.files??[],missingDates:e.fire?.missingDates??[]};
 const days=new Map();const get=day=>{if(!days.has(day))days.set(day,emptyDay(day));return days.get(day);};
 get(dayOf(collectedAt)).collections.push(collection);
 for(const row of air)get(dayOf(row.time)).air.push(row);
 for(const row of fire)get(dayOf(row.time)).fire.push(row);
 return [...days.values()];
}
export function mergeDay(old,incoming){
 const merge=(a,b,key)=>{const m=new Map(a.map(x=>[key(x),x]));for(const x of b){const k=key(x);if(!m.has(k))m.set(k,x);}return [...m.values()].sort((x,y)=>x.time.localeCompare(y.time));};
 return {...incoming,air:merge(old.air,incoming.air,r=>[r.source,r.sensor,r.time].join('|')),fire:merge(old.fire,incoming.fire,r=>[r.id||'',r.lat,r.lon,r.time,r.satellite].join('|')),collections:merge(old.collections,incoming.collections,r=>r.time)};
}
export function dateRange(start,end){
 const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s??'')&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 if(!valid(start)||!valid(end))throw Error('Datas inválidas.');
 const a=Date.parse(start+'T12:00:00Z'),b=Date.parse(end+'T12:00:00Z');if(b<a||b-a>30*86400000)throw Error('Escolha até 31 dias.');
 return Array.from({length:Math.round((b-a)/86400000)+1},(_,i)=>new Date(a+i*86400000).toISOString().slice(0,10));
}
const headers={air:['source','sensor','name','neighborhood','time','collectedAt','pm25','humidity','period','band','lat','lon','sourceTime','clockWarning'],fire:['source','id','time','collectedAt','municipality','satellite','lat','lon']};
export function csv(rows,type){const keys=headers[type];if(!keys)throw Error('Tipo inválido.');const cell=v=>{let s=String(v??'');if(/^[=+@\t\r]/.test(s)||(/^-/ .test(s)&&!Number.isFinite(Number(s))))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};return '\uFEFF'+[keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n')+'\r\n';}
