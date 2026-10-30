import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeHeat,heatView,createHeatCollector} from '../heat.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/heat-real.json',import.meta.url),'utf8'));
const now=Date.parse(fixture.collectedAt),HOUR=3600000;
test('real forecast preserves units, local midnight conversion and missing values',()=>{
 const result=normalizeHeat(fixture.payload,now);
 assert.equal(result.hours[0].time,'2026-10-25T04:00:00.000Z');
 assert.equal(result.hours[0].temperature,29.4);
 assert.equal(result.hours.length,48);
 const missing=structuredClone(fixture.payload);missing.hourly.temperature_2m[0]=null;
 assert.equal(normalizeHeat(missing,now).hours[0].temperature,null);
 const invalid=structuredClone(fixture.payload);invalid.hourly_units.temperature_2m='°F';
 assert.throws(()=>normalizeHeat(invalid,now));
});
test('expired and future-dated collection is never current',()=>{
 const forecast=normalizeHeat(fixture.payload,now);
 assert.equal(heatView({forecast},now).available,true);
 assert.equal(heatView({forecast},now+2*HOUR).available,false);
 assert.equal(heatView({forecast},now-1).available,false);
});
test('concurrent instances share one upstream call and retain data on failure',async()=>{
 let doc=null,revision=0,calls=0,t=now,fail=false;
 const options={clock:()=>t,read:async()=>structuredClone(doc),write:async(value,etag)=>{if(etag!==doc?.etag)throw Error('conflict');doc={value,etag:++revision};},request:async()=>{calls++;if(fail)throw Error('unavailable');return {ok:true,json:async()=>fixture.payload};}};
 const a=createHeatCollector(options),b=createHeatCollector(options);
 await Promise.all([a(),a(),b()]);
 assert.equal(calls,1);
 await b();assert.equal(calls,1);
 t+=HOUR;fail=true;const stale=await a();assert.equal(calls,2);assert.equal(stale.error,'provider_unavailable');assert.equal(stale.collectedAt,new Date(now).toISOString());
 await b();assert.equal(calls,2);
 t+=HOUR;assert.equal((await a()).available,false);
});
test('storage failure never triggers upstream requests',async()=>{
 let calls=0;const read=async()=>{throw Error();};
 const collector=createHeatCollector({read,write:async()=>{},request:async()=>{calls++;}});
 assert.equal((await collector()).available,false);assert.equal(calls,0);
});

