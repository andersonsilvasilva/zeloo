import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Testes e2e de isolamento multi-tenant (spec §51). Rodam contra o dev
 * server real, usando os hosts de tenant já mapeados em
 * `C:\Windows\System32\drivers\etc\hosts` (127.0.0.1 zeloo.net / flora.zeloo.net
 * / diagro.zeloo.net) e reforçados via `--host-resolver-rules` no chromium
 * (playwright.config.ts) — dispensa o hosts file pros testes que só usam
 * `request` (Node), mas o browser precisa de um dos dois.
 *
 * Tenants fixos do banco local (não existem em produção, ver
 * docs/tenancy/*.md e memória do projeto):
 * - zeloo (root, ACTIVE) — admin@barbershop.local / Admin@123, tem
 *   `barbershop.name = "Zeloo.net"` configurado.
 * - flora (ACTIVE) — dona.flora@teste.local / FloraTeste@123, cliente fixo
 *   "Cliente Secreto da Flora" (id test-flora-client-001), sem settings
 *   próprias (branding cai no fallback genérico).
 * - diagro (TRIAL) — dona.diagro@teste.local / DiagroTeste@123, sem
 *   clientes, sem settings próprias.
 * - consultora.multitenant@teste.local / MultiTenant@123 — mesmo usuário
 *   (User.email é globalmente único), com membership ADMIN em flora E em
 *   diagro (spec §67, "usuário com múltiplos tenants opera em um tenant por
 *   vez") — nunca em produção, fixture criada na Fase 14.
 */

const ROOT = "http://zeloo.net:3000";
const FLORA = "http://flora.zeloo.net:3000";
const DIAGRO = "http://diagro.zeloo.net:3000";

async function tenantDebug(request: APIRequestContext, base: string, probeClientId?: string) {
  const url = probeClientId
    ? `${base}/api/tenant-debug?probeClientId=${probeClientId}`
    : `${base}/api/tenant-debug`;
  const res = await request.get(url);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test.describe("Resolução de tenant por hostname (spec §51/§53, via servidor real)", () => {
  test("domínio raiz resolve o tenant zeloo", async ({ request }) => {
    const body = await tenantDebug(request, ROOT);
    expect(body.context).toBe("root");
    expect(body.tenant.slug).toBe("zeloo");
  });

  test("subdomínio flora resolve o tenant flora", async ({ request }) => {
    const body = await tenantDebug(request, FLORA);
    expect(body.context).toBe("tenant");
    expect(body.slug).toBe("flora");
    expect(body.tenant.slug).toBe("flora");
  });

  test("subdomínio diagro resolve o tenant diagro (TRIAL)", async ({ request }) => {
    const body = await tenantDebug(request, DIAGRO);
    expect(body.context).toBe("tenant");
    expect(body.tenant.slug).toBe("diagro");
    expect(body.tenant.status).toBe("TRIAL");
  });
});

test.describe("Isolamento de dados entre tenants (spec §51)", () => {
  test("flora só enxerga os próprios clientes, nunca os de zeloo/diagro", async ({ request }) => {
    const body = await tenantDebug(request, FLORA);
    const names = body.clientsSample.map((c: { name: string }) => c.name);
    expect(names).toContain("Cliente Secreto da Flora");
    expect(names.every((n: string) => !n.startsWith("Cliente Audit Test"))).toBe(true);
    expect(names).not.toContain("Felipe Rocha Nunes");
  });

  test("diagro não enxerga o cliente da flora", async ({ request }) => {
    const body = await tenantDebug(request, DIAGRO);
    const names = body.clientsSample.map((c: { name: string }) => c.name);
    expect(names).not.toContain("Cliente Secreto da Flora");
  });

  test("IDOR: diagro não consegue ler nem escrever um cliente pelo ID direto da flora", async ({ request }) => {
    const body = await tenantDebug(request, DIAGRO, "test-flora-client-001");
    expect(body.probe).toEqual({ foundViaFindUnique: false, updateAffected: 0 });
  });

  test("controle: flora consegue ler o próprio cliente pelo ID direto", async ({ request }) => {
    const body = await tenantDebug(request, FLORA, "test-flora-client-001");
    expect(body.probe.foundViaFindUnique).toBe(true);
  });
});

test.describe("Isolamento de branding no /login (achado do bug reportado em produção local, 2026-07-17)", () => {
  test("zeloo (root) mostra o nome configurado (\"Zeloo.net\")", async ({ page }) => {
    await page.goto(`${ROOT}/login`);
    await expect(page.locator("h1")).toHaveText("Zeloo.net");
  });

  // Não assume que flora/diagro estão "vazios" (sem settings próprias) —
  // são tenants de teste usados pra testar de verdade a própria interface
  // (inclusive upload de logo/favicon), então acumulam configuração real ao
  // longo do tempo. O que importa pro isolamento é nunca mostrar a marca do
  // ZELOO especificamente — cada um pode ter (ou não) a própria.
  test("flora NÃO mostra o branding de zeloo", async ({ page }) => {
    await page.goto(`${FLORA}/login`);
    await expect(page.locator("h1")).not.toHaveText("Zeloo.net");
    const logo = page.locator("img[alt='Logomarca da barbearia']");
    if (await logo.count()) {
      await expect(logo).not.toHaveAttribute("src", /tenants\/cmrnx6tjq0001iw0gyl4gwsuc\//);
    }
  });

  test("diagro NÃO mostra o branding de zeloo", async ({ page }) => {
    await page.goto(`${DIAGRO}/login`);
    await expect(page.locator("h1")).not.toHaveText("Zeloo.net");
    const logo = page.locator("img[alt='Logomarca da barbearia']");
    if (await logo.count()) {
      await expect(logo).not.toHaveAttribute("src", /tenants\/cmrnx6tjq0001iw0gyl4gwsuc\//);
    }
  });
});

test.describe("Isolamento de autenticação (spec §29/Fase 5)", () => {
  test("dona da flora não loga no host da diagro (sem membership)", async ({ page }) => {
    await page.goto(`${DIAGRO}/login`);
    await page.locator("#email").fill("dona.flora@teste.local");
    await page.locator("#password").fill("FloraTeste@123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText(/e-mail ou senha inv|credenciais inv/i)).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("dona da flora loga normalmente no próprio host e fica no mesmo subdomínio", async ({ page }) => {
    await page.goto(`${FLORA}/login`);
    await page.locator("#email").fill("dona.flora@teste.local");
    await page.locator("#password").fill("FloraTeste@123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => url.hostname === "flora.zeloo.net" && !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });
    expect(page.url()).toContain("flora.zeloo.net");
  });

  test("logout mantém o mesmo subdomínio (regressão do bug de redirect corrigido na Fase 5)", async ({ page }) => {
    await page.goto(`${FLORA}/login`);
    await page.locator("#email").fill("dona.flora@teste.local");
    await page.locator("#password").fill("FloraTeste@123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => url.hostname === "flora.zeloo.net" && !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /sair|logout/i }).click();
    await page.waitForURL((url) => url.hostname === "flora.zeloo.net" && url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });
    expect(new URL(page.url()).hostname).toBe("flora.zeloo.net");
  });
});

test.describe("Usuário com múltiplos tenants opera em um tenant por vez (spec §67, Fase 14)", () => {
  // Achado real durante essa verificação: UserRole tinha
  // @@unique([userId, roleId]) — de antes da Fase 3 acrescentar tenantId,
  // nunca revisado — impedia o MESMO usuário de ter o MESMO papel em dois
  // tenants diferentes. Corrigido pra @@unique([tenantId, userId, roleId])
  // na migration 20260717164314_fix_user_role_unique_per_tenant. Ver
  // docs/tenancy/13-acceptance-criteria.md.
  test("mesmo e-mail loga em flora E em diagro, cada sessão só enxerga o próprio tenant", async ({ browser }) => {
    const contextFlora = await browser.newContext();
    const pageFlora = await contextFlora.newPage();
    await pageFlora.goto(`${FLORA}/login`);
    await pageFlora.locator("#email").fill("consultora.multitenant@teste.local");
    await pageFlora.locator("#password").fill("MultiTenant@123");
    await pageFlora.getByRole("button", { name: "Entrar" }).click();
    await pageFlora.waitForURL((url) => url.hostname === "flora.zeloo.net" && !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });

    const contextDiagro = await browser.newContext();
    const pageDiagro = await contextDiagro.newPage();
    await pageDiagro.goto(`${DIAGRO}/login`);
    await pageDiagro.locator("#email").fill("consultora.multitenant@teste.local");
    await pageDiagro.locator("#password").fill("MultiTenant@123");
    await pageDiagro.getByRole("button", { name: "Entrar" }).click();
    await pageDiagro.waitForURL((url) => url.hostname === "diagro.zeloo.net" && !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });

    // As duas sessões (contextos de navegador separados, cookies host-only
    // diferentes) coexistem — uma não derruba nem contamina a outra.
    const [debugFlora, debugDiagro] = await Promise.all([
      pageFlora.request.get(`${FLORA}/api/tenant-debug`).then((r) => r.json()),
      pageDiagro.request.get(`${DIAGRO}/api/tenant-debug`).then((r) => r.json()),
    ]);
    expect(debugFlora.tenant.slug).toBe("flora");
    expect(debugDiagro.tenant.slug).toBe("diagro");

    await contextFlora.close();
    await contextDiagro.close();
  });
});

test.describe("Resposta controlada pra tenant inexistente/suspenso (spec §67, Fase 14)", () => {
  const NAOEXISTE = "http://naoexiste.zeloo.net:3000";
  const SUSPENSO = "http://suspenso.zeloo.net:3000";

  // Bug real encontrado na verificação da Fase 14: essas páginas liam
  // settings sem checar antes se o tenant existe — em produção, um
  // subdomínio de tenant inexistente caía 500 (MissingTenantContextError,
  // ver docs/tenancy/13-acceptance-criteria.md), nunca 404. Nenhum dado
  // vazava (o deny-by-default segurou), mas a resposta não era controlada.
  // Corrigido adicionando `requireCurrentTenant()` no topo de /login e de
  // todas as páginas do fluxo público /agendar/*.
  for (const path of ["/", "/login", "/agendar", "/agendar/escolher"]) {
    test(`${path} em subdomínio inexistente retorna 404, não 500`, async ({ page }) => {
      const response = await page.goto(`${NAOEXISTE}${path}`);
      expect(response?.status()).toBe(404);
    });
  }

  for (const path of ["/", "/login", "/agendar", "/agendar/escolher"]) {
    test(`${path} em tenant SUSPENDED redireciona pra /tenant-indisponivel`, async ({ page }) => {
      await page.goto(`${SUSPENSO}${path}`);
      await page.waitForURL((url) => url.pathname === "/tenant-indisponivel", { timeout: 10_000 });
      expect(new URL(page.url()).hostname).toBe("suspenso.zeloo.net");
    });
  }
});

test.describe("create() com relação aninhada não quebra a injeção de tenantId (achado real, pós-Fase 14)", () => {
  // Bug real reportado pelo usuário testando manualmente: criar um Serviço
  // com "Modelo de mensagem padrão" selecionado (ou uma Conta a Receber com
  // cliente vinculado) falhava com "PrismaClientValidationError: Unknown
  // argument tenantId. Did you mean tenant?". Causa: a extensão de
  // isolamento injetava `tenantId` como escalar cru em todo create() — o
  // Prisma só aceita isso se o resto do `data` também for só escalares
  // (formato "Unchecked"); assim que QUALQUER campo usa `{ connect }`
  // (ex.: Service.defaultMessageTemplate, AccountEntry.client/createdBy),
  // o Prisma passa a exigir o formato "Checked" pro objeto inteiro, onde um
  // `tenantId` escalar solto não é uma propriedade válida. Corrigido em
  // `src/lib/tenancy/tenant-extension.ts` com detecção adaptativa: usa
  // `tenant: { connect }` quando o `data` já usa `{ connect }` em algum
  // outro campo, escalar `tenantId` caso contrário.
  test("cria serviço com modelo de mensagem padrão selecionado", async ({ page }) => {
    await page.goto(`${FLORA}/login`);
    await page.locator("#email").fill("dona.flora@teste.local");
    await page.locator("#password").fill("FloraTeste@123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => url.hostname === "flora.zeloo.net" && !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });

    await page.goto(`${FLORA}/servicos`);
    await page.getByRole("button", { name: "Novo serviço" }).click();
    await page.locator("#name").fill("Serviço com template (regressão)");
    await page.locator("#price").fill("1");
    await page.locator("#durationMinutes").fill("30");
    const templateSelect = page.locator("#defaultMessageTemplateId");
    if ((await templateSelect.locator("option").count()) > 1) {
      await templateSelect.selectOption({ index: 1 });
    }
    await page.getByRole("button", { name: "Criar serviço" }).click();
    await page.waitForTimeout(1_500);
    await expect(page.getByText("Não foi possível salvar o serviço.")).toHaveCount(0);
  });

  test("cria conta a receber com cliente vinculado (client + createdBy connect)", async ({ page }) => {
    await page.goto(`${FLORA}/login`);
    await page.locator("#email").fill("dona.flora@teste.local");
    await page.locator("#password").fill("FloraTeste@123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((url) => url.hostname === "flora.zeloo.net" && !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });

    await page.goto(`${FLORA}/clientes`);
    await page.getByRole("button", { name: "Novo cliente" }).click();
    await page.locator("#name").fill("Cliente Regressão Conta a Receber");
    await page.locator("#phone").fill("11999998888");
    await page.getByRole("button", { name: "Criar cliente" }).click();
    await page.waitForTimeout(1_500);

    await page.goto(`${FLORA}/contas-a-receber`);
    await page.getByRole("button", { name: "Nova conta a receber" }).click();
    await page.locator("#entry-description").fill("Conta de regressão (client connect)");
    await page.locator("#entry-amount").fill("50");
    await page.locator("#entry-due-date").fill("2026-08-01");
    await page.locator("#entry-client").selectOption({ label: "Cliente Regressão Conta a Receber" });
    await page.getByRole("button", { name: "Salvar conta" }).click();
    await page.waitForTimeout(1_500);
    await expect(page.getByText("Não foi possível salvar a conta.")).toHaveCount(0);
  });
});
