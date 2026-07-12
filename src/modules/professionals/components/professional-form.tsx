"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkingHoursEditor } from "@/modules/professionals/components/working-hours-editor";
import { maskPhone } from "@/lib/utils/format";
import {
  createProfessionalSchema,
  professionalStatusValues,
  type CreateProfessionalInput,
  type WorkingHoursInput,
} from "@/modules/professionals/schemas/professional.schema";
import { createProfessionalAction } from "@/modules/professionals/actions/create-professional.action";
import { updateProfessionalAction } from "@/modules/professionals/actions/update-professional.action";
import type { ProfessionalDetail, ProfessionalFormOptions } from "@/modules/professionals/types/professional.types";

const STATUS_LABELS: Record<(typeof professionalStatusValues)[number], string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  VACATION: "Férias",
};

const EMPTY_WORKING_HOURS: WorkingHoursInput = { seg: [], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [] };

export interface ProfessionalFormProps {
  options: ProfessionalFormOptions;
  mode: "create" | "edit";
  professionalId?: string;
  defaultValues?: ProfessionalDetail;
  onSuccess: () => void;
}

export function ProfessionalForm({ options, mode, professionalId, defaultValues, onSuccess }: ProfessionalFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>(defaultValues?.serviceIds ?? []);
  const [workingHours, setWorkingHours] = useState<WorkingHoursInput>(
    defaultValues?.workingHours ?? EMPTY_WORKING_HOURS,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProfessionalInput>({
    resolver: zodResolver(createProfessionalSchema),
    defaultValues: {
      fullName: defaultValues?.fullName ?? "",
      professionalName: defaultValues?.professionalName ?? "",
      bio: defaultValues?.bio ?? "",
      specialties: defaultValues?.specialties ?? "",
      phone: defaultValues?.phone ?? "",
      whatsapp: defaultValues?.whatsapp ?? "",
      email: defaultValues?.email ?? "",
      hiredAt: defaultValues?.hiredAt ?? null,
      status: defaultValues?.status ?? "ACTIVE",
      commissionPercentage: defaultValues?.commissionPercentage ?? 0,
    },
  });

  function toggleService(serviceId: string) {
    setServiceIds((current) =>
      current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId],
    );
  }

  async function onSubmit(formValues: CreateProfessionalInput) {
    setFormError(null);
    const input: CreateProfessionalInput = { ...formValues, serviceIds, workingHours };

    try {
      if (mode === "create") {
        const result = await createProfessionalAction(input);
        if (!result.success) return setFormError("Não foi possível criar o profissional.");
      } else {
        const result = await updateProfessionalAction({ ...input, id: professionalId! });
        if (!result.success) return setFormError(result.error);
      }
      onSuccess();
    } catch {
      setFormError("Não foi possível salvar o profissional.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="fullName">Nome completo</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName && <p className="text-sm text-danger">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="professionalName">Nome profissional</Label>
          <Input id="professionalName" {...register("professionalName")} />
          {errors.professionalName && <p className="text-sm text-danger">{errors.professionalName.message}</p>}
        </div>
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

      <div className="space-y-1">
        <Label htmlFor="specialties">Especialidades</Label>
        <Input id="specialties" placeholder="Degradê, barba, coloração..." {...register("specialties")} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" rows={2} {...register("bio")} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="hiredAt">Contratado em</Label>
          <input
            id="hiredAt"
            type="date"
            {...register("hiredAt", { valueAsDate: true })}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="commissionPercentage">Comissão (%)</Label>
          <Input id="commissionPercentage" type="number" step="0.01" min={0} max={100} {...register("commissionPercentage")} />
          {errors.commissionPercentage && (
            <p className="text-sm text-danger">{errors.commissionPercentage.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")}>
            {professionalStatusValues.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Serviços oferecidos</Label>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
          {options.services.length === 0 && (
            <p className="text-sm text-text-secondary">Nenhum serviço ativo cadastrado.</p>
          )}
          {options.services.map((service) => (
            <label key={service.id} className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <Checkbox checked={serviceIds.includes(service.id)} onCheckedChange={() => toggleService(service.id)} />
              {service.name}
            </label>
          ))}
        </div>
      </div>

      <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : mode === "create" ? "Criar profissional" : "Salvar alterações"}
      </Button>
    </form>
  );
}
