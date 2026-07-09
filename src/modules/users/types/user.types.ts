import type { userStatusValues } from "@/modules/users/schemas/user.schema";

export type UserStatus = (typeof userStatusValues)[number];

export interface UserRoleOption {
  id: string;
  name: string;
  slug: string;
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  roles: UserRoleOption[];
}

export interface UserFormOptions {
  roles: UserRoleOption[];
}
