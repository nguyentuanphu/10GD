// v1.7.2 generic / local-grocer receipts — unit tests (node:vm, no browser). Synthetic fixtures only.
//  • generic line detection in the shared parser (GROCERY / VEG / MEAT / DEPT nn / MISC / ITEM / PLU / price only,
//    weighed lines with their own price) — never matched automatically, never learned as a name alias;
//  • ReceiptMatch scoring: family price history at the store / area, So Giá (verified first), $/kg plausibility,
//    department word, tick order vs receipt order, combinations for one line, the printed-total constraint and the
//    joint pass (each basket item used once), determinism;
//  • per-store learning (band, ranking, forget) and the typed / spoken command parser.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {GENERIC_RECEIPTS}=require('./fixtures/generic-receipts.cjs');
const {RECEIPTS}=require('./fixtures/receipts.cjs');
const ctx=vm.createContext({console,Intl,Date,Math,TextEncoder});
vm.runInContext(['seed','core','spending-core','receipt-parse','receipt-match'].map(n=>fs.readFileSync('dist/'+n+'.js','utf8')).join('\n;\n')+'\n;this.R=ReceiptParse;this.M=ReceiptMatch;this.I=INGREDIENTS;this.AL=INGREDIENT_ALIASES;',ctx);
const R=ctx.R,M=ctx.M,I=ctx.I;let n=0;const check=(name:string,fn:()=>void)=>{fn();n++;console.log('PASS',name)};
const J=(x:any)=>JSON.parse(JSON.stringify(x));
const goods=(r:any)=>r.items.filter((i:any)=>i.kind==='item');
const item=(id:string,boughtAt:string|null=null)=>({key:'i:'+id,kind:'ingredient',id,name:I[id][0],group:I[id][2],boughtAt});
const rec=(id:string,store:string,lines:any[])=>({id,store,date:'2026-10-20',currency:'AUD',total:lines.reduce((s,l)=>s+l[1],0),items:lines.map((l,k)=>({id:'l'+k,label:'x',total:l[1],ingredient:l[0]}))});

// ---------- generic detection
for(const[name,{text,expect}]of Object.entries(GENERIC_RECEIPTS) as any)check('fixture '+name,()=>{const r=R.parseReceipt(text);
 for(const k of['store','printedTotal','retailer'])if(k in expect)assert.deepEqual(J(r[k]),expect[k],name+' '+k);
 assert.deepEqual(J(goods(r).map((i:any)=>[i.genericKey,i.price])),expect.lines,name+' generic lines');
 assert.ok(goods(r).every((i:any)=>i.generic),name+' every line is generic');
 assert.ok(Math.abs(r.difference)<0.005,name+' lines add up to the printed total');
 for(const it of goods(r)){assert.equal(R.matchIngredient(it,{ingredients:I,aliases:ctx.AL,memory:{'receipt any n veg':'waterSpinach','receipt any n meat':'pork'}}).match,'',name+' never auto-matched, even with a learned name alias');assert.deepEqual(J(R.memoryKeys(it,null)),[],'no name-alias memory key')}
});
check('weighed MEAT line keeps 0.85 kg @ 12.99/kg; a weighed line with its own price is its own line',()=>{
 const a=goods(R.parseReceipt(GENERIC_RECEIPTS['tan-viet-cabramatta'].text))[2];assert.equal(a.genericKey,'l:meat');assert.equal(a.weight.qty,0.85);assert.equal(a.perKg,12.99);assert.equal(a.price,11.04);
 const b=goods(R.parseReceipt(GENERIC_RECEIPTS['hoang-phat-butcher'].text));assert.equal(b[0].weight,null,'DEPT 01 12.80 does not take the next weighed line');assert.equal(b[1].genericKey,'w');assert.equal(b[1].perKg,12.99);
});
check('genericLabel keys',()=>{const k=(s:string)=>R.genericLabel(s)?.key??null;
 assert.equal(k('GROCERY'),'l:grocery');assert.equal(k('Groceries'),'l:grocery');assert.equal(k('VEGETABLE'),'l:veg');assert.equal(k('FRUIT & VEG'),'l:fruit veg');assert.equal(k('DEPT 01'),'d:01');assert.equal(k('DEPT 7'),'d:07');assert.equal(k('Dept01'),'d:01');
 assert.equal(k('PLU 4011'),'p:4011');assert.equal(k('4011'),'p:4011');assert.equal(k(''),'price');assert.equal(k('MISCELLANEOUS'),'l:misc');assert.equal(k('ITEM'),'l:item');assert.equal(k('SEAFOOD'),'l:seafood');assert.equal(k('DELI'),'l:deli');
 for(const s of['Pork belly','Rau muong','Veg oil 2L','Meat pie','Grocery bag'])assert.equal(k(s),null,s+' is a real name');
});
check('chain receipts are unchanged (no generic lines in the v1.7.1 fixtures)',()=>{for(const[name,{text}]of Object.entries(RECEIPTS) as any)assert.ok(!goods(R.parseReceipt(text)).some((i:any)=>i.generic),name)});

