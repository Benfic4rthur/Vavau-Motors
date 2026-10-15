import { z } from 'zod';
import {productSchema} from '../../shared/product-schema.mjs';
export {productSchema};
export type Product=z.infer<typeof productSchema>;
export const money=(n:number|null)=>n===null?'Sob consulta':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
export const number=(n:number)=>new Intl.NumberFormat('pt-BR').format(n);
export const categories=['Street','Naked','Adventure & Trail','Esportiva','Custom','Clássica','Scooter & Cub'];
export const kindLabels={moto:'Motos',peca:'Peças',equipamento:'Equipamentos',servico:'Serviços',cliente:'Clientes & entregas'};
export function whatsapp(product?:Product,topic?:string){return 'https://wa.me/555135275221?text='+encodeURIComponent(product?`Olá, Vavau! Tenho interesse na ${product.name} (${money(product.price)}). Ela ainda está disponível?`:`Olá, Vavau! Gostaria de saber mais sobre ${topic||'as motos disponíveis'}.`);}

export function chooseCover(products:Product[]):Product|undefined {return products.filter(p=>p.kind==='moto'&&p.status==='available'&&p.images.length>0).map((p,i)=>({p,i})).sort((a,b)=>Number(b.p.featured)-Number(a.p.featured)||((Date.parse(b.p.sourceDate||'')||0)-(Date.parse(a.p.sourceDate||'')||0))||a.i-b.i)[0]?.p;}

export const asset=(src:string)=>src.startsWith('/assets/')?import.meta.env.BASE_URL+src.slice(1):src;
