"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateLogoAction } from "@/modules/settings/actions/update-logo.action";
import { removeLogoAction } from "@/modules/settings/actions/remove-logo.action";

export function LogoUploader({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
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
    const result = await updateLogoAction(formData);

    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setLogoUrl(result.settings.logoUrl);
    router.refresh();
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      const result = await removeLogoAction();
      setLogoUrl(result.settings.logoUrl);
      router.refresh();
    } catch {
      setError("Não foi possível remover a logomarca.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-background-secondary">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logomarca da barbearia" className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-center text-xs text-text-secondary">Sem logo</span>
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
          {busy ? "Enviando..." : logoUrl ? "Trocar logo" : "Enviar logo"}
        </Button>
        {logoUrl && (
          <Button type="button" variant="danger" size="sm" disabled={busy} onClick={handleRemove}>
            <Trash2 className="h-4 w-4" />
            Remover
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-text-secondary">PNG, JPG ou WEBP — até 8MB.</p>
    </div>
  );
}
