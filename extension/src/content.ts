// FamTray Scout — content script on supported retailer pages. Reads only the visible
// page the browser already loaded: product facts (name, prices, unit price, promo,
// pack size, product id/URL) and the store label shown on the page. It never reads
// form fields, cookies, account details, images, descriptions or reviews, never
// clicks anything and never interacts with challenge pages.
declare const chrome:any;
(function scoutContent(){
'use strict';
const G:any=globalThis;
async function config(){try{const s=await chrome.storage.local.get(['config']);return s.config?.data||G.SCOUT_DEFAULT_CONFIG}catch{return G.SCOUT_DEFAULT_CONFIG}}
function navStatus(){try{const e:any=performance.getEntriesByType('navigation')[0];return e?.responseStatus||0}catch{return 0}}
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney'}).format(new Date());
// capturedAt = when this page was read on this computer (shown next to the price later).
async function extract(){const cfg=await config();try{return {...G.ScoutParse.extract(document,location.href,cfg,{status:navStatus(),today:today()}),capturedAt:new Date().toISOString()}}catch(e:any){return{retailer:null,status:'parse-failed',facts:[],error:String(e?.message||e).slice(0,80)}}}
// v1.7.3: the store name and the signed-in state usually render AFTER the prices (single-page apps,
// header web components), so a page is reported again whenever the price count, the store shown
// or the signed-in state changes (a few more times for header-only changes).
let sent=0,lastKey='',timer:any=null,url=location.href,retry:any[]=[];
async function report(){if(sent>=10)return;const r=await extract();if(!r.retailer)return;const key=r.facts.length+'|'+(r.storeLabel||'')+'|'+(r.signedIn===true);if(key===lastKey&&sent>0)return;
 const countChanged=lastKey.split('|')[0]!==String(r.facts.length);if(sent>=6&&countChanged&&lastKey)return;lastKey=key;sent++;try{await chrome.runtime.sendMessage({type:'page-result',result:{...r,nav:navCount}})}catch{}}
chrome.runtime.onMessage.addListener((msg:any,_s:any,reply:any)=>{if(msg?.type==='extract'){extract().then(reply);return true}if(msg?.type==='diagnose'){Promise.resolve(G.ScoutParse?.diagnose?.(document,location.href,G.__scoutCfg||G.SCOUT_DEFAULT_CONFIG,{timing:timing(),version:(()=>{try{return chrome.runtime.getManifest().version}catch{return G.SCOUT_BUILD?.version||null}})(),configVersion:(G.__scoutCfg||G.SCOUT_DEFAULT_CONFIG)?.version||null})).then(reply);return true}return false});
// v1.7.2: Woolworths / Coles are single-page apps — a click to another product changes the URL
// without a new page load. Watch for route changes (URL polling + popstate/hashchange; a content
// script cannot hook the page's own history.pushState) and read the new page again, retrying while
// lazily rendered prices appear.
let navCount=0;const started=Date.now();let lastNavAt=started;const timing=()=>({sinceLoadMs:Date.now()-started,sinceNavMs:Date.now()-lastNavAt,navCount,reports:sent});
function schedule(){for(const t of retry)clearTimeout(t);retry=[600,2000,5000,9000].map(ms=>setTimeout(report,ms))}
function routeChanged(){if(location.href===url)return;url=location.href;navCount++;lastNavAt=Date.now();sent=0;lastKey='';schedule()}
setInterval(routeChanged,1000);addEventListener('popstate',()=>setTimeout(routeChanged,50));addEventListener('hashchange',()=>setTimeout(routeChanged,50));
config().then(c=>{G.__scoutCfg=c});
report();schedule();
// Lists load more tiles while the human scrolls: re-read (debounced, a few times at most).
try{new MutationObserver(()=>{routeChanged();clearTimeout(timer);timer=setTimeout(report,2500)}).observe(document.body,{childList:true,subtree:true})}catch{}
})();
