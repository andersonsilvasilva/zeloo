import { z } from "zod";

/**
 * Slugs reservados pra domínios centrais da plataforma (login, admin, API,
 * institucional, etc.) — nenhum tenant pode usar um desses como slug.
 * Lista exata do spec de migração multi-tenant (CLAUDE_CODE_MULTI_TENANT_ZELOO.md §11).
 */
export const RESERVED_TENANT_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "auth",
  "login",
  "logout",
  "signup",
  "register",
  "status",
  "support",
  "suporte",
  "mail",
  "email",
  "financeiro",
  "billing",
  "static",
  "assets",
  "cdn",
  "files",
  "storage",
  "health",
  "metrics",
]);

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

/** Normaliza antes de validar: lowercase + trim — mesma entrada aceita "Flora " e "flora". */
export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export const tenantSlugSchema = z
  .string()
  .transform(normalizeSlug)
  .pipe(
    z
      .string()
      .min(3, "O slug precisa ter entre 3 e 63 caracteres.")
      .max(63, "O slug precisa ter entre 3 e 63 caracteres.")
      .regex(SLUG_REGEX, "Use só letras minúsculas, números e hífen, começando e terminando com letra ou número.")
      .refine((slug) => !RESERVED_TENANT_SLUGS.has(slug), { message: "Esse slug é reservado pela plataforma." }),
  );

export const tenantStatusValues = ["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"] as const;
export const tenantStatusSchema = z.enum(tenantStatusValues);

export const createTenantSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do tenant.").max(150),
  slug: tenantSlugSchema,
  timezone: z.string().trim().min(1).default("America/Sao_Paulo"),
  locale: z.string().trim().min(1).default("pt-BR"),
  planId: z.string().cuid().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
