import {useRef,useState} from 'react';
import {apiFetch} from '@/lib/urls';
import {durationText,type Session,type ActiveSession} from '../study-timer-model';
import './style.css';
type Progress={date:string;status:string;updatedAt:string;version:number;deferredTo?:string};
type Entry={id:string;kind:string;archived?:boolean;updatedAt:string;data:Record<string,unknown>};
type Visit={deleted?:boolean;id:string;at:string;clientAt?:string;path:string;title?:string;href?:string;referrer?:string;language?:string;timezone?:string;device?:string;userAgent?:string;platform?:string;screen?:string;viewport?:string;sessionId?:string;visitorId?:string;ip?:string;networkRegion?:string;connection?:string;visibility?:string;pixelRatio?:number};
type Snapshot={fetchedAt:string;progress:Progress[];timer:{active:ActiveSession|null;sessions:Session[]};entries:Entry[];visits?:Visit[]};
const time=(s?:string)=>s?new Date(s).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未记录';
const day=(s?:string)=>s?new Date(s).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}):'';
const labels:Record<string,string>={todo:'未开始',doing:'进行中',done:'已完成',deferred:'已顺延'};
export default function Admin(){
 const inFlight=useRef(false);
 const [notice,setNotice]=useState('');
 const [pending,setPending]=useState<{action:string;ids:string[]}|null>(null);
 const [selected,setSelected]=useState<string[]>([]);
 const [key,setKey]=useState(''),[data,setData]=useState<Snapshot|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[deleted,setDeleted]=useState(false),[date,setDate]=useState(''),[showDeletedVisits,setShowDeletedVisits]=useState(false),[visitDay,setVisitDay]=useState(''),[visitPath,setVisitPath]=useState('');const secret=useRef('');
 async function load(accessKey=secret.current,change:Record<string,unknown>={}){
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setNotice('');
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
   const result=await Promise.race([
    (async()=>{const response=await apiFetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessKey,...change})});return {response,body:await response.json()};})(),
    new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('连接等待超时，按钮已恢复。若刚执行删除或恢复，请先刷新数据确认结果。')),20000)})
   ]);
   const {response,body}=result;
   if(!response.ok){if(response.status===401){secret.current='';setData(null)}throw new Error(body.error||'读取失败')}
   secret.current=accessKey;setKey('');setData(body);if(change.action)setSelected([]);setPending(null);
   setNotice(change.action?'操作已完成，列表已更新。':'刷新成功，已读取最新云端记录。');
  }catch(e){setError((e as Error).message)}finally{clearTimeout(timeout);inFlight.current=false;setBusy(false)}
 }

 const sessions=data?.timer.sessions||[],visible=sessions.filter(s=>(deleted||!s.deleted)&&(!date||s.date===date)).sort((a,b)=>b.startedAt.localeCompare(a.startedAt)),first=data?.progress.find(r=>r.date==='2026-10-08');
 const allVisits=[...data?.visits||[]].sort((a,b)=>b.at.localeCompare(a.at));
 const today=day(new Date().toISOString());
 const visits=allVisits.filter(v=>!v.deleted);
 const shownVisits=(showDeletedVisits?allVisits:visits).filter(v=>(!visitDay||day(v.at)===visitDay)&&(!visitPath||(v.path||'').includes(visitPath)||(v.title||'').includes(visitPath)));
 const selectedVisits=shownVisits.filter(v=>selected.includes(v.id));
 async function bulk(deleting:boolean){
  const ids=selectedVisits.filter(v=>deleting?!v.deleted:v.deleted).map(v=>v.id);
  if(!ids.length){setError(deleting?'请先勾选需要删除的访问记录。':'请先打开“显示已删除”，再勾选需要恢复的记录。');return;}
  setError('');setPending({action:deleting?'deleteVisits':'restoreVisits',ids});
 }
 const unique=(key:keyof Visit)=>new Set(visits.map(v=>String(v[key]||'')).filter(Boolean)).size;
 function taskTimes(taskDate:string){
  const records=sessions.filter(s=>s.date===taskDate&&!s.deleted);
  const active=data?.timer.active?.date===taskDate?data.timer.active:null;
  const starts=[...records.map(s=>s.startedAt),...(active?[active.startedAt]:[])].sort();
  const ends=records.map(s=>s.endedAt).sort();
  return {start:time(starts[0]),end:active?(active.endedAt?`${time(active.endedAt)}（待确认）`:active.phase==='paused'?'已暂停，尚未结束':'计时中，尚未结束'):time(ends.at(-1))};
 }
 return <main className="admin-shell"><header className="admin-top"><div><p>小翁自习室 · 管理后台</p><h1>学习记录管理</h1></div><a href="https://niko-kang.github.io/shiguang-study/plan/">返回学习页面 ↗</a></header>
 {!data?<section className="admin-login"><h2>后台访问</h2><p>输入专属访问密钥，查看访问记录、云端打卡和原始学习记录。学习网站前台不会显示这些日志。</p><form onSubmit={e=>{e.preventDefault();void load(key)}}><label>访问密钥<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} required/></label><button disabled={busy||!key}>{busy?'正在验证…':'进入后台'}</button></form><small>密钥仅在当前页面内存中使用，退出后清除。学习记录只读；访问记录可删除或恢复。</small></section>:<>
 <div className="admin-toolbar"><span>读取时间：{time(data.fetchedAt)} · 北京时间</span><div><button disabled={busy} onClick={()=>load()}>{busy?'读取中…':'刷新数据'}</button><button disabled={busy} onClick={()=>{setNotice('');secret.current='';setKey('');setData(null)}}>退出后台</button></div></div>
 {notice&&<p role="status" className="admin-notice">{notice}</p>}<section className="admin-stats"><article><span>已完成任务</span><strong>{data.progress.filter(r=>r.status==='done').length}</strong></article><article><span>有效打卡</span><strong>{sessions.filter(s=>!s.deleted).length}</strong></article><article><span>累计学习时长</span><strong>{durationText(sessions.filter(s=>!s.deleted).reduce((n,s)=>n+s.durationMs,0))}</strong></article><article><span>错题 / 模拟考试</span><strong>{data.entries.filter(e=>e.kind==='mistake'&&!e.archived).length} / {data.entries.filter(e=>e.kind==='exam'&&!e.archived).length}</strong></article><article><span>今日访问</span><strong>{visits.filter(v=>day(v.at)===today).length}</strong></article><article><span>最近访问 / 访客</span><strong>{visits.length} / {unique('visitorId')}</strong></article></section>
 <section className="admin-panel first-record"><div><p>第一天 · 2026年10月8日</p><h2>{first?labels[first.status]||first.status:'暂无记录'}</h2></div><div><p>最后保存：{time(first?.updatedAt)}</p><p>原始进度记录 · 版本 {first?.version??'—'} · 当时未记录学习时长、设备和 IP。</p></div></section>
 <section className="admin-panel"><div className="admin-section-head"><h2>访问记录</h2><div><label><input type="checkbox" checked={showDeletedVisits} onChange={e=>setShowDeletedVisits(e.target.checked)}/>显示已删除</label><label>日期 <input type="date" value={visitDay} onChange={e=>setVisitDay(e.target.value)}/></label><label>页面 <input value={visitPath} onChange={e=>setVisitPath(e.target.value)} placeholder="路径或标题"/></label></div></div><p className="admin-footnote">仅后台可见。记录打开学习站的时间、页面、来源、设备和公网 IP 推测地区；同一浏览器会保留访客编号，同一标签页保留会话编号。最多显示最近 500 条。</p><div className="admin-toolbar" style={{margin:'16px 0',flexWrap:'wrap'}}><span>请先勾选记录 · 已选 {selectedVisits.length} 条</span><div><button disabled={busy} onClick={()=>void bulk(true)}>批量删除</button><button disabled={busy} onClick={()=>void bulk(false)}>批量恢复</button><button disabled={busy} onClick={()=>setSelected([])}>取消选择</button></div></div><div className="admin-table-wrap"><table className="visit-table"><colgroup>{[64,165,180,170,210,160,190,125,185,85].map((width,i)=><col key={i} style={{width}}/>)}</colgroup><thead><tr><th><label>全选 <input type="checkbox" aria-label="全选当前筛选结果" disabled={busy||!shownVisits.length} checked={shownVisits.length>0&&shownVisits.every(v=>selected.includes(v.id))} onChange={e=>setSelected(e.target.checked?shownVisits.map(v=>v.id):[])}/></label></th><th>北京时间</th><th>页面</th><th>来源</th><th>设备 / 屏幕</th><th>IP 推测地区</th><th>公网 IP</th><th>语言 / 时区</th><th>访客 / 会话</th><th>操作</th></tr></thead><tbody>{shownVisits.map(v=><tr key={v.id}><td><input type="checkbox" aria-label={`选择访问记录 ${time(v.at)} ${v.path}`} disabled={busy} checked={selected.includes(v.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,v.id]:old.filter(id=>id!==v.id))}/></td><td>{time(v.at)}{v.clientAt&&v.clientAt!==v.at&&<small>设备时间 {time(v.clientAt)}</small>}</td><td>{v.title||'未记录'}<small>{v.path||v.href||'—'}</small></td><td>{v.referrer||'直接打开 / 无来源'}</td><td>{v.device||'未记录'}<small>{[v.viewport||v.screen,v.connection].filter(Boolean).join(' · ')}</small>{v.userAgent&&<details className="device-details"><summary>浏览器详情</summary><small>{v.userAgent}</small></details>}</td><td>{v.networkRegion||'未记录'}</td><td className="admin-ip">{v.ip||'未记录'}</td><td>{v.language||'未记录'}<small>{v.timezone||'—'}</small></td><td className="admin-ip">{v.visitorId||'未记录'}<small>{v.sessionId||'—'}</small></td><td><button disabled={busy} onClick={()=>{setError('');setPending({action:v.deleted?'restoreVisits':'deleteVisits',ids:[v.id]})}}>{v.deleted?'恢复':'删除'}</button></td></tr>)}</tbody></table>{shownVisits.length===0&&<p className="admin-empty">当前筛选下没有访问记录。新访问会在打开正式学习站后出现。</p>}</div></section>
 {!data.timer.active&&data.progress.some(r=>r.status==='doing')&&<section className="admin-panel"><h2>任务状态与计时</h2><p className="admin-footnote">有任务标记为“进行中”，但云端当前没有运行中的计时。任务状态与计时记录分别保存；确认打卡后才生成打卡明细。</p></section>}
 {data.timer.active&&<section className="admin-panel"><h2>当前计时 · 尚未打卡</h2><p>任务 {data.timer.active.date} · {{running:'进行中',paused:'已暂停',review:'待确认打卡'}[data.timer.active.phase]}</p><p>开始于 {time(data.timer.active.startedAt)}</p></section>}
 <section className="admin-panel"><div className="admin-section-head"><h2>打卡明细（已确认）</h2><div><label>任务日期 <input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label><input type="checkbox" checked={deleted} onChange={e=>setDeleted(e.target.checked)}/>含已删除 / 测试记录</label></div></div><div className="admin-table-wrap"><table><thead><tr><th>任务日期</th><th>开始 / 结束时间</th><th>学习时长</th><th>设备</th><th>IP 推测地区</th><th>公网 IP</th><th>内容与状态</th></tr></thead><tbody>{visible.map(s=><tr key={s.id}><td>{s.date}</td><td>{time(s.startedAt)}<br/>{time(s.endedAt)}</td><td>{durationText(s.durationMs)}</td><td>{s.device||'未记录'}</td><td>{s.networkRegion||'未记录'}</td><td className="admin-ip">{s.ip||'未记录'}</td><td>{s.note||'无备注'}<small>{s.source==='manual'?'手动补记':'计时打卡'}{s.adjusted?' · 已调整':''}{s.deleted?' · 已删除（不计入统计）':''}</small></td></tr>)}</tbody></table>{visible.length===0&&<p className="admin-empty">当前筛选下没有已确认的打卡记录。正在计时或待确认的学习会显示在“当前计时”，确认打卡后才进入此表。</p>}</div><p className="admin-footnote">IP 地区仅为网络所在地推测；设备信息由浏览器提供，不能据此确认实际位置或操作人。</p></section>
 <section className="admin-panel"><h2>原始任务进度</h2><p className="admin-footnote">按有效学习记录显示最早开始、最晚结束时间；已删除记录不计入。历史记录缺少时间时显示“未记录”，最后保存时间不代表学习结束时间。</p><div className="admin-table-wrap"><table><thead><tr><th>日期</th><th>状态</th><th>开始时间</th><th>结束时间</th><th>顺延日期</th><th>最后保存时间</th><th>版本</th></tr></thead><tbody>{[...data.progress].sort((a,b)=>a.date.localeCompare(b.date)).map(r=><tr key={r.date}><td>{r.date}</td><td>{labels[r.status]||r.status}</td><td>{taskTimes(r.date).start}</td><td>{taskTimes(r.date).end}</td><td>{r.deferredTo||'—'}</td><td>{time(r.updatedAt)}</td><td>{r.version}</td></tr>)}</tbody></table></div></section>
 <section className="admin-panel"><h2>错题与模拟考试记录</h2>{data.entries.length?data.entries.map(e=><details key={e.id}><summary>{e.kind==='mistake'?'错题':'模拟考试'} · {String(e.data.title||e.data.subject||e.id)} · {time(e.updatedAt)}{e.archived?' · 已归档':''}</summary><pre>{JSON.stringify(e.data,null,2)}</pre></details>):<p className="admin-empty">暂时没有记录。</p>}</section>
 </>}{error&&<p className="admin-error admin-feedback" role="alert">{error}<button onClick={()=>setError('')}>关闭</button></p>}{pending&&<div className="admin-confirm-backdrop"><section className="admin-confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-heading"><h2 id="confirm-heading">{pending.action==='deleteVisits'?'删除':'恢复'} {pending.ids.length} 条访问记录？</h2><p>{pending.action==='deleteVisits'?'删除后可在“显示已删除”中恢复。学习和打卡记录不受影响。':'选中的记录将重新显示在访问列表中。'}</p><div><button autoFocus disabled={busy} onClick={()=>setPending(null)}>取消</button><button disabled={busy} onClick={()=>void load(secret.current,pending)}>{busy?'正在处理…':'确认操作'}</button></div></section></div>}</main>
}
