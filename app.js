// ── PONTOS OFICIAIS ──
const POINTS = {
  resurgence: [15,12,9,7,5,4,3,3,2,2,1,1,1,1,1,0,0,0,0,0],
  br:         [25,20,17,15,13,11,9,8,7,6,5,4,3,2,2,1,1,1,1,0]
};

// ── MAPAS WZ BO7 Season 3 (2026) ──
const WZ_MAPS = {
  br: [
    { id:'verdansk',  name:'Verdansk',      img:'maps/verdansk.png',     desc:'Battle Royale clássico' },
    { id:'avalon',    name:'Avalon',         img:'maps/avalon.png',        desc:'Battle Royale — Season 3' },
  ],
  resurgence: [
    { id:'rebirth',   name:'Rebirth Island', img:'maps/rebirth_island.png', desc:'Ressurgência clássica' },
    { id:'haven',     name:"Haven's Hollow", img:'maps/havens_hollow.png',  desc:'Ressurgência — Season 1 BO7' },
  ]
};
function getMapsForMode(mode){ return mode==='br' ? WZ_MAPS.br : WZ_MAPS.resurgence; }

// ── VERSÃO DO LOCALSTORAGE ──
const LS_KEY = 'wzc_v3';
const KILL_PT = 1;

// ── STATE ──
let S = loadState();

function blank() {
  return {
    name:'WZ Championship', season:'Season 3', phase:'Fase de Grupos — Semana 1',
    prize:'$50,000', mode:'resurgence', rounds:4,
    description:'', scheduledAt:'',
    apiId: null,
    groups:[], teams:[], matches:[], isLive:false, liveUrl:''
  };
}
function loadState(){
  try{ const r=localStorage.getItem(LS_KEY); if(r) return JSON.parse(r); }catch(e){}
  return blank();
}
function save(){ localStorage.setItem(LS_KEY,JSON.stringify(S)); }

function hardReset(keepInfo){
  const info = keepInfo ? {name:S.name,season:S.season,phase:S.phase,prize:S.prize,mode:S.mode,rounds:S.rounds,description:S.description,scheduledAt:S.scheduledAt} : {};
  localStorage.removeItem(LS_KEY);
  S = blank();
  if(keepInfo) Object.assign(S, info);
  save(); renderAll();
}

// ── COMPUTED ──
function getPoints(placement){ return (POINTS[S.mode][placement-1]||0); }

function standings(groupFilter){
  return S.teams
    .filter(t=> groupFilter && groupFilter!=='all' ? t.group===groupFilter : true)
    .map(t=>{
      let pts=0,kills=0,played=0,wins=0,top5=0;
      S.matches.filter(m=>m.status==='done').forEach(m=>{
        const r=m.results.find(r=>r.teamId===t.id);
        if(!r)return;
        played++; kills+=r.kills;
        pts+=getPoints(r.placement)+r.kills*KILL_PT;
        if(r.placement===1)wins++;
        if(r.placement<=5)top5++;
      });
      return {...t,pts,kills,played,wins,top5,avg:played?(pts/played).toFixed(1):'0.0'};
    })
    .sort((a,b)=>b.pts-a.pts||b.kills-a.kills);
}

// ── RENDER STANDINGS (EWC Style) ──
function renderStandings(){
  const gf=document.getElementById('standings-group-filter').value;
  const data=standings(gf);
  const wrap=document.getElementById('standings-body');
  if(!data.length){wrap.innerHTML='<div style="padding:60px;text-align:center;color:var(--text-3);font-family:var(--font-cond);font-size:14px;letter-spacing:2px;grid-column:1/-1">NENHUM TIME CADASTRADO</div>';return;}
  const qualify=gf==='all'?Math.ceil(data.length*0.33):2;
  const bubble=gf==='all'?Math.ceil(data.length*0.66):4;
  wrap.innerHTML=data.map((t,i)=>{
    const pos=i+1;
    const posC=pos===1?'#ffd700':pos===2?'#c0c0c0':pos===3?'#cd7f32':'var(--text-2)';
    const posIcon=pos===1?'👑':pos===2?'🥈':pos===3?'🥉':'';
    const borderC=pos<=qualify?'rgba(0,255,135,.25)':pos<=bubble?'rgba(255,165,0,.2)':'rgba(255,255,255,.05)';
    const bgC=pos<=qualify?'rgba(0,255,135,.03)':pos<=bubble?'rgba(255,165,0,.03)':'transparent';
    const pill=pos<=qualify
      ?'<span style="font-family:var(--font-cond);font-size:9px;font-weight:800;letter-spacing:2px;padding:2px 8px;border-radius:20px;background:rgba(0,255,135,.12);color:#00ff87;border:1px solid rgba(0,255,135,.25)">✓ CLASSIF.</span>'
      :pos<=bubble
      ?'<span style="font-family:var(--font-cond);font-size:9px;font-weight:800;letter-spacing:2px;padding:2px 8px;border-radius:20px;background:rgba(255,165,0,.12);color:#ffa500;border:1px solid rgba(255,165,0,.25)">DISPUTA</span>'
      :'';
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:${bgC};border:1px solid ${borderC};border-radius:10px;transition:.2s" onmouseover="this.style.borderColor='rgba(255,106,0,.3)'" onmouseout="this.style.borderColor='${borderC}'">
      <div style="font-family:var(--font-cond);font-size:22px;font-weight:900;color:${posC};min-width:32px;text-align:center">${posIcon||pos}</div>
      <div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:13px;font-weight:900;background:${t.color||'#ff6a00'};flex-shrink:0;color:#fff;overflow:hidden;border:2px solid rgba(255,255,255,.1)">${t.logo?`<img src="${t.logo}" style="width:100%;height:100%;object-fit:cover"/>`:t.tag.slice(0,2)}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-family:var(--font-cond);font-size:15px;font-weight:900;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</span>
          <span style="font-family:var(--font-cond);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--orange)">[${t.tag}]</span>
          ${pill}
        </div>
        <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:1px;color:var(--text-3);margin-top:2px">GRP ${t.group} &nbsp;·&nbsp; ${t.played}P &nbsp;·&nbsp; ${t.wins}V &nbsp;·&nbsp; TOP5: ${t.top5}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;margin-left:4px">
        <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:1px;color:var(--text-3)">KILLS</div>
        <div style="font-family:var(--font-cond);font-size:16px;font-weight:900;color:var(--text-2)">${t.kills}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 16px;background:${pos===1?'rgba(255,215,0,.12)':pos<=3?'rgba(255,106,0,.1)':'rgba(255,255,255,.04)'};border-radius:8px;min-width:70px;border:1px solid ${pos===1?'rgba(255,215,0,.2)':pos<=3?'rgba(255,106,0,.2)':'rgba(255,255,255,.05)'}">
        <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:1px;color:var(--text-3)">PTS</div>
        <div style="font-family:var(--font-cond);font-size:22px;font-weight:900;color:${pos===1?'#ffd700':pos<=3?'var(--orange)':'var(--text-1)'}">${t.pts}</div>
      </div>
    </div>`;
  }).join('');
}


// ── RENDER GROUPS ──
function renderGroups(){
  const grid=document.getElementById('groups-grid');
  grid.innerHTML='';
  S.groups.forEach(g=>{
    const data=standings(g.name);
    const qCount=Math.ceil(data.length/3)||2;
    const rows=data.map((t,i)=>`<tr class="${i<qCount?'qualify-spot':''}">
      <td><div style="display:flex;align-items:center;gap:8px">
        <div class="team-color-bar" style="background:${t.color};height:26px"></div>
        <span class="g-team-name">${t.name}</span></div></td>
      <td class="g-pts">${t.pts}</td><td>${t.kills}</td><td>${t.played}</td></tr>`).join('');
    grid.innerHTML+=`<div class="group-card">
      <div class="group-card-header">
        <span class="group-name">GRUPO ${g.name}</span>
        <span class="group-count">${data.length} TIMES</span>
      </div>
      <table class="group-table">
        <thead><tr><th>TIME</th><th>PTS</th><th>KLS</th><th>P</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  });
  if(!S.groups.length) grid.innerHTML=`<div style="padding:40px;color:var(--text-3);font-family:var(--font-cond);font-size:16px;letter-spacing:2px">Crie grupos na aba CONFIGURAR</div>`;
}

