import { prisma } from "@/lib/prisma";
import { zonedDateAndTimeToUtc, startOfZonedDay, todayInTimezone } from "@/lib/utils/timezone";
import { SettingsService } from "@/modules/settings/services/settings.service";
import {
  AppointmentRepository,
  type AppointmentWithRelations,
} from "@/modules/appointments/repositories/appointment.repository";
import type {
  CreateAppointmentInput,
  RescheduleAppointmentInput,
  ListAppointmentsInput,
  GetAvailableSlotsInput,
  AppointmentStatus,
} from "@/modules/appointments/schemas/appointment.schema";
import type {
  AppointmentDetail,
  AppointmentFormOptions,
  AppointmentListItem,
  TimeSlot,
} from "@/modules/appointments/types/appointment.types";

export class AppointmentConflictError extends Error {
  constructor() {
    super("Este barbeiro já possui um agendamento nesse horário.");
    this.name = "AppointmentConflictError";
  }
}

export class AppointmentNotFoundError extends Error {
  constructor() {
    super("Agendamento não encontrado.");
    this.name = "AppointmentNotFoundError";
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(from: AppointmentStatus, to: AppointmentStatus) {
    super(`Não é possível mudar o status de "${from}" para "${to}".`);
    this.name = "InvalidStatusTransitionError";
  }
}

export class AppointmentHasPaymentError extends Error {
  constructor() {
    super("Este agendamento já tem pagamento registrado e não pode ser excluído.");
    this.name = "AppointmentHasPaymentError";
  }
}

/** Transições de status permitidas (spec: fluxo de agendamento). Estados finais não têm saída. */
const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

/** Chaves de dia da semana usadas em Barber.workingHours (ver prisma/seed-demo.ts). Index = Date#getDay(). */
const WEEKDAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

/** Granularidade dos horários sugeridos na agenda. */
const SLOT_STEP_MINUTES = 15;

/**
 * Regras de negócio de agendamento.
 * Chamada apenas pela camada de actions (nunca diretamente por componentes).
 */
export class AppointmentService {
  /** `createdById` fica ausente em agendamentos criados via `/agendar` sem conta (cliente não é um User). */
  async create(input: CreateAppointmentInput, createdById?: string) {
    return prisma.$transaction(async (tx) => {
      const repo = new AppointmentRepository(tx);

      const services = await repo.findServicesByIds(input.serviceIds);
      if (services.length !== input.serviceIds.length) {
        throw new Error("Um ou mais serviços selecionados são inválidos.");
      }

      const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
      const endTime = new Date(input.startTime.getTime() + totalDuration * 60_000);

      // Checagem de conflito DENTRO da transação, para evitar race conditions.
      const conflict = await repo.hasConflict({
        barberId: input.barberId,
        startTime: input.startTime,
        endTime,
      });
      if (conflict) throw new AppointmentConflictError();

      const appointment = await tx.appointment.create({
        data: {
          clientId: input.clientId,
          barberId: input.barberId,
          appointmentDate: input.appointmentDate,
          startTime: input.startTime,
          endTime,
          notes: input.notes,
          createdById,
          status: "PENDING",
          services: {
            create: services.map((s) => ({
              serviceId: s.id,
              price: s.price,
              durationMinutes: s.durationMinutes,
            })),
          },
        },
        include: { services: true },
      });

      return appointment;
    });
  }

