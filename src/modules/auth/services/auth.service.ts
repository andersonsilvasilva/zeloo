import "server-only";
import { comparePassword } from "@/lib/auth/password";
import { findActiveUserByEmail } from "@/modules/auth/repositories/user.repository";
import { TenancyRepository } from "@/modules/tenancy/repositories/tenancy.repository";

export class AuthService {
  /**
   * Login por tenant (Fase 5, spec §29): usuário e senha válidos não bastam
   * — precisa de membership ativa no tenant resolvido pelo hostname da
   * requisição. `tenantId` vem de `getCurrentTenant()` (Fase 2), nunca de
   * input do cliente. Falha genérica (retorna `null`, mesmo caminho de
   * "credenciais inválidas") em qualquer um dos casos — não revela se o
   * e-mail existe ou se só falta vínculo com esse tenant específico.
   */
  async validateCredentials(email: string, password: string, tenantId: string) {
    const user = await findActiveUserByEmail(email);
    if (!user || user.status !== "ACTIVE") return null;

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) return null;

    const tenancyRepo = new TenancyRepository();
    const membership = await tenancyRepo.findActiveMembership(tenantId, user.id);
    if (!membership) return null;

    return { id: user.id, name: user.name, email: user.email, image: user.image };
  }
}
