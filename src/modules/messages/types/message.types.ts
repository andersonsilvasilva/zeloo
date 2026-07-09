import type {
  messageChannelValues,
  messageStatusValues,
  templateStatusValues,
} from "@/modules/messages/schemas/message.schema";

export type MessageChannel = (typeof messageChannelValues)[number];
export type MessageStatus = (typeof messageStatusValues)[number];
export type TemplateStatus = (typeof templateStatusValues)[number];

export interface MessageTemplateItem {
  id: string;
  name: string;
  channel: MessageChannel;
  content: string;
  status: TemplateStatus;
}

export interface MessageLogItem {
  id: string;
  client: { id: string; name: string };
  template: { id: string; name: string } | null;
  channel: MessageChannel;
  content: string;
  status: MessageStatus;
  sentBy: { id: string; name: string } | null;
  createdAt: Date;
}

export interface MessageClientOption {
  id: string;
  name: string;
  phone: string | null;
}

export interface MessageFormOptions {
  clients: MessageClientOption[];
  templates: MessageTemplateItem[];
}

export interface MessageAppointmentOption {
  id: string;
  startTime: Date;
  barberName: string;
  servicesLabel: string;
  totalPrice: number;
}
