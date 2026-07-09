"use server";

import { z } from "zod";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { MessageService } from "@/modules/messages/services/message.service";

const listClientAppointmentsSchema = z.object({ clientId: z.string().cuid() });

/** Usado no diálogo de envio para popular o select de "agendamento" ao trocar o cliente. */
export async function listClientAppointmentsAction(rawInput: { clientId: string }) {
  await requireUserId();
  await requirePermission(PERMISSIONS.messages.send);

  const { clientId } = listClientAppointmentsSchema.parse(rawInput);

  const service = new MessageService();
  return service.getClientAppointments(clientId);
}
