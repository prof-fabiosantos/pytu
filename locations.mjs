import {readFileSync} from 'node:fs';
const geo=JSON.parse(readFileSync(new URL('./dist/neighborhoods.json',import.meta.url),'utf8'));
export const neighborhoods=new Map(geo.features.map(f=>[f.properties.NOME_BAIRR,{name:f.properties.NOME_BAIRR,source:'Prefeitura de Manaus / IMPLURB — GeoManaus',sourceUrl:'https://pmm.manaus.am.gov.br/arcgis/rest/services/TESTES/GeoManaus_Consulta/FeatureServer/0',scope:'Referência geográfica. Sensores locais, quando disponíveis, estão em purpleair.sensors com bairro identificado. CAMS permanece regional.'}]));
export function resolveLocation(id){if((id??'manaus')==='manaus')return {name:'Manaus - visão metropolitana',scope:'Estimativa regional consultada na referência Ponta Negra, não média de todos os bairros.'};return neighborhoods.get(id)??null;}
