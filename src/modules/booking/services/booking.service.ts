import { signIn } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/auth/password";
import { getStorageProvider } from "@/lib/storage";
import { BarberRepository } from "@/modules/barbers/repositories/barber.repository";
import { ServiceRepository } from "@/modules/services/repositories/service.repository";
import { AppointmentService, AppointmentConflictError } from "@/modules/appointments/services/appointment.service";
import { autoSendAppointmentConfirmationAction } from "@/modules/messages/actions/auto-send-appointment-confirmation.action";
import { BookingRepository } from "@/modules/booking/repositories/booking.repository";
import type { IdentifyClientInput, CreatePublicAppointmentInput } from "@/modules/booking/schemas/booking.schema";
import type { IdentifyClientResult, PublicBarberOption, PublicServiceOption } from "@/modules/booking/types/booking.types";

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("Já existe uma conta com este e-mail. Faça login em vez de criar uma nova conta.");
    this.name = "EmailAlreadyExistsError";
  }
}

export class ClientNotFoundError extends Error {
  constructor() {
    super("Cliente não encontrado — refaça a identificação.");
    this.name = "ClientNotFoundError";
  }
}

export class PhoneMismatchError extends Error {
  constructor() {
    super("Telefone não confere com o cadastro — refaça a identificação.");
    this.name = "PhoneMismatchError";
  }
}

export class ClientProfileMissingError extends Error {
  constructor() {
    super("Sua conta não tem um perfil de cliente vinculado.");
    this.name = "ClientProfileMissingError";
  }
}

export class BookingService {
  async listBarbers(): Promise<PublicBarberOption[]> {
    const repo = new BarberRepository();
    const barbers = await repo.listActiveForPublicBooking();
    const storage = getStorageProvider();
    return barbers.map((b) => ({
      id: b.id,
      professionalName: b.professionalName,
      bio: b.bio,
      photoUrl: b.profileImage ? storage.getUrl(b.profileImage.storagePath) : null,
    }));
  }

  async listServices(): Promise<PublicServiceOption[]> {
    const repo = new ServiceRepository();
    const services = await repo.listActiveForPublicBooking();
    const storage = getStorageProvider();
    return services.map((s) => ({
      id: s.id,
      name: s.name,
      shortDescription: s.shortDescription,
      price: s.price.toNumber(),
      durationMinutes: s.durationMinutes,
      category: s.category,
      imageUrl: s.advertisingImage ? storage.getUrl(s.advertisingImage.storagePath) : null,
    }));
  }

  /**
   * Sem conta: encontra ou cria o Client pelo telefone, sem User/login.
   * Com conta: cria User (papel CLIENT) + Client vinculado e já autentica a sessão
   * (mesmo padrão de `login.action.ts`), pra não pedir login de novo em seguida.
   */
  async identifyClient(input: IdentifyClientInput): Promise<IdentifyClientResult> {
    const repo = new BookingRepository();

    if (!input.wantsAccount) {
      const existing = await repo.findClientByPhone(input.phone);
      if (existing) return { clientId: existing.id, hasAccount: Boolean(existing.userId) };

      const created = await repo.createClientByPhone(input.name, input.phone);
      return { clientId: created.id, hasAccount: false };
    }

    const email = input.email as string;
    const password = input.password as string;

    const existingUser = await repo.findUserByEmail(email);
    if (existingUser) throw new EmailAlreadyExistsError();

    const passwordHash = await hashPassword(password);
    const { clientId } = await repo.registerClientWithAccount({
      name: input.name,
      email,
      phone: input.phone,
      passwordHash,
    });

    await signIn("credentials", { email, password, redirect: false });

    return { clientId, hasAccount: true };
  }

  /**
   * Com sessão (conta criada): resolve o cliente pela sessão, ignorando qualquer
   * clientId enviado pelo formulário. Sem sessão: usa o clientId da URL, mas
   * reconfere o telefone antes de confiar nele — barreira simples contra
   * forjar o clientId de outra pessoa (ver plano do módulo booking).
   */
  async createAppointmentForBooking(
    input: CreatePublicAppointmentInput,
    sessionUserId: string | null,
  ) {
    const repo = new BookingRepository();

    let clientId: string;
    if (sessionUserId) {
      const client = await repo.findClientByUserId(sessionUserId);
      if (!client) throw new ClientProfileMissingError();
      clientId = client.id;
    } else {
      const client = await repo.findClientById(input.clientId);
      if (!client) throw new ClientNotFoundError();
      if (client.phone !== input.phone && client.whatsapp !== input.phone) throw new PhoneMismatchError();
      clientId = client.id;
    }

    const appointmentService = new AppointmentService();
    const appointment = await appointmentService.create(
      {
        clientId,
        barberId: input.barberId,
        appointmentDate: input.appointmentDate,
        startTime: input.startTime,
        serviceIds: input.serviceIds,
        notes: input.notes,
      },
      sessionUserId ?? undefined,
    );

    // Confirmação automática por WhatsApp exige uma sessão (é atribuída a um
    // usuário no histórico) — só é possível para quem criou conta na
    // identificação. Sem conta, o cliente vê a confirmação só na tela final.
    if (sessionUserId) {
      await autoSendAppointmentConfirmationAction({ appointmentId: appointment.id }).catch(() => undefined);
    }

    return { appointmentId: appointment.id };
  }
}

export { AppointmentConflictError };
