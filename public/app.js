/* Caderneta · lógica da aplicação */
const KEY="caderneta_v1";
let db={alunos:[],ocorrencias:[]};
let view="list",sel=null,q="",fTurma="";
const TIPOS=["Disciplinar","Pedagógica","Saúde","Falta","Atraso","Elogio","Outra"];
const GRAV=["Informativa","Leve","Média","Grave","Elogio"];

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=id=>document.getElementById(id);
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("on");setTimeout(()=>t.classList.remove("on"),2200)}
function fdate(d){if(!d)return"—";const [y,m,dd]=d.split("-");return `${dd}/${m}/${y}`}
function idade(d){if(!d)return"";const n=new Date(),b=new Date(d);let a=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))a--;return a+" anos"}
function go(v,id){view=v;sel=id||null;render();window.scrollTo(0,0)}

function render(){
  const app=$("app");
  if(view==="list"){
    const turmas=[...new Set(db.alunos.map(a=>a.turma).filter(Boolean))].sort();
    const lista=db.alunos.filter(a=>{
      const t=(a.nome+" "+(a.processo||"")+" "+(a.encNome||"")).toLowerCase();
      return t.includes(q.toLowerCase())&&(!fTurma||a.turma===fTurma)}).sort((a,b)=>a.nome.localeCompare(b.nome));
    app.innerHTML=`
    <div class="bar">
      <input type="search" id="q" placeholder="Pesquisar por nome, nº de processo ou encarregado" value="${esc(q)}" aria-label="Pesquisar">
      <select id="ft" aria-label="Filtrar por turma"><option value="">Todas as turmas</option>${turmas.map(t=>`<option ${t===fTurma?"selected":""}>${esc(t)}</option>`).join("")}</select>
      <button class="primary" onclick="abrirAluno()">Novo aluno</button>
    </div>
    <div class="sheet">
      <div class="sub" style="margin-bottom:8px">${lista.length} de ${db.alunos.length} aluno(s)</div>
      ${lista.length?lista.map(a=>{const n=db.ocorrencias.filter(o=>o.alunoId===a.id).length;return `
        <div class="stu" onclick="go('detail','${a.id}')" tabindex="0" onkeydown="if(event.key==='Enter')go('detail','${a.id}')">
          <div style="display:flex;gap:12px;align-items:center">${avatar(a,44)}<div><b>${esc(a.nome)}</b><div class="sub">${esc(a.classe||"")} ${esc(a.turma||"")} · Proc. ${esc(a.processo||"—")}</div></div></div>
          <span class="tag t-Informativa">${n} ocorrência${n===1?"":"s"}</span>
        </div>`}).join(""):`<div class="empty">${db.alunos.length?"Nenhum aluno encontrado com esse filtro.":"Ainda não há alunos. Toque em “Novo aluno” para registar o primeiro."}</div>`}
    </div>`;
    $("q").oninput=e=>{q=e.target.value;const p=e.target.selectionStart;render();const i=$("q");i.focus();i.setSelectionRange(p,p)};
    $("ft").onchange=e=>{fTurma=e.target.value;render()};
  } else {
    const a=db.alunos.find(x=>x.id===sel);
    if(!a){go("list");return}
    const todas=db.ocorrencias.filter(o=>o.alunoId===a.id);const occ=filtrarOcc(todas);
    app.innerHTML=`
    <div class="bar"><button class="ghost" onclick="go('list')">← Voltar à lista</button></div>
    <div class="sheet">
      <div class="only-print" style="margin-bottom:10px"><b>Caderneta · Ficha do aluno</b> — impresso em ${new Date().toLocaleDateString("pt-PT")}</div><div class="row"><div style="display:flex;gap:16px;align-items:center">${avatar(a,84)}<div><h2>${esc(a.nome)}</h2><div class="sub">${esc(a.classe||"")} ${esc(a.turma||"")} ${a.turno?"· "+esc(a.turno):""} · Ano letivo ${esc(a.anoLetivo||"—")}</div></div></div>
      <div style="display:flex;gap:8px"><button onclick="window.print()">Imprimir ficha</button><button onclick="abrirAluno('${a.id}')">Editar</button>${isAdmin()?`<button class="danger" onclick="apagarAluno('${a.id}')">Eliminar</button>`:""}</div></div>
      <h3 style="margin:20px 0 8px">Dados do aluno</h3>
      <dl>
        <dt>Nº de processo</dt><dd>${esc(a.processo||"—")}</dd>
        <dt>Nascimento</dt><dd>${fdate(a.nascimento)} ${a.nascimento?"("+idade(a.nascimento)+")":""}</dd>
        <dt>Género</dt><dd>${esc(a.genero||"—")}</dd>
        <dt>Morada</dt><dd>${esc(a.morada||"—")}</dd>
        <dt>Contacto</dt><dd>${esc(a.contacto||"—")}</dd>
        <dt>Observações</dt><dd>${esc(a.obs||"—")}</dd>
        <dt>Faltas</dt><dd>${resumoFaltas(a.id)}</dd>
      </dl>
      <h3 style="margin:20px 0 8px">Encarregado de educação</h3>
      <dl>
        <dt>Nome</dt><dd>${esc(a.encNome||"—")}</dd>
        <dt>Parentesco</dt><dd>${esc(a.encParentesco||"—")}</dd>
        <dt>Telefone</dt><dd>${a.encTel?`<a href="tel:${esc(a.encTel)}">${esc(a.encTel)}</a>${waLink(a.encTel,a.nome)}`:"—"}</dd>
        <dt>Telefone alternativo</dt><dd>${esc(a.encTel2||"—")}${waLink(a.encTel2,a.nome)}</dd>
        <dt>Email</dt><dd>${esc(a.encEmail||"—")}</dd>
        <dt>Profissão</dt><dd>${esc(a.encProf||"—")}</dd>
      </dl>
    </div>
    ${notasSheet(a)}<div class="sheet" style="margin-top:16px">
      <div class="row"><h3>Ocorrências (${occ.length})</h3><button class="primary" onclick="abrirOcc('${a.id}')">Nova ocorrência</button></div>${todas.length?barraOcc(false):""}
      ${occ.length?occ.map(o=>`<div class="occ">
        <div class="row"><div><span class="tag t-${esc(o.gravidade)}">${esc(o.gravidade)}</span> <b>${esc(o.tipo)}</b> <span class="sub">· ${fdate(o.data)}</span></div>
        <div>${canEditOcc(o)?`<button class="ghost" onclick="abrirOcc('${a.id}','${o.id}')">Editar</button><button class="ghost" style="color:var(--red)" onclick="apagarOcc('${o.id}')">Eliminar</button>`:""}</div></div>
        <div>${esc(o.descricao)}</div>
        ${o.medida?`<div class="sub"><b>Medida tomada:</b> ${esc(o.medida)}</div>`:""}
        ${o.registadoPor?`<div class="sub">Registado por: ${esc(o.registadoPor)}</div>`:""}${anexosHtml(o)}
      </div>`).join(""):`<div class="empty">Sem ocorrências registadas para este aluno.</div>`}
    </div>`;
  }
}

