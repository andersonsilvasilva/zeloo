import "server-only";
import { cache } from "react";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import type { PermissionSlug } from "@/lib/auth/permissions";

/**
 * Camada centralizada de autorização.
 *
 * Toda Server Action / Route Handler que precise checar acesso deve
 * chamar `requirePermission()` — nunca inspecionar `session.user.role`
 * diretamente em componentes ou actions.
 */

export class UnauthorizedError extends Error {
  constructor(message = "Não autenticado.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Sem permissão para executar esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Carrega as permissões efetivas do usuário autenticado (todas as roles
 * combinadas), com cache por request (React `cache`) para evitar N+1.
 */
export const getSessionPermissions = cache(async (): Promise<Set<PermissionSlug>> => {
  const session = await auth();
  if (!session?.user?.id) return new Set();

  const userRoles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  const slugs = userRoles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.slug as PermissionSlug),
  );

  return new Set(slugs);
});

export async function hasPermission(permission: PermissionSlug): Promise<boolean> {
  const permissions = await getSessionPermissions();
  return permissions.has(permission);
}

/** Lança ForbiddenError/UnauthorizedError se a permissão não estiver presente. */
export async function requirePermission(permission: PermissionSlug): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const allowed = await hasPermission(permission);
  if (!allowed) throw new ForbiddenError();
}

/** Retorna o id do usuário autenticado ou lança UnauthorizedError. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user.id;
}
