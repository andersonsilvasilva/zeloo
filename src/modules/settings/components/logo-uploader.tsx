"use client";

import { ImageSettingUploader } from "@/modules/settings/components/image-setting-uploader";
import { updateLogoAction } from "@/modules/settings/actions/update-logo.action";
import { removeLogoAction } from "@/modules/settings/actions/remove-logo.action";
import type { GeneralSettings } from "@/modules/settings/types/settings.types";

export function LogoUploader({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  return (
    <ImageSettingUploader<GeneralSettings>
      label="Logomarca"
      hint="PNG, JPG ou WEBP — até 8MB."
      initialUrl={initialLogoUrl}
      getUrlFromSettings={(settings) => settings.logoUrl}
      onUpload={updateLogoAction}
      onRemove={removeLogoAction}
    />
  );
}
