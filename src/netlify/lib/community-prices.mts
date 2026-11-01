// Community Price Pilot ("Giá cộng đồng") — v1.5, feature-flagged (Studio flag
// `communityPrices`, OFF by default). Families may share price FACTS they saw in a
// store (a shelf-tag photo or a confirmed receipt line) with other signed-in
// families in the same state. Screenshots, bookmark captures and manual entries
// stay family-only because they copy retailer content.
//
// What is shared: item, price, unit price, pack, retailer, a user-chosen branch
// label (suburb + postcode), state, promo, validUntil, capturedAt, evidence image
// hash + OCR match. Never the contributor's identity, family, notes or photo. A
// photo is stored only when a submission is HELD for moderation, in a private
// area, and is deleted after moderation or 14 days.
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
import {createHash,randomBytes} from 'node:crypto';
import {accountStore,editRecord,scopedStore} from './accounts.mjs';
import {postcodeToState} from './geo-resolver.mjs';
import {readObservations} from './grocery-pricing.mjs';

const DAY=86400000;
export const COMMUNITY_STORE='bep-community';
export const communityStore=(getStoreFn:any)=>getStoreFn({name:COMMUNITY_STORE,consistency:'strong',region:'ap-southeast-2'});
export const RULES={minAccountDays:7,minFamilyDays:7,accountDaily:30,ipDaily:60,reportDaily:20,captureMaxDays:7,confirmWindowDays:7,regularUsableDays:14,regularVisibleDays:21,shopDays:14,photoDays:14,sanityDays:35,shardKeepDays:40,trustStart:0.5,trustUp:0.05,trustDown:0.15,trustCountMin:0.3,trustReceipt:0.7,matchPct:0.02,matchAbs:0.05,ocrTolerance:0.01,burstNewAccountDays:14,burstCount:3,sharedIpAccounts:3,branchShare:0.8,branchMin:5,maxShopPrices:60} as const;
export const COMMUNITY_EVIDENCE=['shelf-photo','receipt'];
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

// ---------- settings ----------
/** Pilot status from Studio platform settings: flag communityPrices + supported states (NSW/QLD only). */
export function pilotConfig(values:any){const states=(Array.isArray(values?.priceScoutStates)?values.priceScoutStates:['NSW','QLD']).filter((s:string)=>['NSW','QLD'].includes(s));return{enabled:values?.flags?.communityPrices===true&&states.length>0,states}}

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
export function groupConsensus(subs:any[],day:string){
 const shown=subs.filter(isShown).filter(s=>expiryOf(s,day).visible).sort((a,b)=>captured(b)-captured(a));
 if(!shown.length)return null;
 const countable=shown.filter(counts);let best:any=null;
 for(const anchor of countable){
  const cluster=countable.filter(x=>pricesMatch(anchor,x)&&withinWindow(anchor,x));
  const families=new Set(cluster.map(x=>x.familyRef)).size;
  const receipt=cluster.some(x=>x.evidence?.type==='receipt'&&(x.trustAtSubmit??0)>=RULES.trustReceipt);
  const score=(families>=2||receipt?1000:0)+families;
  if(!best||score>best.score)best={anchor,cluster,families,receipt,score};
 }
 const pick=best?.anchor||shown[0];
 const cluster=best?best.cluster:shown.filter(x=>pricesMatch(pick,x));
 const confirmed=!!best&&(best.families>=2||best.receipt);
 const lastObserved=cluster.map(x=>x.observedAt).sort().pop()||pick.observedAt,exp=expiryOf({...pick,observedAt:lastObserved},day);
 return{groupId:pick.groupId,itemId:pick.itemId,label:pick.label,retailer:pick.retailer,branchId:pick.branchId,branchLabel:pick.branchLabel,state:pick.state,status:confirmed?'confirmed':'pending',price:pick.price,unitPrice:pick.unitPrice,unitBasis:pick.unitBasis,packQty:pick.packQty,packUnit:pick.packUnit,units:pick.units,promo:pick.promo,validUntil:pick.validUntil,families:new Set(cluster.map(x=>x.familyRef)).size,reports:cluster.length,lastObserved,ageDays:exp.age,usable:confirmed&&exp.usable,faded:exp.faded,sources:[...new Set(cluster.map(x=>x.evidence?.type))].filter(Boolean)};
}
export function shardConsensus(shard:any,day:string){const byGroup=new Map<string,any[]>();for(const s of shard?.submissions||[]){const l=byGroup.get(s.groupId)||[];l.push(s);byGroup.set(s.groupId,l)}const out:any[]=[];for(const [gid,subs] of byGroup){if((shard.hiddenGroups||[]).includes(gid))continue;const c=groupConsensus(subs,day);if(c)out.push(c)}return out}

