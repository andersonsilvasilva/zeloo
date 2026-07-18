"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { provisionTenantSchema, type ProvisionTenantFormInput } from "@/modules/tenancy/schemas/provision-tenant.schema";
import { normalizeSlug } from "@/modules/tenancy/schemas/tenant.schema";
import { createTenantAction } from "@/modules/tenancy/actions/create-tenant.action";
import { checkTenantSlugAction } from "@/modules/tenancy/actions/check-tenant-slug.action";

export interface TenantFormProps {
  /** Lido server-side (APP_BASE_DOMAIN não é NEXT_PUBLIC_, não dá pra ler direto num client component). */
  baseDomain: string;
  onSuccess: (result: { slug: string; url: string }) => void;
}

export function TenantForm({ baseDomain, onSuccess }: TenantFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugCheck, setSlugCheck] = useState<{ status: "idle" | "checking" | "available" | "unavailable"; reason?: string }>({
    status: "idle",
  });
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProvisionTenantFormInput>({
    resolver: zodResolver(provisionTenantSchema),
    defaultValues: { tenantName: "", slug: "", ownerName: "", ownerEmail: "", ownerPassword: "", timezone: "America/Sao_Paulo" },
  });

  const slug = watch("slug");

  // Checagem de disponibilidade em tempo real (debounced) — pra não deixar
  // digitar um slug já usado e só descobrir a colisão depois de preencher
  // o formulário inteiro e tentar salvar.
  useEffect(() => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    if (!slug || slug.length < 3) {
      setSlugCheck({ status: "idle" });
      return;
    }
    setSlugCheck({ status: "checking" });
    slugCheckTimer.current = setTimeout(async () => {
      const result = await checkTenantSlugAction(slug);
      setSlugCheck(result.available ? { status: "available" } : { status: "unavailable", reason: result.reason });
    }, 400);
    return () => {
      if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    };
  }, [slug]);

  async function onSubmit(input: ProvisionTenantFormInput) {
    setFormError(null);
    try {
      const result = await createTenantAction(input);
      if (!result.success) return setFormError(result.error);
      onSuccess({ slug: result.tenant.slug, url: result.tenant.url });
    } catch {
      setFormError("Não foi possível criar o tenant.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="tenantName">Nome do negócio</Label>
        <Input
          id="tenantName"
          placeholder="Flora Studio"
          {...register("tenantName", {
            onChange: (e) => {
              if (!slugTouched) setValue("slug", normalizeSlug(e.target.value.replace(/[^a-zA-Z0-9]+/g, "-")));
            },
          })}
        />
        {errors.tenantName && <p className="text-sm text-danger">{errors.tenantName.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="slug">Subdomínio</Label>
        <div className="flex items-center gap-1">
          <Input
            id="slug"
            placeholder="flora"
            {...register("slug", { onChange: () => setSlugTouched(true) })}
          />
          <span className="whitespace-nowrap text-sm text-text-secondary">.{baseDomain}</span>
        </div>
        {slug && !errors.slug && (
          <p className="text-xs text-text-secondary">Endereço final: https://{slug}.{baseDomain}</p>
        )}
        {errors.slug && <p className="text-sm text-danger">{errors.slug.message}</p>}
        {!errors.slug && slugCheck.status === "checking" && (
          <p className="text-xs text-text-secondary">Verificando disponibilidade...</p>
        )}
        {!errors.slug && slugCheck.status === "available" && <p className="text-xs text-success">Disponível.</p>}
        {!errors.slug && slugCheck.status === "unavailable" && <p className="text-sm text-danger">{slugCheck.reason}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="ownerName">Nome do responsável</Label>
        <Input id="ownerName" {...register("ownerName")} />
        {errors.ownerName && <p className="text-sm text-danger">{errors.ownerName.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="ownerEmail">E-mail do responsável</Label>
        <Input id="ownerEmail" type="email" {...register("ownerEmail")} />
        {errors.ownerEmail && <p className="text-sm text-danger">{errors.ownerEmail.message}</p>}
        <p className="text-xs text-text-secondary">
          Se já existir uma conta com esse e-mail, ela é reaproveitada como dona deste tenant também.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="ownerPassword">Senha inicial</Label>
        <Input id="ownerPassword" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" {...register("ownerPassword")} />
        {errors.ownerPassword && <p className="text-sm text-danger">{errors.ownerPassword.message}</p>}
        <p className="text-xs text-text-secondary">Ignorada se o e-mail já pertencer a uma conta existente.</p>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting || slugCheck.status === "unavailable" || slugCheck.status === "checking"}>
        {isSubmitting ? "Criando..." : "Criar tenant"}
      </Button>
    </form>
  );
}
