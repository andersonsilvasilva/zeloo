import { Badge } from "@/components/ui/badge";
import type { CashbookEntryType } from "@/modules/finance/types/finance.types";

export function CashbookEntryTypeBadge({ type }: { type: CashbookEntryType }) {
  return (
    <Badge variant={type === "CREDIT" ? "success" : "danger"}>{type === "CREDIT" ? "Entrada" : "Saída"}</Badge>
  );
}
