import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {readPostDom,advanceGallery} from './instagram-dom.mjs';
import {parsePost,postCode,mergeProducts} from './catalog-parser.mjs';

// Anonymous public pages only. No account, cookies, token, or login fallback.
const readJson=async(path,fallback)=>{try{return JSON.parse(await readFile(path,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}};
const hash=value=>createHash('sha256').update(value).digest('hex');
const atomic=async(path,value)=>{const temp=path+'.tmp';await writeFile(temp,JSON.stringify(value,null,2)+'\n');await rename(temp,path);};
const existing=await readJson('data/catalog.json',[]);
if(!existing.length)throw Error('Catálogo inicial ausente: sincronização interrompida.');
const overrides=await readJson('data/overrides.json',{}),state=await readJson('data/sync-state.json',{});
const index=await readJson('data/source-posts.json',[]);
const report={checkedAt:new Date().toISOString(),profileRead:false,discovered:0,checked:0,changed:0,sold:0,skipped:0,failures:[]};
const updates=[],created=[];
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({locale:'pt-BR',viewport:{width:1280,height:900}});
const page=await context.newPage();
page.setDefaultTimeout(10000);
const dismissSignup=async()=>{const close=page.getByRole('button',{name:/^(fechar|close)$/i});if(await close.count()===1)await close.click().catch(()=>{});};
const observedSources=new Map(index.map(item=>{const url=typeof item==='string'?item:item.url;return [postCode(url),url];}).filter(([code])=>code));
const byCode=new Map(existing.filter(p=>p.source).map(p=>[postCode(p.source),p]));
try{
  const response=await page.goto('https://www.instagram.com/vavaumotos/',{waitUntil:'domcontentloaded',timeout:35000});
  if(response?.ok()){
    await page.waitForSelector('a[href*="/p/"],a[href*="/reel/"]',{timeout:12000}).catch(()=>{});
    const urls=await page.locator('a[href*="/p/"],a[href*="/reel/"]').evaluateAll(links=>links.map(a=>a.href));
    for(const url of urls){const code=postCode(url);if(code&&!observedSources.has(code)){report.discovered++;observedSources.set(code,url);}}
    report.profileRead=urls.length>0;
  }
  if(!report.profileRead)report.failures.push({post:'profile',reason:'Perfil público indisponível ou exigiu login; novas publicações não puderam ser descobertas.'});
  // Recheck active stock even when profile discovery is temporarily unavailable.
  const codes=[...new Set([...existing.filter(p=>p.kind==='moto'&&p.status==='available').map(p=>postCode(p.source)),...observedSources.keys()])].filter(Boolean).filter(code=>!overrides.ignorePosts?.includes(code));
  const max=Number(process.env.SYNC_MAX_POSTS||100);
  let consecutiveFailures=0;
  for(const code of codes.slice(0,Math.max(1,Math.min(max,150)))){
    const prior=byCode.get(code);
    // Successfully processed historical deliveries and old/irrelevant posts need no repeated media download.
    if(!prior&&state[code]?.terminal)continue;
    if(prior?.kind==='cliente'&&state[code]?.captionHash)continue;
    const url=`https://www.instagram.com/p/${code}/`;
    try{
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      if(!response?.ok())throw Error('Publicação pública retornou erro.');
      await dismissSignup();
      await page.waitForFunction(code=>!!document.querySelector(`a[href*="/${code}/"] time[datetime],meta[property="article:published_time"]`),code,{timeout:10000}).catch(()=>{});
      let dom=await page.evaluate(readPostDom,code);
      if(!dom.expectedAccount||!dom.timestamp)throw Error('Autor ou data original da publicação não confirmados.');
      const parsed=parsePost({url,caption:dom.caption,timestamp:dom.timestamp},prior);
      report.checked++;consecutiveFailures=0;
      if(parsed.action==='skip'){report.skipped++;state[code]={terminal:!prior,reason:parsed.reason};continue;}
      if(parsed.action==='sold'){
        updates.push(parsed.product);report.sold++;state[code]={terminal:true,captionHash:hash(dom.caption)};continue;
      }
      const product=parsed.product;
      const captionHash=hash(dom.caption);
      if(prior&&state[code]?.captionHash===captionHash&&prior.images.length){continue;}
      if(prior?.images.length&&(!dom.count||dom.count===prior.images.length+(state[code]?.videos||0))){
        const candidate={...product,id:prior.id,description:prior.description||product.description,images:prior.images};
        if(JSON.stringify({...candidate,collectedAt:null})!==JSON.stringify({...prior,collectedAt:null}))updates.push(candidate);
        state[code]={captionHash,photos:prior.images.length,videos:state[code]?.videos||0};continue;
      }
      const photos=new Map(dom.photos.map(photo=>[photo.position,photo.url]));
      const videoPositions=new Set(dom.videoPositions||[]);
      let moves=0;
      while(dom.hasNext&&moves<30){
        const before=await page.locator('._acnf').count()?await page.locator('._acnf').evaluate(e=>[...e.parentElement.children].indexOf(e)):-1;
        if(!await page.evaluate(advanceGallery))break;
        await page.waitForFunction(previous=>{const e=document.querySelector('._acnf');return !e||[...e.parentElement.children].indexOf(e)!==previous;},before,{timeout:2500}).catch(()=>{});
        await page.waitForFunction(()=>[...document.querySelectorAll('article img,main img')].some(img=>img.naturalWidth>=300),{timeout:3000}).catch(()=>{});
        await page.waitForTimeout(350);
        dom=await page.evaluate(readPostDom,code);moves++;
        for(const photo of dom.photos)photos.set(photo.position,photo.url);
        for(const position of dom.videoPositions||[])videoPositions.add(position);
      }
      if(!photos.size)throw Error('Nenhuma foto pública confirmada; registro anterior preservado.');
      const actualCount=photos.size+videoPositions.size;
      if(dom.count&&actualCount<dom.count)throw Error(`Galeria incompleta (${actualCount}/${dom.count}); registro anterior preservado.`);
      const paths=[];
      for(const [position,imageUrl] of [...photos].sort(([a],[b])=>a-b)){
        const source=new URL(imageUrl);
        if(source.protocol!=='https:'||!/(?:^|\.)(?:cdninstagram\.com|fbcdn\.net)$/.test(source.hostname))throw Error('Host de mídia não reconhecido.');
        const imageResponse=await fetch(source,{signal:AbortSignal.timeout(20000),redirect:'error'});
        if(!imageResponse.ok||!/^image\/(?:jpeg|png|webp)/i.test(imageResponse.headers.get('content-type')||''))throw Error('Foto pública não pôde ser baixada.');
        if(Number(imageResponse.headers.get('content-length')||0)>25000000)throw Error('Foto excedeu o limite de tamanho.');
        const buffer=Buffer.from(await imageResponse.arrayBuffer());
        if(buffer.length>25000000)throw Error('Foto excedeu o limite de tamanho.');
        const optimized=await sharp(buffer,{limitInputPixels:40000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
        const name=`ig-${code}-${position+1}-${hash(optimized).slice(0,10)}.webp`;
        await mkdir('public/assets',{recursive:true});await writeFile('public/assets/'+name,optimized);created.push(name);paths.push('/assets/'+name);
      }
      // Keep curated identity/description where the original record is more descriptive.
      updates.push({...product,id:prior?.id||product.id,description:prior?.description||product.description,images:paths});
      state[code]={captionHash,photos:paths.length,videos:videoPositions.size};
    }catch(error){
      report.failures.push({post:code,reason:error.message});consecutiveFailures++;
      if(consecutiveFailures>=3){report.failures.push({post:'batch',reason:'Três falhas consecutivas; execução interrompida para preservar o catálogo.'});break;}
    }
    await new Promise(resolve=>setTimeout(resolve,1500));
  }
}finally{await browser.close();}
const merged=mergeProducts(existing,updates,overrides).filter(p=>p.kind==='moto'||p.kind==='cliente');
const used=new Set(merged.flatMap(p=>p.images));
for(const name of created)if(!used.has('/assets/'+name))await unlink('public/assets/'+name).catch(()=>{});
report.changed=updates.length;
await atomic('data/catalog.json',merged);
await atomic('public/catalog-seed.json',merged.filter(p=>p.status==='available'));
await atomic('data/sync-state.json',state);
await atomic('data/source-posts.json',[...observedSources].map(([code])=>`https://www.instagram.com/p/${code}/`));
await atomic('data/sync-report.json',report);
console.log(JSON.stringify(report,null,2));
if(report.failures.length)process.exitCode=1;
