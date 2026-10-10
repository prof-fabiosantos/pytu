import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {snapshot,mergeDay,emptyDay,dayOf,csv,dateRange} from '../history.mjs';
import {describeAir,normalizeFires} from '../sources.mjs';
import {describeSensors,rows} from '../purpleair.mjs';
test('arquivo usa dados reais, não inclui previsões CAMS e deduplica leituras e detecções',async()=>{
 const a=JSON.parse(await readFile(new URL('./fixtures/air-real.json',import.meta.url)));
 const p=JSON.parse(await readFile(new URL('./fixtures/purpleair-real.json',import.meta.url)));
 const f=await readFile(new URL('./fixtures/inpe-real.csv',import.meta.url),'utf8');const now=Date.parse(a.collectedAt);
 const air=describeAir(a.raw,a.collectedAt,now),purpleair=describeSensors({sensors:rows(p.raw),collectedAt:p.collectedAt,sourceTime:p.raw.time_stamp*1000},Date.parse(p.collectedAt));
 const evidence={generatedAt:a.collectedAt,air,purpleair,fire:{points:normalizeFires([f],now),collectedAt:a.collectedAt,stale:false,partial:true}};
 const days=snapshot(evidence);assert.equal(days.flatMap(d=>d.air).filter(r=>r.source==='CAMS').length,1);assert.ok(days.flatMap(d=>d.air).every(r=>Date.parse(r.time)<=Math.max(now,p.raw.time_stamp*1000)+300000));
 for(const d of days){const merged=mergeDay(mergeDay(emptyDay(d.day),d),d);assert.deepEqual(merged,mergeDay(emptyDay(d.day),d));assert.ok(merged.air.every(r=>dayOf(r.time)===d.day));assert.ok(merged.fire.every(r=>dayOf(r.time)===d.day));}
 const stale=snapshot({...evidence,air:{...air,available:false},purpleair:{sensors:[]},fire:{...evidence.fire,stale:true}});assert.equal(stale.flatMap(d=>d.air).length,0);assert.equal(stale.flatMap(d=>d.fire).length,0);assert.equal(stale[0].collections[0].fireAvailable,false);
});
test('datas de Manaus, intervalo limitado e CSV seguro',()=>{
 assert.equal(dayOf('2026-10-10T02:00:00Z'),'2026-10-09');assert.equal(dateRange('2026-10-01','2026-10-31').length,31);
 for(const args of [['2026-02-30','2026-03-01'],['../../x','x'],['2026-10-02','2026-10-01'],['2026-01-01','2026-12-31']])assert.throws(()=>dateRange(...args));
 const output=csv([{source:'PurpleAir',name:'=FORMULA()',neighborhood:'A,"B"',pm25:0,lat:-3.1}], 'air');assert.ok(output.startsWith('\uFEFF'));assert.ok(output.includes("'=FORMULA()"));assert.ok(output.includes('A,""B""'));assert.ok(output.includes('"0"'));assert.ok(output.includes('"-3.1"'));
});
