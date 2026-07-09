"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserStatusBadge } from "@/modules/users/components/user-status-badge";
import { UserFormDialog } from "@/modules/users/components/user-form-dialog";
import { ChangePasswordDialog } from "@/modules/users/components/change-password-dialog";
import type { UserFormOptions, UserListItem } from "@/modules/users/types/user.types";

export interface UserListProps {
  users: UserListItem[];
  options: UserFormOptions;
  canUpdate: boolean;
  currentUserId: string;
}

export function UserList({ users, options, canUpdate, currentUserId }: UserListProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [changingPassword, setChangingPassword] = useState<UserListItem | null>(null);

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

              {canUpdate && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(user)}>
                    Editar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setChangingPassword(user)}>
                    Trocar senha
                  </Button>
                </div>
              )}
            </div>
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
