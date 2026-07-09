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
  createTemplateSchema,
  messageChannelValues,
  templateStatusValues,
  type CreateTemplateInput,
} from "@/modules/messages/schemas/message.schema";
import { createTemplateAction } from "@/modules/messages/actions/create-template.action";
import { updateTemplateAction } from "@/modules/messages/actions/update-template.action";
import type { MessageTemplateItem } from "@/modules/messages/types/message.types";

const CHANNEL_LABELS: Record<(typeof messageChannelValues)[number], string> = {
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
};

const STATUS_LABELS: Record<(typeof templateStatusValues)[number], string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export interface TemplateFormProps {
  mode: "create" | "edit";
  templateId?: string;
  defaultValues?: MessageTemplateItem;
  onSuccess: () => void;
}

export function TemplateForm({ mode, templateId, defaultValues, onSuccess }: TemplateFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateTemplateInput>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      channel: defaultValues?.channel ?? "WHATSAPP",
      content: defaultValues?.content ?? "",
      status: defaultValues?.status ?? "ACTIVE",
    },
  });

  async function onSubmit(input: CreateTemplateInput) {
    setFormError(null);
    try {
      if (mode === "create") {
        const result = await createTemplateAction(input);
        if (!result.success) return setFormError("Não foi possível criar o modelo.");
      } else {
        const result = await updateTemplateAction({ ...input, id: templateId! });
        if (!result.success) return setFormError(result.error);
      }
      onSuccess();
    } catch {
      setFormError("Não foi possível salvar o modelo.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="name">Nome do modelo</Label>
        <Input id="name" placeholder="Lembrete de agendamento" {...register("name")} />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="channel">Canal</Label>
          <Select id="channel" {...register("channel")}>
            {messageChannelValues.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")}>
            {templateStatusValues.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="content">Conteúdo</Label>
        <Textarea
          id="content"
          rows={4}
          placeholder="Olá {{clientName}}, tudo bem? Passando para confirmar seu horário com {{barber_agendado}}: {{resumo_agendamento}}."
          {...register("content")}
        />
        {errors.content && <p className="text-sm text-danger">{errors.content.message}</p>}
        <p className="text-xs text-text-secondary">
          Variáveis disponíveis: {"{{clientName}}"} (nome do cliente), {"{{barber_agendado}}"} (barbeiro do
          agendamento) e {"{{resumo_agendamento}}"} (serviços, data/hora e valor). As duas últimas exigem que um
          agendamento seja selecionado ao enviar.
        </p>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : mode === "create" ? "Criar modelo" : "Salvar alterações"}
      </Button>
    </form>
  );
}