// ── RENDER MATCHES ──
function renderMatches(){
  const rf=document.getElementById('match-round-filter').value;
  const sf=document.getElementById('match-status-filter').value;
  const list=document.getElementById('matches-list');
  let ms=S.matches;
  if(rf!=='all') ms=ms.filter(m=>String(m.round)===rf);
  if(sf!=='all') ms=ms.filter(m=>m.status===sf);
  if(!ms.length){list.innerHTML=`<div style="padding:60px;text-align:center;color:var(--text-3);font-family:var(--font-cond);font-size:16px;letter-spacing:2px">NENHUMA PARTIDA</div>`;return;}
  list.innerHTML=ms.map(m=>{
    const slabel=m.status==='live'?'AO VIVO':m.status==='done'?'FINALIZADO':'EM BREVE';
    const sorted=[...m.results].sort((a,b)=>a.placement-b.placement).slice(0,5);
    const resHTML=m.status!=='upcoming'&&sorted.length?sorted.map(r=>{
      const tm=S.teams.find(t=>t.id===r.teamId);if(!tm)return'';
      const pts=getPoints(r.placement)+r.kills*KILL_PT;
      return`<div class="match-team-row ${r.placement===1?'winner':''}">
        <span class="mtr-name" style="color:${tm.color}">${tm.tag}</span>
        <div class="mtr-stats"><span class="mtr-stat">#<span>${r.placement}</span></span><span class="mtr-stat">💀<span>${r.kills}</span></span></div>
        <span class="mtr-pts">${pts}pts</span></div>`;
    }).join(''):`<div style="text-align:center;padding:12px;font-family:var(--font-cond);font-size:13px;color:var(--text-3);letter-spacing:2px">${m.teamIds.length} TIMES</div>`;
    return`<div class="match-card ${m.status}">
      <div class="match-meta"><span class="match-round">RODADA ${m.round}</span>
        <span class="match-status-label ${m.status}">${slabel}</span>
        <span class="match-time">${m.time}</span></div>
      <div class="match-center"><div class="match-map">${m.map||S.mode.toUpperCase()}</div>
        <div>${resHTML}</div></div>
      <div class="match-group"><span class="match-group-label">GRUPO ${m.group}</span></div></div>`;
  }).join('');
}

