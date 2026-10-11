import test from 'node:test';
import assert from 'node:assert/strict';
import {sensorSummary} from '../dist/sensor-summary.mjs';
test('resumo diferencia sensores por bairro e não oculta faixas mais altas',()=>{
 const sensors=[{neighborhood:'A',available:true,classification:{label:'Muito ruim'}},{neighborhood:'A',available:true,classification:{label:'Péssima'}},{neighborhood:'B',available:true,classification:{label:'Moderada'}},{neighborhood:'A',available:false,classification:{label:'Boa'}}];
 assert.match(sensorSummary(sensors,'A'),/Muito ruim \(1\).*Péssima \(1\)/);
 assert.doesNotMatch(sensorSummary(sensors,'A'),/Moderada|Boa/);
 assert.match(sensorSummary(sensors,'A'),/1 sem classificação/);
 assert.match(sensorSummary(sensors,'manaus'),/Moderada \(1\).*Muito ruim \(1\).*Péssima \(1\)/);
 assert.match(sensorSummary(sensors,'C'),/Sem sensor cadastrado/);
 assert.match(sensorSummary([{available:false}],'manaus'),/sem classificação atual/);
});
