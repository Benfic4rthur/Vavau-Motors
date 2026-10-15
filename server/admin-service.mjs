import {randomUUID} from 'node:crypto';
import {productSchema} from '../app/lib/product.ts';
import {GitHubStore,StoreError} from './github-store.mjs';
import {passwordHash,verifyPassword,signSession,verifySession,encryptProfile,decryptProfile,versionFor} from './security.mjs';
const COOKIE='vavau_admin';
const attempts=new Map();
const date=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const noCache={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const reply=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8',...noCache,...headers}});
export function createAdminService(env,store=new GitHubStore(env)){
 const secret=env.ADMIN_SESSION_SECRET;
 async function profile(){if(!secret||secret.length<32||!env.ADMIN_INITIAL_PASSWORD_HASH||!env.ADMIN_INITIAL_USERNAME)throw new StoreError('O acesso da equipe ainda está sendo configurado.',503);const encrypted=await store.readAuth();return encrypted?decryptProfile(encrypted,secret):{username:env.ADMIN_INITIAL_USERNAME,passwordHash:env.ADMIN_INITIAL_PASSWORD_HASH,version:versionFor(env.ADMIN_INITIAL_PASSWORD_HASH)};}
 return async function handle(request){
  const url=new URL(request.url),action=url.searchParams.get('action')||'session';
  try{
   if(request.method==='GET'&&action==='public'){
    const products=(await store.publicRead()).filter(p=>p.status==='available'&&['moto','cliente'].includes(p.kind));
    return reply(products.map(p=>({...p,images:p.images.map(src=>store.publicAsset(src))})),200,{'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=15, s-maxage=15, stale-while-revalidate=30'});
   }
   if(request.method==='GET'&&action==='asset'&&store.readAsset){const name=url.searchParams.get('name')||'';if(!/^manual-[\w-]+\.webp$/.test(name))return reply({error:'Foto não encontrada.'},404);const body=await store.readAsset(name);return new Response(body,{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});}
   if(!['GET','POST'].includes(request.method))return reply({error:'Método não permitido.'},405);
   if(request.method==='POST'){
    const origin=request.headers.get('origin');if(origin!==url.origin||request.headers.get('x-vavau-admin')!=='1')return reply({error:'A origem desta solicitação não foi autorizada.'},403);
    const length=Number(request.headers.get('content-length')||0);if(length>3600000)return reply({error:'Envie uma foto menor.'},413);
    if(!(request.headers.get('content-type')||'').includes('application/json'))return reply({error:'Formato inválido.'},415);
   }
   const auth=await profile();
   const cookie=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
   const authorized=verifySession(cookie,auth,secret);
   const clear=`${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${url.protocol==='https:'?'; Secure':''}`;
   if(action==='login'&&request.method==='POST'){
    const ip=request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';const key=ip.slice(0,100);const now=Date.now();let attempt=attempts.get(key);if(attempt&&attempt.until<now){attempts.delete(key);attempt=null;}if(attempt?.count>=8)return reply({error:'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.'},429,{'Retry-After':'900'});
    const body=await request.json();const username=typeof body.username==='string'?body.username.trim().slice(0,80):'',password=typeof body.password==='string'?body.password:'';
    if(password.length>256||username!==auth.username||!await verifyPassword(password,auth.passwordHash)){attempts.set(key,{count:(attempt?.count||0)+1,until:now+15*60*1000});if(attempts.size>2000)attempts.delete(attempts.keys().next().value);return reply({error:'Login ou senha incorretos.'},401);}
    attempts.delete(key);const token=signSession(auth,secret);return reply({username:auth.username,connected:store.connected},200,{'Set-Cookie':`${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=7200${url.protocol==='https:'?'; Secure':''}`});
   }
   if(!authorized)return reply({error:'Entre novamente para continuar.'},401);
   if(action==='session'&&request.method==='GET')return reply({username:auth.username,connected:store.connected});
   if(action==='logout'&&request.method==='POST')return reply({ok:true},200,{'Set-Cookie':clear});
   if(action==='catalog'&&request.method==='GET')return reply({...await store.read(),assetBase:store.assetBase||`https://raw.githubusercontent.com/${store.repository}/${store.branch}/public`});
   if(action==='upload'&&request.method==='POST'){
    const body=await request.json();if(!/^[\w-]{1,120}$/.test(body.productId||'')||typeof body.data!=='string'||body.data.length>3400000)throw new StoreError('Foto inválida ou grande demais.',400);
    const bytes=Buffer.from(body.data,'base64');if(bytes.length<20||bytes.length>2500000||bytes.subarray(0,4).toString()!=='RIFF'||bytes.subarray(8,12).toString()!=='WEBP')throw new StoreError('Use uma imagem WebP preparada pelo formulário.',400);
    return reply(await store.upload(body.productId,bytes));
   }
   if(action==='save'&&request.method==='POST'){
    const body=await request.json();const product=productSchema.parse(body.product);if(!['moto','cliente'].includes(product.kind))throw new StoreError('Tipo de cadastro inválido.',400);
    if(product.status==='available'&&(!product.images.length||(product.kind==='moto'&&(!product.model||!product.brand))))throw new StoreError('Para publicar, adicione uma foto, marca e modelo da moto.',400);
    if(!product.sourceDate)product.sourceDate=new Date().toISOString();product.collectedAt=date();
    if(product.status!=='available')product.featured=false;
    const uploads=Array.isArray(body.uploads)?body.uploads:[];
    if(uploads.length>30||uploads.some(f=>!/^public\/assets\/manual-[\w-]+\.webp$/.test(f.path||'')||!/^[a-f0-9]{40,64}$/.test(f.sha||'')||!f.path.startsWith('public/assets/manual-'+product.id+'-')||!product.images.includes('/assets/'+f.path.split('/').pop())))throw new StoreError('A lista de fotos precisa ser conferida.',400);
    if(typeof body.revision!=='string'||body.revision.length>100)throw new StoreError('Atualize o catálogo antes de salvar.',409);
    return reply(await store.save(product,uploads,body.revision));
   }
   if(action==='password'&&request.method==='POST'){
    const body=await request.json();if(typeof body.currentPassword!=='string'||body.currentPassword.length>256||!await verifyPassword(body.currentPassword,auth.passwordHash))throw new StoreError('A senha atual não confere.',400);
    if(typeof body.username!=='string'||!/^.{3,80}$/.test(body.username.trim())||typeof body.password!=='string'||body.password.length<12||body.password.length>256)throw new StoreError('Use um login de 3 a 80 caracteres e uma senha de pelo menos 12 caracteres.',400);
    const next={username:body.username.trim(),passwordHash:await passwordHash(body.password),version:randomUUID()};await store.writeAuth(encryptProfile(next,secret));return reply({ok:true},200,{'Set-Cookie':clear});
   }
   return reply({error:'Operação não encontrada.'},404);
  }catch(error){if(error?.name==='ZodError')return reply({error:'Confira os campos do cadastro: '+error.issues.map(i=>i.path.join('.')).join(', ')},400);if(error instanceof SyntaxError)return reply({error:'Solicitação inválida.'},400);return reply({error:error.status?error.message:'Não foi possível concluir agora. Tente novamente.'},error.status||500);}
 };
}