// ── RENDER BRACKET ──
function renderBracket(){
  const wrap=document.getElementById('bracket-wrap');
  const top8=standings('all').slice(0,8);
  if(!top8.length||top8.every(t=>t.pts===0)){
    wrap.innerHTML=`<div class="bracket-placeholder"><svg width="64" height="64" viewBox="0 0 24 24" fill="#4a5568"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
      <p>PLAYOFFS DISPONÍVEIS APÓS FASE DE GRUPOS</p><p style="font-size:13px">Top 8 avançam</p></div>`;return;
  }
  const pairs=[[top8[0],top8[7]],[top8[3],top8[4]],[top8[1],top8[6]],[top8[2],top8[5]]];
  const brow=(t,win)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${win?'rgba(0,255,135,0.05)':'transparent'}">
    <div style="display:flex;align-items:center;gap:10px"><div style="width:3px;height:28px;border-radius:2px;background:${t.color}"></div>
    <span style="font-family:var(--font-cond);font-weight:700;font-size:14px">${t.name}</span></div>
    <span style="font-family:var(--font-cond);font-weight:900;font-size:16px;color:${win?'var(--green)':'var(--orange)'}">${t.pts}</span></div>`;
  wrap.innerHTML=`<div style="padding:20px;display:flex;gap:24px;min-width:900px;overflow-x:auto">
    <div style="flex:1"><div style="font-family:var(--font-cond);font-size:11px;letter-spacing:3px;color:var(--orange);margin-bottom:12px">QUARTAS DE FINAL</div>
    ${pairs.map(([a,b])=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:12px">
      ${brow(a,a.pts>=b.pts)}<div style="height:1px;background:var(--border-subtle)"></div>${brow(b,b.pts>a.pts)}</div>`).join('')}</div>
    <div style="flex:0.6"><div style="font-family:var(--font-cond);font-size:11px;letter-spacing:3px;color:var(--orange);margin-bottom:12px">SEMIFINAL</div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center;font-family:var(--font-cond);font-size:13px;color:var(--text-3);letter-spacing:2px;margin-bottom:10px">A DEFINIR</div>
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:16px;text-align:center;font-family:var(--font-cond);font-size:13px;color:var(--text-3);letter-spacing:2px">A DEFINIR</div></div>
    <div style="flex:0.5"><div style="font-family:var(--font-cond);font-size:11px;letter-spacing:3px;color:var(--orange);margin-bottom:12px">GRANDE FINAL</div>
    <div style="background:linear-gradient(135deg,rgba(255,106,0,0.15),rgba(255,106,0,0.05));border:1px solid var(--border);border-radius:8px;padding:32px;text-align:center;font-family:var(--font-cond);font-size:18px;font-weight:900;color:var(--text-3);letter-spacing:2px">🏆 A DEFINIR</div></div></div>`;
}

// ── RENDER PONTUAÇÃO ──
function renderPontos(mode){
  const pts=POINTS[mode];
  const body=document.getElementById('pts-table-body');
  const medals=['🥇','🥈','🥉'];
  body.innerHTML=pts.map((p,i)=>{
    const pos=i+1; const isTop=pos<=3; const hasBonus=pos===1;
    return`<tr class="${pos===1?'pts-top1':pos<=5?'pts-highlight':''}">
      <td class="pts-pos">${medals[i]||pos}º ${isTop?'<span style="color:var(--gold);font-size:11px">'+['CAMPEÃO','VICE','3º LUGAR'][i]||'':''}${isTop?'</span>':''}</td>
      <td class="pts-val">${p}</td>
      <td class="pts-bonus">${hasBonus?'👑 Bônus Campeão':p>0?'+'+p+' pts':'—'}</td></tr>`;
  }).join('');
  document.getElementById('pts-mode-title').textContent=
    mode==='resurgence'?'RESSURGÊNCIA — PONTOS POR POSIÇÃO':'BATTLE ROYALE — PONTOS POR POSIÇÃO';
  const ex1=pts[0]+8*KILL_PT;
  document.getElementById('pts-example').innerHTML=`
    <div class="pts-ex-row"><span class="pts-ex-label">1º Lugar</span><span class="pts-ex-val">+${pts[0]} pts</span></div>
    <div class="pts-ex-row"><span class="pts-ex-label">8 Kills × ${KILL_PT}</span><span class="pts-ex-val">+${8*KILL_PT} pts</span></div>
    <div class="pts-ex-row"><span class="pts-ex-label">TOTAL</span><span class="pts-ex-val">${ex1} PTS</span></div>`;
}

// ── RENDER SETUP ──


// ── REGISTRATIONS PANEL (admin / owner) ──────────────────────────────────────
async function loadRegistrationsPanel() {
  const box = document.getElementById('registrations-list');
  if (!box) return;
  if (!S.apiId) {
    box.innerHTML = '<span style="color:#ff6b8a">⚠ Salve o campeonato primeiro (clique em SALVAR na seção Informações).</span>';
    return;
  }
  box.innerHTML = '<span style="color:#4a5568;letter-spacing:2px">CARREGANDO...</span>';
  try {
    const token = localStorage.getItem('wzc_token');
    const resp = await fetch(`/api/championships/${S.apiId}/registrations`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const regs = resp.ok ? await resp.json() : [];
    if (!regs.length) {
      box.innerHTML = '<span style="color:#4a5568">Nenhuma inscrição recebida ainda.</span>';
      return;
    }
    const statusLabel = { pending:'⏳ Pendente', pending_payment:'💰 Ag. Pagamento', approved:'✅ Aprovado', rejected:'❌ Rejeitado' };
    const statusColor = { pending:'#ffd700', pending_payment:'#ff9500', approved:'#00ff87', rejected:'#ff2d55' };
    box.innerHTML = regs.map(r => {
      const alreadyAdded = S.teams.some(t => t.id === r.teamId || t.tag === r.teamTag);
      const addBtn = alreadyAdded
        ? `<span style="color:#00ff87;font-size:10px;letter-spacing:1px">✓ ADICIONADO</span>`
        : `<button onclick="addRegTeam('${r.teamId}','${(r.teamName||'').replace(/'/g,'\\'')}','${(r.teamTag||'').replace(/'/g,'\\'')}','${r.teamColor||'#ff6a00'}')"
            style="background:rgba(0,255,135,.1);border:1px solid rgba(0,255,135,.3);color:#00ff87;font-family:var(--font-cond);font-size:10px;letter-spacing:2px;padding:4px 12px;border-radius:6px;cursor:pointer">
            + ADICIONAR
          </button>`;
      const approveBtn = (r.status === 'pending' || r.status === 'pending_payment')
        ? `<button onclick="approveReg('${S.apiId}','${r.id}')"
            style="background:rgba(255,106,0,.1);border:1px solid rgba(255,106,0,.3);color:#ff6a00;font-family:var(--font-cond);font-size:10px;letter-spacing:2px;padding:4px 12px;border-radius:6px;cursor:pointer;margin-right:6px">
            ✔ APROVAR
          </button>`
        : '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);flex-wrap:wrap">
        <div style="width:36px;height:36px;border-radius:6px;background:${r.teamColor||'#ff6a00'}22;border:1px solid ${r.teamColor||'#ff6a00'}44;display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-weight:900;font-size:12px;color:${r.teamColor||'#ff6a00'};flex-shrink:0">${(r.teamTag||'?').slice(0,3)}</div>
        <div style="flex:1;min-width:120px">
          <div style="font-family:var(--font-cond);font-size:13px;font-weight:700;letter-spacing:1px">${r.teamName||r.teamId}</div>
          <div style="font-size:10px;color:${statusColor[r.status]||'#4a5568'};letter-spacing:2px;margin-top:2px">${statusLabel[r.status]||r.status}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">${approveBtn}${addBtn}</div>
      </div>`;
    }).join('');
  } catch(e) {
    box.innerHTML = `<span style="color:#ff2d55">Erro: ${e.message}</span>`;
  }
}

async function approveReg(champId, regId) {
  try {
    const token = localStorage.getItem('wzc_token');
    const resp = await fetch(`/api/championships/${champId}/registrations/${regId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });
    if (resp.ok) { showToast('Inscrição aprovada!','ok'); loadRegistrationsPanel(); }
    else { const d = await resp.json(); showToast(d.error||'Erro','err'); }
  } catch(e) { showToast(e.message,'err'); }
}

function addRegTeam(teamId, teamName, teamTag, teamColor) {
  const group = document.getElementById('cfg-team-group')?.value || S.groups[0]?.name || '';
  if (!group) { showToast('Crie um grupo primeiro!','err'); return; }
  const team = { id: teamId, name: teamName, tag: teamTag, color: teamColor, group };
  if (S.teams.some(t => t.id === teamId)) { showToast('Time já adicionado','err'); return; }
  S.teams.push(team);
  S.matches.filter(m => m.group === group && m.status === 'upcoming').forEach(m => {
    if (!m.teamIds.includes(team.id)) m.teamIds.push(team.id);
  });
  save(); renderAll();
  showToast(`${teamName} adicionado!`, 'ok');
  loadRegistrationsPanel();
}

// ── ADMIN: load any championship from API ─────────────────────────────────────
async function initAdminChampLoader() {
  const me = JSON.parse(localStorage.getItem('wzc_user') || '{}');
  if (me.role !== 'admin') return;
  const wrap = document.getElementById('admin-load-champ-wrap');
  if (wrap) wrap.style.display = 'block';

  try {
    const resp = await fetch('/api/championships');
    const champs = resp.ok ? await resp.json() : [];
    const sel = document.getElementById('admin-champ-select');
    if (!sel) return;
    if (!champs.length) { sel.innerHTML = '<option value="">Nenhum campeonato cadastrado</option>'; return; }
    sel.innerHTML = champs.map(c => `<option value="${c.id}">${c.name} — ${c.season||''}</option>`).join('');
    const btn = document.getElementById('btn-load-existing-champ');
    if (btn) btn.onclick = async () => {
      const id = sel.value;
      if (!id) return;
      const chosen = champs.find(c => c.id === id);
      if (!chosen) return;
      // Load into S (merge with current blank)
      S = blank();
      S.name = chosen.name; S.season = chosen.season || ''; S.prize = chosen.prize || '';
      S.mode = chosen.mode || 'resurgence'; S.scheduledAt = chosen.scheduledAt || '';
      S.description = chosen.description || ''; S.registrationsOpen = chosen.registrationsOpen;
      S.liveUrl = chosen.liveUrl || ''; S.isLive = chosen.isLive || false;
      S.apiId = chosen.id;
      save(); renderAll();
      document.getElementById('empty-screen').style.display = 'none';
      document.getElementById('champ-view').style.display = 'block';
      showToast(`Campeonato "${chosen.name}" carregado!`, 'ok');
    };
  } catch(e) { console.warn('Admin loader:', e.message); }
}
// Sync current championship to API (so home.html shows it to all users)
async function syncChampToAPI() {
  try {
    const token = localStorage.getItem('wzc_token');
    if (!token) return; // not logged in
    const payload = {
      name: S.name, mode: S.mode, season: S.season, prize: S.prize,
      scheduledAt: S.scheduledAt || null, description: S.description || '',
      registrationsOpen: S.registrationsOpen !== false,
      entryFee: S.entryFee || 0, liveUrl: S.liveUrl || '',
    };
    let resp, data;
    if (S.apiId) {
      // Update existing
      resp = await fetch(`/api/championships/${S.apiId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      // Create new
      resp = await fetch('/api/championships', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (resp && resp.ok) {
      data = await resp.json();
      if (!S.apiId && data.id) { S.apiId = data.id; save(); }
      console.log('[API] Championship synced:', data.id);
    }
  } catch(e) { console.warn('[API] Sync failed:', e.message); }
}
function renderSetup(){
  document.getElementById('cfg-tournament-name').value=S.name||'';
  document.getElementById('cfg-season').value=S.season||'';
  document.getElementById('cfg-phase').value=S.phase||'';
  document.getElementById('cfg-prize').value=S.prize||'';
  document.getElementById('cfg-mode').value=S.mode||'resurgence';
  document.getElementById('cfg-rounds').value=S.rounds||4;
  const schedEl=document.getElementById('cfg-scheduled-at');
  if(schedEl) {
    // datetime-local requires YYYY-MM-DDTHH:mm format
    const raw = S.scheduledAt || '';
    if(raw) {
      try {
        const d = new Date(raw);
        if(!isNaN(d)) {
          const local = new Date(d.getTime() - d.getTimezoneOffset()*60000);
          schedEl.value = local.toISOString().slice(0,16);
        } else schedEl.value = '';
      } catch { schedEl.value = ''; }
    } else schedEl.value = '';
  }
  const descEl=document.getElementById('cfg-description');
  if(descEl) descEl.value=S.description||'';
  // registrations open toggle
  const regOpenEl = document.getElementById('cfg-registrations-open');
  if(regOpenEl) regOpenEl.checked = S.registrationsOpen !== false;
  // live url
  const liveInput=document.getElementById('cfg-live-url');
  if(liveInput) liveInput.value=S.liveUrl||'';
  // groups
  const gl=document.getElementById('groups-manage-list');
  gl.innerHTML=S.groups.length?S.groups.map(g=>`<div class="manage-item">
    <div class="manage-item-info">GRUPO ${g.name} <span class="manage-item-sub">${S.teams.filter(t=>t.group===g.name).length} TIMES</span></div>
    <button class="btn-remove" onclick="removeGroup('${g.name}')">REMOVER</button></div>`).join('')
    :'<div style="color:var(--text-3);font-family:var(--font-cond);font-size:13px;letter-spacing:1px">Nenhum grupo criado</div>';
  // team select in setup
  const tgSel=document.getElementById('cfg-team-group');
  tgSel.innerHTML=S.groups.map(g=>`<option value="${g.name}">Grupo ${g.name}</option>`).join('');
  // teams list
  const tl=document.getElementById('teams-manage-list');
  tl.innerHTML=S.teams.length?S.teams.map(t=>`<div class="manage-item">
    <div class="manage-item-info">
      <div style="width:12px;height:12px;border-radius:50%;background:${t.color};flex-shrink:0"></div>
      <span>${t.name}</span><span class="manage-item-sub">${t.tag} — GRP ${t.group}</span></div>
    <button class="btn-remove" onclick="removeTeam('${t.id}')">REMOVER</button></div>`).join('')
    :'<div style="color:var(--text-3);font-family:var(--font-cond);font-size:13px;letter-spacing:1px">Nenhum time criado</div>';
  // round filter
  const rf=document.getElementById('match-round-filter');
  rf.innerHTML='<option value="all">Todas as Rodadas</option>'+
    [...Array(S.rounds)].map((_,i)=>`<option value="${i+1}">Rodada ${i+1}</option>`).join('');
  // admin team select
  const at=document.getElementById('admin-team');
  at.innerHTML=S.teams.map(t=>`<option value="${t.id}">${t.name} (${t.tag}) — Grp ${t.group}</option>`).join('');
  // admin round select
  const ar=document.getElementById('admin-round');
  ar.innerHTML=[...Array(S.rounds)].map((_,i)=>`<option value="${i+1}">Rodada ${i+1}</option>`).join('');
  // standings group filter
  const sgf=document.getElementById('standings-group-filter');
  sgf.innerHTML='<option value="all">Todos os Grupos</option>'+S.groups.map(g=>`<option value="${g.name}">Grupo ${g.name}</option>`).join('');
  // map picker
  renderMapPicker();
}

// ── RENDER MAP PICKER ──
function renderMapPicker(){
  const picker=document.getElementById('map-picker');
  if(!picker)return;
  const maps=getMapsForMode(S.mode);
  const current=document.getElementById('admin-map')?.value||maps[0]?.id||'';
  if(!document.getElementById('admin-map').value) document.getElementById('admin-map').value=maps[0]?.id||'';
  picker.innerHTML=maps.map(m=>`
    <div class="map-option ${m.id===current?'selected':''}" onclick="selectMap('${m.id}')">
      <img src="${m.img}" alt="${m.name}" onerror="this.style.display='none'"/>
      <div class="map-option-check">✓</div>
      <div class="map-option-info">
        <div class="map-option-name">${m.name}</div>
        <div class="map-option-desc">${m.desc}</div>
      </div>
    </div>`).join('');
}
window.selectMap=function(id){
  document.getElementById('admin-map').value=id;
  document.querySelectorAll('.map-option').forEach(el=>el.classList.toggle('selected',el.onclick.toString().includes(`'${id}'`)));
  renderMapPicker();
};

// ── RENDER HERO ──
function renderHero(){
  document.getElementById('hero-tournament-name').textContent=S.name||'WZ CHAMPIONSHIP';
  document.getElementById('logo-tournament-name').textContent=(S.name||'WARZONE').toUpperCase();
  document.getElementById('footer-name').textContent=(S.name||'WZ CHAMPIONSHIP').toUpperCase();
  document.getElementById('hero-season-label').textContent=S.season||'';
  document.getElementById('hero-phase-label').textContent=S.phase||'';
  document.getElementById('hero-prize').textContent=S.prize||'';
  document.getElementById('hero-teams-count').textContent=S.teams.length;
  document.getElementById('hero-matches-count').textContent=S.matches.length;
  document.getElementById('hero-mode-label').textContent=S.mode==='resurgence'?'RESSURG.':'BATTLE R.';
  // mode buttons
  document.querySelectorAll('.mode-btn').forEach(b=>{
    b.classList.toggle('active',b.dataset.mode===S.mode||b.dataset.ptsMode===S.mode);
  });
  // live badge link
  const badge=document.getElementById('live-badge');
  const floatEl=document.getElementById('live-float');
  const floatLink=document.getElementById('live-float-link');
  const url=S.liveUrl||'';
  if(badge){
    badge.style.display=S.isLive?'inline-flex':'none';
    if(url && S.isLive){
      badge.href=url;
      badge.style.pointerEvents='auto';
    } else {
      badge.href='#';
      badge.style.pointerEvents='none';
    }
  }
  // floating button
  if(floatEl && floatLink){
    if(S.isLive && url){
      floatEl.style.display='block';
      floatEl.classList.add('visible');
      floatLink.href=url;
    } else {
      floatEl.style.display='none';
      floatEl.classList.remove('visible');
    }
  }
}

// ── REMOVE ──
window.removeGroup=function(name){
  if(S.teams.find(t=>t.group===name)){if(!confirm(`O grupo ${name} tem times. Remover mesmo assim?`))return;}
  S.groups=S.groups.filter(g=>g.name!==name);
  S.teams=S.teams.filter(t=>t.group!==name);
  S.matches=S.matches.filter(m=>m.group!==name);
  save();renderAll();showToast(`Grupo ${name} removido`,'err');
};
window.removeTeam=function(id){
  const t=S.teams.find(t=>t.id===id);
  S.teams=S.teams.filter(t=>t.id!==id);
  S.matches.forEach(m=>{m.teamIds=m.teamIds.filter(i=>i!==id);m.results=m.results.filter(r=>r.teamId!==id);});
  save();renderAll();showToast(`Time ${t?.name||''} removido`,'err');
};

// ── SETUP EVENTS ──
function setupEvents(){
  // save info
  document.getElementById('btn-save-info').onclick=()=>{
    S.name=document.getElementById('cfg-tournament-name').value.trim()||S.name;
    S.season=document.getElementById('cfg-season').value.trim();
    S.phase=document.getElementById('cfg-phase').value.trim();
    S.prize=document.getElementById('cfg-prize').value.trim();
    S.mode=document.getElementById('cfg-mode').value;
    S.rounds=parseInt(document.getElementById('cfg-rounds').value)||4;
    S.scheduledAt=document.getElementById('cfg-scheduled-at').value||'';
    S.description=document.getElementById('cfg-description').value.trim()||'';
    const regOpenEl = document.getElementById('cfg-registrations-open');
    if(regOpenEl) S.registrationsOpen = regOpenEl.checked;
    const feeEl = document.getElementById('cfg-entry-fee');
    if(feeEl) S.entryFee = Math.round((parseFloat(feeEl.value)||0)*100);
    save();renderAll();
    syncChampToAPI();
    document.getElementById('info-feedback').textContent='✓ Salvo!';
    document.getElementById('info-feedback').className='admin-feedback ok';
    showToast('Informações salvas!','ok');
  };
  // add group
  document.getElementById('btn-add-group').onclick=()=>{
    const n=document.getElementById('cfg-group-name').value.trim().toUpperCase();
    if(!n)return;
    if(S.groups.find(g=>g.name===n)){showToast('Grupo já existe!','err');return;}
    S.groups.push({name:n});
    // create matches for this group
    for(let r=1;r<=S.rounds;r++){
      S.matches.push({id:`m${Date.now()}_${r}`,round:r,group:n,map:'',status:'upcoming',time:'',teamIds:[],results:[]});
    }
    document.getElementById('cfg-group-name').value='';
    save();renderAll();showToast(`Grupo ${n} criado!`,'ok');
  };
  // load registrations panel
  const regBtn = document.getElementById('btn-load-registrations');
  if(regBtn) { regBtn.onclick = loadRegistrationsPanel; loadRegistrationsPanel(); }
  // add team
  document.getElementById('btn-cfg-add-team').onclick=()=>{
    const name=document.getElementById('cfg-team-name').value.trim();
    const tag=document.getElementById('cfg-team-tag').value.trim().toUpperCase();
    const group=document.getElementById('cfg-team-group').value;
    const color=document.getElementById('cfg-team-color').value;
    const fb=document.getElementById('cfg-team-feedback');
    if(!name||!tag||!group){fb.textContent='Preencha nome, tag e grupo!';fb.className='admin-feedback err';return;}
    const team={id:`t${Date.now()}`,name,tag,group,color};
    S.teams.push(team);
    S.matches.filter(m=>m.group===group&&m.status==='upcoming').forEach(m=>{if(!m.teamIds.includes(team.id))m.teamIds.push(team.id);});
    document.getElementById('cfg-team-name').value='';
    document.getElementById('cfg-team-tag').value='';
    save();renderAll();
    fb.textContent=`✓ ${name} adicionado ao Grupo ${group}`;fb.className='admin-feedback ok';
    showToast('Time adicionado!','ok');
  };
  // register result
  document.getElementById('btn-add-result').onclick=()=>{
    const teamId=document.getElementById('admin-team').value;
    const round=parseInt(document.getElementById('admin-round').value);
    const placement=parseInt(document.getElementById('admin-placement').value);
    const kills=parseInt(document.getElementById('admin-kills').value);
    const fb=document.getElementById('result-feedback');
    if(!teamId||isNaN(placement)||isNaN(kills)||placement<1||placement>20){fb.textContent='Preencha todos os campos!';fb.className='admin-feedback err';return;}
    const team=S.teams.find(t=>t.id===teamId);
    const match=S.matches.find(m=>m.round===round&&m.group===team.group);
    if(!match){fb.textContent='Partida não encontrada!';fb.className='admin-feedback err';return;}
    const idx=match.results.findIndex(r=>r.teamId===teamId);
    const res={teamId,placement,kills};
    if(idx>=0)match.results[idx]=res;else match.results.push(res);
    match.status=match.teamIds.every(id=>match.results.find(r=>r.teamId===id))?'done':'live';
    // recent results
    const rec=document.getElementById('recent-results');
    const pts=getPoints(placement)+kills*KILL_PT;
    rec.innerHTML=`<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle)">${team.name} — #${placement} — ${kills} kills — <span style="color:var(--orange)">${pts} pts</span></div>`+rec.innerHTML;
    save();renderAll();
    fb.textContent=`✓ ${team.name}: #${placement}, ${kills} kills, ${pts} pts`;fb.className='admin-feedback ok';
    document.getElementById('admin-placement').value='';document.getElementById('admin-kills').value='';
    showToast('Resultado registrado!','ok');
  };
  // mode toggle (hero)
  document.querySelectorAll('[data-mode]').forEach(btn=>{
    btn.onclick=()=>{S.mode=btn.dataset.mode;save();renderAll();showToast(S.mode==='resurgence'?'Modo: Ressurgência':'Modo: Battle Royale','ok');};
  });
  // pts mode toggle
  document.querySelectorAll('[data-pts-mode]').forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll('[data-pts-mode]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderPontos(btn.dataset.ptsMode);
    };
  });
  // toggle live
  document.getElementById('btn-toggle-live').onclick=()=>{
    S.isLive=!S.isLive;save();renderHero();showToast(S.isLive?'Status: AO VIVO':'Status: OFFLINE',S.isLive?'ok':'');
  };
  // save live url
  document.getElementById('btn-save-live-url').onclick=()=>{
    const inp=document.getElementById('cfg-live-url');
    const fb=document.getElementById('live-url-feedback');
    const url=inp.value.trim();
    if(url && !url.startsWith('http')){
      fb.textContent='URL inválida! Comece com https://';fb.className='admin-feedback err';return;
    }
    S.liveUrl=url;
    save();renderHero();
    if(url){
      fb.textContent='✓ Link salvo! Botão AO VIVO ativado.';fb.className='admin-feedback ok';
      showToast('Link da live salvo!','ok');
    } else {
      fb.textContent='✓ Link removido.';fb.className='admin-feedback ok';
      showToast('Link da live removido.','');
    }
    setTimeout(()=>fb.textContent='',4000);
  };
  // enter key on live url input
  document.getElementById('cfg-live-url').addEventListener('keydown',e=>{
    if(e.key==='Enter') document.getElementById('btn-save-live-url').click();
  });
  // export
  document.getElementById('btn-export-json').onclick=()=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));
    a.download=`wz-${Date.now()}.json`;a.click();showToast('JSON exportado!','ok');
  };
  // import
  document.getElementById('btn-import-json').onclick=()=>document.getElementById('import-file-input').click();
  document.getElementById('import-file-input').onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{try{S=JSON.parse(ev.target.result);save();renderAll();showToast('Importado!','ok');}catch{showToast('JSON inválido!','err');}};
    r.readAsText(f);
  };
  // reset
  document.getElementById('btn-reset-all').onclick=()=>{
    const op = confirm('RESETAR TUDO (OK) ou apenas LIMPAR RESULTADOS (Cancelar)?');
    if(op===null) return;
    if(op){
      // resetar tudo
      if(!confirm('Isso apaga grupos, times e resultados. Confirmar?')) return;
      hardReset(false);
      showToast('Torneio zerado!','err');
    } else {
      // limpar só resultados
      if(!confirm('Limpar apenas os resultados? Times e grupos ficam.')) return;
      S.matches.forEach(m=>{m.results=[];m.status='upcoming';});
      save();renderAll();
      showToast('Resultados limpos!','ok');
    }
  };
  // tabs (sub-nav)
  document.querySelectorAll('.sub-link').forEach(link=>{
    link.onclick=e=>{
      e.preventDefault();const tab=link.dataset.sub;
      document.querySelectorAll('.sub-link').forEach(l=>l.classList.remove('active'));
      document.querySelectorAll('.sub-panel').forEach(p=>p.classList.remove('active'));
      link.classList.add('active');
      const panel=document.getElementById(`sub-${tab}`);
      if(panel) panel.classList.add('active');
      if(tab==='bracket') renderBracket();
      if(tab==='setup') { renderSetup(); initMapRotationConfigurator(); }
      if(tab==='standings') renderStandings();
      if(tab==='groups') renderGroups();
      if(tab==='matches') renderMatches();
      if(tab==='pontos') renderPontos(S.mode);
      if(tab==='ia') populateIaRound();
      if(tab==='mvp') renderMVP();
      if(tab==='admin') renderDropControl();
    };
  });
  // multi-champ: NOVO + modal
  ['btn-new-champ','btn-create-first'].forEach(id=>{
    const b=document.getElementById(id);
    if(b) b.onclick=()=>{
      document.getElementById('modal-backdrop').style.display='flex';
      setTimeout(()=>document.getElementById('new-champ-name')?.focus(),100);
    };
  });
  ['modal-close','modal-cancel'].forEach(id=>{
    const b=document.getElementById(id);
    if(b) b.onclick=()=>document.getElementById('modal-backdrop').style.display='none';
  });
  const modalConfirm=document.getElementById('modal-confirm');
  if(modalConfirm) modalConfirm.onclick=()=>{
    const n=document.getElementById('new-champ-name').value.trim();
    if(!n){showToast('Insira um nome!','err');return;}
    S.name=n;
    S.season=document.getElementById('new-champ-season').value.trim()||'Season 1';
    S.mode=document.getElementById('new-champ-mode').value;
    S.prize=document.getElementById('new-champ-prize').value.trim();
    S.liveUrl=S.liveUrl||'';
    document.getElementById('modal-backdrop').style.display='none';
    document.getElementById('empty-screen').style.display='none';
    document.getElementById('champ-view').style.display='block';
    save();renderAll();
    showToast(`Campeonato "${n}" criado!`,'ok');
  };
  // delete champ
  const delBtn=document.getElementById('btn-delete-champ');
  if(delBtn) delBtn.onclick=()=>{
    if(!confirm('Excluir este campeonato?'))return;
    // Also delete from API
    if(S.apiId){const tk=localStorage.getItem('wzc_token');fetch('/api/championships/'+S.apiId,{method:'DELETE',headers:{Authorization:'Bearer '+tk}}).catch(()=>{});}
    hardReset(false);
    document.getElementById('champ-view').style.display='none';
    document.getElementById('empty-screen').style.display='flex';
    showToast('Campeonato excluído','err');
  };
  // init visibility
  const hasData=S.name&&S.name!=='WZ Championship'||S.teams.length>0||S.groups.length>0;
  if(hasData){
    document.getElementById('empty-screen').style.display='none';
    document.getElementById('champ-view').style.display='block';
  } else {
    document.getElementById('champ-view').style.display='none';
    document.getElementById('empty-screen').style.display='flex';
  }
  // filters
  document.getElementById('standings-group-filter').onchange=renderStandings;
  document.getElementById('match-round-filter').onchange=renderMatches;
  document.getElementById('match-status-filter').onchange=renderMatches;
}

