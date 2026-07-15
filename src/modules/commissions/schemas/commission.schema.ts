import { z } from "zod";
import { paymentMethodSchema } from "@/modules/finance/schemas/finance.schema";

export const commissionPeriodFiltersSchema = z
  .object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
  })
  .refine((v) => v.periodStart <= v.periodEnd, { message: "O início do período deve ser antes do fim.", path: ["periodEnd"] });

export type CommissionPeriodFiltersInput = z.infer<typeof commissionPeriodFiltersSchema>;

export const closeCommissionSchema = z
  .object({
    professionalId: z.string().cuid(),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    finalAmount: z.coerce.number().min(0, "Informe um valor válido."),
    adjustmentNotes: z.string().trim().max(500).optional().default(""),
    paymentMethod: paymentMethodSchema,
  })
  .refine((v) => v.periodStart <= v.periodEnd, { message: "O início do período deve ser antes do fim.", path: ["periodEnd"] });

export type CloseCommissionInput = z.infer<typeof closeCommissionSchema>;
