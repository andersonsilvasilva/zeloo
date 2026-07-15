export interface GeneralSettings {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  timezone: string;
  instagram: string;
  facebook: string;
  socialBio: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
}

export interface MercadoPagoSettings {
  /** Nunca o valor puro — só uma versão mascarada (ex: "••••3538374516") pra exibição. */
  accessTokenMasked: string | null;
  webhookSecretMasked: string | null;
  configured: boolean;
}
