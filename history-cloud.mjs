import {createReadCache} from './read-cache.mjs';
const historyReads=createReadCache();
import {put} from '@vercel/blob';
import {readDocument,writeDocument,DocumentConflict,backend} from './document-store.mjs';
import {snapshot,mergeDay,emptyDay,csv} from './history.mjs';
const base='pytu/history/v1/';
async function read(day){return readDocument(base+day+'.json');}
export async function archiveEvidence(e){for(const incoming of snapshot(e)){
 let saved;
 for(let i=0;i<3;i++){const old=await read(incoming.day),value=mergeDay(old?.value??emptyDay(incoming.day),incoming);
 try{await writeDocument(base+incoming.day+'.json',value,old?.etag);saved=value;historyReads.clear(incoming.day);break;}catch(error){if(!(error instanceof DocumentConflict))throw error;}}
 if(!saved)throw Error('Conflito ao registrar histórico');
 // JSON is authoritative; CSV exports can always be regenerated from it.
 if(backend()==='blob')for(const type of ['air','fire'])await put(base+incoming.day+'-'+type+'.csv',csv(saved[type],type),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'text/csv; charset=utf-8'});
}}
export async function readHistory(days){const documents=await Promise.all(days.map(day=>historyReads.read(day,()=>read(day))));return {days:days.map((day,i)=>documents[i]?.value??emptyDay(day)),timezone:'America/Manaus',note:'Histórico das coletas efetivamente realizadas. Lacunas não significam zero. Médias das amostras disponíveis não são médias contínuas de 24 horas nem IQAr oficial.'};}
