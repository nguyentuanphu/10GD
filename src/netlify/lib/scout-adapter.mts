// FamTray Scout ↔ community price pool adapter (v1.6: wired to community-prices.mts).
//
// The Scout network reads the community wanted list, confirmed product mappings, the
// pool's freshness and the master catalog, and writes its observations INTO the
// community pool (store `bep-community`, the same item shards as shelf-photo/receipt/
// screenshot prices) so Scout prices show in Price Scout and Studio moderation like any
// other community price, labelled "Scout" (evidence type 'scout', source 'scout-extension').
//
// Rules:
//  - One submission per device per Scout fact per day (deterministic id, upserted), so
//    repeated captures never inflate a group's family count.
//  - The family of the device owner is the consensus vote (one vote per family). Trusted
//    scouts (Studio trusted list / Studio owners) are confirmed at once (`scoutTrusted`);
//    everyone else needs the normal community consensus (≥2 independent families).
//  - Cross-device disagreement → the fact goes to the community moderation hold queue
//    (status 'held', holdReason 'cross-device-disagreement'); the other devices' rows for
//    the same fact are held too, so a disputed price never shows.
//  - Outliers (Price Scout sanity rule, 40%–250% of the confirmed median) are held.
//  - Scout rows never earn community reward points (awarded:'scout').
//  - Moderator decisions (approved / rejected / hidden) are never overwritten by a re-capture.
//  - Facts that cannot be placed in the pool (no catalogue item, no postcode on the device,
//    a state outside the pilot, community prices switched off, a store mismatch) are kept
//    in the Scout store (`pool/`, `pool-held/`) exactly as before, and are counted for
//    coverage/freshness, but are not shown to families.
// Every write is a conditional read-modify-write (mutateShard / mutateDoc / editRecord).
//
// Contract (all methods async; read methods never throw):
//   wantedItems(ctx?)        → [{itemId, name, families}]           (most-wanted first)
//   productMappings()        → [{itemId, retailer, productUrl, productId, packQty, confirmations, name?}]
//   lastSeen()               → {"<itemId>|<retailer>": "YYYY-MM-DD"} latest observation day
//   catalogItems()           → [{itemId, name}]
//   publishObservation(obs, {confirmed, agreeing})   write one fact to the pool
//   holdObservation(obs, reason)                     moderation hold queue
//   recordMappingCandidate({itemId, retailer, productUrl, productId, packQty, deviceId, account})
import {accountStore,editRecord} from './accounts.mjs';
import {createHash} from 'node:crypto';
import {communityStore,mutateShard,mutateDoc,groupIdOf,familyRefOf,productLinks,wantedFor,pilotConfig,cleanProductUrl,contributor,priceSanity,shardConsensus,basisKey,valueOf,RULES as COMMUNITY_RULES} from './community-prices.mjs';
import {postcodeToState} from './geo-resolver.mjs';
import {platformSettings} from './studio.mjs';
import masterCatalog from '../../data/master-catalog.json' with {type:'json'};
import {matchProduct} from './scout-match.mjs';
const REGION={consistency:'strong',region:'ap-southeast-2'} as const;
export const scoutStore=(getStoreFn:any)=>getStoreFn({name:'bep-scout',...REGION});
const h=(x:string)=>createHash('sha256').update(x).digest('hex').slice(0,20);
const DAY=86400000;
const sydneyDay=(ms:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
async function* keys(store:any,prefix:string){for await(const page of store.list({prefix,paginate:true}))for(const b of page.blobs)yield b.key as string}
async function readAll(store:any,prefix:string,max=2000){const out:any[]=[];for await(const k of keys(store,prefix)){if(out.length>=max)break;try{const v=await store.get(k,{type:'json'});if(v)out.push(v)}catch{}}return out}
async function readJSON(store:any,key:string){try{return await store.get(key,{type:'json'})}catch{return null}}

/** Master catalogue ids/names (data/master-catalog.json, bundled; no prices). English name
 *  first because it is used as the retailer search query. */
export const SCOUT_CATALOG:{itemId:string,name:string,nameVi:string}[]=((masterCatalog as any)?.items||[]).filter((x:any)=>x&&typeof x.id==='string').map((x:any)=>({itemId:x.id,name:String(x.nameEn||x.nameVi||x.id),nameVi:String(x.nameVi||x.nameEn||x.id)}));
const catalogName=new Map(SCOUT_CATALOG.map(c=>[c.itemId,c.name]));
const RETAILER_WORDS:any={woolworths:/^woolworths\b/i,coles:/^coles\b/i,aldi:/^aldi\b/i,chemist:/^chemist\s*warehouse\b/i,amazon:/^amazon(\s*au)?\b/i};
const slug=(x:string)=>x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30);
const text=(v:any,max:number)=>typeof v==='string'?v.replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
/** "Woolworths Hurstville" → "Hurstville" (the branch name without the retailer brand). */
export function branchName(retailer:string,storeLabel:any){const s=text(storeLabel,60).replace(RETAILER_WORDS[retailer]||/^$/,'').replace(/^[\s\-–·:]+/,'').trim();return s||null}
/** v1.7.2: why a fact has no branch — 'no-postcode' | 'outside-pilot' | 'no-store' (shown as passive status). */
export function placementGap(obs:any,states:string[]){const pc=postcodeToState(obs?.postcode);if(!pc.valid)return 'no-postcode';if(!states.includes(pc.state))return 'outside-pilot';return isOnline(obs)||branchName(obs.retailer,obs.storeLabel)?'no-branch':'no-store'}
/** v1.7.3: Amazon AU and Chemist Warehouse online prices are national — placed as an online price in the
 *  device's postcode state (same branch shape as the app's “Giá online”: retailer:online:STATE). */
