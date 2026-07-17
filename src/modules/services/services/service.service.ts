import { getStorageProvider } from "@/lib/storage";
import { ServiceRepository, type ServiceWithRelations } from "@/modules/services/repositories/service.repository";
import type {
  CreateServiceInput,
  UpdateServiceInput,
  ListServicesInput,
} from "@/modules/services/schemas/service.schema";
import type { ServiceDetail, ServiceFormOptions, ServiceListItem } from "@/modules/services/types/service.types";

export class ServiceNotFoundError extends Error {
  constructor() {
    super("Serviço não encontrado.");
    this.name = "ServiceNotFoundError";
  }
}

export class ServiceInUseError extends Error {
  constructor() {
    super("Este serviço já foi usado em agendamentos e não pode ser excluído. Marque-o como inativo.");
    this.name = "ServiceInUseError";
  }
}

export interface PhotoFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export class ServiceService {
  /** Retorna já com description (ServiceDetail) para permitir editar direto a partir da listagem. */
  async list(filters: ListServicesInput): Promise<ServiceDetail[]> {
    const repo = new ServiceRepository();
    const services = await repo.list(filters);
    return services.map((s) => this.toDetail(s));
  }

  async getById(id: string): Promise<ServiceDetail> {
    const repo = new ServiceRepository();
    const service = await repo.findById(id);
    if (!service) throw new ServiceNotFoundError();
    return this.toDetail(service);
  }

  async create(input: CreateServiceInput): Promise<ServiceDetail> {
    const repo = new ServiceRepository();
    const slug = await this.generateUniqueSlug(repo, input.name);

    const service = await repo.create({
      name: input.name,
      slug,
      shortDescription: input.shortDescription || null,
      description: input.description || null,
      price: input.price,
      durationMinutes: input.durationMinutes,
      category: input.category || null,
      status: input.status,
      // FK escalar, não `{ connect }` — a extensão de isolamento injeta
      // `tenantId` como escalar em todo create(); misturar um `connect` de
      // relação no mesmo `data` faz o Prisma rejeitar esse `tenantId` como
      // argumento desconhecido (achado real na Fase 14, ver tenant-extension.ts).
      defaultMessageTemplateId: input.defaultMessageTemplateId || null,
    });
    return this.toDetail(service);
  }

  async update(input: UpdateServiceInput): Promise<ServiceDetail> {
    const repo = new ServiceRepository();
    const existing = await repo.findById(input.id);
    if (!existing) throw new ServiceNotFoundError();

    const slug = existing.name === input.name ? existing.slug : await this.generateUniqueSlug(repo, input.name, input.id);

    const service = await repo.update(input.id, {
      name: input.name,
      slug,
      shortDescription: input.shortDescription || null,
      description: input.description || null,
      price: input.price,
      durationMinutes: input.durationMinutes,
      category: input.category || null,
      status: input.status,
      defaultMessageTemplate: input.defaultMessageTemplateId
        ? { connect: { id: input.defaultMessageTemplateId } }
        : { disconnect: true },
    });
    return this.toDetail(service);
  }

  async delete(id: string): Promise<void> {
    const repo = new ServiceRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new ServiceNotFoundError();

    const usageCount = await repo.countAppointmentUsage(id);
    if (usageCount > 0) throw new ServiceInUseError();

    if (existing.advertisingImageId) {
      const media = await repo.findMediaById(existing.advertisingImageId);
      if (media) {
        await getStorageProvider().delete(media.storagePath).catch(() => undefined);
        await repo.deleteMedia(existing.advertisingImageId);
      }
    }

    await repo.delete(id);
  }

  async updatePhoto(id: string, file: PhotoFileInput): Promise<string | null> {
    const repo = new ServiceRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new ServiceNotFoundError();

    const storage = getStorageProvider();
    const uploaded = await storage.upload({ ...file, folder: "services" });

    const media = await repo.createMedia({
      fileName: uploaded.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: uploaded.fileSize,
      storageProvider: process.env.STORAGE_PROVIDER ?? "local",
      storagePath: uploaded.storagePath,
      mediaType: "SERVICE_ADVERTISING",
      width: uploaded.width,
      height: uploaded.height,
    });

    await repo.setAdvertisingImage(id, media.id);

    if (existing.advertisingImageId) {
      const previousMedia = await repo.findMediaById(existing.advertisingImageId);
      if (previousMedia) {
        await storage.delete(previousMedia.storagePath).catch(() => undefined);
        await repo.deleteMedia(existing.advertisingImageId);
      }
    }

    return storage.getUrl(media.storagePath);
  }

  async removePhoto(id: string): Promise<void> {
    const repo = new ServiceRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new ServiceNotFoundError();
    if (!existing.advertisingImageId) return;

    const storage = getStorageProvider();
    const media = await repo.findMediaById(existing.advertisingImageId);
    if (media) {
      await storage.delete(media.storagePath).catch(() => undefined);
      await repo.deleteMedia(existing.advertisingImageId);
    }
    await repo.setAdvertisingImage(id, null);
  }

  async getFormOptions(): Promise<ServiceFormOptions> {
    const repo = new ServiceRepository();
    const messageTemplates = await repo.listActiveMessageTemplatesForSelect();
    return { messageTemplates };
  }

  /** Gera um slug único a partir do nome, evitando colidir com outro serviço (exceto ele mesmo, em updates). */
  private async generateUniqueSlug(repo: ServiceRepository, name: string, excludeId?: string): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let candidate = base || "servico";
    let suffix = 1;
    while (true) {
      const existing = await repo.findBySlug(candidate);
      if (!existing || existing.id === excludeId) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
  }

  private toListItem(service: ServiceWithRelations): ServiceListItem {
    return {
      id: service.id,
      name: service.name,
      slug: service.slug,
      shortDescription: service.shortDescription,
      price: service.price.toNumber(),
      durationMinutes: service.durationMinutes,
      category: service.category,
      status: service.status,
      photoUrl: service.advertisingImage
        ? getStorageProvider().getUrl(service.advertisingImage.storagePath)
        : null,
      professionalsCount: service._count.professionals,
      defaultMessageTemplateId: service.defaultMessageTemplate?.id ?? null,
      defaultMessageTemplateName: service.defaultMessageTemplate?.name ?? null,
    };
  }

  private toDetail(service: ServiceWithRelations): ServiceDetail {
    return { ...this.toListItem(service), description: service.description };
  }
}
