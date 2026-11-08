// v1.7.15 (owner, 8 Nov 2026: “Làm app cho máy cũ hoạt động luôn được chứ”; pop-up: in v1.7.15, missing parts hidden with a short note).
// Loaded first, only on old browsers (e.g. iPad Air 1 / iOS 12, Safari 12), before the app translated to ES2017 (dist/legacy/).
// Written in plain ES5 on purpose: each piece only fills what the browser lacks, so a newer browser is never changed.
/* eslint-disable */
(function(){
 var w:any=window as any,AP:any=Array.prototype,SP:any=String.prototype,OP:any=Object;
 function def(o:any,k:string,v:any){if(!(k in o))try{Object.defineProperty(o,k,{value:v,writable:true,configurable:true,enumerable:false})}catch(e){o[k]=v}}
 if(typeof w.globalThis==='undefined')w.globalThis=w;
 def(OP,'hasOwn',function(o:any,k:any){return Object.prototype.hasOwnProperty.call(o,k)});
 def(OP,'fromEntries',function(it:any){var o:any={};var a=Array.from(it);for(var i=0;i<a.length;i++)o[a[i][0]]=a[i][1];return o});
 var at=function(this:any,n:number){n=Math.trunc(n)||0;if(n<0)n+=this.length;return n<0||n>=this.length?undefined:this[n]};
 def(AP,'at',at);def(SP,'at',at);
 def(AP,'flat',function(this:any,d?:number){d=d===undefined?1:d;var out:any[]=[];(function f(a:any[],k:number){for(var i=0;i<a.length;i++){if(Array.isArray(a[i])&&k>0)f(a[i],k-1);else out.push(a[i])}})(this,d);return out});
 def(AP,'flatMap',function(this:any,fn:any,t?:any){return AP.map.call(this,fn,t).flat(1)});
 def(SP,'replaceAll',function(this:any,a:any,b:any){if(a instanceof RegExp)return this.replace(a,b);return this.split(a).join(b)});
 def(SP,'matchAll',function(this:any,re:any){var s=String(this),r=new RegExp(re.source,re.flags.indexOf('g')<0?re.flags+'g':re.flags),out:any[]=[],m;while((m=r.exec(s))!==null){out.push(m);if(m[0]==='')r.lastIndex++}return out[Symbol.iterator]()});
 def(SP,'trimStart',SP.trimLeft);def(SP,'trimEnd',SP.trimRight);
 if(typeof w.structuredClone!=='function')w.structuredClone=function(v:any){return v===undefined?undefined:JSON.parse(JSON.stringify(v))};
 if(typeof w.queueMicrotask!=='function')w.queueMicrotask=function(f:any){Promise.resolve().then(f)};
 if(!(Promise as any).allSettled)(Promise as any).allSettled=function(ps:any){return Promise.all(Array.from(ps).map(function(p:any){return Promise.resolve(p).then(function(value:any){return{status:'fulfilled',value:value}},function(reason:any){return{status:'rejected',reason:reason}})}))};
 if(w.crypto&&!w.crypto.randomUUID)w.crypto.randomUUID=function(){var b=new Uint8Array(16);w.crypto.getRandomValues(b);b[6]=b[6]&15|64;b[8]=b[8]&63|128;var h:string[]=[];for(var i=0;i<16;i++)h.push((b[i]+256).toString(16).slice(1));return h.slice(0,4).join('')+'-'+h.slice(4,6).join('')+'-'+h.slice(6,8).join('')+'-'+h.slice(8,10).join('')+'-'+h.slice(10).join('')};
 var EP:any=w.Element&&w.Element.prototype;if(EP){def(EP,'replaceChildren',function(this:any){while(this.firstChild)this.removeChild(this.firstChild);for(var i=0;i<arguments.length;i++)this.append(arguments[i])});def(EP,'toggleAttribute',function(this:any,n:string,f?:boolean){var on=f===undefined?!this.hasAttribute(n):!!f;if(on)this.setAttribute(n,'');else this.removeAttribute(n);return on})}
 // matchMedia(...).addEventListener('change') arrived in Safari 14
 var MQ:any=w.MediaQueryList&&w.MediaQueryList.prototype;if(MQ&&!MQ.addEventListener){MQ.addEventListener=function(this:any,t:string,f:any){if(t==='change')this.addListener(f)};MQ.removeEventListener=function(this:any,t:string,f:any){if(t==='change')this.removeListener(f)}}
 // Look-behind in a pattern (Safari 16.4+): the app only uses it for word edges, so an old browser drops it (a slightly looser match)
 try{new RegExp('(?<!a)b')}catch(e){var N:any=RegExp;var R:any=function(p:any,f?:any){if(typeof p==='string'&&p.indexOf('(?<')>=0){try{return new N(p,f)}catch(err){p=p.replace(/\(\?<[=!](?:\[(?:\\.|[^\]])*\]|\\.|[^()[\]])*\)/g,'')}}return new N(p,f)};R.prototype=N.prototype;try{Object.getOwnPropertyNames(N).forEach(function(k){if(!(k in R))try{R[k]=N[k]}catch(x){}})}catch(x){}w.RegExp=R}
 // Pointer events (Safari 13+): touch and mouse are passed on as pointerdown / pointermove / pointerup for the few drag handles
 if(!w.PointerEvent){var map:any={touchstart:'pointerdown',touchmove:'pointermove',touchend:'pointerup',touchcancel:'pointercancel',mousedown:'pointerdown',mousemove:'pointermove',mouseup:'pointerup'};
  Object.keys(map).forEach(function(t){document.addEventListener(t,function(ev:any){var p=ev.changedTouches?ev.changedTouches[0]:ev;if(!p)return;var e2:any=document.createEvent('Event');e2.initEvent(map[t],true,true);e2.clientX=p.clientX;e2.clientY=p.clientY;e2.pointerId=1;e2.isPrimary=true;e2.pointerType=ev.changedTouches?'touch':'mouse';
   var target=ev.changedTouches&&t!=='touchstart'?document.elementFromPoint(p.clientX,p.clientY)||ev.target:ev.target;target.dispatchEvent(e2);if(e2.defaultPrevented&&ev.cancelable&&t==='touchmove')ev.preventDefault()},{passive:false,capture:true} as any)});
  if(EP){def(EP,'setPointerCapture',function(){});def(EP,'releasePointerCapture',function(){})}}
 document.documentElement.className+=' legacy';
})();
