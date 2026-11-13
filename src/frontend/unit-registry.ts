'use strict';
// Unit registry (v1.5): one list of buying units used by the purchase picker, shopping
// rows, receipts and Price Scout. Stored purchase records keep the plain VI unit string
// (`vi`), exactly as earlier clients wrote it; ids are internal only. Container and
// produce units never convert to grams/millilitres unless the family enters a pack size.
// Icons are original 24×24 line drawings (currentColor + one accent token), inline so
// they ship inside the offline startup pack. Decorative: always paired with a text label.
const UNIT_ACCENT='var(--unit-accent,#c87649)';
const UNIT_ICON_PATHS={
 g:`<path fill="${UNIT_ACCENT}" stroke="none" d="M8.9 15h6.2l.8 4H8.1z"/><path d="M8.5 12h7l1.6 8H6.9z"/><path d="M10 12a2 2 0 1 1 4 0"/>`,
 kg:`<path fill="${UNIT_ACCENT}" stroke="none" d="M4.1 14.5h15.8l.6 3H3.5z"/><path d="M5 9h14l2.4 12H2.6z"/><path d="M8.6 9a3.4 3.4 0 1 1 6.8 0"/>`,
 lang:`<path fill="${UNIT_ACCENT}" stroke="none" d="M2.5 13h5a2.5 2.5 0 0 1-5 0z"/><path d="M12 4v15M8 20h8M5 7h14"/><path d="M5 7l-2.5 6M5 7l2.5 6M19 7l-2.5 6M19 7l2.5 6"/><path d="M2.5 13h5a2.5 2.5 0 0 1-5 0zM16.5 13h5a2.5 2.5 0 0 1-5 0z"/><circle cx="12" cy="4" r="1.2"/>`,
 ml:`<path fill="${UNIT_ACCENT}" stroke="none" d="M9.5 14.5h5v4a2.5 2.5 0 0 1-5 0z"/><path d="M8 3h8"/><path d="M9.5 3v15.5a2.5 2.5 0 0 0 5 0V3"/><path d="M12.2 7.5h2.3M12.2 10.5h2.3M12.2 13.5h2.3"/>`,
 l:`<path fill="${UNIT_ACCENT}" stroke="none" d="M5.6 13h9.8l-.5 7H6.1z"/><path d="M5 5h11l-1 15H6z"/><path d="M5 5L3.5 3.5"/><path d="M15.8 8H18a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2.6"/><path d="M8 9h3M8 12h3"/>`,
 piece:`<path fill="${UNIT_ACCENT}" stroke="none" d="M12 3l8 4.5-8 4.5-8-4.5z"/><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>`,
 cut:`<path fill="${UNIT_ACCENT}" stroke="none" d="M5.2 8.3C6.8 5.6 9.8 4 13.5 4c3.6 0 6.3 2 6.9 4.8-3.5-1.8-9.8-2-15.2-.5z"/><path d="M4 10.5C4 6.7 8 4 13.5 4S21 6.7 21 10.8c0 5-4.6 9.2-9.2 9.2-2.8 0-4-1.8-5.4-3.2C4.8 15.3 4 13.4 4 10.5z"/><circle cx="9.5" cy="12.5" r="2.2"/>`,
 slice:`<path fill="${UNIT_ACCENT}" stroke="none" d="M8.5 19v-8.3a2.6 2.6 0 0 1 .4-5.2h6.2a2.6 2.6 0 0 1 .4 5.2V19z"/><path d="M6 20.5V10.6A4 4 0 0 1 7.5 3h9a4 4 0 0 1 1.5 7.6v9.9z"/>`,
 fruit:`<path fill="${UNIT_ACCENT}" stroke="none" d="M12.5 5.3c.9-2 3-2.7 4.6-2.2-.3 2-2.4 3-4.6 2.2z"/><path d="M12 7.2c-2-1.6-7-1.6-7 4.6 0 5 3 9 5 9 1 0 1.3-.5 2-.5s1 .5 2 .5c2 0 5-4 5-9 0-6.2-5-6.2-7-4.6z"/><path d="M12 7.2V4"/>`,
 whole:`<path fill="${UNIT_ACCENT}" stroke="none" d="M7.5 9.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/><path d="M2.5 12c3-5 10.5-6 14.5 0-4 6-11.5 5-14.5 0z"/><path d="M17 12l4.5-4v8z"/><path d="M10.5 9c1 2 1 4 0 6"/>`,
 bunch:`<path d="M10 21l1-9M12 21v-9M14 21l-1-9"/><path d="M11 12c-4 0-6-3-6-7 3 0 6 2 6 7zM13 12c4 0 6-3 6-7-3 0-6 2-6 7zM12 12c-1.5-2.5-1.5-6 0-9 1.5 3 1.5 6.5 0 9z"/><rect fill="${UNIT_ACCENT}" stroke="none" x="9.2" y="15.2" width="5.6" height="2.4" rx="1.1"/>`,
 handful:`<path fill="${UNIT_ACCENT}" stroke="none" d="M6 12.5c.5-3 3-4.5 6-4.5s5.5 1.5 6 4.5z"/><path d="M3.5 12.5c1 4.5 4 7 8.5 7 4 0 7-2 8.5-5.5l1-2.5c.3-.9-.8-1.5-1.4-.8L18 13"/><path d="M3.5 12.5H18"/>`,
 stalk:`<path fill="${UNIT_ACCENT}" stroke="none" d="M10.5 16.5h3V21h-3z"/><path d="M10.5 21V9c0-2 .5-4 1.5-6 1 2 1.5 4 1.5 6v12z"/><path d="M11 9L7 3M13 9l4-6M10.5 13h3"/>`,
 bulb:`<path stroke="${UNIT_ACCENT}" d="M12 8.5c-2 2-2.5 5-1.5 8.5"/><path d="M12 3c0 3 6 5 6 10a6 6 0 0 1-12 0c0-5 6-7 6-10z"/><path d="M10 19l-1 2.5M12 19v2.5M14 19l1 2.5"/>`,
 clove:`<path fill="${UNIT_ACCENT}" stroke="none" d="M12 3c2.5 5 3.5 10 3.5 14 0 2-1.5 3-3.5 3 1-4 1-11 0-17z"/><path d="M12 3c-3 3-6 7-6 11 0 3.5 2.5 6 6 6 2 0 3.5-1 3.5-3 0-4-1-9-3.5-14z"/>`,
 sprig:`<path fill="${UNIT_ACCENT}" stroke="none" d="M13 10c0-3 2-4.5 4-5 .5 2.5-1 4.5-4 5z"/><path d="M7 21c2-6 5-11 10-17"/><path d="M10 14c-3 0-4.5-2-5-4 2.5-.5 4.5.5 5 4zM13 10c0-3 2-4.5 4-5 .5 2.5-1 4.5-4 5zM12.3 16c3 0 4.5 1.5 5 3.5-2.5.5-4.5-.5-5-3.5z"/>`,
 head:`<path fill="${UNIT_ACCENT}" stroke="none" d="M8 13c-3 2-4 5-3.5 8.5 2-1 3.5-3 4.5-5zM16 13c3 2 4 5 3.5 8.5-2-1-3.5-3-4.5-5z"/><path d="M12 2.5c3 0 4 5 4 9s-1 9.5-4 9.5-4-5.5-4-9.5 1-9 4-9z"/><path d="M8.4 8h7.2M8.1 12h7.8M8.5 16h7M12 3v18"/>`,
 roll:`<path fill="${UNIT_ACCENT}" stroke="none" d="M8 9.4c.8 0 1.5 1.2 1.5 2.6S8.8 14.6 8 14.6 6.5 13.4 6.5 12 7.2 9.4 8 9.4z"/><ellipse cx="8" cy="12" rx="4" ry="7"/><path d="M8 5h9c2.2 0 4 3.1 4 7s-1.8 7-4 7H8"/>`,
 pack:`<ellipse fill="${UNIT_ACCENT}" stroke="none" cx="12" cy="12" rx="4" ry="2.6"/><path d="M5 6l1.75-1.5L8.5 6l1.75-1.5L12 6l1.75-1.5L15.5 6l1.75-1.5L19 6v12l-1.75 1.5L15.5 18l-1.75 1.5L12 18l-1.75 1.5L8.5 18l-1.75 1.5L5 18z"/>`,
 bag:`<path fill="${UNIT_ACCENT}" stroke="none" d="M5.6 15h12.8l-.4 4.2H6z"/><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>`,
 box:`<rect fill="${UNIT_ACCENT}" stroke="none" x="9" y="12" width="6" height="5" rx="1"/><path d="M7 9l2-5h6l2 5v12H7z"/><path d="M7 9h10M12 4l-1.2 5"/>`,
 tray:`<path fill="${UNIT_ACCENT}" stroke="none" d="M7 12c0-2.5 3-3.6 5-3.6s5 1.1 5 3.6z"/><path d="M2.5 13h19l-2.5 5h-14z"/><path d="M2.5 13l2-1.5h15l2 1.5"/>`,
 card:`<rect x="3" y="7" width="18" height="10" rx="2"/><g fill="${UNIT_ACCENT}" stroke="none"><circle cx="7.5" cy="10" r="1.5"/><circle cx="12" cy="10" r="1.5"/><circle cx="16.5" cy="10" r="1.5"/><circle cx="7.5" cy="14" r="1.5"/><circle cx="12" cy="14" r="1.5"/><circle cx="16.5" cy="14" r="1.5"/></g>`,
 ten:`<g fill="${UNIT_ACCENT}" stroke-width="1.2"><circle cx="4" cy="9" r="1.6"/><circle cx="8" cy="9" r="1.6"/><circle cx="12" cy="9" r="1.6"/><circle cx="16" cy="9" r="1.6"/><circle cx="20" cy="9" r="1.6"/><circle cx="4" cy="14.5" r="1.6"/><circle cx="8" cy="14.5" r="1.6"/><circle cx="12" cy="14.5" r="1.6"/><circle cx="16" cy="14.5" r="1.6"/><circle cx="20" cy="14.5" r="1.6"/></g><path d="M3 19.5h18"/>`,
 dozen:`<g fill="${UNIT_ACCENT}" stroke-width="1.2"><circle cx="6" cy="5.5" r="1.6"/><circle cx="10" cy="5.5" r="1.6"/><circle cx="14" cy="5.5" r="1.6"/><circle cx="18" cy="5.5" r="1.6"/><circle cx="6" cy="11" r="1.6"/><circle cx="10" cy="11" r="1.6"/><circle cx="14" cy="11" r="1.6"/><circle cx="18" cy="11" r="1.6"/><circle cx="6" cy="16.5" r="1.6"/><circle cx="10" cy="16.5" r="1.6"/><circle cx="14" cy="16.5" r="1.6"/><circle cx="18" cy="16.5" r="1.6"/></g><path d="M4 20.5h16"/>`,
 bottle:`<rect fill="${UNIT_ACCENT}" stroke="none" x="9.8" y="2" width="4.4" height="2.6" rx=".6"/><path d="M10.5 4.6v3c0 1-3 2-3 5V20a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-7.4c0-3-3-4-3-5v-3z"/><path d="M7.5 13.5h9M7.5 18h9"/>`,
 jar:`<rect fill="${UNIT_ACCENT}" x="6.5" y="3" width="11" height="3.5" rx="1"/><path d="M7 6.5h10V8c1 .8 1.5 2 1.5 3.5V19a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-7.5c0-1.5.5-2.7 1.5-3.5z"/><rect x="8" y="12" width="8" height="5" rx="1"/>`,
 tub:`<path fill="${UNIT_ACCENT}" d="M9 5h6V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1z"/><path d="M8.5 7c-3 1.5-5 4-5 7 0 4 3.5 7 8.5 7s8.5-3 8.5-7c0-3-2-5.5-5-7z"/><path d="M7.5 7h9M9 7V5h6v2M4.3 12.5h15.4"/>`,
 tin:`<path fill="${UNIT_ACCENT}" stroke="none" d="M6 10c0 1.1 2.7 2 6 2s6-.9 6-2v4.5c0 1.1-2.7 2-6 2s-6-.9-6-2z"/><ellipse cx="12" cy="5" rx="6" ry="2"/><path d="M6 5v14c0 1.1 2.7 2 6 2s6-.9 6-2V5"/><path d="M11 5h2.5"/>`,
 case:`<rect fill="${UNIT_ACCENT}" stroke="none" x="10.5" y="9" width="3" height="11"/><path d="M4 9h16v11H4z"/><path d="M4 9L2 5.5h7.5L12 9M20 9l2-3.5h-7.5L12 9"/>`,
 crate:`<g fill="${UNIT_ACCENT}" stroke="none"><circle cx="6" cy="4.5" r="1.4"/><circle cx="10" cy="4.5" r="1.4"/><circle cx="14" cy="4.5" r="1.4"/><circle cx="18" cy="4.5" r="1.4"/></g><path d="M6 9V6M10 9V6M14 9V6M18 9V6"/><rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M9.5 12.8h5M3 16.5h18"/>`,
 sack:`<rect fill="${UNIT_ACCENT}" stroke="none" x="7.8" y="5" width="8.4" height="2.2" rx="1"/><path d="M8 6.5c-3 3-4.5 7-4.5 10 0 3 2 4.5 8.5 4.5s8.5-1.5 8.5-4.5c0-3-1.5-7-4.5-10"/><path d="M8.5 5.5L7 2.5M15.5 5.5L17 2.5M12 5.5V2.5M5 17.5h14"/>`,
 jerrycan:`<rect fill="${UNIT_ACCENT}" stroke="none" x="4.6" y="2.2" width="3" height="3" rx=".8" transform="rotate(-35 6.1 3.7)"/><path d="M5 8l3-4h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M12 7.5h5M8.5 12l8 6.5M16.5 12l-8 6.5"/>`,
 jug:`<rect fill="${UNIT_ACCENT}" x="8.5" y="2" width="5" height="2.6" rx=".8"/><path d="M8 4.6h6l4 4.4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9z"/><path d="M14 9h2v4.5h-2z"/>`,
 canister:`<path fill="${UNIT_ACCENT}" stroke="none" d="M7.5 4.5c0 .8 2 1.5 4.5 1.5s4.5-.7 4.5-1.5V7.5c0 .8-2 1.5-4.5 1.5s-4.5-.7-4.5-1.5z"/><ellipse cx="12" cy="4.5" rx="4.5" ry="1.5"/><path d="M7.5 4.5v15c0 .8 2 1.5 4.5 1.5s4.5-.7 4.5-1.5v-15"/><path d="M10 12v5"/>`,
 tube:`<rect fill="${UNIT_ACCENT}" x="10" y="17" width="4" height="4" rx="1"/><path d="M5.5 3h13M7 5.5h10"/><path d="M6.5 3.5l1 11c.2 1.5 1.8 2.5 3 2.5h3c1.2 0 2.8-1 3-2.5l1-11"/>`,
 tablet:`<rect fill="${UNIT_ACCENT}" x="13.5" y="12.5" width="7.5" height="7.5" rx="2"/><rect x="2" y="6" width="13" height="6.5" rx="3.25" transform="rotate(-30 8.5 9.25)"/><path d="M7 6.6l3 5.3"/>`,
 sheet:`<path fill="${UNIT_ACCENT}" stroke="none" d="M14 3v4h4z"/><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 15.5h6"/>`,
 wash:`<path fill="${UNIT_ACCENT}" stroke="none" d="M8 14.3c1.3-1 2.7-1 4 0s2.7 1 4 0a4 4 0 0 1-8 0z"/><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 7h16"/><circle cx="12" cy="14" r="4.5"/><circle cx="7" cy="5" r=".6"/><circle cx="9.3" cy="5" r=".6"/>`,
 multipack:`<rect x="3" y="5" width="5.5" height="15" rx="1.5"/><rect x="9.25" y="5" width="5.5" height="15" rx="1.5"/><rect x="15.5" y="5" width="5.5" height="15" rx="1.5"/><rect fill="${UNIT_ACCENT}" x="2.3" y="10" width="19.4" height="4.2" rx="1"/>`,
 custom:`<circle fill="${UNIT_ACCENT}" stroke="none" cx="7.5" cy="7.5" r="1.7"/><path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9z"/>`
};
// [id, stored VI label, VI display label, EN label, EN plural, category, dimension, factor to base,
//  VI synonyms, EN synonyms, extra]. `fixed` gives a definitional conversion (lạng=100 g,
//  chục=10, tá=12) used only as an editable default; `scout` feeds Price Scout count bases.
const UNIT_REGISTRY=Object.freeze([
 ['g','g','g','g','g','weight','mass',1,['gam','gram','gờ ram'],['gram','grams','gr','gm'],{}],
 ['kg','kg','kg','kg','kg','weight','mass',1000,['ký','kí','ki lô','kilô','ki lô gam','kilogam'],['kilo','kilos','kilogram','kilograms','kgs'],{}],
 ['lang','lạng','lạng (100 g)','lạng (100 g)','lạng (100 g)','weight','mass',100,[],['100 g','100g','hundred grams'],{fixed:{g:100}}],
 ['ml','ml','ml','mL','mL','volume','volume',1,['mi li','mililit','mi li lít'],['millilitre','milliliter','millilitres','milliliters','mls'],{}],
 ['l','l','lít','L','L','volume','volume',1000,['lít','lit'],['litre','liter','litres','liters','ltr'],{}],
 ['piece','cái','cái','piece','pieces','count','count',1,['chiếc'],['piece','pc','pcs','item','items','unit','units'],{scout:'each'}],
 ['fruit','quả','quả','each','each','produce','count',1,['trái','qủa'],['each','ea','fruit','whole fruit'],{scout:'each'}],
 ['bunch','bó','bó','bunch','bunches','produce',null,null,['mớ','bó rau'],['bundle','bundles'],{}],
 ['cut','miếng','miếng','cut','cuts','count',null,null,['khúc','miếng thịt'],['portion','portions','fillet','fillets','chunk','chunks'],{}],
 ['slice','lát','lát','slice','slices','count',null,null,['khoanh','lát mỏng'],['rasher','rashers'],{}],
 ['whole','con','con','whole','whole','count',null,null,['nguyên con'],['whole fish','whole chicken','whole bird'],{}],
 ['handful','nắm','nắm','handful','handfuls','produce',null,null,['vốc','nắm tay'],['handful'],{approx:true}],
 ['stalk','cây','cây','stalk','stalks','produce',null,null,['cọng','thân'],['stem','stems','stick','sticks'],{}],
 ['bulb','củ','củ','bulb','bulbs','produce',null,null,['củ tỏi','củ hành'],['root','roots','tuber','tubers'],{}],
 ['clove','tép','tép','clove','cloves','produce',null,null,['tép tỏi'],['garlic clove'],{}],
 ['sprig','nhánh','nhánh','sprig / knob','sprigs / knobs','produce',null,null,['nhánh gừng','cành'],['sprig','sprigs','knob','knobs','branch'],{}],
 ['head','bắp','bắp','head / cob','heads / cobs','produce',null,null,['trái bắp'],['head','heads','cob','cobs','ear'],{}],
 ['pack','gói','gói','pack','packs','container',null,null,['gói nhỏ'],['packet','packets','pkt','pkts','sachet','sachets'],{}],
 ['bag','túi','túi','bag','bags','container',null,null,['bịch','bọc','túi lưới'],['pouch','pouches','net bag'],{}],
 ['box','hộp','hộp','box / carton','boxes / cartons','container',null,null,['hộp giấy','hộp nhựa'],['box','carton','cartons','punnet','punnets'],{}],
 ['tray','khay','khay','tray','trays','container',null,null,['khay xốp'],['tray'],{}],
 ['card','vỉ','vỉ','card / blister','cards / blisters','container',null,null,['vỉ trứng'],['card','blister','blisters','blister pack','egg tray'],{}],
 ['bottle','chai','chai','bottle','bottles','container',null,null,['chai nhựa','chai thủy tinh'],['btl','btls'],{}],
 ['jar','lọ','lọ','jar','jars','container',null,null,['lọ thủy tinh'],['glass jar'],{}],
 ['tub','hũ','hũ','pot / tub','pots / tubs','container',null,null,['hủ'],['pot','pots','tub','crock'],{}],
 ['tin','lon','lon','can','cans','container',null,null,['lon thiếc'],['tin','tins','tin can'],{}],
 ['multipack','lốc','lốc','multipack','multipacks','container',null,null,['lốc sữa'],['multi pack','6 pack','4 pack','six pack'],{}],
 ['case','thùng','thùng','case','cases','container',null,null,['thùng giấy','thùng xốp'],['case','slab','large box'],{}],
 ['crate','két','két','crate','crates','container',null,null,['két bia','két nước'],['crate'],{}],
 ['sack','bao','bao','sack','sacks','container',null,null,['bao gạo','bao tải'],['sack','large bag'],{}],
 ['jerrycan','can','can / bình lớn','jerrycan','jerrycans','container',null,null,['can nhựa','can dầu'],['jerry can','jerry cans','drum'],{}],
 ['jug','bình','bình','jug','jugs','container',null,null,['bình nhựa','bình nước'],['flagon','flagons','jug'],{}],
 ['canister','ống','ống','canister','canisters','container',null,null,['ống tre','ống nhựa'],['cylinder','rigid tube'],{}],
 ['tube','tuýp','tuýp','tube','tubes','container',null,null,['tuyp','típ'],['squeeze tube'],{}],
 ['roll','cuộn','cuộn','roll','rolls','count',null,null,['cuốn'],['roll'],{scout:'roll'}],
 ['sheet','tờ','tờ','sheet','sheets','count',null,null,['tấm','lá'],['sheet'],{scout:'sheet'}],
 ['tablet','viên','viên','tablet','tablets','count',null,null,['viên nén','viên súp'],['tab','tabs','cube','cubes','capsule','capsules','pod','pods'],{scout:'wash'}],
 ['wash','lần giặt','lần giặt','wash','washes','count',null,null,['lần rửa','lượt giặt'],['load','loads'],{scout:'wash'}],
 ['ten','chục','chục (10)','ten (10)','tens (10)','count','count',10,['chục'],['ten','tens','10 pack'],{fixed:{'quả':10,'cái':10}}],
 ['dozen','tá','tá (12)','dozen (12)','dozens (12)','count','count',12,['tá'],['dozen','dozens','doz'],{fixed:{'quả':12,'cái':12}}]
].map(([id,vi,viLabel,en,enPlural,category,dim,factor,synVi,synEn,extra])=>Object.freeze({id,vi,viLabel,en,enPlural,category,dim,factor,synonyms:Object.freeze({vi:Object.freeze(synVi),en:Object.freeze(synEn)}),icon:id,approx:!!extra.approx,fixed:extra.fixed?Object.freeze(extra.fixed):null,scout:extra.scout||null})));
const UNIT_CATEGORIES=Object.freeze([['weight','Cân/đo','Weigh / measure'],['volume','Cân/đo','Weigh / measure'],['count','Đếm','Count'],['container','Bao bì','Packaging'],['produce','Rau củ','Produce']]);
// "can" is both the VI jerrycan and an EN word for a tin. A stored VI string wins
// (stored data is VI), so findUnit('can') is the jerrycan; search still shows both.
const UNIT_AMBIGUOUS=Object.freeze({can:Object.freeze(['jerrycan','tin'])});
const unitNorm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9/()]+/g,' ').trim();
const UNIT_BY_ID=Object.freeze(Object.fromEntries(UNIT_REGISTRY.map(u=>[u.id,u])));
// Ranked lookup tables: exact (case-insensitive, with diacritics) beats diacritic-free.
const UNIT_EXACT=new Map(),UNIT_LOOSE=new Map();
for(const pass of [u=>[u.vi,u.viLabel],u=>u.synonyms.vi,u=>[u.en,u.enPlural,...u.synonyms.en]])for(const u of UNIT_REGISTRY)for(const word of pass(u)){const k=String(word).trim().toLowerCase(),n=unitNorm(word);if(k&&!UNIT_EXACT.has(k))UNIT_EXACT.set(k,u);if(n&&!UNIT_LOOSE.has(n))UNIT_LOOSE.set(n,u)}
function unitSynonymWords(u){return [u.vi,u.viLabel,u.en,u.enPlural,u.id,...u.synonyms.vi,...u.synonyms.en]}
// findUnit('Chai') / ('bottles') / ('lo') / ('jar') → registry entry, or null for custom names.
function findUnit(text){if(text&&typeof text==='object')return text.id&&UNIT_BY_ID[text.id]||null;const raw=String(text??'').trim();if(!raw||raw.length>60)return null;const k=raw.toLowerCase();if(UNIT_EXACT.has(k))return UNIT_EXACT.get(k);const n=unitNorm(raw);if(UNIT_LOOSE.has(n))return UNIT_LOOSE.get(n);if(/[a-z]s$/.test(n)&&UNIT_LOOSE.has(n.slice(0,-1)))return UNIT_LOOSE.get(n.slice(0,-1));return UNIT_BY_ID[n]||null}
function sameUnit(a,b){if(a===b)return true;if(!a||!b)return false;const x=findUnit(a),y=findUnit(b);return !!x&&x===y}
// Stored canonical string for a typed unit: registry VI label when known, else the trimmed custom text.
function canonicalUnitLabel(text){const u=findUnit(text);return u?u.vi:String(text??'').trim()}
const unitLang=lang=>lang||(typeof appLanguage!=='undefined'?appLanguage:'vi');
function unitLabel(text,{lang,plural=false}={}){const u=findUnit(text);if(!u)return String(text??'');return unitLang(lang)==='en'?(plural?u.enPlural:u.en):u.viLabel}
function unitAmountLabel(amount,text,lang){const u=findUnit(text),n0=+(+amount).toFixed(2),n=unitLang(lang)==='vi'?String(n0).replace('.',','):n0/* Henry, 13 Nov 2026: decimal comma in Vietnamese */;if(!u)return `${n} ${text}`;if(u.id==='l'&&unitLang(lang)==='vi')return `${n} l`;return `${n} ${unitLabel(u,{lang,plural:unitLang(lang)==='en'&&n0!==1})}`}
function unitIconSvg(text,{size=20,cls='unit-icon'}={}){const u=findUnit(text),key=u?u.icon:'custom';return `<svg class="${cls}" data-unit-icon="${key}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${UNIT_ICON_PATHS[key]}</svg>`}
function unitSearchText(text){const u=findUnit(text);return u?[...new Set(unitSynonymWords(u).map(unitNorm))].join(' | '):unitNorm(text)}
// Every lookup key → ids, for the voice parser / receipts and the collision test.
function unitSynonymIndex(){const out=new Map();for(const u of UNIT_REGISTRY)for(const w of unitSynonymWords(u)){const k=unitNorm(w);if(!k)continue;if(!out.has(k))out.set(k,new Set());out.get(k).add(u.id)}return out}
// Longest unit phrase at the start of free text ("2 chai nước mắm" → bottle, rest "nước mắm").
function unitMatchAtStart(text){const words=String(text??'').trim().split(/\s+/);for(let n=Math.min(4,words.length);n>0;n--){const head=words.slice(0,n).join(' '),u=findUnit(head);if(u)return{unit:u,matched:head,rest:words.slice(n).join(' ')}}return null}
// Price Scout quantity from shopping text. Containers convert only when a pack size is
// written ("2 chai 500 ml" → 1000 mL); otherwise they stay packs. Never guesses a size.
function unitScoutQuantity(text){const s=String(text??'').trim().toLowerCase().replace(',','.'),m=s.match(/^(\d+(?:\.\d+)?)?\s*(.*)$/),n=m[1]?+m[1]:1,rest=m[2]||'';const size=rest.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|lít|lit)\b/);const head=size?rest.slice(0,size.index).trim():rest,u=head?findUnit(head)||unitMatchAtStart(head)?.unit:null;if(size&&(!head||u&&!u.dim||u&&u.dim==='count')){const su=findUnit(size[2]),q=n*+size[1]*su.factor;return{qty:q,unit:su.dim==='mass'?'g':'ml',unitId:u?.id||su.id}}if(!u)return{qty:n,unit:'pack',unitId:null};if(u.dim==='mass')return{qty:n*u.factor,unit:'g',unitId:u.id};if(u.dim==='volume')return{qty:n*u.factor,unit:'ml',unitId:u.id};if(u.scout)return{qty:n,unit:u.scout,unitId:u.id};if(u.dim==='count')return{qty:n*u.factor,unit:'each',unitId:u.id};return{qty:n,unit:'pack',unitId:u.id}}
// Price Scout basis for a unit with a known pack size: "chai" + 500 mL → per_100mL.
function unitPriceBasisFor(text,packQty,packUnit){const u=findUnit(text),p=findUnit(packUnit);if(u?.scout&&u.scout!=='each')return 'per_'+u.scout;if(!(packQty>0)||!p?.dim)return u?.scout==='each'?'per_each':null;return p.dim==='mass'?(packQty*p.factor>=1000?'per_kg':'per_100g'):p.dim==='volume'?(packQty*p.factor>=1000?'per_L':'per_100mL'):'per_each'}
// Units offered to an ingredient whose recipe base unit is `base` ('g', 'ml', 'quả' …).
function unitChoicesFor(base){const b=findUnit(base);return UNIT_REGISTRY.filter(u=>{if(u.dim==='mass'||u.dim==='volume')return !!b&&b.dim===u.dim;if(u.fixed&&!u.fixed[base]&&b?.dim==='count')return false;return true})}
function unitIsMeasured(text,base){const u=findUnit(text),b=findUnit(base);return !!u&&(u.dim==='mass'||u.dim==='volume')&&!u.fixed&&!!b&&b.dim===u.dim||!!u&&!!b&&u===b}
