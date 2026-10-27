// Caderneta v2 - servidor sem dependências (só precisa do Node.js)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const PORT=process.env.PORT||3000,DIR=__dirname,PUB=path.join(DIR,'public'),FILE=path.join(DIR,'data','db.json');
let db={users:[],alunos:[],ocorrencias:[]};
fs.mkdirSync(path.dirname(FILE),{recursive:true});
if(fs.existsSync(FILE))db=JSON.parse(fs.readFileSync(FILE,'utf8'));
const save=()=>{fs.writeFileSync(FILE+'.tmp',JSON.stringify(db,null,1));fs.renameSync(FILE+'.tmp',FILE)};
const uid=()=>crypto.randomBytes(6).toString('hex');
const hash=(p,s=crypto.randomBytes(16).toString('hex'))=>s+':'+crypto.scryptSync(p,s,32).toString('hex');
const check=(p,h)=>{const a=Buffer.from(hash(p,h.split(':')[0])),b=Buffer.from(h);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
const pub=u=>({id:u.id,nome:u.nome,user:u.user,role:u.role,mustChange:!!u.mustChange});
if(!db.users.length){db.users.push({id:uid(),nome:'Administrador',user:'admin',role:'admin',pass:hash('admin123'),mustChange:true});save();console.log('Utilizador inicial criado: admin / admin123')}
const sessions=new Map();
const send=(res,c,o,h={})=>{res.writeHead(c,{'Content-Type':'application/json',...h});res.end(JSON.stringify(o))};
const body=req=>new Promise(r=>{let b='';req.on('data',c=>{b+=c;if(b.length>5e6)req.destroy()});req.on('end',()=>{try{r(JSON.parse(b||'{}'))}catch{r({})}})});
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')).filter(a=>a[0]));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'};
function serve(p,res){const f=path.join(PUB,p==='/'?'index.html':p);
  if(!f.startsWith(PUB)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Não encontrado')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}
const admins=()=>db.users.filter(u=>u.role==='admin').length;

http.createServer(async(req,res)=>{
  const p=new URL(req.url,'http://x').pathname;
  if(!p.startsWith('/api/'))return serve(p,res);
  const seg=p.split('/').slice(2),m=req.method,b=(m==='GET'||m==='DELETE')?{}:await body(req),id=seg[1];
  const err=(c,t)=>send(res,c,{erro:t});
  try{
    if(seg[0]==='login'&&m==='POST'){
      const u=db.users.find(x=>x.user===String(b.user||'').trim().toLowerCase());
      if(!u||!check(String(b.pass||''),u.pass))return err(401,'Utilizador ou palavra-passe incorretos');
      const t=crypto.randomBytes(24).toString('hex');sessions.set(t,u.id);
      return send(res,200,pub(u),{'Set-Cookie':`sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`})}
    const sid=cookies(req).sid,me=db.users.find(x=>x.id===sessions.get(sid));
    if(!me)return err(401,'Sessão expirada. Entre novamente.');
    const admin=me.role==='admin',need=()=>{if(!admin){err(403,'Só o administrador pode fazer isto.');return false}return true};
    const col=seg[0];
    if(col==='me')return send(res,200,pub(me));
    if(col==='logout'){sessions.delete(sid);return send(res,200,{ok:1})}
    if(col==='data')return send(res,200,{alunos:db.alunos,ocorrencias:db.ocorrencias});
    if(col==='password'&&m==='POST'){
      if(!check(String(b.atual||''),me.pass))return err(400,'A palavra-passe atual está errada.');
      if(String(b.nova||'').length<6)return err(400,'A nova palavra-passe deve ter pelo menos 6 caracteres.');
      me.pass=hash(b.nova);me.mustChange=false;save();return send(res,200,{ok:1})}
    if(col==='alunos'||col==='ocorrencias'){
      const L=db[col];
      if(m==='POST'){
        if(col==='alunos'&&!String(b.nome||'').trim())return err(400,'O nome é obrigatório.');
        if(col==='ocorrencias'&&!db.alunos.some(a=>a.id===b.alunoId))return err(400,'Aluno inválido.');
        const r={...b,id:uid(),criado:new Date().toISOString()};if(col==='ocorrencias')r.autorId=me.id;
        L.push(r);save();return send(res,200,r)}
      const r=L.find(x=>x.id===id);if(!r)return err(404,'Registo não encontrado.');
      const owner=col==='alunos'||admin||r.autorId===me.id;
      if(m==='PUT'){if(!owner)return err(403,'Só pode editar as suas ocorrências.');
        const{autorId,alunoId,criado,...d}=b;Object.assign(r,d,{id:r.id});save();return send(res,200,r)}
      if(m==='DELETE'){
        if(col==='alunos'){if(!need())return;db.alunos=db.alunos.filter(x=>x.id!==id);db.ocorrencias=db.ocorrencias.filter(o=>o.alunoId!==id)}
        else{if(!owner)return err(403,'Só pode eliminar as suas ocorrências.');db.ocorrencias=db.ocorrencias.filter(x=>x.id!==id)}
        save();return send(res,200,{ok:1})}}
    if(col==='users'){
      if(!need())return;
      if(m==='GET')return send(res,200,db.users.map(pub));
      if(m==='POST'){const user=String(b.user||'').trim().toLowerCase();
        if(!b.nome||!user||String(b.pass||'').length<6)return err(400,'Preencha nome, utilizador e palavra-passe (mín. 6).');
        if(db.users.some(u=>u.user===user))return err(400,'Esse utilizador já existe.');
        db.users.push({id:uid(),nome:b.nome.trim(),user,role:b.role==='admin'?'admin':'professor',pass:hash(b.pass),mustChange:true});save();return send(res,200,{ok:1})}
      const u=db.users.find(x=>x.id===id);if(!u)return err(404,'Utilizador não encontrado.');
      if(m==='PUT'){if(b.pass){if(String(b.pass).length<6)return err(400,'Mín. 6 caracteres.');u.pass=hash(b.pass);u.mustChange=true}save();return send(res,200,{ok:1})}
      if(m==='DELETE'){if(u.id===me.id)return err(400,'Não pode eliminar a sua própria conta.');
        db.users=db.users.filter(x=>x.id!==id);for(const[t,i]of sessions)if(i===id)sessions.delete(t);save();return send(res,200,{ok:1})}}
    if(col==='import'&&m==='POST'){if(!need())return;db.alunos=b.alunos||[];db.ocorrencias=b.ocorrencias||[];save();return send(res,200,{ok:1})}
    err(404,'Rota não encontrada.');
  }catch(e){console.error(e);err(500,'Erro no servidor.')}
}).listen(PORT,'0.0.0.0',()=>{
  console.log(`\nCaderneta v2 a funcionar!\n  Neste PC:      http://localhost:${PORT}`);
  for(const l of Object.values(os.networkInterfaces()))for(const i of l)if(i.family==='IPv4'&&!i.internal)console.log(`  Outros aparelhos (mesma rede): http://${i.address}:${PORT}`)});
