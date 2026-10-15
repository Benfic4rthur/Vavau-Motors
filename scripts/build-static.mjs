import {readFile,writeFile,mkdir,readdir,unlink,cp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const pages=process.argv.includes('--pages');
if(pages&&!process.env.PAGES_BASE)process.env.PAGES_BASE='/Vavau-Motors/';
const products=JSON.parse(await readFile('data/catalog.json','utf8'));
const visible=products.filter(p=>p.status==='available'&&(p.kind==='moto'||p.kind==='cliente'));
for(const p of visible)if(!p.id||!p.name||!Array.isArray(p.images))throw Error('Registro de catálogo inválido.');
await mkdir('public',{recursive:true});await writeFile('public/catalog-seed.json',JSON.stringify(visible,null,2)+'\n');
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.static.config.ts'],{stdio:'inherit',env:process.env});
if(result.status!==0)process.exit(result.status||1);
const used=new Set(['logo.png',...visible.flatMap(p=>p.images||[]).filter(p=>p.startsWith('/assets/')).map(p=>p.slice(8))]);
for(const name of await readdir('dist-static/assets'))if(/\.(?:jpe?g|png|webp|avif)$/i.test(name)&&!used.has(name))await unlink('dist-static/assets/'+name);
await writeFile('dist-static/.nojekyll','');
console.log(`Publicados ${visible.length} registros; imagens de itens não publicados ficaram fora do site.`);

if(pages){await rm('docs',{recursive:true,force:true});await cp('dist-static','docs',{recursive:true});console.log('Pages pronto em docs/, sem workflow próprio.');}
