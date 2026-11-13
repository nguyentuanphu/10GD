// v1.7.1 shared receipt parser (src/frontend/receipt-parse.ts) — unit tests from TEXT fixtures of the 15 review
// photos (no photo is committed; payment lines in fixtures are synthetic placeholders). Covers retailer formats,
// junk prefixes / item codes / markers, continuation lines, duplicates, size repair, abbreviations and matching,
// totals and item-count warnings, clipped prices, refunds, Woolworths UK, warranty / EFTPOS blocks ignored and
// redacted, duplicate-receipt fingerprints and the reconciliation maths.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {RECEIPTS}=require('./fixtures/receipts.cjs');
const ctx=vm.createContext({console,Intl,Date,Math,TextEncoder,crypto:require('node:crypto').webcrypto});
vm.runInContext(['store-registry','seed','core','spending-core','receipt-parse'].map(n=>fs.readFileSync('dist/'+n+'.js','utf8')).join('\n;\n')+'\n;this.R=ReceiptParse;this.S=defaults();this.I=INGREDIENTS;this.AL=INGREDIENT_ALIASES;this.validSpending=validSpending;this.oldParse=parseReceiptText;',ctx);
const R=ctx.R;let n=0;const check=(name:string,fn:()=>void)=>{fn();n++;console.log('PASS',name)};
const J=(x:any)=>x===undefined?x:JSON.parse(JSON.stringify(x)),deq=(a:any,b:any,m?:string)=>assert.deepEqual(J(a),J(b),m);
const goods=(r:any)=>r.items.filter((i:any)=>i.kind==='item');

