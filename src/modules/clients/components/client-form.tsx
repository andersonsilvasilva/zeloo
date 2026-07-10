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
  createClientSchema,
  clientStatusValues,
  type CreateClientInput,
} from "@/modules/clients/schemas/client.schema";
import { createClientAction } from "@/modules/clients/actions/create-client.action";
import { updateClientAction } from "@/modules/clients/actions/update-client.action";
import type { ClientDetail, ClientFormOptions } from "@/modules/clients/types/client.types";

const STATUS_LABELS: Record<(typeof clientStatusValues)[number], string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  VIP: "VIP",
};

export interface ClientFormProps {
  options: ClientFormOptions;
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: ClientDetail;
  onSuccess: () => void;
}

export function ClientForm({ options, mode, clientId, defaultValues, onSuccess }: ClientFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      phone: defaultValues?.phone ?? "",
      whatsapp: defaultValues?.whatsapp ?? "",
      email: defaultValues?.email ?? "",
      birthDate: defaultValues?.birthDate ?? null,
      notes: defaultValues?.notes ?? "",
      preferredBarberId: defaultValues?.preferredBarber?.id ?? null,
      status: defaultValues?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(input: CreateClientInput) {
    setFormError(null);
    try {
      if (mode === "create") {
        const result = await createClientAction(input);
        if (!result.success) return setFormError("Não foi possível criar o cliente.");
      } else {
        const result = await updateClientAction({ ...input, id: clientId! });
        if (!result.success) return setFormError(result.error);
      }
      onSuccess();
    } catch {
      setFormError("Não foi possível salvar o cliente.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" {...register("name")} />
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
        </div>
        <div className="space-y-1">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            placeholder="(99)99999-9999"
            {...register("whatsapp", { onChange: (e) => (e.target.value = maskPhone(e.target.value)) })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="birthDate">Data de nascimento</Label>
          <input
            id="birthDate"
            type="date"
            {...register("birthDate", { valueAsDate: true })}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="preferredBarberId">Barbeiro preferido</Label>
          <Select id="preferredBarberId" {...register("preferredBarberId")}>
            <option value="">Nenhum</option>
            {options.barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.professionalName}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="status">Status</Label>
        <Select id="status" {...register("status")}>
          {clientStatusValues.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : mode === "create" ? "Criar cliente" : "Salvar alterações"}
      </Button>
    </form>
  );
}
