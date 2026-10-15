import { z } from 'zod';
const image = z.string().max(2000).refine(s => /^\/(assets\/|api\/media\/)[\w./-]+$/.test(s) || /^https:\/\//.test(s), 'Use uma imagem enviada ou uma URL HTTPS.');
export const productSchema = z.object({
 id:z.string().min(1).max(120).regex(/^[\w-]+$/), kind:z.enum(['moto','peca','equipamento','servico','cliente']), name:z.string().trim().min(3).max(160),
 brand:z.string().max(80).default(''), model:z.string().max(120).default(''), category:z.string().min(1).max(80),
 year:z.number().int().min(1900).max(2100).nullable().default(null), manufactureYear:z.number().int().min(1900).max(2100).nullable().default(null),
 km:z.number().int().min(0).max(3000000).nullable().default(null), price:z.number().min(0).max(10000000).nullable().default(null), color:z.string().max(80).default(''),
 engineCc:z.number().min(0).max(10000).nullable().default(null), horsepower:z.number().min(0).max(1000).nullable().default(null),
 images:z.array(image).max(30).default([]), source:z.string().max(2000).refine(s=>!s||/^https:\/\//.test(s),'URL HTTPS inválida').default(''),
 description:z.string().max(8000).default(''), features:z.array(z.string().max(200)).max(30).default([]),
 status:z.enum(['available','sold','draft','archived']).default('draft'), featured:z.boolean().default(false), sourceDate:z.string().max(40).nullable().default(null),collectedAt:z.string().max(40).nullable().default(null)
});
export type Product=z.infer<typeof productSchema>;
export const money=(n:number|null)=>n===null?'Sob consulta':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
export const number=(n:number)=>new Intl.NumberFormat('pt-BR').format(n);
export const categories=['Street','Naked','Adventure & Trail','Esportiva','Custom','Clássica','Scooter & Cub'];
export const kindLabels={moto:'Motos',peca:'Peças',equipamento:'Equipamentos',servico:'Serviços',cliente:'Clientes & entregas'};
export function whatsapp(product?:Product,topic?:string){return 'https://wa.me/555135275221?text='+encodeURIComponent(product?`Olá, Vavau! Tenho interesse na ${product.name} (${money(product.price)}). Ela ainda está disponível?`:`Olá, Vavau! Gostaria de saber mais sobre ${topic||'as motos disponíveis'}.`);}

export function chooseCover(products:Product[]):Product|undefined {return products.filter(p=>p.kind==='moto'&&p.status==='available'&&p.images.length>0).map((p,i)=>({p,i})).sort((a,b)=>Number(b.p.featured)-Number(a.p.featured)||((Date.parse(b.p.sourceDate||'')||0)-(Date.parse(a.p.sourceDate||'')||0))||a.i-b.i)[0]?.p;}

export const asset=(src:string)=>src.startsWith('/assets/')?import.meta.env.BASE_URL+src.slice(1):src;
