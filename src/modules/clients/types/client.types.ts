import type { clientStatusValues } from "@/modules/clients/schemas/client.schema";

export type ClientStatus = (typeof clientStatusValues)[number];

export interface ClientProfessionalOption {
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
  preferredProfessional: ClientProfessionalOption | null;
  totalSpent: number;
  lastAppointmentAt: Date | null;
  photoUrl: string | null;
}

export interface ClientDetail extends ClientListItem {
  birthDate: Date | null;
  notes: string | null;
}

export interface ClientFormOptions {
  professionals: ClientProfessionalOption[];
}

export interface BirthdayClient {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  birthDate: Date;
  /** Idade que o cliente completa nessa ocorrência do aniversário. */
  turningAge: number;
  /** Dia/mês formatado ("dd/MM") a partir dos componentes UTC de birthDate — ver nota em client.service.ts. */
  birthdayLabel: string;
}

export interface ClientBirthdays {
  today: BirthdayClient[];
  thisWeek: BirthdayClient[];
  thisMonth: BirthdayClient[];
}
