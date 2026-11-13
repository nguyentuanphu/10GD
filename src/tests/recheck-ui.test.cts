// v1.7.19 re-check (13 Nov 2026, Sydney time): unit checks for the open items the re-check of the audit fixes found.
//  B12 — pantryAmountInUnit: an amount in any unit becomes a pantry lot through a known conversion only (decisions.md “Unit picker,
//        remaining places”: a unit without a conversion is a bought lot in that unit with no guessed grams); ¼ steps for counted units.
//  B16 — no browser confirm() for removing a meal or clearing a dictated transcript; the app writes “Xoá” / “Huỷ”, never “Xóa” / “Hủy”
//        (matchers that read what the family says or types keep both spellings).
//  B19 — a bought lot's amount is written like the other pantry amounts; portions are “suất” with a decimal comma in Vietnamese.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math:Object.create(Math),structuredClone,crypto:require('node:crypto').webcrypto});
vm.runInContext(['store-registry','seed','recipe-catalog','core','spending-core','unit-registry','purchase-units','planning-core','family-menu-core'].map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n')+'\n;this.a={pantryAmountInUnit,pantryBuyingDisplay,pantryUnitStep,portionNumber,recipePortionLabel,defaults,INGREDIENTS,validImport};',c);
const a=c.a,j=(x:any)=>JSON.parse(JSON.stringify(x));let n=0;const ok=(cond:any,m:string)=>{assert.ok(cond,m);n++};const eq=(x:any,y:any,m:string)=>{assert.deepEqual(j(x),y,m);n++};
const MILK=Object.keys(a.INGREDIENTS).find(k=>a.INGREDIENTS[k][1]==='ml'&&!/^family-ing-/.test(k))!;
const s=a.defaults();s.customUnits=[{id:'cu-qa-tui',name:'túi QA',base:'ml',perBase:500,ingredient:MILK,createdAt:'2026-11-13T00:00:00Z'}];s.purchaseUnitPreferences={pork:{unit:'khay',amount:1,basePerUnit:450,pricePerUnit:null}};

// ---- B12: conversions -------------------------------------------------------------------------------------------------
eq(a.pantryAmountInUnit(s,'pork',300,'g'),{qty:300,purchase:null},'own unit as typed');
eq(a.pantryAmountInUnit(s,'pork',1.5,'kg'),{qty:1500,purchase:null},'kg → g');
eq(a.pantryAmountInUnit(s,'pork',2,'lạng'),{qty:200,purchase:null},'lạng → g');
eq(a.pantryAmountInUnit(s,MILK,1.25,'l'),{qty:1250,purchase:null},'l → ml');
eq(a.pantryAmountInUnit(s,MILK,3,'túi QA'),{qty:1500,purchase:{unit:'túi QA',amount:3,basePerUnit:500,pricePerUnit:null,note:''}},'family unit with a conversion');
eq(a.pantryAmountInUnit(s,'pork',2,'khay'),{qty:900,purchase:{unit:'khay',amount:2,basePerUnit:450,pricePerUnit:null,note:''}},'the remembered buying unit and its conversion');
eq(a.pantryAmountInUnit(s,'pork',2,'hộp'),{qty:0,purchase:{unit:'hộp',amount:2,basePerUnit:null,pricePerUnit:null,note:''}},'no conversion: a bought lot, no guessed grams');
eq(a.pantryAmountInUnit(s,'pork',1,'bottles'),{qty:0,purchase:{unit:'chai',amount:1,basePerUnit:null,pricePerUnit:null,note:''}},'an English unit word is stored as the app unit');
eq(a.pantryAmountInUnit(s,'egg',1.5,'chục'),{qty:15,purchase:{unit:'chục',amount:1.5,basePerUnit:10,pricePerUnit:null,note:''}},'chục of eggs through the fixed conversion');
eq(a.pantryAmountInUnit(s,'egg',1,'kg'),{qty:0,purchase:{unit:'kg',amount:1,basePerUnit:null,pricePerUnit:null,note:''}},'eggs by the kilo: how many eggs stays unknown');
eq(a.pantryAmountInUnit(s,'pork',0,'kg'),null,'nothing for 0');eq(a.pantryAmountInUnit(s,'pork',-1,'g'),null,'nothing below 0');
eq(['g','ml','kg','l','quả','hộp','chục','túi QA'].map((u:string)=>a.pantryUnitStep(u)),['0.1','0.1','0.01','0.01','0.25','0.25','0.25','0.25'],'¼ steps for counted units (Henry, 13 Nov: “Giữ bước ¼”)');
// whatever these lots are, the app loads them back (rule 33)
s.pantry=[{id:'qa1',ingredient:'pork',qty:0,place:'fridge',expiry:'',purchase:a.pantryAmountInUnit(s,'pork',2,'hộp').purchase},{id:'qa2',ingredient:MILK,qty:1500,place:'fridge',expiry:'',purchase:a.pantryAmountInUnit(s,MILK,3,'túi QA').purchase}];
ok(a.validImport(j(s)),'validImport keeps the bought lots');

// ---- B19: amounts and portions ----------------------------------------------------------------------------------------
const lot=(unit:string,amount:number)=>({ingredient:'pork',qty:0,purchase:{unit,amount,basePerUnit:null}});
eq([lot('túi',2.5),lot('hộp',1),lot('chục',1.25),lot('kg',1.333),lot('g',472.54),lot('hộp',2.37)].map(a.pantryBuyingDisplay),['2½ túi','1 hộp','1¼ chục','1,33 kg','472,5 g','2,37 hộp'],'bought lots read like the other pantry amounts');
eq([a.portionNumber(3.15),a.portionNumber(2),a.portionNumber(0.6499)],['3,15','2','0,65'],'portions: a decimal comma in Vietnamese');
eq(a.recipePortionLabel({name:'x',ingredients:[]},4),'4 suất','“suất”, as on the meal cards');

// ---- B16 and B19: the code itself --------------------------------------------------------------------------------------
const src=(f:string)=>fs.readFileSync('src/frontend/'+f,'utf8');
for(const f of ['family-menu-ui.ts','voice-recipe.ts']){ok(!/(^|[^\w.])confirm\(/.test(src(f)),`${f}: no browser confirm()`)}
{const t=src('app.ts'),i=t.indexOf("case 'delete-stock-confirm':");ok(i>=0&&t.slice(i,t.indexOf('\ncase ',i)).includes('undoBar('),'deleting a pantry lot offers “Hoàn tác”')}
// one spelling in the text the app writes; matchers (regular expressions and word lists that read what the family says or types)
// keep both, and the extension's own button name (“Hủy ghép nối”) is quoted as the extension writes it.
const SPELL=/(?<![\p{L}])(Xóa|xóa|XÓA|Hủy|hủy|HỦY)(?![\p{L}])/gu,allowed=[/\/\^\((?:xoá\|xóa|hủy\|huỷ)/,/\(\?:xóa\|xoá\|/,/\['xóa','xoá'/,/→ Hủy ghép nối/];const bad:string[]=[];
for(const f of fs.readdirSync('src/frontend').filter((x:string)=>x.endsWith('.ts')&&!/^studio/.test(x))){const t=src(f);for(const m of t.matchAll(SPELL)){const around=t.slice(Math.max(0,m.index!-40),m.index!+40);if(!allowed.some(re=>re.test(around)))bad.push(`${f}: …${around.replace(/\s+/g,' ')}…`)}}
assert.deepEqual(bad,[],'the app writes “Xoá” / “Huỷ”');n++;
const old:string[]=[];for(const f of fs.readdirSync('src/frontend').filter((x:string)=>x.endsWith('.ts')&&x!=='language.ts')){const t=src(f);for(const m of t.matchAll(/suất chuẩn|standard portions/g))old.push(`${f}: ${t.slice(Math.max(0,m.index!-60),m.index!+20).replace(/\s+/g,' ')}`)}
assert.deepEqual(old,[],'one word for portions: “suất” / “portions”');n++;
console.log(`recheck-ui: ${n} checks passed`);