// ── TOAST ──
function showToast(msg,type=''){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className=`toast ${type} show`;
  setTimeout(()=>t.classList.remove('show'),3000);
}

// ── COPY OVERLAY LINK ──
window.copyOverlayLink=function(){
  const url=`${location.origin}/overlay.html`;
  navigator.clipboard.writeText(url).then(()=>showToast('Link do overlay copiado! Cole no OBS Browser Source.','ok'))
    .catch(()=>{
      const full=location.href.replace(/[^/]*$/,'overlay');
      navigator.clipboard.writeText(full);
      showToast('Link copiado! Use como Browser Source no OBS.','ok');
    });
};

// ── DROP CONTROL SYSTEM ──
// Sincroniza com overlay-maps.html via localStorage 'wzc_drop_index'
const LS_DROP = 'wzc_drop_index';

// Mapas separados por modo — igual ao overlay-maps.html
const ALL_DROP_MAPS = {
  resurgence: [
    { id:'rebirth',   name:'Rebirth Island',   mode:'RESSURGÊNCIA' },
    { id:'haven',     name:"Haven's Hollow",    mode:'RESSURGÊNCIA' },
    { id:'reb2',      name:'Rebirth Praia',     mode:'RESSURGÊNCIA' },
    { id:'hav2',      name:"Haven's Vale",      mode:'RESSURGÊNCIA' },
    { id:'reb3',      name:'Rebirth Topo',      mode:'RESSURGÊNCIA' },
    { id:'reb4',      name:'Rebirth Centro',    mode:'RESSURGÊNCIA' },
    { id:'hav3',      name:"Haven's Ruínas",    mode:'RESSURGÊNCIA' },
    { id:'reb5',      name:'Rebirth Arsenal',   mode:'RESSURGÊNCIA' },
    { id:'hav4',      name:"Haven's Cume",      mode:'RESSURGÊNCIA' },
    { id:'reb6',      name:'Rebirth Doca',      mode:'RESSURGÊNCIA' },
  ],
  br: [
    { id:'verdansk',  name:'Verdansk',          mode:'BATTLE ROYALE' },
    { id:'avalon',    name:'Avalon',            mode:'BATTLE ROYALE' },
    { id:'verd2',     name:'Verdansk Norte',    mode:'BATTLE ROYALE' },
    { id:'avl2',      name:'Avalon Centro',     mode:'BATTLE ROYALE' },
    { id:'verd3',     name:'Verdansk Sul',      mode:'BATTLE ROYALE' },
    { id:'verd4',     name:'Verdansk Leste',    mode:'BATTLE ROYALE' },
    { id:'avl3',      name:'Avalon Litoral',    mode:'BATTLE ROYALE' },
    { id:'verd5',     name:'Verdansk Estação', mode:'BATTLE ROYALE' },
    { id:'avl4',      name:'Avalon Industrial', mode:'BATTLE ROYALE' },
    { id:'verd6',     name:'Verdansk Aeroporto',mode:'BATTLE ROYALE' },
  ],
};

