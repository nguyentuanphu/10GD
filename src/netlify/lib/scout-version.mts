// v1.7.2 extension update check. The newest FamTray So Giá / Price Check extension version
// shipped with THIS deploy (the production build zips extension/manifest.json at the same
// commit, so the server and dist/downloads/famtray-scout.zip always agree). Kept in sync
// with extension/manifest.json by tests (scout-api, scout-release); never read at runtime
// from disk, so the serverless bundle needs no extra files.
export const EXTENSION_VERSION='1.7.3';
export const EXTENSION_ZIP_PATH='/downloads/famtray-scout.zip';
/** Compares dotted numeric versions ("1.7.10" > "1.7.9"). Non-numeric parts count as 0. */
export function versionCmp(a:any,b:any){const pa=String(a||'').split('.').map(x=>parseInt(x,10)||0),pb=String(b||'').split('.').map(x=>parseInt(x,10)||0);for(let i=0;i<Math.max(pa.length,pb.length,3);i++){const d=(pa[i]||0)-(pb[i]||0);if(d)return d<0?-1:1}return 0}
/** True only when the device reported a version and it is older than this deploy's. */
export function isOutdated(version:any,latest:string=EXTENSION_VERSION){return /^\d+(\.\d+){0,3}$/.test(String(version||''))&&versionCmp(version,latest)<0}
