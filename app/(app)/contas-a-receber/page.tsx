import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { DateRangeFilters } from "@/components/shared/date-range-filters";
import { listAccountEntriesAction } from "@/modules/accounts/actions/list-account-entries.action";
import { getAccountSummaryAction } from "@/modules/accounts/actions/get-account-summary.action";
import { listRecurringAccountEntriesAction } from "@/modules/accounts/actions/list-recurring-account-entries.action";
import { listAccountClientOptionsAction } from "@/modules/accounts/actions/list-account-client-options.action";
import { AccountEntryList } from "@/modules/accounts/components/account-entry-list";
import { AccountEntryFilters } from "@/modules/accounts/components/account-entry-filters";
import { AccountEntryFormDialog } from "@/modules/accounts/components/account-entry-form-dialog";
import { RecurringAccountEntryDialog } from "@/modules/accounts/components/recurring-account-entry-dialog";
import { RecurringAccountEntryList } from "@/modules/accounts/components/recurring-account-entry-list";
import { AccountSummaryCards } from "@/modules/accounts/components/account-summary-cards";
import type { AccountEntryStatus } from "@/modules/accounts/schemas/account.schema";
import { parseDateOnly } from "@/lib/utils/date-only";

export default async function ContasAReceberPage({
  searchParams,
}: {
  searchParams: { dateFrom?: string; dateTo?: string; status?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.receivables.view);
  if (!canView) return <ComingSoon title="Contas a Receber" />;

  const [canCreate, canUpdate, canDelete] = await Promise.all([
    hasPermission(PERMISSIONS.receivables.create),
    hasPermission(PERMISSIONS.receivables.update),
    hasPermission(PERMISSIONS.receivables.delete),
  ]);

  const dateFrom = searchParams.dateFrom || "";
  const dateTo = searchParams.dateTo || "";
  const status = searchParams.status || "";

  const [summary, entries, recurring, clientOptions] = await Promise.all([
    getAccountSummaryAction("RECEIVABLE"),
    listAccountEntriesAction({
      direction: "RECEIVABLE",
      dateFrom: dateFrom ? parseDateOnly(dateFrom) : undefined,
      dateTo: dateTo ? parseDateOnly(dateTo) : undefined,
      status: (status || undefined) as AccountEntryStatus | undefined,
    }),
    listRecurringAccountEntriesAction("RECEIVABLE"),
    canCreate ? listAccountClientOptionsAction() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Contas a Receber</h1>
          <p className="text-sm text-text-secondary">Receitas avulsas, não ligadas a um agendamento.</p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <RecurringAccountEntryDialog direction="RECEIVABLE" clientOptions={clientOptions} />
            <AccountEntryFormDialog direction="RECEIVABLE" clientOptions={clientOptions} />
          </div>
        )}
      </div>

      <AccountSummaryCards summary={summary} />

      <RecurringAccountEntryList direction="RECEIVABLE" entries={recurring} canUpdate={canUpdate} />

      <div className="flex flex-wrap items-end gap-3">
        <DateRangeFilters dateFrom={dateFrom} dateTo={dateTo} />
        <AccountEntryFilters status={status} />
      </div>

      <AccountEntryList direction="RECEIVABLE" entries={entries} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
