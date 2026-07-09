import { z } from "zod";

export const periodReportFiltersSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
});

export type PeriodReportFiltersInput = z.infer<typeof periodReportFiltersSchema>;
