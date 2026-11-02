// FamTray Scout — pure helpers shared by the content script, the runner page, the
// popup/options pages and the Node tests. No DOM, no chrome.* APIs, no network.
// Classic script: defines globalThis.ScoutCore and, under Node, module.exports.
//
// GUARDRAILS (owner, option C) that live in this file:
//  - pacing() never returns less than 3 s or more than 120 s in a production build (v1.7:
//    owner-adjustable presets; default Normal 20–40 s), still jittered min–max;
//  - detectChallenge() recognises bot challenges / 403 / 429 / unusual pages so the
//    runner STOPS (it never tries to solve or bypass them);
//  - robotsAllows() implements RFC 9309 matching for the paths auto mode visits;
//  - factsOnly() is the whitelist of fields that may ever leave the browser.
(function scoutCore(root:any){
'use strict';
const RETAILER_IDS=['woolworths','coles','aldi','chemist','amazon'];
const PROMOS=['half-price','special','special-buy','price-drop','multibuy','deal','clearance'];
const BASIS=['per_kg','per_100g','per_L','per_100mL','per_each','per_wash','per_roll','per_sheet'];
const FACT_FIELDS=['name','price','unitPrice','unitBasis','unitText','wasPrice','promoType','promoText','promoEnd','packQty','packUnit','packCount','productId','productUrl','storeLabel'];
const PACING={minMs:20000,maxMs:40000};
const round=(n:number,d=2)=>Math.round(n*10**d)/10**d;
const clean=(s:any,max=200)=>typeof s==='string'?s.replace(/\s+/g,' ').trim().slice(0,max):'';

// ---------- money / unit price / pack size ----------
function parseMoney(text:any):number|null{
 const s=clean(String(text??''),80);if(!s)return null;
 let m=s.match(/\$\s*(\d{1,5}(?:,\d{3})*(?:\.\d{1,2})?)/);if(m)return round(+m[1].replace(/,/g,''));
 m=s.match(/(\d{1,4})\s*c\b/i);if(m&&!/\d\s*\.\s*\d/.test(s))return round(+m[1]/100);
 m=s.match(/^(\d{1,5}(?:\.\d{1,2})?)$/);return m?round(+m[1]):null;
}
const UNIT_ALIASES:any={g:'g',gm:'g',gram:'g',grams:'g',kg:'kg',kilo:'kg',kilogram:'kg',ml:'mL',millilitre:'mL',milliliter:'mL',l:'L',lt:'L',litre:'L',liter:'L',ea:'each',each:'each',unit:'each',pc:'each',piece:'each',wash:'wash',washes:'wash',load:'wash',loads:'wash',roll:'roll',rolls:'roll',sheet:'sheet',sheets:'sheet',tablet:'each',tablets:'each',capsule:'each',capsules:'each',pack:'each'};
/** "$1.20 / 100g", "$12.00 per 1kg", "$0.50 each", "$0.31 per wash", "($0.85/roll)", "$2.40/1L" */
function parseUnitPrice(text:any):{unitPrice:number,unitBasis:string,unitText:string}|null{
 const s=clean(String(text??''),120);if(!s)return null;
 const m=s.match(/\$\s*(\d{1,5}(?:\.\d{1,3})?)\s*(?:\/|per|a|for)?\s*(\d+(?:\.\d+)?)?\s*([a-zA-Z]+)\b/i);if(!m)return null;
 const value=+m[1],qty=m[2]?+m[2]:1,unit=UNIT_ALIASES[m[3].toLowerCase()];if(!unit||!(value>0)||!(qty>0))return null;
 let unitPrice=value,basis='';
 if(unit==='g'){if(qty===100){basis='per_100g'}else{unitPrice=value/qty*1000;basis='per_kg'}}
 else if(unit==='kg'){unitPrice=value/qty;basis='per_kg'}
 else if(unit==='mL'){if(qty===100){basis='per_100mL'}else{unitPrice=value/qty*1000;basis='per_L'}}
 else if(unit==='L'){unitPrice=value/qty;basis='per_L'}
 else{unitPrice=value/qty;basis='per_'+unit}
 return BASIS.includes(basis)?{unitPrice:round(unitPrice,4),unitBasis:basis,unitText:s.slice(0,60)}:null;
}
/** "500g", "1.5kg", "2L", "6 x 375mL", "24 pack", "12 rolls", "40 washes" (from a product name). */
function parsePackSize(text:any):{packQty:number,packUnit:string,packCount?:number}|null{
 const s=clean(String(text??''),200);if(!s)return null;
 let m=s.match(/(\d{1,3})\s*[x×]\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\b/i);
 if(m){const unit=UNIT_ALIASES[m[3].toLowerCase()];return{packQty:round(+m[1]*+m[2],3),packUnit:unit,packCount:+m[1]}}
 m=s.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|litre|litres)\b/i);if(m){const u=m[2].toLowerCase();return{packQty:+m[1],packUnit:UNIT_ALIASES[u.replace(/s$/,'')]||UNIT_ALIASES[u]}}
 m=s.match(/(\d{1,4})\s*(pack|pk|rolls?|sheets?|washes|loads?|tablets?|capsules?|each|ea)\b/i);if(m){const u=m[2].toLowerCase(),unit=UNIT_ALIASES[u]||UNIT_ALIASES[u.replace(/s$/,'')]||(u==='pk'?'each':'each');return{packQty:+m[1],packUnit:unit}}
 return null;
}
// ---------- promotions ----------
const MONTHS:any={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
function isoDay(y:number,m:number,d:number){const t=new Date(Date.UTC(y,m,d));return t.getUTCMonth()===m&&t.getUTCDate()===d?t.toISOString().slice(0,10):null}
/** "Ends 12 Nov", "Offer ends Tue 12/11", "Valid until 2026-11-12" → YYYY-MM-DD (year inferred, never in the past by more than 30 days). */
function parsePromoEnd(text:any,today=new Date().toISOString().slice(0,10)):string|null{
 const s=clean(String(text??''),120).toLowerCase();if(!s)return null;
 let m=s.match(/(20\d\d)-(\d\d)-(\d\d)/);if(m)return isoDay(+m[1],+m[2]-1,+m[3]);
 const y=+today.slice(0,4),pick=(mo:number,d:number)=>{for(const yy of [y,y+1]){const iso=isoDay(yy,mo,d);if(iso&&Date.parse(iso)>=Date.parse(today)-30*864e5)return iso}return null};
 m=s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/);if(m)return pick(MONTHS[m[2]],+m[1]);
 m=s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/);if(m)return pick(MONTHS[m[1]],+m[2]);
 m=s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);if(m){if(m[3]){const yy=+m[3]<100?2000+ +m[3]:+m[3];return isoDay(yy,+m[2]-1,+m[1])}return pick(+m[2]-1,+m[1])}
 return null;
}
const DEFAULT_PROMO_RULES=[{type:'half-price',re:'(1\\/2|½|half)\\s*price'},{type:'multibuy',re:'\\b\\d+\\s*for\\s*\\$\\d'},{type:'price-drop',re:'prices?\\s*dropped|low\\s*price|down\\s*down|price\\s*drop'},{type:'special-buy',re:'special\\s*buys?'},{type:'clearance',re:'clearance'},{type:'deal',re:'\\bdeal\\b|limited\\s*time'},{type:'special',re:'\\bspecial\\b|\\bsave\\s*\\$|\\bwas\\s*\\$'}];
function detectPromo(text:any,rules:any[]=DEFAULT_PROMO_RULES):string|null{const s=clean(String(text??''),300);if(!s)return null;for(const r of rules){try{if(new RegExp(r.re,'i').test(s)&&PROMOS.includes(r.type))return r.type}catch{}}return null}
// ---------- facts whitelist ----------
/** Keeps only the allowed fact fields with sane types. Never images, descriptions, reviews or personal data. */
function factsOnly(f:any){
 if(!f||typeof f!=='object')return null;
 const o:any={},num=(v:any,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=max?round(v,4):null;
 o.name=clean(f.name,160);o.price=num(f.price,5000);if(!o.name||o.price==null)return null;
 o.unitPrice=num(f.unitPrice,100000);o.unitBasis=BASIS.includes(f.unitBasis)?f.unitBasis:null;if(o.unitPrice==null)o.unitBasis=null;o.unitText=clean(f.unitText,60)||null;
 o.wasPrice=num(f.wasPrice,5000);if(o.wasPrice!=null&&o.wasPrice<=o.price)o.wasPrice=null;
 o.promoType=PROMOS.includes(f.promoType)?f.promoType:null;o.promoText=clean(f.promoText,60)||null;o.promoEnd=typeof f.promoEnd==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(f.promoEnd)?f.promoEnd:null;
 o.packQty=num(f.packQty,100000);o.packUnit=o.packQty!=null&&typeof f.packUnit==='string'&&/^(g|kg|mL|L|each|wash|roll|sheet)$/.test(f.packUnit)?f.packUnit:null;if(!o.packUnit)o.packQty=null;
 o.packCount=Number.isInteger(f.packCount)&&f.packCount>0&&f.packCount<1000?f.packCount:null;
 o.productId=typeof f.productId==='string'&&/^[\w.-]{1,40}$/.test(f.productId)?f.productId:null;
 o.productUrl=typeof f.productUrl==='string'&&/^https?:\/\/[^\s]{4,400}$/.test(f.productUrl)?f.productUrl.split('#')[0]:null;
 o.storeLabel=clean(f.storeLabel,80)||null;
 return o;
}
// ---------- challenges / unusual pages ----------
const DEFAULT_CHALLENGE={title:['access denied','just a moment','attention required','robot check','pardon our interruption','are you a robot','verify you are human','security check','request blocked','too many requests','captcha'],text:['enter the characters you see','verify you are a human','unusual traffic','press & hold','press and hold','complete the security check','enable javascript and cookies to continue','automated access','sorry, we just need to make sure'],selectors:['iframe[src*="captcha"]','#px-captcha','form[action*="validateCaptcha"]','#challenge-form','#cf-challenge-running','[id*="captcha" i]','div.g-recaptcha','iframe[src*="hcaptcha"]']};
/** Returns null for a normal page; otherwise {kind}. The runner must STOP on any non-null result. */
function detectChallenge(p:{status?:number,title?:string,text?:string,hasChallengeElement?:boolean},cfg:any=DEFAULT_CHALLENGE){
 const status=Number(p.status)||0;if(status===429)return{kind:'429'};if(status===403)return{kind:'403'};if(status===503&&/just a moment|attention|captcha|robot/i.test(String(p.title||'')+String(p.text||'')))return{kind:'challenge'};
 if(p.hasChallengeElement)return{kind:'challenge'};
 const title=String(p.title||'').toLowerCase(),text=String(p.text||'').toLowerCase().slice(0,6000);
 if((cfg.title||[]).some((t:string)=>title.includes(t)))return{kind:'challenge'};
 if((cfg.text||[]).some((t:string)=>text.includes(t)))return{kind:'challenge'};
 if(status>=400)return{kind:'unusual'};
 return null;
}
// ---------- robots.txt (RFC 9309) ----------
function parseRobots(txt:any){const groups:any[]=[];let cur:any=null,lastWasAgent=false;
 for(const raw of String(txt||'').split(/\r?\n/)){const line=raw.replace(/#.*$/,'').trim();if(!line)continue;const i=line.indexOf(':');if(i<0)continue;const k=line.slice(0,i).trim().toLowerCase(),v=line.slice(i+1).trim();
  if(k==='user-agent'){if(!cur||!lastWasAgent){cur={agents:[],rules:[]};groups.push(cur)}cur.agents.push(v.toLowerCase());lastWasAgent=true;continue}
  lastWasAgent=false;if(!cur)continue;if(k==='allow'||k==='disallow')cur.rules.push({allow:k==='allow',path:v})}
 return groups}
function ruleMatch(pattern:string,path:string){if(!pattern)return -1;const anchored=pattern.endsWith('$'),body=anchored?pattern.slice(0,-1):pattern;const re=new RegExp('^'+body.split('*').map(x=>x.replace(/[.+?^${}()|[\]\\]/g,'\\$&')).join('.*')+(anchored?'$':''));return re.test(path)?pattern.length:-1}
/** Our agent is ordinary Chrome; it never claims a crawler name, so the '*' group applies. */
function robotsAllows(txt:any,pathWithQuery:string,agent='famtray-scout'){
 const groups=parseRobots(txt),mine=groups.filter(g=>g.agents.includes(agent)),pick=mine.length?mine:groups.filter(g=>g.agents.includes('*'));
 const rules=pick.flatMap(g=>g.rules);let best=-1,allow=true;
 for(const r of rules){if(r.path===''){continue}const n=ruleMatch(r.path,pathWithQuery);if(n>best||(n===best&&n>=0&&r.allow)){best=n;allow=r.allow}}
 return best<0?true:allow;
}
// ---------- schedule / pacing ----------
const DEFAULT_SCHEDULE=[{days:[3],start:'06:30',end:'09:00'},{days:[6],start:'06:30',end:'08:00'}];
function localParts(ms:number,timeZone?:string){try{const f=new Intl.DateTimeFormat('en-US',{timeZone:timeZone||undefined,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});const p:any={};for(const x of f.formatToParts(new Date(ms)))p[x.type]=x.value;return{day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),minutes:+p.hour*60+ +p.minute}}catch{const d=new Date(ms);return{day:d.getDay(),minutes:d.getHours()*60+d.getMinutes()}}}
const hm=(s:string)=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(s||''));return m?+m[1]*60+ +m[2]:NaN};
function validSchedule(w:any){return Array.isArray(w)&&w.length<=14&&w.every((x:any)=>x&&Array.isArray(x.days)&&x.days.length>=1&&x.days.every((d:any)=>Number.isInteger(d)&&d>=0&&d<=6)&&hm(x.start)>=0&&hm(x.end)>hm(x.start)&&hm(x.end)<=1440)}
function inWindow(ms:number,windows:any=DEFAULT_SCHEDULE,timeZone?:string){if(!validSchedule(windows))return false;const {day,minutes}=localParts(ms,timeZone);return windows.some((w:any)=>w.days.includes(day)&&minutes>=hm(w.start)&&minutes<hm(w.end))}
/** First time ≥ ms (5-minute steps, up to 8 days) that falls inside a window, or null. */
function nextWindowStart(ms:number,windows:any=DEFAULT_SCHEDULE,timeZone?:string){if(!validSchedule(windows))return null;const step=5*60000;let t=Math.ceil(ms/step)*step;for(let i=0;i<8*24*12;i++,t+=step)if(inWindow(t,windows,timeZone))return t;return null}
/** Delay before the next page: random within the server's [min, max] (default Normal
 *  20–40 s). Production builds clamp to [3 s, 120 s]; a test build may go shorter. */
