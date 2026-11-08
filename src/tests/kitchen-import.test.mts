// v1.7.15 recipe import from a link and barcode lookup — server side (lib/recipe-import, family ops recipe-import / barcode).
// Completely local: the web and Open Food Facts are replaced by fakes; any real network call fails.
globalThis.fetch=async()=>{throw Error('Network is disabled in mocked tests')};
import assert from 'node:assert/strict';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {safeUrl,privateAddress,extractRecipe,fetchPage,lookupBarcode,cleanText} from '../netlify/lib/recipe-import.mjs';
import {accountFixture,memoryStores} from './helpers/accounts.mjs';
const ok=(c:any,m:string)=>{assert.ok(c,m);console.log('PASS',m)};
const PAGE=`<html><head><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"x"},{"@type":["Recipe"],"name":"Thịt kho trứng &amp; nước dừa","recipeYield":["4 servings","4"],"totalTime":"PT1H15M",
 "recipeIngredient":["500 g pork belly, cut into cubes","4 eggs","2 tbsp fish sauce","1 cup coconut water","Salt to taste"],
 "recipeInstructions":[{"@type":"HowToSection","name":"Prep","itemListElement":[{"@type":"HowToStep","text":"Cut the pork."}]},{"@type":"HowToStep","text":"Simmer for <b>45 minutes</b>."}]}]}</script></head><body>…</body></html>`;
const resp=(body:string,init:any={})=>new Response(body,{status:200,headers:{'content-type':'text/html; charset=utf-8'},...init});
const publicDns=async()=>['93.184.216.34'];

// rules
ok(!safeUrl('file:///etc/passwd')&&!safeUrl('http://localhost/x')&&!safeUrl('http://127.0.0.1/x')&&!safeUrl('http://10.0.0.5/')&&!safeUrl('http://192.168.1.1/')&&!safeUrl('http://169.254.169.254/latest')&&!safeUrl('http://[::1]/')&&!safeUrl('http://router.local/')&&!safeUrl('http://intranet/')&&!safeUrl('https://user:pw@example.com/')&&!safeUrl('http://example.com:8080/'),'only public web pages: no files, local, private, metadata, bare names, passwords or odd ports');
ok(!!safeUrl('https://www.example.com/recipes/pho?x=1#top')&&safeUrl('https://www.example.com/r#top')!.hash==='','a normal https page is fine (fragment dropped)');
ok(privateAddress('172.20.1.1')&&privateAddress('::ffff:127.0.0.1')&&!privateAddress('8.8.8.8'),'private addresses recognised');
{const r=extractRecipe(PAGE)!;ok(r.name==='Thịt kho trứng & nước dừa'&&r.ingredients.length===5&&r.servings===4&&r.time===75,'reads the schema.org Recipe inside @graph: name, 5 ingredient lines, servings 4, 75 min');
 ok(r.steps.length===2&&r.steps[0]==='Cut the pork.'&&r.steps[1].startsWith('Simmer for 45 minutes')&&!r.steps[1].includes('<'),'steps from sections and steps, tags removed');}
