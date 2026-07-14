import type { Metadata } from "next";
import "@/styles/globals.css";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { DEFAULT_SOCIAL_BIO } from "@/modules/settings/schemas/settings.schema";

const siteUrl = process.env.AUTH_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGeneralSettingsAction();
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