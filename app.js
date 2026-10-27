/* 骑驴找马 · 进度追踪  v1.0
   纯前端 / IndexedDB / 零后端。数据只存在本机，不上传。
   ------------------------------------------------------------------
   想改的地方都在这里：
   · LEXICON  —— 一句话快记的识别词典（地点、岗位方向、渠道、轮次…）
   · TEMPLATES —— 四套面试准备清单模板
   · AREAS    —— 区/商圈预置词典
   · DEFAULTS —— 优先区域、通勤阈值、卡住天数
*/
'use strict';

/* ============ 1. 常量与词典 ============ */
const STORES = ['opps','ivs','preps','pracs','todos','logs','atts','settings','devices'];

const DEFAULTS = {
  priorityAreas:['朝阳·望京','朝阳·酒仙桥'],
  excludeAreas:[],
  commuteThreshold:45,
  stuck:{applied:7, interview:5, toApply:3},
  defaultCity:'北京', defaultDistrict:'朝阳区',
  beacon:{url:'', token:''}
};

const AREAS = {
  '朝阳区':['望京','酒仙桥','国贸','大望路','三里屯','亚运村'],
  '海淀区':['中关村','上地','西二旗','五道口','学院路'],
  '东城区':['东直门','王府井'],
  '西城区':['金融街','西单'],
  '大兴区':['亦庄'],
  '丰台区':['丰台科技园'],
  '通州区':['通州北苑'],
  '昌平区':['回龙观']
};

const DIR_NAME = {data_pm:'数据PM', ai_data_pm:'AI数据PM', strategy_pm:'策略PM', other:'其他'};
const STATUS   = {to_apply:['待投','gray'], applied:['已投','blue'], resume_pass:['简历通过','blue'],
  interviewing:['面试中','amber'], pending_result:['待结果','purple'], offer:['offer','green'],
  failed:['已挂','red'], rejected:['已拒','red'], gave_up:['主动放弃','gray']};
const ROUND    = {r1:'一面', r2:'二面', r3:'三面', r4:'四面', hr:'HR面', cross:'交叉面'};
const CHANNEL  = {boss:'Boss直聘', referral:'内推', headhunter:'猎头', official:'官网', maimai:'脉脉', friend:'朋友', other:'其他'};
const AI_TYPE  = {rag:'RAG 知识库', agent:'Agent 工作流', text2sql:'智能问数', generation:'内容生成', eval:'评测集', governance:'数据治理', other:'其他'};
const TIER     = {priority:['优先','p'], ok:['可接受','o'], far:['偏远','f']};
const MASTERY  = ['未接触','了解概念','能讲清楚','能深挖追问'];

const TEMPLATES = {
  general:['自我介绍 1 分钟版 / 3 分钟版','跳槽动机与离职原因（在职身份，正向表达）','3 个 STAR 项目故事（结果带量化数字）',
    '反问清单（团队分工、业务阶段、考核方式、汇报线）','薪资包拆解与期望区间、谈薪底线、到岗周期','3 年职业规划（与方向自洽）','目标公司业务与产品调研'],
  data_pm:['指标体系从 0 到 1（北极星 → 拆解 → 口径 → 看板）','维度建模（Kimball、星型/雪花、缓慢变化维、宽表）',
    '数仓分层 ODS/DWD/DWS/ADS 职责与取舍','埋点设计（事件模型、方案评审、上报校验、治理）','数据链路（离线/实时、调度、质量监控、SLA）',
    '数据治理（元数据、血缘、口径统一、资产盘点、合规）','数据平台产品（BI、自助取数、看板产品化、需求收敛）',
    'SQL 手写题（窗口函数、行转列、留存/漏斗）','业务 case（DAU 下跌排查、口径冲突、需求优先级）','跨部门推进与研发资源协调'],
  ai_data_pm:['大模型基础：预训练 / 微调 / RAG / Agent 选型依据','RAG 全链路：切分、召回、重排、Prompt、badcase 回收',
    'Agent 设计：工具调用、多轮、记忆、失败兜底、可控性','评测体系：离线评测集、人工评测、线上 A/B、指标闭环',
    '语料与训练数据：采集清洗、标注体系、数据飞轮','成本与性能：token 成本、延迟、模型选型、缓存、降级',
    '场景判断力：什么该用大模型、什么不该（ROI）','效果度量：AI 功能如何定指标（准确率、采纳率、人效）',
    '幻觉与安全：可控性、审核、合规、数据不出域','高频 case：效果不达标怎么迭代、成本与体验权衡'],
  strategy_pm:['策略链路：召回 → 粗排 → 精排 → 重排 → 打散','AB 实验：分流、样本量、显著性、周期、常见误判',
    '策略迭代：badcase 归因、case by case、叠加治理','因果与归因：相关性 vs 因果、PSM / 双重差分',
    '策略指标 vs 业务指标、护栏指标、短期与长期','冷启动：新策略 / 新产品起量','高频 case：实验涨了大盘没涨、策略打架']
};

const LEXICON = {
  area:{望京:'朝阳区', 酒仙桥:'朝阳区', 国贸:'朝阳区', 大望路:'朝阳区', 三里屯:'朝阳区', 亚运村:'朝阳区',
    中关村:'海淀区', 上地:'海淀区', 西二旗:'海淀区', 五道口:'海淀区', 学院路:'海淀区', 东直门:'东城区',
    王府井:'东城区', 金融街:'西城区', 西单:'西城区', 亦庄:'大兴区', 丰台科技园:'丰台区', 通州:'通州区', 回龙观:'昌平区'},
  dir:[[/AI数据产品|AI产品|大模型产品|AI数据/,'ai_data_pm'],[/策略产品|策略PM/,'strategy_pm'],[/数据产品|数据平台|数仓|数据PM/,'data_pm']],
  channel:[[/Boss直聘|Boss/,'boss'],[/内推|朋友介绍/,'referral'],[/猎头/,'headhunter'],[/官网/,'official'],[/脉脉/,'maimai']],
  round:[[/四面/,'r4'],[/三面/,'r3'],[/二面/,'r2'],[/一面/,'r1'],[/HR面/,'hr'],[/交叉面/,'cross']],
  aiType:[[/智能问数|Text2SQL|问数/,'text2sql'],[/RAG|知识库/,'rag'],[/Agent|智能体/,'agent'],[/评测/,'eval'],[/生成|对话/,'generation']]
};

