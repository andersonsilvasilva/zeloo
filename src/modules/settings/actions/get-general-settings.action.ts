"use server";

import { SettingsService } from "@/modules/settings/services/settings.service";

/**
 * Leitura pública (sem exigir sessão) — nome e logomarca da barbearia não são
 * dados sensíveis, e precisam aparecer tanto no layout autenticado quanto na
 * tela de login (antes de qualquer sessão existir).
 */
export async function getGeneralSettingsAction() {
  const service = new SettingsService();
  return service.getGeneralSettings();
}
