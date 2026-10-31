'use strict';
// This entry point is checked with strict TypeScript independently of legacy globals.
declare function clearOfflineAccess(): void;
declare function rememberOfflineAccess(status: SessionStatus): Promise<void>;
declare function readOfflineAccess(): Promise<SessionStatus | null>;
interface SessionStatus {
  configured?: boolean;
  connected: boolean;
  mode?: 'legacy' | 'account';
  household?: { id: string; role: string; memberId?: string };
}
interface Window {
  BEP_SESSION?: SessionStatus;
  BEP_OFFLINE?: boolean;
}
(async (): Promise<void> => {
  const local = ['terminal.local', 'localhost', '127.0.0.1'].includes(location.hostname);
  const scripts = ['storage-context.js','seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js','app.js','artwork.js','unit-picker.js','family-features.js','shopping-planning.js','push-ui.js','simple-view.js','language.js','push-settings-ui.js','insights-ui.js','products-ui.js','family-menu-ui.js','household-ui.js','personal-ui.js'];
  let failed = false;
  let booting = true;
  let activeScript = '';
  const main = document.querySelector('main');
  if (main) {
    main.setAttribute('aria-busy', 'true');
    const progress = document.createElement('p');
    progress.id = 'startup-progress';
    progress.setAttribute('role', 'status');
    progress.textContent = 'Đang mở bếp… / Opening your kitchen…';
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
    heading.textContent = 'Chưa mở được Bếp Gia Đình / Unable to open the app';
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
  try {
    try {
      if (localStorage.getItem('bep-local-locked') === 'yes') {
        location.replace('/login?locked=1'); return;
      }
    } catch { /* Storage can be unavailable; authentication still runs. */ }
    if (!local) {
      try {
        const response = await statusRequest();
        if ([401,403].includes(response.status)) {
          clearOfflineAccess(); showFailure('Cần đăng nhập lại. / Please sign in again.'); return;
        }
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Status unavailable');
        const status: SessionStatus = await response.json();
        if (!status.configured || !status.connected) {
          clearOfflineAccess(); location.replace('/login?return=' + encodeURIComponent(location.pathname) + location.hash); return;
        }
        window.BEP_SESSION = status;
        await rememberOfflineAccess(status);
        try { sessionStorage.setItem('bep-access-checked', 'yes'); } catch { /* Optional marker. */ }
      } catch {
        const offline = await readOfflineAccess();
        if (!offline) { showFailure('Cần mạng để kiểm tra đăng nhập. Thử lại khi có kết nối. / Connect to the internet and retry.'); return; }
        window.BEP_SESSION = offline;
        window.BEP_OFFLINE = true;
      }
    }
    // Fetch a single authenticated source pack. Each classic script is still
    // inserted separately so lexical globals and override order stay unchanged.
    // Removing a pending external <script> does not guarantee it stops executing;
    // fetching first also makes timeout cancellation reliable.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    let pack: unknown;
    try {
      const response = await fetch('/startup-scripts.json', {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Chưa tải được ứng dụng. Thử lại hoặc đăng nhập lại. / Unable to download the app.');
      }
      pack = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Tải ứng dụng quá lâu. Thử lại hoặc đăng nhập lại. / Loading timed out.');
      throw error;
    } finally { clearTimeout(timer); }
    const entries = (pack as { version?: unknown; scripts?: unknown } | null)?.scripts;
    if ((pack as { version?: unknown } | null)?.version !== 1 || !Array.isArray(entries) || entries.length !== scripts.length ||
      !entries.every((entry: { name?: unknown; code?: unknown }, index: number) => entry?.name === scripts[index] && typeof entry.code === 'string')) {
      throw new Error('Bản tải chưa đầy đủ. Hãy thử tải lại. / Incomplete application download.');
    }
    for (const entry of entries as { name: string; code: string }[]) {
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
    if (!local) {
      let checking = false;
      const check = async (): Promise<void> => {
        if (checking || failed) return;
        checking = true;
        // Keep existing content visible while checking the session; never hide it during a slow request.
        try {
          const response = await statusRequest();
          if ([401,403].includes(response.status)) {
            clearOfflineAccess(); showFailure('Cần đăng nhập lại. / Please sign in again.'); return;
          }
          const status: SessionStatus | null = response.ok ? await response.json() : null;
          if (status?.connected && status.mode === 'account' &&
            (status.household?.id !== window.BEP_SESSION?.household?.id || status.household?.role !== window.BEP_SESSION?.household?.role || status.household?.memberId !== window.BEP_SESSION?.household?.memberId)) {
            location.reload(); return;
          }
          if (response.ok && !status?.connected) { clearOfflineAccess(); location.replace('/login'); return; }
          if (status) { await rememberOfflineAccess(status); window.BEP_OFFLINE = false; }
          else if (!await readOfflineAccess()) showFailure('Cần kết nối lại để đăng nhập. / Reconnect to sign in.');
          else window.BEP_OFFLINE = true;
        } catch {
          if (!await readOfflineAccess()) showFailure('Cần mạng để kiểm tra phiên đăng nhập. / Reconnect to verify your session.');
          else window.BEP_OFFLINE = true;
        } finally {
          checking = false;
          document.documentElement.style.visibility = 'visible';
          window.dispatchEvent(new Event('bep-connectivity'));
        }
      };
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