/* ---- Alunos ---- */
const inp=(n,l,v,t="text",x="")=>`<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" ${x}></label>`;
function abrirAluno(id){
  const a=db.alunos.find(x=>x.id===id)||{};
  $("fAluno").innerHTML=`<h2 style="margin-bottom:14px">${id?"Editar aluno":"Novo aluno"}</h2>
  <h3 style="font-size:1rem;margin-bottom:8px">Dados do aluno</h3>
  <div class="grid">
    ${inp("nome","Nome completo *",a.nome||"","text","required")}
    ${inp("processo","Nº de processo",a.processo||"")}
    ${inp("nascimento","Data de nascimento",a.nascimento||"","date")}
    <label>Género<select name="genero"><option value="">—</option>${["Feminino","Masculino"].map(g=>`<option ${a.genero===g?"selected":""}>${g}</option>`).join("")}</select></label>
    ${inp("classe","Classe / Ano",a.classe||"")}
    ${inp("turma","Turma",a.turma||"")}
    <label>Turno<select name="turno"><option value="">—</option>${["Manhã","Tarde","Noite"].map(g=>`<option ${a.turno===g?"selected":""}>${g}</option>`).join("")}</select></label>
    ${inp("anoLetivo","Ano letivo",a.anoLetivo||new Date().getFullYear())}
    ${inp("contacto","Contacto do aluno",a.contacto||"","tel")}
    ${inp("morada","Morada",a.morada||"")}
  </div>
  <label>Observações<textarea name="obs">${esc(a.obs||"")}</textarea></label>
  <h3 style="font-size:1rem;margin:8px 0">Encarregado de educação</h3>
  <div class="grid">
    ${inp("encNome","Nome",a.encNome||"")}
    ${inp("encParentesco","Parentesco",a.encParentesco||"")}
    ${inp("encTel","Telefone",a.encTel||"","tel")}
    ${inp("encTel2","Telefone alternativo",a.encTel2||"","tel")}
    ${inp("encEmail","Email",a.encEmail||"","email")}
    ${inp("encProf","Profissão",a.encProf||"")}
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
    <button type="button" onclick="$('dlgAluno').close()">Cancelar</button><button class="primary" type="button" onclick="guardarAluno('${id||""}')">Guardar aluno</button></div>`;
  $("dlgAluno").showModal();
}

/* ---- Ocorrências ---- */
function abrirOcc(alunoId,id){
  const o=db.ocorrencias.find(x=>x.id===id)||{};
  const sl=(n,l,arr,v)=>`<label>${l}<select name="${n}">${arr.map(x=>`<option ${x===v?"selected":""}>${x}</option>`).join("")}</select></label>`;
  $("fOcc").innerHTML=`<h2 style="margin-bottom:14px">${id?"Editar ocorrência":"Nova ocorrência"}</h2>
  <div class="grid">
    ${inp("data","Data *",o.data||new Date().toISOString().slice(0,10),"date","required")}
    ${sl("tipo","Tipo",TIPOS,o.tipo||"Disciplinar")}
    ${sl("gravidade","Gravidade",GRAV,o.gravidade||"Informativa")}
    ${inp("registadoPor","Registado por",o.registadoPor||"")}
  </div>
  <label>Descrição *<textarea name="descricao" required>${esc(o.descricao||"")}</textarea></label>
  <label>Medida tomada<textarea name="medida">${esc(o.medida||"")}</textarea></label>
  <div style="display:flex;gap:8px;justify-content:flex-end">
    <button type="button" onclick="$('dlgOcc').close()">Cancelar</button><button class="primary" type="button" onclick="guardarOcc('${alunoId}','${id||""}')">Guardar ocorrência</button></div>`;
  $("dlgOcc").showModal();
}

/* ---- Backup ---- */
function exportar(){
  const b=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="caderneta-"+new Date().toISOString().slice(0,10)+".json";a.click();
}
/* ===== v2: ligação ao servidor, login e utilizadores ===== */
let me=null;
const isAdmin=()=>me&&me.role==="admin";
const canEditOcc=o=>isAdmin()||(me&&o.autorId===me.id);
async function api(m,u,b){
  const r=await fetch("/api/"+u,{method:m,headers:{"Content-Type":"application/json"},body:b?JSON.stringify(b):undefined});
  const j=await r.json().catch(()=>({}));
  if(r.status===401){me=null;if(u!=="login"&&u!=="me")showLogin()}
  if(!r.ok)throw new Error(j.erro||"Erro de ligação");
  return j}
async function refresh(){db=await api("GET","data")}
const _render=render;render=()=>!me?showLogin():view==="occ"?renderOccs():view==="rel"?renderRel():view==="pres"?renderPres():view==="notas"?renderNotas():(_render(),view==="list"&&$("app").insertAdjacentHTML("afterbegin",painel()));

