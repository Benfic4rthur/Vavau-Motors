// One cover selection, persisted together with the edited product.
export function updateCatalog(current, product) {
 const selected=product.kind==='moto'&&product.status==='available'&&product.featured;
 const saved={...product,featured:!!selected};
 return [saved,...current.filter(p=>p.id!==saved.id).map(p=>selected&&p.featured?{...p,featured:false}:p)];
}