// Retorna os mapas do modo atual do campeonato
const LS_MAP_ROT = 'wzc_map_rotation';

// Returns the active map rotation for the current mode
// Priority: custom saved rotation → default ALL_DROP_MAPS
function getDropMaps(){
  try {
    const saved = JSON.parse(localStorage.getItem(LS_MAP_ROT)||'{}');
    const mode  = S.mode || 'resurgence';
    if(saved[mode] && saved[mode].length > 0) return saved[mode];
  } catch {}
  return ALL_DROP_MAPS[S.mode] || ALL_DROP_MAPS.resurgence;
}
function getDropIdx(){
  const maps = getDropMaps();
  return Math.max(0, Math.min(parseInt(localStorage.getItem(LS_DROP)||'0'), maps.length-1));
}
function setDropIdx(i){
  const maps = getDropMaps();
  localStorage.setItem(LS_DROP, Math.max(0, Math.min(i, maps.length-1)));
  renderDropControl();
}

function renderDropControl(){
  const maps  = getDropMaps();
  const idx   = getDropIdx();
  const map   = maps[idx];
  const next  = maps[idx+1] || null;
  const total = maps.length;

  const numEl = document.getElementById('drop-current-num');
  const totEl = document.getElementById('drop-total-label');
  const nmEl  = document.getElementById('drop-map-name');
  const mdEl  = document.getElementById('drop-map-mode');
  const nxEl  = document.getElementById('drop-next-name');
  const trk   = document.getElementById('drop-dot-track');
  const btn   = document.getElementById('btn-drop-next');

  if(!numEl) return;

  numEl.textContent = String(idx+1).padStart(2,'0');
  totEl.textContent = `/ ${total}`;
  nmEl.textContent  = map.name;
  mdEl.textContent  = `${S.mode==='br'?'💀':'🔄'} ${map.mode}`;
  nxEl.textContent  = next ? next.name : '— FIM —';

  // Dot track
  if(trk){
    trk.innerHTML = maps.map((_,i)=>{
      const done   = i < idx;
      const active = i === idx;
      return `<div style="flex:1;height:4px;border-radius:2px;background:${active?'var(--orange)':done?'rgba(0,255,135,.4)':'rgba(255,255,255,.1)'};transition:all .3s"></div>`;
    }).join('');
  }

  // Button
  if(btn){
    const isLast = idx >= total-1;
    btn.textContent = isLast ? '✓ ÚLTIMA QUEDA' : `▶ CONFIRMAR QUEDA ${String(idx+2).padStart(2,'0')}`;
    btn.disabled = isLast;
    btn.style.opacity = isLast ? '.5' : '1';
  }
}

