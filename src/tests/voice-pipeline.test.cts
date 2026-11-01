// v1.7.1 voice pipeline (Henry's iPhone report): what reaches the parser for each recogniser language, how alternatives
// are chosen, the "5x" → "5 eggs?" question, junk rejection ("các bạn"), the one-tap VI ⇄ EN toggle and the
// hold-to-talk default with its one-time migration. The browser recogniser itself (Apple's on iPhone) cannot run here:
// these tests feed the exact strings it returned.
//
// Before v1.7.1 (production v1.7.0), recorded with the same parser:
//   "các bạn"  → one shopping line "các bạn", no amount — added as junk if confirmed
//   "5x" / "5 x" → one shopping line "5 x", no amount, no suggestion
//   "2 miếng salmon", "hai miếng sa mơn", "5 eggs", "five eggs", "năm quả trứng" → already correct
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
function context(store=new Map<string,string>()){
 const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,
  localStorage:{getItem:(k:string)=>store.has(k)?store.get(k)!:null,setItem:(k:string,v:string)=>{store.set(k,String(v))},removeItem:(k:string)=>{store.delete(k)}}});
 c.globalThis=c;
 for(const f of ['seed.js','recipe-catalog.js','core.js','spending-core.js','unit-registry.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js','voice-learning.js','shopping-optimizer.js','voice-price.js','voice-commands.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
 vm.runInContext(`globalThis.S=defaults();S.weeks={};S.pantry=[];globalThis.state=S;`,c);return c}
const c=context();
const run=(src:string)=>vm.runInContext(src,c);
const J=(x:any)=>JSON.parse(JSON.stringify(x));
const parse=(text:string)=>{c.__t=text;return J(run(`parseVoiceInput(__t,S,'2026-11-02','2026-11-02')`))};
const items=(text:string)=>parse(text).items.map((i:any)=>[i.label,i.qty,i.unit,i.ingredient||'',i.suggest?.id||'']);
const nothing=(text:string)=>{c.__t=text;return run(`voiceNothingRecognised(__t,S,{today:'2026-11-02',baseDate:'2026-11-02'})`)};
let count=0;const t=(name:string,fn:()=>void)=>{try{fn();count++}catch(e:any){console.error('FAIL '+name+': '+e.message);process.exitCode=1}};

t('recogniser language per mode (what lang is passed to webkitSpeechRecognition)',()=>{
 const lang=(ui:string,pref:any,dev:string[])=>{c.__a=[ui,pref,dev];return run('voiceDefaultRecLang(__a[0],__a[1],__a[2])')};
 assert.equal(lang('vi',{auto:false,lang:'vi-VN'},['en-AU']),'vi-VN','VI chosen → vi-VN');
 assert.equal(lang('vi',{auto:false,lang:'en-AU'},['vi-VN']),'en-AU','EN chosen → en-AU');
 assert.equal(lang('vi',{auto:true},['en-AU']),'vi-VN','Auto + Vietnamese app → vi-VN');
 assert.equal(lang('en',{auto:true},['en-AU','vi-VN']),'vi-VN','Auto + English app on a device with Vietnamese → vi-VN');
 assert.equal(lang('en',{auto:true},['en-AU']),'en-AU','Auto + English-only → en-AU');
});

t("Henry's phrases through the parser (VI mode = vi-VN output, EN mode = en-AU output; parsing is bilingual either way)",()=>{
 assert.deepEqual(items('2 miếng salmon'),[['salmon',2,'miếng','salmon','']]);
 assert.deepEqual(items('hai miếng sa mơn'),[['sa mơn',2,'miếng','salmon','']]);
 assert.deepEqual(items('2 miếng xa môn'),[['xa môn',2,'miếng','salmon','']],'new Vietlish spelling');
 assert.deepEqual(items('5 eggs'),[['eggs',5,'quả','egg','']]);
 assert.deepEqual(items('five eggs'),[['eggs',5,'quả','egg','']]);
 assert.deepEqual(items('năm quả trứng'),[['trứng',5,'quả','egg','']]);
 // "xa lông" is a real Vietnamese word (sofa): never mapped silently, only suggested.
 assert.deepEqual(items('2 miếng xa lông'),[['xa lông',2,'miếng','','salmon']]);
 // Ordinary words are not swallowed by the new forms.
 assert.deepEqual(items('mua 2 bó rau muống'),[['rau muống',2,'bó','waterSpinach','']]);
});

t('"5x" / "5 x" → asks "5 eggs?" (did-you-mean), never adds eggs silently',()=>{
 for(const s of ['5x','5 x','mua 5x','5 ex']){const it=parse(s).items;assert.equal(it.length,1,s);assert.equal(it[0].qty,5,s);assert.equal(it[0].ingredient||'','',s+': not mapped silently');assert.equal(it[0].suggest?.id,'egg',s+': suggests eggs');assert.equal(it[0].needsReview,true)}
 assert.equal(parse('x').items[0].suggest,undefined,'a bare "x" (no count) is not turned into eggs');
 const ch=parse('5x chicken').items[0];assert.equal(ch.qty,5,'"5x chicken": the x is a multiplier');assert.equal(ch.ingredient,'chicken');
});

t('junk is rejected: nothing recognisable → "Chưa nghe rõ, nói lại?"',()=>{
 for(const s of ['các bạn','cảm ơn các bạn','5x là gì đó'])assert.equal(nothing(s),s==='5x là gì đó'?false:true,s);
 for(const s of ['2 miếng salmon','5x','5 eggs','năm quả trứng','hai miếng sa mơn','2 cuộn giấy vệ sinh','tối nay nấu canh chua'])assert.equal(nothing(s),false,s+' is usable');
 assert.equal(nothing(''),false,'empty is not "misheard"');
});

t('alternative selection prefers the one that matches family vocabulary',()=>{
 const pick=(alts:string[])=>{c.__a=alts.map((transcript,i)=>({transcript,confidence:.6-i*.1}));return run('pickBestVoiceAltInfo(__a).text')};
 assert.equal(pick(['các bạn','2 miếng sa mơn','hai miếng xa mông']),'2 miếng sa mơn');
 assert.equal(pick(['5x','5 eggs']),'5 eggs');
 assert.equal(pick(['five eggs','5x']),'five eggs');
 assert.equal(pick(['2 miếng salmon']),'2 miếng salmon','one alternative (iOS usually returns one) is kept');
});

t('one-tap language toggle: shows the language it listens in and switches to the other one',()=>{
 const html=(lang:string,auto=false)=>{c.__a=[lang,auto];return run("voiceLangToggleHtml('data-voice-lang',__a[0],{auto:__a[1],id:'voice-lang-toggle'})")};
 const vi=html('vi-VN');assert.match(vi,/data-voice-lang="en-AU"/,'tap VI → EN');assert.match(vi,/data-lang-current="vi-VN"/);assert.match(vi,/class="vlt-seg on"[^>]*>VI</);assert.match(vi,/aria-label="[^"]*Tiếng Việt[^"]*English"/);
 const en=html('en-AU');assert.match(en,/data-voice-lang="vi-VN"/,'tap EN → VI');assert.match(en,/class="vlt-seg on"[^>]*>EN</);
 assert.match(html('vi-VN',true),/vlt-auto[^>]*>Tự động</,'Auto shows as a caption, not a third state');
 assert.doesNotMatch(vi,/<select|<option/,'no select');
 // The choice persists like the old buttons (bep-voice-lang + Auto off).
 run("vpSetLangPref('en-AU')");assert.equal(run("localStorage.getItem('bep-voice-lang')"),'en-AU');assert.equal(run("localStorage.getItem('bep-voice-auto')"),'0');
 assert.equal(run("voiceDefaultRecLang('vi',vpLangPrefs())"),'en-AU','the next sheet listens in English');
});

t('hold-to-talk is the default, migrated once; an explicit tap choice afterwards is kept',()=>{
 const fresh=context();assert.equal(vm.runInContext('voiceHoldMode()',fresh),true,'new users: hold');
 const old=new Map([['bep-voice-ptt','0']]);const m=context(old);assert.equal(vm.runInContext('voiceHoldMode()',m),true,'pre-v1.7.1 tap preference reset to hold');assert.equal(old.get('bep-voice-ptt-v171'),'1');
 vm.runInContext('voiceSetHoldMode(false)',m);assert.equal(vm.runInContext('voiceHoldMode()',m),false,'tap mode chosen after the change is kept');
 const again=context(old);assert.equal(vm.runInContext('voiceHoldMode()',again),false,'…across reloads');
});

console.log(`PASS voice pipeline: ${count} checks — per-mode language, Henry's phrases, 5x → eggs?, junk rejection, alternatives, VI/EN toggle, hold-to-talk default`);
