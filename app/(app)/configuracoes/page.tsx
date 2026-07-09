import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { GeneralSettingsForm } from "@/modules/settings/components/general-settings-form";
import { LogoUploader } from "@/modules/settings/components/logo-uploader";

export default async function ConfiguracoesPage() {
  const canUpdate = await hasPermission(PERMISSIONS.settings.update);
  if (!canUpdate) return <ComingSoon title="Configurações" />;

  const settings = await getGeneralSettingsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Configurações</h1>
        <p className="text-sm text-text-secondary">Identidade visual, fuso horário e dados da barbearia.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-medium text-text">Logomarca</h2>
          <LogoUploader initialLogoUrl={settings.logoUrl} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-text">Dados da barbearia</h2>
          <GeneralSettingsForm initialSettings={settings} />
        </div>
      </div>
    </div>
  );
}
