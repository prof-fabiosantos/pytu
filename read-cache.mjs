// Per-process cache: coalesce concurrent reads and briefly back off on failures.
// This supplements CDN caching; it is not persistent storage or a global lock.
export function createReadCache({ttl=300000,retry=60000,maxEntries=128,now=Date.now}={}){
 const entries=new Map();
 return {
  clear(key){entries.delete(key);},
  async read(key,loader){
   let entry=entries.get(key);
   if(entry&&(entry.pending||entry.until>now())){
    if(entry.error)throw entry.error;
    return entry.pending??structuredClone(entry.value);
   }
   if(entries.size>=maxEntries)entries.delete(entries.keys().next().value);
   entry={};entries.set(key,entry);
   entry.pending=Promise.resolve().then(loader).then(value=>{
    entry.value=structuredClone(value);entry.until=now()+ttl;entry.pending=null;
    return structuredClone(value);
   },error=>{entry.error=error;entry.until=now()+retry;entry.pending=null;throw error;});
   return entry.pending;
  }
 };
}
