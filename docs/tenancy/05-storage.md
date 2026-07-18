# Fase 7 — Arquivos e armazenamento

> Depende de `docs/tenancy/00-audit.md` (achado: storage local sem prefixo de tenant, §6), `02b-query-isolation.md` (`Media` já era `HARD_TENANT_MODEL` desde a Fase 4 — as *linhas* no banco já estavam isoladas, só os *arquivos em disco* não).

## 1. O que foi feito

- `src/lib/storage/local-storage-provider.ts` — `upload()` agora resolve o tenant atual (`getCurrentTenant()`, mesmo padrão da extensão do Prisma) e grava em `public/uploads/tenants/{tenantId}/<folder>/...` em vez de `public/uploads/<folder>/...` direto. Sem tenant no contexto, lança `StorageMissingTenantContextError` — mesmo espírito deny-by-default da Fase 4, agora também pro storage.
- `getUrl()`/`delete()`/`replace()` não precisaram mudar — já operam sobre o `storagePath` completo (que agora já vem com o prefixo), sem hardcode de estrutura de pasta.
- `prisma/tenancy-storage-migrate.ts` — script idempotente (`--dry-run`/`--apply`, spec §40) que move os arquivos já existentes pra estrutura nova e atualiza `Media.storagePath` no banco.

## 2. Por que só o `LocalStorageProvider` mudou

Nenhum service de domínio (`professional.service.ts`, `client.service.ts`, `service.service.ts`, `settings.service.ts`) precisou de alteração — todos já chamam `storage.upload({ ..., folder: "..." })` através da interface `StorageProvider`, sem saber de tenant. Resolver o tenant *dentro* do provider (em vez de em cada chamador) mantém a mesma vantagem já observada na Fase 4 com a extensão do Prisma: um ponto de mudança em vez de N.

## 3. Migração de arquivos existentes (spec §40)

Segurança implementada:
- **Nunca apaga a origem antes de confirmar o destino.** Copia cada variante (thumb/medium/large), calcula SHA-256 dos dois lados, só apaga a origem e atualiza o banco se os três hashes baterem.
- **Idempotente**: uma linha de `Media` cujo `storagePath` já começa com `tenants/` é pulada (`skipped_already_migrated`).
- **Falha isolada por linha**: se uma variante estiver ausente no disco ou o checksum não bater, só aquela linha falha (reportada com o motivo) — as outras continuam normalmente, nada é revertido.
- **Relatório completo**: origem, destino, status (`migrated` / `skipped_already_migrated` / `would_migrate` / `failed_missing_source` / `failed_checksum_mismatch`) e contagem por status ao final.

## 4. Execução local (resultado real)

`barbershop_staging` tinha 15 registros em `Media`. Resultado do `--apply`:

| Status | Quantidade |
|---|---:|
| `migrated` | 10 |
| `failed_missing_source` | 5 |

As 5 falhas são **arquivos que já estavam ausentes no disco local antes desta migração** (resíduo de testes/seeds antigos desta sessão de dev, não algo causado pelo script) — confirmado comparando com o `--dry-run` anterior, que já sinalizava exatamente essas 5 linhas como `failed_missing_source` antes de qualquer escrita acontecer. Nenhum arquivo parcial ficou no destino novo pra essas linhas (a checagem de existência da variante "thumb" acontece antes de copiar qualquer coisa). Re-executar `--apply` depois confirmou idempotência: as 10 linhas migradas foram puladas (`skipped_already_migrated`), as 5 continuaram falhando pelo mesmo motivo, sem duplicar nem corromper nada.

## 5. Teste de upload novo (ponta a ponta)

Upload de um novo logo via Configurações (autenticado como `admin@barbershop.local`, tenant `zeloo`) — arquivo final salvo em `/uploads/tenants/cmrnx6tjq0001iw0gyl4gwsuc/logo/<nome-aleatório>-large.webp`, exibido corretamente na tela imediatamente depois. Confirma que o provider resolve o tenant certo em uso real da aplicação, não só em teste isolado.

## 6. O que NÃO foi feito nesta fase (de propósito)

- **Downloads autenticados / URL assinada (spec §39)**: hoje, tanto antes quanto depois desta fase, qualquer arquivo em `public/uploads/` é servido **direto pelo Nginx** em produção, sem passar pela aplicação — decisão já tomada antes da era multi-tenant (contorna uma limitação do Next.js standalone documentada em `project-vps-zeloo`, ver memória do projeto). Isso significa que o prefixo por tenant deste storage é **segmentação, não controle de acesso**: alguém que adivinhasse a URL completa (cuid do tenant + nome aleatório do arquivo) ainda conseguiria acessar o arquivo sem autenticação, exatamente como já acontecia antes (só com nome de arquivo aleatório, sem o tenant). Implementar de verdade o §39 (resposta autenticada ou URL assinada de curta duração) exigeria mudar esse modelo de serving — Nginx deixaria de servir `/uploads/` direto, e a aplicação passaria a intermediar cada download com uma checagem de sessão/membership. É uma mudança de infraestrutura de produção, fora do escopo desta fase (que ficou só local). Registrado como risco conhecido, não como esquecido.
- **S3/R2/Supabase**: os providers alternativos continuam só documentados/planejados (`storage-provider.ts`), não implementados — quando existirem, precisam aplicar o mesmo prefixo por tenant na *key* do objeto, não numa pasta física.
- **Produção não foi tocada** — nem o código (não deployado), nem os arquivos reais (a migração rodou só contra o `public/uploads` local).

## 7. Critério de conclusão

Uploads novos já saem isolados por tenant, arquivos existentes têm script de migração testado e seguro (idempotente, sem perda, com relatório), e o modelo de dados (`Media.tenantId`, Fase 4) já garantia isolamento a nível de banco desde antes. A lacuna de controle de acesso a nível de arquivo (§39) é uma decisão de infraestrutura maior, documentada e não escondida.
