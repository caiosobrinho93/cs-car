# Verificação — 27/10/2026

- TypeScript e build de produção aprovados.
- 24 verificações SQL aprovadas em PGlite com Auth/Storage simulados.
- Navegador: hero começa em frame 1, avança a frame 36 pela rolagem e retorna a 1 ao subir.
- Busca por “astra” retorna apenas o Astra; filtro Manual no celular retorna o mesmo veículo.
- Detalhes abrem e fecham; link WhatsApp aponta para 5517997448213 com modelo e preço.
- Indicação fictícia registra comprador, preço de R$ 36.900, parceiro R$ 1.500 e CS Car R$ 400.
- Alternância João/Marcelo: proprietário confirma a venda; parceiro confirma recebimento; indicador mostra R$ 1.500 recebidos. Outras indicações do mesmo carro são encerradas.
- Edição do Golf altera o preço na tabela. Exemplos restaurados após o teste.
- Revisão em viewports 1440×900 e 390×844, sem overflow horizontal da página no celular.
- Console do navegador sem erros/avisos durante a verificação do painel.
- Integração Supabase hospedada, e-mail e deploy não executados: aguardam configuração.

Captura do painel: `dashboard-desktop.png`.