const ic=(p,s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICO={alunos:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
pres:'<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
notas:'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
occ:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4M12 17h.01"/>',
rel:'<path d="M12 20V10M18 20V4M6 20v-4"/>',adm:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
key:'<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
down:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',up:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',chev:'<path d="m6 9 6 6 6-6"/>',
turmas:'<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
disc:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
rec:'<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
log:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'};
const mi=(i,t,d,on,cls="")=>`<button class="mi ${cls}" onclick="${on}">${ic(ICO[i])}<span><b>${t}</b><small>${d}</small></span></button>`;
function acts(){
  const nav=[["list","alunos","Alunos"],["pres","pres","Presenças"],["notas","notas","Notas"],["occ","occ","Ocorrências"],["rel","rel","Relatórios"]];
  $("nav").innerHTML=me?nav.map(([v,i,t])=>`<button data-v="${v}" onclick="go('${v}')">${ic(ICO[i])}<span>${t}</span></button>`).join(""):"";
  const fechar="this.closest('details').open=false;";
  $("user").innerHTML=me?`<details class="um"><summary title="Abrir o menu da conta"><span class="av" style="width:36px;height:36px;font-size:15px">${esc((me.nome.trim()[0]||"?").toUpperCase())}</span><span class="um-n"><b>${esc(me.nome)}</b><small>${isAdmin()?"Administrador":"Professor"} · Minha conta</small></span><span class="chev">${ic(ICO.chev,16)}</span></summary>
  <div class="um-menu">${isAdmin()?mi("adm","Administração","Utilizadores, turmas, disciplinas e regras",fechar+"abrirAdmin()"):""}${mi("key","Alterar palavra-passe","Mude a sua senha de acesso",fechar+"abrirPass()")}${mi("down","Exportar dados","Descarregar uma cópia de segurança",fechar+"exportar()")}
  ${isAdmin()?mi("up","Importar dados","Restaurar a partir de uma cópia",fechar+"document.getElementById('imp').click()"):""}<hr>${mi("out","Sair","Terminar a sessão","sair()","out")}</div></details>`:"";
  marcaNav()}
document.addEventListener("click",e=>{const d=document.querySelector("details.um[open]");if(d&&!d.contains(e.target))d.open=false});
function marcaNav(){document.querySelectorAll("#nav [data-v]").forEach(b=>b.classList.toggle("on",b.dataset.v===(view==="detail"?"list":view)))}
{const _r6=render;render=()=>{_r6();marcaNav()}}
function showLogin(){
  acts();
  $("app").innerHTML=`<div class="sheet" style="max-width:420px;margin:36px auto"><div style="text-align:center;margin-bottom:22px"><div class="brandbig">Cader<i>neta</i> Digital</div><div class="sub">Gestão escolar simples e segura</div></div>
  <label>Utilizador<input id="lu" autocomplete="username" autocapitalize="none"></label>
  <label>Palavra-passe<input id="lp" type="password" autocomplete="current-password"></label>
  <button class="primary" id="lb" style="width:100%">Entrar</button><div id="le" style="color:var(--red);margin-top:8px"></div></div>`;
  const entrar=async()=>{try{me=await api("POST","login",{user:$("lu").value,pass:$("lp").value});await start()}catch(e){$("le").textContent=e.message}};
  $("lb").onclick=entrar;$("lp").onkeydown=e=>{if(e.key==="Enter")entrar()};$("lu").focus()}
async function start(){await refresh();acts();view="list";render();if(me.mustChange)abrirPass(true)}
async function sair(){try{await api("POST","logout",{})}catch(e){}me=null;db={alunos:[],ocorrencias:[]};showLogin()}

async function apagarAluno(id){
  const a=db.alunos.find(x=>x.id===id);
  if(!confirm(`Eliminar ${a.nome} e todas as suas ocorrências? Esta ação não pode ser desfeita.`))return;
  try{await api("DELETE","alunos/"+id);await refresh();toast("Aluno eliminado");go("list")}catch(e){toast(e.message)}}
async function guardarOcc(alunoId,id){
  const f=$("fOcc");if(!f.reportValidity())return;
  const d=Object.fromEntries(new FormData(f));
  try{id?await api("PUT","ocorrencias/"+id,d):await api("POST","ocorrencias",{...d,alunoId});await refresh();$("dlgOcc").close();toast("Ocorrência guardada");render()}catch(e){toast(e.message)}}
async function apagarOcc(id){
  if(!confirm("Eliminar esta ocorrência?"))return;
  try{await api("DELETE","ocorrencias/"+id);await refresh();toast("Ocorrência eliminada");render()}catch(e){toast(e.message)}}

$("imp").onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=async()=>{try{const d=JSON.parse(r.result);
    if(!Array.isArray(d.alunos)||!Array.isArray(d.ocorrencias))throw new Error("Ficheiro inválido");
    if(!confirm("Importar vai substituir TODOS os dados atuais. Continuar?"))return;
    await api("POST","import",{alunos:d.alunos,ocorrencias:d.ocorrencias,turmas:d.turmas,presencas:d.presencas,disciplinas:d.disciplinas,notas:d.notas,config:d.config});await refresh();toast("Dados importados");go("list")}catch(x){toast(x.message||"Ficheiro inválido")}};
  r.readAsText(f);e.target.value=""};

document.body.insertAdjacentHTML("beforeend",'<dialog id="dlgUsers"></dialog><dialog id="dlgPass"></dialog>');
function abrirPass(forced){
  $("dlgPass").innerHTML=`<h2 style="margin-bottom:6px">${forced?"Defina a sua palavra-passe":"Alterar palavra-passe"}</h2>
  ${forced?`<p class="sub" style="margin-top:0">Por segurança, troque a palavra-passe provisória antes de continuar.</p>`:""}
  <form id="fP" onsubmit="return false">${inp("atual","Palavra-passe atual","","password")}${inp("nova","Nova palavra-passe (mín. 6 caracteres)","","password")}
  <div style="display:flex;gap:8px;justify-content:flex-end">${forced?"":`<button type="button" onclick="$('dlgPass').close()">Cancelar</button>`}<button class="primary" type="button" onclick="mudarPass()">Guardar palavra-passe</button></div></form>`;
  $("dlgPass").oncancel=e=>{if(forced)e.preventDefault()};$("dlgPass").showModal()}
async function mudarPass(){
  const d=Object.fromEntries(new FormData($("fP")));
  try{await api("POST","password",d);me.mustChange=false;$("dlgPass").close();toast("Palavra-passe alterada")}catch(e){toast(e.message)}}

async function abrirUsers(){
  const us=await api("GET","users");
  $("dlgUsers").innerHTML=`<h2 style="margin-bottom:12px">Utilizadores</h2>
  ${us.map(u=>`<div class="occ row"><div><b>${esc(u.nome)}</b> <span class="sub">${esc(u.user)} · ${u.role==="admin"?"administrador":"professor"}</span></div>
  <div><button class="ghost" onclick="resetPass('${u.id}')">Nova senha</button>${u.id!==me.id?`<button class="ghost" style="color:var(--red)" onclick="delUser('${u.id}')">Eliminar</button>`:""}</div></div>`).join("")}
  <form id="fU" onsubmit="return false" style="margin-top:14px"><h3 style="font-size:1rem;margin-bottom:8px">Novo utilizador</h3>
  <div class="grid">${inp("nome","Nome","")}${inp("user","Utilizador","")}${inp("pass","Palavra-passe provisória (mín. 6)","","password")}
  <label>Perfil<select name="role"><option value="professor">Professor</option><option value="admin">Administrador</option></select></label></div>
  <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" onclick="$('dlgUsers').close()">Fechar</button><button class="primary" type="button" onclick="addUser()">Criar utilizador</button></div></form>`;
  if(!$("dlgUsers").open)$("dlgUsers").showModal()}
async function addUser(){try{await api("POST","users",Object.fromEntries(new FormData($("fU"))));toast("Utilizador criado");abrirUsers()}catch(e){toast(e.message)}}
async function resetPass(id){const p=prompt("Nova palavra-passe provisória (mín. 6 caracteres):");if(!p)return;try{await api("PUT","users/"+id,{pass:p});toast("Palavra-passe redefinida")}catch(e){toast(e.message)}}
async function delUser(id){if(!confirm("Eliminar este utilizador?"))return;try{await api("DELETE","users/"+id);toast("Utilizador eliminado");abrirUsers()}catch(e){toast(e.message)}}

/* ===== v3: fotos e filtros de ocorrências ===== */
let OF={tipo:"",grav:"",de:"",ate:"",q:""};
const filtrarOcc=l=>l.filter(o=>(!OF.tipo||o.tipo===OF.tipo)&&(!OF.grav||o.gravidade===OF.grav)&&(!OF.de||o.data>=OF.de)&&(!OF.ate||o.data<=OF.ate)).sort((x,y)=>y.data.localeCompare(x.data));
const setOF=(k,v)=>{OF[k]=v;render()};
const limparOF=()=>{OF={tipo:"",grav:"",de:"",ate:"",q:""};render()};
function barraOcc(global){
  const op=(arr,v,t)=>`<option value="">${t}</option>`+arr.map(x=>`<option ${x===v?"selected":""}>${x}</option>`).join("");
  const dt=(k,l)=>`<label style="margin:0;flex:1 1 130px">${l}<input type="date" value="${OF[k]}" onchange="setOF('${k}',this.value)"></label>`;
  return `<div class="bar" style="margin:12px 0 6px;align-items:flex-end">
  ${global?`<label style="margin:0;flex:1 1 180px">Aluno<input type="search" placeholder="Nome do aluno" value="${esc(OF.q)}" onchange="setOF('q',this.value)"></label>`:""}
  <label style="margin:0;flex:1 1 150px">Tipo<select onchange="setOF('tipo',this.value)">${op(TIPOS,OF.tipo,"Todos")}</select></label>
  <label style="margin:0;flex:1 1 150px">Gravidade<select onchange="setOF('grav',this.value)">${op(GRAV,OF.grav,"Todas")}</select></label>
  ${dt("de","De")}${dt("ate","Até")}<button onclick="limparOF()">Limpar filtros</button></div>`}
function renderOccs(){
  const L=filtrarOcc(db.ocorrencias).map(o=>({o,a:db.alunos.find(x=>x.id===o.alunoId)})).filter(x=>x.a&&(!OF.q||x.a.nome.toLowerCase().includes(OF.q.toLowerCase())));
  $("app").innerHTML=`<div class="bar"><button class="ghost" onclick="go('list')">← Voltar à lista</button></div>
  <div class="sheet"><h2>Todas as ocorrências</h2>${barraOcc(true)}<div class="sub">${L.length} ocorrência(s)</div>
  ${L.length?L.map(({o,a})=>`<div class="occ"><div class="row"><div><span class="tag t-${esc(o.gravidade)}">${esc(o.gravidade)}</span> <b>${esc(o.tipo)}</b> <span class="sub">· ${fdate(o.data)}</span></div>
  <button class="ghost" onclick="go('detail','${a.id}')">${esc(a.nome)} ${esc(a.turma||"")}</button></div><div>${esc(o.descricao)}</div>
  ${o.medida?`<div class="sub"><b>Medida tomada:</b> ${esc(o.medida)}</div>`:""}</div>`).join(""):`<div class="empty">Nenhuma ocorrência com estes filtros.</div>`}</div>`}

const avatar=(a,s)=>a.fotoV?`<img class="av" style="width:${s}px;height:${s}px" src="/api/foto/${a.id}?v=${a.fotoV}" alt="">`
  :`<span class="av" style="width:${s}px;height:${s}px;font-size:${Math.round(s/2.4)}px" aria-hidden="true">${esc((a.nome||"?").trim()[0]||"?").toUpperCase()}</span>`;
function lerFoto(file){return new Promise((ok,ko)=>{const im=new Image();im.onload=()=>{const k=Math.min(1,360/Math.max(im.width,im.height)),c=document.createElement("canvas");
  c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);ok(c.toDataURL("image/jpeg",.82))};im.onerror=ko;im.src=URL.createObjectURL(file)})}
