/**
 * Cliente HTTP puro pra API de Pagamentos do Mercado Pago (Pix).
 *
 * Diferente do cliente do WhatsApp (`src/lib/whatsapp/whatsapp-client.ts`),
 * as credenciais aqui NÃO vêm de env var — vêm do banco (via
 * SettingsService, editável pelo Administrador em Configurações →
 * Pagamentos), então cada função recebe o `accessToken` já resolvido como
 * parâmetro, em vez de ler `process.env` diretamente. Isso também evita
 * import circular com o módulo de settings.
 */

const MERCADO_PAGO_API_BASE = "https://api.mercadopago.com";

export class MercadoPagoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercadoPagoError";
  }
}

export class MercadoPagoNotConfiguredError extends MercadoPagoError {
  constructor() {
    super("Integração com Mercado Pago não configurada. Cadastre o Access Token em Configurações → Pagamentos.");
    this.name = "MercadoPagoNotConfiguredError";
  }
}

export interface CreatePixPaymentInput {
  accessToken: string;
  amount: number;
  description: string;
  /** Usado como `external_reference` — facilita rastrear a cobrança do lado do Mercado Pago. */
  appointmentId: string;
  payerEmail: string;
  notificationUrl?: string;
}

export interface PixPaymentResult {
  mercadoPagoPaymentId: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
}

interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
  message?: string;
  cause?: { description?: string }[];
}

function extractErrorMessage(data: MercadoPagoPaymentResponse): string {
  return data.cause?.[0]?.description || data.message || "Falha ao comunicar com o Mercado Pago.";
}

export async function createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
  if (!input.accessToken) throw new MercadoPagoNotConfiguredError();

  const response = await fetch(`${MERCADO_PAGO_API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${input.appointmentId}-${Date.now()}`,
    },
    body: JSON.stringify({
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.appointmentId,
      notification_url: input.notificationUrl,
      payer: { email: input.payerEmail },
    }),
  });

  const data: MercadoPagoPaymentResponse = await response.json();

  if (!response.ok) {
    throw new MercadoPagoError(extractErrorMessage(data));
  }

  const transactionData = data.point_of_interaction?.transaction_data;
  if (!transactionData?.qr_code || !transactionData?.qr_code_base64) {
    throw new MercadoPagoError("Mercado Pago não retornou o QR code da cobrança Pix.");
  }

  return {
    mercadoPagoPaymentId: String(data.id),
    status: data.status,
    qrCode: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64,
  };
}

export async function getPaymentStatus(accessToken: string, mercadoPagoPaymentId: string): Promise<string> {
  if (!accessToken) throw new MercadoPagoNotConfiguredError();

  const response = await fetch(`${MERCADO_PAGO_API_BASE}/v1/payments/${mercadoPagoPaymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data: MercadoPagoPaymentResponse = await response.json();

  if (!response.ok) {
    throw new MercadoPagoError(extractErrorMessage(data));
  }

  return data.status;
}