/** Outlier check (Price Scout priceSanity rule): 40%–250% of the 35-day median, needs ≥3 values. */
export function priceSanity(value:number,values:number[]){const v=values.filter(x=>x>0).sort((a,b)=>a-b);if(!(value>0)||v.length<3)return{ok:true,reason:'insufficient-history',count:v.length};const m=v.length>>1,median=v.length%2?v[m]:(v[m-1]+v[m])/2,ratio=round(value/median,3);return{ok:ratio>=0.4&&ratio<=2.5,reason:ratio<0.4?'too-low':ratio>2.5?'too-high':'within-range',median:round(median,4),ratio,count:v.length}}

// ---------- validation ----------
/** Validates a contribution. Only extracted facts are kept. Throws {status,en}. */
export function cleanContribution(o:any,branch:any,{now,states}:{now:number,states:string[]}){
 if(!o||typeof o!=='object')fail('Thiếu dữ liệu giá.','Missing price details.');
 const ev=o.evidence||{};
 if(!COMMUNITY_EVIDENCE.includes(ev.type))fail('Chỉ chia sẻ được giá từ ảnh kệ giá ở cửa hàng hoặc hóa đơn. Ảnh chụp màn hình/website chỉ lưu trong gia đình.','Only shelf-tag photos or receipts can be shared. Screenshots and website captures stay with your family.',422,{code:'family-only'});
 const itemId=typeof o.itemId==='string'&&/^[a-z0-9-]{1,60}$/.test(o.itemId)?o.itemId:fail('Chọn món trong danh mục trước khi chia sẻ.','Choose a catalogue item before sharing.');
 const retailer=RETAILERS.includes(o.retailer)?o.retailer:fail('Cửa hàng không hợp lệ.','Invalid store.');
 const price=num(o.price,10000)??fail('Giá không hợp lệ.','Invalid price.');
 if(o.currency!=='AUD')fail('Chỉ nhận giá AUD.','AUD prices only.');
 const pc=postcodeToState(branch?.postcode),suburb=text(branch?.suburb,40);
 if(!pc.valid||!suburb)fail('Nhập khu (suburb) và postcode của cửa hàng.','Enter the store suburb and postcode.');
 if(!states.includes(pc.state))fail('Cửa hàng phải ở bang đang thử nghiệm (NSW/QLD).','The store must be in a pilot state (NSW/QLD).');
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
 if(ev.type==='shelf-photo'){
  if(!imageHash)fail('Thiếu dấu vân ảnh.','Missing photo fingerprint.');
  const ocr=num(ev.ocrPrice,10000);evidence.ocrPrice=ocr;evidence.ocrMatches=ocr!=null&&Math.abs(ocr-price)<=RULES.ocrTolerance+1e-9;
  if(!evidence.ocrMatches)fail('Giá đọc từ ảnh không khớp giá đã nhập nên không chia sẻ được. Giá vẫn lưu trong gia đình.','The price read from the photo does not match the price entered, so it cannot be shared. It is still saved for your family.',422,{code:'ocr-mismatch'});
 }else{
  evidence.receiptId=typeof ev.receiptId==='string'&&/^[\w:.-]{1,120}$/.test(ev.receiptId)?ev.receiptId:fail('Thiếu hóa đơn.','Missing receipt.');
  evidence.lineId=typeof ev.lineId==='string'&&/^[\w:.-]{1,120}$/.test(ev.lineId)?ev.lineId:fail('Thiếu dòng hóa đơn.','Missing receipt line.');
 }
 const branchId=retailer+':'+pc.postcode+':'+suburb.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30);
 const label=text(o.label,120)||itemId;
 const observedAt=today(capturedAt);
 return{itemId,label,retailer,price,currency:'AUD',unitPrice,unitBasis,packQty:num(o.packQty,100000),packUnit:o.packQty?text(o.packUnit,12)||null:null,units:num(o.units,100000),promo,validUntil,capturedAt:new Date(capturedAt).toISOString(),observedAt,state:pc.state,branchId,branchLabel:suburb+' '+pc.postcode,evidence};
}

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
 const key=shardKey(state,itemId);
 for(let i=0;i<attempts;i++){
  const row=await store.getWithMetadata(key,{type:'json'}),base=row?.data||{version:1,state,itemId,submissions:[],reports:[],hiddenGroups:[]};
  const shard=structuredClone(base),result=fn(shard);if(result===null)return{shard:base,result:null};
  const saved=await store.setJSON(key,{...shard,updatedAt:new Date().toISOString()},row?.etag?{onlyIfMatch:row.etag}:{onlyIfNew:true});
  if(saved?.modified!==false)return{shard,result};
  await new Promise(r=>setTimeout(r,Math.floor(Math.random()*8*(i+1))));
 }
 fail('Đang bận, thử lại.','Busy, try again.',409);
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
 try{const fam=scopedStore(getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'}),householdId,members);const st=await fam.get('state',{type:'json'});const r=(st?.receipts||[]).find((x:any)=>x?.id===clean.evidence.receiptId);if(!r||(r.currency||'AUD')!=='AUD')return false;const line=(r.items||[]).find((l:any)=>String(l?.id)===clean.evidence.lineId);return!!line&&Math.abs(Math.abs(+line.total)-clean.price)<=RULES.ocrTolerance+1e-9&&r.date>=dayKey(Date.parse(clean.capturedAt)-RULES.captureMaxDays*DAY)}catch{return false}
}

/** Contribute one observation. Returns {status:'accepted'|'held', id, photoRequested, ...}. */
export async function contribute(getStoreFn:any,{context,observation,branch,ipHash,now,states}:any){
 const store=communityStore(getStoreFn),account=context.account,username=account.username,household=context.household;
 const gate=eligibility(account,household,now);if(!gate.ok)fail('Tài khoản chưa đủ điều kiện chia sẻ giá cộng đồng.','This account is not yet eligible to share community prices.',403,{code:'not-eligible',reasons:gate.reasons});
 let who=await contributor(store,username);
 if(!who?.termsAcceptedAt)fail('Cần đồng ý điều khoản chia sẻ giá trước.','Please accept the sharing terms first.',428,{code:'terms'});
 const clean=cleanContribution(observation,branch,{now,states});
 if(clean.evidence.type==='receipt'&&!await verifyReceipt(getStoreFn,household.id,household.members,clean))fail('Không tìm thấy dòng hóa đơn đã xác nhận khớp giá này.','No confirmed receipt line matches this price.',422,{code:'receipt-unconfirmed'});
 // Rate limits (per account 30/day, per IP hash 60/day). Keys expire by day.
 const d=dayKey(now);
 if(!await bump(store,`rate/${d}/acct-${sha(username).slice(0,24)}`,RULES.accountDaily,now))fail('Bạn đã chia sẻ đủ 30 giá hôm nay.','You have shared 30 prices today, the daily limit.',429);
 if(!await bump(store,`rate/${d}/ip-${ipHash}`,RULES.ipDaily,now))fail('Quá nhiều lượt chia sẻ từ mạng này hôm nay.','Too many shares from this network today.',429);
 // Duplicate evidence → rejected. onlyIfNew makes the check atomic under concurrency.
 const id='cp-'+now.toString(36)+'-'+randomBytes(5).toString('hex');
 const fingerprint=clean.evidence.type==='shelf-photo'?'img:'+clean.evidence.imageHash:'rcpt:'+household.id+':'+clean.evidence.receiptId+':'+clean.evidence.lineId;
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
 const effects=new Map<string,any>();
 let shard:any;
 try{({shard}=await mutateShard(store,clean.state,clean.itemId,sh=>{
  effects.clear();prune(sh,now);
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
    if(against.size<2)continue;s.contradicted=true;if(debited.has(s.account))continue;debited.add(s.account);const e=effects.get(s.account)||{delta:0};e.delta-=RULES.trustDown;e.contradicted=(e.contradicted||0)+1;effects.set(s.account,e)}
  }
  sh.submissions.push(record);return true;
 }))}catch(error){try{await store.delete('dedupe/'+sha(fingerprint))}catch{}throw error}
 await applyTrust(store,effects,now);
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
 if(bytes.byteLength>3_000_000)fail('Ảnh tối đa 3 MB.','Photo must be under 3 MB.',413);
 if(sha256Bytes(bytes)!==s.evidence.imageHash)fail('Ảnh không khớp ảnh đã dùng để đọc giá.','The photo does not match the one used to read the price.',422);
 await store.set('photos/'+id,bytes);await store.setJSON('photo-meta/'+id,{id,state,itemId,expiresAt:new Date(now+RULES.photoDays*DAY).toISOString()});
 await mutateShard(store,state,itemId,sh=>{const x=sh.submissions.find((y:any)=>y.id===id);if(!x)return null;x.photo=true;return true});
 return{stored:true,expiresAt:new Date(now+RULES.photoDays*DAY).toISOString()};
}
export const sha256Bytes=(b:any)=>createHash('sha256').update(Buffer.from(b instanceof ArrayBuffer?new Uint8Array(b):b)).digest('hex');
async function deletePhoto(store:any,id:string){try{await store.delete('photos/'+id);await store.delete('photo-meta/'+id)}catch{}}

