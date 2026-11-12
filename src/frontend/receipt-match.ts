'use strict';
// v1.7.2 "Ghép giá với giỏ đi chợ" — pure logic for generic / local-grocer receipt lines (no DOM; runs in
// node:vm for tests). The receipt parser (receipt-parse.ts) marks lines that name no item ("GROCERY 4.50",
// "VEG 3.20", "DEPT 01", a PLU or a price on its own) as generic; they are NEVER matched automatically.
// This module only RANKS suggestions the family confirms with one tap, each with a one-line reason:
//  • the family's own prices for an item at this store (and stores in the same area) from saved receipts,
//  • So Giá community prices (verified first; unverified single reports count less),
//  • $/kg plausibility of a weighed line for the item's group (meat/fish vs vegetables) and the printed
//    department word (MEAT, VEG, SEAFOOD…),
//  • the order items were ticked "đã mua" in the shopping list vs the order of lines on the receipt,
//  • the printed total: one line may cover several items (a combination is only offered when the family's
//    prices for those items add up to the line), and a joint pass across all lines prefers assignments whose
//    expected prices add up to what the unmatched lines cost; combinations that don't add up rank lower,
//  • per-store learning (store + generic label/PLU + price band → item), which the family can forget.
// Scoring is deterministic: same input → same ranking (ties broken by key). Nothing here invents a price or a
// quantity; a line without a confirmed match is saved as "Đồ khác (chưa rõ)" by the UI.
(function(root){
const round=(n,d=2)=>{const f=10**d;return Math.round(n*f)/f};
const fold=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
const norm=s=>fold(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
// v1.7.19 (audit B13): So Giá and matching amounts are Australian store prices (AUD), written with the app's formatter
const money=n=>typeof aud==='function'?aud(Math.abs(+n||0),'AUD'):'$'+Math.abs(+n||0).toFixed(2);
const median=a=>{const v=a.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!v.length)return null;const m=v.length>>1;return v.length%2?v[m]:(v[m-1]+v[m])/2};
const R=(code,vi,en)=>({code,vi,en});

// ------------------------------------------------------------ stores and areas
// Words that say what kind of shop it is, not where: they never make two stores "the same area".
const STORE_WORDS=new Set(('grocery groceries grocer supermarket supermarkets mart minimart market markets asian viet vietnamese chinese thai korean '+
 'fresh food foods store stores shop shops pty ltd co the and of butcher butchers meat meats seafood fish fruit fruits veg produce bakery deli '+
 'international oriental trading warehouse import imports family discount city central plaza shopping centre center street st road rd '+
 'nsw vic qld sa wa tas act nt cho tiem sieu thi').split(' '));
const storeKey=s=>norm(s);
function areaTokens(s){return norm(s).split(' ').filter(t=>t.length>=4&&!/\d/.test(t)&&!STORE_WORDS.has(t))}
function sameStore(a,b){const x=storeKey(a),y=storeKey(b);if(!x||!y)return false;return x===y||x.length>=6&&y.length>=6&&(x.includes(y)||y.includes(x))}
function sameArea(a,b){const A=areaTokens(a),B=new Set(areaTokens(b));return A.some(t=>B.has(t))}
// A local / independent grocer (not a big chain the parser knows): community retailer id for So Giá.
function localRetailer(store){return/\b(viet|vietnam|asian|chinese|oriental|cho|tiem|grocer|grocery|groceries|market|mart|butcher|seafood|fruit|veg|produce|bakery|deli)\b/.test(norm(store))?'viet-grocer':'other'}

// ------------------------------------------------------------ line keys and price bands
function lineKey(line){return line.genericKey||(line.plu?'p:'+line.plu:line.label?'l:'+norm(line.label):'price')}
// Two prices are "the same band" when within ±15% (at least ±$0.30) of what was learned.
function inBand(p,lo,hi){return p>=Math.max(0,lo*0.85-0.3)-1e-9&&p<=hi*1.15+0.3+1e-9}
// Department words → item group. "dept nn" and plain prices say nothing.
function labelGroup(key){const k=String(key||'');if(/^l:(meat|seafood|deli)\b/.test(k))return'meat';if(/^l:(veg|produce|fruit|fruit veg)\b/.test(k))return'veg';if(/^l:grocery\b/.test(k))return'dry';return null}
// $/kg that is plausible for a group when sold BY WEIGHT (AUD, wide on purpose): meat/fish 6–90, loose vegetables & fruit
// 0.5–10 (herbs and leafy greens are sold by the bunch, so a weighed line above $10/kg is not a vegetable).
const PER_KG={meat:[6,90],veg:[0.5,10]};

// ------------------------------------------------------------ history (family receipts) and community prices
// receipts: state.receipts. Returns Map targetKey → {store:[p], area:[p]} of single-item line totals.
function familyHistory(receipts,{store,excludeId=null}={}){
 const out=new Map();
 for(const r of receipts||[]){if(!r||r.id===excludeId||r.refund||(r.currency||'AUD')!=='AUD')continue;const here=sameStore(r.store,store),area=!here&&sameArea(r.store,store);if(!here&&!area)continue;
  for(const i of r.items||[]){const key=i.ingredient?'i:'+i.ingredient:i.basket?.name?'x:'+norm(i.basket.name):null;if(!key||!(+i.total>0)||i.covers)continue;
   const h=out.get(key)||{store:[],area:[],perKg:[]};(here?h.store:h.area).push(round(+i.total));if(i.perKg>0)h.perKg.push(+i.perKg);out.set(key,h)}}
 return out;
}
// community: [{targetKey, price, status, area:boolean}] (built by the UI from So Giá data).
function communityFor(community,key){const rows=(community||[]).filter(c=>c.targetKey===key&&+c.price>0);
 const pick=st=>rows.filter(c=>st.includes(c.status));const conf=pick(['confirmed']),un=pick(['pending','unverified']);
 const best=(list)=>{const near=list.filter(c=>c.area);const use=near.length?near:list;return use.length?{price:median(use.map(c=>+c.price)),area:!!near.length,n:use.length}:null};
 const c=best(conf);if(c)return{...c,verified:true};const u=best(un);return u?{...u,verified:false}:null}
// Expected price of one basket item for a line: the family's own price here, then the area, then So Giá.
function expected(item,ctx){
 const h=ctx.history.get(item.key);
 if(h&&h.store.length){const lo=Math.min(...h.store),hi=Math.max(...h.store);return{value:median(h.store),weight:3,lo,hi,source:'store',n:h.store.length}}
 if(h&&h.area.length){const lo=Math.min(...h.area),hi=Math.max(...h.area);return{value:median(h.area),weight:2,lo,hi,source:'area',n:h.area.length}}
 const c=communityFor(ctx.community,item.key);if(c)return{value:c.price,weight:c.verified?(c.area?2:1.5):0.75,lo:c.price,hi:c.price,source:c.verified?'community':'community-unverified',area:c.area,n:c.n};
 return null;
}
function closeness(p,e){return Math.max(0,1-Math.abs(p-e)/Math.max(0.3,0.2*e))}
function expectedReason(item,e,lang){
 const range=e.lo!==e.hi?`${money(e.lo)}–${money(e.hi)}`:money(e.value);
 if(e.source==='store')return R('history',`Lần trước ở cửa hàng này ${item.name} ${range}`,`Last time at this store ${item.name} was ${range}`);
 if(e.source==='area')return R('history-area',`Gia đình mua ${item.name} ở cửa hàng gần đó ${range}`,`Your family paid ${range} for ${item.name} at a store nearby`);
 if(e.source==='community')return R('community',`So Giá: ${item.name} ${money(e.value)}${e.area?' ở khu này':''} (đã xác minh)`,`Price Check: ${item.name} ${money(e.value)}${e.area?' in this area':''} (verified)`);
 return R('community-unverified',`So Giá: ${item.name} ${money(e.value)} (chưa xác minh)`,`Price Check: ${item.name} ${money(e.value)} (not verified)`);
}

// ------------------------------------------------------------ learning (per store, synced with family data)
// model: {entries:[{id, store, key, lo, hi, n, target:{key,kind,id,name}, at}]}
const LEARN_MAX=400;
function cleanModel(m){const ok=e=>e&&typeof e.id==='string'&&typeof e.store==='string'&&typeof e.key==='string'&&Number.isFinite(e.lo)&&Number.isFinite(e.hi)&&e.target&&typeof e.target.key==='string';return{entries:(Array.isArray(m?.entries)?m.entries:[]).filter(ok).slice(-LEARN_MAX)}}
function learn(model,{store,line,target,at,id}){
 const m=model;m.entries??=[];const s=storeKey(store),key=lineKey(line),p=round(+line.price);if(!s||!(p>0)||!target?.key)return null;
 let e=m.entries.find(x=>x.store===s&&x.key===key&&x.target.key===target.key&&inBand(p,x.lo,x.hi));
 if(e){e.lo=Math.min(e.lo,p);e.hi=Math.max(e.hi,p);e.n=(e.n||1)+1;e.at=at||e.at;e.target={...e.target,...target};}
 else{e={id:id||('rl-'+s.slice(0,12).replace(/ /g,'-')+'-'+key.replace(/[^a-z0-9]+/g,'')+'-'+String(m.entries.length+1)),store:s,storeLabel:String(store).slice(0,60),key,lo:p,hi:p,n:1,target:{key:target.key,kind:target.kind,id:target.id,name:target.name},at:at||null};m.entries.push(e)}
 if(m.entries.length>LEARN_MAX)m.entries.splice(0,m.entries.length-LEARN_MAX);
 return e;
}
function forget(model,id){const n=(model.entries||[]).length;model.entries=(model.entries||[]).filter(e=>e.id!==id);return n!==model.entries.length}
function learnedAt(model,store){const s=storeKey(store);return(model?.entries||[]).filter(e=>e.store===s||sameStore(e.storeLabel||e.store,store))}

// ------------------------------------------------------------ scoring
// lines: [{index, price, label, genericKey, plu, weightKg, perKg}] (unmatched lines, in receipt order)
// basket: [{key, kind:'ingredient'|'extra', id, name, group:'meat'|'veg'|'dry'|'other'|null, boughtAt:iso|null}]
// ctx: {history (familyHistory), community, learned (learnedAt), printedTotal, knownTotal}
function tickRanks(basket){const ticked=basket.filter(b=>b.boughtAt).slice().sort((a,b)=>String(a.boughtAt).localeCompare(String(b.boughtAt))||a.key.localeCompare(b.key));const m=new Map();ticked.forEach((b,i)=>m.set(b.key,{i,n:ticked.length}));return m}
function scoreSingle(line,item,ctx,pos){
 let score=0;const reasons=[];const p=+line.price;
 const e=expected(item,ctx);
 if(e&&p>0){const c=closeness(p,e.value);if(c>0){score+=e.weight*c;reasons.push(expectedReason(item,e))}else score-=0.5}
 // learned mapping for this store + label/PLU
 const key=lineKey(line);
 for(const l of ctx.learned||[]){if(l.key!==key||l.target.key!==item.key)continue;
  if(inBand(p,l.lo,l.hi)){score+=4;reasons.unshift(R('learned',`Đã ghép trước đây ở cửa hàng này: ${labelText(line)} ${l.lo===l.hi?money(l.lo):money(l.lo)+'–'+money(l.hi)} → ${item.name}`,`Matched before at this store: ${labelText(line)} ${l.lo===l.hi?money(l.lo):money(l.lo)+'–'+money(l.hi)} → ${item.name}`))}
  else{score+=1;reasons.push(R('learned-label',`Ở cửa hàng này ${labelText(line)} từng là ${item.name} (giá khác)`,`At this store ${labelText(line)} was ${item.name} before (different price)`))}}
 // weighed line: $/kg plausible for the item's group?
 const g=item.group;
 if(line.perKg>0&&PER_KG[g]){const[lo,hi]=PER_KG[g];const ok=line.perKg>=lo&&line.perKg<=hi;const what=g==='meat'?['thịt/cá','meat/fish']:['rau củ','vegetables'];
  if(ok){score+=1.5;reasons.push(R('per-kg',`${line.weightKg} kg × ${money(line.perKg)}/kg hợp với ${what[0]}`,`${line.weightKg} kg × ${money(line.perKg)}/kg fits ${what[1]}`))}
  else{score-=3;reasons.push(R('per-kg-odd',`${money(line.perKg)}/kg không giống giá ${what[0]}`,`${money(line.perKg)}/kg does not look like ${what[1]}`))}}
 // printed department word
 const lg=labelGroup(key);
 if(lg&&g&&g!=='other'){if(lg===g){score+=1;reasons.push(R('label',`Dòng ghi ${labelText(line)}`,`The line says ${labelText(line)}`))}else if(lg!=='dry'&&g!=='dry')score-=2}
 // order of "đã mua" ticks vs receipt order
 const t=ctx.ticks.get(item.key);
 if(t){score+=0.5;if(pos.n>1&&t.n>1){const c=1-Math.abs(pos.i/(pos.n-1)-t.i/(t.n-1));if(c>=0.75){score+=1.5*c;reasons.push(R('tick-order',`Thứ tự “đã mua” (${t.i+1}/${t.n}) khớp thứ tự trên hoá đơn (dòng ${line.index+1})`,`Order ticked “bought” (${t.i+1}/${t.n}) matches the receipt order (line ${line.index+1})`))}}
  else if(pos.n===1&&t.n===1){score+=1.5;reasons.push(R('tick-order',`Món duy nhất đã đánh dấu “đã mua”`,`The only item ticked “bought”`))}
  if(!reasons.some(r=>r.code==='tick-order'))reasons.push(R('ticked',`Đã đánh dấu “đã mua”`,`Ticked “bought”`))}
 return{targets:[item.key],score:round(score,4),reasons,expected:e?e.value:null,fit:e?Math.abs(p-e.value)<=Math.max(0.05,0.02*e.value):false};
}
function labelText(line){return line.label&&line.label.trim()?line.label.trim():money(line.price)}
// Combination of 2–3 items for one line, only when each item has an expected price and they add up.
function scoreCombo(line,items,ctx){
 const es=items.map(i=>expected(i,ctx));if(es.some(e=>!e))return null;const sum=round(es.reduce((n,e)=>n+e.value,0));const p=+line.price;
 // the parts must add up: within ±5% (at least ±$0.15) of the printed line, otherwise the combination is not offered
 const tol=Math.max(0.15,0.05*p);if(Math.abs(p-sum)>tol+1e-9)return null;const c=1-Math.abs(p-sum)/(2*tol);
 const w=Math.min(...es.map(e=>e.weight));let score=w*c-1*(items.length-1);
 const reasons=[R('combo',`${items.map((i,k)=>i.name+' '+money(es[k].value)).join(' + ')} = ${money(sum)} ≈ ${money(p)}`,`${items.map((i,k)=>i.name+' '+money(es[k].value)).join(' + ')} = ${money(sum)} ≈ ${money(p)}`)];
 const lg=labelGroup(lineKey(line));if(lg&&items.every(i=>i.group===lg)){score+=1;reasons.push(R('label',`Dòng ghi ${labelText(line)}`,`The line says ${labelText(line)}`))}
 if(items.every(i=>ctx.ticks.has(i.key))){score+=0.5;reasons.push(R('ticked',`Đều đã đánh dấu “đã mua”`,`All ticked “bought”`))}
 return{targets:items.map(i=>i.key),score:round(score,4),reasons,expected:sum,fit:Math.abs(p-sum)<=Math.max(0.05,0.02*sum)};
}
function combos(arr,k){const out=[];const rec=(s,acc)=>{if(acc.length===k){out.push(acc.slice());return}for(let i=s;i<arr.length;i++){acc.push(arr[i]);rec(i+1,acc);acc.pop()}};rec(0,[]);return out}
// A suggestion needs real evidence; the department word or a tick alone is never enough to suggest an item.
const EVIDENCE=new Set(['history','history-area','community','community-unverified','learned','learned-label','per-kg','tick-order','combo']);
const cmp=(a,b)=>b.score-a.score||a.targets.length-b.targets.length||a.targets.join(',').localeCompare(b.targets.join(','));
// Per-line candidates (single items + combinations), best first.
function candidates(line,basket,ctx,pos,{max=5}={}){
 const out=[];for(const it of basket){const s=scoreSingle(line,it,ctx,pos);if(s.score>0)out.push(s)}
 const priced=basket.filter(i=>expected(i,ctx)).slice(0,12);
 for(const k of[2,3])for(const set of combos(priced,k)){const s=scoreCombo(line,set,ctx);if(s&&s.score>0)out.push(s)}
 return out.sort(cmp).slice(0,max);
}
// Joint pass (beam search): each basket item is used by at most one line; assignments whose expected prices add
// up to what the unmatched lines cost (printed total − lines already known) score higher.
// exclude: basket keys already used by matched lines (still counted for the tick order).
function suggest({lines,basket,exclude=[],history=new Map(),community=[],learned=[],printedTotal=null,knownTotal=0,beam=40,show=3}){
 const ctx={history,community,learned,ticks:tickRanks(basket)},ex=new Set(exclude),free=basket.filter(b=>!ex.has(b.key));
 const L=(lines||[]).filter(l=>+l.price>0);const n=L.length;
 const per=L.map((l,i)=>candidates(l,free,ctx,l.order!=null&&l.orderN?{i:l.order,n:l.orderN}:{i,n}));
 const unmatched=round(L.reduce((s,l)=>s+(+l.price),0));
 const target=printedTotal!=null?round(printedTotal-knownTotal):unmatched;
 const totalNote=printedTotal!=null&&Math.abs(target-unmatched)>0.02?{code:'total-gap',value:round(target-unmatched),vi:`Theo tổng in, các dòng chưa rõ phải là ${money(target)} nhưng cộng lại ${money(unmatched)} — có thể đọc sót hoặc sai một dòng`,en:`From the printed total the unknown lines should come to ${money(target)} but they add up to ${money(unmatched)} — a line may be missing or misread`}:null;
 let states=[{pick:[],used:new Set(),score:0,E:0,P:0}];
 for(let i=0;i<n;i++){const next=[];
  for(const s of states){next.push({...s,pick:[...s.pick,null]});
   for(const c of per[i]){if(c.targets.some(k=>s.used.has(k)))continue;const used=new Set(s.used);c.targets.forEach(k=>used.add(k));const hasE=c.expected!=null;
    next.push({pick:[...s.pick,c],used,score:s.score+c.score,E:s.E+(hasE?c.expected:0),P:s.P+(hasE?+L[i].price:0)})}}
  next.sort((a,b)=>b.score-a.score||a.pick.map(p=>p?p.targets.join('+'):'-').join('|').localeCompare(b.pick.map(p=>p?p.targets.join('+'):'-').join('|')));states=next.slice(0,beam)}
 // total constraint: deviation between expected and actual money over the lines the assignment explains
 const final=states.map(s=>{const dev=Math.abs(s.P-s.E),pen=s.P>0?3*Math.min(1,dev/Math.max(1,s.P)):0;return{...s,total:s.score-pen,dev:round(dev)}}).sort((a,b)=>b.total-a.total||a.pick.map(p=>p?p.targets.join('+'):'-').join('|').localeCompare(b.pick.map(p=>p?p.targets.join('+'):'-').join('|')));
 const best=final[0]||{pick:[]};
 // "the whole receipt adds up" only when every unknown line is explained by expected prices that add up
 const addsUp=best.P>0&&Math.abs(best.P-unmatched)<0.005&&best.dev<=Math.max(0.05,0.02*best.P)&&Math.abs(target-unmatched)<=0.02;
 const result=L.map((l,i)=>{const joint=best.pick[i];const list=per[i].map(c=>({...c,joint:!!joint&&c.targets.join('+')===joint.targets.join('+')}));
  if(joint&&addsUp&&n>1){const j=list.find(c=>c.joint);if(j&&!j.reasons.some(r=>r.code==='total'))j.reasons=[...j.reasons,R('total',`Cả hoá đơn cộng lại khớp tổng`,`The whole receipt adds up`)]}
  // an item the joint pass gives to ANOTHER line with a stronger reason is not offered here as well
  const taken=new Map();best.pick.forEach((pk,k)=>{if(pk&&k!==i)for(const t of pk.targets)taken.set(t,pk.score)});
  for(let k=list.length-1;k>=0;k--){const c=list[k];if(!c.joint&&c.targets.some(t=>taken.has(t)&&taken.get(t)>=c.score))list.splice(k,1)}
  list.sort((a,b)=>Number(b.joint)-Number(a.joint)||cmp(a,b));
  return{index:l.index,price:+l.price,suggestions:list.filter(c=>c.score>=1&&c.reasons.some(r=>EVIDENCE.has(r.code))).slice(0,show)}});
 return{lines:result,totalNote,unmatchedTotal:unmatched,target,jointScore:best.total??0};
}

// ------------------------------------------------------------ voice / typed command
// "dòng 3 là thịt ba chỉ", "dong ba la rau muong va hanh la", "line 3 is pork belly", "line two is spinach and
// spring onion". Several commands in one sentence are allowed ("dòng 1 là gạo, dòng 2 là rau muống").
const VI_NUM={mot:1,hai:2,ba:3,bon:4,tu:4,nam:5,lam:5,sau:6,bay:7,tam:8,chin:9,muoi:10};
const EN_NUM={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,first:1,second:2,third:3,fourth:4,fifth:5};
function numberAt(words){
 const w=words;if(!w.length)return null;
 if(/^\d{1,2}$/.test(w[0]))return{n:+w[0],used:1};
 if(Object.hasOwn(EN_NUM,w[0]))return{n:EN_NUM[w[0]],used:1};
 if(w[0]==='muoi'){const u=VI_NUM[w[1]];if(u&&u<10&&w[1]!=='muoi')return{n:10+u,used:2};return{n:10,used:1}}
 if(w[0]==='hai'&&(w[1]==='muoi'||w[1]==='chuc'))return{n:20,used:2};
 if(Object.hasOwn(VI_NUM,w[0]))return{n:VI_NUM[w[0]],used:1};
 return null;
}
function parseCommand(text){
 const t=norm(String(text||'').replace(/[=:]/g,' la '));if(!t)return[];
 const parts=t.split(/\b(?=(?:dong|line|row)\b)/).map(s=>s.trim()).filter(Boolean);const out=[];
 for(const part of parts){const words=part.split(' ');if(!/^(dong|line|row)$/.test(words[0]))continue;let k=1;if(words[k]==='so'||words[k]==='number'||words[k]==='no')k++;
  const num=numberAt(words.slice(k));if(!num)continue;k+=num.used;
  if(/^(la|is|are|=|gom|co|for|was|are|thi)$/.test(words[k]||''))k++;
  const rest=words.slice(k).join(' ').trim();if(!rest)continue;
  const names=rest.split(/\s*(?:\bva\b|\bvoi\b|\band\b|\bwith\b|\bplus\b|\bcung\b|\bthem\b)\s*/).map(s=>s.trim()).filter(Boolean);
  out.push({line:num.n,names})}
 return out;
}
// names → basket keys. candidates: [{key, names:[...]}] (item name + aliases). Longest alias contained wins.
function resolveName(name,cands){
 const n=' '+norm(name)+' ';let best=null,score=0;
 for(const c of cands||[])for(const a of c.names||[]){const x=norm(a);if(x.length<2)continue;let s=0;if(n.trim()===x)s=1000+x.length;else if(n.includes(' '+x+' '))s=x.length;else if(x.includes(n.trim())&&n.trim().length>=4)s=n.trim().length-1;if(s>score||s===score&&best&&c.key<best.key&&s>0){score=s;best=c}}
 return score>0?best.key:null;
}

const api={norm,storeKey,areaTokens,sameStore,sameArea,localRetailer,lineKey,inBand,labelGroup,PER_KG,familyHistory,communityFor,expected,closeness,cleanModel,learn,forget,learnedAt,tickRanks,scoreSingle,scoreCombo,candidates,suggest,parseCommand,resolveName,numberAt};
root.ReceiptMatch=api;
})(globalThis);
