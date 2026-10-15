import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import {readFile} from 'node:fs/promises';
import {paintToneFromPixels} from '../app/lib/paint-tone.ts';import {themeForColor} from '../app/lib/theme.ts';
const catalog=JSON.parse(await readFile('data/catalog.json','utf8'));
async function tone(name){const p=catalog.find(p=>p.name.includes(name));const {data,info}=await sharp('public'+p.images[0]).resize({width:180}).ensureAlpha().raw().toBuffer({resolveWithObject:true});const value=paintToneFromPixels(data,info.width,info.height,p.color);assert.ok(value);return {hex:value,rgb:[1,3,5].map(i=>parseInt(value.slice(i,i+2),16))};}
test('real tank paint wins over dark tyres, seat and showroom wall',async()=>{
 const green=await tone('Scrambler');assert.ok(green.rgb[1]>green.rgb[0]&&green.rgb[1]>green.rgb[2]);
 const red=await tone('FZ15');assert.ok(red.rgb[0]>red.rgb[1]*2&&red.rgb[0]>red.rgb[2]*2);
 const blue=await tone('Hayabusa');assert.ok(blue.rgb[2]>blue.rgb[0]*1.5);
 const biz=await tone('Biz 125 ES');assert.ok(biz.rgb.every(c=>c>160));assert.ok(biz.rgb[0]>biz.rgb[2]);assert.equal(themeForColor('Cinza',biz.hex)['--theme-foreground'],'#282421');
});
test('inconclusive image keeps the specification fallback; invalid manual tones are rejected',()=>{
 assert.equal(paintToneFromPixels(new Uint8ClampedArray(100*100*4),100,100,'Verde'),null);
 assert.deepEqual(themeForColor('Verde','invalid'),themeForColor('Verde'));
});
