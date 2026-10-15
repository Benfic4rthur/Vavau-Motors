import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminService} from '../server/admin-service.mjs';
import {passwordHash,verifyPassword,signSession,verifySession,encryptProfile,decryptProfile,versionFor} from '../server/security.mjs';
import {StoreError,GitHubStore} from '../server/github-store.mjs';
import {productSchema} from '../app/lib/product.ts';
const hash=await passwordHash('test-password-2026');
const env={ADMIN_INITIAL_USERNAME:'admin',ADMIN_INITIAL_PASSWORD_HASH:hash,ADMIN_SESSION_SECRET:'test-only-server-secret-with-more-than-32-characters'};
class MemoryStore {
 connected=true;repository='owner/catalog';branch='main';products=[];revision='r0';auth=null;files=[];
 async read(){return {products:structuredClone(this.products),revision:this.revision,connected:true};}
 async publicRead(){return this.products;}
 publicAsset(path){return 'https://images.example'+path;}
 async readAuth(){return this.auth;}
 async writeAuth(value){this.auth=value;}
 async upload(id,bytes){const f={path:`public/assets/manual-${id}-photo.webp`,sha:'a'.repeat(40),image:`/assets/manual-${id}-photo.webp`};this.files.push(f);return f;}
 async save(product,uploads,revision){if(revision!==this.revision)throw new StoreError('Conflito',409);this.products=[product,...this.products.filter(p=>p.id!==product.id)];this.revision='r'+(Number(this.revision.slice(1))+1);return this.read();}
}
let ip=0;
const setup=()=>{const store=new MemoryStore();const handle=createAdminService(env,store);const request=async(action,body,cookie='',extra={})=>handle(new Request('https://catalog.example/api/admin?action='+action,{method:body===undefined?'GET':'POST',headers:{Origin:'https://catalog.example','Content-Type':'application/json','X-Vavau-Admin':'1','X-Real-IP':'test-'+(++ip),Cookie:cookie,...extra},body:body===undefined?undefined:JSON.stringify(body)}));const login=async()=>{const response=await request('login',{username:'admin',password:'test-password-2026'});assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Max-Age=7200; Secure/);return response.headers.get('set-cookie').split(';')[0];};return {store,request,login};};
test('password hash, signed session and encrypted profile reject tampering and expiry',async()=>{
 assert.equal(await verifyPassword('test-password-2026',hash),true);assert.equal(await verifyPassword('wrong',hash),false);
 const profile={username:'admin',passwordHash:hash,version:versionFor(hash)};const token=signSession(profile,env.ADMIN_SESSION_SECRET,1000);
 assert.ok(verifySession(token,profile,env.ADMIN_SESSION_SECRET,2000));assert.equal(verifySession(token,profile,env.ADMIN_SESSION_SECRET,7201001),false);assert.equal(verifySession(token+'a',profile,env.ADMIN_SESSION_SECRET,2000),false);
 const encrypted=encryptProfile(profile,env.ADMIN_SESSION_SECRET);assert.ok(!JSON.stringify(encrypted).includes(hash));assert.deepEqual(decryptProfile(encrypted,env.ADMIN_SESSION_SECRET),profile);assert.throws(()=>decryptProfile(encrypted,'other secret'));
});
test('private endpoints require login and POST requests reject foreign origins',async()=>{
 const {request}=setup();assert.equal((await request('catalog')).status,401);
 assert.equal((await request('login',{username:'admin',password:'wrong'})).status,401);
 assert.equal((await request('login',{username:'admin',password:'test-password-2026'},'',{Origin:'https://other.example'})).status,403);
 assert.equal((await request('login',{username:'admin',password:'test-password-2026'},'',{'X-Vavau-Admin':''})).status,403);
});
test('photo upload, draft, publish and sold lifecycle preserve the data and hide non-public records',async()=>{
 const {store,request,login}=setup();const cookie=await login();
 assert.equal((await request('upload',{productId:'bike',data:Buffer.from('not-an-image').toString('base64')},cookie)).status,400);
 const bytes=Buffer.alloc(24);bytes.write('RIFF');bytes.write('WEBP',8);
 const uploaded=await (await request('upload',{productId:'bike',data:bytes.toString('base64')},cookie)).json();
 const product=productSchema.parse({id:'bike',kind:'moto',name:'Honda de teste',brand:'Honda',model:'CG',category:'Street',status:'draft',images:[uploaded.image]});
 let result=await request('save',{product,uploads:[uploaded],revision:'r0'},cookie);assert.equal(result.status,200);assert.equal((await (await request('public')).json()).length,0);
 result=await request('save',{product:{...product,status:'available'},uploads:[],revision:'r1'},cookie);assert.equal(result.status,200);const visible=await (await request('public')).json();assert.equal(visible.length,1);assert.equal(visible[0].images[0],'https://images.example'+uploaded.image);
 result=await request('save',{product:{...product,status:'sold',featured:true},uploads:[],revision:'r2'},cookie);assert.equal(result.status,200);assert.equal(store.products[0].featured,false);assert.equal((await (await request('public')).json()).length,0);
 assert.equal((await request('save',{product,uploads:[],revision:'r1'},cookie)).status,409);
});
test('rejects inconsistent photo ownership and incomplete published bike',async()=>{
 const {request,login}=setup();const cookie=await login();const product=productSchema.parse({id:'bike',kind:'moto',name:'Teste',category:'Street',status:'available'});
 assert.equal((await request('save',{product,uploads:[],revision:'r0'},cookie)).status,400);
 product.status='draft';product.images=['/assets/manual-other-photo.webp'];assert.equal((await request('save',{product,uploads:[{path:'public/assets/manual-other-photo.webp',sha:'a'.repeat(40)}],revision:'r0'},cookie)).status,400);
});
test('delivery editing preserves customer and motorcycle, requires both to publish and never exposes a price',async()=>{
 const {store,request,login}=setup();const cookie=await login();
 const product=productSchema.parse({id:'delivery',kind:'cliente',name:'Nova entrega',category:'Entrega',status:'draft',images:['/assets/client-example.webp']});
 assert.equal((await request('save',{product,uploads:[],revision:'r0'},cookie)).status,200);
 assert.equal((await request('save',{product:{...product,status:'available'},uploads:[],revision:'r1'},cookie)).status,400);
 const published={...product,status:'available',customerName:'Anderson e Daniele',brand:'Honda',model:'Honda Biz 125 EX 2012',name:'Anderson e Daniele · Honda Biz 125 EX 2012',price:100,featured:true};
 assert.equal((await request('save',{product:{...published,brand:''},uploads:[],revision:'r1'},cookie)).status,400);
 assert.equal((await request('save',{product:published,uploads:[],revision:'r1'},cookie)).status,200);
 const [delivery]=await (await request('public')).json();
 assert.equal(delivery.brand,'Honda');assert.equal(delivery.customerName,'Anderson e Daniele');assert.equal(delivery.model,'Honda Biz 125 EX 2012');
 assert.equal(delivery.price,null);assert.equal(store.products[0].featured,false);
});
test('changing access encrypts the hash and invalidates previous sessions',async()=>{
 const {request,login,store}=setup();const cookie=await login();assert.equal((await request('password',{username:'new-admin',currentPassword:'wrong',password:'different-password-2026'},cookie)).status,400);
 assert.equal((await request('password',{username:'new-admin',currentPassword:'test-password-2026',password:'different-password-2026'},cookie)).status,200);
 assert.equal((await request('session',undefined,cookie)).status,401);assert.ok(store.auth.ciphertext);assert.equal(store.auth.passwordHash,undefined);
 assert.equal((await request('login',{username:'admin',password:'test-password-2026'})).status,401);assert.equal((await request('login',{username:'new-admin',password:'different-password-2026'})).status,200);
});
test('GitHub commit refuses concurrent head changes and never forces updates',async()=>{
 const store=new GitHubStore({GITHUB_WRITE_TOKEN:'test-only-token'});const calls=[];
 store.api=async(path,method='GET',body)=>{calls.push({path,method,body});if(path.startsWith('git/ref/'))return {object:{sha:'head'}};if(path==='git/commits/head')return {tree:{sha:'tree'}};if(path.startsWith('contents/'))return {sha:'revision'};if(path==='git/trees')return {sha:'new-tree'};if(path==='git/commits')return {sha:'new-commit'};return {};};
 await assert.rejects(store.commit([{path:'data/catalog.json',data:[]}],'save','revision','changed-head'),e=>e.status===409);assert.equal(calls.length,1);calls.length=0;
 assert.equal(await store.commit([{path:'data/catalog.json',data:[]},{path:'public/assets/photo.webp',sha:'a'.repeat(40)}],'save','revision','head'),'new-commit');const update=calls.find(c=>c.method==='PATCH');assert.equal(update.body.force,false);assert.deepEqual(calls.find(c=>c.path==='git/commits').body.parents,['head']);assert.equal(calls.find(c=>c.path==='git/trees').body.tree.length,2);
});

