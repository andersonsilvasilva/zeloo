"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PrintButtonProps {
  label?: string;
}

/** Aciona o diálogo de impressão do navegador; o usuário escolhe "Salvar como PDF" como destino. */
export function PrintButton({ label = "Imprimir" }: PrintButtonProps) {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="print:hidden">
      <Printer size={16} />
      {label}
    </Button>
  );
}
