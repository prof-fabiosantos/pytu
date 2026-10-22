import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseStore,DocumentConflict} from '../document-store.mjs';

test('Supabase conditional writes reject stale revisions and duplicate creates',async()=>{
 let stored=null;
 const request=async(url,options)=>{
  assert.equal(options.headers.apikey,'sb_secret_test');
  assert.equal(options.headers.Authorization,undefined);
  if(options.method==='GET')return Response.json(stored?[stored]:[]);
  const body=JSON.parse(options.body);
  if(options.method==='POST'&&stored)return new Response('',{status:409});
  if(options.method==='PATCH'&&url.searchParams.get('revision')!=='eq.'+stored.revision)return Response.json([]);
  stored=body;return Response.json([stored]);
 };
 const store=createSupabaseStore({url:'https://example.supabase.co',key:'sb_secret_test',request});
 assert.equal(await store.read('pytu/test'),null);
 const initial=await store.write('pytu/test',{count:1});
 await assert.rejects(store.write('pytu/test',{count:2}),DocumentConflict);
 const updated=await store.write('pytu/test',{count:2},initial.etag);
 assert.notEqual(initial.etag,updated.etag);
 await assert.rejects(store.write('pytu/test',{count:3},initial.etag),DocumentConflict);
 assert.deepEqual((await store.read('pytu/test')).value,{count:2});
});
test('Supabase outages are errors, not empty history; errors do not expose response bodies',async()=>{
 const store=createSupabaseStore({url:'https://example.supabase.co',key:'sb_secret_test',request:async()=>new Response('private detail',{status:503})});
 await assert.rejects(store.read('pytu/test'),e=>e.name==='StorageUnavailable'&&!e.message.includes('private detail'));
});
