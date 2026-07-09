import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLES } from "../src/lib/auth/permissions";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding permissions...");
  const allPermissionSlugs = Object.values(PERMISSIONS).flatMap((g) => Object.values(g));
  for (const slug of allPermissionSlugs) {
    await prisma.permission.upsert({
      where: { slug },
      update: {},
      create: { slug, name: slug },
    });
  }

  console.log("Seeding roles...");
  for (const roleSlug of Object.values(ROLES)) {
    const role = await prisma.role.upsert({
      where: { slug: roleSlug },
      update: {},
      create: { slug: roleSlug, name: roleSlug },
    });

    const permissionSlugs = DEFAULT_ROLE_PERMISSIONS[roleSlug];
    for (const permSlug of permissionSlugs) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { slug: permSlug } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log("Seeding admin user...");
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@barbershop.local" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@barbershop.local",
      passwordHash,
      status: "ACTIVE",
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { slug: ROLES.ADMIN } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log("Seeding default settings...");
  const defaultSettings: Array<[string, string, string]> = [
    ["barbershop.name", "Minha Barbearia", "string"],
    ["barbershop.timezone", "America/Sao_Paulo", "string"],
    ["barbershop.currency", "BRL", "string"],
    ["barbershop.whatsapp", "", "string"],
  ];
  for (const [key, value, type] of defaultSettings) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value, type },
    });
  }

  console.log("✅ Seed concluído. Login admin: admin@barbershop.local / Admin@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
