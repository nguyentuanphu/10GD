// Recipe dictation (v1.6): a long spoken recipe → title, servings, time, ingredients and numbered steps.
// Five realistic Vietnamese recipes (one with no punctuation at all, as speech recognisers produce) and two
// English ones. Unclear amounts ("một ít", "vừa ăn", "to taste", none said) stay blank and are flagged;
// nothing is guessed. Also checks the recipe-form lines and that saving never overwrites a recipe.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,Intl,Date,Math,URL,JSON,structuredClone});
for(const f of ['store-registry.js','seed.js','master-catalog.js','shopping-optimizer.js','voice-price.js','voice-recipe.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
const VR=ctx.VoiceRecipe;
const seg=(t:string,lang='vi')=>JSON.parse(JSON.stringify(VR.segmentRecipe(t,{lang})));
const ing=(r:any)=>r.ingredients.map((i:any)=>[i.name,i.qty,i.unit]);
let count=0;
function check(name:string,text:string,lang:string,fn:(r:any)=>void){const r=seg(text,lang);try{fn(r)}catch(e:any){e.message=`${name}\n${e.message}\nGot: ${JSON.stringify({title:r.title,servings:r.servings,time:r.time,ingredients:ing(r),steps:r.steps})}`;throw e}count++;return r}
const blank=(r:any,name:string)=>{const i=r.ingredients.find((x:any)=>x.name===name);assert.ok(i,'has '+name);assert.equal(i.qty,null,name+' quantity stays blank');assert.equal(i.needs,'qty',name+' flagged cần điền')};

check('1 canh chua cá lóc (grandma, punctuated)','Hôm nay bà dạy các con nấu món canh chua cá lóc nhé, cho bốn người ăn, mất khoảng bốn mươi lăm phút. Nguyên liệu gồm có một con cá lóc khoảng một ký, hai trăm gam bạc hà, một trăm gam giá, ba quả cà chua, nửa quả thơm, một ít me chua, rau om ngò gai, hai muỗng canh nước mắm, đường vừa ăn. Cách làm: đầu tiên làm sạch cá rồi cắt khúc, ướp với chút muối và tiêu. Sau đó phi thơm hành tỏi rồi cho cà chua với thơm vào xào. Tiếp theo đổ một lít rưỡi nước vào nấu sôi, cho me vào dầm lấy nước chua. Rồi cho cá vào nấu khoảng mười phút. Cuối cùng nêm nước mắm đường cho vừa, tắt bếp rồi thả rau om ngò gai vào.','vi',r=>{
 assert.equal(r.title,'Canh chua cá lóc');assert.equal(r.servings,4);assert.equal(r.time,45);
 assert.deepEqual(ing(r).slice(0,5),[['Cá lóc',1,'con'],['Bạc hà',200,'g'],['Giá',100,'g'],['Cà chua',3,'quả'],['Thơm',0.5,'quả']]);
 assert.equal(r.ingredients[0].note,'khoảng một ký','the approximate weight is kept as a note, not a second quantity');
 assert.deepEqual(ing(r).find((i:any)=>i[0]==='Nước mắm'),['Nước mắm',2,'muỗng canh']);
 blank(r,'Me chua');blank(r,'Đường');blank(r,'Rau om');blank(r,'Ngò gai');
 assert.equal(r.steps.length,10);assert.equal(r.steps[0],'Làm sạch cá');assert.equal(r.steps[1],'Cắt khúc');assert.equal(r.steps[9],'Thả rau om ngò gai vào');
 assert.ok(r.steps.includes('Cho cá vào nấu khoảng mười phút'));assert.ok(!r.steps.some((s:string)=>/^(Rồi|Sau đó|Tiếp theo|Cuối cùng|Đầu tiên)/i.test(s)),'connectors removed');});
check('2 thịt kho trứng (no servings said)','Món thịt kho trứng. Cần có một ký thịt ba chỉ, mười quả trứng vịt, một trái dừa tươi lấy nước, năm củ hành tím, tỏi, ba muỗng canh nước mắm, hai muỗng đường, tiêu. Đầu tiên luộc trứng rồi bóc vỏ. Thịt rửa sạch cắt miếng vừa ăn, ướp với nước mắm đường hành tỏi khoảng ba mươi phút. Sau đó thắng nước màu, cho thịt vào đảo cho săn lại. Tiếp đến đổ nước dừa vào ngập thịt, nấu lửa nhỏ một tiếng. Cuối cùng cho trứng vào kho thêm hai mươi phút nữa là được.','vi',r=>{
 assert.equal(r.title,'Thịt kho trứng');assert.equal(r.servings,null,'servings not said → blank');assert.equal(r.time,null,'step durations are not the total time');
 assert.deepEqual(ing(r),[['Thịt ba chỉ',1,'kg'],['Trứng vịt',10,'quả'],['Dừa tươi lấy nước',1,'quả'],['Hành tím',5,'củ'],['Tỏi',null,''],['Nước mắm',3,'muỗng canh'],['Đường',2,'muỗng'],['Tiêu',null,'']]);
 blank(r,'Tỏi');blank(r,'Tiêu');
 assert.deepEqual(r.steps.slice(0,2),['Luộc trứng','Bóc vỏ']);assert.equal(r.steps.length,9);assert.equal(r.steps[8],'Cho trứng vào kho thêm hai mươi phút nữa là được');});
check('3 phở bò (servings + total time, many unclear)','Công thức phở bò của mẹ, đủ cho sáu người, tổng cộng mất khoảng ba tiếng. Nguyên liệu: hai ký xương ống bò, nửa ký thịt bò thăn, một ký bánh phở, hai củ hành tây, một củ gừng, ba cây quế, năm hoa hồi, một muỗng cà phê hạt ngò, nước mắm, muối, đường phèn vừa đủ, hành lá ngò gai và giá. Cách nấu: xương rửa sạch rồi chần qua nước sôi cho hết bọt. Sau đó nướng hành tây với gừng cho thơm. Rang quế hồi hạt ngò rồi cho vào túi vải. Tiếp theo cho xương vào nồi với năm lít nước, hầm lửa nhỏ khoảng hai tiếng rưỡi, nhớ hớt bọt. Xong rồi nêm nước mắm muối đường phèn cho vừa. Cuối cùng trụng bánh phở, xếp thịt bò thái mỏng lên, chan nước dùng thật sôi, thêm hành lá ngò gai.','vi',r=>{
 assert.equal(r.title,'Phở bò của mẹ');assert.equal(r.servings,6);assert.equal(r.time,180);
 assert.deepEqual(ing(r).slice(0,3),[['Xương ống bò',2,'kg'],['Thịt bò thăn',0.5,'kg'],['Bánh phở',1,'kg']]);
 const hh=r.ingredients.find((i:any)=>i.name==='Hoa hồi');assert.equal(hh.qty,5);assert.equal(hh.needs,'unit','a count without a unit asks for the unit');
 for(const n of ['Nước mắm','Muối','Đường phèn','Hành lá','Ngò gai','Giá'])blank(r,n);
 assert.equal(r.steps.length,13);assert.equal(r.steps[6],'Hầm lửa nhỏ khoảng hai tiếng rưỡi');});
check('4 gỏi cuốn ("chuẩn bị", no step marker)','Gỏi cuốn tôm thịt, đủ cho sáu người. Chuẩn bị nửa ký tôm, ba lạng thịt ba chỉ, một gói bún, một xấp bánh tráng, rau sống các loại, hẹ. Luộc thịt với tôm cho chín, thịt thái lát mỏng, tôm bóc vỏ chẻ đôi. Xong rồi nhúng bánh tráng qua nước, xếp rau bún tôm thịt lên rồi cuốn chặt tay. Nước chấm thì pha tương đen với đậu phộng rang.','vi',r=>{
 assert.equal(r.title,'Gỏi cuốn tôm thịt');assert.equal(r.servings,6);
 assert.deepEqual(ing(r),[['Tôm',0.5,'kg'],['Thịt ba chỉ',300,'g'],['Bún',1,'gói'],['Bánh tráng',1,'xấp'],['Rau sống các loại',null,''],['Hẹ',null,'']]);
 assert.equal(r.steps[0],'Luộc thịt với tôm cho chín');assert.equal(r.steps.length,7);});
check('5 cá kho tộ (recogniser output, no punctuation)','cá kho tộ cho ba người nguyên liệu có năm lạng cá basa hai muỗng canh nước mắm một muỗng đường một ít nước màu tiêu hành tím cách làm cá rửa sạch để ráo rồi ướp với nước mắm đường hành tím trong mười lăm phút sau đó cho cá vào nồi đất kho lửa nhỏ khoảng ba mươi phút xong rắc tiêu lên','vi',r=>{
 assert.equal(r.title,'Cá kho tộ');assert.equal(r.servings,3);
 assert.deepEqual(ing(r),[['Cá basa',500,'g'],['Nước mắm',2,'muỗng canh'],['Đường',1,'muỗng'],['Nước màu',null,''],['Tiêu',null,''],['Hành tím',null,'']]);
 assert.equal(r.ingredients[3].vague,true,'"một ít" is recorded as vague');
 assert.deepEqual(r.steps,['Cá rửa sạch để ráo','Ướp với nước mắm đường hành tím trong mười lăm phút','Cho cá vào nồi đất kho lửa nhỏ khoảng ba mươi phút','Rắc tiêu lên']);});
check('6 EN congee','Grandma\'s chicken congee, serves four, takes about an hour. You will need one cup of jasmine rice, 500 grams of chicken thighs, a thumb of ginger, two litres of water, fish sauce to taste, and some spring onions. First rinse the rice, then bring the water to the boil with the ginger. Next add the rice and chicken and simmer for forty minutes, stirring often. After that shred the chicken and season with fish sauce. Finally top with spring onions and pepper.','en',r=>{
 assert.equal(r.title,'Grandma\'s chicken congee');assert.equal(r.servings,4);assert.equal(r.time,60);
 assert.deepEqual(ing(r),[['Jasmine rice',1,'cup'],['Chicken thighs',500,'g'],['Thumb of ginger',null,''],['Water',2,'l'],['Fish sauce',null,''],['Spring onions',null,'']]);
 blank(r,'Fish sauce');blank(r,'Spring onions');blank(r,'Thumb of ginger');
 assert.deepEqual(r.steps,['Rinse the rice','Bring the water to the boil with the ginger','Add the rice and chicken and simmer for forty minutes, stirring often','Shred the chicken and season with fish sauce','Top with spring onions and pepper']);});
check('7 EN stir fry','Recipe for beef stir fry for 2 people. Ingredients: 300g beef, 1 onion, 2 cloves garlic, 1 tablespoon oyster sauce, a little soy sauce, half a bunch of bok choy. Slice the beef thinly and marinate with garlic. Heat the wok then fry the onion. Add the beef and stir fry for three minutes, then add the bok choy and oyster sauce and cook for one more minute.','en',r=>{
 assert.equal(r.title,'Beef stir fry');assert.equal(r.servings,2);
 assert.deepEqual(ing(r),[['Beef',300,'g'],['Onion',1,''],['Garlic',2,'clove'],['Oyster sauce',1,'tbsp'],['Soy sauce',null,''],['Bok choy',0.5,'bunch']]);
 assert.equal(r.ingredients[1].needs,'unit');blank(r,'Soy sauce');
 assert.equal(r.steps.length,5);assert.deepEqual(r.steps.slice(1,3),['Heat the wok','Fry the onion']);});
// Several takes (pause/continue) joined by new lines still segment as one recipe.
check('takes joined','Món canh bí đỏ, cho bốn người.\nNguyên liệu có nửa ký bí đỏ, hai lạng thịt bằm\nhành lá, muối vừa ăn. Cách nấu: bí gọt vỏ cắt miếng, rồi nấu sôi nước cho thịt vào, sau đó cho bí vào nấu mềm.','vi',r=>{
 assert.equal(r.title,'Canh bí đỏ');assert.deepEqual(ing(r),[['Bí đỏ',0.5,'kg'],['Thịt bằm',200,'g'],['Hành lá',null,''],['Muối',null,'']]);assert.equal(r.steps.length,3);});
check('“công thức món ăn” title','Công thức món ăn canh bí đỏ, cho bốn người. Nguyên liệu có nửa ký bí đỏ, hai lạng thịt bằm. Cách nấu: bí gọt vỏ cắt miếng, rồi nấu sôi nước cho thịt vào, sau đó cho bí vào nấu mềm.','vi',r=>{
 assert.equal(r.title,'Canh bí đỏ');assert.equal(r.servings,4);});
// Empty / no structure
{const r=seg('');assert.equal(r.title,'');assert.deepEqual(r.ingredients,[]);count++}
{const r=seg('xin chào cả nhà');assert.ok(r.flags.includes('no-steps'));count++}
// ---- Recipe-form lines: supported units use "name | qty | unit"; others keep the said words; blanks stay blank ----
{const L=VR.formLine;
 assert.equal(L({name:'Bạc hà',qty:200,unit:'g',formUnit:'g'}),'Bạc hà | 200 | g');
 assert.equal(L({name:'Thịt ba chỉ',qty:1,unit:'kg',formUnit:'kg'}),'Thịt ba chỉ | 1 | kg');
 assert.equal(L({name:'Nước mắm',qty:2,unit:'muỗng canh',formUnit:null}),'Nước mắm (2 muỗng canh)');
 assert.equal(L({name:'Đường',qty:null,unit:'',formUnit:null}),'Đường');
 assert.equal(L({name:'Cá lóc',qty:null,unit:'',formUnit:null,note:'khoảng một ký'}),'Cá lóc (khoảng một ký)');
 assert.equal(L({name:'A | B',qty:3,unit:'quả',formUnit:'quả'}),'A B | 3 | quả','pipes in names cannot break the format');
 count++}
// ---- Save path guarantees (source checks on the form handler) ----
{const src=fs.readFileSync('src/frontend/family-menu-ui.ts','utf8');
 assert.match(src,/const dictated=form\.dataset\.dictated==='yes'/);
 assert.match(src,/if\(!old&&String\(v\.transcript\|\|''\)\.trim\(\)\)recipe\.transcript=/,'transcript only attached to a new recipe');
 assert.match(src,/data-vr="open"/);assert.match(src,/\$\{!r\?`<div class="vr-entry">/,'dictation entry only on a new recipe form (never edits an existing one)');
 count++}
console.log(`PASS voice recipe dictation (${count} checks)`);
