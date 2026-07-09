import type { barberStatusValues, WorkingHoursInput } from "@/modules/barbers/schemas/barber.schema";

export type BarberStatus = (typeof barberStatusValues)[number];

export interface BarberServiceOption {
  id: string;
  name: string;
}

export interface BarberListItem {
  id: string;
  fullName: string;
  professionalName: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: BarberStatus;
  commissionPercentage: number;
  photoUrl: string | null;
  serviceIds: string[];
}

export interface BarberDetail extends BarberListItem {
  bio: string | null;
  specialties: string | null;
  hiredAt: Date | null;
  workingHours: WorkingHoursInput;
}

export interface BarberFormOptions {
  services: BarberServiceOption[];
}