(async()=>{
// ---------- every fixture → expected structured output
for(const[name,{text,expect}]of Object.entries(RECEIPTS) as any){
 check('fixture '+name,()=>{const r=R.parseReceipt(text);
  for(const k of['retailer','store','printedTotal','lineSum','printedCount','countRead','date','time','refund','currency'])if(k in expect)deq(r[k],expect[k],name+' '+k);
  if('items' in expect)assert.equal(r.items.length,expect.items,name+' lines');
  if('goods' in expect)assert.equal(goods(r).length,expect.goods,name+' item lines');
  if(expect.warning)assert.ok(r.warnings.some((w:any)=>w.code===expect.warning),name+' warning '+expect.warning+' in '+r.warnings.map((w:any)=>w.code));
  if(expect.names)deq(goods(r).map((i:any)=>i.name).slice(0,expect.names.length),expect.names,name+' names');
  if(r.printedTotal!=null&&goods(r).length)assert.ok(Math.abs(r.difference)<0.005,name+' lines add up to the printed total');
  for(const it of r.items)assert.doesNotMatch(it.name,/\b(TERMINAL|REFERENCE|AID|ARQC|TVR|AUTH|CARD NO|year|months|Warranty)\b/i,name+' no payment/warranty line becomes an item');
 });
}

// ---------- Henry's report 1: the old app's OCR of aldi-wolli-creek
check('aldi-wolli-creek: junk prefixes and codes removed, weighed line, ea, 2nd strawberries kept, printed total',()=>{
 const r=R.parseReceipt(RECEIPTS['aldi-wolli-creek-old-app-ocr'].text),g=goods(r);
 assert.equal(r.store,'ALDI Wolli Creek');assert.equal(g.length,16);assert.equal(r.printedTotal,88.37);assert.equal(r.lineSum,88.37);
 assert.ok(g.every((i:any)=>/^\d{6}$/.test(i.code)&&!/^\d/.test(i.name)),'6-digit codes kept apart from the name');
 deq([g[1].weight,g[1].perKg,g[1].price],[{qty:1.611,unit:'kg'},3.49,5.62]);assert.equal(g[0].each,true);assert.equal(g[0].qty,1);
 assert.equal(g[15].name,'Strawberries 250g');deq(g[15].dup,{count:2,n:2});
 deq(g.filter((i:any)=>i.dup).map((i:any)=>i.dup.count),[2,2,2,2,2,2,2,2]);
 // the old parser (kept for reference) is what Henry saw: wrong store, junk names, total = line sum
 const old=ctx.oldParse(RECEIPTS['aldi-wolli-creek-old-app-ocr'].text,ctx.S);assert.notEqual(old.store,'ALDI Wolli Creek');assert.ok(old.items.some((i:any)=>/^(Si|hen|Bie|STE)\b/.test(i.label)),'old parser kept junk prefixes');
});
check('missing last line → "Thiếu 2.79 — có thể đọc sót một dòng", never silently adjusted',()=>{
 const text=RECEIPTS['aldi-wolli-creek-old-app-ocr'].text.replace('i 364045 Strawberries 250g 2.79 A\n','');const r=R.parseReceipt(text);
 assert.equal(r.printedTotal,88.37);assert.equal(r.lineSum,85.58);assert.equal(R.warningText(r.warnings.find((w:any)=>w.code==='short'),'vi'),'Thiếu 2.79 — có thể đọc sót một dòng');
 assert.equal(R.warningText(r.warnings.find((w:any)=>w.code==='short'),'en'),'Short by 2.79 — a line may have been missed');
});

// ---------- size repair (only next to a unit; never invented)
check('size repair: l/I/|→1, S→5, O→0, "1689"→168g, plausible only',()=>{
 const sz=(s:string)=>{const x=R.extractSize(s);return x.size?x.size.qty+x.size.unit:null};
 assert.equal(sz('ChpsThaiChillil75g'),'175g');assert.equal(sz('DSChips HSChknl75g'),'175g');assert.equal(sz('Burratal50g'),'150g');assert.equal(sz('BurratalS0g'),'150g');
 assert.equal(sz('ChsStrips 8pk/1689'),'168g');assert.equal(R.extractSize('ChsStrips 8pk/1689').pack,8);assert.equal(sz('Blueberries 1709'),'170g');assert.equal(sz('Frz Salmon ikg'),'1kg');assert.equal(sz('Sweet Corn S00g'),'500g');
 assert.equal(sz('UNCLE TOBYS PLUS 410GRAM'),'410g');assert.equal(sz('A2 DAIRY FULL CREAM 1LITRE'),'1l');assert.equal(sz('CLS CHKN BURGER BULK 1.2KG'),'1.2kg');assert.equal(sz('PETERS DRUMSTICK 475ML'),'475ml');
 assert.equal(sz('BANANAS PERKG'),null,'PERKG is a price basis, not a size');assert.equal(sz('Garden Hand Tools'),null);assert.equal(sz('Cracker Barrel SliceExtra Sharp'),null);
 assert.equal(R.extractSize('FacialTis2ply224pk').pack,224);assert.equal(sz('FacialTis2ply224pk'),null,'a pack count is not a weight');
 assert.equal(sz('Thing 99999g'),null,'implausible sizes are not accepted');
 assert.ok(R.extractSize('Burratal50g').repaired&&!R.extractSize('Burrata 150g').repaired,'repairs are flagged');
});

// ---------- abbreviations + matching
check('abbreviation table and catalogue matching with confidence',()=>{
 assert.equal(R.expandAbbrev('Cut Wtrmelon Loose'),'cut watermelon loose');assert.match(R.expandAbbrev('DSChips HSChkn175g'),/chips honey soy chicken/);
 assert.match(R.expandAbbrev('SrdoughSyLinsd630g'),/sourdough soy linseed/);assert.match(R.expandAbbrev('Chs Strm 8Pk 160g'),/cheese stringers/);assert.match(R.expandAbbrev('a2 Fl Crm Milk 2L'),/full cream milk/);
 assert.match(R.expandAbbrev('JUMBO PK BBY SPN 400GRAM'),/baby spinach/);assert.match(R.expandAbbrev('CLS CHKN BURGER BULK'),/coles chicken burger/);
 const m=(name:string,memory:any={},code:string|null=null)=>{const r=R.parseReceipt('ALDI STORES\nTax Invoice\n'+(code?code+' ':'')+name+' 9.99 A\nSUBTOTAL 9.99');return R.matchIngredient(goods(r)[0],{ingredients:ctx.I,aliases:ctx.AL,memory,retailer:'aldi'})};
 deq(m('Frz Salmon 1kg'),{match:'salmon',confidence:'suggested'});deq(m('Sweet Corn 500g'),{match:'corn',confidence:'high'});
 assert.equal(m('DSChips HSChkn175g').match,'','honey soy chicken CHIPS are a snack, not chicken');assert.equal(m('20V Battery 4.0Ah').match,'','non-food stays unmatched');
 assert.equal(m('BRUSHED POTATOES 2KG').match,'potato');assert.equal(m('JUMBO PK BBY SPN 400GRAM').match,'spinach');assert.equal(m('Cream Whipped 250g').match,'cream');
 // the family's confirmed mapping is remembered by retailer + code
 const keys=R.memoryKeys({code:'689271',name:'Burrata 150g'},'aldi');deq(keys,['receipt aldi c 689271','receipt aldi n burrata 150g']);
 deq(m('Burratal50g',{'receipt aldi c 689271':'mozzarella'},'689271'),{match:'mozzarella',confidence:'learned'});
});

// ---------- formats
check('Woolworths AU continuations: weighed name line, Qty N @ each with the price on the continuation',()=>{
 const r=R.parseReceipt(RECEIPTS['ww-13-mt-pleasant'].text),g=goods(r);deq([g[0].name,g[0].weight.qty,g[0].perKg,g[0].price],['Tomato Gourmet',0.177,5.9,1.04]);
 const w9=goods(R.parseReceipt(RECEIPTS['ww-9-frenchs-forest'].text)).find((i:any)=>/Choc Coated/.test(i.name));deq([w9.multi,w9.price,w9.qty,w9.unit],[{count:2,each:4.2},8.4,1730,'ml']);
});
check('Woolworths AU torn / clipped: no total → flagged; garbled 300.65 flagged; no price invented',()=>{
 const r9=R.parseReceipt(RECEIPTS['ww-9-frenchs-forest'].text);assert.equal(r9.printedTotal,null);assert.ok(r9.warnings.some((w:any)=>w.code==='no-total'));
 const r=R.parseReceipt(RECEIPTS['ww-11-eastlands'].text);assert.ok(r.warnings.some((w:any)=>w.code==='odd-price'&&w.value===300.65));
 const miss=goods(r).filter((i:any)=>i.price==null).map((i:any)=>i.name);deq(miss,['Broccoli','Banana Cavendish','Apricot','Sevalle Toiletissue 3ply 190sh 24pk','Kleenex FacialTiss XcareAloevera 95pk']);
 assert.ok(goods(r).filter((i:any)=>i.weight&&i.price==null).every((i:any)=>i.perKg>0),'weighed lines keep $/kg but price stays unknown');
});
check('Coles: header, markers, multi-buy, PERKG weighed, rounding and credit lines, "Total for N items" counts quantities, staff names never kept',()=>{
 const r=R.parseReceipt(RECEIPTS['coles-14-partial'].text);deq(r.items.filter((i:any)=>i.kind!=='item').map((i:any)=>[i.kind,i.price]),[['rounding',-0.01]]);
 assert.equal(goods(r)[0].name,'UNCLE TOBYS PLUS 410g');assert.equal(goods(r)[2].name,"KELLOGG'S LCM'S SPLI 138g");const ban=goods(r).find((i:any)=>/BANANAS/.test(i.name));deq([ban.weight.qty,ban.perKg,ban.price],[0.851,3.9,3.32]);
 const c17=R.parseReceipt(RECEIPTS['coles-17-casuarina'].text);deq(c17.items.find((i:any)=>i.kind==='discount').price,-17.17);
 const c15=R.parseReceipt(RECEIPTS['coles-15-victoria-park'].text);assert.equal(c15.store,'Coles Victoria Park Eas');assert.equal(c15.storeNo,'340');assert.doesNotMatch(JSON.stringify({...c15,txRaw:null}),/Sample Person/);
 assert.doesNotMatch(R.redact(RECEIPTS['coles-15-victoria-park'].text),/Sample Person|Register|Receipt:|Served By/);
});
check('ALDI 2020: 4–6 digit codes, markers, interleaved duplicates, Qty 6 @ $0.75, surcharge, 24 items; warranty block ignored',()=>{
 const r=R.parseReceipt(RECEIPTS['aldi-2020-full'].text),g=goods(r);assert.equal(g.length,19);assert.equal(r.printedTotal,455.5);assert.equal(r.countRead,24);
 assert.equal(g.filter((i:any)=>i.code==='64158').length,4);assert.ok(g.filter((i:any)=>i.code==='64158').every((i:any)=>i.dup.count===4));
 const dog=g.find((i:any)=>/Dog Food/.test(i.name));deq([dog.code,dog.multi,dog.qty,dog.unit,dog.nonFood],['5567',{count:6,each:0.75},600,'g',true]);
 deq(r.items.filter((i:any)=>i.kind==='surcharge').map((i:any)=>i.price),[2.26]);assert.equal(g[1].name,'20V Battery 4.0Ah','* marker removed');
 const bottom=R.parseReceipt(RECEIPTS['aldi-2020-bottom'].text);assert.equal(goods(bottom).length,0);assert.equal(R.warningText(bottom.warnings.find((w:any)=>w.code==='no-items'),'vi'),'Không thấy dòng món nào — chụp cả phần trên hoá đơn');assert.equal(bottom.date,'2020-05-23');
});
check('ALDI 03 MAR 2025: line after the first subtotal, several subtotal blocks, clipped prices repaired only when the total confirms',()=>{
 const a=R.parseReceipt(RECEIPTS['aldi-2025-03-03-a'].text);assert.equal(goods(a).at(-1).name,'Le Bag Recycle');assert.equal(a.printedTotal,135.42);assert.equal(a.totalLabel,'Total (INCL GST)');
 const b=R.parseReceipt(RECEIPTS['aldi-2025-03-03-b'].text);deq(goods(b).filter((i:any)=>i.priceRepaired).map((i:any)=>[i.name,i.price]),[['20VSpreader',5.99],['Strawberries 350g',5.49]]);
 const off=R.parseReceipt(RECEIPTS['aldi-2025-03-03-b'].text.replace('Total (INCL GST) $ 135.42','Total (INCL GST) $ 136.42').replace(/Subtotal 135\.42/,'Subtotal 136.42').replace(/\$135\.42/g,'$136.42'));
 assert.equal(goods(off).filter((i:any)=>i.priceRepaired).length,0,'no repair when the total does not confirm it');assert.ok(off.warnings.some((w:any)=>w.code==='missing-price'));
});
check('refund: negative lines and total, -1 Items, no pantry use',()=>{
 const r=R.parseReceipt(RECEIPTS['aldi-2021-refund'].text);assert.equal(r.refund,true);deq(r.items.map((i:any)=>i.price),[-49.99,-0.24]);assert.equal(r.printedTotal,-50.23);
 assert.ok(r.warnings.some((w:any)=>w.code==='refund'));
 const s=JSON.parse(JSON.stringify(ctx.S));s.receipts=[{id:'rf',store:'ALDI Wolli Creek',date:'2021-08-18',total:-50.23,refund:true,items:[{id:'a',label:'Monitor Arm S/D',total:-49.99,ingredient:null,quantity:null}]}];
 assert.equal(ctx.validSpending(s),true,'refund receipts are valid');s.receipts[0].refund=false;assert.equal(ctx.validSpending(s),false,'negative totals need the refund flag');
});
check('Woolworths UK: GBP detected, 9-digit codes, "You have saved" attaches to the item above, cash ignored',()=>{
 const r=R.parseReceipt(RECEIPTS['ww-uk-12'].text);assert.equal(r.currency,'GBP');assert.equal(r.retailer,'woolworths-uk');assert.ok(r.warnings.some((w:any)=>w.code==='non-aud'&&/Hoá đơn ngoài Úc \(GBP\) — chỉ lưu chi tiêu, không chia sẻ giá/.test(w.vi)));
 const g=goods(r);deq([g[0].code,g[0].name,g[0].price,g[0].discount],['200059140','WW PAPER TRIMMER',4.99,-2.5]);assert.equal(g.filter((i:any)=>/CLIP HANGERS/.test(i.name)).length,4);assert.equal(r.lineSum,15);
});
check('two receipts in one photo → first read, flagged',()=>{const r=R.parseReceipt(RECEIPTS['ww-10-dee-why-two'].text);assert.equal(r.printedTotal,61.53);assert.ok(r.warnings.some((w:any)=>w.code==='multiple'))});
check('printed total misread: other printed amounts agree → used, flagged (never silently)',()=>{
 const r=R.parseReceipt(RECEIPTS['aldi-2020-full'].text.replace('Total (INCL GST) $ 455.50','Total (INCL GST) $ 4955.50'));assert.equal(r.printedTotal,455.5);assert.ok(r.warnings.some((w:any)=>w.code==='total-conflict'));
});
check('payment / bank / warranty / staff lines are never saved (redact)',()=>{
 for(const[name,{text}]of Object.entries(RECEIPTS) as any){const red=R.redact(text);assert.doesNotMatch(red,/CARD NO|\bAID\b|ARQC|\bTVR\b|\bTSI\b|\bATC\b|TERMINAL|REFERENCE|AUTH CODE|MERCH ID|TERM ID|Store Manager|Served By|Register:|TRANS \d|\d{3}\/\d{3}\/\d{3}\/\d{3}/i,name)}
 assert.match(R.redact(RECEIPTS['aldi-wolli-creek'].text),/Strawberries 250g 2\.79/,'item lines are kept');
});
check('looksLikeReceipt: receipts vs a single shelf tag',()=>{assert.equal(R.looksLikeReceipt(RECEIPTS['coles-16-waterloo'].text),true);assert.equal(R.looksLikeReceipt('Finish Quantum 60 Pack\n$24.99\n$0.42 per wash'),false)});

// ---------- duplicate receipts
const a=R.parseReceipt(RECEIPTS['aldi-2025-03-03-a'].text),b=R.parseReceipt(RECEIPTS['aldi-2025-03-03-b'].text);
const ka=await R.receiptKey(a,'salt'),kb=await R.receiptKey(b,'salt');
check('duplicate fingerprint: same printed transaction → same salted key; never the raw number',()=>{
 assert.match(ka,/^[a-f0-9]{32}$/);assert.equal(ka,kb,'the a/b photos of 03 MAR 2025 are the same receipt');assert.notEqual(ka,a.txRaw);
 assert.equal(R.fingerprint(a).total,135.42);assert.equal(R.fingerprint(a).time,'16:36');assert.equal(R.fingerprint(a).count,8);
});
const kOther=await R.receiptKey(a,'other-salt');
check('duplicate detection: exact, near (different time), none; old records without a key',()=>{
 assert.notEqual(ka,kOther,'the hash is salted');
 const saved=[{id:'s1',store:'ALDI Wolli Creek',date:'2025-03-03',total:135.42,receiptKey:ka,printed:{time:'16:36',count:8},items:[]}];
 const cand=(x:any={})=>({id:'new',store:b.store,date:b.date,time:b.time,total:b.printedTotal,count:8,receiptKey:kb,...x});
 assert.equal(R.findDuplicate(cand(),saved).kind,'exact');
 assert.equal(R.findDuplicate(cand({receiptKey:null}),saved).kind,'exact','same store/date/time/total/count without a key');
 assert.equal(R.findDuplicate(cand({receiptKey:null,time:'18:02'}),saved).kind,'near');
 assert.equal(R.findDuplicate(cand({receiptKey:null,total:12}),saved).kind,null);
 assert.equal(R.findDuplicate(cand({receiptKey:null,time:null}),[{id:'old',store:'ALDI Wolli Creek',date:'2025-03-03',total:135.42,items:[]}]).kind,'near','older receipts (no printed facts) → softer prompt');
 assert.equal(R.findDuplicate(cand(),[{...saved[0],id:'new'}]).kind,null,'a receipt is never its own duplicate');
});

// ---------- reconciliation maths
check('reconcile: duplicates grouped (2 × 150 g = 300 g), enough / short / extra',()=>{
 const rows=R.reconcile([{ingredient:'mozzarella',quantity:150},{ingredient:'mozzarella',quantity:150},{ingredient:'salmon',quantity:1000},{ingredient:'corn',quantity:500},{ingredient:'egg',quantity:null}],(id:string)=>({mozzarella:200,salmon:1000,corn:800} as any)[id]);
 const by=(id:string)=>rows.find((r:any)=>r.ingredient===id);
 deq([by('mozzarella').bought,by('mozzarella').same,by('mozzarella').covered,by('mozzarella').extra,by('mozzarella').status],[300,true,200,100,'enough-extra']);
 deq([by('salmon').status,by('salmon').extra],['enough',0]);deq([by('corn').status,by('corn').short,by('corn').covered],['short',300,500]);
 assert.equal(rows.length,3,'unknown amounts are not reconciled');
 deq(R.reconcile([{ingredient:'oil',quantity:4000}],()=>0)[0].status,'extra');
});
check('line quantities come only from printed sizes / weights / counts',()=>{
 const g=goods(R.parseReceipt(RECEIPTS['aldi-wolli-creek'].text));
 deq(R.lineQuantity(g[1]),{qty:1611,unit:'g'});deq(R.lineQuantity(g[2]),{qty:1000,unit:'g'});deq(R.lineQuantity(g[0]),{qty:1,unit:'each'});
 const c=goods(R.parseReceipt(RECEIPTS['coles-15-victoria-park'].text)).find((i:any)=>/FISH CAKES/.test(i.name));deq(R.lineQuantity(c),{qty:700,unit:'g'});
 assert.equal(R.lineQuantity(goods(R.parseReceipt(RECEIPTS['ww-9-frenchs-forest'].text)).find((i:any)=>/Dorsogna/.test(i.name))),null,'no size printed → unknown');
});
// v1.7.10 (owner, 7 Nov 2026: four receipts photographed on a speckled stone bench “không scan được”)
{const {BENCH_RECEIPTS:B}=require('./fixtures/bench-receipts.cjs');
 const names=(r:any)=>goods(r).map((i:any)=>i.name);
 const noJunk=(r:any,key:string)=>{for(const nm of names(r))assert.ok(!/SUB ?TOTAL|^TOTAL|BALANCE|MASTERCARD|CASH|^\W*R?MAL$|^gull|EG \/ BUNCH/i.test(nm),`${key}: not a product: ${nm}`)};
 // nothing invented: every price kept is printed in the text
 const printed=(r:any,t:string,key:string)=>{for(const i of goods(r))if(i.price!=null)assert.ok(t.includes(i.price.toFixed(2))||t.includes('$'+i.price.toFixed(2).replace(/\.?0+$/,'')),`${key}: price ${i.price} is in the text`)};
 check('bench photo: HP Meats butcher — every weighed line, printed total, rounding, store',()=>{const t=B['hp-meats-bench'],r=R.parseReceipt(t);
  assert.equal(goods(r).length,9);assert.equal(r.printedTotal,133.75);assert.match(r.store,/^HP Meats/);noJunk(r,'hp');printed(r,t,'hp');
  deq(goods(r).filter((i:any)=>i.weight).map((i:any)=>i.weight.qty),[0.534,1.374,0.572,0.982,1.442,0.884,1.828,0.948],'“@” read as 0 / 8 / § and “1.442g” still give the weights');
  assert.ok(r.items.some((i:any)=>i.kind==='rounding'&&i.price===-0.02));
  assert.ok(r.warnings.some((w:any)=>w.code==='short'),'misread digits leave an honest “short by” note, nothing is adjusted')});
 check('bench photo: Cuong Thien A — glued “2 @ $2.20” lines, wrapped names, store and suburb',()=>{const t=B['cuong-thien-bench-a'],r=R.parseReceipt(t);
  assert.equal(goods(r).length,9);assert.equal(r.printedTotal,80.83);assert.equal(r.store,'Cuong Thien Marrickville');noJunk(r,'ct-a');printed(r,t,'ct-a');
  const by=(re:RegExp)=>goods(r).find((i:any)=>re.test(i.name));
  deq(by(/CHOY SUM/).multi,{count:2,each:2.2},'“2082.2” = 2 @ $2.20 because 2 × 2.20 = $4.40');deq(by(/MORNING GLORY/).multi,{count:2,each:2.5},'“2092.50” = 2 @ $2.50');
  assert.equal(by(/ORANGE/).weight.qty,0.86);assert.equal(by(/^18 XINH-XINH/).price,10,'item numbers stay');assert.equal(by(/^SUNNY FROZEN/).price,22.5,'speck token removed')});
 check('bench photo: Cuong Thien B — 18 lines, count lines behind specks, weighed veg after wrapped names',()=>{const t=B['cuong-thien-bench-b'],r=R.parseReceipt(t);
  assert.equal(goods(r).length,18);assert.equal(r.printedTotal,76.3,'“$76 30” read as $76.30');assert.equal(r.store,'Cuong Thien Marrickville');noJunk(r,'ct-b');printed(r,t,'ct-b');
  const by=(re:RegExp)=>goods(r).filter((i:any)=>re.test(i.name));
  deq(by(/BUK CHOY/)[1].multi,{count:2,each:1.8},'“204$1.80” = 2 @ $1.80');assert.equal(by(/MELON HAIRY/)[0].weight.qty,1);assert.equal(by(/CUCUMBER/)[0].weight.qty,0.85);
  deq(by(/MILIKET/)[0].multi,{count:6,each:1.2},'“6 @ $1.20”');deq(by(/BUN TUOT/)[0].multi,{count:2,each:3.15},'“Ene. 2 @ $3.15”')});
 // a count line is only read from a glued number when count × price equals the item just read
 check('glued count lines need the item price to agree',()=>{const r=R.parseReceipt('TAX INVOICE\nCHOY SUM $4.40\n2082.20\nTOTAL $4.40');deq(goods(r)[0].multi,{count:2,each:2.2});
  const x=R.parseReceipt('TAX INVOICE\nCHOY SUM $4.40\n2083.20\nTOTAL $4.40');assert.ok(!goods(x)[0].multi,'2 × 3.20 ≠ 4.40 → not a count line')});
 check('paper found by texture on a light speckled bench (synthetic)',()=>{
  const w=1200,h=1600,g=new Float32Array(w*h);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let i=0;i<g.length;i++)g[i]=196+rnd()*10;// bench nearly as bright as the paper
  for(let k=0;k<70000;k++){const x=(rnd()*(w-3))|0,y=(rnd()*(h-3))|0;for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)g[(y+dy)*w+x+dx]=110+rnd()*40}// flecks
  const L=380,Rr=840;for(let y=0;y<h;y++)for(let x=L;x<Rr;x++)g[y*w+x]=214+rnd()*6;// paper, only a little brighter
  for(let y=60;y<h-60;y+=46)for(let x=L+40;x<Rr-40;x++)if(((x/9)|0)%3!==2)for(let dy=0;dy<14;dy++)g[(y+dy)*w+x]=60;// text lines
  const t=R.blankExtents(g,w,h);assert.ok(t,'paper found');const rows=t.rows.filter(Boolean);
  const l=Math.min(...rows.map((r:any)=>r[0])),r=Math.max(...rows.map((r:any)=>r[1]));assert.ok(Math.abs(l-L)<45&&Math.abs(r-Rr)<45,`edges ${l}–${r} ≈ ${L}–${Rr}`);
  assert.equal(R.blankExtents(new Float32Array(w*h).fill(235),w,h),null,'a blank photo has no narrower paper')});
}
// v1.7.14 (owner, 8 Nov 2026: “tôi đã cropped hình receipts hôm nọ, mà vẫn không đọc đúng được”): OCR text in the shape of the owner's
// two photos (store, numbers and staff replaced with synthetic ones; no photo committed). A “Cashier:” line started the payment
// part (“cash”), so every item after it was dropped — “Read 0 item line(s)”. Also: “0.884ko @” (g read as o), “$65.71” for $5.71
// (checked against weight × price per kg), “2 6 $2.50” and “68 $1.20” (@ misread), “SUB bi” for SUB TOTAL with the total on the next line.
{const butcher="- a A a in NT Al are (AA aad    i\n{ SYNTHETIC BUTCHER PTY LTD        -\nTAX INVOICE                   E\nDate: 07/11/2026         No: P0000000001    i\nCashier: STAFF                Reg.: POSO1     A\nBEEF BALL                          $13.35    |\n0.534kg @ $25.00/kg                        ;\nPORK BELLY                        $30.21\n1.374kg @ $21.89/kg\nPORK MINCE                          $65.71 \u00ab|\n0.572kg @ $9.89/kg\nBEEF GRAVY                        $22.58\n0.982kg @ $22.89/kg\nHOUSE S|iced Beef               $6.98\nCHICKEN MINI DRUM                   $8.64\n1.442kg @ $5.99/kg\nPORK NECK BONE                      $3.53\n0.884ko @ $3.98/kg\nBEEF SHORT RIB                     $21.91\n1.826kg @ $12.00/kg\nBEEF ASADO                        $20.85\n0.948kg @ $21.99/kg\nTotal Items: 9\nSUB TOTAL:    $133.77\nROUNDING:     ~-$0.02\nTOTAL: $133.75\nGST INCLUDED IN TOTAL:      $0.00\nCASH:    $133.75\nBALANCE:      $0.00",grocer="SYNTHETIC GROCER PTY LTD\n5                TAX INVOICE                   :\n\u201cA   oe i sa i es ses a EE Ee i at ae   [3\n. Date: 07/11/2026         No: P0000000002 \u00a9\n. Cashier: STAFF        Register: POSO4\nFREE RANGE EGGS 7006 / EACH        $6.99 -\n\u00a9 VINH LOI LAP XUONG 375G           $14.00\n18 XINH-XINH CHA SONG            $10.00 5\nSUNNY FROZEN PRAWN GP CUTLET      $22.50 \u00a9\n. SVAN 21/25 IQF 7006                        \u00a5\n; ORANGE / NORMAL           $3.87  \\\n' ~~ 0.860kg @ $4.50/kg                        \\\n06. CHOY SUM - CAI NGOT XANH      $4.40\n~~ / NGAN\n2 @ $2.20\n15. MORNING GLORY - RAU MUON       $5.00\nG / BUNCH\n2 6 $2.50                   J\nONION - HANH HUONG NO 1 / NI      $13.08\n0.885kg @ $21.99/kg\nBL BANH CANH CUA 75G               $0.99\nSUB bi    $60.83\n: $80.83\nT OTAL: :           $RN RR";
 check('a “Cashier:” line is not the payment part; the butcher receipt reads all 9 items with the right prices',()=>{const r=R.parseReceipt(butcher),g=goods(r);
  deq(g.map((i:any)=>i.price),[13.35,30.21,5.71,22.58,6.98,8.64,3.53,21.91,20.85]);assert.equal(r.printedTotal,133.75);assert.equal(g[6].weight?.qty,0.884,'“0.884ko @” is a weight');assert.ok(g[2].priceFromWeight,'$65.71 read for $5.71 is fixed by weight × price per kg')});
 check('the grocer receipt reads 9 items, the multi-buy with a misread @, and the total under a misread SUB TOTAL',()=>{const r=R.parseReceipt(grocer),g=goods(r);
  assert.equal(g.length,9);assert.equal(Math.round(g.reduce((a:number,i:any)=>a+i.price,0)*100)/100,80.83);assert.equal(r.printedTotal,80.83);assert.equal(g.find((i:any)=>/MORNING GLORY/.test(i.raw)).multi?.count,2)});
 check('“68 $1.20” under a $7.20 item is 6 @ $1.20; the same line under another price is not guessed',()=>{const a=goods(R.parseReceipt('TAX INVOICE\nCashier: STAFF\nMILIKET MI 4 TOM DAC BIET /   $7.20\nEACH\n68 $1.20\nTOTAL: $7.20'));assert.equal(a.length,1);assert.equal(a[0].multi?.count,6);
  const b=goods(R.parseReceipt('TAX INVOICE\nNOODLES   $5.00\n68 $1.20\nTOTAL: $5.00'));assert.ok(!b[0]?.multi)});
}
check('a price-per-kg line with a garbled weight joins the item above (weight = price ÷ price per kg, marked) and is never an item',()=>{const g=goods(R.parseReceipt('TAX INVOICE\nCHICKEN MINI DRUM   $8.64\n442kg @ $5.99/kg\nBEEF SHORT RIB   $21.91\n1.6826kg @ $12.00/kg\nTOTAL: $30.55'));
 assert.equal(g.length,2);deq(g.map((i:any)=>[i.price,i.weight?.qty,i.weightDerived]),[[8.64,1.442,true],[21.91,1.826,true]])});
