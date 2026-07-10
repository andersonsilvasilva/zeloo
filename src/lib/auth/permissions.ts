/**
 * Catálogo central de permissões do sistema.
 *
 * Regra de ouro: nenhuma parte do app deve verificar `if (role === "ADMIN")`.
 * Toda checagem de acesso passa por `hasPermission()` (ver rbac.ts),
 * que consulta a relação Role -> RolePermission -> Permission no banco
 * (com cache em memória por request).
 */

export const PERMISSIONS = {
  clients: {
    view: "clients.view",
    create: "clients.create",
    update: "clients.update",
    delete: "clients.delete",
  },
  barbers: {
    view: "barbers.view",
    create: "barbers.create",
    update: "barbers.update",
    delete: "barbers.delete",
  },
  services: {
    view: "services.view",
    create: "services.create",
    update: "services.update",
    delete: "services.delete",
  },
  appointments: {
    view: "appointments.view",
    create: "appointments.create",
    update: "appointments.update",
    cancel: "appointments.cancel",
    delete: "appointments.delete",
  },
  finance: {
    view: "finance.view",
    create: "finance.create",
    update: "finance.update",
  },
  reports: {
    view: "reports.view",
  },
  messages: {
    send: "messages.send",
  },
  settings: {
    update: "settings.update",
  },
  users: {
    view: "users.view",
    create: "users.create",
    update: "users.update",
  },
} as const;

export type PermissionSlug = {
  [K in keyof typeof PERMISSIONS]: (typeof PERMISSIONS)[K][keyof (typeof PERMISSIONS)[K]];
}[keyof typeof PERMISSIONS];

/** Papéis iniciais do sistema. */
export const ROLES = {
  ADMIN: "ADMIN",
  BARBER: "BARBER",
  ATTENDANT: "ATTENDANT",
  CASHIER: "CASHIER",
  CLIENT: "CLIENT",
} as const;

export type RoleSlug = (typeof ROLES)[keyof typeof ROLES];

/**
 * Mapeamento padrão role -> permissions, usado apenas no seed inicial.
 * Em produção, a fonte da verdade é o banco (tabela role_permissions),
 * que pode ser editada pelo Administrador na tela de Permissões.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleSlug, PermissionSlug[]> = {
  ADMIN: Object.values(PERMISSIONS).flatMap((group) => Object.values(group)) as PermissionSlug[],
  BARBER: [
    PERMISSIONS.appointments.view,
    PERMISSIONS.clients.view,
    PERMISSIONS.services.view,
    PERMISSIONS.reports.view, // apenas indicadores próprios — filtrado na service layer
  ],
  ATTENDANT: [
    PERMISSIONS.clients.view,
    PERMISSIONS.clients.create,
    PERMISSIONS.clients.update,
    PERMISSIONS.appointments.view,
    PERMISSIONS.appointments.create,
    PERMISSIONS.appointments.update,
    PERMISSIONS.appointments.cancel,
    PERMISSIONS.barbers.view,
    PERMISSIONS.services.view,
  ],
  CASHIER: [
    PERMISSIONS.finance.view,
    PERMISSIONS.finance.create,
    PERMISSIONS.finance.update,
    PERMISSIONS.appointments.view,
    PERMISSIONS.clients.view, // para o box de aniversariantes e contexto do cliente ao receber pagamento
  ],
  CLIENT: [
    PERMISSIONS.appointments.view,
    PERMISSIONS.appointments.create,
    PERMISSIONS.appointments.update,
    PERMISSIONS.appointments.cancel,
    PERMISSIONS.services.view,
    PERMISSIONS.barbers.view,
  ],
};

/**
 * IMPORTANTE: BARBER nunca deve receber finance.* — o barbeiro não pode
 * visualizar informações financeiras globais da barbearia (ver spec item 3).
 * Essa restrição é reforçada também na camada de service (ver
 * modules/reports/services), não apenas aqui.
 */
