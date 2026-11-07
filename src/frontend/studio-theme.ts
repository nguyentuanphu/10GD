// Studio, first thing in <head> (before paint): its own light / dark choice. v1.7.11: moved out of an inline script into TypeScript.
(()=>{try{const p=localStorage.getItem('studio-theme')||'auto';document.documentElement.dataset.theme=p==='dark'||p==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}})();
