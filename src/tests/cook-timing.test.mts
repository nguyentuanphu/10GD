// v1.7.17 — owner, 9 Nov 2026 (Sydney time): the dinner reminder says how long preparing and cooking will take and comes early
// enough (pop-ups: dinner time − the longest dish − 15 minutes; optional preparation minutes on family dishes). Synthetic data only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import webPush from 'web-push';
import {cookTiming,scheduledReminders} from '../netlify/lib/push.mjs';
const ok=(c:any,m:string)=>{assert.ok(c,m);console.log('PASS',m)};
const recipes=[{id:'pho',name:'Phở bò',time:90,prepTime:30},{id:'rau',name:'Rau muống xào',time:10},{id:'canh',name:'Canh chua'}];
const meal=(ids:string[],cooked=false)=>({recipes:ids.map(id=>({id,name:recipes.find(r=>r.id===id)!.name})),cooked});
const s={recipes};
let t:any=cookTiming(s,meal(['pho','rau','canh']),'18:30');
ok(t.dishes===3&&t.longest.name==='Phở bò'&&t.longest.total===120&&t.longest.prep===30&&t.longest.cook===90&&t.sum===130&&t.unknown===1,'3 dishes: longest Phở bò 120 min (30 prep + 90 cook), 130 min in all, one without a time');
ok(t.start==='16:15','start = 18:30 − 120 − 15 = 16:15 (a quarter hour)');
ok(cookTiming(s,meal(['rau']),'18:30').start==='18:00','a quick dish: 18:30 − 10 − 15 = 18:05 → 18:00, never later than needed');
ok(cookTiming(s,meal(['pho']),'09:00').start==='08:00','never before 08:00');
ok(cookTiming(s,meal(['canh']),'18:30').start===null,'no time on any dish: no start time is guessed');
ok(cookTiming(s,meal(['pho'],true),'18:30')===null&&cookTiming(s,{recipes:[],cooked:false},'18:30')===null,'nothing for a cooked or empty dinner');
ok(cookTiming({recipes:[{id:'pho',name:'Phở bò',time:60,prepTime:45}]},meal(['pho']),'18:30').longest.total===105,'the family’s current recipe is used (changed after the menu was made)');
// the browser copy gives the same answers
const ctx:any=vm.createContext({console});vm.runInContext(fs.readFileSync('dist/cook-timing.js','utf8').replace(/\(function\s*\(\)\s*\{[\s\S]*$/,''),ctx);
for(const [ids,at] of [[['pho','rau','canh'],'18:30'],[['rau'],'18:30'],[['pho'],'09:00'],[['canh'],'18:30']] as const)
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.cookTiming(s,meal([...ids]),at))),JSON.parse(JSON.stringify(cookTiming(s,meal([...ids]),at))));
ok(true,'the app and the server make the same sum');
// the phone notification comes at the start time with the numbers
{const date='2026-11-09',week='2026-11-09';const state={members:[{id:'dad',name:'Bố'}],recipes,preferences:{dinnerTime:'18:30',quietStart:'00:00',quietEnd:'00:00'},weeks:{[week]:{days:{[date]:{dinner:meal(['pho','rau','canh'])}}}},pantry:[],receipts:[]};
 const data=new Map<string,any>([['push/vapid-keys',webPush.generateVAPIDKeys()],['state',state],['push/subscriptions/dev-1',{deviceId:'dev-1',memberId:'dad',subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-1',keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)}},types:{}}]]);
 const store:any={get:async(k:string)=>data.get(k)??null,setJSON:async(k:string,v:any,o:any={})=>{if(o.onlyIfNew&&data.has(k))return{modified:false};data.set(k,v);return{modified:true}},delete:async(k:string)=>data.delete(k),list:async function*(o:any={}){yield{blobs:[...data.keys()].filter(k=>k.startsWith(o.prefix||'')).map(key=>({key}))}}};
 const sent:any[]=[];const send=async(_s:any,p:string)=>{sent.push(JSON.parse(p));return{statusCode:201}};
 await scheduledReminders(store,new Date('2026-11-09T04:00:00Z')/* 15:00 Sydney */,{send});ok(!sent.some(p=>p.type==='prep'),'not at 15:00');
 await scheduledReminders(store,new Date('2026-11-09T05:15:00Z')/* 16:15 Sydney */,{send});const p=sent.find(x=>x.type==='prep');
 ok(p&&p.title==='Đến giờ nấu bữa tối T2 9/11 — bắt đầu lúc 16:15'&&/^Ăn lúc 18:30 · 3 món · lâu nhất Phở bò 120 phút \(chuẩn bị 30 \+ nấu 90\) · tổng 130 phút · 1 món chưa ghi thời gian/.test(p.body),`at 16:15 the reminder says how long it takes (${p?.title} — ${p?.body})`);
 await scheduledReminders(store,new Date('2026-11-09T05:20:00Z'),{send});ok(sent.filter(x=>x.type==='prep').length===1,'sent once');
 // no time on any dish: the old 17:00 reminder with the dish names
 const st2={...state,weeks:{[week]:{days:{[date]:{dinner:meal(['canh'])}}}}};data.set('state',st2);for(const k of [...data.keys()])if(k.startsWith('push/sent/'))data.delete(k);sent.length=0;
 await scheduledReminders(store,new Date('2026-11-09T06:00:00Z')/* 17:00 */,{send});ok(sent.some(x=>x.type==='prep'&&/chuẩn bị nấu/.test(x.title)&&/Canh chua/.test(x.body)),'without times: 17:00 with the dish names, as before')}
console.log('cook timing: passed');
