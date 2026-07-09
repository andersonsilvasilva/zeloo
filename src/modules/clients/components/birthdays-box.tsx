import { Cake } from "lucide-react";
import type { BirthdayClient, ClientBirthdays } from "@/modules/clients/types/client.types";

function BirthdayColumn({ title, clients, emptyLabel }: { title: string; clients: BirthdayClient[]; emptyLabel: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary">{title}</h3>
      {clients.length === 0 ? (
        <p className="text-sm text-text-secondary">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((client) => (
            <li key={client.id} className="text-sm">
              <p className="text-text">
                {client.name} <span className="text-text-secondary">— {client.turningAge} anos</span>
              </p>
              {(client.whatsapp || client.phone) && (
                <p className="text-xs text-text-secondary">{client.whatsapp || client.phone}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BirthdaysBox({ data }: { data: ClientBirthdays }) {
  const hasAny = data.today.length > 0 || data.thisWeek.length > 0 || data.thisMonth.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Cake className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium text-text">Aniversariantes</h2>
      </div>

      {!hasAny ? (
        <p className="text-sm text-text-secondary">Nenhum aniversariante este mês.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BirthdayColumn title="Hoje" clients={data.today} emptyLabel="Ninguém hoje." />
          <BirthdayColumn title="Esta semana" clients={data.thisWeek} emptyLabel="Ninguém esta semana." />
          <BirthdayColumn title="Este mês" clients={data.thisMonth} emptyLabel="Ninguém no restante do mês." />
        </div>
      )}
    </div>
  );
}
