import {randomUUID} from 'node:crypto';
import {updateCatalog} from './catalog-update.mjs';
export class StoreError extends Error{constructor(message,status=500){super(message);this.status=status;}}
const json=value=>JSON.stringify(value,null,2)+'\n';
const safeJson=value=>{try{return JSON.parse(Buffer.from(value.content.replace(/\n/g,''),'base64').toString());}catch{throw new StoreError('O arquivo do catálogo precisa ser conferido.',502);}};
export class GitHubStore{
 constructor(env){this.repository=env.GITHUB_REPOSITORY||'Benfic4rthur/Vavau-Motors';this.token=env.GITHUB_WRITE_TOKEN||'';this.branch=env.GITHUB_BRANCH||'main';if(!/^[\w.-]+\/[\w.-]+$/.test(this.repository))throw Error('Repositório inválido.');}
 get connected(){return !!this.token;}
 async api(path,method='GET',data){if(!this.token)throw new StoreError('A conexão de gravação no GitHub ainda não foi configurada.',503);const response=await fetch(`https://api.github.com/repos/${this.repository}/${path}`,{method,headers:{Authorization:`Bearer ${this.token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000),cache:'no-store'});if(!response.ok){if(response.status===404)throw new StoreError('Arquivo ou repositório não encontrado.',404);if(response.status===409||response.status===422)throw new StoreError('O catálogo mudou enquanto você editava. Atualize a lista e tente novamente.',409);if(response.status===401||response.status===403)throw new StoreError('A autorização de gravação no GitHub precisa ser atualizada.',503);throw new StoreError('O GitHub não respondeu. Seu cadastro ainda não foi publicado.',502);}return response.status===204?null:response.json();}
 async file(path,ref=this.branch){return this.api('contents/'+path+'?ref='+encodeURIComponent(ref));}
 async read(){if(!this.connected)return {products:await this.publicRead(),revision:'',connected:false};const file=await this.file('data/catalog.json');return {products:safeJson(file),revision:file.sha,connected:this.connected};}
 async publicRead(){if(this.token)return (await this.read()).products;const response=await fetch(`https://raw.githubusercontent.com/${this.repository}/${this.branch}/public/catalog-seed.json`,{signal:AbortSignal.timeout(10000),cache:'no-store'});if(!response.ok)throw new StoreError('Catálogo temporariamente indisponível.',502);return response.json();}
 publicAsset(path){return path.startsWith('/assets/')?`https://raw.githubusercontent.com/${this.repository}/${this.branch}/public${path}`:path;}
 async readAuth(){try{return safeJson(await this.file('data/admin-auth.enc.json'));}catch(error){if(error.status===404||!this.connected)return null;throw error;}}
 async commit(files,message,expectedRevision,expectedHead){const ref=await this.api('git/ref/heads/'+this.branch);const head=ref.object.sha;if(expectedHead&&head!==expectedHead)throw new StoreError('Outra atualização chegou ao repositório. Atualize a lista antes de salvar.',409);const commit=await this.api('git/commits/'+head);if(expectedRevision){const current=await this.file('data/catalog.json',head);if(current.sha!==expectedRevision)throw new StoreError('Outra atualização chegou ao catálogo. Atualize a lista antes de salvar.',409);}const tree=await this.api('git/trees','POST',{base_tree:commit.tree.sha,tree:files.map(file=>file.sha?{path:file.path,mode:'100644',type:'blob',sha:file.sha}:{path:file.path,mode:'100644',type:'blob',content:json(file.data)})});const next=await this.api('git/commits','POST',{message,tree:tree.sha,parents:[head]});await this.api('git/refs/heads/'+this.branch,'PATCH',{sha:next.sha,force:false});return next.sha;}
 async upload(productId,bytes){const name=`manual-${productId}-${randomUUID()}.webp`;const result=await this.api('git/blobs','POST',{encoding:'base64',content:bytes.toString('base64')});return {path:'public/assets/'+name,sha:result.sha,image:'/assets/'+name};}
 async save(product,uploads,revision){
  const ref=await this.api('git/ref/heads/'+this.branch),head=ref.object.sha;
  const catalog=await this.file('data/catalog.json',head);
  const current={products:safeJson(catalog),revision:catalog.sha};
  if(current.revision!==revision)throw new StoreError('O catálogo mudou. Atualize antes de salvar.',409);
  const products=updateCatalog(current.products,product);
  let overrides;
  try{overrides=safeJson(await this.file('data/overrides.json',head));}
  catch(e){if(e.status!==404)throw e;overrides={items:{},ignorePosts:[]};}
  const {id,kind,source,collectedAt,...patch}=product;
  overrides.items||={};
  if(products[0].featured){
   // Clear both the catalog flags and persistent manual overrides in this commit.
   for(const previous of current.products){
    if(previous.id!==id&&previous.featured)overrides.items[previous.id]={...overrides.items[previous.id],featured:false};
   }
   for(const [otherId,item] of Object.entries(overrides.items))if(otherId!==id&&item.featured)item.featured=false;
  }
  overrides.items[id]={...overrides.items[id],...patch,featured:products[0].featured};
  if(product.status==='available')delete overrides.items[id].status;
  const files=[
   {path:'data/catalog.json',data:products},
   {path:'public/catalog-seed.json',data:products.filter(p=>p.status==='available')},
   {path:'data/overrides.json',data:overrides},
   ...uploads.map(f=>({path:f.path,sha:f.sha}))
  ];
  await this.commit(files,`Atualiza ${product.kind==='moto'?'moto':'entrega'}: ${product.name}`,revision,head);
  return this.read();
 }
 async writeAuth(envelope){await this.commit([{path:'data/admin-auth.enc.json',data:envelope}],'Atualiza acesso da equipe');}
}