ok(extractRecipe('<html>no recipe here</html>')===null&&extractRecipe('<script type="application/ld+json">{bad json</script>')===null,'a page without recipe data gives nothing (no guessing)');
ok(cleanText('A&nbsp;&amp;&#39;B&#x27;')==='A &\'B\'','entities decoded');
// fetching: public only, redirects checked again, size and type
{const calls:string[]=[];const f:any=async(u:string)=>{calls.push(u);return resp(PAGE)};const r:any=await fetchPage('https://cook.example.com/r',{fetchFn:f,resolve:publicDns});ok(r.html&&calls.length===1,'a public page is read once');}
{const f:any=async()=>resp('',{status:302,headers:{location:'http://127.0.0.1/admin'}});ok((await fetchPage('https://cook.example.com/r',{fetchFn:f,resolve:publicDns}) as any).error==='bad_url','a redirect to a private address is refused');}
{const f:any=async()=>resp(PAGE);ok((await fetchPage('https://evil.example.com/r',{fetchFn:f,resolve:async()=>['10.1.2.3']}) as any).error==='bad_url','a host that resolves to a private address is refused');}
{const f:any=async()=>resp('{}',{headers:{'content-type':'application/json'}});ok((await fetchPage('https://cook.example.com/r',{fetchFn:f,resolve:publicDns}) as any).error==='not_html','only HTML pages');}
{const big='x'.repeat(2_100_000);const f:any=async()=>resp(big);ok((await fetchPage('https://cook.example.com/r',{fetchFn:f,resolve:publicDns}) as any).error==='too_big','pages over 2 MB are refused');}
// barcode
{const f:any=async(u:string)=>{assert.match(u,/world\.openfoodfacts\.org\/api\/v2\/product\/9300633603256\.json/);return new Response(JSON.stringify({status:1,product:{product_name:'Free Range Eggs',brands:'Sunny Farm, Other',quantity:'700 g',image_url:'https://images/x.jpg'}}),{headers:{'content-type':'application/json'}})};
 const r:any=await lookupBarcode('9300633603256',{fetchFn:f});ok(r.found&&r.name==='Free Range Eggs'&&r.brand==='Sunny Farm'&&r.quantity==='700 g'&&!('image' in r)&&!JSON.stringify(r).includes('images'),'Open Food Facts: name, brand and pack size only — no photo');}
ok((await lookupBarcode('12ab')).error==='bad_code','only 8–14 digit codes');
{const f:any=async()=>new Response(JSON.stringify({status:0}),{headers:{'content-type':'application/json'}});ok((await lookupBarcode('00000000',{fetchFn:f}) as any).found===false,'unknown code: not found');}

// family ops
const getStoreFn=memoryStores(),fixture=await accountFixture(getStoreFn),{cookie}=fixture;
const req=(op:string,body?:any,ck:string|undefined=cookie,q='')=>new Request('https://test.example/.netlify/functions/family?op='+op+q,{method:body?'POST':'GET',headers:{Origin:'https://test.example',...(ck?{Cookie:ck}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const web:any=async(u:string)=>u.includes('openfoodfacts')?new Response(JSON.stringify({status:1,product:{product_name:'Rice Noodles',brands:'TFC',quantity:'400 g'}}),{headers:{'content-type':'application/json'}}):resp(PAGE);
const family=createFamilyHandler({getStoreFn,webFetch:web,webResolve:publicDns});
assert.equal((await family(req('recipe-import',{url:'https://cook.example.com/r'},''))).status,401);ok(true,'recipe import needs a family account');
let res=await family(req('recipe-import',{url:'https://cook.example.com/r'}));const body:any=await res.json();ok(res.status===200&&body.recipe.name.startsWith('Thịt kho')&&body.recipe.source==='https://cook.example.com/r','the family imports a recipe page');
res=await family(req('recipe-import',{url:'http://127.0.0.1/'}));ok(res.status===422&&(await res.json()).reason==='bad_url','a private address is refused with a plain message');
for(let i=0;i<28;i++)await family(req('recipe-import',{url:'https://cook.example.com/r'}));res=await family(req('recipe-import',{url:'https://cook.example.com/r'}));ok(res.status===429,'at most 30 links a day per family (Sydney day)');
res=await family(req('barcode',undefined,cookie,'&code=9300601000000'));const bc:any=await res.json();ok(res.status===200&&bc.found&&bc.name==='Rice Noodles','barcode looked up through the server');
ok((await family(req('barcode',undefined,cookie,'&code=abc'))).status===400,'a bad code is refused');
ok((await family(req('barcode',undefined,'','&code=9300601000000'))).status===401,'barcode lookup needs a family account');
console.log('kitchen import (recipe link, barcode): server checks passed');
