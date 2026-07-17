"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/shared/confirm-dialog-provider";
import { UserStatusBadge } from "@/modules/users/components/user-status-badge";
import { UserFormDialog } from "@/modules/users/components/user-form-dialog";
import { ChangePasswordDialog } from "@/modules/users/components/change-password-dialog";
import { deleteUserAction } from "@/modules/users/actions/delete-user.action";
import type { UserFormOptions, UserListItem } from "@/modules/users/types/user.types";

export interface UserListProps {
  users: UserListItem[];
  options: UserFormOptions;
  canUpdate: boolean;
  canDelete: boolean;
  currentUserId: string;
}

export function UserList({ users, options, canUpdate, canDelete, currentUserId }: UserListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [changingPassword, setChangingPassword] = useState<UserListItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function handleDelete(user: UserListItem) {
    const ok = await confirm({
      title: "Excluir conta de login",
      description: `Excluir definitivamente a conta de login de ${user.name}? O profissional/cliente vinculado e o histórico continuam intactos.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;

    setPendingId(user.id);
    setRowErrors((prev) => ({ ...prev, [user.id]: "" }));

    const result = await deleteUserAction({ id: user.id });

    setPendingId(null);
    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [user.id]: result.error }));
      return;
    }
    router.refresh();
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhum usuário encontrado para o filtro selecionado.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text">{user.name}</span>
                  {user.id === currentUserId && <Badge variant="primary">Você</Badge>}
                  <UserStatusBadge status={user.status} />
                </div>
                <p className="text-sm text-text-secondary">
                  {user.email}
                  {user.phone ? ` · ${user.phone}` : ""}
                </p>
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role) => (
                    <Badge key={role.id} variant="neutral">
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {(canUpdate || canDelete) && (
                <div className="flex flex-wrap gap-2">
                  {canUpdate && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setEditing(user)}>
                        Editar
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setChangingPassword(user)}>
                        Trocar senha
                      </Button>
                    </>
                  )}
                  {canDelete && user.id !== currentUserId && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pendingId === user.id}
                      onClick={() => handleDelete(user)}
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              )}
            </div>
            {rowErrors[user.id] && <p className="mt-2 text-sm text-danger">{rowErrors[user.id]}</p>}
          </div>
        ))}
      </div>

      {editing && (
        <UserFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          options={options}
          mode="edit"
          userId={editing.id}
          defaultValues={editing}
          currentUserId={currentUserId}
          onSuccess={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {changingPassword && (
        <ChangePasswordDialog
          open={Boolean(changingPassword)}
          onOpenChange={(open) => !open && setChangingPassword(null)}
          userId={changingPassword.id}
          userName={changingPassword.name}
          onSuccess={() => {
            setChangingPassword(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
