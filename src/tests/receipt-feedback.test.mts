// v1.7.18 receipts the app has not seen (owner decision 12 Nov 2026; plan docs/plans/receipts-v1.7.19-20261112.md A + B).
//  A. “Gửi chữ hoá đơn để sửa cách đọc”: the phone removes card / bank / member / receipt / phone numbers but keeps the items
//     and the shop's public ABN / address (receipt-share.ts), the server checks again (lib/receipt-reports.mts); the
//     feedback?op=receipt-report op validates, limits size and rate, stores once per clientId, never keeps a username, IP or
//     photo; Studio lists / opens / updates / deletes for the owner only; the daily cleanup removes reports after 180 days.
//  B. Photo quality hints (receipt-quality.ts): no hint for a balanced receipt; short / over, item count, low confidence,
//     no total and a cut-off price column each give their reason.
// Synthetic receipts and numbers only; in-memory stores.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {createFeedbackHandler} from '../netlify/functions/feedback.mjs';
import {createFeedbackCleanup} from '../netlify/functions/feedback-cleanup.mjs';
import {serverRedact,sensitiveLine,diffLines,receiptReportStore,pruneReceiptReports,listReceiptReports,RR_LIMITS} from '../netlify/lib/receipt-reports.mjs';
import {listLog,resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';
const require=createRequire(import.meta.url);
const {RECEIPTS}=require('./fixtures/receipts.cjs');
let passed=0;const ok=(name:string)=>{passed++;console.log('PASS',name)};

// ---------- the app's own code, loaded as in the browser (no DOM: pure parts only)
const ctx:any=vm.createContext({console,Intl,Date,Math,TextEncoder,crypto:webcrypto});
vm.runInContext(['seed','core','spending-core','receipt-parse','receipt-quality','receipt-share'].map(n=>readFileSync('dist/'+n+'.js','utf8')).join('\n;\n')+'\n;this.RP=ReceiptParse;this.RQ=ReceiptQuality;this.RS=ReceiptShare;',ctx);
const {RP,RQ,RS}=ctx;

// A synthetic receipt with every kind of number that must never leave the phone.
const SENSITIVE=`TAN VIET GROCERY CABRAMATTA
ABN 12 345 678 901
123 John St Cabramatta NSW 2166
Ph: 02 9755 1234
Tax Invoice
No: P2611070038
RAU MUONG 3.20
THIT BA CHI 0.850kg @ 12.99/kg 11.04
DAU HU 4.50
TOTAL 18.74
Goldstar 79354396400
Customer mobile 0412 345 678
EFTPOS
CARD NO XXXX XXXX XXXX 4321
AID A0000000041010
ARQC 1A2B3C4D5E6F7A8B
TVR 0000008000
TERMINAL ID 12345678
APPROVAL CODE 123456
Commonwealth Bank
Served by: Sample Person
email sample.person@example.com
Thank you`;
const NEVER=['P2611070038','79354396400','0412 345 678','4321','A0000000041010','1A2B3C4D5E6F7A8B','0000008000','12345678','123456','Commonwealth','Sample Person','sample.person@example.com','Goldstar','EFTPOS'];
{
 const r=RS.redactForReport(SENSITIVE);
 for(const s of NEVER)assert.ok(!r.text.includes(s),'phone redaction removes '+s+'\n'+r.text);
 for(const s of ['TAN VIET GROCERY CABRAMATTA','ABN 12 345 678 901','123 John St Cabramatta NSW 2166','RAU MUONG 3.20','THIT BA CHI 0.850kg @ 12.99/kg 11.04','DAU HU 4.50','TOTAL 18.74','Thank you'])assert.ok(r.text.includes(s),'phone redaction keeps '+s+'\n'+r.text);
 assert.ok(r.removed>=12,'counts removed lines '+r.removed);
 assert.equal(RS.maskLine('Call me on 0412 345 678 please'),'Call me on [phone] please');
 assert.equal(RS.maskLine('Ph: 02 9755 1234'),'Ph: 02 9755 1234','the shop phone printed in the header is public');
 assert.equal(RS.maskLine('Home 02 9755 1234'),'Home [phone]');
 // the parser's own reading of the redacted text still finds the items and the total
 const p=RP.parseReceipt(r.text);assert.equal(p.printedTotal,18.74);assert.ok(p.items.filter((i:any)=>i.kind==='item').length>=3,'items still read');
 // every fixture: no item line is ever removed, and payment / card lines in the fixtures are
 for(const[name,{text}]of Object.entries(RECEIPTS) as any){const before=RP.parseReceipt(text),after=RS.redactForReport(text).text;
  const g=(r:any)=>JSON.stringify(r.items.filter((i:any)=>i.kind==='item').map((i:any)=>[i.name,i.price]));assert.equal(g(RP.parseReceipt(after)),g(before),name+': the redacted text reads to the same items');
  assert.equal(RP.parseReceipt(after).printedTotal,before.printedTotal,name+': same total');
  for(const l of after.split('\n'))assert.ok(!/\b(AID|ARQC|TVR|TERMINAL|CARD NO|REFERENCE)\b/i.test(l),name+': payment line left: '+l)}
 ok('A: the phone removes card / bank / member / receipt / phone numbers, keeps items, ABN and address (all fixtures too)');
}
{const r=serverRedact(SENSITIVE);for(const s of NEVER)assert.ok(!r.text.includes(s),'server redaction removes '+s);for(const s of ['ABN 12 345 678 901','RAU MUONG 3.20','TOTAL 18.74'])assert.ok(r.text.includes(s),'server keeps '+s);
 assert.ok(sensitiveLine('Goldstar 79354396400')&&sensitiveLine('No: P2611070038')&&sensitiveLine('CARD NO XXXX XXXX XXXX 4321')&&!sensitiveLine('ABN 12345678901')&&!sensitiveLine('MILK 2L 3.50'));
 ok('A: the server checks the same rules again');}
{const read={store:'TAN VIET',date:'2026-11-10',total:18.74,lines:[{name:'RAU MUONG',qty:null,unit:'',price:3.2},{name:'THIT BA CHI',qty:0.85,unit:'kg',price:11.04},{name:'DAU H',qty:null,unit:'',price:4.5}]};
 const same=JSON.parse(JSON.stringify(read)),fixed=JSON.parse(JSON.stringify(read));fixed.lines[2].name='DAU HU';fixed.lines.push({name:'HANH LA',qty:null,unit:'',price:1.5});
 assert.equal(RS.corrected(read,same),false);assert.equal(RS.corrected(read,fixed),true);assert.equal(RS.corrected(read,{...same,store:'TAN VIET GROCERY'}),true);assert.equal(RS.corrected(read,{...same,total:20}),true);
 const b=RS.buildReport({text:SENSITIVE,read,now:{...fixed,lines:[...fixed.lines,{name:'Goldstar 79354396400',qty:null,unit:'',price:0}]},retailer:'viet-grocer',clientId:'synthetic-client-0000000001',lang:'en',build:'20261112T010101Z-abcdef12',edition:7,confidence:63.4,warnings:[{code:'short'}]});
 assert.deepEqual([...Object.keys(b)].sort(),['build','clientAt','clientId','confidence','corrected','edition','lang','read','removed','retailer','source','text','warnings']);
 assert.ok(!JSON.stringify(b).includes('79354396400'),'a sensitive line typed as a name is blanked');assert.equal(b.confidence,63);assert.deepEqual([...b.warnings],['short']);
 assert.ok(!/image|photo|jpeg|data:/i.test(JSON.stringify(Object.keys(b))),'no photo field');
 const d=diffLines(read.lines,fixed.lines);assert.deepEqual(d.rows.map((r:any)=>r.kind),['same','same','name','added']);assert.equal(d.changed,2);
 const d2=diffLines(read.lines,[read.lines[0],{...read.lines[1],price:12.04}]);assert.deepEqual(d2.rows.map((r:any)=>r.kind),['same','price','removed']);
 ok('A: corrected() / buildReport() / read-vs-corrected diff');}

// ---------- B: quality hint reasons
{const W=RECEIPTS['coles-16-waterloo'].text,codes=(t:string,o:any={confidence:91}):string[]=>JSON.parse(JSON.stringify(RQ.qualityReasons(RP.parseReceipt(t),o).map((r:any)=>r.code)));
 assert.deepEqual(codes(W),[],'balanced receipt: no hint');
 assert.deepEqual(codes(W.replace('VEGEMITE 380GRAM 7.00\n','')),['short','count'],'a line missed: short + count');
 assert.deepEqual(codes(W.replace('BEGA NATURAL D 500GRAM 10.50','BEGA NATURAL D 500GRAM 18.50')),['over'],'a misread price: over');
 assert.deepEqual(codes(W.replace('Total for 5 items','Total for 6 items')),['count'],'printed item count differs');
 assert.deepEqual(codes(W,{confidence:52}),['blurry'],'low confidence');
 assert.deepEqual(codes(W,{confidence:null}),[],'typed text has no confidence');
 assert.deepEqual(codes(W.replace(/\nTotal for 5 items: \$31\.20[\s\S]*$/,'')),['no-total'],'no TOTAL / payment');
 const cut=W.replace('3.80','').replace('4.40','');assert.ok(codes(cut).includes('cut-off'),'two lines without a price at the right edge: '+codes(cut));
 // a line read without its price: alone it is not enough; with the crop frame stopping short of the right edge it is
 const P={items:[{kind:'item',name:'RAU MUONG',price:3.2},{kind:'item',name:'DAU HU',price:null,priceMissing:true}],printedTotal:3.2,difference:0,printedCount:null,countRead:2};
 const pc=(o:any)=>JSON.parse(JSON.stringify(RQ.qualityReasons(P,o).map((r:any)=>r.code)));
 assert.deepEqual(pc({confidence:90,frame:{l:.05,t:.05,r:.97,b:.95}}),[]);assert.deepEqual(pc({confidence:90,frame:{l:.1,t:.1,r:.8,b:.9}}),['cut-off'],'one priceless line + a frame cut short on the right');
 assert.ok(!codes(W.replace(/\n(\S.*)?3\.80/,'\nA2 DAIRY 3.8'),{confidence:90}).includes('blurry'));
 const one=RQ.qualityReasons(RP.parseReceipt(W.replace('VEGEMITE 380GRAM 7.00\n','')),{confidence:91})[0];assert.match(one.vi,/thiếu \$7\.00/);assert.match(one.en,/\$7\.00 short/);
 assert.ok(RQ.HINT_MIN_DIFF===0.05&&RQ.HINT_MIN_CONF===70);
 ok('B: quality hint reasons — balanced (none), short, over, count, low confidence, no total, cut-off price column');}

// ---------- A: the server op
const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-receipt-passphrase-42';
const env:any={STUDIO_ADMINS:'henrynguyen'};resetSettingsCache();
let clock=Date.parse('2026-11-12T01:00:00Z');const nowFn=()=>clock;
const accounts=createAccountsHandler({getStoreFn}),studio=createStudioHandler({getStoreFn,env,limits:{all:1000,mutate:1000}});
const fb=createFeedbackHandler({getStoreFn,env,nowFn,notify:async()=>({sent:0})});
let ip=0;
const req=(endpoint:string,q:string,{method='GET',body,cookie='',device='',headers={},raw}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?${q}`,{method,headers:{Origin:origin,'x-nf-client-connection-ip':headers.ip||'u-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(device?{'x-feedback-device':device}:{}),...(headers['x-studio-csrf']?{'x-studio-csrf':headers['x-studio-csrf']}:{}),'Content-Type':'application/json'},body:raw!==undefined?raw:body===undefined?undefined:JSON.stringify(body)});
async function register(username:string){const r=await accounts(req('accounts','op=register',{method:'POST',body:{username,name:'Synthetic '+username,password,trust:true}}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]}
const call=async(op:string,o:any={})=>{const r=await fb(req('feedback','op='+op,o));let d:any=null;try{d=await r.json()}catch{}return{status:r.status,d}};
const henry=await register('henrynguyen'),tina=await register('tina');
const H={cookie:henry,headers:{'x-studio-csrf':(await (await studio(req('studio','op=me',{cookie:henry}))).json()).csrf}};
const DEV='synthetic-device-token-AAAAAAAAAAAAAAAA',DEV2='synthetic-device-token-BBBBBBBBBBBBBBBB';
let n=0;const report=(x:any={})=>({...RS.buildReport({text:SENSITIVE,read:{store:'TAN VIET',date:'2026-11-10',total:18.74,lines:[{name:'RAU MUONG',qty:null,unit:'',price:3.2},{name:'DAU H',qty:null,unit:'',price:4.5}]},now:{store:'TAN VIET GROCERY CABRAMATTA',date:'2026-11-10',total:18.74,lines:[{name:'RAU MUONG',qty:null,unit:'',price:3.2},{name:'THIT BA CHI',qty:0.85,unit:'kg',price:11.04},{name:'DAU HU',qty:null,unit:'',price:4.5}]},retailer:'viet-grocer',clientId:'synthetic-client-'+String(++n).padStart(10,'0'),lang:'vi',build:'20261112T010101Z-abcdef12',edition:7,confidence:64,warnings:['short'],clientAt:clock}),...x});
{
 // device-only family (no account), the ladybug's mode does not matter (default 'assigned' hides the ladybug from them)
 const first=await call('receipt-report',{method:'POST',device:DEV,body:report()});assert.equal(first.status,201,JSON.stringify(first.d));assert.match(first.d.id,/^[a-f0-9]{18}$/);
 const again=await call('receipt-report',{method:'POST',device:DEV,body:{...report(),clientId:'synthetic-client-0000000001'}});assert.equal(again.status,200);assert.equal(again.d.id,first.d.id,'same clientId → stored once');assert.equal(again.d.duplicate,true);
 const acc=await call('receipt-report',{method:'POST',cookie:tina,body:report()});assert.equal(acc.status,201,'account');
 assert.equal((await call('receipt-report',{method:'POST',body:report()})).status,400,'neither an account nor a device token');
 assert.equal((await call('receipt-report',{method:'POST',device:DEV2,body:{...report(),clientId:'short'}})).status,400,'bad clientId');
 assert.equal((await call('receipt-report',{method:'POST',device:DEV2,body:{...report(),text:''}})).status,400,'no text');
 assert.equal((await call('receipt-report',{method:'POST',device:DEV2,body:{...report(),read:null}})).status,400,'no read lines');
 assert.equal((await call('receipt-report',{method:'POST',device:DEV2,raw:'{bad json'})).status,400,'bad JSON');
 assert.equal((await call('receipt-report',{method:'POST',device:DEV2,raw:JSON.stringify({...report(),text:'x'.repeat(RR_LIMITS.bytes)})})).status,413,'over 40 KB');
 assert.equal((await call('receipt-report',{method:'GET',device:DEV2})).status,404,'POST only');
 assert.equal((await call('receipt-report',{method:'POST',device:DEV2,body:report(),headers:{}})).status,201);
 // rate: 3 a minute per reporter, 20 a day
 for(let i=0;i<2;i++)assert.equal((await call('receipt-report',{method:'POST',device:DEV2,body:report()})).status,201);
 const limited=await call('receipt-report',{method:'POST',device:DEV2,body:report()});assert.equal(limited.status,429);assert.equal(limited.d.code,'rate');
 clock+=61000;assert.equal((await call('receipt-report',{method:'POST',device:DEV2,body:report()})).status,201,'next minute is fine');
 // per network address per day
 const ipLimit:any[]=[];for(let i=0;i<RR_LIMITS.perIpDay+1;i++){if(i%3===0)clock+=61000;ipLimit.push((await call('receipt-report',{method:'POST',device:'synthetic-device-ip-'+String(i).padStart(8,'0')+'XXXXXXXX',body:report(),headers:{ip:'same-ip'}})).status)}
 assert.equal(ipLimit.filter(s=>s===201).length,RR_LIMITS.perIpDay);assert.equal(ipLimit.at(-1),429);
 ok('A: receipt-report op — device-only and account senders, once per clientId, validation, 40 KB limit, rate limits');
 // what is stored: never a username, IP, photo or sensitive number
 const rec=await receiptReportStore(getStoreFn).get('r/'+acc.d.id,{type:'json'});const all=JSON.stringify(rec);
 for(const s of NEVER)assert.ok(!all.includes(s),'stored without '+s);assert.ok(!/tina|same-ip|u-\d/.test(all),'no username or IP');assert.ok(!('shot' in rec)&&!/data:image/.test(all),'no picture');
 assert.equal(rec.reporter.account,true);assert.match(rec.reporter.key,/^a-[a-f0-9]{24}$/);assert.equal(rec.status,'new');assert.equal(rec.changedLines,2);assert.deepEqual(rec.changedFields,['store']);
 assert.deepEqual(rec.diff.map((d:any)=>d.kind),['same','added','name']);
 ok('A: stored report: redacted text, read vs corrected lines, diff, no username / IP / photo');
 // Studio: owner only (moderator also allowed by role; others 403; no account 401; CSRF on changes)
 assert.equal((await call('studio-receipts',{})).status,401);assert.equal((await call('studio-receipts',{cookie:tina})).status,403,'family account refused');
 const list=await call('studio-receipts',{cookie:henry});assert.equal(list.status,200);assert.ok(list.d.all>=RR_LIMITS.perIpDay);assert.equal(list.d.counts.new,list.d.all);
 const row=list.d.rows.find((r:any)=>r.id===acc.d.id)||list.d.rows[0];assert.deepEqual(Object.keys(row).sort(),['account','at','changedFields','changedLines','correctedCount','date','id','lang','readCount','retailer','source','status','store']);
 assert.equal(row.store,'TAN VIET GROCERY CABRAMATTA');assert.equal(row.readCount,2);assert.equal(row.correctedCount,3);
 const det=await call('studio-receipt',{cookie:henry,q:''} as any);assert.equal(det.status,400,'id required');
 const r1=await fb(req('feedback','op=studio-receipt&id='+acc.d.id,{cookie:henry}));const d1=await r1.json();assert.equal(r1.status,200);assert.equal(d1.reporter.key,undefined,'Studio never sees the reporter key');assert.ok(d1.text.includes('RAU MUONG 3.20'));
 assert.equal((await fb(req('feedback','op=studio-receipt&id='+acc.d.id,{cookie:tina}))).status,403);
 assert.equal((await call('studio-receipt-status',{method:'POST',cookie:henry,body:{id:acc.d.id,status:'test-added'}})).status,403,'CSRF required');
 const st=await call('studio-receipt-status',{method:'POST',...H,body:{id:acc.d.id,status:'test-added'}});assert.equal(st.status,200);assert.equal(st.d.status,'test-added');
 assert.equal((await call('studio-receipt-status',{method:'POST',...H,body:{id:acc.d.id,status:'done'}})).status,400);
 assert.equal((await call('studio-receipts',{cookie:henry,q:''} as any)).d.counts['test-added'],1);
 const filtered=await fb(req('feedback','op=studio-receipts&status=test-added',{cookie:henry}));assert.equal((await filtered.json()).total,1);
 const del=await call('studio-receipt-delete',{method:'POST',...H,body:{id:first.d.id}});assert.equal(del.status,200);assert.equal((await fb(req('feedback','op=studio-receipt&id='+first.d.id,{cookie:henry}))).status,404);
 const audit=(await listLog(getStoreFn,'audit',{limit:400})).items.map((x:any)=>x.action);for(const a of ['receipt_report_view','receipt_report_status','receipt_report_delete'])assert.ok(audit.includes(a),'audited '+a);
 ok('A: Studio list / detail / status / delete — owner only, CSRF, audited, no reporter key shown');
 // retention: 180 days, with the daily feedback cleanup
 clock+=181*86400000;const keep=await call('receipt-report',{method:'POST',device:'synthetic-device-new-AAAAAAAAAAAAAAA',body:report()});assert.equal(keep.status,201);
 const res=await (await createFeedbackCleanup({getStoreFn,now:()=>clock})()).json();assert.ok(res.receipts>=RR_LIMITS.perIpDay,'old reports removed '+res.receipts);
 const left=await listReceiptReports(getStoreFn);/* (the Studio session cookie has expired after 181 days) */assert.equal(left.all,1);assert.equal(left.rows[0].id,keep.d.id);
 const again2=await pruneReceiptReports(getStoreFn,clock);assert.equal(again2.removed,0);
 ok('A: reports older than 180 days are removed by the daily cleanup; newer ones stay');
}
console.log(`receipt-feedback: ${passed} checks passed`);