function setupDropEvents(){
  // Próxima queda
  document.getElementById('btn-drop-next')?.addEventListener('click', ()=>{
    const maps = getDropMaps();
    const cur  = getDropIdx();
    if(cur >= maps.length-1){ showToast('Última queda!',''); return; }
    setDropIdx(cur+1);
    const fb  = document.getElementById('drop-feedback');
    const map = getDropMaps()[getDropIdx()];
    fb.textContent = `✓ Overlay → QUEDA ${String(getDropIdx()+1).padStart(2,'0')} — ${map.name}`;
    fb.className = 'admin-feedback ok';
    showToast(`🗺 QUEDA ${String(getDropIdx()+1).padStart(2,'0')}: ${map.name}`,'ok');
    setTimeout(()=>{ fb.textContent=''; fb.className='admin-feedback'; }, 4000);
  });

  // Queda anterior
  document.getElementById('btn-drop-prev')?.addEventListener('click', ()=>{
    const cur = getDropIdx();
    if(cur <= 0){ showToast('Já está na primeira queda!',''); return; }
    setDropIdx(cur-1);
    const map = getDropMaps()[getDropIdx()];
    showToast(`◀ Voltou → QUEDA ${String(getDropIdx()+1).padStart(2,'0')}: ${map.name}`,'');
  });

  // Reset
  document.getElementById('btn-drop-reset')?.addEventListener('click', ()=>{
    if(!confirm('Resetar para a QUEDA 01?')) return;
    setDropIdx(0);
    const fb = document.getElementById('drop-feedback');
    fb.textContent = '↺ Resetado para Queda 01';
    fb.className = 'admin-feedback ok';
    showToast('Overlay resetado para Queda 01','ok');
    setTimeout(()=>{ fb.textContent=''; fb.className='admin-feedback'; }, 3000);
  });

  // Também re-renderiza quando o modo muda (cliques nos botões de modo)
  document.querySelectorAll('[data-mode]').forEach(btn=>{
    btn.addEventListener('click', ()=> setTimeout(renderDropControl, 50));
  });

  // Init display
  renderDropControl();
}

// ── RENDER MVP ──
function renderMVP(){
  const wrap = document.getElementById('mvp-body');
  if (!wrap) return;

  // Build per-team aggregated stats from match results
  // Since we store results by team (not per player), we show team stats
  // but display team members from the team color/logo as a visual leaderboard
  const teamStats = S.teams.map(t => {
    let kills=0, pts=0, played=0, wins=0, top3=0;
    S.matches.filter(m=>m.status==='done').forEach(m=>{
      const r=m.results.find(r=>r.teamId===t.id);
      if(!r)return;
      played++; kills+=r.kills;
      pts+=getPoints(r.placement)+r.kills*KILL_PT;
      if(r.placement===1)wins++;
      if(r.placement<=3)top3++;
    });
    const kpg = played ? (kills/played).toFixed(1) : '0.0';
    return {...t, kills, pts, played, wins, top3, kpg};
  }).sort((a,b)=>b.kills-a.kills||b.pts-a.pts);

  if (!teamStats.length) {
    wrap.innerHTML='<div style="padding:60px;text-align:center;color:var(--text-3);font-family:var(--font-cond);font-size:14px;letter-spacing:2px">NENHUM TIME CADASTRADO</div>';
    return;
  }

  const max = teamStats[0].kills || 1;
  const medals = ['🥇','🥈','🥉'];

  // Header
  let html = `<div style="display:grid;grid-template-columns:40px 1fr 80px 80px 80px 80px 100px;gap:0;padding:10px 20px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.06)">
    <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);text-align:center">#</div>
    <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3)">TIME</div>
    <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);text-align:center">KILLS</div>
    <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);text-align:center">K/P</div>
    <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);text-align:center">VITÓRIAS</div>
    <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);text-align:center">TOP 3</div>
    <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);text-align:center">KILLS BAR</div>
  </div>`;

  teamStats.forEach((t, i) => {
    const pos = i+1;
    const isTop3 = pos<=3;
    const medal = medals[i]||'';
    const barW = max>0 ? Math.round((t.kills/max)*100) : 0;
    const barColor = pos===1?'#ffd700':pos===2?'#c0c0c0':pos===3?'#cd7f32':t.color||'var(--orange)';
    const rowBg = pos===1?'rgba(255,215,0,.04)':pos<=3?'rgba(255,106,0,.03)':'transparent';
    const rowBorder = pos===1?'rgba(255,215,0,.15)':pos<=3?'rgba(255,106,0,.1)':'rgba(255,255,255,.04)';
    const posColor = pos===1?'#ffd700':pos===2?'#c0c0c0':pos===3?'#cd7f32':'var(--text-3)';

    html += `<div style="display:grid;grid-template-columns:40px 1fr 80px 80px 80px 80px 100px;gap:0;align-items:center;padding:14px 20px;background:${rowBg};border-bottom:1px solid ${rowBorder};transition:.2s" onmouseover="this.style.background='rgba(255,106,0,.05)'" onmouseout="this.style.background='${rowBg}'">
      <div style="font-family:var(--font-cond);font-size:${isTop3?'20px':'14px'};font-weight:900;color:${posColor};text-align:center">${medal||pos}</div>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:12px;font-weight:900;background:${t.color||'#ff6a00'};flex-shrink:0;color:#fff;overflow:hidden;border:2px solid rgba(255,255,255,.1)">${t.logo?`<img src="${t.logo}" style="width:100%;height:100%;object-fit:cover"/>`:t.tag.slice(0,2)}</div>
        <div>
          <div style="font-family:var(--font-cond);font-size:15px;font-weight:900;letter-spacing:1px">${t.name}</div>
          <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--orange)">[${t.tag}] · GRP ${t.group}</div>
        </div>
      </div>
      <div style="text-align:center">
        <div style="font-family:var(--font-cond);font-size:22px;font-weight:900;color:${pos===1?'#ffd700':'var(--text-1)'}">${t.kills}</div>
        <div style="font-family:var(--font-cond);font-size:9px;letter-spacing:1px;color:var(--text-3)">kills</div>
      </div>
      <div style="font-family:var(--font-cond);font-size:16px;font-weight:700;color:var(--text-2);text-align:center">${t.kpg}</div>
      <div style="font-family:var(--font-cond);font-size:16px;font-weight:700;color:var(--green);text-align:center">${t.wins}</div>
      <div style="font-family:var(--font-cond);font-size:16px;font-weight:700;color:var(--text-2);text-align:center">${t.top3}</div>
      <div style="padding:0 4px">
        <div style="height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${barW}%;background:${barColor};border-radius:3px;transition:width .6s ease"></div>
        </div>
        <div style="font-family:var(--font-cond);font-size:9px;letter-spacing:1px;color:var(--text-3);text-align:right;margin-top:3px">${barW}%</div>
      </div>
    </div>`;
  });

  // MVP highlight card
  if (teamStats.length > 0) {
    const mvp = teamStats[0];
    const mvpHtml = `<div style="margin:20px 0 0 0;padding:20px;background:linear-gradient(135deg,rgba(255,215,0,.08),rgba(255,106,0,.05));border:1px solid rgba(255,215,0,.2);border-radius:10px;display:flex;align-items:center;gap:20px">
      <div style="font-size:48px">🏆</div>
      <div style="flex:1">
        <div style="font-family:var(--font-cond);font-size:11px;letter-spacing:4px;color:var(--gold);margin-bottom:4px">MVP DO TORNEIO</div>
        <div style="font-family:var(--font-cond);font-size:28px;font-weight:900;letter-spacing:1px;color:#fff">${mvp.name}</div>
        <div style="font-family:var(--font-cond);font-size:12px;letter-spacing:2px;color:var(--text-3);margin-top:4px">[${mvp.tag}] · ${mvp.kills} kills no total · ${mvp.kpg} kills/jogo · ${mvp.wins} vitórias</div>
      </div>
      <div style="text-align:center;padding:16px 24px;background:rgba(255,215,0,.1);border-radius:8px;border:1px solid rgba(255,215,0,.2)">
        <div style="font-family:var(--font-cond);font-size:42px;font-weight:900;color:var(--gold)">${mvp.kills}</div>
        <div style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3)">TOTAL KILLS</div>
      </div>
    </div>`;
    html = mvpHtml + html;
  }

  wrap.innerHTML = html;
}

