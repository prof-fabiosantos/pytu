// Bounded rolling archive; first observation of a station/measurement is preserved.
export function mergeIqArHistory(previous=[],reading,now=Date.now()){
 const cutoff=now-7*86400000,unique=new Map();
 for(const r of [...(Array.isArray(previous)?previous:[]),...(reading?[reading]:[])]){
  const time=Date.parse(r?.time),collected=Date.parse(r?.collectedAt);
  if(r?.stationId!==178586||!Number.isFinite(r.iqar)||r.iqar<0||!Number.isFinite(time)||!Number.isFinite(collected)||time<cutoff||time>now+300000||!['boa','moderada','ruim','muito ruim','péssima'].includes(r.classification?.toLowerCase()))continue;
  const key=r.stationId+':'+r.time;
  if(!unique.has(key))unique.set(key,r);
 }
 return [...unique.values()].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time)).slice(-336);
}
