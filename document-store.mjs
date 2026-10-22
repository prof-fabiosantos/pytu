import {randomUUID} from 'node:crypto';
import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
export class DocumentConflict extends Error { constructor(){super('Concurrent document update');this.name='DocumentConflict';} }
export function backend(){const value=process.env.PYTU_STORAGE||'blob';if(!['blob','supabase'].includes(value))throw Error('Invalid PYTU_STORAGE');return value;}
export function writeEtag(etag){return typeof etag==='string'?etag.replace(/^W\//,''):etag;}
export function createSupabaseStore({url,key,request=fetch}){
 if(!url||!key)throw Error('Configure SUPABASE_URL and SUPABASE_SECRET_KEY');
 const origin=new URL(url);if(origin.protocol!=='https:')throw Error('Supabase requires HTTPS');
 const endpoint=new URL('/rest/v1/pytu_documents',origin);
 async function call(method,path,value,revision){
  const target=new URL(endpoint);target.searchParams.set('select','value,revision');
  if(method!=='POST')target.searchParams.set('path','eq.'+path);
  if(method==='PATCH')target.searchParams.set('revision','eq.'+revision);
  const headers={apikey:key,'Content-Type':'application/json',Prefer:'return=representation'};
  if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
  const body=method==='GET'?undefined:JSON.stringify({...(method==='POST'?{path}:{}),value,revision:randomUUID()});
  const response=await request(target,{method,headers,body,signal:AbortSignal.timeout(20000)});
  if(response.status===409)throw new DocumentConflict();
  if(!response.ok)throw Object.assign(Error('Supabase request failed (HTTP '+response.status+')'),{name:'StorageUnavailable'});
  const rows=await response.json();
  if(!Array.isArray(rows))throw Error('Invalid storage response');
  if(method!=='GET'&&!rows.length)throw new DocumentConflict();
  return rows.length?{value:rows[0].value,etag:rows[0].revision}:null;
 }
 return {read:path=>call('GET',path),write:(path,value,revision)=>call(revision?'PATCH':'POST',path,value,revision)};
}
function supabase(){return createSupabaseStore({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY});}
export async function readDocument(path){
 if(backend()==='supabase')return supabase().read(path);
 const result=await get(path,{access:'private',useCache:false});
 return result?{value:await new Response(result.stream).json(),etag:result.blob.etag}:null;
}
export async function writeDocument(path,value,etag){
 if(backend()==='supabase')return supabase().write(path,value,etag);
 try{return await put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,contentType:'application/json',...(etag?{ifMatch:writeEtag(etag)}:{allowOverwrite:false})});}
 catch(e){if(e instanceof BlobPreconditionFailedError)throw new DocumentConflict();throw e;}
}
