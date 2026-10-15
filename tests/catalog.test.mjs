import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {parsePost,parseMoney,mergeProducts} from '../scripts/catalog-parser.mjs';
import {chooseCover,productSchema} from '../app/lib/product.ts';
import {themeForColor} from '../app/lib/theme.ts';

const source='https://www.instagram.com/p/DefPV6igYpZ/';
const caption='✅ Disponível ✅\n\nTriumph Street Scrambler 900 ABS 2020\n\n- Marca: Triumph\n- Modelo: Street Scrambler 900\n- Ano: 2019 / 2020\n- Cor: Verde\n- Potência: 65CV / 900CC\n- Quilometragem: 14.051\n\nPossui manual e chave reserva.\n\n💰 R$42.900,00';
const post={url:source,timestamp:'2026-10-14T14:00:00Z',caption};
const current=parsePost(post).product;

test('parses actual Brazilian motorcycle caption without mixing model year, mileage and price',()=>{
  assert.equal(current.name,'Triumph Street Scrambler 900 ABS 2020');
  assert.equal(current.price,42900);assert.equal(current.km,14051);
  assert.equal(current.manufactureYear,2019);assert.equal(current.year,2020);
  assert.equal(current.engineCc,900);assert.equal(current.horsepower,65);
  assert.equal(current.category,'Clássica');
});
test('publication cutoff accepts 2025 and older model years, rejects old/unknown publication dates',()=>{
  assert.equal(parsePost({...post,timestamp:'2025-01-01T00:00:00Z'}).action,'upsert');
  assert.equal(parsePost({...post,timestamp:'2024-12-31T23:59:59Z'}).action,'skip');
  assert.equal(parsePost({...post,timestamp:null}).action,'skip');
});
test('sold motorcycle leaves stock and no longer retains the stock photos',()=>{
  const result=parsePost({...post,caption:'❌ Vendida ❌\n'+caption},{...current,images:['/assets/example.webp'],featured:true});
  assert.equal(result.action,'sold');assert.equal(result.product.status,'sold');
  assert.deepEqual(result.product.images,[]);assert.equal(result.product.featured,false);
  assert.equal(parsePost({...post,caption:caption.replace('Disponível','Vendida')}).action,'skip');
  assert.equal(parsePost({...post,caption:caption.replace('Disponível','Indisponível')},current).action,'sold');
});
test('no explicit stock availability means no automatic import',()=>{
  assert.equal(parsePost({...post,caption:caption.replace('Disponível','Confira')}).action,'skip');
  assert.equal(parsePost({...post,caption:caption.replace('Disponível','Indisponível')}).action,'skip');
});
test('service and accessories announcements are outside the current scope',()=>{
  assert.equal(parsePost({...post,caption:'Mobil Super Moto 10W-40. Troca de óleo.'}).action,'skip');
  assert.equal(parsePost({...post,caption:'Capacetes e luvas para pilotar.'}).action,'skip');
});
test('delivery records have no price and never become motorcycle stock',()=>{
  const result=parsePost({...post,caption:'Tipo: entrega\nParabéns pela nova conquista! R$ 9.900'});
  assert.equal(result.product.kind,'cliente');assert.equal(result.product.price,null);
});
test('currency supports Brazilian thousands and decimals without manufacturing a missing price',()=>{
  assert.equal(parseMoney('R$ 42.900,00'),42900);assert.equal(parseMoney('R$ 9.900'),9900);
  assert.equal(parseMoney('293,5'),293.5);assert.equal(parseMoney(''),null);
});
test('manual corrections survive later source updates and unsafe fields cannot be injected',()=>{
  const result=mergeProducts([current],[{...current,price:41000}],{items:{[current.id]:{price:42000,name:'Triumph conferida',kind:'cliente',unknown:true}}});
  assert.equal(result[0].price,42000);assert.equal(result[0].kind,'moto');
  assert.equal(result[0].name,'Triumph conferida');assert.equal(result[0].unknown,undefined);
  assert.equal(mergeProducts([current],[],{items:{[current.id]:{hide:true}}})[0].status,'archived');
});
test('an empty or failed update preserves the existing stock',()=>{
  assert.deepEqual(mergeProducts([current],[]),[current]);
});
test('hero chooses newest eligible stock, hashtag wins, sold items never win',()=>{
  const old={...current,id:'old',images:['/assets/a.webp'],sourceDate:'2025-01-01'};
  const recent={...old,id:'recent',sourceDate:'2026-10-14'};
  assert.equal(chooseCover([old,recent]).id,'recent');
  assert.equal(chooseCover([{...old,featured:true},recent]).id,'old');
  assert.equal(chooseCover([{...old,featured:true,status:'sold'},recent]).id,'recent');
  assert.equal(chooseCover([{...old,kind:'cliente'}, {...old,images:[]}]),undefined);
  assert.equal(parsePost({...post,caption:caption+'\n#destaque'}).product.featured,true);
});
test('hero has distinct blue, green and graphite palettes while gold stays in the brand CSS',()=>{
  assert.notEqual(themeForColor('Azul')['--theme-dark'],themeForColor('Verde')['--theme-dark']);
  assert.notEqual(themeForColor('Preto')['--theme-dark'],themeForColor('Verde')['--theme-dark']);
  assert.equal(themeForColor('Cinza')['--theme-dark'],themeForColor('Preto')['--theme-dark']);
});
test('published seed is validated, contains only current-scope records and every image exists',async()=>{
  const products=productSchema.array().parse(JSON.parse(await readFile('public/catalog-seed.json','utf8')));
  const ids=new Set();
  for(const p of products){
    assert.ok(!ids.has(p.id));ids.add(p.id);
    assert.equal(p.status,'available');assert.ok(['moto','cliente'].includes(p.kind));
    assert.ok(Number.isFinite(Date.parse(p.sourceDate)));
    if(p.kind==='moto')assert.ok(Date.parse(p.sourceDate)>=Date.parse('2025-01-01'));
    else assert.equal(p.price,null);
    assert.ok(p.images.length>0);
    for(const image of p.images){assert.ok(image.startsWith('/assets/'));await access('public'+image);}
  }
});