/** Public read: community prices for a state (signed-in users, flag on). No identity, no held items. */
export async function communityPrices(getStoreFn:any,{state,branches=null,now}:any){
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
 if(body?.shop){const shop=typeof body.shop==='string'&&/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(body.shop)?body.shop:fail('Tiệm không hợp lệ.','Invalid shop.');let found=false;await editRecord(store,'shop-prices/'+shop,(r:any)=>{const p=r?.prices?.find((x:any)=>x.id===body.priceId);if(!p)return undefined;found=true;if((p.reports||[]).some((x:any)=>x.familyRef===familyRef&&x.status==='open'))return undefined;p.reports=[...(p.reports||[]),entry];return r});if(!found)fail('Không tìm thấy giá.','Price not found.',404);return{reported:true}}
 const state=['NSW','QLD'].includes(body?.state)?body.state:fail('Bang không hợp lệ.','Invalid state.');
 const itemId=typeof body?.itemId==='string'&&/^[a-z0-9-]{1,60}$/.test(body.itemId)?body.itemId:fail('Món không hợp lệ.','Invalid item.');
 const groupId=typeof body?.groupId==='string'&&/^[a-f0-9]{16}$/.test(body.groupId)?body.groupId:fail('Giá không hợp lệ.','Invalid price.');
 const {result}=await mutateShard(store,state,itemId,sh=>{if(!sh.submissions.some((s:any)=>s.groupId===groupId))return null;sh.reports=sh.reports||[];if(sh.reports.some((r:any)=>r.groupId===groupId&&r.familyRef===familyRef&&r.status==='open'))return 'already';sh.reports.push({...entry,groupId});return 'ok'});
 if(result===null)fail('Không tìm thấy giá.','Price not found.',404);
 return{reported:true,already:result==='already'};
}

