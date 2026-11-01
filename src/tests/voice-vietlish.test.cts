// Voice v1.6 integration: Vietlish / code-switching, spoken lists without "and", recogniser homophones, phonetic
// "Did you mean" suggestions, unit inference for bare counts, Auto recognition language, alternative scoring.
// Every utterance is parsed bilingually whatever language the recogniser listened in (vi-VN or en-AU outputs below).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});
for(const f of ['seed.js','recipe-catalog.js','core.js','spending-core.js','unit-registry.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js','voice-learning.js','shopping-optimizer.js','voice-commands.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
const run=(src:string)=>vm.runInContext(src,c);
run(`globalThis.S=defaults();S.weeks={};S.pantry=[];`);
const J=(x:any)=>JSON.parse(JSON.stringify(x));
function parse(text:string){c.__t=text;return J(run(`parseVoiceInput(__t,S,'2026-11-02','2026-11-02')`))}
let count=0;const t=(name:string,fn:()=>void)=>{try{fn()}catch(e:any){console.error('FAIL '+name+': '+e.message);process.exitCode=1;return}count++};
// [utterance, [[ingredient id, qty, unit], ...]] — unit is the app's stored (Vietnamese) unit.
type Row=[string,[string,number|null,string][]];
const VIETLISH:Row[]=[
 ['1kg salmon, 2kg tuna',[['salmon',1,'kg'],['tuna',2,'kg']]],
 ['1kg salmon 2kg tuna',[['salmon',1,'kg'],['tuna',2,'kg']]],
 ['một ký sa mơn với hai ký tu na',[['salmon',1,'kg'],['tuna',2,'kg']]],
 ['một ký xa mông',[['salmon',1,'kg']]],
 ['1 kg sơ mơn',[['salmon',1,'kg']]],
 ['1 kí sơ-mơn',[['salmon',1,'kg']]],
 ['2 kg tuy na',[['tuna',2,'kg']]],
 ['mua 2 pack chicken wing',[['chicken',2,'gói']]],
 ['mua 2 pack chicken wings',[['chicken',2,'gói']]],
 ['3 hộp eggs',[['egg',3,'hộp']]],
 ['two kí thịt ba chỉ',[['pork',2,'kg']]],
 ['1 bunch bok choy và 1 bó rau muống',[['bokchoy',1,'bó'],['waterSpinach',1,'bó']]],
 ['hai kg beef',[['beef',2,'kg']]],
 ['1 ki lô bíp',[['beef',1,'kg']]],
 ['2 kí pót bé li',[['pork',2,'kg']]],
 ['1 kg chích ken uynh',[['chicken',1,'kg']]],
 ['500 gram prawns',[['shrimp',500,'g']]],
 ['1 ký s-rim',[['shrimp',1,'kg']]],
 ['2 cây bờ rốc cô li',[['broccoli',2,'cây']]],
 ['1 kg bông cải xanh',[['broccoli',1,'kg']]],
 ['2 quả a vô ca đô',[['avocado',2,'quả']]],
 ['3 avocado',[['avocado',3,'quả']]],
 ['1 bó bốc choi',[['bokchoy',1,'bó']]],
 ['hai bó bok choy',[['bokchoy',2,'bó']]],
 ['1 chai cream',[['cream',1,'chai']]],
 ['1 hộp kem tươi',[['cream',1,'hộp']]],
 ['1 cục ba tơ',[['butter',1,'cục']]],
 ['1 pack butter',[['butter',1,'gói']]],
 ['2 miếng sờ tếch',[['beef',2,'miếng']]],
 ['1 ký beef steak',[['beef',1,'kg']]],
 ['500 gam phi lê cá hồi',[['salmon',500,'g']]],
 ['2 box tomatoes',[['tomato',2,'hộp']]],
 ['3 bottle fish sauce',[['fishSauce',3,'chai']]],
 ['một can tuna',[['tuna',1,'lon']]],
 ['two kg pork belly',[['pork',2,'kg']]],
 ['một kí salmon fillet',[['salmon',1,'kg']]],
 ['2 ki lô shrimp',[['shrimp',2,'kg']]],
 ['1kg chicken thigh, 1kg beef mince',[['chicken',1,'kg'],['beef',1,'kg']]],
 ['mua một ký tôm với 2 pack chicken wings',[['shrimp',1,'kg'],['chicken',2,'gói']]],
 ['2 ký sa mơn 3 bó rau muống 1 bó bok choy',[['salmon',2,'kg'],['waterSpinach',3,'bó'],['bokchoy',1,'bó']]],
 ['một ký thịt bò hai ký cá hồi ba bó rau muống',[['beef',1,'kg'],['salmon',2,'kg'],['waterSpinach',3,'bó']]],
 ['năm quả trứng hai củ hành tây ba quả cà chua',[['egg',5,'quả'],['onion',2,'củ'],['tomato',3,'quả']]],
 ['a dozen eggs and a kilo of beef',[['egg',12,'quả'],['beef',1,'kg']]],
 ['half a kilo of pork belly',[['pork',.5,'kg']]],
 ['1 kg ca hoi, 2 bó rau muong',[['salmon',1,'kg'],['waterSpinach',2,'bó']]],
];
function expectRows(text:string,want:[string,number|null,string][]){const p=parse(text);const got=(p.items||[]).map((i:any)=>[i.ingredient||'',i.qty,i.unit]);try{assert.deepEqual(got,want)}catch(e:any){e.message=`"${text}"\n got ${JSON.stringify(got)}\nwant ${JSON.stringify(want)}`;throw e}return p}
t(`Vietlish table (${VIETLISH.length} utterances, vi-VN and en-AU recogniser spellings)`,()=>{assert.ok(VIETLISH.length>=40);for(const[u,w]of VIETLISH)expectRows(u,w)});
t('results display in the UI language (EN "1 kg salmon", VI "1 kg cá hồi")',()=>{const p=parse('một ký sa mơn với hai ký tu na');c.__p=p;
 assert.deepEqual(J(run(`__p.items.map(i=>[voiceItemView(i,'en').name,voiceItemView(i,'en').unit])`)),[['Salmon','kg'],['Tuna','kg']]);
 assert.deepEqual(J(run(`__p.items.map(i=>voiceItemView(i,'vi').name)`)),['Cá hồi','Cá ngừ'])});
// ---- The owner's 10-item list (EN mode, production screenshot) in several plausible recogniser outputs ----
const OWNER:[string,number,string][]=[['chicken',5,'miếng'],['tomato',8,'quả'],['potato',6,'củ'],['carrot',4,'củ'],['beef',3,'miếng'],['onion',5,'củ'],['egg',12,'quả'],['salmon',2,'miếng'],['broccoli',3,'cái'],['garlic',10,'củ']];
const OWNER_SAID=['5 chicken breast, 8 tomatoes, 6 potatoes, 4 carrots, 3 beef, 5 onions, 12 eggs, 2 salmon, 3 broccoli, 10 garlic',
 '5 chicken breast 8 tomatoes 6 potatoes 4 carrots 3 beef 5 onions 12 eggs 2 salmon 3 broccoli 10 garlic',
 'five chicken breasts eight tomatoes six potatoes four carrots three beef five onions twelve eggs two salmons three broccolis ten garlics',
 '5 chicken breast ate tomatoes 6 potatos for carrots tree beef 5 onions 12 eggs too salmon 3 broccoli 10 garlic',
 '5 chicken breasts and 8 tomatoes and 6 potatoes and 4 carrots and 3 beef and 5 onions and 12 eggs and 2 salmon and 3 broccoli and 10 garlic'];
t('owner list: 10 correct items in every recogniser output',()=>{for(const u of OWNER_SAID)expectRows(u,OWNER)});
t('owner list as heard on production ("a tomatoes", "to sermons", "galaxies"): split, homophones, Did you mean',()=>{
 const p=parse('5 chicken breast a tomatoes 6 potatoes 4 carrots 3 beef five onions 12 eggs to sermons 3 broccolis 10 galaxies');
 assert.equal(p.items.length,10,'ten lines, not three');
 const got=p.items.map((i:any)=>[i.ingredient||i.suggest?.id,i.qty,i.unit]);assert.deepEqual(got,OWNER);
 const sermons=p.items[7],galaxies=p.items[9];assert.equal(sermons.ingredient,'','medium confidence is not mapped silently');assert.equal(sermons.suggest.id,'salmon');assert.equal(galaxies.suggest.id,'garlic');assert.ok(sermons.needsReview&&galaxies.needsReview);
 c.__g=galaxies;assert.equal(run(`VoiceAPI.suggestText(__g.suggest,'en')`),'Did you mean: garlic (tỏi)?');assert.equal(run(`VoiceAPI.suggestText(__g.suggest,'vi')`),'Có phải: tỏi (garlic)?');
 c.__p=p;assert.deepEqual(J(run(`__p.items.slice(0,3).map(i=>voiceItemView(i,'en').name)`)),['Chicken breast','Tomatoes','Potatoes'],'EN labels');assert.deepEqual(J(run(`__p.items.slice(0,3).map(i=>voiceItemView(i,'vi').name)`)),['Ức gà','Cà chua','Khoai tây'],'VI labels')});
t('list-style utterances in VI and Vietlish',()=>{for(const[u,w]of [
  ['2 ký thịt heo 1 bó rau muống 3 quả cà chua',[['pork',2,'kg'],['waterSpinach',1,'bó'],['tomato',3,'quả']]],
  ['mua 1 ký cá hồi 2 ký tôm 1 bó hành lá',[['salmon',1,'kg'],['shrimp',2,'kg'],['scallion',1,'bó']]],
  ['10 quả trứng 2 củ gừng 1 kg gạo',[['egg',10,'quả'],['ginger',2,'củ'],['rice',1,'kg']]],
  ['3 hộp tofu 2 bó rau cải 1 chai nước mắm',[['tofu',3,'hộp'],['spinach',2,'bó'],['fishSauce',1,'chai']]],
  ['1 kg salmon 2 kg prawns 3 bunch bok choy',[['salmon',1,'kg'],['shrimp',2,'kg'],['bokchoy',3,'bó']]],
  ['6 eggs 2 onions 1 kg beef mince',[['egg',6,'quả'],['onion',2,'củ'],['beef',1,'kg']]],
  ['hai ký sa mơn một hộp kem tươi ba quả bơ',[['salmon',2,'kg'],['cream',1,'hộp'],['',3,'quả']]],
  ['4 carrots 3 potatoes 2 tomatoes',[['carrot',4,'củ'],['potato',3,'củ'],['tomato',2,'quả']]],
  ['1 ký thịt ba chỉ, 2 bó rau răm',[['pork',1,'kg'],['herbs',2,'bó']]],
  ['thứ hai mua 2 ký cá',[['fish',2,'kg']]],
  ['5 lemons 2 limes 1 kg rice',[['lemon',5,'quả'],['lime',2,'quả'],['rice',1,'kg']]],
 ] as Row[])expectRows(u,w)});
t('no false splits: dates, headcounts, prices, "thịt ba chỉ"',()=>{
 expectRows('2 ký thịt ba chỉ',[['pork',2,'kg']]);
 for(const u of['tối thứ ba nấu canh chua cho 4 người','mua 2 ký thịt ba chỉ','thứ hai mua 2 ký cá','giá 3 đô 50'])assert.equal(run(`VoiceAPI.listRewrite(${JSON.stringify(u)})`),u,'unchanged: '+u);
 assert.doesNotMatch(run(`VoiceAPI.listRewrite('add to the list two eggs and three onions',{homophones:true})`),/two the/,'"to the list" is not a number');
 const al=parse('add to the list two eggs and three onions').items.filter((i:any)=>i.ingredient).map((i:any)=>[i.ingredient,i.qty]);assert.deepEqual(al,[['egg',2],['onion',3]]);
 assert.equal(parse('1 kg tomatoes for 4 people').items.length,1)});
t('bare counts: meat/fish are pieces, never "whole" or an invented weight; a said unit wins',()=>{
 for(const[u,unit]of[['5 chicken breast','miếng'],['3 beef','miếng'],['2 salmon','miếng'],['1 con gà','con'],['2 kg beef','kg']])assert.equal(parse(u).items[0].unit,unit,u)});
t('ambiguous Vietlish asks instead of guessing (kem, min, chi), phonetic + fuzzy near misses',()=>{
 for(const[u,id]of[['1 hộp kem','cream'],['1 ký min','pork'],['500 gam mince','pork'],['1 kg salmun','salmon'],['2 kg brocoli','broccoli'],['1 kg sa mờn','salmon'],['2 garlics','garlic']]){const it=parse(u).items[0];if(it.ingredient===id)continue;assert.equal(it.ingredient,'',u+': not mapped silently');assert.equal(it.suggest?.id,id,u)}
 const ch=parse('1 gói chi').items[0];assert.equal(ch.suggest.vi,'Phô mai');assert.equal(ch.suggest.id,'','cheese is not in the catalog: name only, no id');
 const cheese=parse('1 hộp cheese').items[0];assert.deepEqual(cheese.names,{vi:'Phô mai',en:'Cheese'});assert.equal(cheese.ingredient,'');
 assert.equal(parse('3 widgets').items[0].suggest,undefined,'unknown words stay as said')});
t('confirmed suggestion feeds the family learned corrections',()=>{run(`globalThis.L=structuredClone(S)`);const before=J(run(`parseVoiceInput('2 kg xa mơnn',L)`)).items[0];assert.equal(before.suggest?.id,'salmon');
 run(`VoiceAPI.learn(L,'i','xa mơnn','salmon',{by:'m1'})`);const after=J(run(`parseVoiceInput('2 kg xa mơnn',L)`)).items[0];assert.equal(after.ingredient,'salmon');assert.equal(after.learned,true);assert.equal(after.suggest,undefined)});
t('recogniser alternatives: the alternative that parses best wins',()=>{c.__r=[{transcript:'12 eggs to sermons',confidence:.9},{transcript:'12 eggs 2 salmon',confidence:.7}];assert.equal(run('pickBestVoiceAlt(__r)'),'12 eggs 2 salmon')});
t('Auto: vi-VN unless app and device are English-only; manual override wins; no prompt needed',()=>{
 assert.equal(run(`voiceDefaultRecLang('vi',{auto:true},['en-AU'])`),'vi-VN');assert.equal(run(`voiceDefaultRecLang('en',{auto:true},['en-AU','vi-VN'])`),'vi-VN');
 assert.equal(run(`voiceDefaultRecLang('en',{auto:true},['en-AU'])`),'en-AU');assert.equal(run(`voiceDefaultRecLang('vi',{auto:false,lang:'en-AU'},['vi-VN'])`),'en-AU')});
t('parsing never changes state; lexicon ids all exist',()=>{const b=JSON.stringify(run('S'));parse('1kg salmon 2kg tuna');assert.equal(JSON.stringify(run('S')),b);assert.ok(run(`VoiceAPI.VIETLISH.every(e=>!e[0]||Object.hasOwn(INGREDIENTS,e[0]))`))});
if(!process.exitCode)console.log(`PASS voice-vietlish: ${count} checks — ${VIETLISH.length} Vietlish utterances, owner list ×${OWNER_SAID.length+1} recogniser outputs, VI/Vietlish lists, homophones, Did-you-mean, units, learned feed, Auto language`);