let fotoPend=null,fotoRem=false;
const _abrirAluno=abrirAluno;
abrirAluno=function(id){
  fotoPend=null;fotoRem=false;_abrirAluno(id);
  const a=db.alunos.find(x=>x.id===id)||{};
  $("fAluno").querySelector("h2").insertAdjacentHTML("afterend",`<div style="display:flex;gap:14px;align-items:center;margin-bottom:12px"><div id="fprev">${avatar(a,72)}</div>
  <div><input type="file" id="ffile" accept="image/*" aria-label="Foto do aluno" style="margin-bottom:6px">${a.fotoV?`<button type="button" class="ghost" id="frem">Remover foto</button>`:""}</div></div>`);
  $("ffile").onchange=async e=>{const f=e.target.files[0];if(!f)return;
    try{fotoPend=await lerFoto(f);fotoRem=false;$("fprev").innerHTML=`<img class="av" style="width:72px;height:72px" src="${fotoPend}" alt="">`}catch(_){toast("Não foi possível ler a imagem")}};
  if($("frem"))$("frem").onclick=()=>{fotoRem=true;fotoPend=null;$("fprev").innerHTML=avatar({nome:a.nome},72);$("frem").remove()};
};
async function guardarAluno(id){
  const f=$("fAluno");if(!f.reportValidity())return;
  const d=Object.fromEntries(new FormData(f));d.nome=d.nome.trim();
  try{const r=id?await api("PUT","alunos/"+id,d):await api("POST","alunos",d);
    if(fotoPend)await api("POST","foto/"+r.id,{img:fotoPend});else if(fotoRem&&id)await api("DELETE","foto/"+id);
    await refresh();$("dlgAluno").close();toast("Aluno guardado");id?render():go("detail",r.id)}catch(e){toast(e.message)}}

/* ===== v4: relatórios, impressão e WhatsApp ===== */
const DDI="244"; // indicativo do país (Angola)
function wa(num,nome){let d=String(num).replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.length===9)d=DDI+d;
  return "https://wa.me/"+d+"?text="+encodeURIComponent(`Bom dia. Falo da escola sobre o(a) aluno(a) ${nome}.`)}
const waLink=(num,nome)=>num?` · <a class="noprint" href="${wa(num,nome)}" target="_blank" rel="noopener">WhatsApp</a>`:"";
const periodo=()=>db.ocorrencias.filter(o=>(!OF.de||o.data>=OF.de)&&(!OF.ate||o.data<=OF.ate));
const alunoDe=id=>db.alunos.find(a=>a.id===id);
function contar(arr,f){const m={};arr.forEach(x=>{const k=f(x)||"Sem turma";m[k]=(m[k]||0)+1});return Object.entries(m)}
function barras(ent,ordenar=true){
  if(ordenar)ent.sort((a,b)=>b[1]-a[1]);
  const mx=Math.max(1,...ent.map(e=>e[1]));
  return ent.length?ent.map(([k,v])=>`<div class="brow"><span class="bl">${esc(k)}</span><span class="bt"><i style="width:${v/mx*100}%"></i></span><b>${v}</b></div>`).join(""):`<div class="sub">Sem dados neste período.</div>`}
