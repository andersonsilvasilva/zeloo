import { describe, it, expect } from "vitest";
import { normalizeHost, resolveRequestHost, resolveTenantHostname } from "@/lib/tenancy/hostname";

const baseDomain = "zeloo.net";
const centralDomains = ["zeloo.net", "www.zeloo.net", "app.zeloo.net", "admin.zeloo.net", "api.zeloo.net"];

/** Casos de hostname do spec (CLAUDE_CODE_MULTI_TENANT_ZELOO.md §53). */
describe("resolveTenantHostname", () => {
  it("domínio raiz resolve como root", () => {
    expect(resolveTenantHostname({ host: "zeloo.net", baseDomain, centralDomains })).toEqual({ kind: "root" });
  });

  it("www do domínio raiz resolve como root", () => {
    expect(resolveTenantHostname({ host: "www.zeloo.net", baseDomain, centralDomains })).toEqual({ kind: "root" });
  });

  it("domínio central (app.) resolve sem tenant", () => {
    expect(resolveTenantHostname({ host: "app.zeloo.net", baseDomain, centralDomains })).toEqual({
      kind: "central",
      host: "app.zeloo.net",
    });
  });

  it("subdomínio de tenant extrai o slug", () => {
    expect(resolveTenantHostname({ host: "flora.zeloo.net", baseDomain, centralDomains })).toEqual({
      kind: "tenant",
      slug: "flora",
    });
  });

  it("maiúsculas são normalizadas antes de resolver (host já normalizado por normalizeHost)", () => {
    const host = normalizeHost("FLORA.ZELOO.NET");
    expect(resolveTenantHostname({ host, baseDomain, centralDomains })).toEqual({ kind: "tenant", slug: "flora" });
  });

  it("porta é removida por normalizeHost antes de resolver", () => {
    const host = normalizeHost("flora.zeloo.net:443");
    expect(resolveTenantHostname({ host, baseDomain, centralDomains })).toEqual({ kind: "tenant", slug: "flora" });
  });

  it("slug inexistente ainda resolve como tenant (a validação de existência é Node-side, não aqui)", () => {
    expect(resolveTenantHostname({ host: "slug-inexistente.zeloo.net", baseDomain, centralDomains })).toEqual({
      kind: "tenant",
      slug: "slug-inexistente",
    });
  });

  it("ataque de sufixo (zeloo.net.evil.example) é rejeitado", () => {
    expect(resolveTenantHostname({ host: "zeloo.net.evil.example", baseDomain, centralDomains })).toEqual({
      kind: "invalid",
    });
  });

  it("ataque de sufixo com subdomínio (flora.zeloo.net.evil.example) é rejeitado", () => {
    expect(resolveTenantHostname({ host: "flora.zeloo.net.evil.example", baseDomain, centralDomains })).toEqual({
      kind: "invalid",
    });
  });

  it("domínio sem fronteira de ponto (evilzeloo.net) é rejeitado — suffix match ingênuo seria vulnerável aqui", () => {
    expect(resolveTenantHostname({ host: "evilzeloo.net", baseDomain, centralDomains })).toEqual({ kind: "invalid" });
  });

  it("hostname vazio é rejeitado", () => {
    expect(resolveTenantHostname({ host: "", baseDomain, centralDomains })).toEqual({ kind: "invalid" });
  });

  it("hostname com caractere inválido é rejeitado", () => {
    expect(resolveTenantHostname({ host: "flora!.zeloo.net", baseDomain, centralDomains })).toEqual({ kind: "invalid" });
  });

  it("subdomínio multi-label (a.b.zeloo.net) é rejeitado — não é um slug válido", () => {
    expect(resolveTenantHostname({ host: "a.b.zeloo.net", baseDomain, centralDomains })).toEqual({ kind: "invalid" });
  });
});

describe("resolveRequestHost — X-Forwarded-Host não confiável por padrão", () => {
  it("ignora X-Forwarded-Host quando trustProxy é false", () => {
    expect(resolveRequestHost("zeloo.net", "flora.zeloo.net", false)).toBe("zeloo.net");
  });

  it("usa X-Forwarded-Host quando trustProxy é true", () => {
    expect(resolveRequestHost("zeloo.net", "flora.zeloo.net", true)).toBe("flora.zeloo.net");
  });

  it("sem X-Forwarded-Host, usa o Host normal mesmo com trustProxy true", () => {
    expect(resolveRequestHost("zeloo.net", null, true)).toBe("zeloo.net");
  });
});

describe("normalizeHost", () => {
  it("remove porta e normaliza caixa", () => {
    expect(normalizeHost("FLORA.ZELOO.NET:3000")).toBe("flora.zeloo.net");
  });

  it("host nulo/ausente vira string vazia", () => {
    expect(normalizeHost(null)).toBe("");
    expect(normalizeHost(undefined)).toBe("");
  });
});
