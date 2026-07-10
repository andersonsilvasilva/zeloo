"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { maskPhone } from "@/lib/utils/format";
import {
  createUserSchema,
  updateUserSchema,
  userStatusValues,
} from "@/modules/users/schemas/user.schema";
import { createUserAction } from "@/modules/users/actions/create-user.action";
import { updateUserAction } from "@/modules/users/actions/update-user.action";
import type { UserFormOptions, UserListItem } from "@/modules/users/types/user.types";

const STATUS_LABELS: Record<(typeof userStatusValues)[number], string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  SUSPENDED: "Suspenso",
};

/** Campos comuns a create/edit — senha (só create) e papéis ficam fora do RHF, geridos à parte. */
const baseFieldsSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  phone: z.string().trim().optional().default(""),
  status: z.enum(userStatusValues),
});

type BaseFields = z.infer<typeof baseFieldsSchema>;

export interface UserFormProps {
  options: UserFormOptions;
  mode: "create" | "edit";
  userId?: string;
  defaultValues?: UserListItem;
  currentUserId: string;
  onSuccess: () => void;
}

export function UserForm({ options, mode, userId, defaultValues, currentUserId, onSuccess }: UserFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>(defaultValues?.roles.map((r) => r.id) ?? []);

  const isEditingSelf = mode === "edit" && userId === currentUserId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BaseFields>({
    resolver: zodResolver(baseFieldsSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      status: defaultValues?.status ?? "ACTIVE",
    },
  });

  function toggleRole(roleId: string) {
    setRoleIds((current) => (current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]));
  }

  async function onSubmit(fields: BaseFields) {
    setFormError(null);

    if (roleIds.length === 0) {
      setFormError("Selecione ao menos um papel.");
      return;
    }

    try {
      if (mode === "create") {
        const parsed = createUserSchema.safeParse({ ...fields, password, roleIds });
        if (!parsed.success) {
          setFormError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
          return;
        }
        const result = await createUserAction(parsed.data);
        if (!result.success) return setFormError(result.error);
      } else {
        const parsed = updateUserSchema.safeParse({ ...fields, id: userId!, roleIds });
        if (!parsed.success) {
          setFormError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
          return;
        }
        const result = await updateUserAction(parsed.data);
        if (!result.success) return setFormError(result.error);
      }
      onSuccess();
    } catch {
      setFormError("Não foi possível salvar o usuário.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          placeholder="(99)99999-9999"
          {...register("phone", { onChange: (e) => (e.target.value = maskPhone(e.target.value)) })}
        />
      </div>

      {mode === "create" && (
        <div className="space-y-1">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="status">Status</Label>
        {isEditingSelf ? (
          // Campo omitido (não registrado) de propósito: um <select disabled> não é enviado no
          // submit pelo navegador/RHF, então em vez disso fixamos o valor via defaultValues.
          <>
            <Input value={STATUS_LABELS[defaultValues?.status ?? "ACTIVE"]} disabled readOnly />
            <p className="text-xs text-text-secondary">Você não pode alterar o status da sua própria conta.</p>
          </>
        ) : (
          <Select id="status" {...register("status")}>
            {userStatusValues.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label>Papéis</Label>
        <div className="space-y-2 rounded-lg border border-border p-3">
          {options.roles.map((role) => (
            <label key={role.id} className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <Checkbox checked={roleIds.includes(role.id)} onCheckedChange={() => toggleRole(role.id)} />
              {role.name}
            </label>
          ))}
        </div>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : mode === "create" ? "Criar usuário" : "Salvar alterações"}
      </Button>
    </form>
  );
}
