import { Ban, ExternalLink } from "lucide-react";
import { getCurrentTenant } from "@/lib/tenancy/current-tenant";
import { getSupportContact } from "@/modules/tenancy/services/support-contact.service";

/**
 * Destino de `requireCurrentTenant()` (src/lib/tenancy/current-tenant.ts,
 * Fase 2) quando o tenant resolvido pelo hostname está `SUSPENDED` ou
 * `CANCELLED` (spec §18). De propósito **sem depender de settings/branding
 * do próprio tenant** (que pode não fazer sentido mostrar justamente numa
 * conta suspensa) e sem risco de essa página falhar por falta de contexto
 * de tenant. Só lê a identidade básica do tenant atual (nome/slug, já
 * resolvida pelo middleware, `getCurrentTenant()` é `cache()`-memoizado —
 * custo zero extra) pra incluir na mensagem pronta do WhatsApp, não pra
 * exibir branding. O contato de suporte (número) é lido do tenant RAIZ
 * especificamente (`getSupportContact()`), nunca do tenant suspenso — com
 * fallback silencioso se falhar, nunca derruba a página por causa disso.
 */
export const dynamic = "force-dynamic";

export default async function TenantIndisponivelPage() {
  const [{ whatsappUrl }, tenant] = await Promise.all([getSupportContact(), getCurrentTenant()]);

  const whatsappHref = whatsappUrl
    ? (() => {
        const message = tenant
          ? `Olá! O acesso ao painel do negócio "${tenant.name}" (${tenant.slug}.zeloo.net) está suspenso. Poderia me ajudar?`
          : "Olá! O acesso ao painel de um dos negócios está suspenso. Poderia me ajudar?";
        return `${whatsappUrl}?text=${encodeURIComponent(message)}`;
      })()
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-danger/30 text-danger">
          <Ban size={28} />
        </div>
        <h1 className="text-lg font-semibold text-text">Conta indisponível</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Este espaço está temporariamente suspenso ou não está mais ativo. Entre em contato com o suporte pra
          mais informações.
        </p>

        <div className="mt-6 space-y-2">
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-light focus-gold"
            >
              Falar no WhatsApp
              <ExternalLink size={14} />
            </a>
          )}
          <a
            href="https://zeloo.net"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-primary focus-gold"
          >
            zeloo.net
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </main>
  );
}
