// Voice v1.6: command intents (VI/EN), precedence, multi-intent utterances, member fuzzy match and ambiguity,
// regional synonyms, per-family learned corrections (applied first, synced shape, cap, old-client tolerance),
// confirmation words and the in-sheet answers (menu, still-to-buy, cheapest from Price Scout data).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {MAIN_INGREDIENTS,MAIN_VALID_IMPORT}=require('./fixtures/main-0bcef70-client.cjs');
const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});
for(const f of ['seed.js','recipe-catalog.js','core.js','spending-core.js','unit-registry.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js','voice-learning.js','shopping-optimizer.js','voice-commands.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
const run=(src:string)=>vm.runInContext(src,c);
run(`globalThis.S=defaults();S.preferences.familyPlanner=true;S.weeks={};S.pantry=[];
S.members=[{id:'m1',name:'Phú',emoji:'👨',weight:1},{id:'m2',name:'Mẹ',emoji:'👩',weight:1},{id:'m3',name:'Bé Na',emoji:'👧',weight:.5},{id:'m4',name:'Mai',emoji:'👩',weight:1}];
S.recipes.push({...recipe('own-soup','Canh chua cá','soup','fish',20,{fish:400},'prep',['cook']),custom:true,purposes:['side'],yield:4});
S.recipes.push({...recipe('own-gourd','Canh bí đao tôm','soup','shrimp',20,{gourd:300,shrimp:100},'prep',['cook']),custom:true,purposes:['side'],yield:4});
S.recipes.push({...recipe('own-grandma','Thịt kho bà nội','main','pork',40,{pork:500},'prep',['cook']),custom:true,purposes:['main'],yield:4});`);
const BASE='2026-11-02',TODAY='2026-11-02';// a Monday
const J=(x:any)=>JSON.parse(JSON.stringify(x));
function cmds(text:string){c.__t=text;return J(run(`parseVoiceCommands(__t,S,{baseDate:'${BASE}',today:'${TODAY}'})`))}
function one(text:string,type:string){const r=cmds(text);try{assert.equal(r.cards.length,1,'one card');assert.equal(r.cards[0].type,type)}catch(e:any){e.message=text+'\n'+e.message+'\nGot: '+JSON.stringify(r);throw e}return r.cards[0]}
function parse(text:string){c.__t=text;return J(run(`parseVoiceInput(__t,S,'${BASE}','${TODAY}')`))}
let count=0;const t=(name:string,fn:()=>void)=>{try{fn()}catch(e:any){console.error('FAIL '+name+': '+e.message);process.exitCode=1;return}count++};
const before=JSON.stringify(run('S'));

// ---- Intents ----
t('mark bought VI/EN',()=>{for(const s of['đánh dấu đã mua trứng','đã mua trứng rồi','trứng mua rồi','mark eggs bought','mark eggs as bought','tick off the eggs','I bought eggs']){const k=one(s,'bought');assert.equal(k.items[0].ingredient,'egg',s)}
 const k=one('đánh dấu đã mua trứng và hành lá','bought');assert.deepEqual(k.items.map((i:any)=>i.ingredient),['egg','scallion'])});
t('remove VI/EN (destructive)',()=>{for(const s of['xoá hành lá','bỏ hành lá ra khỏi danh sách','không cần mua hành lá nữa','remove spring onions from the list','take spring onions off the list',"we don't need spring onions anymore"]){const k=one(s,'remove');assert.equal(k.items[0].ingredient,'scallion',s);assert.equal(k.destructive,true)}
 assert.equal(cmds('bò hai ký').cards.length,0,'“bò” (beef) is not “bỏ” (remove)')});
t('change planned meal VI/EN with date and meal',()=>{let k=one('tối thứ Ba đổi thành phở bò','meal');assert.equal(k.date,'2026-11-03');assert.equal(k.mealType,'dinner');assert.equal(k.dish,'phở bò');assert.ok(k.candidates.length);
 k=one('change Tuesday dinner to beef pho','meal');assert.equal(k.date,'2026-11-03');assert.equal(k.mealType,'dinner');assert.ok(k.candidates.length);
 k=one('trưa mai nấu canh chua cá thay','meal');assert.equal(k.date,'2026-11-03');assert.equal(k.mealType,'lunch');assert.equal(k.candidates[0],'own-soup');
 k=one('tối chủ nhật đổi sang món gì lạ chưa có','meal');assert.equal(k.date,'2026-11-08');assert.equal(k.needsRecipe,true,'unknown dish asks to pick or quick-create');
 assert.equal(cmds('đổi thành phở bò').cards.length,0,'no time → not a meal change');
 assert.equal(cmds('tối nay nấu canh chua cá').cards.length,0,'adding a dish stays the v1.5 flow')});
t('attendance VI/EN, fuzzy names, all day',()=>{let k=one('tối nay anh Phú không ăn','attendance');assert.deepEqual([k.memberId,k.date,k.mealTypes,k.status],['m1',TODAY,['dinner'],'away']);
 k=one("Phu won't be home for dinner tonight",'attendance');assert.equal(k.memberId,'m1');
 k=one('mai bé Na đi vắng','attendance');assert.deepEqual([k.memberId,k.date,k.mealTypes],['m3','2026-11-03',['breakfast','lunch','dinner']]);
 k=one('trưa nay mẹ ăn ngoài','attendance');assert.deepEqual([k.memberId,k.mealTypes],['m2',['lunch']]);
 k=one('tối nay anh Phúc không ăn','attendance');assert.equal(k.memberId,'m1','one-letter slip still finds Phú');
 k=one('tối nay chị Mai không ăn','attendance');assert.equal(k.memberId,'m4');assert.equal(k.date,TODAY,'“Mai” is a name here, not “tomorrow”');
 k=one('tối nay Phú có ăn','attendance');assert.equal(k.status,null,'“có ăn” clears the away note');
 k=one('tối nay không ăn','attendance');assert.equal(k.memberId,null);assert.equal(k.ambiguous,true,'no name → ask who');
 assert.equal(cmds('Na không ăn hành').cards.length,0,'a food preference is not attendance')});
t('member ambiguity asks',()=>{run(`globalThis.S2={...S,members:[{id:'a',name:'Phú',emoji:'',weight:1},{id:'b',name:'Phụ',emoji:'',weight:1},{id:'c',name:'Tuấn Anh',emoji:'',weight:1},{id:'d',name:'Tuấn',emoji:'',weight:1}]}`);
 const m=(p:string)=>J(run(`voiceMatchMember(S2,${JSON.stringify(p)})`));
 assert.equal(m('Phú').member.id,'a','accent decides');assert.equal(m('Phụ').member.id,'b');
 const amb=m('phu');assert.equal(amb.member,null);assert.deepEqual(amb.candidates.map((x:any)=>x.id).sort(),['a','b']);
 assert.equal(m('anh Tuấn').member.id,'d');assert.equal(m('Tuấn Anh').member.id,'c');assert.equal(m('xyz').member,null);assert.deepEqual(m('xyz').candidates,[]);
 c.__t='tối nay phu không ăn';const k=J(run(`parseVoiceCommands(__t,S2,{baseDate:'${BASE}',today:'${TODAY}'})`)).cards[0];assert.equal(k.ambiguous,true);assert.deepEqual(k.candidates.sort(),['a','b'])});
t('pantry counts, never invented',()=>{let k=one('tủ còn hai hộp trứng','pantry');assert.deepEqual([k.ingredient,k.qty,k.unit],['egg',2,'hộp']);
 k=one('we have 6 eggs left','pantry');assert.deepEqual([k.ingredient,k.qty],['egg',6]);
 k=one('tủ lạnh còn rau muống','pantry');assert.equal(k.qty,null,'no amount said → empty, must be filled');assert.equal(k.ingredient,'waterSpinach');
 k=one('hết trứng rồi','pantry');assert.deepEqual([k.qty,k.zero],[0,true]);k=one("we're out of eggs",'pantry');assert.equal(k.qty,0)});
t('urgent message prefilled, confirmation required',()=>{let k=one('nhắn cả nhà mua thêm đá','urgent');assert.equal(k.message,'Mua thêm đá');
 k=one('tell everyone to buy more ice','urgent');assert.equal(k.message,'Buy more ice');
 k=one('nhắn cả nhà là về sớm, nhớ mang ô','urgent');assert.equal(k.message,'Về sớm, nhớ mang ô','the rest of the sentence stays in the message')});
t('questions',()=>{let k=one('hôm nay nấu gì','answer');assert.deepEqual([k.q,k.date,k.mealType],['today',TODAY,null]);
 k=one("what's for dinner",'answer');assert.deepEqual([k.q,k.mealType],['today','dinner']);k=one('tối mai ăn gì vậy','answer');assert.deepEqual([k.date,k.mealType],['2026-11-03','dinner']);
 for(const s of['còn thiếu gì','còn phải mua gì','what do I still need',"what's left to buy"])assert.equal(one(s,'answer').q,'missing',s);
 for(const s of['rau muống ở đâu rẻ nhất','ở đâu bán rau muống rẻ nhất','where is water spinach cheapest','cheapest water spinach']){const a=one(s,'answer');assert.equal(a.q,'cheapest',s);assert.equal(a.ingredient,'waterSpinach',s)}});
t('precedence and several intents in one utterance',()=>{const r=cmds('mua hai ký thịt ba chỉ, tối nay chị Mai không ăn, tủ còn hai hộp trứng, còn thiếu gì? Đánh dấu đã mua hành lá và nhắn cả nhà mua thêm đá');
 assert.deepEqual(r.cards.map((k:any)=>k.type),['attendance','pantry','answer','bought','urgent']);assert.equal(r.rest.kind,'shopping');assert.deepEqual(r.rest.items.map((i:any)=>[i.label,i.qty,i.unit,i.ingredient]),[['thịt ba chỉ',2,'kg','pork']]);
 assert.equal(one('còn thiếu gì','answer').q,'missing','question beats pantry “còn”');
 const plain=cmds('mai mua hai ký thịt ba chỉ với lại một bó rau muống, còn tối nay nấu canh chua cá');assert.equal(plain.cards.length,0);assert.equal(plain.restText,'mai mua hai ký thịt ba chỉ với lại một bó rau muống, còn tối nay nấu canh chua cá','no command → original text to the v1.5 parser');assert.deepEqual(plain.rest.items.map((i:any)=>i.ingredient),['pork','waterSpinach'])});
t('time words',()=>{const T=(s:string)=>J(run(`voiceCmdTime(${JSON.stringify(s)},'${BASE}','${TODAY}')`));assert.deepEqual([T('tối nay').date,T('tối nay').type],[TODAY,'dinner']);assert.equal(T('thứ hai').date,'2026-11-02');assert.equal(T('chủ nhật').date,'2026-11-08');assert.equal(T('sáng mai').type,'breakfast');assert.equal(T('đổi sang phở').hasType,false,'“sang” (to) is not “sáng” (morning)');assert.equal(T('tôi mua').hasType,false,'“tôi” (I) is not “tối”');assert.equal(T('toi nay').type,'dinner','typed without accents');assert.equal(T('next friday lunch').date,'2026-11-06')});
// ---- Regional synonyms ----
t('regional synonyms map to the same ingredient',()=>{const id=(s:string)=>parse('mua '+s).items[0].ingredient;
 for(const[a,b]of[['một ký thịt lợn','một ký thịt heo'],['hai bắp ngô','hai trái bắp'],['hai quả dứa','hai trái thơm'],['một gói lạc','một gói đậu phộng'],['hai gói mì','hai gói mỳ'],['một bó rau mùi','một bó ngò'],['một bó hành lá','một bó hành hoa'],['hai quả mướp','hai quả mướp hương'],['một quả bí đao','một quả bí xanh'],['hai con cá lóc','hai con cá quả'],['một bìa đậu phụ','một bìa đậu hũ'],['hai quả dưa chuột','hai quả dưa leo']]){assert.ok(id(a),a);assert.equal(id(a),id(b),a+' ≡ '+b)}
 assert.equal(parse('mua hai quả trứng').items[0].unit,parse('mua hai trái trứng').items[0].unit,'quả ≡ trái (unit)');
 const ca=parse('mua một ký khoai mì').items[0],sa=parse('mua một ký sắn').items[0];assert.notEqual(ca.ingredient,'potato','khoai mì is cassava, not potato');assert.equal(sa.ingredient,ca.ingredient);assert.equal(sa.lexKey,ca.lexKey,'sắn ≡ khoai mì');
 assert.equal(run("voiceRegionalCanon('lá dứa')"),'lá dứa','pandan leaf is protected');assert.equal(run("voiceRegionalCanon('bí ngô')"),'bí ngô','pumpkin is protected');assert.equal(run("voiceRegionalCanon('thịt lợn và ngô')"),'thịt heo và bắp');
 const d=parse('tối nay nấu canh bí xanh tôm');assert.equal(d.kind,'meal');assert.equal(d.candidates[0],'own-gourd','regional dish name finds the family recipe');
 const shown=parse('mua hai con cá quả').items[0];const view=J(run(`voiceItemView(${JSON.stringify(shown)},'vi')`));assert.deepEqual([view.name,view.heard],['Cá lóc','cá quả'],'canonical name with the word as heard (v1.5 lexicon behaviour)')});
// ---- Learned corrections ----
t('learned ingredient correction applied before generic matching, folded across regions',()=>{const s0=parse('mua hai con cá quả').items[0];assert.equal(s0.ingredient,'fish');
 assert.ok(run(`voiceLearn(S,'i','cá quả','salmon',{by:'m1',at:'2026-11-01'})`));const s1=parse('mua hai con cá quả').items[0];assert.equal(s1.ingredient,'salmon');assert.equal(s1.learned,true);
 const s2=parse('mua hai con cá lóc').items[0];assert.equal(s2.ingredient,'salmon','cá lóc ≡ cá quả, the family word wins');
 run(`voiceLearn(S,'i','thịt lợn','ribs')`);assert.equal(parse('mua một ký thịt heo').items[0].ingredient,'ribs');
 assert.equal(run(`voiceLearn(S,'i','x','notAnIngredient')`),null,'unknown ids are not learned');
 assert.ok(run("voiceForget(S,'i','thịt lợn')"));assert.equal(parse('mua một ký thịt heo').items[0].ingredient,'pork')});
t('learned dish correction',()=>{const d0=parse('tối nay nấu thịt rim mặn ngọt');assert.equal(d0.dish,'thịt rim mặn ngọt');assert.notEqual(d0.candidates[0],'own-grandma');run(`voiceLearn(S,'r','thịt rim mặn ngọt','own-grandma')`);const d=parse('tối nay nấu thịt rim mặn ngọt');assert.equal(d.candidates[0],'own-grandma');
 const k=one('tối thứ Tư đổi thành thịt rim mặn ngọt','meal');assert.equal(k.candidates[0],'own-grandma','meal-change uses the learned dish too')});
t('learned list: synced shape, cap, validation, old-client tolerance',()=>{const list=J(run('S.voiceLearned'));assert.ok(Array.isArray(list));for(const e of list){assert.deepEqual(Object.keys(e).filter(k=>!['p','k','id','at','by','w'].includes(k)),[]);assert.ok(['i','r'].includes(e.k));assert.equal(typeof e.p,'string');assert.ok(e.p.length<=80)}
 assert.equal(list[0].p,'thit rim man ngot','newest first, normalised key');assert.equal(list.find((e:any)=>e.id==='salmon').p,'ca loc','regional variants fold to one key');
 run(`globalThis.S3=JSON.parse(JSON.stringify(S));for(let i=0;i<350;i++)voiceLearn(S3,'i','từ số '+i,'egg')`);assert.equal(run('S3.voiceLearned.length'),300);assert.equal(run('S3.voiceLearned[0].p'),'tu so 349');assert.equal(run('S3.voiceLearned.some(e=>e.id==="salmon")'),false,'oldest dropped at the cap');
 run(`voiceLearn(S3,'i','từ số 5','pork')`);assert.equal(run("S3.voiceLearned.filter(e=>e.p==='tu so 5').length"),1,'one entry per phrase');
 assert.equal(run('validImport(JSON.parse(JSON.stringify(S3)))'),true);
 const old=vm.createContext({INGREDIENTS:structuredClone(MAIN_INGREDIENTS)});vm.runInContext(MAIN_VALID_IMPORT+'\nthis.validImport=validImport;',old);
 const legacy=J(run('defaults()'));legacy.seedVersion=3;delete legacy.appEdition;legacy.recipes=legacy.recipes.filter((r:any)=>!r.catalogEdition||r.catalogEdition<4);assert.equal(old.validImport(J(legacy)),true,'baseline');
 legacy.voiceLearned=J(run('S3.voiceLearned')).slice(0,20).map((e:any)=>({...e,id:'egg'}));assert.equal(old.validImport(J(legacy)),true,'released main client tolerates the new optional field');
 c.__x=J(legacy);assert.equal(run('validImport(__x)'),true);
 for(const bad of[{},[{p:'',k:'i',id:'egg'}],[{p:'a',k:'i',id:''}],[{p:'a'.repeat(81),k:'i',id:'egg'}],'x',[null]]){c.__x={...J(legacy),voiceLearned:bad};assert.equal(run('validImport(__x)'),false,JSON.stringify(bad).slice(0,40))}
 c.__x={...J(legacy),voiceLearned:[{p:'abc',k:'future',id:'thing'}]};assert.equal(run('validImport(__x)'),true,'a newer kind is kept, not rejected');assert.equal(J(run('voiceLearnedList(__x)')).length,0,'…and ignored');
 c.__x={...J(legacy)};delete c.__x.voiceLearned;assert.equal(run('validImport(__x)'),true,'missing list is fine')});
// ---- Confirmation words ----
t('spoken confirmation words',()=>{const w=(s:string)=>run(`voiceConfirmWord(${JSON.stringify(s)})`);for(const s of['đồng ý','ok','Được rồi','xác nhận','yes','yeah confirm','go ahead','có'])assert.equal(w(s),'yes',s);for(const s of['sửa','không','không đồng ý','no','edit','wait','huỷ'])assert.equal(w(s),'no',s);for(const s of['','phở bò','cô'])assert.equal(w(s),null,s)});
// ---- Answers ----
t('what is cooking',()=>{run(`{const w=ensureWeek(S,'2026-11-02');w.days['2026-11-02'].dinner.recipes=[clone(S.recipes.find(r=>r.id==='own-soup'))];w.days['2026-11-02'].breakfast.recipes=[]}`);
 const a=J(run(`voiceAnswerMeals(S,'2026-11-02','dinner','${TODAY}','vi')`));assert.equal(a.text,'Tối nay: Canh chua cá.');
 assert.equal(J(run(`voiceAnswerMeals(S,'2026-11-02','dinner','${TODAY}','en')`)).text,'Tonight: Canh chua cá.','family recipe names stay as written');
 assert.match(J(run(`voiceAnswerMeals(S,'2026-11-03','dinner','${TODAY}','en')`)).text,/^Nothing is planned for dinner tomorrow/);
 assert.match(J(run(`voiceAnswerMeals(S,'2026-11-02',null,'${TODAY}','vi')`)).text,/Tối nay: Canh chua cá\./)});
t('still to buy',()=>{assert.equal(J(run(`voiceAnswerMissing([],'vi')`)).text,'Danh sách mua đã xong — không còn thiếu gì.');const a=J(run(`voiceAnswerMissing([{name:'Trứng',amount:'10 quả'},{name:'Rau muống',amount:''}],'en')`));assert.equal(a.text,'Still to buy (2): Trứng 10 quả, Rau muống.');assert.match(J(run(`voiceAnswerMissing(Array.from({length:10},(_, i)=>({name:'x'+i,amount:''})),'vi')`)).text,/và 2 món khác/)});
t('where is X cheapest (Price Scout data, else no price yet)',()=>{run(`globalThis.CAT=[{id:'rau-muong',nameVi:'Rau muống',nameEn:'Water spinach',aliases:['kangkong'],unitBasis:'per_kg',ingredientId:'waterSpinach'}];
 const o=(id,retailer,price,packQty,observedAt,validUntil)=>({id,itemId:'rau-muong',label:'Rau muống',retailer,price,currency:'AUD',packQty,packUnit:'g',units:null,unitPrice:null,unitBasis:null,observedAt,source:'manual',...(validUntil?{validUntil}:{})});
 globalThis.OBS=[o('obs-0001','coles',3.5,250,'2026-10-30'),o('obs-0002','viet-grocer',4,500,'2026-10-28'),o('obs-0003','woolworths',2,100,'2026-10-31'),o('obs-0004','aldi',1,500,'2026-08-01')]`);
 const q=(lang:string,obs='OBS')=>J(run(`voiceCheapest({ingredient:'waterSpinach',label:'rau muống'},{catalog:CAT,observations:${obs},PS:PriceScout,today:'${TODAY}',lang:'${lang}'})`));
 const vi=q('vi');assert.equal(vi.best.retailer,'viet-grocer','$8/kg beats $14/kg and $20/kg; the stale ALDI price is ignored');assert.match(vi.text,/^Rau muống rẻ nhất: Chợ Việt \$8\.00\/kg, giá ghi ngày 28\/10\. Tiếp theo: /);
 assert.match(q('en').text,/^Cheapest Water spinach: Vietnamese grocer \$8\.00\/kg/);
 assert.equal(q('vi','[]').text,'Chưa có giá cho Rau muống. Lưu giá trong So giá để so sánh.');
 assert.match(J(run(`voiceCheapest({ingredient:'',label:'quả sầu riêng'},{catalog:CAT,observations:OBS,PS:PriceScout,today:'${TODAY}',lang:'en'})`)).text,/^No price yet for quả sầu riêng/)});
t('recogniser registry validates plug-ins',()=>{assert.throws(()=>run('registerVoiceRecognizer({id:"x"})'));assert.throws(()=>run('registerVoiceRecognizer({id:"browser",label:"b",start(){},stop(){}})'));const off=run('registerVoiceRecognizer({id:"ondevice",label:"On device",start(){},stop(){},offline:true})');assert.deepEqual(J(run('voiceRecognizerList()')).map((r:any)=>r.id),['browser','ondevice']);off();assert.deepEqual(J(run('voiceRecognizerList()')).map((r:any)=>r.id),['browser']);
 for(const k of['parseVoiceInput','parseCommands','learn','forget','lookupLearned','regionalCanon','matchMember','confirmWord','cheapest','registerVoiceRecognizer'])assert.equal(typeof run('VoiceAPI.'+k),'function','VoiceAPI.'+k)});
t('parsing commands never mutates state',()=>{c.__s=JSON.stringify(run('S'));run(`for(const s of ['tối nay anh Phú không ăn','tủ còn hai hộp trứng','xoá hành lá','tối thứ Ba đổi thành phở bò','nhắn cả nhà mua thêm đá','còn thiếu gì'])parseVoiceCommands(s,S,{baseDate:'${BASE}',today:'${TODAY}'})`);assert.equal(JSON.stringify(run('S')),c.__s)});
assert.notEqual(before,'');if(process.exitCode)throw Error('voice-commands: failures above');
console.log(`PASS voice-commands: ${count} checks — VI/EN commands & questions, precedence, multi-intent, member fuzzy/ambiguous, pantry/urgent never invented, regional synonyms, learned corrections (cap 300, old client tolerant), confirm words, cheapest`);
