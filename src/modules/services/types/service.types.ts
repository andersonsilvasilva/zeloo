import type { serviceStatusValues } from "@/modules/services/schemas/service.schema";

export type ServiceStatus = (typeof serviceStatusValues)[number];

export interface ServiceListItem {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  durationMinutes: number;
  category: string | null;
  status: ServiceStatus;
  photoUrl: string | null;
  professionalsCount: number;
  defaultMessageTemplateId: string | null;
  defaultMessageTemplateName: string | null;
}

export interface ServiceDetail extends ServiceListItem {
  description: string | null;
}

export interface ServiceMessageTemplateOption {
  id: string;
  name: string;
  channel: "WHATSAPP" | "SMS";
}

export interface ServiceFormOptions {
  messageTemplates: ServiceMessageTemplateOption[];
}
