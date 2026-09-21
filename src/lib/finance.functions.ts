/**
 * Ponto único das operações financeiras no servidor.
 *
 * As telas (área do cliente e painel administrativo) importam tudo daqui,
 * para não haver dois caminhos diferentes fazendo a mesma coisa com o dinheiro.
 *
 * Cliente: só gera cobrança online e usa o crédito de voucher.
 * Administrativo: dá baixa nos pagamentos e aprova/ativa o contrato.
 */

export {
  createInvoiceCheckout,
  createUpcomingInvoice,
  getPaymentConfig,
  setPaymentMode,
} from "./payments.functions";

export { applyAvailableVouchersToPayment as applyMyCredit } from "./rewards.functions";

export { chooseSubscriptionPayment } from "./activation.functions";

export {
  createFinanceCharge,
  setPaymentStatusManually,
  setSubscriptionApproval,
} from "./admin.functions";