test('GitHub save replaces the old cover atomically in catalog, public seed and overrides',async()=>{
 const bike=(id,featured,color='Azul')=>productSchema.parse({id,kind:'moto',name:'Moto '+id,brand:'Honda',model:id,category:'Street',status:'available',images:['/assets/'+id+'.webp'],featured,color});
 const previous=bike('fazer',true,'Vermelha'),biz=bike('biz',false,'Cinza'),other=bike('other',false);
 let products=[previous,biz,other],overrides={items:{fazer:{featured:true,description:'Preservar descrição'},ghost:{featured:true}},ignorePosts:['ignored']},revision='r0';
 const store=new GitHubStore({GITHUB_WRITE_TOKEN:'test-only'});let writes=0;
 store.api=async()=>({object:{sha:'head'}});
 store.file=async path=>({sha:revision,content:Buffer.from(JSON.stringify(path==='data/catalog.json'?products:overrides)).toString('base64')});
 store.commit=async(files,message,expectedRevision,expectedHead)=>{
  assert.equal(expectedRevision,revision);assert.equal(expectedHead,'head');assert.equal(files.length,3);
  products=structuredClone(files.find(f=>f.path==='data/catalog.json').data);
  const publicSeed=files.find(f=>f.path==='public/catalog-seed.json').data;
  assert.equal(publicSeed.filter(p=>p.featured).length,1);
  overrides=structuredClone(files.find(f=>f.path==='data/overrides.json').data);revision='r'+(++writes);
 };
 let result=await store.save({...biz,featured:true},[],'r0');
 assert.deepEqual(result.products.filter(p=>p.featured).map(p=>p.id),['biz']);
 assert.deepEqual(result.products.find(p=>p.id==='fazer'),{...previous,featured:false});
 assert.equal(overrides.items.fazer.featured,false);assert.equal(overrides.items.ghost.featured,false);
 assert.equal(overrides.items.fazer.description,'Preservar descrição');assert.deepEqual(overrides.ignorePosts,['ignored']);
 result=await store.save({...other,description:'Edição normal'},[],'r1');
 assert.deepEqual(result.products.filter(p=>p.featured).map(p=>p.id),['biz']);
 await assert.rejects(store.save({...previous,featured:true},[],'r0'),e=>e.status===409);assert.equal(writes,2);
 result=await store.save({...previous,featured:true},[],'r2');
 assert.deepEqual(result.products.filter(p=>p.featured).map(p=>p.id),['fazer']);assert.equal(overrides.items.biz.featured,false);
});

