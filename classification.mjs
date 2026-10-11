import {readFile,writeFile,rename} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
export const bands=[
 {id:'boa',label:'Boa',max:25,color:'#39db55',range:'0 a 25'},
 {id:'moderada',label:'Moderada',max:50,color:'#ffe600',range:'>25 a 50'},
 {id:'ruim',label:'Ruim',max:75,color:'#ff9a55',range:'>50 a 75'},
 {id:'muito_ruim',label:'Muito ruim',max:125,color:'#ef1717',range:'>75 a 125'},
 {id:'pessima',label:'Péssima',max:Infinity,color:'#a10083',range:'>125'}
];
export const scope='Faixa indicativa da concentração pela escala fornecida; não é IQAr oficial nem avaliação de segurança individual. PurpleAir: média de 10 minutos sem correção EPA. CAMS: estimativa horária regional. As faixas de referência de MP2,5 para IQAr pressupõem 24 horas.';
export function expectedBand(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0?bands.find(b=>value<=b.max):null;}
export function observations(evidence,pa){return [
 ...(pa.sensors??[]).filter(s=>s.available&&expectedBand(s.pm25)).map(s=>({id:'sensor_'+s.id,value:s.pm25,time:s.lastSeen,source:'PurpleAir',period:'10 minutos'})),
 ...(evidence.air?.available&&expectedBand(evidence.air.current?.value)?[{id:'cams',value:evidence.air.current.value,time:evidence.air.current.time,source:'CAMS/Open-Meteo',period:'estimativa horária regional'}]:[])
 ];}
export function validateAnswer(answer,value){return answer?.type==='choice'&&answer.choice===expectedBand(value)?.id;}
export function classificationObservations(evidence,pa){
 const items=observations(evidence,pa),air=evidence.air;
 if(air?.available)for(const point of air.series??[]){
  if(point.time>air.current.time&&point.time<=air.current.time+2*3600000&&expectedBand(point.value))
   items.push({id:'cams_'+point.time,value:point.value,time:point.time,source:'CAMS/Open-Meteo',period:'estimativa horária regional'});
 }
 return items;
}
const signature=items=>createHash('sha256').update(JSON.stringify(items)).digest('hex');
export class JevClassifier{
 constructor(root){this.root=root;this.cache={};this.status='not_configured';this.pending=null;this.key='';}
 async init(){try{this.cache=JSON.parse(await readFile(this.root+'data/jev.json','utf8'));}catch{}}
 async save(){await writeFile(this.root+'data/jev.tmp',JSON.stringify(this.cache));await rename(this.root+'data/jev.tmp',this.root+'data/jev.json');}
 async refresh(evidence,pa){
  if(this.pending)return this.pending;
  let key=process.env.TYPESAFE_API_KEY?.trim()??'';try{key=parseEnv(await readFile(this.root+'.env','utf8')).TYPESAFE_API_KEY?.trim()??'';}catch{}
  if(!key){this.status='not_configured';return;}
  const items=classificationObservations(evidence,pa),fingerprint=signature(items);
  if(!items.length){this.status='no_data';return;}
  if(this.cache.fingerprint===fingerprint&&this.cache.status==='connected'){this.status='connected';return;}
  const keyChanged=this.key&&this.key!==key;this.key=key;
  if(!keyChanged&&this.cache.attemptFingerprint===fingerprint&&Date.now()-(this.cache.lastAttempt??0)<3600000){this.status=this.cache.status??'waiting';return;}
  this.pending=this.collect(key,items,fingerprint).finally(()=>this.pending=null);return this.pending;
 }
 async collect(key,items,fingerprint){
  this.status='pending';this.cache={...this.cache,lastAttempt:Date.now(),attemptFingerprint:fingerprint,status:'pending'};await this.save();
  try{
   const criteria=Object.fromEntries(bands.map(b=>[b.id,b.range+' µg/m³']));
   const questions=Object.fromEntries(items.map(item=>[item.id,{type:'choice',instructions:`Classifique EXCLUSIVAMENTE a concentração numérica ${item.value} µg/m³ do registro ${item.id}. Não arredonde. 25 é boa, 50 é moderada, 75 é ruim, 125 é muito_ruim; qualquer valor acima de 125 é pessima, inclusive acima de 160. Não avalie saúde nem altere os intervalos.`,criteria}]));
   const response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'jev-latest',state:JSON.stringify({scope,observations:items}),questions}),signal:AbortSignal.timeout(45000)});
   if(!response.ok)throw Error('TypeSafe HTTP '+response.status);
   const result=await response.json();const entries={};let rejected=0;
   for(const item of items){const answer=result.answers?.[item.id];if(!validateAnswer(answer,item.value)){rejected++;continue;}const b=expectedBand(item.value);entries[item.id]={value:item.value,time:item.time,band:b.id,label:b.label,color:b.color,provider:'TypeSafe Jev',model:typeof result.model==='string'?result.model:'jev-latest',validated:true};}
   this.status=rejected?'partial':'connected';this.cache={lastAttempt:this.cache.lastAttempt,attemptFingerprint:fingerprint,fingerprint,entries,status:this.status,rejected,classifiedAt:new Date().toISOString()};
  }catch(error){this.status='error';this.cache={...this.cache,status:'error',error:error.message.startsWith('TypeSafe HTTP ')?error.message:'Falha ao consultar TypeSafe'};}
  await this.save();
 }
 decorate(evidence,pa){
  const lookup=item=>{const candidates=[this.cache.entries?.[item.id],...(item.id==='cams'?[this.cache.entries?.['cams_'+item.time]]:[])];const entry=candidates.find(e=>e&&e.value===item.value&&e.time===item.time);return entry&&entry.value===item.value&&entry.time===item.time?entry:null;};
  const current=new Map(observations(evidence,pa).map(item=>[item.id,lookup(item)]));
  return {...evidence,air:evidence.air?{...evidence.air,classification:current.get('cams')??null}:null,purpleair:{...pa,sensors:(pa.sensors??[]).map(s=>({...s,classification:current.get('sensor_'+s.id)??null}))},classifier:{provider:'TypeSafe Jev',model:'jev-latest',status:this.status,error:this.cache.error??null,rejected:this.cache.rejected??0,classifiedAt:this.cache.classifiedAt??null,scope,bands:bands.map(({max,...b})=>b)}};
 }
}