/* ============ 2. 工具 ============ */
const $ = s => document.querySelector(s);
function uid(){ return (crypto.randomUUID? crypto.randomUUID() : Date.now()+'-'+Math.random().toString(36).slice(2)); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function pad(n){ return String(n).padStart(2,'0'); }
function today(){ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function now(){ const d=new Date(); return today()+' '+pad(d.getHours())+':'+pad(d.getMinutes()); }
function daysBetween(a,b){ if(!a) return 0; return Math.round((new Date(b+'T00:00') - new Date(a+'T00:00'))/86400000); }
function weekStart(){ const d=new Date(); const w=(d.getDay()+6)%7; d.setDate(d.getDate()-w); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function toast(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  $('#toast-root').appendChild(t); setTimeout(()=>t.remove(),2000); }
function confirmBox(msg){ return window.confirm(msg); }

/* ============ 3. 数据层（IndexedDB，可插拔） ============ */
const DB = {
  db:null,
  open(){ return new Promise((res,rej)=>{
    const rq = indexedDB.open('jobhunt', 1);
    rq.onupgradeneeded = e=>{
      const db = e.target.result;
      ['opps','ivs','preps','pracs','todos','logs','atts','devices'].forEach(s=>{
        if(!db.objectStoreNames.contains(s)) db.createObjectStore(s,{keyPath:'id'});
      });
      if(!db.objectStoreNames.contains('settings')) db.createObjectStore('settings',{keyPath:'key'});
    };
    rq.onsuccess = e=>{ DB.db = e.target.result; res(); };
    rq.onerror = e=>rej(e);
  });},
  all(store){ return new Promise((res,rej)=>{
    const rq = DB.db.transaction(store).objectStore(store).getAll();
    rq.onsuccess = ()=>res(rq.result||[]); rq.onerror = e=>rej(e);
  });},
  put(store,obj){ return new Promise((res,rej)=>{
    const rq = DB.db.transaction(store,'readwrite').objectStore(store).put(obj);
    rq.onsuccess = ()=>res(); rq.onerror = e=>rej(e);
  });},
  del(store,id){ return new Promise((res,rej)=>{
    const rq = DB.db.transaction(store,'readwrite').objectStore(store).delete(id);
    rq.onsuccess = ()=>res(); rq.onerror = e=>rej(e);
  });},
  clearAll(){ return Promise.all(STORES.map(s=>new Promise(res=>{
    const rq = DB.db.transaction(s,'readwrite').objectStore(s).clear(); rq.onsuccess=()=>res();
  })));}
};

const state = {opps:[], ivs:[], preps:[], pracs:[], todos:[], logs:[], atts:[], devices:[], settings:null,
  view:'overview', detail:null, quick:null, applyFilter:'all', pracFilter:'all', onboard:false, editing:null};

async function loadAll(){
  const [opps,ivs,preps,pracs,todos,logs,atts,settings,devices] = await Promise.all(
    ['opps','ivs','preps','pracs','todos','logs','atts','settings','devices'].map(s=>DB.all(s)));
  state.opps=opps; state.ivs=ivs; state.preps=preps; state.pracs=pracs; state.todos=todos;
  state.logs=logs; state.atts=atts; state.devices=devices; state.settings=settings[0]||null;
}
async function save(store,obj){
  obj.updated_at = Date.now();
  await DB.put(store,obj);
  if(store==='settings'){ state.settings = obj; return; }
  const arr = state[store]; const i = arr.findIndex(x=>x.id===obj.id);
  if(i>=0) arr[i]=obj; else arr.push(obj);
}

/* ============ 4. 业务规则 ============ */
function calcTier(o){
  const s = state.settings || DEFAULTS;
  const key = (o.district||'')+'·'+(o.area||'');
  if((s.priorityAreas||[]).some(a=>key.includes(a) || (o.area&&a.includes(o.area)))) return 'priority';
  if((s.excludeAreas||[]).some(a=>key.includes(a) || (o.area&&a.includes(o.area)))) return 'far';
  const c = Number(o.commute||0);
  if(c && c<=30) return 'priority';
  if(c && c>(s.commuteThreshold||45)) return 'far';
  return 'ok';
}
function isTracking(o){ return ['applied','resume_pass','interviewing','pending_result'].includes(o.status); }
function stuckList(){
  const s = state.settings || DEFAULTS; const out=[]; const t=today();
  state.opps.forEach(o=>{
    if(o.status==='applied'){ const d=daysBetween((o.last_progress_at||o.applied_at||'').slice(0,10),t);
      if(d>=(s.stuck.applied||7)) out.push({o,txt:'已投 '+d+' 天无回音',act:'标记跟进'}); }
    if(o.status==='to_apply'){ const d=daysBetween(o.created_at?o.created_at.slice(0,10):o.last_progress_at,t);
      if(d>=(s.stuck.toApply||3)) out.push({o,txt:'收藏 '+d+' 天未投递',act:'去投递'}); }
  });
  state.ivs.forEach(iv=>{
    const o=state.opps.find(x=>x.id===iv.opportunity_id);
    if(o&&o.status==='interviewing'){ const d=daysBetween((iv.scheduled_at||'').slice(0,10),t);
      if(d>=(s.stuck.interview||5)) out.push({o,txt:'面试后 '+d+' 天无反馈',act:'追问 HR'}); }
  });
  return out;
}
function streakDays(){
  const set = new Set(state.logs.map(l=>(l.created_at||'').slice(0,10)));
  if(!set.size) return 0;
  let n=0; const d=new Date();
  if(!set.has(today())) d.setDate(d.getDate()-1);
  for(;;){ const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
    if(set.has(k)){ n++; d.setDate(d.getDate()-1); } else break; }
  return n;
}
function oppOf(iv){ return state.opps.find(o=>o.id===iv.opportunity_id); }

/* ============ 5. 一句话快记规则引擎 ============ */
function parseText(text){
  const r = {type:'todo', raw:text, fields:{}, confidence:'low'};
  for(const a in LEXICON.area){ if(text.includes(a)){ r.fields.district=LEXICON.area[a]; r.fields.area=a; } }
  for(const [reg,d] of LEXICON.dir){ if(reg.test(text)){ r.fields.dir=d; break; } }
  for(const [reg,c] of LEXICON.channel){ if(reg.test(text)){ r.fields.channel=c; break; } }
  for(const [reg,c] of LEXICON.round){ if(reg.test(text)){ r.fields.round=c; break; } }
  for(const [reg,c] of LEXICON.aiType){ if(reg.test(text)){ r.fields.aiType=c; break; } }
  const stripped = text.replace(/投了|投递|寄了|约了|面试|面完/g,' ');
  const cm = stripped.match(/([^\s，,。]{1,12}公司)/); if(cm) r.fields.company = cm[1];
  const pm = text.match(/(AI数据产品经理|数据产品经理|策略产品经理|AI产品经理|数据平台产品经理|产品经理)/);
  if(pm) r.fields.position = pm[1];
  const tm = text.match(/周([一二三四五六日天])(?:晚|早上|上午|下午)?\s*([七八九十]|1?\d)?点?/);
  if(tm){
    const map={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'日':0,'天':0};
    const cn={'七':7,'八':8,'九':9,'十':10};
    const d=new Date(); const target=map[tm[1]];
    let diff=(target-d.getDay()+7)%7; if(diff===0) diff=7;
    const nd=new Date(d.getTime()+diff*86400000);
    let hr=tm[2]?(cn[tm[2]]||parseInt(tm[2])):20;
    if(hr<12 && /晚|下午|晚上/.test(text)) hr+=12;
    nd.setHours(hr,0,0,0);
    r.fields.scheduled_at = nd.getFullYear()+'-'+pad(nd.getMonth()+1)+'-'+pad(nd.getDate())+' '+pad(nd.getHours())+':00';
  }
  if(/投了|投递|寄了/.test(text)) r.type='opportunity';
  else if(r.fields.round || /面试|面完/.test(text)) r.type='interview';
  else if(r.fields.aiType || /做完|完成|跑通|搞定|demo/i.test(text)) r.type='practice';
  r.confidence = Object.keys(r.fields).length>=3?'high':(Object.keys(r.fields).length>=1?'mid':'low');
  if(r.type==='opportunity'){ r.fields.applied_at=today(); r.fields.status='applied'; }
  return r;
}

/* ============ 6. 实体操作 ============ */
async function newOpp(seed){
  const s=state.settings||DEFAULTS;
  const o = Object.assign({id:uid(), company:'', position:'', direction:'data_pm', salary:'', channel:'boss',
    city:s.defaultCity, district:s.defaultDistrict, area:'', address:'', commute:'', commute_mode:'地铁',
    jd_text:'', jd_link:'', status:'to_apply', applied_at:'', last_progress_at:now(), next_follow_at:'',
    resume_version:'', note:'', history:[], created_at:new Date().toISOString()}, seed||{});
  o.tier = calcTier(o);
  await save('opps',o); state.detail={type:'opp',id:o.id}; state.view='apply'; render();
}
async function newInterview(seed){
  const iv = Object.assign({id:uid(), opportunity_id:(state.opps[0]||{}).id||'', direction:'data_pm',
    round:'r1', scheduled_at:'', format:'online', location:'', interviewer:'',
    records:[], review:{}, result:'pending', created_at:new Date().toISOString()}, seed||{});
  await save('ivs',iv); await buildPreps(iv.id, iv.direction);
  state.detail={type:'iv',id:iv.id}; state.view='interview'; render();
}
async function newPrac(seed){
  const p = Object.assign({id:uid(), title:'', category:'project', is_ai:true, ai_type:'rag', stack:[],
    goal:'', progress:0, blocker:'', metric:'', deliverable:'', resume_ready:false, due_at:'',
    status:'todo', logs:[], created_at:new Date().toISOString()}, seed||{});
  await save('pracs',p); state.detail={type:'prac',id:p.id}; state.view='practice'; render();
}
async function buildPreps(ivId, dir){
  const exist = state.preps.filter(p=>p.interview_id===ivId && p.category===dir);
  if(exist.length) return;
  for(const c of (TEMPLATES[dir]||[])){
    await save('preps',{id:uid(), interview_id:ivId, category:dir, content:c, mastery:'未接触', done:false, note:'', practice_id:''});
  }
}
async function switchDir(ivId, dir){
  const iv = state.ivs.find(x=>x.id===ivId); if(!iv) return;
  for(const p of state.preps.filter(p=>p.interview_id===ivId && p.category===iv.direction)){
    await DB.del('preps',p.id);
  }
  state.preps = state.preps.filter(p=>!(p.interview_id===ivId && p.category===iv.direction));
  iv.direction = dir; await save('ivs',iv);
  await buildPreps(ivId, dir); render(); toast('清单已切换为「'+DIR_NAME[dir]+'」专项');
}
async function addLog(type, text, ref, attId){
  await save('logs',{id:uid(), type, raw_text:text, attachment_id:attId||'', parsed:!!ref,
    ref:ref||'', created_at:new Date().toISOString()});
}
async function removeEntity(store,id){
  if(!confirmBox('确定删除？删除后无法恢复。')) return;
  await DB.del(store,id); state.detail=null; await loadAll(); render(); toast('已删除');
}

/* ============ 7. 渲染 ============ */
function viewTitle(){ return {overview:'每日概览',apply:'简历投递',interview:'面试准备',practice:'项目实践',settings:'设置'}[state.view]; }

function sidebarHTML(){
  const items=[['overview','每日概览'],['apply','简历投递'],['interview','面试准备'],['practice','项目实践'],['settings','设置']];
  return `<div class="sidebar"><div class="brand">骑驴找马</div><nav>
    ${items.map(([k,n])=>`<a href="#" data-nav="${k}" class="${state.view===k?'active':''}">${n}</a>`).join('')}
    </nav><div style="margin-top:14px"><button class="btn pri block" data-act="quick">+ 快速录入</button></div>
    <div class="hint" style="margin-top:12px;padding:8px;background:#fff;border:1px dashed var(--line);border-radius:8px">
      数据仅存本机 · 按 N 快录</div></div>`;
}
function tabbarHTML(){
  const items=[['overview','概览'],['apply','投递'],['interview','面试'],['practice','实践'],['settings','设置']];
  return `<div class="tabbar">${items.slice(0,2).map(([k,n])=>`<button data-nav="${k}" class="${state.view===k?'active':''}">${n}</button>`).join('')}
    <button class="tfab" data-act="quick">+</button>
    ${items.slice(2).map(([k,n])=>`<button data-nav="${k}" class="${state.view===k?'active':''}">${n}</button>`).join('')}</div>`;
}

function viewOverview(){
  const tracking = state.opps.filter(isTracking);
  const ws = weekStart();
  const weekApplied = state.opps.filter(o=>o.applied_at && o.applied_at>=ws).length;
  const weekIv = state.ivs.filter(iv=>(iv.scheduled_at||'').slice(0,10)>=ws).length;
  const openTodos = state.todos.filter(t=>!t.done).length;
  const s = state.settings||DEFAULTS;
  const friendly = tracking.filter(o=>o.tier!=='far' && (!o.commute || Number(o.commute)<=s.commuteThreshold));
  const aiP = state.pracs.filter(p=>p.is_ai); const aiReady = aiP.filter(p=>p.resume_ready);
  const stuck = stuckList();
  const upcoming = state.ivs.filter(iv=>(iv.scheduled_at||'')>=now()).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at))[0];

  return `<h1 style="margin-bottom:2px">${today()} 周${'日一二三四五六'[new Date().getDay()]}</h1>
  <div class="muted" style="margin-bottom:12px">连续记录 ${streakDays()} 天</div>
  <div class="kpi">
    <div class="k" data-act="go" data-v="apply" data-f="tracking" style="cursor:pointer"><div class="n">${tracking.length}</div><div class="l">在跟机会</div></div>
    <div class="k"><div class="n">${weekApplied}</div><div class="l">本周投递</div></div>
    <div class="k"><div class="n">${weekIv}</div><div class="l">本周面试</div></div>
    <div class="k"><div class="n">${openTodos}</div><div class="l">待办</div></div>
  </div>
  <div class="kpi-2">
    <div class="k" data-act="go" data-v="apply" data-f="commute" style="cursor:pointer">
      <div class="n" style="font-size:18px">${friendly.length}</div><div class="muted" style="font-size:12px">通勤友好机会（优先区域 / ≤${s.commuteThreshold}min）</div></div>
    <div class="k" data-act="go" data-v="practice" data-f="ai" style="cursor:pointer">
      <div class="n" style="font-size:18px">${aiP.length} <span class="muted" style="font-size:13px">/ 可写简历 ${aiReady.length}</span></div>
      <div class="muted" style="font-size:12px">AI 实践</div></div>
  </div>

  <div class="card">
    <div class="between"><h2>需要跟进</h2><span class="hint">已投&gt;${s.stuck.applied}天 · 面试后&gt;${s.stuck.interview}天 · 待投&gt;${s.stuck.toApply}天</span></div>
    ${stuck.length? stuck.map(x=>`<div class="between" style="padding:8px 0;border-top:1px solid var(--line-2)">
      <div class="grow"><span class="tag amber">跟进</span> <b style="font-weight:500">${esc(x.o.company||'未命名机会')}</b>
        <span class="muted">${esc(x.o.position||'')} · ${x.txt} ${tierTag(x.o.tier)}</span></div>
      <div style="white-space:nowrap">
        <button class="btn sm" data-act="follow" data-id="${x.o.id}">${x.act}</button>
        <button class="btn sm" data-act="open" data-t="opp" data-id="${x.o.id}">查看</button></div></div>`).join('')
      : '<div class="hint">暂无需要跟进的机会</div>'}
  </div>

  <div class="card">
    <div class="between"><h2>今日待办</h2><button class="btn sm" data-act="quick">+ 添加</button></div>
    ${state.todos.filter(t=>!t.done).sort((a,b)=>(a.due_at||'9999').localeCompare(b.due_at||'9999')).map(t=>`
      <div class="between" style="padding:7px 0;border-top:1px solid var(--line-2)">
        <div class="grow"><span class="ck" data-act="todo" data-id="${t.id}"></span>${esc(t.title)}
          <span class="tag gray" style="margin-left:6px">${esc(t.category||'其他')}</span>
          ${t.due_at?`<span class="hint" style="margin-left:6px">${esc(t.due_at)}</span>`:''}</div>
        <button class="btn sm" data-act="deltodo" data-id="${t.id}">删除</button></div>`).join('')
      || '<div class="hint">暂无待办，用快录加一条</div>'}
    ${autoTodosHTML()}
  </div>

  <div class="card">
    <div class="between"><h2>最近面试</h2></div>
    ${upcoming? (()=>{ const o=oppOf(upcoming)||{};
      const d = Math.ceil((new Date(upcoming.scheduled_at.replace(' ','T'))-new Date())/86400000);
      return `<div class="between"><div><b style="font-weight:500">${esc(o.company||'未关联')}</b>
        <span class="tag blue">${ROUND[upcoming.round]||''}</span>
        <span class="tag ai">${DIR_NAME[upcoming.direction]||''}</span>
        <div class="muted" style="margin-top:4px">${esc(upcoming.scheduled_at)} · ${esc(upcoming.format==='onsite'?upcoming.location:'线上')}</div>
        <div class="muted">${esc((o.district||'')+'·'+(o.area||''))} ${tierTag(o.tier)}</div></div>
        <div style="text-align:right"><div style="font-size:20px;font-weight:500;color:var(--primary)">${d}</div><div class="muted">天后</div></div></div>`;})()
      : '<div class="hint">还没有面试安排</div>'}
  </div>

  <div class="card">
    <div class="between"><h2>最近动态</h2><span class="hint">${state.logs.length} 条</span></div>
    ${state.logs.slice().sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')).slice(0,8).map(l=>`
      <div class="between" style="padding:6px 0;border-top:1px solid var(--line-2)">
        <div class="grow"><span class="tag gray">${esc(l.type)}</span> ${esc(l.raw_text||'(图片)')}</div>
        <span class="hint">${esc((l.created_at||'').slice(5,16).replace('T',' '))}</span></div>`).join('')
      || '<div class="hint">还没有记录</div>'}
  </div>`;
}
function autoTodosHTML(){
  const out=[]; const t=today();
  state.opps.filter(o=>o.status==='to_apply').forEach(o=>out.push(['投递', o.company||'未命名机会', 'opp', o.id]));
  state.ivs.filter(iv=>{ const d=daysBetween(t,(iv.scheduled_at||'').slice(0,10)); return d>=0&&d<=3; })
    .forEach(iv=>{ const o=oppOf(iv)||{}; out.push(['面试准备', (o.company||'')+' '+(ROUND[iv.round]||''), 'iv', iv.id]); });
  state.pracs.filter(p=>p.status!=='done' && p.due_at && p.due_at<=t).forEach(p=>out.push(['项目实践', p.title, 'prac', p.id]));
  if(!out.length) return '';
  return `<div style="margin-top:10px"><div class="hint" style="margin-bottom:4px">自动生成（点击跳转）</div>
    ${out.map(([c,title,ty,id])=>`<div style="padding:5px 0"><button class="btn sm" data-act="open" data-t="${ty}" data-id="${id}">
      ${esc(c)}：${esc(title)}</button></div>`).join('')}</div>`;
}
function tierTag(t){ if(!t) return ''; const [n,c]=TIER[t]||TIER.ok; return `<span class="dot ${c}"></span><span class="muted">${n}</span>`; }

function viewApply(){
  let list = state.opps.slice();
  const f = state.applyFilter;
  if(f==='priority') list=list.filter(o=>o.tier==='priority');
  if(f==='commute') list=list.filter(o=>!o.commute||Number(o.commute)<=(state.settings||DEFAULTS).commuteThreshold);
  if(f==='tracking') list=list.filter(isTracking);
  if(f==='distance') list.sort((a,b)=>Number(a.commute||999)-Number(b.commute||999));
  else list.sort((a,b)=>(a.tier==='priority'?0:1)-(b.tier==='priority'?0:1));
  return `<div class="between" style="margin-bottom:12px"><h1>简历投递</h1>
    <button class="btn pri" data-act="newopp">+ 新建机会</button></div>
  <div class="row wrap" style="margin-bottom:12px">
    ${[['all','全部'],['priority','望京/酒仙桥优先'],['commute','通勤≤'+(state.settings||DEFAULTS).commuteThreshold+'min'],['tracking','在跟'],['distance','按距离排序']]
      .map(([k,n])=>`<button class="chip ${f===k?'on':''}" data-act="fapply" data-k="${k}">${n}</button>`).join('')}
  </div>
  ${list.length? list.map(o=>{ const [sn,sc]=STATUS[o.status]||['','gray'];
    return `<div class="item ${state.detail&&state.detail.id===o.id?'sel':''}" data-act="open" data-t="opp" data-id="${o.id}">
      <div class="between"><div class="grow"><span class="t">${esc(o.company||'未命名机会')}</span>
        <span class="muted">${esc(o.position||'')}</span></div><span class="tag ${sc}">${sn}</span></div>
      <div class="row wrap" style="margin-top:6px">
        <span class="tag blue">${DIR_NAME[o.direction]||'其他'}</span>
        <span class="muted">${esc(o.district||'')}·${esc(o.area||'未填')}</span>${tierTag(o.tier)}
        ${o.commute?`<span class="hint">通勤 ${esc(o.commute)}min ${esc(o.commute_mode||'')}</span>`:''}
        ${o.channel?`<span class="hint">${CHANNEL[o.channel]||''}</span>`:''}</div>
      <div class="hint" style="margin-top:4px">${o.applied_at?'投递 '+o.applied_at+' · ':''}距上次进展 ${daysBetween((o.last_progress_at||'').slice(0,10),today())} 天</div>
    </div>`;}).join('') : emptyHTML('还没有机会，点右上角新建，或用快录一句话记下来')}`;
}

function viewInterview(){
  const list = state.ivs.slice().sort((a,b)=>(b.scheduled_at||'').localeCompare(a.scheduled_at||''));
  return `<div class="between" style="margin-bottom:12px"><h1>面试准备</h1>
    <button class="btn pri" data-act="newiv">+ 新建面试</button></div>
  ${list.length? list.map(iv=>{ const o=oppOf(iv)||{};
    const ps=state.preps.filter(p=>p.interview_id===iv.id); const done=ps.filter(p=>p.done).length;
    return `<div class="item ${state.detail&&state.detail.id===iv.id?'sel':''}" data-act="open" data-t="iv" data-id="${iv.id}">
      <div class="between"><div class="grow"><span class="t">${esc(o.company||'未关联机会')}</span>
        <span class="tag blue">${ROUND[iv.round]||''}</span><span class="tag ai">${DIR_NAME[iv.direction]||''}</span></div>
        <span class="muted">${esc(iv.scheduled_at||'待定')}</span></div>
      <div class="muted" style="margin-top:4px">${esc(iv.format==='onsite'?iv.location:'线上')} ${iv.interviewer?'· '+esc(iv.interviewer):''}
        ${o.area?' · '+esc(o.district+'·'+o.area):''}</div>
      <div class="row" style="margin-top:8px"><div class="bar-progress blue grow"><i style="width:${ps.length?Math.round(done/ps.length*100):0}%"></i></div>
        <span class="hint">清单 ${done}/${ps.length}</span></div>
    </div>`;}).join('') : emptyHTML('还没有面试安排')}`;
}

function viewPractice(){
  let list = state.pracs.slice();
  if(state.pracFilter==='ai') list=list.filter(p=>p.is_ai);
  if(state.pracFilter==='ready') list=list.filter(p=>p.resume_ready);
  return `<div class="between" style="margin-bottom:12px"><h1>项目实践</h1>
    <button class="btn pri" data-act="newprac">+ 新建实践</button></div>
  <div class="row wrap" style="margin-bottom:10px">
    ${[['all','全部'],['ai','AI 实践'],['ready','可写简历']].map(([k,n])=>
      `<button class="chip ai ${state.pracFilter===k?'on':''}" data-act="fprac" data-k="${k}">${n}</button>`).join('')}</div>
  <div class="hint" style="margin-bottom:10px">推荐补强：智能问数 Text2SQL · 评测集建设 —— 结合数仓强项，零代码可落地</div>
  ${list.length? list.map(p=>`<div class="item ${state.detail&&state.detail.id===p.id?'sel':''}" data-act="open" data-t="prac" data-id="${p.id}"
      style="${p.is_ai?'border-left:3px solid var(--ai)':''}">
    <div class="between"><div class="grow"><span class="t">${esc(p.title||'未命名')}</span>
      ${p.is_ai?`<span class="tag ai" style="margin-left:6px">${AI_TYPE[p.ai_type]||'AI'}</span>`:''}
      ${p.resume_ready?`<span class="tag green" style="margin-left:4px">可写简历</span>`:''}</div>
      <span class="muted">${p.progress||0}%</span></div>
    <div class="row wrap" style="margin-top:6px">
      ${(p.stack||[]).map(s=>`<span class="tag blue">${esc(s)}</span>`).join('')}
      ${p.metric?`<span class="hint">${esc(p.metric)}</span>`:''}
      ${p.due_at?`<span class="hint">截止 ${esc(p.due_at)}</span>`:''}</div>
    <div class="bar-progress" style="margin-top:8px"><i style="width:${p.progress||0}%"></i></div>
  </div>`).join('') : emptyHTML('还没有实践任务')}`;
}

function viewSettings(){
  const s = state.settings||DEFAULTS;
  const dev = s.device||{};
  const bytes = 0;
  return `<h1 style="margin-bottom:12px">设置</h1>
  <div class="card">
    <h2>位置偏好</h2>
    <div class="field"><label>优先区域（优先、列表置顶）</label>
      <div class="row wrap">${(s.priorityAreas||[]).map((a,i)=>`<span class="chip on" data-act="rmarea" data-k="priorityAreas" data-i="${i}">${esc(a)} ×</span>`).join('')}
      <button class="chip" data-act="addarea" data-k="priorityAreas">+ 添加</button></div></div>
    <div class="field"><label>排除区域（标记偏远）</label>
      <div class="row wrap">${(s.excludeAreas||[]).map((a,i)=>`<span class="chip on" data-act="rmarea" data-k="excludeAreas" data-i="${i}">${esc(a)} ×</span>`).join('')}
      <button class="chip" data-act="addarea" data-k="excludeAreas">+ 添加</button></div></div>
    <div class="grid2">
      <div class="field"><label>通勤阈值（分钟）</label><input value="${s.commuteThreshold}" data-f="commuteThreshold" data-store="settings" data-id="settings"></div>
      <div class="field"><label>默认城市 / 区</label><input value="${esc(s.defaultCity)}" data-f="defaultCity" data-store="settings" data-id="settings">
        <input style="margin-top:6px" value="${esc(s.defaultDistrict)}" data-f="defaultDistrict" data-store="settings" data-id="settings"></div>
    </div>
  </div>
  <div class="card">
    <h2>卡住提醒阈值（天）</h2>
    <div class="grid3">
      <div class="field"><label>已投无回音</label><input value="${s.stuck.applied}" data-f="stuck.applied" data-store="settings" data-id="settings"></div>
      <div class="field"><label>面试后无反馈</label><input value="${s.stuck.interview}" data-f="stuck.interview" data-store="settings" data-id="settings"></div>
      <div class="field"><label>收藏未投递</label><input value="${s.stuck.toApply}" data-f="stuck.toApply" data-store="settings" data-id="settings"></div>
    </div>
  </div>
  <div class="card">
    <h2>设备</h2>
    <div class="field"><label>本机设备名（用于识别，随备份导出）</label>
      <input value="${esc(dev.name||'')}" data-f="device.name" data-store="settings" data-id="settings" placeholder="如：公司电脑 / iPhone"></div>
    <div class="hint">设备 ID：${esc(dev.id||'-')}</div>
    <div class="hint">首次记录：${esc((dev.firstSeen||'').slice(0,10)||'-')}</div>
    <div class="hint" style="margin-top:6px">数据存在本机，别人打开网址只会看到空应用。换设备请先导出备份再导入。</div>
  </div>
  <div class="card">
    <h2>数据</h2>
    <div class="row wrap">
      <button class="btn" data-act="export">导出备份 JSON</button>
      <button class="btn" data-act="import">导入备份</button>
      <button class="btn danger" data-act="wipe">清空全部数据</button>
    </div>
    <div class="hint" style="margin-top:8px">附件 ${state.atts.length} 个 · 记录 ${state.logs.length} 条 ·
      备份经过 ${state.devices.length||1} 台设备</div>
  </div>
  <div class="card">
    <h2>关于</h2>
    <div class="hint">v1.0 · 纯前端本地存储 · 不含任何统计埋点</div>
    <div class="hint">云端同步与访问信标将在后续版本开放，配置留空时本页不产生任何外部请求。</div>
  </div>`;
}
function emptyHTML(t){ return `<div class="empty"><div class="ico">＋</div>${esc(t)}</div>`; }

/* ---------- 详情面板 ---------- */
function detailHTML(){
  const d = state.detail; if(!d) return '';
  const close = `<button class="btn sm" data-act="close">关闭</button>`;
  if(d.type==='opp'){
    const o = state.opps.find(x=>x.id===d.id); if(!o) return '';
    const ivs = state.ivs.filter(i=>i.opportunity_id===o.id);
    return `<div class="card">
      <div class="between"><h2>${esc(o.company||'新机会')}</h2>${close}</div>
      <div class="field"><label>公司</label><input value="${esc(o.company)}" data-f="company" data-store="opps" data-id="${o.id}" placeholder="必填"></div>
      <div class="grid2">
        <div class="field"><label>岗位</label><input value="${esc(o.position)}" data-f="position" data-store="opps" data-id="${o.id}"></div>
        <div class="field"><label>岗位方向</label><select data-f="direction" data-store="opps" data-id="${o.id}">
          ${Object.keys(DIR_NAME).map(k=>`<option value="${k}" ${o.direction===k?'selected':''}>${DIR_NAME[k]}</option>`).join('')}</select></div>
        <div class="field"><label>薪资</label><input value="${esc(o.salary)}" data-f="salary" data-store="opps" data-id="${o.id}" placeholder="40-55K·15薪"></div>
        <div class="field"><label>渠道</label><select data-f="channel" data-store="opps" data-id="${o.id}">
          ${Object.keys(CHANNEL).map(k=>`<option value="${k}" ${o.channel===k?'selected':''}>${CHANNEL[k]}</option>`).join('')}</select></div>
      </div>
      <h3>位置</h3>
      <div class="grid3">
        <div class="field"><label>区</label><input value="${esc(o.district)}" data-f="district" data-store="opps" data-id="${o.id}"
          list="area-list" placeholder="朝阳区"><datalist id="area-list">${Object.keys(AREAS).map(a=>`<option value="${a}"></option>`).join('')}</datalist></div>
        <div class="field"><label>商圈 / 位置</label><input value="${esc(o.area)}" data-f="area" data-store="opps" data-id="${o.id}"
          list="biz-list" placeholder="望京"><datalist id="biz-list">${Object.values(AREAS).flat().map(b=>`<option value="${b}"></option>`).join('')}</datalist></div>
        <div class="field"><label>优先级</label><select data-f="tier" data-store="opps" data-id="${o.id}">
          ${Object.keys(TIER).map(k=>`<option value="${k}" ${o.tier===k?'selected':''}>${TIER[k][0]}</option>`).join('')}</select></div>
      </div>
      <div class="row wrap" style="margin-bottom:8px">
        ${(AREAS[o.district]||[]).map(b=>`<button class="chip ${o.area===b?'on':''}" data-act="setarea" data-id="${o.id}" data-a="${b}">${b}</button>`).join('')}
      </div>
      <div class="grid2">
        <div class="field"><label>单程通勤（分钟）</label><select data-f="commute" data-store="opps" data-id="${o.id}">
          ${[['','未填'],['30','≤30'],['45','30–45'],['60','45–60'],['90','>60']].map(([v,n])=>
            `<option value="${v}" ${String(o.commute)===v?'selected':''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label>交通方式</label><input value="${esc(o.commute_mode)}" data-f="commute_mode" data-store="opps" data-id="${o.id}"></div>
      </div>
      <div class="field"><label>办公地址</label><input value="${esc(o.address)}" data-f="address" data-store="opps" data-id="${o.id}"></div>
      <div class="between" style="margin-bottom:8px"><div>${tierTag(o.tier)}</div>
        <a class="btn sm" target="_blank" rel="noopener"
          href="https://uri.amap.com/search?keyword=${encodeURIComponent(o.address||(o.district||'')+(o.area||''))}">在高德地图中查看</a></div>
      <h3>状态</h3>
      <div class="grid2">
        <div class="field"><label>当前状态</label><select data-f="status" data-store="opps" data-id="${o.id}">
          ${Object.keys(STATUS).map(k=>`<option value="${k}" ${o.status===k?'selected':''}>${STATUS[k][0]}</option>`).join('')}</select></div>
        <div class="field"><label>投递日期</label><input type="date" value="${esc(o.applied_at)}" data-f="applied_at" data-store="opps" data-id="${o.id}"></div>
      </div>
      <div class="row wrap" style="margin-bottom:8px">
        <button class="btn sm pri" data-act="advance" data-id="${o.id}">推进到下一状态</button>
        <button class="btn sm" data-act="follow" data-id="${o.id}">标记已跟进</button>
      </div>
      <h3>状态时间轴</h3>
      ${(o.history||[]).length? `<div class="timeline">${(o.history||[]).slice().reverse().map(h=>
        `<div class="tl ${['failed','rejected','gave_up'].includes(h.status)?'gray':''}">${esc(h.at)} ${STATUS[h.status]?STATUS[h.status][0]:esc(h.status)}
          ${h.note?' · '+esc(h.note):''}</div>`).join('')}</div>` : '<div class="hint">暂无变更记录</div>'}
      <h3>关联面试</h3>
      ${ivs.length? ivs.map(i=>`<div class="between" style="padding:4px 0">
        <span class="muted">${esc(i.scheduled_at||'待定')} · ${ROUND[i.round]||''}</span>
        <button class="btn sm" data-act="open" data-t="iv" data-id="${i.id}">打开</button></div>`).join('')
        : '<div class="hint">暂无 · <button class="btn sm" data-act="newivfor" data-id="'+o.id+'">为该机会建面试</button></div>'}
      <h3>JD</h3>
      <div class="field"><textarea data-f="jd_text" data-store="opps" data-id="${o.id}" placeholder="粘贴 JD 文字">${esc(o.jd_text)}</textarea></div>
      <div class="field"><input value="${esc(o.jd_link)}" data-f="jd_link" data-store="opps" data-id="${o.id}" placeholder="JD 链接"></div>
      <h3>备注</h3>
      <div class="field"><textarea data-f="note" data-store="opps" data-id="${o.id}">${esc(o.note)}</textarea></div>
      ${attachHTML('opp',o.id)}
      <div style="margin-top:12px"><button class="btn sm danger" data-act="del" data-store="opps" data-id="${o.id}">删除这个机会</button></div>
    </div>`;
  }
  if(d.type==='iv'){
    const iv = state.ivs.find(x=>x.id===d.id); if(!iv) return '';
    const ps = state.preps.filter(p=>p.interview_id===iv.id);
    const byCat = {};
    ['general', iv.direction].forEach(c=>{ byCat[c]=ps.filter(p=>p.category===c); });
    const total=ps.length, done=ps.filter(p=>p.done).length;
    const ivAtt = state.atts.filter(a=>a.ref_type==='iv'&&a.ref_id===iv.id);
    return `<div class="card">
      <div class="between"><h2>面试 · ${ROUND[iv.round]||''}</h2>${close}</div>
      <div class="field"><label>关联机会</label><select data-f="opportunity_id" data-store="ivs" data-id="${iv.id}">
        <option value="">未关联</option>
        ${state.opps.map(o=>`<option value="${o.id}" ${iv.opportunity_id===o.id?'selected':''}>${esc(o.company||'未命名')} · ${esc(o.position||'')}</option>`).join('')}
      </select></div>
      <div class="grid2">
        <div class="field"><label>岗位方向（决定用哪套清单）</label><select data-act="switchdir" data-id="${iv.id}">
          ${Object.keys(DIR_NAME).filter(k=>k!=='other').map(k=>`<option value="${k}" ${iv.direction===k?'selected':''}>${DIR_NAME[k]}</option>`).join('')}
        </select></div>
        <div class="field"><label>轮次</label><select data-f="round" data-store="ivs" data-id="${iv.id}">
          ${Object.keys(ROUND).map(k=>`<option value="${k}" ${iv.round===k?'selected':''}>${ROUND[k]}</option>`).join('')}</select></div>
        <div class="field"><label>时间</label><input value="${esc(iv.scheduled_at)}" data-f="scheduled_at" data-store="ivs" data-id="${iv.id}" placeholder="2026-10-28 20:00"></div>
        <div class="field"><label>形式</label><select data-f="format" data-store="ivs" data-id="${iv.id}">
          <option value="online" ${iv.format==='online'?'selected':''}>线上</option>
          <option value="onsite" ${iv.format==='onsite'?'selected':''}>现场</option></select></div>
        <div class="field"><label>地点</label><input value="${esc(iv.location)}" data-f="location" data-store="ivs" data-id="${iv.id}"></div>
        <div class="field"><label>面试官</label><input value="${esc(iv.interviewer)}" data-f="interviewer" data-store="ivs" data-id="${iv.id}"></div>
      </div>
      <div class="between" style="margin:12px 0 8px"><h2 style="margin:0">准备清单</h2><span class="muted">已准备 ${done}/${total}</span></div>
      <div class="bar-progress blue" style="margin-bottom:10px"><i style="width:${total?Math.round(done/total*100):0}%"></i></div>
      ${Object.keys(byCat).map(c=>{
        const label = c==='general'?'通用基础':(DIR_NAME[c]||c)+' 专项';
        const arr = byCat[c];
        return `<h3>${label}（${arr.length}）</h3>${arr.length? arr.map(p=>`
          <div class="prep">
            <div class="between"><div class="grow"><span class="ck ${p.done?'on':''}" data-act="prep" data-id="${p.id}"></span>
              <span class="lbl ${p.done?'done':''}">${esc(p.content)}</span></div>
              <select data-f="mastery" data-store="preps" data-id="${p.id}">
                ${MASTERY.map(m=>`<option ${p.mastery===m?'selected':''}>${m}</option>`).join('')}</select></div>
            <div class="meta"><input style="border:none;padding:0;font-size:11px;background:transparent" placeholder="备注 / 关联案例"
              value="${esc(p.note)}" data-f="note" data-store="preps" data-id="${p.id}"></div>
          </div>`).join('') : '<div class="hint">（无）</div>'}`;}).join('')}
      <h3>面试记录</h3>
      <div class="field"><textarea data-f="records" data-store="ivs" data-id="${iv.id}" placeholder="题目 / 我的回答 / 面试官反馈">${esc(Array.isArray(iv.records)?iv.records.join('\n'):iv.records||'')}</textarea></div>
      <h3>复盘</h3>
      <div class="grid2">
        <div class="field"><label>做得好</label><textarea style="min-height:56px" data-f="review.good" data-store="ivs" data-id="${iv.id}">${esc((iv.review||{}).good||'')}</textarea></div>
        <div class="field"><label>下次改进</label><textarea style="min-height:56px" data-f="review.better" data-store="ivs" data-id="${iv.id}">${esc((iv.review||{}).better||'')}</textarea></div>
      </div>
      ${attachHTML('iv',iv.id)}
      <div style="margin-top:12px"><button class="btn sm danger" data-act="del" data-store="ivs" data-id="${iv.id}">删除这场面试</button></div>
    </div>`;
  }
  if(d.type==='prac'){
    const p = state.pracs.find(x=>x.id===d.id); if(!p) return '';
    return `<div class="card">
      <div class="between"><h2>${esc(p.title||'新实践')}</h2>${close}</div>
      <div class="field"><label>标题</label><input value="${esc(p.title)}" data-f="title" data-store="pracs" data-id="${p.id}"></div>
      <div class="grid2">
        <div class="field"><label>是否 AI 实践</label><select data-f="is_ai" data-store="pracs" data-id="${p.id}">
          <option value="true" ${p.is_ai?'selected':''}>是</option><option value="false" ${!p.is_ai?'selected':''}>否</option></select></div>
        <div class="field"><label>AI 项目类型</label><select data-f="ai_type" data-store="pracs" data-id="${p.id}">
          ${Object.keys(AI_TYPE).map(k=>`<option value="${k}" ${p.ai_type===k?'selected':''}>${AI_TYPE[k]}</option>`).join('')}</select></div>
        <div class="field"><label>类别</label><select data-f="category" data-store="pracs" data-id="${p.id}">
          <option value="project" ${p.category==='project'?'selected':''}>作品集项目</option>
          <option value="learning" ${p.category==='learning'?'selected':''}>技能学习</option>
          <option value="cert" ${p.category==='cert'?'selected':''}>认证</option></select></div>
        <div class="field"><label>状态</label><select data-f="status" data-store="pracs" data-id="${p.id}">
          ${[['todo','未开始'],['doing','进行中'],['done','已完成'],['paused','暂停']].map(([v,n])=>
            `<option value="${v}" ${p.status===v?'selected':''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label>进度 %</label><input type="number" min="0" max="100" value="${p.progress||0}" data-f="progress" data-store="pracs" data-id="${p.id}"></div>
        <div class="field"><label>截止日</label><input type="date" value="${esc(p.due_at)}" data-f="due_at" data-store="pracs" data-id="${p.id}"></div>
      </div>
      <div class="field"><label>技术栈（逗号分隔）</label><input value="${esc((p.stack||[]).join('，'))}" data-f="stack" data-store="pracs" data-id="${p.id}" placeholder="Dify，DeepSeek"></div>
      <div class="field"><label>目标与验收标准</label><textarea data-f="goal" data-store="pracs" data-id="${p.id}">${esc(p.goal)}</textarea></div>
      <div class="grid2">
        <div class="field"><label>效果量化</label><input value="${esc(p.metric)}" data-f="metric" data-store="pracs" data-id="${p.id}" placeholder="采纳率 72%"></div>
        <div class="field"><label>产出物链接</label><input value="${esc(p.deliverable)}" data-f="deliverable" data-store="pracs" data-id="${p.id}"></div>
      </div>
      <div class="field"><label>当前卡点</label><input value="${esc(p.blocker)}" data-f="blocker" data-store="pracs" data-id="${p.id}"></div>
      <div class="field"><label>可写进简历</label><select data-f="resume_ready" data-store="pracs" data-id="${p.id}">
        <option value="true" ${p.resume_ready?'selected':''}>是</option><option value="false" ${!p.resume_ready?'selected':''}>否</option></select></div>
      <h3>推进记录</h3>
      ${(p.logs||[]).length? (p.logs||[]).slice().reverse().map(l=>`<div class="muted">${esc(l.at)} ${esc(l.text)}</div>`).join('')
        : '<div class="hint">还没有推进记录</div>'}
      <div class="row" style="margin-top:8px">
        <input class="grow" id="prac-log" placeholder="今天推进了什么">
        <button class="btn sm pri" data-act="addprlog" data-id="${p.id}">记一笔</button></div>
      ${attachHTML('prac',p.id)}
      <div style="margin-top:12px"><button class="btn sm danger" data-act="del" data-store="pracs" data-id="${p.id}">删除这个实践</button></div>
    </div>`;
  }
  return '';
}
function attachHTML(refType, refId){
  const list = state.atts.filter(a=>a.ref_type===refType && a.ref_id===refId);
  return `<h3>附件（${list.length}）</h3>
    <div class="thumbs">${list.map(a=>`<div class="thumb" data-act="viewatt" data-id="${a.id}"><img src="${a.thumbUrl||''}" alt=""></div>`).join('')}</div>
    <button class="btn sm" style="margin-top:8px" data-act="pickimg" data-t="${refType}" data-id="${refId}">+ 上传图片</button>`;
}

/* ---------- 快录弹窗 ---------- */
const DEMOS = ['投了望京某AI公司的AI数据产品经理，Boss直聘','周三晚八点 B公司三面，望京那边','智能问数demo用Dify跑通了，采纳率72%'];
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function quickHTML(){
  const q = state.quick; if(!q) return '';
  const tab = q.tab||'text'; const p = q.parsed; const f = p?p.fields:{};
  const typeName = {opportunity:'机会', interview:'面试', practice:'项目实践', todo:'待办'}[p?p.type:'todo'];
  return `<div class="mask" data-act="mask">
    <div class="modal">
      <div class="between" style="margin-bottom:12px"><h2>快速录入</h2><button class="btn sm" data-act="closequick">关闭</button></div>
      <div class="tabs">
        <button class="${tab==='text'?'on':''}" data-act="qtab" data-k="text">文字</button>
        ${SR?`<button class="${tab==='voice'?'on':''}" data-act="qtab" data-k="voice">语音</button>`:''}
        <button class="${tab==='image'?'on':''}" data-act="qtab" data-k="image">图片</button>
      </div>
      ${tab==='text'?`
        <div class="field"><textarea id="q-input" placeholder="一句话记下来，系统会自动解析">${esc(q.text||'')}</textarea></div>
        <div class="row wrap" style="margin-bottom:10px">试试：
          ${DEMOS.map((d,i)=>`<button class="chip" data-act="demo" data-i="${i}">${esc(d.slice(0,16))}…</button>`).join('')}</div>
        <div class="row"><button class="btn pri grow" data-act="parse">解析并创建</button>
          <button class="btn" data-act="astodo">直接存为待办</button></div>`
      : tab==='voice'?`
        <div class="rec ${q.recording?'recing':''}" data-act="record">${q.recording?'正在录音…（点击停止）':'点击开始录音'}</div>
        <div class="field" style="margin-top:10px"><label>识别结果（可编辑）</label>
          <textarea id="q-input">${esc(q.text||'')}</textarea></div>
        <button class="btn pri" data-act="parse">解析并创建</button>
        <div class="hint" style="margin-top:8px">使用浏览器原生识别，不上传音频</div>`
      : `
        <div class="rec" data-act="pickimg2">点击选择图片或拍照（自动压缩）</div>
        <div class="thumbs">${(q.imgs||[]).map(a=>`<div class="thumb"><img src="${a.thumbUrl}" alt=""></div>`).join('')}</div>
        <div class="field" style="margin-top:10px"><label>挂载到</label>
          <select id="q-attref">${state.opps.map(o=>`<option value="opp:${o.id}">机会 · ${esc(o.company||'未命名')}</option>`).join('')}
            ${state.ivs.map(i=>{const o=oppOf(i)||{};return `<option value="iv:${i.id}">面试 · ${esc(o.company||'')} ${ROUND[i.round]||''}</option>`;}).join('')}
            ${state.pracs.map(p=>`<option value="prac:${p.id}">实践 · ${esc(p.title||'')}</option>`).join('')}</select></div>
        <div class="row"><button class="btn pri grow" data-act="saveimg">保存到所选实体</button></div>`}

      ${p?`<div class="parse-box">
        <div class="between"><h4>识别为「${typeName}」· 置信度 ${{high:'高',mid:'中',low:'低'}[p.confidence]}</h4>
          <select data-act="ptype">
            ${['opportunity','interview','practice','todo'].map(t=>`<option value="${t}" ${p.type===t?'selected':''}>${{opportunity:'机会',interview:'面试',practice:'项目实践',todo:'待办'}[t]}</option>`).join('')}
          </select></div>
        ${p.type==='opportunity'?`<div class="grid2">
          <div class="field"><label>公司</label><input id="pf-company" value="${esc(f.company||'')}"></div>
          <div class="field"><label>岗位</label><input id="pf-position" value="${esc(f.position||'')}"></div>
          <div class="field"><label>岗位方向</label><select id="pf-dir">${Object.keys(DIR_NAME).map(k=>`<option value="${k}" ${f.dir===k?'selected':''}>${DIR_NAME[k]}</option>`).join('')}</select></div>
          <div class="field"><label>渠道</label><select id="pf-channel">${Object.keys(CHANNEL).map(k=>`<option value="${k}" ${f.channel===k?'selected':''}>${CHANNEL[k]}</option>`).join('')}</select></div>
          <div class="field"><label>区</label><input id="pf-district" value="${esc(f.district||'')}"></div>
          <div class="field"><label>商圈</label><input id="pf-area" value="${esc(f.area||'')}"></div>
          <div class="field"><label>状态</label><select id="pf-status">${Object.keys(STATUS).map(k=>`<option value="${k}" ${f.status===k?'selected':''}>${STATUS[k][0]}</option>`).join('')}</select></div>
          <div class="field"><label>投递日期</label><input id="pf-applied" value="${esc(f.applied_at||'')}"></div>
        </div>`
        : p.type==='interview'?`<div class="grid2">
          <div class="field"><label>公司</label><input id="pf-company" value="${esc(f.company||'')}"></div>
          <div class="field"><label>轮次</label><select id="pf-round">${Object.keys(ROUND).map(k=>`<option value="${k}" ${f.round===k?'selected':''}>${ROUND[k]}</option>`).join('')}</select></div>
          <div class="field"><label>时间</label><input id="pf-at" value="${esc(f.scheduled_at||'')}"></div>
          <div class="field"><label>位置</label><input id="pf-loc" value="${esc((f.district||'')+(f.area||''))}"></div>
        </div>`
        : p.type==='practice'?`<div class="grid2">
          <div class="field"><label>标题</label><input id="pf-title" value="${esc(f.company||f.raw||'')}"></div>
          <div class="field"><label>AI 类型</label><select id="pf-aitype">${Object.keys(AI_TYPE).map(k=>`<option value="${k}" ${f.aiType===k?'selected':''}>${AI_TYPE[k]}</option>`).join('')}</select></div>
        </div>`
        : `<div class="field"><label>待办内容</label><input id="pf-title" value="${esc(p.raw)}"></div>`}
        <div class="hint">原始文本会存入录入流水，即使没识别出来也不会丢</div>
        <div class="row" style="margin-top:10px;justify-content:flex-end">
          <button class="btn" data-act="closequick">取消</button>
          <button class="btn pri" data-act="confirm">确认创建</button></div>
      </div>`:''}
    </div></div>`;
}

/* ---------- 引导页 ---------- */
function onboardHTML(){
  return `<div class="onboard"><div class="box">
    <h1>骑驴找马</h1>
    <div class="muted">在职跳槽全过程的个人作战台</div>
    <ul>
      <li>数据只存在这台设备的浏览器里，不上传</li>
      <li>换设备请先<u>导出备份</u>，再到新设备导入</li>
      <li>手机和电脑都能用，建议添加到主屏幕</li>
    </ul>
    <div class="row"><button class="btn pri grow" data-act="onboard-new">全新开始</button>
      <button class="btn grow" data-act="import">导入备份</button></div>
    <div class="hint" style="margin-top:10px">如果这是你的第二台设备，请先导入备份，否则两端数据不会自动同步。</div>
  </div></div>`;
}

/* ---------- 主渲染 ---------- */
function render(){
  const body = {overview:viewOverview, apply:viewApply, interview:viewInterview, practice:viewPractice, settings:viewSettings}[state.view]();
  const detail = detailHTML();
  const isWide = window.innerWidth>900;
  $('#app').innerHTML = `<div class="layout">${sidebarHTML()}
    <div class="main">${isWide&&detail? `<div class="split"><div class="list">${body}</div><div class="panel">${detail}</div></div>`
      : body+(detail||'')}</div></div>${tabbarHTML()}<button class="fab" data-act="quick">+</button>`;
  $('#modal-root').innerHTML = (state.quick?quickHTML():'') + (state.onboard?onboardHTML():'');
  refreshAttUrls();
}
async function refreshAttUrls(){
  for(const a of state.atts){
    if(a.blob && !a.thumbUrl) a.thumbUrl = URL.createObjectURL(a.thumb || a.blob);
  }
}

/* ============ 8. 图片 / 语音 / 导入导出 ============ */
function compressImage(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onload=()=>{ const img=new Image();
      img.onload=()=>{
        let w=img.width,h=img.height; const max=1280;
        if(w>h&&w>max){h=Math.round(h*max/w);w=max;} else if(h>=w&&h>max){w=Math.round(w*max/h);h=max;}
        const c=document.createElement('canvas'); c.width=w;c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        const t=document.createElement('canvas'); const tw=160, th=Math.round(160*h/w);
        t.width=tw;t.height=th; t.getContext('2d').drawImage(img,0,0,tw,th);
        c.toBlob(full=> t.toBlob(thumb=> res({full,thumb,w,h}),'image/jpeg',0.7),'image/jpeg',0.7);
      };
      img.onerror=rej; img.src=fr.result;
    };
    fr.onerror=rej; fr.readAsDataURL(file);
  });
}
async function handleImage(file, refType, refId){
  if(!file) return;
  const {full,thumb,w,h} = await compressImage(file);
  const a = {id:uid(), ref_type:refType, ref_id:refId, blob:full, thumb:thumb, w, h,
    name:file.name, size:full.size, created_at:new Date().toISOString()};
  await save('atts',a);
  a.thumbUrl = URL.createObjectURL(thumb);
  await addLog('image','上传了图片 '+(file.name||''), refType+':'+refId, a.id);
  render(); toast('图片已压缩保存（'+Math.round(full.size/1024)+'KB）');
}
function b64(blob){ return new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result.split(',')[1]); fr.readAsDataURL(blob); }); }
function unb64(s,type){ const bin=atob(s); const arr=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return new Blob([arr],{type:type||'image/jpeg'}); }
async function exportData(){
  const atts = [];
  for(const a of state.atts){
    if(!a.blob) continue;
    atts.push(Object.assign({},a,{blob:await b64(a.blob), thumb:null, thumbUrl:null}));
  }
  const data = {app:'jobhunt', version:1, exported_at:new Date().toISOString(),
    devices:state.devices.concat([(state.settings||{}).device||{}].filter(Boolean)),
    settings:state.settings, opps:state.opps, ivs:state.ivs, preps:state.preps, pracs:state.pracs,
    todos:state.todos, logs:state.logs, atts};
  const blob = new Blob([JSON.stringify(data)],{type:'application/json'});
  const url = URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download='jobhunt-'+today()+'.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  toast('已导出备份');
}
async function importData(file){
  try{
    const txt = await file.text(); const d = JSON.parse(txt);
    if(!d || !d.opps) throw new Error('格式不对');
    for(const a of (d.atts||[])){ if(typeof a.blob==='string') a.blob=unb64(a.blob); }
    for(const k of ['opps','ivs','preps','pracs','todos','logs','atts']){
      for(const obj of (d[k]||[])){ await DB.put(k,obj); }
    }
    for(const dev of (d.devices||[])){ if(dev&&dev.id) await DB.put('devices',dev); }
    if(d.settings){ const cur = state.settings||{key:'settings'};
      const merged = Object.assign({}, DEFAULTS, cur, d.settings);
      merged.key='settings'; merged.device = cur.device || d.settings.device;
      merged.onboarded = true;
      await DB.put('settings', merged); }
    await loadAll(); state.onboard=false; render();
    toast('导入成功：机会 '+(d.opps||[]).length+' · 面试 '+(d.ivs||[]).length+' · 实践 '+(d.pracs||[]).length);
  }catch(e){ toast('导入失败：'+e.message); }
}

