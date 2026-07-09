import { getStorageProvider } from "@/lib/storage";
import { BarberRepository, type BarberWithRelations } from "@/modules/barbers/repositories/barber.repository";
import type {
  CreateBarberInput,
  UpdateBarberInput,
  ListBarbersInput,
} from "@/modules/barbers/schemas/barber.schema";
import type { BarberDetail, BarberFormOptions, BarberListItem } from "@/modules/barbers/types/barber.types";

export class BarberNotFoundError extends Error {
  constructor() {
    super("Barbeiro não encontrado.");
    this.name = "BarberNotFoundError";
  }
}

export class BarberHasAppointmentsError extends Error {
  constructor() {
    super("Este barbeiro possui agendamentos no histórico e não pode ser excluído. Marque-o como inativo.");
    this.name = "BarberHasAppointmentsError";
  }
}

export interface PhotoFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export class BarberService {
  async list(filters: ListBarbersInput): Promise<BarberDetail[]> {
    const repo = new BarberRepository();
    const barbers = await repo.list(filters);
    return barbers.map((b) => this.toDetail(b));
  }

  async getById(id: string): Promise<BarberDetail> {
    const repo = new BarberRepository();
    const barber = await repo.findById(id);
    if (!barber) throw new BarberNotFoundError();
    return this.toDetail(barber);
  }

  async create(input: CreateBarberInput): Promise<BarberDetail> {
    const repo = new BarberRepository();
    const barber = await repo.create(
      {
        fullName: input.fullName,
        professionalName: input.professionalName,
        bio: input.bio || null,
        specialties: input.specialties || null,
        phone: input.phone || null,
        whatsapp: input.whatsapp || null,
        email: input.email || null,
        hiredAt: input.hiredAt ?? null,
        status: input.status,
        commissionPercentage: input.commissionPercentage,
        workingHours: input.workingHours,
      },
      input.serviceIds,
    );
    return this.toDetail(barber);
  }

  async update(input: UpdateBarberInput): Promise<BarberDetail> {
    const repo = new BarberRepository();
    const existing = await repo.findById(input.id);
    if (!existing) throw new BarberNotFoundError();

    const barber = await repo.update(
      input.id,
      {
        fullName: input.fullName,
        professionalName: input.professionalName,
        bio: input.bio || null,
        specialties: input.specialties || null,
        phone: input.phone || null,
        whatsapp: input.whatsapp || null,
        email: input.email || null,
        hiredAt: input.hiredAt ?? null,
        status: input.status,
        commissionPercentage: input.commissionPercentage,
        workingHours: input.workingHours,
      },
      input.serviceIds,
    );
    return this.toDetail(barber);
  }

  async delete(id: string): Promise<void> {
    const repo = new BarberRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new BarberNotFoundError();

    const appointmentsCount = await repo.countAppointments(id);
    if (appointmentsCount > 0) throw new BarberHasAppointmentsError();

    if (existing.profileImageId) {
      const media = await repo.findMediaById(existing.profileImageId);
      if (media) {
        await getStorageProvider().delete(media.storagePath).catch(() => undefined);
        await repo.deleteMedia(existing.profileImageId);
      }
    }

    await repo.delete(id);
  }

  async updatePhoto(id: string, file: PhotoFileInput): Promise<string | null> {
    const repo = new BarberRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new BarberNotFoundError();

    const storage = getStorageProvider();
    const uploaded = await storage.upload({ ...file, folder: "barbers" });

    const media = await repo.createMedia({
      fileName: uploaded.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: uploaded.fileSize,
      storageProvider: process.env.STORAGE_PROVIDER ?? "local",
      storagePath: uploaded.storagePath,
      mediaType: "BARBER_PROFILE",
      width: uploaded.width,
      height: uploaded.height,
    });

    await repo.setProfileImage(id, media.id);

    if (existing.profileImageId) {
      const previousMedia = await repo.findMediaById(existing.profileImageId);
      if (previousMedia) {
        await storage.delete(previousMedia.storagePath).catch(() => undefined);
        await repo.deleteMedia(existing.profileImageId);
      }
    }

    return storage.getUrl(media.storagePath);
  }

  async removePhoto(id: string): Promise<void> {
    const repo = new BarberRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new BarberNotFoundError();
    if (!existing.profileImageId) return;

    const storage = getStorageProvider();
    const media = await repo.findMediaById(existing.profileImageId);
    if (media) {
      await storage.delete(media.storagePath).catch(() => undefined);
      await repo.deleteMedia(existing.profileImageId);
    }
    await repo.setProfileImage(id, null);
  }

  async getFormOptions(): Promise<BarberFormOptions> {
    const repo = new BarberRepository();
    const services = await repo.listActiveServicesForSelect();
    return { services };
  }

  private toDetail(barber: BarberWithRelations): BarberDetail {
    const workingHours = (barber.workingHours as BarberDetail["workingHours"] | null) ?? {
      seg: [],
      ter: [],
      qua: [],
      qui: [],
      sex: [],
      sab: [],
      dom: [],
    };

    return {
      id: barber.id,
      fullName: barber.fullName,
      professionalName: barber.professionalName,
      phone: barber.phone,
      whatsapp: barber.whatsapp,
      email: barber.email,
      status: barber.status,
      commissionPercentage: barber.commissionPercentage.toNumber(),
      photoUrl: barber.profileImage ? getStorageProvider().getUrl(barber.profileImage.storagePath) : null,
      serviceIds: barber.services.map((s) => s.serviceId),
      bio: barber.bio,
      specialties: barber.specialties,
      hiredAt: barber.hiredAt,
      workingHours,
    };
  }
}
