// Studio: owner/admin console helpers. Metadata and counts only by default; family
// content (recipes, menus, receipts, messages, photos) is never returned except as
// counts/sizes. Every admin mutation and privileged view is written to an
// append-only audit log. Hook helpers exported here never throw.
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {accountStore,editRecord} from './accounts.mjs';
const derive=promisify(scrypt);
export const sha256=(x:string)=>createHash('sha256').update(x).digest('hex');
const REGION={consistency:'strong',region:'ap-southeast-2'} as const;
export const studioStore=(getStoreFn:any)=>getStoreFn({name:'bep-studio',...REGION});
export const familyDataStore=(getStoreFn:any)=>getStoreFn({name:'bep-family-data',...REGION});
const DAY=86400000;
export const EVENT_RETENTION_DAYS=90,AUDIT_RETENTION_DAYS=400,TRASH_RETENTION_DAYS=30,OVERVIEW_TTL=5*60000;
export const dayKey=(ms:number)=>new Date(ms).toISOString().slice(0,10);

// ---------- roles ----------
const names=(v:any)=>String(v||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
export function studioRoles(env:any=process.env){const admins=new Set(names(env.STUDIO_ADMINS)),support=new Set(names(env.STUDIO_SUPPORT));return{enabled:admins.size>0,admins,support}}
export function roleFor(username:string,env:any=process.env,settings?:any){const r=studioRoles(env),u=String(username||'').toLowerCase();if(!r.enabled)return null;if(r.admins.has(u))return 'owner';if(r.support.has(u)&&settings?.flags?.supportRole===true)return 'support';return null}

// ---------- small utils ----------
export function maskEmail(email:any){if(typeof email!=='string'||!email.includes('@'))return null;const [user,domain]=email.split('@'),dot=domain.lastIndexOf('.'),host=dot>0?domain.slice(0,dot):domain,tld=dot>0?domain.slice(dot):'';return (user[0]||'')+'•••'+(user.length>1?user[user.length-1]:'')+'@'+(host[0]||'')+'•••'+tld}
export function maskEndpoint(endpoint:any){try{const u=new URL(endpoint);return u.hostname+' …'+String(endpoint).slice(-6)}catch{return 'invalid'}}
export function platformFromEndpoint(endpoint:any){try{const h=new URL(endpoint).hostname;if(h==='fcm.googleapis.com')return 'chrome-android';if(h.endsWith('push.apple.com'))return 'safari-apple';if(h.includes('mozilla.com'))return 'firefox';if(h.endsWith('notify.windows.com'))return 'edge-windows';return 'other'}catch{return 'other'}}
const clean=(v:any,depth=0):any=>{if(v==null||typeof v==='boolean'||typeof v==='number')return v;if(typeof v==='string')return v.slice(0,200);if(depth>2)return null;if(Array.isArray(v))return v.slice(0,20).map(x=>clean(x,depth+1));if(typeof v==='object'){const out:any={};for(const [k,x] of Object.entries(v).slice(0,30)){if(/password|token|secret|recovery|endpoint|p256dh|auth$|^code$|email|message|body|text/i.test(k))continue;out[k]=clean(x,depth+1)}return out}return null};
async function* listKeys(store:any,prefix:string){for await(const page of store.list({prefix,paginate:true}))for(const b of page.blobs)yield b.key as string}
async function readJSON(store:any,key:string){try{return await store.get(key,{type:'json'})}catch{return null}}
async function readSize(store:any,key:string,type:'text'|'arrayBuffer'){try{const v=await store.get(key,{type});if(v==null)return {bytes:0,value:null};if(typeof v==='string')return{bytes:Buffer.byteLength(v),value:v};if(v instanceof ArrayBuffer||ArrayBuffer.isView(v))return{bytes:(v as any).byteLength,value:null};const s=JSON.stringify(v);return{bytes:Buffer.byteLength(s),value:s}}catch{return{bytes:0,value:null}}}

// ---------- event / audit logs ----------
// Each entry is its own key (kind/YYYY-MM-DD/<ms>-<type>-<random>) written with onlyIfNew,
// so concurrent writers never contend and nothing is overwritten (append-only).
async function append(getStoreFn:any,kind:'events'|'audit',type:string,record:any,now=Date.now()){const t=String(type).replace(/[^a-z0-9_]/gi,'').slice(0,40)||'unknown',key=`${kind}/${dayKey(now)}/${String(now).padStart(13,'0')}-${t}-${randomBytes(4).toString('hex')}`;await studioStore(getStoreFn).setJSON(key,{...record,type:t,at:new Date(now).toISOString()},{onlyIfNew:true});return key}
/** Hook: record a product event (no secrets/content; strings are truncated, sensitive keys dropped). Never throws. */
export async function recordEvent(getStoreFn:any,type:string,data:any={},now=Date.now()){try{return await append(getStoreFn,'events',type,{data:clean(data)||{},account:typeof data?.account==='string'?data.account.slice(0,40):null,family:typeof data?.family==='string'?data.family.slice(0,40):null},now)}catch{return null}}
/** Hook: note a family state write/conflict (one record per family). Never throws. */
export async function recordSync(getStoreFn:any,familyId:string,{bytes=0,conflict=false}:{bytes?:number,conflict?:boolean}={},now=Date.now()){try{if(!/^[a-f0-9-]{36}$/.test(familyId))return;await editRecord(studioStore(getStoreFn),'sync/'+familyId,(r:any)=>({writes:(r?.writes||0)+(conflict?0:1),conflicts:(r?.conflicts||0)+(conflict?1:0),bytes:conflict?r?.bytes||0:bytes,lastWrite:conflict?r?.lastWrite||null:new Date(now).toISOString(),lastConflict:conflict?new Date(now).toISOString():r?.lastConflict||null}))}catch{}}
/** Hook: record a scheduled job run (reminders, price-scout). Never throws. */
export async function recordCronRun(getStoreFn:any,name:string,result:any={},now=Date.now()){try{const n=String(name).replace(/[^a-z0-9-]/gi,'').slice(0,30);await studioStore(getStoreFn).setJSON('cron/'+n,{at:new Date(now).toISOString(),result:clean(result)});await recordEvent(getStoreFn,'cron_'+n.replace(/-/g,'_'),result,now)}catch{}}
export async function writeAudit(getStoreFn:any,entry:{actor:string,role:string,action:string,target?:any,reason?:string,result?:string,details?:any},now=Date.now()){return append(getStoreFn,'audit',entry.action,{actor:entry.actor,role:entry.role,action:entry.action,target:entry.target||null,reason:entry.reason?String(entry.reason).slice(0,300):null,result:entry.result||'ok',details:clean(entry.details)||null,account:entry.target?.type==='account'?entry.target.id:null,family:entry.target?.type==='family'?entry.target.id:null},now)}
export async function listLog(getStoreFn:any,kind:'events'|'audit',{from,to,type,account,family,cursor,limit=50,now=Date.now()}:any={}){
 const store=studioStore(getStoreFn),end=to?Date.parse(to+'T00:00:00Z'):now,start=Math.max(from?Date.parse(from+'T00:00:00Z'):end-29*DAY,end-(kind==='audit'?AUDIT_RETENTION_DAYS:EVENT_RETENTION_DAYS)*DAY),items:any[]=[];let scanned=0,next=null;
 for(let d=end;d>=start-1&&items.length<limit&&scanned<3000;d-=DAY){const keys:string[]=[];for await(const k of listKeys(store,`${kind}/${dayKey(d)}/`))keys.push(k);keys.sort().reverse();for(const k of keys){if(cursor&&k>=cursor)continue;if(type&&String(k.split('/').pop()).split('-')[1]!==type)continue;scanned++;const r=await readJSON(store,k);if(!r)continue;if(account&&r.account!==account&&r.actor!==account)continue;if(family&&r.family!==family)continue;items.push({id:k.split('/').pop(),...r});if(items.length>=limit){next=k;break}}}
 return{items,next};
}
export async function pruneLogs(getStoreFn:any,now=Date.now(),budget=2000){const store=studioStore(getStoreFn);let removed=0;for(const [kind,days] of [['events',EVENT_RETENTION_DAYS],['audit',AUDIT_RETENTION_DAYS]] as const){const cutoff=dayKey(now-days*DAY);for await(const k of listKeys(store,kind+'/')){if(removed>=budget)return removed;if(k.split('/')[1]<cutoff){await store.delete(k);removed++}}}for await(const k of listKeys(store,'trash/')){const r=await readJSON(store,k);if(r?.purgeAfter&&Date.parse(r.purgeAfter)<now){await store.delete(k);removed++}}return removed}

// ---------- platform settings ----------
export const SETTINGS_DEFAULTS={signups:'open',maxFamiliesPerAccount:5,maxMembersPerFamily:20,maxDevicesPerFamily:50,maintenanceMessage:'',flags:{priceScout:true,voice:true,urgentMessages:true,supportRole:false,communityPrices:true},priceScoutStates:['NSW','QLD'],rewards:{confirmed:10,specialBonus:5,corroborate:3,gapBonus:5,gapFamilies:3,penalty:20,dailyCap:100,levels:[100,500,1500]} as any,minAppEdition:'',updateNotice:true,minBuild:'',banner:null as any,links:{privacy:'',terms:'',supportEmail:''},checklist:{} as Record<string,boolean>};
const bool=(v:any)=>v===undefined||v===''?undefined:/^(1|true|yes|on)$/i.test(String(v));
const int=(v:any,min:number,max:number)=>{const n=Number(v);return v===undefined||v===''||!Number.isInteger(n)?undefined:Math.min(max,Math.max(min,n))};
export function envSettings(env:any=process.env){const o:any={},flags:any={};const s=String(env.STUDIO_SIGNUPS||'').toLowerCase();if(['open','closed','invite-only'].includes(s))o.signups=s;else if(env.ALLOW_ACCOUNT_SIGNUP==='false')o.signups='closed';
 const m:[string,string,number,number][]=[['maxFamiliesPerAccount','STUDIO_MAX_FAMILIES_PER_ACCOUNT',1,100],['maxMembersPerFamily','STUDIO_MAX_MEMBERS_PER_FAMILY',1,100],['maxDevicesPerFamily','STUDIO_MAX_DEVICES_PER_FAMILY',1,500]];for(const [k,e,a,b] of m){const v=int(env[e],a,b);if(v!==undefined)o[k]=v}
 if(env.STUDIO_MAINTENANCE_MESSAGE)o.maintenanceMessage=String(env.STUDIO_MAINTENANCE_MESSAGE).slice(0,300);if(env.STUDIO_MIN_APP_EDITION)o.minAppEdition=String(env.STUDIO_MIN_APP_EDITION).slice(0,60);if(env.STUDIO_PRICE_SCOUT_STATES)o.priceScoutStates=names(env.STUDIO_PRICE_SCOUT_STATES).map(x=>x.toUpperCase());
 for(const [k,e] of [['priceScout','STUDIO_FLAG_PRICE_SCOUT'],['voice','STUDIO_FLAG_VOICE'],['urgentMessages','STUDIO_FLAG_URGENT_MESSAGES'],['supportRole','STUDIO_FLAG_SUPPORT_ROLE'],['communityPrices','STUDIO_FLAG_COMMUNITY_PRICES']]){const v=bool(env[e]);if(v!==undefined)flags[k]=v}if(Object.keys(flags).length)o.flags=flags;return o}
let settingsCache:{at:number,value:any}|null=null;
export async function platformSettings(getStoreFn:any,{env=process.env,fresh=false,now=Date.now()}:any={}){
 let stored:any={};if(!fresh&&settingsCache&&now-settingsCache.at<60000)stored=settingsCache.value;else{try{stored=await studioStore(getStoreFn).get('settings/platform',{type:'json'})||{}}catch{stored={}}settingsCache={at:now,value:stored}}
 const fromEnv=envSettings(env),values:any=structuredClone(SETTINGS_DEFAULTS),sources:any={};
 for(const k of Object.keys(values)){if(k==='flags'){for(const f of Object.keys(values.flags)){sources['flags.'+f]='default';if(stored.flags?.[f]!==undefined){values.flags[f]=stored.flags[f];sources['flags.'+f]='stored'}if(fromEnv.flags?.[f]!==undefined){values.flags[f]=fromEnv.flags[f];sources['flags.'+f]='env'}}continue}sources[k]='default';if(stored[k]!==undefined){values[k]=stored[k];sources[k]='stored'}if(fromEnv[k]!==undefined){values[k]=fromEnv[k];sources[k]='env'}}
 return{values,sources,stored};
}
export function resetSettingsCache(){settingsCache=null}
const str=(v:any,n:number)=>typeof v==='string'?v.trim().slice(0,n):'';
export function validateSettingsPatch(p:any){const out:any={};if(p.signups!==undefined){if(!['open','closed','invite-only'].includes(p.signups))throw Object.assign(Error('signups'),{status:400});out.signups=p.signups}
 for(const [k,a,b] of [['maxFamiliesPerAccount',1,100],['maxMembersPerFamily',1,100],['maxDevicesPerFamily',1,500]] as const)if(p[k]!==undefined){const v=int(p[k],a,b);if(v===undefined)throw Object.assign(Error(k),{status:400});out[k]=v}
 if(p.maintenanceMessage!==undefined)out.maintenanceMessage=str(p.maintenanceMessage,300);if(p.minAppEdition!==undefined){out.minAppEdition=str(p.minAppEdition,60);if(out.minAppEdition&&!/^[\w.-]+$/.test(out.minAppEdition))throw Object.assign(Error('minAppEdition'),{status:400})}
 // v1.6 app updates: notice switch and the minimum build every device must run (build ids from dist/build.json).
 if(p.updateNotice!==undefined){if(typeof p.updateNotice!=='boolean')throw Object.assign(Error('updateNotice'),{status:400});out.updateNotice=p.updateNotice}
 if(p.minBuild!==undefined){out.minBuild=str(p.minBuild,60);if(out.minBuild&&!/^\d{8}T\d{6}Z-[a-f0-9]{6,20}$/.test(out.minBuild))throw Object.assign(Error('minBuild'),{status:400})}
 if(p.priceScoutStates!==undefined){const allowed=['NSW','QLD','VIC','SA','WA','TAS','ACT','NT'];out.priceScoutStates=(Array.isArray(p.priceScoutStates)?p.priceScoutStates:[]).map((x:any)=>String(x).toUpperCase()).filter((x:string)=>allowed.includes(x))}
 if(p.flags!==undefined){out.flags={};for(const f of Object.keys(SETTINGS_DEFAULTS.flags))if(typeof p.flags[f]==='boolean')out.flags[f]=p.flags[f]}
 if(p.rewards!==undefined){const r=p.rewards||{},d=SETTINGS_DEFAULTS.rewards,o:any={};for(const [k,a,b] of [['confirmed',0,100],['specialBonus',0,100],['corroborate',0,100],['gapBonus',0,100],['gapFamilies',1,100],['penalty',0,500],['dailyCap',0,10000]] as const){const v=r[k]===undefined?d[k]:int(r[k],a,b);if(v===undefined)throw Object.assign(Error('rewards.'+k),{status:400});o[k]=v}
  const lv=r.levels===undefined?d.levels:(Array.isArray(r.levels)?r.levels.map((x:any)=>int(x,1,1000000)):[]);if(lv.length!==3||lv.some((x:any,i:number)=>x===undefined||i>0&&x<=lv[i-1]))throw Object.assign(Error('rewards.levels'),{status:400});o.levels=lv;out.rewards=o}
 if(p.links!==undefined){out.links={privacy:str(p.links.privacy,300),terms:str(p.links.terms,300),supportEmail:str(p.links.supportEmail,120)};for(const k of ['privacy','terms'])if(out.links[k]&&!/^https:\/\//.test(out.links[k]))throw Object.assign(Error('links'),{status:400})}
 if(p.checklist!==undefined){out.checklist={};for(const [k,v] of Object.entries(p.checklist||{}).slice(0,30))if(/^[a-z-]{2,30}$/.test(k))out.checklist[k]=v===true}
 if(p.banner!==undefined){if(p.banner===null)out.banner=null;else{const b=p.banner,banner={vi:str(b.vi,400),en:str(b.en,400),severity:b.severity==='warning'?'warning':'info',start:b.start&&!isNaN(Date.parse(b.start))?new Date(b.start).toISOString():null,end:b.end&&!isNaN(Date.parse(b.end))?new Date(b.end).toISOString():null,audience:['all','account','device-only'].includes(b.audience)?b.audience:'all',id:randomBytes(4).toString('hex')};if(!banner.vi||!banner.en)throw Object.assign(Error('Banner needs VI and EN text'),{status:400});out.banner=banner}}
 return out}
export async function saveSettings(getStoreFn:any,patch:any){const store=studioStore(getStoreFn);const next=await editRecord(store,'settings/platform',(cur:any)=>{const base=cur||{};return{...base,...patch,flags:{...(base.flags||{}),...(patch.flags||{})},updatedAt:new Date().toISOString()}});settingsCache=null;return next}
export function activeBanner(values:any,now=Date.now()){const b=values?.banner;if(!b||!b.vi)return null;if(b.start&&Date.parse(b.start)>now)return null;if(b.end&&Date.parse(b.end)<=now)return null;return b}
/** Hook for register: returns {allowed,reason}. invite = parsed invite input or null. */
export async function signupPolicy(getStoreFn:any,{invite=null,env=process.env}:any={}){try{const s=(await platformSettings(getStoreFn,{env})).values.signups;if(s==='closed')return{allowed:false,reason:'closed'};if(s==='invite-only'&&!invite)return{allowed:false,reason:'invite-only'};return{allowed:true,reason:s}}catch{return{allowed:true,reason:'unknown'}}}
/** Hook for login/resolveAccount. */
export const isAccountDisabled=(account:any)=>account?.disabled===true;
export async function familyFlags(getStoreFn:any,id:string){try{return await studioStore(getStoreFn).get('family-flags/'+id,{type:'json'})||{}}catch{return{}}}
/** Hook for family writes: true when the owner console suspended the family (read-only). */
export async function isFamilySuspended(getStoreFn:any,id:string){return (await familyFlags(getStoreFn,id)).suspended===true}
/** Effective limits for a family: per-family override, else platform setting. */
export async function familyLimits(getStoreFn:any,id:string,env:any=process.env){const [s,f]=await Promise.all([platformSettings(getStoreFn,{env}),familyFlags(getStoreFn,id)]);return{maxMembers:f.limits?.maxMembers||s.values.maxMembersPerFamily,maxDevices:f.limits?.maxDevices||s.values.maxDevicesPerFamily,maxStorageMB:f.limits?.maxStorageMB||null}}

// ---------- password re-confirm (same scrypt parameters as account sign-in) ----------
export async function verifyPassword(password:any,record:any){if(typeof password!=='string'||!password||password.length>128||!record?.salt||!record?.key)return false;const key=await derive(password,record.salt,64,{N:131072,r:8,p:1,maxmem:160*1024*1024}) as Buffer;const want=Buffer.from(record.key,'hex');return want.length===key.length&&timingSafeEqual(key,want)}
export const csrfFor=(sessionKey:string)=>sha256('studio-csrf:'+sessionKey).slice(0,40);
export const newRecoveryCode=()=>{const code=randomBytes(24).toString('base64url');return{code,hash:sha256(code)}};
export const newEpoch=()=>randomUUID();

// ---------- data collection ----------
const SESSION_LIFE=(trusted:boolean)=>trusted?30*DAY:8*3600000;
export async function collectAccounts(getStoreFn:any,now=Date.now()){
 const store=accountStore(getStoreFn),users:any[]=[],sessions:any[]=[],families:any[]=[];
 for await(const k of listKeys(store,'users/')){const u=await readJSON(store,k);if(u?.username)users.push(u)}
 for await(const k of listKeys(store,'sessions/')){const s=await readJSON(store,k);if(s?.username)sessions.push({...s,key:k,started:s.expires-SESSION_LIFE(s.trusted===true)})}
 for await(const k of listKeys(store,'families/')){const f=await readJSON(store,k);if(f?.id)families.push(f)}
 const byUser=new Map(users.map(u=>[u.username,u])),live=sessions.filter(s=>s.expires>now&&byUser.get(s.username)?.epoch===s.epoch);
 return{store,users,sessions,live,families,byUser};
}
export async function scanFamily(getStoreFn:any,family:any,{withState=true,photoSample=40}:any={}){
 const root=familyDataStore(getStoreFn),prefix='households/'+family.id+'/',out:any={id:family.id,stateBytes:0,photos:0,photoBytes:0,photoSampled:0,devices:[],alerts:[],pushKeys:false,revision:null,members:0,recipes:{total:0,family:0,catalog:0},counts:{},preferences:null,observations:0};
 const photoKeys:string[]=[],deviceKeys:string[]=[],alertKeys:string[]=[];
 for await(const k of listKeys(root,prefix)){const rest=k.slice(prefix.length);if(rest.startsWith('receipt-photo/'))photoKeys.push(k);else if(rest.startsWith('push/subscriptions/'))deviceKeys.push(k);else if(rest.startsWith('family-alert/'))alertKeys.push(k);else if(rest==='push/vapid-keys')out.pushKeys=true}
 out.photos=photoKeys.length;for(const k of photoKeys.slice(0,photoSample)){out.photoBytes+=(await readSize(root,k,'arrayBuffer')).bytes;out.photoSampled++}if(out.photoSampled&&out.photos>out.photoSampled)out.photoBytes=Math.round(out.photoBytes/out.photoSampled*out.photos);
 for(const k of deviceKeys){const d=await readJSON(root,k);if(d)out.devices.push({deviceId:String(d.deviceId||'').slice(-6),platform:platformFromEndpoint(d.subscription?.endpoint),endpoint:maskEndpoint(d.subscription?.endpoint),account:d.accountUsername||null,linked:!!d.accountUsername&&family.members?.[d.accountUsername]?.memberId===d.memberId,language:d.language||'vi',role:d.role||'both',typesOn:Object.values(d.types||{}).filter(Boolean).length,urgentBypass:d.urgentBypass===true,quiet:(d.quietStart||'21:00')+'–'+(d.quietEnd||'07:00')})}
 for(const k of alertKeys.slice(0,300)){const a=await readJSON(root,k);if(a)out.alerts.push({day:String(a.createdAt||'').slice(0,10),pushStatus:a.pushStatus||'unknown',accepted:a.pushAccepted||0,targets:(a.targets||[]).length})}
 if(withState){try{const row=await root.getWithMetadata(prefix+'state',{type:'json'});if(row?.data){const st=row.data;out.revision=row.etag?String(row.etag).slice(-8):null;out.stateBytes=Buffer.byteLength(JSON.stringify(st));out.members=(st.members||[]).length;const recipes=Array.isArray(st.recipes)?st.recipes:[];out.recipes={total:recipes.length,family:recipes.filter((r:any)=>r?.custom===true).length,catalog:recipes.filter((r:any)=>r?.custom!==true).length};out.counts={weeks:Object.keys(st.weeks||{}).length,pantry:(st.pantry||[]).length,receipts:(st.receipts||[]).length,errands:(st.errands||[]).length};const p=st.preferences||{};out.preferences={timezone:p.timezone||'Australia/Sydney',currency:p.currency||'AUD',attendanceTime:p.attendanceTime||'10:30',prepReminderTime:p.prepReminderTime||'17:00',shoppingReminderTime:p.shoppingReminderTime||'09:00'}}}catch{}}
 for(const [store,key] of [[root,'grocery/'+family.id+'/observations.json'],[root,prefix+'grocery/observations.json']] as const){const o=await readJSON(store,key);if(o){out.observations+=Array.isArray(o)?o.length:Array.isArray(o.observations)?o.observations.length:0}}
 return out;
}
export async function computeOverview(getStoreFn:any,now=Date.now()){
 const {users,live,sessions,families}=await collectAccounts(getStoreFn,now),studio=studioStore(getStoreFn);
 const lastSeen=new Map<string,number>();for(const s of sessions)if(s.started<=now)lastSeen.set(s.username,Math.max(lastSeen.get(s.username)||0,s.started));
 const active=(d:number)=>users.filter(u=>(lastSeen.get(u.username)||0)>=now-d*DAY).length;
 const signups:number[]=Array(30).fill(0);for(const u of users){const t=Date.parse(u.createdAt||'');if(t){const i=29-Math.floor((Date.parse(dayKey(now))-Date.parse(dayKey(t)))/DAY);if(i>=0&&i<30)signups[i]++}}
 const sizes={'1':0,'2':0,'3-4':0,'5+':0} as any,perFamily:any={};let memberProfiles=0,stateBytes=0,photoBytes=0,photos=0,devices=0,recipesFamily=0,recipesCatalog=0,observations=0,invOut=0,invExpired=0,alertsTotal=0,alertsFailed=0;const platforms:any={},alertsByDay:any={};
 for(const f of families){const n=Object.keys(f.members||{}).length;sizes[n<=1?'1':n===2?'2':n<=4?'3-4':'5+']++;const scan=await scanFamily(getStoreFn,f);const sync=await readJSON(studio,'sync/'+f.id);perFamily[f.id]={...scan,sync:sync||null,devices:scan.devices.length,deviceRows:scan.devices,alerts:undefined,alertRows:scan.alerts};memberProfiles+=scan.members;stateBytes+=scan.stateBytes;photoBytes+=scan.photoBytes;photos+=scan.photos;devices+=scan.devices.length;recipesFamily+=scan.recipes.family;recipesCatalog+=scan.recipes.catalog;observations+=scan.observations;for(const d of scan.devices)platforms[d.platform]=(platforms[d.platform]||0)+1;for(const a of scan.alerts){alertsTotal++;if(a.pushStatus==='not_sent')alertsFailed++;alertsByDay[a.day]=(alertsByDay[a.day]||0)+1}for(const i of Object.values(f.invites||{}) as any[])i.expires>now?invOut++:invExpired++}
 const ev=await listLog(getStoreFn,'events',{now,limit:2000,from:dayKey(now-29*DAY)}),evCount=(t:string)=>ev.items.filter((e:any)=>e.type===t).length;
 return{computedAt:new Date(now).toISOString(),totals:{accounts:users.length,disabled:users.filter(u=>u.disabled).length,families:families.length,accountMembers:families.reduce((n,f)=>n+Object.keys(f.members||{}).length,0),memberProfiles,liveSessions:live.length,active1:active(1),active7:active(7),active30:active(30),signups30:signups.reduce((a,b)=>a+b,0),stateBytes,photoBytes,photos,storageBytes:stateBytes+photoBytes,pushDevices:devices,invitesOutstanding:invOut,invitesExpired:invExpired,invitesCreated30:evCount('invite_created'),invitesAccepted30:evCount('invite_accepted'),recipesFamily,recipesCatalog,priceObservations:observations,alerts:alertsTotal,alertsFailed,events30:ev.items.length},signupsDaily:signups,familySizes:sizes,platforms,alertsByDay,perFamily};
}
export async function overview(getStoreFn:any,{fresh=false,now=Date.now()}:any={}){const store=studioStore(getStoreFn);if(!fresh){const c=await readJSON(store,'cache/overview');if(c?.computedAt&&now-Date.parse(c.computedAt)<OVERVIEW_TTL)return c}const o=await computeOverview(getStoreFn,now);try{await store.setJSON('cache/overview',o)}catch{}return o}
export async function invalidateOverview(getStoreFn:any){try{await studioStore(getStoreFn).delete('cache/overview')}catch{}}
export async function storageProbe(getStoreFn:any){const store=studioStore(getStoreFn),key='probe/'+randomBytes(6).toString('hex'),t=Date.now();try{await store.setJSON(key,{t});const r=await store.get(key,{type:'json'});await store.delete(key);return{ok:r?.t===t,ms:Date.now()-t}}catch{return{ok:false,ms:Date.now()-t}}}
