import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Testes unitários (lógica pura, sem servidor/banco) — Fase 11
 * (CLAUDE_CODE_MULTI_TENANT_ZELOO.md §50). Isolamento entre tenants de
 * verdade (request-scoped, precisa de servidor rodando) fica em
 * `e2e/` via Playwright Test — ver `playwright.config.ts`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
