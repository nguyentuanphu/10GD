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
 // v1.7.11 (owner, 7 Nov 2026: “Thiết kế các nút phải có emoji artwork”): one drawing per meaning for every button, chip and tab
 'add':`${uaCirc(24,24,17,'#8fd0b0')}<path d="M24 15v18M15 24h18" ${UA_W} stroke-width="4" fill="none"/>`,
 // v1.7.12: one fewer (guest counter −), its own drawing next to 'add'
 'minus':`${uaCirc(24,24,17,'#f3c9a6')}<path d="M15 24h18" ${UA_W} stroke-width="4" fill="none"/>`,
 'edit':`<path d="M12 36l3-10 17-17 7 7-17 17z" fill="#f6c34a" ${UA_W}/><path d="M29 12l7 7" ${UA_W} fill="none"/><path d="M12 36l3-10 7 7z" fill="#f3dcd5" ${UA_W}/>`,
 'trash':`<path d="M14 15h20l-2 23H16z" fill="#f3dcd5" ${UA_W}/><path d="M10 15h28M19 15v-4h10v4M20 21v12M28 21v12" ${UA_W} fill="none"/>`,
 'skip':`${uaCirc(24,24,16,'#e7eadf')}<path d="M14 34L34 14" ${UA_W} stroke-width="4" fill="none"/>`,
 'cook-mode':`<path d="M14 26c-5 0-7-6-3-9 0-6 7-8 10-4 3-4 10-3 11 2 5 0 7 7 2 10v9H14z" fill="#fffefa" ${UA_W}/><path d="M14 30h20" ${UA_W} fill="none"/>`,
 'calendar':`<rect x="9" y="12" width="30" height="27" rx="5" fill="#fffefa" ${UA_W}/><path d="M9 20h30" ${UA_W}/><path d="M17 8v7M31 8v7" ${UA_W} fill="none"/><rect x="15" y="25" width="6" height="5" rx="1" fill="#e8a25a"/>`,
 'busy':`${uaCirc(24,25,15,'#9cc9e8')}<path d="M24 17v8l6 4" ${UA_W} fill="none"/><path d="M15 9l-4 4M33 9l4 4" ${UA_W} fill="none"/>`,
 'arrow-left':`${uaCirc(24,24,17,'#e7eadf')}<path d="M27 15l-9 9 9 9" ${UA_W} stroke-width="4" fill="none"/>`,
 'arrow-right':`${uaCirc(24,24,17,'#e7eadf')}<path d="M21 15l9 9-9 9" ${UA_W} stroke-width="4" fill="none"/>`,
 'arrow-up':`${uaCirc(24,24,17,'#e7eadf')}<path d="M15 27l9-9 9 9" ${UA_W} stroke-width="4" fill="none"/>`,
 'arrow-down':`${uaCirc(24,24,17,'#e7eadf')}<path d="M15 21l9 9 9-9" ${UA_W} stroke-width="4" fill="none"/>`,
 'round-up':`${uaCirc(24,24,19,'#e7eadf')}<path d="M10 30c4-12 24-12 28 0" ${UA_W} fill="none"/><path d="M24 34V14M17 21l7-7 7 7" ${UA_W} stroke-width="3.4" fill="none"/>`,
 'round-down':`${uaCirc(24,24,19,'#e7eadf')}<path d="M10 18c4 12 24 12 28 0" ${UA_W} fill="none"/><path d="M24 14v20M17 27l7 7 7-7" ${UA_W} stroke-width="3.4" fill="none"/>`,
 'plan-week':`<rect x="8" y="12" width="32" height="26" rx="5" fill="#fffefa" ${UA_W}/><path d="M8 20h32" ${UA_W}/><path d="M33 4l1.8 4.2L39 10l-4.2 1.8L33 16l-1.8-4.2L27 10l4.2-1.8z" fill="#f6c34a" ${UA_W} stroke-width="2"/><path d="M14 27h6M14 32h12" ${UA_W} fill="none"/>`,
 'repeat':`${uaCirc(24,24,19,'#d8ecf7')}<path d="M12 22a12 12 0 0 1 21-7l3 3M36 26a12 12 0 0 1-21 7l-3-3" ${UA_W} fill="none"/><path d="M36 10v8h-8M12 38v-8h8" ${UA_W} fill="none"/>`,
 'book':`<path d="M8 12c6-3 11-3 16 1v25c-5-4-10-4-16-1z" fill="#9cc9e8" ${UA_W}/><path d="M40 12c-6-3-11-3-16 1v25c5-4 10-4 16-1z" fill="#fffefa" ${UA_W}/>`,
 'taste':`<path d="M24 38S9 29 9 19a7 7 0 0 1 15-3 7 7 0 0 1 15 3c0 10-15 19-15 19z" fill="#f3a3a0" ${UA_W}/>`,
 'tools':`<path d="M30 9a8 8 0 0 0-9 11L9 32l7 7 12-12a8 8 0 0 0 11-9l-5 5-5-1-1-5z" fill="#c9a27a" ${UA_W}/>`,
 'note':`<path d="M12 8h18l7 7v25H12z" fill="#fffefa" ${UA_W}/><path d="M30 8v7h7M17 22h14M17 28h14M17 34h9" ${UA_W} fill="none"/>`,
 'receipt':`<path d="M12 7h24v34l-4-3-4 3-4-3-4 3-4-3-4 3z" fill="#fffefa" ${UA_W}/><path d="M17 15h14M17 21h14M17 27h8" ${UA_W} fill="none"/>`,
 'store':`<path d="M9 19l3-10h24l3 10z" fill="#e8a25a" ${UA_W}/><path d="M11 19h26v19H11z" fill="#fffefa" ${UA_W}/><path d="M20 38V28h8v10" ${UA_W} fill="none"/>`,
 'request':`<path d="M24 8c-6 0-10 4-10 10v8l-4 6h28l-4-6v-8c0-6-4-10-10-10z" fill="#f6c34a" ${UA_W}/><path d="M20 36a4 4 0 0 0 8 0" ${UA_W} fill="none"/><path d="M19 20h10" ${UA_W} fill="none"/>`,
 'fridge':`<rect x="13" y="6" width="22" height="36" rx="4" fill="#9cc9e8" ${UA_W}/><path d="M13 19h22M17 11v4M17 23v6" ${UA_W} fill="none"/>`,
 'freezer':`${uaCirc(24,24,17,'#d8ecf7')}<path d="M24 12v24M14 18l20 12M34 18L14 30" ${UA_W} fill="none"/>`,
 'shelf':`<path d="M8 38h32M8 24h32" ${UA_W} fill="none"/><rect x="11" y="12" width="9" height="12" rx="2" fill="#e8a25a" ${UA_W}/><rect x="25" y="15" width="8" height="9" rx="2" fill="#f6c34a" ${UA_W}/><rect x="14" y="28" width="10" height="10" rx="2" fill="#8fd0b0" ${UA_W}/>`,
 'family':`${uaCirc(17,17,6,'#f6c34a')}${uaCirc(31,17,6,'#f3a3a0')}<path d="M7 38c0-8 4-13 10-13s10 5 10 13M21 38c0-8 4-13 10-13s10 5 10 13" fill="#8fd0b0" ${UA_W}/>`,
 'guide':`${uaCirc(24,24,17,'#fffefa')}<path d="M28 20l-6 3-2 8 6-3z" fill="#e8a25a" ${UA_W}/><path d="M24 7v4M24 37v4M7 24h4M37 24h4" ${UA_W} fill="none"/>`,
 'weather':`${uaCirc(18,18,8,'#f6c34a')}<path d="M16 38h18a6 6 0 0 0 0-12 9 9 0 0 0-17 2 5 5 0 0 0-1 10z" fill="#fffefa" ${UA_W}/>`,
 'urgent':`<path d="M24 7L4 40h40z" fill="#f3a3a0" ${UA_W}/><path d="M24 18v11" ${UA_W} stroke-width="4" fill="none"/>${uaCirc(24,34,2,'#3b2a4f')}`,
 // v1.7.15 kitchen extras: a link with an arrow into a page (import a recipe), a barcode
 'link-in':`<rect x="20" y="16" width="22" height="26" rx="4" fill="#fffefa" ${UA_W}/><path d="M25 25h12M25 31h12M25 37h8" ${UA_W} fill="none" stroke-width="2.2"/><path d="M8 10a5 5 0 0 1 7 0l3 3a5 5 0 0 1 0 7" ${UA_W} fill="none"/><path d="M14 16l-4-4" ${UA_W} fill="none"/><path d="M6 22h11v-11" ${UA_W} fill="none" stroke-width="3"/>`,
 'barcode':`<rect x="6" y="10" width="36" height="28" rx="5" fill="#fffefa" ${UA_W}/><path d="M12 16v16M16 16v16M19 16v16M24 16v16M27 16v16M31 16v16M36 16v16" stroke="#3b2a4f" stroke-width="2.4" stroke-linecap="round"/><path d="M4 24h40" stroke="#e05d5d" stroke-width="2" stroke-linecap="round"/>`,
 // v1.7.15 install guide: iOS share (box + up arrow), add (plus in a rounded square), menu (three dots), home screen + app
 'share-up':`<path d="M14 20h-2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3V23a3 3 0 0 0-3-3h-2" fill="#d8ecf7" ${UA_W}/><path d="M24 30V7M16 15l8-8 8 8" ${UA_W} stroke-width="3.2" fill="none"/>`,
 'plus-square':`<rect x="8" y="8" width="32" height="32" rx="9" fill="#e7eadf" ${UA_W}/><path d="M24 16v16M16 24h16" ${UA_W} stroke-width="3.4" fill="none"/>`,
 'dots-v':`${uaCirc(24,24,18,'#e7eadf')}${uaCirc(24,14,3,'#3b2a4f')}${uaCirc(24,24,3,'#3b2a4f')}${uaCirc(24,34,3,'#3b2a4f')}`,
 'home-add':`<rect x="12" y="4" width="24" height="40" rx="5" fill="#fffefa" ${UA_W}/><rect x="17" y="12" width="6" height="6" rx="1.6" fill="#8fd0b0" ${UA_W} stroke-width="1.8"/><rect x="25" y="12" width="6" height="6" rx="1.6" fill="#f6c34a" ${UA_W} stroke-width="1.8"/><rect x="17" y="21" width="6" height="6" rx="1.6" fill="#9cc9e8" ${UA_W} stroke-width="1.8"/>${uaCirc(34,34,8,'#2f7a5d')}<path d="M34 30v8M30 34h8" stroke="#fffefa" stroke-width="2.6" stroke-linecap="round"/>`,
 'download':`${uaCirc(24,24,19,'#d8ecf7')}<path d="M24 8v20M15 20l9 9 9-9" ${UA_W} stroke-width="3.4" fill="none"/><path d="M10 32v6h28v-6" ${UA_W} fill="none"/>`,
 'upload':`${uaCirc(24,24,19,'#d8ecf7')}<path d="M24 30V10M15 18l9-9 9 9" ${UA_W} stroke-width="3.4" fill="none"/><path d="M10 32v6h28v-6" ${UA_W} fill="none"/>`,
 'money':`<rect x="7" y="13" width="34" height="22" rx="4" fill="#8fd0b0" ${UA_W}/>${uaCirc(24,24,6,'#f6c34a')}`,
 'mic':`<rect x="18" y="7" width="12" height="21" rx="6" fill="#9cc9e8" ${UA_W}/><path d="M12 22a12 12 0 0 0 24 0M24 34v6M18 40h12" ${UA_W} fill="none"/>`,
 'bell':`<path d="M24 8c-6 0-10 4-10 10v8l-4 6h28l-4-6v-8c0-6-4-10-10-10z" fill="#9cc9e8" ${UA_W}/><path d="M20 36a4 4 0 0 0 8 0" ${UA_W} fill="none"/>`,
 'search':`${uaCirc(21,21,11,'#d8ecf7')}<path d="M29 29l10 10" ${UA_W} stroke-width="4" fill="none"/>`,
 'paste':`<rect x="11" y="10" width="26" height="31" rx="4" fill="#c9a27a" ${UA_W}/><rect x="17" y="6" width="14" height="8" rx="3" fill="#fffefa" ${UA_W}/><path d="M17 24h14M17 30h10" ${UA_W} fill="none"/>`,
 'more':`${uaCirc(24,24,17,'#e7eadf')}${uaCirc(16,24,2,'#3b2a4f')}${uaCirc(24,24,2,'#3b2a4f')}${uaCirc(32,24,2,'#3b2a4f')}`,
 'meal-plan':`<ellipse cx="24" cy="28" rx="17" ry="10" fill="#fffefa" ${UA_W}/><ellipse cx="24" cy="27" rx="9" ry="5" fill="#e7eadf" ${UA_W}/><path d="M36 6v10M31 11h10" ${UA_W} stroke-width="3" fill="none"/>`,
 'idea':`<path d="M24 7a12 12 0 0 0-7 22v5h14v-5a12 12 0 0 0-7-22z" fill="#f6c34a" ${UA_W}/><path d="M19 39h10" ${UA_W} fill="none"/>`,
 'account':`${uaCirc(24,17,8,'#f6c34a')}<path d="M10 40c0-9 6-14 14-14s14 5 14 14z" fill="#9cc9e8" ${UA_W}/>`,
 'thumb-up':`<path d="M10 22h6v17h-6z" fill="#8fd0b0" ${UA_W}/><path d="M16 22l7-13c3 0 5 2 4 6l-1 5h9c3 0 4 3 3 5l-3 11c-1 2-2 3-4 3H16z" fill="#fffefa" ${UA_W}/>`,
 'thumb-down':`<path d="M10 9h6v17h-6z" fill="#f3a3a0" ${UA_W}/><path d="M16 26l7 13c3 0 5-2 4-6l-1-5h9c3 0 4-3 3-5l-3-11c-1-2-2-3-4-3H16z" fill="#fffefa" ${UA_W}/>`,
 'whole-family':`${uaCirc(14,20,5,'#f6c34a')}${uaCirc(24,16,6,'#f3a3a0')}${uaCirc(34,20,5,'#9cc9e8')}<path d="M6 38c0-7 3-11 8-11M42 38c0-7-3-11-8-11M14 38c0-9 4-14 10-14s10 5 10 14z" fill="#8fd0b0" ${UA_W}/>`,
 'unit':`<path d="M12 18h24l-3 20H15z" fill="#d8ecf7" ${UA_W}/><path d="M17 26h6M17 31h4" ${UA_W} fill="none"/>`,
 'meal-breakfast':`<path d="M6 34h36" ${UA_W} fill="none"/><path d="M12 34a12 12 0 0 1 24 0z" fill="#f6c34a" ${UA_W}/><path d="M24 10v6M11 17l4 4M37 17l-4 4" ${UA_W} fill="none"/>`,
 'meal-lunch':`${uaCirc(24,24,9,'#f6c34a')}<path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3 3M34 34l3 3M11 37l3-3M34 14l3-3" ${UA_W} fill="none"/>`,
 'meal-dinner':`<path d="M30 7a16 16 0 1 0 11 26 13 13 0 0 1-11-26z" fill="#8f86c9" ${UA_W}/>`,
 'meal-snack-am':`<path d="M24 14c-8-4-15 2-14 11 1 10 8 16 14 13 6 3 13-3 14-13 1-9-6-15-14-11z" fill="#f3a3a0" ${UA_W}/><path d="M24 14c0-4 2-6 5-7" ${UA_W} fill="none"/>`,
 'meal-snack':`<path d="M12 18h24l-2 20H14z" fill="#e8a25a" ${UA_W}/><path d="M16 18c0-6 4-9 8-9s8 3 8 9" ${UA_W} fill="none"/>`,
 'chip-all':`<rect x="8" y="8" width="13" height="13" rx="3" fill="#8fd0b0" ${UA_W}/><rect x="27" y="8" width="13" height="13" rx="3" fill="#f6c34a" ${UA_W}/><rect x="8" y="27" width="13" height="13" rx="3" fill="#9cc9e8" ${UA_W}/><rect x="27" y="27" width="13" height="13" rx="3" fill="#f3a3a0" ${UA_W}/>`,
 'dish-main':`<ellipse cx="24" cy="30" rx="18" ry="9" fill="#fffefa" ${UA_W}/><path d="M14 27c2-7 18-7 20 0z" fill="#c97a4a" ${UA_W}/>`,
 'dish-veg':`<path d="M10 38C10 20 22 9 38 10c1 16-10 28-28 28z" fill="#8fd0b0" ${UA_W}/><path d="M10 38L28 20" ${UA_W} fill="none"/>`,
 'dish-soup':`<path d="M8 24h32a16 14 0 0 1-32 0z" fill="#e8a25a" ${UA_W}/><path d="M18 8c-2 3 2 5 0 9M26 8c-2 3 2 5 0 9" ${UA_W} fill="none"/>`,
 'dish-noodle':`<path d="M8 24h32a16 14 0 0 1-32 0z" fill="#f6c34a" ${UA_W}/><path d="M30 6L20 24M38 8L26 24" ${UA_W} fill="none"/>`,
 'dish-dessert':`<path d="M12 22h24l-4 16H16z" fill="#f3a3a0" ${UA_W}/><path d="M14 22a10 10 0 0 1 20 0" fill="#fffefa" ${UA_W}/>${uaCirc(24,10,3,'#e05a5a')}`,
 'dish-lunchbox':`<rect x="7" y="16" width="34" height="22" rx="4" fill="#9cc9e8" ${UA_W}/><path d="M7 25h34M24 25v13" ${UA_W} fill="none"/>`,
 'tag-western':`${uaCirc(24,24,19,'#f6e7c1')}<path d="M14 6v14a4 4 0 0 0 8 0V6M18 6v36" ${UA_W} fill="none"/><path d="M30 6c6 2 6 14 0 16v20" ${UA_W} fill="none"/>`,
 'tag-healthy':`<path d="M24 38S9 29 9 19a7 7 0 0 1 15-3 7 7 0 0 1 15 3c0 10-15 19-15 19z" fill="#8fd0b0" ${UA_W}/><path d="M17 23h5l2-5 3 9 2-4h4" ${UA_W} fill="none"/>`,
 'tag-vegetarian':`<path d="M24 40V22" ${UA_W} fill="none"/><path d="M24 24C14 24 10 16 12 8c8 0 13 6 12 16z" fill="#8fd0b0" ${UA_W}/><path d="M24 30c8 0 13-6 12-14-8 0-12 6-12 14z" fill="#b9e3c9" ${UA_W}/>`,
 'tag-vegan':`<path d="M24 40V24" ${UA_W} fill="none"/><path d="M24 26c-9 0-13-8-11-15 8 0 12 7 11 15zM24 26c9 0 13-8 11-15-8 0-12 7-11 15z" fill="#5fb88a" ${UA_W}/>`,
 'tag-dressing':`<path d="M20 6h8v6l4 6v20a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V18l4-6z" fill="#f6c34a" ${UA_W}/><path d="M16 26h16" ${UA_W} fill="none"/>`,
 'tag-noodle':`<path d="M8 24h32a16 14 0 0 1-32 0z" fill="#fffefa" ${UA_W}/><path d="M14 22c3-4 6 4 9 0s6 4 9 0" ${UA_W} fill="none"/>`,
 'filter':`<path d="M8 10h32L28 25v12l-8 4V25z" fill="#d8ecf7" ${UA_W}/>`,
 // v1.7.10 (owner, 7 Nov 2026: “các nút X tắt, đóng, lưu phải thiết kế kiểu riêng biệt bằng artwork”): one picture per meaning —
 // X = dismiss (red-brown cross in a circle), Đóng / Xong = put the sheet away (a chevron down), Lưu = keep it (a green tick)
 // v1.7.16: “Tự chạy thử” (the app tries itself) — a play triangle in a green circle
 'play':`${uaCirc(24,24,19,'#cfeedd')}<path d="M19 14l15 10-15 10z" fill="#ffffff" ${UA_W}/>`,
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
// v1.7.11 (owner, 7 Nov 2026: “Thiết kế các nút phải có emoji artwork, nếu nút dài quá có thể thu gọn chữ lại hoặc đổi tên phù hợp
// ngữ cảnh”; then “Nhiều emoji quá, giảm bớt thôi” — pop-up: drawings on the main buttons only, keep the short names).
// A drawing goes on main action buttons (.primary and the few main actions in BTN_MAIN: plan the week, add a dish, cooked, cook mode…)
// and on icon-only buttons, where the drawing replaces a text symbol. Chips, tabs, disclosures and secondary buttons are words only.
// Sheet X / Đóng / Lưu (decorateSheet in app.ts), the bottom navigation and share buttons have their own drawings.
// Every button: long labels get a short name for the situation (full wording kept for screen readers).
const BTN_BY_DATA:Record<string,Record<string,string>>={
 action:{'reminders':'bell','add-extra':'add','add-stock':'add','add-to-meal':'meal-plan','check-pantry':'fridge','delete-recipe-dialog':'trash','duplicate-week':'repeat','edit-stock':'edit','export':'download','import':'upload','pantry-peek':'fridge','start-cooking':'cook-mode','use-ingredient':'search','week-now':'calendar','week-prev':'arrow-left','week-next':'arrow-right','skip-row':'skip','skip-ingredient':'skip','store-purchases':'fridge','copy-share':'paste','purchase-quantity':'unit','calendar-month':'calendar','add-member':'add','edit-member':'edit','delete-stock':'trash','recipe-detail':'book'},
 fm:{'edit-meal':'add','cook-meal':'cooked-pot','cook-ahead':'cooked-pot','guests-save':'save-check','guest-remove':'trash','guest-add':'add','guest-invite':'share-msg','remove-dish':'trash','clear-meal':'trash','generate':'plan-week','new':'add','quick-add-dish':'add','use-pantry':'fridge','filter-sheet':'filter','all':'chip-all','own':'whole-family','samples':'book','edit-recipe':'edit','lock':'calendar','load-more':'more','regenerate':'repeat','apply':'save-check','cook-batch':'cooked-pot','undo-batch':'cooked-pot'},
 personal:{accounts:'family',busy:'busy',weather:'weather',currency:'money',invite:'family',settings:'tools','sign-out':'account','device-only':'account',export:'download',import:'upload'},
 guide:{open:'guide',dismiss:'close-x',next:'arrow-right',prev:'arrow-left',done:'save-check'},
 house:{'urgent-new':'urgent','alert-read':'save-check','alert-archive':'download'},
 feature:{'notes-import':'note','receipt-new':'receipt','cloud-settings':'family','receipt-parse':'search'},
 planning:{stores:'store'},pushAction:{'request-item':'request',subscribe:'bell',test:'bell',settings:'bell',unsubscribe:'skip'},
 product:{import:'upload',new:'add',receipt:'receipt'},offlineDownload:{'*':'download'},offlineFix:{'*':'download'},
 rci:{add:'add',up:'arrow-up',down:'arrow-down',paste:'paste',remove:'trash'},vlCheck:{'*':'mic'},planMeal:{'*':'meal-plan'},mealMore:{'*':'more'},
 rcrop:{read:'receipt'},install:{open:'home-add'},kx:{'import-go':'link-in','scan-open':'barcode','scan-save':'save-check'},mr:{'open-tastes':'taste',who:'whole-family',up:'thumb-up',down:'thumb-down',like:'thumb-up',dislike:'thumb-down'},qrDir:{up:'round-up',down:'round-down'},flow:{'shop-start':'cart','shop-done':'save-check','shop-exit':'arrow-left','plan-start':'plan-week','plan-next':'arrow-right','plan-preview':'meal-plan','leftover-save':'save-check'},guestStep:{'1':'add','-1':'minus'},
 scout:{refresh:'repeat','online-find':'search',toggle:'money'},
};
const BTN_CHIP:Record<string,string>={all:'chip-all',main:'dish-main',side:'dish-veg',veg:'dish-veg',soup:'dish-soup',noodle:'dish-noodle',dessert:'dish-dessert',snack:'meal-snack',lunchbox:'dish-lunchbox',western:'tag-western',healthy:'tag-healthy',vegetarian:'tag-vegetarian',vegan:'tag-vegan',dressing:'tag-dressing',fridge:'fridge',freezer:'freezer',dry:'shelf',breakfast:'meal-breakfast',lunch:'meal-lunch',dinner:'meal-dinner',snackAm:'meal-snack-am'};
const BTN_BY_TEXT:[RegExp,string][]=[[/^(\+|thêm|add\b)/,'add'],[/^(sửa|chỉnh|edit)/,'edit'],[/^(xoá|xóa|bỏ hết|delete|remove|clear)/,'trash'],[/^(bỏ qua|skip)/,'skip'],[/^(lưu|save)\b/,'save-check'],[/^(đóng|close|xong|done)$/,'close-down'],[/^(hủy|huỷ|cancel)/,'close-x'],[/(tải về|tải|download)/,'download'],[/(khôi phục|restore|nhập bảng|import)/,'upload'],[/^(tìm|search|find)/,'search'],[/(lịch|calendar)/,'calendar'],[/(hướng dẫn|guide|tour)/,'guide'],[/(gia đình|family)/,'family'],[/(tài khoản|account|đăng nhập|sign in|đăng xuất|sign out)/,'account'],[/(thông báo|push|notification|reminder|nhắc)/,'bell'],[/(giọng|voice)/,'mic'],[/(hóa đơn|hoá đơn|receipt)/,'receipt'],[/(cửa hàng|nơi mua|store)/,'store'],[/(tủ|pantry|fridge)/,'fridge'],[/(giá|price|tiền|money|currency)/,'money'],[/(xem thêm|more)/,'more'],[/(gợi ý|idea|suggest)/,'idea'],[/(công cụ|tools)/,'tools'],[/(ghi chú|note)/,'note'],[/(sao chép|copy)/,'paste'],[/(món|recipe|dish)/,'book'],[/(thực đơn|menu|plan)/,'plan-week'],[/(nấu|cook)/,'cooked-pot'],[/(thời tiết|weather)/,'weather'],[/(bận|busy|away|vắng)/,'busy'],[/(ai nấu|who cooks|phân công|assign)/,'whole-family'],[/(tìm kiếm|search)/,'search'],[/(danh sách đi chợ|shopping list)/,'cart'],[/(nguyên liệu|ingredients)/,'note'],[/(thống kê|insights|stats)/,'idea']];
// short names for the situation (full wording stays in aria-label)
const BTN_SHORT:[RegExp,string][]=[[/^Lặp lại tuần trước$/,'Lặp tuần trước'],[/^Khẩu vị gia đình$/,'Khẩu vị'],[/^Bỏ đánh dấu đã nấu cả mẻ$/,'Chưa nấu mẻ'],[/^Bỏ đánh dấu đã nấu$/,'Chưa nấu'],[/^Mark batch as not cooked$/,'Batch not cooked'],[/^Mark as not cooked$/,'Not cooked'],[/^Bỏ qua lần mua này$/,'Bỏ qua'],[/^Skip (this|for this) (time|trip|purchase)$/i,'Skip'],[/^Chọn lượng mua$/,'Lượng mua'],[/^Choose (the )?amount( to buy)?$/i,'Amount'],[/^Viết \/ phân loại món ăn$/,'Viết món'],[/^Write \/ categorise recipes$/,'Write recipe'],[/^Lên thực đơn cả tuần$/,'Lên thực đơn'],[/^Auto-plan (the )?week$/,'Plan week'],[/^Kiểm tra đồ trong tủ(?= \(|$)/,'Đồ trong tủ'],[/^Kiểm tra đồ đã có \/ bỏ qua(?= \(|$)/,'Đồ đã có'],[/^Check (what's in )?the pantry(?= \(|$)/,'Pantry'],[/^Check what you have \/ skip(?= \(|$)/,'In stock'],[/^Chụp \/ nhập hóa đơn$/,'Hóa đơn'],[/^(Snap|Photo) \/ (enter|type) (a )?receipt$/i,'Receipt'],[/^Đổi tiền tệ & giá nguyên liệu$/,'Tiền tệ & giá'],[/^(Change )?currency & ingredient prices$/i,'Currency & prices'],[/^Write your first recipe$/,'Write a recipe'],[/^Kiểm tra giọng chính xác trên máy này$/,'Thử giọng nói'],[/^Check (the )?accurate voice on this device$/i,'Test voice'],[/^Bật \/ lưu nhận push$/,'Bật thông báo'],[/^Turn on \/ save push$/i,'Turn on alerts'],[/^Thử thiết bị này$/,'Thử thông báo'],[/^Test this device$/,'Test alert'],[/^Gợi ý từ thói quen của nhà mình$/,'Gợi ý cho nhà'],[/^Ideas based on your cooking history$/,'Ideas for you'],[/^Phân công ai nấu & ai đi chợ$/,'Ai nấu, ai đi chợ'],[/^Who cooks & who shops$/,'Who cooks, shops'],[/^Thêm ngay vào bữa$/,'Thêm vào bữa'],[/^Xem thống kê & sở thích(?=\s*[→↗]?$)/,'Thống kê & sở thích'],[/^Tạo liên kết tìm kiếm(?=\s*[→↗]?$)/,'Link tìm kiếm'],[/^View history & preferences(?=\s*[→↗]?$)/,'History & tastes'],[/^Add (it )?(straight )?to the meal now$/i,'Add to meal']];
const BTN_SYMBOLS=/^[\s+−✧↶↷▧▤▦↓↑⇅⇵✗✓↗→←‹›×≈•·▾▴🔄🏷️📍📱🟢⚪👍👎🍲☀☾]+|[\s▾▴↗→]+$/gu;
function buttonArtName(el:Element):string|null{const e=el as HTMLElement;
 if(e.matches('[data-color-theme],.day,.plan-day-head,.theme-fold-summary,[data-art-skip],[data-fm="recipe-snapshot"]'))return null;
 if(e.querySelector('svg,img,.ingredient-art,.dish-art,.pp-wrap,.recipe-visual,.composed-dish,.lb-bug'))return null;
 const d=e.dataset;
 if(d.action==='attendance-tab'||d.action==='pantry-filter'||d.fm==='cat-filter'||d.fm==='tag-filter'||d.fm==='diet-filter'){const k=d.type||d.id||d.key||'';if(BTN_CHIP[k])return BTN_CHIP[k]}
 for(const[attr,map]of Object.entries(BTN_BY_DATA)){const v=(d as any)[attr];if(v===undefined)continue;if(map[v])return map[v];if(map['*'])return map['*']}
 const href=e.getAttribute('href')||'';const BY_HREF:Record<string,string>={'#insights':'idea','#products':'money','#shopping':'cart','#recipes':'book','#today':'calendar','#planner':'plan-week','#pantry':'fridge','#expenses':'money','/login':'account'};if(BY_HREF[href])return BY_HREF[href];
 const t=(e.textContent||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').replace(BTN_SYMBOLS,'').trim().toLowerCase();if(BTN_CHIP[t])return BTN_CHIP[t];
 for(const[re,name]of BTN_BY_TEXT)if(re.test(t))return name;return'other'}
const BTN_MAIN:Record<string,string[]>={fm:['generate','edit-meal','quick-add-dish','new','cook-meal','cook-batch','undo-batch'],action:['start-cooking','add-to-meal','add-extra','add-stock','store-purchases'],product:['new'],flow:['shop-exit'],mr:['like','dislike'],rcrop:['read']};/* v1.7.14: 👍 / 👎 with a count — the drawing carries the meaning (it was blank before) */
// the app's own old emoji on buttons (leading only, so family-written names are never touched)
const BTN_EMOJI=/^[\s🔄🏷️📍📱🟢⚪👍👎🍲\u{FE0F}]+/u;
function isMainButton(el:HTMLElement):boolean{if(el.matches('.chip,a.chip,[role="tab"],summary'))return false;if(el.matches('.primary'))return true;
 for(const[attr,keys]of Object.entries(BTN_MAIN)){const v=(el.dataset as any)[attr];if(v!==undefined&&keys.includes(v))return true}return false}
const btnSeen=new WeakMap<Element,string>();
function decorateButtons(root:ParentNode=document){if(typeof document==='undefined')return;
 for(const el of root.querySelectorAll<HTMLElement>('button,a.btn,a.chip,[role="tab"],summary,.chip')){
  if(el.dataset.btnArt&&btnSeen.get(el)===el.innerHTML)continue;/* decorated and unchanged; a screen that rewrites a button's contents gets it again */
  if(el.closest('.ladybug,#lb-root,svg'))continue;
  const tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const texts:Text[]=[];let n:Node|null;while((n=tw.nextNode()))if((n as Text).nodeValue?.trim())texts.push(n as Text);
  const full=(el.textContent||'').replace(/\s+/g,' ').trim();const name=buttonArtName(el);const known=!!name&&name!=='other'&&!!UI_ART[name];
  const iconOnly=known&&!full.replace(BTN_SYMBOLS,'').replace(BTN_EMOJI,'').trim()&&!el.matches('.chip,a.chip,[role="tab"],summary');
  const draw=known&&(iconOnly||isMainButton(el));el.dataset.btnArt=draw?name!:(name===null?'own':'words');
  if(texts[0])texts[0].nodeValue=texts[0].nodeValue!.replace(BTN_EMOJI,'');
  // word-only buttons drop the old decorative marks too (+ ✧ ↶ ▧ ⇅ …); status marks (✓ ✗) stay
  if(!draw&&texts[0]&&texts[0].nodeValue!.replace(/^[\s+✧↶↷▧▤▦⇅⇵]+/u,'').trim())texts[0].nodeValue=texts[0].nodeValue!.replace(/^[\s+✧↶↷▧▤▦⇅⇵]+/u,'');
  if(draw){if(texts[0])texts[0].nodeValue=texts[0].nodeValue!.replace(/^[\s+−✧↶↷▧▤▦↓↑⇅⇵✗✓↗→←‹›×≈•·☀☾]+/u,'');const last=texts[texts.length-1];if(last)last.nodeValue=last.nodeValue!.replace(/[\s▾▴↗→]+$/u,'')}
  if(texts.length===1){const v=texts[0].nodeValue!.trim();for(const[re,short]of BTN_SHORT)if(re.test(v)){texts[0].nodeValue=v.replace(re,short);const clean=full.replace(/^[\s+✧↶↷▧▤▦⇅⇵↗🔄🏷️📍📱🟢⚪👍👎🍲\u{FE0F}]+/u,'').replace(/[\s▾▴↗→]+$/u,'');if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label',clean);el.title=el.title||clean;break}}
  if(!(el.textContent||'').trim()&&!el.hasAttribute('aria-label'))el.setAttribute('aria-label',full||name||'');
  if(draw&&!el.querySelector(':scope > .btn-art'))el.insertAdjacentHTML('afterbegin',uiArt(name!,'btn-art'));btnSeen.set(el,el.innerHTML);}}
(globalThis as any).decorateButtons=decorateButtons;(globalThis as any).buttonArtName=buttonArtName;
if(typeof document!=='undefined'){let queued=false;const run=()=>{queued=false;try{decorateButtons()}catch(e){console.warn('button art',e)}};
 new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(run)}}).observe(document.body,{childList:true,subtree:true});run()}
