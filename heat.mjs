export const HEAT_URL='https://api.open-meteo.com/v1/forecast?latitude=-3.119&longitude=-60.022&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&forecast_days=3&timeformat=unixtime&timezone=America%2FManaus';
const HOUR=3600000;
export function normalizeHeat(raw,now=Date.now()){
 const h=raw?.hourly,u=raw?.hourly_units;
 const keys=['temperature_2m','relative_humidity_2m','apparent_temperature','wind_speed_10m'];
 if(!Array.isArray(h?.time)||u?.time!=='unixtime'||u.temperature_2m!=='°C'||u.apparent_temperature!=='°C'||u.relative_humidity_2m!=='%'||u.wind_speed_10m!=='km/h')throw Error('Invalid heat response');
 if(keys.some(k=>!Array.isArray(h[k])||h[k].length!==h.time.length))throw Error('Invalid heat series');
 const number=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
 const hours=h.time.map((t,i)=>({time:typeof t==='number'&&Number.isFinite(t)?new Date(t*1000).toISOString():null,temperature:number(h.temperature_2m[i],-90,65),apparent:number(h.apparent_temperature[i],-110,90),humidity:number(h.relative_humidity_2m[i],0,100),wind:number(h.wind_speed_10m[i],0,500)})).filter(p=>p.time&&Date.parse(p.time)>=Math.floor(now/HOUR)*HOUR&&Date.parse(p.time)<Math.floor(now/HOUR)*HOUR+48*HOUR).sort((a,b)=>a.time.localeCompare(b.time));
 if(!hours.some(p=>p.temperature!==null&&Date.parse(p.time)<=now+HOUR))throw Error('No current forecast');
 return {collectedAt:new Date(now).toISOString(),modelIssuedAt:null,source:'Open-Meteo',sourceUrl:'https://open-meteo.com/',scope:'Estimativa meteorológica para Manaus; não é medição de estação ou de cada bairro.',timezone:'America/Manaus',hours};
}
export function heatView(state={},now=Date.now()){
 const forecast=state.forecast??null;
 const age=forecast?now-Date.parse(forecast.collectedAt):Infinity;
 const stale=!Number.isFinite(age)||age<0||age>=2*HOUR;
 const hours=forecast?.hours.filter(p=>Date.parse(p.time)>=Math.floor(now/HOUR)*HOUR)??[];
 return {...forecast,hours,available:!stale&&hours.some(p=>p.temperature!==null&&Date.parse(p.time)<=now+HOUR),stale,error:state.error??null,nextAttempt:state.lastAttempt?new Date(state.lastAttempt+HOUR).toISOString():null};
}
export function createHeatCollector({read,write,request=fetch,clock=Date.now}){
 let pending,memory=null,memoryUntil=0;
 return async function collect(){
  if(memory&&clock()<memoryUntil)return heatView(memory,clock());
  if(pending)return pending;
  pending=(async()=>{
   let doc;
   try{doc=await read();}catch{return {available:false,stale:true,hours:[],error:'storage_unavailable'};}
   let state=doc?.value??{};const now=clock();
   if(state.lastAttempt&&now-state.lastAttempt>=0&&now-state.lastAttempt<HOUR){memory=state;memoryUntil=now+60000;return heatView(state,now);}
   // Claim shared revision before the upstream call to avoid requests per visitor.
   const claim={...state,lastAttempt:now};
   try{await write(claim,doc?.etag);}catch{return heatView(state,now);}
   let lease;try{lease=await read();}catch{return heatView(state,now);}
   try{const response=await request(HEAT_URL,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Provider unavailable');state={...claim,forecast:normalizeHeat(await response.json(),now),error:null};}
   catch{state={...claim,error:'provider_unavailable'};}
   try{await write(state,lease?.etag);}catch{state={...state,error:'storage_unavailable'};}
   memory=state;memoryUntil=clock()+60000;return heatView(state,clock());
  })();
  try{return await pending;}finally{pending=null;}
 };
}

