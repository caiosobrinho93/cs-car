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
- `/rede`: painel de parceiros e administração.

Sem as duas variáveis do Supabase, o sistema usa uma demonstração explícita, com dados fictícios salvos no navegador. A opção “Ver como” alterna entre João, Marcelo e Avenida Motors. “Restaurar exemplos” restaura apenas os exemplos locais da rede. Não há autenticação, compartilhamento entre dispositivos nem pagamentos reais no modo de demonstração.

## Supabase

1. Crie um projeto novo. Execute `supabase/001_initial.sql` uma única vez no SQL Editor. Este arquivo substitui o rascunho inicial da conversa; se você executou aquele rascunho, será necessária uma migração específica antes de usar o novo SQL.
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a URL e chave pública do projeto. Não use `service_role` no navegador.
3. Configure a URL do site e os redirecionamentos em Supabase Auth; mantenha confirmação de e-mail habilitada. Cadastre sua conta pela tela `/rede`, incluindo os dados da garagem. O trigger cria uma garagem pendente; criar contas diretamente no painel exige os mesmos metadados.
4. Promova sua conta a administradora pelo SQL Editor, substituindo o UUID nos dois comandos comentados ao final do SQL. A administração passa a mostrar “Aprovar parceiros”.
5. Valide com duas contas reais: aprovação, login, upload, anúncio, indicação, visita, venda, recebimento do parceiro e recebimento CS Car.

O banco separa dados públicos dos valores de comissão. Escritas comerciais passam por funções transacionais com verificação de autoria, aprovação e transição. O preço e as comissões da indicação são preservados mesmo que o anúncio mude. Uma venda encerra outras indicações abertas para o mesmo veículo. Eventos são registrados em `referral_events`.

Cada conta representa uma garagem nesta versão. Equipes com vários vendedores dentro da mesma garagem ainda não foram implementadas. As comissões são valores fixos em reais por anúncio, configuráveis no formulário; uma tabela comercial obrigatória da CS Car ainda precisa ser definida. O status “Comissão recebida” corresponde ao parceiro; a CS Car confirma seu recebimento separadamente como administradora. O sistema registra pagamentos feitos fora da plataforma, sem transferir dinheiro ou garantir comissões.

Fotos ficam em bucket público e devem conter apenas imagens dos veículos. Novos uploads substituem a galeria do anúncio; arquivos antigos não são removidos automaticamente. Não envie documentos de compradores. Publicação de anúncios depende da garagem estar aprovada. O contato dos compradores é visível apenas às garagens envolvidas e à administração.

## GitHub e Vercel

Código preparado, sem repositório remoto criado e sem deploy realizado.

1. Crie ou indique o repositório GitHub e envie o projeto (sem `.env.local`).
2. Importe o repositório na Vercel, framework Next.js, instalação `npm ci`, build `npm run build` e Node.js 22+.
3. Cadastre as duas variáveis públicas do Supabase na Vercel e faça um novo deploy.
4. Atualize Site URL e Redirect URLs no Supabase Auth para o domínio final.
5. O workflow `.github/workflows/ci.yml` executa verificações de tipos, testes SQL locais e build.

## Imagens e hero

Originais: pasta `frames_Camera_panning_around_sports_car_70b05187` no Desktop. Foram encontrados 120 frames; selecionamos 100 uniformemente, incluindo início e fim, sem modificar os originais. `public/sequence/manifest.json` registra o mapeamento. Para gerar novamente: `npm run frames` (ou `node scripts/prepare-frames.mjs CAMINHO_DA_PASTA`).

Desktop 1280 px, mobile 768 px. O canvas usa fila de carregamento e cache limitado de imagens decodificadas; a rolagem avança e retrocede. Preferência por movimento reduzido apresenta imagem estática. As fotos da loja são ilustrativas e não representam necessariamente o modelo cadastrado. Fontes de fotos: `public/cars/sources.json`; frames fornecidos pelo usuário. Tipografia via Google Fonts com fallback local.

## Verificação

```sh
npm run typecheck
npm test
npm run build
```

Os testes SQL usam PostgreSQL via PGlite, com Auth/Storage simulados; não substituem a validação final no Supabase hospedado. O teste cobre RLS, aprovação, autoria, comissões privadas, snapshots, duplicidade, transições de venda e acesso ao armazenamento. Ver `reports/VERIFICATION.md` para os testes manuais no navegador.

## Pendências para operação real

- Credenciais e validação do Supabase, repositório GitHub e publicação Vercel.
- E-mail comercial: ainda não fornecido, portanto não há formulário ou envio de e-mail fictício.
- Regras definitivas de comissão da CS Car, condições de intermediação e textos institucionais finais.
- Dados e fotos dos veículos reais; a migração não importa veículos de demonstração.

Referências técnicas consultadas: https://supabase.com/docs/guides/database/postgres/row-level-security e documentação local do Next.js em `node_modules/next/dist/docs/`.
