// Privacy & terms page, first thing in <head> (before paint): colour mode and language. v1.7.11: was an inline script in
// privacy.html; now TypeScript like the rest of the app (owner rule: everything is written in TS).
// Language: ?lang= wins, then a language saved on this device, then the phone/browser language (vi first → Vietnamese, else English).
(()=>{let theme='auto',lang='';
 try{theme=localStorage.getItem('bep-theme-mode')||'auto';for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&/bep-language$/.test(k)){lang=localStorage.getItem(k)||'';if(k.startsWith('guest/'))break}}}catch{}
 const q=/[?&]lang=(vi|en)/.exec(location.search);if(q)lang=q[1];
 if(lang!=='en'&&lang!=='vi'){lang='en';const list=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''];for(const l of list){const b=String(l||'').toLowerCase().slice(0,2);if(b==='vi'||b==='en'){lang=b;break}}}
 const d=document.documentElement;d.dataset.theme=theme==='dark'||theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.dataset.lang=lang;d.lang=lang})();
