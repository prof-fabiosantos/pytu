import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedBand,validateAnswer,observations,JevClassifier} from '../classification.mjs';
import {readFile} from 'node:fs/promises';
import {rows,describeSensors} from '../purpleair.mjs';
test('limites exatos, acima da escala e valores inválidos',()=>{for(const [v,b] of [[0,'boa'],[25,'boa'],[25.01,'moderada'],[50,'moderada'],[50.01,'ruim'],[75,'ruim'],[75.01,'muito_ruim'],[125,'muito_ruim'],[125.01,'pessima'],[160,'pessima'],[250,'pessima']])assert.equal(expectedBand(v)?.id,b);for(const v of [null,undefined,NaN,Infinity,-1,'25'])assert.equal(expectedBand(v),null);});
test('respostas Jev divergentes ou malformadas não são aceitas',()=>{assert.equal(validateAnswer({type:'choice',choice:'ruim'},57.6),true);assert.equal(validateAnswer({type:'choice',choice:'boa'},57.6),false);assert.equal(validateAnswer({choice:'ruim'},57.6),false);assert.equal(validateAnswer(null,57.6),false);});
test('somente observações atuais e resultados exatamente correspondentes',async()=>{const seed=JSON.parse(await readFile(new URL('./fixtures/purpleair-real.json',import.meta.url)));const pa=describeSensors({sensors:rows(seed.raw),collectedAt:seed.collectedAt,sourceTime:seed.raw.time_stamp*1000},Date.parse(seed.collectedAt));const items=observations({air:null},pa);assert.equal(items.length,10);const p=new JevClassifier('');const item=items[0];p.cache.entries={[item.id]:{value:item.value,time:'wrong',label:'Ruim'}};assert.ok(p.decorate({air:null},pa).purpleair.sensors.every(s=>s.classification===null));p.cache.entries[item.id].time=item.time;assert.equal(p.decorate({air:null},pa).purpleair.sensors.filter(s=>s.classification).length,1);});
import {classificationObservations} from '../classification.mjs';
import {describeAir} from '../sources.mjs';
test('CAMS usa classificação validada do próximo horário sem nova coleta',async()=>{
 const seed=JSON.parse(await readFile(new URL('./fixtures/air-real.json',import.meta.url)));
 const now=Date.parse(seed.collectedAt),air=describeAir(seed.raw,seed.collectedAt,now);
 const items=classificationObservations({air},{sensors:[]});
 assert.equal(items.length,3);
 const classifier=new JevClassifier('');
 classifier.cache.entries=Object.fromEntries(items.map(item=>[item.id,{value:item.value,time:item.time,label:expectedBand(item.value).label}]));
 const later=describeAir(seed.raw,seed.collectedAt,air.current.time+3600000);
 assert.notEqual(later.current.time,air.current.time);
 assert.equal(classifier.decorate({air:later},{sensors:[]}).air.classification.label,expectedBand(later.current.value).label);
 const changed={...later,current:{...later.current,value:later.current.value+1}};
 assert.equal(classifier.decorate({air:changed},{sensors:[]}).air.classification,null);
 const stale=describeAir(seed.raw,seed.collectedAt,now+3*3600000);
 assert.equal(classifier.decorate({air:stale},{sensors:[]}).air.classification,null);
});
test('nova série não é bloqueada pelo intervalo da tentativa anterior',async()=>{
 const seed=JSON.parse(await readFile(new URL('./fixtures/air-real.json',import.meta.url)));
 const air=describeAir(seed.raw,seed.collectedAt,Date.parse(seed.collectedAt));
 const classifier=new JevClassifier('missing-test-directory/');let calls=0;
 const old=process.env.TYPESAFE_API_KEY;process.env.TYPESAFE_API_KEY='test-only';
 classifier.collect=async function(key,items,fingerprint){calls++;this.cache={attemptFingerprint:fingerprint,lastAttempt:Date.now(),status:'error'};};
 try{
  await classifier.refresh({air},{sensors:[]});
  await classifier.refresh({air},{sensors:[]});assert.equal(calls,1);
  const later=describeAir(seed.raw,seed.collectedAt,air.current.time+3600000);
  await classifier.refresh({air:later},{sensors:[]});assert.equal(calls,2);
 }finally{if(old===undefined)delete process.env.TYPESAFE_API_KEY;else process.env.TYPESAFE_API_KEY=old;}
});
