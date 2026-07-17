import { Ban } from "lucide-react";

/**
 * Destino de `requireCurrentTenant()` (src/lib/tenancy/current-tenant.ts,
 * Fase 2) quando o tenant resolvido pelo hostname está `SUSPENDED` ou
 * `CANCELLED` (spec §18). De propósito **sem nenhuma consulta ao banco** —
 * mensagem genérica, sem depender de settings/branding do próprio tenant
 * (que pode não fazer sentido mostrar justamente numa conta suspensa) e sem
 * risco de essa página falhar por falta de contexto de tenant, já que é
 * exatamente esse tipo de situação-limite que traz o visitante até aqui.
 */
export const dynamic = "force-dynamic";

export default function TenantIndisponivelPage() {
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
      </div>
    </main>
  );
}
