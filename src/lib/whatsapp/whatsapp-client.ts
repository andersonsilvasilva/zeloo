/**
 * Envio real via WhatsApp Cloud API (Meta). Fora da janela de 24h de uma
 * conversa iniciada pelo cliente, a Meta só aceita mensagens de "template"
 * pré-aprovado — por isso o envio aqui sempre usa `type: "template"`, nunca
 * texto livre. O nome/idioma do template são configuráveis via env
 * (WHATSAPP_TEMPLATE_NAME/WHATSAPP_TEMPLATE_LANGUAGE); até o template de
 * confirmação de agendamento ("confirmacao_agendamento", pt_BR, submetido
 * pra aprovação da Meta em 2026-07-11) ser aprovado, o padrão continua
 * sendo o "hello_world" de exemplo, que não aceita variáveis.
 */

export class WhatsAppSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppSendError";
  }
}

export class WhatsAppNotConfiguredError extends WhatsAppSendError {
  constructor() {
    super("Integração com WhatsApp não configurada (defina WHATSAPP_BUSINESS_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID).");
    this.name = "WhatsAppNotConfiguredError";
  }
}

/** Normaliza para o formato exigido pela API (só dígitos, com DDI 55 se ausente). */
function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function sendWhatsAppTemplateMessage(params: {
  to: string;
  /** Valores, em ordem, para as variáveis {{1}}, {{2}}... do corpo do template ativo. */
  parameters?: string[];
}): Promise<{ providerRef: string }> {
  const token = process.env.WHATSAPP_BUSINESS_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new WhatsAppNotConfiguredError();

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "hello_world";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US";

  const template: { name: string; language: { code: string }; components?: unknown[] } = {
    name: templateName,
    language: { code: languageCode },
  };

  // "hello_world" (template de exemplo, sem variáveis) quebraria se
  // recebesse parâmetros — só inclui components quando um template real
  // (com variáveis no corpo) estiver configurado.
  if (templateName !== "hello_world" && params.parameters && params.parameters.length > 0) {
    template.components = [
      {
        type: "body",
        parameters: params.parameters.map((text) => ({ type: "text", text })),
      },
    ];
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhoneNumber(params.to),
      type: "template",
      template,
    }),
  });

  const data: { error?: { message?: string }; messages?: { id: string }[] } = await response.json();

  if (!response.ok || data.error) {
    throw new WhatsAppSendError(data.error?.message ?? "Falha ao enviar mensagem pelo WhatsApp.");
  }

  return { providerRef: data.messages?.[0]?.id ?? "" };
}
