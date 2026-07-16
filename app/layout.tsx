import type { Metadata } from "next";
import "@/styles/globals.css";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { DEFAULT_SOCIAL_BIO } from "@/modules/settings/schemas/settings.schema";

const siteUrl = process.env.AUTH_URL ?? "http://localhost:3000";

/**
 * Fallback usado quando não há tenant resolvido no contexto (ex.: geração
 * estática do build, como `_not-found` — não é uma requisição real, não tem
 * hostname pra resolver tenant nenhum). `getGeneralSettingsAction()` lança
 * `MissingTenantContextError` nesse caso, de propósito (Fase 4 — deny by
 * default), então metadata cai pra um valor genérico em vez de quebrar
 * o build inteiro.
 */
async function getSettingsOrFallback() {
  try {
    return await getGeneralSettingsAction();
  } catch {
    return { name: "", socialBio: "", faviconUrl: null, ogImageUrl: null };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettingsOrFallback();
  const title = settings.name || "Zeloo";
  const description = settings.socialBio || DEFAULT_SOCIAL_BIO;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      images: settings.ogImageUrl ? [settings.ogImageUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: settings.ogImageUrl ? [settings.ogImageUrl] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}