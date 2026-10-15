import {useEffect,useRef} from 'react';
import {ArrowUpRight,MapPin,Phone,X} from 'lucide-react';
const address='Vavau Motos, Rua José do Patrocínio, 333, Rio Branco, Novo Hamburgo, RS';
export default function LocationDialog({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[]);
 return <dialog ref={dialog} className="location-dialog" aria-labelledby="location-title" onCancel={close} onClick={e=>{if(e.target===dialog.current)close();}}>
  <div className="location-heading"><div><p className="eyebrow">SEU PRÓXIMO CAMINHO COMEÇA AQUI</p><h2 id="location-title">Visite a <em>Vavau.</em></h2></div><button className="location-close" type="button" onClick={close} aria-label="Fechar mapa"><X size={22}/></button></div>
  <iframe title="Mapa da Vavau Motos em Novo Hamburgo" src={'https://www.google.com/maps?q='+encodeURIComponent(address)+'&output=embed'} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"/>
  <div className="location-footer"><div className="location-address"><MapPin size={24}/><p><strong>Vavau Moto Center</strong><span>Rua José do Patrocínio, 333 · Rio Branco<br/>Novo Hamburgo, Rio Grande do Sul</span></p></div><div className="location-actions"><a href="tel:+555135275221" className="location-phone"><Phone size={16}/>(51) 3527-5221</a><a className="button dark" href={'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(address)} target="_blank" rel="noreferrer">Traçar rota<ArrowUpRight size={17}/></a></div></div>
 </dialog>;
}