/* ============ 9. 事件 ============ */
document.addEventListener('click', async e=>{
  const el = e.target.closest('[data-act],[data-nav]'); if(!el) return;
  const act = el.dataset.act;
  const nav = el.dataset.nav;
  if(!act && nav){ e.preventDefault(); state.view=nav; state.detail=null; render(); return; }
  switch(act){
    case 'quick': state.quick={tab:'text',text:'',imgs:[]}; render();
      setTimeout(()=>{const n=$('#q-input'); if(n) n.focus();},30); break;
    case 'closequick': case 'mask':
      if(act==='mask' && e.target!==el) break;
      state.quick=null; render(); break;
    case 'qtab': state.quick.tab=el.dataset.k; render(); break;
    case 'demo': { const i=+el.dataset.i; state.quick.text=DEMOS[i]; state.quick.tab='text'; render();
      setTimeout(()=>{const n=$('#q-input'); if(n){n.focus(); n.setSelectionRange(n.value.length,n.value.length);}},30); break; }
    case 'parse': { const n=$('#q-input'); state.quick.text=n?n.value:''; 
      if(!state.quick.text.trim()){ toast('先写点什么'); break; }
      state.quick.parsed=parseText(state.quick.text); render(); break; }
    case 'astodo': { const n=$('#q-input'); const t=(n&&n.value||'').trim(); if(!t) {toast('先写点什么');break;}
      await save('todos',{id:uid(), title:t, category:'其他', due_at:today(), done:false, created_at:new Date().toISOString()});
      await addLog('text',t,'todo',''); state.quick=null; render(); toast('已存为待办'); break; }
    case 'ptype': state.quick.parsed.type=el.value; render(); break;
    case 'confirm': await confirmParse(); break;
    case 'open': state.detail={type:el.dataset.t, id:el.dataset.id}; render(); break;
    case 'close': state.detail=null; render(); break;
    case 'newopp': await newOpp(); break;
    case 'newiv': await newInterview(); break;
    case 'newivfor': await newInterview({opportunity_id:el.dataset.id}); break;
    case 'newprac': await newPrac(); break;
    case 'fapply': state.applyFilter=el.dataset.k; render(); break;
    case 'fprac': state.pracFilter=el.dataset.k; render(); break;
    case 'go': state.view=el.dataset.v; state.detail=null;
      if(el.dataset.v==='apply') state.applyFilter=el.dataset.f||'all';
      if(el.dataset.v==='practice') state.pracFilter=el.dataset.f||'all';
      render(); break;
    case 'todo': { const t=state.todos.find(x=>x.id===el.dataset.id); if(t){ t.done=true; t.completed_at=now(); await save('todos',t); render(); } break; }
    case 'deltodo': await DB.del('todos',el.dataset.id); await loadAll(); render(); break;
    case 'prep': { const p=state.preps.find(x=>x.id===el.dataset.id); if(p){ p.done=!p.done; await save('preps',p); render(); } break; }
    case 'follow': { const o=state.opps.find(x=>x.id===el.dataset.id); if(o){ o.last_progress_at=now();
      o.history=(o.history||[]).concat([{status:o.status, at:now(), note:'标记跟进'}]); await save('opps',o); render(); toast('已标记跟进'); } break; }
    case 'advance': await advance(el.dataset.id); break;
    case 'setarea': { const o=state.opps.find(x=>x.id===el.dataset.id); if(o){ o.area=el.dataset.a; o.tier=calcTier(o); await save('opps',o); render(); } break; }
    case 'switchdir': await switchDir(el.dataset.id, el.value); break;
    case 'addprlog': { const inp=$('#prac-log'); const p=state.pracs.find(x=>x.id===el.dataset.id);
      if(inp&&inp.value&&p){ p.logs=(p.logs||[]).concat([{at:today(), text:inp.value}]); await save('pracs',p); render(); toast('已记录'); } break; }
    case 'pickimg': { const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
      inp.onchange=()=>handleImage(inp.files[0], el.dataset.t, el.dataset.id); inp.click(); break; }
    case 'pickimg2': { const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*';
      inp.onchange=async()=>{ const {full,thumb}=await compressImage(inp.files[0]);
        state.quick.imgs=(state.quick.imgs||[]).concat([{blob:full, thumb, thumbUrl:URL.createObjectURL(thumb)}]); render(); };
      inp.click(); break; }
    case 'saveimg': { const sel=$('#q-attref'); if(!sel||!sel.value){ toast('先创建一个机会或实践'); break; }
      const [t,id]=sel.value.split(':');
      for(const im of (state.quick.imgs||[])){
        const a={id:uid(), ref_type:t, ref_id:id, blob:im.blob, thumb:im.thumb, name:'', size:im.blob.size,
          created_at:new Date().toISOString()};
        await save('atts',a); a.thumbUrl=URL.createObjectURL(im.thumb);
        await addLog('image','上传了图片',t+':'+id,a.id);
      }
      state.quick=null; state.detail={type:t,id}; render(); toast('已保存'); break; }
    case 'viewatt': { const a=state.atts.find(x=>x.id===el.dataset.id);
      if(a){ const url=URL.createObjectURL(a.blob);
        $('#modal-root').innerHTML=`<div class="mask" data-act="closemask"><div class="modal">
          <div class="between" style="margin-bottom:10px"><h2>图片</h2><button class="btn sm" data-act="closemask">关闭</button></div>
          <div class="thumb big"><img src="${url}" style="width:100%"></div></div></div>`; } break; }
    case 'closemask': $('#modal-root').innerHTML=state.quick?quickHTML():''; break;
    case 'record': startRecord(); break;
    case 'export': exportData(); break;
    case 'import': { const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json,.json';
      inp.onchange=()=>importData(inp.files[0]); inp.click(); break; }
    case 'wipe': if(confirmBox('确定清空全部数据？此操作不可恢复，建议先导出备份。')){
      await DB.clearAll(); await loadAll(); state.settings=null; await initSettings(); state.onboard=true; render(); } break;
    case 'del': await removeEntity(el.dataset.store, el.dataset.id); break;
    case 'addarea': { const v=window.prompt('输入区域，格式：区·商圈（如 海淀·中关村）');
      if(v){ const s=state.settings; s[el.dataset.k]=(s[el.dataset.k]||[]).concat([v]); await save('settings',s); render(); } break; }
    case 'rmarea': { const s=state.settings; s[el.dataset.k].splice(+el.dataset.i,1); await save('settings',s); render(); break; }
    case 'onboard-new': { const s=state.settings; s.onboarded=true; await save('settings',s); state.onboard=false; render(); break; }
  }
});

