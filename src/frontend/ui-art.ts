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
 // v1.7.10 (owner, 7 Nov 2026: “các nút X tắt, đóng, lưu phải thiết kế kiểu riêng biệt bằng artwork”): one picture per meaning —
 // X = dismiss (red-brown cross in a circle), Đóng / Xong = put the sheet away (a chevron down), Lưu = keep it (a green tick)
 'close-x':`${uaCirc(24,24,17,'#f3dcd5')}<path d="M17 17l14 14M31 17L17 31" ${UA_W} stroke-width="4" fill="none"/>`,
 'close-down':`${uaCirc(24,24,17,'#e7eadf')}<path d="M15 20l9 9 9-9" ${UA_W} stroke-width="4" fill="none"/>`,
 'save-check':`${uaCirc(24,24,17,'#8fd0b0')}<path d="M15 25l6 6 12-13" ${UA_W} stroke-width="4" fill="none"/>`,
 // the “cooked” bubble: a pot with steam
 'cooked-pot':`<path d="M18 8c-2 3 2 4 0 7M24 6c-2 3 2 4 0 7M30 8c-2 3 2 4 0 7" ${UA_W} fill="none" class="ua-steam"/><path d="M8 22h32v10a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" fill="#e8a25a" ${UA_W}/><path d="M5 22h38" ${UA_W} fill="none"/><path d="M15 29h18" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".6" fill="none"/>`,
 // v1.7.10 (owner, 7 Nov 2026): every button that sends something to another person (Messages, Messenger, Zalo…) wears this one
 // picture — a chat bubble with an arrow going out — next to the same word “Chia sẻ”
 'share-msg':`<path d="M8 12h22a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H18l-7 6v-6H8a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" fill="#8fd0b0" ${UA_W}/><circle cx="13" cy="22" r="2" fill="#3b2a4f"/><circle cx="19" cy="22" r="2" fill="#3b2a4f"/><circle cx="25" cy="22" r="2" fill="#3b2a4f"/>${uaCirc(36,13,9,'#f6c34a')}<path d="M32 17l8-8M34 9h6v6" ${UA_W} fill="none"/>`,
 // v1.7.10 theme toggle (replaces ☀️ / 🌙 / 🌤️ emoji): a sun, a crescent moon, and "auto" = half sun, half moon
 'theme-light':`<g ${UA_W} stroke-width="2.6"><path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.6 10.6l4.2 4.2M33.2 33.2l4.2 4.2M10.6 37.4l4.2-4.2M33.2 14.8l4.2-4.2" fill="none"/></g><circle cx="24" cy="24" r="9" fill="#f6c34a" ${UA_W}/>`,
 'theme-dark':`<path d="M30 7a17 17 0 1 0 11 27 14 14 0 0 1-11-27z" fill="#8f86c9" ${UA_W}/><circle cx="16" cy="21" r="2" fill="#c9c3ee"/><circle cx="22" cy="31" r="1.6" fill="#c9c3ee"/>`,
 'theme-auto':`<path d="M24 9a15 15 0 0 0 0 30z" fill="#f6c34a" ${UA_W}/><path d="M24 9a15 15 0 0 1 0 30 11 11 0 0 0 0-30z" fill="#8f86c9" ${UA_W}/><path d="M9 6l2 3M5 13l3 1M14 3l1 3" ${UA_W} fill="none"/>`,
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
 // travel time: round clock, hands turn slowly
 clock:`${uaCirc(24,25,18,'#fff6d6')}<g class="ua-spin" style="transform-origin:24px 25px"><path d="M24 25V14" stroke="${UA_O}" stroke-width="3" stroke-linecap="round"/></g><path d="M24 25l7 4" stroke="${UA_O}" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="25" r="2.4" fill="${UA_O}"/>`,
 // trip plan: dotted path from home to a map pin
 route:`<path d="M10 40c6-10 18-4 22-16" fill="none" stroke="#2f7054" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 6"/><path d="M4 40l6-6 6 6v6H4z" fill="#f2d39a" ${UA_W}/><path d="M34 4a9 9 0 0 1 9 9c0 7-9 15-9 15s-9-8-9-15a9 9 0 0 1 9-9z" fill="#e8433a" ${UA_W}/>${uaCirc(34,13,3,'#fff')}`,
 // a stop: little shop with an awning
 shop:`<path d="M8 22h32v20H8z" fill="#fff6d6" ${UA_W}/><path d="M6 12h36l-3 10H9z" fill="#7cc79a" ${UA_W}/><path d="M15 12l-2 10M24 12v10M33 12l2 10" stroke="${UA_O}" stroke-width="2"/><path d="M20 42V31h8v11" fill="#c9e7d3" ${UA_W}/>`,
 // v1.7.5 grocery items with no supermarket photo and no ingredient drawing (owner: draw only what has no photo)
 'item:gia':`<path d="M8 30h32l-3 12H11z" fill="#e8f3e0" ${UA_W}/><path d="M14 30c0-10 4-18 8-22M22 30c0-9 2-17 6-21M30 30c0-8 3-14 8-17" fill="none" stroke="#f6efcf" stroke-width="5" stroke-linecap="round"/><path d="M14 30c0-10 4-18 8-22M22 30c0-9 2-17 6-21M30 30c0-8 3-14 8-17" fill="none" ${UA_W}/>${uaCirc(22,8,3,'#d9e86a')}${uaCirc(28,9,3,'#d9e86a')}${uaCirc(38,13,3,'#d9e86a')}`,
 'item:hanh-tim':`<path d="M24 8c10 6 16 14 16 22a16 14 0 0 1-32 0c0-8 6-16 16-22z" fill="#b05a8a" ${UA_W}/><path d="M24 12v30M17 18c-3 6-3 16 0 22M31 18c3 6 3 16 0 22" stroke="#e7a8c8" stroke-width="2" fill="none"/><path d="M22 6l2-4 2 4" ${UA_W} fill="none"/>`,
 'item:thit-heo-xay':`<path d="M6 30h36l-4 12H10z" fill="#fff" ${UA_W}/><path d="M10 30c0-10 6-16 14-16s14 6 14 16z" fill="#f29a9a" ${UA_W}/><path d="M15 24h3M22 20h3M28 25h3M19 28h3M31 20h2" stroke="#c85a5a" stroke-width="2.4" stroke-linecap="round"/>`,
 'item:bo-pho':`<path d="M8 16h32v20H8z" fill="#d9545a" ${UA_W}/><path d="M10 20l28 4M10 27l28 3M10 33l28 1" stroke="#ffd2d2" stroke-width="2" fill="none"/><path d="M4 40h40" ${UA_W}/>`,
 'item:cha-lua':`${uaCirc(24,24,18,'#f2e6c4')}${uaCirc(24,24,11,'#f7efd8')}<path d="M6 24h36" stroke="#7cb35b" stroke-width="3" opacity=".7"/><path d="M10 12c6 4 22 4 28 0" stroke="#7cb35b" stroke-width="3" fill="none"/>`,
 'item:lap-xuong':`<path d="M8 30c4-14 28-20 34-10" fill="none" stroke="${UA_O}" stroke-width="11" stroke-linecap="round"/><path d="M8 30c4-14 28-20 34-10" fill="none" stroke="#c8363c" stroke-width="6" stroke-linecap="round"/><path d="M16 24l2 2M24 20l2 2M32 19l2 2" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M6 32l-2 4M42 18l2-4" ${UA_W}/>`,
 'item:ca-thu':`<path d="M6 24c8-10 22-12 32-4l6-6v20l-6-6c-10 8-24 6-32-4z" fill="#7f9cc0" ${UA_W}/><path d="M14 20l4 4-4 4M22 18l4 6-4 6M30 19l3 5-3 5" stroke="#3e5f86" stroke-width="2" fill="none"/>${uaCirc(11,23,1.8,UA_O)}`,
 'item:muc':`<path d="M24 4c8 6 10 14 8 22H16c-2-8 0-16 8-22z" fill="#f3c9b8" ${UA_W}/><path d="M17 26c-2 8-6 12-8 16M21 26c0 8-2 12-4 16M27 26c0 8 2 12 4 16M31 26c2 8 6 12 8 16" fill="none" ${UA_W}/>${uaCirc(20,18,1.8,UA_O)}${uaCirc(28,18,1.8,UA_O)}`,
 'item:duong-phen':`<path d="M10 22l8-8 10 4-2 12-12 2z" fill="#f6edc4" ${UA_W}/><path d="M24 32l8-6 8 6-4 10H28z" fill="#fbf4d8" ${UA_W}/><path d="M14 20l6 2M30 32l4 2" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
 'item:bot-ngot':`<path d="M12 10h24v30a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#fff" ${UA_W}/><path d="M12 18h24v12H12z" fill="#e8433a" ${UA_W}/><path d="M18 36l2-2 2 2 2-2 2 2 2-2 2 2" stroke="#c9ccc4" stroke-width="2" fill="none"/>`,
 'item:bun-kho':`<rect x="8" y="12" width="32" height="26" rx="4" fill="#fffaf0" ${UA_W}/><path d="M12 18c4 4 8-4 12 0s8-4 12 0M12 25c4 4 8-4 12 0s8-4 12 0M12 32c4 4 8-4 12 0s8-4 12 0" fill="none" stroke="#d9c9a0" stroke-width="2.4"/>`,
 'item:rong-bien':`<rect x="8" y="10" width="32" height="28" rx="3" fill="#2f4a3a" ${UA_W}/><path d="M8 20h32M8 29h32" stroke="#5d7d66" stroke-width="2"/><path d="M14 14l3 3M28 33l3 3" stroke="#7fa38a" stroke-width="2" stroke-linecap="round"/>`,
 'item:finish-tablets':`<rect x="6" y="12" width="36" height="26" rx="4" fill="#2f6fd6" ${UA_W}/><rect x="14" y="18" width="20" height="14" rx="3" fill="#fff" ${UA_W}/><path d="M14 25h20" stroke="#e8433a" stroke-width="3"/>${uaCirc(24,25,3,'#ffd23f')}`,
 'item:nuoc-lau-san':`<path d="M18 6h10v6l6 6v24a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V18l4-6z" fill="#7cd0e8" ${UA_W}/><path d="M14 24h20v12H14z" fill="#fff" ${UA_W}/><path d="M18 30c2-2 4 2 6 0s4 2 6 0" stroke="#2f8fb0" stroke-width="2" fill="none"/>`,
 // open (row → history): chevron
 chevron:`<path d="M18 10l14 14-14 14" fill="none" stroke="${UA_O}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
};
// store marks: a round badge in the retailer's colour (no logos)
const UA_STORE:Record<string,string>={woolworths:'#4caf6e',coles:'#e8433a',aldi:'#2f6fd6',chemist:'#e83a8a','viet-grocer':'#ffb84d',amazon:'#ff9a3d',other:'#9aa39b'};
function uiArt(name:string,cls=''){if(name.startsWith('store:')){const c=UA_STORE[name.slice(6)]||UA_STORE.other;return uaSvg(`${uaCirc(24,24,16,c)}<path d="M17 21c4-5 10-5 14 0" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".75"/>`,cls)}const b=UI_ART[name];return b?uaSvg(b,cls):''}
(globalThis as any).uiArt=uiArt;
