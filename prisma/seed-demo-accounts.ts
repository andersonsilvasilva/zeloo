import { PrismaClient, type AccountDirection, type AccountEntryStatus, type PaymentMethod } from "@prisma/client";

const prisma = new PrismaClient();

/** Marcador em `notes` pra identificar e limpar esses registros depois da demo. */
const DEMO_TAG = "[DEMO]";

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD"];

interface EntrySeed {
  direction: AccountDirection;
  description: string;
  amount: number;
  category: string;
  counterpartyName: string;
  dueDateOffsetDays: number;
  status: AccountEntryStatus;
  /** Só usado quando status é SETTLED — offset relativo ao dueDate. */
  settledOffsetDays?: number;
}

const PAYABLE: EntrySeed[] = [
  { direction: "PAYABLE", description: "Aluguel do salão - Julho", category: "Aluguel", counterpartyName: "Imobiliária Pereira Ltda", amount: 3200, dueDateOffsetDays: -45, status: "SETTLED", settledOffsetDays: -1 },
  { direction: "PAYABLE", description: "Aluguel do salão - Agosto", category: "Aluguel", counterpartyName: "Imobiliária Pereira Ltda", amount: 3200, dueDateOffsetDays: -15, status: "SETTLED", settledOffsetDays: 0 },
  { direction: "PAYABLE", description: "Aluguel do salão - Setembro", category: "Aluguel", counterpartyName: "Imobiliária Pereira Ltda", amount: 3200, dueDateOffsetDays: 15, status: "PENDING" },
  { direction: "PAYABLE", description: "Conta de energia elétrica", category: "Energia", counterpartyName: "Energia SP Distribuidora", amount: 480.5, dueDateOffsetDays: -20, status: "SETTLED", settledOffsetDays: -2 },
  { direction: "PAYABLE", description: "Conta de energia elétrica", category: "Energia", counterpartyName: "Energia SP Distribuidora", amount: 512.9, dueDateOffsetDays: 10, status: "PENDING" },
  { direction: "PAYABLE", description: "Água e esgoto", category: "Água", counterpartyName: "Companhia de Saneamento", amount: 165, dueDateOffsetDays: -18, status: "SETTLED", settledOffsetDays: -3 },
  { direction: "PAYABLE", description: "Água e esgoto", category: "Água", counterpartyName: "Companhia de Saneamento", amount: 172.3, dueDateOffsetDays: 12, status: "PENDING" },
  { direction: "PAYABLE", description: "Internet + telefone fixo", category: "Internet", counterpartyName: "TeleNet Provedor", amount: 199.9, dueDateOffsetDays: -5, status: "PENDING" },
  { direction: "PAYABLE", description: "Compra de produtos de cabelo", category: "Fornecedores", counterpartyName: "Distribuidora Beauty Hair", amount: 890, dueDateOffsetDays: -30, status: "SETTLED", settledOffsetDays: -1 },
  { direction: "PAYABLE", description: "Compra de lâminas e descartáveis", category: "Fornecedores", counterpartyName: "Distribuidora Beauty Hair", amount: 340.6, dueDateOffsetDays: -8, status: "SETTLED", settledOffsetDays: 1 },
  { direction: "PAYABLE", description: "Reposição de produtos de coloração", category: "Fornecedores", counterpartyName: "Cosméticos Profissionais Ltda", amount: 610, dueDateOffsetDays: 5, status: "PENDING" },
  { direction: "PAYABLE", description: "Manutenção do ar-condicionado", category: "Manutenção", counterpartyName: "Refrigera Ar Serviços", amount: 250, dueDateOffsetDays: -10, status: "SETTLED", settledOffsetDays: 0 },
  { direction: "PAYABLE", description: "Manutenção de cadeiras e equipamentos", category: "Manutenção", counterpartyName: "Móveis & Cia Assistência", amount: 380, dueDateOffsetDays: 20, status: "PENDING" },
  { direction: "PAYABLE", description: "Anúncios em redes sociais", category: "Marketing", counterpartyName: "Meta Ads", amount: 300, dueDateOffsetDays: -6, status: "PENDING" },
  { direction: "PAYABLE", description: "Impressão de panfletos promocionais", category: "Marketing", counterpartyName: "Gráfica Rápida", amount: 145, dueDateOffsetDays: -25, status: "SETTLED", settledOffsetDays: -1 },
  { direction: "PAYABLE", description: "Contador - honorários mensais", category: "Serviços contábeis", counterpartyName: "Escritório Contábil Andrade", amount: 350, dueDateOffsetDays: -12, status: "SETTLED", settledOffsetDays: 0 },
  { direction: "PAYABLE", description: "Contador - honorários mensais", category: "Serviços contábeis", counterpartyName: "Escritório Contábil Andrade", amount: 350, dueDateOffsetDays: 18, status: "PENDING" },
  { direction: "PAYABLE", description: "Assinatura sistema de agendamento (backup)", category: "Software", counterpartyName: "SaaS Fornecedor XPTO", amount: 89.9, dueDateOffsetDays: -40, status: "CANCELLED" },
  { direction: "PAYABLE", description: "Produtos de limpeza", category: "Limpeza", counterpartyName: "Higiene Total Distribuidora", amount: 120, dueDateOffsetDays: -3, status: "PENDING" },
  { direction: "PAYABLE", description: "Uniformes da equipe", category: "Outros", counterpartyName: "Confecções Silva", amount: 420, dueDateOffsetDays: 25, status: "PENDING" },
];

