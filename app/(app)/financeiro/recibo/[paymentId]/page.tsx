import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PrintButton } from "@/components/shared/print-button";
import { PrintHeader } from "@/components/shared/print-header";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { getPaymentReceiptAction } from "@/modules/finance/actions/get-payment-receipt.action";
import { formatCurrency } from "@/lib/utils/format";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  OTHER: "Outro",
};

export default async function ReciboPage({ params }: { params: { paymentId: string } }) {
  const canView = await hasPermission(PERMISSIONS.finance.view);
  if (!canView) return <ComingSoon title="Recibo" />;

  const [result, settings] = await Promise.all([
    getPaymentReceiptAction(params.paymentId),
    getGeneralSettingsAction(),
  ]);

  if (!result.success) notFound();
  const { receipt } = result;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PrintHeader
        logoUrl={settings.logoUrl}
        businessName={settings.name}
        title="Comprovante de pagamento"
        subtitle={`Recibo #${receipt.id.slice(-8).toUpperCase()}`}
      />

      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/financeiro"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text"
        >
          <ArrowLeft size={14} />
          Voltar ao financeiro
        </Link>
        <PrintButton label="Imprimir comanda" />
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="hidden text-center print:block">
          <h1 className="text-lg font-semibold text-text">Comprovante de pagamento</h1>
          <p className="text-xs text-text-secondary">Recibo #{receipt.id.slice(-8).toUpperCase()}</p>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Cliente</dt>
            <dd className="text-text">{receipt.clientName}</dd>
          </div>
          {receipt.clientPhone && (
            <div className="flex justify-between">
              <dt className="text-text-secondary">Telefone</dt>
              <dd className="text-text">{receipt.clientPhone}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-text-secondary">Profissional</dt>
            <dd className="text-text">{receipt.professionalName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Serviços</dt>
            <dd className="text-right text-text">{receipt.servicesLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Data do atendimento</dt>
            <dd className="text-text">{format(receipt.startTime, "dd/MM/yyyy HH:mm")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Forma de pagamento</dt>
            <dd className="text-text">{PAYMENT_METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod}</dd>
          </div>
          {receipt.paidAt && (
            <div className="flex justify-between">
              <dt className="text-text-secondary">Pago em</dt>
              <dd className="text-text">{format(receipt.paidAt, "dd/MM/yyyy HH:mm")}</dd>
            </div>
          )}
          {receipt.receivedByName && (
            <div className="flex justify-between">
              <dt className="text-text-secondary">Recebido por</dt>
              <dd className="text-text">{receipt.receivedByName}</dd>
            </div>
          )}
        </dl>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text">Total pago</span>
            <span className="text-xl font-semibold text-success">{formatCurrency(receipt.amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