// ── RENDER ALL ──
function renderAll(){
  // Auto-load champ selected from tournaments.html
(async()=>{
  const loadId = localStorage.getItem('wzc_admin_load_champ');
  if(loadId){
    localStorage.removeItem('wzc_admin_load_champ');
    try{
      const resp=await fetch('/api/championships');
      const champs=resp.ok?await resp.json():[];
      const chosen=champs.find(c=>c.id===loadId);
      if(chosen){
        S=blank();
        S.name=chosen.name;S.season=chosen.season||'';S.prize=chosen.prize||'';
        S.mode=chosen.mode||'resurgence';S.scheduledAt=chosen.scheduledAt||'';
        S.description=chosen.description||'';S.registrationsOpen=chosen.registrationsOpen;
        S.liveUrl=chosen.liveUrl||'';S.isLive=chosen.isLive||false;
        S.apiId=chosen.id;S.entryFee=chosen.entryFee||0;
        save();renderAll();
        document.getElementById('empty-screen').style.display='none';
        document.getElementById('champ-view').style.display='block';
        showToast('Campeonato carregado!','ok');
      }
    }catch(e){console.warn(e)}
  }
})();
renderHero();renderSetup();
initAdminChampLoader();
  renderStandings();renderGroups();renderMatches();
  renderPontos(S.mode);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded',()=>{setupEvents();setupDropEvents();renderAll();});

// ══════════════════════════════════════════════════
// MAP ROTATION CONFIGURATOR
// ══════════════════════════════════════════════════

// All available maps per mode (complete pool)
const MAP_POOL = {
  resurgence: [
    { id:'rebirth',   name:'Rebirth Island',    mode:'RESSURGÊNCIA', ac:'#00e676', desc:'A ilha da ressurgência' },
    { id:'haven',     name:"Haven's Hollow",     mode:'RESSURGÊNCIA', ac:'#29b6f6', desc:'Floresta densa e névoa' },
    { id:'reb2',      name:'Rebirth Praia',      mode:'RESSURGÊNCIA', ac:'#ffca28', desc:'Zona costeira quente' },
    { id:'hav2',      name:"Haven's Vale",       mode:'RESSURGÊNCIA', ac:'#ef5350', desc:'Vale estreito e perigoso' },
    { id:'reb3',      name:'Rebirth Topo',       mode:'RESSURGÊNCIA', ac:'#ab47bc', desc:'Alto terreno, vantagem total' },
    { id:'reb4',      name:'Rebirth Centro',     mode:'RESSURGÊNCIA', ac:'#26c6da', desc:'Centro da ilha, caos máximo' },
    { id:'hav3',      name:"Haven's Ruínas",     mode:'RESSURGÊNCIA', ac:'#ff7043', desc:'Ruínas antigas e cobertura' },
    { id:'reb5',      name:'Rebirth Arsenal',    mode:'RESSURGÊNCIA', ac:'#29b6f6', desc:'Arsenal abandonado' },
    { id:'hav4',      name:"Haven's Cume",       mode:'RESSURGÊNCIA', ac:'#8e24aa', desc:'Cume elevado' },
    { id:'reb6',      name:'Rebirth Doca',       mode:'RESSURGÊNCIA', ac:'#0d47a1', desc:'Zona portuária' },
    { id:'reb7',      name:'Rebirth Laboratório',mode:'RESSURGÊNCIA', ac:'#00acc1', desc:'Lab secreto — visibilidade baixa' },
    { id:'hav5',      name:"Haven's Planície",   mode:'RESSURGÊNCIA', ac:'#7cb342', desc:'Campo aberto — foco no longo alcance' },
  ],
  br: [
    { id:'verdansk',  name:'Verdansk',            mode:'BATTLE ROYALE', ac:'#4caf50', desc:'O mapa clássico' },
    { id:'avalon',    name:'Avalon',              mode:'BATTLE ROYALE', ac:'#ff9800', desc:'Novo território — Season 3 2026' },
    { id:'verd2',     name:'Verdansk Norte',      mode:'BATTLE ROYALE', ac:'#66bb6a', desc:'Zona norte — confronto final' },
    { id:'avl2',      name:'Avalon Centro',       mode:'BATTLE ROYALE', ac:'#ffa726', desc:'Zona urbana — batalha intensa' },
    { id:'verd3',     name:'Verdansk Sul',        mode:'BATTLE ROYALE', ac:'#81c784', desc:'Zona industrial — campo aberto' },
    { id:'verd4',     name:'Verdansk Leste',      mode:'BATTLE ROYALE', ac:'#a5d6a7', desc:'Periferia leste — edifícios altos' },
    { id:'avl3',      name:'Avalon Litoral',      mode:'BATTLE ROYALE', ac:'#ffb74d', desc:'Costa oceânica — terreno aberto' },
    { id:'verd5',     name:'Verdansk Estação',    mode:'BATTLE ROYALE', ac:'#c8e6c9', desc:'Terminal ferroviário' },
    { id:'avl4',      name:'Avalon Industrial',   mode:'BATTLE ROYALE', ac:'#ffe0b2', desc:'Zona industrial — fumaça e caos' },
    { id:'verd6',     name:'Verdansk Aeroporto',  mode:'BATTLE ROYALE', ac:'#e8f5e9', desc:'Pista aberta — zona hot drop' },
    { id:'verd7',     name:'Verdansk Bunkers',    mode:'BATTLE ROYALE', ac:'#b9f6ca', desc:'Bunkers subterrâneos' },
    { id:'avl5',      name:'Avalon Mercado',      mode:'BATTLE ROYALE', ac:'#ffd180', desc:'Mercado central — CQC intenso' },
  ],
};

let rotCurrentMode = 'resurgence'; // which mode tab is active in the configurator
let rotDragId      = null;          // id of map being dragged

// Load saved rotation or default
function loadSavedRotation(mode){
  try {
    const saved = JSON.parse(localStorage.getItem(LS_MAP_ROT)||'{}');
    if(saved[mode] && saved[mode].length) return saved[mode].map(m => ({...m}));
  } catch {}
  // Default: first 10 maps from pool
  return MAP_POOL[mode].slice(0,10).map(m=>({...m}));
}

// Save rotation for given mode
function persistRotation(mode, list){
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(LS_MAP_ROT)||'{}'); } catch {}
  saved[mode] = list;
  localStorage.setItem(LS_MAP_ROT, JSON.stringify(saved));
}

// ── Render pool (left column) ──
function renderMapPool(){
  const pool   = MAP_POOL[rotCurrentMode] || [];
  const active = loadSavedRotation(rotCurrentMode).map(m=>m.id);
  const el     = document.getElementById('map-pool-list');
  if(!el) return;
  el.innerHTML = pool.map(m => {
    const inRot = active.includes(m.id);
    return `<div style="
      display:flex;align-items:center;gap:10px;padding:8px 12px;
      background:rgba(255,255,255,.04);border-radius:6px;
      border:1px solid ${inRot?'rgba(0,255,135,.2)':'rgba(255,255,255,.06)'};
      font-family:var(--font-cond);font-size:13px;font-weight:700;
      letter-spacing:1px;color:${inRot?'var(--green)':'var(--text-1)'};
      opacity:${inRot?'.5':'1'};cursor:${inRot?'default':'pointer'};
      transition:all .2s
    " onclick="rotAddMap('${m.id}')" title="${inRot?'Já na rotação':'Adicionar à rotação'}">
      <span style="width:8px;height:8px;border-radius:50%;background:${m.ac};flex-shrink:0"></span>
      <span style="flex:1">${m.name}</span>
      <span style="font-size:10px;color:var(--text-3)">${inRot?'✓ ATIVO':'+'}  </span>
    </div>`;
  }).join('');
}

