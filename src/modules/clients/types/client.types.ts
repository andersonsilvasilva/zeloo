import type { clientStatusValues } from "@/modules/clients/schemas/client.schema";

export type ClientStatus = (typeof clientStatusValues)[number];

export interface ClientBarberOption {
  id: string;
  professionalName: string;
}

export interface ClientListItem {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: ClientStatus;
  preferredBarber: ClientBarberOption | null;
  totalSpent: number;
  lastAppointmentAt: Date | null;
  photoUrl: string | null;
}

export interface ClientDetail extends ClientListItem {
  birthDate: Date | null;
  notes: string | null;
}

export interface ClientFormOptions {
  barbers: ClientBarberOption[];
}

export interface BirthdayClient {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  birthDate: Date;
  /** Idade que o cliente completa nessa ocorrência do aniversário. */
  turningAge: number;
}

export interface ClientBirthdays {
  today: BirthdayClient[];
  thisWeek: BirthdayClient[];
  thisMonth: BirthdayClient[];
}
