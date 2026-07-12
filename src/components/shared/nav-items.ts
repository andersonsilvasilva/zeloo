import { PERMISSIONS, type PermissionSlug } from "@/lib/auth/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: PermissionSlug;
}

/** Itens do menu principal. `permission` ausente = sempre visível. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Agenda", href: "/agenda", icon: "CalendarDays", permission: PERMISSIONS.appointments.view },
  { label: "Clientes", href: "/clientes", icon: "Users", permission: PERMISSIONS.clients.view },
  { label: "Profissionais", href: "/profissionais", icon: "Scissors", permission: PERMISSIONS.professionals.view },
  { label: "Serviços", href: "/servicos", icon: "Sparkles", permission: PERMISSIONS.services.view },
  { label: "Financeiro", href: "/financeiro", icon: "Wallet", permission: PERMISSIONS.finance.view },
  { label: "Relatórios", href: "/relatorios", icon: "BarChart3", permission: PERMISSIONS.reports.view },
  { label: "Mensagens", href: "/mensagens", icon: "MessageCircle", permission: PERMISSIONS.messages.send },
  { label: "Usuários", href: "/usuarios", icon: "ShieldCheck", permission: PERMISSIONS.users.view },
  { label: "Configurações", href: "/configuracoes", icon: "Settings", permission: PERMISSIONS.settings.update },
];
