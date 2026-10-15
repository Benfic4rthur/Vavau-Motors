export function readPostDom(code){
 const title=document.querySelector('meta[property="og:title"]')?.getAttribute('content')||'';
 const description=document.querySelector('meta[property="og:description"]')?.getAttribute('content')||'';
 const canonical=document.querySelector('meta[property="og:url"]')?.getAttribute('content')||location.href;
 const root=document.querySelector('[role="dialog"] article')||document.querySelector('article')||document.querySelector('main')||document.body;
 const ownTimes=[...document.querySelectorAll(`a[href*="/${code}/"] time[datetime]`)];
 const timestamp=ownTimes.at(-1)?.getAttribute('datetime')||document.querySelector('meta[property="article:published_time"]')?.getAttribute('content')||'';
 const lists=[...root.querySelectorAll('ul')].filter(ul=>[...ul.querySelectorAll('li')].some(li=>li.style.transform.includes('translateX')&&li.querySelector('img,video')));
 const list=lists[0];const photos=[];let videos=0;const videoPositions=[];
 if(list){for(const [index,li] of [...list.children].entries()){if(li.querySelector('video')){videos++;const match=li.style.transform.match(/translateX\(([-\d.]+)(px|%)\)/);const width=li.getBoundingClientRect().width||1;videoPositions.push(match?Math.round(Number(match[1])/(match[2]==='%'?100:width)):index);continue;}const img=[...li.querySelectorAll('img')].find(img=>img.naturalWidth>=300&&!/perfil|profile/i.test(img.alt));if(!img)continue;const transform=li.style.transform.match(/translateX\(([-\d.]+)(px|%)\)/);const width=li.getBoundingClientRect().width||img.getBoundingClientRect().width||1;const position=transform?Math.round(Number(transform[1])/(transform[2]==='%'?100:width)):index;photos.push({url:img.currentSrc||img.src,position});}}
 else{const imgs=[...root.querySelectorAll('img')].filter(img=>img.naturalWidth>=300&&!/perfil|profile/i.test(img.alt));const img=imgs.find(img=>/photo by|foto de|image/i.test(img.alt))||imgs[0];if(img&&!root.querySelector('video'))photos.push({url:img.currentSrc||img.src,position:0});}
 const buttons=[...(list?.parentElement?.parentElement||root).querySelectorAll('button')];
 const next=buttons.find(b=>/^(?:avançar|next)$/i.test(b.getAttribute('aria-label')||'')||b.querySelector('svg[aria-label="Avançar"],svg[aria-label="Next"]'));
 const count=root.querySelectorAll('._acnb').length||0;
 return {caption:title||description,canonical,timestamp,photos,videos,videoPositions,count,hasNext:!!next,signup:!!document.querySelector('input[name="username"]'),expectedAccount:/vavau ?motos/i.test(description+' '+title)};
}
export function advanceGallery(){const root=document.querySelector('[role="dialog"] article')||document.querySelector('article')||document.querySelector('main')||document.body;const list=[...root.querySelectorAll('ul')].find(ul=>[...ul.children].some(li=>li.style.transform.includes('translateX')&&li.querySelector('img,video')));if(!list)return false;const area=list.parentElement?.parentElement||root;const button=[...area.querySelectorAll('button')].find(b=>/^(?:avançar|next)$/i.test(b.getAttribute('aria-label')||'')||b.querySelector('svg[aria-label="Avançar"],svg[aria-label="Next"]'));if(!button||button.disabled)return false;button.click();return true;}
