import "server-only";
import { comparePassword } from "@/lib/auth/password";
import { findActiveUserByEmail } from "@/modules/auth/repositories/user.repository";

export class AuthService {
  async validateCredentials(email: string, password: string) {
    const user = await findActiveUserByEmail(email);
    if (!user || user.status !== "ACTIVE") return null;

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) return null;

    return { id: user.id, name: user.name, email: user.email, image: user.image };
  }
}
