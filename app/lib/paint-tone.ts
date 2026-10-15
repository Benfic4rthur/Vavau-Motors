import {paintFallback} from './theme.ts';
const hue=(r:number,g:number,b:number)=>{const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;if(!d)return 0;return ((max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360;};
const distance=(a:number,b:number)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
// The colour in the specification acts as a paint hint, not a count of all pixels.
// Prioritize the body/tank area and discard tyres, seat, highlights and showroom signage.
export function paintToneFromPixels(data:ArrayLike<number>,width:number,height:number,color:string):string|null{
 const fallback=paintFallback(color),hint=[1,3,5].map(i=>parseInt(fallback.slice(i,i+2),16));
 const c=color.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const chromatic=/azul|vermelh|vinho|verd|amarel|laranja|rox|violet/.test(c);
 const neutral=/cinza|prat|branc|bege|champan|rose|dourad/.test(c);
 if(!chromatic&&!neutral)return null;
 const targetHue=hue(hint[0],hint[1],hint[2]),samples:{rgb:number[];score:number}[]=[];
 for(let y=Math.floor(height*.46);y<height*.71;y++)for(let x=Math.floor(width*.2);x<width*.81;x++){
  const i=(y*width+x)*4,r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max?(max-min)/max:0,luma=(r*.2126+g*.7152+b*.0722)/255;
  if(data[i+3]<200||luma<.22||luma>.86)continue;
  const center=1-Math.abs(x/width-.51);
  if(chromatic){const delta=distance(hue(r,g,b),targetHue);if(sat<.085||delta>38)continue;samples.push({rgb:[r,g,b],score:(1-delta/45)*sat*center});}
  else{if(sat>.24||luma<.49)continue;samples.push({rgb:[r,g,b],score:luma**4*center});}
 }
 if(samples.length<Math.max(12,width*height*.001))return null;
 // Use the best paint candidates, so the gray wall cannot overwhelm a small colored tank.
 samples.sort((a,b)=>b.score-a.score);const best=samples.slice(0,Math.max(12,Math.ceil(samples.length*.25))),sum=[0,0,0];let weight=0;
 for(const {rgb,score} of best){weight+=score;rgb.forEach((v,i)=>sum[i]+=v*score);}
 return '#'+sum.map(v=>Math.round(v/weight).toString(16).padStart(2,'0')).join('');
}
export async function readPaintTone(src:string,color:string):Promise<string|null>{
 const image=new Image();image.crossOrigin='anonymous';image.src=src;await image.decode();
 const canvas=document.createElement('canvas');canvas.width=180;canvas.height=Math.max(1,Math.round(180*image.naturalHeight/image.naturalWidth));
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return null;
 context.drawImage(image,0,0,canvas.width,canvas.height);
 return paintToneFromPixels(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,color);
}
