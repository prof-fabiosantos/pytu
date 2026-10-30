import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHeatCollector} from './heat.mjs';
const directory=new URL('./data/',import.meta.url),file=new URL('heat.json',directory),temp=new URL('heat.json.tmp',directory);
export const localHeat=createHeatCollector({read:async()=>{try{return {value:JSON.parse(await readFile(file,'utf8'))};}catch(e){if(e.code==='ENOENT')return null;throw e;}},write:async value=>{await mkdir(directory,{recursive:true});await writeFile(temp,JSON.stringify(value));await rename(temp,file);}});

