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
  professionals: {
    view: "professionals.view",
    create: "professionals.create",
    update: "professionals.update",
    delete: "professionals.delete",
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
  payables: {
    view: "payables.view",
    create: "payables.create",
    update: "payables.update",
    delete: "payables.delete",
  },
  receivables: {
    view: "receivables.view",
    create: "receivables.create",
    update: "receivables.update",
    delete: "receivables.delete",
  },
  commissions: {
    view: "commissions.view",
    close: "commissions.close",
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
    delete: "users.delete",
  },
  audit: {
    view: "audit.view",
  },
  /**
   * Ações de nível plataforma (cadastrar tenant novo), não de um negócio
   * específico. Não existe papel "platform admin" distinto de "tenant
   * admin" ainda (gap conhecido, ver docs/tenancy/13-acceptance-criteria.md)
   * — a barreira real hoje é a checagem de tenant raiz feita na própria
   * página (`app/(app)/plataforma/tenants/page.tsx`), não esta permissão
   * sozinha. Mesmo assim, ela segue a regra do projeto de nunca checar
   * `if (role === "ADMIN")` direto: `RolePermission` é global (não por
   * tenant), então sem o gate de tenant raiz, um ADMIN de QUALQUER tenant
   * (ex.: dona da Flora) também teria essa permissão marcada — por isso o
   * gate de página é a defesa real, esta permissão é defesa em profundidade.
   */
  platform: {
    manageTenants: "platform.manageTenants",
  },
} as const;

export type PermissionSlug = {
  [K in keyof typeof PERMISSIONS]: (typeof PERMISSIONS)[K][keyof (typeof PERMISSIONS)[K]];
}[keyof typeof PERMISSIONS];

/** Papéis iniciais do sistema. */
export const ROLES = {
  ADMIN: "ADMIN",
  PROFESSIONAL: "PROFESSIONAL",
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
  PROFESSIONAL: [
    PERMISSIONS.appointments.view,
    PERMISSIONS.clients.view,
    PERMISSIONS.services.view,
    PERMISSIONS.reports.view, // apenas indicadores próprios — filtrado na service layer
    PERMISSIONS.commissions.view, // apenas o próprio fechamento — filtrado na service layer
  ],
  ATTENDANT: [
    PERMISSIONS.clients.view,
    PERMISSIONS.clients.create,
    PERMISSIONS.clients.update,
    PERMISSIONS.appointments.view,
    PERMISSIONS.appointments.create,
    PERMISSIONS.appointments.update,
    PERMISSIONS.appointments.cancel,
    PERMISSIONS.professionals.view,
    PERMISSIONS.services.view,
  ],
  CASHIER: [
    PERMISSIONS.finance.view,
    PERMISSIONS.finance.create,
    PERMISSIONS.finance.update,
    PERMISSIONS.payables.view,
    PERMISSIONS.payables.create,
    PERMISSIONS.payables.update,
    PERMISSIONS.receivables.view,
    PERMISSIONS.receivables.create,
    PERMISSIONS.receivables.update,
    PERMISSIONS.appointments.view,
    PERMISSIONS.clients.view, // para o box de aniversariantes e contexto do cliente ao receber pagamento
  ],
  CLIENT: [
    PERMISSIONS.appointments.view,
    PERMISSIONS.appointments.create,
    PERMISSIONS.appointments.update,
    PERMISSIONS.appointments.cancel,
    PERMISSIONS.services.view,
    PERMISSIONS.professionals.view,
  ],
};

/**
 * IMPORTANTE: PROFESSIONAL nunca deve receber finance.* — o profissional não pode
 * visualizar informações financeiras globais da barbearia (ver spec item 3).
 * Essa restrição é reforçada também na camada de service (ver
 * modules/reports/services), não apenas aqui.
 */
