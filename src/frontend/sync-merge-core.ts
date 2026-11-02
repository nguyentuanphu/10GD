'use strict';
// v1.7.3 Automatic family sync merge (owner request: "devices don't sync in time → clashes").
// The family state stays one JSON document with an etag. When two devices changed it at the same time, the device whose
// write was refused merges three ways — base (last synced copy kept on this device), local (this device) and remote
// (the stored copy) — and retries. Rules:
//  • Items are matched by stable id in every array whose elements all carry a unique `id` (recipes, members, pantry,
//    receipts and their lines, shopping extras, products, stores, errands …). Meals (weeks/<w>/days/<d>/<slot>), weeks,
//    preferences and settings are items too. Within an item every field merges on its own: a field changed on one side
//    wins; equal changes agree; different changes → last writer wins by the item's `updatedAt` (ties resolve on content,
//    so both devices reach the same result).
//  • Family-authored recipe content (name, ingredients, steps, prep) is never discarded: when both sides changed it
//    differently the newer stays and the other is kept in state.recipeRevisions for the family to view and restore.
//  • An item deleted on one side and edited on the other is kept (edited) and reported. Deletions are tombstoned in
//    state.syncTombstones so a device without a base copy cannot bring them back, and deletedRecipeIds stays a union.
//  • Lists without ids (activity log, tags …) merge as sets: additions on both sides survive, removals apply.
//  • Menu reactions use their own merge (menu-reactions-core). Nothing here changes recipe quantities.
// Writes stamp `updatedAt` (ms) / `updatedBy` on the items they change (syncStamp). Older states have no stamps: they
// count as time 0 (the baseline) and lose only to a real, stamped edit — never silently to another unstamped copy.
const SYNC_META=new Set(['updatedAt','updatedBy']);
const SYNC_RECIPE_CONTENT=['name','ingredients','steps','prep'];
// Arrays that are whole values (recipe content, cooked-meal records, reaction histories, a meal's chosen dishes).
const SYNC_ATOMIC=new Set(['ingredients','steps','consumed','h','why','missingIngredients']);
const SYNC_TOMBSTONE_DAYS=120,SYNC_TOMBSTONE_MAX=4000,SYNC_REVISION_MAX=200;
const syncIsObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function syncEq(a,b){if(a===b)return true;if(typeof a!==typeof b||!a||!b||typeof a!=='object')return false;if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!syncEq(a[i],b[i]))return false;return true}if(Array.isArray(b))return false;const ka=Object.keys(a),kb=Object.keys(b);if(ka.length!==kb.length)return false;for(const k of ka){if(!Object.hasOwn(b,k)||!syncEq(a[k],b[k]))return false}return true}
// Equality that ignores item stamps (an item re-saved without a real change is unchanged).
function syncEqContent(a,b){if(!syncIsObj(a)||!syncIsObj(b))return syncEq(a,b);const ka=Object.keys(a).filter(k=>!SYNC_META.has(k)),kb=Object.keys(b).filter(k=>!SYNC_META.has(k));if(ka.length!==kb.length)return false;for(const k of ka)if(!Object.hasOwn(b,k)||!syncEq(a[k],b[k]))return false;return true}
function syncStable(x){if(Array.isArray(x))return'['+x.map(syncStable).join(',')+']';if(syncIsObj(x))return'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+syncStable(x[k])).join(',')+'}';return x===undefined?'null':JSON.stringify(x)}
function syncHash(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')}
const syncClone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
// Path helpers. A path is a list of keys; inside id-keyed arrays the segment is the item id.
function syncIsMealPath(p){return p.length===5&&p[0]==='weeks'&&p[2]==='days'}
function syncIsItemPath(p,inKeyed){return inKeyed||p.length===0||syncIsMealPath(p)||p.length===2&&p[0]==='weeks'||p.length===1&&(p[0]==='preferences'||p[0]==='settings')}
function syncAtomicPath(p){const k=p[p.length-1];return SYNC_ATOMIC.has(k)||k==='recipes'&&p.length===6&&p[0]==='weeks'}
function syncKeyedArray(...lists){let any=false;for(const a of lists){if(a===undefined||a===null)continue;if(!Array.isArray(a))return false;const seen=new Set();for(const x of a){if(!syncIsObj(x)||!(typeof x.id==='string'&&x.id||typeof x.id==='number'))return false;const k=String(x.id);if(seen.has(k))return false;seen.add(k)}any=true}return any}
const syncPrimitiveList=a=>Array.isArray(a)&&a.every(x=>x===null||typeof x!=='object');
const syncTs=x=>syncIsObj(x)&&Number.isFinite(x.updatedAt)?x.updatedAt:0;
function syncPick(l,r,tl,tr){if(tl!==tr)return tl>tr?l:r;return syncStable(l)>=syncStable(r)?l:r}
// Set merge for lists without ids: union of both sides minus anything either side removed from the base.
function syncMergeList(b,l,r){const key=x=>syncStable(x),count=a=>{const m=new Map();for(const x of a||[])m.set(key(x),(m.get(key(x))||0)+1);return m};const B=count(b),L=count(l),R=count(r),out=[],used=new Map();
 const want=k=>{const nb=B.get(k)||0,nl=L.get(k)||0,nr=R.get(k)||0;if(!nb)return Math.max(nl,nr);return Math.min(nl,nr)+Math.max(0,nl-nb)+Math.max(0,nr-nb)};
 const push=x=>{const k=key(x),n=used.get(k)||0;if(n<want(k)){out.push(x);used.set(k,n+1)}};
 const rKeys=(r||[]).map(key);for(const x of l||[])push(x);
 // Remote-only entries go next to their remote neighbour (a newest-first log keeps new remote rows at the top).
 (r||[]).forEach((x,i)=>{const k=rKeys[i];if((used.get(k)||0)>=want(k))return;let at=-1;for(let j=i-1;j>=0&&at<0;j--){at=out.findIndex(y=>key(y)===rKeys[j])}const n=used.get(k)||0;used.set(k,n+1);out.splice(at+1,0,x)});
 return out}
function syncResolve(s,path){let cur=s;for(const seg of path){if(Array.isArray(cur))cur=cur.find(x=>syncIsObj(x)&&String(x.id)===seg);else if(syncIsObj(cur))cur=cur[seg];else return undefined;if(cur===undefined)return undefined}return cur}
function syncMergeTombstones(a,b,now){const out={};for(const src of [a,b])if(syncIsObj(src))for(const[k,v]of Object.entries(src))if(Number.isFinite(v)&&(!(k in out)||v>out[k]))out[k]=v;const cutoff=now-SYNC_TOMBSTONE_DAYS*86400000;const rows=Object.entries(out).filter(([,v])=>v>=cutoff).sort((x,y)=>y[1]-x[1]||(x[0]<y[0]?-1:1)).slice(0,SYNC_TOMBSTONE_MAX);return Object.fromEntries(rows.sort((x,y)=>x[0]<y[0]?-1:x[0]>y[0]?1:0))}
function syncRecipeContent(r){const o={};for(const f of SYNC_RECIPE_CONTENT)if(r&&r[f]!==undefined)o[f]=syncClone(r[f]);return o}
// Three-way merge of the whole family state. base may be null (no common copy known): then every difference is
// resolved by timestamps and tombstones, and nothing present on either side is dropped unless it was tombstoned later.
function mergeFamilyStates(base,local,remote,{now=Date.now()}={}){
 const ctx={now,hasBase:syncIsObj(base),notes:[],conflicts:[],revisions:[],merged:0,tombL:syncIsObj(local?.syncTombstones)?local.syncTombstones:{},tombR:syncIsObj(remote?.syncTombstones)?remote.syncTombstones:{}};
 const b=ctx.hasBase?base:undefined;
 const out=syncM(b,local,remote,[],ctx,syncTs(local),syncTs(remote),false);
 // Tombstones: union; a tombstone whose item survived the merge (edited elsewhere) is dropped so it stays kept.
 const tomb=syncMergeTombstones(local?.syncTombstones,remote?.syncTombstones,now);
 for(const k of Object.keys(tomb))if(syncResolve(out,k.split('/'))!==undefined)delete tomb[k];
 if(Object.keys(tomb).length)out.syncTombstones=tomb;else delete out.syncTombstones;
 if(ctx.revisions.length){const list=Array.isArray(out.recipeRevisions)?out.recipeRevisions:[];for(const rev of ctx.revisions)if(!list.some(x=>x.id===rev.id))list.push(rev);out.recipeRevisions=list}
 if(Array.isArray(out.recipeRevisions)&&out.recipeRevisions.length>SYNC_REVISION_MAX){const keep=[...out.recipeRevisions].sort((x,y)=>Number(!!y.open)-Number(!!x.open)||(y.at||0)-(x.at||0)).slice(0,SYNC_REVISION_MAX);out.recipeRevisions=out.recipeRevisions.filter(x=>keep.includes(x))}
 return{state:out,notes:ctx.notes,conflicts:ctx.conflicts,changedLocal:!syncEq(out,local),changedRemote:!syncEq(out,remote)};
}
function syncM(b,l,r,path,ctx,tl,tr,inKeyed){
 if(syncEq(l,r))return l;
 if(ctx.hasBase&&syncEq(b,l))return r;
 if(ctx.hasBase&&syncEq(b,r))return l;
 if(l===undefined||r===undefined){
  const kept=l===undefined?r:l;
  // Without a base: a key present on one side only is kept (no silent loss). With a base: deleted vs edited → keep edited.
  if(ctx.hasBase&&b!==undefined&&(inKeyed||syncIsMealPath(path)))ctx.notes.push({type:'kept-edited',path:path.join('/'),name:typeof kept?.name==='string'?kept.name:undefined});
  return kept}
 const item=syncIsItemPath(path,inKeyed);
 if(item&&syncIsObj(l)&&syncIsObj(r)){tl=Math.max(syncTs(l),0);tr=Math.max(syncTs(r),0)}
 const key=path[path.length-1];
 if(path.length===1&&key==='menuReactions'&&typeof mergeMenuReactions==='function'&&syncIsObj(l)&&syncIsObj(r))return mergeMenuReactions(l,r);
 if(path.length===1&&(key==='syncTombstones'))return l;// merged at the end
 if(path.length===1&&key==='deletedRecipeIds'&&Array.isArray(l)&&Array.isArray(r))return syncMergeList(b,l,r).filter((x,i,a)=>a.indexOf(x)===i);
 if(syncIsObj(l)&&syncIsObj(r)){
  if(path.length===2&&path[0]==='recipes'&&inKeyed)return syncMergeRecipe(syncIsObj(b)?b:undefined,l,r,path,ctx,tl,tr);
  return syncMergeObject(syncIsObj(b)?b:undefined,l,r,path,ctx,tl,tr,item)}
 if(Array.isArray(l)&&Array.isArray(r)&&!syncAtomicPath(path)){
  if(syncKeyedArray(b,l,r))return syncMergeKeyed(Array.isArray(b)?b:undefined,l,r,path,ctx,tl,tr);
  if(Array.isArray(b)||!ctx.hasBase||syncPrimitiveList(l)&&syncPrimitiveList(r))return syncMergeList(Array.isArray(b)?b:[],l,r)}
 return syncPick(l,r,tl,tr);
}
function syncMergeObject(b,l,r,path,ctx,tl,tr,item){
 const out={};const keys=[...Object.keys(l)];for(const k of Object.keys(r))if(!Object.hasOwn(l,k))keys.push(k);
 for(const k of keys){if(item&&SYNC_META.has(k))continue;const v=syncM(b?.[k],l[k],r[k],[...path,k],ctx,tl,tr,false);if(v!==undefined)out[k]=v}
 if(item){const sl=syncTs(l),sr=syncTs(r),win=sl!==sr?(sl>sr?l:r):(String(l.updatedBy||'')>=String(r.updatedBy||'')?l:r);if(sl||sr){out.updatedAt=Math.max(sl,sr);if(win.updatedBy!==undefined)out.updatedBy=win.updatedBy}}
 return out}
function syncMergeKeyed(b,l,r,path,ctx,tl,tr){
 const B=new Map((b||[]).map(x=>[String(x.id),x])),L=new Map(l.map(x=>[String(x.id),x])),R=new Map(r.map(x=>[String(x.id),x]));
 const decide=(id)=>{const bi=B.get(id),li=L.get(id),ri=R.get(id),p=[...path,id],tomb=p.join('/');
  if(li!==undefined&&ri!==undefined)return syncM(bi,li,ri,p,ctx,tl,tr,true);
  const only=li!==undefined?li:ri,otherTomb=li!==undefined?ctx.tombR[tomb]:ctx.tombL[tomb];
  if(ctx.hasBase&&bi!==undefined){ // the other side deleted it
   if(syncEqContent(bi,only))return undefined;
   ctx.notes.push({type:'kept-edited',path:tomb,name:typeof only.name==='string'?only.name:undefined});return only}
  // Added on one side, or no base: keep unless the other side tombstoned it after this copy's last edit.
  if(Number.isFinite(otherTomb)&&otherTomb>=syncTs(only))return undefined;
  if(Number.isFinite(otherTomb))ctx.notes.push({type:'kept-edited',path:tomb,name:typeof only.name==='string'?only.name:undefined});
  return only};
 const out=[],placed=new Set();
 for(const x of l){const id=String(x.id),v=decide(id);placed.add(id);if(v!==undefined)out.push(v)}
 r.forEach((x,i)=>{const id=String(x.id);if(placed.has(id))return;placed.add(id);const v=decide(id);if(v===undefined)return;let at=-1;for(let j=i-1;j>=0&&at<0;j--){const prev=String(r[j].id);at=out.findIndex(y=>String(y.id)===prev)}out.splice(at+1,0,v)});
 return out}
// Recipe: non-content fields merge like any item. Content changed differently on both sides → the newer content stays and
// the other version is kept as an open revision ("Có 2 bản chỉnh sửa — xem bản kia"); never discarded.
function syncMergeRecipe(b,l,r,path,ctx,tl,tr){
 const out=syncMergeObject(b,l,r,path,ctx,tl,tr,true);
 const clash=SYNC_RECIPE_CONTENT.filter(f=>!syncEq(l[f],r[f])&&(!b||!syncEq(b[f],l[f])&&!syncEq(b[f],r[f])));
 if(!clash.length)return out;
 const sl=syncTs(l),sr=syncTs(r),winner=syncPick(l,r,sl,sr),loser=winner===l?r:l;
 for(const f of clash){if(winner[f]===undefined)delete out[f];else out[f]=winner[f]}
 const content=syncRecipeContent(loser),id='rev-'+syncHash(String(l.id)+'|'+syncStable(content)+'|'+syncTs(loser));
 const rev={id,recipeId:String(l.id),at:ctx.now,editedAt:syncTs(loser)||null,by:loser.updatedBy||null,keptBy:winner.updatedBy||null,source:'sync',open:true,fields:clash,...content};
 ctx.revisions.push(rev);ctx.conflicts.push({recipeId:String(l.id),name:String(out.name||''),revisionId:id,fields:clash});
 return out}
// Stamp the items a local write changed (prev = this device's previous copy). Deleted ids become tombstones.
function syncStamp(prev,next,{now=Date.now(),by=''}={}){
 if(!syncIsObj(next))return 0;let stamped=0;const tomb=syncIsObj(next.syncTombstones)?next.syncTombstones:{};
 const walk=(p,n,path,inKeyed)=>{
  if(syncEq(p,n))return false;// only changed subtrees are walked
  if(syncIsObj(n)){const item=syncIsItemPath(path,inKeyed);let ch=!syncIsObj(p);
   for(const k of Object.keys(n)){if(SYNC_META.has(k)&&item)continue;if(path.length===0&&(k==='syncTombstones'||k==='updatedAt'||k==='updatedBy'))continue;if(walk(syncIsObj(p)?p[k]:undefined,n[k],[...path,k],false))ch=true}
   if(syncIsObj(p))for(const k of Object.keys(p))if(!Object.hasOwn(n,k)&&!(item&&SYNC_META.has(k)))ch=true;
   if(ch&&item&&path.length){n.updatedAt=now;if(by)n.updatedBy=by;else delete n.updatedBy;stamped++}
   return ch}
  if(Array.isArray(n)&&!syncAtomicPath(path)&&syncKeyedArray(n)&&(p===undefined||syncKeyedArray(p))){
   const P=new Map((p||[]).map(x=>[String(x.id),x]));let ch=!Array.isArray(p)||p.length!==n.length;
   n.forEach((x,i)=>{const id=String(x.id);if(!P.has(id))delete tomb[[...path,id].join('/')];if(walk(P.get(id),x,[...path,id],true))ch=true;if(!ch&&String(p[i]?.id)!==id)ch=true});
   const ids=new Set(n.map(x=>String(x.id)));for(const id of P.keys())if(!ids.has(id)){tomb[[...path,id].join('/')]=now;ch=true}
   return ch}
  return true};
 const changed=walk(prev,next,[],false);
 if(Object.keys(tomb).length)next.syncTombstones=syncMergeTombstones(tomb,{},now);else delete next.syncTombstones;
 if(changed){next.updatedAt=now;if(by)next.updatedBy=by}
 return changed?stamped+1:0}
// Push with automatic merge on a stale write. deps: put(body)→{status,data}, fetchRemote()→{state,etag},
// local()→current state, base()/etag(), apply({state,etag,remote,report}), synced({etag,sent}), sleep(ms), random().
// Bounded retries with jitter; never stops on a normal clash. Returns {ok, merged, conflicts, attempts, reason}.
async function syncPushLoop(deps){
 const max=deps.maxAttempts||5;let merged=0,conflicts=[],notes=[],dropRetry=false;
 for(let attempt=1;attempt<=max;attempt++){
  const sent=JSON.parse(JSON.stringify(deps.local()));
  const res=await deps.put({state:sent,etag:deps.etag(),sync:2,...(merged?{merge:{merged:true,conflicts:conflicts.length}}:{})});
  if(res.status>=200&&res.status<300){deps.synced({etag:res.data?.etag,sent});return{ok:true,merged,conflicts,notes,attempts:attempt}}
  if(res.status!==409)return{ok:false,status:res.status,merged,conflicts,notes,attempts:attempt,reason:'http'};
  let remote=res.data&&Object.hasOwn(res.data,'state')&&Object.hasOwn(res.data,'etag')?{state:res.data.state,etag:res.data.etag}:await deps.fetchRemote();
  if(deps.blocked&&deps.blocked(remote))return{ok:false,merged,conflicts,notes,attempts:attempt,reason:'blocked'};
  if(!remote?.state){// the stored copy vanished: write ours as new
   deps.apply({state:deps.local(),etag:null,remote:null,report:null});continue}
  // Guard refusal: our merge would have dropped items we never saw — merge again without a base (union) and retry.
  const useBase=res.data?.reason==='would_drop'?null:deps.base();if(useBase===null&&res.data?.reason==='would_drop'){if(dropRetry)return{ok:false,merged,conflicts,notes,attempts:attempt,reason:'would_drop'};dropRetry=true}
  // A device that never had a family copy (etag null) and has not edited anything takes the stored copy as it is
  // (two new devices opening a new family at once must not double the starter data).
  const fresh=deps.etag()===null&&!Number.isFinite(deps.local()?.updatedAt);
  const report=fresh?{state:JSON.parse(JSON.stringify(remote.state)),conflicts:[],notes:[]}:mergeFamilyStates(useBase,deps.local(),remote.state,{now:deps.now?deps.now():Date.now()});
  if(!fresh)merged++;conflicts=[...conflicts,...report.conflicts.filter(c=>!conflicts.some(x=>x.revisionId===c.revisionId))];notes=[...notes,...report.notes];
  deps.apply({state:report.state,etag:remote.etag,remote:remote.state,report});
  if(fresh){deps.synced({etag:remote.etag,sent:remote.state});return{ok:true,merged,conflicts,notes,attempts:attempt,adopted:true}}
  if(attempt<max)await deps.sleep(Math.round((80+deps.random()*220)*attempt));
 }
 return{ok:false,merged,conflicts,notes,attempts:max,reason:'retries'};
}
if(typeof module==='object'&&module&&module.exports)module.exports={mergeFamilyStates,syncStamp,syncPushLoop,syncEq,syncStable};
