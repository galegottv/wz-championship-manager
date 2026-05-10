const fs = require('fs');
const html = String.raw`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Times — WZ Championship</title>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet"/>
<script>(function(){const r=localStorage.getItem('wzc_user');if(!r)window.location.replace('login.html');})();</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --o:#ff6a00;--r:#ff2d55;--g:#00ff87;
  --bg:#080a0f;--c:#111620;--b2:rgba(255,255,255,.06);
  --t1:#f0f2f5;--t2:#8a96a8;--t3:#4a5568;
  --fn:'Barlow Condensed',sans-serif;--fb:'Barlow',sans-serif
}
body{background:var(--bg);color:var(--t1);font-family:var(--fb);min-height:100vh}
a{text-decoration:none;color:inherit}
.wrap{max-width:1100px;margin:0 auto;padding:0 20px}
header{position:sticky;top:0;z-index:100;background:rgba(8,10,15,.96);border-bottom:1px solid rgba(255,106,0,.18);backdrop-filter:blur(12px)}
.hi{display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{display:flex;align-items:center;gap:10px;font-family:var(--fn);font-size:17px;font-weight:900;letter-spacing:3px}
.logo-s{font-size:8px;letter-spacing:4px;color:var(--o);display:block}
.nl{font-family:var(--fn);font-size:12px;font-weight:700;letter-spacing:1.5px;color:var(--t2);padding:7px 12px;border-radius:6px;transition:.2s}
.nl:hover{color:var(--o);background:rgba(255,106,0,.08)}
.nav{display:flex;align-items:center;gap:8px}
.page{padding:32px 0 80px}
.pt{font-family:var(--fn);font-size:30px;font-weight:900;letter-spacing:4px;margin-bottom:4px}
.pt span{color:var(--o)}
.ps{font-family:var(--fn);font-size:11px;letter-spacing:2px;color:var(--t3);margin-bottom:28px}
.card{background:var(--c);border:1px solid var(--b2);border-radius:14px;padding:24px;margin-bottom:20px}
.ct{font-family:var(--fn);font-size:14px;font-weight:800;letter-spacing:3px;color:var(--o);margin-bottom:16px}
.fr{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.fg{display:flex;flex-direction:column;gap:6px;flex:1;min-width:150px}
.fl{font-family:var(--fn);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--t3)}
.fc{background:#131820;border:1px solid var(--b2);color:var(--t1);font-family:var(--fb);font-size:13px;padding:10px 14px;border-radius:8px;outline:none;transition:.2s;width:100%}
.fc:focus{border-color:var(--o)}
.fc::placeholder{color:var(--t3)}
.ci{padding:4px 8px;height:42px;cursor:pointer}
.bp{font-family:var(--fn);font-size:13px;font-weight:800;letter-spacing:2px;padding:11px 22px;border-radius:8px;border:none;background:linear-gradient(135deg,#cc5500,var(--o));color:#fff;cursor:pointer;transition:.2s}
.bp:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(255,106,0,.35)}
.bs{font-family:var(--fn);font-size:12px;font-weight:700;letter-spacing:1px;padding:9px 16px;border-radius:7px;border:1px solid var(--b2);background:#131820;color:var(--t2);cursor:pointer;transition:.2s}
.bs:hover{border-color:var(--o);color:var(--o)}
.bd{font-family:var(--fn);font-size:11px;font-weight:700;letter-spacing:1px;padding:7px 14px;border-radius:6px;border:1px solid rgba(255,45,85,.25);background:rgba(255,45,85,.08);color:var(--r);cursor:pointer;transition:.2s}
.bd:hover{background:rgba(255,45,85,.18)}
.bm{font-family:var(--fn);font-size:11px;font-weight:700;letter-spacing:1px;padding:7px 14px;border-radius:6px;border:1px solid rgba(79,172,254,.25);background:rgba(79,172,254,.08);color:#4facfe;cursor:pointer;transition:.2s}
.bm:hover{background:rgba(79,172,254,.18)}
.fbk{font-family:var(--fn);font-size:12px;letter-spacing:1px;padding:8px 14px;border-radius:6px;margin-top:10px;display:none}
.fbk.ok{background:rgba(0,255,135,.1);border:1px solid rgba(0,255,135,.2);color:var(--g);display:block}
.fbk.er{background:rgba(255,45,85,.1);border:1px solid rgba(255,45,85,.2);color:var(--r);display:block}
.tbn{display:flex;align-items:center;gap:16px;padding:16px;background:#131820;border-radius:10px;border:1px solid var(--b2);margin-bottom:16px}
.ml{display:flex;flex-direction:column;gap:8px}
.mr{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0d1017;border-radius:8px;border:1px solid var(--b2)}
.mn{font-family:var(--fn);font-size:14px;font-weight:800;letter-spacing:1px}
.rb{font-family:var(--fn);font-size:10px;font-weight:700;letter-spacing:2px;padding:3px 10px;border-radius:20px}
.rc{background:rgba(255,215,0,.1);color:#ffd700;border:1px solid rgba(255,215,0,.25)}
.rm{background:rgba(79,172,254,.1);color:#4facfe;border:1px solid rgba(79,172,254,.25)}
.rp{background:rgba(255,255,255,.05);color:var(--t3);border:1px solid var(--b2)}
.si{width:100%;padding:10px 14px;background:#131820;border:1px solid var(--b2);color:var(--t1);font-family:var(--fb);font-size:13px;border-radius:8px;outline:none;transition:.2s;margin-bottom:16px}
.si:focus{border-color:var(--o)}
.si::placeholder{color:var(--t3)}
.tg{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.tc{background:var(--c);border:1px solid var(--b2);border-radius:12px;padding:18px;transition:.2s}
.tc:hover{border-color:rgba(255,106,0,.3)}
.tc.mine{border-color:rgba(255,106,0,.5);background:rgba(255,106,0,.05)}
.tli{width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--fn);font-size:14px;font-weight:900;flex-shrink:0;overflow:hidden}
.tli img{width:100%;height:100%;object-fit:cover}
.em{text-align:center;padding:60px 20px;font-family:var(--fn);font-size:14px;letter-spacing:2px;color:var(--t3)}
.toast{position:fixed;top:24px;right:24px;z-index:9999;background:rgba(0,255,135,.12);border:1px solid rgba(0,255,135,.25);color:var(--g);font-family:var(--fn);font-size:13px;font-weight:700;letter-spacing:1px;padding:14px 22px;border-radius:10px;backdrop-filter:blur(8px);transform:translateY(-80px);opacity:0;transition:.35s cubic-bezier(.34,1.56,.64,1)}
.toast.show{transform:translateY(0);opacity:1}
.toast.er{background:rgba(255,45,85,.12);border-color:rgba(255,45,85,.25);color:var(--r)}
details summary{font-family:var(--fn);font-size:11px;font-weight:700;letter-spacing:2px;color:var(--t3);cursor:pointer;padding:6px 0;user-select:none}
details[open] summary{color:var(--o)}
</style>
</head>
<body>
<header><div class="wrap hi">
  <a class="logo" href="home.html">
    <svg width="32" height="32" viewBox="0 0 60 60" fill="none"><polygon points="30,2 56,16 56,44 30,58 4,44 4,16" stroke="#ff6a00" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="12" stroke="#ff6a00" stroke-width="1.5" fill="none"/><circle cx="30" cy="30" r="3" fill="#ff6a00"/></svg>
    <div><span>WZ CHAMPIONSHIP</span><span class="logo-s">TOURNAMENT SYSTEM</span></div>
  </a>
  <div class="nav">
    <a class="nl" href="home.html">🏠 INÍCIO</a>
    <a class="nl" href="index.html">🏆 TORNEIOS</a>
    <a class="nl" href="profile.html">👤 CONTA</a>
    <div id="hpill"></div>
  </div>
</div></header>

<div class="page"><div class="wrap">
  <div class="pt">TIMES <span>WZ</span></div>
  <div class="ps">GERENCIE SEU TIME — 1 TIME POR CONTA</div>

  <!-- SEM TIME -->
  <div id="v-notm" style="display:none">
    <div class="card"><div class="em">🎮<br><br>VOCÊ NÃO TEM UM TIME<br>
      <small style="font-family:var(--fb);font-size:12px;color:var(--t3);font-weight:400;display:block;margin:8px 0 16px">Crie seu time para participar dos campeonatos</small>
      <button class="bp" onclick="showCreate()">+ CRIAR TIME</button>
    </div></div>
  </div>

  <!-- CRIAR TIME -->
  <div id="v-crt" style="display:none">
    <div class="card">
      <div class="ct">🛡 CRIAR TIME</div>
      <div class="fr">
        <div class="fg"><label class="fl">NOME *</label><input class="fc" id="cn" placeholder="Ex: OpTic Gaming"/></div>
        <div class="fg"><label class="fl">TAG (max 5) *</label><input class="fc" id="ctg" maxlength="5" placeholder="OPT"/></div>
        <div class="fg"><label class="fl">COR</label><input type="color" class="fc ci" id="cc" value="#ff6a00"/></div>
        <div class="fg"><label class="fl">LOGO</label><input type="file" class="fc" id="cl" accept="image/*" onchange="prvL(this)"/>
          <img id="lp" style="display:none;max-width:70px;border-radius:8px;margin-top:6px"/></div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="bp" onclick="createTeam()">CRIAR</button>
        <button class="bs" onclick="showNotm()">CANCELAR</button>
      </div>
      <div class="fbk" id="cfb"></div>
    </div>
  </div>

  <!-- MEU TIME -->
  <div id="v-team" style="display:none">
    <div class="card">
      <div class="ct">⭐ MEU TIME</div>
      <div class="tbn" id="tbanner"></div>
      <details id="edit-det">
        <summary>⚙ EDITAR TIME</summary>
        <div style="margin-top:14px">
          <div class="fr">
            <div class="fg"><label class="fl">NOME</label><input class="fc" id="en" placeholder="Novo nome"/></div>
            <div class="fg"><label class="fl">TAG</label><input class="fc" id="et" maxlength="5"/></div>
            <div class="fg"><label class="fl">COR</label><input type="color" class="fc ci" id="ec"/></div>
            <div class="fg"><label class="fl">LOGO</label><input type="file" class="fc" id="el" accept="image/*"/></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="bp" onclick="editTeam()">SALVAR ALTERAÇÕES</button>
            <button class="bd" onclick="delTeam()">🗑 EXCLUIR TIME</button>
          </div>
          <div class="fbk" id="efb"></div>
        </div>
      </details>
    </div>
    <div class="card" id="cmemb"></div>
  </div>

  <!-- TODOS OS TIMES -->
  <div class="card">
    <div class="ct">🔍 BUSCAR TIMES</div>
    <input class="si" id="srch" placeholder="Buscar por nome, tag, dono ou integrante..." oninput="filterTeams()"/>
    <div id="tgrid"><div class="em">Carregando...</div></div>
  </div>
</div></div>

<div class="toast" id="toast"></div>
<script>
const TK=()=>localStorage.getItem('wzc_token');
const ME=()=>{try{return JSON.parse(localStorage.getItem('wzc_user')||'{}')}catch{return{}}};
let myTeam=null,allTeams=[];

// header pill
(function(){const u=ME(),el=document.getElementById('hpill');if(el&&u.nickname)el.innerHTML=`<div style="background:rgba(255,106,0,.1);border:1px solid rgba(255,106,0,.2);border-radius:20px;padding:5px 12px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;display:flex;align-items:center;gap:6px"><span style="width:7px;height:7px;border-radius:50%;background:#00ff87;display:inline-block"></span>${u.nickname}</div>`;})();

function toast(m,tp='ok'){const el=document.getElementById('toast');el.textContent=m;el.className='toast '+tp+' show';setTimeout(()=>el.classList.remove('show'),3500)}
function setFb(id,m,tp='er'){const el=document.getElementById(id);el.textContent=m;el.className='fbk '+tp}
async function api(method,path,body,isForm){
  const opts={method,headers:{Authorization:'Bearer '+TK()}};
  if(isForm){opts.body=body}else if(body){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body)}
  const r=await fetch('/api'+path,opts),d=await r.json();
  if(!r.ok)throw new Error(d.error||'Erro');return d;
}

function showNotm(){document.getElementById('v-notm').style.display='block';document.getElementById('v-crt').style.display='none';document.getElementById('v-team').style.display='none'}
function showCreate(){document.getElementById('v-notm').style.display='none';document.getElementById('v-crt').style.display='block';document.getElementById('v-team').style.display='none'}
function prvL(i){const p=document.getElementById('lp');if(i.files[0]){p.src=URL.createObjectURL(i.files[0]);p.style.display='block'}}

function logoHTML(t,sz){
  sz=sz||44;
  if(t.logo)return `<div class="tli" style="width:${sz}px;height:${sz}px;border:2px solid rgba(255,255,255,.08)"><img src="${t.logo}"/></div>`;
  return `<div class="tli" style="width:${sz}px;height:${sz}px;background:${t.color||'#ff6a00'};border:2px solid rgba(255,255,255,.08)">${(t.tag||'?').slice(0,2)}</div>`;
}

function renderMyTeam(t){
  myTeam=t;
  document.getElementById('v-notm').style.display='none';
  document.getElementById('v-crt').style.display='none';
  document.getElementById('v-team').style.display='block';
  // preenche edit fields
  document.getElementById('en').value=t.name;
  document.getElementById('et').value=t.tag;
  document.getElementById('ec').value=t.color||'#ff6a00';
  // banner
  document.getElementById('tbanner').innerHTML=`
    ${logoHTML(t,60)}
    <div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;color:#ff6a00">[${t.tag}]</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;letter-spacing:2px">${t.name}</div>
      <div style="font-size:12px;color:#4a5568;margin-top:4px">Cap: ${t.ownerNick} &nbsp;·&nbsp; ${t.members.length}/${t.memberLimit} membros</div>
    </div>`;
  // hide edit section if not owner/manager
  const me=ME(),canEdit=t.ownerId===me.id||t.members.some(m=>m.userId===me.id&&m.role==='manager');
  document.getElementById('edit-det').style.display=canEdit?'':'none';
  // members
  const isCap=t.ownerId===me.id;
  let mhtml=`<div class="ct">👥 MEMBROS (${t.members.length}/${t.memberLimit})</div>`;
  if(canEdit){mhtml+=`<div class="fr" style="margin-bottom:12px"><div class="fg"><label class="fl">ADICIONAR MEMBRO (nickname)</label><input class="fc" id="addnick" placeholder="Nickname do jogador"/></div><button class="bp" style="margin-top:auto;white-space:nowrap" onclick="addMember()">+ ADICIONAR</button></div><div class="fbk" id="mfb"></div>`}
  mhtml+='<div class="ml">'+t.members.map(m=>{
    const meCap=m.userId===t.ownerId,isMe=m.userId===me.id;
    const lbl=meCap?'CAPITÃO':m.role==='manager'?'GERENTE':'JOGADOR';
    const cls=meCap?'rc':m.role==='manager'?'rm':'rp';
    let acts='';
    if(isCap&&!meCap){
      if(m.role==='manager')acts+=`<button class="bs" style="padding:4px 10px;font-size:10px" onclick="setRole('${m.userId}','player')">↓ JOGADOR</button>`;
      else acts+=`<button class="bm" style="padding:4px 10px;font-size:10px" onclick="setRole('${m.userId}','manager')">⬆ GERENTE</button>`;
      acts+=`<button class="bd" style="padding:4px 10px;font-size:10px;margin-left:4px" onclick="remMember('${m.userId}')">✕ REMOVER</button>`;
    }else if(isMe&&!meCap){acts=`<button class="bs" style="padding:4px 10px;font-size:10px" onclick="leaveTeam()">SAIR</button>`}
    return `<div class="mr"><div style="display:flex;align-items:center;gap:10px"><span class="mn">${m.nickname}</span><span class="rb ${cls}">${lbl}</span></div><div style="display:flex;gap:4px">${acts}</div></div>`;
  }).join('')+'</div>';
  document.getElementById('cmemb').innerHTML=mhtml;
}

async function loadAll(){
  try{
    allTeams=await api('GET','/teams');
    const me=ME();
    myTeam=allTeams.find(t=>t.ownerId===me.id||t.members.some(m=>m.userId===me.id))||null;
    if(myTeam)renderMyTeam(myTeam);else showNotm();
    filterTeams();
  }catch(e){toast(e.message,'er')}
}

function filterTeams(){
  const q=document.getElementById('srch').value.toLowerCase().trim();
  const grid=document.getElementById('tgrid');
  let list=allTeams;
  if(q)list=list.filter(t=>
    t.name.toLowerCase().includes(q)||
    t.tag.toLowerCase().includes(q)||
    (t.ownerNick||'').toLowerCase().includes(q)||
    t.members.some(m=>(m.nickname||'').toLowerCase().includes(q))
  );
  if(!list.length){grid.innerHTML='<div class="em">Nenhum time encontrado</div>';return}
  const me=ME();
  grid.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">${list.map(t=>{
    const mine=myTeam&&t.id===myTeam.id;
    return `<div class="tc${mine?' mine':''}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        ${logoHTML(t,44)}
        <div style="flex:1">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:900;letter-spacing:1px">${t.name}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;color:#ff6a00">[${t.tag}]</div>
        </div>
        ${mine?'<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;color:#ff6a00;padding:3px 10px;border-radius:20px;background:rgba(255,106,0,.1);border:1px solid rgba(255,106,0,.2)">MEU TIME</span>':''}
      </div>
      <div style="font-size:11px;color:#4a5568;margin-bottom:6px">Cap: ${t.ownerNick} &nbsp;·&nbsp; ${t.members.length}/${t.memberLimit} membros</div>
      <div style="font-size:11px;color:#8a96a8">${t.members.map(m=>`<span style="margin-right:6px">${m.nickname}</span>`).join('')}</div>
    </div>`;
  }).join('')}</div>`;
}

