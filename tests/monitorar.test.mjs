import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeMonitorAr,monitorArView,createMonitorArCollector} from '../monitorar.mjs';
import {DocumentConflict} from '../document-store.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/monitorar-real.json',import.meta.url),'utf8'));
test('MonitorAr real: preserves IQAr, source class and Brasília time; no concentration conversion',()=>{
 const r=normalizeMonitorAr(fixture.payload,fixture.collectedAt);
 assert.equal(r.iqar,42);assert.equal(r.classification,'Moderada');assert.equal(r.time,'2026-10-22T14:00:00.000Z');assert.equal(r.averagingPeriod,'24 horas');assert.equal(r.pm25,undefined);assert.match(monitorArView({reading:r}).reading.timeManaus,/10:00:00/);
 const now=Date.parse(r.time)+3600000;
 assert.equal(monitorArView({reading:{...r,collectedAt:new Date(now).toISOString()}},now).available,true);
 assert.equal(monitorArView({reading:r},Date.parse(r.time)+3*3600000).available,false);
 assert.equal(monitorArView({reading:r},Date.parse(r.time)-3600000).available,false);
 for(const value of [null,'42',-1]){const p=structuredClone(fixture.payload);p[0].indiceQualidadeArAtual.medicao.indiceQualidadeAr=value;assert.throws(()=>normalizeMonitorAr(p,fixture.collectedAt));}
 assert.throws(()=>normalizeMonitorAr([],fixture.collectedAt));
 const p=structuredClone(fixture.payload);p[0].indiceQualidadeArAtual.medicao.dtMedicao='2026-02-30 11:00';assert.throws(()=>normalizeMonitorAr(p,fixture.collectedAt));
});
test('MonitorAr: persistent reservation limits concurrent workers and restarts, including failures',async()=>{
 let doc=null,revision=0,calls=0,now=Date.parse(fixture.collectedAt);
 const read=async()=>structuredClone(doc);
 const write=async(value,etag)=>{if(doc?.etag!==etag)throw new DocumentConflict();doc={value:structuredClone(value),etag:String(++revision)};return structuredClone(doc);};
 const make=(request)=>createMonitorArCollector({read,write,endpoint:'https://example.invalid/private-source',now:()=>now,request});
 const request=async()=>{calls++;return {ok:true,json:async()=>fixture.payload};};
 await Promise.all([make(request)(),make(request)(),make(request)()]);assert.equal(calls,1);
 await make(request)();assert.equal(calls,1);
 now+=3600000;const result=await make(async()=>{calls++;throw Error('private-url-and-response');})();
 assert.equal(calls,2);assert.equal(result.reading.iqar,42);assert.ok(result.error);assert.ok(!JSON.stringify(result).includes('private-url'));
 await make(request)();assert.equal(calls,2);
 now+=3600000;await make(request)();assert.equal(calls,3);
});
test('MonitorAr: no request when unconfigured or reservation storage fails',async()=>{
 let calls=0;const request=async()=>{calls++;};
 const empty=createMonitorArCollector({read:async()=>null,write:async()=>{},request});assert.equal((await empty()).configured,false);
 const failed=createMonitorArCollector({endpoint:'https://example.invalid/private-source',read:async()=>null,write:async()=>{throw Error('storage');},request});await assert.rejects(failed);assert.equal(calls,0);
});
