# Vavau Motos

Site estático em React, TypeScript e Vite. Catálogo de motos, filtros, favoritos neste dispositivo, galerias completas, entregas de clientes e contato com a loja. Sem banco de dados, área administrativa, senha de Instagram ou segredo no navegador.

## Desenvolvimento e migração

Requer Node.js 22.13 ou posterior.

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

A prévia abre em http://127.0.0.1:5173/. Publique o conteúdo de `dist-static/` em qualquer hospedagem estática. Para domínio próprio, a base padrão é `/`; para uma subpasta, defina `PAGES_BASE` antes de gerar a versão. `npm run build:pages` gera também `docs/`, com base `/Vavau-Motors/` e `.nojekyll`.

O repositório foi tornado público com autorização do proprietário para usar GitHub Pages. O site e suas fotos são públicos. Para migrar mantendo o código privado, use um plano com Pages privado ou outra hospedagem estática.

## Dados, correções e capa

- `data/catalog.json`: fonte editável.
- `public/assets/`: fotos WebP e logo.
- `public/catalog-seed.json`: catálogo público gerado, apenas itens publicados.
- `data/overrides.json`: correções que prevalecem sobre as importações.
- `data/source-posts.json`: links públicos encontrados no perfil.

A capa escolhe a moto disponível com foto mais recente por **data da publicação**. `#destaque` na legenda tem prioridade; entre vários destaques, ganha o mais recente. Motos vendidas saem da seleção. Sem estoque, aparece a identidade institucional. A cor da moto define a paleta, mantendo o dourado da marca.

Catálogo inicial conferido em 14/10/2026: 29 motos anunciadas como disponíveis, 270 fotos de motos e 7 registros de entregas. Só foram importadas publicações de 01/01/2025 em diante; esse corte não se refere ao ano da moto. Fotos de entregas ficam separadas do estoque. Não há avaliações ou depoimentos inventados. Peças, equipamentos e serviços foram removidos do escopo.

Para correções, use o ID do registro em `data/overrides.json`:

```json
{
  "items": {
    "ID_DA_PUBLICACAO": { "price": 42900, "featured": true },
    "OUTRO_ID": { "hide": true }
  },
  "ignorePosts": []
}
```

As correções passam a valer na próxima sincronização. Para manutenção manual, edite `data/catalog.json` e gere/publique outra versão. Valores e disponibilidade devem ser confirmados com a loja.

## Importador público e rotina diária

Há um único workflow próprio, `Atualizar catálogo`, com agendamento diário às **07h23 de Brasília** (10h23 UTC), limite de 10 minutos e acionamento manual pelo botão Run workflow. O GitHub pode atrasar o agendamento. Não há execução automática a cada push. A variável de repositório `SYNC_ENABLED=true` habilita o agendamento; a chamada manual funciona mesmo sem ela. `PAGES_ENABLED=true` habilita publicação pelo workflow.

O importador usa páginas públicas, sem login, cookies pessoais, API da Meta ou tentativa de contornar bloqueios. Reconfere estoque ativo e procura novidades no perfil. Uma moto só entra automaticamente com disponibilidade explícita e campos reconhecidos. Uma legenda marcada como vendida retira a moto; entrega explícita entra nas histórias. Posts fora do escopo são ignorados.

O padrão de legenda reconhecido é `Marca:`, `Modelo:`, `Ano:`, `Cor:`, `Potência:`, `Quilometragem:` e `R$`. Podem usar `Tipo: moto` ou `#vavaumoto`, e `Tipo: entrega` ou `#vavaucliente`. O `#destaque` só produz efeito após uma importação e publicação bem-sucedidas.

**Limite:** o Instagram pode exigir login ou restringir a leitura pública, inclusive por origem do acesso. Sem confirmar autor, data original ou galeria completa, o importador preserva o registro anterior e registra a falha. Não interpreta falha ou desaparecimento de post como venda. Após três falhas seguidas, interrompe a execução. A rotina não faz novas tentativas automáticas em sequência. A integração depende do acesso público permanecer disponível.

Só há novo build/publicação quando o catálogo muda ou quando `Publicar mesmo sem alterações` é solicitado manualmente. Usa o token temporário do próprio GitHub, restrito a esse repositório, para commits e publicação; não precisa salvar PAT nem login da loja. Relatórios vão ao resumo da execução; nenhum dado de login é coletado.

Para rodar o importador fora do GitHub:

```sh
npx playwright install chromium
npm run sync
npm run check
npm test
npm run build:pages
```

Confira `data/sync-report.json` e as alterações antes de um envio manual. Esse relatório local não é versionado. O estado de coleta permite reutilizar fotos já verificadas. Fotos de vídeos não são importadas como se fossem fotos do carrossel.

### Resultado do teste em 15/10/2026

A publicação no Pages foi concluída. A execução completa leu 75 publicações conhecidas e conferiu as 29 motos do estoque, reaproveitando suas galerias. O acesso ao perfil foi redirecionado para `/accounts/login/`; por isso a descoberta de novas publicações está bloqueada nesse ambiente. Dois reels também não forneceram mídia/data suficientes e foram preservados fora do catálogo.

A rotina diária permanece habilitada para reconferir os anúncios conhecidos. Sua execução sinaliza falha enquanto a descoberta pelo perfil não estiver disponível. A publicação de atualizações verificadas pode concluir mesmo com essa falha parcial. Cadastro de novas motos ainda exige acrescentar o link à lista de fontes ou editar os dados manualmente. O administrador com cadastro manual foi proposto e ainda não foi implementado.
