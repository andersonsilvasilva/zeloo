import { getStorageProvider } from "@/lib/storage";
import { ClientRepository, type ClientWithRelations } from "@/modules/clients/repositories/client.repository";
import type {
  CreateClientInput,
  UpdateClientInput,
  ListClientsInput,
} from "@/modules/clients/schemas/client.schema";
import type { ClientDetail, ClientFormOptions, ClientListItem } from "@/modules/clients/types/client.types";

export class ClientNotFoundError extends Error {
  constructor() {
    super("Cliente não encontrado.");
    this.name = "ClientNotFoundError";
  }
}

export class ClientHasAppointmentsError extends Error {
  constructor() {
    super("Este cliente possui agendamentos no histórico e não pode ser excluído. Marque-o como inativo.");
    this.name = "ClientHasAppointmentsError";
  }
}

export interface PhotoFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export class ClientService {
  /** Retorna já com birthDate/notes (ClientDetail) para permitir editar direto a partir da listagem, sem round-trip extra. */
  async list(filters: ListClientsInput): Promise<ClientDetail[]> {
    const repo = new ClientRepository();
    const clients = await repo.list(filters);
    return clients.map((c) => this.toDetail(c));
  }

  async getById(id: string): Promise<ClientDetail> {
    const repo = new ClientRepository();
    const client = await repo.findById(id);
    if (!client) throw new ClientNotFoundError();
    return this.toDetail(client);
  }

  async create(input: CreateClientInput): Promise<ClientListItem> {
    const repo = new ClientRepository();
    const client = await repo.create({
      name: input.name,
      phone: input.phone || null,
      whatsapp: input.whatsapp || null,
      email: input.email || null,
      birthDate: input.birthDate ?? null,
      notes: input.notes || null,
      status: input.status,
      preferredBarber: input.preferredBarberId ? { connect: { id: input.preferredBarberId } } : undefined,
    });
    return this.toListItem(client);
  }

  async update(input: UpdateClientInput): Promise<ClientListItem> {
    const repo = new ClientRepository();
    const existing = await repo.findById(input.id);
    if (!existing) throw new ClientNotFoundError();

    const client = await repo.update(input.id, {
      name: input.name,
      phone: input.phone || null,
      whatsapp: input.whatsapp || null,
      email: input.email || null,
      birthDate: input.birthDate ?? null,
      notes: input.notes || null,
      status: input.status,
      preferredBarber: input.preferredBarberId
        ? { connect: { id: input.preferredBarberId } }
        : { disconnect: true },
    });
    return this.toListItem(client);
  }

  async delete(id: string): Promise<void> {
    const repo = new ClientRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new ClientNotFoundError();

    const appointmentsCount = await repo.countAppointments(id);
    if (appointmentsCount > 0) throw new ClientHasAppointmentsError();

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
    const repo = new ClientRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new ClientNotFoundError();

    const storage = getStorageProvider();
    const uploaded = await storage.upload({ ...file, folder: "clients" });

    const media = await repo.createMedia({
      fileName: uploaded.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: uploaded.fileSize,
      storageProvider: process.env.STORAGE_PROVIDER ?? "local",
      storagePath: uploaded.storagePath,
      mediaType: "CLIENT_PROFILE",
      width: uploaded.width,
      height: uploaded.height,
    });

    await repo.update(id, { profileImage: { connect: { id: media.id } } });

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
    const repo = new ClientRepository();
    const existing = await repo.findById(id);
    if (!existing) throw new ClientNotFoundError();
    if (!existing.profileImageId) return;

    const storage = getStorageProvider();
    const media = await repo.findMediaById(existing.profileImageId);
    if (media) {
      await storage.delete(media.storagePath).catch(() => undefined);
      await repo.deleteMedia(existing.profileImageId);
    }
    await repo.update(id, { profileImage: { disconnect: true } });
  }

  async getFormOptions(): Promise<ClientFormOptions> {
    const repo = new ClientRepository();
    const barbers = await repo.listActiveBarbersForSelect();
    return { barbers };
  }

  private toListItem(client: ClientWithRelations): ClientListItem {
    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      whatsapp: client.whatsapp,
      email: client.email,
      status: client.status,
      preferredBarber: client.preferredBarber,
      totalSpent: client.totalSpent.toNumber(),
      lastAppointmentAt: client.lastAppointmentAt,
      photoUrl: client.profileImage ? getStorageProvider().getUrl(client.profileImage.storagePath) : null,
    };
  }

  private toDetail(client: ClientWithRelations): ClientDetail {
    return { ...this.toListItem(client), birthDate: client.birthDate, notes: client.notes };
  }
}