function renderRel(){
  const O=periodo(),pt=(OF.de||OF.ate)?`${OF.de?fdate(OF.de):"início"} a ${OF.ate?fdate(OF.ate):"hoje"}`:"Todo o período";
  const porAluno=contar(O,o=>o.alunoId).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const meses=contar(O,o=>o.data.slice(0,7)).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>[k.slice(5)+"/"+k.slice(0,4),v]);
  $("app").innerHTML=`<div class="bar"><button class="ghost" onclick="go('list')">← Voltar à lista</button></div>
  <div class="plain"><div class="only-print"><b>Caderneta · Relatório de ocorrências</b> — impresso em ${new Date().toLocaleDateString("pt-PT")}</div>
  <div class="row"><h2>Relatórios</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button onclick="window.print()">Imprimir relatório</button><button onclick="exportarCSV()">Exportar CSV</button></div></div>
  <div class="bar" style="margin-top:12px;align-items:flex-end"><label style="margin:0;flex:1 1 140px">De<input type="date" value="${OF.de}" onchange="setOF('de',this.value)"></label>
  <label style="margin:0;flex:1 1 140px">Até<input type="date" value="${OF.ate}" onchange="setOF('ate',this.value)"></label><button onclick="limparOF()">Todo o período</button></div>
  <div class="sub">Período: ${pt}</div>
  <div class="cards"><div class="card"><b>${db.alunos.length}</b>alunos</div><div class="card"><b>${O.length}</b>ocorrências</div>
  <div class="card"><b>${O.filter(o=>o.gravidade==="Grave").length}</b>graves</div><div class="card"><b>${O.filter(o=>o.tipo==="Elogio"||o.gravidade==="Elogio").length}</b>elogios</div></div>
  <h3>Por tipo</h3>${barras(contar(O,o=>o.tipo))}
  <h3 style="margin-top:18px">Por gravidade</h3>${barras(contar(O,o=>o.gravidade))}
  <h3 style="margin-top:18px">Por turma</h3>${barras(contar(O,o=>(alunoDe(o.alunoId)||{}).turma))}
  <h3 style="margin-top:18px">Por mês</h3>${barras(meses,false)}
  <h3 style="margin-top:18px">Alunos com mais ocorrências</h3>
  ${porAluno.length?porAluno.map(([id,n])=>{const a=alunoDe(id)||{nome:"(aluno eliminado)"};return `<div class="occ row"><span>${esc(a.nome)} <span class="sub">${esc(a.turma||"")}</span></span><span><b>${n}</b> <button class="ghost noprint" onclick="go('detail','${id}')">Ver ficha</button></span></div>`}).join(""):`<div class="sub">Sem dados neste período.</div>`}
  </div>`}
function exportarCSV(){
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const L=[["Aluno","Turma","Data","Tipo","Gravidade","Descrição","Medida tomada"].map(q).join(";")];
  periodo().sort((x,y)=>y.data.localeCompare(x.data)).forEach(o=>{const a=alunoDe(o.alunoId)||{};L.push([a.nome,a.turma,fdate(o.data),o.tipo,o.gravidade,o.descricao,o.medida].map(q).join(";"))});
  const l=document.createElement("a");l.href=URL.createObjectURL(new Blob(["\ufeff"+L.join("\r\n")],{type:"text/csv;charset=utf-8"}));l.download="ocorrencias.csv";l.click()}

/* ===== v5: administração, turmas, presenças, anexos, painel ===== */
document.body.insertAdjacentHTML("beforeend",'<dialog id="dlgAdm"></dialog>');
const admShow=h=>{$("dlgAdm").innerHTML=h;if(!$("dlgAdm").open)$("dlgAdm").showModal()};
const voltar=`<button type="button" onclick="abrirAdmin()">← Administração</button>`;
function abrirAdmin(){admShow(`<div class="row" style="margin-bottom:4px"><h2>Administração</h2><button class="ghost" onclick="$('dlgAdm').close()">Fechar</button></div><p class="sub" style="margin:0 0 16px">Escolha o que quer gerir.</p><div class="adm">
  ${mi("alunos","Utilizadores","Criar contas e definir perfis","$('dlgAdm').close();abrirUsers()")}${mi("turmas","Turmas","Cadastrar turmas e diretores","admTurmas()")}${mi("disc","Disciplinas","Disciplinas e professores","admDisc()")}
  ${mi("adm","Regras de avaliação","Pesos, escala e nota mínima","admCfg()")}${mi("rec","Reciclagem","Recuperar alunos eliminados","admRec()")}${mi("log","Histórico","Quem alterou o quê e quando","admLog()")}</div>`)}
function admTurmas(){const T=db.turmas||[];admShow(`<h2 style="margin-bottom:12px">Turmas</h2>
  ${T.length?T.map(t=>`<div class="occ row"><span><b>${esc(t.nome)}</b> <span class="sub">${esc(t.ano||"")} · DT: ${esc(t.diretor||"—")} · ${db.alunos.filter(a=>a.turma===t.nome).length} aluno(s)</span></span>
  <button class="ghost" style="color:var(--red)" onclick="delTurma('${t.id}')">Eliminar</button></div>`).join(""):`<div class="empty">Ainda não há turmas.</div>`}
  <form id="fT" onsubmit="return false"><div class="grid">${inp("nome","Turma (ex.: 7ª A)","")}${inp("ano","Ano letivo",new Date().getFullYear())}${inp("diretor","Diretor de turma","")}</div>
  <div style="display:flex;gap:8px;justify-content:flex-end">${voltar}<button class="primary" type="button" onclick="addTurma()">Criar turma</button></div></form>`)}
async function addTurma(){try{await api("POST","turmas",Object.fromEntries(new FormData($("fT"))));await refresh();toast("Turma criada");admTurmas()}catch(e){toast(e.message)}}
async function delTurma(id){if(!confirm("Eliminar esta turma? Os alunos mantêm o nome da turma."))return;try{await api("DELETE","turmas/"+id);await refresh();admTurmas()}catch(e){toast(e.message)}}
async function admRec(){const L=await api("GET","reciclagem");admShow(`<h2 style="margin-bottom:12px">Alunos eliminados</h2><p class="sub" style="margin-top:0">Ficam aqui 30 dias e depois são apagados definitivamente.</p>
  ${L.length?L.map(a=>`<div class="occ row"><span><b>${esc(a.nome)}</b> <span class="sub">${esc(a.turma||"")} · eliminado em ${new Date(a.eliminado).toLocaleDateString("pt-PT")}</span></span><button onclick="restaurar('${a.id}')">Restaurar</button></div>`).join(""):`<div class="empty">Nenhum aluno na reciclagem.</div>`}
  <div style="margin-top:12px">${voltar}</div>`)}
