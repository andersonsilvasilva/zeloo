import { z } from "zod";
import { paymentMethodSchema } from "@/modules/finance/schemas/finance.schema";

export const accountDirectionValues = ["PAYABLE", "RECEIVABLE"] as const;
export const accountDirectionSchema = z.enum(accountDirectionValues);
export type AccountDirection = z.infer<typeof accountDirectionSchema>;

export const accountEntryStatusValues = ["PENDING", "SETTLED", "CANCELLED"] as const;
export const accountEntryStatusSchema = z.enum(accountEntryStatusValues);
export type AccountEntryStatus = z.infer<typeof accountEntryStatusSchema>;

export const createAccountEntrySchema = z.object({
  direction: accountDirectionSchema,
  description: z.string().trim().min(1, "Informe a descrição.").max(200),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  category: z.string().trim().max(100).optional().default(""),
  counterpartyName: z.string().trim().max(150).optional().default(""),
  clientId: z.string().cuid().optional(),
  dueDate: z.coerce.date(),
  notes: z.string().trim().max(500).optional().default(""),
});

export type CreateAccountEntryInput = z.infer<typeof createAccountEntrySchema>;

// `direction` vem do form (a tela já sabe em qual lista está) — usado só pra
// escolher a permission certa na action, sem precisar buscar a conta antes de
// checar acesso. A regra de negócio em si sempre confia no `direction` gravado
// no banco, nunca neste campo.
export const settleAccountEntrySchema = z.object({
  id: z.string().cuid(),
  direction: accountDirectionSchema,
  paymentMethod: paymentMethodSchema,
});

export type SettleAccountEntryInput = z.infer<typeof settleAccountEntrySchema>;

export const cancelAccountEntrySchema = z.object({
  id: z.string().cuid(),
  direction: accountDirectionSchema,
});

export type CancelAccountEntryInput = z.infer<typeof cancelAccountEntrySchema>;

export const deleteAccountEntrySchema = z.object({
  id: z.string().cuid(),
  direction: accountDirectionSchema,
});

export type DeleteAccountEntryInput = z.infer<typeof deleteAccountEntrySchema>;

export const listAccountEntriesSchema = z.object({
  direction: accountDirectionSchema,
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  status: accountEntryStatusSchema.optional(),
});

export type ListAccountEntriesInput = z.infer<typeof listAccountEntriesSchema>;

export const createRecurringAccountEntrySchema = z.object({
  direction: accountDirectionSchema,
  description: z.string().trim().min(1, "Informe a descrição.").max(200),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  category: z.string().trim().max(100).optional().default(""),
  counterpartyName: z.string().trim().max(150).optional().default(""),
  clientId: z.string().cuid().optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(28, "Escolha um dia entre 1 e 28 (evita meses curtos)."),
});

export type CreateRecurringAccountEntryInput = z.infer<typeof createRecurringAccountEntrySchema>;

export const toggleRecurringAccountEntrySchema = z.object({
  id: z.string().cuid(),
  active: z.boolean(),
});

export type ToggleRecurringAccountEntryInput = z.infer<typeof toggleRecurringAccountEntrySchema>;

export const monthlyClosingReportSchema = z.object({
  month: z.coerce.date(), // qualquer dia do mês desejado — service normaliza pro 1º/último dia
});

export type MonthlyClosingReportInput = z.infer<typeof monthlyClosingReportSchema>;