test('real local storage and admin API switch the cover and remove it when sold',async()=>{
 const {LocalStore}=await import('../server/local-store.mjs');const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const store=new LocalStore();store.root=await mkdtemp(join(tmpdir(),'vavau-cover-'));
 try{
  const bikes=['blue','red','biz'].map(id=>productSchema.parse({id,kind:'moto',name:'Moto '+id,brand:'Honda',model:id,category:'Street',status:'available',images:['/assets/'+id+'.webp'],featured:id==='blue'}));
  await writeFile(store.root+'/catalog.json',JSON.stringify(bikes));
  const handle=createAdminService(env,store),req=(action,body,cookie='')=>handle(new Request('https://catalog.example/api/admin?action='+action,{method:body?'POST':'GET',headers:{Origin:'https://catalog.example','Content-Type':'application/json','X-Vavau-Admin':'1','X-Real-IP':'cover-'+(++ip),Cookie:cookie},body:body?JSON.stringify(body):undefined}));
  const login=await req('login',{username:'admin',password:'test-password-2026'});const cookie=login.headers.get('set-cookie').split(';')[0];
  for(const id of ['red','biz']){
   const current=await store.read(),product=current.products.find(p=>p.id===id);
   const saved=await req('save',{product:{...product,featured:true},uploads:[],revision:current.revision},cookie);assert.equal(saved.status,200);
   const response=await req('public');assert.equal(response.headers.get('cache-control'),'no-store');const list=await response.json();assert.deepEqual(list.filter(p=>p.featured).map(p=>p.id),[id]);
  }
  const current=await store.read();const sold=await req('save',{product:{...current.products[0],status:'sold'},uploads:[],revision:current.revision},cookie);assert.equal(sold.status,200);
  assert.equal((await (await req('public')).json()).some(p=>p.id==='biz'),false);
 }finally{await rm(store.root,{recursive:true,force:true});}
});
