"use client";

import { ImageSettingUploader } from "@/modules/settings/components/image-setting-uploader";
import { updateOgImageAction } from "@/modules/settings/actions/update-og-image.action";
import { removeOgImageAction } from "@/modules/settings/actions/remove-og-image.action";
import type { GeneralSettings } from "@/modules/settings/types/settings.types";

export function OgImageUploader({ initialOgImageUrl }: { initialOgImageUrl: string | null }) {
  return (
    <ImageSettingUploader<GeneralSettings>
      label="Imagem de compartilhamento"
      hint="Aparece ao compartilhar o link em redes sociais e WhatsApp. Recomendado 1200x630px. PNG, JPG ou WEBP — até 8MB."
      initialUrl={initialOgImageUrl}
      getUrlFromSettings={(settings) => settings.ogImageUrl}
      onUpload={updateOgImageAction}
      onRemove={removeOgImageAction}
    />
  );
}
