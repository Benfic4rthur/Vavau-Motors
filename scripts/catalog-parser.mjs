export const CUTOFF='2025-01-01T00:00:00.000Z';
export const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const field=(text,name)=>{const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return text.match(new RegExp('(?:^|\\n)\\s*[-•]?\\s*'+escaped+'\\s*:\\s*([^\\n]+)','i'))?.[1]?.trim()||'';};
export function parseMoney(value){const raw=String(value||'').replace(/R\$\s*/g,'').replace(/[^\d.,]/g,'');if(!raw)return null;const n=Number(raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw.replace(/\.(?=\d{3}(?:\D|$))/g,''));return Number.isFinite(n)&&n>=0&&n<=10000000?n:null;}
export function postCode(url){try{return new URL(url).pathname.match(/\/(?:p|reel)\/([\w-]+)/)?.[1]||null;}catch{return null;}}
export function cleanCaption(raw){return String(raw||'').replace(/^[\s\S]*? (?:no|on) Instagram:\s*[“\"]?/i,'').replace(/[”\"]\s*$/,'').trim();}
export function classification(caption){const text=normalize(caption),start=text.slice(0,400);const explicit=normalize(field(caption,'Tipo'));
 if(/^(cliente|entrega)$/.test(explicit)||/#vavaucliente\b/.test(text))return 'cliente';
 if(/^(moto|motocicleta)$/.test(explicit)||/#vavaumoto\b/.test(text))return 'moto';
 if(/^(peca|acessorio)$/.test(explicit)||/#vavaupeca\b/.test(text))return 'peca';
 if(/^(equipamento)$/.test(explicit)||/#vavauequipamento\b/.test(text))return 'equipamento';
 if(/^(servico|manutencao)$/.test(explicit)||/#vavauservico\b/.test(text))return 'servico';
 if(/(?:^|\n)\s*[-•]?\s*quilometragem\s*:/.test(text)&&(/marca\s*:|modelo\s*:/.test(text)))return 'moto';
 if(/parabens|mais um(?:a)? (?:sonho|cliente)|sonho realizado|boa(?:s)? (?:estrada|viagen)|felicidades|nova conquista|obrigad[oa].{0,80}confianca|cliente.{0,60}(?:levou|retirou|recebeu)|entrega (?:da|do|de|realizada)/.test(start))return 'cliente';
 if(/capacete|luva|jaqueta|bota.{0,10}(?:moto|pilot)|equipamento.{0,20}pilot/.test(start))return 'equipamento';
 if(/mobil super moto|oleo.{0,30}(?:20w|10w)|filtro de (?:oleo|ar)|kit (?:relacao|transmissao)|pastilha de freio|pecas? (?:para|de) moto/.test(start))return 'peca';
 if(/troca de oleo|revisao|manutencao|diagnostico|balanceamento/.test(start))return 'servico';
 return null;
}
export function categoryFor(kind,name,caption=''){const t=normalize(name+' '+caption);
 if(kind==='cliente')return 'Entrega';if(kind==='equipamento')return /capacete/.test(t)?'Capacetes':/luva/.test(t)?'Luvas':/jaqueta/.test(t)?'Jaquetas':/bota/.test(t)?'Botas':'Proteções & equipamentos';if(kind==='servico')return /oleo/.test(t)?'Troca de óleo':/revisao/.test(t)?'Revisão':/diagnostico/.test(t)?'Diagnóstico':'Manutenção';if(kind==='peca')return /oleo|filtro|mobil/.test(t)?'Óleos e filtros':/freio|pastilha|disco/.test(t)?'Freios':/relacao|transmissao|corrente/.test(t)?'Transmissão':'Peças & acessórios';
 if(/pcx|biz |burgman|nmax|elite|scooter|lead |neo /.test(t))return 'Scooter & Cub';if(/fat boy|softail|shadow|virago|drag star|intruder|vulcan|boulevard|harley|sportster/.test(t))return 'Custom';if(/scrambler|hunter|classic 350|meteor|bonneville|continental gt|interceptor/.test(t))return 'Clássica';if(/tiger|tdm|multistrada|sahara|xre|tenere|t[eê]n[eé]r[eé]|v.strom|versys|africa twin|r\s?1[12][05]0\s?gs|trail|bros|lander|crosser/.test(t))return 'Adventure & Trail';if(/hayabusa|ninja|cbr|gsx.r|s1000rr|r1\b|r6\b|panigale/.test(t))return 'Esportiva';if(/mt.0|g\s?310|twister|fz25|cb\s?[356]\d\d|er.6|hornet|r1200\s?r/.test(t))return 'Naked';return 'Street';
}
export function parsePost(post,existing){
 const code=postCode(post.url),caption=cleanCaption(post.caption),time=Date.parse(post.timestamp||'');
 if(!code||!Number.isFinite(time))return {action:'skip',reason:'Data da publicação não confirmada.'};
 if(time<Date.parse(CUTOFF))return {action:'skip',reason:'Publicação anterior a 2025.'};
 if(!caption)return {action:'skip',reason:'Legenda não disponível.'};
 const normalized=normalize(caption),header=normalized.slice(0,220),sold=/\bvendid[ao]s?\b|\bindisponivel\b|status\s*:\s*(?:vendid[ao]|indisponivel)/.test(header),kind=classification(caption);
 if(sold&&existing?.kind==='moto')return {action:'sold',product:{...existing,status:'sold',featured:false,images:[]},reason:'Anúncio marcado como vendido.'};
 if(!kind||!['moto','cliente'].includes(kind))return {action:'skip',reason:'Publicação fora do catálogo de motos e entregas.'};
 if(kind==='moto'&&(sold||!/(?:^|[^\p{L}])dispon[ií]vel(?:[^\p{L}]|$)|#disponivel/iu.test(caption.slice(0,250))))return {action:'skip',reason:'Moto sem disponibilidade explícita.'};
 if(kind!=='moto'&&kind!=='cliente'&&sold)return {action:'skip',reason:'Produto vendido.'};
 const lines=caption.split('\n').map(x=>x.trim()).filter(Boolean);const nameField=field(caption,'Nome')||field(caption,'Produto');
 let name=nameField||lines.find(l=>!/[✅❌🔥🏍💰]|^(tipo|status|preco|preço)\s*:/i.test(l)&&!/^#/.test(l))||'';
 name=name.replace(/^[^\p{L}\p{N}]+/u,'').slice(0,160);
 const brand=field(caption,'Marca'),model=field(caption,'Modelo');
 if(kind==='moto'&&!model)return {action:'skip',reason:'Modelo da moto não identificado.'};
 if(kind==='moto'&&(!name||name.includes(':')||/disponivel|vendido/i.test(normalize(name))))name=`${brand} ${model}`.trim();
 if(kind==='cliente')name='Uma nova história sobre duas rodas';
 if(name.length<3)return {action:'skip',reason:'Nome do item não identificado.'};
 const years=field(caption,'Ano').match(/(19\d{2}|20\d{2})(?:\s*\/\s*(19\d{2}|20\d{2}))?/);const year=kind==='moto'&&years?Number(years[2]||years[1]):null,manufactureYear=kind==='moto'&&years?Number(years[1]):null;
 const kmText=field(caption,'Quilometragem')||field(caption,'Km');const kmNumber=Number(kmText.replace(/[^\d]/g,''));const km=kind==='moto'&&kmText&&Number.isFinite(kmNumber)&&kmNumber<3000000?kmNumber:null;
 const priceText=field(caption,'Preço')||field(caption,'Valor')||caption.match(/R\$\s*[\d.,]+/)?.[0];const price=kind==='cliente'?null:parseMoney(priceText);
 const power=field(caption,'Potência')||field(caption,'Cilindrada');let horsepower=power.match(/([\d.,]+)\s*cv/i)?.[1],engineCc=power.match(/([\d.,]+)\s*cc/i)?.[1];let hp=horsepower?parseMoney(horsepower):null,cc=engineCc?parseMoney(engineCc):null;
 if(hp!==null&&(hp>300||hp<1)||cc!==null&&(cc<80||cc>3000)){hp=null;cc=null;}
 const features=[];if(/unico dono/.test(normalized))features.push('Único dono');if(/manual/.test(normalized))features.push('Manual do proprietário');if(/chave reserva/.test(normalized))features.push('Chave reserva');if(/bau central/.test(normalized))features.push('Baú central anunciado');
 const extra=caption.split(/🤝|💳|☎|📍/)[0].split('\n').filter(l=>l.trim()&&!/^(?:\s*[-•]?\s*)?(?:marca|modelo|ano|cor|pot[eê]ncia|cilindrada|quilometragem|km|pre[cç]o|valor|tipo|status)\s*:/i.test(l)&&!/[✅❌💰]|R\$|^\s*#/.test(l)).join('\n').trim();
 const product={id:code,kind,name,brand,model:kind==='moto'?model:'',year,manufactureYear,km,price,color:field(caption,'Cor'),category:field(caption,'Categoria')||categoryFor(kind,name,caption),engineCc:kind==='moto'?cc:null,horsepower:kind==='moto'?hp:null,images:[],source:`https://www.instagram.com/p/${code}/`,description:kind==='cliente'?'Registro de entrega publicado pela Vavau Motos.':extra.slice(0,1800),features:kind==='moto'?features:[],status:'available',featured:kind==='moto'&&/#destaque\b/i.test(caption),sourceDate:new Date(time).toISOString(),collectedAt:new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})};
 return {action:'upsert',product};
}
export function mergeProducts(products,updates,overrides={}){const map=new Map(products.map(p=>[p.id,p]));for(const p of updates)map.set(p.id,p);for(const [id,patch] of Object.entries(overrides.items||{})){const old=map.get(id);if(!old)continue;if(patch.hide){map.set(id,{...old,status:'archived',featured:false});continue;}const allowed=['name','customerName','model','brand','category','price','color','description','featured','status','images','year','manufactureYear','km','engineCc','horsepower','features','sourceDate'];const clean=Object.fromEntries(Object.entries(patch).filter(([k])=>allowed.includes(k)));map.set(id,{...old,...clean});}return [...map.values()];}
