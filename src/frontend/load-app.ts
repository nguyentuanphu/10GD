// v1.7.15 (owner, 8 Nov 2026: “Làm app cho máy cũ hoạt động luôn được chứ”): the first script of index.html. It is written in plain ES5
// on purpose (Safari 12 must be able to read it): browsers without ES2022 syntax, Object.hasOwn, .at() or structuredClone (e.g. iPad Air 1)
// get the copy translated to ES2017 with the missing pieces filled (dist/legacy/); every newer browser loads exactly what it did before.
(function(){
 var old=false;
 try{new Function('class A{#p=1;static s=1}var o={};return o?.a??1')()}catch(e){old=true}
 var w:any=window;
 if(!old&&!((Object as any).hasOwn&&([] as any).at&&w.structuredClone))old=true;
 w.BEP_LEGACY=old;
 var list=old?['legacy/polyfills.js','legacy/offline-access.js','legacy/bootstrap.js']:['offline-access.js','bootstrap.js'];
 for(var i=0;i<list.length;i++)document.write('<script src="'+list[i]+'"><\/script>');
})();
