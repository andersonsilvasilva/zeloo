import { Suspense } from "react";
import { Scissors } from "lucide-react";
import { LoginForm } from "@/modules/auth/components/login-form";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";

/**
 * Precisa ser dinâmica: como página estática, o Full Route Cache do Next
 * também cacheia a resposta da Server Action de login vinculada a ela
 * (confirmado via `x-nextjs-cache: HIT` no POST /login em produção) —
 * login às vezes "não avançava" porque reexecutava a resposta de uma
 * tentativa anterior em vez de autenticar de verdade. O `no-store` em
 * next.config.js só evita cache do CDN/navegador, não do cache interno
 * do Next. Página é leve (uma única consulta de settings), risco de EAGAIN
 * bem menor que nas rotas públicas de agendamento.
 */
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getGeneralSettingsAction();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
        <div className="mb-6 flex items-center justify-center gap-4">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt="Logomarca da barbearia"
              className="h-[100px] w-[100px] shrink-0 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-text-secondary">
              <Scissors size={32} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-text">{settings.name || "Barbershop SaaS"}</h1>
            <p className="text-sm text-text-secondary">Entre com sua conta</p>
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
