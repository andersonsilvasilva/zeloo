import { z } from "zod";

export const paymentMethodValues = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "OTHER"] as const;
export const paymentMethodSchema = z.enum(paymentMethodValues);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const cashbookEntryTypeValues = ["CREDIT", "DEBIT"] as const;
export const cashbookEntryTypeSchema = z.enum(cashbookEntryTypeValues);
export type CashbookEntryType = z.infer<typeof cashbookEntryTypeSchema>;

export const openCashRegisterSchema = z.object({
  openingBalance: z.coerce.number().min(0, "Informe um valor válido."),
});

export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;

export const closeCashRegisterSchema = z.object({
  actualBalance: z.coerce.number().min(0, "Informe um valor válido."),
  notes: z.string().trim().max(500).optional().default(""),
});

export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;

export const createCashbookEntrySchema = z.object({
  type: cashbookEntryTypeSchema,
  description: z.string().trim().min(1, "Informe a descrição.").max(200),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  category: z.string().trim().max(100).optional().default(""),
  paymentMethod: paymentMethodSchema.optional(),
  transactionDate: z.coerce.date(),
  notes: z.string().trim().max(500).optional().default(""),
});

export type CreateCashbookEntryInput = z.infer<typeof createCashbookEntrySchema>;

export const registerPaymentSchema = z.object({
  appointmentId: z.string().cuid(),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  paymentMethod: paymentMethodSchema,
});

export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;

export const listCashbookEntriesSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  type: cashbookEntryTypeSchema.optional(),
});

export type ListCashbookEntriesInput = z.infer<typeof listCashbookEntriesSchema>;