async function createTeam(){
  const n=document.getElementById('cn').value.trim(),tg=document.getElementById('ctg').value.trim();
  if(!n||!tg){setFb('cfb','Nome e tag são obrigatórios');return}
  const fd=new FormData();
  fd.append('name',n);fd.append('tag',tg);fd.append('color',document.getElementById('cc').value);
  const lf=document.getElementById('cl').files[0];if(lf)fd.append('logo',lf);
  try{const t=await api('POST','/teams',fd,true);toast('Time criado! 🎉');allTeams.push(t);renderMyTeam(t);filterTeams()}
  catch(e){setFb('cfb',e.message)}
}

async function editTeam(){
  const fd=new FormData();
  const n=document.getElementById('en').value.trim(),tg=document.getElementById('et').value.trim();
  if(n)fd.append('name',n);if(tg)fd.append('tag',tg);
  fd.append('color',document.getElementById('ec').value);
  const lf=document.getElementById('el').files[0];if(lf)fd.append('logo',lf);
  try{const t=await api('PATCH','/teams/'+myTeam.id,fd,true);toast('Time atualizado! ✓');allTeams=allTeams.map(x=>x.id===t.id?t:x);renderMyTeam(t);filterTeams()}
  catch(e){setFb('efb',e.message)}
}

async function delTeam(){
  if(!confirm('Excluir o time permanentemente? Esta ação não pode ser desfeita.'))return;
  try{await api('DELETE','/teams/'+myTeam.id);toast('Time excluído','er');allTeams=allTeams.filter(t=>t.id!==myTeam.id);myTeam=null;showNotm();filterTeams()}
  catch(e){toast(e.message,'er')}
}

