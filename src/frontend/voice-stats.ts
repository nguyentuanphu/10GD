'use strict';
// Voice statistics (v1.6). v1.7.14 (owner pop-up, 8 Nov 2026): ON by default (“giọng nói và analytics luôn bật sẵn”); turning it off is
// remembered ('0'). Before v1.7.14 it was opt-in. The toggle lives in the voice sheet's
// settings ("Giúp cải thiện nhận giọng nói (chỉ gửi chữ, không gửi âm thanh)").
// When ON, after each CONFIRMED voice preview the app sends one small text record:
//   {ts, lang, recognizer, transcript (redacted, ≤300 chars), unrecognised tokens,
//    corrections (phrase → catalogue id), household (salted SHA-256, not the id)}
// Never audio. Family member names, e-mail addresses, phone and other long numbers,
// and links are removed before sending (the server repeats the redaction). The device
// is identified by a random token only; switching the toggle OFF asks the server to
// delete everything sent from this device and forgets the token.
const VOICE_STATS_KEY='bep-voice-stats',VOICE_STATS_TOKEN='bep-voice-stats-device',VOICE_STATS_API='/.netlify/functions/voice-stats';
const VOICE_STATS_MAX=300;

function voiceStatsConsent(){try{return localStorage.getItem(VOICE_STATS_KEY)!=='0'}catch{return false}}
function voiceStatsNorm(s){return String(s||'').normalize('NFC').toLowerCase()}
function voiceStatsFold(s){return voiceStatsNorm(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d')}
function voiceStatsEscapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
// Removes e-mails, links, phone/long numbers and the given names (accent-insensitive).
function voiceStatsRedact(text,names=[]){
 let t=String(text||'').normalize('NFC');
 t=t.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g,' [email] ');
 t=t.replace(/\b(?:https?:\/\/|www\.)\S+/gi,' [link] ');
 t=t.replace(/\+?\(?\d[\d\s().-]{6,}\d/g,m=>m.replace(/\D/g,'').length>=7?' [số] ':m);
 t=t.replace(/\b\d{5,}\b/g,' [số] ');
 const list=[...new Set((names||[]).map(n=>String(n||'').trim()).filter(n=>n.length>=2))].sort((a,b)=>b.length-a.length);
 if(list.length){
  // Compare on an accent-folded copy (same length per char for NFC Vietnamese) and cut the original.
  const parts=[];for(const n of list){parts.push(n);for(const w of n.split(/\s+/))if(w.length>=3)parts.push(w)}
  const folded=[...new Set(parts.map(voiceStatsFold))].sort((a,b)=>b.length-a.length);
  const chars=[...t],fold=chars.map(c=>voiceStatsFold(c)||c);
  const flat=fold.join('');
  // Map positions in the folded string back to original characters.
  const pos=[];fold.forEach((f,i)=>{for(let k=0;k<f.length;k++)pos.push(i)});
  const hits=new Array(chars.length).fill(false);
  for(const n of folded){const re=new RegExp('(^|[^\\p{L}\\p{N}])('+voiceStatsEscapeRe(n)+')(?=$|[^\\p{L}\\p{N}])','gu');let m;while((m=re.exec(flat))){const start=m.index+m[1].length,end=start+m[2].length;for(let k=start;k<end;k++)hits[pos[k]]=true;re.lastIndex=end}}
  let out='',inName=false;chars.forEach((c,i)=>{if(hits[i]){if(!inName)out+='[tên]';inName=true}else{inName=false;out+=c}});t=out;
 }
 return t.replace(/\s+/g,' ').trim();
}
function voiceStatsMemberNames(s){const out=[];for(const m of s?.members||[])if(m?.name)out.push(m.name);try{const p=globalThis.BEP_SESSION?.account;if(p?.name)out.push(p.name);if(p?.username)out.push(p.username)}catch{}return out}
function voiceStatsToken(){try{let t=localStorage.getItem(VOICE_STATS_TOKEN);if(!t||!/^[A-Za-z0-9_-]{24,64}$/.test(t)){const a=new Uint8Array(24);crypto.getRandomValues(a);t=btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');localStorage.setItem(VOICE_STATS_TOKEN,t)}return t}catch{return''}}
async function voiceStatsHousehold(id){if(!id||!globalThis.crypto?.subtle)return null;const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('bep-voice-stats:'+id));return [...new Uint8Array(d)].slice(0,12).map(b=>b.toString(16).padStart(2,'0')).join('')}
function voiceStatsTokenList(list,names){const out=[];for(const raw of list||[]){const r=voiceStatsRedact(raw,names).slice(0,40).trim();if(r&&!/^\[(tên|số|email|link)\]$/.test(r)&&!out.includes(r))out.push(r);if(out.length>=20)break}return out}
// Builds the record for a confirmed preview. `confirmed` = what the person kept/edited.
function voiceStatsEvent({draft,confirmed,lang,recognizer,names=[],now=Date.now(),isCatalogId=()=>true}){
 const transcript=voiceStatsRedact(draft?.text||'',names).slice(0,VOICE_STATS_MAX);
 const unrecognised=[],corrections=[];
 const items=draft?.items||[];
 for(const c of confirmed?.items||[]){const orig=items[c.index]||{};const heard=orig.heard||orig.label||'';
  if(!orig.ingredient&&heard)unrecognised.push(heard);
  if(c.ingredient&&c.ingredient!==orig.ingredient&&heard&&isCatalogId(c.ingredient))corrections.push({phrase:heard,id:c.ingredient,kind:'ingredient'})}
 const md=confirmed?.meal;
 if(md&&md.phrase){if(!md.originalId&&!md.id)unrecognised.push(md.phrase);if(md.id&&md.id!==md.originalId&&isCatalogId(md.id))corrections.push({phrase:md.phrase,id:md.id,kind:'recipe'})}
 if(draft?.kind==='meal'&&draft.needsRecipe&&draft.dish&&!md)unrecognised.push(draft.dish);
 return{ts:new Date(now).toISOString(),lang:lang==='en'?'en':lang==='vi'?'vi':'auto',recognizer:String(recognizer||'typed').replace(/[^a-z0-9-]/gi,'').slice(0,30)||'typed',kind:draft?.kind==='meal'?'meal':'shopping',transcript,unrecognised:voiceStatsTokenList(unrecognised,names),corrections:corrections.slice(0,10).map(c=>({phrase:voiceStatsRedact(c.phrase,names).slice(0,60),id:String(c.id).slice(0,60),kind:c.kind})).filter(c=>c.phrase&&!/^\[(tên|số|email|link)\]$/.test(c.phrase)),items:(confirmed?.items||[]).length};
}
async function voiceStatsSend(event,{fetchFn,household}={}){
 if(!voiceStatsConsent())return false;
 if(typeof navigator!=='undefined'&&(!navigator.onLine||globalThis.BEP_OFFLINE))return false;
 const token=voiceStatsToken();if(!token)return false;
 const body={...event,household:household?await voiceStatsHousehold(household):null};
 try{const r=await (fetchFn||fetch)(VOICE_STATS_API+'?op=submit',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json','x-voice-stats-device':token},body:JSON.stringify(body)});return !!r.ok}catch{return false}
}
async function voiceStatsSetConsent(on,{fetchFn}={}){
 const was=voiceStatsConsent();
 try{localStorage.setItem(VOICE_STATS_KEY,on?'1':'0')}catch{}
 if(!on&&was){let token='';try{token=localStorage.getItem(VOICE_STATS_TOKEN)||''}catch{}
  if(token){try{const r=await (fetchFn||fetch)(VOICE_STATS_API+'?op=forget',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-voice-stats-device':token},body:'{}'});if(r.ok)try{localStorage.removeItem(VOICE_STATS_TOKEN)}catch{}else try{localStorage.setItem('bep-voice-stats-forget','1')}catch{}}catch{try{localStorage.setItem('bep-voice-stats-forget','1')}catch{}}}}
 return on;
}
// Retries a deletion that could not reach the server earlier (e.g. switched off offline).
async function voiceStatsRetryForget(fetchFn){try{if(localStorage.getItem('bep-voice-stats-forget')!=='1'||voiceStatsConsent())return;const token=localStorage.getItem(VOICE_STATS_TOKEN);if(!token){localStorage.removeItem('bep-voice-stats-forget');return}const r=await (fetchFn||fetch)(VOICE_STATS_API+'?op=forget',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-voice-stats-device':token},body:'{}'});if(r.ok){localStorage.removeItem('bep-voice-stats-forget');localStorage.removeItem(VOICE_STATS_TOKEN)}}catch{}}

// Reads the confirmed preview from the review form just before the app applies it.
function voiceStatsConfirmed(action){
 const d=typeof voiceDraft!=='undefined'?voiceDraft:null;if(!d)return null;
 const S=typeof state!=='undefined'?state:null,find=typeof voiceIngredient==='function'?(l=>{try{return voiceIngredient(l,S)}catch{return''}}):(()=>'');
 const items=[];
 if(action==='voice-apply-shopping'){for(const el of document.querySelectorAll('.voice-item')){if(!el.querySelector('input[name=include]')?.checked)continue;const index=+el.dataset.index,label=el.querySelector('.voice-label')?.value?.trim()||'',orig=d.items?.[index]||{};const edited=label&&voiceStatsFold(label)!==voiceStatsFold(orig.label||'');items.push({index,ingredient:edited?find(label)||'':orig.ingredient||''})}
  let meal=null;const md=d.mealDraft;if(md&&document.getElementById('voice-include-meal')?.checked){const id=document.getElementById('voice-combo-recipe')?.value||'';meal={phrase:md.dish||md.text,originalId:md.candidates?.[0]||'',id:id==='__new__'?'':id}}
  return{draft:d,confirmed:{items,meal}}}
 if(action==='voice-apply-meal'){const id=document.querySelector('#voice-meal-form [name=recipe]')?.value||'';return{draft:d,confirmed:{items:[],meal:{phrase:d.dish||d.text,originalId:d.candidates?.[0]||'',id}}}}
 return null;
}
function voiceStatsIsCatalogId(id){const S=typeof state!=='undefined'?state:null;if(typeof INGREDIENTS!=='undefined'&&Object.hasOwn(INGREDIENTS,id))return true;const r=S?.recipes?.find(x=>x.id===id);return !!r&&!r.custom&&r.origin!=='family'}
function voiceStatsRecognizer(){if(typeof voiceLocalLastUsed!=='undefined'&&voiceLocalLastUsed)return voiceLocalLastUsed;if(typeof voiceFinals!=='undefined'&&voiceFinals.length)return 'browser';return 'typed'}
function voiceStatsInstall(){
 document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-personal="voice-apply-shopping"],[data-personal="voice-apply-meal"]');if(!b||!voiceStatsConsent())return;
  try{const c=voiceStatsConfirmed(b.dataset.personal);if(!c)return;const S=typeof state!=='undefined'?state:null;
   const lang=typeof voiceRecLang!=='undefined'&&voiceRecLang?String(voiceRecLang).slice(0,2):(typeof appLanguage!=='undefined'?appLanguage:'vi');
   const ev=voiceStatsEvent({...c,lang:typeof voiceLocalLangMode==='function'&&voiceStatsRecognizer().startsWith('local-')&&voiceLocalLangMode()==='auto'?'auto':lang,recognizer:voiceStatsRecognizer(),names:voiceStatsMemberNames(S),isCatalogId:voiceStatsIsCatalogId});
   voiceStatsSend(ev,{household:globalThis.BEP_SESSION?.household?.id||null})}catch{}},true);
 document.addEventListener('change',e=>{if(e.target?.id!=='voice-stats-consent')return;const on=!!e.target.checked;voiceStatsSetConsent(on).then(()=>{typeof toast==='function'&&toast(on?(typeof tr==='function'?tr('Cảm ơn! Chỉ gửi chữ đã lược bỏ thông tin riêng.','Thank you! Only redacted text is sent.'):'OK'):(typeof tr==='function'?tr('Đã tắt và yêu cầu xoá dữ liệu đã gửi.','Turned off and asked to delete what was sent.'):'OK'))})});
 addEventListener('online',()=>voiceStatsRetryForget());voiceStatsRetryForget();
}
if(typeof document!=='undefined'&&typeof window!=='undefined')voiceStatsInstall();
