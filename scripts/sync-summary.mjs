import {readFile,appendFile} from 'node:fs/promises';
try{
  const r=JSON.parse(await readFile('data/sync-report.json','utf8'));
  const lines=['## Atualização do catálogo',`Conferidos: ${r.checked}. Alterações: ${r.changed}. Vendidas: ${r.sold}. Novos links: ${r.discovered}.`,`Descoberta pelo perfil: ${r.profileRead?'disponível':'indisponível'}.`,...r.failures.map(f=>`- ${f.post}: ${f.reason}`),'O catálogo anterior permanece quando a leitura de um item falha.'];
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n\n')+'\n');
  console.log(lines.join('\n'));
}catch{console.log('Importador não gerou relatório. Catálogo existente preservado.');}
