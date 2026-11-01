'use strict';
// v1.6 lazy reference catalog. The 740-recipe reference data (recipe-catalog-data.js, generated from
// recipe-catalog.ts by the build) is no longer part of the startup pack. The build concatenates the
// catalog's small diet/label helpers with this file into recipe-catalog-core.js, which keeps the old
// slot in the startup order. Family-authored recipes and planned meals live in the family state and
// never need the catalog. The catalog is fetched when the library, meal editor or menu generator
// needs it (await ensureCatalog()), and before app start only when a new or older household still
// has to receive the reference recipes. Once downloaded the service worker keeps it for offline use.
const BEP_CATALOG_HASH='__BEP_CATALOG_HASH__';
const BEP_CATALOG_PATH='recipe-catalog-data.js';
let catalogPromise=null,catalogUpgradeQueued=false;
function catalogUrl(){return BEP_CATALOG_PATH+'?v='+encodeURIComponent(BEP_CATALOG_HASH)}
function catalogLoaded(){return typeof PLANT_RECIPES!=='undefined'&&typeof WESTERN_HEALTHY_RECIPES!=='undefined'&&typeof EXPANDED_RECIPES!=='undefined'}
function catalogNotify(){try{window.dispatchEvent(new Event('bep-catalog-ready'))}catch{}}
function afterCatalogLoaded(){
 try{if(typeof refreshCatalogArtSignatures==='function')refreshCatalogArtSignatures()}catch{}
 try{if(typeof libraryCatalogById!=='undefined')libraryCatalogById=null}catch{}
 catalogNotify();
}
// Fetches and runs the reference catalog once. Rejects when offline and not yet downloaded;
// callers continue with the family's own recipes and planned meals in that case.
function ensureCatalog({timeout=30000}={}){
 if(catalogLoaded())return Promise.resolve(true);
 if(catalogPromise)return catalogPromise;
 catalogPromise=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  let code='';
  try{const res=await fetch(catalogUrl(),{credentials:'same-origin',signal:controller.signal});if(!res.ok)throw Error('catalog '+res.status);code=await res.text()}finally{clearTimeout(timer)}
  if(catalogLoaded())return true;
  const script=document.createElement('script');
  script.textContent=code+'\n//# sourceURL='+new URL(BEP_CATALOG_PATH,location.href).href;
  document.head.append(script);
  if(!catalogLoaded())throw Error('Reference catalog did not load');
  afterCatalogLoaded();
  return true;
 })();
 catalogPromise.catch(()=>{catalogPromise=null});
 return catalogPromise;
}
// A household created before the catalog arrived keeps a low seedVersion (2) so any device, old or new,
// adds the reference recipes itself; it is never synced as an "already complete" edition (that would make
// older app versions tombstone the reference recipes it lacks).
function catalogPendingFor(s){return !!s&&Array.isArray(s.recipes)&&((s.seedVersion||1)<5||!!globalThis.__bepExpandedPending)}
function catalogAddExpanded(s){if((s.seedVersion||1)>=3&&!globalThis.__bepExpandedPending)return 0;globalThis.__bepExpandedPending=false;const ids=new Set(s.recipes.map(r=>r.id)),gone=new Set(s.deletedRecipeIds||[]);let added=0;for(const r of RECIPES)if(r.expanded&&!ids.has(r.id)&&!gone.has(r.id)){s.recipes.push(clone(r));ids.add(r.id);added++}if((s.seedVersion||1)<3)s.seedVersion=3;return added}
function scheduleCatalogUpgrade(){
 if(catalogUpgradeQueued)return;catalogUpgradeQueued=true;
 ensureCatalog().then(()=>{
  catalogUpgradeQueued=false;
  if(typeof state==='undefined'||!catalogPendingFor(state)||(typeof recoveryBlocked!=='undefined'&&recoveryBlocked))return;
  upgradeReferenceCatalog(state);
  if(typeof save==='function')save();
  if(typeof render==='function')try{render()}catch{}
 }).catch(()=>{catalogUpgradeQueued=false});
}
function installCatalogGuards(){
 if(globalThis.__bepCatalogGuards)return;globalThis.__bepCatalogGuards=true;
 if(typeof defaults==='function'){const base=defaults;defaults=function(){const s=base.apply(this,arguments);if(!catalogLoaded()&&s&&(s.seedVersion||1)>2)s.seedVersion=2;return s}}
 if(typeof upgradeReferenceCatalog==='function'){const base=upgradeReferenceCatalog;upgradeReferenceCatalog=function(s,knownDeleted){
  if(!s||!Array.isArray(s.recipes))return 0;
  if(catalogPendingFor(s)&&!catalogLoaded()){if(typeof mergeDeletedRecipeIds==='function')mergeDeletedRecipeIds(s,knownDeleted);scheduleCatalogUpgrade();return 0}
  const added=catalogPendingFor(s)?catalogAddExpanded(s):0;
  return added+base.call(this,s,knownDeleted);
 }}
}
// Family sync never uploads a household that is still waiting for the reference recipes.
function installCatalogSyncGuard(){
 if(typeof syncFamilyState!=='function'||syncFamilyState.__catalogGuard)return;
 const base=syncFamilyState;syncFamilyState=function(){if(typeof state!=='undefined'&&catalogPendingFor(state)&&!catalogLoaded()){scheduleCatalogUpgrade();return Promise.resolve()}return base.apply(this,arguments)};syncFamilyState.__catalogGuard=true;
}
function catalogNeededAtStartup(){
 try{if(typeof familyStorage==='undefined')return true;const raw=familyStorage.getItem('bep-gia-dinh-v1');if(!raw)return true;const match=raw.match(/"seedVersion":(\d+)/);return !match||Number(match[1])<5}catch{return true}
}
// Startup hooks run by bootstrap.js right before the named script.
if(typeof window!=='undefined'){
 window.BEP_SCRIPT_HOOKS=Object.assign(window.BEP_SCRIPT_HOOKS||{},{
  'app.js':async()=>{installCatalogGuards();if(catalogLoaded()||!catalogNeededAtStartup())return;try{await Promise.race([ensureCatalog({timeout:25000}),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),25000))])}catch{
   // Continue with the family's own and seed recipes; the reference recipes are added once the catalog arrives.
   // app.js would mark a very old (pre-edition-3) state as upgraded without them, so remember to add them later.
   try{const m=(familyStorage.getItem('bep-gia-dinh-v1')||'').match(/"seedVersion":(\d+)/);if(m&&Number(m[1])<3)globalThis.__bepExpandedPending=true}catch{}
  }},
  'push-ui.js':()=>{installCatalogSyncGuard()},
  '@ready':()=>{installCatalogSyncGuard()}
 });
 window.addEventListener('online',()=>{if(typeof state!=='undefined'&&catalogPendingFor(state))scheduleCatalogUpgrade()});
 globalThis.ensureCatalog=ensureCatalog;
}
