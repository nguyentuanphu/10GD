// FamTray Scout ↔ community pool, end to end with in-memory stores and the REAL default
// adapter (v1.6 wiring): Scout results appear as community prices (label/source 'scout'),
// trusted scouts confirm at once while others need ≥2 families, cross-device disagreement
// reaches Studio moderation, product mappings become confirmed, the community wanted list
// drives tasks, and the Studio platform setting `autoScout` (off by default) gates Auto
// tasks while semi-auto keeps working. Synthetic data only (invented prices/products).
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createScoutHandler} from '../netlify/functions/scout.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {createCommunityHandler} from '../netlify/functions/community.mjs';
import {createDefaultAdapter,networkSettings,setExtensionAllowed} from '../netlify/lib/scout.mjs';
import {SCOUT_CATALOG,branchName,scoutPlacement} from '../netlify/lib/scout-adapter.mjs';
import {recordWanted,communityStore,clearCommunityCache} from '../netlify/lib/community-prices.mjs';
import {resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-scout-passphrase-42',EXT='chrome-extension://abcdefghijklmnopabcdefghijklmnop';
let clock=Date.parse('2026-11-04T07:00:00+11:00');// Wednesday, inside the default window
const env:any={STUDIO_ADMINS:'henrynguyen',SCOUT_DEV:'1'};
resetSettingsCache();
const scout=createScoutHandler({getStoreFn,env,nowFn:()=>clock});
const studio=createStudioHandler({getStoreFn,env,nowFn:()=>clock,limits:{all:5000,mutate:5000}});
const community=createCommunityHandler({getStoreFn,env,nowFn:()=>clock});
const accounts=createAccountsHandler({getStoreFn});
let ip=0;
const J=async(r:Response)=>({status:r.status,data:await r.json()});
const call=(op:string,{method='GET',body,cookie='',token='',from=origin,csrf=''}:any={})=>scout(new Request(`${origin}/.netlify/functions/scout?op=${op}`,{method,headers:{...(from?{Origin:from}:{}),'x-nf-client-connection-ip':'ip-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})).then(J);
const dev=(op:string,token:string,body?:any)=>call(op,{method:body===undefined?'GET':'POST',body,token,from:EXT});
const acct=(op:string,body:any,cookie='')=>accounts(new Request(origin+'/.netlify/functions/accounts?op='+op,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r'+(ip++),...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)}));
async function register(username:string,family?:string){const r=await acct('register',{username,name:username,password,trust:true});assert.equal(r.status,201,username);const cookie=r.headers.get('set-cookie')!.split(';')[0];let household:any=null;if(family){const c=await acct('create-family',{name:family},cookie);assert.equal(c.status,201);household=(await c.json()).household}return{cookie,household}}
const studioGet=(op:string,cookie:string)=>studio(new Request(origin+'/.netlify/functions/studio?op='+op,{headers:{Cookie:cookie}})).then(J);
const studioPost=(op:string,body:any,cookie:string,csrf:string)=>studio(new Request(origin+'/.netlify/functions/studio?op='+op,{method:'POST',headers:{Origin:origin,Cookie:cookie,'x-studio-csrf':csrf,'Content-Type':'application/json'},body:JSON.stringify(body)})).then(J);
const prices=async()=>{clearCommunityCache();const r=await community(new Request(origin+'/.netlify/functions/community?op=prices&state=NSW',{headers:{'x-nf-client-connection-ip':'read-'+(ip++)}}));assert.equal(r.status,200);return (await r.json()).items as any[]};
const PRODUCT='https://www.woolworths.com.au/shop/productdetails/123456/synthetic-fish-sauce';
const fish=(price:number)=>({name:'Synthetic fish sauce 500mL',price,productId:'123456',productUrl:PRODUCT,packQty:500,packUnit:'mL',unitPrice:Math.round(price/5*100)/100,unitBasis:'per_100mL'});

// ---- pure helpers
assert.ok(SCOUT_CATALOG.length>=120&&SCOUT_CATALOG.some(c=>c.itemId==='nuoc-mam'),'master catalog bundled for the planner');
assert.equal(branchName('woolworths','Woolworths Rockdale'),'Rockdale');assert.equal(branchName('coles','Rockdale'),'Rockdale');assert.equal(branchName('chemist','Chemist Warehouse - Rockdale'),'Rockdale');
assert.deepEqual(scoutPlacement({retailer:'woolworths',storeLabel:'Rockdale',postcode:'2216'},['NSW','QLD']),{state:'NSW',branchId:'woolworths:2216:rockdale',branchLabel:'Rockdale 2216'});
assert.equal(scoutPlacement({retailer:'woolworths',storeLabel:'Rockdale',postcode:'3000'},['NSW','QLD']),null,'state outside the pilot is not placed');
assert.equal(scoutPlacement({retailer:'woolworths',storeLabel:'',postcode:'2216'},['NSW']),null,'no store label → not placed');

// ---- accounts: Henry (Studio owner = trusted scout), three families
const henry=await register('henrynguyen'),alice=await register('alice','Synthetic family A'),bob=await register('bob','Synthetic family B'),carol=await register('carol','Synthetic family C');
// v1.7.1: only accounts assigned in Studio may pair/run the extension; these synthetic accounts are assigned.
for(const u of ['alice','bob','carol'])await setExtensionAllowed(getStoreFn,u,true,'henrynguyen',clock);
const csrf=(await studioGet('me',henry.cookie)).data.csrf;assert.ok(csrf);
const S=(op:string,body?:any)=>call(op,{method:body===undefined?'GET':'POST',body,cookie:henry.cookie,csrf});

// ---- Studio platform setting autoScout: present, off by default
{const s=(await studioGet('settings',henry.cookie)).data;assert.equal(s.values.flags.autoScout,false,'autoScout platform flag defaults off');assert.equal(s.sources['flags.autoScout'],'default')}
assert.equal((await networkSettings(getStoreFn,env)).autoScout,'off');
assert.deepEqual((await S('studio-auto')).data,{autoScout:'off',source:'default'});

// ---- the community wanted list drives Auto tasks (record before the day's plan is built)
await recordWanted(getStoreFn,{state:'NSW',itemIds:['nuoc-mam'],familyId:alice.household.id,username:'alice',now:clock});
await recordWanted(getStoreFn,{state:'NSW',itemIds:['nuoc-mam','gao-jasmine'],familyId:bob.household.id,username:'bob',now:clock});
{const ad=createDefaultAdapter(getStoreFn,{env,nowFn:()=>clock});const w=await ad.wantedItems({now:clock});assert.deepEqual(w.slice(0,2).map((x:any)=>[x.itemId,x.families]),[['nuoc-mam',2],['gao-jasmine',1]],'wanted list = community counts');assert.ok(w[0].name&&w[0].name!=='nuoc-mam','catalog name used for search')}

// ---- pairing: Henry (Hurstville), Alice + Bob + Carol (Rockdale 2216)
const pair=async(who:any,name:string,postcode:string,storeLabel:string,studioCode=false)=>{const c=studioCode?(await S('studio-pair-code',{})).data:(await call('pair-code',{method:'POST',body:{},cookie:who.cookie})).data;assert.match(c.code,/^[A-HJ-NP-Z2-9]{8}$/);const p=await dev('pair','',{code:c.code,name,postcode,suburb:storeLabel,timeZone:'Australia/Sydney',stores:{woolworths:storeLabel}});assert.equal(p.status,201,JSON.stringify(p.data));return{token:p.data.token,id:p.data.device.id}};
const dH=await pair(henry,'Henry PC','2220','Hurstville',true),dA=await pair(alice,'Alice PC','2216','Rockdale'),dB=await pair(bob,'Bob PC','2216','Rockdale'),dC=await pair(carol,'Carol PC','2216','Rockdale');
{const m=(await call('my-devices',{cookie:alice.cookie})).data;assert.equal(m.devices.length,1);assert.equal(m.trusted,false);assert.equal(m.familyRole,'owner');assert.equal((await call('my-devices',{cookie:henry.cookie})).data.trusted,true,'Studio owner is a trusted scout')}

// ---- autoScout OFF → no tasks (server side), semi-auto unaffected
for(const d of [dH,dA,dB,dC])assert.equal((await S('studio-device',{deviceId:d.id,action:'allow-auto'})).status,200);
{const t=await dev('tasks',dA.token,{runId:'run-aaaaaa',autoEnabled:true});assert.equal(t.status,403);assert.equal(t.data.code,'auto-off');assert.equal(t.data.tasks.length,0)}
{const r=await dev('results',dC.token,{mode:'auto',items:[]});assert.equal(r.status,403,'auto results refused while off');assert.equal(r.data.code,'auto-off')}
{const r=await dev('results',dH.token,{mode:'semi',items:[{retailer:'woolworths',url:'https://www.woolworths.com.au/shop/productdetails/999001/unmapped',status:'ok',storeLabel:'Hurstville',facts:[{name:'Synthetic unmapped biscuit',price:2.5,productId:'999001'}]}]});assert.equal(r.status,200,'semi-auto works while Auto is off');assert.equal(r.data.accepted,1)}
assert.equal((await prices()).length,0,'a fact with no catalogue item is not shown to families');
{const s=getStoreFn({name:'bep-scout'});let fallback:any=null;for await(const p of s.list({prefix:'pool/'}))for(const b of p.blobs)fallback=await s.get(b.key,{type:'json'});assert.equal(fallback?.notInCommunity,'no-item','unplaced fact kept in the Scout store')}

// ---- Studio → Settings switches Auto on (platform setting); Scout network follows
{const r=await studioPost('settings-save',{patch:{flags:{autoScout:true}}},henry.cookie,csrf);assert.equal(r.status,200);assert.equal(r.data.values.flags.autoScout,true)}
assert.equal((await networkSettings(getStoreFn,env)).autoScout,'on','networkSettings reads the Studio platform setting');
assert.deepEqual((await S('studio-auto')).data,{autoScout:'on',source:'platform'});
{const s=(await networkSettings(getStoreFn,{...env,SCOUT_AUTO:'off'}));assert.equal(s.autoScout,'off','env SCOUT_AUTO still overrides');assert.equal(s.autoScoutSource,'env')}

const leaseWanted=async(d:any,runId:string,itemId:string)=>{for(let i=0;i<12;i++){const t=await dev('tasks',d.token,{runId,autoEnabled:true,max:10});assert.equal(t.status,200,JSON.stringify(t.data));const hit=t.data.tasks.find((x:any)=>x.itemId===itemId&&x.kind==='wanted');if(hit)return hit;if(!t.data.tasks.length)break}throw new Error('no wanted task for '+itemId)};
// ---- trusted scout: confirmed immediately, labelled Scout
const hT=await leaseWanted(dH,'run-hhhhhh','nuoc-mam');assert.match(hT.url,/searchTerm=/,'unmapped wanted item → retailer search page');
{const r=await dev('results',dH.token,{mode:'auto',items:[{taskId:hT.taskId,retailer:'woolworths',url:hT.url,status:'ok',storeLabel:'Hurstville',facts:[fish(4.5)]}]});assert.equal(r.status,200);assert.equal(r.data.confirmed,1)}
{const items=await prices(),row=items.find(x=>x.itemId==='nuoc-mam'&&x.branchId==='woolworths:2220:hurstville');assert.ok(row,'Scout price appears as a community price');assert.equal(row.status,'confirmed','trusted scout confirmed at once');assert.equal(row.usable,true);assert.deepEqual(row.sources,['scout'],'labelled Scout');assert.equal(row.branchLabel,'Hurstville 2220');assert.equal(row.price,4.5);assert.equal(row.unitBasis,'per_100mL');assert.equal(row.online,false)}

// ---- non-trusted scouts: pending with one family, confirmed by a second family's device
const aT=await leaseWanted(dA,'run-aaaaaa','nuoc-mam');
{const r=await dev('results',dA.token,{mode:'auto',items:[{taskId:aT.taskId,retailer:'woolworths',url:aT.url,status:'ok',storeLabel:'Rockdale',facts:[fish(4.2)]}]});assert.equal(r.data.accepted,1);assert.equal(r.data.confirmed,0)}
const rock=async()=>(await prices()).find(x=>x.itemId==='nuoc-mam'&&x.branchId==='woolworths:2216:rockdale');
{const row=await rock();assert.ok(row);assert.equal(row.status,'pending','one family → pending (hint only)');assert.equal(row.usable,false);assert.equal(row.families,1)}
// The product mapping now has two families (Henry's account + Alice's family) → confirmed.
{const r=await community(new Request(origin+'/.netlify/functions/community?op=products&retailer=woolworths&item=nuoc-mam',{headers:{'x-nf-client-connection-ip':'p-'+(ip++)}}));const d=await r.json();assert.equal(d.products.length,1,'mapping confirmed in the community product-link memory');assert.equal(d.products[0].productId,'123456');assert.equal(d.products[0].confirmations,2)}
// Bob captures the same product in semi-auto (no task): the confirmed mapping places it on nuoc-mam.
{const r=await dev('results',dB.token,{mode:'semi',items:[{retailer:'woolworths',url:PRODUCT,status:'ok',storeLabel:'Rockdale',facts:[fish(4.2)]}]});assert.equal(r.data.accepted,1);assert.equal(r.data.confirmed,1)}
{const row=await rock();assert.equal(row.status,'confirmed','second independent family confirms');assert.equal(row.families,2);assert.equal(row.usable,true);assert.deepEqual(row.sources,['scout'])}
// Repeating the same capture never inflates the family count.
{const r=await dev('results',dB.token,{mode:'semi',items:[{retailer:'woolworths',url:PRODUCT,status:'ok',storeLabel:'Rockdale',facts:[fish(4.2)]}]});assert.equal(r.data.duplicates,1)}
{const sh=await communityStore(getStoreFn).get('items/NSW/nuoc-mam',{type:'json'});const scoutRows=sh.submissions.filter((s:any)=>s.evidence?.type==='scout');assert.equal(scoutRows.length,3,'one row per device per fact per day');for(const s of scoutRows){assert.equal(s.source,'scout-extension');assert.equal(s.awarded,'scout','Scout rows never earn reward points');for(const k of ['deviceId','token','postcode','suburb'])assert.equal(k in s,false,'no device detail in the pool: '+k)}
 assert.equal(await communityStore(getStoreFn).get('points/alice',{type:'json'}),null,'no points ledger for Scout captures')}

// ---- disagreement → moderation hold queue (every undecided Scout row for that fact)
{const r=await dev('results',dC.token,{mode:'semi',items:[{retailer:'woolworths',url:PRODUCT,status:'ok',storeLabel:'Rockdale',facts:[fish(5.9)]}]});assert.equal(r.data.held,1)}
assert.equal(await rock(),undefined,'a disputed Scout price is not shown');
{const m=(await studioGet('community',henry.cookie)).data,held=m.queue.filter((q:any)=>q.kind==='held'&&q.evidence?.type==='scout');assert.equal(held.length,3,'held Scout rows reach Studio community moderation');assert.ok(held.every((q:any)=>q.holdReason==='cross-device-disagreement'));assert.ok(held.some((q:any)=>q.price===5.9));
 const a=held.find((q:any)=>q.contributor.account==='alice');
 const ok=await studioPost('community-action',{action:'approve',state:'NSW',itemId:'nuoc-mam',id:a.id,reason:'checked on the shelf'},henry.cookie,csrf);assert.equal(ok.status,200,JSON.stringify(ok.data));
 const b=held.find((q:any)=>q.contributor.account==='bob');assert.equal((await studioPost('community-action',{action:'approve',state:'NSW',itemId:'nuoc-mam',id:b.id,reason:'checked on the shelf'},henry.cookie,csrf)).status,200)}
{const row=await rock();assert.ok(row,'moderator approval brings it back');assert.equal(row.status,'confirmed');assert.equal(row.price,4.2)}
// A re-capture never overrides the moderator's decision.
{clock+=60000;const r=await dev('results',dA.token,{mode:'semi',items:[{retailer:'woolworths',url:PRODUCT,status:'ok',storeLabel:'Rockdale',facts:[fish(4.25)]}]});assert.equal(r.status,200);const sh=await communityStore(getStoreFn).get('items/NSW/nuoc-mam',{type:'json'});const s=sh.submissions.find((x:any)=>x.account==='alice'&&x.evidence?.type==='scout');assert.equal(s.status,'accepted');assert.equal(s.approved,true)}

// ---- freshness feeds the planner
{const ad=createDefaultAdapter(getStoreFn,{env,nowFn:()=>clock});const seen=await ad.lastSeen();assert.equal(seen['nuoc-mam|woolworths'],'2026-11-04');const maps=await ad.productMappings();assert.equal(maps[0].itemId,'nuoc-mam');assert.equal(maps[0].productUrl,PRODUCT)}

// ---- v1.7.2 placement without questions: confident name matches only; passive reasons; attach; Studio list; page samples
{const {matchProduct,productIsItem}=await import('../netlify/lib/scout-match.mjs');
 assert.equal(matchProduct('Woolworths Fresh Tasmanian Atlantic Skin On Salmon Fillets').itemId,'ca-hoi');assert.equal(matchProduct('Salmon Fillets 2 Pack 240g').itemId,'ca-hoi');
 for(const n of ['Tassal Smoked Salmon Slices 100g','Whiskas Salmon Cat Food 85g','John West Pink Salmon 105g','Salmon Flavoured Rice Crackers'])assert.equal(matchProduct(n).itemId,null,n+' is not plain Cá hồi');
 assert.equal(productIsItem('Atlantic Salmon Portions 2pk','ca-hoi'),true);assert.equal(productIsItem('Smoked Salmon','ca-hoi'),false);assert.equal(productIsItem('Synthetic fish sauce 500mL','nuoc-mam'),true);assert.equal(productIsItem('Synthetic biscuit','nuoc-mam'),false)}
const SALMON='https://www.woolworths.com.au/shop/productdetails/95171/woolworths-fresh-tasmanian-atlantic-skin-on-salmon-fillets';
{const r=await dev('results',dB.token,{mode:'semi',items:[{retailer:'woolworths',url:SALMON,status:'ok',storeLabel:'Rockdale',facts:[{name:'Woolworths Fresh Tasmanian Atlantic Skin On Salmon Fillets 240g',price:11,productId:'95171',productUrl:SALMON,packQty:240,packUnit:'g'}]}]});
 assert.equal(r.data.accepted,1);assert.equal(r.data.placement.placed,1,'confident name match → placed silently');assert.ok((await prices()).some(x=>x.itemId==='ca-hoi'&&x.branchId==='woolworths:2216:rockdale'),'salmon price reaches families')}
{const r=await dev('results',dB.token,{mode:'semi',items:[{retailer:'woolworths',url:'https://www.woolworths.com.au/shop/productdetails/88001/smoked',status:'ok',storeLabel:'Rockdale',facts:[{name:'Tassal Smoked Salmon Slices 100g',price:6.5,productId:'88001'}]}]});
 assert.equal(r.data.placement.placed,0);assert.deepEqual(r.data.placement.unplaced,{'no-item':1},'smoked salmon stays “Chưa gắn món”');assert.equal(r.data.placement.facts[0].why,'no-item')}
{const r=await dev('results',dB.token,{mode:'semi',items:[{retailer:'woolworths',url:'https://www.woolworths.com.au/shop/productdetails/95172/salmon',status:'ok',storeLabel:'',facts:[{name:'Salmon Fillets 2 Pack',price:12,productId:'95172'}]}]});
 assert.deepEqual(r.data.placement.unplaced,{'no-store':1},'no store label on the page → passive reason')}
// Attach from the popup: a family vote for others, confirmed at once for a trusted price checker; the price is placed.
const MYST=(id:string)=>'https://www.woolworths.com.au/shop/productdetails/'+id+'/synthetic-mystery-sauce';
const mystery=(id:string,price:number)=>({retailer:'woolworths',url:MYST(id),status:'ok',storeLabel:'Rockdale',facts:[{name:'Synthetic mystery condiment '+id,price,productId:id,productUrl:MYST(id)}]});
{const before=await dev('results',dB.token,{mode:'semi',items:[mystery('777001',3)]});assert.deepEqual(before.data.placement.unplaced,{'no-item':1});
 const r=await dev('results',dB.token,{mode:'semi',attach:{itemId:'nuoc-mam'},items:[mystery('777001',3)]});assert.equal(r.status,200);assert.equal(r.data.placement.placed,1,'placed after the person links it');
 const doc=await communityStore(getStoreFn).get('products/woolworths/nuoc-mam',{type:'json'});assert.equal(doc.candidates.find((c:any)=>c.productId==='777001').status,'candidate','one family vote only')}
{const r=await dev('results',dH.token,{mode:'semi',attach:{itemId:'nuoc-mam'},items:[{...mystery('777002',3.1),storeLabel:'Hurstville'}]});assert.equal(r.data.placement.placed,1);
 const doc=await communityStore(getStoreFn).get('products/woolworths/nuoc-mam',{type:'json'});assert.equal(doc.candidates.find((c:any)=>c.productId==='777002').status,'confirmed','trusted price checker confirms the link at once')}
assert.equal((await dev('results',dB.token,{mode:'semi',attach:{itemId:'not-an-item'},items:[mystery('777009',3)]})).data.placement.unplaced['no-item'],1,'unknown item ids are ignored');
// Studio “Giá chưa gắn món”: list with suggestions, bulk attach / reject (audited).
await dev('results',dC.token,{mode:'semi',items:[mystery('777003',2.9)]});
{const l=(await S('studio-unplaced')).data.items;const smoked=l.find((x:any)=>x.productId==='88001'),m3=l.find((x:any)=>x.productId==='777003');assert.ok(smoked&&m3,'unplaced facts listed: '+l.map((x:any)=>x.productId).join(','));assert.equal(smoked.retailer,'woolworths');
 const a=await S('studio-unplaced-resolve',{keys:[m3.key],itemId:'nuoc-mam',action:'attach'});assert.equal(a.status,200,JSON.stringify(a.data));assert.equal(a.data.results[0].status,'placed');
 const rj=await S('studio-unplaced-resolve',{keys:[smoked.key],action:'reject',reason:'not plain salmon'});assert.equal(rj.data.results[0].status,'rejected');
 const l2=(await S('studio-unplaced')).data.items;assert.ok(!l2.some((x:any)=>x.productId==='88001'||x.productId==='777003'),'resolved facts leave the list');
 const doc=await communityStore(getStoreFn).get('products/woolworths/nuoc-mam',{type:'json'});assert.equal(doc.candidates.find((c:any)=>c.productId==='777003').status,'confirmed','moderator link confirmed');
 assert.equal((await S('studio-unplaced-resolve',{keys:['pool/../x'],itemId:'nuoc-mam'})).data.results[0].ok,false,'bad keys refused')}
// Page samples (“Gửi mẫu trang để sửa”): sanitised again on the server, Studio list, 30-day retention.
{const sample={v:1,url:'https://www.woolworths.com.au/shop/search/products?searchTerm=salmon',retailer:'woolworths',pageType:'search',title:'Hi jane.doe@example.com',cookie:'session=abc',jsonLdTypes:['Product'],selectors:{'wc-product-tile':0},prices:[{text:'$12.00',path:'div.price',heading:'Call 0412 345 678'}]};
 const r=await dev('diagnose',dA.token,sample);assert.equal(r.status,201,JSON.stringify(r.data));
 const l=(await S('studio-diagnostics')).data.samples;assert.equal(l.length,1);const txt=JSON.stringify(l[0]);assert.ok(!/@example\.com|0412 345 678|session=abc/.test(txt),'no email, phone or cookie stored: '+txt);assert.equal(l[0].retailer,'woolworths');assert.equal(l[0].payload.prices[0].text,'$12.00');
 assert.equal((await dev('diagnose',dA.token,{...sample,retailer:'evil'})).status,400,'only supported retailer pages');
 // (library call: a Studio session would have expired 31 days later)
 const {saveDiagnostic,listDiagnostics}=await import('../netlify/lib/scout.mjs');const later=clock+31*86400000;await saveDiagnostic(getStoreFn,{id:'dev-later',name:'Later PC',owner:'alice'},sample,later);const l2=await listDiagnostics(getStoreFn,{now:later});assert.equal(l2.length,1,'samples older than 30 days are removed');assert.equal(l2[0].deviceId,'dev-later')}
// ---- community pilot switched off → nothing written to the pool (kept in the Scout store)
{const r=await studioPost('settings-save',{patch:{flags:{communityPrices:false}}},henry.cookie,csrf);assert.equal(r.status,200);const before=JSON.stringify(await communityStore(getStoreFn).get('items/NSW/nuoc-mam',{type:'json'}));const x=await dev('results',dH.token,{mode:'semi',items:[{retailer:'woolworths',url:PRODUCT,status:'ok',storeLabel:'Hurstville',facts:[fish(4.6)]}]});assert.equal(x.status,200);assert.equal(JSON.stringify(await communityStore(getStoreFn).get('items/NSW/nuoc-mam',{type:'json'})),before,'pool untouched while community prices are off');await studioPost('settings-save',{patch:{flags:{communityPrices:true}}},henry.cookie,csrf)}

// ---- Scout network toggle writes the platform setting too; off → tasks refused again
{assert.equal((await S('studio-network',{patch:{autoScout:'off'}})).status,200);const s=(await studioGet('settings',henry.cookie)).data;assert.equal(s.values.flags.autoScout,false,'Scout page and Studio settings agree');const t=await dev('tasks',dA.token,{runId:'run-aaaaab',autoEnabled:true});assert.equal(t.data.code,'auto-off');assert.equal(t.data.tasks.length,0)}

// ---- my-revoke: own devices only
{assert.equal((await call('my-revoke',{method:'POST',body:{deviceId:dA.id},cookie:bob.cookie})).status,404,'cannot revoke another account’s computer');
 assert.equal((await call('my-revoke',{method:'POST',body:{deviceId:dA.id},cookie:alice.cookie,from:'https://evil.example'})).status,403,'same-origin');
 assert.equal((await call('my-revoke',{method:'POST',body:{deviceId:dA.id},cookie:alice.cookie})).status,200);assert.equal((await dev('device',dA.token)).status,401,'revoked token stops working');assert.equal((await call('my-devices',{cookie:alice.cookie})).data.devices.length,0)}

console.log('Scout ↔ community: placement, wanted list, trusted vs consensus, mapping confirmation, moderation hold, autoScout platform setting, my-revoke — all passed.');
