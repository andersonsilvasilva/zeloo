/**
 * Gera histórico fictício de agendamentos, pagamentos e lançamentos de caixa
 * em cima dos profissionais/clientes/serviços já criados por `seed-demo.ts`.
 * Roda com `npx tsx prisma/seed-appointments.ts`. Idempotente por checagem
 * simples: aborta se já existir algum agendamento.
 */
import { PrismaClient, type AppointmentStatus, type PaymentMethod } from "@prisma/client";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import { parseDateOnly, formatDateOnly } from "../src/modules/appointments/utils/date-only";

const prisma = new PrismaClient();

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function weightedStatus(isPast: boolean, isToday: boolean): AppointmentStatus {
  const r = Math.random();
  if (isToday) {
    if (r < 0.5) return "COMPLETED";
    if (r < 0.8) return "CONFIRMED";
    return "IN_PROGRESS";
  }
  if (isPast) {
    if (r < 0.75) return "COMPLETED";
    if (r < 0.88) return "CANCELLED";
    return "NO_SHOW";
  }
  return r < 0.55 ? "PENDING" : "CONFIRMED";
}

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"];

const EXPENSE_ENTRIES: Array<{ description: string; amount: number; category: string; daysAgo: number }> = [
  { description: "Aluguel do salão", amount: 1800, category: "Aluguel", daysAgo: 20 },
  { description: "Conta de energia", amount: 320, category: "Energia", daysAgo: 15 },
  { description: "Compra de produtos (pomadas, navalhas)", amount: 450, category: "Produtos", daysAgo: 10 },
  { description: "Manutenção de equipamentos", amount: 180, category: "Manutenção", daysAgo: 5 },
  { description: "Conta de água", amount: 95, category: "Água", daysAgo: 3 },
];

async function main() {
  const existingAppointments = await prisma.appointment.count();
  if (existingAppointments > 0) {
    console.log(`Já existem ${existingAppointments} agendamentos — abortando para não duplicar dados.`);
    return;
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@barbershop.local" } });
  const professionals = await prisma.professional.findMany({ where: { status: "ACTIVE" } });
  const clients = await prisma.client.findMany();
  const services = await prisma.service.findMany({ where: { status: "ACTIVE" } });

  if (professionals.length === 0 || clients.length === 0 || services.length === 0) {
    console.log("Rode antes o `npx tsx prisma/seed-demo.ts` — faltam profissionais, clientes ou serviços.");
    return;
  }

  const openRegister = await prisma.cashRegister.findFirst({ where: { status: "OPEN" } });
  if (!openRegister) {
    console.log("Seeding caixa (abertura)...");
    await prisma.cashRegister.create({
      data: {
        openedById: admin.id,
        openedAt: setHours(setMinutes(startOfDay(new Date()), 0), 8),
        openingBalance: 200,
        status: "OPEN",
      },
    });
  }

  console.log("Seeding agendamentos, pagamentos e lançamentos de caixa...");
  const today = startOfDay(new Date());
  const clientTotals = new Map<string, { total: number; last: Date }>();
  let appointmentCount = 0;

  for (let offset = -45; offset <= 7; offset++) {
    const day = addDays(today, offset);
    if (day.getDay() === 0) continue; // fechado aos domingos

    const isToday = offset === 0;
    const isPast = offset < 0;
    const slotsToday = day.getDay() === 6 ? 1 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 4);

    for (let slot = 0; slot < slotsToday; slot++) {
      const startHour = 9 + slot * 2;
      if (startHour >= 19) continue;

      const client = pick(clients);
      const professional = pick(professionals);
      const serviceCount = Math.random() < 0.35 && services.length > 1 ? 2 : 1;
      const chosenServices = Array.from(
        new Map(
          Array.from({ length: serviceCount }, () => pick(services)).map((s) => [s.id, s]),
        ).values(),
      );

      const totalDuration = chosenServices.reduce((sum, s) => sum + s.durationMinutes, 0);
      const startTime = setMinutes(setHours(day, startHour), pick([0, 15, 30, 45]));
      const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000);
      const status = weightedStatus(isPast, isToday);

      const appointment = await prisma.appointment.create({
        data: {
          clientId: client.id,
          professionalId: professional.id,
          appointmentDate: parseDateOnly(formatDateOnly(new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())))),
          startTime,
          endTime,
          status,
          createdById: admin.id,
        },
      });
      appointmentCount++;

      for (const service of chosenServices) {
        await prisma.appointmentService.create({
          data: {
            appointmentId: appointment.id,
            serviceId: service.id,
            price: service.price,
            durationMinutes: service.durationMinutes,
          },
        });
      }

      if (status === "COMPLETED") {
        const totalPrice = chosenServices.reduce((sum, s) => sum + s.price.toNumber(), 0);
        const paymentMethod = pick(PAYMENT_METHODS);
        const paidAt = endTime;

        const payment = await prisma.payment.create({
          data: {
            appointmentId: appointment.id,
            amount: totalPrice,
            paymentMethod,
            status: "PAID",
            paidAt,
            receivedById: admin.id,
          },
        });

        await prisma.cashbookEntry.create({
          data: {
            type: "CREDIT",
            description: `Pagamento — ${client.name}`,
            amount: totalPrice,
            category: "Serviços",
            paymentMethod,
            appointmentId: appointment.id,
            paymentId: payment.id,
            transactionDate: paidAt,
            createdById: admin.id,
          },
        });

        const prev = clientTotals.get(client.id);
        clientTotals.set(client.id, {
          total: (prev?.total ?? 0) + totalPrice,
          last: !prev || paidAt > prev.last ? paidAt : prev.last,
        });
      }
    }
  }

  console.log(`Criados ${appointmentCount} agendamentos.`);

  console.log("Atualizando total gasto / último atendimento dos clientes...");
  for (const [clientId, { total, last }] of clientTotals) {
    await prisma.client.update({ where: { id: clientId }, data: { totalSpent: total, lastAppointmentAt: last } });
  }

  console.log("Seeding lançamentos manuais de despesa (para o balancete)...");
  for (const e of EXPENSE_ENTRIES) {
    await prisma.cashbookEntry.create({
      data: {
        type: "DEBIT",
        description: e.description,
        amount: e.amount,
        category: e.category,
        transactionDate: addDays(today, -e.daysAgo),
        createdById: admin.id,
      },
    });
  }

  console.log("✅ Histórico fictício de agendamentos/pagamentos/caixa criado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