document.addEventListener('change', async e=>{
  const el = e.target.closest('[data-f]'); if(!el) return;
  const store = el.dataset.store, id = el.dataset.id, f = el.dataset.f;
  let obj;
  if(store==='settings'){ obj = state.settings; if(!obj) return; }
  else obj = state[store].find(x=>x.id===id);
  if(!obj) return;
  let v = el.type==='checkbox'? el.checked : el.value;
  if(f==='commute'||f==='progress'||f==='commuteThreshold') v = Number(v)||0;
  if(f==='is_ai'||f==='resume_ready') v = (v==='true');
  if(f==='stack') v = String(v).split(/[,，、]/).map(s=>s.trim()).filter(Boolean);
  if(f==='records') v = String(v).split('\n').filter(Boolean);
  if(f.startsWith('stuck.')){ obj.stuck = obj.stuck||{}; obj.stuck[f.split('.')[1]] = Number(v)||0; }
  else if(f.startsWith('review.')){ obj.review = obj.review||{}; obj.review[f.split('.')[1]] = v; }
  else if(f.startsWith('device.')){ obj.device = obj.device||{}; obj.device[f.split('.')[1]] = v; }
  else obj[f] = v;
  if(store==='opps' && ['district','area','commute','tier'].includes(f) && f!=='tier') obj.tier = calcTier(obj);
  if(store==='opps' && f==='direction'){ /* 方向变更不重建清单 */ }
  if(store==='ivs' && f==='status'){}
  if(store==='opps' && f==='status'){
    obj.history = (obj.history||[]).concat([{status:v, at:now(), note:''}]);
    obj.last_progress_at = now();
    if(v==='applied' && !obj.applied_at) obj.applied_at = today();
  }
  await save(store, obj);
  if(el.tagName==='SELECT' || ['district','area','tier','status','is_ai','resume_ready','mastery'].includes(f)) render();
  else toast('已保存');
});

