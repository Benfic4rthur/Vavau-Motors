import {ChevronLeft,ChevronRight} from 'lucide-react';
export default function CatalogPagination({total,size,page,setSize,setPage}:{total:number;size:number;page:number;setSize:(n:number)=>void;setPage:(n:number)=>void}){
 if(!total)return null;
 const pages=Math.ceil(total/size);
 return <nav className="catalog-pagination" aria-label="Paginação de motos"><div className="page-size"><label htmlFor="page-size">Motos por página</label><select id="page-size" value={size} onChange={e=>setSize(Number(e.target.value))}>{[12,24,36].map(n=><option key={n} value={n}>{n}</option>)}</select><span>{(page-1)*size+1}–{Math.min(page*size,total)} de {total}</span></div><div className="page-navigation"><button type="button" disabled={page===1} onClick={()=>setPage(page-1)} aria-label="Página anterior de motos"><ChevronLeft size={17}/><span>Anterior</span></button><span className="page-position" aria-live="polite">{page} <i>/ {pages}</i></span><button type="button" disabled={page===pages} onClick={()=>setPage(page+1)} aria-label="Próxima página de motos"><span>Próxima</span><ChevronRight size={17}/></button></div></nav>;
}
