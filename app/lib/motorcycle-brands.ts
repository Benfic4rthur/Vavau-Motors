import entries from '../../shared/motorcycle-brands.json';
export const motorcycleBrands=entries;
const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function motorcycleBrand(brand:string,model=''){
 const key=normalized(brand),text=normalized(model);
 return motorcycleBrands.find(b=>normalized(b.name)===key)||(!key?motorcycleBrands.find(b=>text.startsWith(normalized(b.name))):undefined);
}
