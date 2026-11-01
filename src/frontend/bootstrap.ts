'use strict';
// This entry point is checked with strict TypeScript independently of legacy globals.
declare function clearOfflineAccess(): void;
declare function rememberOfflineAccess(status: SessionStatus): Promise<void>;
declare function readOfflineAccess(): Promise<SessionStatus | null>;
interface SessionStatus {
  configured?: boolean;
  connected: boolean;
  mode?: 'guest' | 'account';
  household?: { id: string; role: string; memberId?: string };
  offlineGrant?: unknown;
}
interface Window {
  BEP_SESSION?: SessionStatus;
  BEP_OFFLINE?: boolean;
  BEP_STARTUP?: { cachedIdentity: boolean; packHash: string; ready?: number };
}
(async (): Promise<void> => {
  const local = ['terminal.local', 'localhost', '127.0.0.1'].includes(location.hostname);
  const scripts = ['storage-context.js','seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js','master-catalog.js','shopping-optimizer.js','app.js','dish-composition.js','artwork.js','unit-picker.js','family-features.js','shopping-planning.js','push-ui.js','simple-view.js','language.js','push-settings-ui.js','insights-ui.js','products-ui.js','price-scout-ui.js','family-menu-ui.js','household-ui.js','personal-ui.js'];
  // Replaced by the build with the startup pack's content hash. The service worker
  // answers instantly from its cache when hashes match and refreshes in the background.
  const packHash: string = '__BEP_STARTUP_PACK_HASH__';
  const params = new URLSearchParams(location.search);
  const retrying = params.has('startup-retry');
  let failed = false;
  let booting = true;
  let activeScript = '';
  const main = document.querySelector('main');
  if (main) {
    main.setAttribute('aria-busy', 'true');
    // A quiet skeleton without visible text keeps the layout steady while scripts start.
    const progress = document.createElement('div');
    progress.id = 'startup-progress';
    progress.className = 'startup-skeleton';
    progress.setAttribute('role', 'status');
    progress.setAttribute('aria-label', 'Đang tải / Loading');
    progress.innerHTML = '<span class="sk-line sk-eyebrow"></span><span class="sk-line sk-title"></span><span class="sk-line sk-sub"></span><span class="sk-row"><span class="sk-pill"></span><span class="sk-pill"></span><span class="sk-pill"></span></span><span class="sk-card"></span><span class="sk-card sk-card-short"></span>';
    main.append(progress);
  }
  const recover = async (target: string): Promise<void> => {
      // Retire this app's worker, not its caches or device data. A fresh navigation
      // can then escape an older worker stuck waiting for its own status request.
      const retireWorker = async (): Promise<void> => {
        if (!navigator.serviceWorker) return;
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.filter(reg => reg.scope === new URL('/', location.href).href).map(reg => reg.unregister()));
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([retireWorker(), new Promise<void>(resolve => { timer = setTimeout(resolve, 2000); })]);
      } catch { /* Navigation still offers recovery if the worker API is unavailable. */ }
      finally { clearTimeout(timer); location.replace(target); }
  };
  const showFailure = (message: string): void => {
    failed = true;
    document.documentElement.style.visibility = 'visible';
    // Recovery must remain clickable even if a partially initialized module opened a modal.
    document.querySelector('#modal-root')?.replaceChildren();
    document.querySelectorAll('.modal-backdrop').forEach(node => node.remove());
    document.body.style.overflow = '';
    const main = document.querySelector('main') ?? document.body.appendChild(document.createElement('main'));
    main.removeAttribute('aria-busy');
    const heading = document.createElement('h1');
    heading.textContent = 'Chưa mở được Bếp Gia Đình / Unable to open FamTray';
    const description = document.createElement('p');
    description.textContent = message;
    const note = document.createElement('p');
    note.textContent = 'Dữ liệu trên thiết bị vẫn được giữ. / Your device data has been kept.';
    const retry = document.createElement('button');
    retry.textContent = 'Thử lại / Retry';
    retry.className = 'btn primary';
    retry.style.minHeight = '48px';
    retry.onclick = async () => {
      retry.disabled = true;
      retry.textContent = 'Đang thử lại… / Retrying…';
      await recover('/?startup-retry=' + Date.now());
    };
    const login = document.createElement('a');
    login.textContent = 'Đăng nhập / Sign in';
    login.href = '/login?locked=1';
    login.className = 'btn';
    login.style.minHeight = '48px';
    login.onclick = event => { event.preventDefault(); void recover('/login?locked=1'); };
    main.replaceChildren(heading, description, note, retry, document.createTextNode(' '), login);
    main.setAttribute('role', 'alert');
  };
  const onError = (event: ErrorEvent): void => {
    if (!booting) return;
    const error = new Error(`Lỗi khởi động tại ${activeScript || 'bootstrap'}. Hãy thử tải lại. / Startup failed; please retry.`);
    console.error('Application startup error', activeScript, event.message);
    showFailure(error.message);

  };
  window.addEventListener('error', onError);
  const statusRequest = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      return await fetch('/.netlify/functions/family?op=status', {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
    } finally { clearTimeout(timer); }
  };
  type PackEntry = { name: string; code: string };
  const validPack = (pack: unknown): PackEntry[] | null => {
    const entries = (pack as { version?: unknown; scripts?: unknown } | null)?.scripts;
    if ((pack as { version?: unknown } | null)?.version !== 1 || !Array.isArray(entries) || entries.length !== scripts.length ||
      !entries.every((entry: { name?: unknown; code?: unknown }, index: number) => entry?.name === scripts[index] && typeof entry.code === 'string')) return null;
    return entries as PackEntry[];
  };
  // Fetch a single source pack. Each classic script is still inserted separately so
  // lexical globals and override order stay unchanged; fetching first also makes
  // timeout cancellation reliable.
  const loadPack = async (): Promise<PackEntry[]> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const download = async (fresh: boolean): Promise<PackEntry[]> => {
      const url = '/startup-scripts.json?v=' + encodeURIComponent(packHash) + (fresh ? '&fresh=1' : '');
      const response = await fetch(url, { credentials: 'same-origin', cache: fresh ? 'reload' : 'no-cache', signal: controller.signal });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        if (!fresh) return download(true);
        throw new Error('Chưa tải được ứng dụng. Thử lại hoặc đăng nhập lại. / Unable to download the app.');
      }
      const entries = validPack(await response.json());
      // An earlier release's cached pack may run while the worker refreshes it, but only
      // when it matches this loader's script order; otherwise force the network.
      if (!entries) {
        if (!fresh) return download(true);
        throw new Error('Bản tải chưa đầy đủ. Hãy thử tải lại. / Incomplete application download.');
      }
      return entries;
    };
    try {
      return await download(retrying);
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Tải ứng dụng quá lâu. Thử lại hoặc đăng nhập lại. / Loading timed out.');
      if (error instanceof TypeError) throw new Error('Chưa tải được ứng dụng. Kiểm tra kết nối rồi thử lại. / Unable to download the app; check your connection.');
      throw error;
    } finally { clearTimeout(timer); }
  };
  // Missing and null fields are the same identity (servers may omit an unlinked memberId).
  const norm = (value: unknown): unknown => value ?? null;
  const sameIdentity = (status: SessionStatus): boolean => norm(status.household?.id) === norm(window.BEP_SESSION?.household?.id) &&
    norm(status.household?.role) === norm(window.BEP_SESSION?.household?.role) && norm(status.household?.memberId) === norm(window.BEP_SESSION?.household?.memberId);
  // Confirms the session after the app is visible; content stays on screen meanwhile.
  let checking = false;
  const check = async (pending?: Promise<Response>, initial = false): Promise<void> => {
    if (checking || failed) return;
    checking = true;
    // A session that ended before a cached identity was confirmed reopens normally
    // (without locking device-only mode); later expiry keeps the earlier behaviour.
    const leave = (): void => { clearOfflineAccess(); location.replace(initial ? '/' : '/?mode=guest'); };
    try {
      const response = await (pending ?? statusRequest());
      if ([401,403].includes(response.status)) { leave(); return; }
      const status: SessionStatus | null = response.ok ? await response.json() : null;
      if (status?.connected && status.mode === 'account' && !sameIdentity(status)) {
        // Store the new identity first and confirm before using a cache after reload.
        // Never reload more than twice per browser session for an identity change (loop guard).
        let reloads = 0;
        try { reloads = Number(sessionStorage.getItem('bep-identity-reloads') || 0); sessionStorage.setItem('bep-identity-reloads', String(reloads + 1)); } catch { /* storage unavailable */ }
        if (reloads >= 2) { if (status.offlineGrant) await rememberOfflineAccess(status); return; }
        try { sessionStorage.setItem('bep-boot-confirm', '1'); } catch { /* reload still works */ }
        if (status.offlineGrant) await rememberOfflineAccess(status);
        else try { localStorage.removeItem('bep-offline-access-v1'); } catch { /* best effort */ }
        location.reload(); return;
      }
      if (response.ok && !status?.connected) { leave(); return; }
      if (status) { await rememberOfflineAccess(status); window.BEP_OFFLINE = false; }
      else if (!await readOfflineAccess()) leave();
      else window.BEP_OFFLINE = true;
    } catch {
      if (!await readOfflineAccess()) leave();
      else window.BEP_OFFLINE = true;
    } finally {
      checking = false;
      document.documentElement.style.visibility = 'visible';
      window.dispatchEvent(new Event('bep-connectivity'));
    }
  };
  try {
    let deviceOnly=params.get('mode')==='guest';
    if(deviceOnly)try{localStorage.setItem('bep-local-locked','yes')}catch{}
    try{deviceOnly ||= localStorage.getItem('bep-local-locked')==='yes'}catch{}
    window.BEP_SESSION={configured:true,connected:false,mode:'guest'};
    if(deviceOnly)clearOfflineAccess();
    // The non-HttpOnly marker cookie keeps account intent when iOS clears site storage.
    let wantsAccount=params.get('connect')==='1'||/(?:^|;\s*)bep-account=1(?:;|$)/.test(document.cookie);
    try{wantsAccount ||= localStorage.getItem('bep-account-present')==='yes'||!!localStorage.getItem('bep-offline-access-v1')}catch{}
    window.BEP_OFFLINE=!navigator.onLine;
    // Download the app while the account is checked, not one after the other.
    const packPromise = loadPack();
    packPromise.catch(() => { /* reported when awaited below */ });
    let pendingConfirmation: Promise<Response> | undefined;
    let cachedIdentity = false;
    if(!local&&!deviceOnly&&wantsAccount){
      const pending=statusRequest();
      pending.catch(() => { /* handled where awaited */ });
      let confirmFirst=false;
      try{confirmFirst=sessionStorage.getItem('bep-boot-confirm')==='1';sessionStorage.removeItem('bep-boot-confirm')}catch{}
      const cached=confirmFirst?null:await readOfflineAccess();
      if(cached?.connected&&cached.mode==='account'){
        // A verified identity from an earlier launch opens the kitchen immediately;
        // the live status check below may still switch family or leave the account.
        window.BEP_SESSION=cached;cachedIdentity=true;pendingConfirmation=pending;
      }else{
        try{
          const response=await pending;
          if(response.ok){
            const status:SessionStatus=await response.json();
            if(status.connected&&status.mode==='account'){window.BEP_SESSION=status;try{localStorage.setItem('bep-account-present','yes')}catch{}await rememberOfflineAccess(status)}
            else clearOfflineAccess();
          }else if([401,403].includes(response.status))clearOfflineAccess();
        }catch{
          const offline=await readOfflineAccess();
          if(offline)window.BEP_SESSION=offline;
          window.BEP_OFFLINE=!navigator.onLine||!!offline;
        }
      }
    }
    window.BEP_STARTUP={cachedIdentity,packHash};
    const entries = await packPromise;
    for (const entry of entries) {
      if (failed) return;
      activeScript = entry.name;
      const script = document.createElement('script');
      script.textContent = entry.code + '\n//# sourceURL=' + new URL(entry.name, location.href).href;
      document.body.append(script);
      if (failed) return;
    }
    document.querySelector('#startup-progress')?.remove();
    document.querySelector('main')?.removeAttribute('aria-busy');
    if (!document.querySelector('#main')?.textContent?.trim()) throw new Error('Ứng dụng chưa hiển thị nội dung. Hãy thử lại. / The app did not render; please retry.');
    window.BEP_STARTUP.ready = performance.now();
    if (!local && window.BEP_SESSION?.mode==='account') {
      if (pendingConfirmation) void check(pendingConfirmation, true);
      window.addEventListener('pageshow', () => { void check(); });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) void check(); });
      setInterval(() => { void check(); }, 60000);
    }
  } catch (error) {
    showFailure(error instanceof Error ? error.message : 'Chưa tải được ứng dụng. / Unable to load the app.');
  } finally {
    booting = false;
    window.removeEventListener('error', onError);
  }
})();