// ---------- scoring
const store='TAN VIET GROCERY CABRAMATTA';
const history=M.familyHistory([rec('a',store,[['waterSpinach',3.0],['waterSpinach',3.5],['pork',10.5]]),rec('b','HOANG PHAT CABRAMATTA',[['scallion',1.5]]),rec('c','Coles Burwood',[['waterSpinach',2.0]])],{store});
check('family history: same store vs same area (suburb), other suburbs ignored',()=>{assert.deepEqual(J(history.get('i:waterSpinach')),{store:[3,3.5],area:[],perKg:[]});assert.deepEqual(J(history.get('i:scallion')),{store:[],area:[1.5],perKg:[]});assert.ok(M.sameArea('TAN VIET GROCERY CABRAMATTA','Cabramatta 2166'));assert.ok(!M.sameArea('TAN VIET GROCERY','VIET HOA GROCERY'),'shop-kind words are not an area')});
check('history suggestion with a one-line reason (VI/EN)',()=>{const s=M.suggest({lines:[{index:1,price:3.2,label:'VEG',genericKey:'l:veg'}],basket:[item('pork'),item('waterSpinach'),item('carrot')],history});
 const top=s.lines[0].suggestions[0];assert.deepEqual(J(top.targets),['i:waterSpinach']);assert.match(top.reasons.map((r:any)=>r.vi).join(' | '),/Lần trước ở cửa hàng này Rau muống \$3\.00–\$3\.50/);assert.match(top.reasons.map((r:any)=>r.en).join(' | '),/Last time at this store/);
 assert.ok(!s.lines[0].suggestions.some((c:any)=>c.targets.includes('i:pork')),'MEAT-only item not offered for a VEG line without evidence')});
check('So Giá: verified price beats an unverified single report',()=>{const community=[{targetKey:'i:pork',price:12.8,status:'unverified',area:true},{targetKey:'i:beef',price:12.9,status:'confirmed',area:false}];
 const s=M.suggest({lines:[{index:0,price:12.8,label:'MEAT',genericKey:'l:meat'}],basket:[item('pork'),item('beef')],community});const t=s.lines[0].suggestions;
 assert.deepEqual(J(t[0].targets),['i:beef']);assert.equal(t[0].reasons[0].code,'community');assert.equal(t[1].reasons[0].code,'community-unverified');assert.match(t[1].reasons[0].vi,/chưa xác minh/)});
check('$/kg plausibility: 0.85 kg @ $12.99/kg looks like meat, not vegetables',()=>{const s=M.suggest({lines:[{index:0,price:11.04,label:'',genericKey:'w',weightKg:0.85,perKg:12.99}],basket:[item('waterSpinach'),item('pork')]});
 const t=s.lines[0].suggestions;assert.deepEqual(J(t[0].targets),['i:pork']);assert.ok(t[0].reasons.some((r:any)=>r.code==='per-kg'&&/thịt/.test(r.vi)));assert.ok(!t.some((c:any)=>c.targets[0]==='i:waterSpinach'),'implausible $/kg for vegetables is not suggested')});
check('tick order vs receipt order (ticked items first, in tick order)',()=>{const basket=[item('pork','2026-11-02T09:10:00Z'),item('waterSpinach','2026-11-02T09:05:00Z'),item('tofu','2026-11-02T09:20:00Z')];
 const s=M.suggest({lines:[{index:0,price:3.2,label:'',genericKey:'price'},{index:1,price:9.9,label:'',genericKey:'price'},{index:2,price:2.5,label:'',genericKey:'price'}],basket});
 assert.deepEqual(s.lines.map((l:any)=>l.suggestions[0]?.targets[0]),['i:waterSpinach','i:pork','i:tofu'],'k-th unknown line ↔ k-th ticked item');assert.ok(s.lines[0].suggestions[0].reasons.some((r:any)=>r.code==='tick-order'));
 const ex=M.suggest({lines:[{index:0,order:0,orderN:3,price:3.2,label:'',genericKey:'price'},{index:2,order:2,orderN:3,price:2.5,label:'',genericKey:'price'}],basket,exclude:['i:pork']});
 assert.deepEqual(ex.lines.map((l:any)=>l.suggestions[0]?.targets[0]),['i:waterSpinach','i:tofu'],'an item already matched is excluded but still counts for the tick order');assert.match(ex.lines[1].suggestions[0].reasons.find((r:any)=>r.code==='tick-order').vi,/\(3\/3\).*dòng 3/);
 const none=M.suggest({lines:[{index:0,price:3.2,label:'',genericKey:'price'}],basket:[item('pork'),item('tofu')]});assert.equal(none.lines[0].suggestions.length,0,'no evidence → no suggestion, nothing guessed')});
