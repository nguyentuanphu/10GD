// Privacy & terms page, end of <body>: VI │ EN switch, title, and #section links that jump to the visible language
// (English sections use -en ids). v1.7.11: moved out of an inline script into TypeScript.
(()=>{const d=document.documentElement;
 const sync=()=>{const l=d.dataset.lang;if(l)d.lang=l;document.title=l==='en'?'Privacy & terms · FamTray · Bếp Nhà':'Quyền riêng tư & điều khoản · FamTray · Bếp Nhà';for(const b of document.querySelectorAll<HTMLElement>('[data-set-lang]'))b.setAttribute('aria-pressed',String(b.dataset.setLang===l))};
 document.addEventListener('click',e=>{const b=(e.target as Element|null)?.closest?.<HTMLElement>('[data-set-lang]');if(!b)return;d.dataset.lang=b.dataset.setLang||'vi';sync()});
 const jump=()=>{const h=location.hash.slice(1);if(!h)return;const id=d.dataset.lang==='en'&&!/-en$/.test(h)?h+'-en':h,el=document.getElementById(id);el?.scrollIntoView?.();if(el&&id!==h){el.style.boxShadow='0 0 0 2px var(--brand)';el.style.borderColor='var(--brand)'}};
 document.addEventListener('click',e=>{const a=(e.target as Element|null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');if(!a||d.dataset.lang!=='en')return;e.preventDefault();history.replaceState(null,'',a.getAttribute('href'));jump()});
 sync();addEventListener('load',jump);addEventListener('hashchange',jump)})();
