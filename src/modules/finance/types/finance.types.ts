import type { cashbookEntryTypeValues, paymentMethodValues } from "@/modules/finance/schemas/finance.schema";

export type PaymentMethod = (typeof paymentMethodValues)[number];
export type CashbookEntryType = (typeof cashbookEntryTypeValues)[number];

export interface CashRegisterInfo {
  id: string;
  openedAt: Date;
  openingBalance: number;
  openedBy: { id: string; name: string };
}

export interface CashRegisterClosingSummary {
  expectedBalance: number;
  actualBalance: number;
  difference: number;
}

export interface CashbookEntryItem {
  id: string;
  type: CashbookEntryType;
  description: string;
  amount: number;
  category: string | null;
  paymentMethod: PaymentMethod | null;
  transactionDate: Date;
  createdBy: { id: string; name: string } | null;
  notes: string | null;
}

export interface PayableAppointmentOption {
  id: string;
  clientName: string;
  barberName: string;
  servicesLabel: string;
  totalPrice: number;
  appointmentDate: Date;
  startTime: Date;
}
