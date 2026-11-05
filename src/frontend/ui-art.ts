'use strict';
// v1.7.5 FamTray's own interface pictures (owner rule 19, AGENTS.md): drawn icons instead of phone emoji, in ONE style
// shared with the tpn repo's art kit (js/art/kit.ts): 48×48 viewBox, chunky shapes, soft dark outline #3b2a4f 2.6 px,
// round joins. Decorative: aria-hidden, the words next to them carry the meaning. Small motions (flame flicker, arrow
// nudge) are CSS (.ui-art .ua-*) and stop under prefers-reduced-motion.
//   uiArt('cart') → '<svg class="ui-art …">…</svg>'  ·  a new picture gets a new drawing, never a borrowed one.
const UA_O='#3b2a4f',UA_W=`stroke="${UA_O}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const uaSvg=(body:string,cls='')=>`<svg class="ui-art ${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;
const uaCirc=(x:number,y:number,r:number,f:string)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${UA_W}/>`;
const UI_ART:Record<string,string>={
 // shopping trolley: green basket, two wheels
 cart:`<path d="M4 8h6l5 22h22l5-16H13" fill="none" ${UA_W}/><path d="M13 14h29l-5 16H15z" fill="#7cc79a" ${UA_W}/><path d="M20 18v8M27 18v8M34 18v8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>${uaCirc(18,38,4,'#fff6d6')}${uaCirc(34,38,4,'#fff6d6')}`,
 // real deal: flame (flickers)
 flame:`<g class="ua-flicker" style="transform-origin:24px 44px"><path d="M24 4c4 8 14 12 14 24a14 14 0 0 1-28 0c0-7 4-11 7-14 0 5 2 8 5 9-1-7 0-13 2-19z" fill="#ff8a3d" ${UA_W}/><path d="M24 24c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 1-8z" fill="#ffd23f" ${UA_W}/></g>`,
 // not a real deal: warning triangle
 warn:`<path d="M24 5L44 41H4z" fill="#ffb84d" ${UA_W}/><path d="M24 17v12" stroke="${UA_O}" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="35" r="2.6" fill="${UA_O}"/>`,
 // special, not checked yet: price tag with a hole
 tag:`<path d="M6 8h18l18 18-16 16L8 24z" fill="#f2d39a" ${UA_W}/>${uaCirc(15,15,3.2,'#fff')}<path d="M20 28l8-8M24 32l8-8" stroke="#c9a24a" stroke-width="2.4" stroke-linecap="round"/>`,
 // lowest price: green arrow down onto a line (nudges)
 down:`<g class="ua-nudge-down"><path d="M24 4v22" stroke="${UA_O}" stroke-width="9" stroke-linecap="round"/><path d="M24 4v22" stroke="#4caf6e" stroke-width="5" stroke-linecap="round"/><path d="M12 22l12 14 12-14z" fill="#4caf6e" ${UA_W}/></g><path d="M8 43h32" ${UA_W}/>`,
 // above usual: amber arrow up (nudges)
 up:`<path d="M8 43h32" ${UA_W}/><g class="ua-nudge-up"><path d="M24 40V18" stroke="${UA_O}" stroke-width="9" stroke-linecap="round"/><path d="M24 40V18" stroke="#e0a030" stroke-width="5" stroke-linecap="round"/><path d="M12 22L24 8l12 14z" fill="#e0a030" ${UA_W}/></g>`,
 // price history: card with a line chart and an orange special dot
 chart:`<rect x="5" y="7" width="38" height="34" rx="5" fill="#fff" ${UA_W}/><path d="M11 31l8-8 6 5 7-10 6 4" fill="none" stroke="#2f7054" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${uaCirc(38,22,3.4,'#ff8a3d')}<path d="M11 36h26" stroke="#c9ccc4" stroke-width="2" stroke-linecap="round"/>`,
 // open (row → history): chevron
 chevron:`<path d="M18 10l14 14-14 14" fill="none" stroke="${UA_O}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
};
// store marks: a round badge in the retailer's colour (no logos)
const UA_STORE:Record<string,string>={woolworths:'#4caf6e',coles:'#e8433a',aldi:'#2f6fd6',chemist:'#e83a8a','viet-grocer':'#ffb84d',amazon:'#ff9a3d',other:'#9aa39b'};
function uiArt(name:string,cls=''){if(name.startsWith('store:')){const c=UA_STORE[name.slice(6)]||UA_STORE.other;return uaSvg(`${uaCirc(24,24,16,c)}<path d="M17 21c4-5 10-5 14 0" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".75"/>`,cls)}const b=UI_ART[name];return b?uaSvg(b,cls):''}
(globalThis as any).uiArt=uiArt;