// ---------- terms ----------
export const TERMS_VERSION='2026-11-draft';
export async function acceptTerms(getStoreFn:any,username:string,now:number){const store=communityStore(getStoreFn);const c=await editContributor(store,username,x=>({...x,termsAcceptedAt:new Date(now).toISOString(),termsVersion:TERMS_VERSION}),now);return{termsAcceptedAt:c.termsAcceptedAt,termsVersion:c.termsVersion}}

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
 await editRecord(store,'shop-prices/'+username,(r:any)=>{const live=(r?.prices||[]).filter((p:any)=>now-Date.parse(p.postedAt)<RULES.shopDays*DAY&&!(p.itemId===itemId&&p.unitBasis===entry.unitBasis&&!p.hidden));if(live.length>=RULES.maxShopPrices)fail('Tiệm đã đăng tối đa 60 giá.','The shop already has 60 live prices.',429);return{shop:{username,name:app.shopName,suburb:app.suburb,postcode:app.postcode,state:app.state},prices:[...live,entry]}});
 return{posted:entry.id};
}
export async function shopPrices(getStoreFn:any,{state,now,includeHidden=false}:any){
 const store=communityStore(getStoreFn),out:any[]=[];
 for await(const k of listKeys(store,'shop-prices/')){const r=await readJSON(store,k);if(!r?.shop||state&&r.shop.state!==state)continue;const app=await readJSON(store,'shops/applications/'+r.shop.username);if(app?.status!=='approved'&&!includeHidden)continue;
  for(const p of r.prices||[]){const expires=Math.min(Date.parse(p.postedAt)+RULES.shopDays*DAY,p.validUntil?Date.parse(p.validUntil+'T23:59:59+10:00'):Infinity);if(!includeHidden&&(p.hidden||expires<now))continue;out.push({...p,reports:includeHidden?p.reports:undefined,openReports:(p.reports||[]).filter((x:any)=>x.status==='open').length,shop:includeHidden?r.shop:{id:r.shop.username,name:r.shop.name,suburb:r.shop.suburb,state:r.shop.state},expiresAt:new Date(expires).toISOString(),channel:'shop'})}}
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
export async function moderate(getStoreFn:any,{action,body,now}:any){
 const store=communityStore(getStoreFn),state=['NSW','QLD'].includes(body?.state)?body.state:null,itemId=typeof body?.itemId==='string'&&/^[a-z0-9-]{1,60}$/.test(body.itemId)?body.itemId:null;
 const effects=new Map<string,any>();
 const onSub=async(fn:(s:any,sh:any)=>void)=>{if(!state||!itemId)fail('Thiếu bang/món.','Missing state/item.');const id=String(body.id||'');const {result}=await mutateShard(store,state,itemId,sh=>{const s=sh.submissions.find((x:any)=>x.id===id);if(!s)return null;effects.clear();fn(s,sh);return{account:s.account,photo:s.photo}});if(!result)fail('Không tìm thấy.','Not found.',404);return result};
 switch(action){
  case'approve':{const r=await onSub(s=>{s.status='accepted';s.approved=true;s.holdReason=null;s.photo=false});await deletePhoto(store,body.id);return{target:body.id,account:r.account}}
  case'reject':{const r=await onSub(s=>{const was=s.status;s.status='rejected';s.photo=false;if(was!=='rejected')effects.set(s.account,{delta:-RULES.trustDown,rejected:1})});await applyTrust(store,effects,now);await deletePhoto(store,body.id);return{target:body.id,account:r.account}}
  case'hide':{if(body.groupId){if(!state||!itemId||!/^[a-f0-9]{16}$/.test(body.groupId))fail('Thiếu nhóm giá.','Missing price group.');await mutateShard(store,state,itemId,sh=>{sh.hiddenGroups=[...new Set([...(sh.hiddenGroups||[]),body.groupId])];for(const r of sh.reports||[])if(r.groupId===body.groupId&&r.status==='open')r.status='upheld';return true});return{target:body.groupId}}const r=await onSub(s=>{s.status='hidden';s.photo=false});await deletePhoto(store,body.id);return{target:body.id,account:r.account}}
  case'restore':{if(body.groupId){await mutateShard(store,state!,itemId!,sh=>{sh.hiddenGroups=(sh.hiddenGroups||[]).filter((g:string)=>g!==body.groupId);return true});return{target:body.groupId}}const r=await onSub(s=>{s.status='accepted'});return{target:body.id,account:r.account}}
  case'dismiss-reports':{if(!state||!itemId)fail('Thiếu bang/món.','Missing state/item.');await mutateShard(store,state,itemId,sh=>{for(const r of sh.reports||[])if(r.groupId===body.groupId&&r.status==='open')r.status='dismissed';return true});return{target:body.groupId}}
  case'ban':case'unban':{const account=typeof body?.account==='string'&&/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(body.account)?body.account:fail('Tài khoản không hợp lệ.','Invalid account.');const ban=action==='ban';const c=await editContributor(store,account,x=>({...x,banned:ban,bannedAt:ban?new Date(now).toISOString():null}),now);
   for(const key of c.shards||[]){const [,st,item]=key.split('/');await mutateShard(store,st,item,sh=>{let changed=false;for(const s of sh.submissions)if(s.account===account){s.shadow=ban;s.counted=!ban&&(s.trustAtSubmit??0.5)>=RULES.trustCountMin;changed=true}return changed?true:null})}
   return{target:account,account}}
  case'shop-approve':case'shop-reject':case'shop-revoke':{const u=typeof body?.username==='string'&&/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(body.username)?body.username:fail('Tiệm không hợp lệ.','Invalid shop.');const status=action==='shop-approve'?'approved':action==='shop-reject'?'rejected':'revoked';const r=await editRecord(store,'shops/applications/'+u,(a:any)=>a?{...a,status,decidedAt:new Date(now).toISOString()}:undefined);if(!r)fail('Không tìm thấy đơn.','Application not found.',404);return{target:u}}
  case'shop-hide':case'shop-restore':case'shop-dismiss':{const u=String(body?.shop||'');let found=false;await editRecord(store,'shop-prices/'+u,(r:any)=>{const p=r?.prices?.find((x:any)=>x.id===body.priceId);if(!p)return undefined;found=true;if(action==='shop-hide'){p.hidden=true;for(const x of p.reports||[])if(x.status==='open')x.status='upheld'}else if(action==='shop-restore')p.hidden=false;else for(const x of p.reports||[])if(x.status==='open')x.status='dismissed';return r});if(!found)fail('Không tìm thấy.','Not found.',404);return{target:body.priceId,shop:u}}
 }
 return fail('Thao tác không hỗ trợ.','Unsupported action.',400);
}
/** Deletes expired rate counters, moderation photos past 14 days and stale dedupe markers. */
export async function pruneCommunity(getStoreFn:any,now:number,budget=2000){
 const store=communityStore(getStoreFn),cutoff=dayKey(now-2*DAY);let removed=0;
 for await(const k of listKeys(store,'rate/')){if(removed>=budget)break;if(k.split('/')[1]<cutoff){await store.delete(k);removed++}}
 for await(const k of listKeys(store,'photo-meta/')){if(removed>=budget)break;const m=await readJSON(store,k);if(!m||Date.parse(m.expiresAt)<=now){const id=k.split('/')[1];await deletePhoto(store,id);removed++;if(m?.state&&m.itemId)try{await mutateShard(store,m.state,m.itemId,sh=>{const s=sh.submissions.find((x:any)=>x.id===id);if(!s)return null;s.photo=false;return true})}catch{}}}
 return removed;
}
export {accountStore};
