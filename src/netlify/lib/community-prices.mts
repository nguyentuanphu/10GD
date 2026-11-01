// Community Price Pilot ("Giá cộng đồng") — v1.5, Studio flag `communityPrices`
// (ON by default since the owner's 1 Nov 2026 decision; Studio or the
// STUDIO_FLAG_COMMUNITY_PRICES env var can still turn it off). Families share price
// FACTS — from a shelf-tag photo, a confirmed receipt line, or a retailer app/website
// screenshot or "Lưu giá" bookmark capture — with everyone in the same state.
// Everyone (including device-only users) can READ confirmed community and shop prices;
// contributing needs an eligible account. Screenshot/bookmark prices are "Giá online",
// need a matching OCR/extracted price and ALWAYS need ≥2 independent families to be
// confirmed. Manual entries stay family-only.
//
// What is shared: item, price, unit price, pack, retailer, a user-chosen branch
// label (suburb + postcode) or "online", state, promo, validUntil, capturedAt,
// evidence hash + OCR match. Never the contributor's identity, family, notes, the
// screenshot itself or any retailer image/description. A shelf photo is stored only
// when a submission is HELD for moderation, in a private area, and is deleted after
// moderation or 14 days.
//
// Rewards (points + badges + leaderboard, no money): points are awarded only when an
// independent family's matching report confirms a contribution, or a moderator approves
// a held item. See "rewards" below.
//
// Storage (store `bep-community`, strong consistency):
//   items/<STATE>/<itemId>            one shard per state+item: submissions + reports.
//                                     Read-modify-write with onlyIfMatch/onlyIfNew and
//                                     retries, so parallel contributions never lose writes.
//   dedupe/<sha256>                   evidence fingerprint, written with onlyIfNew (atomic
//                                     duplicate check: the second writer fails).
//   contributors/<username>           trust, ban, counters, terms acceptance, branch mix.
//   ip/<ipHash>                       accounts seen behind one (salted, hashed) address.
//   branches/<STATE>/<branchKey>      recent submissions per branch (burst detection).
//   rate/<YYYY-MM-DD>/<kind>-<hash>   daily counters; the day is in the key and old days
//                                     are deleted by pruneCommunity().
//   photos/<submissionId>             held-item photo (binary) + photo-meta/<id> expiry.
//   shops/applications/<username>     shop channel applications.
//   shop-prices/<username>            prices posted by an approved shop (14-day expiry).
//   points/<username>                 append-only points ledger for one account (entries are
//                                     never edited; revokes/adjustments are new entries).
//                                     Conditional read-modify-write like the item shards.
//   firsts/<STATE>/<suburbKey>        "first confirmed price in <suburb>" badge claim (onlyIfNew).
//   wanted/<STATE>/<weekStart>        aggregate "prices wanted this week": itemId → hashed
//                                     family refs; only counts are ever returned.
import {createHash,randomBytes} from 'node:crypto';
import {accountStore,editRecord,scopedStore} from './accounts.mjs';
import {postcodeToState} from './geo-resolver.mjs';
import {readObservations} from './grocery-pricing.mjs';