// ── Render rotation list (right column) ──
function renderRotationList(){
  const list = loadSavedRotation(rotCurrentMode);
  const el   = document.getElementById('map-rotation-list');
  const hint = document.getElementById('rot-empty-hint');
  const badge= document.getElementById('rot-count-badge');
  if(!el) return;

  badge.textContent = `(${list.length} queda${list.length!==1?'s':''})`;
  hint.style.display = list.length ? 'none' : 'block';

  // Remove old map rows (keep hint)
  el.querySelectorAll('.rot-map-row').forEach(r=>r.remove());

  list.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'rot-map-row';
    row.draggable = true;
    row.dataset.id = m.id;
    row.dataset.idx = i;
    row.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:8px 12px;
      background:rgba(255,255,255,.05);border-radius:6px;
      border:1px solid rgba(255,255,255,.08);
      cursor:grab;font-family:var(--font-cond);font-size:13px;font-weight:700;
      letter-spacing:1px;transition:all .2s;
    `;
    row.innerHTML = `
      <span style="font-size:11px;color:var(--text-3);min-width:24px">${String(i+1).padStart(2,'0')}</span>
      <span style="width:8px;height:8px;border-radius:50%;background:${m.ac};flex-shrink:0"></span>
      <span style="flex:1">${m.name}</span>
      <button onclick="rotMoveUp(${i})" style="background:none;border:none;color:var(--text-3);cursor:pointer;padding:2px 4px;font-size:14px" title="Mover para cima">↑</button>
      <button onclick="rotMoveDown(${i})" style="background:none;border:none;color:var(--text-3);cursor:pointer;padding:2px 4px;font-size:14px" title="Mover para baixo">↓</button>
      <button onclick="rotRemoveMap('${m.id}')" style="background:none;border:none;color:#ff4444;cursor:pointer;padding:2px 6px;font-size:14px" title="Remover">×</button>
    `;
    row.addEventListener('dragstart', e => { rotDragId = m.id; row.style.opacity='.4'; });
    row.addEventListener('dragend',   e => { rotDragId = null; row.style.opacity='1'; });
    row.addEventListener('dragover',  e => { e.preventDefault(); row.style.background='rgba(0,255,135,.08)'; });
    row.addEventListener('dragleave', e => { row.style.background='rgba(255,255,255,.05)'; });
    row.addEventListener('drop',      e => {
      e.preventDefault();
      row.style.background='rgba(255,255,255,.05)';
      if(!rotDragId || rotDragId===m.id) return;
      const list2 = loadSavedRotation(rotCurrentMode);
      const fromI = list2.findIndex(x=>x.id===rotDragId);
      const toI   = i;
      if(fromI<0) return;
      const [moved] = list2.splice(fromI, 1);
      list2.splice(toI, 0, moved);
      persistRotation(rotCurrentMode, list2);
      renderRotationList();
    });
    el.appendChild(row);
  });
}

// ── Actions ──
window.rotAddMap = function(mapId){
  const pool = MAP_POOL[rotCurrentMode] || [];
  const map  = pool.find(m=>m.id===mapId);
  if(!map) return;
  const list = loadSavedRotation(rotCurrentMode);
  if(list.find(m=>m.id===mapId)) return;
  list.push({...map});
  persistRotation(rotCurrentMode, list);
  renderMapPool();
  renderRotationList();
};

window.rotRemoveMap = function(mapId){
  const list = loadSavedRotation(rotCurrentMode).filter(m=>m.id!==mapId);
  persistRotation(rotCurrentMode, list);
  renderMapPool();
  renderRotationList();
};

window.rotMoveUp = function(i){
  const list = loadSavedRotation(rotCurrentMode);
  if(i<=0) return;
  [list[i-1],list[i]] = [list[i],list[i-1]];
  persistRotation(rotCurrentMode, list);
  renderRotationList();
};

window.rotMoveDown = function(i){
  const list = loadSavedRotation(rotCurrentMode);
  if(i>=list.length-1) return;
  [list[i+1],list[i]] = [list[i],list[i+1]];
  persistRotation(rotCurrentMode, list);
  renderRotationList();
};

window.rotDropOnList = function(e){
  e.preventDefault();
  if(!rotDragId) return;
  const list = loadSavedRotation(rotCurrentMode);
  if(list.find(m=>m.id===rotDragId)) return;
  const pool = MAP_POOL[rotCurrentMode]||[];
  const map  = pool.find(m=>m.id===rotDragId);
  if(!map) return;
  list.push({...map});
  persistRotation(rotCurrentMode, list);
  renderMapPool();
  renderRotationList();
};

window.switchRotTab = function(mode){
  rotCurrentMode = mode;
  document.getElementById('rot-tab-resurgence').classList.toggle('active', mode==='resurgence');
  document.getElementById('rot-tab-br').classList.toggle('active', mode==='br');
  renderMapPool();
  renderRotationList();
};

window.saveMapRotation = function(){
  const list = loadSavedRotation(rotCurrentMode);
  if(list.length === 0){
    showToast('Adicione pelo menos 1 mapa!','');
    return;
  }
  persistRotation(rotCurrentMode, list);
  // Also update the drop panel if it's on the same mode
  if(rotCurrentMode === (S.mode||'resurgence')) renderDropControl();
  const fb = document.getElementById('rotation-feedback');
  fb.textContent = `✅ Rotação de ${list.length} mapas salva!`;
  fb.className = 'admin-feedback ok';
  showToast(`✅ Rotação salva: ${list.length} mapas`,'ok');
  setTimeout(()=>{ fb.textContent=''; fb.className='admin-feedback'; }, 3500);
};

window.resetMapRotation = function(){
  if(!confirm('Restaurar rotação padrão? A rotação customizada será apagada.')) return;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(LS_MAP_ROT)||'{}'); } catch {}
  delete saved[rotCurrentMode];
  localStorage.setItem(LS_MAP_ROT, JSON.stringify(saved));
  renderMapPool();
  renderRotationList();
  renderDropControl();
  const fb = document.getElementById('rotation-feedback');
  fb.textContent = '↺ Rotação padrão restaurada';
  fb.className = 'admin-feedback';
  setTimeout(()=>{ fb.textContent=''; fb.className='admin-feedback'; }, 3000);
};

// Init the rotation configurator when setup tab is opened
function initMapRotationConfigurator(){
  // Auto-init active tab based on current tournament mode
  rotCurrentMode = S.mode || 'resurgence';
  document.getElementById('rot-tab-resurgence')?.classList.toggle('active', rotCurrentMode==='resurgence');
  document.getElementById('rot-tab-br')?.classList.toggle('active', rotCurrentMode==='br');
  renderMapPool();
  renderRotationList();
}

// ── IA SCORING ──
let iaDetectedResults = [];

function populateIaRound(){
  const sel = document.getElementById('ia-round');
  if(!sel) return;
  sel.innerHTML = [...Array(S.rounds)].map((_,i)=>`<option value="${i+1}">Rodada ${i+1}</option>`).join('');
}

window.iaPreview = function(input){
  const img = document.getElementById('ia-preview-img');
  if(input.files && input.files[0]){
    img.src = URL.createObjectURL(input.files[0]);
    img.style.display = 'block';
  }
};

window.iaAnalyze = async function(){
  const file = document.getElementById('ia-file').files[0];
  const fb = document.getElementById('ia-feedback');
  const btn = document.getElementById('ia-btn');
  if(!file){ fb.textContent='⚠ Selecione uma imagem'; fb.className='admin-feedback err'; return; }
  btn.disabled = true; btn.textContent = '⏳ Analisando...';
  fb.textContent = ''; fb.className = 'admin-feedback';
  try {
    const fd = new FormData();
    fd.append('screenshot', file);
    const token = localStorage.getItem('wzc_token');
    const r = await fetch('/api/ai/score-screenshot', {
      method:'POST',
      headers:{ Authorization:`Bearer ${token}` },
      body: fd
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || 'Erro na IA');
    iaDetectedResults = data.results || [];
    renderIaResults(iaDetectedResults);
    fb.textContent = `✓ ${iaDetectedResults.length} times detectados!`; fb.className='admin-feedback ok';
    document.getElementById('ia-apply-wrap').style.display = 'block';
    populateIaRound();
  } catch(e){
    fb.textContent = e.message; fb.className='admin-feedback err';
    document.getElementById('ia-apply-wrap').style.display = 'none';
  } finally {
    btn.disabled = false; btn.textContent = '🤖 ANALISAR COM IA';
  }
};

function renderIaResults(results){
  const wrap = document.getElementById('ia-results-wrap');
  if(!results.length){ wrap.innerHTML='<div style="text-align:center;padding:30px;color:var(--text-3);font-family:var(--font-cond);font-size:13px">Nenhum resultado detectado</div>'; return; }
  wrap.innerHTML = `<table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);padding:8px 12px;text-align:left;border-bottom:1px solid var(--border-subtle)">#</th>
      <th style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);padding:8px 12px;text-align:left;border-bottom:1px solid var(--border-subtle)">TIME DETECTADO</th>
      <th style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);padding:8px 12px;text-align:left;border-bottom:1px solid var(--border-subtle)">KILLS</th>
      <th style="font-family:var(--font-cond);font-size:10px;letter-spacing:2px;color:var(--text-3);padding:8px 12px;text-align:left;border-bottom:1px solid var(--border-subtle)">TIME (mapear)</th>
    </tr></thead>
    <tbody>${results.map((r,i)=>{
      const teamOpts = S.teams.map(t=>`<option value="${t.id}">${t.name} (${t.tag})</option>`).join('');
      return `<tr style="border-bottom:1px solid rgba(255,255,255,0.03)">
        <td style="padding:8px 12px;font-family:var(--font-cond);font-size:14px;font-weight:900;color:var(--orange)">${r.placement??i+1}</td>
        <td style="padding:8px 12px;font-family:var(--font-cond);font-size:13px">${r.team_name??'—'}</td>
        <td style="padding:8px 12px;font-family:var(--font-cond);font-size:14px;font-weight:700">${r.kills??0}</td>
        <td style="padding:8px 12px"><select class="form-control" id="ia-map-${i}" style="font-size:11px;padding:4px 8px"><option value="">-- selecionar --</option>${teamOpts}</select></td>
      </tr>`;
    }).join('')}</tbody></table>`;
}

window.iaApplyResults = function(){
  const round = parseInt(document.getElementById('ia-round').value);
  const fb = document.getElementById('ia-apply-fb');
  let applied = 0, skipped = 0;
  iaDetectedResults.forEach((r, i) => {
    const teamId = document.getElementById(`ia-map-${i}`)?.value;
    if(!teamId){ skipped++; return; }
    const team = S.teams.find(t=>t.id===teamId);
    if(!team){ skipped++; return; }
    const match = S.matches.find(m=>m.round===round && m.group===team.group);
    if(!match){ skipped++; return; }
    const placement = r.placement ?? (i+1);
    const kills = r.kills ?? 0;
    const idx = match.results.findIndex(res=>res.teamId===teamId);
    const res = {teamId, placement, kills};
    if(idx>=0) match.results[idx]=res; else match.results.push(res);
    match.status = match.teamIds.every(id=>match.results.find(res=>res.teamId===id)) ? 'done' : 'live';
    applied++;
  });
  save(); renderAll();
  fb.textContent = `✓ ${applied} resultados aplicados${skipped?' ('+skipped+' ignorados)':''} — Rodada ${round}`;
  fb.className = 'admin-feedback ok';
  showToast(`IA: ${applied} resultados aplicados!`,'ok');
};