async function restaurar(id){try{await api("POST","restaurar/"+id);await refresh();toast("Aluno restaurado");admRec()}catch(e){toast(e.message)}}
async function admLog(){const L=await api("GET","log");admShow(`<h2 style="margin-bottom:12px">Histórico de alterações</h2><div style="max-height:55vh;overflow:auto">
  ${L.length?L.map(x=>`<div class="occ"><span class="sub">${new Date(x.t).toLocaleString("pt-PT")}</span><br><b>${esc(x.u)}</b> ${esc(x.a)} · ${esc(x.d)}</div>`).join(""):`<div class="empty">Sem registos.</div>`}</div><div style="margin-top:12px">${voltar}</div>`)}

const _aa5=abrirAluno;
abrirAluno=function(id){_aa5(id);const t=$("fAluno").querySelector("[name=turma]");
  if(t){t.setAttribute("list","dlT");t.insertAdjacentHTML("afterend",`<datalist id="dlT">${(db.turmas||[]).map(x=>`<option value="${esc(x.nome)}">`).join("")}</datalist>`)}};

let PR={turma:"",data:new Date().toISOString().slice(0,10)};
function renderPres(){
  const turmas=[...new Set([...(db.turmas||[]).map(t=>t.nome),...db.alunos.map(a=>a.turma).filter(Boolean)])].sort();
  const al=PR.turma?db.alunos.filter(a=>a.turma===PR.turma).sort((a,b)=>a.nome.localeCompare(b.nome)):[];
  const est=id=>((db.presencas||[]).find(p=>p.alunoId===id&&p.data===PR.data)||{estado:"P"}).estado;
  const op=(a,v,t)=>`<option value="${v}" ${est(a.id)===v?"selected":""}>${t}</option>`;
  $("app").innerHTML=`<div class="bar"><button class="ghost" onclick="go('list')">← Voltar à lista</button></div><div class="sheet"><h2>Presenças</h2>
  <div class="bar" style="margin-top:12px"><label style="margin:0;flex:1 1 160px">Turma<select onchange="PR.turma=this.value;render()"><option value="">Escolha a turma</option>${turmas.map(t=>`<option ${t===PR.turma?"selected":""}>${esc(t)}</option>`).join("")}</select></label>
  <label style="margin:0;flex:1 1 150px">Data<input type="date" value="${PR.data}" onchange="PR.data=this.value;render()"></label></div>
  ${al.length?`<form id="fPr" onsubmit="return false">${al.map(a=>`<div class="occ row"><span>${esc(a.nome)}</span><select name="${a.id}" style="width:auto">${op(a,"P","Presente")}${op(a,"F","Falta")}${op(a,"J","Falta justificada")}</select></div>`).join("")}
  <div style="text-align:right;margin-top:12px"><button class="primary" type="button" onclick="guardarPres()">Guardar presenças</button></div></form>`:`<div class="empty">${PR.turma?"Esta turma não tem alunos.":"Escolha uma turma para marcar as presenças."}</div>`}</div>`}
async function guardarPres(){const m={};new FormData($("fPr")).forEach((v,k)=>{if(v!=="P")m[k]=v});
  try{await api("POST","presencas/dia",{turma:PR.turma,data:PR.data,marcas:m});await refresh();toast("Presenças guardadas");render()}catch(e){toast(e.message)}}
function resumoFaltas(id){const P=(db.presencas||[]).filter(p=>p.alunoId===id),f=P.filter(p=>p.estado==="F").length;
  return P.length?`${f} injustificada(s) · ${P.length-f} justificada(s)`:"Sem faltas registadas"}

const lerArq=f=>new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=ko;r.readAsDataURL(f)});
const _ao=abrirOcc;
abrirOcc=function(alunoId,id){_ao(alunoId,id);$("fOcc").lastElementChild.insertAdjacentHTML("beforebegin",`<label>Anexos (imagens ou PDF, até 5 MB cada)<input type="file" id="fAnx" multiple accept="image/*,application/pdf"></label>`)};
guardarOcc=async function(alunoId,id){
  const f=$("fOcc");if(!f.reportValidity())return;const d=Object.fromEntries(new FormData(f));
  try{const r=id?await api("PUT","ocorrencias/"+id,d):await api("POST","ocorrencias",{...d,alunoId});
    for(const file of $("fAnx").files)await api("POST","anexo/"+r.id,{nome:file.name,data:await lerArq(file)});
    await refresh();$("dlgOcc").close();toast("Ocorrência guardada");render()}catch(e){toast(e.message)}};
const anexosHtml=o=>(o.anexos||[]).map(x=>`<div class="sub">📎 <a href="/api/anexo/${x.id}" target="_blank" rel="noopener">${esc(x.nome)}</a>${canEditOcc(o)?` <button class="ghost noprint" style="min-height:0;padding:0 6px;color:var(--red)" onclick="delAnexo('${x.id}')">remover</button>`:""}</div>`).join("");
async function delAnexo(id){if(!confirm("Remover este anexo?"))return;try{await api("DELETE","anexo/"+id);await refresh();render()}catch(e){toast(e.message)}}

function painel(){
  const h=new Date(),hoje=h.toISOString().slice(0,10),d7=new Date(h-7*864e5).toISOString().slice(0,10),d30=new Date(h-30*864e5).toISOString().slice(0,10);
  const O=db.ocorrencias,rec=[...O].sort((x,y)=>y.data.localeCompare(x.data)).slice(0,5);
  return `<div class="hello"><div><h2>Olá, ${esc(me.nome.split(" ")[0])} 👋</h2><div class="sub">${new Date().toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div></div><div class="plain" style="margin-bottom:12px"><div class="cards" style="margin:0 0 10px"><div class="card"><b>${db.alunos.length}</b>alunos</div>
  <div class="card"><b>${O.filter(o=>o.data>=d7).length}</b>ocorrências (7 dias)</div><div class="card"><b>${O.filter(o=>o.gravidade==="Grave"&&o.data>=d30).length}</b>graves (30 dias)</div>
  <div class="card"><b>${(db.presencas||[]).filter(p=>p.data===hoje).length}</b>faltas hoje</div></div>
  ${rec.length?`<div class="sub" style="margin-bottom:4px">Últimas ocorrências</div>`+rec.map(o=>{const a=alunoDe(o.alunoId)||{};return `<div class="row" style="padding:3px 0"><span><span class="tag t-${esc(o.gravidade)}">${esc(o.gravidade)}</span> ${esc(a.nome||"")} <span class="sub">· ${esc(o.tipo)} · ${fdate(o.data)}</span></span><button class="ghost" onclick="go('detail','${a.id}')">Ver</button></span></div>`}).join(""):""}</div>`}
if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});

