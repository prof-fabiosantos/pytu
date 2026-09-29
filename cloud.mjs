import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
import {EvidenceStore} from './sources.mjs';
import {PurpleAirStore} from './purpleair.mjs';
import {JevClassifier} from './classification.mjs';
const HOUR=3600000;
// Blob reads may return a weak HTTP validator; conditional writes require the strong form.
export function writeEtag(etag){return typeof etag==='string'?etag.replace(/^W\//,''):etag;}

export async function readDocument(path){const result=await get(path,{access:'private',useCache:false});return result?{value:await new Response(result.stream).json(),etag:result.blob.etag}:null;}
export async function writeDocument(path,value,etag){return put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,contentType:'application/json',...(etag?{ifMatch:writeEtag(etag)}:{allowOverwrite:false})});}
export function hydrate(value){
 const store=new EvidenceStore('');store.state=structuredClone(value.evidence);store.lastAttempt=Date.parse(store.state.lastAttempt)||value.lastAttempt;store.save=async()=>{};
 const pa=new PurpleAirStore('');pa.state=structuredClone(value.purpleair);pa.save=async()=>{};
 const jev=new JevClassifier('');jev.cache=structuredClone(value.jev);jev.status=jev.cache.status??'waiting';jev.save=async()=>{};
 return {store,pa,jev};
}
export async function cloudEvidence(){
 let doc=await readDocument('pytu/evidence.json');if(!doc)throw Error('Cache inicial não configurado');
 if(Date.now()-doc.value.lastAttempt>=HOUR){
  const reserved={...doc.value,lastAttempt:Date.now()};let lease;
  try{lease=await writeDocument('pytu/evidence.json',reserved,doc.etag);}catch(e){if(!(e instanceof BlobPreconditionFailedError))throw e;}
  if(lease){
   const {store,pa,jev}=hydrate(reserved);
   await Promise.all([store.refresh(),pa.refresh()]);await jev.refresh(store.view(),pa.view());
   const updated={lastAttempt:reserved.lastAttempt,evidence:store.state,purpleair:pa.state,jev:jev.cache};
   await writeDocument('pytu/evidence.json',updated,lease.etag);doc={value:updated};
  }else doc=await readDocument('pytu/evidence.json');
 }
 const {store,pa,jev}=hydrate(doc.value);const evidence=jev.decorate(store.view(),pa.view());
 return {...evidence,nextCollection:new Date(doc.value.lastAttempt+HOUR).toISOString(),collectionMode:'on_access',collectionNote:'Na Vercel: atualização no primeiro acesso após uma hora, com cache compartilhado. Sem acesso, os horários não avançam. Há também uma verificação automática diária.',agent:{configured:!!process.env.GEMINI_API_KEY,status:process.env.GEMINI_API_KEY?'configured':'unconfigured',model:'gemini-2.5-flash'}};
}
export async function reserveChat(){
 for(let i=0;i<3;i++){
  const doc=await readDocument('pytu/chat-budget.json');if(!doc)throw Error('Limite de uso não configurado');
  const now=Date.now(),day=new Date(now).toISOString().slice(0,10);const old=doc.value;const recent=(old.recent??[]).filter(t=>t>now-60000);const count=old.day===day?old.count:0;
  if(count>=100||recent.length>=6)return false;
  try{await writeDocument('pytu/chat-budget.json',{day,count:count+1,recent:[...recent,now]},doc.etag);return true;}catch(e){if(!(e instanceof BlobPreconditionFailedError))throw e;}
 }return false;
}
