import type { professionalStatusValues, WorkingHoursInput } from "@/modules/professionals/schemas/professional.schema";

export type ProfessionalStatus = (typeof professionalStatusValues)[number];

export interface ProfessionalServiceOption {
  id: string;
  name: string;
}

export interface ProfessionalListItem {
  id: string;
  fullName: string;
  professionalName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: ProfessionalStatus;
  commissionPercentage: number;
  photoUrl: string | null;
  serviceIds: string[];
}

export interface ProfessionalDetail extends ProfessionalListItem {
  bio: string | null;
  specialties: string | null;
  hiredAt: Date | null;
  workingHours: WorkingHoursInput;
}

export interface ProfessionalFormOptions {
  services: ProfessionalServiceOption[];
}
