import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {snapshot,mergeDay,emptyDay,csv} from './history.mjs';
const root=new URL('./data/history/',import.meta.url);let queue=Promise.resolve();
async function read(day){try{return JSON.parse(await readFile(new URL(day+'.json',root),'utf8'));}catch(e){if(e.code==='ENOENT')return emptyDay(day);throw e;}}
export function archiveLocal(e){const task=queue.then(async()=>{await mkdir(root,{recursive:true});for(const next of snapshot(e)){const value=mergeDay(await read(next.day),next),file=new URL(next.day+'.json',root),temp=new URL(next.day+'.tmp',root);await writeFile(temp,JSON.stringify(value));await rename(temp,file);for(const type of ['air','fire'])await writeFile(new URL(next.day+'-'+type+'.csv',root),csv(value[type],type));}});queue=task.catch(()=>{});return task;}
export async function localHistory(days){return {days:await Promise.all(days.map(read)),timezone:'America/Manaus',note:'Coletas locais disponíveis. Lacunas não significam zero. Médias das amostras não são médias contínuas de 24 horas.'};}
