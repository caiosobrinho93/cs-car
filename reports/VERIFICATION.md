# Verificação — 02/11/2026

## Verificações automatizadas

- `npm test`: 24 verificações SQL aprovadas em PGlite com Auth e Storage simulados; cobre RLS, autoria, aprovação, snapshots, transições e Storage.
- `node scripts/test-team-migration.mjs`: migração da equipe e locais aprovada; comissão calculada como percentual do preço anunciado.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado com Next.js 16.4.3; rotas `/`, `/loja`, `/rede` e `/api/admin/invite` geradas.
- `git diff --check`: aprovado; há apenas avisos de conversão de final de linha no Windows.
- Servidor local confirmado ativo em `http://localhost:3001/`.

## Navegador e dados

- Desktop (1421×892): homepage carregada no Chrome headless; o primeiro quadro ocupa o topo e o header fica transparente sobre a hero.
- Mobile (Chrome headless com viewport de 500×749): o menu fica fixo no canto superior, abre em tela cheia e fecha corretamente. A chamada da hero cabe na largura. Ao rolar além do fim da hero, o header troca para o fundo escuro; no topo, permanece transparente.
- Tablet (768×1024): captura anterior conferida; hero, títulos e chamadas permanecem dentro da viewport.
- Produção: `https://cs-car-alpha.vercel.app/` retorna HTTP 200, o título e a hero são renderizados, e os frames 001/196 desktop/mobile retornam HTTP 200 como `image/webp`.
- Commit publicado: `ed419f6` (`Smooth hero frame scroll response`); Vercel marcou a implantação de produção como `READY` e atribuiu o alias `cs-car-alpha.vercel.app`.
- Painel Supabase hospedado: migrações `20261102171304`, `20261102172037` e `20261102172132` aparecem no histórico.
- Banco consultado após arquivar os anúncios de teste: 1 membro administrador, 2 locais e 4 veículos em rascunho; 0 veículos disponíveis para a vitrine.
- Advisor de segurança: resta somente `auth_leaked_password_protection`, indisponível no plano Free escolhido.
- Advisor de performance: não aponta índices ausentes; informa que 6 índices ainda não foram usados, condizente com as tabelas vazias.

## Pendente para operação pública

- Convites por e-mail ainda dependem da configuração do SMTP Gmail no Supabase Auth e de `SUPABASE_SERVICE_ROLE_KEY` privada na Vercel. Esses segredos não estão no repositório, então o envio de convites não foi validado em produção.
- Os quatro anúncios de teste foram preservados como rascunhos, sem apagar os registros nem as fotos; a vitrine pública mostra o estado vazio até a equipe cadastrar e publicar veículos reais.
- No plano Free, a proteção de senhas vazadas segue desativada conforme a decisão do proprietário.
