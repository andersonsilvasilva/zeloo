import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { SettingsService } from "@/modules/settings/services/settings.service";
import { FinanceService } from "@/modules/finance/services/finance.service";

/**
 * Rota pública (fora de `(app)`, sem sessão) — o middleware está inerte
 * (matcher: []), então nada bloqueia isso hoje, mas é justamente por isso que
 * a validação de assinatura abaixo é obrigatória, não opcional: tem dinheiro
 * real envolvido, não dá pra confiar cegamente em qualquer POST.
 *
 * Algoritmo de assinatura documentado pelo Mercado Pago:
 * https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 * `x-signature: ts=<timestamp>,v1=<hmac-sha256 hex>`
 * manifest = `id:{data.id};request-id:{x-request-id};ts:{ts};`
 */
function verifySignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;
  if (!xSignature || !xRequestId || !dataId) return false;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }
  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const computedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const a = Buffer.from(computedHash, "utf8");
  const b = Buffer.from(receivedHash, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  const { webhookSecret } = await new SettingsService().getMercadoPagoCredentials();

  if (webhookSecret) {
    const valid = verifySignature({ xSignature, xRequestId, dataId, secret: webhookSecret });
    if (!valid) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  } else {
    // Sem segredo cadastrado ainda em Configurações → Pagamentos: aceita sem
    // validar pra não travar quem está configurando o fluxo, mas fica visível
    // no log que o endpoint está desprotegido nesse meio-tempo.
    console.warn("[webhook mercadopago] webhookSecret não configurado — aceitando notificação sem validar assinatura.");
  }

  let body: { data?: { id?: string } } = {};
  try {
    body = await request.json();
  } catch {
    // corpo vazio ou não-JSON — ainda pode ter vindo só via query string (dataId).
  }

  const paymentId = dataId || body.data?.id;

  if (paymentId) {
    try {
      await new FinanceService().confirmPixCharge(String(paymentId));
    } catch (error) {
      // Nunca deixa um erro interno virar reenvio infinito do Mercado Pago —
      // sempre responde 200 abaixo; o erro fica só registrado no log.
      console.error("[webhook mercadopago] falha ao confirmar cobrança:", error);
    }
  }

  return NextResponse.json({ received: true });
}
