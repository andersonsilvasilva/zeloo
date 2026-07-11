import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";

/**
 * Instância "edge-safe" separada do NextAuth apenas para o middleware
 * (Edge Runtime), que só precisa ler o JWT de sessão — sem tocar em
 * Prisma/bcrypt (ver auth.config.ts). A autorização real por permissão
 * continua sendo feita nas Server Actions via rbac.ts.
 */
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/agendar"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!req.auth && !isPublicPath) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Só em navegação real (GET) — se aplicasse a POSTs, interceptaria a
  // própria Server Action de login (loginAction, que faz POST em /login).
  // O Next.js em modo standalone trata redirect de middleware sobre uma
  // Server Action tentando um self-fetch interno (http://0.0.0.0:<porta>)
  // que essa hospedagem (Passenger) não expõe — trava com
  // "failed to forward action response" / ECONNREFUSED, travando o login.
  if (req.auth && pathname === "/login" && req.method === "GET") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  // Ícones/imagens de compartilhamento (favicon, apple-icon, OG/Twitter image)
  // precisam ficar fora da autenticação — robôs de preview do WhatsApp/redes
  // sociais não têm sessão e não conseguiriam buscá-los.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|twitter-image.png|uploads).*)",
  ],
};
