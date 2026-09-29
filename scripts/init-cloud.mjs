import {readFile} from 'node:fs/promises';
import {readDocument,writeDocument} from '../cloud.mjs';
if(!process.env.BLOB_READ_WRITE_TOKEN)throw Error('Configure BLOB_READ_WRITE_TOKEN no ambiente ou .env.');
const sensors=JSON.parse(await readFile(new URL('../config/sensors.json',import.meta.url),'utf8'));
const initial={
 'pytu/evidence.json':{lastAttempt:0,evidence:{air:null,fire:null,errors:{}},purpleair:{sensors,ids:sensors.map(s=>s.sensor_index),lastAttempt:0},jev:{}},
 'pytu/chat-budget.json':{day:new Date().toISOString().slice(0,10),count:0,recent:[]}
};
for(const [path,value] of Object.entries(initial)){
 if(await readDocument(path)){console.log(path+': já existe; preservado.');continue;}
 await writeDocument(path,value);
 console.log(path+': inicializado sem leituras ambientais.');
}