const DAY=86400000;
export const COMMUNITY_STORE='bep-community';
export const communityStore=(getStoreFn:any)=>getStoreFn({name:COMMUNITY_STORE,consistency:'strong',region:'ap-southeast-2'});
export const RULES={minAccountDays:7,minFamilyDays:7,accountDaily:30,ipDaily:60,reportDaily:20,captureMaxDays:7,confirmWindowDays:7,regularUsableDays:14,regularVisibleDays:21,shopDays:14,photoDays:14,sanityDays:35,shardKeepDays:40,trustStart:0.5,trustUp:0.05,trustDown:0.15,trustCountMin:0.3,trustReceipt:0.7,matchPct:0.02,matchAbs:0.05,ocrTolerance:0.01,burstNewAccountDays:14,burstCount:3,sharedIpAccounts:3,branchShare:0.8,branchMin:5,maxShopPrices:60} as const;
export const COMMUNITY_EVIDENCE=['shelf-photo','receipt','screenshot','bookmark'];
/** Evidence copied from a retailer app/website: labelled "Giá online", never confirmed by a single report. */
export const ONLINE_EVIDENCE=['screenshot','bookmark'];
export const REPORT_REASONS=['wrong-price','expired','wrong-item','wrong-store','offensive','other'];
const RETAILERS=['woolworths','coles','aldi','chemist','amazon','viet-grocer','other'];
const PROMOS=['half-price','special','special-buy','price-drop','multibuy','deal','clearance'];
const BASES=['per_kg','per_100g','per_L','per_100mL','per_each','per_wash','per_roll','per_sheet'];
export const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
const today=(now:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
const dayKey=(now:number)=>new Date(now).toISOString().slice(0,10);
const isDate=(s:any)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const daysBetween=(a:string,b:string)=>Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/DAY);
const round=(n:number,d=2)=>Math.round(n*10**d)/10**d;
const text=(v:any,max:number)=>typeof v==='string'?v.replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const num=(v:any,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=max?Math.round(v*10000)/10000:null;
const fail=(vi:string,en:string,status=400,extra:any={}):never=>{throw Object.assign(Error(vi),{status,en,...extra})};
export const ipHashOf=(request:Request,env:any=process.env)=>{const ip=request.headers.get('x-nf-client-connection-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';return sha('community-ip:'+(env.COMMUNITY_IP_SALT||'bep-community')+':'+ip).slice(0,32)};
export const familyRefOf=(familyId:string)=>sha('community-family:'+familyId).slice(0,20);
async function readJSON(store:any,key:string){try{return await store.get(key,{type:'json'})}catch{return null}}
async function* listKeys(store:any,prefix:string){for await(const page of store.list({prefix,paginate:true}))for(const b of page.blobs)yield b.key as string}
// Short-lived per-process cache for the public read and leaderboards (~60 s). Any mutation in
// this module clears it, so a writer always reads its own change; other instances refresh
// within a minute.
const memo=new Map<string,{at:number,value:any}>();
export const READ_CACHE_MS=60000;
export function clearCommunityCache(){memo.clear()}
async function cached(key:string,now:number,fn:()=>Promise<any>){const hit=memo.get(key);if(hit&&Math.abs(now-hit.at)<READ_CACHE_MS)return hit.value;const value=await fn();memo.set(key,{at:now,value});if(memo.size>200)memo.delete(memo.keys().next().value!);return value}

// ---------- settings ----------
/** Pilot status from Studio platform settings: flag communityPrices + supported states (NSW/QLD only). */
export function pilotConfig(values:any){const states=(Array.isArray(values?.priceScoutStates)?values.priceScoutStates:['NSW','QLD']).filter((s:string)=>['NSW','QLD'].includes(s));return{enabled:values?.flags?.communityPrices!==false&&states.length>0,states}}

// ---------- matching ----------
export const basisKey=(s:any)=>s.unitPrice!=null&&s.unitBasis?'u:'+s.unitBasis:'p:'+(s.packQty??'')+(s.packUnit||'')+':'+(s.units??'');
export const valueOf=(s:any)=>s.unitPrice!=null&&s.unitBasis?s.unitPrice:s.price;
/** Two reports match when on the same basis and within ±2% or ±$0.05 (whichever is wider). */
export function pricesMatch(a:any,b:any){if(basisKey(a)!==basisKey(b))return false;const x=valueOf(a),y=valueOf(b);return Math.abs(x-y)<=Math.max(RULES.matchAbs,RULES.matchPct*Math.max(x,y))+1e-9}
export function groupIdOf(s:any){const promoKey=s.promo?s.promo+':'+(s.validUntil||''):'regular';return sha([s.itemId,s.retailer,s.branchId,promoKey].join('|')).slice(0,16)}
const captured=(s:any)=>Date.parse(s.capturedAt);
const withinWindow=(a:any,b:any)=>Math.abs(captured(a)-captured(b))<=RULES.confirmWindowDays*DAY;
/** Expiry: specials until validUntil; regular prices count 14 days, shown greyed until 21, then hidden. */
export function expiryOf(s:any,day:string){const age=Math.max(0,daysBetween(day,s.observedAt));if(s.validUntil){const live=s.validUntil>=day;return{age,visible:live,usable:live,faded:false}}return{age,visible:age<=RULES.regularVisibleDays,usable:age<=RULES.regularUsableDays,faded:age>RULES.regularUsableDays}}
const isShown=(s:any)=>s.status==='accepted'&&!s.shadow;
const counts=(s:any)=>isShown(s)&&s.counted===true&&(!(s.flags||[]).length||s.approved===true);

/** Consensus for one group's submissions. CONFIRMED when ≥2 independent families report
 *  a matching price within 7 days (one vote per family), or one receipt from a contributor
 *  with trust ≥ 0.7. Otherwise PENDING (hint only). Held/rejected/hidden/shadowed never show. */
/** FamTray Scout (v1.6): a price read by a TRUSTED scout's extension (Studio trusted list)
 *  confirms its cluster like a trusted receipt. Only rows written by the Scout adapter carry it. */
export const scoutTrustedIn=(cluster:any[])=>cluster.some(x=>x.evidence?.type==='scout'&&x.scoutTrusted===true);
/** v1.7: when each price was captured (device/photo time, not the server write time):
 *  the latest capture in the cluster plus the latest per evidence type. */
export function capturedOf(cluster:any[]){const per:any={};let latest:string|null=null;for(const x of cluster){const t=x.capturedAt;if(typeof t!=='string'||!Number.isFinite(Date.parse(t)))continue;if(!latest||t>latest)latest=t;const k=x.evidence?.type||'other';if(!per[k]||t>per[k])per[k]=t}return{capturedAt:latest,sourceCaptured:per}}
export function groupConsensus(subs:any[],day:string){
 const shown=subs.filter(isShown).filter(s=>expiryOf(s,day).visible).sort((a,b)=>captured(b)-captured(a));
 if(!shown.length)return null;
 const countable=shown.filter(counts);let best:any=null;
 for(const anchor of countable){
  const cluster=countable.filter(x=>pricesMatch(anchor,x)&&withinWindow(anchor,x));
  const families=new Set(cluster.map(x=>x.familyRef)).size;
  // The single trusted-receipt shortcut never applies when the cluster holds app/website prices.
  const receipt=!cluster.some(x=>ONLINE_EVIDENCE.includes(x.evidence?.type))&&cluster.some(x=>x.evidence?.type==='receipt'&&(x.trustAtSubmit??0)>=RULES.trustReceipt)||scoutTrustedIn(cluster);
  const score=(families>=2||receipt?1000:0)+families;
  if(!best||score>best.score)best={anchor,cluster,families,receipt,score};
 }
 const pick=best?.anchor||shown[0];
 const cluster=best?best.cluster:shown.filter(x=>pricesMatch(pick,x));
 const confirmed=!!best&&(best.families>=2||best.receipt);
 const lastObserved=cluster.map(x=>x.observedAt).sort().pop()||pick.observedAt,exp=expiryOf({...pick,observedAt:lastObserved},day);
 return{groupId:pick.groupId,itemId:pick.itemId,label:pick.label,retailer:pick.retailer,branchId:pick.branchId,branchLabel:pick.branchLabel,state:pick.state,status:confirmed?'confirmed':'pending',price:pick.price,unitPrice:pick.unitPrice,unitBasis:pick.unitBasis,packQty:pick.packQty,packUnit:pick.packUnit,units:pick.units,promo:pick.promo,validUntil:pick.validUntil,families:new Set(cluster.map(x=>x.familyRef)).size,reports:cluster.length,lastObserved,ageDays:exp.age,usable:confirmed&&exp.usable,faded:exp.faded,online:cluster.some(x=>x.online===true),sources:[...new Set(cluster.map(x=>x.evidence?.type))].filter(Boolean),...capturedOf(cluster)};
}
export function shardConsensus(shard:any,day:string){const byGroup=new Map<string,any[]>();for(const s of shard?.submissions||[]){const l=byGroup.get(s.groupId)||[];l.push(s);byGroup.set(s.groupId,l)}const out:any[]=[];for(const [gid,subs] of byGroup){if((shard.hiddenGroups||[]).includes(gid))continue;const c=groupConsensus(subs,day);if(c)out.push(c)}return out}

/** Outlier check (Price Scout priceSanity rule): 40%–250% of the 35-day median, needs ≥3 values. */
export function priceSanity(value:number,values:number[]){const v=values.filter(x=>x>0).sort((a,b)=>a-b);if(!(value>0)||v.length<3)return{ok:true,reason:'insufficient-history',count:v.length};const m=v.length>>1,median=v.length%2?v[m]:(v[m-1]+v[m])/2,ratio=round(value/median,3);return{ok:ratio>=0.4&&ratio<=2.5,reason:ratio<0.4?'too-low':ratio>2.5?'too-high':'within-range',median:round(median,4),ratio,count:v.length}}

// ---------- validation ----------
/** Validates a contribution. Only extracted facts are kept. Throws {status,en}. */
export function cleanContribution(o:any,branch:any,{now,states}:{now:number,states:string[]}){
 if(!o||typeof o!=='object')fail('Thiếu dữ liệu giá.','Missing price details.');
 const ev=o.evidence||{};
 if(!COMMUNITY_EVIDENCE.includes(ev.type))fail('Chỉ chia sẻ được giá từ ảnh kệ giá, hóa đơn, ảnh màn hình app/website hoặc nút “Lưu giá”. Giá nhập tay chỉ lưu trong gia đình.','Only shelf-tag photos, receipts, app/website screenshots or “Save price” captures can be shared. Hand-entered prices stay with your family.',422,{code:'family-only'});
 const itemId=typeof o.itemId==='string'&&/^[a-z0-9-]{1,60}$/.test(o.itemId)?o.itemId:fail('Chọn món trong danh mục trước khi chia sẻ.','Choose a catalogue item before sharing.');
 const retailer=RETAILERS.includes(o.retailer)?o.retailer:fail('Cửa hàng không hợp lệ.','Invalid store.');
 const price=num(o.price,10000)??fail('Giá không hợp lệ.','Invalid price.');
 if(o.currency!=='AUD')fail('Chỉ nhận giá AUD.','AUD prices only.');
 const online=ONLINE_EVIDENCE.includes(ev.type);
 // App/website prices are kept per retailer + state; a branch is optional for them.
 const wantsBranch=!online||!!(branch&&(branch.postcode||branch.suburb)&&branch.online!==true);
 const pc=wantsBranch?postcodeToState(branch?.postcode):{valid:true,state:o.state,postcode:null} as any,suburb=wantsBranch?text(branch?.suburb,40):'';
 if(wantsBranch&&(!pc.valid||!suburb))fail('Nhập khu (suburb) và postcode của cửa hàng.','Enter the store suburb and postcode.');
 if(!states.includes(pc.state))fail(online&&!wantsBranch?'Chọn bang đang thử nghiệm (NSW/QLD) cho giá online.':'Cửa hàng phải ở bang đang thử nghiệm (NSW/QLD).',online&&!wantsBranch?'Online prices need a pilot state (NSW/QLD).':'The store must be in a pilot state (NSW/QLD).');
 if(o.state&&o.state!==pc.state)fail('Postcode cửa hàng không thuộc bang của bạn.','The store postcode is not in your state.');
 const capturedAt=typeof o.capturedAt==='string'&&o.capturedAt.length<=40&&!Number.isNaN(Date.parse(o.capturedAt))?Date.parse(o.capturedAt):NaN;
 if(!Number.isFinite(capturedAt))fail('Thiếu thời điểm chụp.','Missing capture time.');
 if(capturedAt>now+5*60000)fail('Thời điểm chụp ở tương lai.','Capture time is in the future.',422,{code:'future'});
 if(capturedAt<now-RULES.captureMaxDays*DAY)fail('Chỉ chia sẻ giá chụp trong 7 ngày gần đây.','Only prices captured in the last 7 days can be shared.',422,{code:'too-old'});
 const unitBasis=BASES.includes(o.unitBasis)?o.unitBasis:null,unitPrice=unitBasis?num(o.unitPrice,100000):null;
 const promo=PROMOS.includes(o.promo)?o.promo:null,validUntil=promo&&isDate(o.validUntil)?o.validUntil:null;
 if(promo&&!validUntil)fail('Giá khuyến mãi cần ngày kết thúc.','A deal needs an end date.');
 const imageHash=typeof ev.imageHash==='string'&&/^[a-f0-9]{64}$/.test(ev.imageHash)?ev.imageHash:null;
 const evidence:any={type:ev.type,imageHash,ocrPrice:null,ocrMatches:null};
 if(ev.type==='shelf-photo'||ev.type==='screenshot'||ev.type==='bookmark'){
  // Bookmark captures have no image; their "OCR" price is the price read from the page.
  if(ev.type!=='bookmark'&&!imageHash)fail('Thiếu dấu vân ảnh.','Missing image fingerprint.');
  const ocr=num(ev.ocrPrice,10000);evidence.ocrPrice=ocr;evidence.ocrMatches=ocr!=null&&Math.abs(ocr-price)<=RULES.ocrTolerance+1e-9;
  if(!evidence.ocrMatches)fail('Giá đọc từ ảnh không khớp giá đã nhập nên không chia sẻ được. Giá vẫn lưu trong gia đình.','The price read from the photo does not match the price entered, so it cannot be shared. It is still saved for your family.',422,{code:'ocr-mismatch'});
  if(ev.type==='bookmark')evidence.imageHash=null;
 }else{
  evidence.receiptId=typeof ev.receiptId==='string'&&/^[\w:.-]{1,120}$/.test(ev.receiptId)?ev.receiptId:fail('Thiếu hóa đơn.','Missing receipt.');
  evidence.lineId=typeof ev.lineId==='string'&&/^[\w:.-]{1,120}$/.test(ev.lineId)?ev.lineId:fail('Thiếu dòng hóa đơn.','Missing receipt line.');
 }
 const branchId=wantsBranch?retailer+':'+pc.postcode+':'+slug(suburb):retailer+':online:'+pc.state;
 const label=text(o.label,120)||itemId;
 const observedAt=today(capturedAt);
 return{itemId,label,retailer,price,currency:'AUD',unitPrice,unitBasis,packQty:num(o.packQty,100000),packUnit:o.packQty?text(o.packUnit,12)||null:null,units:num(o.units,100000),promo,validUntil,capturedAt:new Date(capturedAt).toISOString(),observedAt,state:pc.state,branchId,branchLabel:wantsBranch?suburb+' '+pc.postcode:'online',online,evidence};
}
const slug=(x:string)=>x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30);

// ---------- eligibility ----------
/** Gates: account ≥7 days old; verified recovery email (emailVerifiedAt, if the account
 *  system ever sets it) OR member of a family older than 7 days; not disabled. */
export function eligibility(account:any,household:any,now:number){
 const reasons:string[]=[];const age=(iso:any)=>{const t=Date.parse(iso||'');return Number.isFinite(t)?(now-t)/DAY:0};
 if(account?.disabled===true)reasons.push('disabled');
 if(age(account?.createdAt)<RULES.minAccountDays)reasons.push('account-too-new');
 const verified=!!account?.emailVerifiedAt&&!!account?.email;
 if(!verified&&!(household&&age(household.createdAt)>=RULES.minFamilyDays))reasons.push('family-too-new');
 if(!household)reasons.push('no-family');
 return{ok:!reasons.length,reasons,accountDays:Math.floor(age(account?.createdAt)),familyDays:household?Math.floor(age(household.createdAt)):null,verifiedEmail:verified};
}
async function bump(store:any,key:string,max:number,now:number,cost=1){let ok=true;await editRecord(store,key,(r:any)=>{const n=(r?.count||0)+cost;if(n>max){ok=false;return undefined}return{count:n,expires:new Date(now+2*DAY).toISOString()}});return ok}
export async function contributor(store:any,username:string){return await readJSON(store,'contributors/'+username)||null}
const newContributor=(username:string,now:number)=>({account:username,trust:RULES.trustStart,banned:false,submissions:0,corroborated:0,contradicted:0,rejected:0,held:0,termsAcceptedAt:null,branches:{},flags:[],shards:[],createdAt:new Date(now).toISOString()});
async function editContributor(store:any,username:string,fn:(c:any)=>any,now:number){return editRecord(store,'contributors/'+username,(c:any)=>fn(c?{...c}:newContributor(username,now)))}
const clampTrust=(t:number)=>round(Math.min(1,Math.max(0,t)),3);
async function applyTrust(store:any,effects:Map<string,{delta:number,corroborated?:number,contradicted?:number,rejected?:number}>,now:number){for(const [account,e] of effects)await editContributor(store,account,c=>({...c,trust:clampTrust(c.trust+e.delta),corroborated:c.corroborated+(e.corroborated||0),contradicted:c.contradicted+(e.contradicted||0),rejected:c.rejected+(e.rejected||0)}),now)}

// ---------- shard mutation ----------
const shardKey=(state:string,itemId:string)=>`items/${state}/${itemId}`;
/** Conditional read-modify-write of one item shard (onlyIfMatch / onlyIfNew) with jittered retries. */
export async function mutateShard(store:any,state:string,itemId:string,fn:(shard:any)=>any,attempts=12){
 return mutateDoc(store,shardKey(state,itemId),()=>({version:1,state,itemId,submissions:[],reports:[],hiddenGroups:[]}),fn,attempts);
}
/** Generic conditional read-modify-write (onlyIfMatch / onlyIfNew) with jittered retries.
 *  fn mutates the clone and returns a result; returning null leaves the record untouched. */
export async function mutateDoc(store:any,key:string,init:()=>any,fn:(doc:any)=>any,attempts=12):Promise<{shard:any,result:any}>{
 for(let i=0;i<attempts;i++){
  const row=await store.getWithMetadata(key,{type:'json'}),base=row?.data||init();
  const shard=structuredClone(base),result=fn(shard);if(result===null)return{shard:base,result:null};
  const saved=await store.setJSON(key,{...shard,updatedAt:new Date().toISOString()},row?.etag?{onlyIfMatch:row.etag}:{onlyIfNew:true});
  if(saved?.modified!==false){memo.clear();return{shard,result}}
  await new Promise(r=>setTimeout(r,Math.floor(Math.random()*8*(i+1))));
 }
 return fail('Đang bận, thử lại.','Busy, try again.',409);
}
const prune=(shard:any,now:number)=>{const cutoff=dayKey(now-RULES.shardKeepDays*DAY);shard.submissions=(shard.submissions||[]).filter((s:any)=>s.observedAt>=cutoff||s.status==='held');shard.reports=(shard.reports||[]).filter((r:any)=>r.status==='open'||r.at>=cutoff)};

/** Values used for the outlier check: confirmed community prices for the item+state (35 days)
 *  plus the submitter's own family observations of the same item on the same basis. */
async function sanityValues(getStoreFn:any,shard:any,clean:any,householdId:string,members:any,now:number){
 const day=today(now),from=dayKey(now-RULES.sanityDays*DAY),key=basisKey(clean),vals:number[]=[];
 const byGroup=new Map<string,any[]>();for(const s of shard.submissions||[]){if(s.observedAt<from)continue;const l=byGroup.get(s.groupId)||[];l.push(s);byGroup.set(s.groupId,l)}
 for(const subs of byGroup.values()){const c=groupConsensus(subs,day);if(c?.status==='confirmed'&&basisKey(c)===key)vals.push(valueOf(c))}
 try{const fam=scopedStore(getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'}),householdId,members);const {rows}=await readObservations(fam);for(const o of rows)if(o?.itemId===clean.itemId&&isDate(o.observedAt)&&o.observedAt>=from&&basisKey(o)===key&&valueOf(o)>0)vals.push(valueOf(o))}catch{}
 return vals;
}
async function verifyReceipt(getStoreFn:any,householdId:string,members:any,clean:any){
 try{const fam=scopedStore(getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'}),householdId,members);const st=await fam.get('state',{type:'json'});const r=(st?.receipts||[]).find((x:any)=>x?.id===clean.evidence.receiptId);if(!r||(r.currency||'AUD')!=='AUD'||r.refund===true)return false;const line=(r.items||[]).find((l:any)=>String(l?.id)===clean.evidence.lineId);return!!line&&Math.abs(Math.abs(+line.total)-clean.price)<=RULES.ocrTolerance+1e-9&&r.date>=dayKey(Date.parse(clean.capturedAt)-RULES.captureMaxDays*DAY)&&r}catch{return false}
}

/** Contribute one observation. Returns {status:'accepted'|'held', id, photoRequested, ...}. */
export async function contribute(getStoreFn:any,{context,observation,branch,ipHash,now,states,rewards}:any){
 const cfg=rewardConfig(rewards);
 const store=communityStore(getStoreFn),account=context.account,username=account.username,household=context.household;
 const gate=eligibility(account,household,now);if(!gate.ok)fail('Tài khoản chưa đủ điều kiện chia sẻ giá cộng đồng.','This account is not yet eligible to share community prices.',403,{code:'not-eligible',reasons:gate.reasons});
 let who=await contributor(store,username);
 if(!who?.termsAcceptedAt)fail('Cần đồng ý điều khoản chia sẻ giá trước.','Please accept the sharing terms first.',428,{code:'terms'});
 const clean=cleanContribution(observation,branch,{now,states});
 // v1.7.1: the verified receipt (read from the family's own saved data, never from the client) carries a salted
 // hash of its printed transaction; a receipt saved twice by one family can never count twice.
 const receipt:any=clean.evidence.type==='receipt'?await verifyReceipt(getStoreFn,household.id,household.members,clean):null;
 if(clean.evidence.type==='receipt'&&!receipt)fail('Không tìm thấy dòng hóa đơn đã xác nhận khớp giá này.','No confirmed receipt line matches this price.',422,{code:'receipt-unconfirmed'});
 // Rate limits (per account 30/day, per IP hash 60/day). Keys expire by day.
 const d=dayKey(now);
 if(!await bump(store,`rate/${d}/acct-${sha(username).slice(0,24)}`,RULES.accountDaily,now))fail('Bạn đã chia sẻ đủ 30 giá hôm nay.','You have shared 30 prices today, the daily limit.',429);
 if(!await bump(store,`rate/${d}/ip-${ipHash}`,RULES.ipDaily,now))fail('Quá nhiều lượt chia sẻ từ mạng này hôm nay.','Too many shares from this network today.',429);
 // Duplicate evidence → rejected. onlyIfNew makes the check atomic under concurrency.
 const id='cp-'+now.toString(36)+'-'+randomBytes(5).toString('hex');
 // Bookmark captures carry no image, so the same family+item+store+price+day counts as one capture.
 const fingerprint=clean.evidence.imageHash?'img:'+clean.evidence.imageHash:clean.evidence.type==='bookmark'?['bm',household.id,clean.itemId,clean.retailer,clean.branchId,clean.price,clean.observedAt].join(':'):typeof receipt?.receiptKey==='string'&&/^[a-f0-9]{16,64}$/.test(receipt.receiptKey)?['rcptk',household.id,receipt.receiptKey,clean.itemId,clean.price].join(':'):'rcpt:'+household.id+':'+clean.evidence.receiptId+':'+clean.evidence.lineId;
 const dedupe=await store.setJSON('dedupe/'+sha(fingerprint),{id,at:new Date(now).toISOString()},{onlyIfNew:true});
 if(dedupe?.modified===false)fail('Ảnh/hóa đơn này đã được chia sẻ trước đó.','This photo or receipt line was already shared.',409,{code:'duplicate'});
 // Conflict-of-interest signals (flag for moderation; never auto-ban).
 const flags:string[]=[];const accountNew=(now-Date.parse(account.createdAt||''))/DAY<RULES.burstNewAccountDays;
 const ipRec=await editRecord(store,'ip/'+ipHash,(r:any)=>({accounts:{...(r?.accounts||{}),[username]:new Date(now).toISOString()}}));
 if(Object.keys(ipRec?.accounts||{}).length>=RULES.sharedIpAccounts)flags.push('shared-ip');
 const branchRec=await editRecord(store,`branches/${clean.state}/${sha(clean.branchId).slice(0,24)}`,(r:any)=>({branchId:clean.branchId,recent:[...(r?.recent||[]).filter((x:any)=>now-Date.parse(x.at)<7*DAY),{account:username,at:new Date(now).toISOString(),accountNew}].slice(-200)}));
 const burst=new Set((branchRec?.recent||[]).filter((x:any)=>x.accountNew&&now-Date.parse(x.at)<DAY).map((x:any)=>x.account));
 if(accountNew&&burst.size>=RULES.burstCount)flags.push('new-account-burst');
 who=await contributor(store,username)||newContributor(username,now);
 const trust=who.trust??RULES.trustStart,banned=who.banned===true,familyRef=familyRefOf(household.id);
 const record:any={id,...clean,groupId:groupIdOf(clean),account:username,familyRef,ipHash,submittedAt:new Date(now).toISOString(),status:'accepted',holdReason:null,flags,approved:false,counted:!banned&&trust>=RULES.trustCountMin,shadow:banned,trustAtSubmit:trust,corroborated:false,contradicted:false,photo:false,belowCompetitors:null};
 const sanity=await sanityValues(getStoreFn,await readJSON(store,shardKey(clean.state,clean.itemId))||{submissions:[]},clean,household.id,household.members,now);
 const check=priceSanity(valueOf(clean),sanity);if(!check.ok){record.status='held';record.holdReason=check.reason}
 const effects=new Map<string,any>();let awards:any[]=[],penalties:any[]=[];
 const wantedCounts=await wantedFor(store,clean.state,now);
 let shard:any;
 try{({shard}=await mutateShard(store,clean.state,clean.itemId,sh=>{
  effects.clear();awards=[];penalties=[];prune(sh,now);
  // A "gap" = no usable confirmed price for this item in the state before this report.
  const gapBefore=!shardConsensus(sh,today(now)).some(c=>c.status==='confirmed'&&c.usable);
  // competitor comparison for the single-branch signal
  const others=shardConsensus(sh,today(now)).filter(c=>c.branchId!==record.branchId&&basisKey(c)===basisKey(record)).map(valueOf).sort((a,b)=>a-b);
  record.belowCompetitors=others.length?valueOf(record)<others[others.length>>1]:null;
  // Retroactively flag the burst's other reports for this branch (same item shard).
  if(flags.includes('new-account-burst'))for(const s of sh.submissions)if(s.branchId===record.branchId&&burst.has(s.account)&&now-Date.parse(s.submittedAt)<DAY&&!s.approved)s.flags=[...new Set([...(s.flags||[]),'new-account-burst'])];
  if(isShown(record)){
   // Trust moves at most once per contributor per price group, so repeating a report earns nothing.
   const group=sh.submissions.filter((x:any)=>x.groupId===record.groupId);
   const credited=new Set(group.filter((x:any)=>x.corroborated).map((x:any)=>x.account)),debited=new Set(group.filter((x:any)=>x.contradicted).map((x:any)=>x.account));
   for(const s of group){if(s.familyRef===familyRef||!isShown(s)||!withinWindow(s,record)||s.corroborated||!pricesMatch(s,record))continue;
    s.corroborated=true;if(credited.has(s.account))continue;credited.add(s.account);const e=effects.get(s.account)||{delta:0};e.delta+=RULES.trustUp;e.corroborated=(e.corroborated||0)+1;effects.set(s.account,e)}
   for(const s of group){if(!isShown(s)||s.contradicted||s.corroborated)continue;
    const against=new Set([...group,record].filter(x=>x.id!==s.id&&x.familyRef!==s.familyRef&&isShown(x)&&withinWindow(s,x)&&!pricesMatch(s,x)).map(x=>x.familyRef));
    if(against.size<2)continue;s.contradicted=true;penalties.push({account:s.account,key:'penalty:'+s.id,reason:'contradicted',sub:s});if(debited.has(s.account))continue;debited.add(s.account);const e=effects.get(s.account)||{delta:0};e.delta-=RULES.trustDown;e.contradicted=(e.contradicted||0)+1;effects.set(s.account,e)}
  }
  sh.submissions.push(record);
  awards=awardPass(sh,record.groupId,{gap:gapBefore&&(wantedCounts[record.itemId]||0)>=cfg.gapFamilies});
  return true;
 }))}catch(error){try{await store.delete('dedupe/'+sha(fingerprint))}catch{}throw error}
 await applyTrust(store,effects,now);
 await applyAwards(store,awards,penalties,cfg,now);
 const updated=await editContributor(store,username,c=>{const b={...(c.branches||{})},cur=b[record.branchId]||{n:0,compared:0,below:0};cur.n++;if(record.belowCompetitors!=null){cur.compared++;if(record.belowCompetitors)cur.below++}b[record.branchId]=cur;const total=c.submissions+1;const top:any=Object.values(b).sort((x:any,y:any)=>y.n-x.n)[0];const f=new Set(c.flags||[]);for(const x of flags)f.add(x);if(total>=RULES.branchMin&&top.n/total>=RULES.branchShare&&top.compared>=3&&top.below/top.compared>=0.8)f.add('single-branch-low');return{...c,submissions:total,held:c.held+(record.status==='held'?1:0),branches:b,flags:[...f],shards:[...new Set([...(c.shards||[]),shardKey(record.state,record.itemId)])].slice(-300),lastSubmissionAt:new Date(now).toISOString()}},now);
 if((updated?.flags||[]).includes('single-branch-low')&&!record.flags.includes('single-branch-low')){record.flags.push('single-branch-low');await mutateShard(store,record.state,record.itemId,sh=>{const s=sh.submissions.find((x:any)=>x.id===record.id);if(!s)return null;s.flags=[...new Set([...(s.flags||[]),'single-branch-low'])];return true})}
 const consensus=groupConsensus(shard.submissions.filter((s:any)=>s.groupId===record.groupId),today(now));
 // Banned contributors are shadow-limited: the response looks normal.
 return{id,status:record.status==='held'&&!banned?'held':'accepted',holdReason:banned?null:record.holdReason,photoRequested:record.status==='held'&&!banned&&record.evidence.type==='shelf-photo',group:banned?null:consensus&&{status:consensus.status,families:consensus.families},counted:banned?true:record.counted,flagged:flags.length>0};
}

/** Held-item photo for moderation: only for the contributor's own held shelf-photo submission,
 *  and only when the uploaded bytes hash to the stored evidence hash. Deleted after 14 days. */
export async function storeHeldPhoto(getStoreFn:any,{username,state,itemId,id,bytes,now}:any){
 const store=communityStore(getStoreFn),shard=await readJSON(store,shardKey(state,itemId)),s=shard?.submissions?.find((x:any)=>x.id===id);
 if(!s||s.account!==username||s.status!=='held'||s.evidence?.type!=='shelf-photo')fail('Không cần ảnh cho giá này.','No photo is needed for this price.',404);
 if(bytes.byteLength>5_500_000)fail('Ảnh tối đa 5,5 MB.','Photo must be under 5.5 MB.',413);
 if(sha256Bytes(bytes)!==s.evidence.imageHash)fail('Ảnh không khớp ảnh đã dùng để đọc giá.','The photo does not match the one used to read the price.',422);
 await store.set('photos/'+id,bytes);await store.setJSON('photo-meta/'+id,{id,state,itemId,expiresAt:new Date(now+RULES.photoDays*DAY).toISOString()});
 await mutateShard(store,state,itemId,sh=>{const x=sh.submissions.find((y:any)=>y.id===id);if(!x)return null;x.photo=true;return true});
 return{stored:true,expiresAt:new Date(now+RULES.photoDays*DAY).toISOString()};
}
export const sha256Bytes=(b:any)=>createHash('sha256').update(Buffer.from(b instanceof ArrayBuffer?new Uint8Array(b):b)).digest('hex');
async function deletePhoto(store:any,id:string){try{await store.delete('photos/'+id);await store.delete('photo-meta/'+id)}catch{}}

/** Public read: community prices for a state (anyone, flag on). No identity, no held items. */
export async function communityPrices(getStoreFn:any,{state,branches=null,now,cache=false}:any){
 if(cache)return cached('prices:'+state+':'+(branches||[]).join(','),now,()=>communityPrices(getStoreFn,{state,branches,now}));
 const store=communityStore(getStoreFn),day=today(now),items:any[]=[];
 for await(const k of listKeys(store,`items/${state}/`)){const shard=await readJSON(store,k);for(const c of shardConsensus(shard,day)){if(branches&&branches.length&&!branches.includes(c.branchId))continue;items.push(c)}}
 const shops=await shopPrices(getStoreFn,{state,now});
 items.sort((a,b)=>a.itemId.localeCompare(b.itemId)||a.retailer.localeCompare(b.retailer));
 return{state,today:day,items,shopPrices:shops};
}

// ---------- reports ----------
export async function report(getStoreFn:any,{context,body,now}:any){
 const store=communityStore(getStoreFn),username=context.account.username,familyRef=familyRefOf(context.household?.id||username);
 const reason=REPORT_REASONS.includes(body?.reason)?body.reason:fail('Chọn lý do.','Choose a reason.');const note=text(body?.note,300);
 if(!await bump(store,`rate/${dayKey(now)}/report-${sha(username).slice(0,24)}`,RULES.reportDaily,now))fail('Bạn đã báo nhiều lần hôm nay.','You have sent many reports today.',429);
 const entry={id:'rp-'+now.toString(36)+'-'+randomBytes(4).toString('hex'),reason,note,familyRef,account:username,at:new Date(now).toISOString(),status:'open'};
 if(body?.shop){const pid=typeof body.shop==='string'&&/^[a-f0-9]{16}$/.test(body.shop)?body.shop:fail('Tiệm không hợp lệ.','Invalid shop.');let shop='';for await(const k of listKeys(store,'shop-prices/')){const u=k.slice('shop-prices/'.length);if(shopPublicId(u)===pid){shop=u;break}}if(!shop)fail('Không tìm thấy giá.','Price not found.',404);let found=false;await editRecord(store,'shop-prices/'+shop,(r:any)=>{const p=r?.prices?.find((x:any)=>x.id===body.priceId);if(!p)return undefined;found=true;if((p.reports||[]).some((x:any)=>x.familyRef===familyRef&&x.status==='open'))return undefined;p.reports=[...(p.reports||[]),entry];return r});if(!found)fail('Không tìm thấy giá.','Price not found.',404);return{reported:true}}
 const state=['NSW','QLD'].includes(body?.state)?body.state:fail('Bang không hợp lệ.','Invalid state.');
 const itemId=typeof body?.itemId==='string'&&/^[a-z0-9-]{1,60}$/.test(body.itemId)?body.itemId:fail('Món không hợp lệ.','Invalid item.');
 const groupId=typeof body?.groupId==='string'&&/^[a-f0-9]{16}$/.test(body.groupId)?body.groupId:fail('Giá không hợp lệ.','Invalid price.');
 const {result}=await mutateShard(store,state,itemId,sh=>{if(!sh.submissions.some((s:any)=>s.groupId===groupId))return null;sh.reports=sh.reports||[];if(sh.reports.some((r:any)=>r.groupId===groupId&&r.familyRef===familyRef&&r.status==='open'))return 'already';sh.reports.push({...entry,groupId});return 'ok'});
 if(result===null)fail('Không tìm thấy giá.','Price not found.',404);
 return{reported:true,already:result==='already'};
}

// ---------- terms ----------
export const TERMS_VERSION='2026-11-01';// final wording, see dist/privacy.html#community (earlier acceptances: '2026-11-draft')
export async function acceptTerms(getStoreFn:any,username:string,now:number){const store=communityStore(getStoreFn);const c=await editContributor(store,username,x=>({...x,termsAcceptedAt:new Date(now).toISOString(),termsVersion:TERMS_VERSION,shareDefault:x.shareDefault??true}),now);return{termsAcceptedAt:c.termsAcceptedAt,termsVersion:c.termsVersion,shareDefault:c.shareDefault!==false}}
/** After the first consent the share box starts ticked for this account; the user can turn that off. */
export async function setShareDefault(getStoreFn:any,username:string,on:boolean,now:number){const c=await editContributor(communityStore(getStoreFn),username,x=>({...x,shareDefault:on===true}),now);return{shareDefault:c.shareDefault}}

// ---------- shop channel ("Giá do tiệm đăng") ----------
export async function shopApply(getStoreFn:any,{username,body,now}:any){
 const store=communityStore(getStoreFn),name=text(body?.shopName,80),abn=text(body?.abn,20),suburb=text(body?.suburb,40),pc=postcodeToState(body?.postcode);
 if(name.length<2||!suburb||!pc.valid)fail('Nhập tên tiệm, khu và postcode.','Enter the shop name, suburb and postcode.');
 if(abn&&!/^[\d ]{9,14}$/.test(abn))fail('ABN chỉ gồm số.','ABN should contain digits only.');
 if(!['NSW','QLD'].includes(pc.state))fail('Tiệm phải ở NSW hoặc QLD.','The shop must be in NSW or QLD.');
 const rec=await editRecord(store,'shops/applications/'+username,(r:any)=>{if(r?.status==='approved')return undefined;return{username,shopName:name,abn,suburb,postcode:pc.postcode,state:pc.state,status:'pending',appliedAt:new Date(now).toISOString()}});
 return{status:rec.status};
}
export async function shopStatus(getStoreFn:any,username:string){const r=await readJSON(communityStore(getStoreFn),'shops/applications/'+username);return r?{status:r.status,shopName:r.shopName,suburb:r.suburb,state:r.state}:null}
export async function shopPost(getStoreFn:any,{username,body,now}:any){
 const store=communityStore(getStoreFn),app=await readJSON(store,'shops/applications/'+username);
 if(app?.status!=='approved')fail('Chỉ tiệm đã được duyệt mới đăng giá.','Only approved shops can post prices.',403);
 const o=body?.price||{},itemId=typeof o.itemId==='string'&&/^[a-z0-9-]{1,60}$/.test(o.itemId)?o.itemId:fail('Chọn món.','Choose an item.');
 const price=num(o.price,10000)??fail('Giá không hợp lệ.','Invalid price.');const unitBasis=BASES.includes(o.unitBasis)?o.unitBasis:null;
 const promo=PROMOS.includes(o.promo)?o.promo:null,validUntil=isDate(o.validUntil)?o.validUntil:null;
 const entry={id:'sp-'+now.toString(36)+'-'+randomBytes(4).toString('hex'),itemId,label:text(o.label,120)||itemId,retailer:'viet-grocer',price,currency:'AUD',unitPrice:unitBasis?num(o.unitPrice,100000):null,unitBasis,packQty:num(o.packQty,100000),packUnit:text(o.packUnit,12)||null,units:num(o.units,100000),promo,validUntil,postedAt:new Date(now).toISOString(),observedAt:today(now),hidden:false,reports:[]};
 memo.clear();await editRecord(store,'shop-prices/'+username,(r:any)=>{const live=(r?.prices||[]).filter((p:any)=>now-Date.parse(p.postedAt)<RULES.shopDays*DAY&&!(p.itemId===itemId&&p.unitBasis===entry.unitBasis&&!p.hidden));if(live.length>=RULES.maxShopPrices)fail('Tiệm đã đăng tối đa 60 giá.','The shop already has 60 live prices.',429);return{shop:{username,name:app.shopName,suburb:app.suburb,postcode:app.postcode,state:app.state},prices:[...live,entry]}});
 memo.clear();return{posted:entry.id};
}
export async function shopPrices(getStoreFn:any,{state,now,includeHidden=false}:any){
 const store=communityStore(getStoreFn),out:any[]=[];
 for await(const k of listKeys(store,'shop-prices/')){const r=await readJSON(store,k);if(!r?.shop||state&&r.shop.state!==state)continue;const app=await readJSON(store,'shops/applications/'+r.shop.username);if(app?.status!=='approved'&&!includeHidden)continue;
  for(const p of r.prices||[]){const expires=Math.min(Date.parse(p.postedAt)+RULES.shopDays*DAY,p.validUntil?Date.parse(p.validUntil+'T23:59:59+10:00'):Infinity);if(!includeHidden&&(p.hidden||expires<now))continue;out.push({...p,reports:includeHidden?p.reports:undefined,openReports:(p.reports||[]).filter((x:any)=>x.status==='open').length,shop:includeHidden?r.shop:{id:shopPublicId(r.shop.username),name:r.shop.name,suburb:r.shop.suburb,state:r.shop.state},expiresAt:new Date(expires).toISOString(),channel:'shop'})}}
 return out;
}

// ---------- moderation (Studio) ----------
const publicSub=(s:any,c:any)=>({id:s.id,groupId:s.groupId,itemId:s.itemId,label:s.label,retailer:s.retailer,branchLabel:s.branchLabel,branchId:s.branchId,state:s.state,price:s.price,unitPrice:s.unitPrice,unitBasis:s.unitBasis,packQty:s.packQty,packUnit:s.packUnit,promo:s.promo,validUntil:s.validUntil,capturedAt:s.capturedAt,submittedAt:s.submittedAt,status:s.status,holdReason:s.holdReason,flags:s.flags||[],approved:s.approved,shadow:!!s.shadow,counted:s.counted,evidence:{type:s.evidence?.type,ocrPrice:s.evidence?.ocrPrice??null,ocrMatches:s.evidence?.ocrMatches??null,hash:s.evidence?.imageHash?String(s.evidence.imageHash).slice(0,12):null},photo:!!s.photo,contributor:{account:s.account,trust:c?.trust??null,banned:!!c?.banned,flags:c?.flags||[],submissions:c?.submissions||0}});
export async function moderationData(getStoreFn:any,now:number){
 const store=communityStore(getStoreFn),day=today(now),queue:any[]=[],stats:any={submissions:0,confirmed:0,pending:0,held:0,reportsOpen:0,contributors:0,banned:0,trust:{'<0.3':0,'0.3–0.7':0,'≥0.7':0},hidden:0,rejected:0};const contributors=new Map<string,any>();
 for await(const k of listKeys(store,'contributors/')){const c=await readJSON(store,k);if(!c)continue;contributors.set(c.account,c);if(!c.submissions)continue;stats.contributors++;if(c.banned)stats.banned++;stats.trust[c.trust<0.3?'<0.3':c.trust<0.7?'0.3–0.7':'≥0.7']++}
 for await(const k of listKeys(store,'items/')){const sh=await readJSON(store,k);if(!sh)continue;
  for(const s of sh.submissions||[]){stats.submissions++;if(s.status==='held')stats.held++;if(s.status==='hidden')stats.hidden++;if(s.status==='rejected')stats.rejected++;
   if(s.status==='held'||s.status==='accepted'&&(s.flags||[]).length&&!s.approved)queue.push({kind:s.status==='held'?'held':'flagged',state:sh.state,...publicSub(s,contributors.get(s.account))})}
  for(const c of shardConsensus(sh,day))stats[c.status]++;
  const open=(sh.reports||[]).filter((r:any)=>r.status==='open');stats.reportsOpen+=open.length;
  const byGroup=new Map<string,any[]>();for(const r of open){const l=byGroup.get(r.groupId)||[];l.push(r);byGroup.set(r.groupId,l)}
  for(const [gid,reps] of byGroup){const subs=(sh.submissions||[]).filter((s:any)=>s.groupId===gid);const c=groupConsensus(subs,day);queue.push({kind:'reported',state:sh.state,itemId:sh.itemId,groupId:gid,label:c?.label||subs[0]?.label,retailer:c?.retailer||subs[0]?.retailer,branchLabel:c?.branchLabel||subs[0]?.branchLabel,price:c?.price??subs[0]?.price,status:c?.status||'hidden',families:c?.families||0,hiddenGroup:(sh.hiddenGroups||[]).includes(gid),reports:reps.map(r=>({id:r.id,reason:r.reason,note:r.note,at:r.at})),submissions:subs.slice(-10).map((s:any)=>publicSub(s,contributors.get(s.account)))})}
 }
 const shops:any[]=[],apps:any[]=[];
 for await(const k of listKeys(store,'shops/applications/')){const a=await readJSON(store,k);if(a)apps.push(a)}
 for(const p of await shopPrices(getStoreFn,{now,includeHidden:true})){shops.push(p);const open=(p.reports||[]).filter((r:any)=>r.status==='open');stats.reportsOpen+=open.length;if(open.length)queue.push({kind:'shop-reported',state:p.shop.state,shop:p.shop.username,shopName:p.shop.name,priceId:p.id,itemId:p.itemId,label:p.label,price:p.price,hidden:p.hidden,reports:open.map((r:any)=>({id:r.id,reason:r.reason,note:r.note,at:r.at}))})}
 const coi=[...contributors.values()].filter(c=>(c.flags||[]).length).map(c=>({account:c.account,trust:c.trust,banned:!!c.banned,flags:c.flags,submissions:c.submissions}));
 queue.sort((a,b)=>String(b.submittedAt||b.reports?.[0]?.at||'').localeCompare(String(a.submittedAt||a.reports?.[0]?.at||'')));
 return{stats,queue,coi,applications:apps.sort((a,b)=>String(b.appliedAt).localeCompare(String(a.appliedAt))),shopPrices:shops,rules:RULES};
}
export async function moderationPhoto(getStoreFn:any,id:string){if(!/^cp-[a-z0-9]+-[a-f0-9]{10}$/.test(id))return null;try{return await communityStore(getStoreFn).get('photos/'+id,{type:'arrayBuffer'})}catch{return null}}

/** Moderator actions. Returns a summary for the audit log. */
export async function moderate(getStoreFn:any,{action,body,now,actor=null,rewards}:any){
 const cfg=rewardConfig(rewards);let awards:any[]=[],penalties:any[]=[];memo.clear();
 const store=communityStore(getStoreFn),state=['NSW','QLD'].includes(body?.state)?body.state:null,itemId=typeof body?.itemId==='string'&&/^[a-z0-9-]{1,60}$/.test(body.itemId)?body.itemId:null;
 const effects=new Map<string,any>();
 const onSub=async(fn:(s:any,sh:any)=>void)=>{if(!state||!itemId)fail('Thiếu bang/món.','Missing state/item.');const id=String(body.id||'');const {result}=await mutateShard(store,state,itemId,sh=>{const s=sh.submissions.find((x:any)=>x.id===id);if(!s)return null;effects.clear();fn(s,sh);return{account:s.account,photo:s.photo}});if(!result)fail('Không tìm thấy.','Not found.',404);return result};
 try{return await moderateAction()}finally{memo.clear()}
 async function moderateAction():Promise<any>{
 switch(action){
  case'approve':{const r=await onSub((s,sh)=>{const wasHeld=s.status==='held';s.status='accepted';s.approved=true;s.holdReason=null;s.photo=false;awards=[];
    // A moderator-approved held item earns the confirmed-price points; approval can also complete a consensus.
    if(wasHeld&&!s.awarded&&counts(s)){s.awarded='approved';awards.push({kind:'approved',sub:{...s}})}
    awards.push(...awardPass(sh,s.groupId,{gap:false}))});await deletePhoto(store,body.id);await applyAwards(store,awards,[],cfg,now);return{target:body.id,account:r.account}}
  case'reject':{const r=await onSub(s=>{const was=s.status;s.status='rejected';s.photo=false;penalties=[];if(was!=='rejected'){effects.set(s.account,{delta:-RULES.trustDown,rejected:1});penalties.push({account:s.account,key:'penalty:'+s.id,reason:'rejected',sub:{...s}})}});await applyTrust(store,effects,now);await applyAwards(store,[],penalties,cfg,now);await deletePhoto(store,body.id);return{target:body.id,account:r.account}}
  case'product-approve':case'product-reject':case'product-edit':return moderateProduct(store,action,body,actor,now);
  case'nickname-clear':{const account=accountArg(body);await mutateDoc(store,'points/'+account,()=>newLedger(account),doc=>{doc.nickname=null;doc.showNickname=false;return true});return{target:account,account}}
  case'points-adjust':{const account=accountArg(body);const pts=Number(body?.points);if(!Number.isInteger(pts)||pts===0||Math.abs(pts)>1000)fail('Số điểm phải là số nguyên khác 0 (tối đa ±1000).','Points must be a non-zero whole number (max ±1000).');
   const id='adj-'+now.toString(36)+'-'+randomBytes(4).toString('hex');await addEntry(store,account,{id,type:'adjust',points:pts,capped:false,reason:text(body?.reason,300),actor},cfg,now);return{target:account,account,entry:id,points:pts}}
  case'points-revoke':{const account=accountArg(body);const ref=String(body?.entryId||'');let reversed=0;
   const {result}=await mutateDoc(store,'points/'+account,()=>newLedger(account),doc=>{const e=doc.entries.find((x:any)=>x.id===ref);if(!e||e.type==='revoke'||doc.entries.some((x:any)=>x.type==='revoke'&&x.ref===ref))return null;reversed=-e.points;doc.entries.push({id:'rev-'+ref.slice(0,80),type:'revoke',ref,points:reversed,capped:false,state:e.state||doc.state||null,itemId:e.itemId||null,label:e.label||null,reason:text(body?.reason,300),actor,at:new Date(now).toISOString(),day:today(now)});return true});
   if(result===null)fail('Không tìm thấy mục điểm (hoặc đã thu hồi).','Points entry not found (or already revoked).',404);return{target:account,account,entry:ref,points:reversed}}
  case'hide':{if(body.groupId){if(!state||!itemId||!/^[a-f0-9]{16}$/.test(body.groupId))fail('Thiếu nhóm giá.','Missing price group.');await mutateShard(store,state,itemId,sh=>{sh.hiddenGroups=[...new Set([...(sh.hiddenGroups||[]),body.groupId])];for(const r of sh.reports||[])if(r.groupId===body.groupId&&r.status==='open')r.status='upheld';return true});return{target:body.groupId}}const r=await onSub(s=>{s.status='hidden';s.photo=false});await deletePhoto(store,body.id);return{target:body.id,account:r.account}}
  case'restore':{if(body.groupId){await mutateShard(store,state!,itemId!,sh=>{sh.hiddenGroups=(sh.hiddenGroups||[]).filter((g:string)=>g!==body.groupId);return true});return{target:body.groupId}}const r=await onSub(s=>{s.status='accepted'});return{target:body.id,account:r.account}}
  case'dismiss-reports':{if(!state||!itemId)fail('Thiếu bang/món.','Missing state/item.');await mutateShard(store,state,itemId,sh=>{for(const r of sh.reports||[])if(r.groupId===body.groupId&&r.status==='open')r.status='dismissed';return true});return{target:body.groupId}}
  case'ban':case'unban':{const account=accountArg(body);const ban=action==='ban';const c=await editContributor(store,account,x=>({...x,banned:ban,bannedAt:ban?new Date(now).toISOString():null}),now);
   for(const key of c.shards||[]){const [,st,item]=key.split('/');await mutateShard(store,st,item,sh=>{let changed=false;for(const s of sh.submissions)if(s.account===account){s.shadow=ban;s.counted=!ban&&(s.trustAtSubmit??0.5)>=RULES.trustCountMin;changed=true}return changed?true:null})}
   return{target:account,account}}
  case'shop-approve':case'shop-reject':case'shop-revoke':{const u=typeof body?.username==='string'&&/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(body.username)?body.username:fail('Tiệm không hợp lệ.','Invalid shop.');const status=action==='shop-approve'?'approved':action==='shop-reject'?'rejected':'revoked';const r=await editRecord(store,'shops/applications/'+u,(a:any)=>a?{...a,status,decidedAt:new Date(now).toISOString()}:undefined);if(!r)fail('Không tìm thấy đơn.','Application not found.',404);return{target:u}}
  case'shop-hide':case'shop-restore':case'shop-dismiss':{const u=String(body?.shop||'');let found=false;await editRecord(store,'shop-prices/'+u,(r:any)=>{const p=r?.prices?.find((x:any)=>x.id===body.priceId);if(!p)return undefined;found=true;if(action==='shop-hide'){p.hidden=true;for(const x of p.reports||[])if(x.status==='open')x.status='upheld'}else if(action==='shop-restore')p.hidden=false;else for(const x of p.reports||[])if(x.status==='open')x.status='dismissed';return r});if(!found)fail('Không tìm thấy.','Not found.',404);return{target:body.priceId,shop:u}}
 }
 return fail('Thao tác không hỗ trợ.','Unsupported action.',400);
 }
}
const accountArg=(body:any)=>typeof body?.account==='string'&&/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(body.account)?body.account:fail('Tài khoản không hợp lệ.','Invalid account.');
/** Deletes expired rate counters, moderation photos past 14 days and stale dedupe markers. */
export async function pruneCommunity(getStoreFn:any,now:number,budget=2000){
 const store=communityStore(getStoreFn),cutoff=dayKey(now-2*DAY);let removed=0;
 for await(const k of listKeys(store,'rate/')){if(removed>=budget)break;if(k.split('/')[1]<cutoff){await store.delete(k);removed++}}
 for await(const k of listKeys(store,'photo-meta/')){if(removed>=budget)break;const m=await readJSON(store,k);if(!m||Date.parse(m.expiresAt)<=now){const id=k.split('/')[1];await deletePhoto(store,id);removed++;if(m?.state&&m.itemId)try{await mutateShard(store,m.state,m.itemId,sh=>{const s=sh.submissions.find((x:any)=>x.id===id);if(!s)return null;s.photo=false;return true})}catch{}}}
 return removed;
}

// ---------- rewards: points + badges + leaderboard (no monetary value) ----------
// Points are earned ONLY through consensus or moderation:
//   • confirmed    — your report is matched by another, independent family (different familyRef,
//                    both counted: not low-trust, banned, held or flagged) → +confirmed
//                    (+specialBonus for a deal, +gapBonus when it fills a "wanted" gap ≥3 families needed)
//   • corroborated — you matched a price another family reported first → +corroborate
//   • approved     — a moderator approves your held item → +confirmed (+specialBonus)
//   • penalty      — a moderator rejects it, or ≥2 other families contradict it → −penalty
// One award per family per price cluster (members of your own family never earn you points),
// duplicate captures are refused at submission, positive points are capped per Sydney day.
// The award decision is taken inside the item-shard write (atomic); the ledger write is
// idempotent (entry id = award:<submissionId>), so retries never double-award.
// Points never change trust, and trust can never be bought with points.
export const REWARD_DEFAULTS={confirmed:10,specialBonus:5,corroborate:3,gapBonus:5,gapFamilies:3,penalty:20,dailyCap:100,levels:[100,500,1500]};
export const LEVELS=[{id:'shopper',vi:'Người đi chợ',en:'Shopper',icon:'🧺'},{id:'hunter',vi:'Thợ săn giá',en:'Price hunter',icon:'🔎'},{id:'expert',vi:'Chuyên gia giá',en:'Price expert',icon:'🎓'},{id:'ambassador',vi:'Đại sứ chợ Việt',en:'Viet market ambassador',icon:'🏮'}];
const intIn=(v:any,a:number,b:number,d:number)=>Number.isInteger(v)&&v>=a&&v<=b?v:d;
/** Reward settings from Studio (`rewards`), clamped; unknown keys fall back to defaults. */
export function rewardConfig(r:any){const d=REWARD_DEFAULTS,x=r||{};const lv=Array.isArray(x.levels)&&x.levels.length===3&&x.levels.every((n:any,i:number,a:any[])=>Number.isInteger(n)&&n>0&&(i===0||n>a[i-1]))?x.levels:d.levels;
 return{confirmed:intIn(x.confirmed,0,100,d.confirmed),specialBonus:intIn(x.specialBonus,0,100,d.specialBonus),corroborate:intIn(x.corroborate,0,100,d.corroborate),gapBonus:intIn(x.gapBonus,0,100,d.gapBonus),gapFamilies:intIn(x.gapFamilies,1,100,d.gapFamilies),penalty:intIn(x.penalty,0,500,d.penalty),dailyCap:intIn(x.dailyCap,0,10000,d.dailyCap),levels:lv}}
export function levelOf(points:number,cfg:any=REWARD_DEFAULTS){const mins=[0,...cfg.levels],p=Math.max(0,points);let i=0;while(i+1<mins.length&&p>=mins[i+1])i++;const next=i+1<mins.length?{...LEVELS[i+1],min:mins[i+1]}:null;
 return{level:{...LEVELS[i],min:mins[i]},next,toNext:next?next.min-p:0,progress:next?round((p-mins[i])/(next.min-mins[i]),3):1}}
export const weekStart=(day:string)=>{const t=Date.parse(day+'T00:00:00Z'),wd=(new Date(t).getUTCDay()+6)%7;return dayKey(t-wd*DAY)};
/** Stable anonymous label number for the leaderboard ("Ẩn danh #1234"); not reversible to the username. */
export const anonId=(username:string)=>'#'+(parseInt(sha('community-anon:'+username).slice(0,8),16)%9000+1000);
const newLedger=(username:string)=>({version:1,account:username,state:null,nickname:null,showNickname:false,entries:[] as any[]});
const AWARD_TYPES=['confirmed','corroborated','approved'];

/** Award decisions for one price group, inside the shard write. Marks submissions so each
 *  family is rewarded at most once per matching cluster. Returns [{kind,sub,gap}]. */
function awardPass(sh:any,groupId:string,{gap=false}:any={}){
 // Order = time submitted, then position in the shard (append order) for identical timestamps.
 const all=sh.submissions||[],pos=new Map(all.map((x:any,i:number)=>[x,i]));
 const subs=all.filter((s:any)=>s.groupId===groupId&&counts(s)).sort((a:any,b:any)=>String(a.submittedAt).localeCompare(String(b.submittedAt))||(pos.get(a) as number)-(pos.get(b) as number));
 const rank=new Map(subs.map((x:any,i:number)=>[x,i]));
 const out:any[]=[];
 for(const s of subs){if(s.awarded)continue;
  const cluster=subs.filter((x:any)=>pricesMatch(s,x)&&withinWindow(s,x));
  const others=cluster.filter((x:any)=>x.familyRef!==s.familyRef);if(!others.length)continue;
  if(cluster.some((x:any)=>x.familyRef===s.familyRef&&x.awarded))continue;
  const corroborating=others.some((x:any)=>(rank.get(x) as number)<(rank.get(s) as number));
  s.awarded=corroborating?'corroborated':'confirmed';out.push({kind:s.awarded,sub:{...s},gap:gap&&!corroborating});
 }
 return out;
}
async function applyAwards(store:any,awards:any[],penalties:any[],cfg:any,now:number){
 for(const a of awards){const s=a.sub,points=a.kind==='corroborated'?cfg.corroborate:cfg.confirmed+(s.promo?cfg.specialBonus:0)+(a.gap?cfg.gapBonus:0);let firstSuburb=null;
  if(a.kind!=='corroborated'&&!s.online&&s.branchId){const [,postcode,sub]=String(s.branchId).split(':');try{const r=await store.setJSON(`firsts/${s.state}/${postcode}-${sub}`,{at:new Date(now).toISOString(),submission:s.id},{onlyIfNew:true});if(r?.modified!==false)firstSuburb=String(s.branchLabel||'').replace(/\s+\d{4}$/,'')||null}catch{}}
  try{await addEntry(store,s.account,{id:'award:'+s.id,type:a.kind,points,capped:true,state:s.state,itemId:s.itemId,label:s.label,promo:s.promo||null,retailer:s.retailer,online:!!s.online,gap:!!a.gap,firstSuburb,ref:s.groupId},cfg,now)}catch(e){console.error('Points award failed',(e as any)?.name)}}
 for(const p of penalties){if(!cfg.penalty)continue;const s=p.sub;try{await addEntry(store,p.account,{id:p.key,type:'penalty',points:-cfg.penalty,capped:false,reason:p.reason,state:s.state,itemId:s.itemId,label:s.label,ref:s.groupId},cfg,now)}catch(e){console.error('Points penalty failed',(e as any)?.name)}}
}
/** Append one ledger entry (idempotent by id). Positive capped entries respect the daily cap. */
async function addEntry(store:any,account:string,entry:any,cfg:any,now:number){
 const day=today(now);
 return mutateDoc(store,'points/'+account,()=>newLedger(account),doc=>{
  if(doc.entries.some((e:any)=>e.id===entry.id))return null;
  let points=entry.points;
  if(entry.capped&&points>0){const used=doc.entries.filter((e:any)=>e.day===day&&e.capped&&e.points>0).reduce((n:number,e:any)=>n+e.points,0);points=Math.max(0,Math.min(points,cfg.dailyCap-used))}
  doc.entries.push({...entry,points,requested:entry.points,state:entry.state||doc.state||null,at:new Date(now).toISOString(),day});
  if(entry.state)doc.state=entry.state;return true});
}
/** v1.7.1 community recipes: a small fixed award for an APPROVED shared recipe (idempotent per recipe id,
 *  respects the daily cap). Pending/rejected recipes never earn points. */
export const RECIPE_AWARD_POINTS=5;
export async function awardRecipePoints(getStoreFn:any,{account,recipeId,label,now,rewards}:any){const cfg=rewardConfig(rewards);memo.clear();return addEntry(communityStore(getStoreFn),account,{id:'award:recipe:'+recipeId,type:'recipe',points:RECIPE_AWARD_POINTS,capped:true,label:text(label,80)||null,ref:recipeId},cfg,now)}
export function badgesOf(doc:any){
 const revoked=new Set((doc?.entries||[]).filter((e:any)=>e.type==='revoke').map((e:any)=>e.ref)),live=(doc?.entries||[]).filter((e:any)=>AWARD_TYPES.includes(e.type)&&!revoked.has(e.id)),out:any[]=[];
 if(live.filter((e:any)=>e.promo==='half-price').length>=3)out.push({id:'half-price',icon:'🏷️',vi:'Săn deal 1/2 giá',en:'Half-price hunter'});
 if(live.filter((e:any)=>e.retailer==='viet-grocer').length>=3)out.push({id:'viet-grocer',icon:'🏮',vi:'Chợ Việt',en:'Viet grocer regular'});
 for(const e of live)if(e.firstSuburb&&!out.some(b=>b.suburb===e.firstSuburb))out.push({id:'first-suburb',icon:'📍',suburb:e.firstSuburb,vi:'Người đầu tiên ở '+e.firstSuburb,en:'First in '+e.firstSuburb});
 return out;
}
const ownEntry=(e:any)=>({id:e.id,type:e.type,points:e.points,requested:e.requested,itemId:e.itemId||null,label:e.label||null,promo:e.promo||null,online:!!e.online,gap:!!e.gap,firstSuburb:e.firstSuburb||null,at:e.at,...(['adjust','revoke'].includes(e.type)?{reason:e.reason||null}:{})});
/** The account owner's own view: total, level/progress, badges, recent entries, profile. */
export function ledgerSummary(doc:any,cfg:any,now:number){const day=today(now),week=weekStart(day);let total=0,todayPts=0,weekPts=0;
 for(const e of doc?.entries||[]){total+=e.points;if(e.day===day&&e.capped&&e.points>0)todayPts+=e.points;if(e.day>=week)weekPts+=e.points}
 return{total,week:weekPts,today:todayPts,dailyCap:cfg.dailyCap,...levelOf(total,cfg),badges:badgesOf(doc),recent:(doc?.entries||[]).slice(-12).reverse().map(ownEntry),profile:{nickname:doc?.nickname||null,showNickname:!!doc?.showNickname,anonId:anonId(doc?.account||'')},rules:{confirmed:cfg.confirmed,specialBonus:cfg.specialBonus,corroborate:cfg.corroborate,gapBonus:cfg.gapBonus,penalty:cfg.penalty,dailyCap:cfg.dailyCap}}}
export async function rewardsFor(getStoreFn:any,{username,now,rewards}:any){const cfg=rewardConfig(rewards),doc=await readJSON(communityStore(getStoreFn),'points/'+username)||newLedger(username);return ledgerSummary(doc,cfg,now)}
/** Nickname shown on the leaderboard only when the user opts in. Never the username, an email or the family name. */
export function cleanNickname(v:any,{username='',familyName=''}:any={}){const n=text(v,24);if(!n)return null;const flat=(x:string)=>String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]/g,'');const low=flat(n),fam=flat(String(familyName).replace(/^nhà\s+/i,''));
 if(n.length<2||!/^[\p{L}\p{N} ._-]+$/u.test(n))fail('Biệt danh 2–24 ký tự, chỉ chữ, số và khoảng trắng.','Nicknames are 2–24 letters, numbers or spaces.',400,{code:'nickname'});
 if(username&&low.includes(flat(username))||fam.length>=3&&low.includes(fam)||/https?|www|@/.test(n.toLowerCase()))fail('Biệt danh không được là tên đăng nhập, email hay tên gia đình.','A nickname cannot be your username, an email or your family name.',400,{code:'nickname'});
 return n}
export async function setRewardsProfile(getStoreFn:any,{username,familyName,body}:any){const nickname=body?.nickname===undefined?undefined:cleanNickname(body.nickname,{username,familyName});const show=typeof body?.showNickname==='boolean'?body.showNickname:undefined;
 const {shard}=await mutateDoc(communityStore(getStoreFn),'points/'+username,()=>newLedger(username),doc=>{if(nickname!==undefined)doc.nickname=nickname;if(show!==undefined)doc.showNickname=show;if(!doc.nickname)doc.showNickname=false;return true});
 return{nickname:shard.nickname||null,showNickname:!!shard.showNickname,anonId:anonId(username)}}
/** Per-state leaderboard (weekly + all time), recomputed from the ledgers and cached ~60 s per
 *  process. Public rows carry only rank, points, level, badge count and either the opted-in
 *  nickname or the anonymous number. `me` marks the requester's own row. */
export async function leaderboard(getStoreFn:any,{state,now,rewards,me=null,admin=false,limit=20}:any){
 const cfg=rewardConfig(rewards),day=today(now),week=weekStart(day);
 const rows=await cached('lb:'+state+':'+week+':'+cfg.levels.join(','),now,async()=>{const store=communityStore(getStoreFn),out:any[]=[];
  for await(const k of listKeys(store,'points/')){const d=await readJSON(store,k);if(!d?.entries)continue;let all=0,wk=0;for(const e of d.entries){if((e.state||d.state)!==state)continue;all+=e.points;if(e.day>=week)wk+=e.points}
   const total=d.entries.reduce((n:number,e:any)=>n+e.points,0);out.push({account:d.account,name:d.showNickname&&d.nickname?d.nickname:null,anonId:anonId(d.account),allTime:all,weekly:wk,level:levelOf(total,cfg).level.id,badges:badgesOf(d).length})}
  return out});
 const board=(key:'weekly'|'allTime')=>{const sorted=rows.filter((r:any)=>r[key]>0).sort((a:any,b:any)=>b[key]-a[key]||a.anonId.localeCompare(b.anonId));const pub=(r:any,i:number)=>({rank:i+1,name:r.name,anonId:r.anonId,points:r[key],level:r.level,badges:r.badges,...(me&&r.account===me?{me:true}:{}),...(admin?{account:r.account}:{})});
  const mine=me?sorted.findIndex((r:any)=>r.account===me):-1;return{rows:sorted.slice(0,limit).map(pub),...(mine>=limit?{mine:pub(sorted[mine],mine)}:{})}};
 return{state,weekStart:week,weekly:board('weekly'),allTime:board('allTime'),levels:LEVELS.map((l,i)=>({...l,min:[0,...cfg.levels][i]}))};
}
export async function rewardsAdmin(getStoreFn:any,{now,rewards}:any){const cfg=rewardConfig(rewards),store=communityStore(getStoreFn),rows:any[]=[];
 for await(const k of listKeys(store,'points/')){const d=await readJSON(store,k);if(!d?.entries)continue;const c=await contributor(store,d.account),sum=ledgerSummary(d,cfg,now);rows.push({account:d.account,state:d.state,total:sum.total,week:sum.week,today:sum.today,level:sum.level.id,badges:sum.badges.map((b:any)=>b.icon+' '+b.en),entries:d.entries.length,nickname:d.nickname||null,showNickname:!!d.showNickname,anonId:anonId(d.account),trust:c?.trust??null})}
 rows.sort((a,b)=>b.total-a.total||a.account.localeCompare(b.account));const boards:any={};for(const st of ['NSW','QLD'])boards[st]=await leaderboard(getStoreFn,{state:st,now,rewards:cfg,admin:true});
 return{contributors:rows,leaderboards:boards,config:cfg,defaults:REWARD_DEFAULTS,levels:LEVELS}}
export async function rewardsLedger(getStoreFn:any,account:string){const d=await readJSON(communityStore(getStoreFn),'points/'+account);return{account,entries:(d?.entries||[]).slice().reverse(),nickname:d?.nickname||null,showNickname:!!d?.showNickname,anonId:anonId(account)}}

// ---------- "Cần săn giá tuần này" (prices wanted this week) ----------
// Families' own shopping-list item ids, aggregated per state and week. Stored as hashed family
// refs so one family counts once; only per-item COUNTS ever leave the server.
const wantedKey=(state:string,now:number)=>`wanted/${state}/${weekStart(today(now))}`;
export async function wantedFor(store:any,state:string,now:number){const d=await readJSON(store,wantedKey(state,now)),out:Record<string,number>={};for(const [k,v] of Object.entries(d?.items||{}))if(Array.isArray(v)&&v.length)out[k]=v.length;return out}
export async function recordWanted(getStoreFn:any,{state,itemIds,familyId,username,now}:any){const store=communityStore(getStoreFn),ref=familyRefOf(familyId).slice(0,12);
 const ids=[...new Set((Array.isArray(itemIds)?itemIds:[]).filter((x:any)=>typeof x==='string'&&/^[a-z0-9-]{1,60}$/.test(x)))].slice(0,80) as string[];
 if(!await bump(store,`rate/${dayKey(now)}/wanted-${sha(username).slice(0,24)}`,40,now))fail('Thử lại sau.','Try again later.',429);
 await mutateDoc(store,wantedKey(state,now),()=>({version:1,state,week:weekStart(today(now)),items:{}}),d=>{for(const k of Object.keys(d.items)){d.items[k]=d.items[k].filter((r:string)=>r!==ref);if(!d.items[k].length)delete d.items[k]}for(const id of ids)(d.items[id]=d.items[id]||[]).push(ref);return true});
 return{recorded:ids.length}}
export const shopPublicId=(username:string)=>sha('community-shop:'+username).slice(0,16);

// ---------- product link memory ("Mở đúng sản phẩm") ----------
// Shared FACTS that map a catalogue item to a retailer's own public product page: no prices,
// no images, no descriptions. A candidate becomes "confirmed" when 2 distinct families saved
// the same product id, or a moderator approves it. A user report ("link hỏng / sản phẩm
// khác") marks it stale so the app falls back to the search link.
// Storage: products/<retailer>/<itemId> — conditional read-modify-write like the item shards.
const PRODUCT_HOSTS:Record<string,RegExp>={woolworths:/^(www\.)?woolworths\.com\.au$/,coles:/^(www\.)?coles\.com\.au$/,aldi:/^(www\.)?aldi\.com\.au$/,chemist:/^(www\.)?chemistwarehouse\.com\.au$/,amazon:/^(www\.)?amazon\.com\.au$/};
const PRODUCT_ID:Record<string,RegExp>={woolworths:/\/productdetails\/(\d{3,12})(?:\/|$)/,coles:/\/product\/[a-z0-9-]*?-(\d{4,12})(?:\/|$)/,aldi:/\/product\/[a-z0-9-]*?-(\d{6,20})(?:\/|$)/,chemist:/\/buy\/(\d{3,12})(?:\/|$)/,amazon:/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/};
/** The retailer's own https product page only; query string, hash and tracking are dropped. Otherwise null. */
export function cleanProductUrl(retailer:string,raw:any){let u:URL;try{u=new URL(String(raw||'').slice(0,500))}catch{return null}
 if(u.protocol!=='https:'||!PRODUCT_HOSTS[retailer]?.test(u.hostname)||u.username||u.password)return null;
 const path=u.pathname.replace(/\/{2,}/g,'/').slice(0,240),m=path.match(PRODUCT_ID[retailer]);if(!m)return null;
 const productId=m[1],host='www.'+u.hostname.replace(/^www\./,'');
 return{productUrl:retailer==='amazon'?`https://www.amazon.com.au/dp/${productId}`:'https://'+host+path,productId}}
const productKey=(retailer:string,itemId:string)=>`products/${retailer}/${itemId}`;
const publicProduct=(c:any,itemId:string,retailer:string)=>({itemId,retailer,key:c.key,productUrl:c.productUrl,productId:c.productId,productName:c.productName,packQty:c.packQty,packUnit:c.packUnit,status:c.status,confirmations:(c.families||[]).length,firstSeen:c.firstSeen,lastConfirmed:c.lastConfirmed});
const productArgs=(body:any)=>({retailer:Object.hasOwn(PRODUCT_HOSTS,body?.retailer)?body.retailer as string:fail('Cửa hàng không hỗ trợ link sản phẩm.','Store not supported for product links.'),itemId:typeof body?.itemId==='string'&&/^[a-z0-9-]{1,60}$/.test(body.itemId)?body.itemId as string:fail('Chọn món trong danh mục.','Choose a catalogue item.')});
/** Save a product-page candidate for an item (signed-in, eligible). One vote per family. */
export async function saveProduct(getStoreFn:any,{context,body,now}:any){
 const {retailer,itemId}=productArgs(body);
 const clean=cleanProductUrl(retailer,body?.url)||fail('Chỉ nhận link trang sản phẩm của chính cửa hàng.','Only the store’s own product page link is accepted.',422,{code:'bad-url'});
 const store=communityStore(getStoreFn),ref=familyRefOf(context.household?.id||context.account.username).slice(0,12),iso=new Date(now).toISOString();
 if(!await bump(store,`rate/${dayKey(now)}/product-${sha(context.account.username).slice(0,24)}`,RULES.accountDaily,now))fail('Bạn đã lưu nhiều link hôm nay.','You saved many links today.',429);
 const {shard}=await mutateDoc(store,productKey(retailer,itemId),()=>({version:1,itemId,retailer,candidates:[] as any[]}),doc=>{
  let c=doc.candidates.find((x:any)=>x.productId===clean.productId);
  if(!c){c={key:sha(retailer+':'+clean.productId).slice(0,12),productUrl:clean.productUrl,productId:clean.productId,productName:text(body?.name,120)||null,packQty:num(body?.packQty,100000),packUnit:text(body?.packUnit,12)||null,firstSeen:iso,lastConfirmed:null,families:[],status:'candidate'};doc.candidates.push(c);doc.candidates=doc.candidates.slice(-20)}
  if(c.status==='rejected')return null;
  if(!c.families.includes(ref))c.families.push(ref);
  if(c.families.length>=2&&c.status!=='confirmed'){c.status='confirmed';c.lastConfirmed=iso}else if(c.status==='confirmed')c.lastConfirmed=iso;
  return true});
 const c=shard.candidates.find((x:any)=>x.productId===clean.productId);
 return c?publicProduct(c,itemId,retailer):{status:'rejected'}}
/** Everyone can read confirmed mappings (the app, and a future browser extension). */
export async function productLinks(getStoreFn:any,{retailer=null,itemId=null}:any={}){const store=communityStore(getStoreFn),out:any[]=[];
 for await(const k of listKeys(store,'products/'+(retailer?retailer+'/':''))){const [,r,i]=k.split('/');if(itemId&&i!==itemId)continue;const d=await readJSON(store,k);for(const c of d?.candidates||[])if(c.status==='confirmed')out.push(publicProduct(c,i,r))}
 return out.sort((a,b)=>a.itemId.localeCompare(b.itemId)||a.retailer.localeCompare(b.retailer))}
export async function reportProduct(getStoreFn:any,{context,body,now}:any){const store=communityStore(getStoreFn),{retailer,itemId}=productArgs(body);
 if(!await bump(store,`rate/${dayKey(now)}/report-${sha(context.account.username).slice(0,24)}`,RULES.reportDaily,now))fail('Bạn đã báo nhiều lần hôm nay.','You have sent many reports today.',429);
 const reason=body?.reason==='wrong-product'?'wrong-product':'broken';
 const {result}=await mutateDoc(store,productKey(retailer,itemId),()=>({version:1,itemId,retailer,candidates:[]}),doc=>{const c=doc.candidates.find((x:any)=>x.key===body?.key);if(!c||c.status!=='confirmed')return null;c.status='stale';c.staleReason=reason;c.staleAt=new Date(now).toISOString();return true});
 if(result===null)fail('Không tìm thấy link.','Link not found.',404);return{stale:true}}
/** Studio list (owner): every candidate with its status and family count. */
export async function productAdmin(getStoreFn:any){const store=communityStore(getStoreFn),out:any[]=[];for await(const k of listKeys(store,'products/')){const [,r,i]=k.split('/');const d=await readJSON(store,k);for(const c of d?.candidates||[])out.push({...publicProduct(c,i,r),staleReason:c.staleReason||null,decidedBy:c.decidedBy||null})}return out.sort((a,b)=>(a.status==='confirmed'?1:0)-(b.status==='confirmed'?1:0)||a.itemId.localeCompare(b.itemId))}
async function moderateProduct(store:any,action:string,body:any,actor:any,now:number){
 const {retailer,itemId}=productArgs(body);
 const edit=action==='product-edit'?cleanProductUrl(retailer,body?.url):null;if(action==='product-edit'&&!edit)fail('Link không phải trang sản phẩm của cửa hàng.','Not a product page of that store.',422);
 const {result}=await mutateDoc(store,productKey(retailer,itemId),()=>({version:1,itemId,retailer,candidates:[]}),doc=>{const c=doc.candidates.find((x:any)=>x.key===body?.key);if(!c)return null;
  if(action==='product-approve'){c.status='confirmed';c.lastConfirmed=new Date(now).toISOString()}else if(action==='product-reject')c.status='rejected';else{c.productUrl=edit!.productUrl;c.productId=edit!.productId;if(body?.name!==undefined)c.productName=text(body.name,120)||null}
  c.decidedBy=actor;c.decidedAt=new Date(now).toISOString();return true});
 if(result===null)fail('Không tìm thấy link.','Link not found.',404);return{target:retailer+'/'+itemId+'/'+body.key}}
export {accountStore};