check('a rounding line that lost its minus sign takes the sign that makes the lines add up to the total (only then)',()=>{const a=R.parseReceipt('TAX INVOICE\nBEEF BALL   $13.35\nPORK BELLY   $30.21\nROUNDING: ~$0.01\nTOTAL: $43.55').items.find((i:any)=>i.kind==='rounding');assert.equal(a.price,-0.01);
 const b=R.parseReceipt('TAX INVOICE\nBEEF BALL   $13.35\nPORK BELLY   $30.21\nROUNDING: $0.02\nTOTAL: $43.58').items.find((i:any)=>i.kind==='rounding');assert.equal(b.price,0.02)});
// v1.7.18 (owner, 12 Nov 2026: “Unable to read this receipt from Costco at all”): Costco's two-line items, TPD instant savings,
// “TOTAL NUMBER OF ITEMS SOLD”, REDEEM REWARDS. Fixture = the app's OCR of the owner's photo (membership number blanked; no photo kept).
check('Costco two-line receipt: names joined to prices, TPD savings on their item, item count, rewards',()=>{
 const COSTCO="=\u2014\u2014=WHOLESALE\nCostco Wholesale A\nustralia, Pty,\n20 Parker Farm Place Casula   HH\n\u00bb NSW 2170\nPhone: (02) 87787300\nABN No: 57 104 012 893\nTAX INVOICE (\u00a7$)\nGG Exec Goldstar 00000000000\nNRRRRRRRKRNBOY tom Of Basket \u00a5en snxx\n\\  POP TOPS BLACKCURR\n191085     Ix 21.4      21.49 & |\nMOO CHOCOLATE MILK\n21886      Ix 24.99     24.99 &\nMOO CHOCOLATE MILK\n\u201cNE     1x    24.99     24.99 &\nSTRWBERRY MILK\n33911      ix 24.99 \u00a7 24.99 &\nMOO STRWBERRY MILK\nal      Ix 24.99     24.99 &\nMXXXXXKNXBOB Count 5 MKMMNJNMNMKNK\nICHIBAN ROAST BEEF\n20842      x 22.99 | 22.99\nICHIBAN ROAST BEEF\n20842      So 22:99     22.99\nPRAWN HARGOW 1KG\n14763      Re 17.99     17.99\nTPD PRAWN HARGOV          4.00-\n278813     \u2122     4.00       .\nPRAWN HARGOW 1KG\n14763 1x 17.99 R179.\nTPD PRAWN HARGOW          4.00- BE\n78813 -  1x     4.00       :      \u00a2\nCH     IPPERS 20PK\n201976     Ix 19.99     19.99 &\nE/C APPLE JUICE 4L           9\n148803     1x 10.49     10.4\nAUS FIELDS CAN OIL           5\n153701     1x 10.69     10.6\nTPD CANOLA OIL 4L          00-\n285107   ox N2.00      2.\nFINISH\n109707     1x    23.99     23.99 &\nTPD FINISH RINSE              3\n280066 1x 5.01      5.01\nLURPAK SPREAD 1KG\n37844      1x    17.49     17.49\nTOTAL NUMBER ORETTENS (SOLD = 14\nKS BROWN\n191175     Dok  19.99     19.99 &\nSWEETCORN\n11452      1x     6.99      6.99\nTPD SWEETCORN 1KG\ngras     1x     1.50      1.50-\nBLUEBERRIES 1KG\n95222      1x 22.99     22.99\n\\  US SAPPHIRE 1.4KG\n240163     1x 26.99     26.99\nSTRAWBERRIES 1.2KG\n23501      1x0 159215259\nS/ONION PANCAKE\n123164 1x 12.99 12.99\nP/F CAGE FREE 30PK\n46073      1x 12.49     12.49\nCOLGATE TARTAR 4PK\n95551      1x 19.99     19.99 &\nOMO TRIPLE CAPS\n106812     1x    43.99     43.99 &\nTPD OMO TRIPLE CAP\n279661     1x     9.00      9.00-&\n      Ny, 210 TRIPLE CAPS\n6812     1x    43.99     43.99 &\nTPD OMO TRIPLE CAP\n279661     1x     9.00      9.00-&\nJONGGA KIMCHI 1.5K\n1106390    1x    11.99     11.99\nKEWPIE MAYO 1KG\n46641      1x    11.99     11.99\nmL ROLLS MULTI\n|     1x    11.99     11.99 &\nDJEA FD BAN MANG L\n234892     1x     9.99      9.99\nLKK OYSTER SAUCE\n10686      1x     6.89      6.89\nTOTAL NUMBER OF ITEMS SOLD = 29\nREDEEM REWARDS\n7474747         1x         72.71           72. 1 ~-&\nCOSTCO CROSSROADS\n20 PARKER FARM PLACE\nCASULA NSW 2170\n";
 const r=R.parseReceipt(COSTCO),g=goods(r);
 assert.equal(r.retailer,'costco');assert.equal(g.length,29,'all 29 items (the receipt prints 29)');assert.equal(r.printedCount,29);
 assert.ok(!g.some((x:any)=>/^\W*[1Il|]x\b|^\d{4,}/.test(x.name)),'no “1x 21.49” or item-code line read as a name');
 assert.equal(g.filter((x:any)=>/MOO CHOCOLATE MILK/.test(x.name)).length,2);
 const prawn=g.filter((x:any)=>/PRAWN HARGOW/.test(x.name));assert.equal(prawn.length,2);assert.ok(prawn.every((x:any)=>x.price===17.99&&x.discount===-4),'TPD 4.00- lowers its prawn hargow');
 const omo=g.filter((x:any)=>/TRIPLE CAPS/.test(x.name));assert.ok(omo.length===2&&omo.every((x:any)=>x.discount===-9));
 assert.ok(g.some((x:any)=>x.name==='AUS FIELDS CAN OIL'&&x.discount===-2),'“CAN OIL” stays oil (not 1 L), canola TPD applied');
 assert.ok(g.some((x:any)=>/APPLE JUICE 4L$/.test(x.name)&&x.price===10.49),'clipped “10.4” takes the unit price 10.49; edge digit dropped');
 assert.ok(g.some((x:any)=>/STRAWBERRIES/.test(x.name)&&x.priceMissing),'unreadable price stays empty, never guessed');
 const reward=r.items.find((x:any)=>x.kind==='discount'&&/rewards/i.test(x.name));assert.ok(reward&&reward.price===-72.71,'REDEEM REWARDS is a 72.71 reduction');
 assert.ok(!r.items.some((x:any)=>/TOTAL NUMBER|Bottom|BOB/i.test(x.name||'')),'count and basket markers are not items');
});
// v1.7.18 (owner, 12 Nov 2026, HP Meats butcher receipt, “still can't read”): text as the phone read it (cropped below the header;
// the big “TOTAL: $133.75” lost) and as the app's OCR read the whole photo locally. No photo is kept; no personal data on it.
check('butcher receipt: SUB TOTAL stays a subtotal, CASH is the amount paid, speck letters and “~$0.02” rounding, garbled price from weight × $/kg',()=>{
 const PHONE="BEEF BALL i                        $13.35\n0.534kg @ $25.00/kg\nPORK BELLY i                       $30.21\n1.374kg @ $21.89/kg\nPORK MINCE                          $5.71\n0.572kg @ $9.99/kg\nBEEF GRAVY                         $22.58\n0.982kg @ $22.99/kg\nHP Meats Sliced Beef                $6.99\nCHICKEN MINI DRUM                   $8.64\n1.442kg @ $5.99/kg\nPORK NECK BONE                      $3.53\n0.884kg @ $3.99/kg\nBEEF SHORT RIB                     $21.91\n1.826kg @ $12.00/kg\nBEEF ASADO                         $20.85\n0.948kg @ $21.99/kg\nTotal Items: 9\nSUB TOTAL:    $133.77\nROUNDING:     -$0.02\nGST INCLUDED IN TOTAL:     $0.00\nCASH:    $133.75\n",OCR="\u2018 HP MEATS PTY LTD    %\nABN: 30 674 580 904                v\nTel: 0493682999                 Er\n299 ILLAWARRA ROAD                %\nMARRICKVILLE NSW 2204              a\nTAX INVOICE                   %\nDate: 07/11/2026         No: P2611070008 |\nCashier: OPO2                Reg.: POSO1    i\nBEEF BALL                        $13.95\n0.534kg @ $25.00/kg                        3\nPORK BELLY                       $30.21  \u00a7\n1.374kg @ $21.89/kg\nPORK MINCE                          6571 via\n0.572kg @ $9.989/kg\nBEEF GRAVY                        $22.58\n0.982kg @ $22.89/kg\nHP Meats S|iced Beef                $6.98\nCHICKEN MINI DRUM                   $8.64\n|.442kg @ $5.98/kg\nPORK NECK BONE                      $3.53\n0.884kg @ $3.99/kg\nBEEF SHORT RIB                     $21.91\n1.826kg @ $12.00/kg\nBEEF ASADO                             $20.85\n0.948kg @ $21.99/kg\nTotal ltems: 8\nSUB TOTAL:    $133.77\nROUNDING:     ~$0.02\nGST INCLUDED IN TOTAL:     $0.00\nCASH:    $133.75\nBALANCE:      $0.00\nTransaction: 07/11/2026 08:02:46\nTEE on my TE\n";
 const a=R.parseReceipt(PHONE),ga=goods(a);
 assert.equal(ga.length,9);assert.equal(a.printedTotal,133.75,'CASH $133.75 is what was paid; “SUB TOTAL” is not read as TOTAL');assert.equal(a.difference,0);
 assert.ok(!ga.some((x:any)=>/\s[a-z|]$/.test(x.name)),'“BEEF BALL i” → “BEEF BALL”');
 const b=R.parseReceipt(OCR),gb=goods(b);
 assert.equal(gb.length,9,'PORK MINCE kept although its price read as “6571”');assert.equal(b.printedTotal,133.75);
 const mince=gb.find((x:any)=>/^PORK MINCE$/.test(x.name));assert.ok(mince&&mince.price===5.71&&mince.priceRepaired&&mince.priceFromWeight,'0.572 kg × $9.99/kg = $5.71, flagged for checking');
 const rnd=b.items.find((x:any)=>x.kind==='rounding');assert.equal(rnd.price,-0.02,'“~$0.02” is a minus');
 assert.ok(b.warnings.some((w:any)=>w.code==='over'),'the misread $13.95 is still reported, not silently changed');
});
// v1.7.18 (owner, 12 Nov 2026, 13:33, Cuong Thien Marrickville: “still not reading correctly”): the app's OCR of the photo (receipt
// number blanked, no photo kept). The wrapped “… CAI THUONG HA / I / BIG BUNCH” with its “2 @ $1.80” is one item, “66 $1.20” is
// 6 @ $1.20 of the noodles above, and the company line without its “LTD” (“PTY LT ie”, phone: “PTY ©”) still names the store.
check('Cuong Thien grocer: wrapped “I / BIG BUNCH” is no item, “66 $1.20” = 6 @ $1.20, store named without “LTD”',()=>{
 const OCR="* CUONG THIEN PTY LT   ie\n|             A.B.N. 24 684 946 089            b\n              Tel: (02) 9573 0330              i\n           307-309 ILLAWARRA ROAD\n|             MARRICKVILLE NSW 2204  ____= \u00a9\n|                  TAX INVOICE       on\nDate: 07/11/2026         No: P0000000000   :\nCashier: QUYMA           Register: POSY*  B\n| ==s==sssszmmmmssssssszosssssmssssISeoo\n\u00a9 08. BUK CHOY - CAI THUONG HA       $5.00\n1/3 FOR\n08. BUK CHOY - CAI THUONG HA       $3.60 \u00a9\n1 / BIG BUNCH                             ;\n2 @ $1.60                |\n01. CORIANDER - NGO / SYD          $1.20\n04. SHALLOT - HANH LA / NOR       $1.99 |\nMAL                                     |\n\"MELON HAIRY - BI DAD/KG / NO       $4.99\nRMAL                                                               |\n1.000kg @ $4.99/kg\nCUCUMBER GREEN (0Z) /KG / NO       $1.89\nRMAL\n0.950kg @ $1.89/kg\nTOMATO LOOSE /KG / ROUND          $4.37\n0.730kg @ $5.99/kg\nCHOLIMEX XOT BO KHO 1808            $3.40\n~~ CHOLIMEX XOT BO KHO 180G            $3.40\n~~ ROSE GLUTINOUS RICE TKG             $3.75\n   RTL THIN EGG NOODLES 500       $7.98\n| 1 a\n|      GIA VI HAT NEM CAQ C           :\nNAM HUONG 380G           \u201ci       Eh\nFRESH PURPLE GARLIC - 200G /       $5.00\nPURPLE ~~\nVT CRISP FRIED POWDER MIX BO       $1.30\nT CHIEN GION- 1506                        |\nVT CRISP FRIED PONDER MIX BO       $1.30\nT CHIEN GION- 1506\nMILIKET MI 4 TOM DAC BIET /        $7.20\nEACH\n66 $1.20\nSKYLUCK THIN EGG NOODLES 500       $7.98\nG\n2 @ $3.99\nTFC BUN TUOI 4006                  $6.30\n2 @ $3.15\nSUB HE    $76.30\nMASTERCARD!     90\nBALANCE:      $0.00\n";
 const r=R.parseReceipt(OCR),g=goods(r);
 assert.equal(r.store,'Cuong Thien Marrickville');assert.equal(r.printedTotal,76.3);
 assert.ok(!g.some((x:any)=>/BUNCH/.test(x.name)&&x.price===3.2),'“1 / 81g BUNCH” + “2 @ $1.60” is not an item of its own');
 assert.ok(g.every((x:any)=>x.name),'no unnamed line from “66 $1.20”');
 const mi=g.find((x:any)=>/MILIKET/.test(x.name));assert.deepEqual(J(mi.multi),{count:6,each:1.2});
 assert.equal(g.length,17,'17 of 18 lines; the KNORR line whose name and price OCR lost is reported as a shortfall, never invented');
 assert.ok(r.warnings.some((w:any)=>w.code==='short'));
 const b=R.parseReceipt('CUONG THIEN PTY ©\nA.B.N. 24 684 946 085\nMARRICKVILLE NSW 2204\nTAX INVOICE\nBUK CHOY   $5.00\nTOTAL: $5.00\n');assert.equal(b.store,'Cuong Thien Marrickville');
});
// v1.7.19 re-check (receipt currency, 13 Nov 2026): a đồng receipt says VND by itself (store, sign, size of the amounts) and its
// amounts are read whole (35.000 → 35000, never 35); dollar receipts stay AUD, a receipt that does not say leaves the family's.
check('receipt currency: đồng receipts are VND from the receipt itself; dollar receipts stay AUD; amounts are read, not converted',()=>{
 const vnd:[string,string,number,number[]][]=[
  ['CO.OP MART\nTRUNG GA 10 QUA 35000.00\nTHIT BA CHI 500G 125000.00\nTONG CONG 160000.00','store',160000,[35000,125000]],
  ['SIÊU THỊ CO.OPMART CỐNG QUỲNH\nHÓA ĐƠN BÁN LẺ\nTrứng gà 10 quả   35.000\nThịt ba chỉ 0,5kg   125.000\nTỔNG CỘNG   160.000\nTiền mặt   200.000\nTiền thối lại   40.000\nCảm ơn quý khách','store',160000,[35000,125000]],
  ['BÁCH HÓA XANH\nRau muống 1 bó 12,000\nCà chua 500g 18,500\nTổng tiền: 30,500 đ','store',30500,[12000,18500]],
  ['TIỆM TẠP HOÁ CÔ BA\nNước mắm 1 chai 45.000đ\nĐường 1kg 28.000đ\nTổng cộng 73.000đ','symbol',73000,[45000,28000]],
  ['CHO BEN THANH\nCa hu 2 con 90000\nRau cai 15000\nTong cong 105000','amounts',105000,[90000,15000]]];
 for(const[t,from,total,lines]of vnd){const r=R.parseReceipt(t);assert.equal(r.currency,'VND',t.split('\n')[0]);assert.equal(r.currencyFrom,from,t.split('\n')[0]+' reason');
  assert.equal(r.printedTotal,total,t.split('\n')[0]+' total');deq(goods(r).map((i:any)=>i.price),lines,t.split('\n')[0]+' lines')}
 // a Vietnamese grocer in Sydney prints Vietnamese words on a dollar receipt: AUD
 for(const t of ['CHỢ VIỆT CABRAMATTA\nCảm ơn quý khách\nRau muống 2.50\nTổng cộng $2.50','TIEM HUNG PHAT PTY LTD\nABN 12 345 678 901\nThit heo 1kg 12.90\nCa chua 3.50\nTOTAL 16.40']){const r=R.parseReceipt(t);assert.equal(r.currency,'AUD',t);assert.ok(r.currencyFrom,'says AUD: '+t)}
 // nothing says the currency: the family's is used (currencyFrom null), and a Vietnamese word alone is not enough
 {const r=R.parseReceipt('Cảm ơn quý khách\nRau muong 2.50\nCa chua 3.50\nTong cong 6.00');assert.equal(r.currencyFrom,null);assert.equal(r.currency,'AUD')}
 {const r=R.parseReceipt('CHO VIET\nTong cong 1000.00');assert.equal(r.currencyFrom,null,'one round amount is not enough')}
 // every dollar / pound fixture is read exactly as before and never as đồng
 const all:[string,string][]=[];const walk=(v:any,k:string)=>{if(typeof v==='string'){if(v.length>40&&v.includes('\n'))all.push([k,v])}else if(v&&typeof v==='object')for(const[kk,x]of Object.entries(v))walk(x,k+'.'+kk)};
 for(const f of ['receipts','generic-receipts','receipt-list','bench-receipts'])walk(require('./fixtures/'+f+'.cjs'),f);
 assert.ok(all.length>=24,'fixtures found: '+all.length);for(const[k,t]of all){const r=R.parseReceipt(t);assert.ok(['AUD','GBP'].includes(r.currency),k+' → '+r.currency);assert.notEqual(r.currencyFrom,'amounts',k)}
 // the đồng amount rewrite leaves weights, dates and codes alone
 assert.equal(R.vndAmounts('Thịt ba chỉ 0,5kg 125.000'),'Thịt ba chỉ 0,5kg 125000.00');assert.equal(R.vndAmounts('Gạo 1.200 kg 30.000'),'Gạo 1.200 kg 30000.00');assert.equal(R.vndAmounts('Ngày 13.11.2026'),'Ngày 13.11.2026');assert.equal(R.vndAmounts('Ngày: 13/11/2026'),'Ngày: 13/11/2026');
});
check('Henry 13 Nov 2026 (rule 32): a store line read as scraps is left empty, a real name or a chain is kept',()=>{
 for(const bad of ['RA SRE eR Zi I 3 web 4 5 TY os','|| ~ 3 4 | :','I l 1 | ii o','Be elle','ae ro Tia']) assert.equal(R.plausibleStoreName(bad),false,bad);
 for(const good of ['Orange Supermarke Wolli Creek','Chợ Cabramatta','Co.op Mart','IGA','TAN VIET GROCERY CABRAMATTA','Chợ Hà Nội','Siêu thị Bé Na','Ba Le Bakery','Thai Kee']) assert.equal(R.plausibleStoreName(good),true,good);
 const r=R.parseReceipt('RA SRE eR Zi I 3 web 4 5 TY os\nABN: 13 601 298 917\nTAX INVOICE\nDate: 13/11/2026\nHK CHOY SUM / BUNCH 1.99\nCARROT LOOSE 0.70\nTOTAL: $2.69');
 assert.equal(r.store,'','scraps are not saved as the store: '+r.store);assert.equal(r.printedTotal,2.69);
 const ok=R.parseReceipt('Orange Supermarke Wolli Creek\nABN: 13 601 298 917\nTAX INVOICE\nDate: 13/11/2026\nCARROT LOOSE 0.70\nTOTAL: $0.70');assert.match(ok.store,/Orange Supermarke/i)});
console.log(`receipt parser tests passed (${n})`);
})().catch(e=>{console.error(e);process.exit(1)});
