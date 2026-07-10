import type { Metadata } from "next";
import "@/styles/globals.css";

const siteUrl = process.env.AUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Barbershop SaaS",
  description: "Sistema completo de gestão para barbearias — agendamento, financeiro, clientes e muito mais.",
  openGraph: {
    title: "Barbershop SaaS",
    description: "Sistema completo de gestão para barbearias — agendamento, financeiro, clientes e muito mais.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Barbershop SaaS",
    description: "Sistema completo de gestão para barbearias — agendamento, financeiro, clientes e muito mais.",
  },
};

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