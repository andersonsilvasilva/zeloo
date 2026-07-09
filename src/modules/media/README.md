# Módulo: media

Upload centralizado (Media model) usado por clients/barbers/services/settings.

## Estrutura
- components/   — UI específica do módulo (client components)
- actions/      — Server Actions (sessão + permissão + validação Zod + chama services)
- services/     — Regras de negócio
- repositories/ — Acesso ao Prisma/MySQL
- schemas/      — Zod schemas compartilhados (frontend + backend)
- types/        — Tipos TypeScript específicos do módulo
- permissions/  — Constantes de permissão específicas (se necessário)

## Regra
Componentes React NUNCA importam Prisma diretamente. Sempre: Component -> Action -> Service -> Repository.

## Status
Scaffold gerado. Implementação funcional (components/actions/services/repositories) pendente — próximo passo no Claude Code.
