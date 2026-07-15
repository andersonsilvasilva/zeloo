export interface CommissionPendingRow {
  professionalId: string;
  professionalName: string;
  commissionPercentage: number;
  revenue: number;
  calculatedAmount: number;
  alreadyClosed: boolean;
  closingId: string | null;
}

export interface CommissionClosingItem {
  id: string;
  professionalId: string;
  professionalName: string;
  periodStart: Date;
  periodEnd: Date;
  calculatedAmount: number;
  finalAmount: number;
  adjustmentNotes: string | null;
  closedAt: Date;
  closedByName: string | null;
}
