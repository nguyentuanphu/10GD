// FamTray Scout network: device registry, task planner + lease queue, results
// ingest, health / parser-breakage detection and the network kill switches.
//
// Owner guardrails enforced HERE (server side), in addition to the extension:
//  - `autoScout` (default 'off'): every task request is refused while it is off;
//    global pause and per-device pause refuse tasks too; a device must be allowed in
//    Studio (autoAllowed) AND have Auto switched on locally before it gets tasks.
//  - Tasks are only handed out inside the device's schedule windows (default
//    Wed 06:30–09:00, Sat 06:30–08:00 device-local time).
//  - Caps: per-device pages per run (default 150) and per day, per-retailer pages per
//    day across the whole network. Pacing sent to devices is never below 20 s.
//  - A blocked/challenge report pauses that device for 24 h and releases its leases;
//    two devices blocked on one retailer in a day pause that retailer network-wide.
//  - Parser breakage (success rate below threshold) auto-pauses the retailer.
//  - Facts only: the server whitelists fact fields again and drops everything else.
//  - robots policy is fixed to 'respect' (devices skip disallowed paths and report).
//
// Storage: own store `bep-scout`. Key scheme (all JSON):
//   settings/network                       network settings (kill switches, caps, schedule…)
//   config/override                        optional parser config override (data only)
//   pair/<sha256(code)>                    one-time 8-char pairing code {username,expires}
//   tokens/<sha256(token)>                 {deviceId}; the raw token is never stored
//   devices/<deviceId>                     device record (owner account, stores, caps, pause…)
//   roles/trusted                          {users:{username:{by,at}}}
//   plan/<day>                             planner marker {signature,count}
//   tasks/<day>/<taskId>                   task + lease {status,leasedBy,leaseUntil,attempts}
//   count/<day>/retailer/<retailer>        daily counters (leased, pages, prices, parse, blocked)
//   count/<day>/device/<deviceId>          daily device counters (+ runs{runId:n})
//   health/<retailer>                      rolling parse outcomes + pause state
//   obs/<day>/<retailer>/<factKey>         cross-device consensus record
//   events/<day>/<ms>-<type>-<rand>        append-only network event log (onlyIfNew)
//   rate/<hash>:<minute>                   short-lived rate counters
// Writes that can race use editRecord (onlyIfMatch / onlyIfNew with retries).
// <day> is the Australia/Sydney calendar day.
import {randomBytes,createHash} from 'node:crypto';
import {editRecord} from './accounts.mjs';
import {scoutStore,createDefaultAdapter} from './scout-adapter.mjs';
import {scoutDefaultConfig} from './scout-config.mjs';
import {platformSettings,saveSettings} from './studio.mjs';
export {scoutStore,createDefaultAdapter};
const DAY=86400000,MIN=60000;
export const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
export const RETAILERS=['woolworths','coles','aldi','chemist','amazon'];
export const RETAILER_LABELS:any={woolworths:'Woolworths',coles:'Coles',aldi:'ALDI',chemist:'Chemist Warehouse',amazon:'Amazon AU'};
const PROMOS=['half-price','special','special-buy','price-drop','multibuy','deal','clearance'];
const BASIS_MAX:any={per_kg:2000,per_100g:200,per_L:1000,per_100mL:100,per_each:2000,per_wash:20,per_roll:20,per_sheet:5};
export const dayKey=(ms:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
const sydneyDow=(ms:number)=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:'Australia/Sydney',weekday:'short'}).format(new Date(ms)));
const fail=(vi:string,en:string,status=400,code?:string):never=>{throw Object.assign(Error(vi),{status,en,code})};
const clean=(s:any,max=200)=>typeof s==='string'?s.replace(/\s+/g,' ').trim().slice(0,max):'';
const normLabel=(s:any)=>clean(String(s||''),80).toLowerCase().replace(/^(your\s+store|my\s+store|store|shopping at|pick up from|deliver(?:y|ing)? to)\s*[:\-]?\s*/i,'').replace(/[^a-z0-9]+/g,' ').trim();
export const storeMatches=(seen:any,assigned:any)=>{const a=normLabel(assigned),s=normLabel(seen);if(!a)return true;if(!s)return false;return s===a||s.includes(a)||a.includes(s)};
async function* keys(store:any,prefix:string){for await(const page of store.list({prefix,paginate:true}))for(const b of page.blobs)yield b.key as string}
async function readJSON(store:any,key:string){try{return await store.get(key,{type:'json'})}catch{return null}}

// ---------- schedule (same rules as extension/src/scout-core.ts) ----------
export const DEFAULT_SCHEDULE=[{days:[3],start:'06:30',end:'09:00'},{days:[6],start:'06:30',end:'08:00'}];
const hm=(s:string)=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(s||''));return m?+m[1]*60+ +m[2]:NaN};
export function validSchedule(w:any){return Array.isArray(w)&&w.length<=14&&w.every((x:any)=>x&&Array.isArray(x.days)&&x.days.length>=1&&x.days.every((d:any)=>Number.isInteger(d)&&d>=0&&d<=6)&&hm(x.start)>=0&&hm(x.end)>hm(x.start)&&hm(x.end)<=1440)}
function localParts(ms:number,timeZone?:string){let tz=timeZone||'Australia/Sydney';try{new Intl.DateTimeFormat('en-US',{timeZone:tz})}catch{tz='Australia/Sydney'}const p:any={};for(const x of new Intl.DateTimeFormat('en-US',{timeZone:tz,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)))p[x.type]=x.value;return{day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),minutes:+p.hour*60+ +p.minute}}
export function inWindow(ms:number,windows:any=DEFAULT_SCHEDULE,timeZone?:string){if(!validSchedule(windows))return false;const {day,minutes}=localParts(ms,timeZone);return windows.some((w:any)=>w.days.includes(day)&&minutes>=hm(w.start)&&minutes<hm(w.end))}

// ---------- network settings ----------
export const NETWORK_DEFAULTS={autoScout:'off',semiAuto:'on',paused:false,robots:'respect',
 caps:{devicePagesPerRun:150,devicePagesPerDay:300,retailerPagesPerDay:{woolworths:600,coles:600,aldi:300,chemist:300,amazon:200} as any},
 schedule:DEFAULT_SCHEDULE,pacing:{minMs:20000,maxMs:40000},parser:{minSamples:20,minSuccess:0.5},leaseMinutes:8,
 specials:null as any,maxDevicesPerAccount:5,
 // v1.7: one-click install links shown in My kitchen once Henry publishes the extension.
 install:{chrome:null,edge:null} as {chrome:string|null,edge:string|null}};
