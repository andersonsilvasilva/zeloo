import { z } from "zod";

/** Chaves usadas na tabela Setting (key/value) para os dados gerais da barbearia. */
export const SETTINGS_KEYS = {
  name: "barbershop.name",
  phone: "barbershop.phone",
  whatsapp: "barbershop.whatsapp",
  email: "barbershop.email",
  address: "barbershop.address",
  timezone: "barbershop.timezone",
  logoMediaId: "barbershop.logo_media_id",
  instagram: "barbershop.instagram",
  facebook: "barbershop.facebook",
} as const;

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Fusos horários oficiais do Brasil (pós-unificação de 2019, sem horário de
 * verão). Lista curada — cobre as regiões atendidas pelo produto hoje.
 */
export const TIMEZONE_OPTIONS = [
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "America/Sao_Paulo", label: "Brasília — Sudeste, Sul e Nordeste (UTC-3)" },
  { value: "America/Manaus", label: "Manaus — Amazonas (UTC-4)" },
  { value: "America/Cuiaba", label: "Cuiabá — Mato Grosso (UTC-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco — Acre (UTC-5)" },
] as const;

const TIMEZONE_VALUES = new Set(TIMEZONE_OPTIONS.map((t) => t.value as string));

export const generalSettingsSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da barbearia.").max(200),
  phone: z.string().trim().max(30).optional().default(""),
  whatsapp: z.string().trim().max(30).optional().default(""),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .default("")
    .refine((v) => v === "" || z.string().email().safeParse(v).success, { message: "E-mail inválido." }),
  address: z.string().trim().max(300).optional().default(""),
  timezone: z.string().refine((v) => TIMEZONE_VALUES.has(v), { message: "Selecione um fuso horário válido." }),
  instagram: z
    .string()
    .trim()
    .max(300)
    .optional()
    .default("")
    .refine((v) => v === "" || z.string().url().safeParse(v).success, { message: "Link do Instagram inválido." }),
  facebook: z
    .string()
    .trim()
    .max(300)
    .optional()
    .default("")
    .refine((v) => v === "" || z.string().url().safeParse(v).success, { message: "Link do Facebook inválido." }),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
