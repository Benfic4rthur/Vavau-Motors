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

Ao marcar uma moto como destaque no admin, o mesmo salvamento desmarca a anterior no catálogo e nas correções manuais. Sem destaque, a capa escolhe a moto disponível com foto mais recente por **data da publicação**. Motos vendidas saem da seleção. Sem estoque, aparece a identidade institucional. A paleta analisa a região central da foto, usando a cor da ficha como referência para a pintura (sem priorizar pneus e banco pretos). Se a leitura for inconclusiva, usa a paleta da cor informada. O campo opcional “Tom da capa” permite corrigir a nuance. A análise é local no navegador, sem API ou serviço pago; fotos com enquadramento diferente podem exigir ajuste manual. Tons claros recebem texto escuro. O dourado dos botões mantém a identidade da marca.

Catálogo inicial conferido em 14/10/2026: 29 motos anunciadas como disponíveis, 270 fotos de motos e 12 registros de entregas. O estoque usa publicações de 01/01/2025 em diante; esse corte não se refere ao ano da moto. A pedido do proprietário, cinco entregas antigas de outubro de 2023 foram acrescentadas ao histórico em 15/10/2026, com fotos e datas conferidas no Instagram. Fotos de entregas ficam separadas do estoque. Não há avaliações ou depoimentos inventados. Peças, equipamentos e serviços foram removidos do escopo.

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

O painel aplica as correções diretamente ao salvar. Para manutenção pelo código, edite `data/catalog.json` e gere/publique outra versão. Valores e disponibilidade devem ser confirmados com a loja.

## Atualizações do catálogo

As motos e as entregas são atualizadas manualmente pelo painel no Vercel. A rotina diária foi desabilitada e o arquivo de workflow foi removido a pedido do proprietário. Este projeto não usa GitHub Actions para cadastro, upload ou publicação da Vercel.

Os scripts de importação pública permanecem no código apenas como ferramentas locais opcionais de manutenção. Não são executados automaticamente. O Instagram pode exigir login ou restringir leitura; ele não é a fonte automática do site.

## Administração no Vercel

A vitrine está em https://vavau-motos.vercel.app/ e o painel em https://vavau-motos.vercel.app/admin. Abra `/admin`. O painel permite cadastrar motos e entregas, enviar até 30 fotos por cadastro, reorganizar a galeria, informar o nome do cliente e a moto entregue nas histórias, selecionar entre 21 marcas com logo associado, ajustar preço/quilometragem, escolher destaque, trabalhar em rascunho e marcar uma moto como vendida. Não há checkout. Acesso em `Meu acesso` permite alterar login e senha, exigindo a senha atual.

A Vercel executa apenas `api/admin.ts`; o frontend continua estático. Configure no projeto em Production (repita em Preview se precisar de um ambiente de testes com gravação):

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

A vitrine consulta o catálogo atualizado pela função pública, inclusive quando estiver hospedada no Pages, sem precisar executar Actions a cada edição. Os arquivos estáticos do site são recompilados pelo deploy normal da Vercel. Não há workflow agendado ou GitHub Action próprio ativo.

Login usa cookie HttpOnly, Secure em HTTPS, SameSite Strict e validade de duas horas. Alterações de acesso ficam em `data/admin-auth.enc.json`, cifradas com AES-GCM; a chave fica somente na Vercel. Uma troca invalida sessões anteriores. Há proteção de origem nos POSTs e limite básico de tentativas por instância; não é um bloqueio distribuído. Mantenha um token limitado ao repositório e renove-o antes de expirar. A chave deste projeto foi autorizada até **15/10/2027**, com Contents leitura/gravação e Metadata leitura apenas para este repositório; a Vercel a armazena como Secret em Production. O projeto usa Hobby; não foi ativado plano pago ou integração de armazenamento cobrada.

Se a autorização do GitHub ainda não estiver configurada, o login funciona em modo de leitura e as gravações ficam desabilitadas. Nada é publicado de mentirinha.

Para migração, leve o repositório e configure as mesmas variáveis no novo backend Node. Preserve o `ADMIN_SESSION_SECRET` para ler o acesso cifrado já salvo ou recupere o acesso removendo o arquivo cifrado em um commit autorizado e configurando novos valores iniciais. `site.config.json` informa os endereços públicos da API e do admin.

Em desenvolvimento, `.env.local` habilita um adaptador isolado: mudanças ficam em `work/admin-local/`, sem gravar no catálogo real ou no GitHub. Os testes verificam autenticação, origem, sessão, troca de acesso cifrada, fotos, estados públicos e conflitos de commit.

### Verificação do painel em 15/10/2026

Os 19 testes automatizados, a checagem TypeScript e o build passaram. Na produção, o login com cookie HttpOnly, o carregamento dos 36 cadastros e a conexão de gravação foram verificados. Um upload real enviou uma foto WebP, criou um rascunho em um único commit e confirmou a foto no GitHub. O endpoint público manteve os 36 registros publicados e excluiu o rascunho. O commit do teste foi revertido, removendo o cadastro temporário e sua foto da versão atual.

### Marcas e imagens

Os dois formulários usam o mesmo seletor de 21 marcas, com prévia do logo e opção para outra marca. Os arquivos originais dos logos ficam em `public/assets/brands/`; a procedência de cada arquivo está em `sources.json` nessa pasta. A maioria vem dos sites dos fabricantes; BMW e Vespa usam os arquivos vetoriais da Simple Icons (CC0). Os logos são imagens reais, sem desenho em CSS ou geração por IA.

Nas histórias, a marca selecionada determina o logo. As fotos do catálogo abrem a ficha da moto; setas e indicadores continuam navegando apenas na galeria.
