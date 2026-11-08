// v1.7.15 (owner, 8 Nov 2026; pop-ups: family accounts only, unknown ingredients kept for the family to match, barcodes looked up on
// Open Food Facts through the app's server). Two small server helpers:
//  • recipe import: the family pastes a recipe page link; the server opens that page once (public web addresses only — no local or
//    private hosts, at most 3 redirects, 8 s, 2 MB, HTML only) and reads its standard recipe data (schema.org Recipe in JSON-LD):
//    name, ingredient lines, steps, servings and time. Nothing is stored; pictures are not taken (dish pictures stay drawn).
//  • barcode: the number alone goes to Open Food Facts; only the product name, brand and pack size come back (no photos).
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export const IMPORT_PER_DAY=30,BARCODE_PER_DAY=200,PAGE_MAX=2_000_000,PAGE_MS=8000;
const PRIVATE4=[/^0\./,/^10\./,/^127\./,/^169\.254\./,/^172\.(1[6-9]|2\d|3[01])\./,/^192\.168\./,/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,/^198\.1[89]\./,/^2(2[4-9]|[3-5]\d)\./];
export function privateAddress(ip:string){if(isIP(ip)===4)return PRIVATE4.some(r=>r.test(ip));const v=ip.toLowerCase();return v==='::'||v==='::1'||v.startsWith('fc')||v.startsWith('fd')||v.startsWith('fe80')||v.startsWith('::ffff:')&&privateAddress(v.slice(7))}
export function safeUrl(raw:any):URL|null{if(typeof raw!=='string'||raw.length>2000)return null;let u:URL;try{u=new URL(raw.trim())}catch{return null}
 if(!/^https?:$/.test(u.protocol)||u.username||u.password||(u.port&&!['80','443'].includes(u.port)))return null;const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
 if(!h||h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.lan')||!h.includes('.')&&!isIP(h))return null;if(isIP(h)&&privateAddress(h))return null;u.hash='';return u}
type Resolve=(host:string)=>Promise<string[]>;
const resolveAll:Resolve=async host=>isIP(host)?[host]:(await lookup(host,{all:true})).map(a=>a.address);
export async function fetchPage(raw:string,{fetchFn=fetch,resolve=resolveAll}:{fetchFn?:typeof fetch,resolve?:Resolve}={}){
 let url=safeUrl(raw);if(!url)return{error:'bad_url'};
 for(let hop=0;hop<4;hop++){const ips=await resolve(url.hostname.replace(/^\[|\]$/g,'')).catch(()=>[] as string[]);if(!ips.length||ips.some(privateAddress))return{error:'bad_url'};
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),PAGE_MS);let res:Response;
  try{res=await fetchFn(url.href,{redirect:'manual',signal:ctl.signal,headers:{'User-Agent':'FamTray-RecipeImport/1.7.15 (+family recipe app)','Accept':'text/html,application/xhtml+xml'}})}catch{clearTimeout(t);return{error:'unreachable'}}
  if(res.status>=300&&res.status<400){clearTimeout(t);const next=res.headers.get('location');const u2=next?safeUrl(new URL(next,url).href):null;if(!u2)return{error:'bad_url'};url=u2;continue}
  if(!res.ok){clearTimeout(t);return{error:'unreachable'}}
  if(!/text\/html|application\/xhtml/i.test(res.headers.get('content-type')||'')){clearTimeout(t);return{error:'not_html'}}
  const reader=res.body?.getReader();let size=0;const parts:Uint8Array[]=[];
  try{if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>PAGE_MAX){ctl.abort();return{error:'too_big'}}parts.push(value)}}catch{return{error:'unreachable'}}finally{clearTimeout(t)}
  const buf=new Uint8Array(size);let o=0;for(const p of parts){buf.set(p,o);o+=p.length}return{html:new TextDecoder().decode(buf),url:url.href}}
 return{error:'bad_url'}}
const ENT:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',frac12:'½',frac14:'¼',frac34:'¾',deg:'°'};
export function cleanText(v:any,max=500){return String(v??'').replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi,(m,e:string)=>e[0]==='#'?String.fromCodePoint(e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):+e.slice(1)):ENT[e.toLowerCase()]??m).replace(/\s+/g,' ').trim().slice(0,max)}
const minutes=(iso:any)=>{const m=String(iso||'').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);if(!m)return null;const v=(+m[1]||0)*1440+(+m[2]||0)*60+(+m[3]||0);return v>0&&v<=1440?v:null};
const isRecipe=(o:any)=>o&&typeof o==='object'&&([] as any[]).concat(o['@type']||[]).some((t:any)=>String(t).toLowerCase()==='recipe');
function findRecipe(node:any,depth=0):any{if(!node||depth>6)return null;if(Array.isArray(node)){for(const n of node){const r=findRecipe(n,depth+1);if(r)return r}return null}if(typeof node!=='object')return null;if(isRecipe(node))return node;return findRecipe(node['@graph'],depth+1)||findRecipe(node.mainEntity,depth+1)||null}
function steps(v:any,out:string[]=[],depth=0){if(!v||depth>4||out.length>=40)return out;if(typeof v==='string'){for(const s of v.split(/\n+/))if(cleanText(s))out.push(cleanText(s));return out}
 if(Array.isArray(v)){for(const x of v)steps(x,out,depth+1);return out}if(typeof v==='object'){if(v.itemListElement)return steps(v.itemListElement,out,depth+1);const t=cleanText(v.text||v.name);if(t)out.push(t)}return out}
export function extractRecipe(html:string){const blocks=[...String(html).matchAll(/<script[^>]+type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 for(const b of blocks){let data:any;try{data=JSON.parse(b.trim())}catch{continue}const r=findRecipe(data);if(!r)continue;
  const name=cleanText(r.name,150);const ingredients=([] as any[]).concat(r.recipeIngredient||r.ingredients||[]).map(x=>cleanText(x,200)).filter(Boolean).slice(0,60);
  if(!name||!ingredients.length)continue;const yieldN=([] as any[]).concat(r.recipeYield||[]).map(y=>parseInt(String(y),10)).find(n=>n>0&&n<=50)||null;
  return{name,ingredients,steps:steps(r.recipeInstructions).slice(0,40).map(s=>s.slice(0,500)),servings:yieldN,time:minutes(r.totalTime)||minutes(r.cookTime)||null}}
 return null}
export async function lookupBarcode(code:string,{fetchFn=fetch}:{fetchFn?:typeof fetch}={}){if(!/^\d{8,14}$/.test(code))return{error:'bad_code'};
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),6000);
 try{const res=await fetchFn(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_en,brands,quantity`,{signal:ctl.signal,headers:{'User-Agent':'FamTray/1.7.15 (family kitchen app)'}});
  if(res.status===404)return{found:false};if(!res.ok)return{error:'unreachable'};const j:any=await res.json();if(j?.status!==1||!j.product)return{found:false};
  const p=j.product;const name=cleanText(p.product_name_en||p.product_name,120);return name?{found:true,name,brand:cleanText(String(p.brands||'').split(',')[0],60),quantity:cleanText(p.quantity,40)}:{found:false}}
 catch{return{error:'unreachable'}}finally{clearTimeout(t)}}
export const sydneyDay=(now=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
