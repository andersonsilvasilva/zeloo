"use client";

import { ImageSettingUploader } from "@/modules/settings/components/image-setting-uploader";
import { updateFaviconAction } from "@/modules/settings/actions/update-favicon.action";
import { removeFaviconAction } from "@/modules/settings/actions/remove-favicon.action";
import type { GeneralSettings } from "@/modules/settings/types/settings.types";

export function FaviconUploader({ initialFaviconUrl }: { initialFaviconUrl: string | null }) {
  return (
    <ImageSettingUploader<GeneralSettings>
      label="Favicon"
      hint="Ícone da aba do navegador. PNG, JPG ou WEBP, de preferência quadrado — até 8MB."
      initialUrl={initialFaviconUrl}
      getUrlFromSettings={(settings) => settings.faviconUrl}
      onUpload={updateFaviconAction}
      onRemove={removeFaviconAction}
    />
  );
}