const RECEIVABLE: EntrySeed[] = [
  { direction: "RECEIVABLE", description: "Pacote mensal de corte - cliente fidelidade", category: "Pacote mensal", counterpartyName: "Cliente avulso - Pacote Ouro", amount: 180, dueDateOffsetDays: -20, status: "SETTLED", settledOffsetDays: -1 },
  { direction: "RECEIVABLE", description: "Pacote mensal de corte - cliente fidelidade", category: "Pacote mensal", counterpartyName: "Cliente avulso - Pacote Ouro", amount: 180, dueDateOffsetDays: 10, status: "PENDING" },
  { direction: "RECEIVABLE", description: "Venda de produtos - kit pomada e shampoo", category: "Produtos vendidos", counterpartyName: "Cliente balcão", amount: 95, dueDateOffsetDays: -15, status: "SETTLED", settledOffsetDays: 0 },
  { direction: "RECEIVABLE", description: "Venda de produtos - óleo para barba", category: "Produtos vendidos", counterpartyName: "Cliente balcão", amount: 45, dueDateOffsetDays: -2, status: "SETTLED", settledOffsetDays: 0 },
  { direction: "RECEIVABLE", description: "Assinatura mensal - plano Corte Ilimitado", category: "Assinatura", counterpartyName: "Assinante Plano Prata", amount: 149.9, dueDateOffsetDays: -28, status: "SETTLED", settledOffsetDays: -2 },
  { direction: "RECEIVABLE", description: "Assinatura mensal - plano Corte Ilimitado", category: "Assinatura", counterpartyName: "Assinante Plano Prata", amount: 149.9, dueDateOffsetDays: 2, status: "PENDING" },
  { direction: "RECEIVABLE", description: "Serviço corporativo - evento de noivos", category: "Serviços prestados", counterpartyName: "Buffet Casa Bela Eventos", amount: 1200, dueDateOffsetDays: -10, status: "SETTLED", settledOffsetDays: -1 },
  { direction: "RECEIVABLE", description: "Serviço corporativo - dia da beleza empresa parceira", category: "Serviços prestados", counterpartyName: "RH Solutions Corporativo", amount: 850, dueDateOffsetDays: 8, status: "PENDING" },
  { direction: "RECEIVABLE", description: "Parcela de pacote de coloração em atraso", category: "Pacote mensal", counterpartyName: "Cliente avulso - Pacote Platinado", amount: 300, dueDateOffsetDays: -7, status: "PENDING" },
  { direction: "RECEIVABLE", description: "Venda de vale-presente", category: "Produtos vendidos", counterpartyName: "Cliente balcão", amount: 100, dueDateOffsetDays: -22, status: "SETTLED", settledOffsetDays: -1 },
  { direction: "RECEIVABLE", description: "Comissão de parceria com salão vizinho", category: "Outros", counterpartyName: "Studio Hair Parceria", amount: 220, dueDateOffsetDays: 15, status: "PENDING" },
  { direction: "RECEIVABLE", description: "Assinatura mensal - plano Barba Premium", category: "Assinatura", counterpartyName: "Assinante Plano Bronze", amount: 89.9, dueDateOffsetDays: -35, status: "SETTLED", settledOffsetDays: 0 },
  { direction: "RECEIVABLE", description: "Venda de produtos - kit completo styling", category: "Produtos vendidos", counterpartyName: "Cliente balcão", amount: 210, dueDateOffsetDays: 5, status: "PENDING" },
  { direction: "RECEIVABLE", description: "Pacote cancelado por desistência do cliente", category: "Pacote mensal", counterpartyName: "Cliente avulso - Pacote Bronze", amount: 130, dueDateOffsetDays: -18, status: "CANCELLED" },
  { direction: "RECEIVABLE", description: "Serviço corporativo - workshop de barbearia", category: "Serviços prestados", counterpartyName: "Academia de Barbeiros MT", amount: 600, dueDateOffsetDays: 22, status: "PENDING" },
];

async function seedDirection(entries: EntrySeed[]) {
  for (const e of entries) {
    const dueDate = daysFromNow(e.dueDateOffsetDays);
    const settledAt = e.status === "SETTLED" ? daysFromNow(e.dueDateOffsetDays + (e.settledOffsetDays ?? 0)) : null;
    const paymentMethod = e.status === "SETTLED" ? PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)] : null;

    await prisma.accountEntry.create({
      data: {
        direction: e.direction,
        description: e.description,
        amount: e.amount,
        category: e.category,
        counterpartyName: e.counterpartyName,
        dueDate,
        status: e.status,
        settledAt,
        paymentMethod,
        notes: `${DEMO_TAG} Dado fictício gerado para demonstração.`,
      },
    });
  }
}

async function main() {
  console.log("Seeding contas a pagar (fictício)...");
  await seedDirection(PAYABLE);

  console.log("Seeding contas a receber (fictício)...");
  await seedDirection(RECEIVABLE);

  const [payableCount, receivableCount] = await Promise.all([
    prisma.accountEntry.count({ where: { direction: "PAYABLE", notes: { startsWith: DEMO_TAG } } }),
    prisma.accountEntry.count({ where: { direction: "RECEIVABLE", notes: { startsWith: DEMO_TAG } } }),
  ]);

  console.log(`✅ ${payableCount} contas a pagar e ${receivableCount} contas a receber fictícias criadas.`);
  console.log(`Marcadas com "${DEMO_TAG}" em notes — use isso pra limpar depois da demo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