export const ONLINE_PRICED=['chemist','amazon'];
export function isOnline(obs:any){return ONLINE_PRICED.includes(obs?.retailer)}
/** Where a Scout fact lives in the community pool, or null when it cannot be placed. */
export function scoutPlacement(obs:any,states:string[]){
 const pc=postcodeToState(obs?.postcode);if(!pc.valid||!states.includes(pc.state))return null;
 if(isOnline(obs))return{state:pc.state as string,branchId:obs.retailer+':online:'+pc.state,branchLabel:'online',online:true};
 const name=branchName(obs.retailer,obs.storeLabel);if(!name)return null;
 return{state:pc.state as string,branchId:obs.retailer+':'+pc.postcode+':'+slug(name),branchLabel:name+' '+pc.postcode}}

/** Builds the default adapter. opts.env / opts.nowFn are only used for the pilot settings
 *  read and the wanted-list week (tests pass their clock). */
export function createDefaultAdapter(getStoreFn:any,{env=process.env,nowFn=()=>Date.now()}:any={}){
 const store=()=>scoutStore(getStoreFn),pool=()=>communityStore(getStoreFn);
 let linkCache:{at:number,rows:any[]}|null=null;
 const links=async()=>{const now=Date.now();if(linkCache&&now-linkCache.at<60000)return linkCache.rows;let rows:any[]=[];try{rows=await productLinks(getStoreFn)}catch{}linkCache={at:now,rows};return rows};
 const pilot=async()=>{try{return pilotConfig((await platformSettings(getStoreFn,{env,now:nowFn()})).values)}catch{return{enabled:false,states:[] as string[]}}};
 // Device owner → family vote. Accounts without a family vote as themselves.
 const famCache=new Map<string,{at:number,ref:string}>();
 const familyOf=async(username:string)=>{const hit=famCache.get(username);if(hit&&Date.now()-hit.at<300000)return hit.ref;let id:any=null;try{const a=await accountStore(getStoreFn).get('users/'+username,{type:'json'});id=a?.lastHouseholdId||Object.keys(a?.households||{})[0]||null}catch{}const ref=familyRefOf(id||'account:'+username);famCache.set(username,{at:Date.now(),ref});return ref};
 const itemFor=async(obs:any)=>{if(obs.itemId&&/^[a-z0-9-]{1,60}$/.test(obs.itemId))return obs.itemId;if(!obs.productId)return null;// (confident name matches arrive as obs.itemId from ingestResults)
const m=(await links()).find((x:any)=>x.retailer===obs.retailer&&x.productId===obs.productId);return m?.itemId||null};
 // Legacy/fallback writes inside the Scout store (unplaceable facts).
 const fallbackPublish=async(obs:any,confirmed:boolean,agreeing:number,reason:string)=>{const k='pool/'+obs.observedAt.slice(0,10)+'/'+obs.retailer+'/'+h(obs.key);await editRecord(store(),k,(cur:any)=>({...(cur||{}),...obs,status:confirmed?'confirmed':'pending',agreeing,notInCommunity:reason,updatedAt:new Date().toISOString()}))};
 const fallbackHold=async(obs:any,reason:string,why:string)=>{const k='pool-held/'+obs.observedAt.slice(0,10)+'/'+obs.retailer+'/'+h(obs.key);await store().setJSON(k,{...obs,reason,notInCommunity:why,heldAt:new Date().toISOString()})};
 /** Upsert this device's row for the fact in the item shard. Returns {placed, status} or {placed:false, why}. */
 async function writePool(obs:any,{held=false,holdReason=null as string|null,scoutTrusted=false}:any){
  const p=await pilot();if(!p.enabled)return{placed:false,why:'community-off'};
  if(obs.storeMismatch)return{placed:false,why:'store-mismatch'};
  const itemId=await itemFor(obs);if(!itemId)return{placed:false,why:'no-item'};
  const place=scoutPlacement(obs,p.states);if(!place)return{placed:false,why:placementGap(obs,p.states)};
  const cp=pool(),who=await contributor(cp,obs.account),familyRef=await familyOf(obs.account),captured=Date.parse(obs.observedAt),day=sydneyDay(captured);
  const id='cs-'+h([obs.key,obs.deviceId,day].join('|'));
  const base:any={itemId,label:text(obs.label,120)||itemId,retailer:obs.retailer,price:obs.price,currency:'AUD',unitPrice:obs.unitBasis?obs.unitPrice??null:null,unitBasis:obs.unitPrice!=null?obs.unitBasis||null:null,packQty:obs.packQty??null,packUnit:obs.packQty?obs.packUnit||null:null,units:obs.packCount??null,promo:obs.promo||null,validUntil:obs.promo&&obs.validUntil?obs.validUntil:null,capturedAt:new Date(captured).toISOString(),observedAt:day,state:place.state,branchId:place.branchId,branchLabel:place.branchLabel,online:(place as any).online===true};
  base.groupId=groupIdOf(base);
  let status='';
  await mutateShard(cp,place.state,itemId,(sh:any)=>{
   const subs=sh.submissions||(sh.submissions=[]);let s=subs.find((x:any)=>x.id===id);
   const decided=!!s&&(s.approved===true||['rejected','hidden'].includes(s.status));
   // Outlier check against the confirmed prices for this item+state on the same basis.
   let sanityHold:string|null=null;if(!held){const vals=shardConsensus({submissions:subs.filter((x:any)=>x.id!==id),hiddenGroups:sh.hiddenGroups||[]},sydneyDay(nowFn())).filter((c:any)=>c.status==='confirmed'&&basisKey(c)===basisKey(base)).map(valueOf);const chk=priceSanity(valueOf(base),vals);if(!chk.ok)sanityHold=chk.reason}
   const next=held?'held':sanityHold?'held':'accepted',reason=held?holdReason:sanityHold;
   if(s){Object.assign(s,base,{scoutTrusted:scoutTrusted===true,submittedAt:new Date(nowFn()).toISOString()});if(!decided){s.status=next;s.holdReason=next==='held'?reason:null}}
   else{s={id,...base,account:obs.account,familyRef,ipHash:null,submittedAt:new Date(nowFn()).toISOString(),status:next,holdReason:next==='held'?reason:null,flags:[],approved:false,counted:who?.banned!==true&&(who?.trust??COMMUNITY_RULES.trustStart)>=COMMUNITY_RULES.trustCountMin,shadow:who?.banned===true,trustAtSubmit:who?.trust??COMMUNITY_RULES.trustStart,corroborated:false,contradicted:false,photo:false,belowCompetitors:null,
    evidence:{type:'scout',imageHash:null,ocrPrice:null,ocrMatches:null,mode:obs.mode==='auto'?'auto':'semi'},source:'scout-extension',scoutKey:h(obs.key),scoutTrusted:scoutTrusted===true,awarded:'scout'};subs.push(s)}
   // A disagreement holds every undecided Scout row of the same fact (other devices too).
   if(held)for(const x of subs)if(x.scoutKey===h(obs.key)&&x.observedAt===day&&x.status==='accepted'&&x.approved!==true){x.status='held';x.holdReason=holdReason}
   const cutoff=sydneyDay(nowFn()-COMMUNITY_RULES.shardKeepDays*DAY);sh.submissions=subs.filter((x:any)=>x.observedAt>=cutoff||x.status==='held');
   status=s.status;return true});
  return{placed:true,status,itemId,state:place.state}}
 return{
  /** Community "Cần săn giá tuần này": per-item family counts summed over the pilot states. */
  async wantedItems({now=nowFn()}:any={}){try{const p=await pilot(),cp=pool(),sum=new Map<string,number>();for(const st of p.states){for(const [k,n] of Object.entries(await wantedFor(cp,st,now)))sum.set(k,(sum.get(k)||0)+(n as number))}
   return [...sum].map(([itemId,families])=>({itemId,name:catalogName.get(itemId)||itemId,families})).sort((a,b)=>b.families-a.families||a.itemId.localeCompare(b.itemId))}catch{return[]}},
  /** Confirmed rows of the community product-link memory ("Mở đúng sản phẩm"). */
  async productMappings(){try{return (await links()).filter((m:any)=>m.status==='confirmed'&&m.productUrl).map((m:any)=>({itemId:m.itemId,retailer:m.retailer,productUrl:m.productUrl,productId:m.productId,packQty:m.packQty??null,confirmations:m.confirmations,name:catalogName.get(m.itemId)||m.productName||null}))}catch{return[]}},
  /** Latest observation day per item|retailer: community pool (every evidence type) + unplaced Scout facts. */
  async lastSeen(){const out:any={};const note=(item:any,retailer:any,d:any)=>{if(!item||!retailer||!d)return;const k=item+'|'+retailer,v=String(d).slice(0,10);if(!out[k]||out[k]<v)out[k]=v};
   try{const cp=pool();for await(const k of keys(cp,'items/')){const sh=await readJSON(cp,k);for(const s of sh?.submissions||[])if(s.status==='accepted'&&!s.shadow)note(s.itemId,s.retailer,s.observedAt)}}catch{}
   try{for(const r of await readAll(store(),'pool/',5000))note(r.itemId,r.retailer,r.observedAt)}catch{}
   return out},
  /** v1.7.2 “Giá chưa gắn món”: unplaced Scout facts (no item) of the last days, newest first, with suggestions. */
  async listUnplaced({days=7,limit=300,now=nowFn()}:any={}){const out:any[]=[];for(let i=0;i<days&&out.length<limit;i++){const day=sydneyDay(now-i*DAY);for(const r of await readAll(store(),'pool/'+day+'/',2000)){if(out.length>=limit)break;if(r.notInCommunity!=='no-item'||r.resolved)continue;const m=matchProduct(r.label||'');out.push({key:'pool/'+day+'/'+r.retailer+'/'+h(r.key),label:r.label,retailer:r.retailer,storeLabel:r.storeLabel,price:r.price,unitPrice:r.unitPrice??null,unitBasis:r.unitBasis||null,productId:r.productId||null,productUrl:r.productUrl||null,observedAt:r.observedAt,mode:r.mode,account:r.account,suggested:m.candidates.slice(0,3),confidence:m.confidence})}}return out},
  /** Attach (or reject) unplaced facts in bulk; attaching places the price and records a moderator-confirmed product link. */
  async resolveUnplaced(key:string,{itemId=null,reject=false,actor}:any){if(!/^pool\/\d{4}-\d{2}-\d{2}\/[a-z]+\/[a-f0-9]{20}$/.test(String(key)))return{ok:false,why:'bad-key'};const cur=await readJSON(store(),key);if(!cur||cur.resolved)return{ok:false,why:'gone'};
   if(reject){await store().setJSON(key,{...cur,resolved:'rejected',resolvedBy:actor,resolvedAt:new Date(nowFn()).toISOString()});return{ok:true,status:'rejected'}}
   if(!SCOUT_CATALOG.some(c=>c.itemId===itemId))return{ok:false,why:'bad-item'};
   const r=await writePool({...cur,itemId},{scoutTrusted:cur.status==='confirmed'&&cur.trusted===true});
   if(cur.productUrl||cur.productId)try{await this.recordMappingCandidate({itemId,retailer:cur.retailer,productUrl:cur.productUrl,productId:cur.productId,packQty:cur.packQty,deviceId:'studio',account:actor,trusted:true})}catch{}
   await store().setJSON(key,{...cur,itemId,resolved:r.placed?'placed':'attached',notInCommunity:r.placed?null:r.why,resolvedBy:actor,resolvedAt:new Date(nowFn()).toISOString()});return{ok:true,status:r.placed?'placed':'attached',why:r.placed?null:r.why}},
  async catalogItems(){return SCOUT_CATALOG.map(c=>({itemId:c.itemId,name:c.name}))},
  async publishObservation(obs:any,{confirmed,agreeing}:any){const scoutTrusted=confirmed===true&&obs.trusted===true;const r=await writePool(obs,{scoutTrusted});if(!r.placed)await fallbackPublish(obs,!!confirmed,agreeing,r.why);return r},
  async holdObservation(obs:any,reason:string){const r=await writePool(obs,{held:true,holdReason:reason});if(!r.placed)await fallbackHold(obs,reason,r.why);return r},
  /** Community product-link candidate (one vote per family; confirmed at 2 families or by a moderator). */
  async recordMappingCandidate(c:any){
   const clean=cleanProductUrl(c.retailer,c.productUrl);
   if(!clean||!/^[a-z0-9-]{1,60}$/.test(String(c.itemId||''))){const k='mappings/candidates/'+c.itemId+'/'+c.retailer+'-'+h(String(c.productId||c.productUrl));await editRecord(store(),k,(cur:any)=>{const by=new Set([...(cur?.by||[]),c.deviceId]);return{itemId:c.itemId,retailer:c.retailer,productUrl:c.productUrl,productId:c.productId||null,packQty:c.packQty||null,by:[...by].slice(-20),confirmations:by.size,lastAt:new Date().toISOString()}});return{status:'scout-only'}}
   const ref=(await familyOf(c.account)).slice(0,12),iso=new Date(nowFn()).toISOString();let out:any=null;
   await mutateDoc(pool(),`products/${c.retailer}/${c.itemId}`,()=>({version:1,itemId:c.itemId,retailer:c.retailer,candidates:[] as any[]}),(doc:any)=>{
    let x=doc.candidates.find((y:any)=>y.productId===clean.productId);
    if(!x){x={key:createHash('sha256').update(c.retailer+':'+clean.productId).digest('hex').slice(0,12),productUrl:clean.productUrl,productId:clean.productId,productName:null,packQty:typeof c.packQty==='number'&&c.packQty>0&&c.packQty<=100000?c.packQty:null,packUnit:null,firstSeen:iso,lastConfirmed:null,families:[],status:'candidate',source:'scout-extension'};doc.candidates.push(x);doc.candidates=doc.candidates.slice(-20)}
    if(x.status==='rejected'){out={status:'rejected'};return null}
    // v1.7.2: a trusted price checker / Studio moderator confirming a link on purpose counts at once.
    if(x.families.includes(ref)&&!(c.trusted===true&&x.status==='candidate')){out={status:x.status,confirmations:x.families.length};return null}
    if(!x.families.includes(ref))x.families.push(ref);if((x.families.length>=2||c.trusted===true)&&x.status!=='confirmed'&&x.status!=='stale'){x.status='confirmed';x.lastConfirmed=iso}
    out={status:x.status,confirmations:x.families.length};return true});
   linkCache=null;return out}
 };
}
