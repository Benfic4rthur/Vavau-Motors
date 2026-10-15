// Development preview only. Production storage is always GitHub.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {StoreError} from './github-store.mjs';
export class LocalStore{
 connected=true;assetBase='local';root='work/admin-local';repository='Benfic4rthur/Vavau-Motors';branch='main';
 async read(){let data;try{data=await readFile(this.root+'/catalog.json','utf8');}catch{data=await readFile('data/catalog.json','utf8');}return {products:JSON.parse(data),revision:createHash('sha256').update(data).digest('hex'),connected:true};}
 async publicRead(){return (await this.read()).products;}
 publicAsset(src){return src.startsWith('/assets/manual-')?'/api/admin?action=asset&name='+encodeURIComponent(src.split('/').pop()):src;}
 async upload(id,bytes){const name=`manual-${id}-${randomUUID()}.webp`;await mkdir(this.root+'/assets',{recursive:true});await writeFile(this.root+'/assets/'+name,bytes);return {path:'public/assets/'+name,sha:createHash('sha256').update(bytes).digest('hex'),image:'/assets/'+name};}
 async readAsset(name){try{return await readFile(this.root+'/assets/'+name);}catch{throw new StoreError('Foto não encontrada.',404);}}
 async save(product,uploads,revision){const current=await this.read();if(revision!==current.revision)throw new StoreError('O catálogo mudou. Atualize a lista.',409);const products=current.products.filter(p=>p.id!==product.id);products.unshift(product);await mkdir(this.root,{recursive:true});await writeFile(this.root+'/catalog.json',JSON.stringify(products,null,2)+'\n');return this.read();}
 async readAuth(){try{return JSON.parse(await readFile(this.root+'/auth.json','utf8'));}catch{return null;}}
 async writeAuth(envelope){await mkdir(this.root,{recursive:true});await writeFile(this.root+'/auth.json',JSON.stringify(envelope));}
}
