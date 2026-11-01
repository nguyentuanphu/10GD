// v1.7.1 community recipes API: flag off, auth (signed-in only, viewers read-only, same-origin), size and daily
// limits, pending → Studio approve/reject/remove (owner only, CSRF, audited), points only for approved, public list
// without personal data, EXIF/XMP/comment stripping of photos, report, unshare (family recipe untouched: the server
// never stores it). Real accounts/studio handlers with in-memory stores; synthetic data only.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {createCommunityRecipesHandler} from '../netlify/functions/community-recipes.mjs';
import {stripJpeg,jpegHasMetadata,cleanSharedRecipe,RECIPE_RULES} from '../netlify/lib/community-recipes.mjs';
import {communityStore,rewardsFor} from '../netlify/lib/community-prices.mjs';
import {resetSettingsCache,saveSettings,listLog} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const origin='https://test.example',password='synthetic-recipe-passphrase-42';
const getStoreFn=memoryStores(),accounts=createAccountsHandler({getStoreFn});
let clock=Date.parse('2026-11-01T02:00:00Z');const nowFn=()=>clock;
const env:any={STUDIO_ADMINS:'henrynguyen'};
const api=createCommunityRecipesHandler({getStoreFn,env,nowFn});
const studio=createStudioHandler({getStoreFn,env,nowFn,mailer:{configured:()=>false,async send(){}},limits:{all:10000,mutate:10000}});
const store=communityStore(getStoreFn);
let ipN=0;
const req=(op:string,{method='GET',body,cookie='',csrf,from=origin,raw,type}:any={})=>new Request(`${origin}/.netlify/functions/community-recipes?op=${op}`,{method,headers:{Origin:from,'x-nf-client-connection-ip':'ip-'+(ipN++),...(cookie?{Cookie:cookie}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:type?{'Content-Type':type}:{})},...(body?{body:JSON.stringify(body)}:raw?{body:raw}:{})});
const acc=async(op:string,body:any,cookie='')=>accounts(new Request(`${origin}/.netlify/functions/accounts?op=${op}`,{method:'POST',headers:{Origin:origin,'x-nf-client-connection-ip':'acc-'+(ipN++),'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)}));
async function register(username:string){const r=await acc('register',{username,name:username,password,trust:true});assert.equal(r.status,201,username);return r.headers.get('set-cookie')!.split(';')[0]}
async function household(username:string,name:string){const cookie=await register(username);const fam=(await (await acc('create-family',{name},cookie)).json()).household;return{cookie,fam}}
const A=(op:string,o:any={})=>api(req(op,o));
const json=async(r:Response|Promise<Response>)=>{const x=await r;return{status:x.status,body:await x.json()}};

// A tiny but structurally valid JPEG (SOF says 64×80) with EXIF (GPS), XMP and COM segments added.
function jpegWithMetadata(){const seg=(m:number,payload:number[])=>[0xff,m,(payload.length+2)>>8,(payload.length+2)&255,...payload];
 const exif=[...Buffer.from('Exif\0\0'),...Buffer.from('MM\0*GPSLatitude-33.9 GPSLongitude151.2 Camera:QA')];
 const xmp=[...Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>secret</x:xmpmeta>')];
 const sof=[8,0,80,0,64,1,1,0x11,0];
 const dqt=[0,...Array(64).fill(1)],dht=[0,1,...Array(15).fill(0),0];
 return new Uint8Array([0xff,0xd8,...seg(0xe0,[...Buffer.from('JFIF\0'),1,1,0,0,1,0,1,0,0]),...seg(0xe1,exif),...seg(0xe1,xmp),...seg(0xfe,[...Buffer.from('family comment')]),...seg(0xdb,dqt),...seg(0xc0,sof),...seg(0xc4,dht),...seg(0xda,[1,1,0,0,63,0]),0x12,0x34,0xff,0x00,0x56,0xff,0xd0,0x78,0xff,0xd9])}
const recipe=(extra:any={})=>({consent:true,kind:'full',display:'family',sourceId:'fam-recipe-1',recipe:{name:'Gà kho gừng',category:'main',time:40,yield:4,ingredients:[{name:'Thịt gà',qty:500,unit:'g'},{name:'Gừng',qty:1,unit:'nhánh'}],missing:['Nước mắm 2 muỗng canh'],prep:'Ướp gà 20 phút',steps:['Phi gừng','Kho gà']},...extra});

// ---- pure helpers
{const raw=jpegWithMetadata();assert.ok(jpegHasMetadata(raw),'fixture has metadata');const {bytes,width,height}=stripJpeg(raw);assert.equal(width,64);assert.equal(height,80);assert.ok(!jpegHasMetadata(bytes),'EXIF/XMP/COM removed');const text=Buffer.from(bytes).toString('latin1');assert.ok(!/GPS|xmpmeta|family comment|Exif/.test(text),'no metadata text left');assert.ok(text.includes('JFIF'),'JFIF kept');assert.deepEqual([...bytes.slice(-2)],[0xff,0xd9]);
 assert.throws(()=>stripJpeg(new Uint8Array([0x89,0x50,0x4e,0x47])),/JPEG/);
 const c=cleanSharedRecipe(recipe());assert.deepEqual(c.ingredients,[{name:'Thịt gà',qty:500,unit:'g'},{name:'Gừng',qty:1,unit:'nhánh'}],'quantities copied exactly');
 const noQty=cleanSharedRecipe(recipe({recipe:{name:'Canh',ingredients:[{name:'Muối'}],steps:['Nấu']}}));assert.deepEqual(noQty.ingredients,[{name:'Muối',qty:null,unit:''}],'missing quantity stays missing (never invented)');
 assert.throws(()=>cleanSharedRecipe({kind:'full',recipe:{name:'X'}}),/tên|name/i);
 const photoOnly=cleanSharedRecipe({kind:'photo',recipe:{name:'Bánh xèo',ingredients:[{name:'Bột',qty:1,unit:'kg'}],steps:['x']}});assert.equal(photoOnly.ingredients,undefined,'photo-only shares no ingredients')}

const mum=await household('qa-mum','Nhà Bếp QA'),other=await household('qa-other','Nhà Khác'),henry=await register('henrynguyen');
const meRes=await studio(new Request(`${origin}/.netlify/functions/studio?op=me`,{headers:{Cookie:henry}}));const me=await meRes.json();assert.equal(me.role,'owner');
const S=(action:string,body:any={},cookie=henry,csrf=me.csrf)=>api(req('studio-action',{method:'POST',cookie,csrf,body:{action,...body}}));

// ---- status / auth
assert.deepEqual((await json(A('status'))).body.signedIn,false);
assert.equal((await json(A('status',{cookie:mum.cookie}))).body.familyName,'Nhà Bếp QA');
assert.equal((await A('share',{method:'POST',body:recipe()})).status,401,'signed-in accounts only');
assert.equal((await A('share',{method:'POST',body:recipe(),cookie:mum.cookie,from:'https://evil.example'})).status,403,'same-origin');
assert.equal((await A('share',{method:'POST',body:{...recipe(),consent:false},cookie:mum.cookie})).status,400,'explicit consent');
assert.equal((await A('share',{method:'POST',raw:'x'.repeat(70000),type:'application/json',cookie:mum.cookie})).status,413,'body size cap');
// viewer: read-only
{const inv=await (await acc('invite',{role:'viewer'},mum.cookie)).json();const viewer=await register('qa-viewer');await acc('join',{code:inv.code},viewer);
 assert.equal((await A('share',{method:'POST',body:recipe(),cookie:viewer})).status,403,'viewer cannot share');assert.equal((await A('mine',{cookie:viewer})).status,200)}

// ---- share → pending (not public)
const shared=await json(A('share',{method:'POST',body:recipe(),cookie:mum.cookie}));assert.equal(shared.status,201);assert.equal(shared.body.status,'pending');const id=shared.body.id;
assert.match(id,/^cr-[a-z0-9]+-[a-f0-9]{10}$/);
assert.deepEqual((await json(A('list'))).body.recipes,[],'pending is not public');
assert.equal((await A('photo&id='+id)).status,404,'pending photo not public');
// photo: JPEG only, metadata stripped, new photo returns to pending
assert.equal((await A('share-photo&id='+id,{method:'POST',raw:new Uint8Array([1,2,3]),type:'image/png',cookie:mum.cookie})).status,415);
assert.equal((await A('share-photo&id='+id,{method:'POST',raw:jpegWithMetadata(),type:'image/jpeg',cookie:other.cookie})).status,404,'another family cannot attach a photo');
const ph=await json(A('share-photo&id='+id,{method:'POST',raw:jpegWithMetadata(),type:'image/jpeg',cookie:mum.cookie}));assert.equal(ph.status,201,JSON.stringify(ph.body));
const stored=new Uint8Array(await store.get('recipes/photos/'+id,{type:'arrayBuffer'}));assert.ok(stored.length>10&&!jpegHasMetadata(stored),'stored photo has no EXIF/XMP/COM');
// re-share of the same family recipe updates the same item instead of duplicating it
const again=await json(A('share',{method:'POST',body:{...recipe(),keepPhoto:true},cookie:mum.cookie}));assert.equal(again.body.id,id);
const mine=(await json(A('mine',{cookie:mum.cookie}))).body.shares;assert.equal(mine.length,1);assert.equal(mine[0].sourceId,'fam-recipe-1');assert.equal(mine[0].status,'pending');assert.equal(mine[0].hasPhoto,true);

// ---- Studio moderation: owner only, CSRF, audit, points only on approve
assert.equal((await api(req('studio-list',{cookie:mum.cookie}))).status,403,'family accounts cannot moderate');
assert.equal((await S('approve',{id},henry,'bad-token')).status,403,'CSRF');
const q=await json(api(req('studio-list',{cookie:henry})));assert.equal(q.status,200);assert.equal(q.body.items[0].status,'pending');assert.equal(q.body.items[0].account,'qa-mum');
assert.equal((await api(req('studio-photo&id='+id,{cookie:henry}))).status,200,'moderator sees the pending photo');
assert.equal((await rewardsFor(getStoreFn,{username:'qa-mum',now:clock,rewards:null})).total,0,'no points while pending');
const ok=await json(S('approve',{id}));assert.equal(ok.status,200);assert.equal(ok.body.points,5,'small fixed award');
assert.equal((await rewardsFor(getStoreFn,{username:'qa-mum',now:clock,rewards:null})).total,5);
await S('restore',{id});assert.equal((await rewardsFor(getStoreFn,{username:'qa-mum',now:clock,rewards:null})).total,5,'awarded once');
const audit=await listLog(getStoreFn,'audit',{now:clock});assert.ok(audit.items.some((e:any)=>e.action==='community_recipe_approve'&&e.target?.id===id),'approval audited');assert.ok(audit.items.some((e:any)=>e.action==='view_community_recipes'),'queue view audited');
// ---- public list: no personal data
const list=(await json(A('list'))).body.recipes;assert.equal(list.length,1);const pub=list[0];
assert.equal(pub.by,'Nhà Bếp QA');assert.deepEqual(pub.ingredients,[{name:'Thịt gà',qty:500,unit:'g'},{name:'Gừng',qty:1,unit:'nhánh'}]);
for(const k of ['account','familyRef','sourceId','reports','history'])assert.ok(!(k in pub),'no '+k+' in public data');
assert.ok(!JSON.stringify(list).includes('qa-mum'));
const img=await A('photo&id='+id);assert.equal(img.status,200);assert.equal(img.headers.get('content-type'),'image/jpeg');
// ---- report (signed-in, once per account while open, daily cap)
assert.equal((await A('report',{method:'POST',body:{id,reason:'wrong'}})).status,401);
assert.equal((await A('report',{method:'POST',body:{id,reason:'nope'},cookie:other.cookie})).status,400);
assert.equal((await json(A('report',{method:'POST',body:{id,reason:'wrong',note:'thiếu muối'},cookie:other.cookie}))).body.reported,true);
assert.equal((await json(A('report',{method:'POST',body:{id,reason:'wrong'},cookie:other.cookie}))).body.duplicate,true);
const q2=(await json(api(req('studio-list',{cookie:henry})))).body;assert.equal(q2.stats.reportsOpen,1);
assert.equal((await S('remove',{id,reason:''})).status,400,'remove needs a reason');
await S('dismiss-reports',{id});assert.equal((await json(api(req('studio-list',{cookie:henry})))).body.stats.reportsOpen,0);
// ---- reject: never points, reason shown to the family, photo deleted
const second=(await json(A('share',{method:'POST',body:recipe({sourceId:'fam-recipe-2',display:'anonymous',kind:'photo',recipe:{name:'Bánh xèo'}}),cookie:other.cookie}))).body;
assert.equal((await S('approve',{id:second.id})).status,409,'photo-only needs a photo');
await A('share-photo&id='+second.id,{method:'POST',raw:jpegWithMetadata(),type:'image/jpeg',cookie:other.cookie});
assert.equal((await S('reject',{id:second.id,reason:'Ảnh không rõ món'})).status,200);
assert.equal((await rewardsFor(getStoreFn,{username:'qa-other',now:clock,rewards:null})).total,0,'rejected earns nothing');
const om=(await json(A('mine',{cookie:other.cookie}))).body.shares[0];assert.equal(om.status,'rejected');assert.equal(om.reason,'Ảnh không rõ món');
assert.equal(await store.get('recipes/photos/'+second.id,{type:'arrayBuffer'}),null,'rejected photo deleted');
assert.equal((await json(A('list'))).body.recipes.length,1,'rejected not public');
// anonymous approved item shows no name
const third=(await json(A('share',{method:'POST',body:recipe({sourceId:'fam-recipe-3',display:'anonymous'}),cookie:other.cookie}))).body;await S('approve',{id:third.id});
const anon=(await json(A('list'))).body.recipes.find((x:any)=>x.id===third.id);assert.equal(anon.by,null);assert.equal(anon.anonymous,true);
// ---- unshare: only the owner family; removes copy + photo
assert.equal((await A('unshare',{method:'POST',body:{id},cookie:other.cookie})).status,404,'other family cannot unshare');
assert.equal((await json(A('unshare',{method:'POST',body:{id},cookie:mum.cookie}))).body.removed,true);
assert.equal(await store.get('recipes/items/'+id,{type:'json'}),null);assert.equal(await store.get('recipes/photos/'+id,{type:'arrayBuffer'}),null);
assert.ok(!(await json(A('list'))).body.recipes.some((x:any)=>x.id===id));
// ---- daily share limit
for(let i=0;i<RECIPE_RULES.sharesPerDay-2;i++)// two shares (share + re-share) already today
 assert.equal((await A('share',{method:'POST',body:recipe({sourceId:'bulk-'+i}),cookie:mum.cookie})).status,201);
assert.equal((await A('share',{method:'POST',body:recipe({sourceId:'bulk-x'}),cookie:mum.cookie})).status,429,'daily limit');
clock+=86400000;assert.equal((await A('share',{method:'POST',body:recipe({sourceId:'bulk-y'}),cookie:mum.cookie})).status,201,'resets next day');
// ---- flag off: everything but status/Studio answers 404
await saveSettings(getStoreFn,{flags:{communityRecipes:false}});resetSettingsCache();clock+=120000;
assert.deepEqual((await json(A('status'))).body,{enabled:false});
assert.equal((await A('list')).status,404);assert.equal((await A('share',{method:'POST',body:recipe(),cookie:mum.cookie})).status,404);
assert.equal((await api(req('studio-list',{cookie:henry}))).status,200,'Studio can still clean up');
const offEnv=createCommunityRecipesHandler({getStoreFn,env:{...env,STUDIO_FLAG_COMMUNITY_RECIPES:'true'},nowFn});resetSettingsCache();clock+=120000;assert.equal((await offEnv(req('list'))).status,200,'env var overrides');
console.log('Community recipes API: auth, limits, moderation, points, EXIF stripping, report, unshare and flag checks passed.');
