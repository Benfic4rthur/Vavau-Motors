# Vavau Motos

Site estático em React, TypeScript e Vite. Catálogo de motos, filtros, favoritos neste dispositivo, galerias completas, entregas de clientes e contato com a loja. Sem banco de dados ou senha de Instagram. A área da equipe usa uma função no Vercel para autenticar e gravar fotos e JSON no GitHub; os segredos ficam no servidor.

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

A rotina diária permanece habilitada para reconferir os anúncios conhecidos. Sua execução sinaliza falha enquanto a descoberta pelo perfil não estiver disponível. A publicação de atualizações verificadas pode concluir mesmo com essa falha parcial. Cadastro de novas motos ainda exige acrescentar o link à lista de fontes ou editar os dados manualmente. O administrador permite fazer esses cadastros manualmente quando a leitura pública estiver bloqueada.

## Administração no Vercel

Abra `/admin`. O painel permite cadastrar motos e entregas, enviar até 30 fotos por cadastro, reorganizar a galeria, ajustar preço/quilometragem, escolher destaque, trabalhar em rascunho e marcar uma moto como vendida. Não há checkout. Acesso em `Meu acesso` permite alterar login e senha, exigindo a senha atual.

A Vercel executa apenas `api/admin.ts`; o frontend continua estático. Configure no projeto, em Production e Preview:

| Variável | Uso |
| --- | --- |
| `ADMIN_INITIAL_USERNAME` | Login inicial |
| `ADMIN_INITIAL_PASSWORD_HASH` | Hash scrypt da senha inicial, nunca a senha em texto |
| `ADMIN_SESSION_SECRET` | Segredo aleatório do servidor, com pelo menos 32 caracteres |
| `GITHUB_REPOSITORY` | `Benfic4rthur/Vavau-Motors` |
| `GITHUB_BRANCH` | `main` |
| `GITHUB_WRITE_TOKEN` | Fine-grained PAT apenas deste repositório, Contents: Read and write |

Para gerar um hash de outra senha, use `passwordHash` em `server/security.mjs` em um script local que leia a senha sem publicá-la. Nunca use prefixo `VITE_` em segredos. Não envie `.env.local`, arquivos `*.local.txt` ou a pasta `work/` ao GitHub. O arquivo local de acesso é ignorado pelo Git.

Cada foto é convertida no navegador para WebP (até 1600 px) e enviada separadamente ao servidor. A função exige sessão válida e envia o blob ao GitHub. Ao salvar, um único commit inclui fotos, `data/catalog.json`, o catálogo público e as correções manuais. Se houver alteração concorrente, o painel pede atualização e não força o histórico. Blobs de uploads interrompidos não são vinculados à árvore do repositório.

A vitrine consulta o catálogo atualizado pela função pública, inclusive quando estiver hospedada no Pages, sem precisar executar Actions a cada edição. Os arquivos estáticos do site são recompilados pelo deploy normal da Vercel. A rotina diária no GitHub continua sendo o único workflow próprio.

Login usa cookie HttpOnly, Secure em HTTPS, SameSite Strict e validade de duas horas. Alterações de acesso ficam em `data/admin-auth.enc.json`, cifradas com AES-GCM; a chave fica somente na Vercel. Uma troca invalida sessões anteriores. Há proteção de origem nos POSTs e limite básico de tentativas por instância; não é um bloqueio distribuído. Mantenha um token limitado ao repositório e renove-o antes de expirar.

Se a autorização do GitHub ainda não estiver configurada, o login funciona em modo de leitura e as gravações ficam desabilitadas. Nada é publicado de mentirinha.

Para migração, leve o repositório e configure as mesmas variáveis no novo backend Node. Preserve o `ADMIN_SESSION_SECRET` para ler o acesso cifrado já salvo ou recupere o acesso removendo o arquivo cifrado em um commit autorizado e configurando novos valores iniciais. `site.config.json` informa os endereços públicos da API e do admin.

Em desenvolvimento, `.env.local` habilita um adaptador isolado: mudanças ficam em `work/admin-local/`, sem gravar no catálogo real ou no GitHub. Os testes verificam autenticação, origem, sessão, troca de acesso cifrada, fotos, estados públicos e conflitos de commit.
