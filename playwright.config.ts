import { defineConfig, devices } from "@playwright/test";

/**
 * Testes e2e de isolamento multi-tenant (spec §51). Rodam contra um dev
 * server real na porta 3000 — a extensão de isolamento do Prisma depende de
 * `headers()` dentro do ciclo de vida real de uma requisição Next.js, não dá
 * pra simular isso em teste unitário puro. Hosts de tenant são simulados via
 * `--host-resolver-rules` (chromium), sem precisar mexer no arquivo hosts do
 * Windows.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        "--host-resolver-rules=MAP zeloo.net 127.0.0.1,MAP flora.zeloo.net 127.0.0.1,MAP diagro.zeloo.net 127.0.0.1",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
