// v1.7.3 Family sync guard. A merged write may only remove an item the writer saw and deliberately deleted: every
// id in a top-level id-keyed list of the stored state (recipes, members, pantry, receipts, products, stores …) and
// in each week's shopping extras must still be present in the new state, or be tombstoned by it
// (state.syncTombstones["<list>/<id>"], or deletedRecipeIds for recipes). Anything else is refused so a client bug or
// a stale base can never drop family data. Pure function; the handler decides what to answer.
const isObj=(x:any)=>!!x&&typeof x==='object'&&!Array.isArray(x);
function keyed(a:any):boolean{if(!Array.isArray(a)||!a.length)return false;const seen=new Set();for(const x of a){if(!isObj(x)||!(typeof x.id==='string'&&x.id||typeof x.id==='number'))return false;const k=String(x.id);if(seen.has(k))return false;seen.add(k)}return true}
export function droppedItems(stored:any,next:any):string[]{
 if(!isObj(stored)||!isObj(next))return[];
 const tomb=isObj(next.syncTombstones)?next.syncTombstones:{},deleted=new Set(Array.isArray(next.deletedRecipeIds)?next.deletedRecipeIds:[]),out:string[]=[];
 const check=(path:string,a:any,b:any,recipes=false)=>{if(!keyed(a))return;const ids=new Set(Array.isArray(b)?b.filter(isObj).map((x:any)=>String(x.id)):[]);for(const x of a){const id=String(x.id);if(ids.has(id))continue;if(Number.isFinite(tomb[path+'/'+id])||recipes&&deleted.has(id))continue;out.push(path+'/'+id)}};
 for(const [k,v] of Object.entries(stored))if(k!=='recipeRevisions')check(k,v,next[k],k==='recipes');
 if(isObj(stored.weeks))for(const [w,week] of Object.entries(stored.weeks as any)){const nw=isObj(next.weeks)?(next.weeks as any)[w]:undefined;if(!nw)continue;check('weeks/'+w+'/extras',(week as any)?.extras,nw?.extras)}
 return out;
}