document.addEventListener('keydown', e=>{
  const tag = (document.activeElement||{}).tagName;
  const typing = /INPUT|TEXTAREA|SELECT/.test(tag||'');
  if(e.key==='n' && !typing && !state.quick && !state.onboard){ state.quick={tab:'text',text:'',imgs:[]}; render();
    setTimeout(()=>{const n=$('#q-input'); if(n) n.focus();},30); }
  if(e.key==='Escape'){ if(state.quick){ state.quick=null; render(); } else if(state.detail){ state.detail=null; render(); } }
});
let resizeTimer=null;
window.addEventListener('resize', ()=>{ clearTimeout(resizeTimer); resizeTimer=setTimeout(render,200); });

/* 语音 */
let recog=null;
function startRecord(){
  if(!SR){ toast('当前浏览器不支持语音识别'); return; }
  const q = state.quick; if(!q) return;
  if(q.recording){ if(recog) recog.stop(); return; }
  recog = new SR(); recog.lang='zh-CN'; recog.interimResults=true; recog.continuous=true;
  let final='';
  recog.onresult = ev=>{ let interim='';
    for(let i=ev.resultIndex;i<ev.results.length;i++){ const t=ev.results[i][0].transcript;
      if(ev.results[i].isFinal) final+=t; else interim+=t; }
    q.text = final+interim; const n=$('#q-input'); if(n) n.value=q.text; };
  recog.onerror = ()=>{ q.recording=false; render(); toast('录音失败或没有麦克风权限'); };
  recog.onend = ()=>{ q.recording=false; render(); };
  recog.start(); q.recording=true; render();
}

