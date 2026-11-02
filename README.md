# CS Car

Site e rede de intermediação de veículos em Next.js, React, GSAP e Supabase.

## Rodar

Requer Node.js 22 ou superior.

```sh
npm ci
npm run dev -- --port 3001
```

- `/`: hero com 100 frames ligados à rolagem, apresentação e vitrine.
- `/loja`: catálogo, filtros, favoritos, detalhes e WhatsApp.
- `/rede`: painel interno da CS Car para administração, vendedores e locais físicos.

Sem as variáveis públicas do Supabase, o sistema usa uma demonstração explícita, com dados fictícios salvos apenas no navegador. O modo de demonstração não cria contas, compartilha dados entre dispositivos nem registra pagamentos reais.

## Supabase

1. O projeto Supabase hospedado já contém a migração da equipe interna e os dois ajustes de segurança/índices, aplicados em 02/11/2026. Para uma instalação nova, aplique primeiro os scripts base `supabase/001_initial.sql` e `supabase/002_garage_contact_email.sql`, depois todos os arquivos de `supabase/migrations/` em ordem de nome. Não reaplique migrações já registradas no histórico do banco.
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A chave `SUPABASE_SERVICE_ROLE_KEY` é necessária somente para convites; mantenha-a apenas no servidor, como variável sem prefixo `NEXT_PUBLIC_`.
3. Configure em Supabase Auth a URL do site e os redirecionamentos para `/rede`. A migração bloqueia cadastro público: novas contas entram por convite de administrador.
4. Configure SMTP de produção em Supabase Auth para que os convites cheguem aos vendedores. O Gmail temporário ainda precisa ser configurado no provedor; nenhuma senha de e-mail deve ser colocada no frontend ou no Git.
5. Entre com a conta administradora existente. Ela recebe o perfil interno de administrador pela migração. No painel, convide vendedores, defina a comissão de cada um e habilite a permissão de edição quando necessário. O padrão de vendedor é somente consulta.
6. Cadastre os locais físicos e associe cada anúncio a um local. O preço anunciado é único; a comissão do vendedor é calculada sobre esse valor e fica em tabela privada.

O banco separa dados do catálogo dos valores de comissão. Apenas o administrador cria ou desativa locais. As gravações de anúncios validam equipe, permissão de edição e local ativo; o catálogo público só lê veículos disponíveis e nome do local. As estruturas antigas de indicações permanecem no banco para preservar os dados legados, mas não fazem parte do fluxo da equipe interna.

As contas pertencem à equipe interna (administrador e vendedores); locais não têm login. A comissão é percentual e individual por vendedor, calculada sobre o preço anunciado. O painel não movimenta dinheiro. Fotos ficam em bucket público e devem conter apenas imagens dos veículos. Novos uploads substituem a galeria do anúncio; arquivos antigos não são removidos automaticamente.

## GitHub e Vercel

O projeto está ligado ao GitHub e à Vercel. Este trabalho permanece local e não foi publicado.

1. Crie ou indique o repositório GitHub e envie o projeto (sem `.env.local`).
2. Importe o repositório na Vercel, framework Next.js, instalação `npm ci`, build `npm run build` e Node.js 22+.
3. Cadastre URL e chave pública do Supabase na Vercel. Adicione também `SUPABASE_SERVICE_ROLE_KEY` e `NEXT_PUBLIC_SITE_URL` para o endpoint de convites.
4. Configure SMTP e atualize Site URL e Redirect URLs no Supabase Auth para o domínio final.
5. O workflow `.github/workflows/ci.yml` executa verificações de tipos, testes SQL locais e build.

## Imagens e hero

Originais: pasta `frames_test2` no Desktop. A sequência atual contém 196 frames. `public/sequence/manifest.json` registra o mapeamento. Para regenerar desktop e mobile com compressão WebP: `npm run frames` (ou `node scripts/prepare-frames.mjs CAMINHO_DA_PASTA`). O comando padrão usa `Desktop/frames_test2`.

Desktop 1280 px, mobile 768 px. O canvas usa fila de carregamento e cache limitado de imagens decodificadas; a rolagem avança e retrocede. Preferência por movimento reduzido apresenta imagem estática. As fotos de catálogo só são reais quando enviadas no anúncio; não há veículos ativos no banco nesta revisão. Fontes das imagens ilustrativas de catálogo: `public/cars/sources.json`; frames fornecidos pelo usuário. Tipografia via Google Fonts com fallback local.

## Verificação

```sh
npm run typecheck
npm test
npm run build
```

Os testes SQL usam PostgreSQL via PGlite, com Auth/Storage simulados; não substituem a validação final no Supabase hospedado. O teste cobre RLS, aprovação, autoria, comissões privadas, snapshots, duplicidade, transições de venda e acesso ao armazenamento. Ver `reports/VERIFICATION.md` para os testes manuais no navegador.

## Pendências para operação real

- Adicionar a chave de service role à configuração privada da Vercel para ativar convites.
- Configurar SMTP no Supabase (o remetente Gmail temporário ainda não foi conectado).
- Configurar SMTP em Supabase Auth (Gmail temporário) e `SUPABASE_SERVICE_ROLE_KEY` privado na Vercel; sem ambos, convites de vendedores não chegam.
- Cadastrar os primeiros veículos e enviar fotos reais; o banco foi verificado vazio nesta revisão, portanto o catálogo público mostra o estado vazio.
- No plano Free do Supabase, a proteção de senhas vazadas continua desativada; o advisor de segurança ainda sinaliza esse aviso.
- Fazer uma revisão responsiva final em viewport mobile real/emulado antes da divulgação pública.

Referências técnicas consultadas: https://supabase.com/docs/guides/database/postgres/row-level-security e documentação local do Next.js em `node_modules/next/dist/docs/`.
