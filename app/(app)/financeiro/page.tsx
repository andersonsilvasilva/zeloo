import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { getCashRegisterAction } from "@/modules/finance/actions/get-cash-register.action";
import { listCashbookEntriesAction } from "@/modules/finance/actions/list-cashbook-entries.action";
import { listPayableAppointmentsAction } from "@/modules/finance/actions/list-payable-appointments.action";
import { CashRegisterPanel } from "@/modules/finance/components/cash-register-panel";
import { CashbookFilters } from "@/modules/finance/components/cashbook-filters";
import { CashbookList } from "@/modules/finance/components/cashbook-list";
import { NewCashbookEntryDialog } from "@/modules/finance/components/new-cashbook-entry-dialog";
import { RegisterPaymentDialog } from "@/modules/finance/components/register-payment-dialog";
import type { CashbookEntryType } from "@/modules/finance/types/finance.types";

function parseLocalDate(value: string, endOfDay: boolean): Date {
  const [year, month, day] = value.split("-").map(Number);
  return endOfDay ? new Date(year, month - 1, day, 23, 59, 59, 999) : new Date(year, month - 1, day);
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { dateFrom?: string; dateTo?: string; type?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.finance.view);
  if (!canView) return <ComingSoon title="Financeiro" />;

  const [canCreate, canUpdate] = await Promise.all([
    hasPermission(PERMISSIONS.finance.create),
    hasPermission(PERMISSIONS.finance.update),
  ]);

  const dateFrom = searchParams.dateFrom || "";
  const dateTo = searchParams.dateTo || "";
  const type = searchParams.type || "";

  const [register, entries, payableAppointments] = await Promise.all([
    getCashRegisterAction(),
    listCashbookEntriesAction({
      dateFrom: dateFrom ? parseLocalDate(dateFrom, false) : undefined,
      dateTo: dateTo ? parseLocalDate(dateTo, true) : undefined,
      type: (type || undefined) as CashbookEntryType | undefined,
    }),
    canCreate ? listPayableAppointmentsAction() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Financeiro</h1>
          <p className="text-sm text-text-secondary">Livro-caixa, pagamentos e abertura/fechamento de caixa.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/financeiro/balancete"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-text transition-colors hover:border-primary focus-gold"
          >
            <ClipboardList size={16} />
            Ver balancete
          </Link>
          {canCreate && (
            <>
              <NewCashbookEntryDialog />
              <RegisterPaymentDialog appointments={payableAppointments} />
            </>
          )}
        </div>
      </div>

      <CashRegisterPanel initialRegister={register} canCreate={canCreate} canUpdate={canUpdate} />

      <CashbookFilters dateFrom={dateFrom} dateTo={dateTo} type={type} />

      <CashbookList entries={entries} />
    </div>
  );
}
