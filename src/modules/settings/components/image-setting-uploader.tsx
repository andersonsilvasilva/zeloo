"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type UploadResult<TSettings> = { success: true; settings: TSettings } | { success: false; error: string };

export function ImageSettingUploader<TSettings>({
  label,
  hint,
  initialUrl,
  getUrlFromSettings,
  onUpload,
  onRemove,
}: {
  label: string;
  hint: string;
  initialUrl: string | null;
  getUrlFromSettings: (settings: TSettings) => string | null;
  onUpload: (formData: FormData) => Promise<UploadResult<TSettings>>;
  onRemove: () => Promise<UploadResult<TSettings>>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setBusy(true);

    const formData = new FormData();
    formData.set("file", file);
    const result = await onUpload(formData);

    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setUrl(getUrlFromSettings(result.settings));
    router.refresh();
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    const result = await onRemove();
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setUrl(getUrlFromSettings(result.settings));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-background-secondary">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-center text-xs text-text-secondary">Sem imagem</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {busy ? "Enviando..." : url ? "Trocar" : "Enviar"}
        </Button>
        {url && (
          <Button type="button" variant="danger" size="sm" disabled={busy} onClick={handleRemove}>
            <Trash2 className="h-4 w-4" />
            Remover
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-text-secondary">{hint}</p>
    </div>
  );
}