const PACE_FLOOR=3000,PACE_CEIL=120000;
function pacing(rand:number=Math.random(),override?:{minMs:number,maxMs:number}|null,testBuild=false){const p=override&&Number.isFinite(override.minMs)&&Number.isFinite(override.maxMs)?override:PACING;
 const clamp=(v:number)=>testBuild?Math.max(0,v):Math.min(PACE_CEIL,Math.max(PACE_FLOOR,v));const lo=clamp(p.minMs),hi=Math.max(lo,clamp(p.maxMs));return Math.round(lo+(hi-lo)*Math.min(1,Math.max(0,rand)))}
// ---------- store label ----------
const normLabel=(s:any)=>{const x=clean(String(s||''),80).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/^(your\s+store|my\s+store|store|shopping at|pick up from|deliver(?:y|ing)? to)\s*[:\-]?\s*/i,'').replace(/[^a-z0-9]+/g,' ').trim();return /^(online|truc tuyen|truc tuyen online|online truc tuyen)$/.test(x)?'online':x};// v1.7.3: “Trực tuyến” = Online
function storeMatches(seen:any,assigned:any){const a=normLabel(assigned),s=normLabel(seen);if(!a)return true;if(!s)return false;return s===a||s.includes(a)||a.includes(s)}

// v1.7.2 update check: dotted numeric versions ("1.7.10" > "1.7.9").
function versionCmp(a:any,b:any){const pa=String(a||'').split('.').map(x=>parseInt(x,10)||0),pb=String(b||'').split('.').map(x=>parseInt(x,10)||0);for(let i=0;i<Math.max(pa.length,pb.length,3);i++){const d=(pa[i]||0)-(pb[i]||0);if(d)return d<0?-1:1}return 0}
const api={versionCmp,RETAILER_IDS,PROMOS,BASIS,FACT_FIELDS,PACING,DEFAULT_SCHEDULE,DEFAULT_CHALLENGE,DEFAULT_PROMO_RULES,parseMoney,parseUnitPrice,parsePackSize,parsePromoEnd,detectPromo,factsOnly,detectChallenge,parseRobots,robotsAllows,inWindow,nextWindowStart,validSchedule,localParts,pacing,normLabel,storeMatches,clean,round};
root.ScoutCore=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
