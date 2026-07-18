import { PrismaClient } from "@prisma/client";
import { addDays, subDays, startOfDay } from "date-fns";

const prisma = new PrismaClient();

const HISTORY_DAYS = 60;
const UPCOMING_DAYS = 6;

const SERVICES = [
  { name: "Corte Masculino", price: 45, durationMinutes: 30 },
  { name: "Barba", price: 30, durationMinutes: 20 },
  { name: "Corte + Barba", price: 70, durationMinutes: 45 },
  { name: "Sobrancelha", price: 15, durationMinutes: 10 },
  { name: "Platinado", price: 150, durationMinutes: 90 },
  { name: "Pézinho", price: 20, durationMinutes: 15 },
];

const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const PAYMENT_METHODS = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function combineDateTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

async function main() {
  const existingAppointments = await prisma.appointment.count();
  if (existingAppointments > 0) {
    console.log(`Já existem ${existingAppointments} agendamentos no banco — pulando para evitar duplicar histórico.`);
    return;
  }

  const professionals = await prisma.professional.findMany({ select: { id: true } });
  const clients = await prisma.client.findMany({ select: { id: true } });
  const staff = await prisma.user.findMany({
    where: { roles: { some: { role: { slug: { in: ["ATTENDANT", "CASHIER"] } } } } },
    select: { id: true },
  });

  if (professionals.length === 0 || clients.length === 0) {
    console.log("Nenhum profissional ou cliente encontrado. Rode `npm run prisma:seed:demo` primeiro.");
    return;
  }

  console.log("Seeding serviços...");
  // upsert() não aceita null na parte tenantId de uma unique compound key —
  // mesmo motivo/correção de prisma/seed.ts (Service.slug virou
  // @@unique([tenantId, slug])).
  const services = await Promise.all(
    SERVICES.map(async (s) => {
      const slug = slugify(s.name);
      const existing = await prisma.service.findFirst({ where: { slug, tenantId: null } });
      if (existing) return existing;
      return prisma.service.create({
        data: { name: s.name, slug, price: s.price, durationMinutes: s.durationMinutes, status: "ACTIVE" },
      });
    }),
  );

  console.log("Vinculando serviços aos profissionais...");
  for (const professional of professionals) {
    for (const service of services) {
      await prisma.professionalService.upsert({
        where: { professionalId_serviceId: { professionalId: professional.id, serviceId: service.id } },
        update: {},
        create: { professionalId: professional.id, serviceId: service.id },
      });
    }
  }

  const now = new Date();
  const historyStart = startOfDay(subDays(now, HISTORY_DAYS));
  const upcomingEnd = startOfDay(addDays(now, UPCOMING_DAYS));

  let created = 0;

  console.log("Gerando histórico de agendamentos...");
  for (let day = historyStart; day <= upcomingEnd; day = addDays(day, 1)) {
    if (day.getDay() === 0) continue; // fechado aos domingos
    const isFuture = day > startOfDay(now);

    for (const professional of professionals) {
      const appointmentsToday = isFuture ? (Math.random() < 0.5 ? 1 : 0) : Math.floor(Math.random() * 3);
      const slots = pickN(TIME_SLOTS, appointmentsToday);

      for (const slot of slots) {
        const client = pickRandom(clients);
        const serviceCount = Math.random() < 0.3 ? 2 : 1;
        const appointmentServices = pickN(services, serviceCount);
        const totalDuration = appointmentServices.reduce((sum, s) => sum + s.durationMinutes, 0);
        const startTime = combineDateTime(day, slot);
        const endTime = new Date(startTime.getTime() + totalDuration * 60000);
        const totalPrice = appointmentServices.reduce((sum, s) => sum + Number(s.price), 0);

        let status: "COMPLETED" | "CANCELLED" | "NO_SHOW" | "PENDING" | "CONFIRMED";
        if (isFuture) {
          status = Math.random() < 0.7 ? "CONFIRMED" : "PENDING";
        } else {
          const roll = Math.random();
          status = roll < 0.88 ? "COMPLETED" : roll < 0.94 ? "CANCELLED" : "NO_SHOW";
        }

        const staffMember = staff.length > 0 ? pickRandom(staff) : null;

        await prisma.appointment.create({
          data: {
            clientId: client.id,
            professionalId: professional.id,
            appointmentDate: startOfDay(day),
            startTime,
            endTime,
            status,
            createdById: staffMember?.id,
            services: {
              create: appointmentServices.map((s) => ({
                serviceId: s.id,
                price: s.price,
                durationMinutes: s.durationMinutes,
              })),
            },
            ...(status === "COMPLETED"
              ? {
                  payments: {
                    create: [
                      {
                        amount: totalPrice,
                        paymentMethod: pickRandom(PAYMENT_METHODS),
                        status: "PAID",
                        paidAt: startTime,
                        receivedById: staffMember?.id,
                      },
                    ],
                  },
                }
              : {}),
          },
        });
        created += 1;
      }
    }
  }

  console.log(`✅ ${created} agendamentos fictícios criados (histórico + próximos ${UPCOMING_DAYS} dias).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
