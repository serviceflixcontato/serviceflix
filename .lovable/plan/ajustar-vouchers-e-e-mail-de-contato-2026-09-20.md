# Ajustar vouchers e e-mail de contato

## Alterações
- Exibir no topo de Pagamentos o crédito total disponível em vouchers.
- Mostrar, em cada fatura, o valor do plano, o crédito aplicado e a diferença restante.
- Permitir aplicar vouchers disponíveis com um clique, acumulando vários até quitar a fatura.
- Remover vouchers da lista assim que forem totalmente utilizados e impedir reutilização.
- Trocar o e-mail de contato exibido no site para `service.flix.contato@gmail.com`.

## Detalhes técnicos
- Manter o abatimento registrado por fatura e recalcular o saldo após cada aplicação.
- Quando a soma dos vouchers cobrir o valor integral, marcar a fatura como paga sem abrir outro pagamento.
- Validar a tela e o funcionamento após as mudanças.
