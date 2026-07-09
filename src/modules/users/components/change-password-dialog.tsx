"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { changeUserPasswordAction } from "@/modules/users/actions/change-user-password.action";

export interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onSuccess: () => void;
}

export function ChangePasswordDialog({ open, onOpenChange, userId, userName, onSuccess }: ChangePasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function handleSubmit() {
    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setBusy(true);
    setError(null);
    const result = await changeUserPasswordAction({ id: userId, password });
    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    reset();
    onSuccess();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>Defina uma nova senha para {userName}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="button" className="w-full" disabled={busy} onClick={handleSubmit}>
            {busy ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
