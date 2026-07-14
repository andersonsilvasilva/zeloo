import { hashPassword } from "@/lib/auth/password";
import { UserRepository, type UserWithRoles } from "@/modules/users/repositories/user.repository";
import type {
  CreateUserInput,
  UpdateUserInput,
  ChangeUserPasswordInput,
  ListUsersInput,
} from "@/modules/users/schemas/user.schema";
import type { UserFormOptions, UserListItem } from "@/modules/users/types/user.types";

export class UserNotFoundError extends Error {
  constructor() {
    super("Usuário não encontrado.");
    this.name = "UserNotFoundError";
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("Já existe um usuário com este e-mail.");
    this.name = "EmailAlreadyExistsError";
  }
}

export class CannotModifySelfStatusError extends Error {
  constructor() {
    super("Você não pode alterar o status da sua própria conta por aqui.");
    this.name = "CannotModifySelfStatusError";
  }
}

export class CannotDeleteSelfError extends Error {
  constructor() {
    super("Você não pode excluir sua própria conta.");
    this.name = "CannotDeleteSelfError";
  }
}

export class UserService {
  async list(filters: ListUsersInput): Promise<UserListItem[]> {
    const repo = new UserRepository();
    const users = await repo.list(filters);
    return users.map((u) => this.toListItem(u));
  }

  async getById(id: string): Promise<UserListItem> {
    const repo = new UserRepository();
    const user = await repo.findById(id);
    if (!user) throw new UserNotFoundError();
    return this.toListItem(user);
  }

  async create(input: CreateUserInput): Promise<UserListItem> {
    const repo = new UserRepository();

    const existing = await repo.findByEmail(input.email);
    if (existing) throw new EmailAlreadyExistsError();

    const passwordHash = await hashPassword(input.password);

    const user = await repo.create(
      {
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone || null,
        status: input.status,
      },
      input.roleIds,
    );
    return this.toListItem(user);
  }

  async update(input: UpdateUserInput, currentUserId: string): Promise<UserListItem> {
    const repo = new UserRepository();

    const existing = await repo.findById(input.id);
    if (!existing) throw new UserNotFoundError();

    if (input.id === currentUserId && input.status !== "ACTIVE") {
      throw new CannotModifySelfStatusError();
    }

    if (input.email !== existing.email) {
      const emailInUse = await repo.findByEmail(input.email);
      if (emailInUse) throw new EmailAlreadyExistsError();
    }

    const user = await repo.update(
      input.id,
      {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        status: input.status,
      },
      input.roleIds,
    );
    return this.toListItem(user);
  }

  async changePassword(input: ChangeUserPasswordInput): Promise<void> {
    const repo = new UserRepository();
    const existing = await repo.findById(input.id);
    if (!existing) throw new UserNotFoundError();

    const passwordHash = await hashPassword(input.password);
    await repo.updatePasswordHash(input.id, passwordHash);
  }

  /**
   * Exclui só a conta de login (User + UserRole). Profissional/Cliente vinculado
   * e todo o histórico (agendamentos, pagamentos, caixa) continuam intactos —
   * as FKs relevantes já são `onDelete: SetNull`.
   */
  async delete(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) throw new CannotDeleteSelfError();

    const repo = new UserRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new UserNotFoundError();

    await repo.delete(id);
  }

  async getFormOptions(): Promise<UserFormOptions> {
    const repo = new UserRepository();
    const roles = await repo.listAllRolesForSelect();
    return { roles };
  }

  private toListItem(user: UserWithRoles): UserListItem {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      roles: user.roles.map((ur) => ur.role),
    };
  }
}
