import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { listUsersAction } from "@/modules/users/actions/list-users.action";
import { getUserFormOptionsAction } from "@/modules/users/actions/get-user-form-options.action";
import { UserFilters } from "@/modules/users/components/user-filters";
import { UserList } from "@/modules/users/components/user-list";
import { NewUserButton } from "@/modules/users/components/new-user-button";
import type { UserStatus } from "@/modules/users/types/user.types";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; roleId?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.users.view);
  if (!canView) return <ComingSoon title="Usuários" />;

  const session = await auth();
  const currentUserId = session!.user!.id!;

  const [canCreate, canUpdate] = await Promise.all([
    hasPermission(PERMISSIONS.users.create),
    hasPermission(PERMISSIONS.users.update),
  ]);

  const search = searchParams.search || "";
  const status = searchParams.status || "";
  const roleId = searchParams.roleId || "";

  const [users, options] = await Promise.all([
    listUsersAction({
      search: search || undefined,
      status: (status || undefined) as UserStatus | undefined,
      roleId: roleId || undefined,
    }),
    getUserFormOptionsAction(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Usuários</h1>
          <p className="text-sm text-text-secondary">Contas de acesso, credenciais e papéis do sistema.</p>
        </div>
        {canCreate && <NewUserButton options={options} currentUserId={currentUserId} />}
      </div>

      <UserFilters search={search} status={status} roleId={roleId} roles={options.roles} />

      <UserList users={users} options={options} canUpdate={canUpdate} currentUserId={currentUserId} />
    </div>
  );
}
