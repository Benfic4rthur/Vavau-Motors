import {asset} from './lib/product';
import {motorcycleBrand,motorcycleBrands} from './lib/motorcycle-brands';
export function MotorcycleBrandLogo({brand,model='',compact=false}:{brand:string;model?:string;compact?:boolean}){
 const match=motorcycleBrand(brand,model);if(!match)return null;
 return <span className={`motorcycle-brand-logo ${match.dark?'on-dark':''} ${compact?'compact':''}`}><img src={asset('/assets/brands/'+match.file)} alt={match.name} loading="lazy" width={80} height={36}/></span>;
}
export function MotorcycleBrandField({value,onChange,required=false}:{value:string;onChange:(brand:string)=>void;required?:boolean}){
 const match=motorcycleBrand(value),other=!!value&&!match;
 return <div className="motorcycle-brand-field"><label>Marca<select value={match?.name||(other?'other':'')} required={required} onChange={e=>onChange(e.target.value==='other'?'Outra marca':e.target.value)}><option value="">Selecione a marca</option>{motorcycleBrands.map(b=><option key={b.name} value={b.name}>{b.name}</option>)}<option value="other">Outra marca</option></select></label>{other&&<label>Nome da marca<input required={required} maxLength={80} value={value==='Outra marca'?'':value} onChange={e=>onChange(e.target.value||'Outra marca')} placeholder="Informe a marca"/></label>}<MotorcycleBrandLogo brand={value}/></div>;
}
