import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {locateNeighborhood,nearestSensors,distanceKm,locationError} from '../dist/geolocation.mjs';
test('localização identifica bairros reais e recusa precisão insuficiente',async()=>{
 const data=JSON.parse(await readFile(new URL('../dist/neighborhoods.json',import.meta.url)));
 const sensors=JSON.parse(await readFile(new URL('../config/sensors.json',import.meta.url)));
 let found=0;for(const sensor of sensors){const p={lat:sensor.latitude,lon:sensor.longitude,accuracy:1};const result=locateNeighborhood(data,p);if(result.status==='found'){found++;assert.ok(data.features.some(f=>f.properties.NOME_BAIRR===result.id));}assert.equal(locateNeighborhood(data,{...p,accuracy:2000}).status,'imprecise');}
 assert.ok(found>0);
 const [lon,lat]=data.features[0].geometry.coordinates[0][0];
 assert.notEqual(locateNeighborhood(data,{lat,lon,accuracy:20}).status,'found');
 assert.equal(locateNeighborhood(data,{lat:0,lon:0,accuracy:10}).status,'outside');
 assert.equal(locateNeighborhood(data,{lat:NaN,lon:0,accuracy:10}).status,'invalid');
});
test('distâncias ordenadas, coordenadas inválidas excluídas e erros claros',()=>{
 assert.equal(distanceKm({lat:-3,lon:-60},{lat:-3,lon:-60}),0);
 const sensors=[{id:1,lat:-3.1,lon:-60},{id:2,lat:-3,lon:-60},{id:3,lat:null,lon:null}];
 assert.deepEqual(nearestSensors(sensors,{lat:-3,lon:-60}).map(s=>s.id),[2,1]);
 assert.match(locationError(1),/Permissão negada/);assert.match(locationError(3),/demorou/);assert.match(locationError(2),/indisponível/);
});
