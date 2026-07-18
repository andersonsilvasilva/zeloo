"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" pra ações destrutivas/irreversíveis (excluir, cancelar) — botão de confirmar em vermelho. */
  variant?: "danger" | "default";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Substitui `window.confirm()`: `if (!(await confirm({ title, description, variant: "danger" }))) return;` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm precisa ser usado dentro de <ConfirmDialogProvider>.");
  return ctx;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((result: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending(options);
    });
  }, []);

  function settle(result: boolean) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && settle(false)}>
        {pending && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{pending.title}</DialogTitle>
              {pending.description && <DialogDescription>{pending.description}</DialogDescription>}
            </DialogHeader>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => settle(false)}>
                {pending.cancelLabel ?? "Cancelar"}
              </Button>
              <Button variant={pending.variant === "danger" ? "danger" : "primary"} onClick={() => settle(true)}>
                {pending.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}
