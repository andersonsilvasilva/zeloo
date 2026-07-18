import "server-only";
import { rawPrisma } from "@/lib/tenancy/raw-prisma";
import { SETTINGS_KEYS } from "@/modules/settings/schemas/settings.schema";

export interface SupportContact {
  whatsappUrl: string | null;
}

/** Formato aceito pelo wa.me: só dígitos, com DDI (assume Brasil, 55, se ausente). */
function toWhatsAppUrl(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountryCode}`;
}

/**
 * WhatsApp de suporte mostrado em `/tenant-indisponivel` — sempre o do
 * tenant RAIZ (zeloo), nunca o do tenant suspenso que trouxe o visitante
 * até essa página (não faria sentido depender do contato de quem está
 * indisponível). Usa `rawPrisma` de propósito: a extensão de isolamento
 * sempre sobrescreveria `tenantId` pelo da requisição atual (o tenant
 * suspenso), então não tem como ler o Setting de outro tenant pelo client
 * estendido — é exatamente essa barreira que o isolamento existe pra
 * garantir, então aqui, que precisa ser cross-tenant de propósito, usa o
 * client cru. Falha silenciosamente (retorna null) em vez de derrubar a
 * página — isso aqui é só um link de conveniência, não algo crítico.
 */
export async function getSupportContact(): Promise<SupportContact> {
  try {
    const rootSlug = process.env.ROOT_TENANT_SLUG ?? "";
    if (!rootSlug) return { whatsappUrl: null };

    const rootTenant = await rawPrisma.tenant.findUnique({ where: { slug: rootSlug }, select: { id: true } });
    if (!rootTenant) return { whatsappUrl: null };

    const setting = await rawPrisma.setting.findFirst({
      where: { tenantId: rootTenant.id, key: SETTINGS_KEYS.whatsapp },
    });
    if (!setting?.value) return { whatsappUrl: null };

    return { whatsappUrl: toWhatsAppUrl(setting.value) };
  } catch {
    return { whatsappUrl: null };
  }
}