/* 解析确认后创建 */
async function confirmParse(){
  const q = state.quick; if(!q||!q.parsed) return;
  const p = q.parsed; const g = id=>{ const n=$(id); return n?n.value:''; };
  const raw = q.text||p.raw;
  if(p.type==='opportunity'){
    const o = {id:uid(), company:g('#pf-company'), position:g('#pf-position'), direction:g('#pf-dir'),
      channel:g('#pf-channel'), district:g('#pf-district'), area:g('#pf-area'), status:g('#pf-status'),
      applied_at:g('#pf-applied'), salary:'', city:(state.settings||DEFAULTS).defaultCity,
      commute:'', commute_mode:'地铁', address:'', jd_text:'', jd_link:'', next_follow_at:'',
      resume_version:'', note:'', history:[{status:g('#pf-status'), at:now(), note:'快录创建'}],
      last_progress_at:now(), created_at:new Date().toISOString()};
    o.tier = calcTier(o);
    await save('opps',o); await addLog('text',raw,'opp:'+o.id,'');
    state.quick=null; state.view='apply'; state.detail={type:'opp',id:o.id}; render(); toast('已创建机会');
  } else if(p.type==='interview'){
    let oppId='';
    const cname=g('#pf-company');
    const exist = cname? state.opps.find(o=>o.company===cname || (o.company||'').includes(cname.replace(/公司$/,''))) : null;
    if(exist) oppId=exist.id;
    else if(cname){ const o={id:uid(), company:cname, position:'', direction:'ai_data_pm', status:'interviewing',
      city:(state.settings||DEFAULTS).defaultCity, district:g('#pf-loc'), area:'', history:[], last_progress_at:now(),
      created_at:new Date().toISOString()}; o.tier=calcTier(o); await save('opps',o); oppId=o.id; }
    const iv = {id:uid(), opportunity_id:oppId, direction:(exist&&exist.direction)||'ai_data_pm',
      round:g('#pf-round')||'r1', scheduled_at:g('#pf-at'), format:'online', location:g('#pf-loc'),
      interviewer:'', records:[], review:{}, result:'pending', created_at:new Date().toISOString()};
    await save('ivs',iv); await buildPreps(iv.id, iv.direction);
    await addLog('text',raw,'iv:'+iv.id,'');
    state.quick=null; state.view='interview'; state.detail={type:'iv',id:iv.id}; render(); toast('已创建面试并生成准备清单');
  } else if(p.type==='practice'){
    const pr = {id:uid(), title:g('#pf-title')||raw, category:'project', is_ai:true, ai_type:g('#pf-aitype')||'other',
      stack:[], goal:'', progress:0, blocker:'', metric:'', deliverable:'', resume_ready:false, due_at:'',
      status:'doing', logs:[], created_at:new Date().toISOString()};
    await save('pracs',pr); await addLog('text',raw,'prac:'+pr.id,'');
    state.quick=null; state.view='practice'; state.detail={type:'prac',id:pr.id}; render(); toast('已创建实践');
  } else {
    await save('todos',{id:uid(), title:g('#pf-title')||raw, category:'其他', due_at:today(), done:false, created_at:new Date().toISOString()});
    await addLog('text',raw,'todo','');
    state.quick=null; state.view='overview'; render(); toast('已存为待办');
  }
}
async function advance(id){
  const o = state.opps.find(x=>x.id===id); if(!o) return;
  const flow = ['to_apply','applied','resume_pass','interviewing','pending_result','offer'];
  const i = flow.indexOf(o.status);
  if(i<0){ toast('已是终态，手动选择状态'); return; }
  const next = flow[i+1]||'offer';
  o.status=next; o.last_progress_at=now();
  if(next==='applied' && !o.applied_at) o.applied_at=today();
  o.history=(o.history||[]).concat([{status:next, at:now(), note:''}]);
  await save('opps',o); render(); toast('已推进到「'+STATUS[next][0]+'」');
}