check('one line may cover several items when the family prices add up (VEG 8.40 = rau muống + cải)',()=>{const h=M.familyHistory([rec('a',store,[['waterSpinach',3.2],['bokchoy',5.2],['scallion',1.5]])],{store});
 const ids=['waterSpinach','bokchoy','scallion'].filter(x=>I[x]);assert.equal(ids.length,3,'catalogue has the three greens');
 const s=M.suggest({lines:[{index:0,price:8.4,label:'VEG',genericKey:'l:veg'}],basket:ids.map(x=>item(x)),history:h});const t=s.lines[0].suggestions[0];
 assert.deepEqual(J(t.targets).sort(),['i:bokchoy','i:waterSpinach']);assert.ok(t.reasons[0].vi.includes('= $8.40'));assert.ok(t.fit);
 assert.ok(!s.lines[0].suggestions.some((c:any)=>c.targets.length===2&&c.targets.includes('i:scallion')&&c.targets.includes('i:waterSpinach')),'3.20 + 1.50 does not add up to 8.40 → not offered')});
check('total constraint + joint pass: combinations that do not add up rank lower; an item is used once',()=>{const h=M.familyHistory([rec('a',store,[['waterSpinach',3.2],['scallion',1.5],['bokchoy',4.8]])],{store});const basket=['waterSpinach','scallion','bokchoy'].map(x=>item(x));
 const lines=[{index:0,price:4.7,label:'VEG',genericKey:'l:veg'},{index:1,price:4.8,label:'VEG',genericKey:'l:veg'}];
 const alone=M.candidates(lines[0],basket,{history:h,community:[],learned:[],ticks:M.tickRanks(basket)},{i:0,n:1});assert.deepEqual(J(alone[0].targets),['i:bokchoy'],'on its own 4.70 is closest to cải 4.80');
 const s=M.suggest({lines,basket,history:h,printedTotal:9.5,knownTotal:0});
 assert.deepEqual(J(s.lines[0].suggestions[0].targets).sort(),['i:scallion','i:waterSpinach'],'jointly: 3.20 + 1.50 = 4.70 and cải = 4.80');assert.deepEqual(J(s.lines[1].suggestions[0].targets),['i:bokchoy']);
 assert.ok(s.lines[0].suggestions[0].joint&&s.lines[0].suggestions[0].reasons.some((r:any)=>r.code==='total'));assert.equal(s.totalNote,null);
 const gap=M.suggest({lines,basket,history:h,printedTotal:12,knownTotal:0});assert.equal(gap.totalNote.code,'total-gap');assert.match(gap.totalNote.vi,/\$12\.00 nhưng cộng lại \$9\.50/);assert.equal(gap.totalNote.value,2.5)});
check('re-check 13 Nov 2026 (B13): the total gap is written in the receipt currency, with its sign',()=>{
 const lines=[{price:150000,label:'THIT BO',order:0}],basket=[item('beef')];
 const v=M.suggest({lines,basket,printedTotal:100000,knownTotal:0,currency:'VND'});
 assert.equal(v.totalNote.value,-50000);assert.ok(!/\$/.test(v.totalNote.vi),'no dollar sign for đồng: '+v.totalNote.vi);assert.match(v.totalNote.vi,/150\.000/);assert.match(v.totalNote.vi,/100\.000/);
 const a=M.suggest({lines:[{price:9.5,label:'x',order:0}],basket,printedTotal:9,knownTotal:0});assert.match(a.totalNote.vi,/\$9\.00/,'AUD unchanged')});
check('deterministic: same input → same ranking',()=>{const args={lines:[{index:0,price:3.2,label:'VEG',genericKey:'l:veg'},{index:1,price:11.04,label:'MEAT',genericKey:'l:meat',weightKg:0.85,perKg:12.99}],basket:[item('pork','2026-11-02T09:00:00Z'),item('waterSpinach','2026-11-02T08:00:00Z'),item('beef')],history};
 const a=JSON.stringify(M.suggest(args)),b=JSON.stringify(M.suggest({...args,basket:[...args.basket].reverse()}));assert.equal(a,b)});

