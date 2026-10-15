const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function paintFallback(color:string){
 const c=normalized(color);
 return ([ [/azul/,'#305778'],[/vermelh|vinho/,'#79383e'],[/grafite|pret/,'#25272a'],[/cinza/,'#b8afa5'],[/prat/,'#afb7ba'],[/branc/,'#d6d5ce'],[/amarel|dourad|champan|rose/,'#b5a083'],[/laranja/,'#9c5c32'],[/rox|violet/,'#705780'],[/marr|bege/,'#a18a72'],[/verd/,'#52634d'] ] as const).find(([pattern])=>pattern.test(c))?.[1]||'#343c31';
}
export function themeForColor(color:string,paint?:string){
 const hex=paint&&/^#[0-9a-f]{6}$/i.test(paint)?paint:paintFallback(color);
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const light=rgb.reduce((sum,c,i)=>sum+(c/255<=.04045?c/255/12.92:((c/255+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0)>.35;
 // Keep vivid paint hues atmospheric, while allowing silver/champagne to stay light.
 const base=light?rgb:rgb.map(c=>Math.round(c*.45));
 const mix=(amount:number,target=255)=>`rgb(${base.map(c=>Math.round(c+(target-c)*amount)).join(',')})`;
 return {'--theme-rgb':base.join(','),'--theme-dark':mix(0),'--theme-panel':mix(light?.08:.1),'--theme-soft':mix(.88),'--theme-paper':mix(.96),'--theme-accent':mix(.1,0),
 '--theme-foreground':light?'#282421':'#f3f3ec','--theme-muted':light?'#50483f':'#bac0b5','--theme-highlight':light?'#665020':'#d5b774','--theme-border':light?'#71655650':'#d5b77430','--theme-logo-filter':light?'brightness(.2)':'sepia(1) saturate(1.2)'};
}
