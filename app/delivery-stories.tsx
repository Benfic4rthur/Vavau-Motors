import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import {asset,type Product} from './lib/product';

export default function DeliveryStories({products,open}:{products:Product[];open:(p:Product)=>void}){
 const track=useRef<HTMLDivElement>(null),hover=useRef(false),logicalIndex=useRef(0),scrollTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const [range,setRange]=useState({first:0,visible:3});
 const [auto,setAuto]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const loop=products.length>range.visible;
 const stepSize=useCallback(()=>{const el=track.current,card=el?.firstElementChild as HTMLElement|null;return el&&card?card.getBoundingClientRect().width+parseFloat(getComputedStyle(el).columnGap||'0'):0;},[]);
 const move=useCallback((direction:number)=>{const el=track.current,step=stepSize();if(el&&step)el.scrollTo({left:el.scrollLeft+direction*step,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[stepSize]);
 const normalize=()=>{const el=track.current,step=stepSize();if(!el||!step||!loop)return;const index=Math.round(el.scrollLeft/step);if(index<products.length||index>=products.length*2){el.style.scrollSnapType='none';el.scrollTo({left:(products.length+logicalIndex.current)*step,behavior:'instant'});requestAnimationFrame(()=>{el.style.scrollSnapType='';});}};
 const measure=()=>{
  const el=track.current,step=stepSize();if(!el||!step)return;
  const first=((Math.round(el.scrollLeft/step)%products.length)+products.length)%products.length;
  const visible=Math.max(1,Math.round((el.clientWidth+parseFloat(getComputedStyle(el).columnGap||'0'))/step));
  logicalIndex.current=first;setRange(previous=>previous.first===first&&previous.visible===visible?previous:{first,visible});
  clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(normalize,180);
 };
 useEffect(()=>{
  const el=track.current;if(!el)return;
  const resize=()=>{const step=stepSize();if(!step)return;const first=Math.min(logicalIndex.current,Math.max(0,products.length-1));el.scrollTo({left:(loop?products.length+first:0)*step,behavior:'instant'});measure();};
  resize();const observer=new ResizeObserver(resize);observer.observe(el);
  return()=>{observer.disconnect();clearTimeout(scrollTimer.current);};
 },[products.length,loop,stepSize]);
 useEffect(()=>{if(!auto||!loop)return;const timer=setInterval(()=>{if(!document.hidden&&!hover.current&&!track.current?.contains(document.activeElement))move(1);},10000);return()=>clearInterval(timer);},[auto,loop,move]);
 if(!products.length)return null;
 const copies=loop?[0,1,2]:[1];
 return <section id="historias" className="stories" aria-label="Histórias e entregas da Vavau" onPointerEnter={()=>{hover.current=true;}} onPointerLeave={()=>{hover.current=false;}}>
  <div className="section-heading reveal"><div><p className="eyebrow"><span>02</span> A MELHOR PARTE DO CAMINHO</p><h2>Histórias sobre <em>duas rodas.</em></h2></div><p>Uma chave. Um sorriso. Um novo destino.<br/>Entregas que fazem parte da nossa história.</p></div>
  <div className="stories-toolbar"><span><strong>{products.length}</strong> entregas para conhecer</span><div className="stories-controls"><span aria-live="off">{String(range.first+1).padStart(2,'0')} <i>/ {String(products.length).padStart(2,'0')}</i></span><button type="button" disabled={!loop} aria-label={auto?'Pausar carrossel de entregas':'Reproduzir carrossel de entregas'} aria-pressed={!auto} onClick={()=>setAuto(!auto)}>{auto?<Pause size={15}/>:<Play size={15}/>}</button><button type="button" disabled={!loop} aria-label="Entregas anteriores" onClick={()=>move(-1)}><ChevronLeft size={19}/></button><button type="button" disabled={!loop} aria-label="Próximas entregas" onClick={()=>move(1)}><ChevronRight size={19}/></button></div></div>
  <div ref={track} className="stories-track" onScroll={measure} tabIndex={0} role="region" aria-label="Carrossel de entregas, use as setas para navegar" onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}}}>
   {copies.flatMap(copy=>products.map((p,i)=><button key={`${copy}-${p.id}`} className="story-card" data-copy={copy} tabIndex={copy===1?0:-1} aria-hidden={copy!==1||undefined} onClick={()=>open(p)} aria-label={`Ver entrega: ${p.description}`}><div className="story-photo"><img src={asset(p.images[0])} alt={p.description||'Entrega de moto na Vavau Motos'} loading="lazy"/><span className="story-number">{String(i+1).padStart(2,'0')}</span><span className="round-link"><ArrowUpRight size={18}/></span></div><span className="eyebrow">UM NOVO CAMINHO</span><h3>{p.description.replace(/^Entrega de /,'').replace(/\.$/,'')}</h3><span className="story-date">{p.sourceDate?new Date(p.sourceDate).toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}):'Uma entrega Vavau'}</span></button>))}
  </div><p className="catalog-footnote">Registros reais de entregas publicados pela Vavau Motos.</p>
 </section>;
}
