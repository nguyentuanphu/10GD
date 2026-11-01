// FamTray Scout — shared extension state + server client (background, runner,
// popup and options). Classic script; defines globalThis.ScoutClient.
// The device token is sent ONLY to the paired server, never to a retailer site.
// No cookies captured from retailer sites are ever read, stored or reused.
declare const chrome:any;
(function scoutClient(root:any){
'use strict';
const BUILD=root.SCOUT_BUILD||{test:false,version:'0.0.0',configVersion:root.SCOUT_DEFAULT_CONFIG?.version||null,server:''};
const DEFAULTS={server:BUILD.server||'',token:'',deviceId:'',device:null,notAssigned:false,lang:'',theme:'auto',
 autoEnabled:false,semiEnabled:true,paused:false,semiSites:{woolworths:true,coles:true,aldi:true,chemist:true,amazon:true},
 lastRun:null,lastSemi:null,blockedEvents:[],warnings:{signedIn:{},storesSeen:{},storeMismatch:{}},onboarding:{profile:false,rewards:false,store:false},
 config:null,robotsCache:{},run:null,pendingSemi:[],testPacing:null};
async function get(keys?:string[]){const all=await chrome.storage.local.get(keys||null);const out:any={};for(const k of keys||Object.keys(DEFAULTS))out[k]=all[k]===undefined?structuredClone((DEFAULTS as any)[k]):all[k];return out}
async function set(patch:any){await chrome.storage.local.set(patch)}
function serverOk(s:string){try{const u=new URL(s);return u.protocol==='https:'||BUILD.test&&u.protocol==='http:'}catch{return false}}
async function api(op:string,body?:any,{token}:any={}){
 const st=await get(['server','token']);if(!serverOk(st.server))throw Object.assign(Error('no-server'),{code:'no-server'});
 const headers:any={Accept:'application/json'};const tk=token===undefined?st.token:token;if(tk)headers.Authorization='Bearer '+tk;if(body!==undefined)headers['Content-Type']='application/json';
 const r=await fetch(st.server.replace(/\/$/,'')+'/.netlify/functions/scout?op='+encodeURIComponent(op),{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',cache:'no-store'});
 let data:any={};try{data=await r.json()}catch{}
 if(r.status===401&&(data.code==='revoked'||data.code==='no-token'))await set({token:'',deviceId:'',device:null,autoEnabled:false});
 // v1.7.1: only accounts assigned in Studio may use the extension. Remember the refusal so the popup can say so.
 {const na=r.status===403&&data.code==='not_assigned',cur=(await get(['notAssigned'])).notAssigned===true;if(na!==cur&&(na||r.ok))await set({notAssigned:na})}
 if(!r.ok&&!(op==='tasks'&&data.code))throw Object.assign(Error(data.errorEn||data.error||('HTTP '+r.status)),{status:r.status,data,code:data.code});
 return data}
async function lang(){const s=await get(['lang']);return s.lang||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}
async function refreshConfig(){try{const st=await get(['config']);const r=await api('config'+(st.config?.version?'&v='+encodeURIComponent(st.config.version):''));if(r.config)await set({config:{version:r.version,data:r.config,at:Date.now()}})}catch{}}
async function config(){const st=await get(['config']);return st.config?.data||root.SCOUT_DEFAULT_CONFIG}
// robots.txt: fetched from this browser profile (credentials omitted), cached 24 h.
// RFC 9309: 4xx → no rules (allow); 5xx / network error → treat as disallow all.
async function robotsAllowed(url:string){const u=new URL(url),st=await get(['robotsCache']),cache=st.robotsCache||{},hit=cache[u.host];let entry=hit&&Date.now()-hit.at<864e5?hit:null;
 if(!entry){let txt='',status=0;try{const r=await fetch(u.origin+'/robots.txt',{credentials:'omit',cache:'no-store',redirect:'follow'});status=r.status;txt=r.ok?(await r.text()).slice(0,500000):''}catch{status=0}
  entry={at:Date.now(),status,txt:status>=500||status===0?'User-agent: *\nDisallow: /':txt};cache[u.host]=entry;await set({robotsCache:cache})}
 return root.ScoutCore.robotsAllows(entry.txt,u.pathname+u.search)}
// App pages allowed to talk to the extension (onMessageExternal). Chrome already limits
// callers to `externally_connectable`; this second, explicit check uses the origins baked
// in at build time (production: the app's https origin only; test build: localhost-style
// test hosts on any port). Everything else is refused.
function appOriginAllowed(origin:any){let u:URL;try{u=new URL(String(origin||''))}catch{return false}if(u.origin!==String(origin))return false;
 if((BUILD.appOrigins||[]).includes(u.origin))return true;
 return !!BUILD.test&&u.protocol==='http:'&&(BUILD.testAppHosts||[]).includes(u.hostname)}
root.ScoutClient={BUILD,DEFAULTS,get,set,api,lang,refreshConfig,config,robotsAllowed,serverOk,appOriginAllowed};
})(globalThis);
