// Coordinates stay in browser memory. No geocoding service or persistence.
export function distanceKm(a,b){const r=Math.PI/180,dy=(b.lat-a.lat)*r,dx=(b.lon-a.lon)*r;const h=Math.sin(dy/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dx/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));}
function inside([x,y],ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;}
function polygons(feature){return feature.geometry?.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry?.type==='MultiPolygon'?feature.geometry.coordinates:[];}
function edgeDistance(point,ring){const scale=111195,cos=Math.cos(point.lat*Math.PI/180);let min=Infinity;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a={x:(ring[j][0]-point.lon)*scale*cos,y:(ring[j][1]-point.lat)*scale},b={x:(ring[i][0]-point.lon)*scale*cos,y:(ring[i][1]-point.lat)*scale};const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,-(a.x*dx+a.y*dy)/(dx*dx+dy*dy||1)));min=Math.min(min,Math.hypot(a.x+t*dx,a.y+t*dy));}return min;}
export function locateNeighborhood(data,point){
 if(!Number.isFinite(point.lat)||!Number.isFinite(point.lon)||Math.abs(point.lat)>90||Math.abs(point.lon)>180||!Number.isFinite(point.accuracy)||point.accuracy<0)return {status:'invalid'};
 if(point.accuracy>1000)return {status:'imprecise'};
 const matches=(data?.features??[]).filter(f=>polygons(f).some(rings=>inside([point.lon,point.lat],rings[0])&&!rings.slice(1).some(r=>inside([point.lon,point.lat],r))));
 if(matches.length!==1)return {status:matches.length?'boundary':'outside'};
 const feature=matches[0];if(polygons(feature).some(rings=>rings.some(r=>edgeDistance(point,r)<=point.accuracy)))return {status:'boundary'};
 return {status:'found',id:feature.properties.NOME_BAIRR};
}
export function nearestSensors(sensors,point){return (sensors??[]).filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)).map(s=>({...s,distance:distanceKm(point,{lat:s.lat,lon:s.lon})})).sort((a,b)=>a.distance-b.distance).slice(0,3);}
export function locationError(code){return code===1?'Permissão negada. Você pode selecionar seu bairro manualmente.':code===3?'A localização demorou a responder. Tente novamente ou selecione o bairro.':'Localização indisponível. Selecione seu bairro manualmente.';}
