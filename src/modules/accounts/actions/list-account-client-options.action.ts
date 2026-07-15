"use server";

import { requireUserId } from "@/lib/auth/rbac";
import { AccountService } from "@/modules/accounts/services/account.service";

/** Lista clientes ativos pro select opcional de Contas a Receber — não tem permission própria, exige só sessão. */
export async function listAccountClientOptionsAction() {
  await requireUserId();
  const service = new AccountService();
  return service.listClientOptions();
}
