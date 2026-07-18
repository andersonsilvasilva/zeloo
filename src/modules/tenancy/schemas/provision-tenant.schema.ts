import { z } from "zod";
import { tenantSlugSchema } from "@/modules/tenancy/schemas/tenant.schema";

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.");

export const provisionTenantSchema = z.object({
  tenantName: z.string().trim().min(1, "Informe o nome do negócio.").max(150),
  slug: tenantSlugSchema,
  ownerName: z.string().trim().min(1, "Informe o nome do responsável.").max(200),
  ownerEmail: z.string().trim().min(1, "Informe o e-mail do responsável.").email("E-mail inválido."),
  /** Ignorada se o e-mail já pertencer a um usuário existente (reaproveita a conta). */
  ownerPassword: passwordSchema,
  timezone: z.string().trim().min(1).default("America/Sao_Paulo"),
});

export type ProvisionTenantFormInput = z.infer<typeof provisionTenantSchema>;
