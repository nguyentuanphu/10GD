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
  let rejectActive: ((reason: Error) => void) | undefined;
  const showFailure = (message: string): void => {
    failed = true;
    document.documentElement.style.visibility = 'visible';
    const main = document.querySelector('main') ?? document.body.appendChild(document.createElement('main'));
    const heading = document.createElement('h1');
    heading.textContent = 'Chưa mở được Bếp Gia Đình / Unable to open the app';
    const description = document.createElement('p');
    description.textContent = message;
    const note = document.createElement('p');
    note.textContent = 'Dữ liệu trên thiết bị vẫn được giữ. / Your device data has been kept.';
    const retry = document.createElement('button');
    retry.textContent = 'Thử lại / Retry';
    retry.className = 'btn primary';
    retry.onclick = () => location.reload();
    const login = document.createElement('a');
    login.textContent = 'Đăng nhập / Sign in';
    login.href = '/login';
    login.className = 'btn';
    main.replaceChildren(heading, description, note, retry, document.createTextNode(' '), login);
    main.setAttribute('role', 'alert');
  };
  const onError = (event: ErrorEvent): void => {
    if (!booting) return;
    const error = new Error(`Lỗi khởi động tại ${activeScript || 'bootstrap'}. Hãy thử tải lại. / Startup failed; please retry.`);
    console.error('Application startup error', activeScript, event.message);
    showFailure(error.message);
    rejectActive?.(error);
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
    for (const src of scripts) {
      if (failed) return;
      activeScript = src;
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        let timer: ReturnType<typeof setTimeout>;
        const finish = (error?: Error): void => {
          clearTimeout(timer);
          rejectActive = undefined;
          script.onload = script.onerror = null;
          if (error) { script.remove(); reject(error); } else resolve();
        };
        rejectActive = error => finish(error);
        timer = setTimeout(() => finish(new Error(`Tải ${src} quá lâu. Kiểm tra mạng rồi thử lại. / Loading timed out.`)), 15000);
        script.src = src;
        script.async = false;
        script.onload = () => finish();
        script.onerror = () => finish(new Error(`Chưa tải được ${src}. Kiểm tra mạng rồi thử lại. / Unable to load the app.`));
        document.body.append(script);
      });
    }
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