  async update(input: RescheduleAppointmentInput) {
    return prisma.$transaction(async (tx) => {
      const repo = new AppointmentRepository(tx);

      const existing = await repo.findById(input.id);
      if (!existing) throw new AppointmentNotFoundError();

      const services = await repo.findServicesByIds(input.serviceIds);
      if (services.length !== input.serviceIds.length) {
        throw new Error("Um ou mais serviços selecionados são inválidos.");
      }

      const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
      const endTime = new Date(input.startTime.getTime() + totalDuration * 60_000);

      const conflict = await repo.hasConflict({
        barberId: input.barberId,
        startTime: input.startTime,
        endTime,
        excludeAppointmentId: input.id,
      });
      if (conflict) throw new AppointmentConflictError();

      const appointment = await repo.reschedule({
        id: input.id,
        barberId: input.barberId,
        appointmentDate: input.appointmentDate,
        startTime: input.startTime,
        endTime,
        notes: input.notes,
        services: services.map((s) => ({
          serviceId: s.id,
          price: s.price,
          durationMinutes: s.durationMinutes,
        })),
      });

      return this.toListItem(appointment);
    });
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<AppointmentListItem> {
    const repo = new AppointmentRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new AppointmentNotFoundError();

    if (!STATUS_TRANSITIONS[existing.status].includes(status)) {
      throw new InvalidStatusTransitionError(existing.status, status);
    }

    const updated = await repo.updateStatus(id, status);
    return this.toListItem({ ...existing, ...updated });
  }

  async cancel(id: string): Promise<AppointmentListItem> {
    return this.updateStatus(id, "CANCELLED");
  }

  /**
   * Exclusão definitiva (diferente de cancelar): remove o registro do banco.
   * Bloqueada se já existe pagamento vinculado — o relacionamento Payment ->
   * Appointment é onDelete: Cascade no schema, então excluir apagaria também
   * o histórico financeiro (ver prisma/schema.prisma).
   */
  async delete(id: string): Promise<void> {
    const repo = new AppointmentRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new AppointmentNotFoundError();
    if (existing.payments.length > 0) throw new AppointmentHasPaymentError();

    await repo.delete(id);
  }

  async getById(id: string): Promise<AppointmentDetail> {
    const repo = new AppointmentRepository();
    const appointment = await repo.findById(id);
    if (!appointment) throw new AppointmentNotFoundError();
    return this.toDetail(appointment);
  }

  async list(filters: ListAppointmentsInput): Promise<AppointmentListItem[]> {
    const repo = new AppointmentRepository();
    const appointments = await repo.list(filters);
    return appointments.map((a) => this.toListItem(a));
  }

  /**
   * Agenda do dia para o box "próximos atendimentos" do dashboard — só os
   * status ainda ativos (exclui concluídos/cancelados/não-comparecimento).
   * Se o usuário logado for um barbeiro, mostra só a própria agenda.
   */
  async listToday(userId: string): Promise<AppointmentListItem[]> {
    const repo = new AppointmentRepository();
    const barber = await repo.findBarberIdByUserId(userId);
    const timezone = await this.getTimezone();
    const today = todayInTimezone(timezone);

    const appointments = await repo.list({ dateFrom: today, dateTo: today, barberId: barber?.id });
    return appointments
      .filter((a) => ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(a.status))
      .map((a) => this.toListItem(a));
  }

  async getFormOptions(): Promise<AppointmentFormOptions> {
    const repo = new AppointmentRepository();
    const [services, barbers, clients, timezone] = await Promise.all([
      repo.listActiveServices(),
      repo.listActiveBarbersWithServices(),
      repo.listActiveClients(),
      this.getTimezone(),
    ]);

    return {
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price.toNumber(),
        durationMinutes: s.durationMinutes,
      })),
      barbers: barbers.map((b) => ({
        id: b.id,
        professionalName: b.professionalName,
        serviceIds: b.services.map((bs) => bs.serviceId),
      })),
      clients: clients.map((c) => ({ id: c.id, name: c.name, phone: c.phone })),
      timezone,
    };
  }

  /**
   * Calcula horários disponíveis para um barbeiro em uma data, a partir do
   * expediente (Barber.workingHours) descontando agendamentos já ativos e
   * a duração total dos serviços selecionados.
   */
  async getAvailableSlots(input: GetAvailableSlotsInput): Promise<TimeSlot[]> {
    const repo = new AppointmentRepository();

    const [barber, services, timezone] = await Promise.all([
      repo.findBarberById(input.barberId),
      repo.findServicesByIds(input.serviceIds),
      this.getTimezone(),
    ]);

    if (!barber || barber.status !== "ACTIVE") return [];
    if (services.length !== input.serviceIds.length) return [];

    const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    const ranges = this.workingRangesFor(barber.workingHours, input.date);
    if (ranges.length === 0) return [];

    const dayStart = startOfZonedDay(input.date, timezone);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const existing = await repo.findActiveAppointmentsForBarberOnDate(
      input.barberId,
      dayStart,
      dayEnd,
      input.excludeAppointmentId,
    );

    const now = new Date();
    const slots: TimeSlot[] = [];

    for (const range of ranges) {
      let cursor = zonedDateAndTimeToUtc(input.date, range.start, timezone);
      const rangeEnd = zonedDateAndTimeToUtc(input.date, range.end, timezone);

      while (cursor.getTime() + totalDuration * 60_000 <= rangeEnd.getTime()) {
        const slotEnd = new Date(cursor.getTime() + totalDuration * 60_000);
        const isPast = cursor.getTime() < now.getTime();
        const overlaps = existing.some((appt) => cursor < appt.endTime && slotEnd > appt.startTime);

        slots.push({ start: new Date(cursor), end: slotEnd, available: !isPast && !overlaps });
        cursor = new Date(cursor.getTime() + SLOT_STEP_MINUTES * 60_000);
      }
    }

    return slots;
  }

  private toListItem(appointment: AppointmentWithRelations): AppointmentListItem {
    return {
      id: appointment.id,
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      notes: appointment.notes,
      client: appointment.client,
      barber: appointment.barber,
      services: appointment.services.map((s) => ({ id: s.service.id, name: s.service.name })),
      totalPrice: appointment.services.reduce((sum, s) => sum + s.price.toNumber(), 0),
      totalDurationMinutes: appointment.services.reduce((sum, s) => sum + s.durationMinutes, 0),
      hasPayment: appointment.payments.length > 0,
    };
  }

  private toDetail(appointment: AppointmentWithRelations): AppointmentDetail {
    return { ...this.toListItem(appointment), createdBy: appointment.createdBy };
  }

  /** Extrai os intervalos "HH:MM-HH:MM" do dia da semana correspondente à data. */
  private workingRangesFor(workingHours: unknown, date: Date): { start: string; end: string }[] {
    if (!workingHours || typeof workingHours !== "object") return [];

    const key = WEEKDAY_KEYS[date.getDay()];
    const raw = (workingHours as Record<string, unknown>)[key];
    if (!Array.isArray(raw)) return [];

    return raw
      .filter((entry): entry is string => typeof entry === "string" && entry.includes("-"))
      .map((entry) => {
        const [start, end] = entry.split("-");
        return { start, end };
      });
  }

  private async getTimezone(): Promise<string> {
    const settings = await new SettingsService().getGeneralSettings();
    return settings.timezone;
  }
}
