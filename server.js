// Caderneta v2 - servidor sem dependências (só precisa do Node.js)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const PORT=process.env.PORT||3000,DIR=__dirname,PUB=path.join(DIR,'public'),FILE=path.join(DIR,'data','db.json');
let db={users:[],alunos:[],ocorrencias:[],turmas:[],presencas:[],log:[]};
fs.mkdirSync(path.dirname(FILE),{recursive:true});
const FOTOS=path.join(DIR,'data','fotos');fs.mkdirSync(FOTOS,{recursive:true});
const ANEXOS=path.join(DIR,'data','anexos');fs.mkdirSync(ANEXOS,{recursive:true});
const BK=path.join(DIR,'backups');fs.mkdirSync(BK,{recursive:true});
if(fs.existsSync(FILE))db=JSON.parse(fs.readFileSync(FILE,'utf8'));
for(const k of['turmas','presencas','log','disciplinas','notas'])db[k]=db[k]||[];
db.config=Object.assign({mac:1,pp:1,pt:1,max:20,min:10,maxNeg:2,casas:1},db.config||{});
const save=()=>{fs.writeFileSync(FILE+'.tmp',JSON.stringify(db,null,1));fs.renameSync(FILE+'.tmp',FILE)};
const uid=()=>crypto.randomBytes(6).toString('hex');
const hash=(p,s=crypto.randomBytes(16).toString('hex'))=>s+':'+crypto.scryptSync(p,s,32).toString('hex');
const check=(p,h)=>{const a=Buffer.from(hash(p,h.split(':')[0])),b=Buffer.from(h);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const pub=u=>({id:u.id,nome:u.nome,user:u.user,role:u.role,mustChange:!!u.mustChange});
const audit=(me,a,d)=>{db.log.push({t:new Date().toISOString(),u:me.nome,a,d});if(db.log.length>2000)db.log.splice(0,db.log.length-2000)};
if(!db.users.length){const pw=crypto.randomBytes(5).toString('hex');
  db.users.push({id:uid(),nome:'Administrador',user:'admin',role:'admin',pass:hash(pw),mustChange:true});save();
  console.log('\n=== PRIMEIRA EXECUÇÃO ===\nUtilizador: admin\nPalavra-passe provisória: '+pw+'\n(Anote-a agora: só aparece desta vez. Será obrigado a trocá-la ao entrar.)\n')}
const SF=path.join(DIR,'data','sessions.json');
const sessions=new Map(fs.existsSync(SF)?JSON.parse(fs.readFileSync(SF,'utf8')):[]);
const saveS=()=>fs.writeFileSync(SF,JSON.stringify([...sessions]));const fails=new Map();
const send=(res,c,o,h={})=>{res.writeHead(c,{'Content-Type':'application/json',...h});res.end(JSON.stringify(o))};
const body=req=>new Promise(r=>{let b='';req.on('data',c=>{b+=c;if(b.length>8e6)req.destroy()});req.on('end',()=>{try{r(JSON.parse(b||'{}'))}catch{r({})}})});
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')).filter(a=>a[0]));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/manifest+json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
function serve(p,res){const f=path.join(PUB,p==='/'?'index.html':p);
  if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Não encontrado')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}
const admins=()=>db.users.filter(u=>u.role==='admin').length;

function backup(){try{
  fs.copyFileSync(FILE,path.join(BK,'db-'+new Date().toISOString().slice(0,10)+'.json'));
  const l=fs.readdirSync(BK).filter(x=>x.startsWith('db-')).sort();while(l.length>30)fs.rmSync(path.join(BK,l.shift()));
  const lim=Date.now()-30*864e5,n=db.alunos.length;db.alunos=db.alunos.filter(a=>!a.eliminado||a.eliminado>lim);
  if(db.alunos.length!==n){const ids=new Set(db.alunos.map(a=>a.id));db.ocorrencias=db.ocorrencias.filter(o=>ids.has(o.alunoId));db.presencas=db.presencas.filter(p=>ids.has(p.alunoId));db.notas=db.notas.filter(n=>ids.has(n.alunoId));save()}
}catch(e){console.error('backup:',e.message)}}
backup();setInterval(backup,6*36e5);
http.createServer(async(req,res)=>{
  const p=new URL(req.url,'http://x').pathname;
  if(!p.startsWith('/api/'))return serve(p,res);
  const seg=p.split('/').slice(2),m=req.method,b=(m==='GET'||m==='DELETE')?{}:await body(req),id=seg[1];
  const err=(c,t)=>send(res,c,{erro:t});
  try{
    if(seg[0]==='login'&&m==='POST'){
      const u=db.users.find(x=>x.user===String(b.user||'').trim().toLowerCase());
      const k=(req.socket.remoteAddress||'')+'|'+String(b.user||'').toLowerCase(),F=fails.get(k)||{n:0,ate:0};
      if(F.ate>Date.now())return err(429,'Demasiadas tentativas falhadas. Tente novamente dentro de 10 minutos.');
      if(!u||!check(String(b.pass||''),u.pass)){F.n++;if(F.n>=5){F.ate=Date.now()+6e5;F.n=0}fails.set(k,F);return err(401,'Utilizador ou palavra-passe incorretos')}
      fails.delete(k);
      const t=crypto.randomBytes(24).toString('hex');sessions.set(t,u.id);saveS();
      return send(res,200,pub(u),{'Set-Cookie':`sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`})}
    const sid=cookies(req).sid,me=db.users.find(x=>x.id===sessions.get(sid));
    if(!me)return err(401,'Sessão expirada. Entre novamente.');
    const admin=me.role==='admin',need=()=>{if(!admin){err(403,'Só o administrador pode fazer isto.');return false}return true};
    const col=seg[0];
    if(col==='me')return send(res,200,pub(me));
    if(col==='logout'){sessions.delete(sid);saveS();return send(res,200,{ok:1})}
    if(col==='data'){const at=db.alunos.filter(a=>!a.eliminado),ids=new Set(at.map(a=>a.id));
      return send(res,200,{alunos:at,ocorrencias:db.ocorrencias.filter(o=>ids.has(o.alunoId)),turmas:db.turmas,presencas:db.presencas.filter(p=>ids.has(p.alunoId)),disciplinas:db.disciplinas,notas:db.notas.filter(n=>ids.has(n.alunoId)),config:db.config})}
    if(col==='password'&&m==='POST'){
      if(!check(String(b.atual||''),me.pass))return err(400,'A palavra-passe atual está errada.');
      if(String(b.nova||'').length<6)return err(400,'A nova palavra-passe deve ter pelo menos 6 caracteres.');
      me.pass=hash(b.nova);me.mustChange=false;save();return send(res,200,{ok:1})}
    if(col==='config'&&m==='PUT'){if(!need())return;const c={};
      for(const k of['mac','pp','pt','max','min','maxNeg','casas']){const v=Number(b[k]);if(b[k]===''||!isFinite(v)||v<0)return err(400,'Valor inválido em "'+k+'".');c[k]=v}
      if(c.mac+c.pp+c.pt<=0)return err(400,'Pelo menos um peso deve ser maior que zero.');if(c.min>c.max)return err(400,'A nota mínima não pode ser maior que a escala.');
      db.config=c;audit(me,'alterou','regras de avaliação');save();return send(res,200,c)}
    if(col==='disciplinas'){if(!need())return;
      if(m==='DELETE'){db.disciplinas=db.disciplinas.filter(x=>x.id!==id);db.notas=db.notas.filter(n=>n.disciplinaId!==id);audit(me,'eliminou','disciplina');save();return send(res,200,{ok:1})}
      const nome=String(b.nome||'').trim();if(!nome)return err(400,'Indique o nome da disciplina.');
      const d={nome,classe:String(b.classe||'').trim(),professores:(Array.isArray(b.professores)?b.professores:[]).filter(x=>db.users.some(u=>u.id===x))};
      if(m==='POST')db.disciplinas.push({id:uid(),...d});else{const x=db.disciplinas.find(x=>x.id===id);if(!x)return err(404,'Não encontrada.');Object.assign(x,d)}
      audit(me,m==='POST'?'criou':'editou','disciplina: '+nome);save();return send(res,200,{ok:1})}
    if(col==='notas'&&m==='POST'){
      const{disciplinaId,turma,trimestre,linhas}=b,d=db.disciplinas.find(x=>x.id===disciplinaId),t=Number(trimestre);
      if(!d||![1,2,3].includes(t)||!linhas||typeof linhas!=='object')return err(400,'Dados inválidos.');
      if(!admin&&!(d.professores||[]).includes(me.id))return err(403,'Não está atribuído a esta disciplina.');
      const ids=new Set(db.alunos.filter(a=>!a.eliminado&&a.turma===turma).map(a=>a.id)),max=db.config.max,ups=[];
      for(const[aid,l]of Object.entries(linhas)){if(!ids.has(aid))continue;const n={};
        for(const k of['mac','pp','pt']){const raw=l[k];if(raw===''||raw==null){n[k]=null;continue}const v=Number(raw);if(!isFinite(v)||v<0||v>max)return err(400,'A nota deve estar entre 0 e '+max+'.');n[k]=v}ups.push([aid,n])}
      for(const[aid,n]of ups){let r=db.notas.find(x=>x.alunoId===aid&&x.disciplinaId===disciplinaId&&x.trimestre===t);
        if(!r){r={id:uid(),alunoId:aid,disciplinaId,trimestre:t};db.notas.push(r)}Object.assign(r,n,{por:me.id})}
      audit(me,'lançou','notas '+d.nome+' '+turma+' T'+t);save();return send(res,200,{ok:1})}
    if(col==='turmas'&&m==='POST'){if(!need())return;if(!String(b.nome||'').trim())return err(400,'Indique o nome da turma.');
      if(db.turmas.some(t=>t.nome===b.nome.trim()))return err(400,'Essa turma já existe.');
      db.turmas.push({id:uid(),nome:b.nome.trim(),ano:b.ano||'',diretor:b.diretor||''});audit(me,'criou','turma: '+b.nome);save();return send(res,200,{ok:1})}
    if(col==='turmas'&&m==='DELETE'){if(!need())return;db.turmas=db.turmas.filter(t=>t.id!==id);audit(me,'eliminou','turma');save();return send(res,200,{ok:1})}
    if(col==='presencas'&&m==='POST'){const{turma,data,marcas}=b;if(!turma||!data||typeof marcas!=='object')return err(400,'Dados inválidos.');
      const ids=db.alunos.filter(a=>!a.eliminado&&a.turma===turma).map(a=>a.id);
      db.presencas=db.presencas.filter(p=>!(p.data===data&&ids.includes(p.alunoId)));
      for(const[i2,e]of Object.entries(marcas))if(ids.includes(i2)&&(e==='F'||e==='J'))db.presencas.push({id:uid(),alunoId:i2,data,estado:e,por:me.id});
      audit(me,'registou','presenças '+turma+' '+data);save();return send(res,200,{ok:1})}
    if(col==='log'){if(!need())return;return send(res,200,db.log.slice(-300).reverse())}
    if(col==='reciclagem'){if(!need())return;return send(res,200,db.alunos.filter(a=>a.eliminado).map(a=>({id:a.id,nome:a.nome,turma:a.turma,eliminado:a.eliminado})))}
    if(col==='restaurar'&&m==='POST'){if(!need())return;const a=db.alunos.find(x=>x.id===id);if(!a)return err(404,'Não encontrado.');delete a.eliminado;audit(me,'restaurou','aluno: '+a.nome);save();return send(res,200,{ok:1})}
    if(col==='anexo'){
      if(m==='GET'){const x=db.ocorrencias.flatMap(o=>o.anexos||[]).find(a=>a.id===id);if(!x)return err(404,'Sem anexo');
        res.writeHead(200,{'Content-Type':x.tipo,'Content-Disposition':"inline; filename*=UTF-8''"+encodeURIComponent(x.nome)});return fs.createReadStream(path.join(ANEXOS,x.id)).pipe(res)}
      if(m==='POST'){const o=db.ocorrencias.find(x=>x.id===id);if(!o)return err(404,'Ocorrência não encontrada.');if(!(admin||o.autorId===me.id))return err(403,'Sem permissão.');
        const mm=/^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+\/=]+)$/.exec(b.data||'');if(!mm)return err(400,'Só são aceites imagens (JPG, PNG, WEBP) e PDF.');
        const buf=Buffer.from(mm[2],'base64');if(buf.length>5e6)return err(400,'Ficheiro acima de 5 MB.');
        const x={id:uid(),nome:String(b.nome||'anexo').slice(0,80),tipo:mm[1]};fs.writeFileSync(path.join(ANEXOS,x.id),buf);(o.anexos=o.anexos||[]).push(x);audit(me,'anexou',x.nome);save();return send(res,200,x)}
      if(m==='DELETE'){const o=db.ocorrencias.find(o=>(o.anexos||[]).some(a=>a.id===id));if(!o)return err(404,'Sem anexo');if(!(admin||o.autorId===me.id))return err(403,'Sem permissão.');
        o.anexos=o.anexos.filter(a=>a.id!==id);fs.rmSync(path.join(ANEXOS,id),{force:true});save();return send(res,200,{ok:1})}}
    if(col==='foto'){
      const f=path.join(FOTOS,String(id).replace(/[^a-z0-9]/g,'')+'.jpg');
      if(m==='GET'){if(!fs.existsSync(f))return err(404,'Sem foto');res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'private, max-age=86400'});return fs.createReadStream(f).pipe(res)}
      const a=db.alunos.find(x=>x.id===id);if(!a)return err(404,'Aluno não encontrado.');
      if(m==='POST'){const mm=/^data:image\/jpeg;base64,([A-Za-z0-9+\/=]+)$/.exec(b.img||'');if(!mm)return err(400,'Imagem inválida.');
        fs.writeFileSync(f,Buffer.from(mm[1],'base64'));a.fotoV=Date.now();save();return send(res,200,{fotoV:a.fotoV})}
      if(m==='DELETE'){fs.rmSync(f,{force:true});delete a.fotoV;save();return send(res,200,{ok:1})}}
    if(col==='alunos'||col==='ocorrencias'){
      const L=db[col];
      if(m==='POST'){
        if(col==='alunos'&&!String(b.nome||'').trim())return err(400,'O nome é obrigatório.');
        if(col==='ocorrencias'&&!db.alunos.some(a=>a.id===b.alunoId))return err(400,'Aluno inválido.');
        const{anexos:_a,eliminado:_e,fotoV:_f,...b2}=b;const r={...b2,id:uid(),criado:new Date().toISOString()};if(col==='ocorrencias')r.autorId=me.id;
        L.push(r);audit(me,'criou',col==='alunos'?'aluno: '+r.nome:'ocorrência '+r.tipo+' de '+(db.alunos.find(a=>a.id===r.alunoId)||{}).nome);save();return send(res,200,r)}
      const r=L.find(x=>x.id===id);if(!r)return err(404,'Registo não encontrado.');
      const owner=col==='alunos'||admin||r.autorId===me.id;
      if(m==='PUT'){if(!owner)return err(403,'Só pode editar as suas ocorrências.');
        const{autorId,alunoId,criado,anexos,eliminado,fotoV,...d}=b;Object.assign(r,d,{id:r.id});audit(me,'editou',col==='alunos'?'aluno: '+r.nome:'ocorrência '+r.tipo);save();return send(res,200,r)}
      if(m==='DELETE'){
        if(col==='alunos'){if(!need())return;r.eliminado=Date.now();audit(me,'eliminou','aluno: '+r.nome)}
        else{if(!owner)return err(403,'Só pode eliminar as suas ocorrências.');audit(me,'eliminou','ocorrência '+r.tipo);db.ocorrencias=db.ocorrencias.filter(x=>x.id!==id)}
        save();return send(res,200,{ok:1})}}
    if(col==='users'){
      if(!need())return;
      if(m==='GET')return send(res,200,db.users.map(pub));
      if(m==='POST'){const user=String(b.user||'').trim().toLowerCase();
        if(!b.nome||!user||String(b.pass||'').length<6)return err(400,'Preencha nome, utilizador e palavra-passe (mín. 6).');
        if(db.users.some(u=>u.user===user))return err(400,'Esse utilizador já existe.');
        db.users.push({id:uid(),nome:b.nome.trim(),user,role:b.role==='admin'?'admin':'professor',pass:hash(b.pass),mustChange:true});audit(me,'criou','utilizador: '+user);save();return send(res,200,{ok:1})}
      const u=db.users.find(x=>x.id===id);if(!u)return err(404,'Utilizador não encontrado.');
      if(m==='PUT'){if(b.pass){if(String(b.pass).length<6)return err(400,'Mín. 6 caracteres.');u.pass=hash(b.pass);u.mustChange=true}save();return send(res,200,{ok:1})}
      if(m==='DELETE'){if(u.id===me.id)return err(400,'Não pode eliminar a sua própria conta.');
        db.users=db.users.filter(x=>x.id!==id);for(const[t,i]of sessions)if(i===id)sessions.delete(t);saveS();save();return send(res,200,{ok:1})}}
    if(col==='import'&&m==='POST'){if(!need())return;db.alunos=b.alunos||[];db.ocorrencias=b.ocorrencias||[];if(b.turmas)db.turmas=b.turmas;if(b.presencas)db.presencas=b.presencas;if(b.disciplinas)db.disciplinas=b.disciplinas;if(b.notas)db.notas=b.notas;if(b.config)db.config=b.config;audit(me,'importou','dados');save();return send(res,200,{ok:1})}
    err(404,'Rota não encontrada.');
  }catch(e){console.error(e);err(500,'Erro no servidor.')}
}).listen(PORT,'0.0.0.0',()=>{
  console.log(`\nCaderneta Digital v6.4 a funcionar!\n  Neste PC:      http://localhost:${PORT}`);
  for(const l of Object.values(os.networkInterfaces()))for(const i of l)if(i.family==='IPv4'&&!i.internal)console.log(`  Outros aparelhos (mesma rede): http://${i.address}:${PORT}`)});