async function addMember(){
  const nick=document.getElementById('addnick').value.trim();
  if(!nick){setFb('mfb','Digite o nickname do jogador');return}
  try{const t=await api('POST','/teams/'+myTeam.id+'/members',{nickname:nick});toast(nick+' adicionado! ✓');allTeams=allTeams.map(x=>x.id===t.id?t:x);renderMyTeam(t);filterTeams();document.getElementById('addnick').value=''}
  catch(e){setFb('mfb',e.message)}
}

async function remMember(uid){
  if(!confirm('Remover este membro do time?'))return;
  try{const t=await api('DELETE','/teams/'+myTeam.id+'/members/'+uid);toast('Membro removido');allTeams=allTeams.map(x=>x.id===t.id?t:x);renderMyTeam(t);filterTeams()}
  catch(e){toast(e.message,'er')}
}

async function leaveTeam(){
  if(!confirm('Sair do time?'))return;
  try{await api('DELETE','/teams/'+myTeam.id+'/members/'+ME().id);toast('Você saiu do time','er');allTeams=allTeams.filter(t=>t.id!==myTeam.id);myTeam=null;showNotm();await loadAll()}
  catch(e){toast(e.message,'er')}
}

async function setRole(uid,role){
  try{const t=await api('PATCH','/teams/'+myTeam.id+'/members/'+uid+'/role',{role});toast(role==='manager'?'Promovido a Gerente! ⬆':'Rebaixado a Jogador');allTeams=allTeams.map(x=>x.id===t.id?t:x);renderMyTeam(t)}
  catch(e){toast(e.message,'er')}
}

window.showCreate=showCreate;window.showNotm=showNotm;window.prvL=prvL;
window.createTeam=createTeam;window.editTeam=editTeam;window.delTeam=delTeam;
window.addMember=addMember;window.remMember=remMember;window.leaveTeam=leaveTeam;window.setRole=setRole;
loadAll();
</script>
</body></html>`;
fs.writeFileSync('teams.html', html, 'utf8');
console.log('teams.html gerado com sucesso!');
