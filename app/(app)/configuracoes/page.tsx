import Link from "next/link";
import { ScrollText } from "lucide-react";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { getMercadoPagoSettingsAction } from "@/modules/settings/actions/get-mercadopago-settings.action";
import { GeneralSettingsForm } from "@/modules/settings/components/general-settings-form";
import { LogoUploader } from "@/modules/settings/components/logo-uploader";
import { FaviconUploader } from "@/modules/settings/components/favicon-uploader";
import { OgImageUploader } from "@/modules/settings/components/og-image-uploader";
import { MercadoPagoSettingsForm } from "@/modules/settings/components/mercado-pago-settings-form";

const siteUrl = process.env.AUTH_URL ?? "http://localhost:3000";

export default async function ConfiguracoesPage() {
  const [canUpdate, canViewAudit] = await Promise.all([
    hasPermission(PERMISSIONS.settings.update),
    hasPermission(PERMISSIONS.audit.view),
  ]);
  if (!canUpdate) return <ComingSoon title="Configurações" />;

  const [settings, mercadoPagoSettings] = await Promise.all([
    getGeneralSettingsAction(),
    getMercadoPagoSettingsAction(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Configurações</h1>
          <p className="text-sm text-text-secondary">Identidade visual, fuso horário e dados da barbearia.</p>
        </div>
        {canViewAudit && (
          <Link
            href="/configuracoes/logs"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-text"
          >
            <ScrollText size={16} />
            Logs de auditoria
          </Link>
        )}
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-4 text-sm font-medium text-text">Logomarca</h2>
                <LogoUploader initialLogoUrl={settings.logoUrl} />
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-4 text-sm font-medium text-text">Favicon</h2>
                <FaviconUploader initialFaviconUrl={settings.faviconUrl} />
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-4 text-sm font-medium text-text">Compartilhamento em redes sociais</h2>
                <OgImageUploader initialOgImageUrl={settings.ogImageUrl} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-medium text-text">Dados da Empresa</h2>
              <GeneralSettingsForm initialSettings={settings} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pagamentos">
          <div className="max-w-lg rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-text">Mercado Pago (Pix)</h2>
            <MercadoPagoSettingsForm
              initialSettings={mercadoPagoSettings}
              webhookUrl={`${siteUrl}/api/webhooks/mercadopago`}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