/* ===== v6: disciplinas, notas, pautas e boletins ===== */
const CFG=()=>Object.assign({mac:1,pp:1,pt:1,max:20,min:10,maxNeg:2,casas:1},db.config||{});
const rnd=(v,c)=>Math.round(v*10**c.casas)/10**c.casas;
const f=v=>v==null?"—":String(v).replace(".",",");
function mediaT(n){const c=CFG();let s=0,w=0;for(const k of["mac","pp","pt"]){if(!c[k])continue;if(!n||n[k]==null)return null;s+=n[k]*c[k];w+=c[k]}return w?rnd(s/w,c):null}
const discDe=a=>(db.disciplinas||[]).filter(d=>!d.classe||d.classe.toLowerCase()===String(a.classe||"").trim().toLowerCase());
function boletimDe(a){
  const c=CFG(),linhas=discDe(a).map(d=>{
    const t=[1,2,3].map(i=>mediaT((db.notas||[]).find(n=>n.alunoId===a.id&&n.disciplinaId===d.id&&n.trimestre===i)));
    return{d,t,final:t.every(x=>x!=null)?rnd(t.reduce((p,x)=>p+x,0)/3,c):null}});
  const fin=linhas.filter(l=>l.final!=null),neg=fin.filter(l=>l.final<c.min).length;
  const sit=!linhas.length?"—":fin.length<linhas.length?"Em curso":neg===0?"Aprovado":neg<=c.maxNeg?"Recurso":"Reprovado";
  return{linhas,sit,neg,geral:fin.length?rnd(fin.reduce((p,l)=>p+l.final,0)/fin.length,c):null}}
const tabelaBol=(B,c)=>`<div style="overflow-x:auto"><table class="tb"><tr><th>Disciplina</th><th>1.º Trim.</th><th>2.º Trim.</th><th>3.º Trim.</th><th>Final</th></tr>
  ${B.linhas.map(l=>`<tr><td>${esc(l.d.nome)}</td>${[...l.t,l.final].map(v=>`<td class="${v!=null&&v<c.min?"neg":""}">${f(v)}</td>`).join("")}</tr>`).join("")}</table></div>`;
function notasSheet(a){const B=boletimDe(a),c=CFG();
  return `<div class="sheet" style="margin-top:16px"><div class="row"><h3>Notas</h3><button onclick="imprimirBoletim('${a.id}')">Imprimir boletim</button></div>
  ${B.linhas.length?tabelaBol(B,c)+`<div class="sub" style="margin-top:8px">Média geral: <b>${f(B.geral)}</b> · Situação: <b>${B.sit}</b></div>`:`<div class="empty">Não há disciplinas para a classe deste aluno. O administrador cria-as em Administração.</div>`}</div>`}
function imprimirBoletim(id){
  const a=db.alunos.find(x=>x.id===id),B=boletimDe(a),c=CFG();document.getElementById("bol")?.remove();
  document.body.insertAdjacentHTML("beforeend",`<div id="bol"><h2 style="text-align:center">Caderneta · Boletim de Notas</h2><p style="text-align:center">Ano letivo ${esc(a.anoLetivo||"")}</p>
  <p><b>Aluno:</b> ${esc(a.nome)}<br><b>Nº de processo:</b> ${esc(a.processo||"—")} · <b>Classe:</b> ${esc(a.classe||"—")} · <b>Turma:</b> ${esc(a.turma||"—")}<br><b>Encarregado de educação:</b> ${esc(a.encNome||"—")}</p>
  ${tabelaBol(B,c)}<p><b>Média geral:</b> ${f(B.geral)} · <b>Situação:</b> ${B.sit} · <b>Faltas:</b> ${resumoFaltas(a.id)}</p><p>Escala 0–${c.max} · Nota mínima ${c.min}</p>
  <div style="display:flex;justify-content:space-between;margin-top:60px"><span>O Diretor de Turma<br>______________________</span><span>O Encarregado de Educação<br>______________________</span></div></div>`);
  document.body.classList.add("bol");
  const fim=()=>{document.body.classList.remove("bol");document.getElementById("bol")?.remove();window.removeEventListener("afterprint",fim)};
  window.addEventListener("afterprint",fim);window.print()}

let NT={modo:"lancar",turma:"",disc:"",tri:1,ptri:"final"};
const podeLancar=d=>isAdmin()||(d.professores||[]).includes(me.id);
function calcLinha(id){const g=k=>{const v=document.querySelector(`[name="${id}|${k}"]`).value;return v===""?null:Number(v)};
  $("m-"+id).innerHTML=`<b>${f(mediaT({mac:g("mac"),pp:g("pp"),pt:g("pt")}))}</b>`}
function renderNotas(){
  const c=CFG(),turmas=[...new Set([...(db.turmas||[]).map(t=>t.nome),...db.alunos.map(a=>a.turma).filter(Boolean)])].sort();
  const al=NT.turma?db.alunos.filter(a=>a.turma===NT.turma).sort((x,y)=>x.nome.localeCompare(y.nome)):[];
  const lb=(t,h)=>`<label style="margin:0;flex:1 1 150px">${t}${h}</label>`,vazio=t=>`<div class="empty">${t}</div>`;
  const selT=lb("Turma",`<select onchange="NT.turma=this.value;render()"><option value="">Escolha a turma</option>${turmas.map(t=>`<option ${t===NT.turma?"selected":""}>${esc(t)}</option>`).join("")}</select>`);
  let extra="",corpo="";
  if(NT.modo==="lancar"){
    const ds=(db.disciplinas||[]).filter(podeLancar),d=ds.find(x=>x.id===NT.disc);
    extra=lb("Disciplina",`<select onchange="NT.disc=this.value;render()"><option value="">Escolha</option>${ds.map(x=>`<option value="${x.id}" ${x.id===NT.disc?"selected":""}>${esc(x.nome)}${x.classe?" ("+esc(x.classe)+")":""}</option>`).join("")}</select>`)
      +lb("Trimestre",`<select onchange="NT.tri=+this.value;render()">${[1,2,3].map(i=>`<option value="${i}" ${i===NT.tri?"selected":""}>${i}.º trimestre</option>`).join("")}</select>`);
    const nt=a=>(db.notas||[]).find(n=>n.alunoId===a.id&&n.disciplinaId===NT.disc&&n.trimestre===NT.tri)||{};
    corpo=!ds.length?vazio("Não tem disciplinas atribuídas. Peça ao administrador para o associar a uma disciplina."):!(d&&al.length)?vazio("Escolha a turma e a disciplina."):
    `<form id="fNt" onsubmit="return false"><p class="sub">Notas de 0 a ${c.max}. A média do trimestre é calculada automaticamente (MAC ${c.mac} · PP ${c.pp} · PT ${c.pt}).</p>
    <div style="overflow-x:auto"><table class="tb"><tr><th>Aluno</th><th>MAC</th><th>PP</th><th>PT</th><th>Média</th></tr>
    ${al.map(a=>`<tr><td>${esc(a.nome)}</td>${["mac","pp","pt"].map(k=>`<td><input type="number" step="any" min="0" max="${c.max}" name="${a.id}|${k}" value="${nt(a)[k]??""}" oninput="calcLinha('${a.id}')" aria-label="${k.toUpperCase()} de ${esc(a.nome)}"></td>`).join("")}<td id="m-${a.id}"><b>${f(mediaT(nt(a)))}</b></td></tr>`).join("")}</table></div>
    <div style="text-align:right;margin-top:12px"><button class="primary" type="button" onclick="guardarNotas()">Guardar notas</button></div></form>`;
  }else{
    const B=al.map(a=>({a,b:boletimDe(a)})),dn=new Map(),fin=NT.ptri==="final";B.forEach(({b})=>b.linhas.forEach(l=>dn.set(l.d.id,l.d.nome)));const cols=[...dn];
    extra=lb("Período",`<select onchange="NT.ptri=this.value;render()"><option value="final" ${fin?"selected":""}>Final</option>${[1,2,3].map(i=>`<option value="${i}" ${NT.ptri==i?"selected":""}>${i}.º trimestre</option>`).join("")}</select>`)+`<button onclick="window.print()">Imprimir pauta</button>`;
    corpo=!al.length?vazio("Escolha uma turma com alunos."):`<div class="only-print"><b>Pauta · ${esc(NT.turma)} · ${fin?"Final":NT.ptri+".º trimestre"}</b></div><div style="overflow-x:auto"><table class="tb"><tr><th>Aluno</th>${cols.map(([,n])=>`<th>${esc(n)}</th>`).join("")}${fin?"<th>Média</th><th>Situação</th>":""}</tr>
    ${B.map(({a,b})=>`<tr><td>${esc(a.nome)}</td>${cols.map(([id])=>{const l=b.linhas.find(x=>x.d.id===id),v=l?(fin?l.final:l.t[+NT.ptri-1]):null;return `<td class="${v!=null&&v<c.min?"neg":""}">${l?f(v):"·"}</td>`}).join("")}${fin?`<td><b>${f(b.geral)}</b></td><td>${b.sit}</td>`:""}</tr>`).join("")}</table></div>`}
  $("app").innerHTML=`<div class="bar"><button class="ghost" onclick="go('list')">← Voltar à lista</button><button class="${NT.modo==="lancar"?"primary":""}" onclick="NT.modo='lancar';render()">Lançar notas</button><button class="${NT.modo==="pauta"?"primary":""}" onclick="NT.modo='pauta';render()">Pauta da turma</button></div>
  <div class="sheet"><h2>${NT.modo==="lancar"?"Lançamento de notas":"Pauta da turma"}</h2><div class="bar" style="margin-top:12px;align-items:flex-end">${selT}${extra}</div>${corpo}</div>`}
