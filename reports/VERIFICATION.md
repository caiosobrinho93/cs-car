# Verificação — 02/11/2026

## Verificações automatizadas

- `npm test`: 24 verificações SQL aprovadas em PGlite com Auth e Storage simulados; cobre RLS, autoria, aprovação, snapshots, transições e Storage.
- `node scripts/test-team-migration.mjs`: migração da equipe e locais aprovada; comissão calculada como percentual do preço anunciado.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado com Next.js 16.4.3; rotas `/`, `/loja`, `/rede` e `/api/admin/invite` geradas.
- `git diff --check`: aprovado; há apenas avisos de conversão de final de linha no Windows.
- Servidor local confirmado ativo em `http://localhost:3001/`.

## Navegador e dados

- Desktop: homepage carregada no navegador local. O vídeo da hero ocupa o topo da tela; o header transparente aparece sobre a imagem. A sequência usa 196 frames e a página mostra o estado vazio do catálogo.
- Painel Supabase hospedado: migrações `20261102171304`, `20261102172037` e `20261102172132` aparecem no histórico.
- Banco consultado: 1 membro administrador, 2 locais, 0 veículos.
- Advisor de segurança: resta somente `auth_leaked_password_protection`, indisponível no plano Free escolhido.
- Advisor de performance: não aponta índices ausentes; informa que 6 índices ainda não foram usados, condizente com as tabelas vazias.

## Pendente para operação pública

- Ainda falta concluir uma conferência visual em viewport mobile e tablet.
- Convites por e-mail dependem da configuração do SMTP Gmail no Supabase Auth e de `SUPABASE_SERVICE_ROLE_KEY` privada na Vercel. Esses segredos não estão no repositório.
- Não há anúncios ativos; o catálogo real continuará vazio até a equipe cadastrar os primeiros veículos e fotos.
- Não foi feito deploy nesta revisão.
