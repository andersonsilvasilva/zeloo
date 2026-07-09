import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Senha padrão para todos os usuários fictícios criados por este script. */
const TEST_PASSWORD = "Teste@123";

interface BarberSeed {
  fullName: string;
  professionalName: string;
  email: string;
  phone: string;
  commissionPercentage: number;
}

const BARBERS: BarberSeed[] = [
  { fullName: "João Pereira", professionalName: "João", email: "joao.pereira@barbershop.local", phone: "(11) 91111-0001", commissionPercentage: 45 },
  { fullName: "Marcos Andrade", professionalName: "Marcos", email: "marcos.andrade@barbershop.local", phone: "(11) 91111-0002", commissionPercentage: 40 },
  { fullName: "Pedro Henrique", professionalName: "Pedro", email: "pedro.henrique@barbershop.local", phone: "(11) 91111-0003", commissionPercentage: 50 },
  { fullName: "Lucas Martins", professionalName: "Lucas", email: "lucas.martins@barbershop.local", phone: "(11) 91111-0004", commissionPercentage: 42 },
];

interface ClientSeed {
  name: string;
  phone: string;
  birthDate: Date;
}

const CLIENTS: ClientSeed[] = [
  { name: "Carlos Eduardo Souza", phone: "(11) 92222-0001", birthDate: new Date("1990-03-15") },
  { name: "Bruno Alves Lima", phone: "(11) 92222-0002", birthDate: new Date("1988-07-22") },
  { name: "Felipe Rocha Nunes", phone: "(11) 92222-0003", birthDate: new Date("1995-11-05") },
  { name: "André Costa Ribeiro", phone: "(11) 92222-0004", birthDate: new Date("1985-01-30") },
  { name: "Rafael Dias Barbosa", phone: "(11) 92222-0005", birthDate: new Date("1992-09-18") },
  { name: "Tiago Nunes Cardoso", phone: "(11) 92222-0006", birthDate: new Date("1998-04-12") },
  { name: "Gustavo Silva Teixeira", phone: "(11) 92222-0007", birthDate: new Date("1993-06-25") },
  { name: "Diego Ferreira Melo", phone: "(11) 92222-0008", birthDate: new Date("1991-12-03") },
  { name: "Leonardo Martins Pinto", phone: "(11) 92222-0009", birthDate: new Date("1987-08-14") },
  { name: "Vinícius Oliveira Santos", phone: "(11) 92222-0010", birthDate: new Date("1996-02-20") },
  { name: "Eduardo Gomes Araújo", phone: "(11) 92222-0011", birthDate: new Date("1994-10-08") },
  { name: "Matheus Rodrigues Cunha", phone: "(11) 92222-0012", birthDate: new Date("1989-05-27") },
  { name: "Gabriel Carvalho Moreira", phone: "(11) 92222-0013", birthDate: new Date("1997-03-11") },
  { name: "Henrique Batista Correia", phone: "(11) 92222-0014", birthDate: new Date("1990-07-19") },
  { name: "Fernando Castro Monteiro", phone: "(11) 92222-0015", birthDate: new Date("1986-11-29") },
];

const ATTENDANTS = [
  { name: "Juliana Ferreira", email: "juliana.ferreira@barbershop.local" },
  { name: "Camila Santos", email: "camila.santos@barbershop.local" },
];

const CASHIER = { name: "Patrícia Mendes", email: "patricia.mendes@barbershop.local" };

const WORKING_HOURS = {
  seg: ["09:00-19:00"],
  ter: ["09:00-19:00"],
  qua: ["09:00-19:00"],
  qui: ["09:00-19:00"],
  sex: ["09:00-19:00"],
  sab: ["09:00-14:00"],
};

async function createStaffUser(name: string, email: string, roleSlug: string, passwordHash: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, status: "ACTIVE" },
  });

  const role = await prisma.role.findUniqueOrThrow({ where: { slug: roleSlug } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  return user;
}

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  console.log("Seeding barbeiros...");
  for (const b of BARBERS) {
    const user = await createStaffUser(b.fullName, b.email, "BARBER", passwordHash);
    await prisma.barber.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: b.fullName,
        professionalName: b.professionalName,
        phone: b.phone,
        whatsapp: b.phone,
        email: b.email,
        status: "ACTIVE",
        commissionPercentage: b.commissionPercentage,
        hiredAt: new Date(),
        workingHours: WORKING_HOURS,
      },
    });
  }

  console.log("Seeding clientes...");
  for (const c of CLIENTS) {
    const existing = await prisma.client.findFirst({ where: { name: c.name } });
    if (existing) continue;
    await prisma.client.create({
      data: {
        name: c.name,
        phone: c.phone,
        whatsapp: c.phone,
        birthDate: c.birthDate,
        status: "ACTIVE",
      },
    });
  }

  console.log("Seeding atendentes...");
  for (const a of ATTENDANTS) {
    await createStaffUser(a.name, a.email, "ATTENDANT", passwordHash);
  }

  console.log("Seeding caixa...");
  await createStaffUser(CASHIER.name, CASHIER.email, "CASHIER", passwordHash);

  console.log("✅ Dados fictícios de teste criados.");
  console.log(`Senha padrão para todos os usuários de teste: ${TEST_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
