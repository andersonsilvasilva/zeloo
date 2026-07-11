/**
 * Sem lógica de redirecionamento aqui — de propósito.
 *
 * `NextResponse.redirect()` dentro do middleware, nesta hospedagem
 * (Next.js standalone via Passenger), aciona um bug conhecido do Next.js:
 * ao montar a resposta de redirecionamento, o servidor tenta um self-fetch
 * interno em `http://0.0.0.0:<porta>` para resolvê-la — endereço que o
 * Passenger não expõe. Trava com "failed to get redirect response" /
 * ECONNREFUSED (visto em produção em 2026-07-10, derrubando login e outras
 * Server Actions). Isso acontecia tanto em GET quanto em POST (inclusive
 * interceptando a própria Server Action de login).
 *
 * O controle de acesso por autenticação já é feito via `redirect()` do
 * next/navigation (mecanismo diferente, sem esse problema) em
 * `app/(app)/layout.tsx` para as rotas protegidas. `/login` e `/agendar`
 * são públicas por natureza — não precisam de guarda alguma aqui.
 */
export const config = {
  matcher: [],
};
