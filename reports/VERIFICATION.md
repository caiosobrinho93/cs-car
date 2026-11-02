# Verificação — 02/11/2026

## Verificações automatizadas

- `npm test`: 24 verificações SQL aprovadas em PGlite com Auth e Storage simulados; cobre RLS, autoria, aprovação, snapshots, transições e Storage.
- `node scripts/test-team-migration.mjs`: migração da equipe e locais aprovada; comissão calculada como percentual do preço anunciado.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado com Next.js 16.4.3; rotas `/`, `/loja`, `/rede` e `/api/admin/invite` geradas.
- `git diff --check`: aprovado; há apenas avisos de conversão de final de linha no Windows.
- Servidor local confirmado ativo em `http://localhost:3001/`.
- Gestão de equipe: quando falta a credencial privada de servidor, o endpoint responde `503` explicativo; a interface mostra o motivo e bloqueia convites até a configuração.

## Navegador e dados

- Desktop (1421×892): homepage carregada no Chrome headless; o primeiro quadro ocupa o topo e o header fica transparente sobre a hero.
- Mobile (Chrome headless com viewport de 500×749): o menu fica fixo no canto superior, abre em tela cheia e fecha corretamente. A chamada da hero cabe na largura. Ao rolar além do fim da hero, o header troca para o fundo escuro; no topo, permanece transparente.
- Tablet (768×1024): captura anterior conferida; hero, títulos e chamadas permanecem dentro da viewport.
- Produção: `https://cs-car-alpha.vercel.app/` retorna HTTP 200, o título e a hero são renderizados, e os frames 001/196 desktop/mobile retornam HTTP 200 como `image/webp`.
- Commit anterior publicado: `ed419f6` (`Smooth hero frame scroll response`); Vercel marcou a implantação de produção como `READY` e atribuiu o alias `cs-car-alpha.vercel.app`.
- Painel Supabase hospedado: migrações `20261102171304`, `20261102172037` e `20261102172132` aparecem no histórico.
- Banco consultado após arquivar os anúncios de teste: 1 membro administrador, 0 vendedores, 2 locais ativos e 4 veículos em rascunho; 0 veículos disponíveis para a vitrine.
- Advisor de segurança: resta somente `auth_leaked_password_protection`, indisponível no plano Free escolhido.
- Vercel Production: estão cadastradas apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `SUPABASE_SERVICE_ROLE_KEY` não está configurada.
- Supabase Auth SMTP: SMTP personalizado está habilitado, mas remetente, host, usuário e senha estão vazios; convites e recuperação de senha por e-mail não podem funcionar ainda.
- Atualização de diagnóstico: commit `535e6af` implantado em Production como `READY`, alias `cs-car-alpha.vercel.app`. Homepage respondeu HTTP 200; `GET /api/admin/invite` respondeu HTTP 503 com instrução para configurar a chave ausente. No dashboard autenticado, o aviso fica visível e os controles de convite permanecem desativados.

## Pendente para operação pública

- Convites por e-mail ainda dependem de configurar `SUPABASE_SERVICE_ROLE_KEY` como variável privada de Production na Vercel e preencher os dados do SMTP Gmail no Supabase Auth. Não foi enviada credencial nem alterado segredo; o envio de convites não foi validado em produção.
- Os quatro anúncios de teste foram preservados como rascunhos, sem apagar os registros nem as fotos; a vitrine pública mostra o estado vazio até a equipe cadastrar e publicar veículos reais.
- No plano Free, a proteção de senhas vazadas segue desativada conforme a decisão do proprietário.
- Os dois locais ativos com nomes semelhantes foram preservados; confirmar se são locais reais antes de renomear ou arquivar.
