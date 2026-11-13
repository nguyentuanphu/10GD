// Voice price grammar (v1.6): spoken/typed VI + EN price utterances → Price Scout rows.
// Item (catalogue + learned), price words/digits, pack/unit (never invented), retailer + branch,
// promo, was-price, several prices per utterance, and the confirm-sheet seed (family-only evidence).
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,Intl,Date,Math,URL,JSON,structuredClone});
for(const f of ['store-registry.js','master-catalog.js','shopping-optimizer.js','voice-price.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
const VP=ctx.VoicePrice,PS=ctx.PriceScout;
const STORES=[{id:'store-cab',name:'Chợ Việt Cabramatta',address:'Cabramatta'},{id:'store-coles',name:'Coles',address:'Siêu thị'}];
const parse=(t:string,opts:any={})=>JSON.parse(JSON.stringify(VP.parsePriceUtterance(t,{stores:STORES,...opts})));
let count=0;
function exp(text:string,rows:any[],opts:any={}){
 const r=parse(text,opts);
 try{assert.equal(r.rows.length,rows.length,'row count');rows.forEach((want,i)=>{for(const[k,v]of Object.entries(want)){if(k==='warn')for(const w of v as string[])assert.ok(r.rows[i].warnings.includes(w),`row ${i} warning ${w}`);else if(k==='noWarn')for(const w of v as string[])assert.ok(!r.rows[i].warnings.includes(w),`row ${i} no warning ${w}`);else assert.deepEqual(r.rows[i][k],v,`row ${i} ${k}`)}})}
 catch(e:any){e.message=`${text}\n${e.message}\nGot: ${JSON.stringify(r.rows.map((x:any)=>({label:x.label,itemId:x.itemId,price:x.price,wasPrice:x.wasPrice,promo:x.promo,retailer:x.retailer,branch:x.branch,packQty:x.packQty,packUnit:x.packUnit,units:x.units,per:x.per,warnings:x.warnings})))}`;throw e}
 count++;return r;
}
const NO_PACK={packQty:null,packUnit:null,units:null};

// ---- Owner examples ----
exp('Rau muống hai đô rưỡi một bó, chợ Cabramatta',[{itemId:'rau-muong',price:2.5,retailer:'viet-grocer',branch:'Cabramatta',branchId:'store-cab',...NO_PACK,per:{vi:'bó',en:'bunch',count:1}}]);
exp('thịt ba chỉ mười bốn đô chín mươi chín một ký ở Woolworths, đang sale, trước là mười tám đô',[{itemId:'thit-ba-chi',label:'Thịt ba chỉ',price:14.99,packQty:1,packUnit:'kg',unitPrice:14.99,unitBasis:'per_kg',retailer:'woolworths',branch:null,promo:'special',wasPrice:18}]);
exp('Finish 60 viên 24 đô 99',[{itemId:'finish-tablets',price:24.99,packQty:60,packUnit:'wash',units:60,unitBasis:'per_wash',warn:['no-retailer']}]);
exp('eggs twelve pack six dollars fifty at Aldi Bankstown',[{itemId:'trung',label:'Eggs',price:6.5,packQty:12,packUnit:'each',units:12,retailer:'aldi',branch:'Bankstown'}]);
exp('half price coles fairy 2 dollars 75',[{itemId:'nuoc-rua-chen',price:2.75,promo:'half-price',retailer:'coles',branch:null,...NO_PACK,wasPrice:null,warn:['pack-unknown']}]);
// ---- Number grammar ----
exp('rau muống 2 rưỡi',[{itemId:'rau-muong',price:2.5}]);
exp('thịt ba chỉ mười bốn chín chín',[{itemId:'thit-ba-chi',price:14.99,...NO_PACK}]);
exp('sữa tươi hai lít ba đô mốt',[{itemId:'sua-tuoi',price:3.1,packQty:2,packUnit:'L'}]);
exp('cá basa mười đô năm mươi một ký, trước đây là mười hai đô',[{itemId:'ca-basa',price:10.5,packQty:1,packUnit:'kg',wasPrice:12,promo:'special'}]);
exp('tôm hai mươi tám đô một ký',[{itemId:'tom',price:28,packQty:1,packUnit:'kg'}]);
exp('pork belly fourteen ninety nine a kilo at woolies',[{itemId:'thit-ba-chi',price:14.99,packQty:1,packUnit:'kg',retailer:'woolworths'}]);
exp('bok choy 1 dollar 50 a bunch',[{itemId:'cai-thia',price:1.5,...NO_PACK,per:{vi:'bó',en:'bunch',count:1}}]);
exp('$2.99 bean sprouts at Coles',[{itemId:'gia',label:'Bean sprouts',price:2.99,retailer:'coles',...NO_PACK}]);
exp('cà chua $4.50 một ký ở Coles',[{itemId:'ca-chua',price:4.5,packQty:1,packUnit:'kg',retailer:'coles'}]);
exp('Coles có bán dưa leo 1 đô 20 một trái',[{itemId:'dua-leo',price:1.2,packQty:1,packUnit:'each',units:1,retailer:'coles'}]);
exp('cà rốt một ký hai đô',[{itemId:'ca-rot',price:2,packQty:1,packUnit:'kg'}]);
exp('rau muong hai do ruoi mot bo o cho Cabramatta',[{itemId:'rau-muong',price:2.5,retailer:'viet-grocer',branch:'Cabramatta'}]);// typed without accents
// ---- Packs: only what was said ----
exp('nước mắm 500 ml 5 đô rưỡi',[{itemId:'nuoc-mam',price:5.5,packQty:500,packUnit:'mL',unitBasis:'per_100mL',unitPrice:1.1}]);
exp('gạo 5 ký 12 đô 50 ở Aldi, was 15 dollars',[{price:12.5,packQty:5,packUnit:'kg',retailer:'aldi',wasPrice:15,promo:'special'}]);
exp('giấy vệ sinh 24 cuộn 14 đô ở Coles đang giảm giá',[{itemId:'giay-ve-sinh',price:14,packQty:24,packUnit:'roll',units:24,retailer:'coles',promo:'special'}]);
exp('trứng gà mười hai quả bảy đô rưỡi ở Aldi',[{itemId:'trung',price:7.5,packQty:12,packUnit:'each',retailer:'aldi'}]);
exp('a dozen eggs 6 dollars',[{itemId:'trung',price:6,packQty:12,units:12}]);
exp('ba chỉ 2 ký 30 đô',[{itemId:'thit-ba-chi',price:30,packQty:2,packUnit:'kg',unitPrice:15}]);
exp('mì gói 1 thùng 30 gói 18 đô',[{itemId:'mi-goi',label:'Mì gói',price:18,...NO_PACK,per:{vi:'thùng',en:'carton',count:1}}]);
exp('rau muống 3 đô',[{itemId:'rau-muong',price:3,...NO_PACK,warn:['pack-unknown','no-retailer']}]);
exp('jasmine rice 10 kilos 22 dollars at Costco',[{itemId:'gao-jasmine',price:22,packQty:10,packUnit:'kg',retailer:'other',retailerName:'Costco'}]);
// ---- Retailer, branch, promo, was ----
exp('dầu ăn 2 lít 6 đô 99 at Aldi, normally 8 dollars',[{itemId:'dau-an',price:6.99,packQty:2,packUnit:'L',retailer:'aldi',wasPrice:8,promo:'special'}]);
exp('salmon 32 dollars per kg at Woolworths save 6 dollars',[{price:32,wasPrice:38,promo:'special',retailer:'woolworths',packQty:1,packUnit:'kg'}]);
exp('special buy aldi air fryer 59 dollars',[{label:'Air fryer',itemId:null,price:59,promo:'special-buy',retailer:'aldi',warn:['no-match']}]);
exp('fairy dishwashing liquid 1/2 giá 3 đô ở Woolworths',[{itemId:'nuoc-rua-chen',price:3,promo:'half-price',retailer:'woolworths',wasPrice:null}]);
exp('bánh mì 4 đô ở tiệm Hưng Phát',[{itemId:'banh-mi',price:4,retailer:'viet-grocer',branch:'Hưng Phát'}]);
exp('Woolworths Cabramatta, chuối 3 đô 90 một ký',[{itemId:'chuoi',label:'Chuối',price:3.9,retailer:'woolworths',branch:'Cabramatta'}]);
exp('chicken thighs 9.90 per kilo at Coles on special',[{label:'Chicken thighs',price:9.9,packQty:1,packUnit:'kg',retailer:'coles',promo:'special'}]);
// ---- Several prices in one utterance → several rows ----
exp('Rau muống hai đô rưỡi một bó, cà chua bốn đô một ký ở Coles',[{itemId:'rau-muong',price:2.5,...NO_PACK,retailer:'coles'},{itemId:'ca-chua',price:4,packQty:1,packUnit:'kg',retailer:'coles'}]);
exp('milk 2 litres $3.10 at Woolworths, bread $4 at Coles',[{itemId:'sua-tuoi',price:3.1,packQty:2,packUnit:'L',retailer:'woolworths'},{label:'Bread',price:4,retailer:'coles',...NO_PACK}]);
exp('hành lá một đô một bó, ngò hai đô một bó, chợ Việt',[{itemId:'hanh-la',price:1,retailer:'viet-grocer'},{label:'Ngò',price:2,retailer:'viet-grocer'}]);
exp('thịt bò xay 12 đô một ký ở chợ Cabramatta rồi tôm 25 đô một ký',[{itemId:'thit-bo-xay',price:12,retailer:'viet-grocer',branch:'Cabramatta'},{itemId:'tom',price:25,packQty:1,packUnit:'kg',retailer:'viet-grocer',branch:'Cabramatta'}]);
exp('bananas 3.90 a kilo, apples 4.50 a kilo, at Harris Farm',[{itemId:'chuoi',price:3.9,retailer:'other',retailerName:'Harris Farm'},{itemId:'tao',price:4.5,retailer:'other'}]);
{const r=exp('thịt ba chỉ 14 đô 99 một ký, trước là 18 đô, cà chua 4 đô ở Coles',[{itemId:'thit-ba-chi',price:14.99,wasPrice:18},{itemId:'ca-chua',price:4,wasPrice:null,retailer:'coles'}]);assert.equal(r.rows[1].packQty,null,'a was-price after a separator stays with its row')}
// ---- No price → no rows; numbers in names are not prices ----
assert.equal(parse('không có giá ở đây').rows.length,0);assert.equal(parse('hôm nay đi chợ mua rau').error,'no-price');count+=2;
exp('thịt ba chỉ ba đô',[{itemId:'thit-ba-chi',label:'Thịt ba chỉ',price:3}]);
// ---- Learned label → item, wanted item prefill ----
exp('ngò hai đô một bó',[{label:'Ngò',itemId:'rau-thom',learned:true}],{learned:{ngo:'rau-thom'}});
exp('ba đô rưỡi ở Coles',[{itemId:'rau-muong',fromWant:true,price:3.5,retailer:'coles'}],{want:'rau-muong',lang:'vi'});
{const r=parse('ba đô rưỡi ở Coles',{want:'rau-muong',lang:'en'});assert.equal(r.rows[0].label,'Water spinach');count++}
// ---- Confirm-sheet seed: source voice, family-only evidence, sanity-compatible observation ----
{const row=parse('thịt ba chỉ mười bốn đô chín mươi chín một ký ở Woolworths, đang sale, trước là mười tám đô').rows[0];
 const seed=VP.voicePriceDraftSeed(row,'full text','vi');
 assert.equal(seed.source,'voice');assert.equal(seed.evidenceType,'manual-voice');assert.equal(seed.itemId,'thit-ba-chi');assert.equal(seed.price,14.99);assert.equal(seed.wasPrice,18);assert.equal(seed.promo,'special');assert.equal(seed.retailer,'woolworths');assert.equal(seed.packQty,1);assert.equal(seed.packUnit,'kg');
 assert.match(seed.raw,/thịt ba chỉ mười bốn đô/);
 const o=PS.withProvenance({id:'obs-voice-test-1',itemId:seed.itemId,label:seed.label,retailer:seed.retailer,branchId:null,state:'NSW',price:seed.price,currency:'AUD',packQty:seed.packQty,packUnit:seed.packUnit,units:null,unitPrice:seed.unitPrice,unitBasis:seed.unitBasis,wasPrice:seed.wasPrice,promo:seed.promo,validUntil:null,observedAt:PS.sydneyToday(),observedBy:null,source:'voice',note:null},{evidenceType:'manual-voice'});
 assert.equal(o.evidence.type,'manual-voice');assert.equal(o.confidence,'low');assert.equal(o.visibility,'family');
 assert.ok(PS.validObservation(o),'voice observation is valid');
 assert.equal(PS.canShareToCommunity(o),false,'voice-only prices are never community-shareable');
 assert.equal(PS.canShareToCommunity({...o,evidence:{...o.evidence,ocrPrice:o.price}}),false,'even with a matching number');
 count++}
{const row=parse('Rau muống hai đô rưỡi một bó, chợ Cabramatta',{stores:[]}).rows[0],seed=VP.voicePriceDraftSeed(row,'','vi');assert.equal(seed.packQty,null,'no invented pack');assert.equal(seed.branchId,null);assert.match(seed.note,/Giá mỗi bó/);assert.match(seed.note,/Chi nhánh: Cabramatta/);
 const en=VP.voicePriceDraftSeed(row,'','en');assert.match(en.note,/Price per bunch/);assert.match(en.note,/Branch: Cabramatta/);count++}
// ---- Server accepts the voice source and family-only evidence ----
{const src=fs.readFileSync('src/netlify/lib/grocery-pricing.mts','utf8');assert.match(src,/SOURCES=\[[^\]]*'voice'/);assert.match(src,/EVIDENCE=\[[^\]]*'manual-voice'/);
 const com=fs.readFileSync('src/netlify/lib/community-prices.mts','utf8');assert.ok(!/COMMUNITY_EVIDENCE=\[[^\]]*voice/.test(com),'community evidence never includes voice');count++}
console.log(`PASS voice price grammar (${count} checks)`);
