export interface PublicProfessionalOption {
  id: string;
  fullName: string;
  professionalName: string;
  bio: string | null;
  photoUrl: string | null;
}

export interface PublicProfessionalProfile extends PublicProfessionalOption {
  services: PublicServiceOption[];
}

export interface PublicServiceOption {
  id: string;
  name: string;
  shortDescription: string | null;
  price: number;
  durationMinutes: number;
  category: string | null;
  imageUrl: string | null;
}

export interface IdentifyClientResult {
  clientId: string;
  hasAccount: boolean;
}

export interface PublicAppointmentSummary {
  id: string;
  professionalName: string;
  clientName: string;
  servicesLabel: string;
  totalPrice: number;
  appointmentDate: Date;
  startTime: Date;
}
