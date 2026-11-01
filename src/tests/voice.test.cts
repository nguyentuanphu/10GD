// Voice understanding: long, rambling Vietnamese/English speech (incl. elderly-style pauses, repeats and self-corrections).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});
for(const f of ['seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
vm.runInContext(`globalThis.S=defaults();S.preferences.familyPlanner=true;S.weeks={};S.pantry=[];S.recipes.push({...recipe('own-soup','Canh chua cá','soup','fish',20,{fish:400},'prep',['cook']),custom:true,purposes:['side'],yield:4});`,c);
const BASE='2026-11-02',TODAY='2026-11-02';
function parse(text,base=BASE,today=TODAY){c.__t=text;c.__b=base;c.__d=today;return JSON.parse(JSON.stringify(vm.runInContext('parseVoiceInput(__t,S,__b,__d)',c)))}
const run=src=>vm.runInContext(src,c);
// Compact view: [label, qty, unit, ingredient]
const rows=r=>(r.items||[]).map(i=>[i.label,i.qty,i.unit,i.ingredient]);
function expectItems(text,expected,extra){const r=parse(text);try{assert.equal(r.kind,'shopping');assert.deepEqual(rows(r),expected);extra&&extra(r)}catch(e){e.message=`${text}\n${e.message}\nGot: ${JSON.stringify(r)}`;throw e}return r}
let count=0;const t=(name,fn)=>{fn();count++};

const before=JSON.stringify(run('S'));

// ---- Utterances from the investigation ----
t('long VI ramble with fillers, pronouns and a dish for tonight',()=>expectItems('ờ thì mai con mua cho mẹ hai ký thịt ba chỉ với lại một bó rau muống nha, à với ba hộp trứng, còn tối nay nấu canh chua cá lóc',[['thịt ba chỉ',2,'kg','pork'],['rau muống',1,'bó','waterSpinach'],['trứng',3,'hộp','egg']],r=>{assert.equal(r.mealDraft.date,TODAY,'"tối nay" is today, "mai" must not leak from the shopping clause');assert.equal(r.mealDraft.type,'dinner');assert.equal(r.mealDraft.dish,'canh chua cá lóc');assert.ok(r.mealDraft.candidates.includes('own-soup'));assert.ok(r.items.every(i=>!i.needsReview))}));
t('nửa ký, gam, trái; bơ is not beef',()=>expectItems('mua nửa ký tôm, 500 gam sườn non, hai trái bơ',[['tôm',.5,'kg','shrimp'],['sườn non',500,'g','ribs'],['bơ',2,'quả','']]));
t('rưỡi, chục, hai mươi lăm; tôm is not a stray dish',()=>expectItems('hai ký rưỡi thịt bò, một chục trứng, hai mươi lăm con tôm',[['thịt bò',2.5,'kg','beef'],['trứng',10,'quả','egg'],['tôm',25,'con','shrimp']],r=>assert.equal(r.mealDraft,undefined)));
t('con is a unit, nhé is a filler',()=>expectItems('ba bó rau cải nhé với hai con cá lóc',[['rau cải',3,'bó','spinach'],['cá lóc',2,'con','fish']]));
t('two animals by con',()=>expectItems('hai con gà với ba con cá',[['gà',2,'con','chicken'],['cá',3,'con','fish']]));
t('N ký M',()=>expectItems('1 ký 2 thịt heo',[['thịt heo',1.2,'kg','pork']]));
t('mười lăm',()=>expectItems('mười lăm quả trứng',[['trứng',15,'quả','egg']]));
t('hai lạng rưỡi = 250 g',()=>expectItems('hai lạng rưỡi thịt bò',[['thịt bò',250,'g','beef']]));
t('EN kilos/bunch + tonight dish',()=>expectItems('buy two kilos of pork belly and a bunch of bok choy and tonight cook sour fish soup',[['pork belly',2,'kg','pork'],['bok choy',1,'bó','bokchoy']],r=>{assert.equal(r.mealDraft.date,TODAY);assert.equal(r.mealDraft.type,'dinner');assert.ok(r.mealDraft.candidates.includes('own-soup'))}));
t('EN fillers, "can you" is not a unit, count without unit',()=>expectItems('um can you get like half a kilo of prawns and uh also two avocados please',[['prawns',.5,'kg','shrimp'],['avocados',2,'quả','']]));

// ---- More numbers & units ----
t('hai mươi mốt / ba mươi tư / một trăm linh năm',()=>{expectItems('hai mươi mốt quả trứng, ba mươi tư con tôm, một trăm linh năm gam tiêu',[['trứng',21,'quả','egg'],['tôm',34,'con','shrimp'],['tiêu',105,'g','pepper']])});
t('nửa lạng, ki lô, cân next to a number only, digits glued to units',()=>expectItems('nửa lạng tỏi, hai ki lô khoai tây, 3 cân gạo, 2kg cà rốt, 1,5 lít sữa',[['tỏi',50,'g','garlic'],['khoai tây',2,'kg','potato'],['gạo',3,'kg','rice'],['cà rốt',2,'kg','carrot'],['sữa',1.5,'l','']]));
t('lon/can only after a number; dozen; couple; point',()=>expectItems('a can of coconut water, a dozen eggs, a couple of limes and one point five litres of stock',[['coconut water',1,'lon','coconut'],['eggs',12,'quả','egg'],['limes',2,'quả','lime'],['stock',1.5,'l','broth']]));
t('một tá, hai chục quả',()=>expectItems('một tá trứng và hai chục quả chanh',[['trứng',12,'quả','egg'],['chanh',20,'quả','lime']]));
t('gói, khay, chai, túi, vỉ, củ, nắm, hộp',()=>expectItems('2 gói bún, 1 khay thịt gà, 1 chai dầu ăn, 1 túi gạo, 1 vỉ trứng, 3 củ hành tây, 1 nắm rau thơm, 2 hộp đậu hũ',[['bún',2,'gói','noodle'],['thịt gà',1,'khay','chicken'],['dầu ăn',1,'chai','oil'],['gạo',1,'túi','rice'],['trứng',1,'vỉ','egg'],['hành tây',3,'củ','onion'],['rau thơm',1,'nắm','herbs'],['đậu hũ',2,'hộp','tofu']]));
t('quantity after the name',()=>expectItems('thịt bò 500g, cà chua 1 ký, trứng 10 quả',[['thịt bò',500,'g','beef'],['cà chua',1,'kg','tomato'],['trứng',10,'quả','egg']]));
t('no separators between items',()=>expectItems('hai ký thịt heo một bó rau muống ba quả chanh',[['thịt heo',2,'kg','pork'],['rau muống',1,'bó','waterSpinach'],['chanh',3,'quả','lime']]));
t('hai ký ba chỉ (pork belly) is not 2.3 kg',()=>expectItems('hai ký ba chỉ',[['ba chỉ',2,'kg','pork']]));
t('bó ≠ bò ≠ bơ',()=>expectItems('một bó hành, một ký bò, một ký bơ',[['hành',1,'bó','scallion'],['bò',1,'kg','beef'],['bơ',1,'kg','']]));

// ---- Never invent ----
t('unknown amounts stay unknown and flagged',()=>expectItems('mấy ký thịt heo, ờ, chưa biết, với lại vài bó rau',[['thịt heo',null,'kg','pork'],['rau',null,'bó','spinach']],r=>assert.ok(r.items.every(i=>i.needsReview))));
t('no quantity at all',()=>expectItems('thêm sữa, giấy ăn',[['sữa',null,'',''],['giấy ăn',null,'','']],r=>assert.ok(r.items.every(i=>i.needsReview))));
t('unknown measure word is not turned into a count',()=>{const r=parse('2 muỗng nước mắm');assert.equal(r.items.length,1);assert.equal(r.items[0].qty,null);assert.ok(r.items[0].needsReview)});
t('range keeps upper bound but flags it',()=>expectItems('hai ba ký cá basa',[['cá basa',3,'kg','fish']],r=>assert.ok(r.items[0].needsReview)));

// ---- Ten+ realistic long elderly-style utterances ----
t('elderly 1: vocative, giùm mẹ, pauses with …',()=>expectItems('à mẹ ơi, mai con đi chợ thì mua giùm mẹ ba lạng thịt bò, ờ, hai bó hành lá, rồi thì... một chai nước mắm nha con',[['thịt bò',300,'g','beef'],['hành lá',2,'bó','scallion'],['nước mắm',1,'chai','fishSauce']]));
t('elderly 2: self-correction "à nhầm" + repeated item gets the amount said later',()=>expectItems('ừ thì ba ký à nhầm hai ký sườn non, với lại trứng, trứng thì mua hai chục',[['sườn non',2,'kg','ribs'],['trứng',20,'quả','egg']]));
t('elderly 3: weekday dish for six + shopping',()=>expectItems('thứ bảy này nấu bún bò huế cho sáu người, nhớ mua hai ký bắp bò với một ký bún',[['bắp bò',2,'kg','beef'],['bún',1,'kg','noodle']],r=>{assert.equal(r.mealDraft.date,'2026-11-07');assert.equal(r.mealDraft.servings,6);assert.equal(r.mealDraft.dish,'bún bò huế')}));
t('elderly 4: amount and item split by a long pause',()=>expectItems('con ơi, à, cái, mua cho bà một ký cà chua, một ký... ờ... khoai tây, với lại nửa ký tỏi',[['cà chua',1,'kg','tomato'],['khoai tây',1,'kg','potato'],['tỏi',.5,'kg','garlic']]));
t('elderly 5: stutters and repeats collapse to one line',()=>expectItems('hai hai ký thịt heo nha, hai ký thịt heo, thịt heo đó',[['thịt heo',2,'kg','pork']]));
t('elderly 6: "à không" correction of the amount only',()=>expectItems('mua hai ký thịt bò à không ba ký',[['thịt bò',3,'kg','beef']]));
t('elderly 7: cancel an item',()=>expectItems('mua rau muống, à thôi khỏi, mua hai bó cải thìa',[['cải thìa',2,'bó','bokchoy']]));
t('elderly 8: dictated list with colon and full stop, dish tomorrow',()=>expectItems('Mẹ dặn: mua hai hộp đậu hũ, một vỉ trứng, với hai trái chanh. Còn tối mai nấu thịt kho trứng cho cả nhà',[['đậu hũ',2,'hộp','tofu'],['trứng',1,'vỉ','egg'],['chanh',2,'quả','lime']],r=>{assert.equal(r.mealDraft.date,'2026-11-03');assert.equal(r.mealDraft.type,'dinner');assert.ok(r.mealDraft.candidates.length)}));
t('elderly 9 (EN): correction "no wait"',()=>expectItems('okay so uh we need a dozen eggs, a couple of lemons, no wait, three lemons, and a bag of rice',[['eggs',12,'quả','egg'],['lemons',3,'quả','lime'],['rice',1,'túi','rice']]));
t('elderly 10 (EN): "actually make that three" keeps the unit',()=>expectItems('two kilos of chicken thighs, actually make that three, and one point five litres of milk',[['chicken thighs',3,'kg','chicken'],['milk',1.5,'l','']]));
t('elderly 11 (EN): thinking aloud + tomorrow dish',()=>expectItems("Now, um, let me think. Tomorrow we're having pho, so get me a kilo of beef, ah, two packets of pho noodles, and a bunch of, what's it called, Thai basil",[['beef',1,'kg','beef'],['pho noodles',2,'gói','riceNoodle'],['thai basil',1,'bó','herbs']],r=>{assert.equal(r.mealDraft.date,'2026-11-03');assert.ok(r.mealDraft.candidates.some(id=>id==='n1'||id==='n2'))}));
t('elderly 12: meal-only with change of mind',()=>{const r=parse('ờ… hôm nay… à… ăn phở bò, mà thôi, ăn bún bò đi');assert.equal(r.kind,'meal');assert.equal(r.dish,'bún bò');assert.equal(r.date,TODAY)});
t('elderly 13: dish list joined by với keeps tonight',()=>{const r=parse('tối nay ăn canh chua cá với cá kho tộ');assert.equal(r.kind,'meal');assert.equal(r.mealDrafts.length,2);assert.ok(r.mealDrafts.every(m=>m.date===TODAY&&m.type==='dinner'));assert.equal(r.candidates[0],'own-soup')});
t('elderly 14: trailing servings after a comma',()=>{const r=parse('tối mai nấu canh chua cá, cho bốn người nhé');assert.equal(r.kind,'meal');assert.equal(r.servings,4);assert.equal(r.date,'2026-11-03')});
t('elderly 15: ba ơi is a call, not 3',()=>expectItems('ba ơi mua hai ký gà',[['gà',2,'kg','chicken']]));

// ---- Dates: "nay" = today even when another day is open in the planner; weekdays never go into the past ----
t('today vs selected day',()=>{const r=parse('tối nay nấu canh chua cá','2026-11-09','2026-11-02');assert.equal(r.date,'2026-11-02');const m=parse('trưa mai ăn phở','2026-11-09','2026-11-02');assert.equal(m.date,'2026-11-03');assert.equal(m.type,'lunch');const plain=parse('nấu canh chua cá','2026-11-09','2026-11-02');assert.equal(plain.date,'2026-11-09','no time word keeps the selected day');const wd=parse('thứ hai nấu canh chua cá','2026-11-04','2026-11-04');assert.equal(wd.date,'2026-11-09')});
t('unaccented typing still works',()=>expectItems('mua 2 ky thit heo, 1 bo rau muong',[['thit heo',2,'kg','pork'],['rau muong',1,'bó','waterSpinach']]));

// ---- Recognition helpers ----
t('alternative picker scores Vietnamese words with Unicode boundaries',()=>{c.__alts=[{transcript:'hai kì thít ba trì',confidence:.9},{transcript:'hai ký thịt ba chỉ',confidence:.6}];assert.equal(run('pickBestVoiceAlt(__alts)'),'hai ký thịt ba chỉ');assert.ok(run("voiceAltScore('ăn phở',1)")>run("voiceAltScore('an pho',1)"));assert.ok(run("voiceAltScore('một bó rau',1)")>=3)});
t('Android duplicate finals are merged',()=>{assert.deepEqual(JSON.parse(run(`JSON.stringify(['hai ký thịt','hai ký thịt bò','hai ký thịt bò','một bó rau'].reduce((l,x)=>mergeVoiceFinal(l,x),[]))`)),['hai ký thịt bò','một bó rau'])});
t('parsing never mutates state',()=>assert.equal(JSON.stringify(run('S')),before));
console.log(`PASS voice: ${count} checks — VI/EN long speech, fillers, corrections, units, numbers, dates, dedupe and alternative picking`);