async function guardarNotas(){const L={};new FormData($("fNt")).forEach((v,k)=>{const[id,c]=k.split("|");(L[id]=L[id]||{})[c]=v});
  try{await api("POST","notas",{disciplinaId:NT.disc,turma:NT.turma,trimestre:NT.tri,linhas:L});await refresh();toast("Notas guardadas");render()}catch(e){toast(e.message)}}

async function admDisc(editId){
  const us=(await api("GET","users")).filter(u=>u.role!=="admin"),D=db.disciplinas||[],e=D.find(x=>x.id===editId)||{};
  admShow(`<h2 style="margin-bottom:12px">Disciplinas</h2>${D.length?D.map(d=>`<div class="occ row"><span><b>${esc(d.nome)}</b> <span class="sub">${esc(d.classe||"todas as classes")} · ${(d.professores||[]).map(id=>(us.find(u=>u.id===id)||{}).nome).filter(Boolean).join(", ")||"sem professor"}</span></span>
  <span><button class="ghost" onclick="admDisc('${d.id}')">Editar</button><button class="ghost" style="color:var(--red)" onclick="delDisc('${d.id}')">Eliminar</button></span></div>`).join(""):`<div class="empty">Ainda não há disciplinas.</div>`}
  <form id="fD" onsubmit="return false" style="margin-top:12px"><h3 style="font-size:1rem;margin-bottom:8px">${e.id?"Editar disciplina":"Nova disciplina"}</h3><div class="grid">${inp("nome","Disciplina",e.nome||"")}${inp("classe","Classe (vazio = todas)",e.classe||"")}</div>
  <div style="margin-bottom:10px"><b style="font-size:.9rem">Professores</b><br>${us.length?us.map(u=>`<label style="display:inline-flex;gap:6px;align-items:center;margin:4px 12px 0 0;font-weight:400"><input type="checkbox" name="prof" value="${u.id}" style="width:auto;margin:0" ${(e.professores||[]).includes(u.id)?"checked":""}>${esc(u.nome)}</label>`).join(""):`<span class="sub">Crie primeiro utilizadores com perfil Professor.</span>`}</div>
  <div style="display:flex;gap:8px;justify-content:flex-end">${voltar}<button class="primary" type="button" onclick="saveDisc('${e.id||""}')">Guardar disciplina</button></div></form>`)}
async function saveDisc(id){const fm=$("fD"),d={nome:fm.nome.value,classe:fm.classe.value,professores:[...fm.querySelectorAll("[name=prof]:checked")].map(x=>x.value)};
  try{await api(id?"PUT":"POST","disciplinas"+(id?"/"+id:""),d);await refresh();toast("Disciplina guardada");admDisc()}catch(e){toast(e.message)}}
async function delDisc(id){if(!confirm("Eliminar esta disciplina e todas as suas notas?"))return;try{await api("DELETE","disciplinas/"+id);await refresh();admDisc()}catch(e){toast(e.message)}}
function admCfg(){const c=CFG(),n=(k,l)=>inp(k,l,c[k],"number",'step="any" min="0"');
  admShow(`<h2 style="margin-bottom:6px">Regras de avaliação</h2><p class="sub" style="margin-top:0">Nota do trimestre = média ponderada de MAC, PP e PT. Nota final = média dos 3 trimestres.</p>
  <form id="fC" onsubmit="return false"><div class="grid">${n("mac","Peso do MAC (avaliação contínua)")}${n("pp","Peso da PP (prova do professor)")}${n("pt","Peso da PT (prova trimestral)")}${n("max","Escala máxima (ex.: 20)")}${n("min","Nota mínima de aprovação")}${n("maxNeg","Negativas permitidas para recurso")}${n("casas","Casas decimais (0 ou 1)")}</div>
  <p class="sub">Aprovado: nenhuma negativa na nota final. Recurso: até ao nº de negativas indicado. Reprovado: acima disso. Ajuste ao regulamento da sua escola.</p>
  <div style="display:flex;gap:8px;justify-content:flex-end">${voltar}<button class="primary" type="button" onclick="saveCfg()">Guardar regras</button></div></form>`)}
async function saveCfg(){try{await api("PUT","config",Object.fromEntries(new FormData($("fC"))));await refresh();toast("Regras guardadas");abrirAdmin()}catch(e){toast(e.message)}}

(async()=>{try{me=await api("GET","me");await start()}catch(e){showLogin()}})();
