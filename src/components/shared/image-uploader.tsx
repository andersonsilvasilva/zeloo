"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

export type ImageUploadResult = { success: true; url: string | null } | { success: false; error: string };

export interface ImageUploaderProps {
  initialUrl: string | null;
  alt: string;
  /** Recebe um FormData com o campo "file" e retorna a nova URL (ou erro). */
  onUpload: (formData: FormData) => Promise<ImageUploadResult>;
  onRemove: () => Promise<ImageUploadResult>;
  shape?: "square" | "circle";
  emptyLabel?: string;
}

/**
 * Uploader de imagem genérico (logo, foto de barbeiro, foto de cliente...).
 * A regra de negócio (validação, StorageProvider, Media) vive em cada Action —
 * este componente só orquestra a UI e chama o par upload/remove recebido.
 */
export function ImageUploader({
  initialUrl,
  alt,
  onUpload,
  onRemove,
  shape = "square",
  emptyLabel = "Sem foto",
}: ImageUploaderProps) {
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
    setUrl(result.url);
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
    setUrl(result.url);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex h-24 w-24 items-center justify-center overflow-hidden border border-border bg-background-secondary",
          shape === "circle" ? "rounded-full" : "rounded-xl",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs text-text-secondary">{emptyLabel}</span>
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
          {busy ? "Enviando..." : url ? "Trocar foto" : "Enviar foto"}
        </Button>
        {url && (
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
