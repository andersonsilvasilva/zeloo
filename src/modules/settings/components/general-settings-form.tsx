"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { maskPhone } from "@/lib/utils/format";
import {
  generalSettingsSchema,
  TIMEZONE_OPTIONS,
  type GeneralSettingsInput,
} from "@/modules/settings/schemas/settings.schema";
import { updateGeneralSettingsAction } from "@/modules/settings/actions/update-general-settings.action";
import type { GeneralSettings } from "@/modules/settings/types/settings.types";

export function GeneralSettingsForm({ initialSettings }: { initialSettings: GeneralSettings }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GeneralSettingsInput>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      name: initialSettings.name,
      phone: initialSettings.phone,
      whatsapp: initialSettings.whatsapp,
      email: initialSettings.email,
      address: initialSettings.address,
      timezone: initialSettings.timezone,
      instagram: initialSettings.instagram,
      facebook: initialSettings.facebook,
      socialBio: initialSettings.socialBio,
    },
  });

  async function onSubmit(input: GeneralSettingsInput) {
    setFormError(null);
    setSuccessMessage(null);
    try {
      await updateGeneralSettingsAction(input);
      setSuccessMessage("Configurações salvas com sucesso.");
    } catch {
      setFormError("Não foi possível salvar as configurações.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="name">Nome da barbearia</Label>
        <Input id="name" placeholder="Barbearia Premium" {...register("name")} />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            placeholder="(99)99999-9999"
            {...register("phone", { onChange: (e) => (e.target.value = maskPhone(e.target.value)) })}
          />
          {errors.phone && <p className="text-sm text-danger">{errors.phone.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            placeholder="(99)99999-9999"
            {...register("whatsapp", { onChange: (e) => (e.target.value = maskPhone(e.target.value)) })}
          />
          {errors.whatsapp && <p className="text-sm text-danger">{errors.whatsapp.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" placeholder="contato@barbearia.com" {...register("email")} />
        {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="address">Endereço</Label>
        <Textarea id="address" rows={2} placeholder="Rua Exemplo, 123 — Centro" {...register("address")} />
        {errors.address && <p className="text-sm text-danger">{errors.address.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="instagram">Instagram</Label>
          <Input id="instagram" type="url" placeholder="https://instagram.com/suabarbearia" {...register("instagram")} />
          {errors.instagram && <p className="text-sm text-danger">{errors.instagram.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="facebook">Facebook</Label>
          <Input id="facebook" type="url" placeholder="https://facebook.com/suabarbearia" {...register("facebook")} />
          {errors.facebook && <p className="text-sm text-danger">{errors.facebook.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="socialBio">Bio/descrição para redes sociais</Label>
        <Textarea
          id="socialBio"
          rows={2}
          maxLength={300}
          placeholder="Sistema de Gestão de Negócios - Multidisciplinar"
          {...register("socialBio")}
        />
        <p className="text-xs text-text-secondary">
          Aparece como descrição ao compartilhar o link nas redes sociais e no WhatsApp.
        </p>
        {errors.socialBio && <p className="text-sm text-danger">{errors.socialBio.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="timezone">Fuso horário</Label>
        <Select id="timezone" {...register("timezone")}>
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </Select>
        {errors.timezone && <p className="text-sm text-danger">{errors.timezone.message}</p>}
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}
      {successMessage && <p className="text-sm text-success">{successMessage}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
