"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  mercadoPagoSettingsSchema,
  type MercadoPagoSettingsInput,
} from "@/modules/settings/schemas/settings.schema";
import { updateMercadoPagoSettingsAction } from "@/modules/settings/actions/update-mercadopago-settings.action";
import type { MercadoPagoSettings } from "@/modules/settings/types/settings.types";

export function MercadoPagoSettingsForm({
  initialSettings,
  webhookUrl,
}: {
  initialSettings: MercadoPagoSettings;
  webhookUrl: string;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<MercadoPagoSettingsInput>({
    resolver: zodResolver(mercadoPagoSettingsSchema),
    defaultValues: { accessToken: "", webhookSecret: "" },
  });

  async function onSubmit(input: MercadoPagoSettingsInput) {
    setFormError(null);
    setSuccessMessage(null);
    try {
      const result = await updateMercadoPagoSettingsAction(input);
      setSettings(result.settings);
      reset({ accessToken: "", webhookSecret: "" });
      setSuccessMessage("Credenciais salvas com sucesso.");
    } catch {
      setFormError("Não foi possível salvar as credenciais.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-sm text-text-secondary">
        Credenciais da sua conta Mercado Pago, usadas para gerar cobranças Pix na tela de recebimento. Encontre o
        Access Token e crie um segredo de webhook no{" "}
        <a
          href="https://www.mercadopago.com.br/developers/panel"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          painel de desenvolvedores do Mercado Pago
        </a>
        .
      </p>

      <div className="space-y-1">
        <Label htmlFor="accessToken">Access Token</Label>
        <Input
          id="accessToken"
          type="password"
          autoComplete="off"
          placeholder={settings.accessTokenMasked ?? "APP_USR-..."}
          {...register("accessToken")}
        />
        {settings.accessTokenMasked && (
          <p className="text-xs text-text-secondary">Atual: {settings.accessTokenMasked}. Deixe em branco para manter.</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="webhookSecret">Assinatura secreta do webhook</Label>
        <Input
          id="webhookSecret"
          type="password"
          autoComplete="off"
          placeholder={settings.webhookSecretMasked ?? "Opcional, mas recomendado"}
          {...register("webhookSecret")}
        />
        {settings.webhookSecretMasked && (
          <p className="text-xs text-text-secondary">Atual: {settings.webhookSecretMasked}. Deixe em branco para manter.</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-background-secondary p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">URL do webhook</p>
        <p className="mt-1 break-all text-sm text-text">{webhookUrl}</p>
        <p className="mt-1 text-xs text-text-secondary">
          Cadastre essa URL no painel do Mercado Pago para receber a confirmação automática dos pagamentos Pix.
        </p>
      </div>

      <p className="text-xs text-text-secondary">
        Status: {settings.configured ? "Configurado" : "Não configurado"}.
      </p>

      {formError && <p className="text-sm text-danger">{formError}</p>}
      {successMessage && <p className="text-sm text-success">{successMessage}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar credenciais"}
      </Button>
    </form>
  );
}
