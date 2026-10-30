import {readDocument,writeDocument} from './document-store.mjs';
import {createHeatCollector} from './heat.mjs';
const path='pytu/heat-manaus-v1.json';
export const cloudHeat=createHeatCollector({read:()=>readDocument(path),write:(value,etag)=>writeDocument(path,value,etag)});

