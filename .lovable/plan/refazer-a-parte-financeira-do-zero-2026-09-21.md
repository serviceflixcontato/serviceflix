# Refazer a parte financeira do zero

Só a parte financeira muda. Cadastro, contrato, solicitações, ordens de serviço, indicações e o site continuam exatamente como estão.

## Como vai funcionar

**Para o cliente (aba Pagamentos)**

Uma única tela, com um bloco principal e uma lista simples de faturas.

- No topo: o que ele precisa pagar agora — nome do plano, valor, vencimento e, se houver crédito de indicação, o desconto já mostrado na conta:
  `Valor do plano 1.800,00 − Voucher 500,00 = A pagar 1.300,00`
- Um botão só: **Pagar online**. Nenhuma outra forma de pagamento aparece para o cliente.
- Botão **Usar meu crédito** quando existir voucher disponível; ele abate e a conta se refaz na hora. Se o crédito cobrir tudo, a fatura fica quitada sem cobrança.
- Depois do pagamento: aviso claro de **Pagamento recebido — aguardando liberação da nossa equipe**, explicando que as ordens de serviço são liberadas após a aprovação.
- Abaixo, três listas enxutas: **A vencer**, **Atrasadas**, **Pagas**. A primeira mensalidade paga aparece destacada em amarelo como início do contrato.
- Aviso amarelo piscando a partir de 7 dias antes do vencimento, com opção de adiantar o pagamento. Mês adiantado não volta a aparecer.

**Para o administrativo (aba Financeiro)**

- **Aprovar contratos**: lista dos contratos pagos/aguardando, piscando em amarelo, com um botão para ativar informando como o dinheiro entrou (Online, Pix ou Dinheiro) e a data. Ativar libera as ordens de serviço do cliente.
- **Dar baixa**: faturas em aberto com um botão de baixa (método + data + observação).
- **Caixa**: cartões com total recebido no mês, total a receber, atrasado e crédito de vouchers usado, mais a quebra "como o dinheiro entrou" por forma de pagamento.
- **Lançar cobrança avulsa** (serviço adicional) continua disponível, em um lugar só.

## Detalhes técnicos

- Nenhuma mudança de banco: as mesmas tabelas `payments`, `subscriptions`, `vouchers` continuam sendo usadas.
- Novo módulo único `src/lib/money.ts` com o cálculo de fatura (valor, desconto, saldo, situação, vencimento) usado igual pelo cliente e pelo administrativo — hoje essa regra está espalhada em `billing.ts`, `finance.ts` e nas telas.
- Novo `src/lib/finance.functions.ts` reunindo as operações do servidor: gerar cobrança online, aplicar voucher, dar baixa, aprovar/ativar contrato. Substitui as funções financeiras hoje divididas entre `payments.functions.ts`, `activation.functions.ts` e partes de `admin.functions.ts`.
- Todas as operações continuam validando dono da fatura e papel de administrador no servidor; o cliente nunca marca pagamento como recebido.
- `painel.pagamentos.tsx` e `FinanceTab.tsx` reescritos sobre esses módulos; `PaymentSettle` e `ContractApproval` simplificados.
- `syncNextBilling` mantido e chamado em um único ponto após qualquer quitação, evitando mês repetido.
- Webhook do Mercado Pago mantido: marca a fatura como recebida e o contrato como aguardando aprovação manual.
- Validação com typecheck, build e conferência das telas no navegador.
