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

  test("flora NÃO mostra o branding de zeloo — cai no placeholder genérico", async ({ page }) => {
    await page.goto(`${FLORA}/login`);
    await expect(page.locator("h1")).toHaveText("Zeloo");
    await expect(page.locator("img[alt='Logomarca da barbearia']")).toHaveCount(0);
  });

  test("diagro NÃO mostra o branding de zeloo — cai no placeholder genérico", async ({ page }) => {
    await page.goto(`${DIAGRO}/login`);
    await expect(page.locator("h1")).toHaveText("Zeloo");
    await expect(page.locator("img[alt='Logomarca da barbearia']")).toHaveCount(0);
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
