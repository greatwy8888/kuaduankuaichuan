const express = require('express');
const multer = require('multer');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const DATA_DIR = path.join(os.homedir(), 'Documents', '跨端快传');
const IN_DIR = path.join(DATA_DIR, '收到的文件');
const SHARE_DIR = path.join(DATA_DIR, '发送到手机');
const TEMP_DIR = path.join(DATA_DIR, '.uploads');
for (const d of [IN_DIR, SHARE_DIR, TEMP_DIR]) fs.mkdirSync(d, {recursive:true});
const upload = multer({ dest: TEMP_DIR, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });
function safeName(name) { return path.basename(String(name || 'file').replace(/[\\\\/:*?"<>|\x00-\x1f]/g, '_')).slice(0,180) || 'file'; }
function uniquePath(dir, name) { let p=path.join(dir,name), n=1; const ext=path.extname(name), base=path.basename(name,ext); while(fs.existsSync(p)) p=path.join(dir, base+' ('+(n++)+')'+ext); return p; }
function listFiles(dir) { return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&!e.name.startsWith('.')).map(e=>{const p=path.join(dir,e.name),s=fs.statSync(p);return {name:e.name,size:s.size,mtime:s.mtimeMs};}).sort((a,b)=>b.mtime-a.mtime); }
function getAddresses(port) { const out=[]; for(const list of Object.values(os.networkInterfaces())) for(const n of list||[]) if(n.family==='IPv4'&&!n.internal) out.push({ip:n.address,url:'http://'+n.address+':'+port}); return out; }
async function startServer({port=3210}={}) { const app=express(); app.disable('x-powered-by'); app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');if(req.method==='OPTIONS')return res.sendStatus(204);next();}); app.use(express.static(__dirname)); app.get('/api/info',(req,res)=>res.json({name:'跨端快传',port,addresses:getAddresses(port)}));
app.get('/api/files',(req,res)=>res.json({files:listFiles(SHARE_DIR)}));
app.post('/api/upload',upload.array('files',100),(req,res)=>{try{const files=(req.files||[]).map(f=>{const dest=uniquePath(IN_DIR,safeName(f.originalname));fs.renameSync(f.path,dest);return {name:path.basename(dest),size:f.size};});res.json({ok:true,files});}catch(e){res.status(500).json({error:'保存文件失败'});}});
app.post('/api/share',upload.array('files',100),(req,res)=>{try{const files=(req.files||[]).map(f=>{const dest=uniquePath(SHARE_DIR,safeName(f.originalname));fs.renameSync(f.path,dest);return {name:path.basename(dest),size:f.size};});res.json({ok:true,files});}catch(e){res.status(500).json({error:'添加共享文件失败'});}});
app.get('/api/download/:name',(req,res)=>{const name=safeName(req.params.name);const p=path.resolve(SHARE_DIR,name);if(path.dirname(p)!==path.resolve(SHARE_DIR)||!fs.existsSync(p)||!fs.statSync(p).isFile())return res.status(404).json({error:'文件不存在'});res.download(p,name);});
app.get('/health',(req,res)=>res.json({ok:true}));
const server=http.createServer(app); await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'0.0.0.0',resolve);}); console.log('跨端快传 listening on '+port, getAddresses(port)); return server; }
if(require.main===module) startServer().catch(e=>{console.error(e);process.exit(1)});
module.exports={startServer};
