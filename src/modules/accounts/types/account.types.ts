import type { PaymentMethod } from "@/modules/finance/types/finance.types";
import type { AccountDirection, AccountEntryStatus } from "@/modules/accounts/schemas/account.schema";

export interface AccountEntryItem {
  id: string;
  direction: AccountDirection;
  description: string;
  amount: number;
  category: string | null;
  counterpartyName: string | null;
  client: { id: string; name: string } | null;
  dueDate: Date;
  status: AccountEntryStatus;
  /** Calculado em runtime: PENDING + dueDate no passado. Não é um status persistido. */
  overdue: boolean;
  settledAt: Date | null;
  paymentMethod: PaymentMethod | null;
  recurringEntryId: string | null;
  createdBy: { id: string; name: string } | null;
  notes: string | null;
}

export interface AccountEntrySummary {
  direction: AccountDirection;
  totalPending: number;
  totalOverdue: number;
  totalSettled: number;
}

export interface RecurringAccountEntryItem {
  id: string;
  direction: AccountDirection;
  description: string;
  amount: number;
  category: string | null;
  counterpartyName: string | null;
  client: { id: string; name: string } | null;
  dayOfMonth: number;
  active: boolean;
}

export interface AccountClientOption {
  id: string;
  name: string;
}

export interface MonthlyClosingRow {
  category: string;
  payable: number;
  receivable: number;
}

export interface MonthlyClosingReport {
  month: Date;
  rows: MonthlyClosingRow[];
  totalPayable: number;
  totalReceivable: number;
  totalPayableSettled: number;
  totalReceivableSettled: number;
  balance: number;
}
