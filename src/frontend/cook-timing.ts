// v1.7.17 — owner, 9 Nov 2026 (Sydney time): “Mình có chức năng báo là ví dụ hôm nay tổng nấu bao nhiêu món thì thời gian nấu và
// thời gian chuẩn bị hết bao lâu thì trước đó báo noti là sẽ cần bao lâu để chuẩn bị và nấu cho bữa tối chưa?”
// Pop-ups: the reminder time comes from the dishes (dinner time − the longest dish − 15 minutes), and family dishes get an optional
// “Chuẩn bị (phút)” next to the cooking time. Nothing is guessed: a dish without a time is named as such.
// The same sum is made by the server for the phone notification (lib/push.mts cookTiming); Today shows it on tonight's dinner.
const COOK_BUFFER_MIN=15,COOK_EARLIEST_MIN=8*60;
function cookTiming(s:any,meal:any,dinnerTime?:string){if(!meal||meal.cooked||!Array.isArray(meal.recipes)||!meal.recipes.length)return null;
 const dishes=meal.recipes.map((r:any)=>{const src=(s?.recipes||[]).find((x:any)=>x.id===r.id)||r;const cook=Number.isFinite(+src.time)&&+src.time>0?Math.round(+src.time):null,prep=Number.isFinite(+src.prepTime)&&+src.prepTime>0?Math.round(+src.prepTime):0;
  return{name:String(src.name||r.name||''),cook,prep,total:cook==null?null:cook+prep}});
 const timed=dishes.filter((d:any)=>d.total!=null),unknown=dishes.length-timed.length;if(!timed.length)return{dishes:dishes.length,unknown,longest:null,sum:0,start:null};
 const longest=timed.reduce((a:any,b:any)=>b.total>a.total?b:a),sum=timed.reduce((n:number,d:any)=>n+d.total,0);
 const [h,m]=String(dinnerTime||'18:30').split(':').map(Number),raw=Math.max(COOK_EARLIEST_MIN,(Number.isFinite(h)?h:18)*60+(Number.isFinite(m)?m:30)-longest.total-COOK_BUFFER_MIN),at=Math.floor(raw/15)*15;
 return{dishes:dishes.length,unknown,longest,sum,start:`${String(Math.floor(at/60)).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`}}
function cookTimingText(t:any){const T=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):vi;if(!t)return '';
 if(!t.start)return T(`${t.dishes} món chưa ghi thời gian nấu — thêm trong Món ăn để app nhắc đúng giờ.`,`No cooking time on ${t.dishes} dish${t.dishes>1?'es':''} yet — add it in Recipes to be reminded on time.`);
 const L=t.longest,split=L.prep?T(` (chuẩn bị ${L.prep} + nấu ${L.cook})`,` (prep ${L.prep} + cook ${L.cook})`):'';
 return T(`Bắt đầu nấu khoảng ${t.start} · ${t.dishes} món, lâu nhất ${L.name} ${L.total} phút${split}${t.unknown?` · ${t.unknown} món chưa ghi thời gian`:''}`,
  `Start cooking around ${t.start} · ${t.dishes} dish${t.dishes>1?'es':''}, longest ${L.name} ${L.total} min${split}${t.unknown?` · ${t.unknown} without a time`:''}`)}
(function(){
 function place(){const main=document.getElementById('main');if(view!=='today'||!main)return;main.querySelector('.cook-timing')?.remove();const today=sydneyDate();
  const card=main.querySelector(`.family-meal-card[data-meal-date="${today}"][data-meal-type="dinner"]`);if(!card)return;
  const meal=typeof mealAt==='function'?mealAt(state,today,'dinner'):null,t=cookTiming(state,meal,state.preferences?.dinnerTime);if(!t)return;
  const head=card.querySelector('.meal-head-text')||card.querySelector('header');if(!head)return;
  const p=document.createElement('p');p.className='cook-timing';p.setAttribute('data-user-content','');p.textContent=cookTimingText(t);head.append(p)}
 {const base=render;render=function(this:any,...a:any[]){const r=base.apply(this,a);try{place()}catch(e){console.warn('cook timing',e)}return r}}
 (globalThis as any).cookTiming=cookTiming;
})();
