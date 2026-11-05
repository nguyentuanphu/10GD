// v1.7.6 (owner, 6 Nov 2026: "Copy for developer… why doesn't it feed through directly?"): every new ladybug report is
// also filed as an issue in a PRIVATE GitHub repository, where the developer agent reads and fixes it.
// Off unless both are set in the hosting environment:
//   FEEDBACK_GITHUB_REPO   owner/name of a private repository (never the public app repository)
//   FEEDBACK_GITHUB_TOKEN  fine-grained token limited to that repository, permission "Issues: read and write"
// What is sent: the reporter's words, type, status and the technical context (screen, size, language, build). Never the
// reporter's account, device key, IP, e-mail or the picture (pictures stay in Studio). A failure never blocks a report.
const REPO_RE=/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const TYPE_WORD:any={bug:'Lỗi / Bug',looks:'Hiển thị sai / Looks wrong',words:'Chữ, dịch / Words',idea:'Ý tưởng / Idea',other:'Khác / Other'};
const CTX_KEYS=['route','view','modal','platform','viewport','lang','theme','online','build','edition','standalone','textSize'];
export function githubConfig(env:any=process.env){const repo=String(env?.FEEDBACK_GITHUB_REPO||'').trim(),token=String(env?.FEEDBACK_GITHUB_TOKEN||'').trim();
 return REPO_RE.test(repo)&&token.length>=20?{repo,token}:null}
/** Issue title + body for one report (no personal identifiers). */
export function issueFor(rec:any){const note=String(rec?.note||'').replace(/\s+/g,' ').trim();
 const title=`[${rec?.type||'other'}] ${note.slice(0,80)}${note.length>80?'…':''}`;
 const ctx=CTX_KEYS.filter(k=>rec?.ctx?.[k]!==undefined&&rec?.ctx?.[k]!==null&&rec?.ctx?.[k]!=='').map(k=>`${k}=${rec.ctx[k]}`).join(', ');
 const quote=String(rec?.note||'').split('\n').map((l:string)=>'> '+l).join('\n');
 const errors=(Array.isArray(rec?.errors)?rec.errors:[]).slice(0,5).map((e:any)=>'- `'+String(e?.message||e||'').replace(/`/g,"'").slice(0,300)+'`').join('\n');
 const body=[`**${TYPE_WORD[rec?.type]||TYPE_WORD.other}** · ${String(rec?.at||'').slice(0,16).replace('T',' ')} UTC · FamTray feedback \`${rec?.id}\``,'',quote,'',
  ctx?`Context: ${ctx}`:null,errors?`\nErrors seen on the device:\n${errors}`:null,rec?.hasShot?'\nA picture is attached — open this report in Studio → Góp ý.':null,
  '\n<sub>Filed automatically from the in-app ladybug. Reply and status changes are made in Studio.</sub>'].filter(x=>x!==null).join('\n');
 return{title,body,labels:['feedback',String(rec?.type||'other')]}}
const GH_HEADERS=(token:string)=>({Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'FamTray-feedback'});
// Family words never go to a public repository: the repository must report itself private (checked once per instance).
const privacyChecked=new Map<string,boolean>();
export function resetGithubPrivacyCache(){privacyChecked.clear()}
async function repoIsPrivate(cfg:any,fetchFn:any,signal:any){if(privacyChecked.has(cfg.repo))return privacyChecked.get(cfg.repo);
 const res=await fetchFn(`https://api.github.com/repos/${cfg.repo}`,{headers:GH_HEADERS(cfg.token),signal});if(!res.ok)return false;const j:any=await res.json();const ok=j?.private===true;privacyChecked.set(cfg.repo,ok);return ok}
/** Files one report; returns {number,url} or {skipped|error}. Times out after 8 s. */
export async function fileIssue(rec:any,{env=process.env,fetchFn=fetch}:any={}){const cfg=githubConfig(env);if(!cfg)return{skipped:'not-configured'};
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),8000);
 try{if(!await repoIsPrivate(cfg,fetchFn,ctl.signal))return{error:'repo-not-private'};
  const res=await fetchFn(`https://api.github.com/repos/${cfg.repo}/issues`,{method:'POST',signal:ctl.signal,headers:GH_HEADERS(cfg.token),body:JSON.stringify(issueFor(rec))});
  if(!res.ok)return{error:'http-'+res.status};const j:any=await res.json();return Number.isInteger(j?.number)?{number:j.number,url:String(j.html_url||'')}:{error:'bad-response'}}
 catch(e:any){return{error:e?.name==='AbortError'?'timeout':'network'}}finally{clearTimeout(t)}}
