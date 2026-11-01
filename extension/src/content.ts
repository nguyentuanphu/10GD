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
let sent=0,lastCount=-1,timer:any=null;
async function report(){if(sent>=6)return;const r=await extract();if(!r.retailer)return;if(r.facts.length===lastCount&&sent>0)return;lastCount=r.facts.length;sent++;try{await chrome.runtime.sendMessage({type:'page-result',result:r})}catch{}}
chrome.runtime.onMessage.addListener((msg:any,_s:any,reply:any)=>{if(msg?.type==='extract'){extract().then(reply);return true}return false});
report();
// Lists load more tiles while the human scrolls: re-read (debounced, a few times at most).
try{new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(report,2500)}).observe(document.body,{childList:true,subtree:true})}catch{}
})();
