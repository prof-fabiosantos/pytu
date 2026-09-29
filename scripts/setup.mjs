import {mkdir,readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const sensors=JSON.parse(await readFile(new URL('config/sensors.json',root),'utf8'));
await mkdir(new URL('data/',root),{recursive:true});
try{
 await writeFile(new URL('data/purpleair.json',root),JSON.stringify({sensors,ids:sensors.map(s=>s.sensor_index),lastAttempt:0}),{flag:'wx'});
 console.log('Cadastro público de sensores inicializado, sem leituras. A primeira coleta consultará a API.');
}catch(error){if(error.code!=='EEXIST')throw error;console.log('Cache existente preservado.');}
