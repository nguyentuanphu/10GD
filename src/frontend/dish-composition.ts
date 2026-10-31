'use strict';
// Ingredient-led companion illustrations. No implied side rice or unrelated protein.
function dishCompositionModel(r){
 const ids=(r?.ingredients||[]).map(i=>i.id),name=normalizeText(r?.name||'');
 const porridge=ids.includes('cookedRice')||/^chao\b/.test(name);
 const pasta=ids.includes('pasta'),dryPasta=pasta&&(/mi y|bolognese/.test(name));
 const liquid=!dryPasta&&(r?.category==='soup'||r?.category==='noodle');
 const visible=ids.filter(id=>['pork','ribs','chicken','cookedChicken','beef','salmon','fish','shrimp','tofu','egg','spinach','waterSpinach','cabbage','bokchoy','broccoli','carrot','potato','pumpkin','gourd','tomato','cucumber','mushroom','onion','pineapple','okra','bean','corn','peas','wonton','fishBall','seaweed'].includes(id));
 return {ids,name,porridge,pasta,dryPasta,liquid,visible,omelette:ids.includes('egg')&&/chien|omelette/.test(name),noodle:ids.find(id=>['noodle','riceNoodle','eggNoodle','vermicelli','udon','huTieu','banhCanh'].includes(id))};
}
function composedDishArtwork(r){
 const m=dishCompositionModel(r);let shapes='';
 const ellipse=(x,y,rx,ry,fill)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
 const piece=(id,x,y,j)=>{
 const colors={pork:'#b57754',ribs:'#a9633e',chicken:'#d9ad6d',cookedChicken:'#e9d0a0',beef:'#92553e',salmon:'#e69872',fish:'#d8c6a3',tofu:'#f1dfb0',carrot:'#e69a4e',potato:'#e0c48a',pumpkin:'#df9b3c',gourd:'#c8d7a0',tomato:'#c96b46',cucumber:'#88a36a',onion:'#ddc9a6',pineapple:'#ddbf69',okra:'#789951',corn:'#e7c865',peas:'#83a361',fishBall:'#ded0b2',wonton:'#d9b866',cabbage:'#b3c18b'};
 let s='';
 if(id==='shrimp')s='<path d="M-10-7C11-18 22 7 5 14C-9 20-20 4-10-7M-8-3Q-11 7 1 9" fill="none" stroke="#dd966c" stroke-width="8" stroke-linecap="round"/><path d="M7-11l6 7M13-3l-6 3M13 5l-7-1" stroke="#f2c294" stroke-width="2"/>';
 else if(id==='egg')s=ellipse(0,0,16,20,'#f5ead0')+ellipse(0,3,8,10,'#dcb65d');
 else if(id==='mushroom')s='<path d="M-3 0h7l4 17H-5z" fill="#e3cfac"/><path d="M-17 1Q-15-21 2-17Q18-14 17 1z" fill="#a48a65"/><path d="M-13 2h26" stroke="#d3bb96" stroke-width="3"/>';
 else if(id==='broccoli')s='<path d="M-3 3h7l4 19H-6z" fill="#97ac70"/>'+[-10,0,10].map((a,k)=>ellipse(a,k%2?-9:-3,10,10,['#688851','#4e794c','#789553'][k])).join('');
 else if(['spinach','waterSpinach','bokchoy','seaweed','bean'].includes(id))s=ellipse(0,0,id==='bean'?4:10,20,id==='seaweed'?'#4b6750':'#6b8d53')+'<path d="M0-12v33" stroke="#b3c494" stroke-width="3"/>';
 else if(['beef','pork'].includes(id)&&/bam|bolognese/.test(m.name))s=Array.from({length:9},(_,k)=>ellipse(-12+k*11%24,-8+k*7%19,4,3,colors[id])).join('');
 else if(id==='ribs')s='<rect x="-16" y="-11" width="32" height="24" rx="9" fill="#aa724e"/><path d="M-17 0h34" stroke="#ead5b1" stroke-width="6" stroke-linecap="round"/>';
 else if(id==='cookedChicken')s='<path d="M-14-8l27 5-21 16 4-9-13 2z" fill="#e8d0a1"/><path d="M-7-2l13-1" stroke="#bd9967" stroke-width="2"/>';
 else if(id==='salmon'||id==='fish')s=`<path d="M-18-8Q2-20 20-3L11 14-17 12z" fill="${colors[id]}"/><path d="M-9-8l15 18M0-11l15 17" stroke="#f4ddb6" fill="none" stroke-width="2"/>`;
 else s=`<rect x="-14" y="-10" width="28" height="21" rx="${['peas','fishBall'].includes(id)?11:5}" fill="${colors[id]||'#a6b37e'}"/><path d="M-8-5l12-1" stroke="#fff5d9" stroke-width="2" opacity=".45"/>`;
 return `<g data-food="${id}" transform="translate(${x} ${y}) rotate(${j*29%70-35})">${s}</g>`;
 };
 const base=m.liquid?(m.porridge?'#e6d9ba':m.ids.includes('tomato')?'#d8ad78':m.ids.includes('pumpkin')?'#deb15f':'#dcc895'):'#ede8d5';
 shapes+=ellipse(150,155,112,69,'#d6cfb7')+ellipse(150,144,113,72,'#faf5e7')+ellipse(150,144,99,59,base);
 if(m.noodle)for(let i=0;i<13;i++)shapes+=`<path data-food="${m.noodle}" d="M${87+i*3} ${123+i*3}q42-29 82-3t-64 20" fill="none" stroke="${m.noodle==='eggNoodle'?'#e6c780':'#f4e8ce'}" stroke-width="${m.noodle==='udon'||m.noodle==='banhCanh'?5:m.noodle==='vermicelli'?1.5:3}" stroke-linecap="round"/>`;
 if(m.dryPasta){for(let i=0;i<27;i++)shapes+=`<path data-food="pasta" d="M${82+i*3} ${117+i%5*8}q69-35 69 8t-55 25q-29-15 27-27" fill="none" stroke="#d6b66f" stroke-width="3" stroke-linecap="round"/>`;shapes+=ellipse(150,140,52,31,'#bb724b');}
 if(m.pasta&&!m.dryPasta)for(let i=0;i<18;i++){let x=90+i*31%115,y=110+i*17%64;shapes+=`<path data-food="pasta" d="M${x} ${y}q-10 10 4 16" fill="none" stroke="#dfc588" stroke-width="7"/>`;}
 if(m.porridge)for(let i=0;i<45;i++)shapes+=`<path data-food="cookedRice" d="M${77+i*31%143} ${110+i*19%65}l4 1" stroke="#f6ebd3" stroke-width="2" stroke-linecap="round"/>`;
 if(m.omelette)shapes+=`<path data-food="egg" d="M69 141Q86 87 177 100Q226 115 225 151Q165 196 79 163z" fill="#dfbd65" stroke="#bb8f46" stroke-width="3"/>`;
 // Each visible ingredient receives its own region and recognizable silhouette.
 const visible=m.visible.filter(id=>!m.omelette||id!=='egg');
 visible.forEach((id,k)=>{const a=k*2.399,rad=visible.length===1?0:Math.min(52,26+k*4),cx=150+Math.cos(a)*rad,cy=141+Math.sin(a)*rad*.65;for(let j=0;j<(visible.length>5?2:3);j++)shapes+=piece(id,Math.round(cx+(j-1)*15),Math.round(cy+(j%2?10:-5)),j+k);});
 if(m.ids.includes('scallion'))for(let i=0;i<9;i++)shapes+=`<rect x="${106+i*37%86}" y="${119+i*17%43}" width="4" height="3" rx="1" fill="#729252"/>`;
 const en=typeof appLanguage!=='undefined'&&appLanguage==='en';const label=(en?'Ingredient illustration: ':'Minh họa thành phần: ')+(r?.name||'');
 return `<svg class="food-illustration composed-dish" viewBox="0 0 300 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}"><rect width="300" height="280" fill="#fffefa"/>${ellipse(150,215,91,8,'#eeeadd')}${shapes}<path d="M52 133q-4 22 10 38" fill="none" stroke="#fffdf5" stroke-width="4" opacity=".7"/></svg>`;
}
