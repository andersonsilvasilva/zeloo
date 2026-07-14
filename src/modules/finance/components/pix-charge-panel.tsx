"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { getPixChargeStatusAction } from "@/modules/finance/actions/get-pix-charge-status.action";
import type { PixChargeInfo } from "@/modules/finance/types/finance.types";

const POLL_INTERVAL_MS = 3000;

const STATUS_LABELS: Record<PixChargeInfo["status"], string> = {
  PENDING: "Aguardando pagamento...",
  APPROVED: "Pagamento confirmado!",
  REJECTED: "Pagamento recusado. Gere uma nova cobrança.",
  EXPIRED: "Cobrança expirada. Gere uma nova cobrança.",
  CANCELLED: "Cobrança cancelada.",
};

/** QR code + copia-e-cola de uma cobrança Pix, com polling até o webhook confirmar. */
export function PixChargePanel({
  charge,
  onConfirmed,
  onClose,
}: {
  charge: PixChargeInfo;
  onConfirmed: (paymentId: string) => void;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(charge);
  const [copied, setCopied] = useState(false);
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  useEffect(() => {
    if (current.status !== "PENDING") return;

    const interval = setInterval(async () => {
      const result = await getPixChargeStatusAction(current.id);
      if (!result.success) return;
      setCurrent(result.charge);
      if (result.charge.status === "APPROVED" && result.charge.paymentId) {
        onConfirmedRef.current(result.charge.paymentId);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [current.id, current.status]);

  async function handleCopy() {
    await navigator.clipboard.writeText(current.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-lg font-semibold text-text">{formatCurrency(current.amount)}</p>

      {current.status === "PENDING" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${current.qrCodeBase64}`}
            alt="QR code Pix"
            className="mx-auto h-56 w-56 rounded-lg border border-border bg-white p-2"
          />
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Pix copia e cola</p>
            <div className="flex gap-2">
              <Input readOnly value={current.qrCode} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
              <Button type="button" variant="secondary" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </>
      )}

      <p
        className={`text-center text-sm ${
          current.status === "APPROVED"
            ? "text-success"
            : current.status === "PENDING"
              ? "text-text-secondary"
              : "text-danger"
        }`}
      >
        {STATUS_LABELS[current.status]}
      </p>

      {current.status !== "APPROVED" && (
        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      )}
    </div>
  );
}
