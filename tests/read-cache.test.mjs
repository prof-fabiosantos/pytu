import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReadCache} from '../read-cache.mjs';

test('concurrent and repeated reads share one operation; expiry reloads',async()=>{
 let time=0,calls=0;const cache=createReadCache({ttl:100,now:()=>time});
 const load=async()=>({count:++calls});
 const values=await Promise.all(Array.from({length:20},()=>cache.read('day',load)));
 assert.equal(calls,1);assert.equal(values[19].count,1);
 const value=await cache.read('day',load);value.count=999;
 assert.equal((await cache.read('day',load)).count,1);
 time=101;assert.equal((await cache.read('day',load)).count,2);
 cache.clear('day');await cache.read('day',load);assert.equal(calls,3);
});
test('failure backs off without returning fabricated empty data',async()=>{
 let time=0,calls=0;const cache=createReadCache({retry:60,now:()=>time});
 const fail=async()=>{calls++;throw Error('storage unavailable');};
 await assert.rejects(cache.read('day',fail),/storage unavailable/);
 await assert.rejects(cache.read('day',fail),/storage unavailable/);
 assert.equal(calls,1);time=61;
 await assert.rejects(cache.read('day',fail));assert.equal(calls,2);
});
test('cache keeps separate days and has bounded capacity',async()=>{
 const cache=createReadCache({maxEntries:2});let calls=0;
 const load=async()=>++calls;
 await cache.read('a',load);await cache.read('b',load);await cache.read('c',load);
 assert.equal(await cache.read('b',load),2);
 assert.equal(await cache.read('a',load),4);
});
