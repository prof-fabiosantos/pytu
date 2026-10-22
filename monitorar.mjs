import {readDocument,writeDocument,DocumentConflict} from './document-store.mjs';
export const MONITORAR_SOURCE={name:'FioAres / MonitorAr',url:'https://monitorar.mma.gov.br'};
const HOUR=3600000;
function sourceTime(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))throw Error('Invalid MonitorAr date');
 const iso=value.replace(' ','T')+':00-03:00',ms=Date.parse(iso);
 if(!Number.isFinite(ms)||new Date(ms-3*HOUR).toISOString().slice(0,16)!==value.replace(' ','T'))throw Error('Invalid MonitorAr date');
 return new Date(ms).toISOString();
}
export function normalizeMonitorAr(payload,collectedAt){
 const station=Array.isArray(payload)?payload.find(s=>s.idEstacao===178586):null;
 const current=station?.indiceQualidadeArAtual,measurement=current?.medicao;
 const labels=['Boa','Moderada','Ruim','Muito ruim','Péssima'];
 const label=current?.classificacaoIqAr?.noClassificacao;
 if(!station||current?.poluente?.idPoluente!==15||typeof measurement?.indiceQualidadeAr!=='number'||!Number.isFinite(measurement.indiceQualidadeAr)||measurement.indiceQualidadeAr<0||!labels.some(l=>l.toLowerCase()===label?.toLowerCase()))throw Error('Invalid MonitorAr observation');
 const lat=Number(station.nuLatitude),lon=Number(station.nuLongitude);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Invalid station coordinates');
 return {stationId:178586,name:'FIOTEC – Amazonas',source:MONITORAR_SOURCE.name,sourceUrl:MONITORAR_SOURCE.url,city:'Manaus',lat,lon,pollutant:'MP2,5',iqar:measurement.indiceQualidadeAr,classification:label,time:sourceTime(measurement.dtMedicao),sourceTime:measurement.dtMedicao,sourceTimezone:'America/Sao_Paulo (UTC−3)',averagingPeriod:'24 horas',collectedAt,scope:'Ponto da estação; não representa todos os bairros de Manaus.'};
}
export function monitorArView(state={},now=Date.now(),configured=true){
 const reading=state.reading??null;
 const stale=!!reading&&(now-Date.parse(reading.collectedAt)>2*HOUR||now-Date.parse(reading.time)>2*HOUR||Date.parse(reading.time)>now+300000);
 return {configured,available:configured&&!!reading&&!stale,stale,reading,error:state.error??null,lastAttempt:state.lastAttempt?new Date(state.lastAttempt).toISOString():null,nextCollection:state.lastAttempt?new Date(state.lastAttempt+HOUR).toISOString():null,source:MONITORAR_SOURCE,notice:'IQAr informado pela fonte, baseado na média de 24 horas de MP2,5. Não é concentração em µg/m³ nem faixa Jev. Consulta no primeiro acesso após uma hora; a fonte pode atualizar em outro ritmo.'};
}
// A reservation is persisted BEFORE the HTTP request, including failures and crashes.
// Never expose the configured address or provider error bodies in public responses.
export function createMonitorArCollector({read,write,endpoint,request=fetch,now=Date.now}){
 let pending=null;
 async function collect(){
  if(!endpoint)return monitorArView({},now(),false);
  const old=await read(),state=old?.value??{},start=now();
  if(state.lastAttempt&&start-state.lastAttempt<HOUR)return monitorArView(state,start);
  const reserved={...state,lastAttempt:start};let lease;
  try{lease=await write(reserved,old?.etag);}catch(e){if(!(e instanceof DocumentConflict))throw e;return monitorArView((await read())?.value??{},now());}
  let updated={...reserved};
  try{
   const url=new URL(endpoint);if(url.protocol!=='https:')throw Error('HTTPS required');
   const response=await request(url,{signal:AbortSignal.timeout(20000),redirect:'error'});
   if(!response.ok)throw Error('Provider unavailable');
   updated.reading=normalizeMonitorAr(await response.json(),new Date(now()).toISOString());updated.error=null;
  }catch{updated.error='Não foi possível atualizar FioAres/MonitorAr. Nova tentativa somente após uma hora; confira o horário da última leitura.';}
  await write(updated,lease.etag);
  return monitorArView(updated,now());
 }
 return ()=>pending??(pending=collect().finally(()=>{pending=null;}));
}
const path='pytu/monitorar.json';
const cloudCollector=createMonitorArCollector({read:()=>readDocument(path),write:(value,etag)=>writeDocument(path,value,etag),endpoint:process.env.MONITORAR_ENDPOINT});
export async function cloudMonitorAr(){try{return await cloudCollector();}catch{return {...monitorArView({},Date.now(),!!process.env.MONITORAR_ENDPOINT),error:'FioAres/MonitorAr temporariamente indisponível. Não foi feita consulta sem controle de frequência.'};}}
