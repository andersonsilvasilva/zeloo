import type { appointmentStatusValues } from "@/modules/appointments/schemas/appointment.schema";

export type AppointmentStatus = (typeof appointmentStatusValues)[number];

export interface ServiceOption {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface BarberOption {
  id: string;
  professionalName: string;
  /** ids dos serviços que este barbeiro atende — usado para filtrar o select no formulário. */
  serviceIds: string[];
}

export interface ClientOption {
  id: string;
  name: string;
  phone: string | null;
}

export interface AppointmentFormOptions {
  services: ServiceOption[];
  barbers: BarberOption[];
  clients: ClientOption[];
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface AppointmentListItem {
  id: string;
  appointmentDate: Date;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  notes: string | null;
  client: { id: string; name: string };
  barber: { id: string; professionalName: string };
  services: { id: string; name: string }[];
  totalPrice: number;
  totalDurationMinutes: number;
}

export interface AppointmentDetail extends AppointmentListItem {
  createdBy: { id: string; name: string } | null;
}