// ---------- learning + forget
check('per-store learning: store + label/PLU + price band → item; ranks first; other stores unaffected; forget',()=>{
 const model:any={entries:[]};const line={price:3.2,label:'VEG',genericKey:'l:veg'};
 M.learn(model,{store,line,target:{key:'i:waterSpinach',kind:'ingredient',id:'waterSpinach',name:'Rau muống'},at:'2026-10-20T00:00:00Z'});
 M.learn(model,{store,line:{...line,price:3.5},target:{key:'i:waterSpinach',kind:'ingredient',id:'waterSpinach',name:'Rau muống'}});
 M.learn(model,{store,line:{price:2.1,label:'PLU 4011',genericKey:'p:4011',plu:'4011'},target:{key:'i:carrot',kind:'ingredient',id:'carrot',name:'Cà rốt'}});
 assert.equal(model.entries.length,2);assert.deepEqual([model.entries[0].lo,model.entries[0].hi,model.entries[0].n],[3.2,3.5,2]);
 const learned=M.learnedAt(model,store);assert.equal(learned.length,2);assert.equal(M.learnedAt(model,'Coles Burwood').length,0);
 const basket=[item('pork'),item('waterSpinach'),item('carrot')];
 const s=M.suggest({lines:[{index:0,price:3.3,label:'VEG',genericKey:'l:veg'}],basket,learned});assert.deepEqual(J(s.lines[0].suggestions[0].targets),['i:waterSpinach']);assert.equal(s.lines[0].suggestions[0].reasons[0].code,'learned');assert.match(s.lines[0].suggestions[0].reasons[0].vi,/Đã ghép trước đây ở cửa hàng này: VEG \$3\.20–\$3\.50 → Rau muống/);
 const far=M.suggest({lines:[{index:0,price:9.9,label:'VEG',genericKey:'l:veg'}],basket,learned});assert.ok(far.lines[0].suggestions.every((c:any)=>c.reasons[0].code!=='learned'),'outside the price band it is only a weak hint');
 assert.ok(M.forget(model,model.entries[0].id));assert.equal(model.entries.length,1);
 const after=M.suggest({lines:[{index:0,price:3.3,label:'VEG',genericKey:'l:veg'}],basket,learned:M.learnedAt(model,store)});assert.equal(after.lines[0].suggestions.length,0,'forgotten → no suggestion');
 assert.deepEqual(J(M.cleanModel({entries:[{id:1},null,model.entries[0]]})).entries.length,1,'invalid synced entries dropped');
});

// ---------- typed / spoken command
check('voice command parser (VI/EN, number words, several items, several commands)',()=>{const p=(t:string)=>J(M.parseCommand(t));
 assert.deepEqual(p('dòng 3 là thịt ba chỉ'),[{line:3,names:['thit ba chi']}]);
 assert.deepEqual(p('Dòng ba là rau muống và hành lá'),[{line:3,names:['rau muong','hanh la']}]);
 assert.deepEqual(p('dòng mười hai là gạo'),[{line:12,names:['gao']}]);
 assert.deepEqual(p('line 3 is pork belly'),[{line:3,names:['pork belly']}]);
 assert.deepEqual(p('line two is spinach and spring onion'),[{line:2,names:['spinach','spring onion']}]);
 assert.deepEqual(p('dòng 1 là gạo, dòng 2 là rau muống'),[{line:1,names:['gao']},{line:2,names:['rau muong']}]);
 assert.deepEqual(p('thịt ba chỉ'),[],'no line number → nothing applied');
 const cands=[{key:'i:pork',names:['Thịt heo','Pork',...ctx.AL.pork]},{key:'i:waterSpinach',names:['Rau muống','Water spinach']},{key:'i:scallion',names:['Hành lá',...ctx.AL.scallion]}];
 assert.equal(M.resolveName('thit ba chi',cands),'i:pork');assert.equal(M.resolveName('pork belly',cands),'i:pork');assert.equal(M.resolveName('rau muong',cands),'i:waterSpinach');assert.equal(M.resolveName('hanh la',cands),'i:scallion');assert.equal(M.resolveName('banh mi',cands),null);
});
check('local retailer id for So Giá',()=>{assert.equal(M.localRetailer('TAN VIET GROCERY CABRAMATTA'),'viet-grocer');assert.equal(M.localRetailer('Hoang Phat Butcher'),'viet-grocer');assert.equal(M.localRetailer('Bob’s Corner'),'other')});
console.log(`receipt match tests passed (${n})`);