/** Extension id pinned by the `key` in extension/manifest.json (unpacked/zip installs).
 *  A Web Store / Edge Add-ons build gets its own id: add it to SCOUT_EXTENSION_IDS. */
export const BUNDLED_EXTENSION_ID='mjeoekikdicoojgoppnfibjbfpcfngja';
const STORE_HOSTS:any={chrome:{hosts:['chromewebstore.google.com','chrome.google.com'],path:/^\/(webstore\/)?detail\//},edge:{hosts:['microsoftedge.microsoft.com'],path:/^\/addons\/detail\//}};
/** A Chrome Web Store or Edge Add-ons listing URL (https, store host, /detail/ path). */
export function validStoreUrl(u:any,kind:'chrome'|'edge'){try{const url=new URL(String(u));const k=STORE_HOSTS[kind];return url.protocol==='https:'&&!url.username&&!url.password&&k.hosts.includes(url.hostname)&&k.path.test(url.pathname)&&url.href.length<=300}catch{return false}}
const envIds=(env:any)=>String(env?.SCOUT_EXTENSION_IDS||'').split(',').map((x:string)=>x.trim()).filter((x:string)=>/^[a-p]{32}$/.test(x));
/** Public, non-secret install info for the app page (scout?op=public): which extension
 *  ids to ping, and the store links when configured (env SCOUT_STORE_URL /
 *  SCOUT_EDGE_STORE_URL win over the Studio setting). */
export function publicInstallInfo(settings:any,env:any=process.env){
 const pick=(kind:'chrome'|'edge',envKey:string)=>validStoreUrl(env?.[envKey],kind)?String(env[envKey]):validStoreUrl(settings?.install?.[kind],kind)?String(settings.install[kind]):null;
 return {extensionIds:[...new Set([BUNDLED_EXTENSION_ID,...envIds(env)])],storeUrl:pick('chrome','SCOUT_STORE_URL'),edgeStoreUrl:pick('edge','SCOUT_EDGE_STORE_URL')}}
const intIn=(v:any,a:number,b:number)=>Number.isInteger(v)&&v>=a&&v<=b;
export function validateNetworkPatch(p:any,config:any=scoutDefaultConfig){const out:any={},bad=(k:string)=>fail('Giá trị không hợp lệ: '+k,'Invalid value: '+k);if(!p||typeof p!=='object')bad('body');
 for(const k of ['autoScout','semiAuto'])if(p[k]!==undefined){if(!['on','off'].includes(p[k]))bad(k);out[k]=p[k]}
 if(p.paused!==undefined){if(typeof p.paused!=='boolean')bad('paused');out.paused=p.paused}
 if(p.robots!==undefined&&p.robots!=='respect')bad('robots');
 if(p.caps!==undefined){const c=p.caps||{},o:any={};if(c.devicePagesPerRun!==undefined){if(!intIn(c.devicePagesPerRun,1,200))bad('devicePagesPerRun');o.devicePagesPerRun=c.devicePagesPerRun}if(c.devicePagesPerDay!==undefined){if(!intIn(c.devicePagesPerDay,1,600))bad('devicePagesPerDay');o.devicePagesPerDay=c.devicePagesPerDay}if(c.retailerPagesPerDay!==undefined){o.retailerPagesPerDay={};for(const [r,v] of Object.entries<any>(c.retailerPagesPerDay||{})){if(!RETAILERS.includes(r)||!intIn(v,0,3000))bad('retailerPagesPerDay.'+r);o.retailerPagesPerDay[r]=v}}out.caps=o}
 if(p.schedule!==undefined){if(!validSchedule(p.schedule))bad('schedule');out.schedule=p.schedule.map((w:any)=>({days:[...new Set(w.days)].sort(),start:w.start,end:w.end}))}
 if(p.pacing!==undefined){const a=p.pacing?.minMs,b=p.pacing?.maxMs;if(!intIn(a,20000,120000)||!intIn(b,a,180000))bad('pacing');out.pacing={minMs:a,maxMs:b}}
 if(p.parser!==undefined){const s=p.parser?.minSamples,r=p.parser?.minSuccess;if(!intIn(s,5,200)||typeof r!=='number'||r<0.1||r>0.95)bad('parser');out.parser={minSamples:s,minSuccess:r}}
 if(p.install!==undefined){const o:any={};for(const k of ['chrome','edge'] as const){const v=p.install?.[k];if(v===undefined)continue;if(v===null||v==='')o[k]=null;else{if(!validStoreUrl(v,k))bad('install.'+k);o[k]=String(v)}}out.install=o}
 if(p.maxDevicesPerAccount!==undefined){if(!intIn(p.maxDevicesPerAccount,1,50))bad('maxDevicesPerAccount');out.maxDevicesPerAccount=p.maxDevicesPerAccount}
 if(p.specials!==undefined){if(p.specials===null)out.specials=null;else{out.specials={};for(const [r,list] of Object.entries<any>(p.specials||{})){if(!RETAILERS.includes(r)||!Array.isArray(list)||list.length>5)bad('specials.'+r);out.specials[r]=list.map((u:any)=>{if(!validRetailerUrl(u,r,config))bad('specials.'+r);return String(u)})}}}
 return out}
export function validRetailerUrl(u:any,retailer:string,config:any=scoutDefaultConfig){try{const url=new URL(String(u));const hosts=config?.retailers?.[retailer]?.hosts||[];return url.protocol==='https:'&&hosts.includes(url.hostname)}catch{return false}}
/** Studio platform setting `flags.autoScout` (Studio → Settings, off by default). Returns
 *  'on' | 'off', or null while it has never been set (then the Scout store value applies). */
export async function platformAutoScout(getStoreFn:any,env:any=process.env){try{const s=await platformSettings(getStoreFn,{env});const src=s.sources?.['flags.autoScout'];if(!src||src==='default')return null;return s.values.flags.autoScout===true?'on':'off'}catch{return null}}
/** Network settings. autoScout precedence: env SCOUT_AUTO=on|off → Studio platform setting
 *  flags.autoScout → this store (settings/network) → default 'off'. */
export async function networkSettings(getStoreFn:any,env:any=process.env){
 const stored=await readJSON(scoutStore(getStoreFn),'settings/network')||{},v:any=structuredClone(NETWORK_DEFAULTS);
 for(const k of Object.keys(v)){if(stored[k]===undefined)continue;if(k==='caps')v.caps={...v.caps,...stored.caps,retailerPagesPerDay:{...v.caps.retailerPagesPerDay,...(stored.caps?.retailerPagesPerDay||{})}};else if(k==='install')v.install={...v.install,...stored.install};else v[k]=stored[k]}
 const plat=await platformAutoScout(getStoreFn,env);if(plat)v.autoScout=plat;v.autoScoutSource=plat?'platform':stored.autoScout!==undefined?'scout':'default';
 const envAuto=String(env?.SCOUT_AUTO||'').toLowerCase();if(['on','off'].includes(envAuto)){v.autoScout=envAuto;v.autoScoutSource='env'}
 v.robots='respect';v.updatedAt=stored.updatedAt||null;v.updatedBy=stored.updatedBy||null;return v}
/** Saves network settings; an autoScout change is also written to the Studio platform
 *  setting so Studio → Settings and the Scout page always agree. */
export async function saveNetwork(getStoreFn:any,patch:any,actor:string,now:number){if(patch?.autoScout==='on'||patch?.autoScout==='off')await saveSettings(getStoreFn,{flags:{autoScout:patch.autoScout==='on'}});return editRecord(scoutStore(getStoreFn),'settings/network',(cur:any)=>{const b=cur||{};return{...b,...patch,...(patch.install?{install:{...(b.install||{}),...patch.install}}:{}),...(patch.caps?{caps:{...(b.caps||{}),...patch.caps,retailerPagesPerDay:{...(b.caps?.retailerPagesPerDay||{}),...(patch.caps.retailerPagesPerDay||{})}}}:{}),updatedAt:new Date(now).toISOString(),updatedBy:actor}})}
export async function scoutConfig(getStoreFn:any){const o=await readJSON(scoutStore(getStoreFn),'config/override');return o?.config?.retailers?o.config:scoutDefaultConfig}
export function validateConfig(c:any){if(!c||typeof c!=='object'||typeof c.version!=='string'||!/^[\w.-]{1,40}$/.test(c.version)||!c.retailers||typeof c.retailers!=='object')fail('Cấu hình không hợp lệ.','Invalid config.');if(JSON.stringify(c).length>120000)fail('Cấu hình quá lớn.','Config too large.',413);for(const [r,x] of Object.entries<any>(c.retailers)){if(!RETAILERS.includes(r)||!Array.isArray(x.hosts))fail('Cấu hình không hợp lệ: '+r,'Invalid config: '+r)}
 // Data only: every regex string must compile; no functions can exist in JSON.
 const walk=(v:any,k='')=>{if(typeof v==='string'&&/(^|\.)(re|path|productIdFromUrl|promoEndRe)$/.test(k))try{new RegExp(v)}catch{fail('Biểu thức không hợp lệ: '+k,'Invalid pattern: '+k)}if(v&&typeof v==='object')for(const [kk,vv] of Object.entries(v))walk(vv,kk)};walk(c);return c}

// ---------- events ----------
export async function logEvent(getStoreFn:any,type:string,data:any={},now=Date.now()){try{const t=String(type).replace(/[^a-z0-9_]/gi,'').slice(0,40);await scoutStore(getStoreFn).setJSON(`events/${dayKey(now)}/${String(now).padStart(13,'0')}-${t}-${randomBytes(3).toString('hex')}`,{type:t,at:new Date(now).toISOString(),...data},{onlyIfNew:true})}catch{}}
export async function listEvents(getStoreFn:any,{days=7,limit=100,now=Date.now()}:any={}){const store=scoutStore(getStoreFn),out:any[]=[];for(let d=0;d<days&&out.length<limit;d++){const ks:string[]=[];for await(const k of keys(store,'events/'+dayKey(now-d*DAY)+'/'))ks.push(k);ks.sort().reverse();for(const k of ks){if(out.length>=limit)break;const r=await readJSON(store,k);if(r)out.push(r)}}return out}

// ---------- rate limiting ----------
export async function rate(getStoreFn:any,who:string,max:number,now:number){const key=`rate/${sha(who).slice(0,24)}:${Math.floor(now/MIN)}`;await editRecord(scoutStore(getStoreFn),key,(n:any)=>{if((n?.count||0)>=max)fail('Quá nhiều yêu cầu. Chờ một phút.','Too many requests. Wait a minute.',429,'rate');return{count:(n?.count||0)+1,expires:now+2*MIN}})}

// ---------- trusted scouts ----------
const adminNames=(env:any)=>String(env?.STUDIO_ADMINS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
export async function trustedList(getStoreFn:any){return (await readJSON(scoutStore(getStoreFn),'roles/trusted'))?.users||{}}
export async function isTrusted(getStoreFn:any,username:string,env:any=process.env){const u=String(username||'').toLowerCase();if(adminNames(env).includes(u))return true;return !!(await trustedList(getStoreFn))[u]}
export async function setTrusted(getStoreFn:any,username:string,grant:boolean,actor:string,now:number){if(!/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(String(username||'')))fail('Tên tài khoản không hợp lệ.','Invalid username.');return editRecord(scoutStore(getStoreFn),'roles/trusted',(cur:any)=>{const users={...(cur?.users||{})};if(grant)users[username]={by:actor,at:new Date(now).toISOString()};else delete users[username];return{users}})}

// ---------- pairing / devices ----------
const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const normCode=(c:any)=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export async function createPairCode(getStoreFn:any,username:string,now:number,env:any=process.env){
 const s=await networkSettings(getStoreFn,env),mine=(await listDevices(getStoreFn)).filter(d=>d.owner===username&&!d.revokedAt);const max=adminNames(env).includes(username)?Math.max(20,s.maxDevicesPerAccount):s.maxDevicesPerAccount;
 if(mine.length>=max)fail('Đã đạt số máy tối đa cho tài khoản này.','This account already has the maximum number of scout devices.',409,'device-limit');
 const bytes=randomBytes(8);let code='';for(const b of bytes)code+=CODE_ALPHABET[b%32];
 const expires=now+15*MIN;await scoutStore(getStoreFn).setJSON('pair/'+sha('scout-pair:'+code),{username,expires,createdAt:new Date(now).toISOString()},{onlyIfNew:true});
 return{code,expires:new Date(expires).toISOString()}}
export async function pairDevice(getStoreFn:any,body:any,now:number){
 const code=normCode(body?.code);if(code.length!==8)fail('Mã ghép nối gồm 8 ký tự.','The pairing code has 8 characters.',400,'bad-code');
 const store=scoutStore(getStoreFn),key='pair/'+sha('scout-pair:'+code),rec=await readJSON(store,key);
 if(!rec||rec.expires<=now)fail('Mã ghép nối sai hoặc đã hết hạn.','The pairing code is wrong or expired.',400,'bad-code');
 await store.delete(key);// one-time
 const id='dev-'+randomBytes(6).toString('hex'),token=randomBytes(32).toString('base64url'),tokenHash=sha('scout-token:'+token);
 const device={id,owner:rec.username,name:clean(body?.name,40)||'Chrome',postcode:/^\d{4}$/.test(String(body?.postcode||''))?String(body.postcode):null,suburb:clean(body?.suburb,40)||null,timeZone:validTz(body?.timeZone),stores:cleanStores(body?.stores),schedule:null,caps:{},autoAllowed:false,pausedUntil:null,pauseReason:null,createdAt:new Date(now).toISOString(),revokedAt:null,tokenHash,client:{version:clean(body?.version,20)||null},lastHeartbeat:null,lastRunAt:null,totals:{pages:0,prices:0,parseFail:0,blocked:0}};
 await store.setJSON('devices/'+id,device,{onlyIfNew:true});await store.setJSON('tokens/'+tokenHash,{deviceId:id},{onlyIfNew:true});
 await logEvent(getStoreFn,'device_paired',{deviceId:id,account:rec.username},now);
 return{device,token}}
const validTz=(tz:any)=>{try{if(typeof tz==='string'&&tz.length<60){new Intl.DateTimeFormat('en-US',{timeZone:tz});return tz}}catch{}return 'Australia/Sydney'};
export function cleanStores(s:any){const out:any={};for(const r of RETAILERS){const v=clean(s?.[r],60);if(v)out[r]=v}return out}
export async function deviceFromRequest(getStoreFn:any,request:Request){
 const m=/^Bearer\s+([\w-]{43})$/.exec(request.headers.get('authorization')||'');if(!m)fail('Thiếu mã thiết bị.','Missing device token.',401,'no-token');
 const store=scoutStore(getStoreFn),idx=await readJSON(store,'tokens/'+sha('scout-token:'+m![1]));if(!idx?.deviceId)fail('Thiết bị chưa ghép nối hoặc đã bị thu hồi.','Device not paired or revoked.',401,'revoked');
 const d=await readJSON(store,'devices/'+idx.deviceId);if(!d||d.revokedAt)fail('Thiết bị đã bị thu hồi.','Device revoked.',401,'revoked');return d}
export async function listDevices(getStoreFn:any){const store=scoutStore(getStoreFn),out:any[]=[];for await(const k of keys(store,'devices/')){const d=await readJSON(store,k);if(d?.id)out.push(d)}return out}
export async function getDevice(getStoreFn:any,id:any){if(!/^dev-[a-f0-9]{12}$/.test(String(id||'')))fail('Mã thiết bị không hợp lệ.','Invalid device id.');const d=await readJSON(scoutStore(getStoreFn),'devices/'+id);if(!d)fail('Không tìm thấy thiết bị.','Device not found.',404);return d}
export async function editDevice(getStoreFn:any,id:string,fn:(d:any)=>any){return editRecord(scoutStore(getStoreFn),'devices/'+id,(d:any)=>d?fn(d):undefined)}
export async function revokeDevice(getStoreFn:any,id:string,actor:string,now:number){const d=await getDevice(getStoreFn,id),store=scoutStore(getStoreFn);await store.delete('tokens/'+d.tokenHash);await editDevice(getStoreFn,id,x=>({...x,revokedAt:new Date(now).toISOString(),revokedBy:actor}));await releaseDeviceLeases(getStoreFn,id,now);await logEvent(getStoreFn,'device_revoked',{deviceId:id,by:actor},now);return true}
export function effectiveCaps(device:any,s:any){const c=device?.caps||{};return{pagesPerRun:Math.min(s.caps.devicePagesPerRun,c.pagesPerRun||Infinity),pagesPerDay:Math.min(s.caps.devicePagesPerDay,c.pagesPerDay||Infinity)}}
export async function deviceView(getStoreFn:any,d:any,s:any,now:number,env:any=process.env){
 const health=await retailerHealth(getStoreFn),paused:any={};for(const r of RETAILERS){const h=health[r];if(retailerPaused(h,now))paused[r]=h.reason||'paused'}
 const cfg=await scoutConfig(getStoreFn);
 return{id:d.id,name:d.name,owner:d.owner,postcode:d.postcode,suburb:d.suburb,timeZone:d.timeZone,stores:d.stores||{},schedule:d.schedule||s.schedule,scheduleSource:d.schedule?'device':'network',caps:effectiveCaps(d,s),autoAllowed:d.autoAllowed===true,paused:d.pausedUntil&&d.pausedUntil>now?{until:new Date(d.pausedUntil).toISOString(),reason:d.pauseReason||'paused'}:null,trusted:await isTrusted(getStoreFn,d.owner,env),
  network:{autoScout:s.autoScout,semiAuto:s.semiAuto,paused:s.paused,robots:'respect',pacing:{minMs:Math.max(20000,s.pacing.minMs),maxMs:Math.max(Math.max(20000,s.pacing.minMs),s.pacing.maxMs)}},retailerPaused:paused,configVersion:cfg?.version||null,inWindow:inWindow(now,d.schedule||s.schedule,d.timeZone)}}

// ---------- health ----------
export async function retailerHealth(getStoreFn:any){const store=scoutStore(getStoreFn),out:any={};for(const r of RETAILERS)out[r]=await readJSON(store,'health/'+r)||{recent:[],paused:false};return out}
export const retailerPaused=(h:any,now:number)=>!!h?.paused&&(!h.until||h.until>now);
async function recordParse(getStoreFn:any,retailer:string,ok:boolean,s:any,now:number){let tripped=false;
 await editRecord(scoutStore(getStoreFn),'health/'+retailer,(h:any)=>{const recent=[...(h?.recent||[]),ok?1:0].slice(-Math.max(40,s.parser.minSamples));const next:any={...(h||{}),recent,lastAt:new Date(now).toISOString()};
  const rate=recent.reduce((a,b)=>a+b,0)/recent.length;next.successRate=Math.round(rate*100)/100;
  if(!retailerPaused(h,now)&&recent.length>=s.parser.minSamples&&rate<s.parser.minSuccess){next.paused=true;next.until=null;next.reason='parser-breakage';next.pausedAt=new Date(now).toISOString();tripped=true}return next});
 if(tripped)await logEvent(getStoreFn,'parser_breakage',{retailer,alert:true},now);return tripped}
export async function setRetailerPause(getStoreFn:any,retailer:string,paused:boolean,actor:string,now:number,{reason='manual',until=null}:any={}){if(!RETAILERS.includes(retailer))fail('Cửa hàng không hợp lệ.','Invalid retailer.');await editRecord(scoutStore(getStoreFn),'health/'+retailer,(h:any)=>paused?{...(h||{recent:[]}),paused:true,until,reason,pausedAt:new Date(now).toISOString(),pausedBy:actor}:{recent:[],paused:false,resumedAt:new Date(now).toISOString(),resumedBy:actor});await logEvent(getStoreFn,paused?'retailer_paused':'retailer_resumed',{retailer,by:actor,reason},now)}

// ---------- counters ----------
async function bump(getStoreFn:any,key:string,delta:any){return editRecord(scoutStore(getStoreFn),key,(c:any)=>{const n:any={...(c||{})};for(const [k,v] of Object.entries<any>(delta)){if(k==='runs'){n.runs={...(n.runs||{})};for(const [r,x] of Object.entries<any>(v))n.runs[r]=Math.max(0,(n.runs[r]||0)+x);const ks=Object.keys(n.runs);if(ks.length>8)for(const r of ks.slice(0,ks.length-8))delete n.runs[r]}else n[k]=Math.max(0,(n[k]||0)+v)}return n})}
export async function counters(getStoreFn:any,day:string){const store=scoutStore(getStoreFn),retailers:any={},devices:any={};for(const r of RETAILERS)retailers[r]=await readJSON(store,`count/${day}/retailer/${r}`)||{};for await(const k of keys(store,`count/${day}/device/`))devices[k.split('/').pop()!]=await readJSON(store,k)||{};return{retailers,devices}}

// ---------- planner ----------
const PRIORITY={specialsWed:100,wantedBase:60,stale:50,specials:30,rest:10};
const taskIdFor=(day:string,retailer:string,url:string,store:string)=>'t'+sha(day+'|'+retailer+'|'+url+'|'+normLabel(store)).slice(0,15);
function searchUrl(config:any,retailer:string,q:string){const t=config?.retailers?.[retailer]?.searchUrl;return t?String(t).replace('{q}',encodeURIComponent(q)):null}
/** Builds today's tasks once per (day, set of assigned stores). Idempotent: tasks are written with onlyIfNew. */
export async function ensurePlan(getStoreFn:any,{settings,now,adapter}:any){
 const day=dayKey(now),store=scoutStore(getStoreFn),config=await scoutConfig(getStoreFn);
 const devices=(await listDevices(getStoreFn)).filter(d=>!d.revokedAt&&d.autoAllowed===true),targets=new Map<string,{retailer:string,storeLabel:string}>();
 for(const d of devices)for(const [r,label] of Object.entries<any>(d.stores||{}))if(RETAILERS.includes(r)&&label)targets.set(r+'|'+normLabel(label),{retailer:r,storeLabel:label});
 const signature=sha([...targets.keys()].sort().join(',')+'|'+(config?.version||'')).slice(0,16),marker=await readJSON(store,'plan/'+day);
 if(marker?.signature===signature)return{planned:false,count:marker.count};
 const isWed=sydneyDow(now)===3,specialsCfg=settings.specials||{};
 const [wanted,mappings,seen,catalog]=await Promise.all([adapter.wantedItems({now}),adapter.productMappings(),adapter.lastSeen(),adapter.catalogItems()]);
 const staleBefore=dayKey(now-6*DAY),out:any[]=[];
 for(const {retailer,storeLabel} of targets.values()){
  const add=(t:any)=>{if(!t.url)return;out.push({...t,retailer,storeLabel,taskId:taskIdFor(day,retailer,t.url,storeLabel)})};
  for(const url of (specialsCfg[retailer]||config?.retailers?.[retailer]?.specials||[]))add({kind:'specials',url,itemId:null,priority:isWed?PRIORITY.specialsWed:PRIORITY.specials});
  const mapFor=(itemId:string)=>mappings.find((m:any)=>m.itemId===itemId&&m.retailer===retailer);
  const done=new Set<string>();
  for(const w of wanted){const m=mapFor(w.itemId),url=m?.productUrl||searchUrl(config,retailer,w.name||w.itemId);done.add(w.itemId);add({kind:'wanted',url,itemId:w.itemId,name:w.name||null,mapped:!!m,priority:PRIORITY.wantedBase+Math.min(30,Math.max(0,w.families|0))})}
  for(const m of mappings.filter((x:any)=>x.retailer===retailer&&!done.has(x.itemId))){const last=seen[m.itemId+'|'+retailer];done.add(m.itemId);add({kind:!last||last<staleBefore?'stale':'mapped',url:m.productUrl,itemId:m.itemId,name:m.name||null,mapped:true,priority:!last||last<staleBefore?PRIORITY.stale:PRIORITY.rest})}
  for(const c of catalog.filter((x:any)=>!done.has(x.itemId))){const last=seen[c.itemId+'|'+retailer];const stale=!last||last<staleBefore;add({kind:stale?'stale':'rest',url:searchUrl(config,retailer,c.name||c.itemId),itemId:c.itemId,name:c.name||null,mapped:false,priority:stale?PRIORITY.stale-5:PRIORITY.rest})}
 }
 let n=0;for(const t of out){const r=await store.setJSON(`tasks/${day}/${t.taskId}`,{...t,day,status:'queued',attempts:0,leasedBy:null,leaseUntil:null,createdAt:new Date(now).toISOString()},{onlyIfNew:true});if(r?.modified!==false)n++}
 await store.setJSON('plan/'+day,{signature,count:out.length,at:new Date(now).toISOString()});
 return{planned:true,count:out.length,created:n}}
export async function listTasks(getStoreFn:any,day:string){const store=scoutStore(getStoreFn),out:any[]=[];for await(const k of keys(store,`tasks/${day}/`)){const t=await readJSON(store,k);if(t)out.push(t)}return out}
export const taskOrder=(a:any,b:any)=>(b.priority-a.priority)||String(a.createdAt).localeCompare(String(b.createdAt))||a.taskId.localeCompare(b.taskId);

// ---------- leases ----------
export async function refusal(getStoreFn:any,device:any,s:any,body:any,now:number){
 if(s.autoScout!=='on')return 'auto-off';if(s.paused)return 'paused-global';if(device.autoAllowed!==true)return 'device-not-allowed';if(body?.autoEnabled!==true)return 'device-toggle-off';
 if(device.pausedUntil&&device.pausedUntil>now)return 'paused-device';if(!inWindow(now,device.schedule||s.schedule,device.timeZone))return 'outside-window';return null}
export async function leaseTasks(getStoreFn:any,{device,settings:s,runId,max=5,now,adapter}:any){
 const day=dayKey(now),store=scoutStore(getStoreFn);await ensurePlan(getStoreFn,{settings:s,now,adapter});
 const caps=effectiveCaps(device,s),dc=await readJSON(store,`count/${day}/device/${device.id}`)||{},runUsed=dc.runs?.[runId]||0;
 if(runUsed>=caps.pagesPerRun)return{tasks:[],stop:'cap-run'};if((dc.leased||0)>=caps.pagesPerDay)return{tasks:[],stop:'cap-day'};
 const room=Math.max(0,Math.min(10,max|0||5,caps.pagesPerRun-runUsed,caps.pagesPerDay-(dc.leased||0)));
 const health=await retailerHealth(getStoreFn),leaseMs=s.leaseMinutes*MIN,capped=new Set<string>(),leased:any[]=[];
 const eligible=(t:any)=>(t.status==='queued'||t.status==='leased'&&t.leaseUntil<=now)&&t.attempts<3&&device.stores?.[t.retailer]&&storeMatches(t.storeLabel,device.stores[t.retailer])&&!retailerPaused(health[t.retailer],now);
 const all=(await listTasks(getStoreFn,day)).filter(eligible).sort(taskOrder);
 for(const t of all){if(leased.length>=room)break;if(capped.has(t.retailer))continue;
  const cap=s.caps.retailerPagesPerDay[t.retailer]??0;let ok=true;
  await editRecord(store,`count/${day}/retailer/${t.retailer}`,(c:any)=>{if((c?.leased||0)>=cap){ok=false;return undefined}return{...(c||{}),leased:(c?.leased||0)+1}});
  if(!ok){capped.add(t.retailer);continue}
  let got:any=null;await editRecord(store,`tasks/${day}/${t.taskId}`,(cur:any)=>{if(!cur||!eligible(cur)){got=null;return undefined}got={...cur,status:'leased',leasedBy:device.id,leaseUntil:now+leaseMs,attempts:(cur.attempts||0)+1,leasedAt:new Date(now).toISOString(),runId};return got});
  if(!got){await bump(getStoreFn,`count/${day}/retailer/${t.retailer}`,{leased:-1});continue}
  leased.push(got)}
 if(leased.length)await bump(getStoreFn,`count/${day}/device/${device.id}`,{leased:leased.length,runs:{[runId]:leased.length}});
 return{tasks:leased.map(t=>({taskId:t.taskId,retailer:t.retailer,url:t.url,itemId:t.itemId,name:t.name||null,kind:t.kind,storeLabel:t.storeLabel,leaseUntil:new Date(t.leaseUntil).toISOString()})),stop:leased.length?null:(capped.size?'cap-retailer':'no-tasks')}}
export async function releaseTasks(getStoreFn:any,device:any,ids:any[],now:number){const day=dayKey(now),store=scoutStore(getStoreFn);let n=0;
 for(const id of (Array.isArray(ids)?ids:[]).slice(0,50)){if(!/^t[a-f0-9]{15}$/.test(String(id)))continue;let rel:any=null;await editRecord(store,`tasks/${day}/${id}`,(t:any)=>{if(!t||t.status!=='leased'||t.leasedBy!==device.id)return undefined;rel=t;return{...t,status:'queued',leasedBy:null,leaseUntil:null}});
  if(rel){n++;await bump(getStoreFn,`count/${day}/retailer/${rel.retailer}`,{leased:-1});await bump(getStoreFn,`count/${day}/device/${device.id}`,{leased:-1,runs:{[rel.runId]:-1}})}}
 return n}
export async function releaseDeviceLeases(getStoreFn:any,deviceId:string,now:number){const ids=(await listTasks(getStoreFn,dayKey(now))).filter(t=>t.status==='leased'&&t.leasedBy===deviceId).map(t=>t.taskId);return releaseTasks(getStoreFn,{id:deviceId},ids,now)}

// ---------- block / challenge ----------
export async function reportBlock(getStoreFn:any,device:any,body:any,now:number){
 const retailer=RETAILERS.includes(body?.retailer)?body.retailer:null,kind=['challenge','403','429','unusual'].includes(body?.kind)?body.kind:'unusual',day=dayKey(now),until=now+DAY;
 await editDevice(getStoreFn,device.id,d=>({...d,pausedUntil:until,pauseReason:'blocked:'+kind,blockedAt:new Date(now).toISOString(),totals:{...(d.totals||{}),blocked:(d.totals?.blocked||0)+1}}));
 const released=await releaseDeviceLeases(getStoreFn,device.id,now);
 await bump(getStoreFn,`count/${day}/device/${device.id}`,{blocked:1});
 let networkPause=false;
 if(retailer){const c=await editRecord(scoutStore(getStoreFn),`count/${day}/retailer/${retailer}`,(x:any)=>({...(x||{}),blocked:(x?.blocked||0)+1,blockedDevices:[...new Set([...(x?.blockedDevices||[]),device.id])].slice(-20)}));
  if((c.blockedDevices||[]).length>=2){const h=(await retailerHealth(getStoreFn))[retailer];if(!retailerPaused(h,now)){await setRetailerPause(getStoreFn,retailer,true,'system',now,{reason:'blocked-network',until:now+DAY});networkPause=true}}}
 await logEvent(getStoreFn,'device_blocked',{deviceId:device.id,account:device.owner,retailer,kind,url:clean(body?.url,300)||null,alert:true},now);
 return{pausedUntil:new Date(until).toISOString(),released,retailerPaused:networkPause}}

// ---------- results ----------
function hostOk(u:any,retailer:string,config:any){try{const h=new URL(String(u)).hostname;return (config?.retailers?.[retailer]?.hosts||[]).includes(h)}catch{return false}}
const num=(v:any,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=max?Math.round(v*10000)/10000:null;
/** Server-side fact whitelist + sanity (reimplements the minimal checks; priceSanity in
 *  shopping-optimizer.ts is a browser classic script and cannot be imported here). */
export function validFact(f:any,retailer:string,config:any){
 if(!f||typeof f!=='object')return{ok:false,reason:'shape'};
 if(f.currency!==undefined&&f.currency!=='AUD')return{ok:false,reason:'currency'};
 const name=clean(f.name,160),price=num(f.price,2000);if(!name)return{ok:false,reason:'name'};if(price==null||price<0.05)return{ok:false,reason:'price'};
 const o:any={name,price,currency:'AUD'};
 const wp=num(f.wasPrice,5000);o.wasPrice=wp&&wp>price&&wp<=price*10?wp:null;
 o.unitBasis=Object.hasOwn(BASIS_MAX,f.unitBasis)?f.unitBasis:null;o.unitPrice=o.unitBasis?num(f.unitPrice,BASIS_MAX[o.unitBasis]):null;if(o.unitPrice==null)o.unitBasis=null;
 o.promoType=PROMOS.includes(f.promoType)?f.promoType:null;o.promoEnd=typeof f.promoEnd==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(f.promoEnd)?f.promoEnd:null;
 o.packUnit=['g','kg','mL','L','each','wash','roll','sheet'].includes(f.packUnit)?f.packUnit:null;o.packQty=o.packUnit?num(f.packQty,100000):null;if(o.packQty==null)o.packUnit=null;
 o.packCount=Number.isInteger(f.packCount)&&f.packCount>0&&f.packCount<1000?f.packCount:null;
 o.productId=typeof f.productId==='string'&&/^[\w.-]{1,40}$/.test(f.productId)?f.productId:null;
 o.productUrl=f.productUrl&&hostOk(f.productUrl,retailer,config)?String(f.productUrl).split('#')[0].slice(0,400):null;
 o.storeLabel=clean(f.storeLabel,80)||null;
 // pack sanity: price per kg/L implied by pack must be plausible
 if(o.packQty&&o.packUnit){const per=o.packUnit==='g'?o.price/o.packQty*1000:o.packUnit==='kg'?o.price/o.packQty:o.packUnit==='mL'?o.price/o.packQty*1000:o.packUnit==='L'?o.price/o.packQty:o.price/o.packQty;if(per>5000||per<0.0005)return{ok:false,reason:'pack'}}
 return{ok:true,fact:o}}
const factKey=(retailer:string,f:any)=>retailer+'|'+normLabel(f.storeLabel)+'|'+(f.productId||f.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim());
export async function ingestResults(getStoreFn:any,{device,settings:s,body,now,adapter,env=process.env}:any){
 const mode=body?.mode==='auto'?'auto':'semi',items=Array.isArray(body?.items)?body.items.slice(0,60):[],day=dayKey(now),store=scoutStore(getStoreFn),config=await scoutConfig(getStoreFn);
 if(mode==='semi'&&s.semiAuto!=='on')fail('Chế độ bán tự động đang tắt.','Semi-auto is switched off.',403,'semi-off');
 if(s.paused)fail('Mạng Scout đang tạm dừng.','The scout network is paused.',403,'paused-global');
 if(device.pausedUntil&&device.pausedUntil>now)fail('Thiết bị đang tạm dừng.','This device is paused.',403,'paused-device');
 if(mode==='auto'&&s.autoScout!=='on')fail('Chế độ tự động đang tắt.','Auto mode is switched off.',403,'auto-off');
 const trusted=await isTrusted(getStoreFn,device.owner,env),out={pages:0,accepted:0,duplicates:0,rejected:0,held:0,confirmed:0,skipped:0,parseFailed:0,reasons:{} as any};
 const reject=(r:string)=>{out.rejected++;out.reasons[r]=(out.reasons[r]||0)+1};
 for(const it of items){
  const retailer=RETAILERS.includes(it?.retailer)?it.retailer:null;if(!retailer||!hostOk(it.url,retailer,config)){reject('retailer-url');continue}
  let task:any=null;
  if(mode==='auto'){if(!/^t[a-f0-9]{15}$/.test(String(it.taskId||''))){reject('task');continue}task=await readJSON(store,`tasks/${day}/${it.taskId}`);if(!task||task.leasedBy!==device.id||task.status!=='leased'){reject('lease');continue}}
  const status=['ok','parse-failed','robots-disallowed','not-found'].includes(it.status)?it.status:'parse-failed';
  if(status==='robots-disallowed'){out.skipped++;if(task)await editRecord(store,`tasks/${day}/${task.taskId}`,(t:any)=>t?{...t,status:'skipped',reason:'robots-disallowed',leaseUntil:null,doneAt:new Date(now).toISOString()}:undefined);await bump(getStoreFn,`count/${day}/retailer/${retailer}`,{robots:1});continue}
  out.pages++;
  const facts:any[]=[];for(const f of (Array.isArray(it.facts)?it.facts:[]).slice(0,200)){const v=validFact({...f,storeLabel:f?.storeLabel||it.storeLabel},retailer,config);if(v.ok)facts.push(v.fact);else reject(v.reason!)}
  const parsedOk=status==='not-found'||facts.length>0;if(!parsedOk)out.parseFailed++;
  await recordParse(getStoreFn,retailer,parsedOk,s,now);
  for(const f of facts){
   const key=factKey(retailer,f),okey=`obs/${day}/${retailer}/${sha(key).slice(0,24)}`;let prev:any=null,next:any=null;
   await editRecord(store,okey,(r:any)=>{prev=r;const values={...(r?.values||{})},mine=values[device.id];if(mine&&Math.abs(mine.price-f.price)<0.005){next=null;return undefined}
    values[device.id]={price:f.price,at:new Date(now).toISOString(),account:device.owner,trusted};
    const prices=Object.values<any>(values).map(v=>v.price),lo=Math.min(...prices),hi=Math.max(...prices),accounts=new Set(Object.values<any>(values).map(v=>v.account));
    const statusNow=hi-lo>Math.max(0.02,lo*0.01)?'held':Object.values<any>(values).some(v=>v.trusted)||accounts.size>=2?'confirmed':'pending';
    next={key,retailer,storeLabel:f.storeLabel,name:f.name,productId:f.productId,values,status:statusNow,published:r?.published||null,firstAt:r?.firstAt||new Date(now).toISOString()};return next});
   if(!next){out.duplicates++;continue}
   out.accepted++;
   const obs={key,itemId:task?.itemId||null,label:f.name,retailer,storeLabel:f.storeLabel,price:f.price,currency:'AUD',unitPrice:f.unitPrice,unitBasis:f.unitBasis,wasPrice:f.wasPrice,promo:f.promoType,validUntil:f.promoEnd,packQty:f.packQty,packUnit:f.packUnit,packCount:f.packCount,productId:f.productId,productUrl:f.productUrl,observedAt:new Date(now).toISOString(),source:'scout-extension',mode,deviceId:device.id,account:device.owner,trusted,postcode:device.postcode||null,suburb:device.suburb||null,storeMismatch:it.storeMismatch===true};
   if(next.status==='held'){out.held++;if(prev?.status!=='held'){await adapter.holdObservation(obs,'cross-device-disagreement');await logEvent(getStoreFn,'disagreement_hold',{retailer,name:f.name,storeLabel:f.storeLabel},now)}}
   else{const confirmed=next.status==='confirmed'&&!obs.storeMismatch;if(confirmed)out.confirmed++;if(next.published!==(confirmed?'confirmed':'pending')||!prev){await adapter.publishObservation(obs,{confirmed,agreeing:Object.keys(next.values).length});await editRecord(store,okey,(r:any)=>r?{...r,published:confirmed?'confirmed':'pending'}:undefined)}}
   if(task?.itemId&&(f.productId||f.productUrl)&&(facts.length===1||task.kind!=='specials'&&facts.indexOf(f)===0))await adapter.recordMappingCandidate({itemId:task.itemId,retailer,productUrl:f.productUrl,productId:f.productId,packQty:f.packQty,deviceId:device.id,account:device.owner});
  }
  if(task)await editRecord(store,`tasks/${day}/${task.taskId}`,(t:any)=>t?{...t,status:'done',leaseUntil:null,doneAt:new Date(now).toISOString(),prices:facts.length,parse:parsedOk?'ok':'failed'}:undefined);
  await bump(getStoreFn,`count/${day}/retailer/${retailer}`,{pages:1,prices:facts.length,parseOk:parsedOk?1:0,parseFail:parsedOk?0:1,...(mode==='semi'?{semiPages:1}:{})});
 }
 await bump(getStoreFn,`count/${day}/device/${device.id}`,{pages:out.pages,prices:out.accepted,parseFail:out.parseFailed});
 await editDevice(getStoreFn,device.id,d=>({...d,lastRunAt:mode==='auto'?new Date(now).toISOString():d.lastRunAt,lastSemiAt:mode==='semi'?new Date(now).toISOString():d.lastSemiAt,totals:{...(d.totals||{}),pages:(d.totals?.pages||0)+out.pages,prices:(d.totals?.prices||0)+out.accepted,parseFail:(d.totals?.parseFail||0)+out.parseFailed}}));
 return out}

// ---------- Studio views ----------
export async function studioOverview(getStoreFn:any,{now,env=process.env}:any){
 const s=await networkSettings(getStoreFn,env),devices=await listDevices(getStoreFn),day=dayKey(now),{retailers,devices:dc}=await counters(getStoreFn,day),health=await retailerHealth(getStoreFn),trusted=await trustedList(getStoreFn),cfg=await scoutConfig(getStoreFn);
 const rows=devices.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(d=>{const t=d.totals||{},today=dc[d.id]||{};const pages=t.pages||0;return{id:d.id,name:d.name,owner:d.owner,postcode:d.postcode,suburb:d.suburb,stores:d.stores||{},lastHeartbeat:d.lastHeartbeat,lastRunAt:d.lastRunAt,lastSemiAt:d.lastSemiAt||null,pages,prices:t.prices||0,blocked:t.blocked||0,successRate:pages?Math.round((1-(t.parseFail||0)/pages)*100)/100:null,today:{pages:today.pages||0,leased:today.leased||0,prices:today.prices||0},autoAllowed:d.autoAllowed===true,autoEnabled:d.client?.autoEnabled===true,semiEnabled:d.client?.semiEnabled!==false,signedInWarning:Object.keys(d.client?.signedIn||{}).filter(r=>d.client.signedIn[r]),storeMismatch:d.client?.storeMismatch||{},version:d.client?.version||null,configVersion:d.client?.configVersion||null,caps:effectiveCaps(d,s),schedule:d.schedule||null,status:d.revokedAt?'revoked':d.pausedUntil&&d.pausedUntil>now?(String(d.pauseReason||'').startsWith('blocked')?'blocked':'paused'):'active',pausedUntil:d.pausedUntil&&d.pausedUntil>now?new Date(d.pausedUntil).toISOString():null,pauseReason:d.pauseReason||null}});
 const retailerRows=RETAILERS.map(r=>{const h=health[r]||{},c=retailers[r]||{};return{retailer:r,label:RETAILER_LABELS[r],paused:retailerPaused(h,now),reason:retailerPaused(h,now)?h.reason:null,until:h.until?new Date(h.until).toISOString():null,successRate:h.successRate??null,samples:(h.recent||[]).length,today:{leased:c.leased||0,pages:c.pages||0,prices:c.prices||0,parseFail:c.parseFail||0,blocked:c.blocked||0,robots:c.robots||0,semiPages:c.semiPages||0},cap:s.caps.retailerPagesPerDay[r]??0}});
 const tasks=await listTasks(getStoreFn,day),byStatus:any={};for(const t of tasks)byStatus[t.status]=(byStatus[t.status]||0)+1;
 return{settings:s,installInfo:{...publicInstallInfo(s,env),envStoreUrl:!!validStoreUrl(env?.SCOUT_STORE_URL,'chrome'),envEdgeStoreUrl:!!validStoreUrl(env?.SCOUT_EDGE_STORE_URL,'edge')},devices:rows,retailers:retailerRows,trusted:Object.entries<any>(trusted).map(([username,v])=>({username,...v})),tasks:{total:tasks.length,byStatus},configVersion:cfg?.version||null,events:await listEvents(getStoreFn,{days:7,limit:40,now}),day}}
export async function coverage(getStoreFn:any,{now,days=7}:any){const rows:any={},stores=new Set<string>();
 for(let d=0;d<days;d++)for(const t of await listTasks(getStoreFn,dayKey(now-d*DAY))){if(!t.itemId||t.status!=='done')continue;const col=t.retailer+' · '+t.storeLabel;stores.add(col);const row=rows[t.itemId]||(rows[t.itemId]={itemId:t.itemId,name:t.name||t.itemId,cells:{}});const prev=row.cells[col];if(!prev||prev.at<t.doneAt)row.cells[col]={at:t.doneAt,prices:t.prices||0}}
 return{columns:[...stores].sort(),rows:Object.values(rows).sort((a:any,b:any)=>String(a.name).localeCompare(String(b.name))).slice(0,300)}}
