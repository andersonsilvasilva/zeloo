"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { identifyClientAction } from "@/modules/booking/actions/identify-client.action";

/** Conta (e-mail/senha) fica fora do RHF — só é obrigatória quando `wantsAccount` está marcado, gerido à parte. */
const identificationFieldsSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome.").max(200),
  phone: z.string().trim().min(8, "Informe um telefone válido.").max(30),
  email: z.string().trim().max(200).optional().default(""),
  password: z.string().max(100).optional().default(""),
});

type IdentificationFields = z.infer<typeof identificationFieldsSchema>;

export interface IdentificationFormProps {
  barberId: string;
  serviceIds: string;
}

export function IdentificationForm({ barberId, serviceIds }: IdentificationFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [wantsAccount, setWantsAccount] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IdentificationFields>({
    resolver: zodResolver(identificationFieldsSchema),
    defaultValues: { name: "", phone: "", email: "", password: "" },
  });

  const onSubmit = async (fields: IdentificationFields) => {
    setFormError(null);

    if (wantsAccount && !fields.email) {
      setFormError("Informe um e-mail para criar sua conta.");
      return;
    }
    if (wantsAccount && !fields.password) {
      setFormError("Informe uma senha para criar sua conta.");
      return;
    }

    const result = await identifyClientAction({ ...fields, wantsAccount });

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    const params = new URLSearchParams({
      barberId,
      serviceIds,
      clientId: result.clientId,
      phone: fields.phone,
    });
    router.push(`/agendar/horario?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="name" className="text-booking-text-secondary">
          Seu nome
        </Label>
        <Input id="name" placeholder="Como podemos te chamar?" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone" className="text-booking-text-secondary">
          Seu telefone
        </Label>
        <Input id="phone" placeholder="(00) 00000-0000" autoComplete="tel" {...register("phone")} />
        {errors.phone && <p className="text-sm text-danger">{errors.phone.message}</p>}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-booking-text-secondary">
        <Checkbox checked={wantsAccount} onCheckedChange={(checked) => setWantsAccount(Boolean(checked))} />
        Quero criar uma senha para acompanhar meus próximos agendamentos
      </label>

      {wantsAccount && (
        <div className="space-y-4 rounded-lg border border-booking-border p-3">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-booking-text-secondary">
              E-mail
            </Label>
            <Input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" {...register("email")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-booking-text-secondary">
              Senha
            </Label>
            <Input id="password" type="password" autoComplete="new-password" placeholder="••••••••" {...register("password")} />
          </div>
        </div>
      )}

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-booking-primary text-booking-bg hover:bg-booking-primary-light"
      >
        {isSubmitting ? "Enviando..." : "Continuar"}
      </Button>
    </form>
  );
}
