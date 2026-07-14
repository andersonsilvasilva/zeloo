import type { cashbookEntryTypeValues, paymentMethodValues } from "@/modules/finance/schemas/finance.schema";

export type PaymentMethod = (typeof paymentMethodValues)[number];
export type CashbookEntryType = (typeof cashbookEntryTypeValues)[number];

export interface CashRegisterInfo {
  id: string;
  openedAt: Date;
  openingBalance: number;
  openedBy: { id: string; name: string } | null;
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

export interface BalanceteRow {
  category: string;
  credit: number;
  debit: number;
  balance: number;
}

export interface BalanceteSummary {
  dateFrom: Date;
  dateTo: Date;
  rows: BalanceteRow[];
  totalCredit: number;
  totalDebit: number;
  totalBalance: number;
}

export interface PayableAppointmentOption {
  id: string;
  clientName: string;
  professionalName: string;
  servicesLabel: string;
  totalPrice: number;
  appointmentDate: Date;
  startTime: Date;
}

export type PixChargeStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";

export interface PixChargeInfo {
  id: string;
  appointmentId: string;
  status: PixChargeStatus;
  qrCode: string;
  qrCodeBase64: string;
  amount: number;
  expiresAt: Date | null;
  paymentId: string | null;
}

export interface PaymentReceipt {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAt: Date | null;
  receivedByName: string | null;
  clientName: string;
  clientPhone: string | null;
  professionalName: string;
  servicesLabel: string;
  appointmentDate: Date;
  startTime: Date;
}
