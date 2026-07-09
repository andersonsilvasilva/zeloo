"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createServiceSchema,
  serviceStatusValues,
  type CreateServiceInput,
} from "@/modules/services/schemas/service.schema";
import { createServiceAction } from "@/modules/services/actions/create-service.action";
import { updateServiceAction } from "@/modules/services/actions/update-service.action";
import type { ServiceDetail, ServiceFormOptions } from "@/modules/services/types/service.types";

const STATUS_LABELS: Record<(typeof serviceStatusValues)[number], string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export interface ServiceFormProps {
  options: ServiceFormOptions;
  mode: "create" | "edit";
  serviceId?: string;
  defaultValues?: ServiceDetail;
  onSuccess: () => void;
}

export function ServiceForm({ options, mode, serviceId, defaultValues, onSuccess }: ServiceFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      shortDescription: defaultValues?.shortDescription ?? "",
      description: defaultValues?.description ?? "",
      price: defaultValues?.price ?? 0,
      durationMinutes: defaultValues?.durationMinutes ?? 30,
      category: defaultValues?.category ?? "",
      status: defaultValues?.status ?? "ACTIVE",
      defaultMessageTemplateId: defaultValues?.defaultMessageTemplateId ?? null,
    },
  });

  async function onSubmit(input: CreateServiceInput) {
    setFormError(null);
    try {
      if (mode === "create") {
        const result = await createServiceAction(input);
        if (!result.success) return setFormError("Não foi possível criar o serviço.");
      } else {
        const result = await updateServiceAction({ ...input, id: serviceId! });
        if (!result.success) return setFormError(result.error);
      }
      onSuccess();
    } catch {
      setFormError("Não foi possível salvar o serviço.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" placeholder="Corte Masculino" {...register("name")} />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="price">Preço (R$)</Label>
          <Input id="price" type="number" step="0.01" min={0} {...register("price")} />
          {errors.price && <p className="text-sm text-danger">{errors.price.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="durationMinutes">Duração (min)</Label>
          <Input id="durationMinutes" type="number" step="1" min={1} {...register("durationMinutes")} />
          {errors.durationMinutes && <p className="text-sm text-danger">{errors.durationMinutes.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")}>
            {serviceStatusValues.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="category">Categoria</Label>
        <Input id="category" placeholder="Cabelo, barba, combo..." {...register("category")} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="shortDescription">Descrição curta</Label>
        <Input id="shortDescription" placeholder="Exibida em listagens rápidas" {...register("shortDescription")} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Descrição completa</Label>
        <Textarea id="description" rows={3} {...register("description")} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="defaultMessageTemplateId">Modelo de mensagem padrão</Label>
        <Select id="defaultMessageTemplateId" {...register("defaultMessageTemplateId")}>
          <option value="">Nenhum</option>
          {options.messageTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.channel === "WHATSAPP" ? "WhatsApp" : "SMS"})
            </option>
          ))}
        </Select>
        <p className="text-xs text-text-secondary">
          Enviado ao cliente (automaticamente ao agendar, ou pelo botão "Enviar confirmação" na Agenda) quando este
          serviço estiver no agendamento.
        </p>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : mode === "create" ? "Criar serviço" : "Salvar alterações"}
      </Button>
    </form>
  );
}
