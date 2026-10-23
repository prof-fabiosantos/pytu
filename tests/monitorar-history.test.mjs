import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mergeIqArHistory} from '../monitorar-history.mjs';
import {normalizeMonitorAr,createMonitorArCollector} from '../monitorar.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/monitorar-real.json',import.meta.url),'utf8'));
const reading=normalizeMonitorAr(fixture.payload,fixture.collectedAt);
test('IQAr archive preserves real source values, deduplicates measurement time and expires after seven days',()=>{
 const now=Date.parse(fixture.collectedAt);
 const first=mergeIqArHistory([],reading,now);
 assert.equal(first.length,1);assert.equal(first[0].iqar,42);
 assert.deepEqual(mergeIqArHistory(first,{...reading,iqar:43},now),first);
 assert.deepEqual(mergeIqArHistory(first,null,now+8*86400000),[]);
 assert.deepEqual(mergeIqArHistory([],{...reading,time:new Date(now+3600000).toISOString()},now),[]);
 assert.deepEqual(mergeIqArHistory([],{...reading,iqar:null},now),[]);
});
test('IQAr opt-in stores observations with existing collector writes, never repeats on failure or within the hour',async()=>{
 let doc=null,writes=0,calls=0,now=Date.parse(fixture.collectedAt),fail=false;
 const read=async()=>doc;
 const write=async value=>(doc={value:structuredClone(value),etag:String(++writes)});
 const request=async()=>{calls++;if(fail)throw Error();return {ok:true,json:async()=>fixture.payload};};
 const collector=createMonitorArCollector({read,write,endpoint:'https://example.invalid',request,now:()=>now,historyEnabled:true});
 await collector();assert.equal(doc.value.history.length,1);assert.equal(writes,2);assert.equal(calls,1);
 await collector();assert.equal(writes,2);assert.equal(calls,1);
 now+=3600000;fail=true;await collector();assert.equal(doc.value.history.length,1);assert.equal(calls,2);
 const disabled=createMonitorArCollector({read:async()=>null,write,endpoint:'https://example.invalid',request,now:()=>now,historyEnabled:false});fail=false;await disabled();assert.equal(doc.value.history,undefined);
});
