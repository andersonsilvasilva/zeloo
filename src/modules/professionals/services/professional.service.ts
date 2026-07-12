import { getStorageProvider } from "@/lib/storage";
import { ProfessionalRepository, type ProfessionalWithRelations } from "@/modules/professionals/repositories/professional.repository";
import type {
  CreateProfessionalInput,
  UpdateProfessionalInput,
  ListProfessionalsInput,
} from "@/modules/professionals/schemas/professional.schema";
import type { ProfessionalDetail, ProfessionalFormOptions, ProfessionalListItem } from "@/modules/professionals/types/professional.types";

export class ProfessionalNotFoundError extends Error {
  constructor() {
    super("Profissional não encontrado.");
    this.name = "ProfessionalNotFoundError";
  }
}

export class ProfessionalHasAppointmentsError extends Error {
  constructor() {
    super("Este profissional possui agendamentos no histórico e não pode ser excluído. Marque-o como inativo.");
    this.name = "ProfessionalHasAppointmentsError";
  }
}

export interface PhotoFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export class ProfessionalService {
  async list(filters: ListProfessionalsInput): Promise<ProfessionalDetail[]> {
    const repo = new ProfessionalRepository();
    const professionals = await repo.list(filters);
    return professionals.map((b) => this.toDetail(b));
  }

  async getById(id: string): Promise<ProfessionalDetail> {
    const repo = new ProfessionalRepository();
    const professional = await repo.findById(id);
    if (!professional) throw new ProfessionalNotFoundError();
    return this.toDetail(professional);
  }

  async create(input: CreateProfessionalInput): Promise<ProfessionalDetail> {
    const repo = new ProfessionalRepository();
    const professional = await repo.create(
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
    return this.toDetail(professional);
  }

  async update(input: UpdateProfessionalInput): Promise<ProfessionalDetail> {
    const repo = new ProfessionalRepository();
    const existing = await repo.findById(input.id);
    if (!existing) throw new ProfessionalNotFoundError();

    const professional = await repo.update(
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
    return this.toDetail(professional);
  }

  async delete(id: string): Promise<void> {
    const repo = new ProfessionalRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new ProfessionalNotFoundError();

    const appointmentsCount = await repo.countAppointments(id);
    if (appointmentsCount > 0) throw new ProfessionalHasAppointmentsError();

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
    const repo = new ProfessionalRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new ProfessionalNotFoundError();

    const storage = getStorageProvider();
    const uploaded = await storage.upload({ ...file, folder: "professionals" });

    const media = await repo.createMedia({
      fileName: uploaded.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: uploaded.fileSize,
      storageProvider: process.env.STORAGE_PROVIDER ?? "local",
      storagePath: uploaded.storagePath,
      mediaType: "PROFESSIONAL_PROFILE",
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
    const repo = new ProfessionalRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new ProfessionalNotFoundError();
    if (!existing.profileImageId) return;

    const storage = getStorageProvider();
    const media = await repo.findMediaById(existing.profileImageId);
    if (media) {
      await storage.delete(media.storagePath).catch(() => undefined);
      await repo.deleteMedia(existing.profileImageId);
    }
    await repo.setProfileImage(id, null);
  }

  async getFormOptions(): Promise<ProfessionalFormOptions> {
    const repo = new ProfessionalRepository();
    const services = await repo.listActiveServicesForSelect();
    return { services };
  }

  private toDetail(professional: ProfessionalWithRelations): ProfessionalDetail {
    const workingHours = (professional.workingHours as ProfessionalDetail["workingHours"] | null) ?? {
      seg: [],
      ter: [],
      qua: [],
      qui: [],
      sex: [],
      sab: [],
      dom: [],
    };

    return {
      id: professional.id,
      fullName: professional.fullName,
      professionalName: professional.professionalName,
      phone: professional.phone,
      whatsapp: professional.whatsapp,
      email: professional.email,
      status: professional.status,
      commissionPercentage: professional.commissionPercentage.toNumber(),
      photoUrl: professional.profileImage ? getStorageProvider().getUrl(professional.profileImage.storagePath) : null,
      serviceIds: professional.services.map((s) => s.serviceId),
      bio: professional.bio,
      specialties: professional.specialties,
      hiredAt: professional.hiredAt,
      workingHours,
    };
  }
}