/* ============ 10. 启动 ============ */
async function initSettings(){
  const dev = {id:uid(), name:'', ua:navigator.userAgent.slice(0,120), firstSeen:new Date().toISOString()};
  const s = Object.assign({key:'settings', onboarded:false, device:dev}, DEFAULTS);
  await DB.put('settings', s);
  await DB.put('devices', dev);
  state.settings = s; state.devices=[dev];
}
async function boot(){
  await DB.open();
  await loadAll();
  if(!state.settings) await initSettings();
  if(!state.settings.device){ state.settings.device={id:uid(),name:'',ua:navigator.userAgent.slice(0,120),
    firstSeen:new Date().toISOString()}; await save('settings', state.settings); }
  const empty = !state.opps.length && !state.ivs.length && !state.pracs.length && !state.todos.length;
  state.onboard = !state.settings.onboarded && empty;
  render();
  if(location.protocol==='file:'){
    const w=document.createElement('div');
    w.style.cssText='position:fixed;left:0;right:0;top:0;z-index:600;background:#F3DEDC;color:#8C413D;'+
      'border-bottom:2px solid #1D1D1F;padding:8px 14px;font-size:12px;font-weight:500;text-align:center';
    w.textContent='当前以本地文件方式打开，Chrome 会禁用本地数据库，记录可能无法保存。请用 http(s) 网址访问。';
    document.body.appendChild(w);
  }
  if('serviceWorker' in navigator){ try{ await navigator.serviceWorker.register('sw.js'); }catch(e){} }
  const b = (state.settings.beacon||{});
  if(b.url){ fetch(b.url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({device_id:state.settings.device.id, name:state.settings.device.name,
      ua:navigator.userAgent.slice(0,60), time:new Date().toISOString()})}).catch(()=>{}); }
}
boot();
