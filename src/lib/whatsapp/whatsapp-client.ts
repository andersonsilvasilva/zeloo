/**
 * Envio real via WhatsApp Cloud API (Meta). Fora da janela de 24h de uma
 * conversa iniciada pelo cliente, a Meta só aceita mensagens de "template"
 * pré-aprovado — por isso o envio aqui sempre usa `type: "template"`, nunca
 * texto livre. O nome/idioma do template são configuráveis via env porque
 * ainda não há um template de barbearia aprovado (ver WHATSAPP_TEMPLATE_NAME);
 * até lá, usamos o "hello_world" de exemplo só para validar a integração.
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

export async function sendWhatsAppTemplateMessage(params: { to: string }): Promise<{ providerRef: string }> {
  const token = process.env.WHATSAPP_BUSINESS_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new WhatsAppNotConfiguredError();

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "hello_world";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US";

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
      template: { name: templateName, language: { code: languageCode } },
    }),
  });

  const data: { error?: { message?: string }; messages?: { id: string }[] } = await response.json();

  if (!response.ok || data.error) {
    throw new WhatsAppSendError(data.error?.message ?? "Falha ao enviar mensagem pelo WhatsApp.");
  }

  return { providerRef: data.messages?.[0]?.id ?? "" };
}
